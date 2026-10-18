// src/lib/dbClient.ts
// Cliente leve (browser) para a rota /api/db/query (Neon). Sem dependência do Supabase.

type Filter = { type: 'eq'; column: string; value: any };

async function call(body: Record<string, any>) {
  const res = await fetch('/api/db/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ data: null, error: { message: 'Resposta inválida' } }));
  return json as { data: any; error: { message: string } | null };
}

const eqFilters = (where: Record<string, any>): Filter[] =>
  Object.entries(where).map(([column, value]) => ({ type: 'eq', column, value }));

export async function dbSelect(
  table: string,
  where: Record<string, any> = {},
  opts: { columns?: string; orderBy?: string; ascending?: boolean; limit?: number } = {}
): Promise<any[]> {
  const { data } = await call({
    table,
    operation: 'select',
    columns: opts.columns || '*',
    filters: eqFilters(where),
    orders: opts.orderBy ? [{ column: opts.orderBy, ascending: opts.ascending !== false }] : [],
    limit: opts.limit,
  });
  return Array.isArray(data) ? data : [];
}

export async function dbSelectOne(table: string, where: Record<string, any>, columns = '*') {
  const rows = await dbSelect(table, where, { columns, limit: 1 });
  return rows[0] || null;
}

export async function dbInsert(table: string, row: Record<string, any>) {
  return call({ table, operation: 'insert', data: row });
}

export async function dbDelete(table: string, where: Record<string, any>) {
  return call({ table, operation: 'delete', filters: eqFilters(where) });
}

export async function dbUpdate(table: string, where: Record<string, any>, row: Record<string, any>) {
  return call({ table, operation: 'update', data: row, filters: eqFilters(where) });
}

/** Upsert por chave arbitrária (a rota só suporta conflito por `id`). */
export async function dbUpsertBy(table: string, keyColumn: string, row: Record<string, any>) {
  const existing = await dbSelectOne(table, { [keyColumn]: row[keyColumn] }, 'id');
  if (existing?.id) {
    return dbUpdate(table, { id: existing.id }, row);
  }
  return dbInsert(table, row);
}

/** Upload via /api/storage/upload. Retorna a URL pública. */
export async function uploadFile(bucket: string, path: string, file: File | Blob): Promise<string> {
  const fd = new FormData();
  fd.append('bucket', bucket);
  fd.append('path', path);
  fd.append('file', file);
  const res = await fetch('/api/storage/upload', { method: 'POST', body: fd });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message || 'Falha no upload');
  return json.data.publicUrl as string;
}
