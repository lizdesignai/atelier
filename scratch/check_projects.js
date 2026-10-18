const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function test() {
  try {
    const allProjects = await sql`SELECT id, title, type, service_type, status, client_id FROM projects`;
    console.log('Total projects in DB:', allProjects.length);
    console.log('Sample projects:', allProjects.slice(0, 5));

    const igProjects = await sql`
      SELECT p.id, p.title, p.type, p.service_type, p.status, p.client_id,
             pr.nome, pr.empresa, pr.avatar_url, pr.email
      FROM projects p
      LEFT JOIN profiles pr ON p.client_id = pr.id
      WHERE p.service_type = 'Gestão de Instagram' 
         OR p.type ILIKE '%Instagram%' 
         OR p.type ILIKE '%Social%'
         OR p.service_type ILIKE '%Instagram%'
      ORDER BY p.created_at DESC
    `;
    console.log('IG projects count:', igProjects.length);
    console.log('IG projects:', JSON.stringify(igProjects, null, 2));

    const allProfiles = await sql`SELECT id, nome, email, role, empresa FROM profiles WHERE role IN ('client', 'lead')`;
    console.log('Total client/lead profiles:', allProfiles.length);
    console.log('Profiles:', JSON.stringify(allProfiles, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

test();
