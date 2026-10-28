import { describe, expect, it } from 'vitest';
import {
  ALL_ROLES,
  can,
  isContadorRouteAllowed,
  isFinanceRole,
  isManagementRole,
  isStaffRole,
  type FinanceCapability,
  type UserRole,
} from '../rbac';

describe('Fase 1 — Role contador e RBAC Centralizado', () => {
  describe('1. Classificação e Grupos de Roles', () => {
    it('reconhece todas as 5 roles do sistema incluindo contador', () => {
      const expected: UserRole[] = ['client', 'colaborador', 'gestor', 'admin', 'contador'];
      expect(ALL_ROLES).toEqual(expected);
    });

    it('identifica corretamente as roles financeiras (admin, gestor, contador)', () => {
      expect(isFinanceRole('admin')).toBe(true);
      expect(isFinanceRole('gestor')).toBe(true);
      expect(isFinanceRole('contador')).toBe(true);
      expect(isFinanceRole('colaborador')).toBe(false);
      expect(isFinanceRole('client')).toBe(false);
      expect(isFinanceRole(null)).toBe(false);
    });

    it('identifica corretamente os membros de equipe interna (staff)', () => {
      expect(isStaffRole('admin')).toBe(true);
      expect(isStaffRole('gestor')).toBe(true);
      expect(isStaffRole('colaborador')).toBe(true);
      expect(isStaffRole('contador')).toBe(true);
      expect(isStaffRole('client')).toBe(false);
    });

    it('identifica a liderança executiva (management)', () => {
      expect(isManagementRole('admin')).toBe(true);
      expect(isManagementRole('gestor')).toBe(true);
      expect(isManagementRole('contador')).toBe(false);
      expect(isManagementRole('colaborador')).toBe(false);
      expect(isManagementRole('client')).toBe(false);
    });
  });

  describe('2. Matriz de Capacidades do Contador', () => {
    const operationalCapabilities: FinanceCapability[] = [
      'view_financial',
      'edit_payment_date_value',
      'create_outflow',
      'create_adhoc_service',
      'manage_invoices',
      'manage_taxes',
      'close_period',
    ];

    it('concede ao contador todas as permissões operacionais do dia a dia contábil', () => {
      for (const cap of operationalCapabilities) {
        expect(can('contador', cap)).toBe(true);
        expect(can('gestor', cap)).toBe(true);
        expect(can('admin', cap)).toBe(true);
      }
    });

    it('bloqueia estritamente clientes e colaboradores de todas as capacidades financeiras', () => {
      for (const cap of operationalCapabilities) {
        expect(can('client', cap)).toBe(false);
        expect(can('colaborador', cap)).toBe(false);
      }
    });

    it('restringe reabertura de período fechado e exclusão definitiva exclusivamente a admin', () => {
      expect(can('admin', 'reopen_period')).toBe(true);
      expect(can('gestor', 'reopen_period')).toBe(false);
      expect(can('contador', 'reopen_period')).toBe(false);

      expect(can('admin', 'delete_entry')).toBe(true);
      expect(can('gestor', 'delete_entry')).toBe(false);
      expect(can('contador', 'delete_entry')).toBe(false);
    });

    it('restringe visualização de salários nominais individuais apenas para admin', () => {
      expect(can('admin', 'view_individual_salaries')).toBe(true);
      expect(can('gestor', 'view_individual_salaries')).toBe(false);
      expect(can('contador', 'view_individual_salaries')).toBe(false);
    });

    it('permite parametrização de valuation apenas para admin e gestor', () => {
      expect(can('admin', 'manage_valuation_parameters')).toBe(true);
      expect(can('gestor', 'manage_valuation_parameters')).toBe(true);
      expect(can('contador', 'manage_valuation_parameters')).toBe(false);
      expect(can('colaborador', 'manage_valuation_parameters')).toBe(false);
    });
  });

  describe('3. Delimitação Estrita de Rotas do Contador (isContadorRouteAllowed)', () => {
    it('permite acesso a financeiro e suas subrotas', () => {
      expect(isContadorRouteAllowed('/admin/financeiro')).toBe(true);
      expect(isContadorRouteAllowed('/admin/financeiro/lancamentos')).toBe(true);
      expect(isContadorRouteAllowed('/admin/financeiro/impostos')).toBe(true);
      expect(isContadorRouteAllowed('/admin/financeiro/fechamento')).toBe(true);
    });

    it('permite comunicação interna (fio/sintonia), comunidade e configurações pessoais', () => {
      expect(isContadorRouteAllowed('/admin/fio')).toBe(true);
      expect(isContadorRouteAllowed('/admin/fio/canal-123')).toBe(true);
      expect(isContadorRouteAllowed('/comunidade')).toBe(true);
      expect(isContadorRouteAllowed('/comunidade/hub')).toBe(true);
      expect(isContadorRouteAllowed('/configuracoes')).toBe(true);
      expect(isContadorRouteAllowed('/configuracoes/mfa')).toBe(true);
    });

    it('bloqueia qualquer rota de produção, CRM, inteligência ou gestão', () => {
      expect(isContadorRouteAllowed('/admin/analytics')).toBe(false);
      expect(isContadorRouteAllowed('/admin/clientes')).toBe(false);
      expect(isContadorRouteAllowed('/admin/gerenciamento')).toBe(false);
      expect(isContadorRouteAllowed('/admin/gestao')).toBe(false);
      expect(isContadorRouteAllowed('/admin/jtbd')).toBe(false);
      expect(isContadorRouteAllowed('/admin/projetos')).toBe(false);
      expect(isContadorRouteAllowed('/tessera')).toBe(false);
      expect(isContadorRouteAllowed('/tessera/focus')).toBe(false);
    });
  });
});
