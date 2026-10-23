"use client";
// src/app/admin/gerenciamento/views/PresencaDesempenho.tsx
// Fase 6 — Aprender: Análise de desempenho, aprendizados e decisões editoriais para o próximo ciclo.

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, CheckCircle2, Clock, AlertTriangle,
  Lightbulb, ArrowRight, Save, Loader2, Calendar,
  ChevronDown, HelpCircle
} from "lucide-react";
import {
  PILLARS, OBJECTIVE_KINDS, APPROVAL_SLA_BUSINESS_DAYS,
  businessDaysBetween, isPieceTask, deriveStatus
} from "../../../../lib/presenca/constants";

interface Props {
  activeProjectId: string;
  currentProject: any;
}

const showToast = (msg: string) => window.dispatchEvent(new CustomEvent("showToast", { detail: msg }));
const glass = "bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-[2rem]";
const label = "font-roboto text-[10px] font-bold uppercase tracking-widest";
const sectionTitle = "font-elegant text-xl text-[var(--color-atelier-grafite)]";

export default function PresencaDesempenho({ activeProjectId, currentProject }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  // Formulário de "Nossa Leitura" e "Próxima Decisão"
  const [learnings, setLearnings] = useState("");
  const [nextDecision, setNextDecision] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchData = useCallback(async (cycleId?: string) => {
    try {
      const url = cycleId 
        ? `/api/presenca?projectId=${activeProjectId}&cycleId=${cycleId}`
        : `/api/presenca?projectId=${activeProjectId}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setData(json);
      if (json.cycle) {
        setSelectedCycleId(json.cycle.id);
        setLearnings(json.cycle.learnings || "");
        setNextDecision(json.cycle.next_decision || "");
      }
    } catch (e: any) {
      showToast("Erro ao carregar dados de desempenho: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleCycleChange = (id: string) => {
    setSelectedCycleId(id);
    fetchData(id);
  };

  const saveLearningsAndDecisions = async () => {
    if (!data?.cycle?.id) return;
    setSavingNotes(true);
    try {
      const res = await fetch("/api/presenca/cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId: data.cycle.id,
          learnings,
          next_decision: nextDecision
        })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      showToast("✨ Aprendizados e decisões salvos com sucesso.");
    } catch (e: any) {
      showToast("Erro ao salvar anotações: " + e.message);
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={32} />
      </div>
    );
  }

  if (!data?.cycle) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 opacity-40">
        <BarChart3 size={40} />
        <p className="font-elegant text-xl">Nenhum ciclo ativo ou histórico encontrado.</p>
      </div>
    );
  }

  const { cycle, allCycles = [], metrics, pieces = [] } = data;
  const objectiveKindConfig = cycle.objective_kind && OBJECTIVE_KINDS[cycle.objective_kind]
    ? OBJECTIVE_KINDS[cycle.objective_kind]
    : null;

  return (
    <div className="flex flex-col gap-6 pb-12 animate-[fadeInUp_0.4s_ease-out]">
      {/* SELETOR DE CICLO E CABEÇALHO */}
      <div className={`${glass} p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center">
            <BarChart3 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`${label} text-[var(--color-atelier-terracota)]`}>
                Desempenho & Inteligência Editorial
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-orange-100 text-orange-800">
                Fase 06 · Aprender
              </span>
            </div>
            <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
              O que aprendemos sobre a presença digital deste negócio?
            </h2>
          </div>
        </div>

        {/* Dropdown de Ciclos */}
        {allCycles.length > 0 && (
          <div className="flex items-center gap-2">
            <span className={`${label} text-[var(--color-atelier-grafite)]/50`}>Ciclo:</span>
            <div className="relative">
              <select
                value={selectedCycleId || cycle.id}
                onChange={(e) => handleCycleChange(e.target.value)}
                className="appearance-none bg-white/90 border border-gray-200 rounded-xl px-4 py-2 pr-9 text-xs font-bold text-[var(--color-atelier-grafite)] focus:outline-none focus:border-[var(--color-atelier-terracota)] cursor-pointer"
              >
                {allCycles.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    Ciclo #{c.cycle_number} ({new Date(c.period_start).toLocaleDateString("pt-BR")} a {new Date(c.period_end).toLocaleDateString("pt-BR")}) {c.status === 'open' ? '• Atual' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* CARDS DE RESULTADOS QUANTITATIVOS E OPERACIONAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Publicações Realizadas */}
        <div className={`${glass} p-5 flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className={label}>Publicações Realizadas</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">
              {metrics.published}
            </span>
            <span className="text-gray-400 text-sm font-roboto font-bold">/ {metrics.totalPieces} planejadas</span>
          </div>
          <div className="mt-3 text-[11px] text-gray-500">
            {metrics.totalPieces > 0 ? (
              <span>
                {Math.round((metrics.published / metrics.totalPieces) * 100)}% de execução do calendário
              </span>
            ) : (
              <span>Nenhum post agendado</span>
            )}
          </div>
        </div>

        {/* 2. Taxa de Aprovação no Prazo */}
        <div className={`${glass} p-5 flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className={label}>Aprovações no Prazo</span>
            <TrendingUp size={16} className="text-[var(--color-atelier-terracota)]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">
              {metrics.onTimeRate}%
            </span>
          </div>
          <p className="mt-3 text-[11px] text-gray-500">
            SLA de {APPROVAL_SLA_BUSINESS_DAYS} dias úteis após notificação
          </p>
        </div>

        {/* 3. Tempo Médio para Aprovar */}
        <div className={`${glass} p-5 flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className={label}>Tempo Médio Decisão</span>
            <Clock size={16} className="text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">
              {metrics.avgApprovalDays}
            </span>
            <span className="text-gray-400 text-sm font-roboto font-bold">dias úteis</span>
          </div>
          <p className="mt-3 text-[11px] text-gray-500">
            Esforço reduzido, decisões centralizadas
          </p>
        </div>

        {/* 4. Retrabalho e Rodadas de Ajuste */}
        <div className={`${glass} p-5 flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className={label}>Retrabalho Médio</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">
              {metrics.avgRevisions}
            </span>
            <span className="text-gray-400 text-sm font-roboto font-bold">ajustes / peça</span>
          </div>
          <p className="mt-3 text-[11px] text-gray-500">
            Categorização de ajustes (informação, texto, visual)
          </p>
        </div>
      </div>

      {/* NOSSA LEITURA & PRÓXIMA DECISÃO (O CORAÇÃO DO RELATÓRIO MENSAL) */}
      <div className={`${glass} p-6 border-l-4 border-l-[var(--color-atelier-terracota)]`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb size={20} className="text-[var(--color-atelier-terracota)]" />
            <h3 className={sectionTitle}>Nossa Leitura & Decisão para o Próximo Ciclo</h3>
          </div>
          <button
            onClick={saveLearningsAndDecisions}
            disabled={savingNotes}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-atelier-terracota)] text-white text-xs font-bold shadow-md hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
          >
            {savingNotes ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar Síntese
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className={`${label} text-[var(--color-atelier-grafite)]/70 flex items-center gap-1`}>
              <Lightbulb size={12} className="text-[var(--color-atelier-terracota)]" />
              Nossa Leitura (O que os sinais do mês nos ensinam)
            </label>
            <textarea
              value={learnings}
              onChange={(e) => setLearnings(e.target.value)}
              rows={4}
              placeholder="Ex: Os conteúdos educativos geraram 24% mais compartilhamentos. Identificamos que a abordagem técnica aproximou o público qualificado..."
              className="w-full text-xs font-roboto bg-white/80 border border-gray-200 rounded-2xl p-3.5 focus:border-[var(--color-atelier-terracota)] focus:outline-none resize-none leading-relaxed text-[var(--color-atelier-grafite)]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={`${label} text-[var(--color-atelier-grafite)]/70 flex items-center gap-1`}>
              <ArrowRight size={12} className="text-[var(--color-atelier-terracota)]" />
              Próxima Decisão (Ajustes de rota para o próximo ciclo)
            </label>
            <textarea
              value={nextDecision}
              onChange={(e) => setNextDecision(e.target.value)}
              rows={4}
              placeholder="Ex: Manter o formato com melhor distribuição, testar outro ângulo e acompanhar os cliques e contatos de WhatsApp associados..."
              className="w-full text-xs font-roboto bg-white/80 border border-gray-200 rounded-2xl p-3.5 focus:border-[var(--color-atelier-terracota)] focus:outline-none resize-none leading-relaxed text-[var(--color-atelier-grafite)]"
            />
          </div>
        </div>
      </div>

      {/* MÉTRICAS POR PILAR EDITORIAL */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className={sectionTitle}>Métricas por Pilar Editorial</h3>
          <span className={`${label} text-gray-400`}>
            {objectiveKindConfig ? `Foco Atual: ${objectiveKindConfig.label}` : 'Pilares Equilibrados'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((pillar) => {
            const weight = cycle.pillars?.[pillar.id] || 25;
            const relevantMetrics = objectiveKindConfig?.metrics || [
              { key: 'engagement', label: 'Engajamento' },
              { key: 'saves', label: 'Salvamentos' },
              { key: 'shares', label: 'Compartilhamentos' }
            ];

            return (
              <div
                key={pillar.id}
                className={`${glass} p-5 border-t-4`}
                style={{ borderTopColor: pillar.color }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-sm text-[var(--color-atelier-grafite)]">
                    {pillar.label}
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: pillar.color + '20', color: pillar.color }}
                  >
                    {weight}% do mix
                  </span>
                </div>

                <div className="space-y-2 mt-4">
                  {relevantMetrics.map((m) => (
                    <div key={m.key} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                      <span className="text-gray-500">{m.label}</span>
                      <span className="font-bold text-[var(--color-atelier-grafite)]">
                        {cycle.results?.[m.key] ? cycle.results[m.key] : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LINHA DE PREVISIBILIDADE E HISTÓRICO DE CICLOS */}
      {allCycles.length > 1 && (
        <div className={`${glass} p-6`}>
          <h3 className={`${sectionTitle} mb-4`}>Histórico dos Ciclos Anteriores</h3>
          <div className="divide-y divide-gray-100">
            {allCycles.map((c: any) => (
              <div
                key={c.id}
                onClick={() => handleCycleChange(c.id)}
                className={`py-3.5 px-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer rounded-xl transition-colors ${
                  c.id === (selectedCycleId || cycle.id) ? 'bg-[var(--color-atelier-terracota)]/5' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-xs text-[var(--color-atelier-grafite)]">
                    #{c.cycle_number}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-[var(--color-atelier-grafite)]">
                      {c.objective || "Sem objetivo explicitado"}
                    </span>
                    <p className="text-[10px] text-gray-400">
                      {new Date(c.period_start).toLocaleDateString("pt-BR")} — {new Date(c.period_end).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {c.learnings && (
                    <span className="text-[11px] text-gray-500 italic max-w-xs truncate">
                      "{c.learnings}"
                    </span>
                  )}
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    c.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {c.status === 'open' ? 'Vigente' : 'Fechado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
