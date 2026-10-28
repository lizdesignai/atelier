// src/app/api/finance/invoices/route.ts
// Gerenciamento de Notas Fiscais de entrada e saída.

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import {
  listInvoices,
  createInvoice,
  FinanceDomainError,
} from '@/lib/finance';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireFinanceAccess('manage_invoices');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const direction = searchParams.get('direction') as 'issued' | 'received' | null;
    const status = searchParams.get('status') || undefined;
    const client_id = searchParams.get('client_id') || undefined;
    const supplier_id = searchParams.get('supplier_id') || undefined;

    const invoices = await listInvoices({
      direction: direction || undefined,
      status,
      client_id,
      supplier_id,
    });

    return NextResponse.json({ invoices });
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/invoices GET]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireFinanceAccess('manage_invoices');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const invoice = await createInvoice(body, auth.user!.sub);
    return NextResponse.json({ invoice }, { status: 201 });
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
    console.error('[API /api/finance/invoices POST]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
