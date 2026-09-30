import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let sqlInstance: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> {
  let connStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  // Se estivermos em um ambiente que ainda aponta para o Supabase antigo, forçamos o Neon
  if (!connStr || connStr.includes('supabase.co')) {
    connStr = 'postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  }

  if (!sqlInstance) {
    sqlInstance = neon(connStr);
  }
  return sqlInstance;
}
