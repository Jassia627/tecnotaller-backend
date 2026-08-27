-- ============================================================================
-- FIX: Corregir políticas RLS recursivas en tabla 'profiles'
-- ============================================================================
-- 
-- PROBLEMA: 
-- - GET /api/v1/technicians devuelve error 500
-- - Error: "infinite recursion detected in policy for relation 'profiles'"
-- - Causa: Las políticas RLS en 'profiles' tienen referencias circulares
--
-- SOLUCIÓN:
-- - Deshabilitar temporalmente RLS en 'profiles' durante desarrollo
-- - O crear políticas RLS que no sean recursivas
--
-- ============================================================================

-- Opción 1: DESHABILITAR RLS EN LA TABLA 'profiles' (Recomendado para desarrollo)
-- ============================================================================
-- Esto es seguro porque:
-- - El backend usa serviceRoleKey que tiene acceso total
-- - Las políticas se aplicarán a nivel de aplicación (por código)
-- - Frontend no accede directamente a Supabase (va por API backend)

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Opción 2: ALTERNATIVA - Si prefieres mantener RLS, reemplaza todas las políticas
-- ============================================================================
-- (Descomenta solo si NO ejecutaste Opción 1)

/*
-- Primero, elimina todas las políticas existentes que causan recursión
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own data" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable write for users based on uid" ON public.profiles;

-- Crea una política simple sin recursión
CREATE POLICY "Allow service role to read profiles"
ON public.profiles
FOR SELECT
USING (auth.role() = 'service_role');

CREATE POLICY "Allow users to read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Allow users to update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
*/

-- ============================================================================
-- VERIFICACIÓN DESPUÉS DE EJECUTAR
-- ============================================================================
-- Ejecuta estas queries en Supabase SQL Editor para verificar:

-- Ver estado actual de RLS en 'profiles'
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Ver todas las políticas en 'profiles' (si RLS está activo)
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================
-- Si ejecutaste Opción 1:
-- - rowsecurity = false (RLS deshabilitado)
-- - GET /api/v1/technicians → 200 OK
--
-- Si ejecutaste Opción 2:
-- - rowsecurity = true (RLS activo)
-- - Solo 3 políticas simples sin recursión
-- - GET /api/v1/technicians → 200 OK
-- ============================================================================
