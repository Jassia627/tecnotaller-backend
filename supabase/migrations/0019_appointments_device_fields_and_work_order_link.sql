-- Migración 0019: Campos de dispositivo en citas y enlace cita-orden
-- Permite persistir datos del dispositivo en la cita y vincular citas con órdenes de servicio

-- 1. Agregar campos de dispositivo a appointments (opcionales para citas que no requieren ingreso)
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS device_brand text,
ADD COLUMN IF NOT EXISTS device_model text,
ADD COLUMN IF NOT EXISTS problem_description text;

-- 2. Agregar appointment_id a work_orders para vincular cita con orden (evita duplicados)
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;

-- 3. Crear índice único para garantizar una orden por cita (idempotencia)
CREATE UNIQUE INDEX IF NOT EXISTS work_orders_appointment_id_unique 
ON public.work_orders(appointment_id) 
WHERE appointment_id IS NOT NULL;

-- 4. Crear índice para búsquedas por appointment_id
CREATE INDEX IF NOT EXISTS work_orders_appointment_idx 
ON public.work_orders(appointment_id);

-- 5. Agregar campos de servicio completado en el momento (para citas que no requieren ingreso)
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS completed_services text,
ADD COLUMN IF NOT EXISTS completed_notes text,
ADD COLUMN IF NOT EXISTS completed_at timestamptz;

COMMENT ON COLUMN public.appointments.device_brand IS 'Marca del dispositivo (opcional, para citas que requieren ingreso al taller)';
COMMENT ON COLUMN public.appointments.device_model IS 'Modelo del dispositivo (opcional)';
COMMENT ON COLUMN public.appointments.problem_description IS 'Descripción del problema reportado por el cliente';
COMMENT ON COLUMN public.work_orders.appointment_id IS 'Referencia a la cita que originó esta orden (único, garantiza idempotencia)';
COMMENT ON COLUMN public.appointments.completed_services IS 'Servicios realizados en el momento (para citas completadas sin ingreso)';
COMMENT ON COLUMN public.appointments.completed_notes IS 'Notas adicionales del servicio completado';
COMMENT ON COLUMN public.appointments.completed_at IS 'Fecha y hora en que se completó el servicio';
