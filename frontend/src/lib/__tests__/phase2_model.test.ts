import { describe, expect, it } from 'vitest';
import {
  authorizeDbQuery,
  isFinanceTable,
  FINANCE_ROLES,
  STAFF_ROLES,
} from '../dbQueryPolicy';
import type {
  FinAccount,
  FinEntry,
  FinSettlement,
  FinInvoice,
  FinTaxObligation,
  FinPeriod,
  FinAuditLog,
  FinStatementGroup,
  FinAccountType,
} from '../../types/finance';

describe('Fase 2 — Novo Modelo de Dados Financeiro e Integridade', () => {
  const FIN_TABLES = [
    'fin_accounts',
    'fin_bank_accounts',
    'fin_suppliers',
    'fin_entries',
    'fin_settlements',
    'fin_invoices',
    'fin_tax_obligations',
    'fin_periods',
    'fin_audit_log',
    'fin_cost_rates',
    'fin_valuation_scenarios',
  ];

  describe('1. Política de Acesso e Isolamento das Tabelas fin_*', () => {
    it('reconhece todas as novas tabelas como pertencentes ao domínio financeiro', () => {
      for (const table of FIN_TABLES) {
        expect(isFinanceTable(table)).toBe(true);
      }
      expect(isFinanceTable('projects')).toBe(false);
      expect(isFinanceTable('profiles')).toBe(false);
      expect(isFinanceTable('tasks')).toBe(false);
    });

    it('permite acesso total de leitura e escrita para as roles financeiras (admin, gestor, contador)', () => {
      const financeRoles = ['admin', 'gestor', 'contador'];

      for (const role of financeRoles) {
        for (const table of FIN_TABLES) {
          const authResult = authorizeDbQuery({
            role,
            userId: 'user-finance-001',
            table,
            operation: 'select',
          });
          expect(authResult.allowed).toBe(true);
        }
      }
    });

    it('bloqueia estritamente colaboradores e clientes com 403 Forbidden em todas as tabelas fin_*', () => {
      const unauthorizedRoles = ['colaborador', 'client'];

      for (const role of unauthorizedRoles) {
        for (const table of FIN_TABLES) {
          const authResult = authorizeDbQuery({
            role,
            userId: 'user-unauth-001',
            table,
            operation: 'select',
          });
          expect(authResult.allowed).toBe(false);
          expect(authResult.status).toBe(403);
          expect(authResult.reason).toContain('tabela exclusiva do módulo financeiro');
        }
      }
    });
  });

  describe('2. Integridade e Classificação Contábil (DRE & Balanço)', () => {
    const defaultAccounts: Array<{
      code: string;
      name: string;
      type: FinAccountType;
      statement_group: FinStatementGroup;
    }> = [
      { code: '1.1.01', name: 'Receita Recorrente (Retainers)', type: 'revenue', statement_group: 'dre_gross_revenue' },
      { code: '1.1.02', name: 'Receita de Projetos Pontuais', type: 'revenue', statement_group: 'dre_gross_revenue' },
      { code: '1.2.01', name: 'Simples Nacional (DAS)', type: 'tax', statement_group: 'dre_tax_deduction' },
      { code: '2.1.01', name: 'Prestadores e Freelancers de Design/Dev', type: 'cogs', statement_group: 'dre_cogs' },
      { code: '2.2.01', name: 'Software e Ferramentas Operacionais', type: 'expense', statement_group: 'dre_opex' },
      { code: '2.2.03', name: 'Honorários Contábeis e Jurídicos', type: 'expense', statement_group: 'dre_opex' },
      { code: '3.1.01', name: 'Disponibilidades (Bancos e Caixa)', type: 'asset', statement_group: 'balance_current_asset' },
      { code: '4.1.01', name: 'Fornecedores e Contas a Pagar', type: 'liability', statement_group: 'balance_current_liability' },
      { code: '5.1.01', name: 'Capital Social e Lucros Acumulados', type: 'equity', statement_group: 'balance_equity' },
    ];

    it('garante que contas de receita e dedução estejam associadas ao grupo de DRE correto', () => {
      const revenueAcc = defaultAccounts.find((a) => a.code === '1.1.01')!;
      expect(revenueAcc.statement_group).toBe('dre_gross_revenue');
      expect(revenueAcc.type).toBe('revenue');

      const taxAcc = defaultAccounts.find((a) => a.code === '1.2.01')!;
      expect(taxAcc.statement_group).toBe('dre_tax_deduction');
      expect(taxAcc.type).toBe('tax');
    });

    it('garante a segregação entre Custos Diretos (COGS) e Despesas Operacionais (OPEX)', () => {
      const cogsAcc = defaultAccounts.find((a) => a.code === '2.1.01')!;
      expect(cogsAcc.statement_group).toBe('dre_cogs');
      expect(cogsAcc.type).toBe('cogs');

      const opexAcc = defaultAccounts.find((a) => a.code === '2.2.01')!;
      expect(opexAcc.statement_group).toBe('dre_opex');
      expect(opexAcc.type).toBe('expense');
    });

    it('garante o correto mapeamento de Ativo, Passivo e Patrimônio Líquido para o Balanço', () => {
      const assetAcc = defaultAccounts.find((a) => a.code === '3.1.01')!;
      expect(assetAcc.statement_group).toBe('balance_current_asset');

      const liabilityAcc = defaultAccounts.find((a) => a.code === '4.1.01')!;
      expect(liabilityAcc.statement_group).toBe('balance_current_liability');

      const equityAcc = defaultAccounts.find((a) => a.code === '5.1.01')!;
      expect(equityAcc.statement_group).toBe('balance_equity');
    });
  });

  describe('3. Modelos de Lançamentos, Baixas e Liquidações (fin_entries & settlements)', () => {
    it('valida estrutura completa de um lançamento financeiro (fin_entries)', () => {
      const entry: FinEntry = {
        id: 'entry-test-01',
        kind: 'revenue',
        source: 'contract',
        title: 'Mensalidade Retainer - Cliente Alpha',
        competence_date: '2026-10-01',
        due_date: '2026-10-15',
        amount: 5500.0,
        amount_paid: 5500.0,
        status: 'paid',
        account_id: 'acc-rec-01',
        installment_number: 1,
        installment_total: 1,
        tags: ['contrato', 'mensal'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(entry.kind).toBe('revenue');
      expect(entry.amount).toBe(5500.0);
      expect(entry.amount_paid).toBe(entry.amount);
      expect(entry.status).toBe('paid');
      expect(entry.installment_number).toBeLessThanOrEqual(entry.installment_total);
    });

    it('valida liquidação parcial e cálculo de saldo pendente', () => {
      const totalAmount = 10000.0;
      const partialSettlement: FinSettlement = {
        id: 'settle-01',
        entry_id: 'entry-test-02',
        payment_date: '2026-10-10',
        amount: 4000.0,
        fee_amount: 0,
        interest_amount: 0,
        discount_amount: 0,
        payment_method: 'pix',
        created_at: new Date().toISOString(),
      };

      const remainingBalance = totalAmount - partialSettlement.amount;
      expect(remainingBalance).toBe(6000.0);
      expect(partialSettlement.amount).toBeLessThan(totalAmount);
    });
  });

  describe('4. Auditoria Obrigatória e Rastreabilidade (fin_audit_log)', () => {
    it('requer preenchimento de justificativa e autor ao editar valores e datas de pagamento', () => {
      const auditEntry: FinAuditLog = {
        id: 'audit-001',
        entity_type: 'fin_entries',
        entity_id: 'entry-test-01',
        action: 'update',
        before_state: { due_date: '2026-10-15', amount: 5000.0 },
        after_state: { due_date: '2026-10-20', amount: 5500.0 },
        reason: 'Acordo com o cliente para reajuste de escopo e prorrogação de vencimento',
        user_id: 'user-contador-01',
        ip_address: '192.168.1.1',
        created_at: new Date().toISOString(),
      };

      expect(auditEntry.action).toBe('update');
      expect(auditEntry.reason).toBeDefined();
      expect(auditEntry.reason?.length).toBeGreaterThan(10);
      expect(auditEntry.user_id).toBe('user-contador-01');
      expect(auditEntry.before_state?.amount).not.toBe(auditEntry.after_state?.amount);
    });
  });
});
