-- =====================================================================
-- TECNOTALLER — Esquema completo de base de datos (Supabase/Postgres)
-- Pegar TODO este contenido en: Dashboard > SQL Editor > New query > Run
--
-- IMPORTANTE antes de ejecutar:
--  1. Habilitar la extensión pg_cron en Dashboard > Database > Extensions
--     (para cancelar citas vencidas y vencer garantías automáticamente).
--  2. La extensión pgcrypto ya viene habilitada por defecto en Supabase.
-- =====================================================================

-- =====================================================================
-- 1. TIPOS Y TABLAS BASE
-- =====================================================================

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

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 2. PRODUCTOS E INVENTARIO
-- =====================================================================

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

-- =====================================================================
-- 3. SERVICIOS Y CITAS
-- =====================================================================

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

-- =====================================================================
-- 4. ÓRDENES DE SERVICIO (NÚCLEO)
-- =====================================================================

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

-- =====================================================================
-- 5. DIAGNÓSTICO Y REPUESTOS
-- =====================================================================

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

-- =====================================================================
-- 6. GARANTÍAS Y AUDITORÍA
-- =====================================================================

create table if not exists public.warranties (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  period_days integer not null check (period_days > 0),
  expires_at timestamptz not null,
  status text not null default 'vigente' check (status in ('vigente', 'vencida')),
  created_at timestamptz not null default now()
);

create index if not exists warranties_work_order_idx on public.warranties (work_order_id);

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

-- =====================================================================
-- 7. NOTIFICACIONES
-- =====================================================================

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

-- =====================================================================
-- 8. FUNCIONES AUXILIARES
-- =====================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
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

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'administrador');
$$;

create or replace function public.is_technician()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'tecnico');
$$;

-- =====================================================================
-- 9. FUNCIONES TRANSACCIONALES (RNF-14)
-- =====================================================================

create or replace function public.register_inventory_movement(
  p_product_id uuid, p_type text, p_quantity integer, p_reason text, p_user_id uuid
)
returns public.products language plpgsql security definer set search_path = public as $$
declare v_stock integer; v_result public.products;
begin
  select stock into v_stock from public.products where id = p_product_id for update;
  if not found then raise exception 'Producto no encontrado'; end if;
  if p_type = 'OUT' then
    if v_stock < p_quantity then raise exception 'Stock insuficiente'; end if;
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

create or replace function public.transition_order_status(
  p_work_order_id uuid, p_from_status text, p_to_status text, p_user_id uuid
)
returns public.work_orders language plpgsql security definer set search_path = public as $$
declare v_result public.work_orders;
begin
  update public.work_orders
  set current_status = p_to_status, updated_at = now()
  where id = p_work_order_id and current_status = p_from_status;
  if not found then raise exception 'Transición de estado inválida'; end if;
  insert into public.order_status_history (work_order_id, from_status, to_status, user_id)
  values (p_work_order_id, p_from_status, p_to_status, p_user_id);
  select * into v_result from public.work_orders where id = p_work_order_id;
  return v_result;
end;
$$;

create or replace function public.assign_part_to_order(
  p_work_order_id uuid, p_part_id uuid, p_quantity integer
)
returns public.parts language plpgsql security definer set search_path = public as $$
declare v_stock integer; v_price numeric; v_result public.parts;
begin
  select stock, sale_price into v_stock, v_price from public.parts where id = p_part_id for update;
  if not found then raise exception 'Repuesto no encontrado'; end if;
  if v_stock < p_quantity then raise exception 'Stock de repuesto insuficiente'; end if;
  update public.parts set stock = stock - p_quantity, updated_at = now() where id = p_part_id;
  insert into public.order_parts (work_order_id, part_id, quantity, unit_price)
  values (p_work_order_id, p_part_id, p_quantity, v_price);
  select * into v_result from public.parts where id = p_part_id;
  return v_result;
end;
$$;

-- =====================================================================
-- 10. CIFRADO DE CONTRASEÑA DE DISPOSITIVO (RNF-05)
--     IMPORTANTE: cambia la clave 'TECNOTALLER_CLAVE_SECRETA' por una propia.
-- =====================================================================

create extension if not exists pgcrypto;

create or replace function public.encrypt_order_password(p_work_order_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.work_orders
  set device_password_encrypted = pgp_sym_encrypt(p_password, 'TECNOTALLER_CLAVE_SECRETA')
  where id = p_work_order_id;
end;
$$;

-- =====================================================================
-- 11. TRIGGER DE NOTIFICACIÓN (OBSERVER)
-- =====================================================================

create or replace function public.notify_on_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_email text;
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

-- =====================================================================
-- 12. ROW LEVEL SECURITY (RLS)
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.customers enable row level security;
alter table public.work_orders enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_photos enable row level security;
alter table public.diagnostics enable row level security;
alter table public.parts enable row level security;
alter table public.order_parts enable row level security;
alter table public.warranties enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;

-- profiles: un usuario lee/actualiza su propio perfil
create policy "profiles_select_self" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_self" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_select_admin" on public.profiles for select using (public.is_admin());
create policy "profiles_update_role_admin" on public.profiles for update using (public.is_admin());

-- catálogo público
create policy "products_select_public" on public.products for select using (active = true);
create policy "categories_select_public" on public.categories for select using (active = true);
create policy "services_select_public" on public.services for select using (active = true);

-- escritura solo admin
create policy "products_admin_all" on public.products for all using (public.is_admin());
create policy "categories_admin_all" on public.categories for all using (public.is_admin());
create policy "inventory_admin_all" on public.inventory_movements for all using (public.is_admin());
create policy "services_admin_all" on public.services for all using (public.is_admin());
create policy "customers_admin_all" on public.customers for all using (public.is_admin());

-- citas: creación pública (sin auth), gestión solo admin
create policy "appointments_insert_public" on public.appointments for insert with check (true);
create policy "appointments_select_admin" on public.appointments for select using (public.is_admin());
create policy "appointments_update_admin" on public.appointments for update using (public.is_admin());

-- órdenes y relacionados: admin o técnico
create policy "work_orders_admin_technician" on public.work_orders for all using (public.is_admin() or public.is_technician());
create policy "work_orders_history_select" on public.order_status_history for select using (public.is_admin() or public.is_technician());
create policy "order_photos_admin_technician" on public.order_photos for all using (public.is_admin() or public.is_technician());
create policy "diagnostics_admin_technician" on public.diagnostics for all using (public.is_admin() or public.is_technician());
create policy "parts_admin_technician" on public.parts for all using (public.is_admin() or public.is_technician());
create policy "order_parts_admin_technician" on public.order_parts for all using (public.is_admin() or public.is_technician());
create policy "warranties_admin_technician" on public.warranties for all using (public.is_admin() or public.is_technician());
create policy "notifications_admin_technician" on public.notifications for all using (public.is_admin() or public.is_technician());

-- auditoría: lectura admin, sin UPDATE/DELETE (RF-20)
create policy "audit_logs_select_admin" on public.audit_logs for select using (public.is_admin());
create policy "audit_logs_no_update" on public.audit_logs for update using (false);
create policy "audit_logs_no_delete" on public.audit_logs for delete using (false);

-- =====================================================================
-- 13. JOBS PROGRAMADOS (requiere pg_cron habilitado)
--     Se ejecutan solo si pg_cron está disponible; de lo contrario se omiten.
-- =====================================================================

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'cancel-expired-appointments',
      '* * * * *',
      $$ update public.appointments set status = 'cancelada'
         where status = 'pendiente' and date < now() - interval '15 minutes'; $$
    );
    perform cron.schedule(
      'expire-warranties',
      '0 0 * * *',
      $$ update public.warranties set status = 'vencida'
         where status = 'vigente' and expires_at < now(); $$
    );
  end if;
end;
$$;

-- =====================================================================
-- LISTO. Ahora configura un usuario administrador inicial:
--  1. Crea un usuario desde la app (POST /api/v1/auth/register) o desde
--     Dashboard > Authentication > Users.
--  2. Ejecuta este UPDATE para darle rol administrador (cambia el email):
--     update public.profiles set role = 'administrador'
--     where id = (select id from auth.users where email = 'TU_EMAIL');
-- =====================================================================
