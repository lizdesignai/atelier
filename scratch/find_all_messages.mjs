import fs from 'fs';
const envContent = fs.readFileSync('frontend/.env.local', 'utf8');
const postgresUrl = envContent.match(/POSTGRES_URL=["']?([^"'\r\n]+)/)[1];

async function run() {
  const { neon } = await import('../backend/node_modules/@neondatabase/serverless/index.mjs');
  const sql = neon(postgresUrl);

  console.log('=== MESSAGES TABLE ===');
  const msgCount = await sql`SELECT count(*) FROM messages`;
  console.log('Total messages in "messages":', msgCount);

  const channelsWithMsgs = await sql`
    SELECT c.id, c.name, c.type, count(m.id) as cnt
    FROM channels c
    LEFT JOIN messages m ON c.id = m.channel_id
    GROUP BY c.id, c.name, c.type
    HAVING count(m.id) > 0
    ORDER BY cnt DESC
  `;
  console.log('Channels with messages:', channelsWithMsgs);

  // Check if there are messages with null or orphan channel_id
  const orphans = await sql`SELECT count(*) FROM messages WHERE channel_id NOT IN (SELECT id FROM channels)`;
  console.log('Orphan messages:', orphans);

  // Check other message tables like mensagens_chat or channel_messages
  const otherTables = ['mensagens_chat', 'channel_messages', 'topicos_chat'];
  for (const t of otherTables) {
    try {
      const c = await sql`SELECT count(*) FROM ${sql(t)}`;
      console.log(`Table ${t} count:`, c);
      if (c[0].count > 0) {
        const sample = await sql`SELECT * FROM ${sql(t)} LIMIT 3`;
        console.log(`Sample from ${t}:`, sample);
      }
    } catch (e) {
      console.log(`Table ${t} query error:`, e.message);
    }
  }

  // Let's check all messages in 'messages' table with their text content and channel
  const sampleMsgs = await sql`
    SELECT m.id, m.channel_id, c.name as channel_name, c.type as channel_type, m.sender_id, p.nome as sender_name, m.text_content, m.created_at
    FROM messages m
    LEFT JOIN channels c ON m.channel_id = c.id
    LEFT JOIN profiles p ON m.sender_id = p.id
    ORDER BY m.created_at DESC
    LIMIT 20
  `;
  console.log('Recent 20 messages in "messages":');
  sampleMsgs.forEach(m => console.log(`[${m.created_at}] [${m.channel_name || 'NO_CHANNEL'} (${m.channel_type})] ${m.sender_name}: ${m.text_content?.slice(0, 60)}`));
}

run().catch(console.error);
