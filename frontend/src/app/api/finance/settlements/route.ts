// src/app/api/finance/settlements/route.ts
// Baixas e liquidações parciais/totais de lançamentos.

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import {
  createSettlement,
  listSettlementsByEntryId,
  FinanceDomainError,
} from '@/lib/finance';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireFinanceAccess('view_financial');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const entryId = searchParams.get('entry_id');
    if (!entryId) {
      return NextResponse.json({ error: 'Parâmetro entry_id é obrigatório.' }, { status: 400 });
    }

    const settlements = await listSettlementsByEntryId(entryId);
    return NextResponse.json({ settlements });
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/settlements GET]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireFinanceAccess('edit_payment_date_value');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const result = await createSettlement(body, auth.user!.sub);
    return NextResponse.json(result, { status: 201 });
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
    console.error('[API /api/finance/settlements POST]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
