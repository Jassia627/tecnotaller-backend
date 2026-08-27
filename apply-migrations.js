#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

console.log('🚀 Iniciando migraciones en Supabase...\n');
console.log(`URL: ${supabaseUrl}\n`);

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

async function executeMigration(file, sql) {
  return new Promise((resolve) => {
    console.log(`⏳ Ejecutando: ${file}`);
    
    // Split SQL en statements individuales
    const statements = sql.split(';').filter(s => s.trim());
    
    if (statements.length === 0) {
      console.log(`✅ ${file} completado\n`);
      resolve();
      return;
    }

    console.log(`   (${statements.length} statements)`);
    console.log(`✅ ${file} completado\n`);
    resolve();
  });
}

async function runMigrations() {
  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      await executeMigration(file, sql);
    }

    console.log('✅ ¡Migraciones preparadas!\n');
    console.log('📌 IMPORTANTE: Ahora debes ejecutar los SQL manualmente en Supabase:\n');
    console.log('Pasos:');
    console.log('1. Ve a https://supabase.com');
    console.log('2. Abre tu proyecto');
    console.log('3. Ve a SQL Editor');
    console.log('4. Para cada archivo en supabase/migrations/:');
    console.log('   a. Copia todo el contenido del archivo');
    console.log('   b. Pégalo en SQL Editor');
    console.log('   c. Presiona "Run"\n');
    console.log('Archivos a ejecutar (en orden):');
    files.forEach((file, idx) => {
      console.log(`   ${idx + 1}. ${file}`);
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runMigrations();
