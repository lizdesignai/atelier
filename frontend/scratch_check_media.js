const { neon } = require('./node_modules/@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.POSTGRES_URL);
  const targets = [
    { t: 'profiles', c: 'avatar_url' },
    { t: 'profiles', c: 'cover_url' },
    { t: 'project_assets', c: 'file_url' },
    { t: 'referencias', c: 'imagem_url' },
    { t: 'inspiracoes_cliente', c: 'imagem_url' },
    { t: 'social_posts', c: 'image_url' },
    { t: 'social_posts', c: 'media_assets' },
    { t: 'instagram_feed_posts', c: 'image_url' },
    { t: 'tasks', c: 'attachment_url' },
    { t: 'tasks', c: 'media_assets' },
    { t: 'content_planning', c: 'planning_file_url' },
    { t: 'design_directions', c: 'image_url' },
    { t: 'design_directions', c: 'image_urls' }
  ];

  for (const item of targets) {
    try {
      const q = `SELECT "${item.c}" as val FROM "${item.t}" WHERE "${item.c}" IS NOT NULL LIMIT 5`;
      const rows = await sql.query(q);
      console.log(`[${item.t}.${item.c}] count: ${rows.length}`);
      if (rows.length > 0) {
        rows.forEach(r => console.log('   ->', typeof r.val === 'object' ? JSON.stringify(r.val) : r.val));
      }
    } catch (e) {
      console.log(`[${item.t}.${item.c}] error: ${e.message}`);
    }
  }

  // Also check Instagram Management Demands & Activities
  console.log('\n--- INSTAGRAM DEMANDS AND ACTIVITIES INVESTIGATION ---');
  // How does Analytics load Instagram Demands & Activities?
  // Let's search the codebase for what Analytics does!
}

run().catch(console.error);
