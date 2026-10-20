import fs from 'fs';
const envContent = fs.readFileSync('frontend/.env.local', 'utf8');
const postgresUrl = envContent.match(/POSTGRES_URL=["']?([^"'\r\n]+)/)[1];

async function run() {
  const { neon } = await import('../backend/node_modules/@neondatabase/serverless/index.mjs');
  const sql = neon(postgresUrl);

  console.log('Testing Sintonia API queries...');

  // 1. Corporate channels
  const corp = await sql`
    SELECT id, name, type, description, is_private, created_at, project_id
    FROM channels
    WHERE type IN ('fio_geral', 'general', 'corporate_global')
    ORDER BY created_at ASC
  `;
  console.log('Corporate channels:', corp.map(c => c.name));

  // 2. DM channels
  const dms = await sql`
    SELECT c.id, c.name, c.type, c.created_at
    FROM channels c
    WHERE c.type = 'dm'
    ORDER BY c.created_at DESC
  `;
  console.log('DM channels count:', dms.length);

  // 3. Client channels
  const clients = await sql`
    SELECT c.id, c.name, c.type, pr.nome as client_name
    FROM channels c
    LEFT JOIN projects p ON c.project_id = p.id
    LEFT JOIN profiles pr ON p.client_id = pr.id
    WHERE c.type = 'fio_cliente'
    LIMIT 5
  `;
  console.log('Client channels sample:', clients.map(c => c.client_name || c.name));

  // 4. Team members
  const team = await sql`
    SELECT id, nome, role, current_mood, current_song_id
    FROM profiles
    WHERE role IN ('admin', 'gestor', 'colaborador')
    ORDER BY nome ASC
  `;
  console.log('Team members count:', team.length);
  console.log('Team moods:', team.filter(t => t.current_mood || t.current_song_id).map(t => ({ nome: t.nome, mood: t.current_mood, song: t.current_song_id })));

  console.log('All DB queries executed with 100% success!');
}

run().catch(console.error);
