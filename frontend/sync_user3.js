require('dotenv').config({path: '../backend/.env'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sync() {
  const { data: authData } = await supabase.auth.admin.listUsers();
  const emmanuel = authData.users.find(u => u.email === 'emanuelsantana300@gmail.com');
  if (emmanuel) {
    const { error } = await supabase.from('profiles').update({
        nome: 'Emmanuel de Jesus',
        role: 'colaborador',
        empresa: 'Atelier Design'
    }).eq('id', emmanuel.id);
    if (error) console.error(error);
    else console.log('Updated Emmanuel in Supabase!');
  }
}

sync();
