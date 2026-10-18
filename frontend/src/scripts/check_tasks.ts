import { getDb } from '../lib/db';

async function main() {
  const sql = getDb();
  const tasks = await sql`
    SELECT id, title, task_type, stage, status, deadline, attachment_url, description
    FROM tasks 
    WHERE project_id = '6e184ace-0004-4eff-b54d-2c3676bda6a8'
    ORDER BY deadline ASC
  `;
  console.log(JSON.stringify(tasks, null, 2));
}

main().catch(console.error);
