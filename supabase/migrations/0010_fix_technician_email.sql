-- Migración 0010: Corregir funciones RPC para incluir email de técnicos
-- El email viene de auth.users, no de profiles

-- Actualizar get_technicians para incluir email
create or replace function public.get_technicians()
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  role text,
  active boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select 
    p.id, 
    p.full_name, 
    au.email,
    p.phone, 
    p.role::text, 
    p.active, 
    p.created_at
  from public.profiles p
  left join auth.users au on p.id = au.id
  where p.role = 'tecnico'
  order by p.created_at desc;
$$;

-- Actualizar get_technician_by_id para incluir email
create or replace function public.get_technician_by_id(technician_id uuid)
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  role text,
  active boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select 
    p.id, 
    p.full_name, 
    au.email,
    p.phone, 
    p.role::text, 
    p.active, 
    p.created_at
  from public.profiles p
  left join auth.users au on p.id = au.id
  where p.id = technician_id and p.role = 'tecnico';
$$;

-- Función para actualizar estado activo de técnico
create or replace function public.set_technician_active(technician_id uuid, is_active boolean)
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  role text,
  active boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  update public.profiles p
  set active = is_active
  where p.id = technician_id and p.role = 'tecnico'
  returning 
    p.id,
    p.full_name,
    (select email from auth.users au where au.id = p.id) as email,
    p.phone,
    p.role::text,
    p.active,
    p.created_at;
$$;
