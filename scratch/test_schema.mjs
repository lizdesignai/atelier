import fs from 'fs';
const envContent = fs.readFileSync('frontend/.env.local', 'utf8');
const postgresUrl = envContent.match(/POSTGRES_URL=["']?([^"'\r\n]+)/)[1];

async function run() {
  const { neon } = await import('../backend/node_modules/@neondatabase/serverless/index.mjs');
  const sql = neon(postgresUrl);
  
  const cols = await sql`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('channels', 'messages', 'message_reactions', 'channel_reads')
    ORDER BY table_name, ordinal_position
  `;
  console.log('Columns:');
  cols.forEach(c => console.log(`${c.table_name}.${c.column_name} (${c.data_type})`));
}

run().catch(console.error);
