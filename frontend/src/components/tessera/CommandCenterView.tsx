// src/components/tessera/CommandCenterView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ArrowRight, 
  Flame, 
  ShieldAlert, 
  FolderKanban, 
  Users, 
  FileCheck,
  RefreshCw,
  ExternalLink,
  Lock,
  Unlock
} from 'lucide-react';
import { CommandCenterSummary, TesseraWorkItem } from '@/lib/tessera/types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { TaskDrawer } from './TaskDrawer';

export const CommandCenterView: React.FC = () => {
  const [data, setData] = useState<CommandCenterSummary | null>(null);
  const [workItems, setWorkItems] = useState<TesseraWorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'blocked' | 'review' | 'in_progress'>('all');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [cmdRes, itemsRes] = await Promise.all([
        fetch('/api/tessera/command-center'),
        fetch('/api/tessera/work-items?limit=25')
      ]);

      if (cmdRes.ok) {
        const cmdData = await cmdRes.json();
        setData(cmdData);
      }

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setWorkItems(itemsData.items || []);
      }
    } catch (err) {
      console.error('Falha ao carregar dados do Centro de Comando:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleCreated = () => loadData();
    window.addEventListener('tessera:itemCreated', handleCreated);
    return () => window.removeEventListener('tessera:itemCreated', handleCreated);
  }, []);

  const handleQuickTransition = async (itemId: string, toStatus: string) => {
    try {
      const res = await fetch(`/api/tessera/work-items/${itemId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_status: toStatus, reason: 'Ação rápida executada via Centro de Comando' })
      });
      const resData = await res.json();
      if (!res.ok) {
        alert(resData.error || 'Não foi possível transicionar o status.');
        return;
      }
      setActionMessage('Status atualizado com sucesso!');
      setTimeout(() => setActionMessage(null), 3000);
      loadData();
    } catch {
      alert('Erro ao atualizar item.');
    }
  };

  const handleQuickQaApprove = async (itemId: string) => {
    try {
      const res = await fetch(`/api/tessera/reviews/${itemId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approved', comment: 'Aprovado via Centro de Comando' })
      });
      const resData = await res.json();
      if (!res.ok) {
        const extra = Array.isArray(resData.details) ? ` (${resData.details.join(' ')})` : '';
        alert((resData.error || 'Não foi possível aprovar no QA.') + extra);
        return;
      }
      setActionMessage('Item aprovado no QA com sucesso!');
      setTimeout(() => setActionMessage(null), 3000);
      loadData();
    } catch {
      alert('Erro ao aprovar item no QA.');
    }
  };

  const handleToggleBlock = async (item: TesseraWorkItem) => {
    const isCurrentlyBlocked = Boolean(item.blocked_at);
    const reason = isCurrentlyBlocked ? '' : prompt('Informe o motivo do bloqueio:') || 'Aguardando insumo';

    try {
      const res = await fetch(`/api/tessera/work-items/${item.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_blocked: !isCurrentlyBlocked, reason })
      });
      if (res.ok) {
        loadData();
      }
    } catch {
      alert('Erro ao alterar bloqueio.');
    }
  };

  const filteredItems = workItems.filter(item => {
    if (selectedFilter === 'blocked') return Boolean(item.blocked_at);
    if (selectedFilter === 'review') return item.status_id === 'internal_review';
    if (selectedFilter === 'in_progress') return item.status_id === 'in_progress';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. Cabeçalho Executivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800/80">
        <div>
          <h1 className="text-xl font-semibold text-stone-100 flex items-center gap-2.5">
            <span>Centro de Comando</span>
            <span className="text-xs font-mono font-normal text-amber-400 px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/40">
              Live Ops
            </span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Visão consolidada de decisões pendentes, projetos em risco e fluxo de capacidade do Studio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {actionMessage && (
            <span className="text-xs text-emerald-400 font-medium animate-pulse">
              {actionMessage}
            </span>
          )}
          <button
            onClick={() => loadData()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-300 hover:text-stone-100 hover:bg-stone-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* 2. Cartões de Estado de Fluxo (TOC & Capacity) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-2xl bg-stone-900/60 border border-stone-800/80">
          <p className="text-[11px] font-medium text-stone-400">Projetos Ativos</p>
          <p className="text-xl font-bold text-stone-100 mt-1 font-mono">{data?.stats.active_projects ?? '—'}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-900/60 border border-stone-800/80">
          <p className="text-[11px] font-medium text-amber-400">Em Execução</p>
          <p className="text-xl font-bold text-amber-300 mt-1 font-mono">{data?.stats.work_items_in_progress ?? '—'}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-900/60 border border-rose-900/30 bg-rose-950/10">
          <p className="text-[11px] font-medium text-rose-400">Prazos em Risco</p>
          <p className="text-xl font-bold text-rose-300 mt-1 font-mono">{data?.stats.work_items_at_risk ?? '—'}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-900/60 border border-amber-900/30 bg-amber-950/10">
          <p className="text-[11px] font-medium text-amber-400">Bloqueados</p>
          <p className="text-xl font-bold text-amber-300 mt-1 font-mono">{data?.stats.work_items_blocked ?? '—'}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-900/60 border border-purple-900/30 bg-purple-950/10">
          <p className="text-[11px] font-medium text-purple-400">Revisão QA</p>
          <p className="text-xl font-bold text-purple-300 mt-1 font-mono">{data?.stats.pending_internal_reviews ?? '—'}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-900/60 border border-sky-900/30 bg-sky-950/10">
          <p className="text-[11px] font-medium text-sky-400">Aguard. Cliente</p>
          <p className="text-xl font-bold text-sky-300 mt-1 font-mono">{data?.stats.pending_client_approvals ?? '—'}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-900/60 border border-emerald-900/30 bg-emerald-950/10">
          <p className="text-[11px] font-medium text-emerald-400">Concluídos Hoje</p>
          <p className="text-xl font-bold text-emerald-300 mt-1 font-mono">{data?.stats.today_completed ?? '—'}</p>
        </div>
      </div>

      {/* 3. Faixa de Alertas Críticos & Decisões do Gestor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Fila de Decisões Críticas & Desbloqueios</span>
          </h2>
          <span className="text-[11px] text-stone-500">
            {data?.critical_alerts.length || 0} pendências prioritárias
          </span>
        </div>

        {data?.critical_alerts.length === 0 ? (
          <div className="p-6 rounded-2xl bg-stone-900/40 border border-stone-800 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Nenhum alerta crítico ativo. Todas as entregas estão fluindo normalmente.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.critical_alerts.map(alert => (
              <div 
                key={alert.id}
                className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 flex flex-col justify-between space-y-3 hover:border-stone-700 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-stone-200 line-clamp-1">{alert.title}</span>
                    {alert.type === 'blocked' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-950/60 text-amber-300 border border-amber-800/40 shrink-0">
                        Bloqueado
                      </span>
                    ) : alert.type === 'sla_breach' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-950/60 text-purple-300 border border-purple-800/40 shrink-0">
                        QA Pendente
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-950/60 text-rose-300 border border-rose-800/40 shrink-0">
                        Prazo Crítico
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-2 leading-relaxed">
                    <strong className="text-stone-300">Por que importa:</strong> {alert.why_it_matters}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-1">
                    <strong className="text-stone-400">Impacto:</strong> {alert.consequence}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
                  <div className="text-[11px] text-stone-400">
                    <span className="text-stone-500">Resp: </span>
                    <span className="font-medium text-stone-300">{alert.responsible_name}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (alert.action_type === 'qa_review') {
                        handleQuickTransition(alert.target_id, 'client_approval');
                      } else {
                        handleQuickTransition(alert.target_id, 'in_progress');
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-800/50 text-[11px] font-medium text-amber-300 transition"
                  >
                    <span>{alert.action_type === 'qa_review' ? 'Aprovar QA' : 'Desbloquear'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Projetos em Risco & Fases (IDV Intel + Instagram + Mapa) */}
      <div className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-stone-200">Radar de Projetos & Fases Ativas</h2>
          </div>
          <span className="text-xs text-stone-500">Baseada no histórico de saúde e entregáveis</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950/60 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
              <tr>
                <th className="py-2.5 px-3">Projeto / Conta</th>
                <th className="py-2.5 px-3">Linha de Serviço</th>
                <th className="py-2.5 px-3">Fase / Movimento</th>
                <th className="py-2.5 px-3">Saúde da Conta</th>
                <th className="py-2.5 px-3">Causa do Risco</th>
                <th className="py-2.5 px-3 text-right">Data de Entrega</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {data?.projects_at_risk.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-stone-500">
                    Nenhum projeto registrado no radar.
                  </td>
                </tr>
              ) : (
                data?.projects_at_risk.map(project => (
                  <tr key={project.id} className="hover:bg-stone-800/30 transition">
                    <td className="py-2.5 px-3 font-medium text-stone-200">{project.title}</td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-mono text-stone-400">
                      {project.service_type}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 text-[11px]">
                        {project.stage_label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        project.health === 'green' 
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' 
                          : project.health === 'yellow'
                          ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                          : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          project.health === 'green' ? 'bg-emerald-400' : project.health === 'yellow' ? 'bg-amber-400' : 'bg-rose-400'
                        }`} />
                        {project.health === 'green' ? 'Saudável' : project.health === 'yellow' ? 'Alerta' : 'Crítico'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-stone-400 max-w-xs truncate">{project.risk_cause}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-300">
                      {project.baseline_due_date ? new Date(project.baseline_due_date).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Tabela de Trabalho Ativo (Work Items) com Filtros Rápidos */}
      <div className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-stone-200">Fila Central de Trabalho (Work Items)</h2>
          </div>

          <div className="flex items-center gap-1.5 bg-stone-950/60 p-1 rounded-xl border border-stone-800 text-xs">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedFilter === 'all' ? 'bg-stone-800 text-stone-100 font-medium' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Todos ({workItems.length})
            </button>
            <button
              onClick={() => setSelectedFilter('in_progress')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedFilter === 'in_progress' ? 'bg-stone-800 text-amber-300 font-medium' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Em Execução
            </button>
            <button
              onClick={() => setSelectedFilter('review')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedFilter === 'review' ? 'bg-stone-800 text-purple-300 font-medium' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Em Revisão QA
            </button>
            <button
              onClick={() => setSelectedFilter('blocked')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedFilter === 'blocked' ? 'bg-stone-800 text-rose-300 font-medium' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Bloqueados
            </button>
          </div>
        </div>

        {/* Lista de Itens */}
        <div className="divide-y divide-stone-800/80">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-500">
              Nenhum item encontrado para o filtro selecionado. Clique em &quot;Novo Item&quot; para iniciar uma demanda.
            </div>
          ) : (
            filteredItems.map(item => {
              const isBlocked = Boolean(item.blocked_at);
              return (
                <div 
                  key={item.id}
                  className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-850/40 rounded-xl transition"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleBlock(item)}
                      title={isBlocked ? 'Item bloqueado. Clique para desbloquear.' : 'Clique para marcar bloqueio.'}
                      className={`p-1.5 rounded-lg border transition shrink-0 mt-0.5 ${
                        isBlocked 
                          ? 'bg-rose-950/60 border-rose-800/60 text-rose-400 hover:bg-rose-900/60' 
                          : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300'
                      }`}
                    >
                      {isBlocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    <div
                      className="min-w-0 cursor-pointer"
                      onClick={() => setDrawerItemId(item.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-stone-200 hover:text-amber-300 truncate transition">{item.title}</span>
                        {item.urgency_override && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800/50 font-bold">
                            HOJE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-stone-500">
                        <span>{item.project_title || 'Sem Projeto'}</span>
                        <span>•</span>
                        <span>Estimativa: {item.estimate_minutes}m</span>
                        {item.internal_due_at && (
                          <>
                            <span>•</span>
                            <span className="text-stone-400">
                              Prazo: {new Date(item.internal_due_at).toLocaleDateString('pt-BR')}
                            </span>
                          </>
                        )}
                        {isBlocked && (
                          <>
                            <span>•</span>
                            <span className="text-rose-400 font-medium">Bloqueado: {item.blocked_reason}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <PriorityBadge priority={item.priority} size="sm" />
                    <StatusBadge status={item.status_id} size="sm" />

                    {/* Ações de Estado Rápidas */}
                    {item.status_id === 'inbox' && (
                      <button
                        onClick={() => handleQuickTransition(item.id, 'ready')}
                        className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[11px] text-stone-300 transition"
                      >
                        Pronto
                      </button>
                    )}
                    {item.status_id === 'ready' && (
                      <button
                        onClick={() => handleQuickTransition(item.id, 'in_progress')}
                        className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium text-[11px] transition"
                      >
                        Iniciar
                      </button>
                    )}
                    {item.status_id === 'in_progress' && (
                      <button
                        onClick={() => handleQuickTransition(item.id, 'internal_review')}
                        className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-[11px] transition"
                      >
                        Enviar QA
                      </button>
                    )}
                    {item.status_id === 'internal_review' && (
                      <button
                        onClick={() => handleQuickQaApprove(item.id)}
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition"
                      >
                        Aprovar QA
                      </button>
                    )}
                    {item.status_id === 'client_approval' && (
                      <button
                        onClick={() => handleQuickTransition(item.id, 'done')}
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition"
                      >
                        Concluir
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <TaskDrawer
        itemId={drawerItemId}
        onClose={() => setDrawerItemId(null)}
        onUpdated={loadData}
      />
    </div>
  );
};
