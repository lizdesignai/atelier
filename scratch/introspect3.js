require('../frontend/node_modules/dotenv').config({ path: 'frontend/.env.local', quiet: true });
const { neon } = require('../frontend/node_modules/@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);
(async () => {
  console.log(JSON.stringify(await sql.query("select t.status, t.task_type, t.stage, count(*) from tasks t join projects p on p.id=t.project_id where p.service_type='Gestão de Instagram' group by 1,2,3 order by 4 desc limit 30")));
  console.log(JSON.stringify(await sql.query("select billing_date, contract_start, contract_end, posts_quantity, videos_quantity, payment_recurrence, content_release_day, ready_checklist from projects where service_type='Gestão de Instagram' and status='active'")));
})().catch(e => console.error(e.message));
