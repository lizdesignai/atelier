// src/app/admin/financeiro/notas-fiscais/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileSpreadsheet,
  Plus,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
} from "lucide-react";
import type { FinInvoice } from "@/types/finance";

export default function NotasFiscaisPage() {
  const [invoices, setInvoices] = useState<FinInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState<string>("");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Form State
  const [direction, setDirection] = useState<"issued" | "received">("issued");
  const [number, setNumber] = useState("");
  const [series, setSeries] = useState("1");
  const [recipientName, setRecipientName] = useState("");
  const [recipientDoc, setRecipientDoc] = useState("");
  const [issueDate, setIssueDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [totalAmount, setTotalAmount] = useState("");
  const [issAmount, setIssAmount] = useState("0");
  const [issRetained, setIssRetained] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [xmlUrl, setXmlUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (directionFilter) params.set("direction", directionFilter);

      const res = await fetch(`/api/finance/invoices?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error("[NotasFiscais] Erro ao carregar notas fiscais:", err);
    } finally {
      setIsLoading(false);
    }
  }, [directionFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numTotal = Number(totalAmount);
    if (!numTotal || numTotal <= 0) {
      setErrorMessage("Informe um valor total válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          number: number.trim() || null,
          series: series.trim() || null,
          recipient_name: recipientName.trim() || null,
          recipient_doc: recipientDoc.trim() || null,
          issue_date: issueDate || null,
          total_amount: numTotal,
          iss_amount: Number(issAmount) || 0,
          iss_retained: issRetained,
          pdf_url: pdfUrl.trim() || null,
          xml_url: xmlUrl.trim() || null,
          status: "issued",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao registrar nota fiscal.");
      }

      setIsNewModalOpen(false);
      // Limpa formulário
      setNumber("");
      setRecipientName("");
      setRecipientDoc("");
      setTotalAmount("");
      setIssAmount("0");
      setPdfUrl("");
      setXmlUrl("");
      fetchInvoices();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBRL = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalIssued = invoices
    .filter((i) => i.direction === "issued")
    .reduce((acc, i) => acc + Number(i.total_amount || 0), 0);

  const totalReceived = invoices
    .filter((i) => i.direction === "received")
    .reduce((acc, i) => acc + Number(i.total_amount || 0), 0);

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* HEADER DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
            Total em Notas Emitidas (Serviços Prestados)
          </span>
          <div className="text-2xl font-bold text-blue-900 mt-2">
            {formatBRL(totalIssued)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1">Faturamento formalizado via NFS-e</span>
        </div>

        <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
            Total em Notas Recebidas (Despesas/Entradas)
          </span>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {formatBRL(totalReceived)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1">Notas de fornecedores e prestadores</span>
        </div>

        <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Contabilidade Fiscal
            </span>
            <div className="text-sm font-bold text-[var(--color-veronna-navy)] mt-1">
              Nova Nota Fiscal
            </div>
            <p className="text-[11px] text-gray-500">Cadastrar NFS-e emitida ou recebida</p>
          </div>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[var(--color-veronna-navy)] text-white text-xs font-bold shadow-md hover:bg-[var(--color-veronna-navy)]/90 transition"
          >
            <Plus size={15} /> Cadastrar NF
          </button>
        </div>
      </div>

      {/* FILTRO POR DIREÇÃO */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDirectionFilter("")}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition ${
            directionFilter === ""
              ? "bg-[var(--color-veronna-navy)] text-white shadow-sm"
              : "bg-white/60 text-gray-700 hover:bg-white"
          }`}
        >
          Todas as Notas ({invoices.length})
        </button>
        <button
          onClick={() => setDirectionFilter("issued")}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition ${
            directionFilter === "issued"
              ? "bg-blue-700 text-white shadow-sm"
              : "bg-white/60 text-gray-700 hover:bg-white"
          }`}
        >
          Emitidas / Prestadas
        </button>
        <button
          onClick={() => setDirectionFilter("received")}
          className={`px-4 py-2 rounded-2xl text-xs font-semibold transition ${
            directionFilter === "received"
              ? "bg-gray-800 text-white shadow-sm"
              : "bg-white/60 text-gray-700 hover:bg-white"
          }`}
        >
          Recebidas / Fornecedores
        </button>
      </div>

      {/* TABELA DE NOTAS FISCAIS */}
      <div className="glass-panel rounded-3xl bg-white/50 border border-white/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-gray-400">Carregando notas fiscais...</div>
        ) : invoices.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-400">Nenhuma nota fiscal encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Número / Série</th>
                  <th className="py-3 px-4">Data de Emissão</th>
                  <th className="py-3 px-4">Tomador / Destinatário</th>
                  <th className="py-3 px-4">CNPJ / CPF</th>
                  <th className="py-3 px-4">Valor Total</th>
                  <th className="py-3 px-4">ISS Retido</th>
                  <th className="py-3 px-4">Documentos</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/80 transition group">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inv.direction === "issued"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-gray-100 text-gray-700 border border-gray-200"
                        }`}
                      >
                        {inv.direction === "issued" ? "Emitida" : "Recebida"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      {inv.number ? `Nº ${inv.number}` : "S/N"} {inv.series ? `(${inv.series})` : ""}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {inv.issue_date ? inv.issue_date.split("T")[0] : "-"}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-800">
                      {inv.recipient_name || inv.issuer_name || "Não informado"}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                      {inv.recipient_doc || inv.issuer_doc || "-"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {formatBRL(Number(inv.total_amount))}
                    </td>
                    <td className="py-3.5 px-4 text-[11px]">
                      {inv.iss_retained ? (
                        <span className="text-amber-700 font-semibold">
                          Retido ({formatBRL(Number(inv.iss_amount || 0))})
                        </span>
                      ) : (
                        <span className="text-gray-400">Não retido</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {inv.pdf_url && (
                          <a
                            href={inv.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                          >
                            PDF <ExternalLink size={12} />
                          </a>
                        )}
                        {inv.xml_url && (
                          <a
                            href={inv.xml_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                          >
                            XML <ExternalLink size={12} />
                          </a>
                        )}
                        {!inv.pdf_url && !inv.xml_url && (
                          <span className="text-gray-400 text-[10px]">Sem anexo</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        {inv.status === "issued" ? "Emitida" : inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO DE NOTA FISCAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-veronna-bordo)]">
                  Fiscal & Contábil
                </span>
                <h2 className="text-lg font-semibold text-[var(--color-veronna-navy)]">
                  Cadastrar Nota Fiscal
                </h2>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200/60 text-gray-400 hover:text-gray-700 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              {errorMessage && (
                <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setDirection("issued")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                    direction === "issued" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"
                  }`}
                >
                  NFS-e Emitida (Serviço)
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("received")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                    direction === "received" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
                  }`}
                >
                  NF Recebida (Fornecedor)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Número da Nota</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 2026042"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Data de Emissão</label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Tomador / Destinatário</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome ou Razão Social"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">CNPJ / CPF</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={recipientDoc}
                    onChange={(e) => setRecipientDoc(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Valor Total (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Valor ISS (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={issAmount}
                    onChange={(e) => setIssAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-veronna-navy)]/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="issRetained"
                  checked={issRetained}
                  onChange={(e) => setIssRetained(e.target.checked)}
                  className="rounded text-[var(--color-veronna-navy)] focus:ring-0"
                />
                <label htmlFor="issRetained" className="text-xs text-gray-700 font-medium cursor-pointer">
                  Houve retenção de ISS na fonte pelo tomador
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">Link do PDF da Nota</label>
                <input
                  type="url"
                  placeholder="https://... link público ou storage"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
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
                  {isSubmitting ? "Cadastrando..." : "Salvar Nota Fiscal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
