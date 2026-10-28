// src/lib/finance/accountsService.ts
// Gerenciamento de Plano de Contas, Contas Bancárias e Fornecedores.

import { getDb, queryDb } from '../db';
import type { FinAccount, FinBankAccount, FinSupplier, FinClientSummary } from '../../types/finance';

export async function listAccounts(filters?: {
  type?: string;
  statement_group?: string;
  activeOnly?: boolean;
}): Promise<FinAccount[]> {
  const sql = getDb();
  let query = 'SELECT * FROM fin_accounts WHERE 1=1';
  const params: any[] = [];

  if (filters?.activeOnly !== false) {
    query += ' AND is_active = true';
  }
  if (filters?.type) {
    params.push(filters.type);
    query += ` AND type = $${params.length}`;
  }
  if (filters?.statement_group) {
    params.push(filters.statement_group);
    query += ` AND statement_group = $${params.length}`;
  }

  query += ' ORDER BY code ASC';
  const rows = await queryDb<FinAccount>(query, params);
  return rows;
}

export async function listBankAccounts(): Promise<FinBankAccount[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT *
    FROM fin_bank_accounts
    WHERE is_active = true
    ORDER BY is_default DESC, name ASC
  `;
  return rows as unknown as FinBankAccount[];
}

export async function getDefaultBankAccount(): Promise<FinBankAccount | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT *
    FROM fin_bank_accounts
    WHERE is_default = true AND is_active = true
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return rows[0] as unknown as FinBankAccount;
}

export async function listSuppliers(): Promise<FinSupplier[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT *
    FROM fin_suppliers
    WHERE is_active = true
    ORDER BY name ASC
  `;
  return rows as unknown as FinSupplier[];
}

export async function createSupplier(
  input: {
    name: string;
    trade_name?: string | null;
    document?: string | null;
    email?: string | null;
    phone?: string | null;
    pix_key?: string | null;
    default_account_id?: string | null;
    notes?: string | null;
  }
): Promise<FinSupplier> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO fin_suppliers (
      name,
      trade_name,
      document,
      email,
      phone,
      pix_key,
      default_account_id,
      notes
    ) VALUES (
      ${input.name.trim()},
      ${input.trade_name?.trim() || null},
      ${input.document?.trim() || null},
      ${input.email?.trim() || null},
      ${input.phone?.trim() || null},
      ${input.pix_key?.trim() || null},
      ${input.default_account_id || null},
      ${input.notes || null}
    )
    RETURNING *
  `;
  return rows[0] as unknown as FinSupplier;
}

export async function listClients(): Promise<FinClientSummary[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT 
      pr.id,
      pr.nome,
      pr.email,
      pr.empresa,
      pr.contract_status,
      pr.current_status,
      CASE 
        WHEN p.id IS NOT NULL THEN
          json_build_object(
            'id', p.id,
            'service_type', p.service_type,
            'financial_value', p.financial_value,
            'billing_date', p.billing_date,
            'payment_recurrence', p.payment_recurrence,
            'payment_method', p.payment_method
          )
        ELSE NULL
      END as active_project
    FROM profiles pr
    LEFT JOIN LATERAL (
      SELECT id, service_type, financial_value, billing_date, payment_recurrence, payment_method
      FROM projects
      WHERE client_id = pr.id AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    ) p ON true
    WHERE pr.role = 'client'
    ORDER BY pr.nome ASC
  `;
  return rows as unknown as FinClientSummary[];
}
