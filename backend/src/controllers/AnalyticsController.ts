import { Request, Response } from 'express';
import { redis } from '../config/redis';
import { neon } from '@neondatabase/serverless';

export class AnalyticsController {
  
  // GET /api/v1/analytics/dashboard
  static async getDashboardData(req: Request, res: Response) {
    try {
      const cacheKey = 'analytics:dashboard';
      const isFreshRequested = req.query.fresh === 'true';
      
      if (!isFreshRequested) {
        try {
          const cachedData = await redis.get(cacheKey);
          if (cachedData) {
            const parsed = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
            return res.status(200).json({ data: parsed });
          }
        } catch (cacheErr) {
          console.warn('[Redis Cache Error] Falha ao ler cache do analytics:', cacheErr);
        }
      }

      if (!process.env.POSTGRES_URL) {
        throw new Error('POSTGRES_URL is not set');
      }
      const sql = neon(process.env.POSTGRES_URL);

      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const [teamRes, rulesRes, tasksRes, agenciesRes, subclientsRes] = await Promise.all([
        sql`
          SELECT 
            p.id, p.nome, p.role, p.avatar_url, p.skills,
            CASE WHEN tp.user_id IS NOT NULL THEN
              json_build_object('exp_points', tp.exp_points, 'level_name', tp.level_name)
            ELSE null END as team_performance
          FROM profiles p
          LEFT JOIN team_performance tp ON p.id = tp.user_id
          WHERE p.role IN ('admin', 'gestor', 'colaborador')
        `,
        sql`SELECT id, project_id, task_type, assignee_id, created_at FROM routing_rules`,
        sql`
          SELECT 
            t.id, t.project_id, t.assigned_to, t.title, t.description, t.caption, 
            t.external_links, t.media_assets, t.status, t.deadline, t.created_at, 
            t.completed_at, t.actual_time, t.estimated_time, t.stage, t.task_type, 
            t.attachment_url, t.subclient_id, t.agency_id,
            CASE WHEN p.id IS NOT NULL THEN
              json_build_object(
                'type', p.type,
                'service_type', p.service_type,
                'profiles', CASE WHEN pr.id IS NOT NULL THEN json_build_object('nome', pr.nome, 'avatar_url', pr.avatar_url) ELSE null END
              )
            ELSE null END as projects,
            CASE WHEN asb.id IS NOT NULL THEN
              json_build_object('name', asb.name)
            ELSE null END as agency_subclients
          FROM tasks t
          LEFT JOIN projects p ON t.project_id = p.id
          LEFT JOIN profiles pr ON p.client_id = pr.id
          LEFT JOIN agency_subclients asb ON t.subclient_id = asb.id
          WHERE t.status != 'completed' OR t.completed_at >= ${fifteenDaysAgo.toISOString()}
          ORDER BY t.deadline ASC
        `,
        sql`SELECT id, name, status, financial_value, billing_date, created_at, trello_url FROM agencies WHERE status = 'active'`,
        sql`SELECT id, agency_id, name, deliverables_count, created_at, trello_url FROM agency_subclients`
      ]);

      const dashboardData = {
        team: teamRes,
        routingRules: rulesRes,
        tasks: tasksRes,
        agencies: agenciesRes,
        subclients: subclientsRes
      };

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

  // POST /api/v1/analytics/clear-cache
  static async clearCache(req: Request, res: Response) {
    try {
      await redis.del('analytics:dashboard');
      return res.status(200).json({ success: true, message: 'Cache limpo' });
    } catch (e: any) {
      console.warn('Erro ao limpar cache do Redis:', e.message);
      return res.status(200).json({ success: true, message: 'Sucesso com fallback' });
    }
  }
}

