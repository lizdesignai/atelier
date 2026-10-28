require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

async function check() {
  // Check tasks with is_blocked = true
  const tasksBlocked = await sql`
    SELECT id, title, task_type, status, is_blocked, deadline, created_at
    FROM tasks
    WHERE is_blocked = true;
  `;
  console.log('Tasks with is_blocked=true total count:', tasksBlocked.length);
  console.log('Tasks with is_blocked=true sample:');
  tasksBlocked.slice(0, 30).forEach(t => {
    console.log(`- [${t.status}] ${t.title} (type: ${t.task_type}, deadline: ${t.deadline})`);
  });

  // Check tessera_work_items with blocked_at IS NOT NULL
  const tesseraBlocked = await sql`
    SELECT id, title, type, status_id, blocked_at, blocked_reason, due_at
    FROM tessera_work_items
    WHERE blocked_at IS NOT NULL;
  `;
  console.log('\nTessera items with blocked_at IS NOT NULL total count:', tesseraBlocked.length);
  tesseraBlocked.slice(0, 30).forEach(t => {
    console.log(`- [${t.status_id}] ${t.title} (type: ${t.type}, blocked_reason: ${t.blocked_reason})`);
  });

  // Let's also check distinct titles / types of blocked tasks
  const distinctTitles = await sql`
    SELECT title, COUNT(*) as cnt
    FROM tasks
    WHERE is_blocked = true
    GROUP BY title
    ORDER BY cnt DESC;
  `;
  console.log('\nDistinct blocked titles in tasks:\n', JSON.stringify(distinctTitles, null, 2));

  // What columns are in tasks?
  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'tasks';
  `;
  console.log('\nTasks columns:', cols.map(c => c.column_name).join(', '));
}

check().catch(console.error);
