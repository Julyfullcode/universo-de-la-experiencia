-- Universo de la Experiencia
-- Migración incremental: recuperar la sesión únicamente con la palabra clave.
-- Requisito: haber aplicado previamente supabase/schema.sql de la versión anterior.
-- Esta migración no elimina viajes, sesiones ni respuestas existentes.

begin;

alter table public.universo_viajes
  add column if not exists identificador_acceso_version smallint not null default 1;

do $constraints$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.universo_viajes'::pg_catalog.regclass
      and conname = 'universo_viajes_credencial_version_check'
  ) then
    alter table public.universo_viajes
      add constraint universo_viajes_credencial_version_check
      check (identificador_acceso_version in (1, 2)) not valid;
  end if;
end
$constraints$;

-- La versión 2 localiza el viaje con la palabra clave como único dato.
-- El HMAC usa el pepper privado que ya existe en universo_private.configuracion.
create or replace function universo_private.identificador_acceso(p_palabra_clave text)
returns bytea language sql stable security definer set search_path = ''
as $function$
  select extensions.hmac(
    pg_catalog.convert_to('keyword-v2:' || p_palabra_clave, 'UTF8'),
    c.access_pepper,
    'sha256'
  )
  from universo_private.configuracion as c
  where c.singleton
$function$;

create or replace function public.universo_ingresar(
  p_nombre text,
  p_palabra_clave text,
  p_modo text default 'register',
  p_legacy_client_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_nombre text := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  v_modo text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_modo, '')));
  v_identifier_hash bytea;
  v_attempt_hash bytea;
  v_password_hash text;
  v_verify_hash text;
  v_failures integer;
  v_global_failures integer;
  v_match_count integer := 0;
  v_name_match_count integer := 0;
  v_match_is_legacy boolean := false;
  v_viaje_id uuid;
  v_candidate record;
  v_token text;
begin
  if p_palabra_clave is null
     or p_palabra_clave <> pg_catalog.btrim(p_palabra_clave)
     or pg_catalog.char_length(p_palabra_clave) not between 10 and 64
     or pg_catalog.octet_length(p_palabra_clave) > 72
     or p_palabra_clave ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023',
      message = 'La palabra clave debe tener entre 10 y 64 caracteres, sin espacios al inicio o al final.';
  end if;
  if v_modo not in ('register', 'recover') then
    raise exception using errcode = '22023', message = 'Modo de acceso no válido.';
  end if;
  if v_modo = 'register'
     and (pg_catalog.char_length(v_nombre) not between 2 and 80 or v_nombre ~ '[[:cntrl:]]') then
    raise exception using errcode = '22023', message = 'Ingresa un nombre entre 2 y 80 caracteres.';
  end if;

  v_identifier_hash := universo_private.identificador_acceso(p_palabra_clave);
  v_attempt_hash := extensions.digest(v_identifier_hash, 'sha256');
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(pg_catalog.encode(v_identifier_hash, 'hex'), 2028)
  );
  select c.dummy_password_hash into v_verify_hash
  from universo_private.configuracion as c
  where c.singleton;

  if v_modo = 'recover' then
    delete from public.universo_participant_login_attempts
    where attempted_at < pg_catalog.clock_timestamp() - interval '30 days';

    select pg_catalog.count(*)::integer into v_failures
    from public.universo_participant_login_attempts
    where identifier_hash = v_attempt_hash
      and succeeded = false
      and attempted_at >= pg_catalog.clock_timestamp() - interval '15 minutes';

    if v_failures >= 5 then
      return pg_catalog.jsonb_build_object(
        'ok', false,
        'error', 'Demasiados intentos. Espera 15 minutos antes de volver a intentar.'
      );
    end if;

    select pg_catalog.count(*)::integer into v_global_failures
    from public.universo_participant_login_attempts
    where succeeded = false
      and attempted_at >= pg_catalog.clock_timestamp() - interval '1 minute';

    if v_global_failures >= 100 then
      return pg_catalog.jsonb_build_object(
        'ok', false,
        'error', 'El servicio de recuperación está temporalmente limitado. Intenta en un minuto.'
      );
    end if;

    select v.id, v.palabra_clave_hash
      into v_viaje_id, v_password_hash
    from public.universo_viajes as v
    where v.identificador_acceso_version = 2
      and v.identificador_acceso_hash = v_identifier_hash
    limit 1
    for update;

    if v_viaje_id is not null
       and v_password_hash ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'
       and extensions.crypt(p_palabra_clave, v_password_hash) = v_password_hash then
      v_match_count := 1;
    else
      v_viaje_id := null;
      v_password_hash := null;
    end if;

    -- Transición automática de los accesos que antes requerían nombre y palabra clave.
    -- Si dos viajes antiguos comparten la misma palabra, ninguno se entrega por ambigüedad.
    for v_candidate in
      select v.id, v.palabra_clave_hash
      from public.universo_viajes as v
      where v.identificador_acceso_version = 1
        and v.identificador_acceso_hash is not null
        and v.palabra_clave_hash is not null
      order by v.id
      for update
    loop
      if v_candidate.palabra_clave_hash ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'
         and extensions.crypt(p_palabra_clave, v_candidate.palabra_clave_hash)
             = v_candidate.palabra_clave_hash then
        v_match_count := v_match_count + 1;
        if v_match_count = 1 then
          v_viaje_id := v_candidate.id;
          v_password_hash := v_candidate.palabra_clave_hash;
          v_match_is_legacy := true;
        end if;
        exit when v_match_count > 1;
      end if;
    end loop;

    if v_match_count = 0 then
      perform extensions.crypt(p_palabra_clave, v_verify_hash);
      insert into public.universo_participant_login_attempts (identifier_hash, succeeded)
      values (v_attempt_hash, false);
      return pg_catalog.jsonb_build_object('ok', false, 'error', 'Palabra clave incorrecta.');
    end if;

    if v_match_count > 1 then
      if pg_catalog.char_length(v_nombre) not between 2 and 80
         or v_nombre ~ '[[:cntrl:]]' then
        return pg_catalog.jsonb_build_object(
          'ok', false,
          'requires_name', true,
          'error', 'Encontramos más de un viaje con esa palabra clave. Escribe también tu nombre completo.'
        );
      end if;

      -- Las credenciales antiguas podían repetir palabra clave. En ese caso el
      -- nombre se usa únicamente para distinguir el viaje correcto. El registro
      -- permanece en versión 1 porque una clave duplicada no puede convertirse
      -- en el identificador único de versión 2.
      v_viaje_id := null;
      v_password_hash := null;
      v_match_is_legacy := false;
      for v_candidate in
        select v.id, v.nombre, v.palabra_clave_hash
        from public.universo_viajes as v
        where v.identificador_acceso_hash is not null
          and v.palabra_clave_hash is not null
        order by v.id
        for update
      loop
        if pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(v_candidate.nombre), '\s+', ' ', 'g'))
             = pg_catalog.lower(v_nombre)
           and v_candidate.palabra_clave_hash ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'
           and extensions.crypt(p_palabra_clave, v_candidate.palabra_clave_hash)
               = v_candidate.palabra_clave_hash then
          v_name_match_count := v_name_match_count + 1;
          if v_name_match_count = 1 then
            v_viaje_id := v_candidate.id;
            v_password_hash := v_candidate.palabra_clave_hash;
          end if;
          exit when v_name_match_count > 1;
        end if;
      end loop;

      if v_name_match_count = 0 then
        insert into public.universo_participant_login_attempts (identifier_hash, succeeded)
        values (v_attempt_hash, false);
        return pg_catalog.jsonb_build_object('ok', false,
          'error', 'Nombre o palabra clave incorrectos.');
      end if;
      if v_name_match_count > 1 then
        return pg_catalog.jsonb_build_object('ok', false,
          'error', 'Hay más de un viaje con el mismo nombre y palabra clave. Solicita ayuda al administrador.');
      end if;
    end if;

    if v_match_is_legacy then
      update public.universo_viajes
      set identificador_acceso_hash = v_identifier_hash,
          identificador_acceso_version = 2,
          updated_at = pg_catalog.clock_timestamp()
      where id = v_viaje_id;
    end if;

    insert into public.universo_participant_login_attempts (identifier_hash, succeeded)
    values (v_attempt_hash, true);

    delete from public.universo_participant_login_attempts
    where identifier_hash = v_attempt_hash
      and succeeded = false;

    update public.universo_viajes
    set last_seen_at = pg_catalog.clock_timestamp(),
        updated_at = pg_catalog.clock_timestamp()
    where id = v_viaje_id;
  else
    select v.id into v_viaje_id
    from public.universo_viajes as v
    where v.identificador_acceso_version = 2
      and v.identificador_acceso_hash = v_identifier_hash
    limit 1
    for update;

    if v_viaje_id is null then
      for v_candidate in
        select v.id, v.palabra_clave_hash
        from public.universo_viajes as v
        where v.identificador_acceso_version = 1
          and v.identificador_acceso_hash is not null
          and v.palabra_clave_hash is not null
        order by v.id
      loop
        if v_candidate.palabra_clave_hash ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'
           and extensions.crypt(p_palabra_clave, v_candidate.palabra_clave_hash)
               = v_candidate.palabra_clave_hash then
          v_viaje_id := v_candidate.id;
          exit;
        end if;
      end loop;
    end if;

    if v_viaje_id is not null then
      return pg_catalog.jsonb_build_object(
        'ok', false,
        'error', 'Esa palabra clave ya está en uso. Elige otra o recupera tu sesión.'
      );
    end if;

    if p_legacy_client_id is not null then
      select v.id into v_viaje_id
      from public.universo_viajes as v
      where v.client_id = p_legacy_client_id
        and v.identificador_acceso_hash is null
        and v.palabra_clave_hash is null
      limit 1
      for update;
    end if;

    if v_viaje_id is null then
      insert into public.universo_viajes (
        nombre,
        correo,
        identificador_acceso_hash,
        identificador_acceso_version,
        palabra_clave_hash
      ) values (
        v_nombre,
        null,
        v_identifier_hash,
        2,
        extensions.crypt(p_palabra_clave, extensions.gen_salt('bf', 12))
      )
      returning id into v_viaje_id;
    else
      update public.universo_viajes
      set nombre = v_nombre,
          correo = null,
          identificador_acceso_hash = v_identifier_hash,
          identificador_acceso_version = 2,
          palabra_clave_hash = extensions.crypt(
            p_palabra_clave,
            extensions.gen_salt('bf', 12)
          ),
          last_seen_at = pg_catalog.clock_timestamp(),
          updated_at = pg_catalog.clock_timestamp()
      where id = v_viaje_id;
    end if;
  end if;

  v_token := universo_private.nuevo_token();
  insert into public.universo_sesiones (viaje_id, token_hash, expires_at)
  values (
    v_viaje_id,
    universo_private.token_hash(v_token),
    pg_catalog.clock_timestamp() + interval '30 days'
  );

  return universo_private.payload_viaje(v_viaje_id)
    || pg_catalog.jsonb_build_object('ok', true, 'token', v_token);
end
$function$;

revoke all on function universo_private.identificador_acceso(text)
  from public, anon, authenticated;

revoke all on function public.universo_ingresar(text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.universo_ingresar(text, text, text, uuid) to anon;

commit;
