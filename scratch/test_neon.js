const { neon } = require('./backend/node_modules/@neondatabase/serverless');
const fs = require('fs');

const envContent = fs.readFileSync('frontend/.env.local', 'utf8');
const match = envContent.match(/POSTGRES_URL=["']?([^"'\r\n]+)/);
const postgresUrl = match[1];

async function run() {
  try {
    const sql = neon(postgresUrl);
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
    console.log('Tables in DB:', tables.map(t => t.table_name));

    const profiles = await sql`SELECT id, nome, email, role, current_mood, current_song_id FROM profiles LIMIT 10`;
    console.log('Profiles in DB:', profiles);

    const channels = await sql`SELECT * FROM channels LIMIT 10`;
    console.log('Channels in DB:', channels);

    const messages = await sql`SELECT count(*) FROM messages`;
    console.log('Messages count:', messages);
  } catch (err) {
    console.error('Neon test error:', err);
  }
}

run();
