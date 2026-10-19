// src/components/tessera/TaskDrawer.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Play,
  Square,
  Lock,
  Unlock,
  CheckSquare,
  MessageSquare,
  History,
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Save,
  Link2,
  RotateCcw,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { CANONICAL_STATUSES } from '@/lib/tessera/stateMachine';
import type { WorkItemPriority, WorkItemStatus, WorkItemType } from '@/lib/tessera/types';
import type { WorkItemDetail } from '@/lib/tessera/workTypes';
import type { OrgMember, OrgProject } from '@/lib/tessera/itemQueries';

interface TaskDrawerProps {
  itemId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

type DrawerDetailResponse = WorkItemDetail & {
  members: OrgMember[];
  projects: OrgProject[];
};

const REASON_LABELS: Record<string, string> = {
  info: 'Informação Incorreta / Briefing',
  text: 'Ajuste de Copy / Texto',
  visual: 'Direção Visual / Estética',
  offer: 'Oferta / CTA / Estratégia',
  other: 'Outro Motivo',
};

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ itemId, onClose, onUpdated }) => {
  const [data, setData] = useState<DrawerDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'comments' | 'history'>('overview');

  // Form states for overview
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [type, setType] = useState<WorkItemType>('task');
  const [priority, setPriority] = useState<WorkItemPriority>('medium');
  const [ownerId, setOwnerId] = useState<string>('');
  const [reviewerId, setReviewerId] = useState<string>('');
  const [dueAt, setDueAt] = useState<string>('');
  const [internalDueAt, setInternalDueAt] = useState<string>('');
  const [estimateMinutes, setEstimateMinutes] = useState<number>(60);
  const [remainingMinutes, setRemainingMinutes] = useState<string>('');
  const [clientVisible, setClientVisible] = useState<boolean>(false);
  const [deliverables, setDeliverables] = useState<Array<{ label: string; url: string }>>([]);
  const [newDelivLabel, setNewDelivLabel] = useState('');
  const [newDelivUrl, setNewDelivUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Block modal/inline state
  const [showBlockInput, setShowBlockInput] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  // QA review inline state
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectCategory, setRejectCategory] = useState('visual');
  const [rejectComment, setRejectComment] = useState('');

  // Checklist & Comment inputs
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newCommentBody, setNewCommentBody] = useState('');

  // Live timer tick
  const [liveElapsed, setLiveElapsed] = useState<number>(0);

  const notify = (type: 'ok' | 'err', text: string) => {
    setBannerMsg({ type, text });
    setTimeout(() => setBannerMsg(null), 4500);
  };

  const loadDetail = useCallback(async () => {
    if (!itemId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tessera/work-items/${itemId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar item.');
      const d = json as DrawerDetailResponse;
      setData(d);
      setTitle(d.item.title || '');
      setDescription(d.item.description || '');
      setAcceptanceCriteria(d.item.acceptance_criteria || '');
      setType(d.item.type);
      setPriority(d.item.priority);
      setOwnerId(d.item.owner_id || '');
      setReviewerId(d.item.reviewer_id || '');
      setDueAt(toDateInputValue(d.item.due_at));
      setInternalDueAt(toDateInputValue(d.item.internal_due_at));
      setEstimateMinutes(d.item.estimate_minutes || 60);
      setRemainingMinutes(
        d.item.remaining_estimate_minutes !== null && d.item.remaining_estimate_minutes !== undefined
          ? String(d.item.remaining_estimate_minutes)
          : '',
      );
      setClientVisible(Boolean(d.item.client_visible));
      const delivs = Array.isArray((d.item.metadata as any)?.deliverables)
        ? (d.item.metadata as any).deliverables
        : [];
      setDeliverables(delivs);
      setLiveElapsed(d.sessions.open?.elapsed_seconds || 0);
    } catch (err: any) {
      setError(err.message || 'Erro de comunicação.');
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    if (itemId) {
      loadDetail();
      setShowBlockInput(false);
      setShowRejectForm(false);
    } else {
      setData(null);
    }
  }, [itemId, loadDetail]);

  useEffect(() => {
    if (!data?.sessions.open) return;
    const interval = setInterval(() => {
      setLiveElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [data?.sessions.open]);

  if (!itemId) return null;

  const handleSaveFields = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setIsSaving(true);
    try {
      const patch: Record<string, any> = {
        version: data.item.version,
        description: description.trim() || null,
        remaining_estimate_minutes: remainingMinutes === '' ? null : Number(remainingMinutes),
        metadata: {
          ...(data.item.metadata || {}),
          deliverables,
        },
      };

      if (data.permissions.canEditAll) {
        patch.title = title.trim();
        patch.type = type;
        patch.priority = priority;
        patch.owner_id = ownerId || null;
        patch.reviewer_id = reviewerId || null;
        patch.due_at = dueAt ? new Date(`${dueAt}T18:00:00.000Z`).toISOString() : null;
        patch.internal_due_at = internalDueAt ? new Date(`${internalDueAt}T18:00:00.000Z`).toISOString() : null;
        patch.estimate_minutes = Number(estimateMinutes);
        patch.acceptance_criteria = acceptanceCriteria.trim() || null;
        patch.client_visible = clientVisible;
      }

      const res = await fetch(`/api/tessera/work-items/${data.item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar alterações.');
      notify('ok', 'Alterações salvas com sucesso.');
      await loadDetail();
      onUpdated?.();
    } catch (err: any) {
      notify('err', err.message || 'Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDeliverable = () => {
    const url = newDelivUrl.trim();
    if (!url) return;
    const label = newDelivLabel.trim() || url;
    setDeliverables(prev => [...prev, { label, url }]);
    setNewDelivLabel('');
    setNewDelivUrl('');
  };

  const handleRemoveDeliverable = (idx: number) => {
    setDeliverables(prev => prev.filter((_, i) => i !== idx));
  };

  const handleTransition = async (toStatus: WorkItemStatus) => {
    if (!data) return;
    try {
      const res = await fetch(`/api/tessera/work-items/${data.item.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_status: toStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Transição não permitida.');
      notify('ok', 'Status atualizado.');
      await loadDetail();
      onUpdated?.();
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleToggleBlock = async (blocked: boolean) => {
    if (!data) return;
    try {
      const res = await fetch(`/api/tessera/work-items/${data.item.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked, reason: blocked ? blockReason : null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Não foi possível alterar bloqueio.');
      setShowBlockInput(false);
      setBlockReason('');
      notify('ok', blocked ? 'Item marcado como bloqueado.' : 'Bloqueio removido.');
      await loadDetail();
      onUpdated?.();
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleSessionToggle = async (action: 'start' | 'stop') => {
    if (!data) return;
    try {
      const res = await fetch('/api/tessera/focus/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, work_item_id: data.item.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao controlar sessão.');
      notify('ok', action === 'start' ? 'Cronômetro iniciado no servidor.' : 'Sessão encerrada e tempo contabilizado.');
      await loadDetail();
      onUpdated?.();
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleReviewDecision = async (decision: 'approved' | 'request_changes') => {
    if (!data) return;
    try {
      const res = await fetch(`/api/tessera/reviews/${data.item.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reason_category: decision === 'request_changes' ? rejectCategory : undefined,
          comment: decision === 'request_changes' ? rejectComment : 'Aprovado em revisão de QA',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const extra = Array.isArray(json.details) ? ` (${json.details.join(' ')})` : '';
        throw new Error((json.error || 'Erro ao registrar decisão.') + extra);
      }
      setShowRejectForm(false);
      setRejectComment('');
      if (json.exceeded_revision_limit) {
        notify('err', `Ajustes solicitados (Rodada ${json.revision_round}/${json.max_revision_rounds} — limite de revisões excedido!).`);
      } else {
        notify('ok', decision === 'approved' ? 'Item aprovado no QA!' : 'Pedido de ajustes enviado ao responsável.');
      }
      await loadDetail();
      onUpdated?.();
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !newChecklistTitle.trim()) return;
    try {
      const res = await fetch(`/api/tessera/work-items/${data.item.id}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newChecklistTitle.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao adicionar checklist.');
      setNewChecklistTitle('');
      await loadDetail();
      onUpdated?.();
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleToggleChecklist = async (checklistId: string, isCompleted: boolean) => {
    if (!data) return;
    try {
      const res = await fetch(`/api/tessera/work-items/${data.item.id}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist_id: checklistId, is_completed: isCompleted }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao atualizar checklist.');
      await loadDetail();
      onUpdated?.();
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!data) return;
    try {
      const res = await fetch(`/api/tessera/work-items/${data.item.id}/checklist?checklist_id=${checklistId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Erro ao remover item.');
      }
      await loadDetail();
      onUpdated?.();
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !newCommentBody.trim()) return;
    try {
      const res = await fetch(`/api/tessera/work-items/${data.item.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newCommentBody.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao publicar comentário.');
      setNewCommentBody('');
      await loadDetail();
    } catch (err: any) {
      notify('err', err.message);
    }
  };

  const currentStatusDef = data ? CANONICAL_STATUSES[data.item.status_id] : null;
  const allowedNextStatuses = (currentStatusDef?.allowedNext || []).filter(st => {
    if (!data) return false;
    // Se está em internal_review, avanço para client_approval/scheduled/done usa o painel de decisão QA
    if (data.item.status_id === 'internal_review' && ['client_approval', 'scheduled', 'done'].includes(st)) {
      return false;
    }
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-[100000] flex justify-end bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[var(--color-atelier-creme)] border-l border-[var(--color-atelier-grafite)]/12 h-full flex flex-col  overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="px-6 py-4 border-b border-[var(--color-atelier-grafite)]/12 tess-surface flex items-center justify-between gap-3">
          {data ? (
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={data.item.status_id} />
              <PriorityBadge priority={data.item.priority} size="sm" />
              <span className="text-[10px] font-roboto tabular-nums uppercase px-2 py-0.5 rounded tess-surface border border-[var(--color-atelier-grafite)]/12 text-[var(--color-atelier-grafite)]/70">
                {data.item.type}
              </span>
              <span className="text-[10px] font-roboto tabular-nums text-[var(--color-atelier-grafite)]/55">v{data.item.version}</span>
            </div>
          ) : (
            <div className="text-xs text-[var(--color-atelier-grafite)]/70">Carregando detalhes...</div>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-grafite)]/[0.10] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {bannerMsg && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
              bannerMsg.type === 'ok'
                ? 'bg-[var(--tess-success)]/15 border-[var(--tess-success)]/30 text-[var(--tess-success)]'
                : 'bg-[var(--tess-danger)]/15 border-[var(--tess-danger)]/30 text-[var(--tess-danger)]'
            }`}
          >
            <span>{bannerMsg.text}</span>
            <button onClick={() => setBannerMsg(null)} className="text-[10px] underline ml-3">
              Fechar
            </button>
          </div>
        )}

        {isLoading && !data ? (
          <div className="flex-1 flex items-center justify-center text-xs text-[var(--color-atelier-grafite)]/55">
            Carregando item de trabalho...
          </div>
        ) : error ? (
          <div className="p-6 text-xs text-[var(--tess-danger)]">{error}</div>
        ) : data ? (
          <>
            {/* Barra de Sessão / Cronômetro Autoritativo & Ações Rápidas */}
            <div className="px-6 py-3 tess-surface border-b border-[var(--color-atelier-grafite)]/12 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-atelier-grafite)]/85">
                  <Clock className="w-4 h-4 text-[var(--tess-accent-text)]" />
                  <span>
                    Executado: <strong>{data.sessions.total_minutes}m</strong> / Est.{' '}
                    <strong>{data.item.estimate_minutes}m</strong>
                  </span>
                </div>
                {data.sessions.open && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--tess-accent)]/15 border border-[var(--tess-accent)]/40 text-[var(--tess-accent-text)] text-xs font-roboto tabular-nums">
                    <span className="w-2 h-2 rounded-full bg-[var(--tess-accent)] animate-ping" />
                    {formatDuration(liveElapsed)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {data.sessions.open ? (
                  <button
                    onClick={() => handleSessionToggle('stop')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs transition"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Parar Cronômetro</span>
                  </button>
                ) : (
                  ['ready', 'in_progress'].includes(data.item.status_id) &&
                  !data.item.blocked_at && (
                    <button
                      onClick={() => handleSessionToggle('start')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--tess-accent)] hover:bg-[var(--tess-accent-hover)] text-[var(--tess-on-accent)] font-semibold text-xs transition"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Iniciar Foco</span>
                    </button>
                  )
                )}

                {data.permissions.canEdit && !['done', 'canceled'].includes(data.item.status_id) && (
                  <button
                    onClick={() =>
                      data.item.blocked_at ? handleToggleBlock(false) : setShowBlockInput(prev => !prev)
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                      data.item.blocked_at
                        ? 'bg-[var(--tess-success)]/10 border-[var(--tess-success)]/30 text-[var(--tess-success)] hover:bg-[var(--tess-success)]/20'
                        : 'tess-surface border-[var(--color-atelier-grafite)]/12 text-[var(--color-atelier-grafite)]/85 hover:bg-[var(--color-atelier-grafite)]/[0.10]'
                    }`}
                  >
                    {data.item.blocked_at ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Desbloquear</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Bloquear</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Banner de Bloqueio Ativo ou Formulário de Bloqueio */}
            {data.item.blocked_at && (
              <div className="px-6 py-3 bg-[var(--tess-danger)]/10 border-b border-[var(--tess-danger)]/30 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[var(--tess-danger)] shrink-0 mt-0.5" />
                <div className="text-xs text-[var(--tess-danger)]">
                  <strong>Item Bloqueado:</strong> {data.item.blocked_reason || 'Sem motivo detalhado.'}
                </div>
              </div>
            )}

            {showBlockInput && !data.item.blocked_at && (
              <div className="px-6 py-3 tess-surface border-b border-[var(--color-atelier-grafite)]/12 space-y-2">
                <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/85">
                  Qual o motivo do bloqueio? (mínimo 3 caracteres)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={blockReason}
                    onChange={e => setBlockReason(e.target.value)}
                    placeholder="Ex: Aguardando envio de logo vetorizada pelo cliente"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 text-xs text-[var(--color-atelier-grafite)]"
                  />
                  <button
                    onClick={() => handleToggleBlock(true)}
                    className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs"
                  >
                    Confirmar Bloqueio
                  </button>
                </div>
              </div>
            )}

            {/* Painel de Decisão de Revisão QA (quando em internal_review e gestor) */}
            {data.permissions.canReview && (
              <div className="px-6 py-3.5 bg-[var(--tess-review)]/10 border-b border-[var(--tess-review)]/30 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-[var(--tess-review)]">
                      Decisão de Qualidade (QA Interno)
                    </span>
                    <p className="text-[11px] text-[var(--tess-review)]">
                      Destino ao aprovar:{' '}
                      <strong>{data.item.client_visible ? 'Aprovação do Cliente' : 'Concluído'}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewDecision('approved')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Aprovar QA</span>
                    </button>
                    <button
                      onClick={() => setShowRejectForm(prev => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--tess-accent)]/20 border border-[var(--tess-accent)]/50 text-[var(--tess-accent-text)] hover:bg-[var(--tess-accent)]/30 font-medium text-xs transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Pedir Ajustes</span>
                    </button>
                  </div>
                </div>

                {showRejectForm && (
                  <div className="p-3 rounded-xl bg-[var(--color-atelier-creme)]/90 border border-[var(--tess-review)]/30 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-[var(--color-atelier-grafite)]/70 mb-1">Categoria do Ajuste</label>
                        <select
                          value={rejectCategory}
                          onChange={e => setRejectCategory(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg tess-surface border border-[var(--color-atelier-grafite)]/12 text-xs text-[var(--color-atelier-grafite)]"
                        >
                          {Object.entries(REASON_LABELS).map(([k, label]) => (
                            <option key={k} value={k}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--color-atelier-grafite)]/70 mb-1">
                        Orientação clara para o responsável
                      </label>
                      <textarea
                        rows={2}
                        value={rejectComment}
                        onChange={e => setRejectComment(e.target.value)}
                        placeholder="Descreva o que precisa ser corrigido antes de liberar..."
                        className="w-full px-3 py-2 rounded-lg tess-surface border border-[var(--color-atelier-grafite)]/12 text-xs text-[var(--color-atelier-grafite)]"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(false)}
                        className="px-3 py-1 rounded-lg text-xs text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewDecision('request_changes')}
                        className="px-3.5 py-1.5 rounded-lg bg-[var(--tess-accent)] hover:bg-[var(--tess-accent-hover)] text-[var(--tess-on-accent)] font-semibold text-xs"
                      >
                        Enviar para Ajuste
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transições de Status Disponíveis */}
            {data.permissions.canTransition && allowedNextStatuses.length > 0 && (
              <div className="px-6 py-2.5 bg-[var(--color-atelier-creme)] border-b border-[var(--color-atelier-grafite)]/12 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-[var(--color-atelier-grafite)]/55 mr-1">Mover para:</span>
                {allowedNextStatuses.map(st => (
                  <button
                    key={st}
                    onClick={() => handleTransition(st)}
                    className="px-2.5 py-1 rounded-lg tess-surface hover:bg-[var(--color-atelier-grafite)]/[0.10] border border-[var(--color-atelier-grafite)]/12 text-xs text-[var(--color-atelier-grafite)] transition"
                  >
                    {CANONICAL_STATUSES[st]?.label || st}
                  </button>
                ))}
              </div>
            )}

            {/* Abas */}
            <div className="px-6 border-b border-[var(--color-atelier-grafite)]/12 flex items-center gap-5 bg-[var(--color-atelier-creme)]">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'overview'
                    ? 'border-[var(--tess-accent)] text-[var(--tess-accent-text)]'
                    : 'border-transparent text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Campos & Entregáveis</span>
              </button>
              <button
                onClick={() => setActiveTab('checklist')}
                className={`py-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'checklist'
                    ? 'border-[var(--tess-accent)] text-[var(--tess-accent-text)]'
                    : 'border-transparent text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>
                  Checklist ({data.checklist.filter(c => c.is_completed).length}/{data.checklist.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`py-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'comments'
                    ? 'border-[var(--tess-accent)] text-[var(--tess-accent-text)]'
                    : 'border-transparent text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Comentários & QA ({data.comments.length + data.reviews.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'border-[var(--tess-accent)] text-[var(--tess-accent-text)]'
                    : 'border-transparent text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Histórico ({data.history.length})</span>
              </button>
            </div>

            {/* Conteúdo da Aba */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'overview' && (
                <form onSubmit={handleSaveFields} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/70 mb-1">Título</label>
                    <input
                      type="text"
                      disabled={!data.permissions.canEditAll}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2 tess-card text-sm text-[var(--color-atelier-grafite)] disabled:opacity-60"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/70 mb-1">Tipo</label>
                      <select
                        disabled={!data.permissions.canEditAll}
                        value={type}
                        onChange={e => setType(e.target.value as WorkItemType)}
                        className="w-full px-3 py-2 tess-card text-xs text-[var(--color-atelier-grafite)] disabled:opacity-60"
                      >
                        <option value="task">Tarefa</option>
                        <option value="deliverable">Entregável</option>
                        <option value="gate">Gate / Marco</option>
                        <option value="initiative">Iniciativa</option>
                        <option value="subtask">Subtarefa</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/70 mb-1">Prioridade</label>
                      <select
                        disabled={!data.permissions.canEditAll}
                        value={priority}
                        onChange={e => setPriority(e.target.value as WorkItemPriority)}
                        className="w-full px-3 py-2 tess-card text-xs text-[var(--color-atelier-grafite)] disabled:opacity-60"
                      >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/70 mb-1">Projeto</label>
                      <div className="px-3 py-2 tess-card text-xs text-[var(--color-atelier-grafite)]/85 truncate">
                        {data.item.project_title || 'Interno / Studio'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/70 mb-1">Responsável (Owner)</label>
                      <select
                        disabled={!data.permissions.canEditAll}
                        value={ownerId}
                        onChange={e => setOwnerId(e.target.value)}
                        className="w-full px-3 py-2 tess-card text-xs text-[var(--color-atelier-grafite)] disabled:opacity-60"
                      >
                        <option value="">Sem responsável (Inbox)</option>
                        {data.members.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/70 mb-1">Revisor QA</label>
                      <select
                        disabled={!data.permissions.canEditAll}
                        value={reviewerId}
                        onChange={e => setReviewerId(e.target.value)}
                        className="w-full px-3 py-2 tess-card text-xs text-[var(--color-atelier-grafite)] disabled:opacity-60"
                      >
                        <option value="">Qualquer Gestor</option>
                        {data.members
                          .filter(m => m.role === 'admin' || m.role === 'gestor')
                          .map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/70 mb-1">Prazo Interno</label>
                      <input
                        type="date"
                        disabled={!data.permissions.canEditAll}
                        value={internalDueAt}
                        onChange={e => setInternalDueAt(e.target.value)}
                        className="w-full px-2.5 py-2 tess-card text-xs text-[var(--color-atelier-grafite)] disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/70 mb-1">Prazo Cliente</label>
                      <input
                        type="date"
                        disabled={!data.permissions.canEditAll}
                        value={dueAt}
                        onChange={e => setDueAt(e.target.value)}
                        className="w-full px-2.5 py-2 tess-card text-xs text-[var(--color-atelier-grafite)] disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/70 mb-1">Estimado (min)</label>
                      <input
                        type="number"
                        min={5}
                        max={2400}
                        disabled={!data.permissions.canEditAll}
                        value={estimateMinutes}
                        onChange={e => setEstimateMinutes(Number(e.target.value))}
                        className="w-full px-3 py-2 tess-card text-xs text-[var(--color-atelier-grafite)] disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/70 mb-1">Restante (min)</label>
                      <input
                        type="number"
                        min={0}
                        max={2400}
                        disabled={!data.permissions.canEdit}
                        value={remainingMinutes}
                        onChange={e => setRemainingMinutes(e.target.value)}
                        placeholder="Automático"
                        className="w-full px-3 py-2 tess-card text-xs text-[var(--color-atelier-grafite)] disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id="client_visible_chk"
                      type="checkbox"
                      disabled={!data.permissions.canEditAll}
                      checked={clientVisible}
                      onChange={e => setClientVisible(e.target.checked)}
                      className="rounded border-[var(--color-atelier-grafite)]/20 tess-surface text-[var(--tess-accent-text)]"
                    />
                    <label htmlFor="client_visible_chk" className="text-xs text-[var(--color-atelier-grafite)]/85">
                      Visível para aprovação externa do cliente após QA Interno
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/70 mb-1">Descrição / Contexto</label>
                    <textarea
                      rows={3}
                      disabled={!data.permissions.canEdit}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Instruções, referências e contexto de execução..."
                      className="w-full px-3.5 py-2 tess-card text-xs text-[var(--color-atelier-grafite)] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--color-atelier-grafite)]/70 mb-1">
                      Critérios de Aceite (Definition of Done)
                    </label>
                    <textarea
                      rows={2}
                      disabled={!data.permissions.canEditAll}
                      value={acceptanceCriteria}
                      onChange={e => setAcceptanceCriteria(e.target.value)}
                      placeholder="O que é obrigatório conferir antes de aprovar no QA..."
                      className="w-full px-3.5 py-2 tess-card text-xs text-[var(--color-atelier-grafite)] disabled:opacity-60"
                    />
                  </div>

                  {/* Entregáveis (Links) */}
                  <div className="p-4 tess-card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--color-atelier-grafite)] flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-[var(--tess-accent-text)]" />
                        <span>Entregáveis & Links ({deliverables.length})</span>
                      </span>
                      {type === 'deliverable' && deliverables.length === 0 && (
                        <span className="text-[11px] text-[var(--tess-accent-text)]">
                          Obrigatório anexar ao menos 1 link antes de enviar ao QA
                        </span>
                      )}
                    </div>

                    {deliverables.length > 0 && (
                      <div className="space-y-1.5">
                        {deliverables.map((d, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 text-xs"
                          >
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--tess-accent-text)] hover:underline flex items-center gap-1.5 truncate"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{d.label || d.url}</span>
                            </a>
                            {data.permissions.canEdit && (
                              <button
                                type="button"
                                onClick={() => handleRemoveDeliverable(idx)}
                                className="text-[var(--color-atelier-grafite)]/55 hover:text-[var(--tess-danger)]"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {data.permissions.canEdit && (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={newDelivLabel}
                          onChange={e => setNewDelivLabel(e.target.value)}
                          placeholder="Rótulo (ex: Figma v1)"
                          className="sm:col-span-4 px-2.5 py-1.5 rounded-lg bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 text-xs text-[var(--color-atelier-grafite)]"
                        />
                        <input
                          type="url"
                          value={newDelivUrl}
                          onChange={e => setNewDelivUrl(e.target.value)}
                          placeholder="https://..."
                          className="sm:col-span-6 px-2.5 py-1.5 rounded-lg bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/12 text-xs text-[var(--color-atelier-grafite)]"
                        />
                        <button
                          type="button"
                          onClick={handleAddDeliverable}
                          className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-[var(--color-atelier-grafite)]/[0.07] hover:bg-[var(--color-atelier-grafite)]/[0.12] text-xs text-[var(--color-atelier-grafite)] font-medium"
                        >
                          Anexar
                        </button>
                      </div>
                    )}
                  </div>

                  {data.permissions.canEdit && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--tess-accent)] hover:bg-[var(--tess-accent-hover)] text-[var(--tess-on-accent)] font-semibold text-xs transition disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                      </button>
                    </div>
                  )}
                </form>
              )}

              {activeTab === 'checklist' && (
                <div className="space-y-4">
                  {data.permissions.canEdit && (
                    <form onSubmit={handleAddChecklist} className="flex gap-2">
                      <input
                        type="text"
                        value={newChecklistTitle}
                        onChange={e => setNewChecklistTitle(e.target.value)}
                        placeholder="Adicionar item de verificação (obrigatório concluir antes do QA)..."
                        className="flex-1 px-3.5 py-2 tess-card text-xs text-[var(--color-atelier-grafite)]"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--tess-accent)] hover:bg-[var(--tess-accent-hover)] text-[var(--tess-on-accent)] font-semibold text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </form>
                  )}

                  {data.checklist.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[var(--color-atelier-grafite)]/55">
                      Nenhum item de checklist cadastrado para esta tarefa.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.checklist.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 p-3 tess-card"
                        >
                          <label className="flex items-center gap-2.5 text-xs text-[var(--color-atelier-grafite)] cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              disabled={!data.permissions.canEdit}
                              checked={item.is_completed}
                              onChange={e => handleToggleChecklist(item.id, e.target.checked)}
                              className="rounded border-[var(--color-atelier-grafite)]/20 bg-[var(--color-atelier-creme)] text-[var(--tess-accent-text)]"
                            />
                            <span className={item.is_completed ? 'line-through text-[var(--color-atelier-grafite)]/55' : ''}>
                              {item.title}
                            </span>
                          </label>
                          {data.permissions.canEdit && (
                            <button
                              onClick={() => handleDeleteChecklist(item.id)}
                              className="p-1 text-[var(--color-atelier-grafite)]/55 hover:text-[var(--tess-danger)] transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="space-y-5">
                  {data.reviews.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tess-review)]">
                        Pareceres de Revisão QA ({data.reviews.length})
                      </h4>
                      {data.reviews.map(r => (
                        <div
                          key={r.id}
                          className={`p-3 rounded-xl border text-xs space-y-1 ${
                            r.decision === 'approved'
                              ? 'bg-[var(--tess-success)]/10 border-[var(--tess-success)]/30 text-[var(--tess-success)]'
                              : 'bg-[var(--tess-accent)]/10 border-[var(--tess-accent)]/30 text-[var(--tess-accent-text)]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <strong>
                              Rodada #{r.round_number} •{' '}
                              {r.decision === 'approved' ? 'Aprovado' : 'Ajustes Solicitados'}
                              {r.reason_category ? ` (${REASON_LABELS[r.reason_category] || r.reason_category})` : ''}
                            </strong>
                            <span className=" opacity-75">
                              {r.reviewer_name || 'Gestor'} •{' '}
                              {new Date(r.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          {r.feedback_comment && <p className="text-[var(--color-atelier-grafite)]">{r.feedback_comment}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleAddComment} className="space-y-2">
                    <textarea
                      rows={2}
                      value={newCommentBody}
                      onChange={e => setNewCommentBody(e.target.value)}
                      placeholder="Escreva um comentário ou atualização sobre este item..."
                      className="w-full px-3.5 py-2 tess-card text-xs text-[var(--color-atelier-grafite)]"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--tess-accent)] hover:bg-[var(--tess-accent-hover)] text-[var(--tess-on-accent)] font-semibold text-xs"
                      >
                        Publicar Comentário
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2.5">
                    {data.comments.length === 0 ? (
                      <div className="py-8 text-center text-xs text-[var(--color-atelier-grafite)]/55">
                        Nenhum comentário registrado ainda.
                      </div>
                    ) : (
                      data.comments.map(c => (
                        <div
                          key={c.id}
                          className="p-3.5 tess-card space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px] text-[var(--color-atelier-grafite)]/70">
                            <strong className="text-[var(--color-atelier-grafite)]">{c.author_name || 'Equipe'}</strong>
                            <span>{new Date(c.created_at).toLocaleString('pt-BR')}</span>
                          </div>
                          <p className="text-xs text-[var(--color-atelier-grafite)]/85 whitespace-pre-wrap">{c.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-2.5">
                  {data.history.length === 0 ? (
                    <div className="py-10 text-center text-xs text-[var(--color-atelier-grafite)]/55">Sem histórico de transições.</div>
                  ) : (
                    data.history.map(h => (
                      <div
                        key={h.id}
                        className="p-3 tess-card flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="text-[var(--color-atelier-grafite)]">
                            {h.from_status ? (
                              <>
                                <span className="text-[var(--color-atelier-grafite)]/70">
                                  {CANONICAL_STATUSES[h.from_status as WorkItemStatus]?.label || h.from_status}
                                </span>{' '}
                                →{' '}
                              </>
                            ) : (
                              'Criado em '
                            )}
                            <strong className="text-[var(--tess-accent-text)]">
                              {CANONICAL_STATUSES[h.to_status as WorkItemStatus]?.label || h.to_status}
                            </strong>
                          </div>
                          {h.reason && <p className="text-[11px] text-[var(--color-atelier-grafite)]/70">{h.reason}</p>}
                        </div>
                        <div className="text-right text-[11px] text-[var(--color-atelier-grafite)]/55 shrink-0">
                          <div>{h.changed_by_name || 'Sistema'}</div>
                          <div>{new Date(h.created_at).toLocaleString('pt-BR')}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
