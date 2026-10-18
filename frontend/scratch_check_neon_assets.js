const { neon } = require('./node_modules/@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = neon(process.env.POSTGRES_URL);

  const assetsCount = await sql`SELECT count(*) FROM project_assets`;
  console.log('project_assets count in Neon:', assetsCount[0].count);

  const igProfiles = await sql`SELECT count(*) FROM instagram_profiles`;
  console.log('instagram_profiles count in Neon:', igProfiles[0].count);

  const igPosts = await sql`SELECT count(*) FROM instagram_feed_posts`;
  console.log('instagram_feed_posts count in Neon:', igPosts[0].count);

  const socialPosts = await sql`SELECT count(*) FROM social_posts`;
  console.log('social_posts count in Neon:', socialPosts[0].count);

  // Sample data
  const sampleIgProfiles = await sql`SELECT id, project_id, username, avatar_url FROM instagram_profiles LIMIT 5`;
  console.log('Sample instagram_profiles:', sampleIgProfiles);

  const sampleIgPosts = await sql`SELECT id, project_id, image_url, display_order FROM instagram_feed_posts LIMIT 5`;
  console.log('Sample instagram_feed_posts:', sampleIgPosts);

  const sampleSocialPosts = await sql`SELECT id, project_id, image_url, status FROM social_posts LIMIT 5`;
  console.log('Sample social_posts:', sampleSocialPosts);
}

run().catch(console.error);
