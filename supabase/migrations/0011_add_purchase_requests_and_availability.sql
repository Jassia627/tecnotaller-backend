-- Migración 0011: Solicitudes de compra y disponibilidad de técnicos

-- ===== TABLA: Disponibilidad de Técnicos =====
CREATE TABLE IF NOT EXISTS public.technician_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  available boolean NOT NULL DEFAULT true,
  unavailable_until timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS technician_availability_technician_idx 
  ON public.technician_availability (technician_id, available);

-- ===== TABLA: Solicitudes de Compra =====
CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'PENDIENTE'
    CHECK (status IN ('PENDIENTE', 'ORDENADO', 'RECIBIDO', 'CANCELADO')),
  notes text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchase_requests_status_idx 
  ON public.purchase_requests (status, created_at);

CREATE INDEX IF NOT EXISTS purchase_requests_created_by_idx 
  ON public.purchase_requests (created_by, created_at);

-- ===== TABLA: Items de Solicitudes de Compra =====
CREATE TABLE IF NOT EXISTS public.purchase_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_request_id uuid NOT NULL REFERENCES public.purchase_requests (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  part_id uuid REFERENCES public.parts (id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchase_request_items_request_idx 
  ON public.purchase_request_items (purchase_request_id);

CREATE INDEX IF NOT EXISTS purchase_request_items_product_idx 
  ON public.purchase_request_items (product_id);

CREATE INDEX IF NOT EXISTS purchase_request_items_part_idx 
  ON public.purchase_request_items (part_id);

-- ===== FIN MIGRACIÓN 0011 =====
