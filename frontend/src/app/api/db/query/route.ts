import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

// Whitelist of allowed tables to prevent SQL injection
const ALLOWED_TABLES = new Set([
  'profiles', 'projects', 'tasks', 'notifications', 'agencies',
  'agency_subclients', 'project_assets', 'content_planning',
  'briefings', 'attendance_logs', 'social_posts', 'asset_missions',
  'team_performance', 'messages', 'cofre_items', 'brand_identities',
  'curadoria_items', 'reference_boards', 'reference_items',
  'channels', 'channel_messages', 'demand_leads', 'financial_records',
  'brand_assets', 'brand_guidelines', 'instagram_reports',
  'onboarding_steps', 'user_preferences', 'activity_log',
]);

function sanitizeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

function parseSelectCols(selectStr: string): string {
  if (!selectStr || selectStr.trim() === '*') return '*';

  // Strip PostgREST join syntax: table(cols) including nested ones
  let result = '';
  let depth = 0;
  for (let i = 0; i < selectStr.length; i++) {
    const ch = selectStr[i];
    if (ch === '(') {
      // Remove preceding identifier (join table name)
      let j = result.length - 1;
      while (j >= 0 && /[a-zA-Z0-9_]/.test(result[j])) j--;
      result = result.substring(0, j + 1);
      depth++;
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1);
    } else if (depth === 0) {
      result += ch;
    }
  }

  result = result.replace(/,(\s*,)+/g, ',').replace(/^[\s,]+/, '').replace(/[\s,]+$/, '').trim();
  if (!result || result === '*') return '*';

  const cols = result.split(',').map(c => c.trim()).filter(Boolean);
  if (cols.length === 0 || cols.includes('*')) return '*';
  return cols.map(c => `"${sanitizeId(c)}"`).join(', ');
}

interface FilterDef {
  type: string;
  column: string;
  value: any;
}

function buildWhere(filters: FilterDef[], startIdx: number = 1): { clauses: string[]; params: any[]; nextIdx: number } {
  const clauses: string[] = [];
  const params: any[] = [];
  let idx = startIdx;

  for (const f of filters) {
    const col = sanitizeId(f.column);
    switch (f.type) {
      case 'eq':
        clauses.push(`"${col}" = $${idx++}`);
        params.push(f.value);
        break;
      case 'neq':
        clauses.push(`"${col}" != $${idx++}`);
        params.push(f.value);
        break;
      case 'gt':
        clauses.push(`"${col}" > $${idx++}`);
        params.push(f.value);
        break;
      case 'gte':
        clauses.push(`"${col}" >= $${idx++}`);
        params.push(f.value);
        break;
      case 'lt':
        clauses.push(`"${col}" < $${idx++}`);
        params.push(f.value);
        break;
      case 'lte':
        clauses.push(`"${col}" <= $${idx++}`);
        params.push(f.value);
        break;
      case 'in': {
        if (Array.isArray(f.value) && f.value.length > 0) {
          const ph = f.value.map(() => `$${idx++}`);
          clauses.push(`"${col}" IN (${ph.join(', ')})`);
          params.push(...f.value);
        }
        break;
      }
      case 'is':
        if (f.value === null) clauses.push(`"${col}" IS NULL`);
        break;
      case 'not_is':
        if (f.value === null) clauses.push(`"${col}" IS NOT NULL`);
        break;
      default:
        break;
    }
  }
  return { clauses, params, nextIdx: idx };
}

export async function POST(request: NextRequest) {
  try {
    // Auth validation
    const cookieStore = await cookies();
    const token = cookieStore.get('atelier_session')?.value;
    if (!token) {
      return NextResponse.json({ data: null, error: { message: 'Not authenticated' } }, { status: 401 });
    }

    const { verifyToken } = await import('@/lib/auth');
    const payload = await verifyToken(token);
    if (payload.type !== 'session') {
      return NextResponse.json({ data: null, error: { message: 'Invalid token' } }, { status: 401 });
    }

    const body = await request.json();
    const {
      table, operation, columns, data,
      filters = [], orders = [], limit,
      single, maybeSingle, head, count
    } = body;

    if (!ALLOWED_TABLES.has(table)) {
      console.warn(`[db/query] Blocked query to unlisted table: ${table}`);
      // Return empty instead of error to avoid crashing UI
      return NextResponse.json({ data: single || maybeSingle ? null : [], error: null });
    }

    const sql = getDb();

    switch (operation) {
      // =================== SELECT ===================
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

        // Count-only query
        if (head && count === 'exact') {
          let cq = `SELECT count(*)::int as count FROM "${table}"`;
          if (filters.length > 0) {
            const w = buildWhere(filters);
            cq += ` WHERE ${w.clauses.join(' AND ')}`;
            const cResult = await (sql as any).query(cq, w.params);
            return NextResponse.json({ data: null, error: null, count: cResult[0]?.count || 0 });
          }
          const cResult = await (sql as any).query(cq);
          return NextResponse.json({ data: null, error: null, count: cResult[0]?.count || 0 });
        }

        const result = await (sql as any).query(q, allParams);

        // Count + data
        if (count === 'exact') {
          let cq = `SELECT count(*)::int as cnt FROM "${table}"`;
          if (filters.length > 0) {
            const w = buildWhere(filters);
            cq += ` WHERE ${w.clauses.join(' AND ')}`;
            const cr = await (sql as any).query(cq, w.params);
            return NextResponse.json({ data: result, error: null, count: cr[0]?.cnt || 0 });
          }
          const cr = await (sql as any).query(cq);
          return NextResponse.json({ data: result, error: null, count: cr[0]?.cnt || 0 });
        }

        if (single) {
          return NextResponse.json({
            data: result[0] || null,
            error: result.length === 0 ? { message: 'Row not found', code: 'PGRST116' } : null
          });
        }
        if (maybeSingle) {
          return NextResponse.json({ data: result[0] || null, error: null });
        }
        return NextResponse.json({ data: result, error: null });
      }

      // =================== INSERT ===================
      case 'insert': {
        const rows = Array.isArray(data) ? data : [data];
        if (rows.length === 0) return NextResponse.json({ data: [], error: null });

        const keys = Object.keys(rows[0]);
        const colNames = keys.map(k => `"${sanitizeId(k)}"`).join(', ');
        const allParams: any[] = [];
        const valRows = rows.map(row => {
          const ph = keys.map(k => { allParams.push(row[k]); return `$${allParams.length}`; });
          return `(${ph.join(', ')})`;
        });

        const q = `INSERT INTO "${table}" (${colNames}) VALUES ${valRows.join(', ')} RETURNING *`;
        const result = await (sql as any).query(q, allParams);
        return NextResponse.json({ data: Array.isArray(data) ? result : result[0], error: null });
      }

      // =================== UPDATE ===================
      case 'update': {
        if (!data || Object.keys(data).length === 0) {
          return NextResponse.json({ data: null, error: null });
        }
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
        const result = await (sql as any).query(q, allParams);
        return NextResponse.json({ data: result, error: null });
      }

      // =================== DELETE ===================
      case 'delete': {
        let q = `DELETE FROM "${table}"`;
        const allParams: any[] = [];

        if (filters.length > 0) {
          const w = buildWhere(filters);
          allParams.push(...w.params);
          q += ` WHERE ${w.clauses.join(' AND ')}`;
        }

        q += ' RETURNING *';
        const result = await (sql as any).query(q, allParams);
        return NextResponse.json({ data: result, error: null });
      }

      // =================== UPSERT ===================
      case 'upsert': {
        const rows = Array.isArray(data) ? data : [data];
        if (rows.length === 0) return NextResponse.json({ data: [], error: null });

        const keys = Object.keys(rows[0]);
        const colNames = keys.map(k => `"${sanitizeId(k)}"`).join(', ');
        const allParams: any[] = [];
        const valRows = rows.map(row => {
          const ph = keys.map(k => { allParams.push(row[k]); return `$${allParams.length}`; });
          return `(${ph.join(', ')})`;
        });

        const updCols = keys.filter(k => k !== 'id').map(k => `"${sanitizeId(k)}" = EXCLUDED."${sanitizeId(k)}"`).join(', ');
        const q = `INSERT INTO "${table}" (${colNames}) VALUES ${valRows.join(', ')} ON CONFLICT (id) DO UPDATE SET ${updCols} RETURNING *`;
        const result = await (sql as any).query(q, allParams);
        return NextResponse.json({ data: Array.isArray(data) ? result : result[0], error: null });
      }

      default:
        return NextResponse.json({ data: null, error: { message: 'Unsupported operation' } }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[api/db/query] Error:', error?.message || error);
    return NextResponse.json({ data: null, error: { message: error?.message || 'Internal error' } }, { status: 500 });
  }
}
