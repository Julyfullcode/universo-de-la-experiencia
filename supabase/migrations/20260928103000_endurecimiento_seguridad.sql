-- Endurecimiento incremental para sesiones y autenticación administrativa.
-- Idempotente: puede ejecutarse después de schema.sql en producción.
begin;

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
    and s.revoked_at is null
    and s.expires_at > pg_catalog.clock_timestamp()
    and s.last_seen_at > pg_catalog.clock_timestamp() - interval '30 minutes'
  limit 1;
  return v_session_id;
end
$function$;

create or replace function public.universo_admin_ingresar(p_usuario text, p_clave text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_usuario text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_usuario, '')));
  v_identifier_hash bytea;
  v_password_hash text;
  v_verify_hash text;
  v_failures integer;
  v_global_failures integer;
  v_token text;
begin
  v_identifier_hash := extensions.digest(pg_catalog.convert_to(v_usuario, 'UTF8'), 'sha256');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_usuario, 2027));
  delete from public.universo_login_attempts
  where attempted_at < pg_catalog.clock_timestamp() - interval '30 days';
  select c.dummy_password_hash into v_verify_hash
  from universo_private.configuracion as c where c.singleton;

  select pg_catalog.count(*)::integer into v_failures
  from public.universo_login_attempts
  where identifier_hash = v_identifier_hash and succeeded = false
    and attempted_at >= pg_catalog.clock_timestamp() - interval '15 minutes';
  if v_failures >= 5 then
    return pg_catalog.jsonb_build_object('ok', false,
      'error', 'Demasiados intentos. Espera 15 minutos antes de volver a intentar.');
  end if;

  select pg_catalog.count(*)::integer into v_global_failures
  from public.universo_login_attempts
  where succeeded = false
    and attempted_at >= pg_catalog.clock_timestamp() - interval '1 minute';
  if v_global_failures >= 100 then
    return pg_catalog.jsonb_build_object('ok', false,
      'error', 'El acceso administrativo está temporalmente limitado. Intenta en un minuto.');
  end if;

  if pg_catalog.char_length(v_usuario) not between 1 and 64 or p_clave is null
     or pg_catalog.char_length(p_clave) not between 8 and 200 then
    perform extensions.crypt('verificacion-constante', v_verify_hash);
    insert into public.universo_login_attempts (identifier_hash, succeeded)
    values (v_identifier_hash, false);
    return pg_catalog.jsonb_build_object('ok', false, 'error', 'Credenciales inválidas.');
  end if;

  select c.password_hash into v_password_hash from public.universo_admin_config as c
  where pg_catalog.upper(c.usuario) = v_usuario limit 1;
  if v_password_hash is null
     or v_password_hash !~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$' then
    perform extensions.crypt(p_clave, v_verify_hash);
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
  update public.universo_admin_sessions
  set revoked_at = coalesce(revoked_at, pg_catalog.clock_timestamp())
  where revoked_at is null;
  v_token := universo_private.nuevo_token();
  insert into public.universo_admin_sessions (token_hash, expires_at)
  values (universo_private.token_hash(v_token),
    pg_catalog.clock_timestamp() + interval '8 hours');
  return pg_catalog.jsonb_build_object('ok', true, 'token', v_token);
end
$function$;

revoke all on function public.universo_admin_ingresar(text, text) from public, anon, authenticated;
grant execute on function public.universo_admin_ingresar(text, text) to anon;
revoke all on function universo_private.validar_admin_token(text) from public, anon, authenticated;

commit;
