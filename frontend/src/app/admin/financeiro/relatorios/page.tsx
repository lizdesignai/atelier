// src/app/admin/financeiro/relatorios/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Landmark,
  Scale,
  ArrowRight,
} from "lucide-react";
import type { DREStatementResult, BalanceSheetResult } from "@/lib/finance";

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState<"dre" | "balance">("dre");
  const [regime, setRegime] = useState<"competence" | "cash">("competence");
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const [dreData, setDreData] = useState<DREStatementResult | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceSheetResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDre = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/finance/reports/dre?year=${selectedYear}&regime=${regime}`
      );
      if (res.ok) {
        const data = await res.json();
        setDreData(data);
      }
    } catch (err) {
      console.error("[RelatoriosPage] Erro ao buscar DRE:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, regime]);

  const fetchBalance = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/finance/reports/balance-sheet");
      if (res.ok) {
        const data = await res.json();
        setBalanceData(data);
      }
    } catch (err) {
      console.error("[RelatoriosPage] Erro ao buscar Balanço:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "dre") {
      fetchDre();
    } else {
      fetchBalance();
    }
  }, [activeTab, fetchDre, fetchBalance]);

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleExportCSV = () => {
    if (activeTab === "dre") {
      window.open(
        `/api/finance/reports/dre?year=${selectedYear}&regime=${regime}&format=csv`,
        "_blank"
      );
    } else {
      window.open("/api/finance/reports/balance-sheet?format=csv", "_blank");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in print:p-0">
      {/* BARRA SUPERIOR DE CONTROLE E EXPORTAÇÃO */}
      <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-veronna-bordo)]">
            Demonstrações Contábeis Oficiais
          </span>
          <h2 className="text-xl font-bold text-[var(--color-veronna-navy)]">
            {activeTab === "dre" ? "DRE Gerencial do Exercício" : "Balanço Patrimonial"}
          </h2>
          <p className="text-xs text-gray-500">
            Relatórios para controladoria, apuração de impostos e reuniões de sócios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* SELETOR DE RELATÓRIO */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl">
            <button
              onClick={() => setActiveTab("dre")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                activeTab === "dre"
                  ? "bg-white text-[var(--color-veronna-navy)] shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              DRE Gerencial
            </button>
            <button
              onClick={() => setActiveTab("balance")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                activeTab === "balance"
                  ? "bg-white text-[var(--color-veronna-navy)] shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Balanço Patrimonial
            </button>
          </div>

          {/* TOGGLE COMPETÊNCIA VS CAIXA (SE DRE) */}
          {activeTab === "dre" && (
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl">
              <button
                onClick={() => setRegime("competence")}
                className={`px-2.5 py-1.5 text-[11px] font-bold rounded-xl transition ${
                  regime === "competence"
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Competência
              </button>
              <button
                onClick={() => setRegime("cash")}
                className={`px-2.5 py-1.5 text-[11px] font-bold rounded-xl transition ${
                  regime === "cash"
                    ? "bg-white text-blue-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Caixa
              </button>
            </div>
          )}

          {/* SELETOR DE ANO */}
          {activeTab === "dre" && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 text-xs font-bold text-[var(--color-veronna-navy)] rounded-xl border border-gray-200 bg-white focus:outline-none"
            >
              <option value={2026}>Exercício 2026</option>
              <option value={2025}>Exercício 2025</option>
            </select>
          )}

          {/* BOTÕES DE EXPORTAÇÃO */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 shadow-sm transition"
          >
            <Download size={13} /> Exportar CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 shadow-sm transition"
          >
            <Printer size={13} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel py-28 text-center text-xs text-gray-400 bg-white/50 rounded-3xl">
          Consolidando dados contábeis...
        </div>
      ) : activeTab === "dre" && dreData ? (
        /* ========================================================================= */
        /* VISÃO: DRE GERENCIAL                                                      */
        /* ========================================================================= */
        <div className="flex flex-col gap-6">
          {/* TOP METRICS DA DRE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* RECEITA LÍQUIDA */}
            <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Receita Líquida (Faturamento - Impostos)
              </span>
              <div className="text-2xl font-bold text-emerald-700 mt-2">
                {formatBRL(dreData.metrics.netRevenue)}
              </div>
              <span className="text-[11px] text-gray-500 mt-1">
                Bruta: {formatBRL(dreData.metrics.grossRevenue)}
              </span>
            </div>

            {/* LUCRO BRUTO */}
            <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                Lucro Bruto (Após Custos Diretos)
              </span>
              <div className="text-2xl font-bold text-blue-900 mt-2">
                {formatBRL(dreData.metrics.grossProfit)}
              </div>
              <span className="text-[11px] font-semibold text-blue-700 mt-1">
                Margem Bruta: {dreData.metrics.grossMargin.toFixed(1)}%
              </span>
            </div>

            {/* EBITDA */}
            <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
                EBITDA Operacional
              </span>
              <div className="text-2xl font-bold text-purple-900 mt-2">
                {formatBRL(dreData.metrics.ebitda)}
              </div>
              <span className="text-[11px] font-semibold text-purple-700 mt-1">
                Margem EBITDA: {dreData.metrics.ebitdaMargin.toFixed(1)}%
              </span>
            </div>

            {/* RESULTADO LÍQUIDO */}
            <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-veronna-bordo)]">
                Resultado Líquido do Exercício
              </span>
              <div
                className={`text-2xl font-bold mt-2 ${
                  dreData.metrics.netIncome >= 0 ? "text-[var(--color-veronna-navy)]" : "text-red-700"
                }`}
              >
                {formatBRL(dreData.metrics.netIncome)}
              </div>
              <span className="text-[11px] font-semibold text-gray-600 mt-1">
                Margem Líquida: {dreData.metrics.netMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* TABELA ESTRUTURADA DE DRE */}
          <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-[var(--color-veronna-navy)]">
                  Demonstração Estruturada do Resultado
                </h3>
                <span className="text-xs text-gray-500">
                  Regime Contábil:{" "}
                  <strong>
                    {regime === "competence" ? "Competência (Fato Gerador)" : "Caixa (Liquidação Efetiva)"}
                  </strong>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    <th className="py-2.5 px-4">Linha DRE / Conta Contábil</th>
                    <th className="py-2.5 px-4 text-right">Valor Consolidado (R$)</th>
                    <th className="py-2.5 px-4 text-right">% da Receita Líquida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-sans">
                  {/* 1. RECEITA BRUTA */}
                  <tr className="bg-emerald-50/40 font-bold text-emerald-950">
                    <td className="py-3 px-4">1. RECEITA BRUTA OPERACIONAL</td>
                    <td className="py-3 px-4 text-right">{formatBRL(dreData.metrics.grossRevenue)}</td>
                    <td className="py-3 px-4 text-right">-</td>
                  </tr>
                  {dreData.lineItems.grossRevenue.map((item) => (
                    <tr key={item.code} className="text-gray-700 hover:bg-white/60">
                      <td className="py-2 px-8 text-[11px]">
                        {item.code} - {item.name}
                      </td>
                      <td className="py-2 px-4 text-right font-medium">{formatBRL(item.amount)}</td>
                      <td className="py-2 px-4 text-right text-gray-400 text-[11px]">
                        {dreData.metrics.netRevenue > 0
                          ? `${((item.amount / dreData.metrics.netRevenue) * 100).toFixed(1)}%`
                          : "-"}
                      </td>
                    </tr>
                  ))}

                  {/* 2. DEDUÇÕES */}
                  <tr className="bg-red-50/30 font-bold text-red-950">
                    <td className="py-3 px-4">2. (-) DEDUÇÕES TRIBUTÁRIAS SOBRE RECEITA</td>
                    <td className="py-3 px-4 text-right text-red-700">
                      -{formatBRL(dreData.metrics.taxDeductions)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600">
                      {dreData.metrics.netRevenue > 0
                        ? `${((dreData.metrics.taxDeductions / dreData.metrics.netRevenue) * 100).toFixed(1)}%`
                        : "-"}
                    </td>
                  </tr>
                  {dreData.lineItems.taxDeductions.map((item) => (
                    <tr key={item.code} className="text-gray-700 hover:bg-white/60">
                      <td className="py-2 px-8 text-[11px]">
                        {item.code} - {item.name}
                      </td>
                      <td className="py-2 px-4 text-right font-medium text-red-600">
                        -{formatBRL(item.amount)}
                      </td>
                      <td className="py-2 px-4 text-right text-gray-400 text-[11px]">
                        {dreData.metrics.netRevenue > 0
                          ? `${((item.amount / dreData.metrics.netRevenue) * 100).toFixed(1)}%`
                          : "-"}
                      </td>
                    </tr>
                  ))}

                  {/* 3. RECEITA LÍQUIDA */}
                  <tr className="bg-gray-100/70 font-bold text-gray-900">
                    <td className="py-3 px-4">3. (=) RECEITA OPERACIONAL LÍQUIDA</td>
                    <td className="py-3 px-4 text-right">{formatBRL(dreData.metrics.netRevenue)}</td>
                    <td className="py-3 px-4 text-right">100.0%</td>
                  </tr>

                  {/* 4. CUSTOS DIRETOS */}
                  <tr className="bg-red-50/20 font-bold text-red-900">
                    <td className="py-3 px-4">4. (-) CUSTOS DOS SERVIÇOS PRESTADOS (CSP / COGS)</td>
                    <td className="py-3 px-4 text-right text-red-700">
                      -{formatBRL(dreData.metrics.cogs)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600">
                      {dreData.metrics.netRevenue > 0
                        ? `${((dreData.metrics.cogs / dreData.metrics.netRevenue) * 100).toFixed(1)}%`
                        : "-"}
                    </td>
                  </tr>
                  {dreData.lineItems.cogs.map((item) => (
                    <tr key={item.code} className="text-gray-700 hover:bg-white/60">
                      <td className="py-2 px-8 text-[11px]">
                        {item.code} - {item.name}
                      </td>
                      <td className="py-2 px-4 text-right font-medium text-red-600">
                        -{formatBRL(item.amount)}
                      </td>
                      <td className="py-2 px-4 text-right text-gray-400 text-[11px]">
                        {dreData.metrics.netRevenue > 0
                          ? `${((item.amount / dreData.metrics.netRevenue) * 100).toFixed(1)}%`
                          : "-"}
                      </td>
                    </tr>
                  ))}

                  {/* 5. LUCRO BRUTO */}
                  <tr className="bg-blue-50/40 font-bold text-blue-950">
                    <td className="py-3 px-4">5. (=) LUCRO BRUTO</td>
                    <td className="py-3 px-4 text-right">{formatBRL(dreData.metrics.grossProfit)}</td>
                    <td className="py-3 px-4 text-right text-blue-700">
                      {dreData.metrics.grossMargin.toFixed(1)}%
                    </td>
                  </tr>

                  {/* 6. DESPESAS OPERACIONAIS */}
                  <tr className="bg-amber-50/20 font-bold text-amber-950">
                    <td className="py-3 px-4">6. (-) DESPESAS OPERACIONAIS (OPEX)</td>
                    <td className="py-3 px-4 text-right text-amber-900">
                      -{formatBRL(dreData.metrics.opex)}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-800">
                      {dreData.metrics.netRevenue > 0
                        ? `${((dreData.metrics.opex / dreData.metrics.netRevenue) * 100).toFixed(1)}%`
                        : "-"}
                    </td>
                  </tr>
                  {dreData.lineItems.opex.map((item) => (
                    <tr key={item.code} className="text-gray-700 hover:bg-white/60">
                      <td className="py-2 px-8 text-[11px]">
                        {item.code} - {item.name}
                      </td>
                      <td className="py-2 px-4 text-right font-medium text-amber-800">
                        -{formatBRL(item.amount)}
                      </td>
                      <td className="py-2 px-4 text-right text-gray-400 text-[11px]">
                        {dreData.metrics.netRevenue > 0
                          ? `${((item.amount / dreData.metrics.netRevenue) * 100).toFixed(1)}%`
                          : "-"}
                      </td>
                    </tr>
                  ))}

                  {/* 7. EBITDA */}
                  <tr className="bg-purple-100/50 font-bold text-purple-950">
                    <td className="py-3.5 px-4 text-sm">7. (=) EBITDA (LUCRO ANTES DE JUROS E IMPOSTOS)</td>
                    <td className="py-3.5 px-4 text-right text-sm">{formatBRL(dreData.metrics.ebitda)}</td>
                    <td className="py-3.5 px-4 text-right text-sm text-purple-800">
                      {dreData.metrics.ebitdaMargin.toFixed(1)}%
                    </td>
                  </tr>

                  {/* 8. RESULTADO LÍQUIDO */}
                  <tr className="bg-[var(--color-veronna-navy)] text-white font-bold">
                    <td className="py-3.5 px-4 text-sm">8. (=) RESULTADO LÍQUIDO DO EXERCÍCIO</td>
                    <td className="py-3.5 px-4 text-right text-sm">{formatBRL(dreData.metrics.netIncome)}</td>
                    <td className="py-3.5 px-4 text-right text-sm">
                      {dreData.metrics.netMargin.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* EVOLUÇÃO MENSAL */}
          {dreData.monthlyEvolution.length > 0 && (
            <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col gap-4">
              <h3 className="text-base font-bold text-[var(--color-veronna-navy)]">
                Evolução Mensal do Exercício
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="py-2 px-3">Mês</th>
                      <th className="py-2 px-3 text-right">Receita Bruta</th>
                      <th className="py-2 px-3 text-right">Deduções</th>
                      <th className="py-2 px-3 text-right">Custos (COGS)</th>
                      <th className="py-2 px-3 text-right">OPEX</th>
                      <th className="py-2 px-3 text-right">EBITDA</th>
                      <th className="py-2 px-3 text-right">Resultado Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dreData.monthlyEvolution.map((m) => (
                      <tr key={m.month} className="hover:bg-white/60">
                        <td className="py-2.5 px-3 font-bold text-gray-900">{m.month}</td>
                        <td className="py-2.5 px-3 text-right font-medium">{formatBRL(m.grossRevenue)}</td>
                        <td className="py-2.5 px-3 text-right text-red-600">-{formatBRL(m.taxDeductions)}</td>
                        <td className="py-2.5 px-3 text-right text-red-600">-{formatBRL(m.cogs)}</td>
                        <td className="py-2.5 px-3 text-right text-amber-800">-{formatBRL(m.opex)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-purple-900">{formatBRL(m.ebitda)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[var(--color-veronna-navy)]">
                          {formatBRL(m.netIncome)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "balance" && balanceData ? (
        /* ========================================================================= */
        /* VISÃO: BALANÇO PATRIMONIAL                                                */
        /* ========================================================================= */
        <div className="flex flex-col gap-6">
          {/* EQUILÍBRIO CONTÁBIL */}
          <div
            className={`p-4 rounded-3xl border flex items-center justify-between gap-3 ${
              balanceData.isBalanced
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Scale size={20} className={balanceData.isBalanced ? "text-emerald-700" : "text-red-700"} />
              <div>
                <strong className="text-xs">Equilíbrio Patrimonial:</strong>{" "}
                <span className="text-xs">
                  {balanceData.isBalanced
                    ? "Ativo = Passivo + Patrimônio Líquido conferido com exatidão."
                    : `Divergência de R$ ${balanceData.discrepancy.toFixed(2)} identificada entre Ativo e Passivo+PL.`}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold font-mono">Corte: {balanceData.cutoffDate}</span>
          </div>

          {/* ESTRUTURA PATRIMONIAL LADO A LADO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LADO ESQUERDO: ATIVO */}
            <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="text-base font-bold text-[var(--color-veronna-navy)]">
                  ATIVO TOTAL
                </h3>
                <span className="text-lg font-bold text-emerald-700">
                  {formatBRL(balanceData.assets.totalAssets)}
                </span>
              </div>

              {/* ATIVO CIRCULANTE */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-bold text-gray-800 bg-gray-50 p-2.5 rounded-xl">
                  <span>1. Ativo Circulante</span>
                  <span>{formatBRL(balanceData.assets.current.total)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600 px-3 py-1">
                  <span>Disponibilidades (Contas Bancárias e Caixa)</span>
                  <span className="font-semibold">{formatBRL(balanceData.assets.current.cashAndBanks)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600 px-3 py-1">
                  <span>Contas a Receber de Clientes</span>
                  <span className="font-semibold">{formatBRL(balanceData.assets.current.accountsReceivable)}</span>
                </div>
              </div>

              {/* ATIVO NÃO CIRCULANTE */}
              <div className="flex flex-col gap-2 mt-4">
                <div className="flex justify-between items-center text-xs font-bold text-gray-800 bg-gray-50 p-2.5 rounded-xl">
                  <span>2. Ativo Não Circulante (Imobilizado)</span>
                  <span>{formatBRL(balanceData.assets.nonCurrent.total)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600 px-3 py-1">
                  <span>Equipamentos, Hardware e Intangíveis</span>
                  <span className="font-semibold">
                    {formatBRL(balanceData.assets.nonCurrent.equipmentAndIntangibles)}
                  </span>
                </div>
              </div>
            </div>

            {/* LADO DIREITO: PASSIVO E PATRIMÔNIO LÍQUIDO */}
            <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="text-base font-bold text-[var(--color-veronna-navy)]">
                  PASSIVO & PATRIMÔNIO LÍQUIDO
                </h3>
                <span className="text-lg font-bold text-blue-900">
                  {formatBRL(balanceData.totalLiabilitiesAndEquity)}
                </span>
              </div>

              {/* PASSIVO CIRCULANTE */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-bold text-gray-800 bg-gray-50 p-2.5 rounded-xl">
                  <span>1. Passivo Circulante (Obrigações)</span>
                  <span>{formatBRL(balanceData.liabilities.totalLiabilities)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600 px-3 py-1">
                  <span>Fornecedores e Contas a Pagar</span>
                  <span className="font-semibold">{formatBRL(balanceData.liabilities.current.suppliersPayable)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600 px-3 py-1">
                  <span>Tributos a Recolher (DAS e ISS)</span>
                  <span className="font-semibold">{formatBRL(balanceData.liabilities.current.taxObligationsPayable)}</span>
                </div>
              </div>

              {/* PATRIMÔNIO LÍQUIDO */}
              <div className="flex flex-col gap-2 mt-4">
                <div className="flex justify-between items-center text-xs font-bold text-gray-800 bg-gray-50 p-2.5 rounded-xl">
                  <span>2. Patrimônio Líquido</span>
                  <span>{formatBRL(balanceData.equity.totalEquity)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600 px-3 py-1">
                  <span>Capital Social Subscrito</span>
                  <span className="font-semibold">{formatBRL(balanceData.equity.shareCapital)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600 px-3 py-1">
                  <span>Lucros / Prejuízos Acumulados</span>
                  <span className="font-semibold">{formatBRL(balanceData.equity.accumulatedEarnings)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
