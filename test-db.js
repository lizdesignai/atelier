import dotenv from 'dotenv';
dotenv.config({ path: 'frontend/.env.local' });
import { neon } from '@neondatabase/serverless';

async function test() {
  const sql = neon(process.env.POSTGRES_URL);
  try {
    const q = 'SELECT * FROM "profiles" LIMIT 1';
    const params = [];
    console.log('Testing query:', q);
    const result = await sql(q, params);
    console.log('Result:', result);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
