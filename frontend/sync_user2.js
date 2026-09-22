require('dotenv').config({path: '../backend/.env'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sync() {
  // Create user in auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'emanuelsantana300@gmail.com',
    password: 'password123',
    email_confirm: true
  });
  
  if (authError) {
    console.error('Auth error:', authError);
    // Maybe user already exists, let's try to get them
    if (authError.message.includes('already exists')) {
       // We can just use the known ID if they exist, but the previous script said ID not in users.
    }
  } else {
    console.log('Created auth user:', authData.user.id);
    const { error } = await supabase.from('profiles').insert([
      {
        id: authData.user.id, // Must match auth user ID for FK
        nome: 'Emmanuel de Jesus',
        role: 'colaborador',
        email: 'emanuelsantana300@gmail.com',
        empresa: 'Atelier Design'
      }
    ]);
    if (error) console.error('Profile insert error:', error);
    else console.log('Inserted Emmanuel into Supabase profiles!');
  }
}

sync();
