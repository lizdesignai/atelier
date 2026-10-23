const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function testManualBlock() {
  console.log('--- TESTANDO BLOQUEIO E DESBLOQUEIO MANUAL NO TESSERA ---');
  // Pick one ready item
  const items = await sql`
    SELECT id, title, status_id, blocked_at, blocked_reason 
    FROM tessera_work_items 
    WHERE status_id = 'ready'
    LIMIT 1;
  `;
  const item = items[0];
  console.log('Item selecionado:', item.id, item.title);

  // 1. Simular bloqueio manual no Tessera
  console.log('1. Bloqueando item no Tessera com motivo manual...');
  await sql`
    UPDATE tessera_work_items 
    SET blocked_at = NOW(), blocked_reason = 'Aguardando envio do briefing pelo cliente'
    WHERE id = ${item.id};
  `;

  // Verificar se sincronizou com tasks
  const taskAfterBlock = await sql`SELECT id, title, is_blocked FROM tasks WHERE id = ${item.id};`;
  console.log('Estado em tasks após bloqueio:', taskAfterBlock[0]);

  // 2. Simular desbloqueio manual no Tessera
  console.log('2. Desbloqueando item no Tessera...');
  await sql`
    UPDATE tessera_work_items 
    SET blocked_at = NULL, blocked_reason = NULL
    WHERE id = ${item.id};
  `;

  // Verificar se sincronizou com tasks
  const taskAfterUnblock = await sql`SELECT id, title, is_blocked FROM tasks WHERE id = ${item.id};`;
  console.log('Estado em tasks após desbloqueio:', taskAfterUnblock[0]);

  console.log('Teste concluído com sucesso!');
}

testManualBlock().catch(console.error);
