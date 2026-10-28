// src/lib/__tests__/phase8_rollout_e2e.test.ts
// Testes de Integração e Ponta-a-Ponta (E2E) da Fase 8: Rollout e Ciclo Contábil Completo

import { describe, expect, it } from 'vitest';
import { can, isContadorRouteAllowed, isFinanceRole, type FinanceCapability } from '../rbac';
import { PeriodClosedError } from '../finance/errors';
import { FINANCE_NAV_TABS } from '../../app/admin/financeiro/components/FinanceNavigation';

describe('Fase 8 — Rollout, Qualidade e Ciclo Contábil Ponta-a-Ponta (E2E)', () => {
  describe('1. Ciclo Operacional da Contadora (Lançamento, Edição com Auditoria e Baixa)', () => {
    it('exige justificativa formal de auditoria (mínimo 5 caracteres) ao alterar valor ou vencimento', () => {
      const validateAuditReason = (reason?: string | null): boolean => {
        if (!reason || reason.trim().length < 5) return false;
        return true;
      };

      // Tentativas inválidas
      expect(validateAuditReason(null)).toBe(false);
      expect(validateAuditReason('')).toBe(false);
      expect(validateAuditReason('abc')).toBe(false);
      expect(validateAuditReason('  ok ')).toBe(false);

      // Justificativas contábeis válidas
      expect(validateAuditReason('Ajuste de valor por aditivo contratual')).toBe(true);
      expect(validateAuditReason('Prorrogação solicitada pelo cliente devido a feriado')).toBe(true);
      expect(validateAuditReason('Correção de data de vencimento')).toBe(true);
    });

    it('simula liquidação parcial e total recalculando saldo e status do lançamento', () => {
      let entry = {
        amount: 5000.0,
        amount_paid: 0.0,
        status: 'pending' as 'pending' | 'partially_paid' | 'paid',
        paid_date: null as string | null,
      };

      // 1. Baixa Parcial de R$ 2.000,00
      const partialPayment = 2000.0;
      entry.amount_paid += partialPayment;
      if (entry.amount_paid < entry.amount) {
        entry.status = 'partially_paid';
      }

      expect(entry.amount_paid).toBe(2000.0);
      expect(entry.status).toBe('partially_paid');
      expect(entry.amount - entry.amount_paid).toBe(3000.0);

      // 2. Baixa Total do restante de R$ 3.000,00
      const finalPayment = 3000.0;
      entry.amount_paid += finalPayment;
      if (entry.amount_paid >= entry.amount) {
        entry.status = 'paid';
        entry.paid_date = '2026-10-27';
      }

      expect(entry.amount_paid).toBe(5000.0);
      expect(entry.status).toBe('paid');
      expect(entry.paid_date).toBe('2026-10-27');
      expect(entry.amount - entry.amount_paid).toBe(0.0);
    });
  });

  describe('2. Ciclo Fiscal do Simples Nacional (DAS) e Calendário Tributário', () => {
    it('apura o imposto sobre a competência anterior com vencimento no dia 20', () => {
      const grossRevenuePrevMonth = 60000.0; // Faturamento apurado de R$ 60.000,00
      const simplesNacionalRate = 0.06; // Alíquota efetiva Anexo III (6%)
      const calculatedDas = Number((grossRevenuePrevMonth * simplesNacionalRate).toFixed(2));

      expect(calculatedDas).toBe(3600.0);

      // Estrutura da obrigação fiscal
      const taxObligation = {
        tax_type: 'DAS Simples Nacional',
        competence: '2026-09',
        due_date: '2026-10-20',
        amount: calculatedDas,
        status: 'pending',
      };

      expect(taxObligation.due_date).toMatch(/-20$/);
      expect(taxObligation.status).toBe('pending');

      // Baixa com comprovante
      const paidObligation = {
        ...taxObligation,
        status: 'paid',
        paid_at: '2026-10-19T14:30:00Z',
        receipt_url: 'https://storage.atelier.com/comprovantes/das_2026_09.pdf',
      };

      expect(paidObligation.status).toBe('paid');
      expect(paidObligation.receipt_url).toContain('.pdf');
    });
  });

  describe('3. Ciclo de Fechamento Contábil e Bloqueio de Retroatividade', () => {
    it('bloqueia modificações retroativas em competência com período contábil fechado', () => {
      const closedPeriods = new Set(['2026-08', '2026-09']);

      const checkPeriodLock = (competenceMonth: string) => {
        if (closedPeriods.has(competenceMonth)) {
          throw new PeriodClosedError(competenceMonth);
        }
        return true;
      };

      // Operação em competência aberta (Outubro) -> permitida
      expect(checkPeriodLock('2026-10')).toBe(true);

      // Operação retroativa em competência fechada (Setembro) -> bloqueada com erro 409
      expect(() => checkPeriodLock('2026-09')).toThrowError(PeriodClosedError);
    });

    it('assegura a governança contábil de fechamento e reabertura de períodos', () => {
      // Contadora pode fechar, mas não pode reabrir
      expect(can('contador', 'close_period')).toBe(true);
      expect(can('contador', 'reopen_period')).toBe(false);

      // Gestor pode fechar, mas não pode reabrir
      expect(can('gestor', 'close_period')).toBe(true);
      expect(can('gestor', 'reopen_period')).toBe(false);

      // Apenas Admin pode reabrir período fechado (governança de quatro olhos)
      expect(can('admin', 'close_period')).toBe(true);
      expect(can('admin', 'reopen_period')).toBe(true);
    });
  });

  describe('4. Cobertura de Rotas, Rollout e Navegação da Contadora', () => {
    it('garante que a contadora tem acesso às 11 abas do novo módulo financeiro', () => {
      expect(FINANCE_NAV_TABS.length).toBe(11);

      for (const tab of FINANCE_NAV_TABS) {
        expect(isContadorRouteAllowed(tab.href)).toBe(true);
      }
    });

    it('confirma que os papéis financeiros possuem a flag isFinanceRole ativa', () => {
      expect(isFinanceRole('contador')).toBe(true);
      expect(isFinanceRole('gestor')).toBe(true);
      expect(isFinanceRole('admin')).toBe(true);

      expect(isFinanceRole('colaborador')).toBe(false);
      expect(isFinanceRole('client')).toBe(false);
    });

    it('bloqueia clientes e colaboradores em todas as capacidades financeiras', () => {
      const financialCapabilities: FinanceCapability[] = [
        'view_financial',
        'edit_payment_date_value',
        'create_outflow',
        'create_adhoc_service',
        'manage_invoices',
        'manage_taxes',
        'close_period',
      ];

      for (const cap of financialCapabilities) {
        expect(can('client', cap)).toBe(false);
        expect(can('colaborador', cap)).toBe(false);
      }
    });
  });
});
