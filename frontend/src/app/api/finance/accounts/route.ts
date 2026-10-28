// src/app/api/finance/accounts/route.ts
// Consulta de Plano de Contas, Contas Bancárias e Fornecedores / Prestadores.

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import {
  listAccounts,
  listBankAccounts,
  listSuppliers,
  listClients,
  createSupplier,
  FinanceDomainError,
} from '@/lib/finance';

export async function GET() {
  try {
    const auth = await requireFinanceAccess('view_financial');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [accounts, bankAccounts, suppliers, clients] = await Promise.all([
      listAccounts(),
      listBankAccounts(),
      listSuppliers(),
      listClients(),
    ]);

    return NextResponse.json({
      accounts,
      bank_accounts: bankAccounts,
      suppliers,
      clients,
    });
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/accounts GET]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireFinanceAccess('create_outflow');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    if (!body?.name) {
      return NextResponse.json({ error: 'Nome do fornecedor é obrigatório.' }, { status: 400 });
    }

    const supplier = await createSupplier(body);
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/accounts POST]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
