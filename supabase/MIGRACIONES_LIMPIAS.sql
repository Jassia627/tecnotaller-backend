-- ============================================================================
-- MIGRACIONES LIMPIAS - SIN CONFLICTOS
-- ============================================================================
-- Ejecuta esto en Supabase SQL Editor
-- ============================================================================

-- ===== MIGRACIÓN 1: ENUMS Y TABLAS BASE =====
CREATE TYPE public.role_enum AS ENUM ('cliente', 'tecnico', 'administrador');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  role public.role_enum NOT NULL DEFAULT 'cliente',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_role_idx ON public.profiles (role);

-- ===== TRIGGER: Crear perfil al registrarse =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'role', 'cliente')::public.role_enum
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===== TRIGGER: updated_at automático =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ===== FUNCIONES HELPER =====
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'administrador'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_technician()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'tecnico'
  );
$$;

-- ===== MIGRACIÓN 2: PRODUCTOS E INVENTARIO =====
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  category_id uuid REFERENCES public.categories (id) ON DELETE SET NULL,
  purchase_price numeric(12,2) NOT NULL DEFAULT 0,
  sale_price numeric(12,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('IN', 'OUT')),
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_active_idx ON public.products (active);
CREATE INDEX products_category_idx ON public.products (category_id);
CREATE INDEX inventory_movements_product_idx ON public.inventory_movements (product_id, created_at);

-- ===== MIGRACIÓN 3: SERVICIOS Y CITAS =====
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  phone text NOT NULL,
  date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'confirmada', 'cancelada', 'completada')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX appointments_date_idx ON public.appointments (date);
CREATE INDEX appointments_status_idx ON public.appointments (status);

-- ===== MIGRACIÓN 4: ÓRDENES DE SERVICIO =====
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  full_name text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers (id) ON DELETE SET NULL,
  technician_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  device_brand text NOT NULL,
  device_model text NOT NULL,
  device_serial text NOT NULL,
  problem_description text NOT NULL,
  device_password_encrypted text,
  accessories text,
  current_status text NOT NULL DEFAULT 'INGRESADO'
    CHECK (current_status IN (
      'INGRESADO', 'EN_REVISION', 'ESPERANDO_REPUESTO',
      'EN_REPARACION', 'REPARADO', 'LISTO_PARA_ENTREGA', 'ENTREGADO'
    )),
  exit_final_state text,
  exit_repairs_performed text,
  exit_parts_used text,
  exit_observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('inicial', 'final')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX work_orders_guide_idx ON public.work_orders (guide_number);
CREATE INDEX work_orders_status_idx ON public.work_orders (current_status);
CREATE INDEX work_orders_technician_idx ON public.work_orders (technician_id);
CREATE INDEX order_history_work_order_idx ON public.order_status_history (work_order_id, created_at);

-- ===== MIGRACIÓN 5: DIAGNÓSTICOS Y REPUESTOS =====
CREATE TABLE public.diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  technician_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  observations text NOT NULL,
  faults text NOT NULL,
  recommended_actions text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text NOT NULL UNIQUE,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  purchase_price numeric(12,2) NOT NULL DEFAULT 0,
  sale_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES public.parts (id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX diagnostics_work_order_idx ON public.diagnostics (work_order_id, created_at);
CREATE INDEX order_parts_work_order_idx ON public.order_parts (work_order_id);

-- ===== MIGRACIÓN 6: GARANTÍAS =====
CREATE TABLE public.warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  period_days integer NOT NULL CHECK (period_days > 0),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente', 'vencida')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX warranties_work_order_idx ON public.warranties (work_order_id);

-- ===== MIGRACIÓN 7: AUDITORÍA =====
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_entity_idx ON public.audit_logs (entity, created_at);
CREATE INDEX audit_logs_user_idx ON public.audit_logs (user_id, created_at);

-- ===== MIGRACIÓN 8: NOTIFICACIONES =====
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders (id) ON DELETE CASCADE,
  to_email text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'enviada', 'fallida')),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_work_order_idx ON public.notifications (work_order_id, created_at);

-- ===== RPC FUNCTIONS: TÉCNICOS =====
CREATE OR REPLACE FUNCTION public.get_technicians()
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  role text,
  active boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, phone, role::text, active, created_at
  FROM public.profiles
  WHERE role = 'tecnico'
  ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_technician_by_id(technician_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  role text,
  active boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, phone, role::text, active, created_at
  FROM public.profiles
  WHERE id = technician_id AND role = 'tecnico';
$$;

CREATE OR REPLACE FUNCTION public.get_technician_work_orders(technician_id uuid)
RETURNS TABLE (
  id uuid,
  guide_number text,
  current_status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, guide_number, current_status
  FROM public.work_orders
  WHERE technician_id = technician_id
  ORDER BY created_at DESC;
$$;

-- ============================================================================
-- ✅ MIGRACIONES COMPLETADAS
-- ============================================================================
-- Todas las tablas están creadas y listas para usar.
-- El backend puede conectarse ahora.
-- ============================================================================
