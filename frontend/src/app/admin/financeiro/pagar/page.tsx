// src/app/admin/financeiro/pagar/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingDown,
  Search,
  Plus,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import type { FinEntry, FinBankAccount, FinAccount, FinSupplier } from "@/types/finance";
import { NewEntryModal } from "../components/NewEntryModal";
import { EditEntryModal } from "../components/EditEntryModal";
import { SettlementModal } from "../components/SettlementModal";

export default function ContasAPagarPage() {
  const [entries, setEntries] = useState<FinEntry[]>([]);
  const [bankAccounts, setBankAccounts] = useState<FinBankAccount[]>([]);
  const [accounts, setAccounts] = useState<FinAccount[]>([]);
  const [suppliers, setSuppliers] = useState<FinSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  // Modais
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<FinEntry | null>(null);
  const [selectedForSettlement, setSelectedForSettlement] = useState<FinEntry | null>(null);

  const fetchPayables = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("kind", "expense");
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      params.set("limit", "100");

      const res = await fetch(`/api/finance/entries?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error("[ContasAPagar] Erro ao carregar despesas:", err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  const fetchAuxData = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/accounts");
      if (res.ok) {
        const data = await res.json();
        setBankAccounts(data.bank_accounts || []);
        setAccounts(data.accounts || []);
        setSuppliers(data.suppliers || []);
      }
    } catch (err) {
      console.error("[ContasAPagar] Erro ao carregar contas:", err);
    }
  }, []);

  useEffect(() => {
    fetchAuxData();
  }, [fetchAuxData]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchPayables();
    }, 200);
    return () => clearTimeout(handler);
  }, [fetchPayables]);

  const totalPayable = entries.reduce(
    (acc, e) => acc + (Number(e.amount) - Number(e.amount_paid || 0)),
    0
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const overduePayables = entries.filter(
    (e) => e.status !== "paid" && e.status !== "cancelled" && e.due_date < todayStr
  );

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="flex flex-col gap-4 w-full animate-fade-in">
      {/* HEADER DA AGENDA A PAGAR COMPACTO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/45 border border-white/70 shadow-2xs backdrop-blur-xs flex flex-col justify-between hover:bg-white/60 transition">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
            Total a Pagar (Filtrado)
          </span>
          <div className="mt-1">
            <div className="text-lg md:text-xl font-bold tracking-tight text-rose-700">
              {formatBRL(totalPayable)}
            </div>
            <span className="text-[10px] text-gray-400">
              {entries.length} despesa(s) listada(s)
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/45 border border-white/70 shadow-2xs backdrop-blur-xs flex flex-col justify-between hover:bg-white/60 transition">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
            Contas Vencidas
          </span>
          <div className="mt-1">
            <div className="text-lg md:text-xl font-bold tracking-tight text-amber-600">
              {overduePayables.length}
            </div>
            <span className="text-[10px] text-gray-400">
              Requerem liquidação para evitar juros
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/45 border border-white/70 shadow-2xs backdrop-blur-xs flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Operações
            </span>
            <div className="text-xs font-semibold text-[var(--color-veronna-navy)]">
              Despesas & Prestadores
            </div>
          </div>
          <button
            onClick={() => setIsNewEntryOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--color-veronna-navy)] hover:bg-[var(--color-veronna-navy)]/90 text-white text-xs font-medium transition shadow-2xs"
          >
            <Plus size={13} strokeWidth={2} /> Nova Despesa
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="glass-panel p-4 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search size={14} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por fornecedor ou título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
          >
            <option value="pending">Apenas Pendentes</option>
            <option value="partially_paid">Parcialmente Pagos</option>
            <option value="paid">Liquidados / Pagos</option>
            <option value="">Todos os Status</option>
          </select>
        </div>
      </div>

      {/* TABELA DE CONTAS A PAGAR */}
      <div className="glass-panel rounded-3xl bg-white/50 border border-white/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-gray-400">Carregando contas a pagar...</div>
        ) : entries.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-400">Nenhuma despesa pendente encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Fornecedor / Beneficiário</th>
                  <th className="py-3 px-4">Título / Categoria</th>
                  <th className="py-3 px-4">Valor Total</th>
                  <th className="py-3 px-4">Valor Pago</th>
                  <th className="py-3 px-4">Saldo Devedor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((e) => {
                  const balance = Number(e.amount) - Number(e.amount_paid || 0);
                  const isLate = e.status !== "paid" && e.status !== "cancelled" && e.due_date < todayStr;

                  return (
                    <tr key={e.id} className="hover:bg-white/80 transition group">
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium">
                        <span className={isLate ? "text-red-600 font-bold" : "text-gray-700"}>
                          {e.due_date ? e.due_date.split("T")[0] : "-"}
                        </span>
                        {isLate && (
                          <span className="block text-[9px] text-red-500 font-semibold uppercase">
                            Vencido
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900">
                          {e.supplier?.name || "Fornecedor / Prestador"}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {e.supplier?.pix_key ? `PIX: ${e.supplier.pix_key}` : "Sem chave PIX cadastrada"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-800">{e.title}</div>
                        <div className="text-[10px] text-gray-400">{e.account?.name || "Despesa Operacional"}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">{formatBRL(Number(e.amount))}</td>
                      <td className="py-3.5 px-4 text-gray-600 font-semibold">
                        {formatBRL(Number(e.amount_paid || 0))}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-red-700">{formatBRL(balance)}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                            e.status === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : e.status === "partially_paid"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {e.status === "paid"
                            ? "Pago"
                            : e.status === "partially_paid"
                            ? "Parcial"
                            : "Pendente"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {e.status !== "paid" && (
                            <button
                              onClick={() => setSelectedForSettlement(e)}
                              className="px-3 py-1.5 text-xs font-bold bg-red-700 text-white hover:bg-red-800 rounded-xl shadow-sm transition"
                            >
                              Pagar
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedForEdit(e)}
                            className="px-2.5 py-1 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE BAIXA */}
      <SettlementModal
        isOpen={Boolean(selectedForSettlement)}
        entry={selectedForSettlement}
        bankAccounts={bankAccounts}
        onClose={() => setSelectedForSettlement(null)}
        onSuccess={fetchPayables}
      />

      {/* MODAL DE EDIÇÃO */}
      <EditEntryModal
        isOpen={Boolean(selectedForEdit)}
        entry={selectedForEdit}
        onClose={() => setSelectedForEdit(null)}
        onSuccess={fetchPayables}
      />

      {/* MODAL DE NOVO LANÇAMENTO */}
      <NewEntryModal
        isOpen={isNewEntryOpen}
        defaultKind="expense"
        accounts={accounts}
        suppliers={suppliers}
        onClose={() => setIsNewEntryOpen(false)}
        onSuccess={fetchPayables}
      />
    </div>
  );
}
