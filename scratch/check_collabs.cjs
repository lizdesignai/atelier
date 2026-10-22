const path = require('path');
const { neon } = require(path.join(__dirname, '../backend/node_modules/@neondatabase/serverless'));
const sql = neon('postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function run() {
  const users = await sql`SELECT id, nome, email, role, contract_status, current_status FROM profiles WHERE nome ILIKE '%Elen%' OR nome ILIKE '%Emmanuel%'`;
  console.log('PROFILES:', JSON.stringify(users, null, 2));

  const allCollabs = await sql`SELECT id, nome, email, role, contract_status, current_status FROM profiles WHERE role IN ('colaborador', 'admin', 'gestor')`;
  console.log('ALL COLLABS:', JSON.stringify(allCollabs, null, 2));
}

run().catch(console.error);
