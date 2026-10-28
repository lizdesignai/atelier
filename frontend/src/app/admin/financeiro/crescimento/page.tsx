// src/app/admin/financeiro/crescimento/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Compass,
  TrendingUp,
  Target,
  ShieldCheck,
  Zap,
  PieChart,
  Users,
  AlertTriangle,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";
import type { GrowthIntelligenceResult } from "@/lib/finance";

export default function CrescimentoPage() {
  const [data, setData] = useState<GrowthIntelligenceResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGrowth = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/finance/growth");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("[CrescimentoPage] Erro:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrowth();
  }, [fetchGrowth]);

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* HEADER DE INTELIGÊNCIA ESTRATÉGICA */}
      <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-veronna-bordo)] flex items-center gap-1.5">
            <Compass size={13} /> Direcionamento de Crescimento & Alocação de Capital
          </span>
          <h2 className="text-xl font-bold text-[var(--color-veronna-navy)]">
            Onde Crescer & Onde Investir no Atelier
          </h2>
          <p className="text-xs text-gray-500">
            Rentabilidade por linha de serviço, matriz estratégica de investimento e plano defensivo de alocação de caixa.
          </p>
        </div>

        {data && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
            <Zap size={14} className="text-emerald-600" />
            <span>
              {data.capitalAllocation.statusMode === "growth"
                ? "Modo Expansão Acelerada"
                : data.capitalAllocation.statusMode === "conservative"
                ? "Modo Construção de Caixa"
                : "Modo Defesa de Liquidez"}
            </span>
          </div>
        )}
      </div>

      {isLoading || !data ? (
        <div className="glass-panel py-28 text-center text-xs text-gray-400 bg-white/50 rounded-3xl">
          Analisando histórico de rentabilidade e alocação de recursos...
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* CARDS DE DIAGNÓSTICO DO MOTOR CFO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CAIXA DISPONÍVEL */}
            <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-veronna-navy)]">
                Caixa Total Disponível
              </span>
              <div className="text-2xl font-bold text-[var(--color-veronna-navy)] mt-2">
                {formatBRL(data.capitalAllocation.availableCash)}
              </div>
              <span className="text-[11px] text-gray-500 mt-1">Saldo em contas e aplicações</span>
            </div>

            {/* RUNWAY ESTIMADO */}
            <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Runway de Sobrevivência
              </span>
              <div className="text-2xl font-bold text-emerald-700 mt-2">
                {data.capitalAllocation.runwayMonths > 120
                  ? "∞ (Operação Lucrativa)"
                  : `${data.capitalAllocation.runwayMonths} meses`}
              </div>
              <span className="text-[11px] text-gray-500 mt-1">
                Sem necessidade de queima de caixa
              </span>
            </div>

            {/* CONCENTRAÇÃO TOP 3 */}
            <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Concentração Top 3 Clientes
              </span>
              <div className="text-2xl font-bold text-amber-700 mt-2">
                {data.topConcentration.top3SharePercent}%
              </div>
              <span className="text-[11px] text-gray-500 mt-1">
                Risco {data.topConcentration.riskLevel === "low" ? "Baixo" : "Moderado"}
              </span>
            </div>

            {/* TICKET MÉDIO & LTV */}
            <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
                LTV Estimado por Cliente
              </span>
              <div className="text-2xl font-bold text-purple-900 mt-2">
                {formatBRL(data.unitEconomics.estimatedLtv)}
              </div>
              <span className="text-[11px] text-gray-500 mt-1">
                Ticket Médio: {formatBRL(data.unitEconomics.avgTicketOverall)}
              </span>
            </div>
          </div>

          {/* MATRIZ ESTRATÉGICA DE LINHAS DE SERVIÇO: ONDE INVESTIR */}
          <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-[var(--color-veronna-navy)]">
                Matriz Estratégica de Linhas de Serviço & Rentabilidade Real
              </h3>
              <p className="text-xs text-gray-500">
                Identifica quais serviços geram margem líquida real para acelerar vendas e quais necessitam de otimização de escopo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {data.services.map((svc) => (
                <div
                  key={svc.serviceKey}
                  className="p-5 rounded-2xl bg-white/70 border border-gray-100 shadow-sm flex flex-col justify-between gap-3 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{svc.serviceLabel}</h4>
                      <span className="text-[10px] text-gray-400">
                        {svc.activeContractsCount} projeto(s)/contrato(s) ativos
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                        svc.strategicQuadrant === "scale"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : svc.strategicQuadrant === "retain"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : svc.strategicQuadrant === "optimize"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-red-100 text-red-800 border border-red-200"
                      }`}
                    >
                      {svc.strategicQuadrant === "scale"
                        ? "Acelerar & Escalar"
                        : svc.strategicQuadrant === "retain"
                        ? "Foco em Retenção"
                        : svc.strategicQuadrant === "optimize"
                        ? "Otimizar Processos"
                        : "Reprecificar Escopo"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-gray-100 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Faturamento</span>
                      <strong className="text-gray-900">{formatBRL(svc.totalRevenue)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Custo Direto</span>
                      <strong className="text-red-700">{formatBRL(svc.totalCost)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Margem Bruta</span>
                      <strong
                        className={
                          svc.marginPercent >= 65 ? "text-emerald-700" : "text-amber-700"
                        }
                      >
                        {svc.marginPercent.toFixed(1)}%
                      </strong>
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-600 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                    <strong>Direcionamento:</strong> {svc.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PLANO DE ALOCAÇÃO DE CAPITAL RECOMENDADO (DIRECIONAMENTO DE RECURSOS) */}
          <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-[var(--color-veronna-navy)]">
                  Plano de Alocação de Capital para Crescimento Sustentável
                </h3>
                <p className="text-xs text-gray-500">
                  Como direcionar o fluxo de caixa gerado para expandir sem comprometer a saúde financeira do estúdio.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              {/* RESERVA DE EMERGÊNCIA */}
              <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200/80 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900">
                    1. Reserva Estratégica de Segurança ({data.capitalAllocation.allocation.emergencyReservePercent}%)
                  </span>
                  <div className="text-xl font-bold text-blue-950 mt-1">
                    {formatBRL(data.capitalAllocation.allocation.emergencyReserve)} /mês
                  </div>
                </div>
                <p className="text-[11px] text-blue-800/80 mt-3 leading-relaxed">
                  Destinado a manter 6 meses de despesas fixas em liquidez diária, garantindo solidez diante de oscilações de mercado.
                </p>
              </div>

              {/* INVESTIMENTO EM GROWTH */}
              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                    2. Reinvestimento em Aquisição / Growth ({data.capitalAllocation.allocation.growthInvestmentPercent}%)
                  </span>
                  <div className="text-xl font-bold text-emerald-950 mt-1">
                    {formatBRL(data.capitalAllocation.allocation.growthInvestment)} /mês
                  </div>
                </div>
                <p className="text-[11px] text-emerald-800/80 mt-3 leading-relaxed">
                  Direcionado para tráfego pago nos serviços de maior margem (IDV e O Mapa), outbound comercial e tecnologia.
                </p>
              </div>

              {/* DISTRIBUIÇÃO DE LUCROS */}
              <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200/80 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900">
                    3. Dividendos / Lucros aos Sócios ({data.capitalAllocation.allocation.partnerDividendsPercent}%)
                  </span>
                  <div className="text-xl font-bold text-purple-950 mt-1">
                    {formatBRL(data.capitalAllocation.allocation.partnerDividends)} /mês
                  </div>
                </div>
                <p className="text-[11px] text-purple-800/80 mt-3 leading-relaxed">
                  Distribuição calculada estritamente sobre o lucro real livre, preservando a sustentabilidade e expansão da agência.
                </p>
              </div>
            </div>

            {/* PARECER FINAL */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-xs text-gray-700 mt-2">
              <strong>Parecer da Controladoria:</strong>{" "}
              {data.capitalAllocation.recommendations.join(" ")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
