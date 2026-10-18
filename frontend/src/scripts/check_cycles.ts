import { getDb } from '../lib/db';

async function main() {
  const sql = getDb();
  const projects = await sql`
    SELECT id, type, billing_date, client_id 
    FROM projects 
    WHERE id = '6e184ace-0004-4eff-b54d-2c3676bda6a8'
    LIMIT 5
  `;
  console.log('PROJECTS:', JSON.stringify(projects, null, 2));

  const cycles = await sql`
    SELECT id, project_id, cycle_number, period_start, period_end, status 
    FROM ig_cycles 
    WHERE project_id = '6e184ace-0004-4eff-b54d-2c3676bda6a8'
    ORDER BY cycle_number ASC
  `;
  console.log('CYCLES:', JSON.stringify(cycles, null, 2));

  const tasks = await sql`
    SELECT id, project_id, title, task_type, stage, status, deadline, attachment_url, admin_feedback, cycle_id
    FROM tasks
    WHERE project_id = '6e184ace-0004-4eff-b54d-2c3676bda6a8'
    ORDER BY deadline ASC
  `;
  console.log('TASKS COUNT:', tasks.length);
  for (const t of tasks) {
    console.log(`- [${t.status}] ${t.deadline} | type: ${t.task_type} | stage: ${t.stage} | ${t.title} | attach: ${t.attachment_url ? 'YES' : 'NO'}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
