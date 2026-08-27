#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createAdminUser() {
  console.log('🔐 Creando cuenta de administrador...\n');

  try {
    // Crear usuario en Auth
    const { data: user, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@tecnotaller.com',
      password: 'Admin123!@#',
      email_confirm: true,
      user_metadata: {
        full_name: 'Administrador',
        phone: '+57 300 000 0000',
        role: 'administrador',
      },
    });

    if (authError) throw authError;

    console.log('✅ Usuario creado en Auth');
    console.log(`   ID: ${user.user.id}`);
    console.log(`   Email: ${user.user.email}\n`);

    // El perfil se crea automáticamente por el trigger

    // Esperar un poco para que el trigger se ejecute
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verificar que el perfil se creó
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.user.id)
      .single();

    if (profileError) {
      console.warn('⚠️  No se pudo verificar el perfil:', profileError.message);
    } else {
      console.log('✅ Perfil creado automáticamente');
      console.log(`   Rol: ${profile.role}`);
      console.log(`   Nombre: ${profile.full_name}\n`);
    }

    console.log('🎉 Cuenta de administrador lista!\n');
    console.log('Credenciales para login:');
    console.log('─'.repeat(50));
    console.log(`Email:    admin@tecnotaller.com`);
    console.log(`Password: Admin123!@#`);
    console.log(`Rol:      administrador`);
    console.log('─'.repeat(50));
    console.log('\n📝 Guarda estas credenciales en un lugar seguro.');
    console.log('Puedes usarlas para probar el panel administrativo.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdminUser();
