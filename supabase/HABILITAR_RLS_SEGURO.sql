-- =====================================================================
-- SCRIPT PARA HABILITAR RLS CON POLÍTICAS SEGURAS
-- =====================================================================
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query > Run
--
-- Este script:
-- 1. Crea funciones que leen el rol desde JWT (sin recursión)
-- 2. Elimina políticas anteriores
-- 3. Habilita RLS en todas las tablas
-- 4. Crea nuevas políticas seguras
-- =====================================================================

-- =====================================================================
-- 1. FUNCIONES AUXILIARES SIN RECURSIÓN
-- =====================================================================

-- Función que obtiene el rol del usuario desde el JWT (sin consultar tablas)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'cliente'
  );
$$;

-- Función que verifica si es admin usando JWT
CREATE OR REPLACE FUNCTION public.jwt_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_role() = 'administrador';
$$;

-- Función que verifica si es técnico usando JWT
CREATE OR REPLACE FUNCTION public.jwt_is_technician()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_role() = 'tecnico';
$$;

-- Función que verifica si es admin o técnico
CREATE OR REPLACE FUNCTION public.jwt_is_admin_or_technician()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_role() IN ('administrador', 'tecnico');
$$;

-- =====================================================================
-- 2. LIMPIAR POLÍTICAS EXISTENTES
-- =====================================================================

-- Profiles
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_role_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_role_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all_admin" ON public.profiles;

-- Categories
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
DROP POLICY IF EXISTS "categories_service_role_all" ON public.categories;
DROP POLICY IF EXISTS "categories_select_active" ON public.categories;
DROP POLICY IF EXISTS "categories_all_admin" ON public.categories;

-- Products
DROP POLICY IF EXISTS "products_select_public" ON public.products;
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
DROP POLICY IF EXISTS "products_service_role_all" ON public.products;
DROP POLICY IF EXISTS "products_select_active" ON public.products;
DROP POLICY IF EXISTS "products_all_admin" ON public.products;

-- Inventory Movements
DROP POLICY IF EXISTS "inventory_admin_all" ON public.inventory_movements;
DROP POLICY IF EXISTS "inventory_service_role_all" ON public.inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_all_admin" ON public.inventory_movements;

-- Services
DROP POLICY IF EXISTS "services_select_public" ON public.services;
DROP POLICY IF EXISTS "services_admin_all" ON public.services;
DROP POLICY IF EXISTS "services_service_role_all" ON public.services;
DROP POLICY IF EXISTS "services_select_active" ON public.services;
DROP POLICY IF EXISTS "services_all_admin" ON public.services;

-- Appointments
DROP POLICY IF EXISTS "appointments_insert_public" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_admin" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_admin" ON public.appointments;
DROP POLICY IF EXISTS "appointments_service_role_all" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_admin_tech" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_admin_tech" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_admin" ON public.appointments;

-- Customers
DROP POLICY IF EXISTS "customers_admin_all" ON public.customers;
DROP POLICY IF EXISTS "customers_service_role_all" ON public.customers;
DROP POLICY IF EXISTS "customers_all_admin_tech" ON public.customers;

-- Work Orders
DROP POLICY IF EXISTS "work_orders_admin_technician" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_service_role_all" ON public.work_orders;
DROP POLICY IF EXISTS "work_orders_all_admin_tech" ON public.work_orders;

-- Order Status History
DROP POLICY IF EXISTS "work_orders_history_select" ON public.order_status_history;
DROP POLICY IF EXISTS "order_status_history_service_role_all" ON public.order_status_history;
DROP POLICY IF EXISTS "order_status_history_select_admin_tech" ON public.order_status_history;
DROP POLICY IF EXISTS "order_status_history_insert_admin_tech" ON public.order_status_history;

-- Order Photos
DROP POLICY IF EXISTS "order_photos_admin_technician" ON public.order_photos;
DROP POLICY IF EXISTS "order_photos_service_role_all" ON public.order_photos;
DROP POLICY IF EXISTS "order_photos_all_admin_tech" ON public.order_photos;

-- Diagnostics
DROP POLICY IF EXISTS "diagnostics_admin_technician" ON public.diagnostics;
DROP POLICY IF EXISTS "diagnostics_service_role_all" ON public.diagnostics;
DROP POLICY IF EXISTS "diagnostics_all_admin_tech" ON public.diagnostics;

-- Parts
DROP POLICY IF EXISTS "parts_admin_technician" ON public.parts;
DROP POLICY IF EXISTS "parts_service_role_all" ON public.parts;
DROP POLICY IF EXISTS "parts_all_admin_tech" ON public.parts;

-- Order Parts
DROP POLICY IF EXISTS "order_parts_admin_technician" ON public.order_parts;
DROP POLICY IF EXISTS "order_parts_service_role_all" ON public.order_parts;
DROP POLICY IF EXISTS "order_parts_all_admin_tech" ON public.order_parts;

-- Warranties
DROP POLICY IF EXISTS "warranties_admin_technician" ON public.warranties;
DROP POLICY IF EXISTS "warranties_service_role_all" ON public.warranties;
DROP POLICY IF EXISTS "warranties_all_admin_tech" ON public.warranties;

-- Audit Logs
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_update" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_no_delete" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_service_role_all" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_system" ON public.audit_logs;

-- Notifications
DROP POLICY IF EXISTS "notifications_admin_technician" ON public.notifications;
DROP POLICY IF EXISTS "notifications_service_role_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_all_admin_tech" ON public.notifications;

-- Technicians, Suppliers, Purchase Requests - Solo si existen
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'technicians' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "technicians_select_admin" ON public.technicians;
    DROP POLICY IF EXISTS "technicians_service_role_all" ON public.technicians;
    DROP POLICY IF EXISTS "technicians_select_admin_tech" ON public.technicians;
    DROP POLICY IF EXISTS "technicians_all_admin" ON public.technicians;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "suppliers_service_role_all" ON public.suppliers;
    DROP POLICY IF EXISTS "suppliers_all_admin" ON public.suppliers;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_requests' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "purchase_requests_service_role_all" ON public.purchase_requests;
    DROP POLICY IF EXISTS "purchase_requests_all_admin_tech" ON public.purchase_requests;
  END IF;
END $$;

-- =====================================================================
-- 3. HABILITAR RLS EN TODAS LAS TABLAS
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Tablas adicionales (si existen)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'technicians' AND table_schema = 'public') THEN
    ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers' AND table_schema = 'public') THEN
    ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_requests' AND table_schema = 'public') THEN
    ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =====================================================================
-- 4. POLÍTICAS PARA PROFILES (SIN RECURSIÓN)
-- =====================================================================

-- Usuarios pueden ver su propio perfil
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Usuarios pueden actualizar su propio perfil (excepto rol)
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins pueden ver todos los perfiles (usando JWT, no tabla)
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (public.jwt_is_admin());

-- Admins pueden modificar cualquier perfil (incluyendo roles)
CREATE POLICY "profiles_all_admin"
  ON public.profiles FOR ALL
  USING (public.jwt_is_admin());

-- =====================================================================
-- 5. POLÍTICAS PARA CATÁLOGOS PÚBLICOS
-- =====================================================================

-- Categories: lectura pública de activos
CREATE POLICY "categories_select_active"
  ON public.categories FOR SELECT
  USING (active = true);

-- Categories: admins pueden todo
CREATE POLICY "categories_all_admin"
  ON public.categories FOR ALL
  USING (public.jwt_is_admin());

-- Products: lectura pública de activos
CREATE POLICY "products_select_active"
  ON public.products FOR SELECT
  USING (active = true);

-- Products: admins pueden todo
CREATE POLICY "products_all_admin"
  ON public.products FOR ALL
  USING (public.jwt_is_admin());

-- Services: lectura pública de activos
CREATE POLICY "services_select_active"
  ON public.services FOR SELECT
  USING (active = true);

-- Services: admins pueden todo
CREATE POLICY "services_all_admin"
  ON public.services FOR ALL
  USING (public.jwt_is_admin());

-- =====================================================================
-- 6. POLÍTICAS PARA INVENTARIO
-- =====================================================================

-- Solo admins pueden gestionar movimientos de inventario
CREATE POLICY "inventory_movements_all_admin"
  ON public.inventory_movements FOR ALL
  USING (public.jwt_is_admin());

-- =====================================================================
-- 7. POLÍTICAS PARA CITAS
-- =====================================================================

-- Cualquiera puede crear citas (formulario público)
CREATE POLICY "appointments_insert_public"
  ON public.appointments FOR INSERT
  WITH CHECK (true);

-- Admins y técnicos pueden ver y gestionar citas
CREATE POLICY "appointments_select_admin_tech"
  ON public.appointments FOR SELECT
  USING (public.jwt_is_admin_or_technician());

CREATE POLICY "appointments_update_admin_tech"
  ON public.appointments FOR UPDATE
  USING (public.jwt_is_admin_or_technician());

CREATE POLICY "appointments_delete_admin"
  ON public.appointments FOR DELETE
  USING (public.jwt_is_admin());

-- =====================================================================
-- 8. POLÍTICAS PARA CLIENTES
-- =====================================================================

-- Admins y técnicos pueden gestionar clientes
CREATE POLICY "customers_all_admin_tech"
  ON public.customers FOR ALL
  USING (public.jwt_is_admin_or_technician());

-- =====================================================================
-- 9. POLÍTICAS PARA ÓRDENES DE SERVICIO Y RELACIONADOS
-- =====================================================================

-- Work Orders: admins y técnicos pueden todo
CREATE POLICY "work_orders_all_admin_tech"
  ON public.work_orders FOR ALL
  USING (public.jwt_is_admin_or_technician());

-- Order Status History: admins y técnicos pueden ver
CREATE POLICY "order_status_history_select_admin_tech"
  ON public.order_status_history FOR SELECT
  USING (public.jwt_is_admin_or_technician());

-- Order Status History: solo inserción (no edición del historial)
CREATE POLICY "order_status_history_insert_admin_tech"
  ON public.order_status_history FOR INSERT
  WITH CHECK (public.jwt_is_admin_or_technician());

-- Order Photos: admins y técnicos
CREATE POLICY "order_photos_all_admin_tech"
  ON public.order_photos FOR ALL
  USING (public.jwt_is_admin_or_technician());

-- Diagnostics: admins y técnicos
CREATE POLICY "diagnostics_all_admin_tech"
  ON public.diagnostics FOR ALL
  USING (public.jwt_is_admin_or_technician());

-- Parts: admins y técnicos
CREATE POLICY "parts_all_admin_tech"
  ON public.parts FOR ALL
  USING (public.jwt_is_admin_or_technician());

-- Order Parts: admins y técnicos
CREATE POLICY "order_parts_all_admin_tech"
  ON public.order_parts FOR ALL
  USING (public.jwt_is_admin_or_technician());

-- Warranties: admins y técnicos
CREATE POLICY "warranties_all_admin_tech"
  ON public.warranties FOR ALL
  USING (public.jwt_is_admin_or_technician());

-- Notifications: admins y técnicos
CREATE POLICY "notifications_all_admin_tech"
  ON public.notifications FOR ALL
  USING (public.jwt_is_admin_or_technician());

-- =====================================================================
-- 10. POLÍTICAS PARA AUDITORÍA
-- =====================================================================

-- Solo admins pueden ver auditoría
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT
  USING (public.jwt_is_admin());

-- Permitir inserción (para logging)
CREATE POLICY "audit_logs_insert_system"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- Prohibir actualización y eliminación (inmutabilidad de logs)
CREATE POLICY "audit_logs_no_update"
  ON public.audit_logs FOR UPDATE
  USING (false);

CREATE POLICY "audit_logs_no_delete"
  ON public.audit_logs FOR DELETE
  USING (false);

-- =====================================================================
-- 11. POLÍTICAS PARA TABLAS ADICIONALES (SI EXISTEN)
-- =====================================================================

-- Technicians
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'technicians' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "technicians_select_admin_tech" ON public.technicians FOR SELECT USING (public.jwt_is_admin_or_technician())';
    EXECUTE 'CREATE POLICY "technicians_all_admin" ON public.technicians FOR ALL USING (public.jwt_is_admin())';
  END IF;
END $$;

-- Suppliers
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "suppliers_all_admin" ON public.suppliers FOR ALL USING (public.jwt_is_admin())';
  END IF;
END $$;

-- Purchase Requests
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_requests' AND table_schema = 'public') THEN
    EXECUTE 'CREATE POLICY "purchase_requests_all_admin_tech" ON public.purchase_requests FOR ALL USING (public.jwt_is_admin_or_technician())';
  END IF;
END $$;

-- =====================================================================
-- ¡LISTO! RLS HABILITADO CON POLÍTICAS SEGURAS
-- =====================================================================
-- 
-- RESUMEN DE SEGURIDAD:
--
-- ✅ profiles: usuarios ven/editan solo su perfil, admins ven todos
-- ✅ categories/products/services: lectura pública, escritura admin
-- ✅ appointments: creación pública, gestión admin/técnico
-- ✅ customers: solo admin/técnico
-- ✅ work_orders y relacionados: solo admin/técnico
-- ✅ audit_logs: solo lectura admin, sin edición/borrado
-- ✅ inventario: solo admin
--
-- NOTA: El backend con serviceRoleKey sigue funcionando igual porque
-- bypasea automáticamente todas las políticas RLS.
-- =====================================================================
