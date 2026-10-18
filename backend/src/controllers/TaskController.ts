import { Request, Response } from 'express';
import { neon } from '@neondatabase/serverless';
import { NotificationService } from '../services/NotificationService';
import { redis } from '../config/redis';

export class TaskController {
  
  // GET /api/v1/tasks
  static async getTasks(req: Request, res: Response) {
    try {
      const sql = neon(process.env.POSTGRES_URL!);
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const data = await sql`
        SELECT id, project_id, assigned_to, title, description, caption, external_links, media_assets, status, deadline, created_at, completed_at, actual_time, estimated_time, stage, task_type, attachment_url
        FROM tasks
        WHERE created_at >= ${fifteenDaysAgo.toISOString()}
        ORDER BY deadline ASC
        LIMIT 300
      `;
      
      return res.status(200).json({ data });
    } catch (error: any) {
      console.error('Error fetching tasks:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // POST /api/v1/tasks
  static async createTask(req: Request, res: Response) {
    try {
      const sql = neon(process.env.POSTGRES_URL!);
      const taskData = { ...req.body };

      // Auto-assign collaborator if assigned_to is not manually specified
      if (!taskData.assigned_to && (taskData.project_id || taskData.subclient_id)) {
        try {
          let assignment: any = null;
          if (taskData.project_id) {
            const resAssignments = await sql`SELECT collaborator_id FROM collaborator_assignments WHERE project_id = ${taskData.project_id} LIMIT 1`;
            assignment = resAssignments[0];
          } else if (taskData.subclient_id) {
            const resAssignments = await sql`SELECT collaborator_id FROM collaborator_assignments WHERE subclient_id = ${taskData.subclient_id} LIMIT 1`;
            assignment = resAssignments[0];
          }
          if (assignment?.collaborator_id) {
            taskData.assigned_to = assignment.collaborator_id;
          }
        } catch (assignErr) {
          console.warn("Auto-assignment lookup skipped:", assignErr);
        }
      }

      const keys = Object.keys(taskData);
      const cols = keys.map(k => `"${k}"`).join(', ');
      const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
      const values = keys.map(k => {
        const v = taskData[k];
        return (Array.isArray(v) || (typeof v === 'object' && v !== null)) ? JSON.stringify(v) : v;
      });

      const insertQuery = `INSERT INTO tasks (${cols}) VALUES (${placeholders}) RETURNING *`;
      const inserted = await (sql as any).query(insertQuery, values);
      const data = inserted[0];
      
      if (data?.assigned_to) {
        (async () => {
          try {
            const collabRes = await sql`SELECT email, nome FROM profiles WHERE id = ${data.assigned_to} LIMIT 1`;
            const collab = collabRes[0];

            let projName = 'Projeto';
            if (data.subclient_id) {
              const subRes = await sql`SELECT name FROM agency_subclients WHERE id = ${data.subclient_id} LIMIT 1`;
              if (subRes[0]?.name) projName = subRes[0].name;
            } else if (data.project_id) {
              const projRes = await sql`
                SELECT p.type, pr.nome 
                FROM projects p 
                LEFT JOIN profiles pr ON pr.id = p.client_id 
                WHERE p.id = ${data.project_id} 
                LIMIT 1
              `;
              if (projRes[0]?.nome || projRes[0]?.type) {
                projName = projRes[0].nome || projRes[0].type;
              }
            }
            
            if (collab?.email) {
              await NotificationService.sendNotification({
                to: collab.email,
                type: 'task_assigned',
                taskName: data.title,
                projectName: projName,
                extraInfo: data.description,
                link: `${process.env.FRONTEND_URL || 'https://atelier.lizdesign.com.br'}/admin/task/${data.id}`
              });
            }

            // Notifica também os gestores
            const managers = await sql`SELECT email FROM profiles WHERE role IN ('admin', 'gestor')`;
            if (managers && managers.length > 0) {
              const managerEmails = managers.map((m: any) => m.email);
              await NotificationService.sendNotification({
                to: managerEmails,
                type: 'demand_sent',
                taskName: data.title,
                projectName: projName,
                collaboratorName: collab?.nome || 'Colaborador',
                link: `${process.env.FRONTEND_URL || 'https://atelier.lizdesign.com.br'}/admin/jtbd`
              });
            }

          } catch (e) {
            console.error("Erro ao enviar e-mail de tarefa atribuída/enviada:", e);
          }
        })();
      }

      await redis.del('analytics:dashboard').catch(() => {});
      return res.status(201).json({ data });
    } catch (error: any) {
      console.error('Error creating task:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // PATCH /api/v1/tasks/:id/status
  static async updateTaskStatus(req: Request, res: Response) {
    try {
      const sql = neon(process.env.POSTGRES_URL!);
      const { id } = req.params;
      const { requestedStatus, task } = req.body;

      if (!task || !requestedStatus) {
        return res.status(400).json({ error: 'Missing task object or requestedStatus' });
      }

      if (task.status === requestedStatus) {
        return res.status(200).json({ data: task });
      }

      const now = new Date();
      let finalStatus = requestedStatus;
      let updates: any = {};

      // Lógica de Motor de Tempo (started_at e actual_time)
      if (finalStatus === 'in_progress') {
        updates.started_at = now.toISOString();
      }

      if (task.status === 'in_progress' && task.started_at && finalStatus !== 'in_progress') {
        const startTime = new Date(task.started_at).getTime();
        const diffMinutes = Math.floor((now.getTime() - startTime) / 60000);
        updates.actual_time = (task.actual_time || 0) + diffMinutes;
        updates.started_at = null;
      }

      if (finalStatus === 'review' || finalStatus === 'completed' || finalStatus === 'pending_client_approval') {
        updates.completed_at = finalStatus === 'completed' ? now.toISOString() : null;
      }

      updates.status = finalStatus;

      // Update Database no Neon
      const setClauses: string[] = [];
      const values: any[] = [];
      let i = 1;
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          setClauses.push(`"${key}" = $${i}`);
          values.push(value);
          i++;
        }
      }
      values.push(id);

      const updateQuery = `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`;
      const resData = await (sql as any).query(updateQuery, values);
      const data = resData[0] || { ...task, ...updates };

      // Retorna resposta de sucesso imediatamente ao cliente
      res.status(200).json({ data });

      // Disparar Notificação para o Gestor em background (não trava o event loop principal)
      if (['in_progress', 'paused', 'review', 'completed'].includes(finalStatus)) {
        (async () => {
          try {
            const profiles = await sql`SELECT email, role, id FROM profiles`;

            let recipients = profiles
              ?.filter((p: any) => ['admin', 'gestor'].includes(p.role) || p.id === data.assigned_to)
              .map((p: any) => p.email) || [];
              
            // Remove duplicatas (caso um admin seja também o designado)
            recipients = [...new Set(recipients)];
            
            let notifyType = '';
            if (finalStatus === 'in_progress') notifyType = 'task_in_progress';
            if (finalStatus === 'paused') notifyType = 'task_paused';
            if (finalStatus === 'review') notifyType = 'internal_review';
            if (finalStatus === 'completed') notifyType = 'task_completed';

            if (recipients.length > 0 && notifyType) {
               await NotificationService.sendNotification({
                 to: recipients as string[],
                 type: notifyType as string,
                 taskId: String(id),
                 collaboratorName: String(req.body.collaboratorName || 'O Colaborador'),
                 taskName: String(req.body.task?.title || data.title || 'Tarefa'),
                 projectName: String(
                    req.body.task?.agency_subclients?.name ||
                    data.agency_subclients?.name ||
                    req.body.task?.projects?.profiles?.nome ||
                    req.body.task?.projects?.service_type ||
                    req.body.task?.projects?.type ||
                    'Projeto Não Especificado'
                  ),
                 mediaUrl: data.attachment_url || req.body.task?.attachment_url ? String(data.attachment_url || req.body.task?.attachment_url) : undefined,
                 link: `${process.env.FRONTEND_URL || 'https://atelier.lizdesign.com.br'}/admin`
               });
            }
          } catch (err) {
            console.error("Falha ao enviar notificação em background:", err);
          }
        })();
      }
      await redis.del('analytics:dashboard').catch(() => {});
      return;
    } catch (error: any) {
      console.error('Error updating task status:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // GET /api/v1/tasks/:id/email-action?action=approve
  static async handleEmailAction(req: Request, res: Response) {
    try {
      const sql = neon(process.env.POSTGRES_URL!);
      const { id } = req.params;
      const { action } = req.query;

      if (action !== 'approve') {
        return res.status(400).send("Ação inválida.");
      }

      // Fetch task to check client_id routing
      const tasks = await sql`
        SELECT t.*, p.client_id 
        FROM tasks t 
        LEFT JOIN projects p ON p.id = t.project_id 
        WHERE t.id = ${id} 
        LIMIT 1
      `;

      if (!tasks || tasks.length === 0) {
        return res.status(404).send("Tarefa não encontrada.");
      }

      const task = tasks[0];
      let finalStatus = 'completed';
      if (!task.client_id) {
        finalStatus = 'pending_client_approval';
      }

      await sql`UPDATE tasks SET status = ${finalStatus}, updated_at = NOW() WHERE id = ${id}`;

      const successHtml = `
        <!DOCTYPE html>
        <html lang="pt-PT">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tarefa Aprovada</title>
        </head>
        <body style="margin: 0; padding: 40px 20px; background-color: #f4f4f5; font-family: sans-serif; text-align: center;">
          <div style="max-width: 400px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; padding: 40px 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
            <div style="font-size: 50px; margin-bottom: 20px;">✅</div>
            <h1 style="margin: 0 0 10px; color: #18181b; font-size: 24px;">Tarefa Aprovada!</h1>
            <p style="color: #52525b; line-height: 1.5; margin: 0 0 30px;">A tarefa foi atualizada com sucesso e enviada para o próximo estágio.</p>
            <a href="${process.env.FRONTEND_URL || 'https://atelier.lizdesign.com.br'}/admin" style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Voltar ao Cockpit</a>
          </div>
        </body>
        </html>
      `;

      return res.status(200).send(successHtml);
    } catch (error: any) {
      console.error('Error handling email action:', error.message);
      return res.status(500).send("Ocorreu um erro ao processar a ação.");
    }
  }

  // PATCH /api/v1/tasks/:id
  static async updateTask(req: Request, res: Response) {
    try {
      const sql = neon(process.env.POSTGRES_URL!);
      const { id } = req.params;
      const updates = { ...req.body };
      
      // Get the existing task to check if assigned_to changes
      const existingRes = await sql`
        SELECT id, assigned_to, title, description, project_id, subclient_id 
        FROM tasks 
        WHERE id = ${id} 
        LIMIT 1
      `;
      const existingTask = existingRes[0];
      
      if (updates.deadline === '') updates.deadline = null;
      if (updates.urgency === '') updates.urgency = null;
      if (updates.assigned_to === 'none' || updates.assigned_to === '') updates.assigned_to = null;
      
      const setClauses: string[] = [];
      const values: any[] = [];
      let i = 1;
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          setClauses.push(`"${key}" = $${i}`);
          values.push(Array.isArray(value) || (typeof value === 'object' && value !== null) ? JSON.stringify(value) : value);
          i++;
        }
      }
      values.push(id);
      
      let data: any = { id, ...updates };
      if (setClauses.length > 0) {
        const query = `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`;
        const resData = await (sql as any).query(query, values);
        data = resData[0] || data;
      }
      
      // If assignment changed and is now assigned to someone, notify them
      if (updates.assigned_to && existingTask && existingTask.assigned_to !== updates.assigned_to) {
        (async () => {
          try {
            const collabRes = await sql`SELECT email, nome FROM profiles WHERE id = ${updates.assigned_to} LIMIT 1`;
            const collab = collabRes[0];
            if (collab?.email) {
              let projName = 'Projeto';
              if (data.subclient_id) {
                const subRes = await sql`SELECT name FROM agency_subclients WHERE id = ${data.subclient_id} LIMIT 1`;
                if (subRes[0]?.name) projName = subRes[0].name;
              } else if (data.project_id) {
                const projRes = await sql`
                  SELECT p.type, pr.nome 
                  FROM projects p 
                  LEFT JOIN profiles pr ON pr.id = p.client_id 
                  WHERE p.id = ${data.project_id} 
                  LIMIT 1
                `;
                if (projRes[0]?.nome || projRes[0]?.type) {
                  projName = projRes[0].nome || projRes[0].type;
                }
              }

              await NotificationService.sendNotification({
                to: collab.email,
                type: 'task_assigned',
                taskName: data.title,
                projectName: projName,
                extraInfo: data.description,
                link: `${process.env.FRONTEND_URL || 'https://atelier.lizdesign.com.br'}/admin/task/${data.id}`
              });
            }
          } catch (e) {
            console.error("Erro ao enviar e-mail de tarefa reatribuída:", e);
          }
        })();
      }
      
      await redis.del('analytics:dashboard').catch(() => {});
      return res.status(200).json({ data });
    } catch (error: any) {
      console.error('Error updating task in Neon:', error);
      return res.status(500).json({ error: error.message || 'Internal Server Error', details: error });
    }
  }

  // DELETE /api/v1/tasks/:id
  static async deleteTask(req: Request, res: Response) {
    try {
      const sql = neon(process.env.POSTGRES_URL!);
      const { id } = req.params;
      await sql`DELETE FROM tasks WHERE id = ${id}`;
      
      await redis.del('analytics:dashboard').catch(() => {});
      return res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting task from Neon:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
