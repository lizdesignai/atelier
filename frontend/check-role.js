import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.POSTGRES_URL);
  const rows = await sql`SELECT email, role FROM profiles WHERE email = 'testeidv2@atelier.com'`;
  console.log(rows);
}
run();
