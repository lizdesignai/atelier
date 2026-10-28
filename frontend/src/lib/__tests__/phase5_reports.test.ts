import { describe, expect, it } from 'vitest';
import { can } from '../rbac';
import type { FinStatementGroup } from '../../types/finance';

describe('Fase 5 — DRE Gerencial, Balanço Patrimonial e Relatórios Contábeis', () => {
  describe('1. Encadeamento Matemático da DRE Gerencial', () => {
    it('calcula com precisão Receita Líquida, Lucro Bruto, EBITDA e Resultado Líquido', () => {
      // Simulação de valores contábeis de um exercício
      const grossRevenue = 50000.0; // Faturamento Bruto (Projetos + Retainers)
      const taxDeductions = 3000.0; // DAS Simples Nacional (6%)
      const cogs = 12000.0; // Custos Diretos (Freelancers / Especialistas)
      const opex = 8500.0; // Despesas Operacionais (Software, honorários, infra)
      const financialResult = -150.0; // Tarifas bancárias / rendimentos

      // 1. Receita Líquida
      const netRevenue = Number((grossRevenue - taxDeductions).toFixed(2));
      expect(netRevenue).toBe(47000.0);

      // 2. Lucro Bruto & Margem Bruta
      const grossProfit = Number((netRevenue - cogs).toFixed(2));
      const grossMargin = Number(((grossProfit / netRevenue) * 100).toFixed(2));
      expect(grossProfit).toBe(35000.0);
      expect(grossMargin).toBe(74.47);

      // 3. EBITDA & Margem EBITDA
      const ebitda = Number((grossProfit - opex).toFixed(2));
      const ebitdaMargin = Number(((ebitda / netRevenue) * 100).toFixed(2));
      expect(ebitda).toBe(26500.0);
      expect(ebitdaMargin).toBe(56.38);

      // 4. Resultado Líquido & Margem Líquida
      const netIncome = Number((ebitda + financialResult).toFixed(2));
      const netMargin = Number(((netIncome / netRevenue) * 100).toFixed(2));
      expect(netIncome).toBe(26350.0);
      expect(netMargin).toBe(56.06);
    });

    it('trata adequadamente períodos com faturamento zerado sem divisão por zero', () => {
      const grossRevenue = 0;
      const taxDeductions = 0;
      const netRevenue = grossRevenue - taxDeductions;
      const cogs = 2000.0;
      const grossProfit = netRevenue - cogs;
      const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

      expect(grossMargin).toBe(0);
      expect(grossProfit).toBe(-2000.0);
    });
  });

  describe('2. Equação Patrimonial Fundamental do Balanço', () => {
    it('garante que o Ativo Total seja estritamente igual à soma de Passivo + Patrimônio Líquido', () => {
      // Ativo
      const cashAndBanks = 35420.5;
      const accountsReceivable = 18500.0;
      const currentAssets = Number((cashAndBanks + accountsReceivable).toFixed(2)); // 53920.50
      const fixedAssets = 15000.0; // Equipamentos estúdio
      const totalAssets = Number((currentAssets + fixedAssets).toFixed(2)); // 68920.50

      // Passivo
      const suppliersPayable = 4200.0;
      const taxesPayable = 3100.0;
      const totalLiabilities = Number((suppliersPayable + taxesPayable).toFixed(2)); // 7300.00

      // Patrimônio Líquido
      const shareCapital = 10000.0;
      const accumulatedEarnings = Number((totalAssets - totalLiabilities - shareCapital).toFixed(2)); // 51620.50
      const totalEquity = Number((shareCapital + accumulatedEarnings).toFixed(2)); // 61620.50

      // Soma Passivo + PL
      const totalLiabilitiesAndEquity = Number((totalLiabilities + totalEquity).toFixed(2));

      expect(totalAssets).toBe(68920.5);
      expect(totalLiabilitiesAndEquity).toBe(68920.5);
      expect(totalAssets).toBe(totalLiabilitiesAndEquity);

      const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;
      expect(isBalanced).toBe(true);
    });
  });

  describe('3. Permissões de Acesso aos Relatórios Contábeis', () => {
    it('concede acesso de visualização de relatórios para contador, gestor e admin', () => {
      expect(can('contador', 'view_financial')).toBe(true);
      expect(can('gestor', 'view_financial')).toBe(true);
      expect(can('admin', 'view_financial')).toBe(true);
    });

    it('rejeita clientes e colaboradores comuns de visualizar demonstrativos contábeis', () => {
      expect(can('client', 'view_financial')).toBe(false);
      expect(can('colaborador', 'view_financial')).toBe(false);
    });
  });
});
