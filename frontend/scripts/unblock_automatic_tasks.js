require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

async function main() {
  console.log('=== ATUALIZANDO TRIGGERS E DESBLOQUEANDO ATIVIDADES AUTOMÁTICAS ===\n');

  // 1. Recriar Trigger fn_sync_task_to_tessera
  console.log('1. Atualizando função fn_sync_task_to_tessera...');
  await sql`
    CREATE OR REPLACE FUNCTION public.fn_sync_task_to_tessera()
    RETURNS TRIGGER AS $$
    BEGIN
      IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
      END IF;

      IF (TG_OP = 'DELETE') THEN
        DELETE FROM public.tessera_work_items WHERE id = OLD.id;
        RETURN OLD;
      END IF;

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
      ) VALUES (
        NEW.id,
        '9e4d0261-e26d-4d92-8097-bb1850c1d958'::uuid,
        CASE WHEN EXISTS (SELECT 1 FROM public.projects p WHERE p.id = NEW.project_id) THEN NEW.project_id ELSE NULL END,
        CASE WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.assigned_to) THEN NEW.assigned_to ELSE NULL END,
        COALESCE(NULLIF(TRIM(NEW.task_type), ''), 'task'),
        COALESCE(NULLIF(TRIM(NEW.title), ''), 'Demanda sem título'),
        NEW.description,
        CASE 
          WHEN NEW.status = 'completed' THEN 'done'
          WHEN NEW.status = 'archived' THEN 'canceled'
          WHEN NEW.status = 'review' THEN 'internal_review'
          WHEN NEW.status = 'pending_client_approval' THEN 'client_approval'
          WHEN NEW.status IN ('pending', 'pendente') THEN 
            CASE WHEN NEW.started_at IS NOT NULL THEN 'in_progress' ELSE 'ready' END
          WHEN NEW.status = 'draft' THEN 'inbox'
          ELSE 'ready'
        END,
        CASE 
          WHEN NEW.urgency = true OR COALESCE(NEW.priority_score, 0) >= 900 THEN 'urgent'
          WHEN COALESCE(NEW.priority_score, 0) >= 600 THEN 'high'
          WHEN COALESCE(NEW.priority_score, 0) >= 300 THEN 'medium'
          ELSE 'low'
        END,
        NEW.deadline,
        COALESCE(NEW.internal_deadline, NEW.deadline),
        COALESCE(NEW.estimated_minutes, NEW.estimated_time, 60),
        COALESCE(NEW.actual_time, 0),
        CASE WHEN NEW.is_blocked = true THEN COALESCE(NEW.updated_at, NOW()) ELSE NULL END,
        CASE WHEN NEW.is_blocked = true THEN 'Bloqueio operacional' ELSE NULL END,
        NEW.stage,
        COALESCE(NEW.created_at, NOW()),
        COALESCE(NEW.updated_at, NOW()),
        NEW.completed_at
      )
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
        blocked_at = CASE 
          WHEN NEW.is_blocked = true THEN COALESCE(public.tessera_work_items.blocked_at, EXCLUDED.blocked_at, NOW()) 
          ELSE NULL 
        END,
        blocked_reason = CASE 
          WHEN NEW.is_blocked = true THEN COALESCE(public.tessera_work_items.blocked_reason, EXCLUDED.blocked_reason, 'Bloqueio operacional') 
          ELSE NULL 
        END,
        stage_id = EXCLUDED.stage_id,
        updated_at = EXCLUDED.updated_at,
        completed_at = EXCLUDED.completed_at;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;
  console.log('Função fn_sync_task_to_tessera atualizada com sucesso.');

  // 2. Atualizar tabela tasks (remover is_blocked das automáticas e resetar prioridade -9999)
  console.log('\n2. Removendo flag is_blocked = true da tabela tasks...');
  const tasksUpdate = await sql`
    UPDATE public.tasks
    SET is_blocked = false,
        priority_score = CASE WHEN priority_score = -9999 THEN 0 ELSE priority_score END
    WHERE is_blocked = true
    RETURNING id;
  `;
  console.log(`Tarefas atualizadas em public.tasks: ${tasksUpdate.length}`);

  // 3. Atualizar tabela tessera_work_items (limpar bloqueios automáticos)
  console.log('\n3. Limpando blocked_at e blocked_reason em public.tessera_work_items...');
  const tesseraUpdate = await sql`
    UPDATE public.tessera_work_items
    SET blocked_at = NULL,
        blocked_reason = NULL,
        blocker_owner_id = NULL
    WHERE blocked_reason = 'Bloqueio operacional registrado' OR blocked_reason = 'Bloqueio operacional' OR blocked_at IS NOT NULL
    RETURNING id;
  `;
  console.log(`Itens desbloqueados em public.tessera_work_items: ${tesseraUpdate.length}`);

  // 4. Verificação final
  const finalTasksBlocked = await sql`
    SELECT COUNT(*) as count FROM public.tasks WHERE is_blocked = true;
  `;
  const finalTesseraBlocked = await sql`
    SELECT COUNT(*) as count FROM public.tessera_work_items WHERE blocked_at IS NOT NULL;
  `;
  console.log('\n=== STATUS FINAL ===');
  console.log(`Tarefas bloqueadas em tasks: ${finalTasksBlocked[0].count}`);
  console.log(`Itens bloqueados em tessera_work_items: ${finalTesseraBlocked[0].count}`);
}

main().catch(console.error);
