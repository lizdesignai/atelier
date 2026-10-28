'use server'

import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import {
  MANAGEMENT_ONLY_PROFILE_WRITE_COLUMNS,
  MANAGEMENT_ROLES,
  NEVER_WRITE_PROFILE_AUTH_COLUMNS,
  STAFF_ROLES,
  sanitizeQueryResult,
} from '@/lib/dbQueryPolicy';

function sanitizeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

export async function getTeamProfilesAction() {
  const user = await getAuthUser();
  if (!user) throw new Error('Não autenticado');

  const sql = getDb();
  try {
    const team = await sql`
      SELECT id, nome, avatar_url, role, current_mood, current_song_id, email, empresa, cargo, skills
      FROM profiles
      WHERE role IN ('admin', 'gestor', 'colaborador', 'contador')
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
  if (!user) throw new Error('Não autenticado');

  // Clientes só podem consultar o próprio perfil completo por esta action
  if (!STAFF_ROLES.has(user.role) && String(user.sub) !== String(id)) {
    throw new Error('Não autorizado');
  }

  const sql = getDb();
  try {
    const profiles = await sql`
      SELECT *
      FROM profiles
      WHERE id = ${id}
      LIMIT 1
    `;
    const row = profiles[0] || null;
    return sanitizeQueryResult('profiles', row, user.role, user.sub);
  } catch (error) {
    console.error('[actions/profiles] Erro ao buscar perfil:', error);
    throw new Error('Falha ao buscar perfil');
  }
}

export async function updateProfileAction(id: string, updateData: Record<string, any>) {
  const user = await getAuthUser();
  if (!user || (String(user.sub) !== String(id) && !MANAGEMENT_ROLES.has(user.role))) {
    throw new Error('Não autorizado');
  }

  const rawKeys = Object.keys(updateData || {});
  const allowedKeys = rawKeys.filter((k) => {
    const clean = sanitizeId(k);
    if (!clean) return false;
    if (NEVER_WRITE_PROFILE_AUTH_COLUMNS.has(clean)) return false;
    if (MANAGEMENT_ONLY_PROFILE_WRITE_COLUMNS.has(clean) && !MANAGEMENT_ROLES.has(user.role)) {
      return false;
    }
    return true;
  });

  if (allowedKeys.length === 0) return null;

  const sql = getDb();
  try {
    const setQuery = allowedKeys.map((k, i) => `"${sanitizeId(k)}" = $${i + 1}`).join(', ');
    const values = allowedKeys.map((k) => updateData[k]);

    const result = await (sql as any).query(
      `UPDATE profiles SET ${setQuery} WHERE id = $${allowedKeys.length + 1} RETURNING *`,
      [...values, id]
    );

    return sanitizeQueryResult('profiles', result[0] || null, user.role, user.sub);
  } catch (error) {
    console.error('[actions/profiles] Erro ao atualizar perfil:', error);
    throw new Error('Falha ao atualizar perfil');
  }
}
