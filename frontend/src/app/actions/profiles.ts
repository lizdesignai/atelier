'use server'

import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export async function getTeamProfilesAction() {
  const user = await getAuthUser();
  if (!user) throw new Error("NÃƒÂ£o autenticado");

  const sql = getDb();
  try {
    const team = await sql`
      SELECT id, nome, avatar_url, role, current_mood, current_song_id, email, empresa, cargo, skills
      FROM profiles
      WHERE role IN ('admin', 'gestor', 'colaborador')
      ORDER BY nome ASC
    `;
    return team;
  } catch (error) {
    console.error('[actions/profiles] Erro ao buscar equipe:', error);
    throw new Error('Falha ao buscar equipe');
  }
}

export async function getProfileByIdAction(id: string) {
  const user = await getAuthUser();
  if (!user) throw new Error("NÃƒÂ£o autenticado");

  const sql = getDb();
  try {
    const profiles = await sql`
      SELECT *
      FROM profiles
      WHERE id = ${id}
      LIMIT 1
    `;
    return profiles[0] || null;
  } catch (error) {
    console.error('[actions/profiles] Erro ao buscar perfil:', error);
    throw new Error('Falha ao buscar perfil');
  }
}

export async function updateProfileAction(id: string, updateData: any) {
  const user = await getAuthUser();
  if (!user || (user.sub !== id && user.role !== 'admin' && user.role !== 'gestor')) {
    throw new Error("NÃƒÂ£o autorizado");
  }

  const sql = getDb();
  try {
    const keys = Object.keys(updateData);
    if (keys.length === 0) return null;
    
    const setQuery = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = Object.values(updateData);
    
    const result = await (sql as any).query(`UPDATE profiles SET ${setQuery} WHERE id = $${keys.length + 1} RETURNING *`, [...values, id]);
    
    return result[0];
  } catch (error) {
    console.error('[actions/profiles] Erro ao atualizar perfil:', error);
    throw new Error('Falha ao atualizar perfil');
  }
}