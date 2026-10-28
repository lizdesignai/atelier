// src/lib/finance/settlementsService.ts
// Gerenciamento de Liquidações e Baixas (fin_settlements) com atualização de saldo e status.

import { z } from 'zod';
import { getDb } from '../db';
import {
  AuditReasonRequiredError,
  EntryNotFoundError,
  FinanceDomainError,
  InvalidSettlementError,
} from './errors';
import { checkPeriodOpen } from './periodsService';
import { logFinanceAudit } from './auditService';
import { getEntryById } from './entriesService';
import type { FinSettlement, FinEntry } from '../../types/finance';

export const createSettlementSchema = z.object({
  entry_id: z.string().min(1, 'ID do lançamento obrigatório'),
  bank_account_id: z.string().optional().nullable(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de pagamento inválida (YYYY-MM-DD)'),
  amount: z.coerce.number().positive('O valor da baixa deve ser positivo'),
  fee_amount: z.coerce.number().min(0).default(0),
  interest_amount: z.coerce.number().min(0).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  payment_method: z.string().optional().nullable(),
  receipt_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;

export async function listSettlementsByEntryId(entryId: string): Promise<FinSettlement[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT *
    FROM fin_settlements
    WHERE entry_id = ${entryId}
    ORDER BY payment_date ASC, created_at ASC
  `;
  return rows as unknown as FinSettlement[];
}

export async function createSettlement(
  rawInput: CreateSettlementInput,
  userId: string
): Promise<{ settlement: FinSettlement; entry: FinEntry }> {
  const data = createSettlementSchema.parse(rawInput);

  const entry = await getEntryById(data.entry_id);
  if (!entry) {
    throw new EntryNotFoundError(data.entry_id);
  }

  if (entry.status === 'cancelled') {
    throw new InvalidSettlementError('Não é possível dar baixa em um lançamento cancelado.');
  }

  // 1. Checa trava de período contábil para a data da baixa
  await checkPeriodOpen(data.payment_date);

  const currentPaid = Number(entry.amount_paid || 0);
  const entryTotal = Number(entry.amount || 0);
  const newAmountPaid = Number((currentPaid + data.amount).toFixed(2));

  // Determina novo status
  let newStatus: FinEntry['status'] = 'partially_paid';
  let paidDate = entry.paid_date;

  if (newAmountPaid >= entryTotal) {
    newStatus = 'paid';
    paidDate = data.payment_date;
  }

  const sql = getDb();

  // 2. Insere a liquidação
  const settlementRows = await sql`
    INSERT INTO fin_settlements (
      entry_id,
      bank_account_id,
      payment_date,
      amount,
      fee_amount,
      interest_amount,
      discount_amount,
      payment_method,
      receipt_url,
      notes,
      created_by
    ) VALUES (
      ${data.entry_id},
      ${data.bank_account_id || null},
      ${data.payment_date},
      ${data.amount},
      ${data.fee_amount},
      ${data.interest_amount},
      ${data.discount_amount},
      ${data.payment_method || null},
      ${data.receipt_url || null},
      ${data.notes || null},
      ${userId}
    )
    RETURNING *
  `;

  const settlement = settlementRows[0] as unknown as FinSettlement;

  // 3. Atualiza o lançamento principal
  const updatedEntryRows = await sql`
    UPDATE fin_entries
    SET
      amount_paid = ${newAmountPaid},
      status = ${newStatus},
      paid_date = ${paidDate},
      bank_account_id = COALESCE(${data.bank_account_id || null}, bank_account_id),
      updated_by = ${userId},
      updated_at = NOW()
    WHERE id = ${data.entry_id}
    RETURNING *
  `;

  const updatedEntry = updatedEntryRows[0] as unknown as FinEntry;

  // 4. Se informou conta bancária, atualiza saldo corrente
  if (data.bank_account_id) {
    if (entry.kind === 'revenue') {
      const netReceived = data.amount - data.fee_amount;
      await sql`
        UPDATE fin_bank_accounts
        SET current_balance = current_balance + ${netReceived}
        WHERE id = ${data.bank_account_id}
      `;
    } else {
      await sql`
        UPDATE fin_bank_accounts
        SET current_balance = current_balance - ${data.amount}
        WHERE id = ${data.bank_account_id}
      `;
    }
  }

  // 5. Auditoria da baixa
  await logFinanceAudit({
    entity_type: 'fin_settlements',
    entity_id: settlement.id,
    action: 'insert',
    after_state: {
      entry_id: data.entry_id,
      amount: data.amount,
      payment_date: data.payment_date,
      resulting_entry_status: newStatus,
      total_paid: newAmountPaid,
    },
    reason: data.notes || `Baixa de R$ ${data.amount.toFixed(2)} registrada`,
    user_id: userId,
  });

  return { settlement, entry: updatedEntry };
}

export async function deleteSettlement(
  settlementId: string,
  userId: string,
  reason: string
): Promise<{ revertedSettlement: FinSettlement; entry: FinEntry }> {
  if (!reason || reason.trim().length < 5) {
    throw new AuditReasonRequiredError('estorno de baixa / liquidação');
  }

  const sql = getDb();

  const settlementRows = await sql`
    SELECT * FROM fin_settlements WHERE id = ${settlementId} LIMIT 1
  `;
  if (settlementRows.length === 0) {
    throw new FinanceDomainError(`Liquidação com id '${settlementId}' não foi encontrada.`);
  }

  const settlement = settlementRows[0] as unknown as FinSettlement;

  // 1. Checa trava de período contábil
  await checkPeriodOpen(settlement.payment_date);

  const entry = await getEntryById(settlement.entry_id);
  if (!entry) {
    throw new EntryNotFoundError(settlement.entry_id);
  }

  const currentPaid = Number(entry.amount_paid || 0);
  const revertedPaid = Math.max(0, Number((currentPaid - settlement.amount).toFixed(2)));

  let newStatus: FinEntry['status'] = 'pending';
  let newPaidDate = entry.paid_date;

  if (revertedPaid > 0) {
    newStatus = 'partially_paid';
  } else {
    newPaidDate = null;
  }

  // 2. Reverte saldo bancário se aplicável
  if (settlement.bank_account_id) {
    if (entry.kind === 'revenue') {
      const netReceived = settlement.amount - settlement.fee_amount;
      await sql`
        UPDATE fin_bank_accounts
        SET current_balance = current_balance - ${netReceived}
        WHERE id = ${settlement.bank_account_id}
      `;
    } else {
      await sql`
        UPDATE fin_bank_accounts
        SET current_balance = current_balance + ${settlement.amount}
        WHERE id = ${settlement.bank_account_id}
      `;
    }
  }

  // 3. Remove o registro de baixa
  await sql`DELETE FROM fin_settlements WHERE id = ${settlementId}`;

  // 4. Atualiza o lançamento principal
  const updatedEntryRows = await sql`
    UPDATE fin_entries
    SET
      amount_paid = ${revertedPaid},
      status = ${newStatus},
      paid_date = ${newPaidDate},
      updated_by = ${userId},
      updated_at = NOW()
    WHERE id = ${entry.id}
    RETURNING *
  `;

  const updatedEntry = updatedEntryRows[0] as unknown as FinEntry;

  // 5. Auditoria do estorno
  await logFinanceAudit({
    entity_type: 'fin_settlements',
    entity_id: settlementId,
    action: 'delete',
    before_state: {
      amount: settlement.amount,
      payment_date: settlement.payment_date,
      entry_id: entry.id,
      previous_paid: currentPaid,
    },
    after_state: {
      entry_id: entry.id,
      reverted_paid: revertedPaid,
      resulting_status: newStatus,
    },
    reason,
    user_id: userId,
  });

  return { revertedSettlement: settlement, entry: updatedEntry };
}
