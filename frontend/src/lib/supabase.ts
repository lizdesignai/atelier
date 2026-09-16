import { createClient } from '@supabase/supabase-js';

// The Supabase client is kept alive ONLY for supabase.storage (avatar uploads, etc).
// ALL database queries (.from()) and realtime (.channel()) are intercepted below
// and routed to our Neon PostgreSQL via /api/db/query.

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))
  ? process.env.NEXT_PUBLIC_SUPABASE_URL
  : 'https://tmmptilchainrsptwsxc.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// NEON PROXY BUILDER
// Mimics the Supabase PostgREST query builder API but routes queries
// through /api/db/query which executes them on Neon.
// ============================================================================

class NeonProxyBuilder implements PromiseLike<any> {
  private _table: string;
  private _op: string = '';
  private _cols: string = '*';
  private _data: any = null;
  private _filters: Array<{type: string; column: string; value: any}> = [];
  private _orders: Array<{column: string; ascending: boolean; nullsFirst?: boolean}> = [];
  private _limit: number | null = null;
  private _isSingle: boolean = false;
  private _isMaybeSingle: boolean = false;
  private _isHead: boolean = false;
  private _countMode: string | null = null;

  constructor(table: string) {
    this._table = table;
  }

  // ---- Operation Methods ----

  select(columns: string = '*', options?: { count?: string; head?: boolean }) {
    if (!this._op) this._op = 'select';
    this._cols = columns;
    if (options?.count) this._countMode = options.count;
    if (options?.head) this._isHead = options.head;
    return this;
  }

  insert(data: any) { this._op = 'insert'; this._data = data; return this; }
  update(data: any) { this._op = 'update'; this._data = data; return this; }
  upsert(data: any) { this._op = 'upsert'; this._data = data; return this; }
  delete() { this._op = 'delete'; return this; }

  // ---- Filter Methods ----

  eq(col: string, val: any) { this._filters.push({type: 'eq', column: col, value: val}); return this; }
  neq(col: string, val: any) { this._filters.push({type: 'neq', column: col, value: val}); return this; }
  gt(col: string, val: any) { this._filters.push({type: 'gt', column: col, value: val}); return this; }
  gte(col: string, val: any) { this._filters.push({type: 'gte', column: col, value: val}); return this; }
  lt(col: string, val: any) { this._filters.push({type: 'lt', column: col, value: val}); return this; }
  lte(col: string, val: any) { this._filters.push({type: 'lte', column: col, value: val}); return this; }
  in(col: string, vals: any[]) { this._filters.push({type: 'in', column: col, value: vals}); return this; }
  is(col: string, val: any) { this._filters.push({type: 'is', column: col, value: val}); return this; }
  not(col: string, op: string, val: any) { this._filters.push({type: 'not_' + op, column: col, value: val}); return this; }
  or(_filterStr: string, _opts?: any) { return this; }
  filter(col: string, op: string, val: any) { this._filters.push({type: op, column: col, value: val}); return this; }
  contains(_col: string, _val: any) { return this; }
  containedBy(_col: string, _val: any) { return this; }
  like(col: string, val: string) { this._filters.push({type: 'eq', column: col, value: val}); return this; }
  ilike(col: string, val: string) { this._filters.push({type: 'eq', column: col, value: val}); return this; }
  match(query: Record<string, any>) {
    Object.entries(query).forEach(([k, v]) => this.eq(k, v));
    return this;
  }

  // ---- Transform Methods ----

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this._orders.push({ column: col, ascending: opts?.ascending !== false, nullsFirst: opts?.nullsFirst });
    return this;
  }

  limit(n: number) { this._limit = n; return this; }
  range(from: number, to: number) { this._limit = to - from + 1; return this; }
  single() { this._isSingle = true; this._limit = 1; return this; }
  maybeSingle() { this._isMaybeSingle = true; this._limit = 1; return this; }
  csv() { return this; }
  returns() { return this; }

  // ---- PromiseLike Implementation ----
  // This makes the builder awaitable: const { data, error } = await supabase.from('x').select()

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): PromiseLike<TResult1 | TResult2> {
    return this._execute().then(onfulfilled, onrejected);
  }

  private async _execute(): Promise<{data: any; error: any; count?: number}> {
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this._table,
          operation: this._op || 'select',
          columns: this._cols,
          data: this._data,
          filters: this._filters,
          orders: this._orders,
          limit: this._limit,
          single: this._isSingle,
          maybeSingle: this._isMaybeSingle,
          head: this._isHead,
          count: this._countMode,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        return { data: null, error: errBody.error || { message: `HTTP ${res.status}` } };
      }

      return await res.json();
    } catch (error: any) {
      console.warn(`[NeonProxy] Query to "${this._table}" failed:`, error?.message);
      return { data: this._isSingle || this._isMaybeSingle ? null : [], error: null };
    }
  }
}

// ============================================================================
// MONKEY PATCH: supabase.from() -> NeonProxyBuilder
// This single override routes ALL supabase.from('table') calls through Neon.
// ============================================================================

// @ts-ignore
supabase.from = (table: string) => {
  return new NeonProxyBuilder(table) as any;
};

// ============================================================================
// MONKEY PATCH: supabase.rpc() -> Custom handler
// ============================================================================

// @ts-ignore
supabase.rpc = async (fnName: string, params?: any) => {
  if (fnName === 'get_unread_message_count') {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) return { data: 0, error: null };
      const { user } = await meRes.json();
      if (!user) return { data: 0, error: null };

      const result: any = await (new NeonProxyBuilder('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false) as any)._execute();

      return { data: result.count || 0, error: null };
    } catch {
      return { data: 0, error: null };
    }
  }
  
  if (fnName === 'get_unread_counts_per_channel') {
    return { data: [], error: null };
  }
  console.warn(`[NeonProxy] RPC "${fnName}" not implemented, returning null.`);
  return { data: null, error: null };
};

// ============================================================================
// MONKEY PATCH: supabase.channel() -> No-op (prevents WebSocket errors)
// Realtime will be implemented in Phase 4 with a dedicated service.
// ============================================================================

// @ts-ignore
supabase.channel = (_name: string) => {
  const noop: any = {
    on: (..._args: any[]) => noop,
    subscribe: (cb?: any) => { if (typeof cb === 'function') cb('SUBSCRIBED'); return noop; },
    unsubscribe: () => noop,
    track: async () => 'ok',
    send: async () => 'ok',
  };
  return noop;
};

// @ts-ignore
supabase.removeAllChannels = async () => [];
// @ts-ignore
supabase.removeChannel = async () => 'ok';

// ============================================================================
// MONKEY PATCH: supabase.auth.getSession() -> Custom JWT system
// (Preserved from Phase 2B migration)
// ============================================================================

// @ts-ignore
supabase.auth.getSession = async () => {
  try {
    // Client-side (Browser) OR Server-side fallback: fetch from /api/auth/me
    // Note: If running on server, we should use absolute URL or just rely on server actions directly.
    // For now, most supabase.auth.getSession() calls are on the client side.
    const baseUrl = typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/auth/me`);
    if (!res.ok) return { data: { session: null }, error: null };

    const data = await res.json();
    if (data?.user) {
      return {
        data: {
          session: {
            user: { id: data.user.id, email: data.user.email, role: data.user.role }
          }
        },
        error: null
      };
    }

    return { data: { session: null }, error: null };
  } catch (error: any) {
    console.error('[Supabase Mock] getSession error:', error);
    return { data: { session: null }, error };
  }
};

// @ts-ignore - No-op for auth state changes (auth is handled by our JWT system)
supabase.auth.onAuthStateChange = (_callback: any) => {
  return { data: { subscription: { unsubscribe: () => {} } } };
};

// ============================================================================
// MONKEY PATCH: supabase.storage.from() -> Routed to /api/storage/upload
// Enables seamless uploads bypassing client-side RLS using the server service role
// and generates clean, valid public URLs from our active Supabase Storage.
// ============================================================================

const origStorageFrom = supabase.storage.from.bind(supabase.storage);

// @ts-ignore
supabase.storage.from = (bucket: string) => {
  const originalBucket = origStorageFrom(bucket);

  return {
    ...originalBucket,
    upload: async (path: string, fileBody: any, fileOptions?: any) => {
      try {
        const formData = new FormData();
        formData.append('bucket', bucket);
        formData.append('path', path);
        formData.append('file', fileBody);
        if (fileOptions?.upsert) formData.append('upsert', 'true');
        if (fileOptions?.contentType) formData.append('contentType', fileOptions.contentType);

        const baseUrl = typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/api/storage/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const msg = errBody.error?.message || `Upload failed with status ${res.status}`;
          return { data: null, error: new Error(msg) };
        }

        const json = await res.json();
        return { data: json.data, error: json.error || null };
      } catch (err: any) {
        console.error(`[StorageProxy] Upload to "${bucket}/${path}" failed:`, err);
        return { data: null, error: err };
      }
    },
    getPublicUrl: (path: string, _options?: any) => {
      const effectiveBaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))
        ? process.env.NEXT_PUBLIC_SUPABASE_URL
        : 'https://tmmptilchainrsptwsxc.supabase.co';

      const cleanPath = (path || '').replace(/^\/+/, '');
      return {
        data: {
          publicUrl: `${effectiveBaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`
        }
      };
    }
  };
};