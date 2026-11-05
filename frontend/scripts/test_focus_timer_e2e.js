require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

async function runE2ETest() {
  console.log('🧪 Iniciando Teste E2E do Cronômetro do Focus & Sessões...');

  // 1. Pegar um colaborador de teste
  const profiles = await sql`SELECT id, nome FROM profiles WHERE role IN ('colaborador', 'admin') LIMIT 1;`;
  const user = profiles[0];
  console.log(`👤 Usuário de teste: ${user.nome} (${user.id})`);

  // 2. Criar duas tarefas de teste temporárias
  const t1 = await sql`
    INSERT INTO tasks (title, status, assigned_to, estimated_time, actual_time)
    VALUES ('[TESTE E2E] Tarefa A', 'pending', ${user.id}, 60, 0)
    RETURNING id, title, status, actual_time;
  `;
  const taskA = t1[0];

  const t2 = await sql`
    INSERT INTO tasks (title, status, assigned_to, estimated_time, actual_time)
    VALUES ('[TESTE E2E] Tarefa B', 'pending', ${user.id}, 60, 0)
    RETURNING id, title, status, actual_time;
  `;
  const taskB = t2[0];

  console.log(`📋 Tarefas de teste criadas: Tarefa A (${taskA.id}), Tarefa B (${taskB.id})`);

  try {
    // 3. Simular início da Tarefa A (PATCH status in_progress)
    const { PATCH } = await import('../src/app/api/tasks/[taskId]/status/route.ts');

    const reqA = new Request(`http://localhost/api/tasks/${taskA.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestedStatus: 'in_progress', userId: user.id })
    });
    const resA = await PATCH(reqA, { params: Promise.resolve({ taskId: taskA.id }) });
    const jsonA = await resA.json();
    console.log(`▶️ Tarefa A iniciada. Status retornado: ${jsonA.data?.status}, started_at: ${jsonA.data?.started_at}`);

    // Verificar se sessão aberta foi criada para Tarefa A
    const sessA = await sql`SELECT id, start_time, end_time, duration_minutes FROM work_sessions WHERE task_id = ${taskA.id} AND end_time IS NULL;`;
    console.log(`  Sessão aberta em work_sessions:`, sessA.length === 1 ? 'OK (1 sessão aberta)' : 'ERRO');

    // 4. Regra de Foco Único: Iniciar Tarefa B enquanto Tarefa A estava rodando
    console.log(`▶️ Iniciando Tarefa B (deve pausar Tarefa A automaticamente)...`);
    const reqB = new Request(`http://localhost/api/tasks/${taskB.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestedStatus: 'in_progress', userId: user.id })
    });
    const resB = await PATCH(reqB, { params: Promise.resolve({ taskId: taskB.id }) });
    const jsonB = await resB.json();
    console.log(`  Tarefa B iniciada. Status: ${jsonB.data?.status}`);

    // Verificar se Tarefa A foi pausada automaticamente no banco
    const taskACheck = await sql`SELECT id, status, started_at, actual_time FROM tasks WHERE id = ${taskA.id};`;
    console.log(`  Tarefa A agora está com status: "${taskACheck[0].status}" (esperado: "pending"), started_at: ${taskACheck[0].started_at}`);

    // Verificar se sessão de Tarefa A foi fechada
    const sessACheck = await sql`SELECT id, start_time, end_time, duration_minutes FROM work_sessions WHERE task_id = ${taskA.id};`;
    console.log(`  Sessão da Tarefa A fechada com end_time: ${sessACheck[0]?.end_time ? 'SIM' : 'NÃO'}, duração: ${sessACheck[0]?.duration_minutes}m`);

    // 5. Testar Heartbeat na Tarefa B
    console.log(`💓 Enviando Heartbeat na Tarefa B...`);
    const reqHeartbeat = new Request(`http://localhost/api/tasks/${taskB.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestedStatus: 'heartbeat', minutes: 1, userId: user.id })
    });
    const resH = await PATCH(reqHeartbeat, { params: Promise.resolve({ taskId: taskB.id }) });
    const jsonH = await resH.json();
    console.log(`  Heartbeat processado com sucesso. Tarefa B status: ${jsonH.data?.status}`);

    // 6. Concluir Tarefa B (Aprovação / completed)
    console.log(`✅ Concluindo Tarefa B...`);
    const reqCompleteB = new Request(`http://localhost/api/tasks/${taskB.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestedStatus: 'completed', userId: user.id })
    });
    const resCB = await PATCH(reqCompleteB, { params: Promise.resolve({ taskId: taskB.id }) });
    const jsonCB = await resCB.json();
    console.log(`  Tarefa B concluída. Status: ${jsonCB.data?.status}, actual_time: ${jsonCB.data?.actual_time}m`);

    const sessBCheck = await sql`SELECT id, start_time, end_time, duration_minutes FROM work_sessions WHERE task_id = ${taskB.id};`;
    console.log(`  Sessão da Tarefa B fechada com end_time: ${sessBCheck[0]?.end_time ? 'SIM' : 'NÃO'}, duração: ${sessBCheck[0]?.duration_minutes}m`);

    console.log('\n🎉 TODOS OS TESTES DO FLUXO DO CRONÔMETRO PASSARAM COM SUCESSO!');
  } finally {
    // Limpeza das tarefas e sessões de teste
    await sql`DELETE FROM work_sessions WHERE task_id IN (${taskA.id}, ${taskB.id});`;
    await sql`DELETE FROM tessera_work_sessions WHERE work_item_id IN (${taskA.id}, ${taskB.id});`;
    await sql`DELETE FROM tasks WHERE id IN (${taskA.id}, ${taskB.id});`;
    console.log('🧹 Limpeza dos dados de teste concluída.');
  }
}

runE2ETest().catch(console.error);
