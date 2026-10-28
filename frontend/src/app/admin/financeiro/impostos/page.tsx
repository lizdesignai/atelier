// src/app/admin/financeiro/impostos/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  FileText,
  Upload,
} from "lucide-react";
import type { FinTaxObligation } from "@/types/finance";

export default function ImpostosPage() {
  const [obligations, setObligations] = useState<FinTaxObligation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedToPay, setSelectedToPay] = useState<FinTaxObligation | null>(null);

  // Form State Novo Tributo
  const [taxType, setTaxType] = useState("DAS - Simples Nacional");
  const [competence, setCompetence] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-20`;
  });
  const [amount, setAmount] = useState("");
  const [guideUrl, setGuideUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Baixa de Tributo
  const [payReceiptUrl, setPayReceiptUrl] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const fetchTaxes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/finance/taxes");
      if (res.ok) {
        const data = await res.json();
        setObligations(data.obligations || []);
      }
    } catch (err) {
      console.error("[ImpostosPage] Erro:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage("Informe um valor válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/finance/taxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tax_type: taxType,
          competence,
          due_date: dueDate,
          amount: numAmount,
          guide_url: guideUrl.trim() || null,
          notes: notes.trim() || null,
          status: "pending",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao cadastrar obrigação tributária.");
      }

      setIsNewModalOpen(false);
      setAmount("");
      setGuideUrl("");
      setNotes("");
      fetchTaxes();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToPay) return;

    setIsPaying(true);
    try {
      const res = await fetch(`/api/finance/taxes/${selectedToPay.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "paid",
          paid_at: new Date().toISOString().split("T")[0],
          receipt_url: payReceiptUrl.trim() || null,
          reason: "Confirmação de pagamento da guia com comprovante anexo",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao marcar como pago.");
      }

      setSelectedToPay(null);
      setPayReceiptUrl("");
      fetchTaxes();
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar pagamento do imposto.");
    } finally {
      setIsPaying(false);
    }
  };

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalPendingTaxes = obligations
    .filter((o) => o.status !== "paid")
    .reduce((acc, o) => acc + Number(o.amount || 0), 0);

  const totalPaidTaxes = obligations
    .filter((o) => o.status === "paid")
    .reduce((acc, o) => acc + Number(o.amount || 0), 0);

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* HEADER DE TRIBUTOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
            Impostos Pendentes a Pagar
          </span>
          <div className="text-2xl font-bold text-amber-700 mt-2">
            {formatBRL(totalPendingTaxes)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1">Guias DAS e ISS em aberto</span>
        </div>

        <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            Tributos Pagos e Regularizados
          </span>
          <div className="text-2xl font-bold text-emerald-700 mt-2">
            {formatBRL(totalPaidTaxes)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1">Guias quitadas com comprovante</span>
        </div>

        <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Controle Fiscal
            </span>
            <div className="text-sm font-bold text-[var(--color-veronna-navy)] mt-1">
              Nova Guia de Imposto
            </div>
            <p className="text-[11px] text-gray-500">Cadastrar DAS ou tributo municipal</p>
          </div>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[var(--color-veronna-navy)] text-white text-xs font-bold shadow-md hover:bg-[var(--color-veronna-navy)]/90 transition"
          >
            <Plus size={15} /> Adicionar Guia
          </button>
        </div>
      </div>

      {/* TABELA DE OBRIGAÇÕES */}
      <div className="glass-panel rounded-3xl bg-white/50 border border-white/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-gray-400">Carregando calendário fiscal...</div>
        ) : obligations.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-400">
            Nenhuma obrigação tributária cadastrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4">Tributo / Obrigação</th>
                  <th className="py-3 px-4">Competência</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Valor da Guia</th>
                  <th className="py-3 px-4">Guia Anexa</th>
                  <th className="py-3 px-4">Comprovante</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {obligations.map((ob) => (
                  <tr key={ob.id} className="hover:bg-white/80 transition group">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{ob.tax_type}</div>
                      <div className="text-[10px] text-gray-400">{ob.notes || "Obrigação regular"}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-gray-700">
                      {ob.competence}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      {ob.due_date ? ob.due_date.split("T")[0] : "-"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {formatBRL(Number(ob.amount))}
                    </td>
                    <td className="py-3.5 px-4">
                      {ob.guide_url ? (
                        <a
                          href={ob.guide_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          Guia PDF <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-gray-400 text-[11px]">Sem guia anexada</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {ob.receipt_url ? (
                        <a
                          href={ob.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          Comprovante <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-gray-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          ob.status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : ob.status === "overdue"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {ob.status === "paid"
                          ? "Pago"
                          : ob.status === "overdue"
                          ? "Vencido"
                          : "Pendente"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {ob.status !== "paid" && (
                        <button
                          onClick={() => setSelectedToPay(ob)}
                          className="px-3 py-1.5 text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl shadow-sm transition"
                        >
                          Registrar Pagamento
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL NOVO TRIBUTO */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-veronna-bordo)]">
                  Guia Tributária
                </span>
                <h2 className="text-lg font-semibold text-[var(--color-veronna-navy)]">
                  Nova Obrigação Fiscal
                </h2>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200/60 text-gray-400 hover:text-gray-700 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTax} className="p-6 flex flex-col gap-4">
              {errorMessage && (
                <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">Tributo / Tipo de Guia</label>
                <select
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
                >
                  <option value="DAS - Simples Nacional">DAS - Simples Nacional</option>
                  <option value="ISSQN - Tributação Municipal">ISSQN - Imposto Sobre Serviços</option>
                  <option value="IRRF - Retenção de Rendimentos">IRRF - Retenção Fonte</option>
                  <option value="INSS - Previdência Social">INSS - Guia GPS</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Competência (Mês/Ano)</label>
                  <input
                    type="month"
                    required
                    value={competence}
                    onChange={(e) => setCompetence(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">Valor da Guia (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">Link da Guia PDF para Pagamento</label>
                <input
                  type="url"
                  placeholder="https://... link da guia do DAS gerada no PGDAS-D"
                  value={guideUrl}
                  onChange={(e) => setGuideUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
                />
              </div>

              <div className="flex justify-end items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[var(--color-veronna-navy)] hover:bg-[var(--color-veronna-navy)]/90 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? "Salvando..." : "Salvar Guia Tributária"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR PAGAMENTO DE TRIBUTO */}
      {selectedToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-emerald-50/50">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                  Liquidação Tributária
                </span>
                <h2 className="text-base font-semibold text-[var(--color-veronna-navy)]">
                  Baixa de {selectedToPay.tax_type}
                </h2>
              </div>
              <button
                onClick={() => setSelectedToPay(null)}
                className="p-2 rounded-full hover:bg-gray-200/60 text-gray-400 hover:text-gray-700 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleMarkAsPaid} className="p-6 flex flex-col gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs flex justify-between items-center">
                <span className="text-gray-500">Valor Pago:</span>
                <span className="text-base font-bold text-gray-900">
                  {formatBRL(Number(selectedToPay.amount))}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Link do Comprovante Bancário de Pagamento (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://... comprovante de débito / pagamento da guia"
                  value={payReceiptUrl}
                  onChange={(e) => setPayReceiptUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex justify-end items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedToPay(null)}
                  disabled={isPaying}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isPaying ? "Processando..." : "Confirmar Pagamento do Imposto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
