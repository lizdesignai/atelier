// src/lib/finance/auditService.ts
// Serviço central de auditoria imutável do financeiro (fin_audit_log).

import { getDb, queryDb } from '../db';
import type { FinAuditLog } from '../../types/finance';

export interface AuditLogInput {
  entity_type: string;
  entity_id: string;
  action: 'insert' | 'update' | 'delete' | 'close' | 'reopen';
  before_state?: Record<string, any> | null;
  after_state?: Record<string, any> | null;
  reason?: string | null;
  user_id?: string | null;
  ip_address?: string | null;
}

export async function logFinanceAudit(input: AuditLogInput): Promise<FinAuditLog> {
  const sql = getDb();

  const rows = await sql`
    INSERT INTO fin_audit_log (
      entity_type,
      entity_id,
      action,
      before_state,
      after_state,
      reason,
      user_id,
      ip_address
    ) VALUES (
      ${input.entity_type},
      ${input.entity_id},
      ${input.action},
      ${input.before_state ? JSON.stringify(input.before_state) : null},
      ${input.after_state ? JSON.stringify(input.after_state) : null},
      ${input.reason || null},
      ${input.user_id || null},
      ${input.ip_address || null}
    )
    RETURNING
      id,
      entity_type,
      entity_id,
      action,
      before_state,
      after_state,
      reason,
      user_id,
      ip_address,
      created_at
  `;

  return rows[0] as unknown as FinAuditLog;
}

export async function listAuditLogs(filters?: {
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  limit?: number;
}): Promise<FinAuditLog[]> {
  const sql = getDb();
  const limit = Math.min(filters?.limit || 50, 200);

  let query = 'SELECT * FROM fin_audit_log WHERE 1=1';
  const params: any[] = [];

  if (filters?.entity_type) {
    params.push(filters.entity_type);
    query += ` AND entity_type = $${params.length}`;
  }
  if (filters?.entity_id) {
    params.push(filters.entity_id);
    query += ` AND entity_id = $${params.length}`;
  }
  if (filters?.user_id) {
    params.push(filters.user_id);
    query += ` AND user_id = $${params.length}`;
  }

  query += ` ORDER BY created_at DESC LIMIT ${limit}`;

  const rows = await queryDb<FinAuditLog>(query, params);
  return rows;
}
