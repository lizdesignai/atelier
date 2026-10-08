import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { NotificationEngine } from '@/lib/NotificationEngine';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const { requestedStatus, collaboratorName } = body;

    if (!taskId || !requestedStatus) {
      return NextResponse.json({ error: 'Missing taskId or requestedStatus' }, { status: 400 });
    }

    const sql = getDb();
    
    // Begin transaction-like execution
    let result;

    if (requestedStatus === 'in_progress') {
      // Starting the task
      const updateQuery = `
        UPDATE tasks 
        SET status = $1, updated_at = NOW(), started_at = COALESCE(started_at, NOW())
        WHERE id = $2 RETURNING *
      `;
      result = await (sql as any).query(updateQuery, [requestedStatus, taskId]);

      if (body.userId) {
        // Insert new open work_session
        await (sql as any).query(`
          INSERT INTO work_sessions (task_id, user_id, start_time)
          VALUES ($1, $2, NOW())
        `, [taskId, body.userId]);
      }

    } else if (['pending', 'review', 'completed', 'pending_client_approval'].includes(requestedStatus)) {
      // Stopping the task
      let updateQuery = `
        UPDATE tasks 
        SET status = $1, updated_at = NOW()
      `;
      if (requestedStatus === 'completed' || requestedStatus === 'pending_client_approval') {
        updateQuery += `, completed_at = NOW()`;
      }
      updateQuery += ` WHERE id = $2 RETURNING *`;
      result = await (sql as any).query(updateQuery, [requestedStatus, taskId]);

      if (body.userId) {
        // Find open session and close it
        const openSessionRes = await (sql as any).query(`
          SELECT id, start_time FROM work_sessions 
          WHERE task_id = $1 AND user_id = $2 AND end_time IS NULL
          ORDER BY start_time DESC LIMIT 1
        `, [taskId, body.userId]);

        if (openSessionRes && openSessionRes.length > 0) {
          const openSession = openSessionRes[0];
          await (sql as any).query(`
            UPDATE work_sessions 
            SET end_time = NOW(),
                duration_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - start_time)) / 60))
            WHERE id = $1
          `, [openSession.id]);
        }
      }
    } else {
      // Other status updates (fallback)
      const updateQuery = `
        UPDATE tasks 
        SET status = $1, updated_at = NOW()
        WHERE id = $2 RETURNING *
      `;
      result = await (sql as any).query(updateQuery, [requestedStatus, taskId]);
    }

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = result[0];

    // ==========================================
    // IDV AUTOMATION: PROGRESS & PHASE SYNC
    // ==========================================
    if (['completed', 'done', 'approved'].includes(requestedStatus) && task.project_id) {
       
       // 1. Desbloquear tarefas dependentes (caso ainda existam fluxos de dependência)
       await (sql as any).query(`
         UPDATE tasks 
         SET status = 'pending', updated_at = NOW() 
         WHERE depends_on = $1 AND status = 'draft'
       `, [task.id]);

       // 2. Descobrir qual é a próxima tarefa pendente para definir a fase do projeto
       const nextTaskRes = await (sql as any).query(`
         SELECT stage FROM tasks 
         WHERE project_id = $1 
           AND status NOT IN ('completed', 'done', 'approved', 'archived')
           AND stage IS NOT NULL
           AND stage IN ('onboarding', 'discover', 'define', 'develop', 'qa', 'present', 'client_review', 'refine', 'deliver', 'activate')
         ORDER BY deadline ASC, created_at ASC
         LIMIT 1
       `, [task.project_id]);

       if (nextTaskRes && nextTaskRes.length > 0) {
         const nextPhaseIdv = nextTaskRes[0].stage; // ex: 'develop', 'present'
         
         // Verificar a fase atual do projeto para não regredir e para disparar notificação só se mudar
         const projectRes = await (sql as any).query(`SELECT idv_phase, client_id FROM projects WHERE id = $1`, [task.project_id]);
         const currentPhaseIdv = projectRes?.[0]?.idv_phase;
         const clientId = projectRes?.[0]?.client_id;

         if (currentPhaseIdv !== nextPhaseIdv) {
           const phaseMap: Record<string, string> = {
             'onboarding': 'onboarding',
             'discover': 'pesquisa',
             'define': 'direcionamento',
             'develop': 'processo',
             'qa': 'qa',
             'present': 'apresentacao',
             'client_review': 'client_review',
             'refine': 'refinamento',
             'deliver': 'entrega',
             'activate': 'ativacao'
           };
           
           const nextFaseAdmin = phaseMap[nextPhaseIdv] || nextPhaseIdv;

           await (sql as any).query(`
             UPDATE projects 
             SET idv_phase = $1, fase = $2, updated_at = NOW() 
             WHERE id = $3
           `, [nextPhaseIdv, nextFaseAdmin, task.project_id]);

           // Notificar cliente sobre o avanço de fase
           if (clientId) {
              try {
                await NotificationEngine.notifyUser(
                   clientId,
                   "✨ Nova Fase do Projeto!",
                   `A etapa anterior foi concluída e seu projeto avançou para a fase de ${nextFaseAdmin.toUpperCase()}. Acesse seu Bastidor para acompanhar.`,
                   "success",
                   "/"
                );
              } catch (notifyErr) {
                console.warn('Failed to notify client about phase change:', notifyErr);
              }
           }
         }
       } else {
         // Não há mais tarefas pendentes! Projeto pode estar na fase final.
         await (sql as any).query(`
           UPDATE projects 
           SET idv_phase = 'deliver', fase = 'entrega', updated_at = NOW() 
           WHERE id = $1 AND idv_phase != 'deliver'
         `, [task.project_id]);
       }
    }

    // Invalidate Analytics Cache on any status update
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://atelier-zwlt.onrender.com';
      await fetch(`${backendUrl}/api/v1/analytics/clear-cache`, { method: 'POST' });
    } catch (cacheErr) {
      console.warn('Failed to clear analytics cache:', cacheErr);
    }

    return NextResponse.json({ data: task });

  } catch (error: any) {
    console.error('Error updating task status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
