// src/app/admin/financeiro/components/EditEntryModal.tsx
"use client";

import { useState } from "react";
import { X, Save, AlertCircle, Calendar, DollarSign, FileText } from "lucide-react";
import type { FinEntry } from "@/types/finance";

interface EditEntryModalProps {
  entry: FinEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditEntryModal({ entry, isOpen, onClose, onSuccess }: EditEntryModalProps) {
  if (!isOpen || !entry) return null;

  const [dueDate, setDueDate] = useState(
    entry.due_date ? entry.due_date.split("T")[0] : ""
  );
  const [paidDate, setPaidDate] = useState(
    entry.paid_date ? entry.paid_date.split("T")[0] : ""
  );
  const [amount, setAmount] = useState(entry.amount.toString());
  const [status, setStatus] = useState<FinEntry["status"]>(entry.status);
  const [notes, setNotes] = useState(entry.notes || "");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detecta se houve alteração crítica que exige justificativa
  const hasCriticalChange =
    Number(amount) !== Number(entry.amount) ||
    dueDate !== (entry.due_date ? entry.due_date.split("T")[0] : "") ||
    paidDate !== (entry.paid_date ? entry.paid_date.split("T")[0] : "") ||
    status !== entry.status;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (hasCriticalChange && (!reason || reason.trim().length < 5)) {
      setErrorMessage(
        "A alteração de valor, datas ou status exige justificativa formal (mínimo 5 caracteres) para o log de auditoria contábil."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/finance/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          due_date: dueDate || undefined,
          paid_date: paidDate || null,
          amount: Number(amount),
          status,
          notes: notes || null,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar alterações no lançamento.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado ao salvar alterações.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-veronna-bordo)]">
              Auditoria & Edição Contábil
            </span>
            <h2 className="text-lg font-semibold text-[var(--color-veronna-navy)]">
              Editar Lançamento
            </h2>
            <p className="text-xs text-gray-500 truncate max-w-sm">
              {entry.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200/60 text-gray-400 hover:text-gray-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* VALOR */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <DollarSign size={14} className="text-gray-400" /> Valor Total (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
              />
            </div>

            {/* STATUS */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FinEntry["status"])}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20 bg-white"
              >
                <option value="pending">Pendente</option>
                <option value="partially_paid">Parcialmente Pago</option>
                <option value="paid">Pago / Liquidado</option>
                <option value="cancelled">Cancelado</option>
                <option value="refunded">Estornado</option>
              </select>
            </div>

            {/* DATA DE VENCIMENTO */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" /> Data de Vencimento
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
              />
            </div>

            {/* DATA DE PAGAMENTO */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" /> Data de Pagamento
              </label>
              <input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
              />
            </div>
          </div>

          {/* OBSERVAÇÕES INTERNAS */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Observações do Lançamento
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais sobre o contrato ou despesa..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
            />
          </div>

          {/* JUSTIFICATIVA OBRIGATÓRIA DE AUDITORIA */}
          <div className="flex flex-col gap-1.5 bg-amber-50/60 p-3 rounded-2xl border border-amber-200/70">
            <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <FileText size={14} className="text-amber-700" />
              Justificativa Contábil Obrigatória {hasCriticalChange && "*"}
            </label>
            <p className="text-[11px] text-amber-800/80">
              Obrigatório para registrar no log imutável de auditoria caso valores, datas ou status sejam modificados.
            </p>
            <textarea
              rows={2}
              required={hasCriticalChange}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Prorrogação acordada em reunião comercial com o cliente."
              className="w-full px-3 py-2 text-xs rounded-xl border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex justify-end items-center gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[var(--color-veronna-navy)] hover:bg-[var(--color-veronna-navy)]/90 rounded-xl shadow-md transition disabled:opacity-50"
            >
              <Save size={14} />
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
