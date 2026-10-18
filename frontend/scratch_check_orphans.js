const { neon } = require('./node_modules/@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.POSTGRES_URL);

  const profiles = await sql`
    SELECT id, nome, email, role, avatar_url 
    FROM profiles 
    ORDER BY nome
  `;
  console.log('Profiles count:', profiles.length);
  profiles.forEach(p => console.log(`${p.role.padEnd(12)} | ${(p.nome || '').padEnd(30)} | ${p.avatar_url || 'NULL'}`));
}

run().catch(console.error);
