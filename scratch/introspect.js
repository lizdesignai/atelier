require('../frontend/node_modules/dotenv').config({ path: 'frontend/.env.local' });
const { neon } = require('../frontend/node_modules/@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);
(async () => {
  for (const t of ['projects', 'instagram_feed_posts', 'content_planning', 'instagram_reports', 'instagram_profiles', 'asset_missions', 'project_assets', 'tasks', 'notifications']) {
    const r = await sql.query('select column_name,data_type from information_schema.columns where table_name=$1 order by ordinal_position', [t]);
    console.log(t, '=>', r.map(x => x.column_name + ':' + x.data_type).join(', '), '\n');
  }
  const c = await sql.query('select service_type,type,status,count(*) from projects group by 1,2,3');
  console.log(JSON.stringify(c));
})().catch(e => console.error(e.message));
