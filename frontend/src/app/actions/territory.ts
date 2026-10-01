'use server';

import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export async function getTerritoryEvaluationAction(projectId: string) {
  const user = await getAuthUser();
  if (!user) throw new Error("Não autenticado");

  const sql = getDb();
  try {
    const data = await sql`
      SELECT * FROM territory_evaluations
      WHERE project_id = ${projectId}
      AND status IN ('pending', 'evaluated', 'approved')
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return data[0] || null;
  } catch (error) {
    console.error('[actions/territory] Erro:', error);
    throw new Error('Falha ao buscar territórios');
  }
}

export async function submitTerritoryEvaluationAction(evaluationId: string, chosenTerritoryId: string, feedback: string) {
  const user = await getAuthUser();
  if (!user) throw new Error("Não autenticado");

  const sql = getDb();
  try {
    const data = await sql`
      UPDATE territory_evaluations
      SET chosen_territory_id = ${chosenTerritoryId},
          feedback = ${feedback},
          status = 'evaluated',
          updated_at = now()
      WHERE id = ${evaluationId}
      RETURNING *
    `;
    return data[0];
  } catch (error) {
    console.error('[actions/territory] Erro ao salvar:', error);
    throw new Error('Falha ao salvar avaliação');
  }
}

export async function createTerritoryEvaluationAction(projectId: string, territories: any[], taskId?: string) {
  const user = await getAuthUser();
  if (!user || (user.role !== 'admin' && user.role !== 'gestor' && user.role !== 'colaborador')) throw new Error("Não autorizado");

  const sql = getDb();
  try {
    const status = (user.role === 'admin' || user.role === 'gestor') ? 'pending' : 'draft';
    const data = await sql`
      INSERT INTO territory_evaluations (project_id, territories, status, task_id)
      VALUES (${projectId}, ${JSON.stringify(territories)}, ${status}, ${taskId || null})
      RETURNING *
    `;
    return data[0];
  } catch (error) {
    console.error('[actions/territory] Erro ao criar:', error);
    throw new Error('Falha ao criar territórios');
  }
}

export async function approveTerritoryEvaluationAction(evaluationId: string) {
  const user = await getAuthUser();
  if (!user || (user.role !== 'admin' && user.role !== 'gestor')) throw new Error("Não autorizado");

  const sql = getDb();
  try {
    const data = await sql`
      UPDATE territory_evaluations
      SET status = 'pending',
          updated_at = now()
      WHERE id = ${evaluationId}
      RETURNING *
    `;
    return data[0];
  } catch (error) {
    console.error('[actions/territory] Erro ao aprovar:', error);
    throw new Error('Falha ao aprovar territórios');
  }
}

export async function getAdminTerritoryEvaluationsAction(projectId: string) {
  const user = await getAuthUser();
  if (!user || (user.role !== 'admin' && user.role !== 'gestor' && user.role !== 'colaborador')) throw new Error("Não autorizado");

  const sql = getDb();
  try {
    const data = await sql`
      SELECT * FROM territory_evaluations
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC
    `;
    return data;
  } catch (error) {
    console.error('[actions/territory] Erro ao buscar:', error);
    throw new Error('Falha ao buscar territórios');
  }
}
