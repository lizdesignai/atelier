const { neon } = require('./node_modules/@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.POSTGRES_URL);

  const activeProjects = await sql`
    SELECT p.id, p.client_id, p.service_type, p.status, pr.nome as client_name, p.delivery_target_date, p.deadline
    FROM projects p
    LEFT JOIN profiles pr ON p.client_id = pr.id
    WHERE p.status = 'active'
    ORDER BY pr.nome
  `;

  console.log('=== ACTIVE PROJECTS IN NEON ===');
  for (const p of activeProjects) {
    const tasksByProjId = await sql`
      SELECT count(*) FROM tasks WHERE project_id = ${p.id}
    `;
    const tasksByClientId = await sql`
      SELECT count(*) FROM tasks WHERE client_id = ${p.client_id}
    `;
    const pendingTasksByProjId = await sql`
      SELECT count(*) FROM tasks WHERE project_id = ${p.id} AND status NOT IN ('completed', 'archived')
    `;

    console.log(`[${p.service_type}] ${p.client_name}:
      project.id: ${p.id}
      project.client_id: ${p.client_id}
      tasks with project_id = ${p.id}: ${tasksByProjId[0].count} (pending: ${pendingTasksByProjId[0].count})
      tasks with client_id = ${p.client_id}: ${tasksByClientId[0].count}
    `);
  }
}

run().catch(console.error);
