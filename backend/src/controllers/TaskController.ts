import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { NotificationService } from '../services/NotificationService';
import { redis } from '../config/redis';

export class TaskController {
  
  // GET /api/v1/tasks
  static async getTasks(req: Request, res: Response) {
    try {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const { data, error } = await supabase
        .from('tasks')
        .select('id, project_id, assigned_to, title, status, deadline, created_at, completed_at, actual_time, estimated_time, stage, task_type, attachment_url')
        .gte('created_at', fifteenDaysAgo.toISOString())
        .order('deadline', { ascending: true })
        .limit(300); // Evita unbounded result sets

      if (error) throw error;
      
      return res.status(200).json({ data });
    } catch (error: any) {
      console.error('Error fetching tasks:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // POST /api/v1/tasks
  static async createTask(req: Request, res: Response) {
    try {
      const taskData = req.body;
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select('*, projects(profiles(nome), type, service_type), agency_subclients(name)')
        .single();
      
      if (error) throw error;
      
      if (data.assigned_to) {
        (async () => {
          try {
            const { data: collab } = await supabase.from('profiles').select('email, nome').eq('id', data.assigned_to).single();
            if (collab?.email) {
              const projName = data.agency_subclients?.name || data.projects?.profiles?.nome || data.projects?.type || 'Projeto';
              await NotificationService.sendNotification({
                to: collab.email,
                type: 'task_assigned',
                taskName: data.title,
                projectName: projName,
                extraInfo: data.description,
                link: `${process.env.FRONTEND_URL || 'https://atelier.lizdesign.com.br'}/admin/jtbd`
              });
            }
          } catch (e) {
            console.error("Erro ao enviar e-mail de tarefa atribuída:", e);
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

      // Lógica de Roteamento para aprovação do cliente pode ser estendida aqui

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

      // Update Database
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          projects(type, service_type, client_id, profiles(nome)),
          agency_subclients(name)
        `)
        .single();
        
      if (error) throw error;

      // Retorna resposta de sucesso imediatamente ao cliente
      res.status(200).json({ data });

      // Disparar Notificação para o Gestor em background (não trava o event loop principal)
      if (['in_progress', 'paused', 'review'].includes(finalStatus)) {
        (async () => {
          try {
            const { data: managers } = await supabase
              .from('profiles')
              .select('email')
              .in('role', ['admin', 'gestor']);

            const managerEmails = managers?.map((m: any) => m.email) || [];
            
            let notifyType = '';
            if (finalStatus === 'in_progress') notifyType = 'task_in_progress';
            if (finalStatus === 'paused') notifyType = 'task_paused';
            if (finalStatus === 'review') notifyType = 'internal_review';

            if (managerEmails.length > 0 && notifyType) {
               await NotificationService.sendNotification({
                 to: managerEmails as string[],
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
                    data.projects?.profiles?.nome ||
                    data.projects?.service_type ||
                    data.projects?.type ||
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
      return;
    } catch (error: any) {
      console.error('Error updating task status:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // GET /api/v1/tasks/:id/email-action?action=approve
  static async handleEmailAction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { action } = req.query;

      if (action !== 'approve') {
        return res.status(400).send("Ação inválida.");
      }

      // Fetch task to check client_id routing
      const { data: task, error: fetchError } = await supabase
        .from('tasks')
        .select(`*, projects(client_id)`)
        .eq('id', id)
        .single();

      if (fetchError || !task) {
        return res.status(404).send("Tarefa não encontrada.");
      }

      let finalStatus = 'completed';
      if (!task.projects?.client_id) {
        finalStatus = 'pending_client_approval';
      }

      const { error: updateError } = await supabase
        .from('tasks')
        .update({ status: finalStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

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
      const { id } = req.params;
      const updates = req.body;
      
      // Get the existing task to check if assigned_to changes
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('assigned_to')
        .eq('id', id)
        .single();
        
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select('*, projects(profiles(nome), type, service_type), agency_subclients(name)')
        .single();
        
      if (error) throw error;
      
      // If assignment changed and is now assigned to someone, notify them
      if (updates.assigned_to && existingTask && existingTask.assigned_to !== updates.assigned_to) {
        (async () => {
          try {
            const { data: collab } = await supabase.from('profiles').select('email, nome').eq('id', updates.assigned_to).single();
            if (collab?.email) {
              const projName = data.agency_subclients?.name || data.projects?.profiles?.nome || data.projects?.type || 'Projeto';
              await NotificationService.sendNotification({
                to: collab.email,
                type: 'task_assigned',
                taskName: data.title,
                projectName: projName,
                extraInfo: data.description,
                link: `${process.env.FRONTEND_URL || 'https://atelier.lizdesign.com.br'}/admin/jtbd`
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
      console.error('Error updating task:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // DELETE /api/v1/tasks/:id
  static async deleteTask(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      
      if (error) throw error;
      
      await redis.del('analytics:dashboard').catch(() => {});
      return res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting task:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
