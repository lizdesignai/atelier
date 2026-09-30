import { Request, Response } from 'express';
import { neon } from '@neondatabase/serverless';

export class AssignmentController {
  // GET /api/v1/assignments/all
  static async getAllAssignments(req: Request, res: Response) {
    try {
      const sql = neon(process.env.POSTGRES_URL || '');
      
      const data = await sql`
        SELECT 
          ca.*,
          CASE WHEN p.id IS NOT NULL THEN json_build_object('id', p.id, 'nome', p.nome, 'avatar_url', p.avatar_url, 'role', p.role) ELSE null END as profiles,
          CASE WHEN prj.id IS NOT NULL THEN json_build_object(
            'id', prj.id, 
            'type', prj.type, 
            'service_type', prj.service_type, 
            'client_id', prj.client_id, 
            'profiles', CASE WHEN prj_p.id IS NOT NULL THEN json_build_object('nome', prj_p.nome) ELSE null END
          ) ELSE null END as projects,
          CASE WHEN asub.id IS NOT NULL THEN json_build_object('id', asub.id, 'name', asub.name, 'agency_id', asub.agency_id) ELSE null END as agency_subclients
        FROM collaborator_assignments ca
        LEFT JOIN profiles p ON ca.collaborator_id = p.id
        LEFT JOIN projects prj ON ca.project_id = prj.id
        LEFT JOIN profiles prj_p ON prj.client_id = prj_p.id
        LEFT JOIN agency_subclients asub ON ca.subclient_id = asub.id
      `;

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
      const sql = neon(process.env.POSTGRES_URL || '');

      const data = await sql`
        SELECT 
          ca.*,
          CASE WHEN prj.id IS NOT NULL THEN json_build_object(
            'id', prj.id, 
            'type', prj.type, 
            'service_type', prj.service_type, 
            'client_id', prj.client_id, 
            'profiles', CASE WHEN prj_p.id IS NOT NULL THEN json_build_object('nome', prj_p.nome) ELSE null END
          ) ELSE null END as projects,
          CASE WHEN asub.id IS NOT NULL THEN json_build_object('id', asub.id, 'name', asub.name, 'agency_id', asub.agency_id) ELSE null END as agency_subclients
        FROM collaborator_assignments ca
        LEFT JOIN projects prj ON ca.project_id = prj.id
        LEFT JOIN profiles prj_p ON prj.client_id = prj_p.id
        LEFT JOIN agency_subclients asub ON ca.subclient_id = asub.id
        WHERE ca.collaborator_id = ${collaboratorId}
      `;

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

      const sql = neon(process.env.POSTGRES_URL || '');
      let upsertData;

      if (projectId) {
        upsertData = await sql`
          INSERT INTO collaborator_assignments (collaborator_id, project_id, subclient_id)
          VALUES (${collaboratorId}, ${projectId}, ${subclientId || null})
          ON CONFLICT (collaborator_id, project_id) DO UPDATE SET subclient_id = EXCLUDED.subclient_id
          RETURNING *
        `;
      } else {
        upsertData = await sql`
          INSERT INTO collaborator_assignments (collaborator_id, project_id, subclient_id)
          VALUES (${collaboratorId}, ${projectId || null}, ${subclientId})
          ON CONFLICT (collaborator_id, subclient_id) DO UPDATE SET project_id = EXCLUDED.project_id
          RETURNING *
        `;
      }

      const assignmentId = upsertData[0].id;

      const selectData = await sql`
        SELECT 
          ca.*,
          CASE WHEN p.id IS NOT NULL THEN json_build_object('id', p.id, 'nome', p.nome, 'avatar_url', p.avatar_url, 'role', p.role) ELSE null END as profiles,
          CASE WHEN prj.id IS NOT NULL THEN json_build_object(
            'id', prj.id, 
            'type', prj.type, 
            'service_type', prj.service_type, 
            'client_id', prj.client_id, 
            'profiles', CASE WHEN prj_p.id IS NOT NULL THEN json_build_object('nome', prj_p.nome) ELSE null END
          ) ELSE null END as projects,
          CASE WHEN asub.id IS NOT NULL THEN json_build_object('id', asub.id, 'name', asub.name, 'agency_id', asub.agency_id) ELSE null END as agency_subclients
        FROM collaborator_assignments ca
        LEFT JOIN profiles p ON ca.collaborator_id = p.id
        LEFT JOIN projects prj ON ca.project_id = prj.id
        LEFT JOIN profiles prj_p ON prj.client_id = prj_p.id
        LEFT JOIN agency_subclients asub ON ca.subclient_id = asub.id
        WHERE ca.id = ${assignmentId}
      `;

      const data = selectData[0];

      // Update existing tasks for this client/subclient to belong to this collaborator
      try {
        if (projectId) {
          await sql`UPDATE tasks SET assigned_to = ${collaboratorId} WHERE project_id = ${projectId}`;
        } else if (subclientId) {
          await sql`UPDATE tasks SET assigned_to = ${collaboratorId} WHERE subclient_id = ${subclientId}`;
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
      const sql = neon(process.env.POSTGRES_URL || '');
      await sql`DELETE FROM collaborator_assignments WHERE id = ${id}`;

      return res.status(204).send();
    } catch (error: any) {
      console.error('Error removing assignment:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
