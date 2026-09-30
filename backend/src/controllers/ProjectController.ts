import { Request, Response } from 'express';
import { neon } from '@neondatabase/serverless';

export class ProjectController {
  
  // GET /api/v1/projects/unified
  static async getUnifiedWallet(req: Request, res: Response) {
    try {
      const sql = neon(process.env.POSTGRES_URL || '');
      // Otimização: Queries paralelas e seleção de colunas explícitas
      const [projectsRes, agenciesRes] = await Promise.all([
        sql`SELECT id, client_id, service_type, type, status, phase, fase, progress, financial_value, billing_date, created_at FROM projects WHERE status = 'active'`,
        sql`SELECT id, name, status, financial_value, billing_date, created_at, trello_url FROM agencies WHERE status = 'active'`
      ]);
        
      // Unificar carteira
      const unifiedWallet = [
        ...(projectsRes || []).map((p: any) => ({ ...p, entityType: 'project' })),
        ...(agenciesRes || []).map((a: any) => ({ ...a, entityType: 'agency' }))
      ];

      return res.status(200).json({ data: unifiedWallet });
    } catch (error: any) {
      console.error('Error fetching unified wallet:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // GET /api/v1/projects/:id
  static async getProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sql = neon(process.env.POSTGRES_URL || '');
      const data = await sql`
        SELECT id, client_id, service_type, type, status, phase, fase, progress, financial_value, billing_date, created_at, data_limite
        FROM projects
        WHERE id = ${id}
      `;
      
      return res.status(200).json({ data: data[0] });
    } catch (error: any) {
      console.error('Error fetching project:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // GET /api/v1/projects/agencies/subclients
  static async getAgencySubclients(req: Request, res: Response) {
    try {
      const { agencyId } = req.query;
      const sql = neon(process.env.POSTGRES_URL || '');
      
      let data;
      if (agencyId) {
        data = await sql`
          SELECT id, agency_id, name, deliverables_count, created_at, trello_url
          FROM agency_subclients
          WHERE agency_id = ${String(agencyId)}
        `;
      } else {
        data = await sql`
          SELECT id, agency_id, name, deliverables_count, created_at, trello_url
          FROM agency_subclients
        `;
      }

      return res.status(200).json({ data });
    } catch (error: any) {
      console.error('Error fetching subclients:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
