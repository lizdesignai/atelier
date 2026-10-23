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
  Activity,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-atelier-grafite)]/12">
        <div>
          <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-[var(--tess-accent-text)]" />
            <span>Meu Focus — Mesa de Execução por Capacidade</span>
            <span className="text-xs font-roboto tabular-nums font-normal text-[var(--tess-accent-text)] px-2 py-0.5 rounded-full bg-[var(--tess-accent)]/15 border border-[var(--tess-accent)]/30">
              WSJF + Cronômetro Server
            </span>
          </h2>
          <p className="text-xs text-[var(--color-atelier-grafite)]/70 mt-1">
            Alocação diária real por minutos restantes, urgência e impacto — sem o limite artificial de 5 tarefas/dia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {board?.viewer.isManager && (
            <div className="flex items-center gap-1.5 tess-solid rounded-[1.5rem] px-3 py-1.5">
              <User className="w-3.5 h-3.5 text-[var(--tess-accent-text)]" />
              <select
                value={ownerFilter || board.target_owner_id}
                onChange={e => setOwnerFilter(e.target.value)}
                className="bg-transparent text-xs text-[var(--color-atelier-grafite)] focus:outline-none"
              >
                {board.members.map(m => (
                  <option key={m.id} value={m.id} className="tess-surface text-[var(--color-atelier-grafite)]">
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={loadFocus}
            className="p-2 tess-card text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)] transition"
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
              ? 'bg-[var(--tess-success)]/15 border-[var(--tess-success)]/30 text-[var(--tess-success)]'
              : 'bg-[var(--tess-danger)]/15 border-[var(--tess-danger)]/30 text-[var(--tess-danger)]'
          }`}
        >
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} className="underline text-[11px] ml-3">
            Fechar
          </button>
        </div>
      )}

      {isLoading && !board ? (
        <div className="py-20 text-center text-xs text-[var(--color-atelier-grafite)]/55">Calculando plano diário por capacidade...</div>
      ) : board ? (
        <>
          {/* Termômetro de Capacidade do Dia */}
          <div className="p-5 tess-card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-[var(--color-atelier-grafite)] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--tess-accent-text)]" />
                  <span>Orçamento de Capacidade de Hoje ({board.date})</span>
                </span>
                <p className="text-[11px] text-[var(--color-atelier-grafite)]/70">
                  Trabalhado hoje: <strong className="text-[var(--color-atelier-grafite)]">{board.worked_today_minutes}m</strong> •
                  Planejado para hoje: <strong className="text-[var(--tess-accent-text)]">{board.planned_minutes}m</strong> •
                  Capacidade restante: <strong className="text-[var(--color-atelier-grafite)]">{board.capacity_minutes}m</strong>
                </p>
              </div>

              {board.overload_minutes > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--tess-danger)]/15 border border-[var(--tess-danger)]/30 text-[var(--tess-danger)] text-xs font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--tess-danger)]" />
                  Sobrecarga de +{board.overload_minutes}m hoje
                </span>
              ) : (
                <span className="text-xs font-roboto tabular-nums text-[var(--tess-success)] bg-[var(--tess-success)]/10 border border-[var(--tess-success)]/30 px-2.5 py-1 rounded-full">
                  Carga Saudável ({usagePct}%)
                </span>
              )}
            </div>

            <div className="w-full h-2.5 rounded-full bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  board.overload_minutes > 0 ? 'bg-[var(--tess-danger)]' : 'bg-gradient-to-r from-[var(--tess-accent)] to-[var(--tess-success)]'
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>

          {/* 1. AGORA — Sessão de Trabalho Ativa no Servidor */}
          {board.active_session && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[var(--tess-accent)]/10 via-[var(--panel-bg)] to-[var(--panel-bg)] border border-[var(--tess-accent)]/50 shadow-xl shadow-[var(--tess-accent)]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--tess-accent)] text-[var(--tess-on-accent)] text-[10px] font-bold uppercase tracking-[0.18em]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-atelier-creme)] animate-ping" />
                    Em Foco Agora
                  </span>
                  <span className="text-sm font-roboto tabular-nums font-semibold text-[var(--tess-accent-text)]">
                    {formatTimer(liveSeconds)}
                  </span>
                </div>
                <h2
                  onClick={() => setSelectedItemId(board.active_session!.work_item_id)}
                  className="text-base font-semibold text-[var(--color-atelier-grafite)] hover:text-[var(--tess-accent-text)] cursor-pointer transition"
                >
                  {board.active_session.item_title || 'Item em execução'}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setSelectedItemId(board.active_session!.work_item_id)}
                  className="px-3 py-1.5 rounded-xl bg-[var(--color-atelier-grafite)]/[0.07] hover:bg-[var(--color-atelier-grafite)]/[0.12] text-xs text-[var(--color-atelier-grafite)] transition"
                >
                  Abrir Detalhes
                </button>
                {isViewingSelf && (
                  <>
                    <button
                      onClick={() => handleQuickSendToReview(board.active_session!.work_item_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-semibold text-xs transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar p/ QA</span>
                    </button>
                    <button
                      onClick={() => handleSession('stop')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs transition"
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
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tess-accent-text)] flex items-center gap-2">
                <span>Fila de Hoje ({board.today.length})</span>
              </h2>
              <span className="text-[11px] text-[var(--color-atelier-grafite)]/55">
                Ordenado por Urgência do Gestor → Índice WSJF (Prazo + Prioridade / Minutos Restantes)
              </span>
            </div>

            {board.today.length === 0 ? (
              <div className="p-8 tess-card text-center text-xs text-[var(--color-atelier-grafite)]/55">
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
                          ? 'bg-[var(--tess-accent)]/10 border-[var(--tess-accent)]/30'
                          : 'tess-surface border-[var(--color-atelier-grafite)]/12 hover:border-[var(--color-atelier-grafite)]/25'
                      }`}
                    >
                      <div
                        className="space-y-1 flex-1 cursor-pointer"
                        onClick={() => setSelectedItemId(it.id)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.forced && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--tess-accent)]/20 border border-[var(--tess-accent)]/40 text-[var(--tess-accent-text)] text-[10px] font-semibold">
                              <Flame className="w-3 h-3" />
                              Forçado Hoje
                            </span>
                          )}
                          <StatusBadge status={it.status_id} size="sm" />
                          <PriorityBadge priority={it.priority} size="sm" />
                          <span className="text-[10px] font-roboto tabular-nums text-[var(--color-atelier-grafite)]/55">
                            Score {entry.score}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-[var(--color-atelier-grafite)]">{it.title}</h3>
                        <p className="text-[11px] text-[var(--color-atelier-grafite)]/70">
                          Projeto: <strong className="text-[var(--color-atelier-grafite)]/85">{it.project_title || 'Studio'}</strong> •
                          Restante: <strong className="text-[var(--tess-accent-text)]">{entry.remainingMinutes}m</strong>
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
                          <p className="text-[11px] text-[var(--tess-accent-text)] italic">
                            Motivo da urgência: “{it.urgency_reason}”
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {board.viewer.isManager && entry.forced && (
                          <button
                            onClick={() => handleClearForce(it.id)}
                            className="px-2.5 py-1.5 tess-card text-[11px] text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]"
                          >
                            Remover Urgência
                          </button>
                        )}
                        {isViewingSelf && !isRunning && (
                          <button
                            onClick={() => handleSession('start', it.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--tess-accent)] hover:bg-[var(--tess-accent-hover)] text-[var(--tess-on-accent)] font-semibold text-xs transition"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Iniciar Foco</span>
                          </button>
                        )}
                        {isViewingSelf && it.status_id === 'in_progress' && (
                          <button
                            onClick={() => handleQuickSendToReview(it.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--tess-review)]/20 border border-[var(--tess-review)]/40 text-[var(--tess-review)] hover:bg-[var(--tess-review)]/30 text-xs font-medium transition"
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
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-atelier-grafite)]/70 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[var(--color-atelier-grafite)]/55" />
              <span>Próximos Dias Úteis ({board.upcoming.length})</span>
            </h2>

            {board.upcoming.length === 0 ? (
              <div className="p-6 tess-card text-center text-xs text-[var(--color-atelier-grafite)]/55">
                Nenhuma demanda excedente para os próximos dias.
              </div>
            ) : (
              <div className="space-y-2">
                {board.upcoming.map(entry => {
                  const it = entry.item;
                  return (
                    <div
                      key={it.id}
                      className="p-3.5 tess-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div
                        className="space-y-1 cursor-pointer flex-1"
                        onClick={() => setSelectedItemId(it.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-roboto tabular-nums px-2 py-0.5 rounded bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 text-[var(--color-atelier-grafite)]/85">
                            Previsto: {entry.plannedDate}
                          </span>
                          <PriorityBadge priority={it.priority} size="sm" />
                          <span className="text-xs font-medium text-[var(--color-atelier-grafite)]">{it.title}</span>
                        </div>
                        <p className="text-[11px] text-[var(--color-atelier-grafite)]/70">
                          {it.project_title || 'Studio'} • Restante: {entry.remainingMinutes}m • Score{' '}
                          {entry.score}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {board.viewer.isManager && (
                          <button
                            onClick={() => setForceModalItem({ id: it.id, title: it.title })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--tess-accent)]/15 border border-[var(--tess-accent)]/30 text-[var(--tess-accent-text)] hover:bg-[var(--tess-accent)]/25 text-xs font-medium transition"
                          >
                            <Flame className="w-3.5 h-3.5" />
                            <span>Forçar Hoje</span>
                          </button>
                        )}
                        {isViewingSelf && (
                          <button
                            onClick={() => handleSession('start', it.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--color-atelier-grafite)]/[0.07] hover:bg-[var(--color-atelier-grafite)]/[0.12] text-xs text-[var(--color-atelier-grafite)]"
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
            <div className="p-4 tess-card space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tess-danger)] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Itens Bloqueados ({board.blocked.length})</span>
              </h3>
              {board.blocked.length === 0 ? (
                <p className="text-xs text-[var(--color-atelier-grafite)]/55 py-4">Nenhum item bloqueado.</p>
              ) : (
                board.blocked.map(b => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedItemId(b.id)}
                    className="p-3 rounded-xl bg-[var(--tess-danger)]/10 border border-[var(--tess-danger)]/30 cursor-pointer space-y-1"
                  >
                    <div className="text-xs font-medium text-[var(--color-atelier-grafite)]">{b.title}</div>
                    <div className="text-[11px] text-[var(--tess-danger)]">
                      Motivo: {b.blocked_reason || 'Aguardando insumo'}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 tess-card space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tess-review)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Aguardando QA ou Cliente ({board.waiting.length})</span>
              </h3>
              {board.waiting.length === 0 ? (
                <p className="text-xs text-[var(--color-atelier-grafite)]/55 py-4">Nenhum item aguardando terceiros.</p>
              ) : (
                board.waiting.map(w => (
                  <div
                    key={w.id}
                    onClick={() => setSelectedItemId(w.id)}
                    className="p-3 rounded-xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-grafite)]/12 cursor-pointer flex items-center justify-between gap-2"
                  >
                    <span className="text-xs text-[var(--color-atelier-grafite)] truncate">{w.title}</span>
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
          className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setForceModalItem(null)}
        >
          <div
            className="w-full max-w-md tess-solid rounded-[2rem] p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-atelier-grafite)] flex items-center gap-2">
                <Flame className="w-4 h-4 text-[var(--tess-accent-text)]" />
                <span>Forçar Item para Hoje</span>
              </h3>
              <button onClick={() => setForceModalItem(null)} className="text-[var(--color-atelier-grafite)]/55 hover:text-[var(--color-atelier-grafite)]/85">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--color-atelier-grafite)]/70">
              Você está fixando <strong className="text-[var(--color-atelier-grafite)]">{forceModalItem.title}</strong> no topo da fila
              de hoje. O sistema recalculará a capacidade e informará quais tarefas serão deslocadas.
            </p>
            <form onSubmit={handleConfirmForceToday} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/85 mb-1">
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
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 text-xs text-[var(--color-atelier-grafite)]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setForceModalItem(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isForcing}
                  className="px-4 py-1.5 rounded-xl bg-[var(--tess-accent)] hover:bg-[var(--tess-accent-hover)] text-[var(--tess-on-accent)] font-semibold text-xs"
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
