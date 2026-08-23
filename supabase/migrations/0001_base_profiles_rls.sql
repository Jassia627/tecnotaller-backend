-- Migración 0001: esquema base + perfiles + roles + RLS
-- Ejecutar en el SQL Editor de Supabase o con `supabase db push`.

-- Enums de dominio
create type public.role_enum as enum ('cliente', 'tecnico', 'administrador');

-- Tabla de perfiles (extiende auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.role_enum not null default 'cliente',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger para crear perfil automáticamente al registrarse
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

-- updated_at automático
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

-- Índices
create index if not exists profiles_role_idx on public.profiles (role);

-- ===== ROW LEVEL SECURITY =====
alter table public.profiles enable row level security;

-- Un usuario puede leer su propio perfil
create policy "profiles_select_self" on public.profiles
  for select using (auth.uid() = id);

-- Un usuario puede actualizar su propio perfil (excepto el rol)
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Solo administradores pueden ver todos los perfiles
create policy "profiles_select_admin" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'administrador'
    )
  );

-- Solo administradores pueden actualizar roles
create policy "profiles_update_role_admin" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'administrador'
    )
  );

-- Helper: comprobar rol del usuario autenticado
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
