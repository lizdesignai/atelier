import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { NotificationService } from '../services/NotificationService';

export class TaskController {
  
  // GET /api/v1/tasks
  static async getTasks(req: Request, res: Response) {
    try {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .gte('created_at', fifteenDaysAgo.toISOString())
        .order('deadline', { ascending: true });

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
      const { data, error } = await supabase.from('tasks').insert(taskData).select().single();
      
      if (error) throw error;
      
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
          projects:project_id(title, user_id),
          assigned_to_profile:assigned_to(nome, email)
        `)
        .single();
        
      if (error) throw error;

      // Disparar Notificação para o Gestor de forma assíncrona (não trava a resposta)
      if (['in_progress', 'paused', 'review'].includes(finalStatus)) {
        // Encontra os Admins/Gestores para notificar
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
           NotificationService.sendNotification({
             to: managerEmails,
             type: notifyType,
             taskName: data.title,
             projectName: data.projects?.title || 'Projeto Não Especificado',
             link: `${process.env.FRONTEND_URL}/admin`
           }).catch(err => console.error("Falha ao enviar notificação em background:", err));
        }
      }
      
      return res.status(200).json({ data });
    } catch (error: any) {
      console.error('Error updating task status:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // PATCH /api/v1/tasks/:id
  static async updateTask(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
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
      
      return res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting task:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
