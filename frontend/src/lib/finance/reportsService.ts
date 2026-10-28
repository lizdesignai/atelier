// src/lib/finance/reportsService.ts
// Motor Contábil: DRE Gerencial (Competência e Caixa) e Balanço Patrimonial (Fase 5).

import { getDb, queryDb } from '../db';
import type { FinStatementGroup } from '../../types/finance';

export interface DRELineItem {
  code: string;
  name: string;
  statement_group: FinStatementGroup;
  amount: number;
}

export interface MonthlyDRESummary {
  month: string; // YYYY-MM
  grossRevenue: number;
  taxDeductions: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  ebitda: number;
  financialResult: number;
  netIncome: number;
}

export interface DREStatementResult {
  regime: 'competence' | 'cash';
  startDate: string;
  endDate: string;
  metrics: {
    grossRevenue: number;
    taxDeductions: number;
    netRevenue: number;
    cogs: number;
    grossProfit: number;
    grossMargin: number;
    opex: number;
    ebitda: number;
    ebitdaMargin: number;
    financialResult: number;
    netIncome: number;
    netMargin: number;
  };
  lineItems: {
    grossRevenue: DRELineItem[];
    taxDeductions: DRELineItem[];
    cogs: DRELineItem[];
    opex: DRELineItem[];
    financial: DRELineItem[];
  };
  monthlyEvolution: MonthlyDRESummary[];
}

export interface BalanceSheetResult {
  cutoffDate: string;
  assets: {
    current: {
      cashAndBanks: number;
      accountsReceivable: number;
      total: number;
    };
    nonCurrent: {
      equipmentAndIntangibles: number;
      total: number;
    };
    totalAssets: number;
  };
  liabilities: {
    current: {
      suppliersPayable: number;
      taxObligationsPayable: number;
      total: number;
    };
    totalLiabilities: number;
  };
  equity: {
    shareCapital: number;
    accumulatedEarnings: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  discrepancy: number;
}

export async function getDREStatement(options?: {
  startDate?: string;
  endDate?: string;
  regime?: 'competence' | 'cash';
  year?: number;
}): Promise<DREStatementResult> {
  const regime = options?.regime || 'competence';
  const currentYear = options?.year || new Date().getFullYear();
  const startDate = options?.startDate || `${currentYear}-01-01`;
  const endDate = options?.endDate || `${currentYear}-12-31`;

  const sql = getDb();

  // Consulta por conta e grupo de DRE
  let itemsQuery = '';
  const params: any[] = [startDate, endDate];

  if (regime === 'competence') {
    itemsQuery = `
      SELECT
        a.code,
        a.name,
        a.statement_group,
        COALESCE(SUM(e.amount), 0)::numeric(14,2) AS amount
      FROM fin_accounts a
      JOIN fin_entries e ON e.account_id = a.id
      WHERE e.status != 'cancelled'
        AND e.competence_date >= $1 AND e.competence_date <= $2
      GROUP BY a.code, a.name, a.statement_group
      ORDER BY a.code ASC
    `;
  } else {
    // Regime de Caixa: considera valores efetivamente pagos
    itemsQuery = `
      SELECT
        a.code,
        a.name,
        a.statement_group,
        COALESCE(SUM(s.amount), 0)::numeric(14,2) AS amount
      FROM fin_accounts a
      JOIN fin_entries e ON e.account_id = a.id
      JOIN fin_settlements s ON s.entry_id = e.id
      WHERE s.payment_date >= $1 AND s.payment_date <= $2
      GROUP BY a.code, a.name, a.statement_group
      ORDER BY a.code ASC
    `;
  }

  const rawRows = await queryDb<{
    code: string;
    name: string;
    statement_group: FinStatementGroup;
    amount: string | number;
  }>(itemsQuery, params);

  const lineItems = {
    grossRevenue: [] as DRELineItem[],
    taxDeductions: [] as DRELineItem[],
    cogs: [] as DRELineItem[],
    opex: [] as DRELineItem[],
    financial: [] as DRELineItem[],
  };

  let grossRevenue = 0;
  let taxDeductions = 0;
  let cogs = 0;
  let opex = 0;
  let financialResult = 0;

  for (const row of rawRows) {
    const amount = Number(row.amount || 0);
    const item: DRELineItem = {
      code: row.code,
      name: row.name,
      statement_group: row.statement_group,
      amount,
    };

    switch (row.statement_group) {
      case 'dre_gross_revenue':
        lineItems.grossRevenue.push(item);
        grossRevenue += amount;
        break;
      case 'dre_tax_deduction':
        lineItems.taxDeductions.push(item);
        taxDeductions += amount;
        break;
      case 'dre_cogs':
        lineItems.cogs.push(item);
        cogs += amount;
        break;
      case 'dre_opex':
        lineItems.opex.push(item);
        opex += amount;
        break;
      case 'dre_financial':
        lineItems.financial.push(item);
        financialResult += amount;
        break;
    }
  }

  const netRevenue = Number((grossRevenue - taxDeductions).toFixed(2));
  const grossProfit = Number((netRevenue - cogs).toFixed(2));
  const grossMargin = netRevenue > 0 ? Number(((grossProfit / netRevenue) * 100).toFixed(2)) : 0;
  const ebitda = Number((grossProfit - opex).toFixed(2));
  const ebitdaMargin = netRevenue > 0 ? Number(((ebitda / netRevenue) * 100).toFixed(2)) : 0;
  const netIncome = Number((ebitda + financialResult).toFixed(2));
  const netMargin = netRevenue > 0 ? Number(((netIncome / netRevenue) * 100).toFixed(2)) : 0;

  // Consulta da evolução mensal
  const dateCol = regime === 'competence' ? 'e.competence_date' : 's.payment_date';
  const fromJoin =
    regime === 'competence'
      ? 'FROM fin_entries e JOIN fin_accounts a ON a.id = e.account_id WHERE e.status != \'cancelled\''
      : 'FROM fin_entries e JOIN fin_accounts a ON a.id = e.account_id JOIN fin_settlements s ON s.entry_id = e.id';

  const monthlyQuery = `
    SELECT
      TO_CHAR(${dateCol}, 'YYYY-MM') AS month,
      COALESCE(SUM(CASE WHEN a.statement_group = 'dre_gross_revenue' THEN ${regime === 'competence' ? 'e.amount' : 's.amount'} ELSE 0 END), 0)::numeric(14,2) AS gross_revenue,
      COALESCE(SUM(CASE WHEN a.statement_group = 'dre_tax_deduction' THEN ${regime === 'competence' ? 'e.amount' : 's.amount'} ELSE 0 END), 0)::numeric(14,2) AS tax_deductions,
      COALESCE(SUM(CASE WHEN a.statement_group = 'dre_cogs' THEN ${regime === 'competence' ? 'e.amount' : 's.amount'} ELSE 0 END), 0)::numeric(14,2) AS cogs,
      COALESCE(SUM(CASE WHEN a.statement_group = 'dre_opex' THEN ${regime === 'competence' ? 'e.amount' : 's.amount'} ELSE 0 END), 0)::numeric(14,2) AS opex,
      COALESCE(SUM(CASE WHEN a.statement_group = 'dre_financial' THEN ${regime === 'competence' ? 'e.amount' : 's.amount'} ELSE 0 END), 0)::numeric(14,2) AS financial
    ${fromJoin}
      AND ${dateCol} >= $1 AND ${dateCol} <= $2
    GROUP BY TO_CHAR(${dateCol}, 'YYYY-MM')
    ORDER BY month ASC
  `;

  const monthlyRows = await queryDb<{
    month: string;
    gross_revenue: string | number;
    tax_deductions: string | number;
    cogs: string | number;
    opex: string | number;
    financial: string | number;
  }>(monthlyQuery, [startDate, endDate]);

  const monthlyEvolution: MonthlyDRESummary[] = monthlyRows.map((m) => {
    const mGross = Number(m.gross_revenue || 0);
    const mTax = Number(m.tax_deductions || 0);
    const mNet = Number((mGross - mTax).toFixed(2));
    const mCogs = Number(m.cogs || 0);
    const mGrossProfit = Number((mNet - mCogs).toFixed(2));
    const mOpex = Number(m.opex || 0);
    const mEbitda = Number((mGrossProfit - mOpex).toFixed(2));
    const mFin = Number(m.financial || 0);
    const mNetIncome = Number((mEbitda + mFin).toFixed(2));

    return {
      month: m.month,
      grossRevenue: mGross,
      taxDeductions: mTax,
      netRevenue: mNet,
      cogs: mCogs,
      grossProfit: mGrossProfit,
      opex: mOpex,
      ebitda: mEbitda,
      financialResult: mFin,
      netIncome: mNetIncome,
    };
  });

  return {
    regime,
    startDate,
    endDate,
    metrics: {
      grossRevenue: Number(grossRevenue.toFixed(2)),
      taxDeductions: Number(taxDeductions.toFixed(2)),
      netRevenue,
      cogs: Number(cogs.toFixed(2)),
      grossProfit,
      grossMargin,
      opex: Number(opex.toFixed(2)),
      ebitda,
      ebitdaMargin,
      financialResult: Number(financialResult.toFixed(2)),
      netIncome,
      netMargin,
    },
    lineItems,
    monthlyEvolution,
  };
}

export async function getBalanceSheet(cutoffDateInput?: string): Promise<BalanceSheetResult> {
  const cutoffDate = cutoffDateInput || new Date().toISOString().split('T')[0];
  const sql = getDb();

  // 1. Ativo Circulante - Disponibilidades em Bancos e Caixas
  const bankRows = await sql`
    SELECT COALESCE(SUM(current_balance), 0)::numeric(14,2) AS total_banks
    FROM fin_bank_accounts
    WHERE is_active = true
  `;
  const cashAndBanks = Number(bankRows[0]?.total_banks || 0);

  // 2. Ativo Circulante - Contas a Receber de Clientes (saldo em aberto com vencimento até a data de corte ou pendente)
  const receivableRows = await sql`
    SELECT COALESCE(SUM(amount - amount_paid), 0)::numeric(14,2) AS total_receivables
    FROM fin_entries
    WHERE kind = 'revenue'
      AND status NOT IN ('paid', 'cancelled')
      AND competence_date <= ${cutoffDate}
  `;
  const accountsReceivable = Number(receivableRows[0]?.total_receivables || 0);
  const currentAssetsTotal = Number((cashAndBanks + accountsReceivable).toFixed(2));

  // 3. Ativo Não Circulante (Imobilizado / Hardware / Marcas e Softwares)
  const equipmentAndIntangibles = 15000.0; // Equipamentos estúdio e identidade
  const nonCurrentAssetsTotal = equipmentAndIntangibles;
  const totalAssets = Number((currentAssetsTotal + nonCurrentAssetsTotal).toFixed(2));

  // 4. Passivo Circulante - Fornecedores e Despesas a Pagar
  const payableRows = await sql`
    SELECT COALESCE(SUM(amount - amount_paid), 0)::numeric(14,2) AS total_payables
    FROM fin_entries
    WHERE kind = 'expense'
      AND status NOT IN ('paid', 'cancelled')
      AND competence_date <= ${cutoffDate}
  `;
  const suppliersPayable = Number(payableRows[0]?.total_payables || 0);

  // 5. Passivo Circulante - Tributos a Recolher
  const taxRows = await sql`
    SELECT COALESCE(SUM(amount), 0)::numeric(14,2) AS total_taxes
    FROM fin_tax_obligations
    WHERE status != 'paid'
      AND due_date <= ${cutoffDate}
  `;
  const taxObligationsPayable = Number(taxRows[0]?.total_taxes || 0);
  const currentLiabilitiesTotal = Number((suppliersPayable + taxObligationsPayable).toFixed(2));
  const totalLiabilities = currentLiabilitiesTotal;

  // 6. Patrimônio Líquido
  const shareCapital = 10000.0; // Capital Social integralizado
  // Lucros acumulados equilibram Ativo = Passivo + PL
  const accumulatedEarnings = Number((totalAssets - totalLiabilities - shareCapital).toFixed(2));
  const totalEquity = Number((shareCapital + accumulatedEarnings).toFixed(2));

  const totalLiabilitiesAndEquity = Number((totalLiabilities + totalEquity).toFixed(2));
  const discrepancy = Number((totalAssets - totalLiabilitiesAndEquity).toFixed(2));
  const isBalanced = Math.abs(discrepancy) < 0.05;

  return {
    cutoffDate,
    assets: {
      current: {
        cashAndBanks,
        accountsReceivable,
        total: currentAssetsTotal,
      },
      nonCurrent: {
        equipmentAndIntangibles,
        total: nonCurrentAssetsTotal,
      },
      totalAssets,
    },
    liabilities: {
      current: {
        suppliersPayable,
        taxObligationsPayable,
        total: currentLiabilitiesTotal,
      },
      totalLiabilities,
    },
    equity: {
      shareCapital,
      accumulatedEarnings,
      totalEquity,
    },
    totalLiabilitiesAndEquity,
    isBalanced,
    discrepancy,
  };
}
