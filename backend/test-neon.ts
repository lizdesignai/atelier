import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const sql = neon(process.env.POSTGRES_URL || '');
  const res = await sql('SELECT $1::text as col', ['hello']);
  console.log('Result:', res);
}
test().catch(console.error);
