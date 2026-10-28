require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.POSTGRES_URL);

async function test() {
  try {
    const tasks = await sql`
      SELECT t.id, t.title, t.status, t.project_id, pr.nome as client_name, p.type,
             t.attachment_url, t.caption, t.stage, t.task_type
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN profiles pr ON p.client_id = pr.id
      WHERE t.admin_feedback IS NOT NULL AND t.admin_feedback != ''
    `;
    console.log('Tasks with admin_feedback (without truncated text):');
    tasks.forEach(t => {
      console.log(`- [${t.id}] "${t.title}" | Client: "${t.client_name}" (Project: ${t.project_id}) | status: ${t.status} | stage: ${t.stage}`);
    });

    const reviews = await sql`
      SELECT t.id, t.title, t.status, t.ig_publish_status, t.ig_revision_round, t.project_id, pr.nome as client_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN profiles pr ON p.client_id = pr.id
      WHERE t.status = 'review'
    `;
    console.log('\nTasks with status = review:');
    reviews.forEach(t => {
      console.log(`- [${t.id}] "${t.title}" | Client: "${t.client_name}" (Project: ${t.project_id}) | status: ${t.status} | ig_publish_status: ${t.ig_publish_status}`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
