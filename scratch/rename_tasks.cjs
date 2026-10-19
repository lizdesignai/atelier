require('../frontend/node_modules/dotenv').config({ path: 'frontend/.env.local', quiet: true });
const { neon } = require('../frontend/node_modules/@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

(async () => {
  console.log("Searching for tasks with 'Compilar Brand DNA'...");
  const tasks = await sql.query("SELECT id, project_id, title, status, stage FROM tasks WHERE title ILIKE '%Compilar Brand DNA%'");
  console.log(`Found ${tasks.length} tasks:`, tasks);

  if (tasks.length > 0) {
    const updated = await sql.query("UPDATE tasks SET title = 'Criar e Enviar Curadoria Visual' WHERE title ILIKE '%Compilar Brand DNA%' RETURNING id, project_id, title");
    console.log(`Successfully updated ${updated.length} tasks to 'Criar e Enviar Curadoria Visual':`, updated);
  }
})();
