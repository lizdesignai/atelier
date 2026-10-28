// src/app/api/finance/invoices/[id]/route.ts
// Consulta detalhada e atualização de notas fiscais.

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import {
  getInvoiceById,
  updateInvoice,
  FinanceDomainError,
} from '@/lib/finance';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireFinanceAccess('manage_invoices');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const invoice = await getInvoiceById(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Nota fiscal não encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/invoices/[id] GET]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireFinanceAccess('manage_invoices');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await req.json();

    const updated = await updateInvoice(id, body, auth.user!.sub);
    return NextResponse.json({ invoice: updated });
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
    console.error('[API /api/finance/invoices/[id] PATCH]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
