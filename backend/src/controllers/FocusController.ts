import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export class FocusController {
  // GET /api/v1/focus/urgent/:collaboratorId
  static async getUrgentFocus(req: Request, res: Response) {
    try {
      const { collaboratorId } = req.params;
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', collaboratorId)
        .single();

      let query = supabase
        .from('tasks')
        .select(`
          *,
          projects(id, type, service_type, client_id, profiles(nome)),
          agency_subclients(id, name, agency_id)
        `)
        .neq('status', 'completed')
        .gte('deadline', now.toISOString())
        .lte('deadline', next24h.toISOString())
        .order('deadline', { ascending: true });

      if (profile?.role === 'colaborador') {
        query = query.eq('assigned_to', collaboratorId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json({ data: data || [] });
    } catch (error: any) {
      console.error('Error fetching urgent focus:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // GET /api/v1/focus/monthly/:collaboratorId
  static async getMonthlyFocus(req: Request, res: Response) {
    try {
      const { collaboratorId } = req.params;
      const { projectId, subclientId, month, year } = req.query;

      const targetMonth = month ? parseInt(month as string, 10) - 1 : new Date().getMonth();
      const targetYear = year ? parseInt(year as string, 10) : new Date().getFullYear();

      const startDate = new Date(targetYear, targetMonth, 1).toISOString();
      const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59).toISOString();

      let query = supabase
        .from('tasks')
        .select(`
          *,
          projects(id, type, service_type, client_id, profiles(nome)),
          agency_subclients(id, name, agency_id)
        `)
        .gte('deadline', startDate)
        .lte('deadline', endDate)
        .order('deadline', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (subclientId) {
        query = query.eq('subclient_id', subclientId);
      }

      // Check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', collaboratorId)
        .single();

      if (profile?.role === 'colaborador') {
        query = query.eq('assigned_to', collaboratorId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json({ data: data || [] });
    } catch (error: any) {
      console.error('Error fetching monthly focus:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // GET /api/v1/focus/assigned-clients/:collaboratorId
  static async getAssignedClients(req: Request, res: Response) {
    try {
      const { collaboratorId } = req.params;

      const { data: assignments, error } = await supabase
        .from('collaborator_assignments')
        .select(`
          id,
          project_id,
          subclient_id,
          projects:project_id(id, type, service_type, profiles(nome, avatar_url)),
          agency_subclients:subclient_id(id, name)
        `)
        .eq('collaborator_id', collaboratorId);

      if (!error && assignments && assignments.length > 0) {
        const assignedList = assignments.map((a: any) => {
          if (a.project_id && a.projects) {
            return {
              id: a.projects.id,
              assignmentId: a.id,
              name: a.projects.profiles?.nome ? `${a.projects.profiles.nome} (${a.projects.type || a.projects.service_type})` : (a.projects.type || 'Projeto'),
              avatarUrl: a.projects.profiles?.avatar_url || null,
              type: 'project'
            };
          } else if (a.subclient_id && a.agency_subclients) {
            return {
              id: a.agency_subclients.id,
              assignmentId: a.id,
              name: a.agency_subclients.name,
              avatarUrl: null,
              type: 'subclient'
            };
          }
          return null;
        }).filter(Boolean);

        return res.status(200).json({ data: assignedList });
      }

      // Fallback for Admin or Gestor without explicit assignments
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', collaboratorId)
        .single();

      const isAdminOrGestor = profile?.role === 'admin' || profile?.role === 'gestor';

      if (isAdminOrGestor) {
        const [projectsRes, subclientsRes] = await Promise.all([
          supabase.from('projects').select('id, type, service_type, profiles(nome, avatar_url)').in('status', ['active', 'delivered']),
          supabase.from('agency_subclients').select('id, name, agency_id')
        ]);

        const mappedProjects = (projectsRes.data || []).map((p: any) => ({
          id: p.id,
          name: p.profiles?.nome ? `${p.profiles.nome} (${p.type || p.service_type})` : (p.type || 'Projeto'),
          avatarUrl: p.profiles?.avatar_url || null,
          type: 'project',
          raw: p
        }));

        const mappedSubclients = (subclientsRes.data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          avatarUrl: null,
          type: 'subclient',
          raw: s
        }));

        return res.status(200).json({ data: [...mappedProjects, ...mappedSubclients] });
      }

      return res.status(200).json({ data: [] });
    } catch (error: any) {
      console.error('Error fetching assigned clients:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
