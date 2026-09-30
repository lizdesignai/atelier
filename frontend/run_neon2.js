require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL);

async function run() {
  const users = await sql`SELECT id, email, nome FROM profiles`;
  const user = users.find(u => u.email === 'testeidv2@atelier.com' || (u.nome && u.nome.includes('Test')));
  if (!user) return console.log('not found in profiles', users);
  const projs = await sql`UPDATE projects SET stage = 'descobrir' WHERE client_id = ${user.id} RETURNING id`;
  console.log('Project updated:', projs);
}
run();
