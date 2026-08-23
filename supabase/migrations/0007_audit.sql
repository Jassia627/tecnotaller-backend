-- Migración 0007: auditoría (registro inmutable)
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

-- ===== ROW LEVEL SECURITY =====
alter table public.audit_logs enable row level security;

-- Inmutable: solo inserción por servicio y lectura por admin (sin UPDATE/DELETE)
create policy "audit_logs_select_admin" on public.audit_logs
  for select using (public.is_admin());

-- Impedir modificación/borrado desde RLS (RF-20: registros no modificables por usuarios normales)
create policy "audit_logs_no_update" on public.audit_logs
  for update using (false);

create policy "audit_logs_no_delete" on public.audit_logs
  for delete using (false);
