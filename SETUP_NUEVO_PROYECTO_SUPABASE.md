# Setup - Nuevo Proyecto Supabase

Si no tienes acceso al proyecto actual, puedes crear uno nuevo en Supabase. Aquí están los pasos:

## 📋 Paso 1: Crear Proyecto en Supabase

1. Ve a https://supabase.com
2. Inicia sesión o crea una cuenta (puedes usar GitHub)
3. Haz clic en "New Project"
4. Completa los datos:
   - **Organization**: Crea una nueva o usa existente
   - **Project name**: `tecnotaller` (o lo que prefieras)
   - **Database Password**: Guárdalo
   - **Region**: Selecciona la más cercana
5. Espera a que se cree (2-5 minutos)

## 🔑 Paso 2: Obtener Credenciales

1. Una vez creado, ve a **Settings** → **API**
2. Copia:
   - **Project URL** (ejemplo: `https://xxxxx.supabase.co`)
   - **Anon Key** (bajo "API Keys")
   - **Service Role Key** (bajo "API Keys" - este es importante)

## 🔧 Paso 3: Actualizar .env

En la raíz del proyecto, abre/edita `.env` y reemplaza las credenciales:

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxx
SUPABASE_ANON_KEY=sb_publishable_xxxxx

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
```

## 🚀 Paso 4: Aplicar Migraciones

### Opción A: Ejecutar SQL manualmente (Recomendado si no tienes CLI)

1. En Supabase Dashboard, ve a **SQL Editor**
2. Crea una nueva query
3. Copia y ejecuta el contenido de: `EJECUTAR_EN_SUPABASE_PARA_FIJAR_RLS.sql`
4. Luego copia y ejecuta cada archivo de `supabase/migrations/`:
   - `0000_consolidated.sql` (o 0001_base_profiles_rls.sql)
   - `0002_products_inventory.sql`
   - etc.

### Opción B: Usar CLI (Si tienes Supabase CLI instalado)

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Link al proyecto
supabase link --project-ref <PROJECT_REF>
# (PROJECT_REF es la parte antes de .supabase.co en tu URL)

# Push migraciones
supabase db push
```

## ✅ Paso 5: Verificar

```bash
# Instalar dependencias
npm install

# Iniciar backend
npm run dev

# Testear endpoint
curl -X GET http://localhost:3000/api/v1/technicians \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Esperado: `200 OK` con lista de técnicos (o `[]` si no hay técnicos)

## 🎯 Resultado Final

- ✅ Nuevo proyecto en Supabase
- ✅ Base de datos creada con todas las tablas
- ✅ RLS deshabilitado (sin recursión infinita)
- ✅ Backend conectado al nuevo proyecto
- ✅ Endpoint `/api/v1/technicians` funcional

---

**¿Necesitas ayuda?** Verifica que:
1. Las credenciales en `.env` sean correctas
2. El proyecto en Supabase esté completamente creado
3. Las migraciones se hayan ejecutado sin errores
