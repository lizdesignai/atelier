import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fix() {
  const sql = neon(process.env.POSTGRES_URL);
  const email = 'testeidv2@atelier.com';
  
  await sql`UPDATE profiles SET role = 'client' WHERE email = ${email}`;
  console.log('Role updated to client!');
}

fix();
