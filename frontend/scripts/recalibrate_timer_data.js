require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

async function runRecalibration() {
  console.log('--- EXECUTANDO RECALIBRAÇÃO SEGURA ---');

  // 1. Fechar sessões antigas que ficaram com end_time NULL em tarefas já finalizadas/arquivadas
  const closedSessions = await sql`
    UPDATE work_sessions ws
    SET end_time = ws.start_time + (COALESCE(ws.duration_minutes, 30) || ' minutes')::interval
    FROM tasks t
    WHERE ws.task_id = t.id 
      AND ws.end_time IS NULL
      AND (t.status IN ('completed', 'archived', 'done', 'approved', 'review', 'pending_client_approval')
           OR ws.start_time < NOW() - INTERVAL '12 hours')
    RETURNING ws.id, ws.task_id, ws.duration_minutes;
  `;
  console.log(`✅ ${closedSessions.length} sessões pendentes fechadas com sucesso.`);

  // 2. Limpar started_at em tarefas que não estão in_progress
  const clearedStartedAt = await sql`
    UPDATE tasks 
    SET started_at = NULL
    WHERE status != 'in_progress' AND started_at IS NOT NULL
    RETURNING id;
  `;
  console.log(`✅ ${clearedStartedAt.length} tarefas com started_at desnecessário limpas.`);

  // 3. Recalibrar actual_time nas 32 tarefas com valores anômalos (> 600 minutos)
  const recalibratedTasks = await sql`
    UPDATE tasks t
    SET actual_time = COALESCE(
      NULLIF((SELECT sum(duration_minutes) FROM work_sessions ws WHERE ws.task_id = t.id AND ws.duration_minutes > 0), 0),
      t.estimated_time,
      60
    )
    WHERE t.actual_time > 600
    RETURNING id, title, actual_time;
  `;
  console.log(`✅ ${recalibratedTasks.length} tarefas com tempo inflado recalibradas.`);

  // 4. Sincronizar com tessera_work_sessions
  await sql`
    INSERT INTO public.tessera_work_sessions (
      id,
      user_id,
      work_item_id,
      started_at,
      ended_at,
      minutes,
      source
    )
    SELECT 
      ws.id,
      ws.user_id,
      ws.task_id,
      ws.start_time,
      ws.end_time,
      COALESCE(ws.duration_minutes, 0),
      'focus_timer'
    FROM public.work_sessions ws
    WHERE EXISTS (SELECT 1 FROM public.tessera_work_items tw WHERE tw.id = ws.task_id)
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ws.user_id)
    ON CONFLICT (id) DO UPDATE SET
      started_at = EXCLUDED.started_at,
      ended_at = EXCLUDED.ended_at,
      minutes = EXCLUDED.minutes;
  `;
  console.log('✅ Sincronização com tessera_work_sessions concluída.');

  // Verificação final
  const [taskStats, sessionStats] = await Promise.all([
    sql`SELECT sum(actual_time) as total_min, max(actual_time) as max_min FROM tasks;`,
    sql`SELECT count(*) as total, count(*) FILTER (WHERE end_time IS NULL) as open_count FROM work_sessions;`
  ]);

  console.log('Estatísticas após recalibração:');
  console.log('Total de minutos em tasks:', taskStats[0].total_min, 'Max minuto em uma tarefa:', taskStats[0].max_min);
  console.log('Total de sessões:', sessionStats[0].total, 'Sessões abertas:', sessionStats[0].open_count);
}

runRecalibration().catch(console.error);
