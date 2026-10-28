// src/lib/finance/periodsService.ts
// Gerenciamento e trava de períodos contábeis/fechamentos mensais (fin_periods).

import { getDb } from '../db';
import { PeriodClosedError, FinanceDomainError } from './errors';
import { logFinanceAudit } from './auditService';
import type { FinPeriod } from '../../types/finance';

export function extractMonth(dateStr: string): string {
  if (!dateStr || dateStr.length < 7) {
    throw new FinanceDomainError(`Data inválida fornecida: ${dateStr}`);
  }
  return dateStr.substring(0, 7);
}

export async function checkPeriodOpen(dateStr: string): Promise<void> {
  const month = extractMonth(dateStr);
  const sql = getDb();

  const rows = await sql`
    SELECT status, closing_month
    FROM fin_periods
    WHERE closing_month = ${month}
    LIMIT 1
  `;

  if (rows.length > 0 && rows[0].status === 'closed') {
    throw new PeriodClosedError(month);
  }
}

export async function listPeriods(): Promise<FinPeriod[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT *
    FROM fin_periods
    ORDER BY closing_month DESC
  `;
  return rows as unknown as FinPeriod[];
}

export async function getPeriod(closingMonth: string): Promise<FinPeriod | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT *
    FROM fin_periods
    WHERE closing_month = ${closingMonth}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return rows[0] as unknown as FinPeriod;
}

export async function closePeriod(input: {
  closingMonth: string;
  userId: string;
  notes?: string | null;
}): Promise<FinPeriod> {
  const { closingMonth, userId, notes } = input;

  if (!/^\d{4}-\d{2}$/.test(closingMonth)) {
    throw new FinanceDomainError('Formato de mês inválido. Utilize YYYY-MM.');
  }

  const sql = getDb();

  // Consolidação de receitas e despesas com competência no mês
  const summaryRows = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN kind = 'revenue' AND status != 'cancelled' THEN amount ELSE 0 END), 0) AS total_revenue,
      COALESCE(SUM(CASE WHEN kind = 'expense' AND status != 'cancelled' THEN amount ELSE 0 END), 0) AS total_expenses,
      COALESCE(SUM(CASE WHEN kind = 'revenue' AND status = 'paid' THEN amount_paid ELSE 0 END), 0) AS paid_revenue,
      COALESCE(SUM(CASE WHEN kind = 'expense' AND status = 'paid' THEN amount_paid ELSE 0 END), 0) AS paid_expenses
    FROM fin_entries
    WHERE TO_CHAR(competence_date, 'YYYY-MM') = ${closingMonth}
  `;

  const totalRevenue = Number(summaryRows[0].total_revenue || 0);
  const totalExpenses = Number(summaryRows[0].total_expenses || 0);
  const netResult = Number((totalRevenue - totalExpenses).toFixed(2));

  // EBITDA aproximado (receitas operacionais - custos diretos e despesas operacionais sem juros e depreciação)
  const ebitda = netResult;
  const ebitdaMargin = totalRevenue > 0 ? Number(((ebitda / totalRevenue) * 100).toFixed(2)) : 0;

  // Detalhamento por conta contábil para o snapshot imutável
  const breakdownRows = await sql`
    SELECT
      a.code,
      a.name,
      a.type,
      a.statement_group,
      COALESCE(SUM(e.amount), 0) AS total_amount
    FROM fin_entries e
    JOIN fin_accounts a ON a.id = e.account_id
    WHERE TO_CHAR(e.competence_date, 'YYYY-MM') = ${closingMonth}
      AND e.status != 'cancelled'
    GROUP BY a.code, a.name, a.type, a.statement_group
    ORDER BY a.code ASC
  `;

  const snapshotData = {
    consolidated_at: new Date().toISOString(),
    closed_by: userId,
    metrics: {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_result: netResult,
      ebitda,
      ebitda_margin: ebitdaMargin,
    },
    accounts_breakdown: breakdownRows,
  };

  const periodRows = await sql`
    INSERT INTO fin_periods (
      closing_month,
      status,
      closed_at,
      closed_by,
      total_revenue,
      total_expenses,
      net_result,
      ebitda,
      ebitda_margin,
      snapshot_data,
      notes
    ) VALUES (
      ${closingMonth},
      'closed',
      NOW(),
      ${userId},
      ${totalRevenue},
      ${totalExpenses},
      ${netResult},
      ${ebitda},
      ${ebitdaMargin},
      ${JSON.stringify(snapshotData)},
      ${notes || null}
    )
    ON CONFLICT (closing_month) DO UPDATE SET
      status = 'closed',
      closed_at = NOW(),
      closed_by = EXCLUDED.closed_by,
      total_revenue = EXCLUDED.total_revenue,
      total_expenses = EXCLUDED.total_expenses,
      net_result = EXCLUDED.net_result,
      ebitda = EXCLUDED.ebitda,
      ebitda_margin = EXCLUDED.ebitda_margin,
      snapshot_data = EXCLUDED.snapshot_data,
      notes = EXCLUDED.notes
    RETURNING *
  `;

  const period = periodRows[0] as unknown as FinPeriod;

  await logFinanceAudit({
    entity_type: 'fin_periods',
    entity_id: period.id,
    action: 'close',
    after_state: { closing_month: closingMonth, status: 'closed', net_result: netResult },
    reason: notes || `Fechamento e consolidação contábil do mês ${closingMonth}`,
    user_id: userId,
  });

  return period;
}

export async function reopenPeriod(input: {
  closingMonth: string;
  userId: string;
  reason: string;
}): Promise<FinPeriod> {
  const { closingMonth, userId, reason } = input;

  if (!reason || reason.trim().length < 10) {
    throw new FinanceDomainError(
      'A reabertura de um período contábil consolidado exige justificativa formal com no mínimo 10 caracteres.'
    );
  }

  const existing = await getPeriod(closingMonth);
  if (!existing) {
    throw new FinanceDomainError(`Período ${closingMonth} não foi encontrado.`);
  }

  if (existing.status === 'open') {
    return existing;
  }

  const sql = getDb();
  const rows = await sql`
    UPDATE fin_periods
    SET
      status = 'open',
      reopened_at = NOW(),
      reopened_by = ${userId}
    WHERE closing_month = ${closingMonth}
    RETURNING *
  `;

  const updated = rows[0] as unknown as FinPeriod;

  await logFinanceAudit({
    entity_type: 'fin_periods',
    entity_id: updated.id,
    action: 'reopen',
    before_state: { closing_month: closingMonth, status: 'closed' },
    after_state: { closing_month: closingMonth, status: 'open' },
    reason,
    user_id: userId,
  });

  return updated;
}
