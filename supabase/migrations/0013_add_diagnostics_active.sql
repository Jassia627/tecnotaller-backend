-- Migración 0013: Agregar campo active para soft-delete en diagnostics

ALTER TABLE public.diagnostics
ADD COLUMN active boolean NOT NULL DEFAULT true;

-- Crear índice para filtrar por estado
CREATE INDEX IF NOT EXISTS diagnostics_active_idx ON public.diagnostics (active, work_order_id);

-- Comentario para documentar
COMMENT ON COLUMN public.diagnostics.active IS 'Soft-delete: false significa diagnóstico eliminado lógicamente';
