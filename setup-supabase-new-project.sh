#!/bin/bash
# Script para configurar un nuevo proyecto en Supabase y aplicar migraciones
# Uso: ./setup-supabase-new-project.sh

echo "=== TechnoTaller - Setup Supabase ==="
echo ""
echo "Este script ayuda a configurar un nuevo proyecto en Supabase"
echo ""

# Verificar si Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI no está instalado"
    echo "Instálalo con: npm install -g supabase"
    exit 1
fi

echo "1️⃣  Ve a https://supabase.com y crea un nuevo proyecto"
echo "2️⃣  Copia las credenciales (Project URL y Anon Key)"
echo ""
read -p "Ingresa tu Project URL: " PROJECT_URL
read -p "Ingresa tu Service Role Key: " SERVICE_ROLE_KEY

# Actualizar .env
cat > .env << EOF
# Supabase
SUPABASE_URL=$PROJECT_URL
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
SUPABASE_ANON_KEY=

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
EOF

echo "✅ .env actualizado"
echo ""
echo "Ahora ejecutando migraciones..."
echo ""

# Link al proyecto
supabase link --project-ref $(echo $PROJECT_URL | grep -o '[a-z0-9]*\.supabase\.co' | cut -d. -f1)

# Push migraciones
supabase db push

echo ""
echo "✅ ¡Setup completado!"
echo ""
echo "Próximos pasos:"
echo "1. npm install"
echo "2. npm run dev"
