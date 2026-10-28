// src/app/api/finance/valuation/route.ts
// Análise e simulação de Valuation da empresa e múltiplos de EBITDA/ARR (Fase 6).

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import {
  getValuationAnalysis,
  saveValuationScenario,
  FinanceDomainError,
} from '@/lib/finance';

export async function GET() {
  try {
    const auth = await requireFinanceAccess('view_financial');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const valuation = await getValuationAnalysis();
    return NextResponse.json(valuation);
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/valuation GET]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireFinanceAccess('manage_valuation_parameters');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const scenario = await saveValuationScenario(body, auth.user!.sub);
    return NextResponse.json({ scenario }, { status: 201 });
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/valuation POST]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
