import fs from 'fs';
const envContent = fs.readFileSync('frontend/.env.local', 'utf8');
const postgresUrl = envContent.match(/POSTGRES_URL=["']?([^"'\r\n]+)/)[1];

async function run() {
  const { neon } = await import('../backend/node_modules/@neondatabase/serverless/index.mjs');
  const sql = neon(postgresUrl);
  const rows = await sql`SELECT id, nome, email, role FROM profiles`;
  console.log('All Profiles (' + rows.length + '):');
  rows.forEach(r => console.log(`- ${r.role.padEnd(12)} | ${r.email.padEnd(30)} | ${r.nome}`));
}

run().catch(console.error);
