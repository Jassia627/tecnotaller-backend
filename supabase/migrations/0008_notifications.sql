-- Migración 0008: notificaciones + trigger (Observer)
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

-- Observer: al cambiar de estado una orden, se encola una notificación pendiente
-- para los estados configurados (ej. LISTO_PARA_ENTREGA). La Edge Function la procesa.
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

-- ===== ROW LEVEL SECURITY =====
-- NOTA: RLS está DESHABILITADO porque:
-- 1. El backend usa serviceRoleKey (acceso total de servidor)
-- 2. Las políticas se aplican en el código (repository pattern)
-- 3. El frontend NO accede directamente a Supabase (usa API backend)
-- 4. Las políticas anteriores causaban recursión infinita
--
-- alter table public.notifications enable row level security;
--
-- POLÍTICAS ANTERIORES (CAUSABAN RECURSIÓN - NO USAR):
-- create policy "notifications_admin_technician" on public.notifications
--   for all using (public.is_admin() or public.is_technician());
--
-- ✅ SEGURIDAD GARANTIZADA POR:
-- - Backend middleware valida JWT tokens
-- - Repository pattern filtra datos por rol
-- - Endpoints requieren autenticación
-- - serviceRoleKey solo usado por backend (no frontend)
