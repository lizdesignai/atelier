'use server'

import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export async function getTasksByAssigneesAction(teamIds: string[]) {
  const user = await getAuthUser();
  if (!user) throw new Error("NÃƒÂ£o autenticado");
  if (!teamIds || teamIds.length === 0) return [];

  const sql = getDb();
  try {
    // Essa query substitui o .select('*, projects(profiles(nome), type, client_id), agency_subclients(id, name, trello_url), social_posts(image_url, status, created_at)')
    // Usamos json_build_object para simular o comportamento de aninhamento do PostgREST
    const tasks = await sql`
      SELECT 
        t.*, 
        json_build_object(
          'type', p.type, 
          'client_id', p.client_id, 
          'profiles', json_build_object('nome', pr.nome)
        ) as projects,
        json_build_object(
          'id', ag.id, 
          'name', ag.name, 
          'trello_url', ag.trello_url
        ) as agency_subclients,
        (
          SELECT json_agg(json_build_object('image_url', sp.image_url, 'status', sp.status, 'created_at', sp.created_at))
          FROM social_posts sp WHERE sp.task_id = t.id
        ) as social_posts
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN profiles pr ON p.client_id = pr.id
      LEFT JOIN agency_subclients ag ON t.agency_subclient_id = ag.id
      WHERE t.assigned_to = ANY(${teamIds})
      ORDER BY t.priority_score DESC NULLS LAST, t.deadline ASC
    `;
    
    return tasks;
  } catch (error) {
    console.error('[actions/tasks] Erro ao buscar tarefas:', error);
    throw new Error('Falha ao buscar tarefas');
  }
}

export async function updateTaskAction(id: string, updateData: any) {
  const user = await getAuthUser();
  if (!user) throw new Error("NÃƒÂ£o autorizado");

  const sql = getDb();
  try {
    const keys = Object.keys(updateData);
    if (keys.length === 0) return null;
    
    const setQuery = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = Object.values(updateData);
    
    const result = await (sql as any).query(`UPDATE tasks SET ${setQuery} WHERE id = $${keys.length + 1} RETURNING *`, [...values, id]);
    
    return result[0];
  } catch (error) {
    console.error('[actions/tasks] Erro ao atualizar tarefa:', error);
    throw new Error('Falha ao atualizar tarefa');
  }
}