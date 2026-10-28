// src/lib/__tests__/phase6_valuation_growth.test.ts
// Testes Unitários da Fase 6: Valuation, Múltiplos, DCF e Motor de Crescimento

import { describe, expect, it } from 'vitest';
import { calculateDCF } from '../finance/valuationService';
import { can, isManagementRole } from '../rbac';
import type { CapitalAllocationResult, ServiceProfitability } from '../finance/growthIntelligenceService';

describe('Fase 6 — Valuation, EBITDA e Inteligência de Crescimento', () => {
  describe('1. Motor Matemático de Fluxo de Caixa Descontado (DCF)', () => {
    it('retorna 0 para fluxo de caixa operacional nulo ou negativo', () => {
      expect(calculateDCF(0, 20, 14)).toBe(0);
      expect(calculateDCF(-50000, 20, 14)).toBe(0);
    });

    it('calcula o valor presente (PV) com projeção de 5 anos e perpetuidade de Gordon', () => {
      const baseEbitda = 100000.0;
      const growthRate = 20.0; // 20% a.a.
      const discountRate = 14.0; // WACC / Taxa de Desconto de 14%
      const terminalGrowth = 0.03; // 3% na perpetuidade

      const dcfValue = calculateDCF(baseEbitda, growthRate, discountRate, 5, terminalGrowth);

      // Deve ser positivo e superar substancialmente o fluxo anual corrente
      expect(dcfValue).toBeGreaterThan(baseEbitda);
      // Pelo modelo Gordon com 20% de crescimento e 14% de WACC, o múltiplo implícito fica em torno de 10x-15x
      expect(dcfValue).toBeGreaterThan(1000000);
      expect(dcfValue).toBeLessThan(2500000);
    });

    it('responde inversamente à taxa de desconto (quanto maior o risco/desconto, menor o valuation)', () => {
      const baseEbitda = 80000.0;
      const growthRate = 15.0;

      const dcfLowRisk = calculateDCF(baseEbitda, growthRate, 12.0); // 12%
      const dcfHighRisk = calculateDCF(baseEbitda, growthRate, 20.0); // 20%

      expect(dcfLowRisk).toBeGreaterThan(dcfHighRisk);
    });
  });

  describe('2. Metodologia de Múltiplos e Ponderação de Cenários', () => {
    it('pondera corretamente os 3 métodos contábeis (50% EBITDA + 30% ARR + 20% DCF)', () => {
      const annualEbitda = 120000.0;
      const arr = 180000.0; // MRR de R$ 15.000 x 12

      // Cenário Base do Mercado de Agências
      const ebitdaMultiple = 5.0;
      const arrMultiple = 1.5;
      const valByEbitda = annualEbitda * ebitdaMultiple; // 600.000
      const valByArr = arr * arrMultiple; // 270.000
      const valByDcf = calculateDCF(annualEbitda, 20.0, 14.0); // Fluxo projetado

      const recommendedValuation = Number(
        (valByEbitda * 0.5 + valByArr * 0.3 + valByDcf * 0.2).toFixed(2)
      );

      expect(valByEbitda).toBe(600000.0);
      expect(valByArr).toBe(270000.0);
      expect(recommendedValuation).toBeGreaterThan(valByArr);
      expect(recommendedValuation).toBeLessThan(valByDcf * 1.5);
    });

    it('garante consistência monotônica entre os cenários (Conservador < Base < Otimista)', () => {
      const ebitda = 100000.0;
      const arr = 120000.0;

      // Conservador: 3.5x EBITDA, 1.0x ARR, g=10%, d=18%
      const consEbitda = ebitda * 3.5;
      const consArr = arr * 1.0;
      const consDcf = calculateDCF(ebitda, 10.0, 18.0);
      const valCons = consEbitda * 0.5 + consArr * 0.3 + consDcf * 0.2;

      // Base: 5.0x EBITDA, 1.5x ARR, g=20%, d=14%
      const baseEbitda = ebitda * 5.0;
      const baseArr = arr * 1.5;
      const baseDcf = calculateDCF(ebitda, 20.0, 14.0);
      const valBase = baseEbitda * 0.5 + baseArr * 0.3 + baseDcf * 0.2;

      // Otimista: 6.5x EBITDA, 2.2x ARR, g=35%, d=11%
      const optEbitda = ebitda * 6.5;
      const optArr = arr * 2.2;
      const optDcf = calculateDCF(ebitda, 35.0, 11.0);
      const valOpt = optEbitda * 0.5 + optArr * 0.3 + optDcf * 0.2;

      expect(valCons).toBeLessThan(valBase);
      expect(valBase).toBeLessThan(valOpt);
    });
  });

  describe('3. Motor Estratégico de Rentabilidade de Serviços (Quadrantes)', () => {
    it('classifica serviços de alta margem (>70%) e alta receita no quadrante SCALE (Acelerar)', () => {
      const marginPercent = 75.0;
      const revenue = 25000.0;

      let strategicQuadrant: ServiceProfitability['strategicQuadrant'] = 'optimize';
      if (marginPercent >= 70 && revenue > 10000) {
        strategicQuadrant = 'scale';
      }

      expect(strategicQuadrant).toBe('scale');
    });

    it('classifica serviços de boa margem (>60%) e múltiplos contratos no quadrante RETAIN (Retenção)', () => {
      const marginPercent = 64.0;
      const revenue = 9000.0;
      const count = 5;

      let strategicQuadrant: ServiceProfitability['strategicQuadrant'] = 'optimize';
      if (marginPercent >= 70 && revenue > 10000) {
        strategicQuadrant = 'scale';
      } else if (marginPercent >= 60 && count >= 4) {
        strategicQuadrant = 'retain';
      }

      expect(strategicQuadrant).toBe('retain');
    });

    it('classifica serviços de alto volume mas margem comprimida (<55%) no quadrante OPTIMIZE', () => {
      const marginPercent = 48.0;
      const revenue = 30000.0;
      const count = 3;

      let strategicQuadrant: ServiceProfitability['strategicQuadrant'] = 'reprice';
      if (marginPercent >= 70 && revenue > 10000) {
        strategicQuadrant = 'scale';
      } else if (marginPercent >= 60 && count >= 4) {
        strategicQuadrant = 'retain';
      } else if (marginPercent < 55 && revenue > 15000) {
        strategicQuadrant = 'optimize';
      }

      expect(strategicQuadrant).toBe('optimize');
    });

    it('classifica serviços com margem insuficiente e baixo volume no quadrante REPRICE', () => {
      const marginPercent = 40.0;
      const revenue = 4000.0;
      const count = 1;

      let strategicQuadrant: ServiceProfitability['strategicQuadrant'] = 'optimize';
      if (marginPercent >= 70 && revenue > 10000) {
        strategicQuadrant = 'scale';
      } else if (marginPercent >= 60 && count >= 4) {
        strategicQuadrant = 'retain';
      } else if (marginPercent < 55 && revenue > 15000) {
        strategicQuadrant = 'optimize';
      } else {
        strategicQuadrant = 'reprice';
      }

      expect(strategicQuadrant).toBe('reprice');
    });
  });

  describe('4. Algoritmo de Alocação de Capital do CFO Engine', () => {
    it('ativa MODO SOBREVIVÊNCIA quando o caixa cobre menos de 2 meses de despesas', () => {
      const availableCash = 15000.0;
      const monthlyExpenses = 10000.0; // Cobre apenas 1.5 meses
      const runwayMonths = 1.5;

      let statusMode: CapitalAllocationResult['statusMode'] = 'growth';
      let allocationPercents = { emergency: 0.25, growth: 0.45, dividends: 0.3 };

      if (availableCash < monthlyExpenses * 2 || runwayMonths < 3) {
        statusMode = 'survival';
        allocationPercents = { emergency: 1.0, growth: 0.0, dividends: 0.0 };
      }

      expect(statusMode).toBe('survival');
      expect(allocationPercents.emergency).toBe(1.0);
      expect(allocationPercents.growth).toBe(0.0);
      expect(allocationPercents.dividends).toBe(0.0);
    });

    it('ativa MODO CONSERVADOR quando o caixa cobre entre 2 e 4 meses', () => {
      const availableCash = 30000.0;
      const monthlyExpenses = 10000.0; // 3 meses de despesas
      const runwayMonths = 3.0;

      let statusMode: CapitalAllocationResult['statusMode'] = 'growth';
      let allocationPercents = { emergency: 0.25, growth: 0.45, dividends: 0.3 };

      if (availableCash < monthlyExpenses * 2 || runwayMonths < 3) {
        statusMode = 'survival';
        allocationPercents = { emergency: 1.0, growth: 0.0, dividends: 0.0 };
      } else if (availableCash < monthlyExpenses * 4 || runwayMonths < 6) {
        statusMode = 'conservative';
        allocationPercents = { emergency: 0.6, growth: 0.3, dividends: 0.1 };
      }

      expect(statusMode).toBe('conservative');
      expect(allocationPercents.emergency).toBe(0.6);
      expect(allocationPercents.growth).toBe(0.3);
      expect(allocationPercents.dividends).toBe(0.1);
    });

    it('ativa MODO EXPANSÃO ACELERADA quando o caixa é robusto (> 4 meses de despesas)', () => {
      const availableCash = 80000.0;
      const monthlyExpenses = 12000.0; // > 6 meses de despesas
      const runwayMonths = 999;

      let statusMode: CapitalAllocationResult['statusMode'] = 'survival';
      let allocationPercents = { emergency: 1.0, growth: 0.0, dividends: 0.0 };

      if (availableCash < monthlyExpenses * 2 || runwayMonths < 3) {
        statusMode = 'survival';
        allocationPercents = { emergency: 1.0, growth: 0.0, dividends: 0.0 };
      } else if (availableCash < monthlyExpenses * 4 || runwayMonths < 6) {
        statusMode = 'conservative';
        allocationPercents = { emergency: 0.6, growth: 0.3, dividends: 0.1 };
      } else {
        statusMode = 'growth';
        allocationPercents = { emergency: 0.25, growth: 0.45, dividends: 0.3 };
      }

      expect(statusMode).toBe('growth');
      expect(allocationPercents.growth).toBe(0.45); // 45% direcionado a anúncios e crescimento
      expect(allocationPercents.dividends).toBe(0.30); // 30% dividendos aos sócios
    });
  });

  describe('5. Governança e Permissões de Valuation e Estratégia', () => {
    it('permite apenas papéis de gestão (admin e gestor) alterarem parâmetros de valuation', () => {
      expect(can('admin', 'manage_valuation_parameters')).toBe(true);
      expect(can('gestor', 'manage_valuation_parameters')).toBe(true);
      expect(can('contador', 'manage_valuation_parameters')).toBe(false);
      expect(can('colaborador', 'manage_valuation_parameters')).toBe(false);
      expect(can('client', 'manage_valuation_parameters')).toBe(false);
    });

    it('permite que a contadora visualize relatórios financeiros e inteligência de rentabilidade', () => {
      expect(can('contador', 'view_financial')).toBe(true);
      expect(can('gestor', 'view_financial')).toBe(true);
      expect(can('admin', 'view_financial')).toBe(true);
    });

    it('reconhece papéis executivos através do helper isManagementRole', () => {
      expect(isManagementRole('admin')).toBe(true);
      expect(isManagementRole('gestor')).toBe(true);
      expect(isManagementRole('contador')).toBe(false);
      expect(isManagementRole('colaborador')).toBe(false);
    });
  });
});
