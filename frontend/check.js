const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function check() {
  const res = await pool.query("SELECT count(id) FROM leads WHERE status = 'prospect'");
  console.log("Leads prospect:", res.rows[0].count);
  
  const res2 = await pool.query("SELECT count(id) FROM leads");
  console.log("Total leads:", res2.rows[0].count);
  pool.end();
}
check();
