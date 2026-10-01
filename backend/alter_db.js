const postgres = require('postgres');

async function run() {
  const sql = postgres('postgresql://postgres.wtzffvdfwsttvnvyfmsa:57hFzRk6B@f@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require');
  
  try {
    // Check if column exists, if not, add it
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS idv_phase text DEFAULT 'onboarding'`;
    console.log('Column idv_phase ensured.');
    
    // Update the IDV project to 'define'
    const res = await sql`UPDATE projects SET idv_phase = 'define' WHERE service_type = 'Identidade Visual' OR type = 'Identidade Visual' RETURNING id`;
    console.log('Updated projects:', res);
  } catch (e) {
    console.error(e);
  } finally {
    sql.end();
  }
}
run();
