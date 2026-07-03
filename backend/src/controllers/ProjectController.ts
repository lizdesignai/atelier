import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export class ProjectController {
  
  // GET /api/v1/projects/unified
  static async getUnifiedWallet(req: Request, res: Response) {
    try {
      // 1. Buscar projetos normais
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'active');
        
      if (projectsError) throw projectsError;

      // 2. Buscar agências (clientes B2B)
      const { data: agencies, error: agenciesError } = await supabase
        .from('agencies')
        .select('*')
        .eq('status', 'active');

      if (agenciesError) throw agenciesError;

      // Unificar carteira
      const unifiedWallet = [
        ...(projects || []).map(p => ({ ...p, entityType: 'project' })),
        ...(agencies || []).map(a => ({ ...a, entityType: 'agency' }))
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
      const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
      
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
      const { data, error } = await supabase.from('agency_subclients').select('*');
      if (error) throw error;
      
      return res.status(200).json({ data });
    } catch (error: any) {
      console.error('Error fetching subclients:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
