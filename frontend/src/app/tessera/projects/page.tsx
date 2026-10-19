// src/app/tessera/projects/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FolderKanban,
  List,
  Columns3,
  Calendar as CalendarIcon,
  Briefcase,
  Search,
  Lock,
  CheckSquare,
  Clock,
  AlertTriangle,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Flame,
} from 'lucide-react';
import { StatusBadge } from '@/components/tessera/StatusBadge';
import { PriorityBadge } from '@/components/tessera/PriorityBadge';
import { TaskDrawer } from '@/components/tessera/TaskDrawer';
import { NewWorkItemModal } from '@/components/tessera/NewWorkItemModal';
import { CANONICAL_STATUSES } from '@/lib/tessera/stateMachine';
import type { TesseraWorkItem, WorkItemStatus } from '@/lib/tessera/types';
import type { OrgMember, OrgProject } from '@/lib/tessera/itemQueries';

type WorkViewMode = 'kanban' | 'list' | 'calendar' | 'portfolio';

const KANBAN_COLUMNS: WorkItemStatus[] = [
  'inbox',
  'ready',
  'in_progress',
  'internal_review',
  'client_approval',
  'scheduled',
  'done',
];

export default function TesseraProjectsPage() {
  const [viewMode, setViewMode] = useState<WorkViewMode>('kanban');
  const [items, setItems] = useState<TesseraWorkItem[]>([]);
  const [wipLimits, setWipLimits] = useState<Record<string, number>>({});
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [projects, setProjects] = useState<OrgProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Filters
  const [searchQ, setSearchQ] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [includeClosed, setIncludeClosed] = useState(false);

  // Selected item for Drawer & New Modal
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // Calendar month navigation
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const loadBoard = useCallback(async () => {
    setIsLoading(true);
    setBannerError(null);
    try {
      const qs = new URLSearchParams({ view: 'board' });
      if (filterProject) qs.set('project_id', filterProject);
      if (filterOwner) qs.set('owner_id', filterOwner);
      if (filterPriority) qs.set('priority', filterPriority);
      if (onlyBlocked) qs.set('blocked', 'true');
      if (includeClosed) qs.set('include_closed', 'true');
      if (searchQ.trim()) qs.set('q', searchQ.trim());

      const res = await fetch(`/api/tessera/work-items?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar quadro.');
      setItems(data.items || []);
      setWipLimits(data.wip_limits || {});
      setMembers(data.members || []);
      setProjects(data.projects || []);
    } catch (err: any) {
      setBannerError(err.message || 'Erro de comunicação.');
    } finally {
      setIsLoading(false);
    }
  }, [filterProject, filterOwner, filterPriority, onlyBlocked, includeClosed, searchQ]);

  useEffect(() => {
    loadBoard();
    const onCreated = () => loadBoard();
    window.addEventListener('tessera:itemCreated', onCreated);
    return () => window.removeEventListener('tessera:itemCreated', onCreated);
  }, [loadBoard]);

  const handleDropStatus = async (targetStatus: WorkItemStatus) => {
    if (!draggedItemId) return;
    const item = items.find(i => i.id === draggedItemId);
    setDraggedItemId(null);
    if (!item || item.status_id === targetStatus) return;

    try {
      const res = await fetch(`/api/tessera/work-items/${item.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_status: targetStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerError(data.error || 'Transição não permitida.');
        return;
      }
      loadBoard();
    } catch (err: any) {
      setBannerError(err.message || 'Erro ao mover item.');
    }
  };

  // Calendar days calculation
  const calendarDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ dateStr: string | null; dayNumber: number | null; items: TesseraWorkItem[] }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ dateStr: null, dayNumber: null, items: [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayItems = items.filter(it => {
        const ref = it.internal_due_at || it.due_at;
        return ref && ref.slice(0, 10) === dateStr;
      });
      cells.push({ dateStr, dayNumber: d, items: dayItems });
    }
    return cells;
  }, [calMonth, items]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Cabeçalho + Switcher de Views */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-800/80">
        <div>
          <h1 className="text-xl font-semibold text-stone-100 flex items-center gap-2.5">
            <FolderKanban className="w-5 h-5 text-amber-500" />
            <span>Core Work & Carteira Unificada</span>
            <span className="text-xs font-mono font-normal text-stone-400 px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800">
              {items.length} itens
            </span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Múltiplas visualizações sobre a mesma fonte canônica de verdade — Kanban com limites de WIP, Lista, Calendário e Carteira.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-stone-900 p-1 border border-stone-800">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === 'kanban' ? 'bg-amber-600 text-stone-950 shadow' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Kanban (WIP)</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === 'list' ? 'bg-amber-600 text-stone-950 shadow' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista / Tabela</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === 'calendar' ? 'bg-amber-600 text-stone-950 shadow' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendário</span>
            </button>
            <button
              onClick={() => setViewMode('portfolio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === 'portfolio' ? 'bg-amber-600 text-stone-950 shadow' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Carteira ({projects.length})</span>
            </button>
          </div>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Item</span>
          </button>

          <button
            onClick={loadBoard}
            className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200 transition"
            title="Recarregar"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="p-3.5 rounded-2xl bg-stone-900/50 border border-stone-800/80 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Filtrar por título da demanda..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 placeholder-stone-500"
          />
        </div>

        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300"
        >
          <option value="">Todos os Projetos</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        <select
          value={filterOwner}
          onChange={e => setFilterOwner(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300"
        >
          <option value="">Todos os Responsáveis</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300"
        >
          <option value="">Todas as Prioridades</option>
          <option value="urgent">Urgente</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>

        <label className="inline-flex items-center gap-1.5 text-xs text-stone-300 cursor-pointer px-2.5 py-1.5 rounded-xl bg-stone-950 border border-stone-800">
          <input
            type="checkbox"
            checked={onlyBlocked}
            onChange={e => setOnlyBlocked(e.target.checked)}
            className="rounded border-stone-700 bg-stone-900 text-rose-500"
          />
          <span>Só Bloqueados</span>
        </label>

        <label className="inline-flex items-center gap-1.5 text-xs text-stone-300 cursor-pointer px-2.5 py-1.5 rounded-xl bg-stone-950 border border-stone-800">
          <input
            type="checkbox"
            checked={includeClosed}
            onChange={e => setIncludeClosed(e.target.checked)}
            className="rounded border-stone-700 bg-stone-900 text-amber-500"
          />
          <span>Histórico Concluídos</span>
        </label>
      </div>

      {bannerError && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{bannerError}</span>
          </div>
          <button onClick={() => setBannerError(null)} className="text-[11px] underline">
            Fechar
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center text-xs text-stone-500">Carregando itens de trabalho...</div>
      ) : (
        <>
          {/* 1. KANBAN COM LIMITES DE WIP */}
          {viewMode === 'kanban' && (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {KANBAN_COLUMNS.map(statusKey => {
                const colDef = CANONICAL_STATUSES[statusKey];
                const colItems = items.filter(i => i.status_id === statusKey);
                const limit = wipLimits[statusKey];
                const isOverWip = typeof limit === 'number' && limit > 0 && colItems.length > limit;
                const isAtWip = typeof limit === 'number' && limit > 0 && colItems.length === limit;

                return (
                  <div
                    key={statusKey}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDropStatus(statusKey)}
                    className={`w-72 shrink-0 rounded-2xl border flex flex-col max-h-[75vh] transition ${
                      isOverWip
                        ? 'bg-rose-950/15 border-rose-800/60'
                        : 'bg-stone-900/40 border-stone-800/80'
                    }`}
                  >
                    {/* Header da Coluna */}
                    <div className="p-3.5 border-b border-stone-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={statusKey} size="sm" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                            isOverWip
                              ? 'bg-rose-950/80 border-rose-700 text-rose-200 font-bold'
                              : isAtWip
                              ? 'bg-amber-950/80 border-amber-700 text-amber-200'
                              : 'bg-stone-950 border-stone-800 text-stone-400'
                          }`}
                        >
                          {colItems.length}
                          {typeof limit === 'number' && limit > 0 ? ` / WIP ${limit}` : ''}
                        </span>
                      </div>
                    </div>

                    {isOverWip && (
                      <div className="px-3 py-1.5 bg-rose-950/60 border-b border-rose-900/60 text-[10px] text-rose-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>Acima do limite de WIP ({limit})! Priorize concluir ou revisar.</span>
                      </div>
                    )}

                    {/* Cards */}
                    <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                      {colItems.length === 0 ? (
                        <div className="py-10 text-center text-[11px] text-stone-600">Vazio</div>
                      ) : (
                        colItems.map(item => {
                          const isOverdue =
                            item.internal_due_at &&
                            !['done', 'canceled'].includes(item.status_id) &&
                            new Date(item.internal_due_at).getTime() < Date.now();
                          return (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={() => setDraggedItemId(item.id)}
                              onClick={() => setSelectedItemId(item.id)}
                              className={`p-3 rounded-xl border cursor-pointer transition space-y-2 ${
                                item.blocked_at
                                  ? 'bg-rose-950/25 border-rose-800/60 hover:border-rose-600'
                                  : 'bg-stone-950/80 border-stone-800/80 hover:border-amber-700/50'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-[10px] font-mono text-stone-400 truncate">
                                  {item.project_title || 'Studio'}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {item.urgency_override && (
                                    <span
                                      title="Forçado para Hoje pelo Gestor"
                                      className="p-0.5 rounded bg-amber-500/20 text-amber-300"
                                    >
                                      <Flame className="w-3 h-3" />
                                    </span>
                                  )}
                                  <PriorityBadge priority={item.priority} size="sm" />
                                </div>
                              </div>

                              <h4 className="text-xs font-medium text-stone-100 leading-snug line-clamp-2">
                                {item.title}
                              </h4>

                              {item.blocked_at && (
                                <div className="px-2 py-1 rounded bg-rose-950/60 border border-rose-800/40 text-[10px] text-rose-300 flex items-center gap-1 truncate">
                                  <Lock className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{item.blocked_reason || 'Bloqueado'}</span>
                                </div>
                              )}

                              <div className="pt-2 border-t border-stone-800/60 flex items-center justify-between text-[10px] text-stone-400">
                                <span className="truncate max-w-[110px]">
                                  {item.owner_name || 'Sem dono'}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  {(item.checklist_total || 0) > 0 && (
                                    <span className="inline-flex items-center gap-0.5">
                                      <CheckSquare className="w-3 h-3 text-stone-500" />
                                      {item.checklist_completed}/{item.checklist_total}
                                    </span>
                                  )}
                                  {item.internal_due_at && (
                                    <span className={isOverdue ? 'text-rose-400 font-semibold' : ''}>
                                      {new Date(item.internal_due_at).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. LISTA / TABELA OPERACIONAL */}
          {viewMode === 'list' && (
            <div className="rounded-2xl bg-stone-900/50 border border-stone-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-800 text-[11px] uppercase tracking-wider text-stone-400 bg-stone-950/60">
                      <th className="py-3 px-4">Demanda</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Prioridade</th>
                      <th className="py-3 px-3">Projeto / Cliente</th>
                      <th className="py-3 px-3">Responsável</th>
                      <th className="py-3 px-3">Checklist</th>
                      <th className="py-3 px-3">Esforço</th>
                      <th className="py-3 px-3">Prazo Interno</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 text-xs">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-stone-500">
                          Nenhum item encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      items.map(item => {
                        const isOverdue =
                          item.internal_due_at &&
                          !['done', 'canceled'].includes(item.status_id) &&
                          new Date(item.internal_due_at).getTime() < Date.now();
                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedItemId(item.id)}
                            className="hover:bg-stone-800/40 cursor-pointer transition"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {item.blocked_at && <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                                {item.urgency_override && <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                <span className="font-medium text-stone-100">{item.title}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <StatusBadge status={item.status_id} size="sm" />
                            </td>
                            <td className="py-3 px-3">
                              <PriorityBadge priority={item.priority} size="sm" />
                            </td>
                            <td className="py-3 px-3 text-stone-300">{item.project_title || 'Studio'}</td>
                            <td className="py-3 px-3 text-stone-300">{item.owner_name || '—'}</td>
                            <td className="py-3 px-3 text-stone-400 font-mono text-[11px]">
                              {(item.checklist_total || 0) > 0
                                ? `${item.checklist_completed}/${item.checklist_total}`
                                : '—'}
                            </td>
                            <td className="py-3 px-3 text-stone-400 font-mono text-[11px]">
                              {item.actual_minutes}m / {item.estimate_minutes}m
                            </td>
                            <td className="py-3 px-3">
                              {item.internal_due_at ? (
                                <span className={isOverdue ? 'text-rose-400 font-semibold' : 'text-stone-300'}>
                                  {new Date(item.internal_due_at).toLocaleDateString('pt-BR')}
                                </span>
                              ) : (
                                <span className="text-stone-500">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. CALENDÁRIO DE ENTREGAS */}
          {viewMode === 'calendar' && (
            <div className="rounded-2xl bg-stone-900/50 border border-stone-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-100 capitalize">
                  {calMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                    className="p-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date();
                      setCalMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                    }}
                    className="px-3 py-1 rounded-lg bg-stone-900 border border-stone-800 text-xs text-stone-300 hover:bg-stone-800"
                  >
                    Mês Atual
                  </button>
                  <button
                    onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                    className="p-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                <div>Dom</div>
                <div>Seg</div>
                <div>Ter</div>
                <div>Qua</div>
                <div>Qui</div>
                <div>Sex</div>
                <div>Sáb</div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((cell, idx) => (
                  <div
                    key={idx}
                    className={`min-h-[110px] rounded-xl p-2 border flex flex-col gap-1.5 ${
                      cell.dayNumber
                        ? 'bg-stone-950/70 border-stone-800/80'
                        : 'bg-stone-950/20 border-stone-900/40'
                    }`}
                  >
                    {cell.dayNumber && (
                      <div className="text-[11px] font-mono text-stone-400 flex items-center justify-between">
                        <span>{cell.dayNumber}</span>
                        {cell.items.length > 0 && (
                          <span className="text-[10px] px-1.5 rounded bg-stone-900 text-amber-400">
                            {cell.items.length}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="space-y-1 overflow-y-auto max-h-24">
                      {cell.items.map(it => (
                        <button
                          key={it.id}
                          onClick={() => setSelectedItemId(it.id)}
                          className="w-full text-left px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 border border-stone-800 text-[10px] text-stone-200 truncate block"
                        >
                          {it.title}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. CARTEIRA DE PROJETOS */}
          {viewMode === 'portfolio' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(p => {
                const projItems = items.filter(i => i.project_id === p.id);
                const blockedCount = projItems.filter(i => i.blocked_at).length;
                return (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-950/40 border border-amber-900/40">
                          {p.service_type}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          {projItems.length} itens ({blockedCount} bloq.)
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-stone-100">{p.title}</h3>
                      <p className="text-xs text-stone-400">Cliente: {p.client_name}</p>
                    </div>

                    <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs">
                      <span className="text-stone-400">
                        Fase: <strong className="text-stone-200">{p.stage_label}</strong>
                      </span>
                      <button
                        onClick={() => {
                          setFilterProject(p.id);
                          setViewMode('kanban');
                        }}
                        className="text-amber-400 hover:underline font-medium"
                      >
                        Filtrar Quadro →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Drawer de Detalhe do Item */}
      <TaskDrawer
        itemId={selectedItemId}
        onClose={() => setSelectedItemId(null)}
        onUpdated={loadBoard}
      />

      {/* Modal de Criação */}
      <NewWorkItemModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={loadBoard}
        members={members}
        projects={projects}
      />
    </div>
  );
}
