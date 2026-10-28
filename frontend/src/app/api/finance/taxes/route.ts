// src/app/api/finance/taxes/route.ts
// Calendário de obrigações tributárias e guias de recolhimento (DAS, ISS, etc.).

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import {
  listTaxObligations,
  createTaxObligation,
  FinanceDomainError,
} from '@/lib/finance';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireFinanceAccess('manage_taxes');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const competence = searchParams.get('competence') || undefined;
    const status = searchParams.get('status') || undefined;
    const tax_type = searchParams.get('tax_type') || undefined;

    const obligations = await listTaxObligations({
      competence,
      status,
      tax_type,
    });

    return NextResponse.json({ obligations });
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/taxes GET]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireFinanceAccess('manage_taxes');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const obligation = await createTaxObligation(body, auth.user!.sub);
    return NextResponse.json({ obligation }, { status: 201 });
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
    console.error('[API /api/finance/taxes POST]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
