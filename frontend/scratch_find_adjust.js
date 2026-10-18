const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function test() {
  try {
    const adjustTasks = await sql`
      SELECT t.id, t.title, t.status, t.ig_publish_status, t.ig_revision_round, t.project_id,
             p.service_type, p.type, pr.nome as client_name, pr.empresa
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN profiles pr ON p.client_id = pr.id
      WHERE t.status IN ('review', 'pending_approval', 'pending_client_approval')
         OR t.ig_publish_status = 'adjust_requested'
         OR t.ig_revision_round > 0
    `;
    console.log('Tasks with adjust or review:', JSON.stringify(adjustTasks, null, 2));

    const events = await sql`
      SELECT e.*, t.title as task_title, pr.nome as actor_nome
      FROM ig_approval_events e
      LEFT JOIN tasks t ON e.task_id = t.id
      LEFT JOIN profiles pr ON e.actor_id = pr.id
      ORDER BY e.created_at DESC
      LIMIT 20
    `;
    console.log('Approval events:', JSON.stringify(events, null, 2));

    const allTasks = await sql`
      SELECT t.id, t.title, t.status, t.ig_publish_status, t.ig_revision_round, t.project_id,
             pr.nome as client_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN profiles pr ON p.client_id = pr.id
      WHERE t.status = 'review'
    `;
    console.log('All tasks with status=review:', JSON.stringify(allTasks, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
