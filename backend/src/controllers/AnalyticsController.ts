import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export class AnalyticsController {
  
  // GET /api/v1/analytics/dashboard
  static async getDashboardData(req: Request, res: Response) {
    try {
      // Data fetching for global dashboard: Team, Routing Rules, Tasks
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const [teamRes, rulesRes, tasksRes, agenciesRes, subclientsRes] = await Promise.all([
        supabase.from('profiles').select('id, nome, role, avatar_url, skills, team_performance(exp_points, level_name)').in('role', ['admin', 'gestor', 'colaborador']),
        supabase.from('routing_rules').select('*'),
        supabase.from('tasks')
          .select('*, projects(profiles(nome, avatar_url), type, service_type)')
          .or(`status.neq.completed,completed_at.gte.${fifteenDaysAgo.toISOString()}`)
          .order('deadline', { ascending: true }),
        supabase.from('agencies').select('*').eq('status', 'active'),
        supabase.from('agency_subclients').select('*')
      ]);

      if (teamRes.error) throw teamRes.error;
      if (rulesRes.error) throw rulesRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (agenciesRes.error) throw agenciesRes.error;
      if (subclientsRes.error) throw subclientsRes.error;

      return res.status(200).json({
        data: {
          team: teamRes.data,
          routingRules: rulesRes.data,
          tasks: tasksRes.data,
          agencies: agenciesRes.data,
          subclients: subclientsRes.data
        }
      });
    } catch (error: any) {
      console.error('Error fetching analytics dashboard:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
