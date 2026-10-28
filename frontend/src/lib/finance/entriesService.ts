// src/lib/finance/entriesService.ts
// Serviço central de Lançamentos Financeiros (fin_entries) com Zod, auditoria e trava de período.

import { z } from 'zod';
import { getDb, queryDb } from '../db';
import {
  AuditReasonRequiredError,
  EntryNotFoundError,
  FinanceDomainError,
} from './errors';
import { checkPeriodOpen } from './periodsService';
import { logFinanceAudit } from './auditService';
import type { FinEntry, FinSettlement } from '../../types/finance';

export const createEntrySchema = z.object({
  kind: z.enum(['revenue', 'expense']),
  source: z.enum(['contract', 'agency', 'adhoc', 'manual', 'asaas', 'tax']).default('manual'),
  title: z.string().min(2, 'Título deve ter pelo menos 2 caracteres'),
  description: z.string().optional().nullable(),
  account_id: z.string().min(1, 'Conta contábil obrigatória'),
  bank_account_id: z.string().optional().nullable(),
  supplier_id: z.string().optional().nullable(),
  client_id: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
  agency_id: z.string().optional().nullable(),
  competence_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de competência inválida (YYYY-MM-DD)'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento inválida (YYYY-MM-DD)'),
  amount: z.coerce.number().positive('O valor deve ser positivo'),
  payment_method: z.string().optional().nullable(),
  installment_number: z.coerce.number().int().min(1).default(1),
  installment_total: z.coerce.number().int().min(1).default(1),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
  external_ref: z.string().optional().nullable(),
  generate_installments: z.boolean().default(false),
});

export const updateEntrySchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  account_id: z.string().optional(),
  bank_account_id: z.string().optional().nullable(),
  supplier_id: z.string().optional().nullable(),
  client_id: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
  agency_id: z.string().optional().nullable(),
  competence_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paid_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  amount: z.coerce.number().positive().optional(),
  payment_method: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['pending', 'partially_paid', 'paid', 'cancelled', 'refunded']).optional(),
  reason: z.string().optional().nullable(),
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;

export interface ListEntriesFilters {
  kind?: 'revenue' | 'expense';
  status?: string;
  account_id?: string;
  supplier_id?: string;
  client_id?: string;
  project_id?: string;
  agency_id?: string;
  source?: string;
  competence_month?: string; // YYYY-MM
  due_month?: string; // YYYY-MM
  start_date?: string;
  end_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listEntries(filters?: ListEntriesFilters): Promise<{
  entries: FinEntry[];
  total: number;
}> {
  const sql = getDb();
  const limit = Math.min(filters?.limit || 50, 200);
  const offset = filters?.offset || 0;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (filters?.kind) {
    params.push(filters.kind);
    whereClause += ` AND e.kind = $${params.length}`;
  }
  if (filters?.status) {
    params.push(filters.status);
    whereClause += ` AND e.status = $${params.length}`;
  }
  if (filters?.account_id) {
    params.push(filters.account_id);
    whereClause += ` AND e.account_id = $${params.length}`;
  }
  if (filters?.supplier_id) {
    params.push(filters.supplier_id);
    whereClause += ` AND e.supplier_id = $${params.length}`;
  }
  if (filters?.client_id) {
    params.push(filters.client_id);
    whereClause += ` AND e.client_id = $${params.length}`;
  }
  if (filters?.project_id) {
    params.push(filters.project_id);
    whereClause += ` AND e.project_id = $${params.length}`;
  }
  if (filters?.agency_id) {
    params.push(filters.agency_id);
    whereClause += ` AND e.agency_id = $${params.length}`;
  }
  if (filters?.source) {
    params.push(filters.source);
    whereClause += ` AND e.source = $${params.length}`;
  }
  if (filters?.competence_month) {
    params.push(filters.competence_month);
    whereClause += ` AND TO_CHAR(e.competence_date, 'YYYY-MM') = $${params.length}`;
  }
  if (filters?.due_month) {
    params.push(filters.due_month);
    whereClause += ` AND TO_CHAR(e.due_date, 'YYYY-MM') = $${params.length}`;
  }
  if (filters?.start_date) {
    params.push(filters.start_date);
    whereClause += ` AND e.due_date >= $${params.length}`;
  }
  if (filters?.end_date) {
    params.push(filters.end_date);
    whereClause += ` AND e.due_date <= $${params.length}`;
  }
  if (filters?.search) {
    params.push(`%${filters.search}%`);
    whereClause += ` AND (e.title ILIKE $${params.length} OR s.name ILIKE $${params.length} OR p_client.nome ILIKE $${params.length})`;
  }

  // Contagem total
  const countQuery = `
    SELECT COUNT(*)::int as count
    FROM fin_entries e
    LEFT JOIN fin_suppliers s ON s.id = e.supplier_id
    LEFT JOIN profiles p_client ON p_client.id = e.client_id
    ${whereClause}
  `;
  const countRes = await queryDb<{ count: number }>(countQuery, params);
  const total = countRes[0]?.count || 0;

  // Busca detalhada com joins
  const dataQuery = `
    SELECT
      e.*,
      row_to_json(a.*) as account,
      row_to_json(b.*) as bank_account,
      row_to_json(s.*) as supplier,
      json_build_object('id', p_client.id, 'nome', p_client.nome, 'email', p_client.email, 'avatar_url', p_client.avatar_url) as client,
      json_build_object('id', proj.id, 'service_type', proj.service_type, 'status', proj.status) as project,
      json_build_object('id', ag.id, 'name', ag.name) as agency
    FROM fin_entries e
    LEFT JOIN fin_accounts a ON a.id = e.account_id
    LEFT JOIN fin_bank_accounts b ON b.id = e.bank_account_id
    LEFT JOIN fin_suppliers s ON s.id = e.supplier_id
    LEFT JOIN profiles p_client ON p_client.id = e.client_id
    LEFT JOIN projects proj ON proj.id = e.project_id
    LEFT JOIN agencies ag ON ag.id = e.agency_id
    ${whereClause}
    ORDER BY e.due_date ASC, e.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const rows = await queryDb<FinEntry>(dataQuery, params);

  return { entries: rows, total };
}

export async function getEntryById(id: string): Promise<(FinEntry & { settlements: FinSettlement[] }) | null> {
  const sql = getDb();

  const entryRows = await sql`
    SELECT
      e.*,
      row_to_json(a.*) as account,
      row_to_json(b.*) as bank_account,
      row_to_json(s.*) as supplier,
      json_build_object('id', p_client.id, 'nome', p_client.nome, 'email', p_client.email, 'avatar_url', p_client.avatar_url) as client,
      json_build_object('id', proj.id, 'service_type', proj.service_type, 'status', proj.status) as project,
      json_build_object('id', ag.id, 'name', ag.name) as agency
    FROM fin_entries e
    LEFT JOIN fin_accounts a ON a.id = e.account_id
    LEFT JOIN fin_bank_accounts b ON b.id = e.bank_account_id
    LEFT JOIN fin_suppliers s ON s.id = e.supplier_id
    LEFT JOIN profiles p_client ON p_client.id = e.client_id
    LEFT JOIN projects proj ON proj.id = e.project_id
    LEFT JOIN agencies ag ON ag.id = e.agency_id
    WHERE e.id = ${id}
    LIMIT 1
  `;

  if (entryRows.length === 0) return null;

  const settlementsRows = await sql`
    SELECT *
    FROM fin_settlements
    WHERE entry_id = ${id}
    ORDER BY payment_date ASC, created_at ASC
  `;

  const entry = entryRows[0] as unknown as FinEntry;
  return {
    ...entry,
    settlements: settlementsRows as unknown as FinSettlement[],
  };
}

export async function createEntry(
  rawInput: CreateEntryInput,
  userId: string
): Promise<FinEntry> {
  const data = createEntrySchema.parse(rawInput);

  // 1. Checa trava de período contábil
  await checkPeriodOpen(data.competence_date);

  const sql = getDb();

  // 2. Se external_ref fornecido, busca duplicidade
  if (data.external_ref) {
    const existing = await sql`
      SELECT * FROM fin_entries WHERE external_ref = ${data.external_ref} LIMIT 1
    `;
    if (existing.length > 0) {
      return existing[0] as unknown as FinEntry;
    }
  }

  // 3. Insere o lançamento principal
  const rows = await sql`
    INSERT INTO fin_entries (
      kind,
      source,
      title,
      description,
      account_id,
      bank_account_id,
      supplier_id,
      client_id,
      project_id,
      agency_id,
      competence_date,
      due_date,
      amount,
      amount_paid,
      status,
      payment_method,
      installment_number,
      installment_total,
      tags,
      notes,
      external_ref,
      created_by
    ) VALUES (
      ${data.kind},
      ${data.source},
      ${data.title},
      ${data.description || null},
      ${data.account_id},
      ${data.bank_account_id || null},
      ${data.supplier_id || null},
      ${data.client_id || null},
      ${data.project_id || null},
      ${data.agency_id || null},
      ${data.competence_date},
      ${data.due_date},
      ${data.amount},
      0,
      'pending',
      ${data.payment_method || null},
      ${data.installment_number},
      ${data.installment_total},
      ${data.tags},
      ${data.notes || null},
      ${data.external_ref || null},
      ${userId}
    )
    RETURNING *
  `;

  const created = rows[0] as unknown as FinEntry;

  // 4. Log de auditoria
  await logFinanceAudit({
    entity_type: 'fin_entries',
    entity_id: created.id,
    action: 'insert',
    after_state: {
      kind: created.kind,
      amount: created.amount,
      due_date: created.due_date,
      competence_date: created.competence_date,
      title: created.title,
    },
    user_id: userId,
  });

  // 5. Parcelamento automático se solicitado
  if (data.generate_installments && data.installment_total > 1 && data.installment_number === 1) {
    const baseCompetence = new Date(data.competence_date + 'T12:00:00Z');
    const baseDue = new Date(data.due_date + 'T12:00:00Z');

    for (let i = 2; i <= data.installment_total; i++) {
      const nextComp = new Date(baseCompetence);
      nextComp.setMonth(nextComp.getMonth() + (i - 1));
      const nextCompStr = nextComp.toISOString().split('T')[0];

      const nextDue = new Date(baseDue);
      nextDue.setMonth(nextDue.getMonth() + (i - 1));
      const nextDueStr = nextDue.toISOString().split('T')[0];

      await sql`
        INSERT INTO fin_entries (
          kind, source, title, description, account_id, bank_account_id,
          supplier_id, client_id, project_id, agency_id,
          competence_date, due_date, amount, amount_paid, status,
          payment_method, installment_number, installment_total,
          tags, notes, external_ref, created_by
        ) VALUES (
          ${data.kind}, ${data.source},
          ${`${data.title} (${i}/${data.installment_total})`},
          ${data.description || null}, ${data.account_id}, ${data.bank_account_id || null},
          ${data.supplier_id || null}, ${data.client_id || null}, ${data.project_id || null}, ${data.agency_id || null},
          ${nextCompStr}, ${nextDueStr}, ${data.amount}, 0, 'pending',
          ${data.payment_method || null}, ${i}, ${data.installment_total},
          ${data.tags}, ${data.notes || null},
          ${data.external_ref ? `${data.external_ref}-inst-${i}` : null},
          ${userId}
        )
      `;
    }
  }

  return created;
}

export async function updateEntry(
  id: string,
  rawInput: UpdateEntryInput,
  userId: string
): Promise<FinEntry> {
  const updates = updateEntrySchema.parse(rawInput);
  const current = await getEntryById(id);

  if (!current) {
    throw new EntryNotFoundError(id);
  }

  // 1. Checa trava de período da competência original
  await checkPeriodOpen(current.competence_date);

  // Se houver alteração de competência, checa também o novo mês
  if (updates.competence_date && updates.competence_date !== current.competence_date) {
    await checkPeriodOpen(updates.competence_date);
  }

  // 2. Auditoria obrigatória de alterações críticas de data/valor/status
  const isCriticalChange =
    (updates.amount !== undefined && Number(updates.amount) !== Number(current.amount)) ||
    (updates.due_date !== undefined && updates.due_date !== current.due_date) ||
    (updates.paid_date !== undefined && updates.paid_date !== current.paid_date) ||
    (updates.status !== undefined && updates.status !== current.status);

  if (isCriticalChange) {
    if (!updates.reason || updates.reason.trim().length < 5) {
      throw new AuditReasonRequiredError(
        updates.amount !== undefined ? 'valor de pagamento' : 'data de pagamento/vencimento ou status'
      );
    }
  }

  const sql = getDb();

  const newTitle = updates.title ?? current.title;
  const newDesc = updates.description !== undefined ? updates.description : current.description;
  const newAccount = updates.account_id ?? current.account_id;
  const newBank = updates.bank_account_id !== undefined ? updates.bank_account_id : current.bank_account_id;
  const newSupplier = updates.supplier_id !== undefined ? updates.supplier_id : current.supplier_id;
  const newClient = updates.client_id !== undefined ? updates.client_id : current.client_id;
  const newProject = updates.project_id !== undefined ? updates.project_id : current.project_id;
  const newAgency = updates.agency_id !== undefined ? updates.agency_id : current.agency_id;
  const newComp = updates.competence_date ?? current.competence_date;
  const newDue = updates.due_date ?? current.due_date;
  const newPaidDate = updates.paid_date !== undefined ? updates.paid_date : current.paid_date;
  const newAmount = updates.amount !== undefined ? Number(updates.amount) : Number(current.amount);
  const newMethod = updates.payment_method !== undefined ? updates.payment_method : current.payment_method;
  const newTags = updates.tags ?? current.tags;
  const newNotes = updates.notes !== undefined ? updates.notes : current.notes;
  const newStatus = updates.status ?? current.status;

  const rows = await sql`
    UPDATE fin_entries
    SET
      title = ${newTitle},
      description = ${newDesc},
      account_id = ${newAccount},
      bank_account_id = ${newBank},
      supplier_id = ${newSupplier},
      client_id = ${newClient},
      project_id = ${newProject},
      agency_id = ${newAgency},
      competence_date = ${newComp},
      due_date = ${newDue},
      paid_date = ${newPaidDate},
      amount = ${newAmount},
      payment_method = ${newMethod},
      tags = ${newTags},
      notes = ${newNotes},
      status = ${newStatus},
      updated_by = ${userId},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  const updated = rows[0] as unknown as FinEntry;

  // 3. Registra auditoria com antes/depois
  await logFinanceAudit({
    entity_type: 'fin_entries',
    entity_id: id,
    action: 'update',
    before_state: {
      title: current.title,
      amount: current.amount,
      due_date: current.due_date,
      paid_date: current.paid_date,
      status: current.status,
      competence_date: current.competence_date,
    },
    after_state: {
      title: updated.title,
      amount: updated.amount,
      due_date: updated.due_date,
      paid_date: updated.paid_date,
      status: updated.status,
      competence_date: updated.competence_date,
    },
    reason: updates.reason || 'Atualização cadastral do lançamento',
    user_id: userId,
  });

  return updated;
}

export async function deleteEntry(
  id: string,
  userId: string,
  reason: string
): Promise<void> {
  if (!reason || reason.trim().length < 5) {
    throw new AuditReasonRequiredError('exclusão de lançamento');
  }

  const current = await getEntryById(id);
  if (!current) {
    throw new EntryNotFoundError(id);
  }

  await checkPeriodOpen(current.competence_date);

  if (current.settlements && current.settlements.length > 0) {
    throw new FinanceDomainError(
      'Não é possível excluir um lançamento que possui liquidações/baixas vinculadas. Realize o estorno das baixas primeiro.'
    );
  }

  const sql = getDb();

  await sql`DELETE FROM fin_entries WHERE id = ${id}`;

  await logFinanceAudit({
    entity_type: 'fin_entries',
    entity_id: id,
    action: 'delete',
    before_state: {
      title: current.title,
      amount: current.amount,
      due_date: current.due_date,
      kind: current.kind,
    },
    reason,
    user_id: userId,
  });
}
