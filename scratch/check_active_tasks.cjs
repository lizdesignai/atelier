require('../frontend/node_modules/dotenv').config({ path: 'frontend/.env.local', quiet: true });
const { neon } = require('../frontend/node_modules/@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

(async () => {
  const inProgress = await sql.query(`
    SELECT t.id, t.project_id, t.title, t.status, t.started_at, t.actual_time, p.nome as client_name 
    FROM tasks t
    LEFT JOIN projects pr ON t.project_id = pr.id
    LEFT JOIN profiles p ON pr.client_id = p.id
    WHERE t.status = 'in_progress'
    ORDER BY t.started_at DESC NULLS LAST
  `);
  console.log('--- IN PROGRESS TASKS ---');
  console.log(JSON.stringify(inProgress, null, 2));

  const allActive = await sql.query(`
    SELECT t.id, t.project_id, t.title, t.status, t.started_at, p.nome as client_name 
    FROM tasks t
    LEFT JOIN projects pr ON t.project_id = pr.id
    LEFT JOIN profiles p ON pr.client_id = p.id
    WHERE t.started_at IS NOT NULL AND t.status != 'completed'
  `);
  console.log('--- STARTED BUT NOT COMPLETED ---');
  console.log(JSON.stringify(allActive, null, 2));
})();
