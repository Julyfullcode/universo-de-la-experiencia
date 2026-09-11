-- El Universo de la Experiencia
-- Ejecutar una vez en Supabase > SQL Editor.

-- Recorrido personal de la Guía de la Experiencia. El cliente solo conserva
-- su UUID anónimo; cada decisión y el pasaporte viven en Supabase.
create table if not exists public.universo_viajes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique,
  nombre text not null check (char_length(nombre) between 2 and 80),
  paso text not null default 'lanzamiento',
  duelos jsonb not null default '{}'::jsonb,
  planeta_principal text check (planeta_principal in ('empaticos', 'conectores', 'impulsores', 'exploradores', 'forjadores')),
  planeta_explorar text check (planeta_explorar in ('empaticos', 'conectores', 'impulsores', 'exploradores', 'forjadores')),
  rol text check (rol in ('generador', 'disenador', 'habilitador')),
  satelites jsonb not null default '[]'::jsonb,
  observatorio text,
  mision jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.universo_viajes enable row level security;
drop policy if exists "Lectura pública de viajes del universo" on public.universo_viajes;
drop policy if exists "Registro público de viajes del universo" on public.universo_viajes;
drop policy if exists "Actualización pública de viajes del universo" on public.universo_viajes;
create policy "Lectura pública de viajes del universo" on public.universo_viajes for select to anon using (true);
create policy "Registro público de viajes del universo" on public.universo_viajes for insert to anon with check (true);
create policy "Actualización pública de viajes del universo" on public.universo_viajes for update to anon using (true) with check (true);
