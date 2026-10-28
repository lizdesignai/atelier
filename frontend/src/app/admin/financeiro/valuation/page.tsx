// src/app/admin/financeiro/valuation/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  DollarSign,
  Layers,
  Scale,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calculator,
} from "lucide-react";
import type { ValuationAnalysisResult } from "@/lib/finance";

export default function ValuationPage() {
  const [data, setData] = useState<ValuationAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulador Customizado
  const [customMultiple, setCustomMultiple] = useState<number>(5.0);
  const [customGrowth, setCustomGrowth] = useState<number>(20.0);
  const [scenarioName, setScenarioName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const fetchValuation = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/finance/valuation");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.scenarios?.base?.ebitdaMultiple) {
          setCustomMultiple(json.scenarios.base.ebitdaMultiple);
        }
      }
    } catch (err) {
      console.error("[ValuationPage] Erro:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchValuation();
  }, [fetchValuation]);

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Cálculo da simulação interativa
  const simulatedEbitda = data?.metrics.annualEbitda || 0;
  const simulatedValuation = Number((simulatedEbitda * customMultiple).toFixed(2));

  const handleSaveScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenarioName.trim()) {
      alert("Informe um nome para o cenário.");
      return;
    }

    setIsSaving(true);
    setSaveFeedback(null);
    try {
      const res = await fetch("/api/finance/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: scenarioName.trim(),
          scenario_type: "base",
          ebitda_multiple: customMultiple,
          mrr_multiple: 1.5,
          discount_rate: 14.0,
          annual_growth_rate: customGrowth,
          calculated_valuation: simulatedValuation,
          methodology: "multiple_ebitda",
          parameters: {
            annualEbitda: simulatedEbitda,
            multiple: customMultiple,
            growth: customGrowth,
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Erro ao salvar cenário.");
      }

      setSaveFeedback("Cenário de valuation salvo com sucesso!");
      setScenarioName("");
      fetchValuation();
    } catch (err: any) {
      alert(err.message || "Erro inesperado.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* HEADER EXECUTIVO DE VALUATION */}
      <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-veronna-bordo)] flex items-center gap-1.5">
            <Sparkles size={13} /> M&A, Equity & Valuation da Empresa
          </span>
          <h2 className="text-xl font-bold text-[var(--color-veronna-navy)]">
            Valuation & Valor de Mercado do Studio Veronna
          </h2>
          <p className="text-xs text-gray-500">
            Cálculo baseado em múltiplos de EBITDA real, receita recorrente contratada (ARR) e Fluxo de Caixa Descontado.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
              Metodologia Primária
            </span>
            <div className="text-xs font-bold text-[var(--color-veronna-navy)]">
              Múltiplo de EBITDA + ARR
            </div>
          </div>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="glass-panel py-28 text-center text-xs text-gray-400 bg-white/50 rounded-3xl">
          Calculando premissas de valuation e múltiplos de mercado...
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* CARD PRINCIPAL: VALUATION ESTIMADO */}
          <div className="glass-panel p-8 rounded-3xl bg-gradient-to-br from-[var(--color-veronna-navy)] to-slate-900 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Cenário Base de Mercado (Recomendado)
              </span>
              <div className="text-3xl md:text-5xl font-extrabold tracking-tight mt-1 text-white">
                {formatBRL(data.scenarios.base.recommendedValuation)}
              </div>
              <p className="text-xs text-slate-300 max-w-xl mt-2 leading-relaxed">
                Valor patrimonial estimado para rodadas de investimento, entrada de sócios ou M&A. Ponderado entre múltiplo de EBITDA (5.0x), múltiplo de receita recorrente anualizada (1.5x ARR) e projeção de DCF em 5 anos.
              </p>
            </div>

            <div className="flex flex-col gap-2 min-w-[200px] bg-white/10 p-4 rounded-2xl border border-white/10">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300">EBITDA Anual:</span>
                <span className="font-bold text-white">{formatBRL(data.metrics.annualEbitda)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300">MRR Contratado:</span>
                <span className="font-bold text-white">{formatBRL(data.metrics.mrr)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300">ARR Recorrente:</span>
                <span className="font-bold text-white">{formatBRL(data.metrics.arr)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-white/10">
                <span className="text-slate-300">Margem EBITDA:</span>
                <span className="font-bold text-emerald-400">{data.metrics.ebitdaMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* COMPARAÇÃO DOS 3 CENÁRIOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CONSERVADOR */}
            <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    {data.scenarios.conservative.name}
                  </span>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {formatBRL(data.scenarios.conservative.recommendedValuation)}
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {data.scenarios.conservative.ebitdaMultiple}x EBITDA
                </span>
              </div>
              <div className="text-[11px] text-gray-500 mt-4 flex flex-col gap-1 border-t border-gray-100 pt-3">
                <div>Por Múltiplo EBITDA: {formatBRL(data.scenarios.conservative.valuationByEbitda)}</div>
                <div>Por Múltiplo ARR (1.0x): {formatBRL(data.scenarios.conservative.valuationByARR)}</div>
                <div>Por DCF (Desc. 18%): {formatBRL(data.scenarios.conservative.valuationByDCF)}</div>
              </div>
            </div>

            {/* BASE */}
            <div className="glass-panel p-6 rounded-3xl bg-blue-50/40 border border-blue-200/80 shadow-sm flex flex-col justify-between ring-2 ring-[var(--color-veronna-navy)]/10">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900">
                    {data.scenarios.base.name} (Referência)
                  </span>
                  <div className="text-2xl font-bold text-[var(--color-veronna-navy)] mt-1">
                    {formatBRL(data.scenarios.base.recommendedValuation)}
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {data.scenarios.base.ebitdaMultiple}x EBITDA
                </span>
              </div>
              <div className="text-[11px] text-gray-600 mt-4 flex flex-col gap-1 border-t border-blue-100 pt-3">
                <div>Por Múltiplo EBITDA: {formatBRL(data.scenarios.base.valuationByEbitda)}</div>
                <div>Por Múltiplo ARR (1.5x): {formatBRL(data.scenarios.base.valuationByARR)}</div>
                <div>Por DCF (Desc. 14%): {formatBRL(data.scenarios.base.valuationByDCF)}</div>
              </div>
            </div>

            {/* OTIMISTA */}
            <div className="glass-panel p-6 rounded-3xl bg-emerald-50/40 border border-emerald-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                    {data.scenarios.optimistic.name}
                  </span>
                  <div className="text-2xl font-bold text-emerald-800 mt-1">
                    {formatBRL(data.scenarios.optimistic.recommendedValuation)}
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {data.scenarios.optimistic.ebitdaMultiple}x EBITDA
                </span>
              </div>
              <div className="text-[11px] text-gray-600 mt-4 flex flex-col gap-1 border-t border-emerald-100 pt-3">
                <div>Por Múltiplo EBITDA: {formatBRL(data.scenarios.optimistic.valuationByEbitda)}</div>
                <div>Por Múltiplo ARR (2.2x): {formatBRL(data.scenarios.optimistic.valuationByARR)}</div>
                <div>Por DCF (Desc. 11%): {formatBRL(data.scenarios.optimistic.valuationByDCF)}</div>
              </div>
            </div>
          </div>

          {/* SIMULADOR INTERATIVO E SENSIBILIDADE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* SIMULADOR */}
            <div className="lg:col-span-6 glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Calculator size={18} className="text-[var(--color-veronna-navy)]" />
                <h3 className="text-base font-bold text-[var(--color-veronna-navy)]">
                  Simulador Interativo de Valuation
                </h3>
              </div>

              {saveFeedback && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>{saveFeedback}</span>
                </div>
              )}

              <div className="flex flex-col gap-4 mt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                    <span>Múltiplo de EBITDA Desejado:</span>
                    <span className="font-bold text-[var(--color-veronna-navy)]">{customMultiple.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="2.0"
                    max="10.0"
                    step="0.5"
                    value={customMultiple}
                    onChange={(e) => setCustomMultiple(Number(e.target.value))}
                    className="w-full accent-[var(--color-veronna-navy)] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>2.0x (Conservador)</span>
                    <span>5.0x (Média Agências)</span>
                    <span>10.0x (Tech / SaaS)</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">
                      Valuation Resultante
                    </span>
                    <div className="text-xl font-bold text-[var(--color-veronna-navy)]">
                      {formatBRL(simulatedValuation)}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    Base: {formatBRL(simulatedEbitda)} EBITDA
                  </span>
                </div>

                <form onSubmit={handleSaveScenario} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nome do cenário (Ex: Negociação Sócio 2026)"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
                  />
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[var(--color-veronna-navy)] rounded-xl shadow-sm hover:bg-[var(--color-veronna-navy)]/90 transition disabled:opacity-50"
                  >
                    <Save size={13} />
                    {isSaving ? "Salvando..." : "Salvar"}
                  </button>
                </form>
              </div>
            </div>

            {/* TABELA DE SENSIBILIDADE */}
            <div className="lg:col-span-6 glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col gap-4">
              <h3 className="text-base font-bold text-[var(--color-veronna-navy)]">
                Matriz de Sensibilidade por Múltiplos
              </h3>
              <p className="text-xs text-gray-500">
                Como o valor de mercado oscila de acordo com o apetite dos investidores.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="py-2.5 px-3">Múltiplo</th>
                      <th className="py-2.5 px-3 text-right">Valuation por EBITDA</th>
                      <th className="py-2.5 px-3 text-right">Valuation por ARR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.sensitivityMatrix.map((item) => (
                      <tr
                        key={item.multiple}
                        className={`hover:bg-white/60 ${
                          item.multiple === 5.0 ? "bg-blue-50/50 font-bold text-blue-950" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 font-semibold">{item.multiple.toFixed(1)}x</td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          {formatBRL(item.ebitdaValuation)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-600">
                          {formatBRL(item.arrValuation)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
