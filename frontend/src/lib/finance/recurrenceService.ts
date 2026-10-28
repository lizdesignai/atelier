// src/lib/finance/recurrenceService.ts
// Motor de Geração Automática de Faturamento Recorrente e Mensalidades (Fase 7).

import { getDb } from '../db';
import { logFinanceAudit } from './auditService';
import type { FinEntry } from '../../types/finance';

export interface RecurrenceGenerationResult {
  competenceMonth: string;
  totalActiveContracts: number;
  generatedCount: number;
  skippedCount: number;
  totalAmountProvisioned: number;
  generatedEntries: Array<{
    entryId: string;
    projectId: string;
    clientName: string;
    amount: number;
    dueDate: string;
  }>;
}

/**
 * Normaliza o dia de vencimento a partir do campo billing_date do projeto.
 * Se o projeto indicar '10', '15', '2026-10-15', extrai o dia; padrão é dia 10.
 */
export function extractBillingDay(billingDateRaw?: any): number {
  if (!billingDateRaw) return 10;

  // Se for objeto Date retornado pelo driver Postgres
  if (billingDateRaw instanceof Date) {
    return billingDateRaw.getUTCDate() || billingDateRaw.getDate() || 10;
  }

  const trimmed = String(billingDateRaw).trim();
  // Se for apenas número (ex: "5", "10", "20")
  const numericOnly = Number(trimmed);
  if (!isNaN(numericOnly) && numericOnly >= 1 && numericOnly <= 31) {
    return Math.floor(numericOnly);
  }

  // Se for data no formato ISO (ex: "2026-10-15")
  const dateMatch = trimmed.match(/^\d{4}-\d{2}-(\d{2})/);
  if (dateMatch) {
    const day = Number(dateMatch[1]);
    if (day >= 1 && day <= 31) return day;
  }

  return 10;
}

/**
 * Gera lançamentos provisionados para todos os contratos ativos recorrentes
 * para a competência indicada (padrão: mês corrente).
 * É estritamente idempotente via external_ref: 'recurring_proj_<id>_<YYYY-MM>'.
 */
export async function generateMonthlyRecurringEntries(
  competenceMonth?: string
): Promise<RecurrenceGenerationResult> {
  const sql = getDb();

  const targetMonth = competenceMonth || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
    throw new Error('FORMATO_COMPETENCIA_INVALIDO: esperado YYYY-MM');
  }

  const competenceDate = `${targetMonth}-01`;

  // 1. Busca todos os projetos ativos recorrentes com valor financeiro
  const activeContracts = await sql`
    SELECT
      p.id,
      p.client_id,
      p.service_type,
      p.billing_date,
      p.payment_recurrence,
      COALESCE(p.financial_value, 0)::numeric(14,2) AS financial_value,
      c.nome AS client_name
    FROM projects p
    LEFT JOIN profiles c ON c.id = p.client_id
    WHERE p.status = 'active'
      AND (
        p.payment_recurrence ILIKE '%mensal%'
        OR p.payment_recurrence ILIKE '%recorrente%'
        OR p.payment_recurrence ILIKE '%retainer%'
      )
      AND COALESCE(p.financial_value, 0) > 0
    ORDER BY p.created_at ASC
  `;

  // 2. Busca conta contábil de receita (tipo 'revenue', ex: 1.1.01)
  const revenueAccounts = await sql`
    SELECT id FROM fin_accounts
    WHERE type = 'revenue' AND is_active = TRUE
    ORDER BY code ASC
    LIMIT 1
  `;
  if (revenueAccounts.length === 0) {
    throw new Error('CONFIGURACAO_AUSENTE: Nenhuma conta de receita cadastrada em fin_accounts');
  }
  const revenueAccountId = revenueAccounts[0].id;

  // 3. Busca conta bancária padrão
  const bankAccounts = await sql`
    SELECT id FROM fin_bank_accounts
    WHERE is_default = TRUE AND is_active = TRUE
    LIMIT 1
  `;
  const defaultBankAccountId = bankAccounts.length > 0 ? bankAccounts[0].id : null;

  let generatedCount = 0;
  let skippedCount = 0;
  let totalAmountProvisioned = 0;
  const generatedEntries: RecurrenceGenerationResult['generatedEntries'] = [];

  for (const contract of activeContracts) {
    const projectId = contract.id;
    const clientName = contract.client_name || 'Cliente Atelier';
    const serviceType = contract.service_type || 'Gestão Recorrente';
    const contractValue = Number(contract.financial_value);
    const extRef = `recurring_proj_${projectId}_${targetMonth}`;

    // 4. Checagem de idempotência
    const existing = await sql`
      SELECT id FROM fin_entries WHERE external_ref = ${extRef} LIMIT 1
    `;

    if (existing.length > 0) {
      skippedCount++;
      continue;
    }

    // 5. Cálculo do dia de vencimento
    const billingDay = extractBillingDay(contract.billing_date);
    const formattedDay = String(billingDay).padStart(2, '0');
    const dueDate = `${targetMonth}-${formattedDay}`;

    const title = `Mensalidade — ${clientName} (${serviceType})`;
    const description = `Faturamento recorrente referente à competência ${targetMonth}`;

    // 6. Inserção do lançamento financeiro em fin_entries
    const inserted = await sql`
      INSERT INTO fin_entries (
        kind,
        source,
        title,
        description,
        account_id,
        bank_account_id,
        client_id,
        project_id,
        competence_date,
        due_date,
        amount,
        amount_paid,
        status,
        payment_method,
        external_ref,
        notes
      ) VALUES (
        'revenue',
        'contract',
        ${title},
        ${description},
        ${revenueAccountId},
        ${defaultBankAccountId},
        ${contract.client_id},
        ${projectId},
        ${competenceDate},
        ${dueDate},
        ${contractValue},
        0.00,
        'pending',
        'boleto',
        ${extRef},
        'Gerado automaticamente pelo motor de recorrência mensal'
      )
      RETURNING id
    `;

    const entryId = inserted[0].id;
    generatedCount++;
    totalAmountProvisioned += contractValue;

    generatedEntries.push({
      entryId,
      projectId,
      clientName,
      amount: contractValue,
      dueDate,
    });

    // 7. Auditoria contábil
    await logFinanceAudit({
      entity_type: 'fin_entries',
      entity_id: entryId,
      action: 'insert',
      after_state: {
        project_id: projectId,
        competence_month: targetMonth,
        amount: contractValue,
        due_date: dueDate,
      },
      reason: `Provisionamento automático de mensalidade recorrente (${targetMonth})`,
      user_id: contract.client_id,
    });
  }

  return {
    competenceMonth: targetMonth,
    totalActiveContracts: activeContracts.length,
    generatedCount,
    skippedCount,
    totalAmountProvisioned: Number(totalAmountProvisioned.toFixed(2)),
    generatedEntries,
  };
}
