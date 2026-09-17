import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let sqlInstance: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> {
  const connStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connStr) {
    throw new Error('POSTGRES_URL or DATABASE_URL environment variable is not set');
  }
  if (!sqlInstance) {
    sqlInstance = neon(connStr);
  }
  return sqlInstance;
}
