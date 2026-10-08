"use server";

import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export async function getClientActiveProjectAction() {
  const user = await getAuthUser();
  if (!user) throw new Error("Não autenticado");

  const sql = getDb();
  try {
    const data = await sql`
      SELECT * FROM projects
      WHERE client_id = ${user.sub}
      AND status IN ('active', 'delivered', 'completed')
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return data[0] || null;
  } catch (error) {
    console.error('[actions/clientProject] Erro:', error);
    throw new Error('Falha ao buscar projeto ativo');
  }
}

export async function submitClientReviewAction(projectId: string, decision: string, feedback: string) {
  const user = await getAuthUser();
  if (!user) throw new Error('Não autenticado');
  const sql = getDb();
  try {
    const nextPhase = decision === 'approve' ? 'deliver' : 'refine';
    await sql`UPDATE projects SET idv_phase = ${nextPhase}, fase = ${nextPhase} WHERE id = ${projectId} AND client_id = ${user.sub}`;
    return { success: true, nextPhase };
  } catch (error) {
    console.error(error);
    throw new Error('Falha ao enviar revisão');
  }
}
