const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function test() {
  try {
    const projects = await sql`
      SELECT p.id, pr.nome as client_name, p.billing_date, p.created_at, p.contract_start
      FROM projects p
      LEFT JOIN profiles pr ON p.client_id = pr.id
      WHERE p.service_type = 'Gestão de Instagram'
    `;

    console.log('=== INSTAGRAM PROJECTS & THEIR TASKS ===');
    for (const p of projects) {
      const tasks = await sql`
        SELECT id, title, status, ig_publish_status, deadline, cycle_id, ig_is_piece, task_type, admin_feedback
        FROM tasks
        WHERE project_id = ${p.id}
        ORDER BY created_at DESC
      `;
      const reviewTasks = tasks.filter(t => t.status === 'review' || t.ig_publish_status === 'adjust_requested' || (t.admin_feedback && t.admin_feedback.length > 5));
      console.log(`\nProject [${p.id}] ${p.client_name}: total tasks = ${tasks.length}, review/adjust tasks = ${reviewTasks.length}`);
      if (reviewTasks.length > 0) {
        reviewTasks.forEach(t => {
          console.log(`  -> Task [${t.id}] "${t.title}": status=${t.status}, ig_publish_status=${t.ig_publish_status}, cycle_id=${t.cycle_id}, deadline=${t.deadline}`);
        });
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
