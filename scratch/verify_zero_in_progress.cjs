require('../frontend/node_modules/dotenv').config({ path: 'frontend/.env.local', quiet: true });
const { neon } = require('../frontend/node_modules/@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

(async () => {
  const count = await sql.query("SELECT COUNT(*) FROM tasks WHERE status = 'in_progress'");
  console.log("Remaining tasks in_progress:", count[0].count);
})();
