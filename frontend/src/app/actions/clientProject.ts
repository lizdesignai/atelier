"use server";

import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { getProductTypeFromProject, getProductRedirectUrl, ProductType } from '@/lib/productHelper';

export async function getClientActiveProjectAction() {
  const user = await getAuthUser();
  if (!user) throw new Error("Não autenticado");

  const sql = getDb();
  try {
    const data = await sql`
      SELECT * FROM projects
      WHERE client_id = ${user.sub}
      AND status IN ('active', 'delivered', 'completed')
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC
      LIMIT 1
    `;
    const project = data[0] || null;
    if (project) {
      if (project.idv_phase === 'discover' || project.idv_phase === 'onboarding' || !project.idv_phase) {
        const tasks = await sql`
          SELECT stage, status FROM tasks 
          WHERE project_id = ${project.id}
        `;
        if (tasks.length > 0) {
          const discoverTasks = tasks.filter((t: any) => ['onboarding', 'discover'].includes(t.stage));
          const allDiscoverDone = discoverTasks.length > 0 && discoverTasks.every((t: any) => 
            ['completed', 'done', 'approved', 'archived'].includes(t.status)
          );
          if (allDiscoverDone) {
            await sql`
              UPDATE projects 
              SET idv_phase = 'define', fase = 'direcionamento' 
              WHERE id = ${project.id}
            `;
            project.idv_phase = 'define';
            project.fase = 'direcionamento';
          }
        }
      }
    }
    return project;
  } catch (error) {
    console.error('[actions/clientProject] Erro:', error);
    throw new Error('Falha ao buscar projeto ativo');
  }
}

export async function getClientProductInfoAction() {
  const user = await getAuthUser();
  if (!user) return { productType: 'idv' as ProductType, redirectUrl: '/', project: null };

  const project = await getClientActiveProjectAction();
  const productType = getProductTypeFromProject(project);
  const redirectUrl = getProductRedirectUrl(productType);

  return { productType, redirectUrl, project };
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
