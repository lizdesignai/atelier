require('../frontend/node_modules/dotenv').config({ path: 'frontend/.env.local' });
const { neon } = require('../frontend/node_modules/@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);
(async () => {
  for (const t of ['instagram_briefings', 'brand_identities', 'social_posts', 'collaborator_assignments', 'briefings_identidade_visual', 'orcamentos_gerenciamento_instagram', 'brand_guidelines']) {
    const r = await sql.query('select column_name,data_type from information_schema.columns where table_name=$1 order by ordinal_position', [t]);
    console.log(t, '=>', r.map(x => x.column_name + ':' + x.data_type).join(', '), '\n');
  }
  const r = await sql.query("select status, task_type, stage, count(*) from tasks t join projects p on p.id=t.project_id where p.service_type='Gestão de Instagram' group by 1,2,3 order by 4 desc limit 30");
  console.log(JSON.stringify(r));
  const p = await sql.query("select id, billing_date, contract_start, contract_end, posts_quantity, videos_quantity, payment_recurrence, content_release_day, ready_checklist from projects where service_type='Gestão de Instagram' and status='active'");
  console.log(JSON.stringify(p));
})().catch(e => console.error(e.message));
