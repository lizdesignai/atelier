const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.POSTGRES_URL);
const SB = 'tmmptilchainrsptwsxc.supabase.co';

(async () => {
  const urls = new Set();
  const add = (u) => { if (typeof u === 'string' && u.includes(SB)) urls.add(u); };
  const walk = (v) => { if (!v) return; if (typeof v === 'string') add(v); else if (Array.isArray(v)) v.forEach(walk); else if (typeof v === 'object') Object.values(v).forEach(walk); };

  (await sql`SELECT attachment_url, media_assets FROM tasks`).forEach(r => { add(r.attachment_url); walk(r.media_assets); });
  (await sql`SELECT attachment_url FROM messages`).forEach(r => add(r.attachment_url));
  (await sql`SELECT planning_file_url u FROM content_planning`).forEach(r => add(r.u));
  (await sql`SELECT image_url u FROM social_posts`).forEach(r => add(r.u));
  (await sql`SELECT contract_url u FROM projects`).forEach(r => add(r.u));

  console.log('URLs Supabase restantes no Neon:', urls.size);
  const stat = {};
  let ok = 0;
  for (const u of urls) {
    try {
      const r = await fetch(u, { method: 'GET' });
      stat[r.status] = (stat[r.status] || 0) + 1;
      if (r.ok) ok++;
      if (Object.values(stat).reduce((a,b)=>a+b,0) <= 3) console.log(r.status, u.slice(0, 120));
    } catch (e) { stat['ERR'] = (stat['ERR'] || 0) + 1; }
  }
  console.log('Status HTTP:', stat, 'acessíveis:', ok);
  // bucket/path sample
  console.log([...urls].slice(0,5));
})();
