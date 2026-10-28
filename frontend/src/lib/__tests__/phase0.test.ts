import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveDatabaseUrl } from '../db';
import { resolveJwtSecretString } from '../auth';
import {
  ALLOWED_TABLES,
  authorizeDbQuery,
  sanitizeQueryResult,
} from '../dbQueryPolicy';
import {
  computeMigrationChecksum,
  loadMigrationFiles,
  parseMigrationFilename,
} from '../migrations';
import { isFinanceV2Enabled } from '../featureFlags';

describe('Fase 0 — Segurança e Fundação', () => {
  describe('1. Validação Fail-Fast de Credenciais (DB & JWT)', () => {
    it('rejeita ausência de POSTGRES_URL/DATABASE_URL ou URLs antigas do Supabase', () => {
      expect(() => resolveDatabaseUrl({})).toThrow(/POSTGRES_URL/);
      expect(() =>
        resolveDatabaseUrl({ POSTGRES_URL: 'https://abc.supabase.co/postgres' })
      ).toThrow(/POSTGRES_URL/);
    });

    it('aceita connection string válida do Neon', () => {
      const url = 'postgresql://user:pass@ep-test.sa-east-1.aws.neon.tech/neondb?sslmode=require';
      expect(resolveDatabaseUrl({ POSTGRES_URL: url })).toBe(url);
    });

    it('rejeita ausência de JWT_SECRET e ignora variáveis NEXT_PUBLIC_*', () => {
      expect(() =>
        resolveJwtSecretString({
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: 'chave-publica-muito-longa-exposta-no-browser',
        })
      ).toThrow(/JWT_SECRET/);
      expect(() => resolveJwtSecretString({ JWT_SECRET: 'curta' })).toThrow(/JWT_SECRET/);
    });

    it('aceita JWT_SECRET forte de servidor', () => {
      const secret = 'segredo-de-servidor-com-mais-de-16-caracteres';
      expect(resolveJwtSecretString({ JWT_SECRET: secret })).toBe(secret);
    });
  });

  describe('2. Whitelist e Autorização em /api/db/query (RBAC)', () => {
    it('inclui financial_outflows, financial_closings e t_nps_scores na ALLOWED_TABLES', () => {
      expect(ALLOWED_TABLES.has('financial_outflows')).toBe(true);
      expect(ALLOWED_TABLES.has('financial_closings')).toBe(true);
      expect(ALLOWED_TABLES.has('t_nps_scores')).toBe(true);
    });

    it('permite tabelas financeiras apenas para admin, gestor e contador', () => {
      for (const role of ['admin', 'gestor', 'contador']) {
        expect(
          authorizeDbQuery({
            role,
            userId: 'u-1',
            table: 'financial_outflows',
            operation: 'select',
          }).allowed
        ).toBe(true);

        expect(
          authorizeDbQuery({
            role,
            userId: 'u-1',
            table: 'fin_entries',
            operation: 'insert',
            data: { amount: 100 },
          }).allowed
        ).toBe(true);
      }

      for (const role of ['client', 'colaborador']) {
        const resOutflows = authorizeDbQuery({
          role,
          userId: 'u-2',
          table: 'financial_outflows',
          operation: 'select',
        });
        expect(resOutflows.allowed).toBe(false);
        expect(resOutflows.status).toBe(403);

        const resFin = authorizeDbQuery({
          role,
          userId: 'u-2',
          table: 'fin_entries',
          operation: 'select',
        });
        expect(resFin.allowed).toBe(false);
        expect(resFin.status).toBe(403);
      }
    });

    it('bloqueia clientes em tabelas internas da equipe (agencies, leads, tessera_*, etc.)', () => {
      for (const table of ['agencies', 'leads', 'team_performance', 'work_sessions', 'tessera_work_items']) {
        const res = authorizeDbQuery({
          role: 'client',
          userId: 'client-1',
          table,
          operation: 'select',
        });
        expect(res.allowed).toBe(false);
        expect(res.status).toBe(403);
      }
    });

    it('impede escrita em schema_migrations mesmo para admin via /api/db/query', () => {
      const readRes = authorizeDbQuery({
        role: 'admin',
        userId: 'admin-1',
        table: 'schema_migrations',
        operation: 'select',
      });
      expect(readRes.allowed).toBe(true);

      const writeRes = authorizeDbQuery({
        role: 'admin',
        userId: 'admin-1',
        table: 'schema_migrations',
        operation: 'delete',
      });
      expect(writeRes.allowed).toBe(false);
      expect(writeRes.status).toBe(403);
    });

    it('impede escalonamento de privilégio e edição de perfil alheio em profiles', () => {
      // Tentar alterar password_hash é bloqueado mesmo para admin via /api/db/query
      expect(
        authorizeDbQuery({
          role: 'admin',
          userId: 'admin-1',
          table: 'profiles',
          operation: 'update',
          data: { password_hash: 'hack' },
          filters: [{ type: 'eq', column: 'id', value: 'admin-1' }],
        }).allowed
      ).toBe(false);

      // Cliente tentando virar admin
      expect(
        authorizeDbQuery({
          role: 'client',
          userId: 'client-1',
          table: 'profiles',
          operation: 'update',
          data: { role: 'admin' },
          filters: [{ type: 'eq', column: 'id', value: 'client-1' }],
        }).allowed
      ).toBe(false);

      // Cliente tentando editar o perfil de outro usuário
      expect(
        authorizeDbQuery({
          role: 'client',
          userId: 'client-1',
          table: 'profiles',
          operation: 'update',
          data: { bio: 'Alterado' },
          filters: [{ type: 'eq', column: 'id', value: 'other-user' }],
        }).allowed
      ).toBe(false);

      // Cliente editando o próprio bio/avatar
      expect(
        authorizeDbQuery({
          role: 'client',
          userId: 'client-1',
          table: 'profiles',
          operation: 'update',
          data: { bio: 'Minha bio' },
          filters: [{ type: 'eq', column: 'id', value: 'client-1' }],
        }).allowed
      ).toBe(true);
    });

    it('impede que cliente ou colaborador alterem financial_value ou billing_date em projects', () => {
      for (const role of ['client', 'colaborador']) {
        expect(
          authorizeDbQuery({
            role,
            userId: 'u-1',
            table: 'projects',
            operation: 'update',
            data: { financial_value: 99999 },
            filters: [{ type: 'eq', column: 'id', value: 'proj-1' }],
          }).allowed
        ).toBe(false);
      }

      for (const role of ['admin', 'gestor', 'contador']) {
        expect(
          authorizeDbQuery({
            role,
            userId: 'u-1',
            table: 'projects',
            operation: 'update',
            data: { financial_value: 3500, billing_date: '2026-11-10' },
            filters: [{ type: 'eq', column: 'id', value: 'proj-1' }],
          }).allowed
        ).toBe(true);
      }
    });
  });

  describe('3. Sanitização de Respostas (profiles e projects)', () => {
    const sampleProfile = {
      id: 'user-target',
      nome: 'Maria',
      email: 'maria@atelier.com',
      role: 'gestor',
      password_hash: '$2a$12$secret',
      mfa_secret: 'JBSWY3DPEHPK3PXP',
      password_reset_token: 'tok-123',
      password_reset_expires: '2026-12-01',
      base_salary: 4500,
      nif: '123.456.789-00',
      endereco: 'Rua A, 100',
      telefone: '11999999999',
    };

    it('nunca expõe password_hash, mfa_secret ou password_reset_token para nenhuma role', () => {
      for (const role of ['admin', 'gestor', 'contador', 'colaborador', 'client']) {
        const sanitized = sanitizeQueryResult('profiles', [sampleProfile], role, 'caller-id')[0];
        expect(sanitized.password_hash).toBeUndefined();
        expect(sanitized.mfa_secret).toBeUndefined();
        expect(sanitized.password_reset_token).toBeUndefined();
        expect(sanitized.password_reset_expires).toBeUndefined();
      }
    });

    it('oculta base_salary para colaborador e client, mantendo para roles financeiras', () => {
      expect(
        sanitizeQueryResult('profiles', [sampleProfile], 'contador', 'c-1')[0].base_salary
      ).toBe(4500);
      expect(
        sanitizeQueryResult('profiles', [sampleProfile], 'colaborador', 'col-1')[0].base_salary
      ).toBeUndefined();
      expect(
        sanitizeQueryResult('profiles', [sampleProfile], 'client', 'cli-1')[0].base_salary
      ).toBeUndefined();
    });

    it('oculta PII (nif, endereco, telefone) de terceiros quando consultado por client', () => {
      const thirdParty = sanitizeQueryResult('profiles', [sampleProfile], 'client', 'another-client')[0];
      expect(thirdParty.nif).toBeUndefined();
      expect(thirdParty.endereco).toBeUndefined();
      expect(thirdParty.telefone).toBeUndefined();
      expect(thirdParty.nome).toBe('Maria');

      const ownProfile = sanitizeQueryResult('profiles', [sampleProfile], 'client', 'user-target')[0];
      expect(ownProfile.nif).toBe('123.456.789-00');
      expect(ownProfile.endereco).toBe('Rua A, 100');
    });

    it('filtra projetos de outros clientes quando o chamador é client', () => {
      const projects = [
        { id: 'p1', client_id: 'cli-1', financial_value: 2000 },
        { id: 'p2', client_id: 'cli-2', financial_value: 5000 },
      ];
      const clientView = sanitizeQueryResult('projects', projects, 'client', 'cli-1');
      expect(clientView).toHaveLength(1);
      expect(clientView[0].id).toBe('p1');

      const contadorView = sanitizeQueryResult('projects', projects, 'contador', 'cont-1');
      expect(contadorView).toHaveLength(2);
    });
  });

  describe('4. Runner de Migrações Versionadas e Feature Flag FINANCE_V2', () => {
    it('calcula checksum SHA-256 idêntico para LF e CRLF', () => {
      const lf = 'SELECT 1;\nSELECT 2;\n';
      const crlf = 'SELECT 1;\r\nSELECT 2;\r\n';
      expect(computeMigrationChecksum(lf)).toBe(computeMigrationChecksum(crlf));
    });

    it('valida o padrão de nome de arquivo NNN_descricao.sql', () => {
      expect(parseMigrationFilename('001_phase0_foundation.sql')).toEqual({
        version: '001',
        name: 'phase0_foundation',
      });
      expect(parseMigrationFilename('invalido.sql')).toBeNull();
    });

    it('carrega as migrações do diretório db/migrations', () => {
      const dir = path.resolve(__dirname, '../../../db/migrations');
      const files = loadMigrationFiles(dir);
      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(files[0].version).toBe('001');
    });

    it('avalia a feature flag FINANCE_V2 corretamente', () => {
      expect(isFinanceV2Enabled({})).toBe(false);
      expect(isFinanceV2Enabled({ NEXT_PUBLIC_FINANCE_V2: 'true' })).toBe(true);
      expect(isFinanceV2Enabled({ FINANCE_V2: '1' })).toBe(true);
      expect(isFinanceV2Enabled({ FINANCE_V2: 'false' }, true)).toBe(true);
    });
  });
});
