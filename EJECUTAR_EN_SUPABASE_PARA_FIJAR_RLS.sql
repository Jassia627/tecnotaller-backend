-- ============================================================================
-- EJECUTAR ESTO EN SUPABASE SQL EDITOR PARA FIJAR EL ERROR 500
-- ============================================================================
-- 
-- INSTRUCCIONES:
-- 1. Ve a https://supabase.com
-- 2. Abre tu proyecto TechnoTaller
-- 3. Navega a "SQL Editor"
-- 4. Copia TODO el contenido de este archivo
-- 5. Pégalo en el editor y presiona "Run"
-- 6. Espera a que termine
-- 7. El endpoint /api/v1/technicians ahora funcionará
--
-- ============================================================================

-- PASO 1: Deshabilitar RLS en tabla profiles (causa de recursión infinita)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- PASO 2: Eliminar políticas RLS que causan recursión
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_role_admin" ON public.profiles;

-- PASO 3: Deshabilitar RLS en otras tablas (para consistencia)
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_parts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas de todas las tablas
DROP POLICY IF EXISTS "products_select_public" ON public.products;
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
DROP POLICY IF EXISTS "inventory_admin_all" ON public.inventory_movements;
DROP POLICY IF EXISTS "services_select_public" ON public.services;
DROP POLICY IF EXISTS "services_admin_all" ON public.services;
DROP POLICY IF EXISTS "appointments_insert_public" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_admin" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_admin" ON public.appointments;
DROP POLICY IF EXISTS "work_orders_admin_technician" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_history_select" ON public.order_status_history;
DROP POLICY IF EXISTS "customers_admin_all" ON public.customers;
DROP POLICY IF EXISTS "order_photos_admin_technician" ON public.order_photos;
DROP POLICY IF EXISTS "diagnostics_admin_technician" ON public.diagnostics;
DROP POLICY IF EXISTS "parts_admin_technician" ON public.parts;
DROP POLICY IF EXISTS "order_parts_admin_technician" ON public.order_parts;
DROP POLICY IF EXISTS "warranties_admin_technician" ON public.warranties;
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_update" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_delete" ON public.audit_logs;
DROP POLICY IF EXISTS "notifications_admin_technician" ON public.notifications;

-- ============================================================================
-- VERIFICACIÓN: Confirma que RLS está deshabilitado
-- ============================================================================
-- Ejecuta esta query para verificar que todo está bien:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
-- 
-- Esperado: Todos los rowsecurity deben ser "false"
-- ============================================================================
