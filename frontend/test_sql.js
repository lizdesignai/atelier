require('dotenv').config({path: '../backend/.env'});
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

async function test() {
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

  const res = await sql`
    SELECT 
      t.id, t.project_id, t.assigned_to, t.title, t.description, t.caption, 
      t.external_links, t.media_assets, t.status, t.deadline, t.created_at, 
      t.completed_at, t.actual_time, t.estimated_time, t.stage, t.task_type, 
      t.attachment_url, t.subclient_id, t.agency_id,
      CASE WHEN p.id IS NOT NULL THEN
        json_build_object(
          'type', p.type,
          'service_type', p.service_type,
          'profiles', CASE WHEN pr.id IS NOT NULL THEN json_build_object('nome', pr.nome, 'avatar_url', pr.avatar_url) ELSE null END
        )
      ELSE null END as projects,
      CASE WHEN asb.id IS NOT NULL THEN
        json_build_object('name', asb.name)
      ELSE null END as agency_subclients
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN profiles pr ON p.client_id = pr.id
    LEFT JOIN agency_subclients asb ON t.subclient_id = asb.id
    WHERE t.status != 'completed' OR t.completed_at >= ${fifteenDaysAgo.toISOString()}
    ORDER BY t.deadline ASC
    LIMIT 2
  `;
  console.log(JSON.stringify(res, null, 2));
}

test().catch(console.error);
