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
    
    // 0. Buscar dados atuais da tarefa para garantir integridade e resolver assigned_to
    const existingRows = await (sql as any).query(`SELECT * FROM tasks WHERE id = $1 LIMIT 1`, [taskId]);
    if (!existingRows || existingRows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const existingTask = existingRows[0];
    const targetUserId = body.userId || existingTask.assigned_to;
    const MAX_SESSION_MINUTES = 240; // Teto de segurança: 4h máx por sessão contínua

    let result;

    if (requestedStatus === 'heartbeat' || body.action === 'heartbeat') {
      // Periodic heartbeat enquanto a tarefa está ativamente em execução no navegador
      const openSessionRes = await (sql as any).query(`
        SELECT id, start_time, duration_minutes FROM work_sessions 
        WHERE task_id = $1 AND end_time IS NULL
        ORDER BY start_time DESC LIMIT 1
      `, [taskId]);

      if (openSessionRes && openSessionRes.length > 0) {
        const openSession = openSessionRes[0];
        const rawMins = Math.round((Date.now() - new Date(openSession.start_time).getTime()) / 60000);
        const elapsedMins = Math.min(Math.max(1, rawMins), MAX_SESSION_MINUTES);

        await (sql as any).query(`
          UPDATE work_sessions 
          SET duration_minutes = GREATEST(COALESCE(duration_minutes, 0) + 1, $1)
          WHERE id = $2
        `, [elapsedMins, openSession.id]);

        await (sql as any).query(`
          UPDATE tessera_work_sessions 
          SET minutes = GREATEST(COALESCE(minutes, 0) + 1, $1)
          WHERE work_item_id = $2 AND ended_at IS NULL
        `, [elapsedMins, taskId]);
      }

      // No heartbeat, NÃO resetamos started_at = NOW() para não distorcer o cálculo do cronômetro ao vivo
      result = await (sql as any).query(`
        UPDATE tasks 
        SET updated_at = NOW()
        WHERE id = $1 AND status = 'in_progress'
        RETURNING *
      `, [taskId]);

      if (!result || result.length === 0) {
        result = [existingTask];
      }

    } else if (requestedStatus === 'in_progress') {
      // 1. REGRA DO FOCO ÚNICO: Se este colaborador já tiver outra tarefa in_progress, pausamos automaticamente
      if (targetUserId) {
        const otherActiveTasks = await (sql as any).query(`
          SELECT id, started_at, actual_time FROM tasks 
          WHERE assigned_to = $1 AND status = 'in_progress' AND id != $2
        `, [targetUserId, taskId]);

        for (const otherTask of (otherActiveTasks || [])) {
          let otherElapsed = 0;
          if (otherTask.started_at) {
            const rawOther = Math.round((Date.now() - new Date(otherTask.started_at).getTime()) / 60000);
            otherElapsed = Math.min(Math.max(1, rawOther), MAX_SESSION_MINUTES);
          }

          await (sql as any).query(`
            UPDATE tasks 
            SET status = 'pending',
                actual_time = COALESCE(actual_time, 0) + $1,
                started_at = NULL,
                updated_at = NOW()
            WHERE id = $2
          `, [otherElapsed, otherTask.id]);

          await (sql as any).query(`
            UPDATE work_sessions 
            SET end_time = NOW(),
                duration_minutes = CASE 
                  WHEN duration_minutes IS NOT NULL AND duration_minutes > 0 THEN duration_minutes 
                  ELSE $1 
                END
            WHERE task_id = $2 AND end_time IS NULL
          `, [otherElapsed, otherTask.id]);

          await (sql as any).query(`
            UPDATE tessera_work_sessions 
            SET ended_at = NOW(),
                minutes = CASE 
                  WHEN minutes IS NOT NULL AND minutes > 0 THEN minutes 
                  ELSE $1 
                END
            WHERE work_item_id = $2 AND ended_at IS NULL
          `, [otherElapsed, otherTask.id]);
        }
      }

      // 2. Iniciar a tarefa solicitada
      const isAlreadyRunning = existingTask.status === 'in_progress' && existingTask.started_at !== null;
      
      const updateQuery = `
        UPDATE tasks 
        SET status = 'in_progress',
            updated_at = NOW(),
            started_at = CASE 
              WHEN status = 'in_progress' AND started_at IS NOT NULL THEN started_at 
              ELSE NOW() 
            END
        WHERE id = $1 RETURNING *
      `;
      result = await (sql as any).query(updateQuery, [taskId]);

      if (!isAlreadyRunning) {
        // Fechar qualquer sessão aberta residual nesta tarefa
        await (sql as any).query(`
          UPDATE work_sessions 
          SET end_time = NOW() 
          WHERE task_id = $1 AND end_time IS NULL
        `, [taskId]);

        await (sql as any).query(`
          UPDATE tessera_work_sessions 
          SET ended_at = NOW() 
          WHERE work_item_id = $1 AND ended_at IS NULL
        `, [taskId]);

        // Inserir nova sessão ativa em work_sessions
        if (targetUserId) {
          await (sql as any).query(`
            INSERT INTO work_sessions (task_id, user_id, start_time, duration_minutes, data_log)
            VALUES ($1, $2, NOW(), 0, CURRENT_DATE)
          `, [taskId, targetUserId]);

          await (sql as any).query(`
            INSERT INTO tessera_work_sessions (work_item_id, user_id, started_at, minutes, source)
            VALUES ($1, $2, NOW(), 0, 'focus_timer')
            ON CONFLICT DO NOTHING
          `, [taskId, targetUserId]);
        }
      }

    } else if (['pending', 'review', 'completed', 'pending_client_approval'].includes(requestedStatus)) {
      // Parar, pausar ou concluir tarefa: calcular e salvar com teto de segurança
      const openSessionRes = await (sql as any).query(`
        SELECT id, start_time, duration_minutes FROM work_sessions 
        WHERE task_id = $1 AND end_time IS NULL
        ORDER BY start_time DESC LIMIT 1
      `, [taskId]);

      const openSession = openSessionRes?.[0] || null;
      const refStartTime = openSession?.start_time || existingTask.started_at;

      let sessionMinutes = 0;
      if (refStartTime) {
        const rawMinutes = Math.round((Date.now() - new Date(refStartTime).getTime()) / 60000);
        // Pelo menos 1 minuto se tiver passado mais de 15 segundos; capped no teto de 4h
        sessionMinutes = Math.min(Math.max(rawMinutes >= 0.25 ? 1 : 0, rawMinutes), MAX_SESSION_MINUTES);
      }

      // Se havia sessão aberta, fechamos com a duração calculada
      if (openSession) {
        await (sql as any).query(`
          UPDATE work_sessions 
          SET end_time = NOW(),
              duration_minutes = $1
          WHERE id = $2
        `, [sessionMinutes, openSession.id]);

        await (sql as any).query(`
          UPDATE tessera_work_sessions 
          SET ended_at = NOW(),
              minutes = $1
          WHERE work_item_id = $2 AND ended_at IS NULL
        `, [sessionMinutes, taskId]);
      } else if (sessionMinutes > 0 && targetUserId) {
        // Se por algum motivo a sessão não foi aberta anteriormente, registramos para manter paridade contábil
        await (sql as any).query(`
          INSERT INTO work_sessions (task_id, user_id, start_time, end_time, duration_minutes, data_log)
          VALUES ($1, $2, COALESCE($3, NOW()), NOW(), $4, CURRENT_DATE)
        `, [taskId, targetUserId, refStartTime, sessionMinutes]);

        await (sql as any).query(`
          INSERT INTO tessera_work_sessions (work_item_id, user_id, started_at, ended_at, minutes, source)
          VALUES ($1, $2, COALESCE($3, NOW()), NOW(), $4, 'focus_timer')
          ON CONFLICT DO NOTHING
        `, [taskId, targetUserId, refStartTime, sessionMinutes]);
      }

      // Atualizar a tarefa consolidando actual_time
      let updateQuery = `
        UPDATE tasks 
        SET status = $1,
            actual_time = COALESCE(actual_time, 0) + $2,
            started_at = NULL,
            updated_at = NOW()
      `;
      if (requestedStatus === 'completed' || requestedStatus === 'pending_client_approval') {
        updateQuery += `, completed_at = NOW()`;
      }
      updateQuery += ` WHERE id = $3 RETURNING *`;
      result = await (sql as any).query(updateQuery, [requestedStatus, sessionMinutes, taskId]);

    } else {
      // Demais alterações de status (ex: archived, draft): fecha sessões abertas
      await (sql as any).query(`
        UPDATE work_sessions 
        SET end_time = NOW(), duration_minutes = COALESCE(duration_minutes, 0)
        WHERE task_id = $1 AND end_time IS NULL
      `, [taskId]);

      await (sql as any).query(`
        UPDATE tessera_work_sessions 
        SET ended_at = NOW(), minutes = COALESCE(minutes, 0)
        WHERE work_item_id = $1 AND ended_at IS NULL
      `, [taskId]);

      const updateQuery = `
        UPDATE tasks 
        SET status = $1, started_at = NULL, updated_at = NOW()
        WHERE id = $2 RETURNING *
      `;
      result = await (sql as any).query(updateQuery, [requestedStatus, taskId]);
    }

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = result[0];

    // ==========================================
    // STUDIO VERONNA: NOTIFICAÇÕES OPERACIONAIS (LIDERANÇA, COLABORADOR & CLIENTE)
    // ==========================================
    if (requestedStatus !== 'heartbeat' && body.action !== 'heartbeat') {
      try {
        const metaRows = await (sql as any).query(
          `SELECT
             p.client_id,
             cp.nome AS client_name,
             ap.nome AS assignee_name
           FROM tasks t
           LEFT JOIN projects p ON p.id = t.project_id
           LEFT JOIN profiles cp ON cp.id = p.client_id
           LEFT JOIN profiles ap ON ap.id = t.assigned_to
           WHERE t.id = $1
           LIMIT 1`,
          [task.id]
        );
        const meta = metaRows?.[0] || {};
        const projectName = meta.client_name || 'Operação Interna';
        const collabName =
          collaboratorName || meta.assignee_name || 'Colaborador';

        if (requestedStatus === 'in_progress') {
          await NotificationEngine.notifyManagement(
            `▶️ Em Execução: ${task.title}`,
            `${collabName} iniciou a execução da tarefa "${task.title}" (${projectName}).`,
            'info',
            `/admin/task/${task.id}`,
            {
              emailTemplateType: 'task_in_progress',
              extraData: {
                taskName: task.title,
                projectName,
                collaboratorName: collabName,
                link: `/admin/task/${task.id}`,
              },
            }
          );
        } else if (requestedStatus === 'pending') {
          await NotificationEngine.notifyManagement(
            `⏸️ Tarefa Pausada: ${task.title}`,
            `${collabName} pausou a execução da tarefa "${task.title}" (${projectName}).`,
            'warning',
            `/admin/task/${task.id}`,
            {
              emailTemplateType: 'task_paused',
              extraData: {
                taskName: task.title,
                projectName,
                collaboratorName: collabName,
                link: `/admin/task/${task.id}`,
              },
            }
          );
        } else if (requestedStatus === 'review') {
          await NotificationEngine.notifyManagement(
            `👁️ Revisão Interna Pendente: ${task.title}`,
            `${collabName} finalizou "${task.title}" (${projectName}) e enviou para curadoria da liderança.`,
            'action',
            `/admin/review/${task.id}`,
            {
              emailTemplateType: 'internal_review',
              extraData: {
                taskName: task.title,
                projectName,
                collaboratorName: collabName,
                link: `/admin/review/${task.id}`,
              },
            }
          );
        } else if (['completed', 'done', 'approved'].includes(requestedStatus)) {
          await NotificationEngine.notifyManagement(
            `🏆 Entrega Concluída: ${task.title}`,
            `A tarefa "${task.title}" (${projectName}) foi concluída e validada com sucesso.`,
            'success',
            `/admin/task/${task.id}`,
            {
              emailTemplateType: 'task_completed',
              extraData: {
                taskName: task.title,
                projectName,
                collaboratorName: collabName,
                link: `/admin/task/${task.id}`,
              },
            }
          );

          if (task.assigned_to) {
            await NotificationEngine.notifyUserWithEmail(
              task.assigned_to,
              `✅ Entrega Aprovada: ${task.title}`,
              `Parabéns! Sua entrega "${task.title}" no projeto ${projectName} foi aprovada e concluída.`,
              'review_approved',
              {
                taskName: task.title,
                projectName,
                collaboratorName: collabName,
                link: '/admin/jtbd',
              }
            );
          }
        } else if (requestedStatus === 'pending_client_approval') {
          if (task.assigned_to) {
            await NotificationEngine.notifyUserWithEmail(
              task.assigned_to,
              `✅ Aprovada no QA Interno: ${task.title}`,
              `Sua entrega "${task.title}" (${projectName}) foi aprovada pela liderança e enviada ao cliente.`,
              'review_approved',
              {
                taskName: task.title,
                projectName,
                collaboratorName: collabName,
                link: '/admin/jtbd',
              }
            );
          }

          if (meta.client_id) {
            await NotificationEngine.notifyUserWithEmail(
              meta.client_id,
              `🎨 Peça Pronta para Avaliação: ${task.title}`,
              `A entrega "${task.title}" passou pela curadoria interna do Studio Veronna e aguarda sua validação.`,
              'planning_approval',
              {
                taskName: task.title,
                projectName,
                clientName: meta.client_name,
                link: '/curadoria',
              }
            );
          }
        }
      } catch (notifyErr) {
        console.warn('[TaskStatusRoute] Falha ao enviar notificação operacional:', notifyErr);
      }
    }

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
             SET idv_phase = $1, fase = $2 
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
           SET idv_phase = 'deliver', fase = 'entrega' 
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
