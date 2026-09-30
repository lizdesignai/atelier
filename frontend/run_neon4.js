require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL);

async function run() {
  const projs = await sql`SELECT * FROM projects LIMIT 1`;
  console.log('Project columns:', projs.length ? Object.keys(projs[0]) : 'no projects');
}
run();
