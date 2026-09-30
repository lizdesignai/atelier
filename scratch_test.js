const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: 'frontend/.env.local' });

async function run() {
  const sql = neon(process.env.POSTGRES_URL);
  try {
    const profiles = await sql`SELECT id, nome, email, role, avatar_url, team_performance_id FROM profiles ORDER BY created_at DESC LIMIT 10`;
    console.log("Recent profiles:", profiles);
  } catch (err) {
    console.error(err);
  }
}
run();
