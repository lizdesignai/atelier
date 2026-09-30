import { neon } from '@neondatabase/serverless';

function sanitizeId(id: string) {
  return id.replace(/[^a-zA-Z0-9_]/g, '');
}

function parseSelectCols(columns: string): string {
  if (!columns || columns === '*') return '*';
  let inParen = 0;
  let current = '';
  const parts: string[] = [];
  for (let i = 0; i < columns.length; i++) {
    const c = columns[i];
    if (c === '(') inParen++;
    if (c === ')') inParen--;
    if (c === ',' && inParen === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  if (current) parts.push(current.trim());

  return parts.map(p => {
    if (p === '*') return '*';
    const relMatch = p.match(/^([a-zA-Z0-9_]+)\((.*)\)$/);
    if (relMatch) {
      const rel = relMatch[1];
      const inner = parseSelectCols(relMatch[2]);
      if (inner === '*') return `json_build_object('error', 'Nested * not supported via basic proxy') AS "${sanitizeId(rel)}"`;
      const jsonObjArgs = inner.split(',').map(c => {
        const cname = c.trim().replace(/^"|"$/g, '');
        return `'${cname}', ${sanitizeId(rel)}."${cname}"`;
      });
      return `json_build_object(${jsonObjArgs.join(', ')}) AS "${sanitizeId(rel)}"`;
    }
    return `"${sanitizeId(p)}"`;
  }).join(', ');
}

function buildWhere(filters: any[], startIdx = 1) {
  const clauses: string[] = [];
  const params: any[] = [];
  let idx = startIdx;

  for (const f of filters) {
    const col = sanitizeId(f.column);
    switch (f.operator) {
      case 'eq':
        if (f.value === null) clauses.push(`"${col}" IS NULL`);
        else { clauses.push(`"${col}" = $${idx++}`); params.push(f.value); }
        break;
      case 'neq':
        if (f.value === null) clauses.push(`"${col}" IS NOT NULL`);
        else { clauses.push(`"${col}" != $${idx++}`); params.push(f.value); }
        break;
      case 'gt':
        clauses.push(`"${col}" > $${idx++}`); params.push(f.value); break;
      case 'gte':
        clauses.push(`"${col}" >= $${idx++}`); params.push(f.value); break;
      case 'lt':
        clauses.push(`"${col}" < $${idx++}`); params.push(f.value); break;
      case 'lte':
        clauses.push(`"${col}" <= $${idx++}`); params.push(f.value); break;
      case 'in':
        if (Array.isArray(f.value) && f.value.length > 0) {
          const ph = f.value.map(() => `$${idx++}`);
          clauses.push(`"${col}" IN (${ph.join(', ')})`);
          params.push(...f.value);
        }
        break;
      case 'is':
        if (f.value === null) clauses.push(`"${col}" IS NULL`); break;
    }
  }
  return { clauses, params, nextIdx: idx };
}

export async function executeNeonQuery(payload: any) {
  const { table, operation, columns, data, filters = [], orders = [], limit, single, maybeSingle, head, count } = payload;
  const sql = neon(process.env.POSTGRES_URL!);
  const sqlQuery = (q: string, params?: any[]) => (sql as any).query(q, params);

  switch (operation) {
    case 'select': {
      const selectCols = parseSelectCols(columns || '*');
      let q = `SELECT ${selectCols} FROM "${table}"`;
      let allParams: any[] = [];

      if (filters.length > 0) {
        const w = buildWhere(filters);
        allParams = w.params;
        q += ` WHERE ${w.clauses.join(' AND ')}`;
      }

      if (orders.length > 0) {
        const oc = orders.map((o: any) => {
          let c = `"${sanitizeId(o.column)}" ${o.ascending !== false ? 'ASC' : 'DESC'}`;
          if (o.nullsFirst === true) c += ' NULLS FIRST';
          else if (o.nullsFirst === false) c += ' NULLS LAST';
          return c;
        });
        q += ` ORDER BY ${oc.join(', ')}`;
      }

      if (limit) q += ` LIMIT ${parseInt(String(limit))}`;

      if (head && count === 'exact') {
        let cq = `SELECT count(*)::int as count FROM "${table}"`;
        if (filters.length > 0) {
          const w = buildWhere(filters);
          cq += ` WHERE ${w.clauses.join(' AND ')}`;
          const cr: any = await sqlQuery(cq, w.params);
          return { data: null, error: null, count: cr[0]?.count || 0 };
        }
        const cr: any = await sqlQuery(cq);
        return { data: null, error: null, count: cr[0]?.count || 0 };
      }

      const result: any = await sqlQuery(q, allParams);

      if (single) return { data: result[0] || null, error: result.length === 0 ? { message: 'Row not found' } : null };
      if (maybeSingle) return { data: result[0] || null, error: null };
      return { data: result, error: null };
    }

    case 'insert': {
      const rows = Array.isArray(data) ? data : [data];
      if (rows.length === 0) return { data: [], error: null };

      const keys = Object.keys(rows[0]);
      const colNames = keys.map(k => `"${sanitizeId(k)}"`).join(', ');
      const allParams: any[] = [];
      const valRows = rows.map(row => {
        const ph = keys.map(k => { allParams.push(row[k]); return `$${allParams.length}`; });
        return `(${ph.join(', ')})`;
      });

      const q = `INSERT INTO "${table}" (${colNames}) VALUES ${valRows.join(', ')} RETURNING *`;
      const result: any = await sqlQuery(q, allParams);
      return { data: Array.isArray(data) ? result : result[0], error: null };
    }

    case 'update': {
      if (!data || Object.keys(data).length === 0) return { data: null, error: null };
      const keys = Object.keys(data);
      const allParams: any[] = [];
      const setClauses = keys.map(k => {
        allParams.push(data[k]);
        return `"${sanitizeId(k)}" = $${allParams.length}`;
      });

      let q = `UPDATE "${table}" SET ${setClauses.join(', ')}`;
      if (filters.length > 0) {
        const w = buildWhere(filters, allParams.length + 1);
        allParams.push(...w.params);
        q += ` WHERE ${w.clauses.join(' AND ')}`;
      }
      q += ' RETURNING *';
      const result: any = await sqlQuery(q, allParams);
      return { data: result, error: null };
    }

    case 'delete': {
      let q = `DELETE FROM "${table}"`;
      const allParams: any[] = [];
      if (filters.length > 0) {
        const w = buildWhere(filters);
        allParams.push(...w.params);
        q += ` WHERE ${w.clauses.join(' AND ')}`;
      }
      q += ' RETURNING *';
      const result: any = await sqlQuery(q, allParams);
      return { data: result, error: null };
    }

    case 'upsert': {
      const rows = Array.isArray(data) ? data : [data];
      if (rows.length === 0) return { data: [], error: null };

      const keys = Object.keys(rows[0]);
      const colNames = keys.map(k => `"${sanitizeId(k)}"`).join(', ');
      const allParams: any[] = [];
      const valRows = rows.map(row => {
        const ph = keys.map(k => { allParams.push(row[k]); return `$${allParams.length}`; });
        return `(${ph.join(', ')})`;
      });

      const updCols = keys.filter(k => k !== 'id').map(k => `"${sanitizeId(k)}" = EXCLUDED."${sanitizeId(k)}"`).join(', ');
      const q = `INSERT INTO "${table}" (${colNames}) VALUES ${valRows.join(', ')} ON CONFLICT (id) DO UPDATE SET ${updCols} RETURNING *`;
      const result: any = await sqlQuery(q, allParams);
      return { data: Array.isArray(data) ? result : result[0], error: null };
    }
  }
  return { data: null, error: { message: 'Unsupported' } };
}
