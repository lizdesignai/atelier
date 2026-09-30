import { createClient } from '@supabase/supabase-js';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  const email = 'testeidv2@atelier.com';
  const password = 'password123';

  console.log('Criando usuário na Auth...');
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr && !authErr.message.includes('already registered')) {
    console.error('Erro Auth:', authErr.message);
    return;
  }

  const { data: usersData } = await supabase.auth.admin.listUsers();
  const user = usersData.users.find(u => u.email === email);
  
  if (!user) {
    console.log('User não encontrado na lista');
    return;
  }

  const userId = user.id;
  const sql = neon(process.env.POSTGRES_URL);

  console.log('Criando Profile no DB Principal...');
  await sql`
    INSERT INTO profiles (id, email, nome, role) 
    VALUES (${userId}, ${email}, 'Cliente IDV 2', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', nome = 'Cliente IDV 2';
  `;

  console.log('Criando Projeto...');
  const proj = await sql`
    INSERT INTO projects (client_id, type, service_type, status, idv_phase)
    VALUES (${userId}, 'Identidade Visual', 'Identidade Visual', 'active', 'descobrir')
    RETURNING id;
  `;

  const projectId = proj[0].id;

  console.log('Criando Snapshot...');
  await sql`
    INSERT INTO brand_snapshots (project_id, essencia, publico, status)
    VALUES (${projectId}, 'Teste essencia', 'Teste publico', 'draft');
  `;

  console.log('--------------------------------------------------');
  console.log('✅ USUÁRIO DE TESTE (2) CRIADO COM SUCESSO');
  console.log('👉 Email:', email);
  console.log('👉 Senha:', password);
  console.log('--------------------------------------------------');
}

seed();
