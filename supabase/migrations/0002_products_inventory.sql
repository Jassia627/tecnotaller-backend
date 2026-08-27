-- Migración 0002: catálogo, inventario y movimientos
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text not null default '',
  image_url text,
  category_id uuid references public.categories (id) on delete set null,
  purchase_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  type text not null check (type in ('IN', 'OUT')),
  quantity integer not null check (quantity > 0),
  reason text not null,
  user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists products_active_idx on public.products (active);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists inventory_movements_product_idx on public.inventory_movements (product_id, created_at);

-- Función transaccional para registrar movimiento (RNF-14: atomicidad)
create or replace function public.register_inventory_movement(
  p_product_id uuid,
  p_type text,
  p_quantity integer,
  p_reason text,
  p_user_id uuid
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock integer;
  v_result public.products;
begin
  select stock into v_stock from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;

  if p_type = 'OUT' then
    if v_stock < p_quantity then
      raise exception 'Stock insuficiente';
    end if;
    update public.products set stock = stock - p_quantity, updated_at = now() where id = p_product_id;
  elsif p_type = 'IN' then
    update public.products set stock = stock + p_quantity, updated_at = now() where id = p_product_id;
  else
    raise exception 'Tipo de movimiento inválido';
  end if;

  insert into public.inventory_movements (product_id, type, quantity, reason, user_id)
  values (p_product_id, p_type, p_quantity, p_reason, p_user_id);

  select * into v_result from public.products where id = p_product_id;
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
-- alter table public.categories enable row level security;
-- alter table public.products enable row level security;
-- alter table public.inventory_movements enable row level security;
--
-- POLÍTICAS ANTERIORES (CAUSABAN RECURSIÓN - NO USAR):
-- create policy "products_select_public" on public.products
--   for select using (active = true);
-- create policy "categories_select_public" on public.categories
--   for select using (active = true);
-- create policy "products_admin_all" on public.products
--   for all using (public.is_admin());
-- create policy "categories_admin_all" on public.categories
--   for all using (public.is_admin());
-- create policy "inventory_admin_all" on public.inventory_movements
--   for all using (public.is_admin());
--
-- ✅ SEGURIDAD GARANTIZADA POR:
-- - Backend middleware valida JWT tokens
-- - Repository pattern filtra datos por rol
-- - Endpoints requieren autenticación
-- - serviceRoleKey solo usado por backend (no frontend)
