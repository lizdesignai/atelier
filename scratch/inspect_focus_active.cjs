require('../frontend/node_modules/dotenv').config({ path: 'frontend/.env.local', quiet: true });
const { neon } = require('../frontend/node_modules/@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

(async () => {
  console.log("=== TASKS IN PROGRESS ===");
  const inProgress = await sql.query(`
    SELECT t.id, t.project_id, t.title, t.status, t.stage, t.started_at, t.created_at, p.nome as client_name
    FROM tasks t
    LEFT JOIN projects pr ON t.project_id = pr.id
    LEFT JOIN profiles p ON pr.client_id = p.id
    WHERE t.status = 'in_progress'
    ORDER BY t.created_at DESC
  `);
  console.table(inProgress);

  console.log("=== RECENTLY CREATED TASKS (LAST 24 HOURS) ===");
  const recent = await sql.query(`
    SELECT t.id, t.project_id, t.title, t.status, t.stage, t.started_at, t.created_at, p.nome as client_name
    FROM tasks t
    LEFT JOIN projects pr ON t.project_id = pr.id
    LEFT JOIN profiles p ON pr.client_id = p.id
    WHERE t.created_at >= NOW() - INTERVAL '2 days'
    ORDER BY t.created_at DESC
  `);
  console.table(recent);

  console.log("=== ELISABETH BRANDAO TASKS ===");
  const elisabeth = await sql.query(`
    SELECT t.id, t.project_id, t.title, t.status, t.stage, t.started_at, t.deadline
    FROM tasks t
    WHERE t.project_id = '3df725da-440c-4cc9-98c0-b04be1497d63'
    ORDER BY t.deadline ASC
  `);
  console.table(elisabeth);
})();
