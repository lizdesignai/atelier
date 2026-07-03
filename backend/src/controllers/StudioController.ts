import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export class StudioController {
  static async getProjectDashboard(req: Request, res: Response) {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      const projectIdStr = projectId as string;
      // Identify if the projectId belongs to a normal project or an agency
      const isAgency = projectIdStr.startsWith('agency-');
      const actualId = isAgency ? projectIdStr.replace('agency-', '') : projectIdStr;

      let projectData = null;
      let agencySubclients = [];
      let assets = [];
      let briefing = null;

      if (isAgency) {
        const [agencyRes, subclientsRes] = await Promise.all([
          supabase.from('agencies').select('*').eq('id', actualId).single(),
          supabase.from('agency_subclients').select('*').eq('agency_id', actualId).order('name', { ascending: true })
        ]);
        if (agencyRes.error) throw agencyRes.error;
        projectData = {
          ...agencyRes.data,
          id: projectId, // keep prefixed id for consistency in frontend
          isAgency: true,
          profiles: { nome: agencyRes.data.name, empresa: agencyRes.data.name, avatar_url: null },
          status: 'active'
        };
        agencySubclients = subclientsRes.data || [];
      } else {
        const [projRes, assetsRes, briefingRes] = await Promise.all([
          supabase.from('projects').select('*, profiles(nome, empresa, avatar_url)').eq('id', actualId).single(),
          supabase.from('project_assets').select('*').eq('project_id', actualId).order('created_at', { ascending: false }),
          supabase.from('client_briefings').select('answers, is_completed').eq('project_id', actualId).maybeSingle()
        ]);
        if (projRes.error) throw projRes.error;
        
        projectData = { ...projRes.data, isAgency: false };
        assets = assetsRes.data || [];
        briefing = (briefingRes.data?.is_completed !== false && briefingRes.data?.answers) ? briefingRes.data.answers : null;
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
