import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export class AssignmentController {
  // GET /api/v1/assignments/all
  static async getAllAssignments(req: Request, res: Response) {
    try {
      const { data, error } = await supabase
        .from('collaborator_assignments')
        .select(`
          *,
          profiles:collaborator_id(id, nome, avatar_url, role),
          projects:project_id(id, type, service_type, client_id, profiles(nome)),
          agency_subclients:subclient_id(id, name, agency_id)
        `);

      if (error) throw error;
      return res.status(200).json({ data: data || [] });
    } catch (error: any) {
      console.error('Error fetching assignments:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // GET /api/v1/assignments/:collaboratorId
  static async getCollaboratorAssignments(req: Request, res: Response) {
    try {
      const { collaboratorId } = req.params;
      const { data, error } = await supabase
        .from('collaborator_assignments')
        .select(`
          *,
          projects:project_id(id, type, service_type, client_id, profiles(nome)),
          agency_subclients:subclient_id(id, name, agency_id)
        `)
        .eq('collaborator_id', collaboratorId);

      if (error) throw error;
      return res.status(200).json({ data: data || [] });
    } catch (error: any) {
      console.error('Error fetching collaborator assignments:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // POST /api/v1/assignments
  static async assignCollaborator(req: Request, res: Response) {
    try {
      const { collaboratorId, projectId, subclientId } = req.body;

      if (!collaboratorId || (!projectId && !subclientId)) {
        return res.status(400).json({ error: 'collaboratorId and either projectId or subclientId are required' });
      }

      const payload: any = {
        collaborator_id: collaboratorId,
        project_id: projectId || null,
        subclient_id: subclientId || null
      };

      const { data, error } = await supabase
        .from('collaborator_assignments')
        .upsert(payload, { onConflict: projectId ? 'collaborator_id,project_id' : 'collaborator_id,subclient_id' })
        .select(`
          *,
          profiles:collaborator_id(id, nome, avatar_url, role),
          projects:project_id(id, type, service_type, client_id, profiles(nome)),
          agency_subclients:subclient_id(id, name, agency_id)
        `)
        .single();

      if (error) throw error;

      // Update existing tasks for this client/subclient to belong to this collaborator
      try {
        if (projectId) {
          await supabase
            .from('tasks')
            .update({ assigned_to: collaboratorId })
            .eq('project_id', projectId);
        } else if (subclientId) {
          await supabase
            .from('tasks')
            .update({ assigned_to: collaboratorId })
            .eq('subclient_id', subclientId);
        }
      } catch (tErr) {
        console.warn("Failed to update existing tasks assigned_to:", tErr);
      }

      return res.status(201).json({ data });
    } catch (error: any) {
      console.error('Error assigning collaborator:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // DELETE /api/v1/assignments/:id
  static async removeAssignment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { error } = await supabase
        .from('collaborator_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(204).send();
    } catch (error: any) {
      console.error('Error removing assignment:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
