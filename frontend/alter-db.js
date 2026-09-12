require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.POSTGRES_URL);
  try {
    await sql`ALTER TABLE briefings_identidade_visual ADD COLUMN IF NOT EXISTS notificado BOOLEAN DEFAULT false;`;
    await sql`ALTER TABLE briefings_identidade_visual ADD COLUMN IF NOT EXISTS lido BOOLEAN DEFAULT false;`;
    console.log("Columns added successfully");
  } catch (e) {
    console.error(e);
  }
}
run();
