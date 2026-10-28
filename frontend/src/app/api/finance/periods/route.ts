// src/app/api/finance/periods/route.ts
// Histórico de fechamentos contábeis e consolidação de mês (fin_periods).

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import {
  listPeriods,
  closePeriod,
  FinanceDomainError,
} from '@/lib/finance';

export async function GET() {
  try {
    const auth = await requireFinanceAccess('view_financial');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const periods = await listPeriods();
    return NextResponse.json({ periods });
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/periods GET]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireFinanceAccess('close_period');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { closing_month, notes } = body;

    if (!closing_month) {
      return NextResponse.json({ error: 'Campo closing_month (YYYY-MM) é obrigatório.' }, { status: 400 });
    }

    const period = await closePeriod({
      closingMonth: closing_month,
      userId: auth.user!.sub,
      notes,
    });

    return NextResponse.json({ period }, { status: 201 });
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/periods POST]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
