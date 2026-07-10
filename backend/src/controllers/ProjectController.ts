// src/controllers/ProjectController.ts
import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export class ProjectController {
  
  // GET /api/v1/projects/unified
  static async getUnifiedWallet(req: Request, res: Response) {
    try {
      // Otimização: Queries paralelas e seleção de colunas explícitas
      const [projectsRes, agenciesRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, client_id, service_type, type, status, phase, fase, progress, financial_value, billing_date, created_at')
          .eq('status', 'active'),
        supabase
          .from('agencies')
          .select('id, name, status, financial_value, billing_date, created_at, trello_url')
          .eq('status', 'active')
      ]);
        
      if (projectsRes.error) throw projectsRes.error;
      if (agenciesRes.error) throw agenciesRes.error;

      // Unificar carteira
      const unifiedWallet = [
        ...(projectsRes.data || []).map(p => ({ ...p, entityType: 'project' })),
        ...(agenciesRes.data || []).map(a => ({ ...a, entityType: 'agency' }))
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
      const { data, error } = await supabase
        .from('projects')
        .select('id, client_id, service_type, type, status, phase, fase, progress, financial_value, billing_date, created_at, data_limite')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return res.status(200).json({ data });
    } catch (error: any) {
      console.error('Error fetching project:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // GET /api/v1/projects/agencies/subclients
  static async getAgencySubclients(req: Request, res: Response) {
    try {
      const { agencyId } = req.query;
      
      let query = supabase
        .from('agency_subclients')
        .select('id, agency_id, profile_id, name, status, created_at');
        
      if (agencyId) {
        query = query.eq('agency_id', String(agencyId));
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return res.status(200).json({ data });
    } catch (error: any) {
      console.error('Error fetching subclients:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
