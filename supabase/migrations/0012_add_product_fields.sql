-- Migración 0012: Agregar campos brand, color, specs a productos

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT 'Genérico',
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS specs jsonb;

-- Crear índice para specs (para búsquedas futuras)
CREATE INDEX IF NOT EXISTS products_specs_idx ON public.products USING GIN (specs);

-- Actualizar updated_at para tabla products
UPDATE public.products SET updated_at = now() WHERE brand = 'Genérico' AND color IS NULL;
