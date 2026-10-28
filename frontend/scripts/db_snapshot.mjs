#!/usr/bin/env node
/**
 * Gera um snapshot completo (schema DDL + dados das tabelas financeiras e críticas)
 * antes de executar migrações. Salva em frontend/db/snapshots/<timestamp>.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env.local'), quiet: true });
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });

const connStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connStr || connStr.includes('supabase.co')) {
  console.error('[db:snapshot] ERRO: POSTGRES_URL ou DATABASE_URL ausente/inválida.');
  process.exit(1);
}

const SNAPSHOT_TABLES = [
  'profiles',
  'projects',
  'agencies',
  'agency_subclients',
  'financial_outflows',
  'financial_closings',
  'team_performance',
  't_nps_scores',
  'orcamentos_identidade_visual',
  'orcamentos_gerenciamento_instagram',
];

async function run() {
  const client = new pg.Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const schemaColumns = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    const constraints = await client.query(`
      SELECT conrelid::regclass::text AS table_name, conname, contype, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE connamespace = 'public'::regnamespace
      ORDER BY 1, 2
    `);

    const data = {};
    for (const table of SNAPSHOT_TABLES) {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      if (exists.rowCount > 0) {
        const res = await client.query(`SELECT * FROM "${table}"`);
        data[table] = res.rows;
      }
    }

    const snapshotsDir = path.join(rootDir, 'db', 'snapshots');
    fs.mkdirSync(snapshotsDir, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = path.join(snapshotsDir, `snapshot-${ts}.json`);

    const payload = {
      createdAt: new Date().toISOString(),
      tablesCount: new Set(schemaColumns.rows.map((r) => r.table_name)).size,
      schemaColumns: schemaColumns.rows,
      constraints: constraints.rows,
      rowCounts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
      data,
    };

    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`[db:snapshot] Snapshot salvo com sucesso em: ${path.relative(rootDir, outPath)}`);
    console.log('[db:snapshot] Contagem de linhas:', payload.rowCounts);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('[db:snapshot] Falha:', err.message);
  process.exit(1);
});
