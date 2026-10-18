const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.POSTGRES_URL);

(async () => {
  // 1. Todas as colunas que possam conter imagem/URL/arquivo
  const cols = await sql`
    SELECT table_name, column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND (
      column_name ~* '(url|image|img|avatar|logo|photo|foto|cover|banner|attachment|media|asset|file|thumb|path)'
    ) ORDER BY table_name, column_name`;
  console.log('=== COLUNAS CANDIDATAS ===');
  const report = [];
  for (const c of cols) {
    if (c.data_type === 'bytea') { console.log(`${c.table_name}.${c.column_name} [bytea]`); continue; }
    try {
      const q = `SELECT count(*)::int total, count(${c.column_name})::int filled FROM ${c.table_name}`;
      const r = (await sql.query(q))[0];
      if (r.filled === 0) continue;
      const hosts = await sql.query(
        `SELECT substring(${c.column_name}::text from '^(https?://[^/]+|/api/[a-z]+/[a-z]+(/[a-z_]+)?|data:[^;]+|[^/:]{0,20})') h, count(*)::int n
         FROM ${c.table_name} WHERE ${c.column_name} IS NOT NULL AND ${c.column_name}::text <> '' GROUP BY 1 ORDER BY 2 DESC LIMIT 8`);
      console.log(`\n${c.table_name}.${c.column_name} (${c.data_type}) filled=${r.filled}/${r.total}`);
      hosts.forEach(h => console.log(`    ${h.n}  ${h.h}`));
    } catch (e) { console.log(`${c.table_name}.${c.column_name} ERR ${e.message}`); }
  }
  const so = await sql`SELECT bucket_name, count(*)::int n, sum(size)::int bytes, count(*) filter (where mime_type='image/svg+xml')::int svgs FROM storage_objects GROUP BY 1`;
  console.log('\n=== storage_objects ===', so);
})();
