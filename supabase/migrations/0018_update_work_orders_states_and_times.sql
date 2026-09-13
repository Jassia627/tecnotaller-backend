-- Migración 0018: Actualizar work_orders con nuevos estados (PENDIENTE/ACEPTADA) y campos de horario

-- Agregar columnas de horario
ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS scheduled_time timestamptz,
ADD COLUMN IF NOT EXISTS assigned_time timestamptz;

-- Actualizar estado INGRESADO a ACEPTADA (transición automática)
UPDATE public.work_orders
SET current_status = 'ACEPTADA'
WHERE current_status = 'INGRESADO';

-- Validar que los valores de current_status sean válidos
-- PENDIENTE: orden creada por cliente, esperando aceptación
-- ACEPTADA: orden aceptada por admin/técnico
-- EN_REVISION, ESPERANDO_REPUESTO, EN_REPARACION, REPARADO, LISTO_PARA_ENTREGA, ENTREGADO: estados de reparación
ALTER TABLE public.work_orders
ADD CONSTRAINT work_orders_status_valid CHECK (
  current_status IN ('PENDIENTE', 'ACEPTADA', 'EN_REVISION', 'ESPERANDO_REPUESTO', 'EN_REPARACION', 'REPARADO', 'LISTO_PARA_ENTREGA', 'ENTREGADO')
);

