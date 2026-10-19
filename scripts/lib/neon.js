// scripts/lib/neon.js
// Conexão para scripts de migração/teste. Nunca embute credenciais:
// lê POSTGRES_URL / DATABASE_URL do ambiente ou de frontend/.env.local.
const fs = require('fs');
const path = require('path');
const { neon } = require('../../frontend/node_modules/@neondatabase/serverless');

function loadEnvLocal() {
  const file = path.join(__dirname, '..', '..', 'frontend', '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key] === undefined) {
      process.env[key] = raw.replace(/^['"]|['"]$/g, '');
    }
  }
}

function getSql() {
  loadEnvLocal();
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url || url.includes('supabase.co')) {
    throw new Error('POSTGRES_URL (Neon) não encontrada no ambiente nem em frontend/.env.local.');
  }
  return neon(url);
}

module.exports = { getSql, loadEnvLocal };
