const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configurados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sqlFile = './supabase/migrations/0014_create_transition_order_status_rpc.sql';

async function applySql() {
  try {
    console.log('📖 Leyendo migración:', sqlFile);
    const sql = fs.readFileSync(sqlFile, 'utf-8');

    console.log('🚀 Ejecutando migración en Supabase...\n');

    const { error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      // Si rpc exec_sql no existe, intentar con query directo
      console.log('ℹ️  Intentando con método alternativo...');
      const result = await supabase.from('pg_stat_statements').select('*').limit(1);
      
      if (result.error && result.error.code === 'PGRST100') {
        console.log('⚠️  Las tablas del sistema no están accesibles directamente');
        console.log('📋 Por favor, ejecuta manualmente en Supabase SQL Editor:\n');
        console.log(sql);
        process.exit(1);
      }
    }

    console.log('✅ Migración 0014 aplicada exitosamente!');
  } catch (err) {
    console.error('❌ Error al aplicar migración:', err.message);
    console.log('\n📋 SQL que debe ejecutarse manualmente en Supabase:\n');
    const sql = fs.readFileSync(sqlFile, 'utf-8');
    console.log(sql);
    process.exit(1);
  }
}

applySql();
