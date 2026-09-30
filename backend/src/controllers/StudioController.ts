// src/controllers/StudioController.ts
import { Request, Response } from 'express';
import { neon } from '@neondatabase/serverless';

export class StudioController {
  static async getProjectDashboard(req: Request, res: Response) {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      const sql = neon(process.env.POSTGRES_URL || '');

      const projectIdStr = projectId as string;
      const isAgency = projectIdStr.startsWith('agency-');
      const actualId = isAgency ? projectIdStr.replace('agency-', '') : projectIdStr;

      let projectData = null;
      let agencySubclients: any[] = [];
      let assets: any[] = [];
      let briefing = null;

      if (isAgency) {
        // Otimização: Seleção de colunas explícitas para agências e subclientes
        const [agencyRes, subclientsRes] = await Promise.all([
          sql`SELECT id, name, status, financial_value, billing_date, created_at, trello_url FROM agencies WHERE id = ${actualId}`,
          sql`SELECT id, agency_id, name, deliverables_count, created_at, trello_url FROM agency_subclients WHERE agency_id = ${actualId} ORDER BY name ASC`
        ]);
        
        const agencyData = agencyRes[0];
        if (!agencyData) throw new Error('Agency not found');

        projectData = {
          ...agencyData,
          id: projectId, // Mantém ID prefixado consistente com o frontend
          isAgency: true,
          profiles: { nome: agencyData.name, empresa: agencyData.name, avatar_url: null },
          status: 'active'
        };
        agencySubclients = subclientsRes || [];
      } else {
        // Otimização: Seleção de colunas explícitas para projetos normais, assets e briefings
        const [projRes, assetsRes, briefingRes] = await Promise.all([
          sql`
            SELECT p.id, p.client_id, p.service_type, p.type, p.status, p.phase, p.fase, p.progress, p.financial_value, p.billing_date, p.created_at, 
            CASE WHEN pr.id IS NOT NULL THEN json_build_object('nome', pr.nome, 'empresa', pr.empresa, 'avatar_url', pr.avatar_url) ELSE null END as profiles
            FROM projects p 
            LEFT JOIN profiles pr ON p.client_id = pr.id 
            WHERE p.id = ${actualId}
          `,
          sql`SELECT id, project_id, name, url, created_at FROM project_assets WHERE project_id = ${actualId} ORDER BY created_at DESC`,
          sql`SELECT answers, is_completed FROM client_briefings WHERE project_id = ${actualId}`
        ]);
        
        const projData = projRes[0];
        if (!projData) throw new Error('Project not found');
        
        projectData = { ...projData, isAgency: false };
        assets = assetsRes || [];
        const briefingData = briefingRes[0];
        briefing = (briefingData?.is_completed !== false && briefingData?.answers) ? briefingData.answers : null;
      }

      return res.status(200).json({
        data: {
          project: projectData,
          assets,
          briefing,
          subclients: agencySubclients
        }
      });
    } catch (error: any) {
      console.error('Error fetching studio dashboard:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
