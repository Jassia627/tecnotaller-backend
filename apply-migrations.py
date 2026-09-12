#!/usr/bin/env python3
"""
Script para aplicar migraciones en Supabase usando SQL directo
Requiere: pip install supabase
Uso: python apply-migrations.py
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY no configuradas")
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    print("❌ Error: supabase no instalado. Ejecuta: pip install supabase")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def read_migration(filename):
    """Lee el contenido de una migración"""
    path = Path(__file__).parent / 'supabase' / 'migrations' / filename
    if not path.exists():
        raise FileNotFoundError(f"Migración no encontrada: {path}")
    return path.read_text(encoding='utf-8')

def execute_migration(name, sql):
    """Ejecuta una migración SQL"""
    try:
        print(f"\n📝 Ejecutando migración: {name}")
        
        # Usar rpc para ejecutar SQL
        result = supabase.rpc('exec_sql', {'sql': sql}).execute()
        print(f"   ✅ Migración {name} completada")
        return True
        
    except Exception as e:
        error_msg = str(e)
        
        # Si es un error de RPC no disponible, intentar método alternativo
        if 'exec_sql' in error_msg or 'unknown' in error_msg.lower():
            print(f"   ⚠️  RPC no disponible, intentando con query directo...")
            try:
                # Intentar executar creando una tabla temporal para validar conexión
                supabase.table('_test_connection').select('*').limit(1).execute()
                print(f"   ⚠️  Conexión OK pero no se puede ejecutar SQL directo")
                print(f"   💡 Abre la consola SQL de Supabase y ejecuta manualmente:")
                print(f"\n   {sql}\n")
                return False
            except:
                pass
        
        print(f"   ❌ Error en migración {name}: {e}")
        return False

def main():
    print("🚀 Aplicando migraciones en Supabase...\n")
    
    try:
        # Leer migraciones
        sql_0015 = read_migration('0015_add_total_items_and_unit_price.sql')
        sql_0016 = read_migration('0016_create_suppliers_table.sql')
        
        # Ejecutar migraciones
        success_0015 = execute_migration('0015_add_total_items_and_unit_price.sql', sql_0015)
        success_0016 = execute_migration('0016_create_suppliers_table.sql', sql_0016)
        
        if success_0015 and success_0016:
            print("\n✨ ¡Todas las migraciones se aplicaron correctamente!\n")
            print("📋 Resumen:")
            print("   - Agregada columna total_items a purchase_requests")
            print("   - Agregada columna unit_price a purchase_request_items")
            print("   - Creada tabla suppliers con CRUD completo")
        else:
            print("\n⚠️  Algunas migraciones no pudieron ejecutarse automáticamente.")
            print("   Por favor, ejecuta el SQL manualmente en la consola de Supabase.\n")
            print("SQL 0015:")
            print(sql_0015)
            print("\n" + "="*80 + "\n")
            print("SQL 0016:")
            print(sql_0016)
            
    except Exception as e:
        print(f"\n❌ Error fatal: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
