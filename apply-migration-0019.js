/**
 * Script para aplicar la migración 0019: Campos de dispositivo en citas y enlace cita-orden
 * Ejecutar con: node apply-migration-0019.js
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar definidos en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Aplicando migración 0019: Campos de dispositivo en citas y enlace cita-orden...\n');

  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '0019_appointments_device_fields_and_work_order_link.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Dividir por statements (separados por punto y coma al final de línea)
  const statements = sql
    .split(/;[\r\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (!statement || statement.startsWith('COMMENT')) {
      // Los comentarios los ejecutamos también
      if (statement.startsWith('COMMENT')) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          if (error) {
            console.log(`⚠️  Comentario no aplicado (no crítico): ${error.message}`);
          }
        } catch (e) {
          // Ignorar errores de comentarios
        }
      }
      continue;
    }

    console.log(`📝 Ejecutando: ${statement.substring(0, 80)}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      if (error) {
        // Si es "already exists" es OK
        if (error.message.includes('already exists') || error.message.includes('ya existe')) {
          console.log(`   ✅ Ya existía, continuando...`);
        } else {
          console.error(`   ❌ Error: ${error.message}`);
        }
      } else {
        console.log(`   ✅ OK`);
      }
    } catch (e) {
      console.error(`   ❌ Error ejecutando statement: ${e.message}`);
    }
  }

  console.log('\n✅ Migración 0019 completada.');
  console.log('\n📋 Resumen de cambios:');
  console.log('   - appointments: +device_brand, +device_model, +problem_description');
  console.log('   - appointments: +completed_services, +completed_notes, +completed_at');
  console.log('   - work_orders: +appointment_id (unique, nullable)');
}

applyMigration().catch(console.error);
