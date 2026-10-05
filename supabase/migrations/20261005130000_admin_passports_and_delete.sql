begin;

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
        select coalesce(pg_catalog.round(pg_catalog.avg(pg_catalog.least(avance_maximo, 5)::numeric) * 100 / 5, 1), 0)
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
          'avance_porcentaje', pg_catalog.round(pg_catalog.least(v.avance_maximo, 5)::numeric * 100 / 5, 1),
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

create or replace function public.universo_admin_eliminar_viaje(p_token text, p_viaje_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_session_id uuid := universo_private.validar_admin_token(p_token);
  v_deleted integer;
begin
  if v_session_id is null then
    raise exception using errcode = '28000', message = 'Sesión administrativa inválida o vencida.';
  end if;
  update public.universo_admin_sessions set last_seen_at = pg_catalog.clock_timestamp()
  where id = v_session_id;
  delete from public.universo_viajes where id = p_viaje_id and palabra_clave_hash is not null;
  get diagnostics v_deleted = row_count;
  return pg_catalog.jsonb_build_object('ok', v_deleted = 1, 'deleted', v_deleted);
end
$function$;

revoke all on function public.universo_admin_panel(text) from public, anon, authenticated;
revoke all on function public.universo_admin_eliminar_viaje(text, uuid) from public, anon, authenticated;
grant execute on function public.universo_admin_panel(text) to anon;
grant execute on function public.universo_admin_eliminar_viaje(text, uuid) to anon;

commit;
