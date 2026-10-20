import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const envContent = fs.readFileSync('frontend/.env.local', 'utf8');
const match = envContent.match(/POSTGRES_URL=["']?([^"'\r\n]+)/);
const postgresUrl = match[1];

async function run() {
  const { neon } = await import('../backend/node_modules/@neondatabase/serverless/index.mjs').catch(async () => {
    return await import('../backend/node_modules/@neondatabase/serverless/dist/index.mjs');
  });
  
  const sql = neon(postgresUrl);
  console.log('Testing connection to Neon DB...');
  const res = await sql`SELECT NOW() as now, current_database() as db`;
  console.log('Connected successfully:', res);

  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
  console.log('Tables:', tables.map(t => t.table_name));

  const profiles = await sql`SELECT id, nome, email, role FROM profiles LIMIT 10`;
  console.log('Profiles:', profiles);

  const channels = await sql`SELECT id, name, type FROM channels`;
  console.log('Channels:', channels);
}

run().catch(console.error);
