require('../frontend/node_modules/dotenv').config({ path: 'frontend/.env.local', quiet: true });
const { neon } = require('../frontend/node_modules/@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

(async () => {
  console.log("=== ALL TASKS WITH STATUS IN_PROGRESS ===");
  const inProgress = await sql.query(`
    SELECT t.id, t.project_id, t.title, t.status, t.stage, t.assigned_to, pr.client_id, p.nome as client_name, p_assign.nome as assigned_name
    FROM tasks t
    LEFT JOIN projects pr ON t.project_id = pr.id
    LEFT JOIN profiles p ON pr.client_id = p.id
    LEFT JOIN profiles p_assign ON t.assigned_to = p_assign.id
    WHERE t.status = 'in_progress'
  `);
  console.table(inProgress);

  console.log("=== TASKS WITH STARTED_AT NOT NULL ===");
  const started = await sql.query(`
    SELECT t.id, t.project_id, t.title, t.status, t.stage, t.started_at, p.nome as client_name
    FROM tasks t
    LEFT JOIN projects pr ON t.project_id = pr.id
    LEFT JOIN profiles p ON pr.client_id = p.id
    WHERE t.started_at IS NOT NULL AND t.status = 'in_progress'
  `);
  console.table(started);
})();
