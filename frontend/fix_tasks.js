const { Client } = require('pg');

async function fixTasks() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();

    // Set all IDV tasks to have temp_dependency_index and is_blocked if appropriate
    const { rows: idvProjects } = await client.query(`
      SELECT id FROM projects WHERE status = 'active' AND (service_type = 'Identidade Visual' OR type ILIKE '%Identidade Visual%')
    `);

    for (const project of idvProjects) {
      const { rows: tasks } = await client.query(`
        SELECT id FROM tasks WHERE project_id = $1 ORDER BY created_at ASC
      `, [project.id]);

      for (let i = 0; i < tasks.length; i++) {
        await client.query(`
          UPDATE tasks 
          SET temp_dependency_index = $1, is_blocked = $2
          WHERE id = $3
        `, [i > 0 ? i - 1 : null, i > 0, tasks[i].id]);
      }
    }
    console.log("Tasks fixed.");
    await client.end();
  } catch(e) {
    console.error(e);
  }
}
fixTasks();
