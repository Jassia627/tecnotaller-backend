-- Migración 0017: Completar estructura de purchase_requests con supplier, totales, y movimientos de parts

-- ===== AGREGAR CAMPOS A purchase_requests =====
ALTER TABLE public.purchase_requests
ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers (id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subtotal numeric(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total numeric(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS purchase_requests_supplier_idx ON public.purchase_requests (supplier_id);

-- ===== AGREGAR CAMPO active A parts =====
ALTER TABLE public.parts
ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- ===== TABLA: Movimientos de Inventario para Repuestos =====
CREATE TABLE IF NOT EXISTS public.inventory_movements_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.parts (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('IN', 'OUT')),
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_movements_parts_part_idx 
  ON public.inventory_movements_parts (part_id, created_at);

CREATE INDEX IF NOT EXISTS inventory_movements_parts_type_idx 
  ON public.inventory_movements_parts (type, created_at);

