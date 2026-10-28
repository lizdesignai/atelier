// src/lib/finance/growthIntelligenceService.ts
// Inteligência de Crescimento, Rentabilidade por Serviço e Alocação de Capital (Fase 6).

import { getDb, queryDb } from '../db';
import { getDREStatement, getBalanceSheet } from './reportsService';

export interface ServiceProfitability {
  serviceKey: string;
  serviceLabel: string;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
  activeContractsCount: number;
  avgTicket: number;
  strategicQuadrant: 'scale' | 'optimize' | 'reprice' | 'retain';
  recommendation: string;
}

export interface CapitalAllocationResult {
  availableCash: number;
  monthlyBurnRate: number;
  runwayMonths: number;
  statusMode: 'survival' | 'conservative' | 'growth';
  allocation: {
    emergencyReserve: number;
    emergencyReservePercent: number;
    growthInvestment: number;
    growthInvestmentPercent: number;
    partnerDividends: number;
    partnerDividendsPercent: number;
  };
  recommendations: string[];
}

export interface GrowthIntelligenceResult {
  services: ServiceProfitability[];
  capitalAllocation: CapitalAllocationResult;
  topConcentration: {
    top3SharePercent: number;
    riskLevel: 'low' | 'moderate' | 'high';
  };
  unitEconomics: {
    avgTicketOverall: number;
    activeClientsCount: number;
    estimatedLtv: number;
    churnRiskAmount: number;
  };
}

export async function getGrowthIntelligence(): Promise<GrowthIntelligenceResult> {
  const sql = getDb();

  // 1. DRE e Balanço para dados reais de caixa e custos
  const [dre, balance] = await Promise.all([
    getDREStatement(),
    getBalanceSheet(),
  ]);

  // 2. Busca projetos e contratos agrupados por tipo de produto/serviço
  const projectRows = await sql`
    SELECT
      p.id,
      p.service_type,
      p.product_type,
      COALESCE(p.financial_value, 0)::numeric(14,2) AS value,
      p.status,
      p.client_id,
      c.nome AS client_name
    FROM projects p
    LEFT JOIN profiles c ON c.id = p.client_id
    WHERE p.status = 'active'
  `;

  // Mapeamento das 4 grandes linhas de serviço do Atelier
  const serviceBuckets: Record<
    string,
    { label: string; revenue: number; cost: number; count: number }
  > = {
    idv: { label: 'Identidade Visual (IDV & Rebranding)', revenue: 0, cost: 0, count: 0 },
    instagram: { label: 'Gestão de Instagram & Presença', revenue: 0, cost: 0, count: 0 },
    mapa: { label: 'O Mapa (Consultoria Estratégica)', revenue: 0, cost: 0, count: 0 },
    agency: { label: 'Parcerias B2B / Whitelabel', revenue: 0, cost: 0, count: 0 },
    other: { label: 'Serviços & Demandas Avulsas', revenue: 0, cost: 0, count: 0 },
  };

  let totalRevenueCounted = 0;
  const clientRevenueMap: Record<string, number> = {};

  for (const row of projectRows) {
    const val = Number(row.value || 0);
    const serviceType = (row.service_type || '').toLowerCase();
    const productType = (row.product_type || '').toLowerCase();
    const clientName = row.client_name || 'Cliente Direto';

    clientRevenueMap[clientName] = (clientRevenueMap[clientName] || 0) + val;
    totalRevenueCounted += val;

    let bucketKey = 'other';
    if (productType === 'idv' || serviceType.includes('identidade') || serviceType.includes('idv') || serviceType.includes('branding')) {
      bucketKey = 'idv';
    } else if (productType === 'instagram' || serviceType.includes('instagram') || serviceType.includes('gestão')) {
      bucketKey = 'instagram';
    } else if (productType === 'mapa' || serviceType.includes('mapa') || serviceType.includes('consultoria')) {
      bucketKey = 'mapa';
    } else if (serviceType.includes('agência') || serviceType.includes('agency') || serviceType.includes('parceir')) {
      bucketKey = 'agency';
    }

    serviceBuckets[bucketKey].revenue += val;
    serviceBuckets[bucketKey].count += 1;
  }

  // 3. Estimativa de custos diretos por linha (baseado no histórico de COGS)
  const totalCogs = dre.metrics.cogs || 1;
  const totalRev = dre.metrics.grossRevenue || 1;
  const cogsRatio = Math.min(0.45, Math.max(0.15, totalCogs / totalRev));

  const services: ServiceProfitability[] = Object.entries(serviceBuckets).map(
    ([key, item]) => {
      // IDV e Projetos pontuais consomem mais horas de produção e freelancers
      const costFactor = key === 'idv' ? cogsRatio * 1.25 : key === 'mapa' ? cogsRatio * 0.7 : cogsRatio;
      const estimatedCost = Number((item.revenue * costFactor).toFixed(2));
      const grossProfit = Number((item.revenue - estimatedCost).toFixed(2));
      const marginPercent = item.revenue > 0 ? Number(((grossProfit / item.revenue) * 100).toFixed(1)) : 0;
      const avgTicket = item.count > 0 ? Number((item.revenue / item.count).toFixed(2)) : 0;

      // Matriz Estratégica:
      let strategicQuadrant: ServiceProfitability['strategicQuadrant'] = 'optimize';
      let recommendation = '';

      if (marginPercent >= 70 && item.revenue > 10000) {
        strategicQuadrant = 'scale';
        recommendation = 'Investir e Escalar: Alta margem e alta tração. Acelerar anúncios e captação comercial.';
      } else if (marginPercent >= 60 && item.count >= 4) {
        strategicQuadrant = 'retain';
        recommendation = 'Foco em Retenção: Receita previsível e estável. Cuidar de CS para evitar churn.';
      } else if (marginPercent < 55 && item.revenue > 15000) {
        strategicQuadrant = 'optimize';
        recommendation = 'Otimizar Eficiência: Alto volume, mas custo de equipe elevado. Reduzir refações e padronizar processos.';
      } else {
        strategicQuadrant = 'reprice';
        recommendation = 'Reprecificar ou Ajustar Escopo: Margem comprimida. Reajustar tabela comercial em +15-20%.';
      }

      return {
        serviceKey: key,
        serviceLabel: item.label,
        totalRevenue: Number(item.revenue.toFixed(2)),
        totalCost: estimatedCost,
        grossProfit,
        marginPercent,
        activeContractsCount: item.count,
        avgTicket,
        strategicQuadrant,
        recommendation,
      };
    }
  );

  // 4. Concentração de Receita nos Maiores Clientes
  const sortedClients = Object.entries(clientRevenueMap).sort((a, b) => b[1] - a[1]);
  const top3Revenue = sortedClients.slice(0, 3).reduce((acc, c) => acc + c[1], 0);
  const top3SharePercent =
    totalRevenueCounted > 0 ? Number(((top3Revenue / totalRevenueCounted) * 100).toFixed(1)) : 0;

  const concentrationRisk: 'low' | 'moderate' | 'high' =
    top3SharePercent > 60 ? 'high' : top3SharePercent > 40 ? 'moderate' : 'low';

  // 5. Alocação de Capital Recomendada (CFO Defensivo + Growth)
  const availableCash = balance.assets.current.cashAndBanks;
  const monthlyExpenses = dre.metrics.opex + dre.metrics.cogs;
  const netBurnRate = Math.max(0, monthlyExpenses - (dre.metrics.grossRevenue / 12));
  const runwayMonths = netBurnRate > 0 ? Number((availableCash / netBurnRate).toFixed(1)) : 999;

  let statusMode: CapitalAllocationResult['statusMode'] = 'growth';
  let allocationPercents = { emergency: 0.3, growth: 0.4, dividends: 0.3 };
  const recommendations: string[] = [];

  if (availableCash < monthlyExpenses * 2 || runwayMonths < 3) {
    statusMode = 'survival';
    allocationPercents = { emergency: 1.0, growth: 0.0, dividends: 0.0 };
    recommendations.push(
      'MODO SOBREVIVÊNCIA: Caixa em nível de alerta (< 2 meses de despesas). Congelar retiradas de lucros e focar 100% na retenção de caixa.'
    );
  } else if (availableCash < monthlyExpenses * 4 || runwayMonths < 6) {
    statusMode = 'conservative';
    allocationPercents = { emergency: 0.6, growth: 0.3, dividends: 0.1 };
    recommendations.push(
      'MODO CONSERVADOR: Construir colchão de segurança de 6 meses antes de acelerar contratações fixas.'
    );
  } else {
    statusMode = 'growth';
    allocationPercents = { emergency: 0.25, growth: 0.45, dividends: 0.3 };
    recommendations.push(
      'MODO EXPANSÃO ACELERADA: Caixa sólido e rentabilidade consistente. Direcionar até 45% do fluxo livre para anúncios, contratação e vendas.'
    );
  }

  const monthlyFreeCash = Math.max(0, dre.metrics.ebitda);
  const capitalAllocation: CapitalAllocationResult = {
    availableCash,
    monthlyBurnRate: Number(monthlyExpenses.toFixed(2)),
    runwayMonths,
    statusMode,
    allocation: {
      emergencyReserve: Number((monthlyFreeCash * allocationPercents.emergency).toFixed(2)),
      emergencyReservePercent: allocationPercents.emergency * 100,
      growthInvestment: Number((monthlyFreeCash * allocationPercents.growth).toFixed(2)),
      growthInvestmentPercent: allocationPercents.growth * 100,
      partnerDividends: Number((monthlyFreeCash * allocationPercents.dividends).toFixed(2)),
      partnerDividendsPercent: allocationPercents.dividends * 100,
    },
    recommendations,
  };

  // 6. Unit Economics
  const activeClientsCount = Object.keys(clientRevenueMap).length;
  const avgTicketOverall =
    activeClientsCount > 0 ? Number((totalRevenueCounted / activeClientsCount).toFixed(2)) : 0;
  // LTV estimado: média de permanência de 14 meses para contratos recorrentes
  const estimatedLtv = Number((avgTicketOverall * 14).toFixed(2));

  return {
    services,
    capitalAllocation,
    topConcentration: {
      top3SharePercent,
      riskLevel: concentrationRisk,
    },
    unitEconomics: {
      avgTicketOverall,
      activeClientsCount,
      estimatedLtv,
      churnRiskAmount: 0,
    },
  };
}
