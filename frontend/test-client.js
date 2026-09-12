require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.POSTGRES_URL);
  try {
    const res = await sql`
      SELECT * 
      FROM client_briefings
      LIMIT 1;
    `;
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
