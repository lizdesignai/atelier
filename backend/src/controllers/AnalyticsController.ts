import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export class AnalyticsController {
  
  // GET /api/v1/analytics/dashboard
  static async getDashboardData(req: Request, res: Response) {
    try {
      // Data fetching for global dashboard: Team, Routing Rules, Tasks
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const [teamRes, rulesRes, tasksRes] = await Promise.all([
        supabase.from('profiles').select('id, nome, role, avatar_url, skills, team_performance(exp_points, level_name)').in('role', ['admin', 'gestor', 'colaborador']),
        supabase.from('routing_rules').select('*'),
        supabase.from('tasks').select('*').gte('created_at', fifteenDaysAgo.toISOString()).order('deadline', { ascending: true })
      ]);

      if (teamRes.error) throw teamRes.error;
      if (rulesRes.error) throw rulesRes.error;
      if (tasksRes.error) throw tasksRes.error;

      // Pode adicionar lógicas de agrupamento de tarefas por 'stage' aqui para aliviar o Frontend

      return res.status(200).json({
        data: {
          team: teamRes.data,
          routingRules: rulesRes.data,
          tasks: tasksRes.data
        }
      });
    } catch (error: any) {
      console.error('Error fetching analytics dashboard:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
