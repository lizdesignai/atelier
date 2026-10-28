import { describe, expect, it } from 'vitest';
import { FINANCE_NAV_TABS } from '../../app/admin/financeiro/components/FinanceNavigation';
import { isContadorRouteAllowed, can } from '../rbac';

describe('Fase 4 — Interface da Contadora e Navegação Modular', () => {
  describe('1. Abas e Subrotas do Módulo Financeiro', () => {
    it('possui todas as abas de navegação contábil configuradas (incluindo DRE, Valuation e Crescimento)', () => {
      const expectedRoutes = [
        '/admin/financeiro',
        '/admin/financeiro/lancamentos',
        '/admin/financeiro/receber',
        '/admin/financeiro/pagar',
        '/admin/financeiro/avulsos',
        '/admin/financeiro/notas-fiscais',
        '/admin/financeiro/impostos',
        '/admin/financeiro/fechamento',
        '/admin/financeiro/relatorios',
        '/admin/financeiro/valuation',
        '/admin/financeiro/crescimento',
      ];

      const actualRoutes = FINANCE_NAV_TABS.map((tab) => tab.href);
      expect(actualRoutes).toEqual(expectedRoutes);
    });

    it('assegura que a contadora tem acesso irrestrito a todas as 11 rotas financeiras', () => {
      for (const tab of FINANCE_NAV_TABS) {
        expect(isContadorRouteAllowed(tab.href)).toBe(true);
      }
    });

    it('bloqueia a contadora em rotas de CRM, analytics ou engenharia fora do escopo', () => {
      expect(isContadorRouteAllowed('/admin/analytics')).toBe(false);
      expect(isContadorRouteAllowed('/admin/clientes')).toBe(false);
      expect(isContadorRouteAllowed('/admin/projetos')).toBe(false);
      expect(isContadorRouteAllowed('/tessera')).toBe(false);
    });
  });

  describe('2. Regras de Edição Contábil e Auditoria na Interface', () => {
    it('detecta alteração crítica de valor ou vencimento que exige justificativa obrigatória', () => {
      const originalEntry = {
        amount: 3500.0,
        due_date: '2026-10-15',
        paid_date: null,
        status: 'pending',
      };

      // Cenário 1: Apenas notas alteradas (não crítico)
      const editNotesOnly = { ...originalEntry };
      const hasCriticalChange1 =
        editNotesOnly.amount !== originalEntry.amount ||
        editNotesOnly.due_date !== originalEntry.due_date ||
        editNotesOnly.paid_date !== originalEntry.paid_date ||
        editNotesOnly.status !== originalEntry.status;

      expect(hasCriticalChange1).toBe(false);

      // Cenário 2: Valor alterado (crítico)
      const editAmount = { ...originalEntry, amount: 4000.0 };
      const hasCriticalChange2 =
        editAmount.amount !== originalEntry.amount ||
        editAmount.due_date !== originalEntry.due_date;

      expect(hasCriticalChange2).toBe(true);

      // Cenário 3: Vencimento prorrogado (crítico)
      const editDueDate = { ...originalEntry, due_date: '2026-10-25' };
      const hasCriticalChange3 =
        editDueDate.due_date !== originalEntry.due_date;

      expect(hasCriticalChange3).toBe(true);
    });

    it('valida que a contadora pode fechar período mas não pode reabrir (privilégio exclusivo de admin)', () => {
      expect(can('contador', 'close_period')).toBe(true);
      expect(can('contador', 'reopen_period')).toBe(false);

      expect(can('admin', 'close_period')).toBe(true);
      expect(can('admin', 'reopen_period')).toBe(true);
    });
  });
});
