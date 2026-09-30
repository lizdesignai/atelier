require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL);
async function run() {
  const projs = await sql`SELECT id, phase, fase, idv_phase FROM projects`;
  console.log(projs);
}
run();
