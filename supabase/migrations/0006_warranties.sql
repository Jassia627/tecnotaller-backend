-- Migración 0006: garantías + actualización de órdenes
create table if not exists public.warranties (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  period_days integer not null check (period_days > 0),
  expires_at timestamptz not null,
  status text not null default 'vigente' check (status in ('vigente', 'vencida')),
  created_at timestamptz not null default now()
);

create index if not exists warranties_work_order_idx on public.warranties (work_order_id);

-- Job diario: marcar garantías vencidas
select cron.schedule(
  'expire-warranties',
  '0 0 * * *',
  $$
    update public.warranties
    set status = 'vencida'
    where status = 'vigente' and expires_at < now();
  $$
);

-- ===== ROW LEVEL SECURITY =====
alter table public.warranties enable row level security;

create policy "warranties_admin_technician" on public.warranties
  for all using (public.is_admin() or public.is_technician());
