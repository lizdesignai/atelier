'use server'

import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export async function getProjectsAction() {
  const user = await getAuthUser();
  if (!user) throw new Error("NÃƒÂ£o autenticado");

  const sql = getDb();
  let projects;

  try {
    if (user.role === 'admin' || user.role === 'gestor') {
      projects = await sql`
        SELECT p.*, json_build_object('nome', pr.nome, 'avatar_url', pr.avatar_url, 'empresa', pr.empresa) as profiles
        FROM projects p
        LEFT JOIN profiles pr ON p.client_id = pr.id
        WHERE p.status IN ('active', 'delivered', 'archived')
        ORDER BY p.created_at DESC
      `;
    } else {
      projects = await sql`
        SELECT p.*, json_build_object('nome', pr.nome, 'avatar_url', pr.avatar_url, 'empresa', pr.empresa) as profiles
        FROM projects p
        LEFT JOIN profiles pr ON p.client_id = pr.id
        WHERE p.status IN ('active', 'delivered', 'archived')
        AND p.client_id = ${user.sub}
        ORDER BY p.created_at DESC
      `;
    }

    return projects;
  } catch (error) {
    console.error('[actions/projects] Erro ao buscar projetos:', error);
    throw new Error('Falha ao buscar projetos');
  }
}

export async function updateProjectAction(id: string, updateData: any) {
  const user = await getAuthUser();
  if (!user || (user.role !== 'admin' && user.role !== 'gestor')) {
    throw new Error("NÃƒÂ£o autorizado");
  }

  const sql = getDb();
  try {
    const keys = Object.keys(updateData);
    if (keys.length === 0) return null;
    
    const setQuery = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = Object.values(updateData);
    
    const result = await (sql as any).query(`UPDATE projects SET ${setQuery} WHERE id = $${keys.length + 1} RETURNING *`, [...values, id]);
    
    return result[0];
  } catch (error) {
    console.error('[actions/projects] Erro ao atualizar projeto:', error);
    throw new Error('Falha ao atualizar projeto');
  }
}