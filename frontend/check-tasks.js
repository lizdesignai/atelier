import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.POSTGRES_URL);
  const rows = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks'`;
  console.log(rows);
}
run();
