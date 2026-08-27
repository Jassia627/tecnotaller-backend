-- Migración 0009: RPC functions para técnicos (evita RLS recursiva)
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
