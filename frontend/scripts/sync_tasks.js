const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const ORG_ID = '9e4d0261-e26d-4d92-8097-bb1850c1d958';

async function syncAll() {
  console.log('--- INICIANDO MIGRAÇÃO/SINCRONIZAÇÃO TASKS -> TESSERA_WORK_ITEMS ---');

  const result = await sql`
    INSERT INTO public.tessera_work_items (
      id,
      organization_id,
      project_id,
      owner_id,
      type,
      title,
      description,
      status_id,
      priority,
      due_at,
      internal_due_at,
      estimate_minutes,
      actual_minutes,
      blocked_at,
      blocked_reason,
      stage_id,
      created_at,
      updated_at,
      completed_at
    )
    SELECT 
      t.id,
      ${ORG_ID}::uuid,
      CASE WHEN EXISTS (SELECT 1 FROM public.projects p WHERE p.id = t.project_id) THEN t.project_id ELSE NULL END,
      CASE WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.assigned_to) THEN t.assigned_to ELSE NULL END,
      COALESCE(NULLIF(TRIM(t.task_type), ''), 'task'),
      COALESCE(NULLIF(TRIM(t.title), ''), 'Demanda sem título'),
      t.description,
      CASE 
        WHEN t.status = 'completed' THEN 'done'
        WHEN t.status = 'archived' THEN 'canceled'
        WHEN t.status = 'review' THEN 'internal_review'
        WHEN t.status = 'pending_client_approval' THEN 'client_approval'
        WHEN t.status IN ('pending', 'pendente') THEN 
          CASE WHEN t.started_at IS NOT NULL THEN 'in_progress' ELSE 'ready' END
        WHEN t.status = 'draft' THEN 'inbox'
        ELSE 'ready'
      END,
      CASE 
        WHEN t.urgency = true OR COALESCE(t.priority_score, 0) >= 900 THEN 'urgent'
        WHEN COALESCE(t.priority_score, 0) >= 600 THEN 'high'
        WHEN COALESCE(t.priority_score, 0) >= 300 THEN 'medium'
        ELSE 'low'
      END,
      t.deadline,
      COALESCE(t.internal_deadline, t.deadline),
      COALESCE(t.estimated_minutes, t.estimated_time, 60),
      COALESCE(t.actual_time, 0),
      CASE WHEN t.is_blocked = true THEN COALESCE(t.updated_at, NOW()) ELSE NULL END,
      CASE WHEN t.is_blocked = true THEN 'Bloqueio operacional registrado' ELSE NULL END,
      t.stage,
      COALESCE(t.created_at, NOW()),
      COALESCE(t.updated_at, NOW()),
      t.completed_at
    FROM public.tasks t
    ON CONFLICT (id) DO UPDATE SET
      project_id = EXCLUDED.project_id,
      owner_id = EXCLUDED.owner_id,
      type = EXCLUDED.type,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      status_id = EXCLUDED.status_id,
      priority = EXCLUDED.priority,
      due_at = EXCLUDED.due_at,
      internal_due_at = EXCLUDED.internal_due_at,
      estimate_minutes = EXCLUDED.estimate_minutes,
      actual_minutes = EXCLUDED.actual_minutes,
      blocked_at = EXCLUDED.blocked_at,
      blocked_reason = EXCLUDED.blocked_reason,
      stage_id = EXCLUDED.stage_id,
      updated_at = EXCLUDED.updated_at,
      completed_at = EXCLUDED.completed_at;
  `;

  console.log('Sincronização concluída com sucesso!');

  const count = await sql`SELECT count(*) FROM public.tessera_work_items;`;
  console.log('Total de itens agora em tessera_work_items:', count[0].count);

  const byStatus = await sql`
    SELECT status_id, count(*) 
    FROM public.tessera_work_items 
    GROUP BY status_id 
    ORDER BY count(*) DESC;
  `;
  console.log('Distribuição por status no Tessera:\n', byStatus);
}

syncAll().catch(console.error);
