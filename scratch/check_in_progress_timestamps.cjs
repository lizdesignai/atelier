require('../frontend/node_modules/dotenv').config({ path: 'frontend/.env.local', quiet: true });
const { neon } = require('../frontend/node_modules/@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

(async () => {
  const tasks = await sql.query(`
    SELECT t.id, t.project_id, t.title, t.status, t.stage, t.started_at, t.created_at, t.updated_at, p.nome as client_name
    FROM tasks t
    LEFT JOIN projects pr ON t.project_id = pr.id
    LEFT JOIN profiles p ON pr.client_id = p.id
    WHERE t.status = 'in_progress'
  `);
  console.table(tasks);
})();
