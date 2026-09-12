// Script de migração: Adiciona colunas de auth ao profiles e seta senha padrão.
// Executar com: node --experimental-strip-types migrate-auth.ts
// Ou: npx tsx migrate-auth.ts

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const POSTGRES_URL = process.env.POSTGRES_URL;
const DEFAULT_PASSWORD = 'Atelier2026!';

async function migrate() {
  if (!POSTGRES_URL) {
    console.error('❌ POSTGRES_URL não definida. Configure no .env ou exporte a variável.');
    process.exit(1);
  }

  const sql = neon(POSTGRES_URL);
  console.log('🔗 Conectado ao Neon PostgreSQL...\n');

  // 1. Adicionar colunas de auth
  console.log('📦 Adicionando colunas de autenticação à tabela profiles...');

  try {
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT`;
    console.log('  ✅ password_hash');
  } catch (e: any) {
    console.log('  ⚠️ password_hash:', e.message);
  }

  try {
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_secret TEXT`;
    console.log('  ✅ mfa_secret');
  } catch (e: any) {
    console.log('  ⚠️ mfa_secret:', e.message);
  }

  try {
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false`;
    console.log('  ✅ mfa_enabled');
  } catch (e: any) {
    console.log('  ⚠️ mfa_enabled:', e.message);
  }

  try {
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_verified BOOLEAN DEFAULT false`;
    console.log('  ✅ mfa_verified');
  } catch (e: any) {
    console.log('  ⚠️ mfa_verified:', e.message);
  }

  try {
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_reset_token TEXT`;
    console.log('  ✅ password_reset_token');
  } catch (e: any) {
    console.log('  ⚠️ password_reset_token:', e.message);
  }

  try {
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ`;
    console.log('  ✅ password_reset_expires');
  } catch (e: any) {
    console.log('  ⚠️ password_reset_expires:', e.message);
  }

  // 2. Hash da senha padrão
  console.log(`\n🔐 Gerando hash da senha padrão "${DEFAULT_PASSWORD}"...`);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  console.log(`  Hash: ${passwordHash.substring(0, 30)}...`);

  // 3. Atualizar usuários existentes que não têm password_hash
  console.log('\n👥 Atualizando usuários sem senha...');
  const result = await sql`
    UPDATE profiles 
    SET password_hash = ${passwordHash}
    WHERE password_hash IS NULL
    RETURNING id, email, role
  `;

  if (result.length > 0) {
    console.log(`  ✅ ${result.length} usuários atualizados com senha padrão:`);
    result.forEach((u: any) => {
      console.log(`     - ${u.email} (${u.role})`);
    });
  } else {
    console.log('  ℹ️ Todos os usuários já possuem senha configurada.');
  }

  // 4. Listar todos os usuários
  console.log('\n📋 Usuários no sistema:');
  const allUsers = await sql`
    SELECT id, email, role, nome, 
           CASE WHEN password_hash IS NOT NULL THEN '✅' ELSE '❌' END as has_password,
           CASE WHEN mfa_enabled THEN '✅' ELSE '❌' END as has_mfa
    FROM profiles 
    ORDER BY role, email
  `;

  console.log('  ┌─────────────────────────────────────────────────────────────────');
  console.log('  │ Email                          │ Role        │ Senha │ MFA');
  console.log('  ├─────────────────────────────────────────────────────────────────');
  allUsers.forEach((u: any) => {
    const email = (u.email || '').padEnd(30);
    const role = (u.role || '').padEnd(11);
    console.log(`  │ ${email} │ ${role} │ ${u.has_password}    │ ${u.has_mfa}`);
  });
  console.log('  └─────────────────────────────────────────────────────────────────');

  console.log('\n✨ Migração concluída com sucesso!\n');
  console.log('Próximos passos:');
  console.log('  1. Verifique se o JWT_SECRET está configurado no .env.local');
  console.log('  2. Reinicie o servidor Next.js');
  console.log('  3. Acesse /login e teste com qualquer e-mail existente + senha "Atelier2026!"');
}

migrate().catch(err => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
