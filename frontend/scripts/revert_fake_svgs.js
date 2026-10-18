const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.POSTGRES_URL);

(async () => {
  const gen = await sql`SELECT bucket_name, file_name FROM storage_objects WHERE mime_type = 'image/svg+xml'`;
  const urls = gen.map(o => `/api/storage/file/${o.bucket_name}/${o.file_name}`);
  console.log('Objetos SVG gerados:', gen.length);

  const p = await sql`UPDATE profiles SET avatar_url = NULL WHERE avatar_url = ANY(${urls}) RETURNING id`;
  const ip = await sql`UPDATE instagram_profiles SET avatar_url = NULL WHERE avatar_url = ANY(${urls}) RETURNING id`;
  let f;
  try {
    f = await sql`UPDATE instagram_feed_posts SET image_url = NULL WHERE image_url = ANY(${urls}) RETURNING id`;
  } catch (e) { console.log('feed_posts image_url não aceita NULL:', e.message); f = []; }
  console.log({ profiles: p.length, instagram_profiles: ip.length, feed_posts: f.length });

  const d = await sql`DELETE FROM storage_objects WHERE mime_type = 'image/svg+xml' RETURNING id`;
  console.log('storage_objects removidos:', d.length);

  console.log('Restante storage_objects:', (await sql`SELECT count(*)::int n FROM storage_objects`)[0].n);
  console.log('Referências residuais:', (await sql`SELECT
    (SELECT count(*)::int FROM profiles WHERE avatar_url LIKE '/api/storage/file/%') p,
    (SELECT count(*)::int FROM instagram_profiles WHERE avatar_url LIKE '/api/storage/file/%') ip,
    (SELECT count(*)::int FROM instagram_feed_posts WHERE image_url LIKE '/api/storage/file/%') f`)[0]);
})();
