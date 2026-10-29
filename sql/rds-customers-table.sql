-- ============================================================================
-- Script para crear la tabla customers en Amazon RDS for PostgreSQL
-- ============================================================================
-- Este script debe ejecutarse manualmente en la instancia RDS antes de usar
-- DATA_PROVIDER=postgres en el backend.
--
-- La estructura es equivalente a la tabla customers en Supabase Cloud.
-- NO ejecutar contra Supabase.
-- ============================================================================

-- Habilitar la extensión para generar UUIDs si no existe
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear la tabla customers
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  full_name text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Crear índice para búsquedas por email (opcional, mejora rendimiento)
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers (email);

-- Crear índice para búsquedas por teléfono (opcional, mejora rendimiento)
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone);

-- Crear índice para ordenamiento por fecha de creación
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers (created_at DESC);

-- Comentarios de documentación
COMMENT ON TABLE public.customers IS 'Clientes del taller de servicio técnico';
COMMENT ON COLUMN public.customers.id IS 'Identificador único del cliente (UUID autogenerado)';
COMMENT ON COLUMN public.customers.email IS 'Correo electrónico del cliente (opcional)';
COMMENT ON COLUMN public.customers.full_name IS 'Nombre completo del cliente (obligatorio)';
COMMENT ON COLUMN public.customers.phone IS 'Teléfono del cliente (opcional)';
COMMENT ON COLUMN public.customers.created_at IS 'Fecha de creación del registro';

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Esta tabla es INDEPENDIENTE de la tabla customers en Supabase Cloud.
--    Los datos NO se sincronizan automáticamente entre ambos entornos.
--
-- 2. Las órdenes de trabajo (work_orders) permanecen en Supabase Cloud.
--    Un cliente creado en RDS NO podrá asociarse a órdenes en Supabase.
--
-- 3. La autenticación sigue usando Supabase Auth en ambos entornos.
-- ============================================================================
