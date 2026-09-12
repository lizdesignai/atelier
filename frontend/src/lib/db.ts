import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let sqlInstance: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }
  if (!sqlInstance) {
    sqlInstance = neon(process.env.POSTGRES_URL);
  }
  return sqlInstance;
}
