'use server'

import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { FINANCE_ROLES, STAFF_ROLES, PROJECT_FINANCIAL_WRITE_COLUMNS } from '@/lib/dbQueryPolicy';

function sanitizeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

export async function getProjectsAction() {
  const user = await getAuthUser();
  if (!user) throw new Error('Não autenticado');

  const sql = getDb();
  let projects;

  try {
    if (STAFF_ROLES.has(user.role)) {
      projects = await sql`
        SELECT p.*, json_build_object(
          'id', pr.id,
          'nome', pr.nome,
          'email', pr.email,
          'avatar_url', pr.avatar_url,
          'empresa', pr.empresa,
          'instagram', pr.instagram,
          'username', pr.username,
          'telefone', pr.telefone
        ) as profiles
        FROM projects p
        LEFT JOIN profiles pr ON p.client_id = pr.id
        WHERE p.status IN ('active', 'delivered', 'archived', 'completed', 'paused')
        ORDER BY p.created_at DESC
      `;
    } else {
      projects = await sql`
        SELECT p.*, json_build_object(
          'id', pr.id,
          'nome', pr.nome,
          'email', pr.email,
          'avatar_url', pr.avatar_url,
          'empresa', pr.empresa,
          'instagram', pr.instagram,
          'username', pr.username,
          'telefone', pr.telefone
        ) as profiles
        FROM projects p
        LEFT JOIN profiles pr ON p.client_id = pr.id
        WHERE p.status IN ('active', 'delivered', 'archived', 'completed', 'paused')
        AND p.client_id = ${user.sub}
        ORDER BY CASE WHEN p.status = 'active' THEN 0 ELSE 1 END, p.created_at DESC
      `;
    }

    return projects;
  } catch (error) {
    console.error('[actions/projects] Erro ao buscar projetos:', error);
    throw new Error('Falha ao buscar projetos');
  }
}

export async function updateProjectAction(id: string, updateData: Record<string, any>) {
  const user = await getAuthUser();
  if (!user || !STAFF_ROLES.has(user.role)) {
    throw new Error('Não autorizado');
  }

  const keys = Object.keys(updateData || {}).filter((k) => Boolean(sanitizeId(k)));
  if (keys.length === 0) return null;

  const hasFinancialCol = keys.some((k) => PROJECT_FINANCIAL_WRITE_COLUMNS.has(k));
  if (hasFinancialCol && !FINANCE_ROLES.has(user.role)) {
    throw new Error('Apenas o financeiro/gestão pode alterar dados contratuais e financeiros do projeto.');
  }

  const sql = getDb();
  try {
    const setQuery = keys.map((k, i) => `"${sanitizeId(k)}" = $${i + 1}`).join(', ');
    const values = keys.map((k) => updateData[k]);

    const result = await (sql as any).query(
      `UPDATE projects SET ${setQuery} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );

    return result[0];
  } catch (error) {
    console.error('[actions/projects] Erro ao atualizar projeto:', error);
    throw new Error('Falha ao atualizar projeto');
  }
}

export async function getProjectByIdAction(id: string) {
  const user = await getAuthUser();
  if (!user) throw new Error('Não autenticado');

  const sql = getDb();
  try {
    const result = await sql`
      SELECT p.*, json_build_object(
        'id', pr.id,
        'nome', pr.nome,
        'email', pr.email,
        'avatar_url', pr.avatar_url,
        'empresa', pr.empresa,
        'instagram', pr.instagram,
        'username', pr.username,
        'telefone', pr.telefone
      ) as profiles
      FROM projects p
      LEFT JOIN profiles pr ON p.client_id = pr.id
      WHERE p.id = ${id}
    `;
    const row = result[0] || null;
    if (row && !STAFF_ROLES.has(user.role) && String(row.client_id) !== String(user.sub)) {
      throw new Error('Não autorizado');
    }
    return row;
  } catch (error) {
    console.error('[actions/projects] Erro ao buscar projeto por ID:', error);
    throw new Error('Falha ao buscar projeto');
  }
}
