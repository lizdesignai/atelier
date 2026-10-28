// src/app/api/finance/periods/[month]/reopen/route.ts
// Reabertura de período contábil consolidado (exclusivo para role 'admin' via RBAC).

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import { reopenPeriod, FinanceDomainError } from '@/lib/finance';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const auth = await requireFinanceAccess('reopen_period');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { month } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body?.reason;

    const reopened = await reopenPeriod({
      closingMonth: month,
      userId: auth.user!.sub,
      reason,
    });

    return NextResponse.json({ period: reopened });
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/periods/[month]/reopen POST]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
