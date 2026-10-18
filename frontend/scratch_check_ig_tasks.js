const { neon } = require('./node_modules/@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.POSTGRES_URL);

  const igProjects = await sql`
    SELECT p.id, p.client_id, p.service_type, p.status, pr.nome as client_name, pr.avatar_url
    FROM projects p
    LEFT JOIN profiles pr ON p.client_id = pr.id
    WHERE p.service_type ILIKE '%instagram%'
  `;

  console.log('=== INSTAGRAM PROJECTS IN NEON ===');
  console.log(igProjects);

  for (const proj of igProjects) {
    const tasks = await sql`
      SELECT id, project_id, title, status, stage, task_type, deadline, assigned_to
      FROM tasks
      WHERE project_id = ${proj.id}
    `;
    console.log(`\nTasks for ${proj.client_name} (project ${proj.id}, status: ${proj.status}): count = ${tasks.length}`);
    if (tasks.length > 0) {
      console.log(tasks.slice(0, 5));
    }
  }

  // Check backend controller for analytics dashboard
  console.log('\n=== CHECKING HOW BACKEND DASHBOARD HANDLES TASKS ===');
}

run().catch(console.error);
