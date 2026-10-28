// src/app/api/finance/entries/route.ts
// Endpoint para listagem filtrada e criação de lançamentos financeiros.

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import {
  listEntries,
  createEntry,
  createEntrySchema,
  FinanceDomainError,
} from '@/lib/finance';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireFinanceAccess('view_financial');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const kind = searchParams.get('kind') as 'revenue' | 'expense' | null;
    const status = searchParams.get('status') || undefined;
    const account_id = searchParams.get('account_id') || undefined;
    const supplier_id = searchParams.get('supplier_id') || undefined;
    const client_id = searchParams.get('client_id') || undefined;
    const project_id = searchParams.get('project_id') || undefined;
    const agency_id = searchParams.get('agency_id') || undefined;
    const source = searchParams.get('source') || undefined;
    const competence_month = searchParams.get('competence_month') || undefined;
    const due_month = searchParams.get('due_month') || undefined;
    const start_date = searchParams.get('start_date') || undefined;
    const end_date = searchParams.get('end_date') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;

    const result = await listEntries({
      kind: kind || undefined,
      status,
      account_id,
      supplier_id,
      client_id,
      project_id,
      agency_id,
      source,
      competence_month,
      due_month,
      start_date,
      end_date,
      search,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/entries GET]', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kind = body?.kind;

    const requiredCap = kind === 'revenue' ? 'create_adhoc_service' : 'create_outflow';
    const auth = await requireFinanceAccess(requiredCap);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const entry = await createEntry(body, auth.user!.sub);
    return NextResponse.json({ entry }, { status: 201 });
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
    console.error('[API /api/finance/entries POST]', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
