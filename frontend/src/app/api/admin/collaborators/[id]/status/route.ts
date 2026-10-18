import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'admin' && user.role !== 'gestor')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id: memberId } = await params;
    if (!memberId) {
      return NextResponse.json({ error: 'ID do colaborador não fornecido' }, { status: 400 });
    }

    const body = await request.json();
    const { contract_status } = body;

    if (!contract_status || !['active', 'paused', 'dismissed'].includes(contract_status)) {
      return NextResponse.json(
        { error: 'Status de contrato inválido. Valores permitidos: active, paused, dismissed' },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Se o colaborador for demitido ('dismissed'), também marcamos current_status como 'offline'
    let updated;
    if (contract_status === 'dismissed') {
      updated = await sql`
        UPDATE profiles
        SET contract_status = ${contract_status}, current_status = 'offline'
        WHERE id = ${memberId}
        RETURNING id, nome, email, role, contract_status, current_status
      `;
    } else {
      updated = await sql`
        UPDATE profiles
        SET contract_status = ${contract_status}
        WHERE id = ${memberId}
        RETURNING id, nome, email, role, contract_status, current_status
      `;
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    // Limpar cache do backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
    try {
      await fetch(`${backendUrl}/api/v1/analytics/clear-cache`, { method: 'POST' }).catch(() => {});
    } catch {}

    const actionLabel = contract_status === 'dismissed' 
      ? 'Colaborador demitido/desligado com sucesso.' 
      : contract_status === 'paused'
      ? 'Contrato do colaborador pausado por sazonalidade.'
      : 'Colaborador reativado na equipe com sucesso.';

    return NextResponse.json({
      success: true,
      message: actionLabel,
      data: {
        collaborator: updated[0]
      }
    });

  } catch (error: any) {
    console.error('[api/admin/collaborators/status] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao alterar status do colaborador' },
      { status: 500 }
    );
  }
}
