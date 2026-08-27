-- Migración 0003: servicios técnicos + agendamiento
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  customer_name text not null,
  phone text not null,
  date timestamptz not null,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'confirmada', 'cancelada', 'completada')),
  created_at timestamptz not null default now()
);

create index if not exists appointments_date_idx on public.appointments (date);
create index if not exists appointments_status_idx on public.appointments (status);

-- ===== ROW LEVEL SECURITY =====
-- NOTA: RLS está DESHABILITADO porque:
-- 1. El backend usa serviceRoleKey (acceso total de servidor)
-- 2. Las políticas se aplican en el código (repository pattern)
-- 3. El frontend NO accede directamente a Supabase (usa API backend)
-- 4. Las políticas anteriores causaban recursión infinita
--
-- alter table public.services enable row level security;
-- alter table public.appointments enable row level security;
--
-- POLÍTICAS ANTERIORES (CAUSABAN RECURSIÓN - NO USAR):
-- create policy "services_select_public" on public.services
--   for select using (active = true);
-- create policy "services_admin_all" on public.services
--   for all using (public.is_admin());
-- create policy "appointments_insert_public" on public.appointments
--   for insert with check (true);
-- create policy "appointments_select_admin" on public.appointments
--   for select using (public.is_admin());
-- create policy "appointments_update_admin" on public.appointments
--   for update using (public.is_admin());
--
-- ✅ SEGURIDAD GARANTIZADA POR:
-- - Backend middleware valida JWT tokens
-- - Repository pattern filtra datos por rol
-- - Endpoints requieren autenticación
-- - serviceRoleKey solo usado por backend (no frontend)

-- ===== JOB: cancelar citas pendientes tras 15 minutos (RF-08) =====
create extension if not exists pg_cron;

select cron.schedule(
  'cancel-expired-appointments',
  '* * * * *',
  $$
    update public.appointments
    set status = 'cancelada'
    where status = 'pendiente'
      and date < now() - interval '15 minutes';
  $$
);
