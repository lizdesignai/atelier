// src/app/tessera/reviews/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Check,
  CheckSquare,
  Clock,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { PriorityBadge } from '@/components/tessera/PriorityBadge';
import { TaskDrawer } from '@/components/tessera/TaskDrawer';
import type { ReviewInboxItem } from '@/lib/tessera/workTypes';

const REASON_LABELS: Record<string, string> = {
  info: 'Informação Incorreta / Briefing',
  text: 'Ajuste de Copy / Texto',
  visual: 'Direção Visual / Estética',
  offer: 'Oferta / CTA / Estratégia',
  other: 'Outro Motivo',
};

type FilterMode = 'all' | 'eligible' | 'ineligible' | 'overdue';

export default function TesseraReviewsPage() {
  const [items, setItems] = useState<ReviewInboxItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, eligible: 0, ineligible: 0, overdue: 0 });
  const [isManager, setIsManager] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);

  // Modal de pedir ajustes
  const [rejectItem, setRejectItem] = useState<ReviewInboxItem | null>(null);
  const [rejectCategory, setRejectCategory] = useState('visual');
  const [rejectComment, setRejectComment] = useState('');

  const notify = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5500);
  };

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tessera/reviews');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar fila de QA.');
      setItems(data.items || []);
      setCounts(data.counts || { total: 0, eligible: 0, ineligible: 0, overdue: 0 });
      setIsManager(Boolean(data.viewer?.isManager));
      setSelectedIds(new Set());
    } catch (err: any) {
      notify('err', err.message || 'Erro de comunicação.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const filteredItems = items.filter(it => {
    if (filter === 'eligible') return it.eligibility.eligible;
    if (filter === 'ineligible') return !it.eligibility.eligible;
    if (filter === 'overdue') {
      return Boolean(it.internal_due_at && new Date(it.internal_due_at).getTime() < Date.now());
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllEligible = () => {
    const elig = filteredItems.filter(i => i.eligibility.eligible).map(i => i.id);
    setSelectedIds(new Set(elig));
  };

  const handleSingleApprove = async (item: ReviewInboxItem) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tessera/reviews/${item.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approved', comment: 'Aprovado na Inbox de QA' }),
      });
      const data = await res.json();
      if (!res.ok) {
        const extra = Array.isArray(data.details) ? `: ${data.details.join(' ')}` : '';
        throw new Error((data.error || 'Não foi possível aprovar') + extra);
      }
      notify(
        'ok',
        `“${item.title}” aprovado! Encaminhado para ${
          item.client_visible ? 'Aprovação do Cliente' : 'Concluído'
        }.`,
      );
      loadReviews();
    } catch (err: any) {
      notify('err', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/tessera/reviews/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na aprovação em lote.');
      const okCount = (data.approved || []).length;
      const skipCount = (data.skipped || []).length;
      const skipSummary =
        skipCount > 0
          ? ` (${skipCount} ignorados por pendências: ${data.skipped
              .map((s: any) => s.reasons.join(', '))
              .join('; ')})`
          : '';
      notify('ok', `${okCount} item(ns) aprovado(s) em lote!${skipSummary}`);
      loadReviews();
    } catch (err: any) {
      notify('err', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectItem) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tessera/reviews/${rejectItem.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'request_changes',
          reason_category: rejectCategory,
          comment: rejectComment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao solicitar ajustes.');
      if (data.exceeded_revision_limit) {
        notify(
          'err',
          `Ajustes enviados (Rodada ${data.revision_round}/${data.max_revision_rounds} — Limite de retrabalho excedido!).`,
        );
      } else {
        notify(
          'ok',
          `Ajustes solicitados (Rodada ${data.revision_round}/${data.max_revision_rounds}). Item devolvido para Em Execução.`,
        );
      }
      setRejectItem(null);
      setRejectComment('');
      loadReviews();
    } catch (err: any) {
      notify('err', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800/80">
        <div>
          <h1 className="text-xl font-semibold text-stone-100 flex items-center gap-2.5">
            <Inbox className="w-5 h-5 text-purple-400" />
            <span>Inbox de QA & Revisão Interna</span>
            <span className="text-xs font-mono font-normal text-purple-300 px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-800/40">
              {counts.total} na fila
            </span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Portão de qualidade com verificação automática de elegibilidade, controle de rodadas de retrabalho e aprovação em lote segura.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isManager && counts.eligible > 0 && (
            <button
              onClick={selectAllEligible}
              className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-300 hover:bg-stone-800 transition"
            >
              Selecionar Elegíveis ({counts.eligible})
            </button>
          )}
          <button
            onClick={loadReviews}
            className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filtros Rápidos */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-stone-900 p-1 border border-stone-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'all' ? 'bg-purple-600 text-stone-950 font-semibold' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Todos ({counts.total})
          </button>
          <button
            onClick={() => setFilter('eligible')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'eligible'
                ? 'bg-emerald-600 text-stone-950 font-semibold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Elegíveis p/ Aprovação ({counts.eligible})
          </button>
          <button
            onClick={() => setFilter('ineligible')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'ineligible'
                ? 'bg-amber-600 text-stone-950 font-semibold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Com Pendências ({counts.ineligible})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'overdue'
                ? 'bg-rose-600 text-stone-950 font-semibold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Prazo Vencido ({counts.overdue})
          </button>
        </div>

        {/* Barra de Ação em Lote */}
        {isManager && selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-950/60 border border-emerald-700/60">
            <span className="text-xs text-emerald-200 font-medium">
              {selectedIds.size} item(ns) selecionado(s)
            </span>
            <button
              disabled={isSubmitting}
              onClick={handleBulkApprove}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-semibold text-xs transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aprovar Lote</span>
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-stone-400 hover:text-stone-200"
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {banner && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            banner.type === 'ok'
              ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800/60 text-rose-200'
          }`}
        >
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} className="underline text-[11px] ml-3">
            Fechar
          </button>
        </div>
      )}

      {/* Lista de Itens */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-stone-500">Carregando Inbox de QA...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 rounded-2xl bg-stone-900/40 border border-stone-800 text-center text-xs text-stone-500 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <span>Nenhum item encontrado neste filtro de revisão.</span>
          </div>
        ) : (
          filteredItems.map(item => {
            const isSelected = selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition ${
                  !item.eligibility.eligible
                    ? 'bg-amber-950/15 border-amber-800/50'
                    : isSelected
                    ? 'bg-purple-950/25 border-purple-600/60'
                    : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  {isManager && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      className="mt-1 rounded border-stone-700 bg-stone-950 text-emerald-500"
                    />
                  )}

                  <div
                    className="space-y-1.5 flex-1 cursor-pointer"
                    onClick={() => setDrawerItemId(item.id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <PriorityBadge priority={item.priority} size="sm" />
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-950 border border-stone-800 text-stone-400">
                        {item.type}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 text-purple-300">
                        Rodada #{item.revision_rounds + 1}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-stone-950 border border-stone-800 text-stone-400">
                        Destino: {item.client_visible ? 'Aprovação do Cliente' : 'Concluído'}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-stone-100 hover:text-amber-300 transition">
                      {item.title}
                    </h3>

                    <p className="text-[11px] text-stone-400">
                      Projeto: <strong className="text-stone-200">{item.project_title || 'Studio'}</strong> •
                      Responsável: <strong className="text-stone-200">{item.owner_name || 'Sem dono'}</strong> •
                      Checklist:{' '}
                      <strong>
                        {item.checklist_completed || 0}/{item.checklist_total || 0}
                      </strong>
                    </p>

                    {item.deliverables.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {item.deliverables.map((d, idx) => (
                          <a
                            key={idx}
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-amber-400 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>{d.label}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {!item.eligibility.eligible && (
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {item.eligibility.reasons.map((r, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-[11px] text-amber-200"
                          >
                            <ShieldAlert className="w-3 h-3 text-amber-400" />
                            <span>{r}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setDrawerItemId(item.id)}
                    className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 hover:bg-stone-800 transition"
                  >
                    Inspecionar
                  </button>

                  {isManager && (
                    <>
                      <button
                        disabled={isSubmitting}
                        onClick={() => setRejectItem(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/20 border border-amber-600/50 text-amber-200 hover:bg-amber-600/30 text-xs font-medium transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Pedir Ajustes</span>
                      </button>

                      <button
                        disabled={!item.eligibility.eligible || isSubmitting}
                        onClick={() => handleSingleApprove(item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-stone-950 font-semibold text-xs transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aprovar</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Pedir Ajustes */}
      {rejectItem && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setRejectItem(null)}
        >
          <div
            className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Solicitar Ajustes (Retorno à Execução)</span>
              </h3>
              <button onClick={() => setRejectItem(null)} className="text-stone-500 hover:text-stone-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-400">
              Item: <strong className="text-stone-200">{rejectItem.title}</strong> (Rodada #
              {rejectItem.revision_rounds + 1})
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Categoria Estruturada do Motivo
                </label>
                <select
                  value={rejectCategory}
                  onChange={e => setRejectCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100"
                >
                  {Object.entries(REASON_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Descrição detalhada do ajuste (mín. 3 caracteres)
                </label>
                <textarea
                  required
                  minLength={3}
                  rows={3}
                  value={rejectComment}
                  onChange={e => setRejectComment(e.target.value)}
                  placeholder="Explique o que deve ser ajustado antes de reenviar ao QA..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectItem(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs"
                >
                  {isSubmitting ? 'Enviando...' : 'Confirmar Pedido de Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer de Detalhe */}
      <TaskDrawer
        itemId={drawerItemId}
        onClose={() => setDrawerItemId(null)}
        onUpdated={loadReviews}
      />
    </div>
  );
}
