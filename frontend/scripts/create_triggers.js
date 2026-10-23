const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function createTriggers() {
  console.log('--- INSTALANDO TRIGGERS BI-DIRECIONAIS TASKS <-> TESSERA ---');

  // 1. Função: tasks -> tessera_work_items
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
        CASE WHEN NEW.is_blocked = true THEN 'Bloqueio operacional registrado' ELSE NULL END,
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
  console.log('Função fn_sync_task_to_tessera criada.');

  await sql`DROP TRIGGER IF EXISTS trg_tasks_sync_to_tessera ON public.tasks;`;
  await sql`
    CREATE TRIGGER trg_tasks_sync_to_tessera
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_task_to_tessera();
  `;
  console.log('Trigger trg_tasks_sync_to_tessera criado.');

  // 2. Função: tessera_work_items -> tasks
  await sql`
    CREATE OR REPLACE FUNCTION public.fn_sync_tessera_to_task()
    RETURNS TRIGGER AS $$
    DECLARE
      target_status varchar;
    BEGIN
      IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
      END IF;

      target_status := CASE 
        WHEN NEW.status_id = 'done' THEN 'completed'
        WHEN NEW.status_id = 'canceled' THEN 'archived'
        WHEN NEW.status_id = 'internal_review' THEN 'review'
        WHEN NEW.status_id = 'client_approval' THEN 'pending_client_approval'
        WHEN NEW.status_id = 'in_progress' THEN 'pending'
        WHEN NEW.status_id = 'ready' THEN 'pending'
        WHEN NEW.status_id = 'inbox' THEN 'draft'
        ELSE 'pending'
      END;

      IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.tasks (
          id,
          project_id,
          assigned_to,
          title,
          description,
          status,
          deadline,
          estimated_minutes,
          estimated_time,
          actual_time,
          is_blocked,
          stage,
          task_type,
          created_at,
          updated_at,
          completed_at
        ) VALUES (
          NEW.id,
          NEW.project_id,
          NEW.owner_id,
          NEW.title,
          NEW.description,
          target_status,
          NEW.due_at,
          NEW.estimate_minutes,
          NEW.estimate_minutes,
          NEW.actual_minutes,
          (NEW.blocked_at IS NOT NULL),
          COALESCE(NEW.stage_id, 'Demanda Pontual'),
          NEW.type,
          COALESCE(NEW.created_at, NOW()),
          COALESCE(NEW.updated_at, NOW()),
          NEW.completed_at
        )
        ON CONFLICT (id) DO UPDATE SET
          project_id = EXCLUDED.project_id,
          assigned_to = EXCLUDED.assigned_to,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          deadline = EXCLUDED.deadline,
          estimated_minutes = EXCLUDED.estimated_minutes,
          estimated_time = EXCLUDED.estimated_time,
          actual_time = EXCLUDED.actual_time,
          is_blocked = EXCLUDED.is_blocked,
          stage = EXCLUDED.stage,
          updated_at = EXCLUDED.updated_at,
          completed_at = EXCLUDED.completed_at;
      ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.tasks SET
          project_id = NEW.project_id,
          assigned_to = NEW.owner_id,
          title = NEW.title,
          description = NEW.description,
          status = target_status,
          deadline = NEW.due_at,
          estimated_minutes = NEW.estimate_minutes,
          estimated_time = NEW.estimate_minutes,
          actual_time = NEW.actual_minutes,
          is_blocked = (NEW.blocked_at IS NOT NULL),
          stage = COALESCE(NEW.stage_id, stage),
          updated_at = COALESCE(NEW.updated_at, NOW()),
          completed_at = NEW.completed_at
        WHERE id = NEW.id;
      ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM public.tasks WHERE id = OLD.id;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;
  console.log('Função fn_sync_tessera_to_task criada.');

  await sql`DROP TRIGGER IF EXISTS trg_tessera_sync_to_tasks ON public.tessera_work_items;`;
  await sql`
    CREATE TRIGGER trg_tessera_sync_to_tasks
    AFTER INSERT OR UPDATE OR DELETE ON public.tessera_work_items
    FOR EACH ROW EXECUTE FUNCTION public.fn_sync_tessera_to_task();
  `;
  console.log('Trigger trg_tessera_sync_to_tasks criado com sucesso!');
}

createTriggers().catch(console.error);
