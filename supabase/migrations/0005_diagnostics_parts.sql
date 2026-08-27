-- Migración 0005: diagnóstico + repuestos
create table if not exists public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  technician_id uuid references public.profiles (id) on delete set null,
  observations text not null,
  faults text not null,
  recommended_actions text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  stock integer not null default 0 check (stock >= 0),
  purchase_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_parts (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  part_id uuid not null references public.parts (id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists diagnostics_work_order_idx on public.diagnostics (work_order_id, created_at);
create index if not exists order_parts_work_order_idx on public.order_parts (work_order_id);

-- Función transaccional: asociar repuesto + descontar stock (RNF-14)
create or replace function public.assign_part_to_order(
  p_work_order_id uuid,
  p_part_id uuid,
  p_quantity integer
)
returns public.parts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock integer;
  v_price numeric;
  v_result public.parts;
begin
  select stock, sale_price into v_stock, v_price
  from public.parts where id = p_part_id for update;

  if not found then
    raise exception 'Repuesto no encontrado';
  end if;

  if v_stock < p_quantity then
    raise exception 'Stock de repuesto insuficiente';
  end if;

  update public.parts
  set stock = stock - p_quantity, updated_at = now()
  where id = p_part_id;

  insert into public.order_parts (work_order_id, part_id, quantity, unit_price)
  values (p_work_order_id, p_part_id, p_quantity, v_price);

  select * into v_result from public.parts where id = p_part_id;
  return v_result;
end;
$$;

-- ===== ROW LEVEL SECURITY =====
-- NOTA: RLS está DESHABILITADO porque:
-- 1. El backend usa serviceRoleKey (acceso total de servidor)
-- 2. Las políticas se aplican en el código (repository pattern)
-- 3. El frontend NO accede directamente a Supabase (usa API backend)
-- 4. Las políticas anteriores causaban recursión infinita
--
-- alter table public.diagnostics enable row level security;
-- alter table public.parts enable row level security;
-- alter table public.order_parts enable row level security;
--
-- POLÍTICAS ANTERIORES (CAUSABAN RECURSIÓN - NO USAR):
-- create policy "diagnostics_admin_technician" on public.diagnostics
--   for all using (public.is_admin() or public.is_technician());
-- create policy "parts_admin_technician" on public.parts
--   for all using (public.is_admin() or public.is_technician());
-- create policy "order_parts_admin_technician" on public.order_parts
--   for all using (public.is_admin() or public.is_technician());
--
-- ✅ SEGURIDAD GARANTIZADA POR:
-- - Backend middleware valida JWT tokens
-- - Repository pattern filtra datos por rol
-- - Endpoints requieren autenticación
-- - serviceRoleKey solo usado por backend (no frontend)
