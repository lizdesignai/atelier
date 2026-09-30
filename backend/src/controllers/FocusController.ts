import { Request, Response } from 'express';
import { neon } from '@neondatabase/serverless';

export class FocusController {
  // GET /api/v1/focus/urgent/:collaboratorId
  static async getUrgentFocus(req: Request, res: Response) {
    try {
      const { collaboratorId } = req.params;
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const sql = neon(process.env.POSTGRES_URL || '');

      // Check role
      const profileRes = await sql`
        SELECT role FROM profiles WHERE id = ${collaboratorId}
      `;
      const profile = profileRes[0];

      let data;
      if (profile?.role === 'colaborador') {
        data = await sql`
          SELECT 
            t.*,
            CASE WHEN p.id IS NOT NULL THEN
              json_build_object(
                'id', p.id,
                'type', p.type,
                'service_type', p.service_type,
                'client_id', p.client_id,
                'profiles', CASE WHEN pr.id IS NOT NULL THEN json_build_object('nome', pr.nome) ELSE null END
              )
            ELSE null END as projects,
            CASE WHEN asub.id IS NOT NULL THEN
              json_build_object(
                'id', asub.id,
                'name', asub.name,
                'agency_id', asub.agency_id
              )
            ELSE null END as agency_subclients
          FROM tasks t
          LEFT JOIN projects p ON t.project_id = p.id
          LEFT JOIN profiles pr ON p.client_id = pr.id
          LEFT JOIN agency_subclients asub ON t.subclient_id = asub.id
          WHERE t.status != 'completed' 
            AND t.deadline >= ${now.toISOString()} 
            AND t.deadline <= ${next24h.toISOString()}
            AND t.assigned_to = ${collaboratorId}
          ORDER BY t.deadline ASC
        `;
      } else {
        data = await sql`
          SELECT 
            t.*,
            CASE WHEN p.id IS NOT NULL THEN
              json_build_object(
                'id', p.id,
                'type', p.type,
                'service_type', p.service_type,
                'client_id', p.client_id,
                'profiles', CASE WHEN pr.id IS NOT NULL THEN json_build_object('nome', pr.nome) ELSE null END
              )
            ELSE null END as projects,
            CASE WHEN asub.id IS NOT NULL THEN
              json_build_object(
                'id', asub.id,
                'name', asub.name,
                'agency_id', asub.agency_id
              )
            ELSE null END as agency_subclients
          FROM tasks t
          LEFT JOIN projects p ON t.project_id = p.id
          LEFT JOIN profiles pr ON p.client_id = pr.id
          LEFT JOIN agency_subclients asub ON t.subclient_id = asub.id
          WHERE t.status != 'completed' 
            AND t.deadline >= ${now.toISOString()} 
            AND t.deadline <= ${next24h.toISOString()}
          ORDER BY t.deadline ASC
        `;
      }

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

      const sql = neon(process.env.POSTGRES_URL || '');

      // Check role
      const profileRes = await sql`
        SELECT role FROM profiles WHERE id = ${collaboratorId}
      `;
      const profile = profileRes[0];

      const pId = projectId ? String(projectId) : null;
      const sId = subclientId ? String(subclientId) : null;
      const assignedTo = profile?.role === 'colaborador' ? collaboratorId : null;

      const data = await sql`
        SELECT 
          t.*,
          CASE WHEN p.id IS NOT NULL THEN
            json_build_object(
              'id', p.id,
              'type', p.type,
              'service_type', p.service_type,
              'client_id', p.client_id,
              'profiles', CASE WHEN pr.id IS NOT NULL THEN json_build_object('nome', pr.nome) ELSE null END
            )
          ELSE null END as projects,
          CASE WHEN asub.id IS NOT NULL THEN
            json_build_object(
              'id', asub.id,
              'name', asub.name,
              'agency_id', asub.agency_id
            )
          ELSE null END as agency_subclients
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN profiles pr ON p.client_id = pr.id
        LEFT JOIN agency_subclients asub ON t.subclient_id = asub.id
        WHERE t.deadline >= ${startDate} 
          AND t.deadline <= ${endDate}
          AND (${pId}::uuid IS NULL OR t.project_id = ${pId}::uuid)
          AND (${sId}::uuid IS NULL OR t.subclient_id = ${sId}::uuid)
          AND (${assignedTo}::uuid IS NULL OR t.assigned_to = ${assignedTo}::uuid)
        ORDER BY t.deadline ASC
      `;

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
      const sql = neon(process.env.POSTGRES_URL || '');

      const assignments = await sql`
        SELECT 
          ca.id,
          ca.project_id,
          ca.subclient_id,
          CASE WHEN p.id IS NOT NULL THEN
            json_build_object(
              'id', p.id,
              'type', p.type,
              'service_type', p.service_type,
              'profiles', CASE WHEN pr.id IS NOT NULL THEN json_build_object('nome', pr.nome, 'avatar_url', pr.avatar_url) ELSE null END
            )
          ELSE null END as projects,
          CASE WHEN asub.id IS NOT NULL THEN
            json_build_object(
              'id', asub.id,
              'name', asub.name
            )
          ELSE null END as agency_subclients
        FROM collaborator_assignments ca
        LEFT JOIN projects p ON ca.project_id = p.id
        LEFT JOIN profiles pr ON p.client_id = pr.id
        LEFT JOIN agency_subclients asub ON ca.subclient_id = asub.id
        WHERE ca.collaborator_id = ${collaboratorId}
      `;

      let assignedList: any[] = [];

      if (assignments && assignments.length > 0) {
        assignedList = assignments.map((a: any) => {
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
      }

      // Track existing project and subclient IDs to avoid duplicates
      const existingProjectIds = new Set(
        assignedList.filter(item => item.type === 'project').map(item => item.id)
      );
      const existingSubclientIds = new Set(
        assignedList.filter(item => item.type === 'subclient').map(item => item.id)
      );

      // Check tasks table for active tasks assigned to this collaborator
      const activeTasks = await sql`
        SELECT project_id, subclient_id
        FROM tasks
        WHERE assigned_to = ${collaboratorId}
          AND status != 'completed'
      `;

      if (activeTasks && activeTasks.length > 0) {
        const taskProjectIds = Array.from(new Set(
          activeTasks
            .map((t: any) => t.project_id)
            .filter((id: string | null): id is string => Boolean(id) && !existingProjectIds.has(id!))
        ));

        const taskSubclientIds = Array.from(new Set(
          activeTasks
            .map((t: any) => t.subclient_id)
            .filter((id: string | null): id is string => Boolean(id) && !existingSubclientIds.has(id!))
        ));

        if (taskProjectIds.length > 0) {
          const missingProjects = await sql`
            SELECT 
              p.id, p.type, p.service_type,
              CASE WHEN pr.id IS NOT NULL THEN
                json_build_object('nome', pr.nome, 'avatar_url', pr.avatar_url)
              ELSE null END as profiles
            FROM projects p
            LEFT JOIN profiles pr ON p.client_id = pr.id
            WHERE p.id = ANY(${taskProjectIds}::uuid[])
          `;

          if (missingProjects) {
            for (const p of missingProjects as any[]) {
              assignedList.push({
                id: p.id,
                name: p.profiles?.nome ? `${p.profiles.nome} (${p.type || p.service_type})` : (p.type || 'Projeto'),
                avatarUrl: p.profiles?.avatar_url || null,
                type: 'project'
              });
            }
          }
        }

        if (taskSubclientIds.length > 0) {
          const missingSubclients = await sql`
            SELECT id, name
            FROM agency_subclients
            WHERE id = ANY(${taskSubclientIds}::uuid[])
          `;

          if (missingSubclients) {
            for (const s of missingSubclients as any[]) {
              assignedList.push({
                id: s.id,
                name: s.name,
                avatarUrl: null,
                type: 'subclient'
              });
            }
          }
        }
      }

      if (assignedList.length > 0) {
        return res.status(200).json({ data: assignedList });
      }

      // Fallback for Admin or Gestor without explicit assignments
      const profileRes = await sql`
        SELECT role FROM profiles WHERE id = ${collaboratorId}
      `;
      const profile = profileRes[0];

      const isAdminOrGestor = profile?.role === 'admin' || profile?.role === 'gestor';

      if (isAdminOrGestor) {
        const [projectsRes, subclientsRes] = await Promise.all([
          sql`
            SELECT 
              p.id, p.type, p.service_type,
              CASE WHEN pr.id IS NOT NULL THEN
                json_build_object('nome', pr.nome, 'avatar_url', pr.avatar_url)
              ELSE null END as profiles
            FROM projects p
            LEFT JOIN profiles pr ON p.client_id = pr.id
            WHERE p.status IN ('active', 'delivered')
          `,
          sql`SELECT id, name, agency_id FROM agency_subclients`
        ]);

        const mappedProjects = (projectsRes || []).map((p: any) => ({
          id: p.id,
          name: p.profiles?.nome ? `${p.profiles.nome} (${p.type || p.service_type})` : (p.type || 'Projeto'),
          avatarUrl: p.profiles?.avatar_url || null,
          type: 'project',
          raw: p
        }));

        const mappedSubclients = (subclientsRes || []).map((s: any) => ({
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
