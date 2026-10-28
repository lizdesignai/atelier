#!/usr/bin/env node
/**
 * CLI de Migrações Versionadas (Fase 0).
 * Uso:
 *   node scripts/migrate.mjs          -> aplica migrações pendentes
 *   node scripts/migrate.mjs --status -> mostra status (aplicadas vs pendentes)
 *   node scripts/migrate.mjs --dry    -> simula sem alterar o banco
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env.local'), quiet: true });
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });

const connStr = (process.env.POSTGRES_URL || process.env.DATABASE_URL || '').trim();
if (!connStr || connStr.includes('supabase.co')) {
  console.error('[db:migrate] ERRO: POSTGRES_URL ou DATABASE_URL ausente/inválida.');
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const statusOnly = args.has('--status');
const dryRun = args.has('--dry') || args.has('--dry-run');

function computeChecksum(sql) {
  return crypto.createHash('sha256').update(sql.replace(/\r\n/g, '\n').trim(), 'utf8').digest('hex');
}

function loadFiles() {
  const dir = path.join(rootDir, 'db', 'migrations');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))
    .map((filename) => {
      const m = filename.match(/^(\d{3,})_([a-zA-Z0-9_-]+)\.sql$/);
      if (!m) throw new Error(`Arquivo de migração fora do padrão NNN_nome.sql: ${filename}`);
      const sql = fs.readFileSync(path.join(dir, filename), 'utf8');
      return {
        version: m[1],
        name: m[2],
        filename,
        sql,
        checksum: computeChecksum(sql),
      };
    });
}

async function main() {
  const files = loadFiles();
  const client = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(120) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        applied_by VARCHAR(120),
        execution_ms INTEGER
      );
    `);

    const { rows: applied } = await client.query(
      `SELECT version, name, checksum, applied_at, applied_by, execution_ms FROM schema_migrations ORDER BY version ASC`
    );
    const appliedMap = new Map(applied.map((r) => [r.version, r]));

    if (statusOnly) {
      console.log('[db:migrate] Status das migrações:');
      for (const f of files) {
        const ex = appliedMap.get(f.version);
        if (!ex) {
          console.log(`  [PENDENTE] ${f.filename} (sha256: ${f.checksum.slice(0, 12)}...)`);
        } else if (ex.checksum !== f.checksum) {
          console.log(`  [DIVERGENTE!] ${f.filename} (esperado ${ex.checksum.slice(0, 12)}, atual ${f.checksum.slice(0, 12)})`);
        } else {
          console.log(`  [APLICADA] ${f.filename} em ${new Date(ex.applied_at).toISOString()} (${ex.execution_ms ?? 0}ms)`);
        }
      }
      return;
    }

    for (const f of files) {
      const ex = appliedMap.get(f.version);
      if (ex) {
        if (ex.checksum !== f.checksum) {
          throw new Error(`Checksum divergente em ${f.filename}`);
        }
        console.log(`[db:migrate] Já aplicada: ${f.filename}`);
        continue;
      }

      if (dryRun) {
        console.log(`[db:migrate] [DRY-RUN] Aplicaria: ${f.filename}`);
        continue;
      }

      const start = Date.now();
      await client.query('BEGIN');
      try {
        await client.query(f.sql);
        const ms = Date.now() - start;
        await client.query(
          `INSERT INTO schema_migrations (version, name, checksum, applied_by, execution_ms) VALUES ($1, $2, $3, $4, $5)`,
          [f.version, f.name, f.checksum, 'cli', ms]
        );
        await client.query('COMMIT');
        console.log(`[db:migrate] Aplicada com sucesso: ${f.filename} (${ms}ms)`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[db:migrate] Falha:', err.message);
  process.exit(1);
});
