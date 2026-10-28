// src/lib/finance/taxesService.ts
// Gerenciamento do Calendário de Obrigações Fiscais (fin_tax_obligations).

import { z } from 'zod';
import { getDb, queryDb } from '../db';
import { FinanceDomainError } from './errors';
import { logFinanceAudit } from './auditService';
import type { FinTaxObligation } from '../../types/finance';

export const createTaxObligationSchema = z.object({
  tax_type: z.string().min(2, 'Tipo de tributo obrigatório (ex: DAS, ISS)'),
  competence: z.string().regex(/^\d{4}-\d{2}$/, 'Competência inválida (YYYY-MM)'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento inválida (YYYY-MM-DD)'),
  amount: z.coerce.number().positive('O valor do imposto deve ser positivo'),
  status: z.enum(['pending', 'paid', 'overdue']).default('pending'),
  guide_url: z.string().optional().nullable(),
  receipt_url: z.string().optional().nullable(),
  paid_at: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateTaxObligationSchema = createTaxObligationSchema.partial().extend({
  reason: z.string().optional().nullable(),
});

export type CreateTaxObligationInput = z.infer<typeof createTaxObligationSchema>;
export type UpdateTaxObligationInput = z.infer<typeof updateTaxObligationSchema>;

export async function listTaxObligations(filters?: {
  competence?: string;
  status?: string;
  tax_type?: string;
}): Promise<FinTaxObligation[]> {
  const sql = getDb();
  let query = 'SELECT * FROM fin_tax_obligations WHERE 1=1';
  const params: any[] = [];

  if (filters?.competence) {
    params.push(filters.competence);
    query += ` AND competence = $${params.length}`;
  }
  if (filters?.status) {
    params.push(filters.status);
    query += ` AND status = $${params.length}`;
  }
  if (filters?.tax_type) {
    params.push(filters.tax_type);
    query += ` AND tax_type = $${params.length}`;
  }

  query += ' ORDER BY due_date ASC';
  const rows = await queryDb<FinTaxObligation>(query, params);
  return rows;
}

export async function getTaxObligationById(id: string): Promise<FinTaxObligation | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM fin_tax_obligations WHERE id = ${id} LIMIT 1
  `;
  if (rows.length === 0) return null;
  return rows[0] as unknown as FinTaxObligation;
}

export async function createTaxObligation(
  rawInput: CreateTaxObligationInput,
  userId: string
): Promise<FinTaxObligation> {
  const data = createTaxObligationSchema.parse(rawInput);
  const sql = getDb();

  const rows = await sql`
    INSERT INTO fin_tax_obligations (
      tax_type,
      competence,
      due_date,
      amount,
      status,
      guide_url,
      receipt_url,
      paid_at,
      notes
    ) VALUES (
      ${data.tax_type},
      ${data.competence},
      ${data.due_date},
      ${data.amount},
      ${data.status},
      ${data.guide_url || null},
      ${data.receipt_url || null},
      ${data.paid_at || null},
      ${data.notes || null}
    )
    RETURNING *
  `;

  const created = rows[0] as unknown as FinTaxObligation;

  await logFinanceAudit({
    entity_type: 'fin_tax_obligations',
    entity_id: created.id,
    action: 'insert',
    after_state: {
      tax_type: created.tax_type,
      competence: created.competence,
      due_date: created.due_date,
      amount: created.amount,
      status: created.status,
    },
    user_id: userId,
  });

  return created;
}

export async function updateTaxObligation(
  id: string,
  rawInput: UpdateTaxObligationInput,
  userId: string
): Promise<FinTaxObligation> {
  const updates = updateTaxObligationSchema.parse(rawInput);
  const current = await getTaxObligationById(id);
  if (!current) {
    throw new FinanceDomainError(`Obrigação tributária '${id}' não encontrada.`);
  }

  const sql = getDb();
  const rows = await sql`
    UPDATE fin_tax_obligations
    SET
      tax_type = COALESCE(${updates.tax_type !== undefined ? updates.tax_type : null}, tax_type),
      competence = COALESCE(${updates.competence !== undefined ? updates.competence : null}, competence),
      due_date = COALESCE(${updates.due_date !== undefined ? updates.due_date : null}, due_date),
      amount = COALESCE(${updates.amount !== undefined ? updates.amount : null}, amount),
      status = COALESCE(${updates.status !== undefined ? updates.status : null}, status),
      guide_url = COALESCE(${updates.guide_url !== undefined ? updates.guide_url : null}, guide_url),
      receipt_url = COALESCE(${updates.receipt_url !== undefined ? updates.receipt_url : null}, receipt_url),
      paid_at = COALESCE(${updates.paid_at !== undefined ? updates.paid_at : null}, paid_at),
      notes = COALESCE(${updates.notes !== undefined ? updates.notes : null}, notes)
    WHERE id = ${id}
    RETURNING *
  `;

  const updated = rows[0] as unknown as FinTaxObligation;

  await logFinanceAudit({
    entity_type: 'fin_tax_obligations',
    entity_id: id,
    action: 'update',
    before_state: current,
    after_state: updated,
    reason: updates.reason || 'Atualização da guia / obrigação fiscal',
    user_id: userId,
  });

  return updated;
}
