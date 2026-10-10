-- Apply after schema.sql and the existing migrations, using the database owner.
-- The application login is provisioned separately; no credentials belong here.
begin;

do $block$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'universo_admin_backend') then
    create role universo_admin_backend nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
end
$block$;

grant usage on schema universo_private to universo_admin_backend;
grant usage on schema public to universo_admin_backend;

alter table public.universo_admin_config add column if not exists mfa_ciphertext text;
alter table public.universo_admin_config add column if not exists mfa_last_counter bigint not null default -1;

create table if not exists universo_private.admin_guards (
  key text primary key,
  window_started timestamptz not null default clock_timestamp(),
  requests integer not null default 0,
  failures integer not null default 0,
  strikes integer not null default 0,
  blocked_until timestamptz,
  expires_at timestamptz not null
);

create table if not exists universo_private.admin_challenges (
  token_hash text primary key,
  usuario text not null,
  device_hash text not null,
  mfa_ciphertext text not null,
  attempts integer not null default 0,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create table if not exists universo_private.admin_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default clock_timestamp(),
  event text not null,
  ip_hash text,
  user_hash text,
  device_hash text,
  request_id uuid not null,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists admin_events_time_idx on universo_private.admin_events (occurred_at);

create table if not exists universo_private.admin_alerts (
  id bigint generated always as identity primary key,
  event_id bigint references universo_private.admin_events(id) on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  sent_at timestamptz,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default clock_timestamp()
);

alter table universo_private.admin_guards enable row level security;
alter table universo_private.admin_challenges enable row level security;
alter table universo_private.admin_events enable row level security;
alter table universo_private.admin_alerts enable row level security;
revoke all on all tables in schema universo_private from public, anon, authenticated;
revoke all on all sequences in schema universo_private from public, anon, authenticated;

grant select, insert, update, delete on universo_private.admin_guards,
  universo_private.admin_challenges, universo_private.admin_events,
  universo_private.admin_alerts to universo_admin_backend;
grant usage, select on sequence universo_private.admin_events_id_seq,
  universo_private.admin_alerts_id_seq to universo_admin_backend;

drop policy if exists admin_backend_guards on universo_private.admin_guards;
create policy admin_backend_guards on universo_private.admin_guards to universo_admin_backend using (true) with check (true);
drop policy if exists admin_backend_challenges on universo_private.admin_challenges;
create policy admin_backend_challenges on universo_private.admin_challenges to universo_admin_backend using (true) with check (true);
drop policy if exists admin_backend_events on universo_private.admin_events;
create policy admin_backend_events on universo_private.admin_events to universo_admin_backend using (true) with check (true);
drop policy if exists admin_backend_alerts on universo_private.admin_alerts;
create policy admin_backend_alerts on universo_private.admin_alerts to universo_admin_backend using (true) with check (true);

-- LEAST is SQL syntax, not a schema-qualified PostgreSQL function.
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
      'activos', (select pg_catalog.count(*) from public.universo_viajes where palabra_clave_hash is not null and last_seen_at >= pg_catalog.clock_timestamp() - interval '5 minutes'),
      'completados', (select pg_catalog.count(*) from public.universo_viajes where palabra_clave_hash is not null and completed_at is not null),
      'iniciados', (select pg_catalog.count(*) from public.universo_viajes where palabra_clave_hash is not null),
      'avance_promedio', (
        select coalesce(pg_catalog.round(pg_catalog.avg(least(avance_maximo, 5)::numeric) * 100 / 5, 1), 0)
        from public.universo_viajes where palabra_clave_hash is not null
      ),
      'evaluaciones', (select pg_catalog.count(*) from public.universo_feedback),
      'calificacion_promedio', (select coalesce(pg_catalog.round(pg_catalog.avg(calificacion::numeric), 2), 0) from public.universo_feedback)
    ),
    'embudo', (
      select coalesce(pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object('numero', etapas.numero, 'paso', etapas.paso,
          'total', (select pg_catalog.count(*) from public.universo_viajes as v where v.palabra_clave_hash is not null and v.avance_maximo >= etapas.numero))
        order by etapas.numero), '[]'::jsonb)
      from (values (1, 'Centro de lanzamiento'), (2, 'Observatorio'), (3, 'Constelaciones'), (4, 'Planetas'), (5, 'Mi misión')) as etapas(numero, paso)
    ),
    'participantes', (
      select coalesce(pg_catalog.jsonb_agg(item order by item ->> 'last_seen_at' desc), '[]'::jsonb)
      from (
        select pg_catalog.jsonb_build_object(
          'id', v.id, 'nombre', v.nombre, 'paso', v.paso,
          'avance_maximo', v.avance_maximo,
          'avance_porcentaje', pg_catalog.round(least(v.avance_maximo, 5)::numeric * 100 / 5, 1),
          'planeta', v.planeta_principal, 'planeta_explorar', v.planeta_explorar,
          'rol', v.rol, 'duelos', v.duelos, 'satelites', v.satelites, 'observatorio', v.observatorio,
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

-- Password-only login is retired, including execution by the new backend role.
revoke all on function public.universo_admin_ingresar(text, text)
  from public, anon, authenticated, universo_admin_backend;
revoke all on function public.universo_admin_panel(text) from public, anon, authenticated;
revoke all on function public.universo_admin_eliminar_viaje(text, uuid) from public, anon, authenticated;
revoke all on function public.universo_admin_salir(text) from public, anon, authenticated;
grant execute on function public.universo_admin_panel(text),
  public.universo_admin_eliminar_viaje(text, uuid),
  public.universo_admin_salir(text) to universo_admin_backend;

create or replace function universo_private.admin_verificar_password(p_usuario text, p_clave text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_usuario text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_usuario, '')));
  v_password_hash text;
  v_dummy_hash text;
  v_ciphertext text;
  v_ok boolean := false;
begin
  select c.dummy_password_hash into v_dummy_hash from universo_private.configuracion c where c.singleton;
  select c.password_hash, c.mfa_ciphertext into v_password_hash, v_ciphertext
    from public.universo_admin_config c where pg_catalog.upper(c.usuario) = v_usuario;
  if v_password_hash is null or v_password_hash !~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$' then
    perform extensions.crypt(coalesce(p_clave, ''), v_dummy_hash);
  else
    v_ok := extensions.crypt(coalesce(p_clave, ''), v_password_hash) = v_password_hash;
  end if;
  -- A correct password without an enrolled factor grants no access.
  if not v_ok or v_ciphertext is null then return '{"ok":false}'::jsonb; end if;
  return pg_catalog.jsonb_build_object('ok', true, 'usuario', v_usuario, 'mfa_ciphertext', v_ciphertext);
end
$function$;

create or replace function universo_private.admin_crear_sesion(p_usuario text, p_counter bigint)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_last bigint; v_token text;
begin
  select c.mfa_last_counter into v_last from public.universo_admin_config c
    where pg_catalog.upper(c.usuario) = p_usuario and c.mfa_ciphertext is not null for update;
  if not found or p_counter is null or p_counter <= v_last then
    return '{"ok":false}'::jsonb;
  end if;
  update public.universo_admin_config set mfa_last_counter = p_counter where singleton;
  update public.universo_admin_sessions set revoked_at = pg_catalog.clock_timestamp() where revoked_at is null;
  v_token := universo_private.nuevo_token();
  insert into public.universo_admin_sessions (token_hash, expires_at)
    values (universo_private.token_hash(v_token), pg_catalog.clock_timestamp() + interval '8 hours');
  return pg_catalog.jsonb_build_object('ok', true, 'token', v_token);
end
$function$;

revoke all on function universo_private.admin_verificar_password(text, text),
  universo_private.admin_crear_sesion(text, bigint) from public, anon, authenticated;
create or replace function universo_private.admin_sesion_vigente(p_token text)
returns boolean language sql security definer set search_path = ''
as $function$
  select universo_private.validar_admin_token(p_token) is not null;
$function$;
revoke all on function universo_private.admin_sesion_vigente(text) from public, anon, authenticated;
grant execute on function universo_private.admin_sesion_vigente(text) to universo_admin_backend;

grant execute on function universo_private.admin_verificar_password(text, text),
  universo_private.admin_crear_sesion(text, bigint) to universo_admin_backend;

-- Invalidate password-only sessions at the security cutover.
update public.universo_admin_sessions set revoked_at = clock_timestamp() where revoked_at is null;
commit;
