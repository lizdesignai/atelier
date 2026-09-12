const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const sql = neon(process.env.POSTGRES_URL);
  try {
    const clients = await sql.query(
      SELECT id, nome, avatar_url, role 
      FROM profiles 
      WHERE role IN ('client', 'agencia') 
      ORDER BY nome
    );
    console.log(JSON.stringify(clients, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
