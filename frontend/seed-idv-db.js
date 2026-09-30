import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function seed() {
  const POSTGRES_URL = process.env.POSTGRES_URL;
  const sql = neon(POSTGRES_URL);

  const email = 'clienteteste@atelier.com';
  console.log('Buscando usuario no Auth...');
  
  // Buscar no banco auth.users
  const users = await sql`SELECT id FROM auth.users WHERE email = ${email}`;
  if (users.length === 0) {
      console.log('Precisa deletar o user no supabase dashboard e rodar novamente, ou criar por lá, ou irei criar um dummy user.');
  }
  const userId = users[0].id;

  console.log('Atualizando Profile...');
  await sql`
    INSERT INTO profiles (id, email, nome, role) 
    VALUES (${userId}, ${email}, 'Cliente IDV Teste', 'cliente')
    ON CONFLICT (id) DO UPDATE SET nome = 'Cliente IDV Teste', role = 'cliente';
  `;

  console.log('Criando Projeto de IDV...');
  await sql`
    INSERT INTO projects (client_id, type, service_type, status, idv_phase)
    VALUES (${userId}, 'Identidade Visual', 'Identidade Visual', 'active', 'descobrir');
  `;

  console.log('Tudo certo! Projeto IDV criado direto no banco para contornar o cache do Supabase.');
}

seed();
