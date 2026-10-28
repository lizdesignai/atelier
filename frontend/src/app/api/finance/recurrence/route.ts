// src/app/api/finance/recurrence/route.ts
// Gerenciamento e Sincronização de Receitas e Contratos Recorrentes do Bills & Payments.

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import { generateMonthlyRecurringEntries } from '@/lib/finance/recurrenceService';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireFinanceAccess('view_financial');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const targetMonth = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const sql = getDb();

    // Busca todos os contratos/projetos ativos com dados dos clientes
    const activeContracts = await sql`
      SELECT
        p.id AS project_id,
        p.client_id,
        p.service_type,
        p.billing_date,
        p.payment_recurrence,
        p.payment_method,
        COALESCE(p.financial_value, 0)::numeric(14,2) AS financial_value,
        c.nome AS client_name,
        c.email AS client_email,
        c.empresa AS client_empresa,
        e.id AS provisioned_entry_id,
        e.status AS provisioned_entry_status,
        e.amount AS provisioned_entry_amount,
        e.due_date AS provisioned_entry_due_date
      FROM projects p
      LEFT JOIN profiles c ON c.id = p.client_id
      LEFT JOIN fin_entries e ON e.external_ref = 'recurring_proj_' || p.id || '_' || ${targetMonth}
      WHERE p.status = 'active'
      ORDER BY c.nome ASC NULLS LAST;
    `;

    const totalMRR = activeContracts
      .filter((c: any) => c.payment_recurrence?.toLowerCase().includes('mensal') || c.payment_recurrence?.toLowerCase().includes('recorrente'))
      .reduce((acc: number, c: any) => acc + Number(c.financial_value || 0), 0);

    return NextResponse.json({
      month: targetMonth,
      total_active_projects: activeContracts.length,
      total_mrr: totalMRR,
      contracts: activeContracts,
    });
  } catch (error: any) {
    console.error('[API /api/finance/recurrence GET]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireFinanceAccess('create_adhoc_service');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let targetMonth: string | undefined;
    try {
      const body = await req.json();
      if (body?.month) targetMonth = body.month;
    } catch {
      // Body vazio é aceitável, assume mês corrente
    }

    const result = await generateMonthlyRecurringEntries(targetMonth);
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('[API /api/finance/recurrence POST]', error);
    return NextResponse.json({ error: error.message || 'Erro ao sincronizar recorrência.' }, { status: 500 });
  }
}
