// src/app/admin/financeiro/lancamentos/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Download,
  Receipt,
  AlertCircle,
  Calendar,
} from "lucide-react";
import type { FinEntry, FinAccount, FinBankAccount, FinSupplier, FinClientSummary } from "@/types/finance";
import { NewEntryModal } from "../components/NewEntryModal";
import { EditEntryModal } from "../components/EditEntryModal";
import { SettlementModal } from "../components/SettlementModal";

export default function LancamentosPage() {
  const [entries, setEntries] = useState<FinEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [accounts, setAccounts] = useState<FinAccount[]>([]);
  const [bankAccounts, setBankAccounts] = useState<FinBankAccount[]>([]);
  const [suppliers, setSuppliers] = useState<FinSupplier[]>([]);
  const [clients, setClients] = useState<FinClientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [competenceMonth, setCompetenceMonth] = useState<string>("");

  // Modais
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [selectedEntryForEdit, setSelectedEntryForEdit] = useState<FinEntry | null>(null);
  const [selectedEntryForSettlement, setSelectedEntryForSettlement] = useState<FinEntry | null>(null);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (kindFilter) params.set("kind", kindFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (competenceMonth) params.set("competence_month", competenceMonth);
      params.set("limit", "100");

      const res = await fetch(`/api/finance/entries?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("[LancamentosPage] Erro ao buscar lançamentos:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, kindFilter, statusFilter, competenceMonth]);

  const fetchAuxData = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        setBankAccounts(data.bank_accounts || []);
        setSuppliers(data.suppliers || []);
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error("[LancamentosPage] Erro ao buscar contas auxiliares:", err);
    }
  }, []);

  useEffect(() => {
    fetchAuxData();
  }, [fetchAuxData]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchEntries();
    }, 250);
    return () => clearTimeout(handler);
  }, [fetchEntries]);

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* BARRA SUPERIOR DE FILTROS E AÇÕES */}
      <div className="p-4 rounded-2xl bg-white/45 border border-white/70 shadow-2xs backdrop-blur-xs flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-base font-bold text-[var(--color-veronna-navy)]">
              Extrato Geral de Lançamentos
            </h2>
            <p className="text-[11px] text-gray-500">
              Total de {total} lançamento(s) registrados no plano de contas.
            </p>
          </div>

          <button
            onClick={() => setIsNewEntryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-veronna-navy)] hover:bg-[var(--color-veronna-navy)]/90 text-white text-xs font-medium transition shadow-2xs"
          >
            <Plus size={13} strokeWidth={2} /> Novo Lançamento
          </button>
        </div>

        {/* INPUTS DE FILTROS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
          {/* BUSCA TEXTUAL */}
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar título, cliente ou fornecedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
            />
          </div>

          {/* TIPO */}
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
          >
            <option value="">Todos os Tipos (Receitas e Despesas)</option>
            <option value="revenue">Apenas Receitas (Entradas)</option>
            <option value="expense">Apenas Despesas (Saídas)</option>
          </select>

          {/* STATUS */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
          >
            <option value="">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="partially_paid">Parcialmente Pago</option>
            <option value="paid">Liquidado / Pago</option>
            <option value="cancelled">Cancelado</option>
          </select>

          {/* COMPETÊNCIA */}
          <input
            type="month"
            value={competenceMonth}
            onChange={(e) => setCompetenceMonth(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
          />
        </div>
      </div>

      {/* TABELA DE LANÇAMENTOS */}
      <div className="glass-panel rounded-3xl bg-white/50 border border-white/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-gray-400">
            Carregando lançamentos do banco...
          </div>
        ) : entries.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-400">
            Nenhum lançamento encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4">Competência</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Título / Contraparte</th>
                  <th className="py-3 px-4">Categoria Contábil</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Valor Total</th>
                  <th className="py-3 px-4">Valor Pago</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/80 transition group">
                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-500 font-medium">
                      {entry.competence_date ? entry.competence_date.split("T")[0].substring(0, 7) : "-"}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-gray-700">
                      {entry.due_date ? entry.due_date.split("T")[0] : "-"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{entry.title}</div>
                      <div className="text-[10px] text-gray-400">
                        {entry.client?.nome || entry.supplier?.name || "Avulso / Direto"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-gray-600">
                      {entry.account?.name || "Sem categoria"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          entry.kind === "revenue"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {entry.kind === "revenue" ? "Receita" : "Despesa"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {formatBRL(Number(entry.amount))}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-600">
                      {formatBRL(Number(entry.amount_paid || 0))}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                          entry.status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : entry.status === "partially_paid"
                            ? "bg-blue-100 text-blue-800"
                            : entry.status === "cancelled"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {entry.status === "paid"
                          ? "Liquidado"
                          : entry.status === "partially_paid"
                          ? "Parcial"
                          : entry.status === "cancelled"
                          ? "Cancelado"
                          : "Pendente"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {entry.status !== "paid" && entry.status !== "cancelled" && (
                          <button
                            onClick={() => setSelectedEntryForSettlement(entry)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                          >
                            Dar Baixa
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedEntryForEdit(entry)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-gray-600 bg-gray-100/70 hover:bg-gray-200/80 rounded-lg transition"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE NOVO LANÇAMENTO */}
      <NewEntryModal
        isOpen={isNewEntryOpen}
        accounts={accounts}
        suppliers={suppliers}
        clients={clients}
        onClose={() => setIsNewEntryOpen(false)}
        onSuccess={fetchEntries}
      />

      {/* MODAL DE EDIÇÃO COM JUSTIFICATIVA OBRIGATÓRIA */}
      <EditEntryModal
        isOpen={Boolean(selectedEntryForEdit)}
        entry={selectedEntryForEdit}
        onClose={() => setSelectedEntryForEdit(null)}
        onSuccess={fetchEntries}
      />

      {/* MODAL DE LIQUIDAÇÃO */}
      <SettlementModal
        isOpen={Boolean(selectedEntryForSettlement)}
        entry={selectedEntryForSettlement}
        bankAccounts={bankAccounts}
        onClose={() => setSelectedEntryForSettlement(null)}
        onSuccess={fetchEntries}
      />
    </div>
  );
}
