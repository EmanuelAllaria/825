-- =========================================================
-- Dentista Search (ID 825) — Supabase (PostgreSQL) Schema + RLS
-- =========================================================

create extension if not exists "pgcrypto";

-- ----------------------------
-- Tabla: perfiles_medicos
-- ----------------------------
create table if not exists public.perfiles_medicos (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  cedula text,
  whatsapp text,
  telefono text,
  estado_provincia text,
  fotos text[] not null default '{}'::text[]
);

alter table public.perfiles_medicos enable row level security;

drop policy if exists "perfiles_medicos_select_public" on public.perfiles_medicos;
create policy "perfiles_medicos_select_public"
on public.perfiles_medicos
for select
using (true);

drop policy if exists "perfiles_medicos_insert_own" on public.perfiles_medicos;
create policy "perfiles_medicos_insert_own"
on public.perfiles_medicos
for insert
with check (auth.uid() = id);

drop policy if exists "perfiles_medicos_update_own" on public.perfiles_medicos;
create policy "perfiles_medicos_update_own"
on public.perfiles_medicos
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "perfiles_medicos_delete_own" on public.perfiles_medicos;
create policy "perfiles_medicos_delete_own"
on public.perfiles_medicos
for delete
using (auth.uid() = id);

-- ----------------------------
-- Storage: bucket "medicos" (fotos de perfil)
-- ----------------------------
drop policy if exists "storage_medicos_select_public" on storage.objects;
create policy "storage_medicos_select_public"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'medicos');

drop policy if exists "storage_medicos_insert_own" on storage.objects;
create policy "storage_medicos_insert_own"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'medicos' and auth.role() = 'authenticated');

drop policy if exists "storage_medicos_update_own" on storage.objects;
create policy "storage_medicos_update_own"
on storage.objects
for update
to authenticated
using (bucket_id = 'medicos' and auth.uid() = owner)
with check (bucket_id = 'medicos' and auth.uid() = owner);

drop policy if exists "storage_medicos_delete_own" on storage.objects;
create policy "storage_medicos_delete_own"
on storage.objects
for delete
to authenticated
using (bucket_id = 'medicos' and auth.uid() = owner);

-- ----------------------------
-- Tabla: tratamientos_precios
-- ----------------------------
create table if not exists public.tratamientos_precios (
  id uuid primary key default gen_random_uuid(),
  medico_id uuid not null references public.perfiles_medicos(id) on delete cascade,
  tipo_tratamiento text not null,
  precio numeric not null check (precio >= 0)
);

create index if not exists tratamientos_precios_medico_id_idx
  on public.tratamientos_precios (medico_id);

alter table public.tratamientos_precios enable row level security;

drop policy if exists "tratamientos_precios_select_public" on public.tratamientos_precios;
create policy "tratamientos_precios_select_public"
on public.tratamientos_precios
for select
using (true);

drop policy if exists "tratamientos_precios_insert_own" on public.tratamientos_precios;
create policy "tratamientos_precios_insert_own"
on public.tratamientos_precios
for insert
with check (auth.uid() = medico_id);

drop policy if exists "tratamientos_precios_update_own" on public.tratamientos_precios;
create policy "tratamientos_precios_update_own"
on public.tratamientos_precios
for update
using (auth.uid() = medico_id)
with check (auth.uid() = medico_id);

drop policy if exists "tratamientos_precios_delete_own" on public.tratamientos_precios;
create policy "tratamientos_precios_delete_own"
on public.tratamientos_precios
for delete
using (auth.uid() = medico_id);

-- ----------------------------
-- Tabla: pacientes_global
-- ----------------------------
create table if not exists public.pacientes_global (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null,
  edad integer not null,
  sexo text,
  descripcion text
);

alter table public.pacientes_global enable row level security;

-- Inserción pública (anon y authenticated) para registro desde la app
drop policy if exists "pacientes_global_insert_public" on public.pacientes_global;
create policy "pacientes_global_insert_public"
on public.pacientes_global
for insert
to anon, authenticated
with check (true);

-- Lectura solo a usuarios médicos autenticados (definido como: existe perfil_medico con id = auth.uid())
drop policy if exists "pacientes_global_select_only_medicos" on public.pacientes_global;
create policy "pacientes_global_select_only_medicos"
on public.pacientes_global
for select
to authenticated
using (
  exists (
    select 1
    from public.perfiles_medicos pm
    where pm.id = auth.uid()
  )
);

-- ----------------------------
-- Tabla: medico_pacientes (lista privada por doctor)
-- ----------------------------
create table if not exists public.medico_pacientes (
  id uuid primary key default gen_random_uuid(),
  medico_id uuid not null references public.perfiles_medicos(id) on delete cascade,
  paciente_id uuid not null references public.pacientes_global(id) on delete cascade,
  constraint medico_pacientes_unique unique (medico_id, paciente_id)
);

create index if not exists medico_pacientes_medico_id_idx
  on public.medico_pacientes (medico_id);

create index if not exists medico_pacientes_paciente_id_idx
  on public.medico_pacientes (paciente_id);

alter table public.medico_pacientes enable row level security;

drop policy if exists "medico_pacientes_select_own" on public.medico_pacientes;
create policy "medico_pacientes_select_own"
on public.medico_pacientes
for select
to authenticated
using (auth.uid() = medico_id);

drop policy if exists "medico_pacientes_write_own" on public.medico_pacientes;
create policy "medico_pacientes_write_own"
on public.medico_pacientes
for insert
to authenticated
with check (auth.uid() = medico_id);

drop policy if exists "medico_pacientes_update_own" on public.medico_pacientes;
create policy "medico_pacientes_update_own"
on public.medico_pacientes
for update
to authenticated
using (auth.uid() = medico_id)
with check (auth.uid() = medico_id);

drop policy if exists "medico_pacientes_delete_own" on public.medico_pacientes;
create policy "medico_pacientes_delete_own"
on public.medico_pacientes
for delete
to authenticated
using (auth.uid() = medico_id);
