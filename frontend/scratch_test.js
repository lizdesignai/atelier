const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.POSTGRES_URL);
  try {
    const result = await sql`SELECT id, nome, avatar_url, role FROM profiles WHERE nome ILIKE '%Liz%'`;
    console.log("Lizes in Neon:", result);
  } catch (err) {
    console.error(err);
  }
}
run();
