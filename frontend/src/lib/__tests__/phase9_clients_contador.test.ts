// src/lib/__tests__/phase9_clients_contador.test.ts
// Testes unitários para leitura de clientes ativos, recorrência e perfil de contadora.

import { describe, it, expect, vi } from 'vitest';
import { extractBillingDay } from '../finance/recurrenceService';
import { isContadorRouteAllowed, can } from '../rbac';

describe('Phase 9: Leitura de Clientes & Regras de Acesso da Contadora', () => {
  describe('extractBillingDay', () => {
    it('deve extrair o dia corretamente de uma instância Date do Postgres', () => {
      const date = new Date(Date.UTC(2026, 9, 15)); // 15 de Outubro de 2026
      expect(extractBillingDay(date)).toBe(15);
    });

    it('deve extrair o dia de strings ISO', () => {
      expect(extractBillingDay('2026-10-25')).toBe(25);
      expect(extractBillingDay('2026-07-05T03:00:00.000Z')).toBe(5);
    });

    it('deve extrair dia numérico simples e usar fallback quando ausente', () => {
      expect(extractBillingDay('10')).toBe(10);
      expect(extractBillingDay(null)).toBe(10);
      expect(extractBillingDay(undefined)).toBe(10);
    });
  });

  describe('Permissões da Contadora (RBAC)', () => {
    it('deve permitir acesso às rotas de Bills & Payments, Vêneto e Sintonia', () => {
      expect(isContadorRouteAllowed('/admin/financeiro')).toBe(true);
      expect(isContadorRouteAllowed('/admin/financeiro/receber')).toBe(true);
      expect(isContadorRouteAllowed('/admin/financeiro/pagar')).toBe(true);
      expect(isContadorRouteAllowed('/admin/financeiro/lancamentos')).toBe(true);
      expect(isContadorRouteAllowed('/admin/financeiro/fechamento')).toBe(true);
      expect(isContadorRouteAllowed('/admin/fio')).toBe(true);
      expect(isContadorRouteAllowed('/comunidade')).toBe(true);
      expect(isContadorRouteAllowed('/configuracoes')).toBe(true);
      expect(isContadorRouteAllowed('/api/finance/entries')).toBe(true);
    });

    it('deve bloquear estritamente acesso a áreas internas de CRM, Gestão e Projetos', () => {
      expect(isContadorRouteAllowed('/admin/jtbd')).toBe(false);
      expect(isContadorRouteAllowed('/admin/gestao')).toBe(false);
      expect(isContadorRouteAllowed('/admin/projetos')).toBe(false);
      expect(isContadorRouteAllowed('/admin/analytics')).toBe(false);
      expect(isContadorRouteAllowed('/tessera')).toBe(false);
      expect(isContadorRouteAllowed('/brandbook')).toBe(false);
    });

    it('deve validar capacidades financeiras adequadas para contadora', () => {
      expect(can('contador', 'view_financial')).toBe(true);
      expect(can('contador', 'edit_payment_date_value')).toBe(true);
      expect(can('contador', 'create_outflow')).toBe(true);
      expect(can('contador', 'create_adhoc_service')).toBe(true);
      expect(can('contador', 'manage_invoices')).toBe(true);
      expect(can('contador', 'manage_taxes')).toBe(true);
      expect(can('contador', 'close_period')).toBe(true);
      // Operações restritas a admin
      expect(can('contador', 'delete_entry')).toBe(false);
      expect(can('contador', 'reopen_period')).toBe(false);
      expect(can('contador', 'view_individual_salaries')).toBe(false);
    });
  });
});
