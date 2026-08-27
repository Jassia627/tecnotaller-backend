# Script para aplicar todas las migraciones a Supabase
# Uso: ./apply-migrations.ps1

$supabaseUrl = $env:SUPABASE_URL
$serviceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $supabaseUrl -or -not $serviceRoleKey) {
    Write-Host "❌ Error: Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Iniciando migraciones en Supabase..." -ForegroundColor Green
Write-Host "URL: $supabaseUrl`n" -ForegroundColor Gray

# Función para ejecutar SQL
function Execute-SQL {
    param(
        [string]$SqlFile,
        [string]$Sql
    )
    
    Write-Host "⏳ Ejecutando: $SqlFile" -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $serviceRoleKey"
        "Content-Type" = "application/json"
    }
    
    $body = @{
        query = $Sql
    } | ConvertTo-Json
    
    try {
        # Intentar ejecutar via RPC si existe
        $response = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/rpc/exec_sql" `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -ErrorAction SilentlyContinue
        
        Write-Host "✅ $SqlFile completado`n" -ForegroundColor Green
    } catch {
        # Si no funciona, mostrar instrucciones manuales
        Write-Host "⚠️  No se pudo ejecutar automaticamente" -ForegroundColor Yellow
        Write-Host "Por favor ejecuta manualmente en Supabase SQL Editor:`n" -ForegroundColor Yellow
    }
}

# Leer y ejecutar todas las migraciones
$migrationFiles = Get-ChildItem -Path "./supabase/migrations" -Filter "*.sql" | Sort-Object Name

foreach ($file in $migrationFiles) {
    $sql = Get-Content -Path $file.FullName -Raw
    Execute-SQL -SqlFile $file.Name -Sql $sql
}

Write-Host "✅ Proceso completado" -ForegroundColor Green
Write-Host "`nSi algo no funcionó, ejecuta manualmente en Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host "1. Ve a supabase.com" -ForegroundColor Yellow
Write-Host "2. SQL Editor" -ForegroundColor Yellow
Write-Host "3. Copia el contenido de cada archivo .sql de supabase/migrations/" -ForegroundColor Yellow
Write-Host "4. Ejecuta" -ForegroundColor Yellow
