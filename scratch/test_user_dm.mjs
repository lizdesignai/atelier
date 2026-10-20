import fs from 'fs';
const envContent = fs.readFileSync('frontend/.env.local', 'utf8');
const postgresUrl = envContent.match(/POSTGRES_URL=["']?([^"'\r\n]+)/)[1];

async function run() {
  const { neon } = await import('../backend/node_modules/@neondatabase/serverless/index.mjs');
  const sql = neon(postgresUrl);
  const user = await sql`SELECT id, nome, email, role FROM profiles WHERE id = '55a1f766-bd50-45bd-b0bc-9af8309faa58'`;
  console.log('User 55a1f766:', user);
}

run().catch(console.error);
