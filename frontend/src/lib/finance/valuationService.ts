// src/lib/finance/valuationService.ts
// Motor de Cálculo de Valuation da Agência, Múltiplos e Cenários (Fase 6).

import { getDb, queryDb } from '../db';
import { getDREStatement } from './reportsService';
import type { FinValuationScenario } from '../../types/finance';

export interface ValuationMetrics {
  annualGrossRevenue: number;
  annualNetRevenue: number;
  annualEbitda: number;
  ebitdaMargin: number;
  mrr: number; // Receita recorrente mensal
  arr: number; // Receita recorrente anualizada (MRR * 12)
}

export interface ValuationScenarioCalculated {
  name: string;
  type: 'conservative' | 'base' | 'optimistic';
  ebitdaMultiple: number;
  mrrMultiple: number;
  discountRate: number;
  growthRate: number;
  valuationByEbitda: number;
  valuationByARR: number;
  valuationByDCF: number;
  recommendedValuation: number;
}

export interface ValuationAnalysisResult {
  metrics: ValuationMetrics;
  scenarios: {
    conservative: ValuationScenarioCalculated;
    base: ValuationScenarioCalculated;
    optimistic: ValuationScenarioCalculated;
  };
  sensitivityMatrix: Array<{
    multiple: number;
    ebitdaValuation: number;
    arrValuation: number;
  }>;
  historicalScenarios: FinValuationScenario[];
}

export function calculateDCF(
  baseCashFlow: number,
  growthRate: number,
  discountRate: number,
  years = 5,
  terminalGrowthRate = 0.03
): number {
  if (baseCashFlow <= 0) return 0;

  const g = growthRate / 100;
  const d = discountRate / 100;
  let presentValue = 0;
  let cashFlow = baseCashFlow;

  for (let t = 1; t <= years; t++) {
    cashFlow = cashFlow * (1 + g);
    const pv = cashFlow / Math.pow(1 + d, t);
    presentValue += pv;
  }

  // Valor Terminal (Perpetuidade de Gordon)
  const terminalCashFlow = cashFlow * (1 + terminalGrowthRate);
  const terminalValue = terminalCashFlow / (d - terminalGrowthRate);
  const pvTerminalValue = terminalValue / Math.pow(1 + d, years);

  return Number((presentValue + pvTerminalValue).toFixed(2));
}

export async function getValuationAnalysis(): Promise<ValuationAnalysisResult> {
  const sql = getDb();

  // 1. DRE anualizada do exercício corrente
  const dre = await getDREStatement();
  const annualGrossRevenue = dre.metrics.grossRevenue;
  const annualNetRevenue = dre.metrics.netRevenue;
  const annualEbitda = Math.max(0, dre.metrics.ebitda);
  const ebitdaMargin = dre.metrics.ebitdaMargin;

  // 2. Cálculo do MRR e ARR dos contratos recorrentes ativos
  const contractRows = await sql`
    SELECT COALESCE(SUM(financial_value), 0)::numeric(14,2) AS mrr
    FROM projects
    WHERE status = 'active'
      AND (
        payment_recurrence ILIKE '%mensal%'
        OR payment_recurrence ILIKE '%recorrente%'
        OR payment_recurrence ILIKE '%retainer%'
      )
  `;
  const mrr = Number(contractRows[0]?.mrr || 0);
  const arr = Number((mrr * 12).toFixed(2));

  const metrics: ValuationMetrics = {
    annualGrossRevenue,
    annualNetRevenue,
    annualEbitda,
    ebitdaMargin,
    mrr,
    arr,
  };

  // 3. Modelagem dos 3 Cenários
  // CENÁRIO CONSERVADOR
  const consEbitdaMult = 3.5;
  const consMrrMult = 1.0;
  const consDiscount = 18.0;
  const consGrowth = 10.0;
  const consValByEbitda = Number((annualEbitda * consEbitdaMult).toFixed(2));
  const consValByARR = Number((arr * consMrrMult).toFixed(2));
  const consValByDCF = calculateDCF(annualEbitda, consGrowth, consDiscount);
  const consRec = Number(((consValByEbitda * 0.5) + (consValByARR * 0.3) + (consValByDCF * 0.2)).toFixed(2));

  // CENÁRIO BASE (MERCADO ATUAL DE AGÊNCIAS & DESIGN STUDIOS)
  const baseEbitdaMult = 5.0;
  const baseMrrMult = 1.5;
  const baseDiscount = 14.0;
  const baseGrowth = 20.0;
  const baseValByEbitda = Number((annualEbitda * baseEbitdaMult).toFixed(2));
  const baseValByARR = Number((arr * baseMrrMult).toFixed(2));
  const baseValByDCF = calculateDCF(annualEbitda, baseGrowth, baseDiscount);
  const baseRec = Number(((baseValByEbitda * 0.5) + (baseValByARR * 0.3) + (baseValByDCF * 0.2)).toFixed(2));

  // CENÁRIO OTIMISTA (MÁQUINA ESCALADA & RETENÇÃO ALTA)
  const optEbitdaMult = 6.5;
  const optMrrMult = 2.2;
  const optDiscount = 11.0;
  const optGrowth = 35.0;
  const optValByEbitda = Number((annualEbitda * optEbitdaMult).toFixed(2));
  const optValByARR = Number((arr * optMrrMult).toFixed(2));
  const optValByDCF = calculateDCF(annualEbitda, optGrowth, optDiscount);
  const optRec = Number(((optValByEbitda * 0.5) + (optValByARR * 0.3) + (optValByDCF * 0.2)).toFixed(2));

  const scenarios = {
    conservative: {
      name: 'Conservador (Downside)',
      type: 'conservative' as const,
      ebitdaMultiple: consEbitdaMult,
      mrrMultiple: consMrrMult,
      discountRate: consDiscount,
      growthRate: consGrowth,
      valuationByEbitda: consValByEbitda,
      valuationByARR: consValByARR,
      valuationByDCF: consValByDCF,
      recommendedValuation: consRec,
    },
    base: {
      name: 'Base (Mercado Atual)',
      type: 'base' as const,
      ebitdaMultiple: baseEbitdaMult,
      mrrMultiple: baseMrrMult,
      discountRate: baseDiscount,
      growthRate: baseGrowth,
      valuationByEbitda: baseValByEbitda,
      valuationByARR: baseValByARR,
      valuationByDCF: baseValByDCF,
      recommendedValuation: baseRec,
    },
    optimistic: {
      name: 'Otimista (Expansão Acelerada)',
      type: 'optimistic' as const,
      ebitdaMultiple: optEbitdaMult,
      mrrMultiple: optMrrMult,
      discountRate: optDiscount,
      growthRate: optGrowth,
      valuationByEbitda: optValByEbitda,
      valuationByARR: optValByARR,
      valuationByDCF: optValByDCF,
      recommendedValuation: optRec,
    },
  };

  // 4. Matriz de Sensibilidade (Múltiplos 3x a 8x)
  const sensitivityMatrix = [3.0, 4.0, 5.0, 6.0, 7.0, 8.0].map((multiple) => ({
    multiple,
    ebitdaValuation: Number((annualEbitda * multiple).toFixed(2)),
    arrValuation: Number((arr * (multiple * 0.3)).toFixed(2)),
  }));

  // 5. Histórico de cenários salvos
  const historicalRows = await sql`
    SELECT *
    FROM fin_valuation_scenarios
    ORDER BY created_at DESC
    LIMIT 10
  `;

  return {
    metrics,
    scenarios,
    sensitivityMatrix,
    historicalScenarios: historicalRows as unknown as FinValuationScenario[],
  };
}

export async function saveValuationScenario(
  input: {
    name: string;
    scenario_type: 'conservative' | 'base' | 'optimistic';
    ebitda_multiple: number;
    mrr_multiple: number;
    discount_rate: number;
    annual_growth_rate: number;
    calculated_valuation: number;
    methodology: string;
    parameters?: Record<string, any>;
  },
  userId: string
): Promise<FinValuationScenario> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO fin_valuation_scenarios (
      name,
      scenario_type,
      ebitda_multiple,
      mrr_multiple,
      discount_rate,
      annual_growth_rate,
      calculated_valuation,
      methodology,
      parameters,
      created_by
    ) VALUES (
      ${input.name},
      ${input.scenario_type},
      ${input.ebitda_multiple},
      ${input.mrr_multiple},
      ${input.discount_rate},
      ${input.annual_growth_rate},
      ${input.calculated_valuation},
      ${input.methodology},
      ${JSON.stringify(input.parameters || {})},
      ${userId}
    )
    RETURNING *
  `;
  return rows[0] as unknown as FinValuationScenario;
}
