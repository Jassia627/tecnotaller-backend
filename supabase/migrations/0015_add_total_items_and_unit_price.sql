-- Migración 0015: Agregar columnas total_items y unit_price a purchase_requests

ALTER TABLE public.purchase_requests
ADD COLUMN IF NOT EXISTS total_items integer NOT NULL DEFAULT 0;

ALTER TABLE public.purchase_request_items
ADD COLUMN IF NOT EXISTS unit_price numeric(12, 2) NOT NULL DEFAULT 0;

-- Actualizar los registros existentes con el conteo correcto
UPDATE public.purchase_requests pr
SET total_items = (
  SELECT COUNT(*) FROM public.purchase_request_items
  WHERE purchase_request_id = pr.id
);

