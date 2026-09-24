-- El Universo de la Experiencia
-- Migración idempotente para ejecutar en Supabase > SQL Editor.
--
-- ACCESO DE PARTICIPANTES: el nombre se solicita solo al crear el viaje y la
-- palabra clave basta para recuperarlo. La palabra clave nunca se guarda ni se
-- devuelve en texto claro: se verifica con bcrypt. Un HMAC con una clave privada
-- permite localizar el recorrido sin exponer un identificador reutilizable a
-- los roles del navegador.
--
-- La credencial administrativa se conserva únicamente como hash bcrypt.
-- La contraseña en texto claro nunca se guarda aquí ni en el navegador.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
alter extension pgcrypto set schema extensions;

create table if not exists public.universo_viajes (
  id uuid primary key default extensions.gen_random_uuid(),
  client_id uuid not null unique default extensions.gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 80),
  correo text,
  identificador_acceso_hash bytea,
  identificador_acceso_version smallint not null default 1,
  palabra_clave_hash text,
  paso text not null default 'lanzamiento',
  avance_maximo smallint not null default 1,
  duelos jsonb not null default '{}'::jsonb,
  planeta_principal text check (planeta_principal in ('empaticos', 'conectores', 'impulsores', 'exploradores', 'forjadores')),
  planeta_explorar text check (planeta_explorar in ('empaticos', 'conectores', 'impulsores', 'exploradores', 'forjadores')),
  rol text check (rol in ('generador', 'disenador', 'habilitador')),
  satelites jsonb not null default '[]'::jsonb,
  observatorio text,
  mision jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Amplía sin borrar los recorridos creados por la versión anónima anterior.
alter table public.universo_viajes
  add column if not exists correo text,
  add column if not exists identificador_acceso_hash bytea,
  add column if not exists identificador_acceso_version smallint not null default 1,
  add column if not exists palabra_clave_hash text,
  add column if not exists avance_maximo smallint not null default 1,
  add column if not exists completed_at timestamptz,
  add column if not exists last_seen_at timestamptz not null default now();

alter table public.universo_viajes
  alter column client_id set default extensions.gen_random_uuid();

create unique index if not exists universo_viajes_correo_key
  on public.universo_viajes (correo)
  where correo is not null;

create unique index if not exists universo_viajes_identificador_acceso_key
  on public.universo_viajes (identificador_acceso_hash)
  where identificador_acceso_hash is not null;

create index if not exists universo_viajes_last_seen_idx
  on public.universo_viajes (last_seen_at desc);

do $constraints$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.universo_viajes'::pg_catalog.regclass
      and conname = 'universo_viajes_correo_formato_check'
  ) then
    alter table public.universo_viajes
      add constraint universo_viajes_correo_formato_check
      check (
        correo is null or (
          correo = pg_catalog.lower(pg_catalog.btrim(correo))
          and pg_catalog.char_length(correo) between 5 and 254
          and correo ~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
        )
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.universo_viajes'::pg_catalog.regclass
      and conname = 'universo_viajes_credencial_check'
  ) then
    alter table public.universo_viajes
      add constraint universo_viajes_credencial_check
      check (
        (identificador_acceso_hash is null and palabra_clave_hash is null)
        or (
          pg_catalog.octet_length(identificador_acceso_hash) = 32
          and palabra_clave_hash ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'
        )
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.universo_viajes'::pg_catalog.regclass
      and conname = 'universo_viajes_credencial_version_check'
  ) then
    alter table public.universo_viajes
      add constraint universo_viajes_credencial_version_check
      check (identificador_acceso_version in (1, 2)) not valid;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.universo_viajes'::pg_catalog.regclass
      and conname = 'universo_viajes_paso_check'
  ) then
    alter table public.universo_viajes
      add constraint universo_viajes_paso_check
      check (paso in ('lanzamiento', 'estrellas', 'planetas', 'coordenadas', 'satelites', 'observatorio', 'mision'))
      not valid;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.universo_viajes'::pg_catalog.regclass
      and conname = 'universo_viajes_avance_check'
  ) then
    alter table public.universo_viajes
      add constraint universo_viajes_avance_check
      check (avance_maximo between 1 and 7)
      not valid;
  end if;
end
$constraints$;

update public.universo_viajes
set avance_maximo = greatest(
      avance_maximo,
      case paso
        when 'lanzamiento' then 1 when 'estrellas' then 2
        when 'planetas' then 3 when 'coordenadas' then 4
        when 'satelites' then 5 when 'observatorio' then 6
        when 'mision' then 7 else 1
      end::smallint
    ),
    last_seen_at = coalesce(last_seen_at, updated_at, created_at, now()),
    completed_at = case
      when completed_at is not null then completed_at
      when paso = 'mision'
       and pg_catalog.jsonb_typeof(mision) = 'object'
       and pg_catalog.length(pg_catalog.btrim(coalesce(mision ->> 'accion', ''))) > 0
       and pg_catalog.length(pg_catalog.btrim(coalesce(mision ->> 'conQuien', ''))) > 0
       and pg_catalog.length(pg_catalog.btrim(coalesce(mision ->> 'aprendizaje', ''))) > 0
        then coalesce(updated_at, now())
      else null
    end;

create table if not exists public.universo_sesiones (
  id uuid primary key default extensions.gen_random_uuid(),
  viaje_id uuid not null references public.universo_viajes(id) on delete cascade,
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index if not exists universo_sesiones_viaje_idx
  on public.universo_sesiones (viaje_id, created_at desc);
create index if not exists universo_sesiones_expiry_idx
  on public.universo_sesiones (expires_at) where revoked_at is null;

create table if not exists public.universo_feedback (
  id uuid primary key default extensions.gen_random_uuid(),
  viaje_id uuid not null unique references public.universo_viajes(id) on delete cascade,
  calificacion smallint not null check (calificacion between 1 and 5),
  recomendacion text not null default '' check (char_length(recomendacion) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists universo_feedback_updated_idx
  on public.universo_feedback (updated_at desc);

create table if not exists public.universo_admin_config (
  singleton boolean primary key default true check (singleton),
  usuario text not null unique,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

insert into public.universo_admin_config (singleton, usuario, password_hash)
values (
  true,
  'VPEUC',
  extensions.crypt(pg_catalog.encode(extensions.gen_random_bytes(32), 'hex'), extensions.gen_salt('bf', 12))
)
on conflict (singleton) do nothing;

create table if not exists public.universo_admin_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index if not exists universo_admin_sessions_expiry_idx
  on public.universo_admin_sessions (expires_at) where revoked_at is null;

create table if not exists public.universo_login_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  identifier_hash bytea not null,
  succeeded boolean not null default false,
  attempted_at timestamptz not null default now()
);
create index if not exists universo_login_attempts_window_idx
  on public.universo_login_attempts (identifier_hash, attempted_at desc);

create table if not exists public.universo_participant_login_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  identifier_hash bytea not null,
  succeeded boolean not null default false,
  attempted_at timestamptz not null default now()
);
create index if not exists universo_participant_login_attempts_window_idx
  on public.universo_participant_login_attempts (identifier_hash, attempted_at desc);

-- Sin políticas ni privilegios de tabla: todo acceso del navegador pasa por RPC.
alter table public.universo_viajes enable row level security;
alter table public.universo_sesiones enable row level security;
alter table public.universo_feedback enable row level security;
alter table public.universo_admin_config enable row level security;
alter table public.universo_admin_sessions enable row level security;
alter table public.universo_login_attempts enable row level security;
alter table public.universo_participant_login_attempts enable row level security;

do $policies$
declare item record;
begin
  for item in
    select schemaname, tablename, policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in (
        'universo_viajes', 'universo_sesiones', 'universo_feedback',
        'universo_admin_config', 'universo_admin_sessions',
        'universo_login_attempts', 'universo_participant_login_attempts'
      )
  loop
    execute pg_catalog.format('drop policy if exists %I on %I.%I',
      item.policyname, item.schemaname, item.tablename);
  end loop;
end
$policies$;

revoke all privileges on table public.universo_viajes from public, anon, authenticated;
revoke all privileges on table public.universo_sesiones from public, anon, authenticated;
revoke all privileges on table public.universo_feedback from public, anon, authenticated;
revoke all privileges on table public.universo_admin_config from public, anon, authenticated;
revoke all privileges on table public.universo_admin_sessions from public, anon, authenticated;
revoke all privileges on table public.universo_login_attempts from public, anon, authenticated;
revoke all privileges on table public.universo_participant_login_attempts from public, anon, authenticated;

create schema if not exists universo_private;
revoke all on schema universo_private from public, anon, authenticated;

create table if not exists universo_private.configuracion (
  singleton boolean primary key default true check (singleton),
  access_pepper bytea not null check (pg_catalog.octet_length(access_pepper) = 32),
  dummy_password_hash text not null
);
revoke all privileges on table universo_private.configuracion from public, anon, authenticated;
insert into universo_private.configuracion (singleton, access_pepper, dummy_password_hash)
values (
  true,
  extensions.gen_random_bytes(32),
  extensions.crypt(pg_catalog.encode(extensions.gen_random_bytes(32), 'hex'), extensions.gen_salt('bf', 12))
)
on conflict (singleton) do nothing;

create or replace function universo_private.identificador_acceso(p_nombre text, p_palabra_clave text)
returns bytea language sql stable security definer set search_path = ''
as $function$
  select extensions.hmac(
    pg_catalog.convert_to(
      pg_catalog.char_length(p_nombre)::text || ':' || p_nombre || p_palabra_clave,
      'UTF8'
    ),
    c.access_pepper,
    'sha256'
  )
  from universo_private.configuracion as c
  where c.singleton
$function$;

-- La versión 2 permite recuperar con la palabra clave como único dato. El
-- prefijo separa criptográficamente este identificador del esquema anterior.
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

create or replace function universo_private.token_hash(p_token text)
returns bytea language sql immutable security definer set search_path = ''
as $function$
  select extensions.digest(pg_catalog.convert_to(p_token, 'UTF8'), 'sha256')
$function$;

create or replace function universo_private.nuevo_token()
returns text language sql volatile security definer set search_path = ''
as $function$
  select pg_catalog.encode(extensions.gen_random_bytes(32), 'hex')
$function$;

create or replace function universo_private.validar_token(p_token text)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare v_viaje_id uuid;
begin
  if p_token is null or pg_catalog.length(p_token) <> 64
     or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select s.viaje_id into v_viaje_id
  from public.universo_sesiones as s
  where s.token_hash = universo_private.token_hash(p_token)
    and s.revoked_at is null and s.expires_at > pg_catalog.clock_timestamp()
  limit 1;
  return v_viaje_id;
end
$function$;

create or replace function universo_private.validar_admin_token(p_token text)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare v_session_id uuid;
begin
  if p_token is null or pg_catalog.length(p_token) <> 64
     or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select s.id into v_session_id
  from public.universo_admin_sessions as s
  where s.token_hash = universo_private.token_hash(p_token)
    and s.revoked_at is null and s.expires_at > pg_catalog.clock_timestamp()
  limit 1;
  return v_session_id;
end
$function$;

create or replace function universo_private.payload_viaje(p_viaje_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $function$
  select pg_catalog.jsonb_build_object(
    'viaje', pg_catalog.jsonb_build_object(
      'nombre', v.nombre, 'paso', v.paso, 'duelos', v.duelos,
      'planeta_principal', v.planeta_principal,
      'planeta_explorar', v.planeta_explorar, 'rol', v.rol,
      'satelites', v.satelites, 'observatorio', v.observatorio,
      'mision', v.mision, 'avance_maximo', v.avance_maximo,
      'completed_at', v.completed_at
    ),
    'feedback', case when f.id is null then null else pg_catalog.jsonb_build_object(
      'calificacion', f.calificacion, 'recomendacion', f.recomendacion
    ) end
  )
  from public.universo_viajes as v
  left join public.universo_feedback as f on f.viaje_id = v.id
  where v.id = p_viaje_id
$function$;

drop function if exists public.universo_ingresar(text, text, uuid);

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
  from universo_private.configuracion as c where c.singleton;

  if v_modo = 'recover' then
    delete from public.universo_participant_login_attempts
    where attempted_at < pg_catalog.clock_timestamp() - interval '30 days';
    select pg_catalog.count(*)::integer into v_failures
    from public.universo_participant_login_attempts
    where identifier_hash = v_attempt_hash and succeeded = false
      and attempted_at >= pg_catalog.clock_timestamp() - interval '15 minutes';
    if v_failures >= 5 then
      return pg_catalog.jsonb_build_object('ok', false,
        'error', 'Demasiados intentos. Espera 15 minutos antes de volver a intentar.');
    end if;
    select pg_catalog.count(*)::integer into v_global_failures
    from public.universo_participant_login_attempts
    where succeeded = false
      and attempted_at >= pg_catalog.clock_timestamp() - interval '1 minute';
    if v_global_failures >= 100 then
      return pg_catalog.jsonb_build_object('ok', false,
        'error', 'El servicio de recuperación está temporalmente limitado. Intenta en un minuto.');
    end if;

    select v.id, v.palabra_clave_hash into v_viaje_id, v_password_hash
    from public.universo_viajes as v
    where v.identificador_acceso_version = 2
      and v.identificador_acceso_hash = v_identifier_hash
    limit 1 for update;
    if v_viaje_id is not null
       and v_password_hash ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'
       and extensions.crypt(p_palabra_clave, v_password_hash) = v_password_hash then
      v_match_count := 1;
    else
      v_viaje_id := null;
      v_password_hash := null;
    end if;

    -- Transición desde la versión nombre + palabra clave. Como el secreto no
    -- es reversible, cada hash legado se comprueba una sola vez; al acertar se
    -- reemplaza por el identificador v2. Si dos recorridos usaban la misma
    -- palabra clave no se entrega ninguno: requieren asistencia administrativa.
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
      return pg_catalog.jsonb_build_object('ok', false,
        'error', 'Palabra clave incorrecta.');
    end if;
    if v_match_count > 1 then
      insert into public.universo_participant_login_attempts (identifier_hash, succeeded)
      values (v_attempt_hash, false);
      return pg_catalog.jsonb_build_object('ok', false,
        'error', 'No fue posible identificar una sesión única. Solicita ayuda al administrador.');
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
    where identifier_hash = v_attempt_hash and succeeded = false;
    update public.universo_viajes
    set last_seen_at = pg_catalog.clock_timestamp(), updated_at = pg_catalog.clock_timestamp()
    where id = v_viaje_id;
  else
    select v.id into v_viaje_id from public.universo_viajes as v
    where v.identificador_acceso_version = 2
      and v.identificador_acceso_hash = v_identifier_hash
    limit 1 for update;
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
      return pg_catalog.jsonb_build_object('ok', false,
        'error', 'Esa palabra clave ya está en uso. Elige otra o recupera tu sesión.');
    end if;

    if p_legacy_client_id is not null then
      -- Migración de una sola vez: el navegador que conserva el UUID legado
      -- puede asignar una palabra clave a un recorrido aún no migrado.
      select v.id into v_viaje_id from public.universo_viajes as v
      where v.client_id = p_legacy_client_id
        and v.identificador_acceso_hash is null
        and v.palabra_clave_hash is null
      limit 1 for update;
    end if;

    if v_viaje_id is null then
      insert into public.universo_viajes (
        nombre, correo, identificador_acceso_hash, identificador_acceso_version, palabra_clave_hash
      ) values (
        v_nombre, null, v_identifier_hash, 2,
        extensions.crypt(p_palabra_clave, extensions.gen_salt('bf', 12))
      ) returning id into v_viaje_id;
    else
      update public.universo_viajes
      set nombre = v_nombre,
          correo = null,
          identificador_acceso_hash = v_identifier_hash,
          identificador_acceso_version = 2,
          palabra_clave_hash = extensions.crypt(p_palabra_clave, extensions.gen_salt('bf', 12)),
          last_seen_at = pg_catalog.clock_timestamp(),
          updated_at = pg_catalog.clock_timestamp()
      where id = v_viaje_id;
    end if;
  end if;

  v_token := universo_private.nuevo_token();
  insert into public.universo_sesiones (viaje_id, token_hash, expires_at)
  values (v_viaje_id, universo_private.token_hash(v_token),
    pg_catalog.clock_timestamp() + interval '30 days');

  return universo_private.payload_viaje(v_viaje_id)
    || pg_catalog.jsonb_build_object('ok', true, 'token', v_token);
end
$function$;

create or replace function public.universo_mi_viaje(p_token text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_viaje_id uuid := universo_private.validar_token(p_token);
begin
  if v_viaje_id is null then
    raise exception using errcode = '28000', message = 'Sesión inválida o vencida.';
  end if;
  update public.universo_sesiones set last_seen_at = pg_catalog.clock_timestamp()
  where token_hash = universo_private.token_hash(p_token) and revoked_at is null;
  update public.universo_viajes set last_seen_at = pg_catalog.clock_timestamp()
  where id = v_viaje_id;
  return universo_private.payload_viaje(v_viaje_id);
end
$function$;

create or replace function public.universo_guardar_viaje(p_token text, p_viaje jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  p_cambios alias for $2;
  v_viaje_id uuid := universo_private.validar_token(p_token);
  v_nombre text;
  v_paso text;
  v_avance smallint;
  v_mision jsonb;
  v_completa boolean := false;
begin
  if v_viaje_id is null then
    raise exception using errcode = '28000', message = 'Sesión inválida o vencida.';
  end if;
  if p_cambios is null or pg_catalog.jsonb_typeof(p_cambios) <> 'object'
     or pg_catalog.pg_column_size(p_cambios) > 32768 then
    raise exception using errcode = '22023', message = 'Los datos del viaje no son válidos.';
  end if;
  if exists (
    select 1 from pg_catalog.jsonb_object_keys(p_cambios) as k(clave)
    where k.clave not in ('nombre', 'paso', 'duelos', 'planeta_principal',
      'planeta_explorar', 'rol', 'satelites', 'observatorio', 'mision')
  ) then
    raise exception using errcode = '22023', message = 'El viaje contiene campos no permitidos.';
  end if;

  if p_cambios ? 'nombre' then
    if pg_catalog.jsonb_typeof(p_cambios -> 'nombre') <> 'string' then
      raise exception using errcode = '22023', message = 'El nombre no es válido.';
    end if;
    v_nombre := pg_catalog.regexp_replace(pg_catalog.btrim(p_cambios ->> 'nombre'), '\s+', ' ', 'g');
    if pg_catalog.char_length(v_nombre) not between 2 and 80 or v_nombre ~ '[[:cntrl:]]' then
      raise exception using errcode = '22023', message = 'El nombre no es válido.';
    end if;
  end if;

  if p_cambios ? 'paso' then
    if pg_catalog.jsonb_typeof(p_cambios -> 'paso') <> 'string' then
      raise exception using errcode = '22023', message = 'El paso no es válido.';
    end if;
    v_paso := p_cambios ->> 'paso';
    v_avance := (case v_paso
      when 'lanzamiento' then 1 when 'estrellas' then 2
      when 'planetas' then 3 when 'coordenadas' then 4
      when 'satelites' then 5 when 'observatorio' then 6
      when 'mision' then 7 else null
    end)::smallint;
    if v_avance is null then
      raise exception using errcode = '22023', message = 'El paso no es válido.';
    end if;
  end if;

  if p_cambios ? 'duelos' then
    if pg_catalog.jsonb_typeof(p_cambios -> 'duelos') <> 'object' then
      raise exception using errcode = '22023', message = 'Las respuestas orbitales no son válidas.';
    end if;
    if (select pg_catalog.count(*)
        from pg_catalog.jsonb_object_keys(p_cambios -> 'duelos')) > 10
       or exists (
          select 1 from pg_catalog.jsonb_each(p_cambios -> 'duelos') as d(clave, valor)
          where d.clave !~ '^[0-9]$'
            or pg_catalog.jsonb_typeof(d.valor) <> 'string'
            or d.valor #>> '{}' not in ('empaticos', 'conectores', 'impulsores', 'exploradores', 'forjadores')
        ) then
      raise exception using errcode = '22023', message = 'Las respuestas orbitales no son válidas.';
    end if;
  end if;

  if p_cambios ? 'planeta_principal' and (
    pg_catalog.jsonb_typeof(p_cambios -> 'planeta_principal') not in ('string', 'null')
    or (pg_catalog.jsonb_typeof(p_cambios -> 'planeta_principal') = 'string'
      and p_cambios ->> 'planeta_principal' not in ('empaticos', 'conectores', 'impulsores', 'exploradores', 'forjadores'))
  ) then raise exception using errcode = '22023', message = 'El planeta principal no es válido.'; end if;

  if p_cambios ? 'planeta_explorar' and (
    pg_catalog.jsonb_typeof(p_cambios -> 'planeta_explorar') not in ('string', 'null')
    or (pg_catalog.jsonb_typeof(p_cambios -> 'planeta_explorar') = 'string'
      and p_cambios ->> 'planeta_explorar' not in ('empaticos', 'conectores', 'impulsores', 'exploradores', 'forjadores'))
  ) then raise exception using errcode = '22023', message = 'El planeta para explorar no es válido.'; end if;

  if p_cambios ? 'rol' and (
    pg_catalog.jsonb_typeof(p_cambios -> 'rol') not in ('string', 'null')
    or (pg_catalog.jsonb_typeof(p_cambios -> 'rol') = 'string'
      and p_cambios ->> 'rol' not in ('generador', 'disenador', 'habilitador'))
  ) then raise exception using errcode = '22023', message = 'El rol no es válido.'; end if;

  if p_cambios ? 'satelites' then
    if pg_catalog.jsonb_typeof(p_cambios -> 'satelites') <> 'array' then
      raise exception using errcode = '22023', message = 'Los satélites no son válidos.';
    end if;
    if pg_catalog.jsonb_array_length(p_cambios -> 'satelites') > 3
       or exists (
          select 1 from pg_catalog.jsonb_array_elements(p_cambios -> 'satelites') as s(valor)
          where pg_catalog.jsonb_typeof(s.valor) <> 'string'
            or s.valor #>> '{}' not in ('proveedores', 'dueno', 'comunidad')
        )
       or (select pg_catalog.count(*) from (
          select distinct s.valor #>> '{}' as valor
          from pg_catalog.jsonb_array_elements(p_cambios -> 'satelites') as s(valor)
        ) as distintos) <> pg_catalog.jsonb_array_length(p_cambios -> 'satelites') then
      raise exception using errcode = '22023', message = 'Los satélites no son válidos.';
    end if;
  end if;

  if p_cambios ? 'observatorio' and (
    pg_catalog.jsonb_typeof(p_cambios -> 'observatorio') not in ('string', 'null')
    or (pg_catalog.jsonb_typeof(p_cambios -> 'observatorio') = 'string'
      and pg_catalog.char_length(p_cambios ->> 'observatorio') > 200)
  ) then raise exception using errcode = '22023', message = 'La señal del observatorio no es válida.'; end if;

  if p_cambios ? 'mision' then
    v_mision := p_cambios -> 'mision';
    if pg_catalog.jsonb_typeof(v_mision) <> 'object' then
      raise exception using errcode = '22023', message = 'La misión no es válida.';
    end if;
    if exists (select 1 from pg_catalog.jsonb_object_keys(v_mision) as k(clave)
         where k.clave not in ('accion', 'conQuien', 'aprendizaje'))
       or exists (select 1 from pg_catalog.jsonb_each(v_mision) as m(clave, valor)
         where pg_catalog.jsonb_typeof(m.valor) <> 'string')
       or pg_catalog.char_length(coalesce(v_mision ->> 'accion', '')) > 1500
       or pg_catalog.char_length(coalesce(v_mision ->> 'conQuien', '')) > 120
       or pg_catalog.char_length(coalesce(v_mision ->> 'aprendizaje', '')) > 160 then
      raise exception using errcode = '22023', message = 'La misión no es válida.';
    end if;
    v_completa := pg_catalog.length(pg_catalog.btrim(coalesce(v_mision ->> 'accion', ''))) > 0
      and pg_catalog.length(pg_catalog.btrim(coalesce(v_mision ->> 'conQuien', ''))) > 0
      and pg_catalog.length(pg_catalog.btrim(coalesce(v_mision ->> 'aprendizaje', ''))) > 0;
  end if;

  update public.universo_viajes as v set
    nombre = case when p_cambios ? 'nombre' then v_nombre else v.nombre end,
    paso = case when p_cambios ? 'paso' then v_paso else v.paso end,
    avance_maximo = case when p_cambios ? 'paso'
      then greatest(v.avance_maximo, v_avance) else v.avance_maximo end,
    duelos = case when p_cambios ? 'duelos' then p_cambios -> 'duelos' else v.duelos end,
    planeta_principal = case
      when p_cambios ? 'planeta_principal' and pg_catalog.jsonb_typeof(p_cambios -> 'planeta_principal') = 'null' then null
      when p_cambios ? 'planeta_principal' then p_cambios ->> 'planeta_principal' else v.planeta_principal end,
    planeta_explorar = case
      when p_cambios ? 'planeta_explorar' and pg_catalog.jsonb_typeof(p_cambios -> 'planeta_explorar') = 'null' then null
      when p_cambios ? 'planeta_explorar' then p_cambios ->> 'planeta_explorar' else v.planeta_explorar end,
    rol = case when p_cambios ? 'rol' and pg_catalog.jsonb_typeof(p_cambios -> 'rol') = 'null' then null
      when p_cambios ? 'rol' then p_cambios ->> 'rol' else v.rol end,
    satelites = case when p_cambios ? 'satelites' then p_cambios -> 'satelites' else v.satelites end,
    observatorio = case
      when p_cambios ? 'observatorio' and pg_catalog.jsonb_typeof(p_cambios -> 'observatorio') = 'null' then null
      when p_cambios ? 'observatorio' then p_cambios ->> 'observatorio' else v.observatorio end,
    mision = case when p_cambios ? 'mision' then v_mision else v.mision end,
    completed_at = case when v.completed_at is not null then v.completed_at
      when p_cambios ? 'mision' and v_completa then pg_catalog.clock_timestamp() else null end,
    last_seen_at = pg_catalog.clock_timestamp(), updated_at = pg_catalog.clock_timestamp()
  where v.id = v_viaje_id;

  update public.universo_sesiones set last_seen_at = pg_catalog.clock_timestamp(),
    expires_at = pg_catalog.clock_timestamp() + interval '30 days'
  where token_hash = universo_private.token_hash(p_token) and revoked_at is null;
  return universo_private.payload_viaje(v_viaje_id);
end
$function$;

create or replace function public.universo_guardar_feedback(
  p_token text, p_calificacion integer, p_recomendacion text
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_viaje_id uuid := universo_private.validar_token(p_token);
  v_recomendacion text := pg_catalog.btrim(coalesce(p_recomendacion, ''));
begin
  if v_viaje_id is null then
    raise exception using errcode = '28000', message = 'Sesión inválida o vencida.';
  end if;
  if p_calificacion is null or p_calificacion not between 1 and 5 then
    raise exception using errcode = '22023', message = 'La calificación debe estar entre 1 y 5.';
  end if;
  if pg_catalog.char_length(v_recomendacion) > 2000 then
    raise exception using errcode = '22023', message = 'La recomendación supera el límite permitido.';
  end if;

  insert into public.universo_feedback (viaje_id, calificacion, recomendacion)
  values (v_viaje_id, p_calificacion, v_recomendacion)
  on conflict (viaje_id) do update set calificacion = excluded.calificacion,
    recomendacion = excluded.recomendacion, updated_at = pg_catalog.clock_timestamp();
  update public.universo_viajes set last_seen_at = pg_catalog.clock_timestamp()
  where id = v_viaje_id;
  update public.universo_sesiones set last_seen_at = pg_catalog.clock_timestamp(),
    expires_at = pg_catalog.clock_timestamp() + interval '30 days'
  where token_hash = universo_private.token_hash(p_token) and revoked_at is null;
  return pg_catalog.jsonb_build_object('calificacion', p_calificacion,
    'recomendacion', v_recomendacion);
end
$function$;

create or replace function public.universo_heartbeat(p_token text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_viaje_id uuid := universo_private.validar_token(p_token);
begin
  if v_viaje_id is null then return pg_catalog.jsonb_build_object('ok', false); end if;
  update public.universo_sesiones set last_seen_at = pg_catalog.clock_timestamp(),
    expires_at = pg_catalog.clock_timestamp() + interval '30 days'
  where token_hash = universo_private.token_hash(p_token) and revoked_at is null;
  update public.universo_viajes set last_seen_at = pg_catalog.clock_timestamp()
  where id = v_viaje_id;
  return pg_catalog.jsonb_build_object('ok', true);
end
$function$;

create or replace function public.universo_salir(p_token text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_count integer;
begin
  if p_token is null or pg_catalog.length(p_token) <> 64
     or p_token !~ '^[0-9a-f]{64}$' then
    return pg_catalog.jsonb_build_object('ok', false);
  end if;
  update public.universo_sesiones
  set revoked_at = coalesce(revoked_at, pg_catalog.clock_timestamp())
  where token_hash = universo_private.token_hash(p_token) and revoked_at is null;
  get diagnostics v_count = row_count;
  return pg_catalog.jsonb_build_object('ok', v_count > 0);
end
$function$;

create or replace function public.universo_admin_ingresar(p_usuario text, p_clave text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_usuario text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_usuario, '')));
  v_identifier_hash bytea;
  v_password_hash text;
  v_failures integer;
  v_token text;
begin
  v_identifier_hash := extensions.digest(pg_catalog.convert_to(v_usuario, 'UTF8'), 'sha256');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_usuario, 2027));
  delete from public.universo_login_attempts
  where attempted_at < pg_catalog.clock_timestamp() - interval '30 days';
  select pg_catalog.count(*)::integer into v_failures
  from public.universo_login_attempts
  where identifier_hash = v_identifier_hash and succeeded = false
    and attempted_at >= pg_catalog.clock_timestamp() - interval '15 minutes';
  if v_failures >= 5 then
    return pg_catalog.jsonb_build_object('ok', false,
      'error', 'Demasiados intentos. Espera 15 minutos antes de volver a intentar.');
  end if;
  if pg_catalog.char_length(v_usuario) not between 1 and 64 or p_clave is null
     or pg_catalog.char_length(p_clave) not between 8 and 200 then
    insert into public.universo_login_attempts (identifier_hash, succeeded)
    values (v_identifier_hash, false);
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'Credenciales inválidas.');
  end if;
  select c.password_hash into v_password_hash from public.universo_admin_config as c
  where pg_catalog.upper(c.usuario) = v_usuario limit 1;
  -- La validación de formato va separada para no invocar crypt con un marcador
  -- o hash dañado (SQL no garantiza cortocircuito entre condiciones OR).
  if v_password_hash is null
     or v_password_hash !~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$' then
    insert into public.universo_login_attempts (identifier_hash, succeeded)
    values (v_identifier_hash, false);
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'Credenciales inválidas.');
  end if;
  if extensions.crypt(p_clave, v_password_hash) is distinct from v_password_hash then
    insert into public.universo_login_attempts (identifier_hash, succeeded)
    values (v_identifier_hash, false);
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'Credenciales inválidas.');
  end if;
  insert into public.universo_login_attempts (identifier_hash, succeeded)
  values (v_identifier_hash, true);
  delete from public.universo_login_attempts
  where identifier_hash = v_identifier_hash and succeeded = false;
  v_token := universo_private.nuevo_token();
  insert into public.universo_admin_sessions (token_hash, expires_at)
  values (universo_private.token_hash(v_token),
    pg_catalog.clock_timestamp() + interval '8 hours');
  return pg_catalog.jsonb_build_object('ok', true, 'token', v_token);
end
$function$;

create or replace function public.universo_admin_panel(p_token text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_session_id uuid := universo_private.validar_admin_token(p_token);
  v_result jsonb;
begin
  if v_session_id is null then
    raise exception using errcode = '28000', message = 'Sesión administrativa inválida o vencida.';
  end if;
  -- Expiración absoluta: consultar el panel no prolonga las ocho horas.
  update public.universo_admin_sessions set last_seen_at = pg_catalog.clock_timestamp()
  where id = v_session_id;

  select pg_catalog.jsonb_build_object(
    'generated_at', pg_catalog.clock_timestamp(),
    'resumen', pg_catalog.jsonb_build_object(
      'registrados', (select pg_catalog.count(*) from public.universo_viajes where palabra_clave_hash is not null),
      'ingresos_hoy', (
        select pg_catalog.count(distinct s.viaje_id)
        from public.universo_sesiones as s join public.universo_viajes as v on v.id = s.viaje_id
        where v.palabra_clave_hash is not null
          and (s.created_at at time zone 'America/Bogota')::date
            = (pg_catalog.clock_timestamp() at time zone 'America/Bogota')::date
      ),
      'activos', (
        select pg_catalog.count(*) from public.universo_viajes
        where palabra_clave_hash is not null and last_seen_at >= pg_catalog.clock_timestamp() - interval '5 minutes'
      ),
      'completados', (
        select pg_catalog.count(*) from public.universo_viajes
        where palabra_clave_hash is not null and completed_at is not null
      ),
      'iniciados', (select pg_catalog.count(*) from public.universo_viajes where palabra_clave_hash is not null),
      'avance_promedio', (
        select coalesce(pg_catalog.round(pg_catalog.avg(avance_maximo::numeric) * 100 / 7, 1), 0)
        from public.universo_viajes where palabra_clave_hash is not null
      ),
      'evaluaciones', (select pg_catalog.count(*) from public.universo_feedback),
      'calificacion_promedio', (
        select coalesce(pg_catalog.round(pg_catalog.avg(calificacion::numeric), 2), 0)
        from public.universo_feedback
      )
    ),
    'embudo', (
      select coalesce(pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object('numero', etapas.numero, 'paso', etapas.paso,
          'total', (select pg_catalog.count(*) from public.universo_viajes as v
            where v.palabra_clave_hash is not null and v.avance_maximo >= etapas.numero))
        order by etapas.numero), '[]'::jsonb)
      from (values (1, 'Centro de lanzamiento'), (2, 'Estrellas cliente'),
        (3, 'Planetas de talento'), (4, 'Constelación guía'),
        (5, 'Satélites del ecosistema'), (6, 'Observatorio de señales'),
        (7, 'Misión en la Tierra')) as etapas(numero, paso)
    ),
    'participantes', (
      select coalesce(pg_catalog.jsonb_agg(item order by item ->> 'last_seen_at' desc), '[]'::jsonb)
      from (
        select pg_catalog.jsonb_build_object(
          'nombre', v.nombre, 'paso', v.paso,
          'avance_maximo', v.avance_maximo,
          'avance_porcentaje', pg_catalog.round(v.avance_maximo::numeric * 100 / 7, 1),
          'planeta', v.planeta_principal, 'planeta_explorar', v.planeta_explorar,
          'rol', v.rol, 'satelites', v.satelites, 'observatorio', v.observatorio,
          'mision', v.mision, 'created_at', v.created_at, 'updated_at', v.updated_at,
          'last_seen_at', v.last_seen_at, 'completed_at', v.completed_at,
          'calificacion', f.calificacion, 'recomendacion', f.recomendacion
        ) as item
        from public.universo_viajes as v
        left join public.universo_feedback as f on f.viaje_id = v.id
        where v.palabra_clave_hash is not null
      ) as participantes_json
    ),
    'feedback', (
      select coalesce(pg_catalog.jsonb_agg(item order by item ->> 'updated_at' desc), '[]'::jsonb)
      from (
        select pg_catalog.jsonb_build_object('nombre', v.nombre,
          'calificacion', f.calificacion, 'recomendacion', f.recomendacion,
          'created_at', f.created_at, 'updated_at', f.updated_at) as item
        from public.universo_feedback as f join public.universo_viajes as v on v.id = f.viaje_id
      ) as feedback_json
    )
  ) into v_result;
  return v_result;
end
$function$;

create or replace function public.universo_admin_salir(p_token text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_count integer;
begin
  if p_token is null or pg_catalog.length(p_token) <> 64
     or p_token !~ '^[0-9a-f]{64}$' then
    return pg_catalog.jsonb_build_object('ok', false);
  end if;
  update public.universo_admin_sessions
  set revoked_at = coalesce(revoked_at, pg_catalog.clock_timestamp())
  where token_hash = universo_private.token_hash(p_token) and revoked_at is null;
  get diagnostics v_count = row_count;
  return pg_catalog.jsonb_build_object('ok', v_count > 0);
end
$function$;

-- PostgreSQL concede EXECUTE a PUBLIC por defecto; se revoca antes de habilitar
-- para anon exclusivamente los nueve endpoints que usa el sitio estático.
revoke all on function public.universo_ingresar(text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.universo_mi_viaje(text) from public, anon, authenticated;
revoke all on function public.universo_guardar_viaje(text, jsonb) from public, anon, authenticated;
revoke all on function public.universo_guardar_feedback(text, integer, text) from public, anon, authenticated;
revoke all on function public.universo_heartbeat(text) from public, anon, authenticated;
revoke all on function public.universo_salir(text) from public, anon, authenticated;
revoke all on function public.universo_admin_ingresar(text, text) from public, anon, authenticated;
revoke all on function public.universo_admin_panel(text) from public, anon, authenticated;
revoke all on function public.universo_admin_salir(text) from public, anon, authenticated;

grant execute on function public.universo_ingresar(text, text, text, uuid) to anon;
grant execute on function public.universo_mi_viaje(text) to anon;
grant execute on function public.universo_guardar_viaje(text, jsonb) to anon;
grant execute on function public.universo_guardar_feedback(text, integer, text) to anon;
grant execute on function public.universo_heartbeat(text) to anon;
grant execute on function public.universo_salir(text) to anon;
grant execute on function public.universo_admin_ingresar(text, text) to anon;
grant execute on function public.universo_admin_panel(text) to anon;
grant execute on function public.universo_admin_salir(text) to anon;

revoke all on function universo_private.token_hash(text) from public, anon, authenticated;
revoke all on function universo_private.identificador_acceso(text, text) from public, anon, authenticated;
revoke all on function universo_private.identificador_acceso(text) from public, anon, authenticated;
revoke all on function universo_private.nuevo_token() from public, anon, authenticated;
revoke all on function universo_private.validar_token(text) from public, anon, authenticated;
revoke all on function universo_private.validar_admin_token(text) from public, anon, authenticated;
revoke all on function universo_private.payload_viaje(uuid) from public, anon, authenticated;

commit;
