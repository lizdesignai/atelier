// src/app/tessera/focus/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Play,
  Square,
  Flame,
  Lock,
  Unlock,
  Clock,
  AlertTriangle,
  Send,
  RefreshCw,
  User,
  Calendar,
  Sparkles,
  X,
} from 'lucide-react';
import { StatusBadge } from '@/components/tessera/StatusBadge';
import { PriorityBadge } from '@/components/tessera/PriorityBadge';
import { TaskDrawer } from '@/components/tessera/TaskDrawer';
import type { FocusBoardResponse } from '@/lib/tessera/workTypes';
import type { OrgMember } from '@/lib/tessera/itemQueries';

type FocusApiPayload = FocusBoardResponse & {
  target_owner_id: string;
  viewer: { id: string; name: string | null; role: string; isManager: boolean };
  members: OrgMember[];
};

function formatTimer(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
}

export default function TesseraFocusPage() {
  const [board, setBoard] = useState<FocusApiPayload | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [liveSeconds, setLiveSeconds] = useState(0);

  // Modal "Forçar Hoje"
  const [forceModalItem, setForceModalItem] = useState<{ id: string; title: string } | null>(null);
  const [forceReason, setForceReason] = useState('');
  const [isForcing, setIsForcing] = useState(false);

  const notify = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  const loadFocus = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = ownerFilter ? `?owner_id=${encodeURIComponent(ownerFilter)}` : '';
      const res = await fetch(`/api/tessera/focus${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar Meu Focus.');
      setBoard(data as FocusApiPayload);
      setLiveSeconds(data.active_session?.elapsed_seconds || 0);
    } catch (err: any) {
      notify('err', err.message || 'Erro de comunicação.');
    } finally {
      setIsLoading(false);
    }
  }, [ownerFilter]);

  useEffect(() => {
    loadFocus();
    const onCreated = () => loadFocus();
    window.addEventListener('tessera:itemCreated', onCreated);
    return () => window.removeEventListener('tessera:itemCreated', onCreated);
  }, [loadFocus]);

  useEffect(() => {
    if (!board?.active_session) return;
    const t = setInterval(() => setLiveSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [board?.active_session]);

  const handleSession = async (action: 'start' | 'stop', itemId?: string) => {
    try {
      const res = await fetch('/api/tessera/focus/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, work_item_id: itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao controlar cronômetro.');
      notify(
        'ok',
        action === 'start'
          ? 'Sessão de foco iniciada no servidor!'
          : 'Sessão encerrada e minutos gravados no item.',
      );
      loadFocus();
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleQuickSendToReview = async (itemId: string) => {
    try {
      const res = await fetch(`/api/tessera/work-items/${itemId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_status: 'internal_review', reason: 'Enviado para revisão via Meu Focus' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível enviar para revisão.');
      notify('ok', 'Item enviado para a Inbox de QA & Revisão!');
      loadFocus();
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleConfirmForceToday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forceModalItem) return;
    setIsForcing(true);
    try {
      const res = await fetch('/api/tessera/focus/force-today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_item_id: forceModalItem.id, reason: forceReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao forçar item para hoje.');
      const displacedTitles = (data.displaced || []).map((d: any) => d.title).join(', ');
      const displacedMsg = displacedTitles
        ? ` Itens deslocados para os próximos dias: ${displacedTitles}.`
        : '';
      notify('ok', `Item fixado em Hoje!${displacedMsg}`);
      setForceModalItem(null);
      setForceReason('');
      loadFocus();
    } catch (err: any) {
      notify('err', err.message);
    } finally {
      setIsForcing(false);
    }
  };

  const handleClearForce = async (itemId: string) => {
    try {
      const res = await fetch('/api/tessera/focus/force-today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_item_id: itemId, clear: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao remover destaque.');
      notify('ok', 'Destaque de urgência removido.');
      loadFocus();
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const isViewingSelf = !board || board.target_owner_id === board.viewer.id;
  const totalDayMinutes = board ? board.worked_today_minutes + board.planned_minutes : 0;
  const capacityBase = board ? board.worked_today_minutes + board.capacity_minutes : 360;
  const usagePct = capacityBase > 0 ? Math.min(100, Math.round((totalDayMinutes / capacityBase) * 100)) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800/80">
        <div>
          <h1 className="text-xl font-semibold text-stone-100 flex items-center gap-2.5">
            <CheckSquare className="w-5 h-5 text-amber-500" />
            <span>Meu Focus — Mesa de Execução por Capacidade</span>
            <span className="text-xs font-mono font-normal text-amber-400 px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/40">
              WSJF + Cronômetro Server
            </span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Alocação diária real por minutos restantes, urgência e impacto — sem o limite artificial de 5 tarefas/dia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {board?.viewer.isManager && (
            <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5">
              <User className="w-3.5 h-3.5 text-amber-500" />
              <select
                value={ownerFilter || board.target_owner_id}
                onChange={e => setOwnerFilter(e.target.value)}
                className="bg-transparent text-xs text-stone-200 focus:outline-none"
              >
                {board.members.map(m => (
                  <option key={m.id} value={m.id} className="bg-stone-900 text-stone-100">
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={loadFocus}
            className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200 transition"
            title="Atualizar fila"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
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

      {isLoading && !board ? (
        <div className="py-20 text-center text-xs text-stone-500">Calculando plano diário por capacidade...</div>
      ) : board ? (
        <>
          {/* Termômetro de Capacidade do Dia */}
          <div className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Orçamento de Capacidade de Hoje ({board.date})</span>
                </span>
                <p className="text-[11px] text-stone-400">
                  Trabalhado hoje: <strong className="text-stone-200">{board.worked_today_minutes}m</strong> •
                  Planejado para hoje: <strong className="text-amber-300">{board.planned_minutes}m</strong> •
                  Capacidade restante: <strong className="text-stone-200">{board.capacity_minutes}m</strong>
                </p>
              </div>

              {board.overload_minutes > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-700/60 text-rose-200 text-xs font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Sobrecarga de +{board.overload_minutes}m hoje
                </span>
              ) : (
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
                  Carga Saudável ({usagePct}%)
                </span>
              )}
            </div>

            <div className="w-full h-2.5 rounded-full bg-stone-950 border border-stone-800 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  board.overload_minutes > 0 ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-600 to-emerald-500'
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>

          {/* 1. AGORA — Sessão de Trabalho Ativa no Servidor */}
          {board.active_session && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/50 via-stone-900 to-stone-900 border border-amber-600/50 shadow-xl shadow-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-950 animate-ping" />
                    Em Foco Agora
                  </span>
                  <span className="text-sm font-mono font-semibold text-amber-300">
                    {formatTimer(liveSeconds)}
                  </span>
                </div>
                <h2
                  onClick={() => setSelectedItemId(board.active_session!.work_item_id)}
                  className="text-base font-semibold text-stone-100 hover:text-amber-300 cursor-pointer transition"
                >
                  {board.active_session.item_title || 'Item em execução'}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setSelectedItemId(board.active_session!.work_item_id)}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs text-stone-200 transition"
                >
                  Abrir Detalhes
                </button>
                {isViewingSelf && (
                  <>
                    <button
                      onClick={() => handleQuickSendToReview(board.active_session!.work_item_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-stone-950 font-semibold text-xs transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar p/ QA</span>
                    </button>
                    <button
                      onClick={() => handleSession('stop')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-stone-950 font-semibold text-xs transition"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Parar</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 2. HOJE — Fila Planejada dentro da Capacidade */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <span>Fila de Hoje ({board.today.length})</span>
              </h2>
              <span className="text-[11px] text-stone-500">
                Ordenado por Urgência do Gestor → Índice WSJF (Prazo + Prioridade / Minutos Restantes)
              </span>
            </div>

            {board.today.length === 0 ? (
              <div className="p-8 rounded-2xl bg-stone-900/40 border border-stone-800/80 text-center text-xs text-stone-500">
                Nenhum item planejado para hoje nesta fila.
              </div>
            ) : (
              <div className="space-y-2.5">
                {board.today.map(entry => {
                  const it = entry.item;
                  const isRunning = board.active_session?.work_item_id === it.id;
                  return (
                    <div
                      key={it.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                        entry.forced
                          ? 'bg-amber-950/20 border-amber-700/50'
                          : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div
                        className="space-y-1 flex-1 cursor-pointer"
                        onClick={() => setSelectedItemId(it.id)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.forced && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-semibold">
                              <Flame className="w-3 h-3" />
                              Forçado Hoje
                            </span>
                          )}
                          <StatusBadge status={it.status_id} size="sm" />
                          <PriorityBadge priority={it.priority} size="sm" />
                          <span className="text-[10px] font-mono text-stone-500">
                            Score {entry.score}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-stone-100">{it.title}</h3>
                        <p className="text-[11px] text-stone-400">
                          Projeto: <strong className="text-stone-300">{it.project_title || 'Studio'}</strong> •
                          Restante: <strong className="text-amber-300">{entry.remainingMinutes}m</strong>
                          {entry.spansDays ? ' (Excede 1 jornada diária)' : ''}
                          {it.internal_due_at && (
                            <>
                              {' '}
                              • Prazo Interno:{' '}
                              <strong>{new Date(it.internal_due_at).toLocaleDateString('pt-BR')}</strong>
                            </>
                          )}
                        </p>
                        {entry.forced && it.urgency_reason && (
                          <p className="text-[11px] text-amber-300/90 italic">
                            Motivo da urgência: “{it.urgency_reason}”
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {board.viewer.isManager && entry.forced && (
                          <button
                            onClick={() => handleClearForce(it.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-[11px] text-stone-400 hover:text-stone-200"
                          >
                            Remover Urgência
                          </button>
                        )}
                        {isViewingSelf && !isRunning && (
                          <button
                            onClick={() => handleSession('start', it.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs transition"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Iniciar Foco</span>
                          </button>
                        )}
                        {isViewingSelf && it.status_id === 'in_progress' && (
                          <button
                            onClick={() => handleQuickSendToReview(it.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-200 hover:bg-purple-600/30 text-xs font-medium transition"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviar p/ QA</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. PRÓXIMAS — Agendadas nos Próximos Dias Úteis */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              <span>Próximos Dias Úteis ({board.upcoming.length})</span>
            </h2>

            {board.upcoming.length === 0 ? (
              <div className="p-6 rounded-2xl bg-stone-900/30 border border-stone-800/60 text-center text-xs text-stone-500">
                Nenhuma demanda excedente para os próximos dias.
              </div>
            ) : (
              <div className="space-y-2">
                {board.upcoming.map(entry => {
                  const it = entry.item;
                  return (
                    <div
                      key={it.id}
                      className="p-3.5 rounded-xl bg-stone-900/40 border border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div
                        className="space-y-1 cursor-pointer flex-1"
                        onClick={() => setSelectedItemId(it.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-950 border border-stone-800 text-stone-300">
                            Previsto: {entry.plannedDate}
                          </span>
                          <PriorityBadge priority={it.priority} size="sm" />
                          <span className="text-xs font-medium text-stone-100">{it.title}</span>
                        </div>
                        <p className="text-[11px] text-stone-400">
                          {it.project_title || 'Studio'} • Restante: {entry.remainingMinutes}m • Score{' '}
                          {entry.score}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {board.viewer.isManager && (
                          <button
                            onClick={() => setForceModalItem({ id: it.id, title: it.title })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/15 border border-amber-700/50 text-amber-300 hover:bg-amber-600/25 text-xs font-medium transition"
                          >
                            <Flame className="w-3.5 h-3.5" />
                            <span>Forçar Hoje</span>
                          </button>
                        )}
                        {isViewingSelf && (
                          <button
                            onClick={() => handleSession('start', it.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs text-stone-200"
                          >
                            <Play className="w-3 h-3" />
                            <span>Antecipar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. BLOQUEADOS & AGUARDANDO REVISÃO / CLIENTE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Itens Bloqueados ({board.blocked.length})</span>
              </h3>
              {board.blocked.length === 0 ? (
                <p className="text-xs text-stone-500 py-4">Nenhum item bloqueado.</p>
              ) : (
                board.blocked.map(b => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedItemId(b.id)}
                    className="p-3 rounded-xl bg-rose-950/20 border border-rose-800/50 cursor-pointer space-y-1"
                  >
                    <div className="text-xs font-medium text-stone-100">{b.title}</div>
                    <div className="text-[11px] text-rose-300">
                      Motivo: {b.blocked_reason || 'Aguardando insumo'}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Aguardando QA ou Cliente ({board.waiting.length})</span>
              </h3>
              {board.waiting.length === 0 ? (
                <p className="text-xs text-stone-500 py-4">Nenhum item aguardando terceiros.</p>
              ) : (
                board.waiting.map(w => (
                  <div
                    key={w.id}
                    onClick={() => setSelectedItemId(w.id)}
                    className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 cursor-pointer flex items-center justify-between gap-2"
                  >
                    <span className="text-xs text-stone-200 truncate">{w.title}</span>
                    <StatusBadge status={w.status_id} size="sm" />
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* Modal Forçar Hoje */}
      {forceModalItem && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setForceModalItem(null)}
        >
          <div
            className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Forçar Item para Hoje</span>
              </h3>
              <button onClick={() => setForceModalItem(null)} className="text-stone-500 hover:text-stone-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-400">
              Você está fixando <strong className="text-stone-200">{forceModalItem.title}</strong> no topo da fila
              de hoje. O sistema recalculará a capacidade e informará quais tarefas serão deslocadas.
            </p>
            <form onSubmit={handleConfirmForceToday} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Justificativa Executiva (5 a 300 caracteres)
                </label>
                <textarea
                  required
                  minLength={5}
                  maxLength={300}
                  rows={3}
                  value={forceReason}
                  onChange={e => setForceReason(e.target.value)}
                  placeholder="Ex: Reunião antecipada com o cliente para hoje às 17h"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setForceModalItem(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isForcing}
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs"
                >
                  {isForcing ? 'Aplicando...' : 'Confirmar Urgência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer de Detalhe */}
      <TaskDrawer
        itemId={selectedItemId}
        onClose={() => setSelectedItemId(null)}
        onUpdated={loadFocus}
      />
    </div>
  );
}
