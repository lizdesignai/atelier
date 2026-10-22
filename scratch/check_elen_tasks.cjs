const path = require('path');
const { neon } = require(path.join(__dirname, '../backend/node_modules/@neondatabase/serverless'));
const sql = neon('postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function run() {
  const elenId = 'c7d61610-ebbd-44bf-8116-fd24eb7f6045';
  const tasks = await sql`SELECT id, title, status, project_id FROM tasks WHERE assigned_to = ${elenId}`;
  console.log('Elen tasks:', JSON.stringify(tasks, null, 2));
}

run().catch(console.error);
