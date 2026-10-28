// src/app/admin/financeiro/components/NewEntryModal.tsx
"use client";

import { useState } from "react";
import { X, Plus, AlertCircle, DollarSign, Calendar, Tag } from "lucide-react";
import type { FinAccount, FinSupplier, FinClientSummary } from "@/types/finance";

interface NewEntryModalProps {
  accounts: FinAccount[];
  suppliers: FinSupplier[];
  clients?: FinClientSummary[];
  defaultKind?: "revenue" | "expense";
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewEntryModal({
  accounts,
  suppliers,
  clients = [],
  defaultKind = "expense",
  isOpen,
  onClose,
  onSuccess,
}: NewEntryModalProps) {
  if (!isOpen) return null;

  const [kind, setKind] = useState<"revenue" | "expense">(defaultKind);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState(() => {
    const acc = accounts.find((a) => (defaultKind === "revenue" ? a.type === "revenue" : a.type === "expense" || a.type === "cogs"));
    return acc ? acc.id : accounts[0]?.id || "";
  });
  const [supplierId, setSupplierId] = useState("");
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [competenceDate, setCompetenceDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [installments, setInstallments] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredAccounts = accounts.filter((a) =>
    kind === "revenue"
      ? a.type === "revenue"
      : a.type === "expense" || a.type === "cogs" || a.type === "tax"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage("Informe um valor válido e positivo.");
      return;
    }

    if (!accountId) {
      setErrorMessage("Selecione uma conta contábil.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/finance/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          source: "manual",
          title: title.trim(),
          description: description.trim() || null,
          account_id: accountId,
          supplier_id: kind === "expense" ? (supplierId || null) : null,
          client_id: kind === "revenue" ? (clientId || null) : null,
          competence_date: competenceDate,
          due_date: dueDate,
          amount: numAmount,
          payment_method: paymentMethod,
          installment_number: 1,
          installment_total: Number(installments),
          generate_installments: Number(installments) > 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao cadastrar lançamento.");
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
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-veronna-bordo)]">
              Novo Registro
            </span>
            <h2 className="text-lg font-semibold text-[var(--color-veronna-navy)]">
              {kind === "revenue" ? "Lançar Nova Receita" : "Lançar Nova Despesa"}
            </h2>
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

          {/* SELETOR RECEITA / DESPESA */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setKind("expense")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                kind === "expense"
                  ? "bg-white text-red-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Despesa / Saída
            </button>
            <button
              type="button"
              onClick={() => setKind("revenue")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                kind === "revenue"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Receita / Entrada
            </button>
          </div>

          {/* TÍTULO */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">Título / Descrição Curta *</label>
            <input
              type="text"
              required
              placeholder="Ex: Assinatura Figma / Prestador Ilustração"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CONTA CONTÁBIL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Tag size={14} className="text-gray-400" /> Categoria / Plano de Contas *
              </label>
              <select
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20 bg-white"
              >
                {filteredAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* FORNECEDOR (SE DESPESA) */}
            {kind === "expense" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">Fornecedor / Prestador</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20 bg-white"
                >
                  <option value="">Nenhum / Não informado</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* CLIENTE (SE RECEITA) */}
            {kind === "revenue" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">Cliente / Pagador</label>
                <select
                  value={clientId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setClientId(selectedId);
                    if (selectedId && clients.length > 0) {
                      const selectedClient = clients.find((c) => c.id === selectedId);
                      if (selectedClient) {
                        if (!title) {
                          const svc = selectedClient.active_project?.service_type || "Mensalidade";
                          setTitle(`${svc} — ${selectedClient.nome}`);
                        }
                        if (!amount && selectedClient.active_project?.financial_value) {
                          setAmount(String(selectedClient.active_project.financial_value));
                        }
                      }
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20 bg-white"
                >
                  <option value="">Cliente Avulso / Não Vinculado</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.empresa ? `(${c.empresa})` : ""} {c.active_project?.service_type ? `— [${c.active_project.service_type}]` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* VALOR */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <DollarSign size={14} className="text-gray-400" /> Valor (R$) *
              </label>
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

            {/* PARCELAMENTO */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700">Parcelamento</label>
              <select
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20 bg-white"
              >
                <option value={1}>À vista (1x)</option>
                <option value={2}>2 parcelas mensais</option>
                <option value={3}>3 parcelas mensais</option>
                <option value={6}>6 parcelas mensais</option>
                <option value={12}>12 parcelas mensais</option>
              </select>
            </div>

            {/* COMPETÊNCIA */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" /> Competência
              </label>
              <input
                type="date"
                required
                value={competenceDate}
                onChange={(e) => setCompetenceDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
              />
            </div>

            {/* VENCIMENTO */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" /> Vencimento 1ª Parcela
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
              />
            </div>
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
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[var(--color-veronna-navy)] hover:bg-[var(--color-veronna-navy)]/90 rounded-xl shadow-md transition disabled:opacity-50"
            >
              <Plus size={14} />
              {isSubmitting ? "Cadastrando..." : "Confirmar Lançamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
