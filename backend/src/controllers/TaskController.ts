import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

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
