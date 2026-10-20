import fs from 'fs';
const envContent = fs.readFileSync('frontend/.env.local', 'utf8');
const postgresUrl = envContent.match(/POSTGRES_URL=["']?([^"'\r\n]+)/)[1];

async function run() {
  const { neon } = await import('../backend/node_modules/@neondatabase/serverless/index.mjs');
  const sql = neon(postgresUrl);
  
  const counts = await sql`
    SELECT c.name, c.type, count(m.id) as msg_count 
    FROM channels c 
    LEFT JOIN messages m ON c.id = m.channel_id 
    GROUP BY c.id, c.name, c.type 
    ORDER BY msg_count DESC
    LIMIT 15
  `;
  console.log('Top channels by message count:');
  counts.forEach(c => console.log(`- ${c.name} (${c.type}): ${c.msg_count} messages`));
}

run().catch(console.error);
