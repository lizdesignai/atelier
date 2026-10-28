// src/app/admin/financeiro/components/SettlementModal.tsx
"use client";

import { useState } from "react";
import { X, CheckCircle2, AlertCircle, DollarSign, Calendar, Landmark, CreditCard, Link as LinkIcon } from "lucide-react";
import type { FinEntry, FinBankAccount } from "@/types/finance";

interface SettlementModalProps {
  entry: FinEntry | null;
  bankAccounts: FinBankAccount[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SettlementModal({
  entry,
  bankAccounts,
  isOpen,
  onClose,
  onSuccess,
}: SettlementModalProps) {
  if (!isOpen || !entry) return null;

  const remainingAmount = Math.max(
    0,
    Number((Number(entry.amount) - Number(entry.amount_paid || 0)).toFixed(2))
  );

  const [amount, setAmount] = useState(remainingAmount.toString());
  const [paymentDate, setPaymentDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [bankAccountId, setBankAccountId] = useState(
    entry.bank_account_id || bankAccounts.find((b) => b.is_default)?.id || ""
  );
  const [paymentMethod, setPaymentMethod] = useState(entry.payment_method || "pix");
  const [feeAmount, setFeeAmount] = useState("0");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage("Informe um valor válido e positivo para a baixa.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/finance/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_id: entry.id,
          bank_account_id: bankAccountId || null,
          payment_date: paymentDate,
          amount: numAmount,
          fee_amount: Number(feeAmount) || 0,
          payment_method: paymentMethod,
          receipt_url: receiptUrl.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao registrar liquidação.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-emerald-50/40">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">
              {entry.kind === "revenue" ? "Recebimento / Baixa" : "Pagamento / Baixa"}
            </span>
            <h2 className="text-lg font-semibold text-[var(--color-veronna-navy)]">
              Registrar Liquidação
            </h2>
            <p className="text-xs text-gray-500 truncate max-w-sm">{entry.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200/60 text-gray-400 hover:text-gray-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* CARD RESUMO DO VALOR */}
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold">
                Saldo em Aberto
              </span>
              <div className="text-lg font-bold text-[var(--color-veronna-navy)]">
                R$ {remainingAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAmount(remainingAmount.toString())}
              className="text-xs font-bold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200 px-3 py-1.5 rounded-xl transition"
            >
              Quitar Total
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* VALOR DA BAIXA */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <DollarSign size={14} className="text-gray-400" /> Valor Liquidado (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* DATA DO PAGAMENTO */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" /> Data do Pagamento
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* CONTA BANCÁRIA */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Landmark size={14} className="text-gray-400" /> Conta / Destino
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
              >
                <option value="">Selecione uma conta...</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.bank_name || "Banco"})
                  </option>
                ))}
              </select>
            </div>

            {/* FORMA DE PAGAMENTO */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <CreditCard size={14} className="text-gray-400" /> Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
              >
                <option value="pix">PIX</option>
                <option value="boleto">Boleto Bancário</option>
                <option value="cartao">Cartão de Crédito</option>
                <option value="transferencia">Transferência (TED/DOC)</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </div>
          </div>

          {/* COMPROVANTE URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <LinkIcon size={14} className="text-gray-400" /> Link do Comprovante / Recibo
            </label>
            <input
              type="url"
              placeholder="https://storage... ou link do drive"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* OBSERVAÇÕES */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">Observações da Baixa</label>
            <input
              type="text"
              placeholder="Ex: Pago via chave PIX CNPJ."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* BOTÕES */}
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
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md transition disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              {isSubmitting ? "Registrando..." : "Confirmar Baixa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
