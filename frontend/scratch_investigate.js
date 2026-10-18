const { neon } = require('./node_modules/@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.POSTGRES_URL);

  console.log('=== COLUMNS IN PROJECTS ===');
  const projCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'projects'
  `;
  console.log(projCols.map(c => c.column_name));

  console.log('\n=== SAMPLE PROJECTS ===');
  const sampleProjects = await sql`SELECT * FROM projects LIMIT 5`;
  console.log(sampleProjects);

  console.log('\n=== ALL COLUMNS WITH URL, IMAGE, AVATAR, MEDIA, FOTO, LOGO ===');
  const mediaCols = await sql`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND (
        column_name ILIKE '%url%' 
        OR column_name ILIKE '%image%' 
        OR column_name ILIKE '%avatar%' 
        OR column_name ILIKE '%media%' 
        OR column_name ILIKE '%foto%'
        OR column_name ILIKE '%attachment%'
        OR column_name ILIKE '%logo%'
      )
    ORDER BY table_name, column_name
  `;
  console.log(mediaCols);

  console.log('\n=== CHECKING VALUES IN MEDIA COLUMNS (WHERE NOT NULL) ===');
  for (const col of mediaCols) {
    try {
      const rows = await sql(
        `SELECT "${col.column_name}" as val FROM "${col.table_name}" WHERE "${col.column_name}" IS NOT NULL AND "${col.column_name}"::text != '' AND "${col.column_name}"::text != '[]' AND "${col.column_name}"::text != '{}' LIMIT 3`
      );
      if (rows.length > 0) {
        console.log(`\n[${col.table_name}.${col.column_name}] (${rows.length} rows found):`);
        rows.forEach(r => console.log('  ->', typeof r.val === 'object' ? JSON.stringify(r.val) : r.val));
      }
    } catch (e) {
      // ignore
    }
  }
}

run().catch(console.error);
