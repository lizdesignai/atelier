require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.POSTGRES_URL);

async function test() {
  try {
    const tasks = await sql`
      SELECT id, title, status, ig_publish_status, task_type, stage, ig_is_piece, cycle_id, project_id, admin_feedback
      FROM tasks
      WHERE status = 'review' OR ig_publish_status = 'adjust_requested'
    `;
    console.log('Review tasks count:', tasks.length);
    tasks.forEach(t => {
      console.log(`- [${t.id}] "${t.title}" | type=${t.task_type} | stage=${t.stage} | is_piece=${t.ig_is_piece} | cycle=${t.cycle_id}`);
      if (t.admin_feedback) console.log(`  feedback: ${t.admin_feedback.slice(0, 100)}...`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
