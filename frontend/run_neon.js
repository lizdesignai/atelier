require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL);

async function run() {
  const users = await sql`SELECT id FROM auth.users WHERE email = 'testeidv2@atelier.com'`;
  if (users.length === 0) return console.log('not found');
  const projs = await sql`UPDATE projects SET stage = 'descobrir' WHERE client_id = ${users[0].id} RETURNING id`;
  console.log(projs);
}
run();
