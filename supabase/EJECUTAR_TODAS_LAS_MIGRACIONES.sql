-- ============================================================================
-- EJECUTAR ESTO EN SUPABASE SQL EDITOR PARA CONFIGURAR LA BASE DE DATOS
-- ============================================================================
-- 
-- INSTRUCCIONES:
-- 1. Ve a https://supabase.com
-- 2. Abre tu proyecto
-- 3. Ve a SQL Editor
-- 4. Crea una nueva query
-- 5. Copia TODO este contenido
-- 6. Presiona "Run" (puede tomar 1-2 minutos)
-- 7. Espera a que termine
-- 8. El backend estará listo para usar
--
-- ============================================================================

-- Migración 0001: esquema base + perfiles + roles + RLS
create type public.role_enum as enum ('cliente', 'tecnico', 'administrador');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.role_enum not null default 'cliente',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'cliente')::public.role_enum
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create index if not exists profiles_role_idx on public.profiles (role);

-- ===== ROW LEVEL SECURITY =====
-- RLS DESHABILITADO - No habilitar

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'administrador'
  );
$$;

create or replace function public.is_technician()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'tecnico'
  );
$$;

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

-- Migración 0006: garantías
create table if not exists public.warranties (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  period_days integer not null check (period_days > 0),
  expires_at timestamptz not null,
  status text not null default 'vigente' check (status in ('vigente', 'vencida')),
  created_at timestamptz not null default now()
);

create index if not exists warranties_work_order_idx on public.warranties (work_order_id);

select cron.schedule(
  'expire-warranties',
  '0 0 * * *',
  $$
    update public.warranties
    set status = 'vencida'
    where status = 'vigente' and expires_at < now();
  $$
);

-- Migración 0007: auditoría
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on public.audit_logs (entity, created_at);
create index if not exists audit_logs_user_idx on public.audit_logs (user_id, created_at);

-- Migración 0008: notificaciones
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  to_email text not null,
  type text not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'enviada', 'fallida')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_work_order_idx on public.notifications (work_order_id, created_at);

create or replace function public.notify_on_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if new.current_status in ('LISTO_PARA_ENTREGA', 'REPARADO') then
    select email into v_email from public.customers c where c.id = new.customer_id;
    if v_email is not null and v_email <> '' then
      insert into public.notifications (work_order_id, to_email, type)
      values (new.id, v_email, 'status_change:' || new.current_status);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_notify_status on public.work_orders;
create trigger work_orders_notify_status
  after update of current_status on public.work_orders
  for each row execute function public.notify_on_status_change();

-- Migración 0009: RPC functions para técnicos
create or replace function public.get_technicians()
returns table (
  id uuid,
  full_name text,
  phone text,
  role text,
  active boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, full_name, phone, role::text, active, created_at
  from public.profiles
  where role = 'tecnico'
  order by created_at desc;
$$;

create or replace function public.get_technician_by_id(technician_id uuid)
returns table (
  id uuid,
  full_name text,
  phone text,
  role text,
  active boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, full_name, phone, role::text, active, created_at
  from public.profiles
  where id = technician_id and role = 'tecnico';
$$;

create or replace function public.get_technician_work_orders(technician_id uuid)
returns table (
  id uuid,
  guide_number text,
  current_status text
)
language sql
security definer
set search_path = public
as $$
  select id, guide_number, current_status
  from public.work_orders
  where technician_id = technician_id
  order by created_at desc;
$$;

-- ============================================================================
-- ✅ FIN DE LAS MIGRACIONES
-- ============================================================================
-- 
-- Todas las tablas, funciones y RPC están listas.
-- El backend ahora puede conectarse y funcionar correctamente.
--
-- ============================================================================
