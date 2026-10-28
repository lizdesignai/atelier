// src/app/admin/financeiro/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  Landmark,
  FileSpreadsheet,
  Receipt,
  Calendar,
  Users,
  RotateCw,
  Loader2,
  Check,
} from "lucide-react";
import type { FinEntry, FinBankAccount, FinAccount, FinSupplier, FinClientSummary } from "@/types/finance";
import { NewEntryModal } from "./components/NewEntryModal";
import { SettlementModal } from "./components/SettlementModal";
import { EditEntryModal } from "./components/EditEntryModal";

export default function FinanceOverviewPage() {
  const [entries, setEntries] = useState<FinEntry[]>([]);
  const [bankAccounts, setBankAccounts] = useState<FinBankAccount[]>([]);
  const [accounts, setAccounts] = useState<FinAccount[]>([]);
  const [suppliers, setSuppliers] = useState<FinSupplier[]>([]);
  const [clients, setClients] = useState<FinClientSummary[]>([]);
  const [recurringContracts, setRecurringContracts] = useState<any[]>([]);
  const [totalMRR, setTotalMRR] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingRecurrence, setIsSyncingRecurrence] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Modais
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [selectedEntryForSettlement, setSelectedEntryForSettlement] = useState<FinEntry | null>(null);
  const [selectedEntryForEdit, setSelectedEntryForEdit] = useState<FinEntry | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [entriesRes, accountsRes, recurrenceRes] = await Promise.all([
        fetch("/api/finance/entries?limit=50"),
        fetch("/api/finance/accounts"),
        fetch("/api/finance/recurrence"),
      ]);

      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setEntries(data.entries || []);
      }
      if (accountsRes.ok) {
        const accData = await accountsRes.json();
        setBankAccounts(accData.bank_accounts || []);
        setAccounts(accData.accounts || []);
        setSuppliers(accData.suppliers || []);
        setClients(accData.clients || []);
      }
      if (recurrenceRes.ok) {
        const recData = await recurrenceRes.json();
        setRecurringContracts(recData.contracts || []);
        setTotalMRR(recData.total_mrr || 0);
      }
    } catch (err) {
      console.error("[FinanceOverview] Falha ao carregar dados:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSyncMonthlyRecurrence = async () => {
    setIsSyncingRecurrence(true);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/finance/recurrence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao sincronizar");
      setSyncFeedback(
        `Recorrência sincronizada! ${data.result.generatedCount} novo(s) faturamento(s) provisionado(s) e ${data.result.skippedCount} já atualizados.`
      );
      fetchData();
      setTimeout(() => setSyncFeedback(null), 6000);
    } catch (err: any) {
      setSyncFeedback(`Falha ao sincronizar: ${err.message}`);
    } finally {
      setIsSyncingRecurrence(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cálculos consolidados do painel
  const totalBalance = bankAccounts.reduce((acc, b) => acc + Number(b.current_balance || 0), 0);

  const pendingReceivables = entries
    .filter((e) => e.kind === "revenue" && e.status !== "paid" && e.status !== "cancelled")
    .reduce((acc, e) => acc + (Number(e.amount) - Number(e.amount_paid || 0)), 0);

  const pendingPayables = entries
    .filter((e) => e.kind === "expense" && e.status !== "paid" && e.status !== "cancelled")
    .reduce((acc, e) => acc + (Number(e.amount) - Number(e.amount_paid || 0)), 0);

  const totalPaidRevenueThisMonth = entries
    .filter((e) => e.kind === "revenue" && e.status === "paid")
    .reduce((acc, e) => acc + Number(e.amount_paid || 0), 0);

  const todayStr = new Date().toISOString().split("T")[0];
  const overdueEntries = entries.filter(
    (e) => e.status !== "paid" && e.status !== "cancelled" && e.due_date < todayStr
  );

  const upcomingEntries = entries
    .filter((e) => e.status !== "paid" && e.status !== "cancelled" && e.due_date >= todayStr)
    .slice(0, 8);

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* BARRA DE AÇÕES SUTIS */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-black/[0.04]">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[var(--color-veronna-bordo)]" />
          <span className="text-xs font-semibold text-[var(--color-veronna-navy)]">
            Posição Financeira Consolidada
          </span>
          <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">
            • Tempo real
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncMonthlyRecurrence}
            disabled={isSyncingRecurrence}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200/80 bg-white/60 hover:bg-white text-gray-600 hover:text-[var(--color-veronna-navy)] text-xs font-medium transition shadow-2xs disabled:opacity-50"
            title="Lê os contratos ativos em projects e provisiona automaticamente as receitas do mês em fin_entries"
          >
            {isSyncingRecurrence ? (
              <Loader2 size={12} className="animate-spin text-[var(--color-veronna-bordo)]" />
            ) : (
              <RotateCw size={12} className="text-[var(--color-veronna-bordo)]/80" />
            )}
            <span>Sincronizar Recorrência</span>
          </button>

          <button
            onClick={() => setIsNewEntryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-veronna-navy)] hover:bg-[var(--color-veronna-navy)]/90 text-white text-xs font-medium transition shadow-2xs"
          >
            <Plus size={13} strokeWidth={2} />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className="p-2.5 bg-emerald-50/90 border border-emerald-200/80 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2 shadow-2xs">
          <Check size={14} className="text-emerald-600 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* QUATRO WIDGETS COMPACTOS & DIRETOS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. DISPONIBILIDADES */}
        <div className="p-3.5 rounded-2xl bg-white/45 border border-white/70 shadow-2xs backdrop-blur-xs flex flex-col justify-between hover:bg-white/60 transition">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Landmark size={13} className="text-[var(--color-veronna-navy)]/70 shrink-0" />
              Disponibilidades
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              {bankAccounts.length} conta(s)
            </span>
          </div>
          <div className="mt-1.5">
            <div className="text-lg md:text-xl font-bold tracking-tight text-[var(--color-veronna-navy)]">
              {formatBRL(totalBalance)}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5 truncate">
              Caixa & bancos ativos
            </div>
          </div>
        </div>

        {/* 2. A RECEBER PENDENTES */}
        <div className="p-3.5 rounded-2xl bg-white/45 border border-white/70 shadow-2xs backdrop-blur-xs flex flex-col justify-between hover:bg-white/60 transition">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <TrendingUp size={13} className="text-emerald-700 shrink-0" />
              A Receber
            </span>
            <Link
              href="/admin/financeiro/receber"
              className="text-[10px] font-semibold text-emerald-700 hover:underline flex items-center gap-0.5"
            >
              Agenda <ArrowRight size={10} />
            </Link>
          </div>
          <div className="mt-1.5">
            <div className="text-lg md:text-xl font-bold tracking-tight text-emerald-700">
              {formatBRL(pendingReceivables)}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5 truncate">
              Títulos pendentes
            </div>
          </div>
        </div>

        {/* 3. A PAGAR PENDENTES */}
        <div className="p-3.5 rounded-2xl bg-white/45 border border-white/70 shadow-2xs backdrop-blur-xs flex flex-col justify-between hover:bg-white/60 transition">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <TrendingDown size={13} className="text-rose-700 shrink-0" />
              A Pagar
            </span>
            <Link
              href="/admin/financeiro/pagar"
              className="text-[10px] font-semibold text-rose-700 hover:underline flex items-center gap-0.5"
            >
              Agenda <ArrowRight size={10} />
            </Link>
          </div>
          <div className="mt-1.5">
            <div className="text-lg md:text-xl font-bold tracking-tight text-rose-700">
              {formatBRL(pendingPayables)}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5 truncate">
              Compromissos pendentes
            </div>
          </div>
        </div>

        {/* 4. RECEITA JÁ LIQUIDADA */}
        <div className="p-3.5 rounded-2xl bg-white/45 border border-white/70 shadow-2xs backdrop-blur-xs flex flex-col justify-between hover:bg-white/60 transition">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-veronna-bordo)] flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-[var(--color-veronna-bordo)] shrink-0" />
              Já Liquidado
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              Efetivo
            </span>
          </div>
          <div className="mt-1.5">
            <div className="text-lg md:text-xl font-bold tracking-tight text-[var(--color-veronna-navy)]">
              {formatBRL(totalPaidRevenueThisMonth)}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5 truncate">
              Realizado em caixa
            </div>
          </div>
        </div>
      </div>

      {/* ALERTAS CRÍTICOS & INADIMPLÊNCIA */}
      {overdueEntries.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-3">
          <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={20} />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-900">
              {overdueEntries.length} lançamento(s) vencido(s) aguardando baixa ou cobrança
            </h4>
            <p className="text-[11px] text-amber-800/80 mt-0.5">
              Há títulos em atraso que afetam o fluxo de caixa. Verifique as faturas pendentes de clientes ou fornecedores.
            </p>
          </div>
          <Link
            href="/admin/financeiro/lancamentos?status=pending"
            className="text-xs font-bold text-amber-900 underline whitespace-nowrap"
          >
            Ver títulos atrasados
          </Link>
        </div>
      )}

      {/* SEÇÃO PRINCIPAL: PRÓXIMOS VENCIMENTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LISTAGEM DE LANÇAMENTOS RECENTES / PRÓXIMOS */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-white/45 border border-white/70 shadow-2xs backdrop-blur-xs flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-veronna-navy)]">
                Próximos Lançamentos & Vencimentos
              </h3>
              <p className="text-[11px] text-gray-500">
                Acompanhamento operacional do calendário de pagamentos e recebimentos.
              </p>
            </div>
            <Link
              href="/admin/financeiro/lancamentos"
              className="text-xs font-semibold text-[var(--color-veronna-navy)] hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-gray-400">
              Carregando lançamentos financeiros...
            </div>
          ) : upcomingEntries.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              Nenhum lançamento pendente encontrado para os próximos dias.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    <th className="py-2 px-2">Vencimento</th>
                    <th className="py-2 px-2">Título / Descrição</th>
                    <th className="py-2 px-2">Tipo</th>
                    <th className="py-2 px-2">Valor</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {upcomingEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-white/60 transition group">
                      <td className="py-2 px-2 whitespace-nowrap text-gray-600 font-medium">
                        {e.due_date ? e.due_date.split("T")[0] : "-"}
                      </td>
                      <td className="py-2 px-2">
                        <div className="font-semibold text-gray-800">{e.title}</div>
                        <div className="text-[10px] text-gray-400">
                          {e.client?.nome || e.supplier?.name || "Lançamento Avulso"}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            e.kind === "revenue"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {e.kind === "revenue" ? "Receita" : "Despesa"}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-bold text-gray-800">
                        {formatBRL(Number(e.amount))}
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${
                            e.status === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : e.status === "partially_paid"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {e.status === "paid"
                            ? "Pago"
                            : e.status === "partially_paid"
                            ? "Parcial"
                            : "Pendente"}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {e.status !== "paid" && (
                            <button
                              onClick={() => setSelectedEntryForSettlement(e)}
                              className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md transition"
                            >
                              Baixar
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedEntryForEdit(e)}
                            className="px-2 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-100 rounded-md transition"
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

        {/* PAINEL LATERAL: CONTAS BANCÁRIAS E ATALHOS */}
        <div className="flex flex-col gap-4">
          {/* CONTAS BANCÁRIAS */}
          <div className="p-4 rounded-2xl bg-white/45 border border-white/70 shadow-2xs backdrop-blur-xs flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-[var(--color-veronna-navy)]">
                Contas Bancárias
              </h3>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Saldo Atual
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {bankAccounts.map((b) => (
                <div
                  key={b.id}
                  className="flex justify-between items-center p-2.5 rounded-xl bg-white/60 border border-gray-100/80"
                >
                  <div>
                    <div className="text-xs font-bold text-gray-800">{b.name}</div>
                    <div className="text-[10px] text-gray-400">
                      {b.bank_name || "Conta Operacional"}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-[var(--color-veronna-navy)]">
                    {formatBRL(Number(b.current_balance || 0))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ACESSO RÁPIDO AOS SUBMÓDULOS */}
          <div className="p-4 rounded-2xl bg-white/45 border border-white/70 shadow-2xs backdrop-blur-xs flex flex-col gap-2">
            <h3 className="text-xs font-bold text-[var(--color-veronna-navy)]">
              Módulos Contábeis
            </h3>

            <Link
              href="/admin/financeiro/notas-fiscais"
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/50 hover:bg-white text-xs font-medium text-gray-700 border border-gray-100/80 transition"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={14} className="text-blue-600" />
                <span>Notas Fiscais Emitidas & Recebidas</span>
              </div>
              <ArrowRight size={12} className="text-gray-400" />
            </Link>

            <Link
              href="/admin/financeiro/impostos"
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/50 hover:bg-white text-xs font-medium text-gray-700 border border-gray-100/80 transition"
            >
              <div className="flex items-center gap-2">
                <Receipt size={14} className="text-amber-600" />
                <span>Calendário Tributário (DAS/Simples)</span>
              </div>
              <ArrowRight size={12} className="text-gray-400" />
            </Link>

            <Link
              href="/admin/financeiro/fechamento"
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/50 hover:bg-white text-xs font-medium text-gray-700 border border-gray-100/80 transition"
            >
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-purple-600" />
                <span>Fechamento Mensal & Snapshot DRE</span>
              </div>
              <ArrowRight size={12} className="text-gray-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* SEÇÃO: CLIENTES ATIVOS & FATURAMENTO RECORRENTE (MRR) */}
      <div className="p-4 rounded-2xl bg-white/45 border border-white/70 shadow-2xs backdrop-blur-xs flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[var(--color-veronna-bordo)]/10 text-[var(--color-veronna-bordo)]">
              <Users size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--color-veronna-navy)]">
                Clientes Ativos & Faturamento Recorrente (MRR)
              </h3>
              <p className="text-[11px] text-gray-500">
                Contratos ativos em <strong>projects</strong> projetados no fluxo de contas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500 block">
                MRR Contratado
              </span>
              <span className="text-sm font-extrabold text-emerald-700">
                {formatBRL(totalMRR)}
              </span>
            </div>
            <Link
              href="/admin/financeiro/receber"
              className="text-xs font-semibold text-[var(--color-veronna-navy)] hover:underline flex items-center gap-1"
            >
              Agenda A Receber <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {recurringContracts.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">
            Nenhum contrato ativo identificado no banco de dados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-2 px-2">Cliente / Empresa</th>
                  <th className="py-2 px-2">Serviço</th>
                  <th className="py-2 px-2">Recorrência</th>
                  <th className="py-2 px-2 text-right">Valor Mensal</th>
                  <th className="py-2 px-2 text-center">Vencimento</th>
                  <th className="py-2 px-2 text-center">Faturamento do Mês</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recurringContracts.map((c: any) => {
                  const isProvisioned = Boolean(c.provisioned_entry_id);
                  const isPaid = c.provisioned_entry_status === "paid";
                  const billingDay = c.billing_date ? new Date(c.billing_date).getUTCDate() : 10;

                  return (
                    <tr key={c.project_id} className="hover:bg-white/80 transition-colors">
                      <td className="py-2 px-2">
                        <div className="font-bold text-gray-900">{c.client_name || "Cliente Atelier"}</div>
                        {c.client_empresa && (
                          <div className="text-[10px] text-gray-400">{c.client_empresa}</div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-gray-700 font-medium">
                        {c.service_type || "Gestão Recorrente"}
                      </td>
                      <td className="py-2 px-2">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                          {c.payment_recurrence || "Único"}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-gray-900">
                        {c.financial_value ? formatBRL(Number(c.financial_value)) : "—"}
                      </td>
                      <td className="py-2 px-2 text-center text-gray-600 font-medium">
                        Dia {billingDay}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={10} /> Liquidado
                          </span>
                        ) : isProvisioned ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                            <Clock size={10} /> Provisionado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Aguardando Sincronização
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
        onSuccess={fetchData}
      />

      {/* MODAL DE LIQUIDAÇÃO / BAIXA */}
      <SettlementModal
        isOpen={Boolean(selectedEntryForSettlement)}
        entry={selectedEntryForSettlement}
        bankAccounts={bankAccounts}
        onClose={() => setSelectedEntryForSettlement(null)}
        onSuccess={fetchData}
      />

      {/* MODAL DE EDIÇÃO COM JUSTIFICATIVA OBRIGATÓRIA */}
      <EditEntryModal
        isOpen={Boolean(selectedEntryForEdit)}
        entry={selectedEntryForEdit}
        onClose={() => setSelectedEntryForEdit(null)}
        onSuccess={fetchData}
      />
    </div>
  );
}
