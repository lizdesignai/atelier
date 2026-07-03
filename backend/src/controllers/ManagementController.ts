import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export class ManagementController {
  static async getPulseDashboard(req: Request, res: Response) {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartIso = todayStart.toISOString();

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const todayEndIso = todayEnd.toISOString();

      const [teamRes, sessionsRes, tasksRes] = await Promise.all([
        supabase.from('profiles').select('id, nome, avatar_url, role, current_status').in('role', ['colaborador', 'gestor', 'admin']),
        supabase.from('work_sessions').select('*, tasks(title, projects(profiles(nome)))').gte('start_time', todayStartIso).lte('start_time', todayEndIso),
        supabase.from('tasks').select('id, status, deadline').or(`updated_at.gte.${todayStartIso},deadline.gte.${todayStartIso},deadline.lte.${todayEndIso}`)
      ]);

      if (teamRes.error) throw teamRes.error;
      if (sessionsRes.error) throw sessionsRes.error;
      if (tasksRes.error) throw tasksRes.error;

      const team = teamRes.data || [];
      const sessions = sessionsRes.data || [];
      const tasks = tasksRes.data || [];

      // Sort team
      const statusRank: Record<string, number> = { 'online': 1, 'idle': 2, 'offline': 3 };
      const sortedTeam = team.sort((a, b) => {
        return (statusRank[a.current_status || 'offline'] || 3) - (statusRank[b.current_status || 'offline'] || 3);
      });

      // Calculate Metrics
      const now = Date.now();
      const activeSessions = sessions.filter(s => s.end_time === null);
      const closedSessions = sessions.filter(s => s.end_time !== null);

      let totalMinutesToday = closedSessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
      activeSessions.forEach(s => {
        totalMinutesToday += Math.floor((now - new Date(s.start_time).getTime()) / 60000);
      });

      const avgFocusMinutes = closedSessions.length > 0 ? Math.round(closedSessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0) / closedSessions.length) : 0;

      const tasksDueOrActive = tasks.filter(t => (t.deadline && new Date(t.deadline) <= todayEnd) || t.status === 'completed');
      const tasksCompletedToday = tasksDueOrActive.filter(t => t.status === 'completed').length;
      const totalTasksToday = tasksDueOrActive.length;
      const completionRate = totalTasksToday > 0 ? Math.round((tasksCompletedToday / totalTasksToday) * 100) : 0;

      return res.status(200).json({
        data: {
          team: sortedTeam,
          todaySessions: sessions,
          metrics: {
            totalMinutesToday,
            avgFocusMinutes,
            tasksCompletedToday,
            totalTasksToday,
            completionRate
          }
        }
      });
    } catch (error: any) {
      console.error('Error fetching pulse dashboard:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
