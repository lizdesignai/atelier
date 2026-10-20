const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function syncSessions() {
  console.log('--- SINCRONIZANDO WORK SESSIONS -> TESSERA_WORK_SESSIONS ---');

  const res = await sql`
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

  const count = await sql`SELECT count(*) FROM public.tessera_work_sessions;`;
  console.log('Total de sessões em tessera_work_sessions:', count[0].count);
}

syncSessions().catch(console.error);
