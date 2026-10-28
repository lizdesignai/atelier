// src/app/api/finance/growth/route.ts
// Inteligência de crescimento, rentabilidade por serviço e direcionamento de investimentos.

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import { getGrowthIntelligence, FinanceDomainError } from '@/lib/finance';

export async function GET() {
  try {
    const auth = await requireFinanceAccess('view_financial');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const growth = await getGrowthIntelligence();
    return NextResponse.json(growth);
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/growth GET]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
