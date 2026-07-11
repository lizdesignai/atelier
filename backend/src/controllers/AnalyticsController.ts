// src/controllers/AnalyticsController.ts
import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { redis } from '../config/redis';

export class AnalyticsController {
  
  // GET /api/v1/analytics/dashboard
  static async getDashboardData(req: Request, res: Response) {
    try {
      const cacheKey = 'analytics:dashboard';
      
      // Tenta recuperar do Cache do Redis (Upstash)
      try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          // Se for stringified, parseamos antes de enviar
          const parsed = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
          return res.status(200).json({ data: parsed });
        }
      } catch (cacheErr) {
        console.warn('[Redis Cache Error] Falha ao ler cache do analytics:', cacheErr);
      }

      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const [teamRes, rulesRes, tasksRes, agenciesRes, subclientsRes] = await Promise.all([
        supabase.from('profiles').select('id, nome, role, avatar_url, skills, team_performance(exp_points, level_name)').in('role', ['admin', 'gestor', 'colaborador']),
        supabase.from('routing_rules').select('id, rule_name, conditions, target_collaborator_id, is_active'),
        supabase.from('tasks')
          .select('id, project_id, title, status, deadline, created_at, completed_at, actual_time, estimated_time, collaborator_id, stage, type, attachment_url, projects(type, service_type, profiles(nome, avatar_url))')
          .or(`status.neq.completed,completed_at.gte.${fifteenDaysAgo.toISOString()}`)
          .order('deadline', { ascending: true }),
        supabase.from('agencies').select('id, name, status, financial_value, billing_date, created_at, trello_url').eq('status', 'active'),
        supabase.from('agency_subclients').select('id, agency_id, profile_id, name, status, created_at')
      ]);

      if (teamRes.error) throw teamRes.error;
      if (rulesRes.error) throw rulesRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (agenciesRes.error) throw agenciesRes.error;
      if (subclientsRes.error) throw subclientsRes.error;

      const dashboardData = {
        team: teamRes.data,
        routingRules: rulesRes.data,
        tasks: tasksRes.data,
        agencies: agenciesRes.data,
        subclients: subclientsRes.data
      };

      // Grava no Redis com TTL de 60 segundos
      try {
        await redis.set(cacheKey, JSON.stringify(dashboardData), { ex: 60 });
      } catch (cacheErr) {
        console.warn('[Redis Cache Error] Falha ao gravar cache do analytics:', cacheErr);
      }

      return res.status(200).json({ data: dashboardData });
    } catch (error: any) {
      console.error('Error fetching analytics dashboard:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
