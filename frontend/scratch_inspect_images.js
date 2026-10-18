const { neon } = require('./node_modules/@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function inspectImages() {
  const sql = neon(process.env.POSTGRES_URL);

  console.log('--- 1. STORAGE OBJECTS TABLE ---');
  try {
    const storageTables = await sql`SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%storage%'`;
    console.log('Storage tables found:', storageTables);

    const storageObjCount = await sql`SELECT count(*) FROM storage_objects`;
    console.log('Total rows in storage_objects:', storageObjCount[0].count);

    const storageObjSample = await sql`SELECT id, bucket_name, file_name, mime_type, size, created_at FROM storage_objects LIMIT 10`;
    console.log('Sample storage_objects:', storageObjSample);
  } catch (err) {
    console.error('Error inspecting storage_objects:', err.message);
  }

  console.log('\n--- 2. PROFILES AVATARS ---');
  try {
    const avatars = await sql`SELECT id, nome, email, avatar_url FROM profiles WHERE avatar_url IS NOT NULL LIMIT 10`;
    console.log('Profiles with avatar_url:', avatars);
  } catch (err) {
    console.error('Error inspecting profiles:', err.message);
  }

  console.log('\n--- 3. TASKS ATTACHMENTS / MEDIA ---');
  try {
    const taskMedia = await sql`
      SELECT id, title, attachment_url, media_assets 
      FROM tasks 
      WHERE attachment_url IS NOT NULL OR (media_assets IS NOT NULL AND jsonb_array_length(media_assets) > 0)
      LIMIT 10
    `;
    console.log('Tasks with media:', taskMedia);
  } catch (err) {
    console.error('Error inspecting tasks:', err.message);
  }

  console.log('\n--- 4. SOCIAL POSTS / BRAND ASSETS ---');
  try {
    const assets = await sql`SELECT id, file_url, file_name FROM project_assets LIMIT 5`;
    console.log('project_assets:', assets);
  } catch (err) {
    console.log('project_assets table error or empty:', err.message);
  }
}

inspectImages().catch(console.error);
