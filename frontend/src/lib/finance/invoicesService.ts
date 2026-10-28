// src/lib/finance/invoicesService.ts
// Gerenciamento de Notas Fiscais (fin_invoices) emitidas e recebidas.

import { z } from 'zod';
import { getDb, queryDb } from '../db';
import { AuditReasonRequiredError, FinanceDomainError } from './errors';
import { logFinanceAudit } from './auditService';
import type { FinInvoice } from '../../types/finance';

export const createInvoiceSchema = z.object({
  direction: z.enum(['issued', 'received']),
  number: z.string().optional().nullable(),
  series: z.string().optional().nullable(),
  access_key: z.string().optional().nullable(),
  issuer_name: z.string().optional().nullable(),
  issuer_doc: z.string().optional().nullable(),
  recipient_name: z.string().optional().nullable(),
  recipient_doc: z.string().optional().nullable(),
  client_id: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
  supplier_id: z.string().optional().nullable(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  total_amount: z.coerce.number().positive('O valor total da nota fiscal deve ser positivo'),
  iss_amount: z.coerce.number().min(0).default(0),
  iss_retained: z.boolean().default(false),
  irrf_amount: z.coerce.number().min(0).default(0),
  pis_cofins_csll: z.coerce.number().min(0).default(0),
  status: z.enum(['draft', 'issued', 'cancelled', 'error']).default('draft'),
  xml_url: z.string().optional().nullable(),
  pdf_url: z.string().optional().nullable(),
  entry_id: z.string().optional().nullable(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  reason: z.string().optional().nullable(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export async function listInvoices(filters?: {
  direction?: 'issued' | 'received';
  status?: string;
  client_id?: string;
  supplier_id?: string;
  limit?: number;
}): Promise<FinInvoice[]> {
  const sql = getDb();
  const limit = Math.min(filters?.limit || 50, 150);

  let query = 'SELECT * FROM fin_invoices WHERE 1=1';
  const params: any[] = [];

  if (filters?.direction) {
    params.push(filters.direction);
    query += ` AND direction = $${params.length}`;
  }
  if (filters?.status) {
    params.push(filters.status);
    query += ` AND status = $${params.length}`;
  }
  if (filters?.client_id) {
    params.push(filters.client_id);
    query += ` AND client_id = $${params.length}`;
  }
  if (filters?.supplier_id) {
    params.push(filters.supplier_id);
    query += ` AND supplier_id = $${params.length}`;
  }

  query += ` ORDER BY issue_date DESC NULLS LAST, created_at DESC LIMIT ${limit}`;
  const rows = await queryDb<FinInvoice>(query, params);
  return rows;
}

export async function getInvoiceById(id: string): Promise<FinInvoice | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM fin_invoices WHERE id = ${id} LIMIT 1
  `;
  if (rows.length === 0) return null;
  return rows[0] as unknown as FinInvoice;
}

export async function createInvoice(
  rawInput: CreateInvoiceInput,
  userId: string
): Promise<FinInvoice> {
  const data = createInvoiceSchema.parse(rawInput);
  const sql = getDb();

  const rows = await sql`
    INSERT INTO fin_invoices (
      direction,
      number,
      series,
      access_key,
      issuer_name,
      issuer_doc,
      recipient_name,
      recipient_doc,
      client_id,
      project_id,
      supplier_id,
      issue_date,
      total_amount,
      iss_amount,
      iss_retained,
      irrf_amount,
      pis_cofins_csll,
      status,
      xml_url,
      pdf_url,
      entry_id,
      created_by
    ) VALUES (
      ${data.direction},
      ${data.number || null},
      ${data.series || null},
      ${data.access_key || null},
      ${data.issuer_name || null},
      ${data.issuer_doc || null},
      ${data.recipient_name || null},
      ${data.recipient_doc || null},
      ${data.client_id || null},
      ${data.project_id || null},
      ${data.supplier_id || null},
      ${data.issue_date || null},
      ${data.total_amount},
      ${data.iss_amount},
      ${data.iss_retained},
      ${data.irrf_amount},
      ${data.pis_cofins_csll},
      ${data.status},
      ${data.xml_url || null},
      ${data.pdf_url || null},
      ${data.entry_id || null},
      ${userId}
    )
    RETURNING *
  `;

  const created = rows[0] as unknown as FinInvoice;

  // Se vinculada a um lançamento, atualiza o invoice_id na fin_entries
  if (data.entry_id) {
    await sql`
      UPDATE fin_entries
      SET invoice_id = ${created.id}
      WHERE id = ${data.entry_id}
    `;
  }

  await logFinanceAudit({
    entity_type: 'fin_invoices',
    entity_id: created.id,
    action: 'insert',
    after_state: {
      direction: created.direction,
      number: created.number,
      total_amount: created.total_amount,
      status: created.status,
    },
    user_id: userId,
  });

  return created;
}

export async function updateInvoice(
  id: string,
  rawInput: UpdateInvoiceInput,
  userId: string
): Promise<FinInvoice> {
  const updates = updateInvoiceSchema.parse(rawInput);
  const current = await getInvoiceById(id);
  if (!current) {
    throw new FinanceDomainError(`Nota fiscal com id '${id}' não foi encontrada.`);
  }

  const sql = getDb();
  const rows = await sql`
    UPDATE fin_invoices
    SET
      number = COALESCE(${updates.number !== undefined ? updates.number : null}, number),
      series = COALESCE(${updates.series !== undefined ? updates.series : null}, series),
      access_key = COALESCE(${updates.access_key !== undefined ? updates.access_key : null}, access_key),
      issuer_name = COALESCE(${updates.issuer_name !== undefined ? updates.issuer_name : null}, issuer_name),
      issuer_doc = COALESCE(${updates.issuer_doc !== undefined ? updates.issuer_doc : null}, issuer_doc),
      recipient_name = COALESCE(${updates.recipient_name !== undefined ? updates.recipient_name : null}, recipient_name),
      recipient_doc = COALESCE(${updates.recipient_doc !== undefined ? updates.recipient_doc : null}, recipient_doc),
      issue_date = COALESCE(${updates.issue_date !== undefined ? updates.issue_date : null}, issue_date),
      total_amount = COALESCE(${updates.total_amount !== undefined ? updates.total_amount : null}, total_amount),
      iss_amount = COALESCE(${updates.iss_amount !== undefined ? updates.iss_amount : null}, iss_amount),
      iss_retained = COALESCE(${updates.iss_retained !== undefined ? updates.iss_retained : null}, iss_retained),
      irrf_amount = COALESCE(${updates.irrf_amount !== undefined ? updates.irrf_amount : null}, irrf_amount),
      pis_cofins_csll = COALESCE(${updates.pis_cofins_csll !== undefined ? updates.pis_cofins_csll : null}, pis_cofins_csll),
      status = COALESCE(${updates.status !== undefined ? updates.status : null}, status),
      xml_url = COALESCE(${updates.xml_url !== undefined ? updates.xml_url : null}, xml_url),
      pdf_url = COALESCE(${updates.pdf_url !== undefined ? updates.pdf_url : null}, pdf_url),
      entry_id = COALESCE(${updates.entry_id !== undefined ? updates.entry_id : null}, entry_id)
    WHERE id = ${id}
    RETURNING *
  `;

  const updated = rows[0] as unknown as FinInvoice;

  await logFinanceAudit({
    entity_type: 'fin_invoices',
    entity_id: id,
    action: 'update',
    before_state: current,
    after_state: updated,
    reason: updates.reason || 'Atualização de dados da nota fiscal',
    user_id: userId,
  });

  return updated;
}
