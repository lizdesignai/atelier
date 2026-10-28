// src/app/admin/financeiro/fechamento/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Calendar,
  FileCheck,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import type { FinPeriod } from "@/types/finance";

export default function FechamentoContabilPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [periods, setPeriods] = useState<FinPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchPeriods = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/finance/periods");
      if (res.ok) {
        const data = await res.json();
        setPeriods(data.periods || []);
      }
    } catch (err) {
      console.error("[FechamentoPage] Erro ao carregar períodos:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const currentPeriod = periods.find((p) => p.closing_month === selectedMonth);
  const isClosed = currentPeriod?.status === "closed";

  const handleClosePeriod = async () => {
    if (
      !confirm(
        `Tem certeza que deseja consolidar e fechar o mês contábil ${selectedMonth}? Todas as alterações retroativas de valores e datas serão bloqueadas.`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    setActionFeedback(null);
    try {
      const res = await fetch("/api/finance/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closing_month: selectedMonth,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao consolidar mês.");
      }

      setActionFeedback({
        type: "success",
        text: `Mês contábil ${selectedMonth} consolidado com sucesso! Snapshot imutável gerado.`,
      });
      setNotes("");
      fetchPeriods();
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err.message || "Erro inesperado." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReopenPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason || reopenReason.trim().length < 10) {
      alert("A reabertura de período consolidado exige justificativa com no mínimo 10 caracteres.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/finance/periods/${selectedMonth}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reopenReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao reabrir período.");
      }

      setIsReopenModalOpen(false);
      setReopenReason("");
      setActionFeedback({
        type: "success",
        text: `Período ${selectedMonth} reaberto com sucesso. Auditoria registrada.`,
      });
      fetchPeriods();
    } catch (err: any) {
      alert(err.message || "Erro ao reabrir período.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* SELETOR DE MÊS E STATUS */}
      <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-veronna-bordo)]">
            Controladoria & Fechamento Contábil
          </span>
          <h2 className="text-xl font-bold text-[var(--color-veronna-navy)]">
            Consolidação Mensal
          </h2>
          <p className="text-xs text-gray-500">
            Fechamento de competência com snapshot imutável de DRE e trava de integridade financeira.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-gray-200">
            <Calendar size={15} className="text-gray-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold text-[var(--color-veronna-navy)] focus:outline-none bg-transparent"
            />
          </div>

          <div
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold ${
              isClosed
                ? "bg-purple-100 text-purple-800 border border-purple-200"
                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
            }`}
          >
            {isClosed ? <Lock size={13} /> : <Unlock size={13} />}
            {isClosed ? "Mês Fechado / Travado" : "Mês em Aberto"}
          </div>
        </div>
      </div>

      {actionFeedback && (
        <div
          className={`flex items-start gap-2 p-4 text-xs rounded-2xl border ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {actionFeedback.type === "success" ? (
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
          )}
          <span>{actionFeedback.text}</span>
        </div>
      )}

      {/* DASHBOARD DA COMPETÊNCIA SELECIONADA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RECEITA */}
        <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Receita Bruta da Competência
          </span>
          <div className="text-2xl font-bold text-emerald-700 mt-2">
            {formatBRL(Number(currentPeriod?.total_revenue || 0))}
          </div>
          <span className="text-[11px] text-gray-500 mt-1">Total faturado no mês</span>
        </div>

        {/* DESPESAS */}
        <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-800">
            Despesas & Custos Totais
          </span>
          <div className="text-2xl font-bold text-red-700 mt-2">
            {formatBRL(Number(currentPeriod?.total_expenses || 0))}
          </div>
          <span className="text-[11px] text-gray-500 mt-1">Custos diretos + OPEX + impostos</span>
        </div>

        {/* RESULTADO LÍQUIDO */}
        <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
            Resultado Contábil Líquido
          </span>
          <div
            className={`text-2xl font-bold mt-2 ${
              Number(currentPeriod?.net_result || 0) >= 0 ? "text-blue-900" : "text-red-700"
            }`}
          >
            {formatBRL(Number(currentPeriod?.net_result || 0))}
          </div>
          <span className="text-[11px] text-gray-500 mt-1">Lucro líquido contábil</span>
        </div>

        {/* EBITDA & MARGEM */}
        <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-veronna-bordo)]">
            EBITDA & Margem Operacional
          </span>
          <div className="text-2xl font-bold text-[var(--color-veronna-navy)] mt-2">
            {formatBRL(Number(currentPeriod?.ebitda || 0))}
          </div>
          <span className="text-[11px] font-semibold text-purple-800 mt-1">
            Margem: {Number(currentPeriod?.ebitda_margin || 0).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* AÇÕES DE CONSOLIDAÇÃO OU REABERTURA */}
      <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col gap-4">
        <h3 className="text-sm font-bold text-[var(--color-veronna-navy)]">
          Controle da Competência {selectedMonth}
        </h3>

        {!isClosed ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-600 leading-relaxed">
              Ao fechar o período contábil, todos os dados de receitas, despesas e impostos do mês serão consolidados em um snapshot oficial imutável. Qualquer tentativa de alteração retroativa de valores ou datas nessa competência será imediatamente bloqueada pelo sistema.
            </p>

            <div className="flex flex-col gap-1.5 max-w-xl">
              <label className="text-xs font-semibold text-gray-700">
                Notas do Fechamento / Parecer da Contadora (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Conciliação bancária 100% conferida; DAS apurado no valor de R$ ..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
              />
            </div>

            <div>
              <button
                onClick={handleClosePeriod}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--color-veronna-navy)] text-white text-xs font-bold shadow-md hover:bg-[var(--color-veronna-navy)]/90 transition disabled:opacity-50"
              >
                <Lock size={15} />
                {isProcessing ? "Consolidando..." : `Fechar e Consolidar Mês ${selectedMonth}`}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-purple-900 bg-purple-50 p-3.5 rounded-2xl border border-purple-200">
              <FileCheck size={18} className="shrink-0 text-purple-700" />
              <div>
                <strong>Competência Consolidada:</strong> Este mês foi fechado em{" "}
                {currentPeriod?.closed_at
                  ? new Date(currentPeriod.closed_at).toLocaleDateString("pt-BR")
                  : "-"}{" "}
                e está protegido contra alterações retroativas.
              </div>
            </div>

            <div>
              <button
                onClick={() => setIsReopenModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition"
              >
                <Unlock size={14} /> Solicitar Reabertura do Mês (Admin)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* HISTÓRICO DE FECHAMENTOS */}
      <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col gap-4">
        <h3 className="text-sm font-bold text-[var(--color-veronna-navy)]">
          Histórico de Competências Fechadas
        </h3>

        {periods.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            Nenhuma competência fechada até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-3">Competência</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Receita Bruta</th>
                  <th className="py-3 px-3">Despesas</th>
                  <th className="py-3 px-3">Resultado Líquido</th>
                  <th className="py-3 px-3">EBITDA</th>
                  <th className="py-3 px-3">Fechado Em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {periods.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedMonth(p.closing_month)}
                    className="hover:bg-white/80 cursor-pointer transition"
                  >
                    <td className="py-3 px-3 font-bold text-gray-900">{p.closing_month}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.status === "closed"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {p.status === "closed" ? "Fechado" : "Aberto"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-900">
                      {formatBRL(Number(p.total_revenue || 0))}
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-700">
                      {formatBRL(Number(p.total_expenses || 0))}
                    </td>
                    <td className="py-3 px-3 font-bold text-blue-900">
                      {formatBRL(Number(p.net_result || 0))}
                    </td>
                    <td className="py-3 px-3 font-bold text-purple-900">
                      {formatBRL(Number(p.ebitda || 0))}
                    </td>
                    <td className="py-3 px-3 text-gray-500">
                      {p.closed_at ? new Date(p.closed_at).toLocaleDateString("pt-BR") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE REABERTURA COM JUSTIFICATIVA FORMAL */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-red-50/50">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-red-700">
                  Ação Crítica de Administrador
                </span>
                <h2 className="text-base font-semibold text-red-900">
                  Reabrir Mês {selectedMonth}
                </h2>
              </div>
              <button
                onClick={() => setIsReopenModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200/60 text-gray-400 hover:text-gray-700 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReopenPeriod} className="p-6 flex flex-col gap-4">
              <p className="text-xs text-gray-600">
                A reabertura de um período consolidado cancela temporariamente a trava de alterações para permitir lançamentos ou correções da contabilidade. Esta ação é auditada e registrada permanentemente no banco de dados.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-800">
                  Justificativa Formal Obrigatória (Mínimo 10 caracteres) *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Necessidade de retificação na nota fiscal emitida nº ..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              <div className="flex justify-end items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isProcessing ? "Reabrindo..." : "Confirmar Reabertura"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
