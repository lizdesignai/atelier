// src/controllers/ManagementController.ts
import { Request, Response } from 'express';
import { redis } from '../config/redis';
import { neon } from '@neondatabase/serverless';

export class ManagementController {
  static async getPulseDashboard(req: Request, res: Response) {
    try {
      const cacheKey = 'management:pulse';
      
      // Tenta recuperar do Cache do Redis (TTL curto de 10 segundos para manter o caráter de live-feed)
      try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          const parsed = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
          return res.status(200).json({ data: parsed });
        }
      } catch (cacheErr) {
        console.warn('[Redis Cache Error] Falha ao ler cache do pulse:', cacheErr);
      }

      const sql = neon(process.env.POSTGRES_URL || '');

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartIso = todayStart.toISOString();

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const todayEndIso = todayEnd.toISOString();

      const [team, sessions, tasks] = await Promise.all([
        sql`SELECT id, nome, avatar_url, role, current_status FROM profiles WHERE role IN ('colaborador', 'gestor', 'admin')`,
        sql`
          SELECT 
            ws.id, ws.user_id, ws.start_time, ws.end_time, ws.duration_minutes, ws.task_id,
            CASE WHEN t.id IS NOT NULL THEN
              json_build_object(
                'title', t.title,
                'projects', CASE WHEN p.id IS NOT NULL THEN
                  json_build_object(
                    'profiles', CASE WHEN pr.id IS NOT NULL THEN json_build_object('nome', pr.nome) ELSE null END
                  )
                ELSE null END
              )
            ELSE null END as tasks
          FROM work_sessions ws
          LEFT JOIN tasks t ON ws.task_id = t.id
          LEFT JOIN projects p ON t.project_id = p.id
          LEFT JOIN profiles pr ON p.client_id = pr.id
          WHERE ws.start_time >= ${todayStartIso} AND ws.start_time <= ${todayEndIso}
        `,
        sql`SELECT id, status, deadline FROM tasks WHERE updated_at >= ${todayStartIso} OR deadline >= ${todayStartIso} OR deadline <= ${todayEndIso}`
      ]);

      // Sort team
      const statusRank: Record<string, number> = { 'online': 1, 'idle': 2, 'offline': 3 };
      const sortedTeam = (team || []).sort((a, b) => {
        return (statusRank[a.current_status || 'offline'] || 3) - (statusRank[b.current_status || 'offline'] || 3);
      });

      // Calculate Metrics
      const now = Date.now();
      const activeSessions = (sessions || []).filter(s => s.end_time === null);
      const closedSessions = (sessions || []).filter(s => s.end_time !== null);

      let totalMinutesToday = closedSessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
      activeSessions.forEach(s => {
        totalMinutesToday += Math.floor((now - new Date(s.start_time).getTime()) / 60000);
      });

      const avgFocusMinutes = closedSessions.length > 0 ? Math.round(closedSessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0) / closedSessions.length) : 0;

      const tasksDueOrActive = (tasks || []).filter(t => (t.deadline && new Date(t.deadline) <= todayEnd) || t.status === 'completed');
      const tasksCompletedToday = tasksDueOrActive.filter(t => t.status === 'completed').length;
      const totalTasksToday = tasksDueOrActive.length;
      const completionRate = totalTasksToday > 0 ? Math.round((tasksCompletedToday / totalTasksToday) * 100) : 0;

      const dashboardData = {
        team: sortedTeam,
        sessions: sessions || [],
        tasks: tasks || [],
        metrics: {
          totalMinutesToday,
          avgFocusMinutes,
          tasksCompletedToday,
          totalTasksToday,
          completionRate
        }
      };

      // Grava no Redis com TTL de 10 segundos
      try {
        await redis.set(cacheKey, JSON.stringify(dashboardData), { ex: 10 });
      } catch (cacheErr) {
        console.warn('[Redis Cache Error] Falha ao gravar cache do pulse:', cacheErr);
      }

      return res.status(200).json({ data: dashboardData });
    } catch (error: any) {
      console.error('Error fetching pulse dashboard:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
