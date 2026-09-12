-- Migración 0016: Crear tabla de proveedores

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suppliers_active_idx ON public.suppliers (active, created_at);
CREATE INDEX IF NOT EXISTS suppliers_email_idx ON public.suppliers (email);
CREATE INDEX IF NOT EXISTS suppliers_name_idx ON public.suppliers (name);

