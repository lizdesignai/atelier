import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import {
  ALLOWED_TABLES,
  authorizeDbQuery,
  sanitizeQueryResult,
  type FilterDef,
} from '@/lib/dbQueryPolicy';

const PROFILE_JOIN_FK: Record<string, string> = {
  projects: 'client_id',
  community_posts: 'author_id',
  post_comments: 'user_id',
  b2b_pitches: 'author_id',
  veneto_event_messages: 'user_id',
  veneto_recognitions: 'from_user_id',
  veneto_reports: 'reporter_id',
};

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
      let j = result.length - 1;
      while (j >= 0 && /[a-zA-Z0-9_!:]/i.test(result[j])) j--;
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

  const cols = result.split(',').map((c) => c.trim()).filter(Boolean);
  if (cols.length === 0 || cols.includes('*')) return '*';
  return cols.map((c) => `"${sanitizeId(c)}"`).join(', ');
}

function buildWhere(
  filters: FilterDef[],
  startIdxOrPrefix: number | string = 1,
  startIdx: number = 1
): { clauses: string[]; params: any[]; nextIdx: number } {
  const clauses: string[] = [];
  const params: any[] = [];
  const tablePrefix = typeof startIdxOrPrefix === 'string' ? startIdxOrPrefix : undefined;
  let idx = typeof startIdxOrPrefix === 'number' ? startIdxOrPrefix : startIdx;
  const prefix = tablePrefix ? `"${tablePrefix}".` : '';

  for (const f of filters) {
    const col = sanitizeId(f.column);
    switch (f.type) {
      case 'eq':
        clauses.push(`${prefix}"${col}" = $${idx++}`);
        params.push(f.value);
        break;
      case 'neq':
        clauses.push(`${prefix}"${col}" != $${idx++}`);
        params.push(f.value);
        break;
      case 'gt':
        clauses.push(`${prefix}"${col}" > $${idx++}`);
        params.push(f.value);
        break;
      case 'gte':
        clauses.push(`${prefix}"${col}" >= $${idx++}`);
        params.push(f.value);
        break;
      case 'lt':
        clauses.push(`${prefix}"${col}" < $${idx++}`);
        params.push(f.value);
        break;
      case 'lte':
        clauses.push(`${prefix}"${col}" <= $${idx++}`);
        params.push(f.value);
        break;
      case 'in': {
        if (Array.isArray(f.value) && f.value.length > 0) {
          const ph = f.value.map(() => `$${idx++}`);
          clauses.push(`${prefix}"${col}" IN (${ph.join(', ')})`);
          params.push(...f.value);
        }
        break;
      }
      case 'is':
        if (f.value === null) clauses.push(`${prefix}"${col}" IS NULL`);
        break;
      case 'not_is':
        if (f.value === null) clauses.push(`${prefix}"${col}" IS NOT NULL`);
        break;
      default:
        break;
    }
  }
  return { clauses, params, nextIdx: idx };
}

function formatParamValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object' && !(val instanceof Date) && !Buffer.isBuffer(val)) {
    return JSON.stringify(val);
  }
  return val;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validação de autenticação JWT
    const cookieStore = await cookies();
    const token = cookieStore.get('atelier_session')?.value;
    if (!token) {
      return NextResponse.json({ data: null, error: { message: 'Not authenticated' } }, { status: 401 });
    }

    const { verifyToken } = await import('@/lib/auth');
    const payload = await verifyToken(token);
    if (payload.type !== 'session' || !payload.sub || !payload.role) {
      return NextResponse.json({ data: null, error: { message: 'Invalid token' } }, { status: 401 });
    }

    const userRole = String(payload.role);
    const userId = String(payload.sub);

    const body = await request.json();
    const {
      table,
      operation,
      columns,
      data,
      filters = [],
      orders = [],
      limit,
      single,
      maybeSingle,
      head,
      count,
    } = body;

    if (!ALLOWED_TABLES.has(table) && !String(table || '').startsWith('fin_')) {
      console.warn(`[db/query] Blocked query to unlisted table: ${table}`);
      return NextResponse.json(
        { data: single || maybeSingle ? null : [], error: { message: `Tabela não permitida: ${table}` } },
        { status: 403 }
      );
    }

    // 2. Autorização por tabela × role × operação × colunas
    const authCheck = authorizeDbQuery({
      role: userRole,
      userId,
      table,
      operation,
      columns,
      data,
      filters,
    });

    if (!authCheck.allowed) {
      return NextResponse.json(
        { data: null, error: { message: authCheck.reason || 'Acesso negado.' } },
        { status: authCheck.status }
      );
    }

    const sql = getDb();

    switch (operation) {
      // =================== SELECT ===================
      case 'select': {
        const joinFk = PROFILE_JOIN_FK[table];
        const wantsProfiles = Boolean(joinFk && typeof columns === 'string' && columns.includes('profiles'));
        const wantsTeamPerf = Boolean(
          table === 'profiles' && typeof columns === 'string' && columns.includes('team_performance')
        );
        const selectCols = parseSelectCols(columns || '*');

        let q: string;
        let tablePrefix: string | undefined = undefined;

        if (wantsProfiles && joinFk) {
          tablePrefix = table;
          const baseCols =
            selectCols === '*'
              ? `"${table}".*`
              : selectCols
                  .split(',')
                  .map((c) => `"${table}".${c.trim()}`)
                  .join(', ');
          q = `SELECT ${baseCols}, json_build_object('id', pr.id, 'nome', pr.nome, 'avatar_url', pr.avatar_url, 'role', pr.role, 'username', pr.username, 'empresa', pr.empresa, 'instagram', pr.instagram, 'email', pr.email, 'area_atuacao', pr.area_atuacao, 'segmento', pr.segmento, 'localizacao', pr.localizacao, 'is_founding_member', pr.is_founding_member) as profiles FROM "${table}" LEFT JOIN "profiles" pr ON "${table}"."${joinFk}" = pr.id`;
        } else if (wantsTeamPerf) {
          tablePrefix = 'profiles';
          const baseCols =
            selectCols === '*'
              ? `"profiles".*`
              : selectCols
                  .split(',')
                  .map((c) => `"profiles".${c.trim()}`)
                  .join(', ');
          q = `SELECT ${baseCols}, CASE WHEN tp.user_id IS NULL THEN '[]'::json ELSE json_build_array(json_build_object('exp_points', tp.exp_points, 'level_name', tp.level_name, 'total_tasks_completed', tp.total_tasks_completed, 'avg_tnps', tp.avg_tnps, 'on_time_rate', 100)) END as team_performance FROM "profiles" LEFT JOIN "team_performance" tp ON "profiles"."id" = tp.user_id`;
        } else {
          q = `SELECT ${selectCols} FROM "${table}"`;
        }

        let allParams: any[] = [];

        if (filters.length > 0) {
          const w = buildWhere(filters, tablePrefix);
          allParams = w.params;
          q += ` WHERE ${w.clauses.join(' AND ')}`;
        }

        if (orders.length > 0) {
          const oc = orders.map((o: any) => {
            const prefix = tablePrefix ? `"${tablePrefix}".` : '';
            let c = `${prefix}"${sanitizeId(o.column)}" ${o.ascending !== false ? 'ASC' : 'DESC'}`;
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
            const cResult = await (sql as any).query(cq, w.params);
            return NextResponse.json({ data: null, error: null, count: cResult[0]?.count || 0 });
          }
          const cResult = await (sql as any).query(cq);
          return NextResponse.json({ data: null, error: null, count: cResult[0]?.count || 0 });
        }

        const rawResult = await (sql as any).query(q, allParams);
        const result = sanitizeQueryResult(table, rawResult, userRole, userId);

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
            error: result.length === 0 ? { message: 'Row not found', code: 'PGRST116' } : null,
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
        const colNames = keys.map((k) => `"${sanitizeId(k)}"`).join(', ');
        const allParams: any[] = [];
        const valRows = rows.map((row) => {
          const ph = keys.map((k) => {
            allParams.push(formatParamValue(row[k]));
            return `$${allParams.length}`;
          });
          return `(${ph.join(', ')})`;
        });

        const q = `INSERT INTO "${table}" (${colNames}) VALUES ${valRows.join(', ')} RETURNING *`;
        const rawResult = await (sql as any).query(q, allParams);
        const result = sanitizeQueryResult(table, rawResult, userRole, userId);
        return NextResponse.json({ data: Array.isArray(data) ? result : result[0], error: null });
      }

      // =================== UPDATE ===================
      case 'update': {
        if (!data || Object.keys(data).length === 0) {
          return NextResponse.json({ data: null, error: null });
        }
        const keys = Object.keys(data);
        const allParams: any[] = [];
        const setClauses = keys.map((k) => {
          allParams.push(formatParamValue(data[k]));
          return `"${sanitizeId(k)}" = $${allParams.length}`;
        });

        let q = `UPDATE "${table}" SET ${setClauses.join(', ')}`;

        if (filters.length > 0) {
          const w = buildWhere(filters, allParams.length + 1);
          allParams.push(...w.params);
          q += ` WHERE ${w.clauses.join(' AND ')}`;
        }

        q += ' RETURNING *';
        const rawResult = await (sql as any).query(q, allParams);
        const result = sanitizeQueryResult(table, rawResult, userRole, userId);
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
        const rawResult = await (sql as any).query(q, allParams);
        const result = sanitizeQueryResult(table, rawResult, userRole, userId);
        return NextResponse.json({ data: result, error: null });
      }

      // =================== UPSERT ===================
      case 'upsert': {
        const rows = Array.isArray(data) ? data : [data];
        if (rows.length === 0) return NextResponse.json({ data: [], error: null });

        const keys = Object.keys(rows[0]);
        const colNames = keys.map((k) => `"${sanitizeId(k)}"`).join(', ');
        const allParams: any[] = [];
        const valRows = rows.map((row) => {
          const ph = keys.map((k) => {
            allParams.push(formatParamValue(row[k]));
            return `$${allParams.length}`;
          });
          return `(${ph.join(', ')})`;
        });

        const updCols = keys
          .filter((k) => k !== 'id')
          .map((k) => `"${sanitizeId(k)}" = EXCLUDED."${sanitizeId(k)}"`)
          .join(', ');
        const q = `INSERT INTO "${table}" (${colNames}) VALUES ${valRows.join(', ')} ON CONFLICT (id) DO UPDATE SET ${updCols} RETURNING *`;
        const rawResult = await (sql as any).query(q, allParams);
        const result = sanitizeQueryResult(table, rawResult, userRole, userId);
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
