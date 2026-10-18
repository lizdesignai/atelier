const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function inspectImages() {
  console.log("=== INSPECTING NEON DATABASE IMAGES ===");
  
  // 1. storage_objects schema
  try {
    const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'storage_objects'`;
    console.log("storage_objects columns:", cols);
    const count = await sql`SELECT count(*) FROM storage_objects`;
    console.log("storage_objects count:", count);
  } catch (e) {
    console.log("Error querying storage_objects:", e.message);
  }

  // 2. profiles avatar_url
  try {
    const profiles = await sql`SELECT id, nome, email, avatar_url FROM profiles WHERE avatar_url IS NOT NULL`;
    console.log(`\nprofiles with avatar_url (${profiles.length}):`);
    profiles.forEach(p => console.log(` - ${p.nome} (${p.email}): ${p.avatar_url}`));
  } catch (e) {
    console.log("Error querying profiles:", e.message);
  }

  // 3. projects logo / images
  try {
    const projs = await sql`SELECT id, title, logo_url, service_type FROM projects WHERE logo_url IS NOT NULL`;
    console.log(`\nprojects with logo_url (${projs.length}):`);
    projs.forEach(p => console.log(` - ${p.title}: ${p.logo_url}`));
  } catch (e) {
    console.log("Error querying projects:", e.message);
  }

  // 4. agency_subclients
  try {
    const subclients = await sql`SELECT id, name, deliverables_count, trello_url FROM agency_subclients`;
    console.log(`\nagency_subclients (${subclients.length}):`);
    subclients.forEach(s => console.log(` - ${s.name}: trello=${s.trello_url}`));
  } catch (e) {
    console.log("Error querying agency_subclients:", e.message);
  }

  // 5. instagram_profiles
  try {
    const igProfiles = await sql`SELECT id, project_id, username, full_name, avatar_url FROM instagram_profiles`;
    console.log(`\ninstagram_profiles (${igProfiles.length}):`);
    igProfiles.forEach(ig => console.log(` - @${ig.username} (${ig.full_name}): ${ig.avatar_url}`));
  } catch (e) {
    console.log("Error querying instagram_profiles:", e.message);
  }

  // 6. instagram_feed_posts
  try {
    const igPosts = await sql`SELECT id, project_id, image_url, caption FROM instagram_feed_posts LIMIT 20`;
    console.log(`\ninstagram_feed_posts sample (${igPosts.length}):`);
    igPosts.forEach(p => console.log(` - [${p.project_id}]: ${p.image_url ? p.image_url.slice(0, 80) + '...' : 'null'}`));
  } catch (e) {
    console.log("Error querying instagram_feed_posts:", e.message);
  }

  // 7. vault_assets
  try {
    const vault = await sql`SELECT id, project_id, name, file_url, category FROM vault_assets LIMIT 20`;
    console.log(`\nvault_assets (${vault.length}):`);
    vault.forEach(v => console.log(` - ${v.name} (${v.category}): ${v.file_url}`));
  } catch (e) {
    console.log("Error querying vault_assets:", e.message);
  }

  // 8. tasks with attachments
  try {
    const tasksWithAtt = await sql`SELECT id, title, attachment_url, media_assets FROM tasks WHERE attachment_url IS NOT NULL OR jsonb_array_length(COALESCE(media_assets, '[]'::jsonb)) > 0 LIMIT 20`;
    console.log(`\ntasks with attachments (${tasksWithAtt.length}):`);
    tasksWithAtt.forEach(t => console.log(` - ${t.title}: att=${t.attachment_url}`));
  } catch (e) {
    console.log("Error querying tasks:", e.message);
  }
}

inspectImages().catch(console.error);
