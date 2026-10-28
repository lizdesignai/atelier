// src/app/api/finance/reports/balance-sheet/route.ts
// Relatório de Balanço Patrimonial (Ativo, Passivo e Patrimônio Líquido).

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import { getBalanceSheet, FinanceDomainError } from '@/lib/finance';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireFinanceAccess('view_financial');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const cutoffDate = searchParams.get('cutoff_date') || undefined;
    const format = searchParams.get('format');

    const balanceSheet = await getBalanceSheet(cutoffDate);

    if (format === 'csv') {
      const csvLines: string[] = [
        'BALANÇO PATRIMONIAL - ATELIER STUDIO',
        `Data de Corte: ${balanceSheet.cutoffDate}`,
        `Equilíbrio Contábil: ${balanceSheet.isBalanced ? 'CONFERIDO E EQUILIBRADO' : 'DIVERGÊNCIA IDENTIFICADA'}`,
        '',
        'Grupo;Conta / Subgrupo;Valor (R$)',
        `ATIVO TOTAL;;${balanceSheet.assets.totalAssets.toFixed(2)}`,
        `Ativo Circulante;Disponibilidades (Bancos/Caixa);${balanceSheet.assets.current.cashAndBanks.toFixed(2)}`,
        `Ativo Circulante;Contas a Receber (Clientes);${balanceSheet.assets.current.accountsReceivable.toFixed(2)}`,
        `Ativo Circulante;Subtotal Circulante;${balanceSheet.assets.current.total.toFixed(2)}`,
        `Ativo Não Circulante;Equipamentos e Intangíveis;${balanceSheet.assets.nonCurrent.equipmentAndIntangibles.toFixed(2)}`,
        '',
        `PASSIVO TOTAL;;${balanceSheet.liabilities.totalLiabilities.toFixed(2)}`,
        `Passivo Circulante;Fornecedores e Contas a Pagar;${balanceSheet.liabilities.current.suppliersPayable.toFixed(2)}`,
        `Passivo Circulante;Tributos a Recolher (DAS/ISS);${balanceSheet.liabilities.current.taxObligationsPayable.toFixed(2)}`,
        `Passivo Circulante;Subtotal Circulante;${balanceSheet.liabilities.current.total.toFixed(2)}`,
        '',
        `PATRIMÔNIO LÍQUIDO TOTAL;;${balanceSheet.equity.totalEquity.toFixed(2)}`,
        `Patrimônio Líquido;Capital Social;${balanceSheet.equity.shareCapital.toFixed(2)}`,
        `Patrimônio Líquido;Lucros / Prejuízos Acumulados;${balanceSheet.equity.accumulatedEarnings.toFixed(2)}`,
        '',
        `TOTAL PASSIVO + PATRIMÔNIO LÍQUIDO;;${balanceSheet.totalLiabilitiesAndEquity.toFixed(2)}`,
      ];

      const csvContent = '\uFEFF' + csvLines.join('\n');
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="balanco_patrimonial_${balanceSheet.cutoffDate}.csv"`,
        },
      });
    }

    return NextResponse.json(balanceSheet);
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/reports/balance-sheet GET]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
