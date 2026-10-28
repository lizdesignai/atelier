// src/app/api/finance/settlements/[id]/route.ts
// Estorno de baixa / liquidação financeira com motivo obrigatório.

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import { deleteSettlement, FinanceDomainError } from '@/lib/finance';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireFinanceAccess('edit_payment_date_value');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body?.reason;

    const result = await deleteSettlement(id, auth.user!.sub, reason);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/settlements/[id] DELETE]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
