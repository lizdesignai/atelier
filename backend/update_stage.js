const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

async function updateClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Find the user
    const userRes = await pool.query("SELECT id FROM auth.users WHERE email = 'testeidv2@atelier.com'");
    if (userRes.rows.length === 0) {
      console.log("User not found");
      return;
    }
    const userId = userRes.rows[0].id;
    console.log("User ID:", userId);

    // Find their active project
    const projRes = await pool.query("SELECT id, stage FROM projects WHERE client_id = $1", [userId]);
    if (projRes.rows.length === 0) {
      console.log("Project not found");
      return;
    }
    
    for (const proj of projRes.rows) {
      console.log(`Updating project ${proj.id} from ${proj.stage} to descobrir`);
      await pool.query("UPDATE projects SET stage = 'descobrir' WHERE id = $1", [proj.id]);
    }
    console.log("Success!");

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

updateClient();
