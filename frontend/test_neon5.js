require('dotenv').config({path: '../backend/.env'});
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

async function check() {
  const tables = ['projects', 'routing_rules', 'agencies', 'agency_subclients', 'team_performance'];
  for (const t of tables) {
    try {
      const res = await sql.query(`SELECT count(*) FROM ${t}`);
      console.log(t, res[0].count);
    } catch (e) {
      console.log(t, 'missing or error:', e.message);
    }
  }
}
check();
