// src/lib/migrations.ts
// Runner de migrações SQL versionadas com controle de checksum (SHA-256) na tabela schema_migrations.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { resolveDatabaseUrl } from './db';

export interface MigrationFile {
  version: string;
  name: string;
  filename: string;
  fullPath: string;
  sql: string;
  checksum: string;
}

export interface AppliedMigration {
  version: string;
  name: string;
  checksum: string;
  applied_at: string;
  applied_by: string | null;
  execution_ms: number | null;
}

export interface MigrationStatusReport {
  applied: AppliedMigration[];
  pending: Array<Pick<MigrationFile, 'version' | 'name' | 'filename' | 'checksum'>>;
  checksumMismatches: Array<{
    version: string;
    expectedChecksum: string;
    actualChecksum: string;
  }>;
}

export function computeMigrationChecksum(sqlContent: string): string {
  // Normaliza CRLF -> LF para que o checksum seja idêntico em Windows e Linux
  const normalized = sqlContent.replace(/\r\n/g, '\n').trim();
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function parseMigrationFilename(filename: string): { version: string; name: string } | null {
  const match = filename.match(/^(\d{3,})_([a-zA-Z0-9_-]+)\.sql$/);
  if (!match) return null;
  return { version: match[1], name: match[2] };
}

export function loadMigrationFiles(
  migrationsDir: string = path.resolve(process.cwd(), 'db', 'migrations')
): MigrationFile[] {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const entries = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const files: MigrationFile[] = [];
  const seenVersions = new Set<string>();

  for (const filename of entries) {
    const parsed = parseMigrationFilename(filename);
    if (!parsed) {
      throw new Error(
        `Nome de migração inválido: "${filename}". Use o padrão NNN_descricao.sql (ex: 001_phase0_foundation.sql).`
      );
    }
    if (seenVersions.has(parsed.version)) {
      throw new Error(`Versão de migração duplicada detectada: ${parsed.version}`);
    }
    seenVersions.add(parsed.version);

    const fullPath = path.join(migrationsDir, filename);
    const sql = fs.readFileSync(fullPath, 'utf8');
    files.push({
      version: parsed.version,
      name: parsed.name,
      filename,
      fullPath,
      sql,
      checksum: computeMigrationChecksum(sql),
    });
  }

  return files;
}

async function ensureMigrationsTable(client: pg.Client): Promise<void> {
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
}

export async function getMigrationStatus(
  migrationsDir?: string
): Promise<MigrationStatusReport> {
  const connStr = resolveDatabaseUrl(process.env);
  const files = loadMigrationFiles(migrationsDir);

  const client = new pg.Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await ensureMigrationsTable(client);
    const res = await client.query<AppliedMigration>(
      `SELECT version, name, checksum, applied_at, applied_by, execution_ms FROM schema_migrations ORDER BY version ASC`
    );

    const appliedMap = new Map<string, AppliedMigration>(
      (res.rows as any[]).map((r: any) => [r.version, r as AppliedMigration])
    );
    const pending: MigrationStatusReport['pending'] = [];
    const checksumMismatches: MigrationStatusReport['checksumMismatches'] = [];

    for (const file of files) {
      const existing = appliedMap.get(file.version);
      if (!existing) {
        pending.push({
          version: file.version,
          name: file.name,
          filename: file.filename,
          checksum: file.checksum,
        });
      } else if (existing.checksum !== file.checksum) {
        checksumMismatches.push({
          version: file.version,
          expectedChecksum: existing.checksum,
          actualChecksum: file.checksum,
        });
      }
    }

    return {
      applied: res.rows,
      pending,
      checksumMismatches,
    };
  } finally {
    await client.end();
  }
}

export async function runPendingMigrations(options?: {
  migrationsDir?: string;
  appliedBy?: string;
  dryRun?: boolean;
}): Promise<{
  appliedNow: string[];
  alreadyApplied: string[];
  dryRun: boolean;
}> {
  const connStr = resolveDatabaseUrl(process.env);
  const files = loadMigrationFiles(options?.migrationsDir);
  const dryRun = Boolean(options?.dryRun);
  const appliedBy = options?.appliedBy || 'system';

  const client = new pg.Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await ensureMigrationsTable(client);
    const res = await client.query<AppliedMigration>(
      `SELECT version, name, checksum, applied_at, applied_by, execution_ms FROM schema_migrations ORDER BY version ASC`
    );
    const appliedMap = new Map<string, AppliedMigration>(
      (res.rows as any[]).map((r: any) => [r.version, r as AppliedMigration])
    );

    const appliedNow: string[] = [];
    const alreadyApplied: string[] = [];

    for (const file of files) {
      const existing = appliedMap.get(file.version);
      if (existing) {
        if (existing.checksum !== file.checksum) {
          throw new Error(
            `Checksum divergente na migração já aplicada ${file.filename}: esperado ${existing.checksum}, encontrado ${file.checksum}.`
          );
        }
        alreadyApplied.push(file.filename);
        continue;
      }

      if (dryRun) {
        appliedNow.push(file.filename);
        continue;
      }

      const start = Date.now();
      await client.query('BEGIN');
      try {
        await client.query(file.sql);
        const elapsed = Date.now() - start;
        await client.query(
          `INSERT INTO schema_migrations (version, name, checksum, applied_by, execution_ms)
           VALUES ($1, $2, $3, $4, $5)`,
          [file.version, file.name, file.checksum, appliedBy, elapsed]
        );
        await client.query('COMMIT');
        appliedNow.push(file.filename);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    return { appliedNow, alreadyApplied, dryRun };
  } finally {
    await client.end();
  }
}
