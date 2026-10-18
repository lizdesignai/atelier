const http = require('http');

async function testBackend() {
  const res = await fetch('http://localhost:8080/api/v1/analytics/dashboard?fresh=true');
  const json = await res.json();
  const tasks = json.data.tasks || [];
  console.log('Total tasks from backend:', tasks.length);

  // Group tasks by project_id
  const byProj = {};
  for (const t of tasks) {
    if (t.project_id) {
      byProj[t.project_id] = (byProj[t.project_id] || 0) + 1;
    }
  }

  // Let's check Neon projects
  const { neon } = require('./node_modules/@neondatabase/serverless');
  require('dotenv').config({ path: '.env.local' });
  const sql = neon(process.env.POSTGRES_URL);
  const projects = await sql`
    SELECT p.id, p.service_type, pr.nome as client_name
    FROM projects p
    LEFT JOIN profiles pr ON p.client_id = pr.id
    WHERE p.status = 'active'
  `;

  for (const p of projects) {
    const backendCount = byProj[p.id] || 0;
    console.log(`[${p.service_type}] ${p.client_name} (id: ${p.id}): backend tasks count = ${backendCount}`);
  }
}

testBackend().catch(console.error);
