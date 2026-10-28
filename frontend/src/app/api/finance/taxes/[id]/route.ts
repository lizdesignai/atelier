// src/app/api/finance/taxes/[id]/route.ts
// Atualização de obrigação tributária (anexo de guia, marcação de pago, etc.).

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import {
  getTaxObligationById,
  updateTaxObligation,
  FinanceDomainError,
} from '@/lib/finance';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireFinanceAccess('manage_taxes');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const obligation = await getTaxObligationById(id);
    if (!obligation) {
      return NextResponse.json({ error: 'Obrigação fiscal não encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ obligation });
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/taxes/[id] GET]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireFinanceAccess('manage_taxes');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await req.json();

    const updated = await updateTaxObligation(id, body, auth.user!.sub);
    return NextResponse.json({ obligation: updated });
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
    console.error('[API /api/finance/taxes/[id] PATCH]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
