import dotenv from 'dotenv';
dotenv.config({ path: 'frontend/.env.local' });
import { neon } from '@neondatabase/serverless';

async function test() {
  const sql = neon(process.env.POSTGRES_URL);
  try {
    const clients = await (sql as any).query(`
      SELECT id, nome, avatar_url, role 
      FROM profiles 
      WHERE role IN ('client', 'agencia') 
      ORDER BY nome
    `);
    console.log(JSON.stringify(clients, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
