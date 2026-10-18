import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'admin' && user.role !== 'gestor')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'ID do projeto não fornecido' }, { status: 400 });
    }

    const sql = getDb();

    // Reativar projeto: status = 'active', delivered_at = null
    const updatedProjects = await sql`
      UPDATE projects 
      SET status = 'active', delivered_at = NULL 
      WHERE id = ${projectId} 
      RETURNING id, client_id, status, service_type, type
    `;

    if (!updatedProjects || updatedProjects.length === 0) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    // Limpar cache do backend se existir
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
    try {
      await fetch(`${backendUrl}/api/v1/analytics/clear-cache`, { method: 'POST' }).catch(() => {});
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Projeto reativado com sucesso.',
      data: {
        project: updatedProjects[0]
      }
    });

  } catch (error: any) {
    console.error('[api/projects/reactivate] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao reativar projeto' },
      { status: 500 }
    );
  }
}
