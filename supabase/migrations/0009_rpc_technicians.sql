-- Migración 0009: Actividades de reparación + RPC functions para técnicos
-- Tabla para registrar pasos/actividades durante la reparación

create table if not exists public.work_order_activities (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  technician_id uuid not null references public.profiles (id) on delete set null,
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists work_order_activities_work_order_idx 
  on public.work_order_activities (work_order_id, created_at);

-- RPC functions para técnicos (evita RLS recursiva)
-- Estas funciones se ejecutan con security definer, evitando RLS

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
