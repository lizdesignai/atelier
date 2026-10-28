// src/app/api/finance/reports/dre/route.ts
// Relatório de DRE Gerencial (Demonstração do Resultado do Exercício) em JSON ou CSV.

import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAccess } from '@/lib/finance-auth';
import { getDREStatement, FinanceDomainError } from '@/lib/finance';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireFinanceAccess('view_financial');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;
    const regime = (searchParams.get('regime') as 'competence' | 'cash') || 'competence';
    const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined;
    const format = searchParams.get('format');

    const dre = await getDREStatement({
      startDate,
      endDate,
      regime,
      year,
    });

    // Se solicitado formato CSV para download contábil
    if (format === 'csv') {
      const csvLines: string[] = [
        'DRE GERENCIAL - ATELIER STUDIO',
        `Regime: ${regime === 'competence' ? 'Competência' : 'Caixa'}`,
        `Período: ${dre.startDate} a ${dre.endDate}`,
        '',
        'Classificação;Conta;Valor (R$)',
        `RECEITA BRUTA;;${dre.metrics.grossRevenue.toFixed(2)}`,
      ];

      for (const item of dre.lineItems.grossRevenue) {
        csvLines.push(`Receita;${item.code} - ${item.name};${item.amount.toFixed(2)}`);
      }

      csvLines.push(`(-) DEDUÇÕES TRIBUTÁRIAS;;-${dre.metrics.taxDeductions.toFixed(2)}`);
      for (const item of dre.lineItems.taxDeductions) {
        csvLines.push(`Dedução;${item.code} - ${item.name};-${item.amount.toFixed(2)}`);
      }

      csvLines.push(`(=) RECEITA LÍQUIDA;;${dre.metrics.netRevenue.toFixed(2)}`);
      csvLines.push(`(-) CUSTOS DOS SERVIÇOS (COGS);;-${dre.metrics.cogs.toFixed(2)}`);
      for (const item of dre.lineItems.cogs) {
        csvLines.push(`Custo Direto;${item.code} - ${item.name};-${item.amount.toFixed(2)}`);
      }

      csvLines.push(`(=) LUCRO BRUTO;;${dre.metrics.grossProfit.toFixed(2)}`);
      csvLines.push(`Margem Bruta (%);;${dre.metrics.grossMargin.toFixed(2)}%`);
      csvLines.push(`(-) DESPESAS OPERACIONAIS (OPEX);;-${dre.metrics.opex.toFixed(2)}`);
      for (const item of dre.lineItems.opex) {
        csvLines.push(`OPEX;${item.code} - ${item.name};-${item.amount.toFixed(2)}`);
      }

      csvLines.push(`(=) EBITDA;;${dre.metrics.ebitda.toFixed(2)}`);
      csvLines.push(`Margem EBITDA (%);;${dre.metrics.ebitdaMargin.toFixed(2)}%`);
      csvLines.push(`(+/-) RESULTADO FINANCEIRO;;${dre.metrics.financialResult.toFixed(2)}`);
      csvLines.push(`(=) RESULTADO LÍQUIDO DO EXERCÍCIO;;${dre.metrics.netIncome.toFixed(2)}`);
      csvLines.push(`Margem Líquida (%);;${dre.metrics.netMargin.toFixed(2)}%`);

      const csvContent = '\uFEFF' + csvLines.join('\n');
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="dre_${regime}_${dre.startDate}_${dre.endDate}.csv"`,
        },
      });
    }

    return NextResponse.json(dre);
  } catch (error: any) {
    if (error instanceof FinanceDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[API /api/finance/reports/dre GET]', error);
    return NextResponse.json({ error: error.message || 'Erro interno.' }, { status: 500 });
  }
}
