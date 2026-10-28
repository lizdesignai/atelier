import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let sqlInstance: NeonQueryFunction<false, false> | null = null;
let cachedConnStr: string | null = null;

export function resolveDatabaseUrl(
  env: Record<string, string | undefined> = process.env
): string {
  const connStr = (env.POSTGRES_URL || env.DATABASE_URL || '').trim();

  if (!connStr || connStr.includes('supabase.co')) {
    throw new Error(
      'Configuração crítica ausente: defina POSTGRES_URL (ou DATABASE_URL) apontando para o banco Neon PostgreSQL.'
    );
  }

  return connStr;
}

export function getDb(): NeonQueryFunction<false, false> {
  const connStr = resolveDatabaseUrl(process.env);

  if (!sqlInstance || cachedConnStr !== connStr) {
    sqlInstance = neon(connStr, { disableWarningInBrowsers: true });
    cachedConnStr = connStr;
  }
  return sqlInstance;
}

export async function queryDb<T = any>(
  queryText: string,
  params: any[] = []
): Promise<T[]> {
  const sql = getDb();
  if (typeof (sql as any).query === 'function') {
    return (sql as any).query(queryText, params) as Promise<T[]>;
  }
  return (sql as any)(queryText, params) as Promise<T[]>;
}
