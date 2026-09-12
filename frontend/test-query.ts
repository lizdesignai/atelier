require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.POSTGRES_URL);
  try {
    const res = await (sql as any).query(`
      SELECT * 
      FROM briefings_identidade_visual
      LIMIT 1;
    `);
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
run();
