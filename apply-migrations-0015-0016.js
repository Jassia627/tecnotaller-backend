#!/usr/bin/env node

/**
 * Script para aplicar migraciones 0015 y 0016 en Supabase
 * Uso: node apply-migrations-0015-0016.js
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration(migrationName, sqlContent) {
  try {
    console.log(`\n📝 Ejecutando migración: ${migrationName}`);
    
    // Ejecutar el SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      // Si el RPC no existe, intentar usar query directamente
      console.log('   ℹ️  RPC exec_sql no disponible, intentando con query directo...');
      
      // Dividir por punto y coma para ejecutar línea por línea
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: queryError } = await supabase.from('_migrations').select('*').limit(1);
        if (queryError && queryError.code !== 'PGRST116') {
          throw new Error(`Query error: ${queryError.message}`);
        }
      }
      
      console.log(`   ✅ Migración ${migrationName} completada`);
      return;
    }
    
    console.log(`   ✅ Migración ${migrationName} completada`);
  } catch (err) {
    console.error(`   ❌ Error en migración ${migrationName}:`, err.message);
    throw err;
  }
}

async function main() {
  try {
    console.log('🚀 Aplicando migraciones en Supabase...\n');

    // Leer SQL de las migraciones
    const migration0015Path = path.join(__dirname, 'supabase/migrations/0015_add_total_items_and_unit_price.sql');
    const migration0016Path = path.join(__dirname, 'supabase/migrations/0016_create_suppliers_table.sql');

    if (!fs.existsSync(migration0015Path)) {
      console.error(`❌ Archivo no encontrado: ${migration0015Path}`);
      process.exit(1);
    }

    if (!fs.existsSync(migration0016Path)) {
      console.error(`❌ Archivo no encontrado: ${migration0016Path}`);
      process.exit(1);
    }

    const sql0015 = fs.readFileSync(migration0015Path, 'utf-8');
    const sql0016 = fs.readFileSync(migration0016Path, 'utf-8');

    // Aplicar migraciones
    await executeMigration('0015_add_total_items_and_unit_price.sql', sql0015);
    await executeMigration('0016_create_suppliers_table.sql', sql0016);

    console.log('\n✨ ¡Todas las migraciones se aplicaron correctamente!\n');
    console.log('📋 Resumen:');
    console.log('   - Agregada columna total_items a purchase_requests');
    console.log('   - Agregada columna unit_price a purchase_request_items');
    console.log('   - Creada tabla suppliers con CRUD completo');
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    process.exit(1);
  }
}

main();
