import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seed() {
  const email = 'testeidv@atelier.com';
  const password = 'password123';

  console.log('Criando/Buscando usuário teste na Auth...');
  
  // Tentar criar
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr && !authErr.message.includes('already registered')) {
    console.error('Erro Auth:', authErr.message);
    return;
  }

  // Pegar o ID do usuário (paginado para garantir que encontra)
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const user = usersData.users.find(u => u.email === email);
  
  if (!user) {
    console.log('User não encontrado na lista');
    return;
  }

  const userId = user.id;
  console.log('User ID:', userId);

  console.log('Criando Profile...');
  const { error: profErr } = await supabase.from('profiles').upsert({
    id: userId,
    email: email,
    nome: 'Cliente IDV Oficial',
    role: 'cliente'
  });

  if (profErr) {
    console.error('Erro Profile:', profErr.message);
  }

  console.log('Criando Projeto IDV...');
  // Tentar pegar projeto existente desse user
  const { data: existingProj } = await supabase.from('projects').select('id').eq('client_id', userId).eq('service_type', 'Identidade Visual').single();
  
  let projectId;
  if (!existingProj) {
    const { data: newProj, error: projErr } = await supabase.from('projects').insert({
      client_id: userId,
      type: 'Identidade Visual',
      service_type: 'Identidade Visual',
      status: 'active',
      idv_phase: 'descobrir'
    }).select().single();
    
    if (projErr) console.error('Erro Projeto:', projErr.message);
    projectId = newProj?.id;
  } else {
    projectId = existingProj.id;
    // Resetar a fase
    await supabase.from('projects').update({ idv_phase: 'descobrir' }).eq('id', projectId);
  }

  if (projectId) {
    console.log('Criando Brand Snapshot Fake para o projeto...');
    await supabase.from('brand_snapshots').upsert({
      project_id: projectId,
      essencia: 'Uma marca inovadora e tecnológica focada em performance.',
      publico: 'Jovens empreendedores e tech leads.',
      status: 'draft'
    }, { onConflict: 'project_id' }).catch(() => {}); // catch silent se onConflict não estiver configurado
  }

  console.log('--------------------------------------------------');
  console.log('✅ USUÁRIO DE TESTE CRIADO COM SUCESSO');
  console.log('👉 Email:', email);
  console.log('👉 Senha:', password);
  console.log('--------------------------------------------------');
}

seed();
