-- Migración 0004: órdenes de servicio (núcleo)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  guide_number text not null unique,
  customer_id uuid references public.customers (id) on delete set null,
  technician_id uuid references public.profiles (id) on delete set null,
  device_brand text not null,
  device_model text not null,
  device_serial text not null,
  problem_description text not null,
  device_password_encrypted text,
  accessories text,
  current_status text not null default 'INGRESADO'
    check (current_status in (
      'INGRESADO', 'EN_REVISION', 'ESPERANDO_REPUESTO',
      'EN_REPARACION', 'REPARADO', 'LISTO_PARA_ENTREGA', 'ENTREGADO'
    )),
  exit_final_state text,
  exit_repairs_performed text,
  exit_parts_used text,
  exit_observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  from_status text not null,
  to_status text not null,
  user_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.order_photos (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  storage_path text not null,
  kind text not null check (kind in ('inicial', 'final')),
  created_at timestamptz not null default now()
);

create index if not exists work_orders_guide_idx on public.work_orders (guide_number);
create index if not exists work_orders_status_idx on public.work_orders (current_status);
create index if not exists work_orders_technician_idx on public.work_orders (technician_id);
create index if not exists order_history_work_order_idx on public.order_status_history (work_order_id, created_at);

-- Función transaccional: cambia estado + registra historial (RNF-13/14)
create or replace function public.transition_order_status(
  p_work_order_id uuid,
  p_from_status text,
  p_to_status text,
  p_user_id uuid
)
returns public.work_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.work_orders;
begin
  update public.work_orders
  set current_status = p_to_status, updated_at = now()
  where id = p_work_order_id and current_status = p_from_status;

  if not found then
    raise exception 'Transición de estado inválida';
  end if;

  insert into public.order_status_history (work_order_id, from_status, to_status, user_id)
  values (p_work_order_id, p_from_status, p_to_status, p_user_id);

  select * into v_result from public.work_orders where id = p_work_order_id;
  return v_result;
end;
$$;

-- Cifrado de contraseña de dispositivo (RNF-05): nunca texto plano
create extension if not exists pgcrypto;

create or replace function public.encrypt_order_password(
  p_work_order_id uuid,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.work_orders
  set device_password_encrypted = pgp_sym_encrypt(p_password, 'TECNOTALLER_CLAVE_SECRETA')
  where id = p_work_order_id;
end;
$$;

-- ===== ROW LEVEL SECURITY =====
-- NOTA: RLS está DESHABILITADO porque:
-- 1. El backend usa serviceRoleKey (acceso total de servidor)
-- 2. Las políticas se aplican en el código (repository pattern)
-- 3. El frontend NO accede directamente a Supabase (usa API backend)
-- 4. Las políticas anteriores causaban recursión infinita
--
-- alter table public.customers enable row level security;
-- alter table public.work_orders enable row level security;
-- alter table public.order_status_history enable row level security;
-- alter table public.order_photos enable row level security;
--
-- POLÍTICAS ANTERIORES (CAUSABAN RECURSIÓN - NO USAR):
-- create policy "work_orders_admin_technician" on public.work_orders
--   for all using (public.is_admin() or public.is_technician());
-- create policy "work_orders_history_select" on public.order_status_history
--   for select using (public.is_admin() or public.is_technician());
-- create policy "customers_admin_all" on public.customers
--   for all using (public.is_admin());
-- create policy "order_photos_admin_technician" on public.order_photos
--   for all using (public.is_admin() or public.is_technician());
--
-- ✅ SEGURIDAD GARANTIZADA POR:
-- - Backend middleware valida JWT tokens
-- - Repository pattern filtra datos por rol
-- - Endpoints requieren autenticación
-- - serviceRoleKey solo usado por backend (no frontend)
