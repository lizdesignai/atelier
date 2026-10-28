// src/app/api/finance/entries/[id]/route.ts
// Operações detalhadas, edição de datas/valores e exclusão de lançamentos.

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import {
  getEntryById,
  updateEntry,
  deleteEntry,
  FinanceDomainError,
} from '@/lib/finance';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireFinanceAccess('view_financial');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const entry = await getEntryById(id);

    if (!entry) {
      return NextResponse.json({ error: 'Lançamento não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/entries/[id] GET]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireFinanceAccess('edit_payment_date_value');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await req.json();

    const updated = await updateEntry(id, body, auth.user!.sub);
    return NextResponse.json({ entry: updated });
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos.', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[API /api/finance/entries/[id] PATCH]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireFinanceAccess('delete_entry');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body?.reason;

    await deleteEntry(id, auth.user!.sub, reason);
    return NextResponse.json({ success: true, message: 'Lançamento removido com sucesso.' });
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/entries/[id] DELETE]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
