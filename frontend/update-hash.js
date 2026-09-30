import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function seed() {
  const sql = neon(process.env.POSTGRES_URL);
  const email = 'testeidv2@atelier.com';
  const password = 'password123';
  
  const hash = await bcrypt.hash(password, 10);
  
  await sql`UPDATE profiles SET password_hash = ${hash} WHERE email = ${email}`;
  console.log('Password hash updated for testeidv2!');
}

seed();
