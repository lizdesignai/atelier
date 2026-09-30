import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  const email = 'clienteteste@atelier.com';
  const password = 'password123';

  console.log('Criando usuário na Auth...');
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr) {
    console.error('Erro Auth:', authErr.message);
    if (!authErr.message.includes('already registered')) return;
  }

  // Pegar o ID
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === email);
  if (!user) {
    console.log('User não encontrado');
    return;
  }

  console.log('Atualizando Profile...');
  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    nome: 'Cliente IDV Teste',
    role: 'cliente'
  });

  console.log('Criando Projeto de IDV...');
  const { data: proj, error: projErr } = await supabase.from('projects').insert({
    client_id: user.id,
    type: 'Identidade Visual',
    service_type: 'Identidade Visual',
    status: 'active',
    idv_phase: 'descobrir'
  }).select().single();

  if (projErr) {
    console.error('Erro Projeto:', projErr.message);
    return;
  }

  console.log('Tudo certo! Usuário criado.');
  console.log('Email:', email);
  console.log('Senha:', password);
}

seed();
