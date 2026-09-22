require('dotenv').config({path: '../backend/.env'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sync() {
  const { data, error } = await supabase.from('profiles').insert([
    {
      id: 'dbeedf1a-e3cb-4951-bba4-35b7d28d19b4',
      nome: 'Emmanuel de Jesus',
      role: 'colaborador',
      email: 'emanuelsantana300@gmail.com',
      empresa: 'Atelier Design'
    }
  ]);
  if (error) console.error(error);
  else console.log('Inserted Emmanuel into Supabase!', data);
}

sync();
