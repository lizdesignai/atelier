require('../frontend/node_modules/dotenv').config({ path: 'frontend/.env.local', quiet: true });
const { neon } = require('../frontend/node_modules/@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

(async () => {
  console.log("Stopping all active/in_progress tasks in Focus...");
  const updated = await sql.query(`
    UPDATE tasks 
    SET status = 'pending', started_at = null, updated_at = NOW()
    WHERE status = 'in_progress'
    RETURNING id, project_id, title, status
  `);
  console.log(`Successfully stopped ${updated.length} tasks:`, updated);
})();
