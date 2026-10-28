// src/app/admin/financeiro/avulsos/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlusCircle,
  Upload,
  DollarSign,
  Calendar,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
} from "lucide-react";
import type { FinEntry, FinAccount, FinSupplier } from "@/types/finance";

export default function GastosEServicosAvulsosPage() {
  const [accounts, setAccounts] = useState<FinAccount[]>([]);
  const [suppliers, setSuppliers] = useState<FinSupplier[]>([]);
  const [adhocEntries, setAdhocEntries] = useState<FinEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [kind, setKind] = useState<"revenue" | "expense">("expense");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState("");
  const [competenceDate, setCompetenceDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [receiptUrl, setReceiptUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchAuxData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accRes, entriesRes] = await Promise.all([
        fetch("/api/finance/accounts"),
        fetch("/api/finance/entries?source=adhoc&limit=30"),
      ]);

      if (accRes.ok) {
        const data = await accRes.json();
        setAccounts(data.accounts || []);
        setSuppliers(data.suppliers || []);
      }
      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setAdhocEntries(data.entries || []);
      }
    } catch (err) {
      console.error("[AvulsosPage] Erro:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuxData();
  }, [fetchAuxData]);

  const filteredAccounts = accounts.filter((a) =>
    kind === "revenue" ? a.type === "revenue" : a.type === "expense" || a.type === "cogs"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setFeedback({ type: "error", text: "Informe um valor positivo." });
      return;
    }

    if (!accountId) {
      setFeedback({ type: "error", text: "Selecione uma conta contábil." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/finance/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          source: "adhoc",
          title: title.trim(),
          description: description.trim() || null,
          account_id: accountId,
          supplier_id: supplierId || null,
          competence_date: competenceDate,
          due_date: dueDate,
          amount: numAmount,
          notes: receiptUrl ? `Comprovante: ${receiptUrl}` : null,
          tags: ["avulso"],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao cadastrar lançamento avulso.");
      }

      setFeedback({
        type: "success",
        text: `Lançamento avulso registrado com sucesso no plano de contas!`,
      });

      // Limpa formulário
      setTitle("");
      setDescription("");
      setAmount("");
      setReceiptUrl("");
      fetchAuxData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Erro inesperado." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full animate-fade-in">
      {/* FORMULÁRIO DE CADASTRO DE GASTOS / SERVIÇOS AVULSOS */}
      <div className="lg:col-span-6 glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-veronna-bordo)]">
            Entradas e Saídas Extras
          </span>
          <h2 className="text-lg font-bold text-[var(--color-veronna-navy)]">
            Lançar Gasto ou Serviço Avulso
          </h2>
          <p className="text-xs text-gray-500">
            Cadastre compras de ferramentas, contratações de freelancers pontuais ou serviços extras faturados para clientes.
          </p>
        </div>

        {feedback && (
          <div
            className={`flex items-start gap-2 p-3 text-xs rounded-xl border ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          {/* TIPO */}
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
              Gasto / Despesa Avulsa
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
              Serviço Avulso / Extra Faturado
            </button>
          </div>

          {/* TÍTULO */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">Título do Lançamento *</label>
            <input
              type="text"
              required
              placeholder={
                kind === "expense"
                  ? "Ex: Licença Midjourney / Freelancer Animação 3D"
                  : "Ex: Consultoria Extra de Rebranding / Ajustes fora do escopo"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CONTA CONTÁBIL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Tag size={14} className="text-gray-400" /> Conta / Classificação *
              </label>
              <select
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
              >
                <option value="">Selecione...</option>
                {filteredAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* FORNECEDOR */}
            {kind === "expense" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <User size={14} className="text-gray-400" /> Fornecedor / Prestador
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
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
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
              />
            </div>

            {/* COMPETÊNCIA */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" /> Mês de Competência
              </label>
              <input
                type="date"
                required
                value={competenceDate}
                onChange={(e) => setCompetenceDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
              />
            </div>

            {/* VENCIMENTO */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" /> Vencimento
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
              />
            </div>
          </div>

          {/* COMPROVANTE URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Upload size={14} className="text-gray-400" /> Link de Comprovante ou Recibo (Opcional)
            </label>
            <input
              type="url"
              placeholder="https://... link da nota ou recibo"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 py-3 px-5 text-xs font-bold text-white bg-[var(--color-veronna-navy)] hover:bg-[var(--color-veronna-navy)]/90 rounded-2xl shadow-md transition disabled:opacity-50"
          >
            {isSubmitting ? "Cadastrando..." : "Confirmar Lançamento Avulso"}
          </button>
        </form>
      </div>

      {/* LISTAGEM DOS ÚLTIMOS LANÇAMENTOS AVULSOS */}
      <div className="lg:col-span-6 glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
            Histórico Recente
          </span>
          <h3 className="text-base font-bold text-[var(--color-veronna-navy)]">
            Lançamentos Avulsos Registrados
          </h3>
          <p className="text-xs text-gray-500">Últimos gastos e serviços avulsos cadastrados.</p>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-xs text-gray-400">Carregando histórico...</div>
        ) : adhocEntries.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400">
            Nenhum lançamento avulso registrado ainda.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[500px]">
            {adhocEntries.map((e) => (
              <div
                key={e.id}
                className="flex justify-between items-center p-3.5 rounded-2xl bg-white/70 border border-gray-100"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        e.kind === "revenue"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {e.kind === "revenue" ? "Receita Extra" : "Gasto Avulso"}
                    </span>
                    <span className="text-xs font-semibold text-gray-800">{e.title}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    Venc: {e.due_date ? e.due_date.split("T")[0] : "-"} | {e.account?.name || "Avulso"}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-gray-900">
                    {formatBRL(Number(e.amount))}
                  </div>
                  <span
                    className={`text-[10px] font-semibold ${
                      e.status === "paid" ? "text-emerald-700" : "text-amber-600"
                    }`}
                  >
                    {e.status === "paid" ? "Liquidado" : "Pendente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
