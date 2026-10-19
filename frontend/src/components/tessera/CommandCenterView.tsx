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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-atelier-grafite)]/12">
        <div>
          <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
            <span>Centro de Comando</span>
            <span className="text-xs font-roboto tabular-nums font-normal text-[var(--tess-accent-text)] px-2 py-0.5 rounded-full bg-[var(--tess-accent)]/15 border border-[var(--tess-accent)]/30">
              Live Ops
            </span>
          </h2>
          <p className="text-xs text-[var(--color-atelier-grafite)]/70 mt-1">
            Visão consolidada de decisões pendentes, projetos em risco e fluxo de capacidade do Studio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {actionMessage && (
            <span className="text-xs text-[var(--tess-success)] font-medium animate-pulse">
              {actionMessage}
            </span>
          )}
          <button
            onClick={() => loadData()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 tess-card text-xs text-[var(--color-atelier-grafite)]/85 hover:text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-grafite)]/[0.10] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* 2. Cartões de Estado de Fluxo (TOC & Capacity) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 tess-card">
          <p className="text-[11px] font-medium text-[var(--color-atelier-grafite)]/70">Projetos Ativos</p>
          <p className="text-xl font-bold text-[var(--color-atelier-grafite)] mt-1 font-roboto tabular-nums">{data?.stats.active_projects ?? '—'}</p>
        </div>

        <div className="p-3.5 tess-card">
          <p className="text-[11px] font-medium text-[var(--tess-accent-text)]">Em Execução</p>
          <p className="text-xl font-bold text-[var(--tess-accent-text)] mt-1 font-roboto tabular-nums">{data?.stats.work_items_in_progress ?? '—'}</p>
        </div>

        <div className="p-3.5 tess-card border border-[var(--tess-danger)]/30 bg-[var(--tess-danger)]/10">
          <p className="text-[11px] font-medium text-[var(--tess-danger)]">Prazos em Risco</p>
          <p className="text-xl font-bold text-[var(--tess-danger)] mt-1 font-roboto tabular-nums">{data?.stats.work_items_at_risk ?? '—'}</p>
        </div>

        <div className="p-3.5 tess-card border border-[var(--tess-warn)]/30 bg-[var(--tess-warn)]/10">
          <p className="text-[11px] font-medium text-[var(--tess-warn)]">Bloqueados</p>
          <p className="text-xl font-bold text-[var(--tess-warn)] mt-1 font-roboto tabular-nums">{data?.stats.work_items_blocked ?? '—'}</p>
        </div>

        <div className="p-3.5 tess-card border border-[var(--tess-review)]/30 bg-[var(--tess-review)]/10">
          <p className="text-[11px] font-medium text-[var(--tess-review)]">Revisão QA</p>
          <p className="text-xl font-bold text-[var(--tess-review)] mt-1 font-roboto tabular-nums">{data?.stats.pending_internal_reviews ?? '—'}</p>
        </div>

        <div className="p-3.5 tess-card border border-[var(--tess-info)]/30 bg-[var(--tess-info)]/10">
          <p className="text-[11px] font-medium text-[var(--tess-info)]">Aguard. Cliente</p>
          <p className="text-xl font-bold text-[var(--tess-info)] mt-1 font-roboto tabular-nums">{data?.stats.pending_client_approvals ?? '—'}</p>
        </div>

        <div className="p-3.5 tess-card border border-[var(--tess-success)]/30 bg-[var(--tess-success)]/10">
          <p className="text-[11px] font-medium text-[var(--tess-success)]">Concluídos Hoje</p>
          <p className="text-xl font-bold text-[var(--tess-success)] mt-1 font-roboto tabular-nums">{data?.stats.today_completed ?? '—'}</p>
        </div>
      </div>

      {/* 3. Faixa de Alertas Críticos & Decisões do Gestor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-atelier-grafite)]/70 flex items-center gap-2">
            <Flame className="w-4 h-4 text-[var(--tess-danger)]" />
            <span>Fila de Decisões Críticas & Desbloqueios</span>
          </h2>
          <span className="text-[11px] text-[var(--color-atelier-grafite)]/55">
            {data?.critical_alerts.length || 0} pendências prioritárias
          </span>
        </div>

        {data?.critical_alerts.length === 0 ? (
          <div className="p-6 tess-card text-center text-xs text-[var(--color-atelier-grafite)]/70 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--tess-success)]" />
            <span>Nenhum alerta crítico ativo. Todas as entregas estão fluindo normalmente.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.critical_alerts.map(alert => (
              <div 
                key={alert.id}
                className="p-4 tess-card flex flex-col justify-between space-y-3 hover:border-[var(--color-atelier-grafite)]/25 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--color-atelier-grafite)] line-clamp-1">{alert.title}</span>
                    {alert.type === 'blocked' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--tess-accent)]/15 text-[var(--tess-accent-text)] border border-[var(--tess-accent)]/30 shrink-0">
                        Bloqueado
                      </span>
                    ) : alert.type === 'sla_breach' ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--tess-review)]/15 text-[var(--tess-review)] border border-[var(--tess-review)]/30 shrink-0">
                        QA Pendente
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--tess-danger)]/15 text-[var(--tess-danger)] border border-[var(--tess-danger)]/30 shrink-0">
                        Prazo Crítico
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--color-atelier-grafite)]/70 mt-2 leading-relaxed">
                    <strong className="text-[var(--color-atelier-grafite)]/85">Por que importa:</strong> {alert.why_it_matters}
                  </p>
                  <p className="text-[11px] text-[var(--color-atelier-grafite)]/55 mt-1">
                    <strong className="text-[var(--color-atelier-grafite)]/70">Impacto:</strong> {alert.consequence}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--color-atelier-grafite)]/12 flex items-center justify-between">
                  <div className="text-[11px] text-[var(--color-atelier-grafite)]/70">
                    <span className="text-[var(--color-atelier-grafite)]/55">Resp: </span>
                    <span className="font-medium text-[var(--color-atelier-grafite)]/85">{alert.responsible_name}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (alert.action_type === 'qa_review') {
                        handleQuickTransition(alert.target_id, 'client_approval');
                      } else {
                        handleQuickTransition(alert.target_id, 'in_progress');
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--tess-accent)]/20 hover:bg-[var(--tess-accent)]/30 border border-[var(--tess-accent)]/30 text-[11px] font-medium text-[var(--tess-accent-text)] transition"
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
      <div className="p-5 tess-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-[var(--tess-accent-text)]" />
            <h2 className="font-elegant text-lg text-[var(--color-atelier-grafite)]">Radar de Projetos & Fases Ativas</h2>
          </div>
          <span className="text-xs text-[var(--color-atelier-grafite)]/55">Baseada no histórico de saúde e entregáveis</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--color-atelier-grafite)]/85">
            <thead className="bg-[var(--color-atelier-creme)]/60 text-[var(--color-atelier-grafite)]/70 uppercase text-[10px] tracking-wider border-b border-[var(--color-atelier-grafite)]/12">
              <tr>
                <th className="py-2.5 px-3">Projeto / Conta</th>
                <th className="py-2.5 px-3">Linha de Serviço</th>
                <th className="py-2.5 px-3">Fase / Movimento</th>
                <th className="py-2.5 px-3">Saúde da Conta</th>
                <th className="py-2.5 px-3">Causa do Risco</th>
                <th className="py-2.5 px-3 text-right">Data de Entrega</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-atelier-grafite)]/10">
              {data?.projects_at_risk.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[var(--color-atelier-grafite)]/55">
                    Nenhum projeto registrado no radar.
                  </td>
                </tr>
              ) : (
                data?.projects_at_risk.map(project => (
                  <tr key={project.id} className="hover:bg-[var(--color-atelier-grafite)]/[0.10] transition">
                    <td className="py-2.5 px-3 font-medium text-[var(--color-atelier-grafite)]">{project.title}</td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-roboto tabular-nums text-[var(--color-atelier-grafite)]/70">
                      {project.service_type}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-atelier-grafite)]/[0.07] text-[var(--color-atelier-grafite)]/85 text-[11px]">
                        {project.stage_label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        project.health === 'green' 
                          ? 'bg-[var(--tess-success)]/10 text-[var(--tess-success)] border border-[var(--tess-success)]/30' 
                          : project.health === 'yellow'
                          ? 'bg-[var(--tess-warn)]/10 text-[var(--tess-warn)] border border-[var(--tess-warn)]/30'
                          : 'bg-[var(--tess-danger)]/10 text-[var(--tess-danger)] border border-[var(--tess-danger)]/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          project.health === 'green' ? 'bg-[var(--tess-success)]' : project.health === 'yellow' ? 'bg-[var(--tess-warn)]' : 'bg-[var(--tess-danger)]'
                        }`} />
                        {project.health === 'green' ? 'Saudável' : project.health === 'yellow' ? 'Alerta' : 'Crítico'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[var(--color-atelier-grafite)]/70 max-w-xs truncate">{project.risk_cause}</td>
                    <td className="py-2.5 px-3 text-right font-roboto tabular-nums text-[var(--color-atelier-grafite)]/85">
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
      <div className="p-5 tess-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--tess-accent-text)]" />
            <h2 className="font-elegant text-lg text-[var(--color-atelier-grafite)]">Fila Central de Trabalho (Work Items)</h2>
          </div>

          <div className="flex items-center gap-1.5 bg-[var(--color-atelier-creme)]/60 p-1 rounded-xl border border-[var(--color-atelier-grafite)]/12 text-xs">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedFilter === 'all' ? 'bg-[var(--color-atelier-grafite)]/[0.07] text-[var(--color-atelier-grafite)] font-medium' : 'text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]'
              }`}
            >
              Todos ({workItems.length})
            </button>
            <button
              onClick={() => setSelectedFilter('in_progress')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedFilter === 'in_progress' ? 'bg-[var(--color-atelier-grafite)]/[0.07] text-[var(--tess-accent-text)] font-medium' : 'text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]'
              }`}
            >
              Em Execução
            </button>
            <button
              onClick={() => setSelectedFilter('review')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedFilter === 'review' ? 'bg-[var(--color-atelier-grafite)]/[0.07] text-[var(--tess-review)] font-medium' : 'text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]'
              }`}
            >
              Em Revisão QA
            </button>
            <button
              onClick={() => setSelectedFilter('blocked')}
              className={`px-2.5 py-1 rounded-lg transition ${
                selectedFilter === 'blocked' ? 'bg-[var(--color-atelier-grafite)]/[0.07] text-[var(--tess-danger)] font-medium' : 'text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]'
              }`}
            >
              Bloqueados
            </button>
          </div>
        </div>

        {/* Lista de Itens */}
        <div className="divide-y divide-[var(--color-atelier-grafite)]/10">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--color-atelier-grafite)]/55">
              Nenhum item encontrado para o filtro selecionado. Clique em &quot;Novo Item&quot; para iniciar uma demanda.
            </div>
          ) : (
            filteredItems.map(item => {
              const isBlocked = Boolean(item.blocked_at);
              return (
                <div 
                  key={item.id}
                  className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--color-atelier-grafite)]/[0.10] rounded-xl transition"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleBlock(item)}
                      title={isBlocked ? 'Item bloqueado. Clique para desbloquear.' : 'Clique para marcar bloqueio.'}
                      className={`p-1.5 rounded-lg border transition shrink-0 mt-0.5 ${
                        isBlocked 
                          ? 'bg-[var(--tess-danger)]/15 border-[var(--tess-danger)]/30 text-[var(--tess-danger)] hover:bg-[var(--tess-danger)]/20' 
                          : 'tess-surface border-[var(--color-atelier-grafite)]/12 text-[var(--color-atelier-grafite)]/55 hover:text-[var(--color-atelier-grafite)]/85'
                      }`}
                    >
                      {isBlocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    <div
                      className="min-w-0 cursor-pointer"
                      onClick={() => setDrawerItemId(item.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--color-atelier-grafite)] hover:text-[var(--tess-accent-text)] truncate transition">{item.title}</span>
                        {item.urgency_override && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-[var(--tess-danger)]/10 text-[var(--tess-danger)] border border-[var(--tess-danger)]/30 font-bold">
                            HOJE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--color-atelier-grafite)]/55">
                        <span>{item.project_title || 'Sem Projeto'}</span>
                        <span>•</span>
                        <span>Estimativa: {item.estimate_minutes}m</span>
                        {item.internal_due_at && (
                          <>
                            <span>•</span>
                            <span className="text-[var(--color-atelier-grafite)]/70">
                              Prazo: {new Date(item.internal_due_at).toLocaleDateString('pt-BR')}
                            </span>
                          </>
                        )}
                        {isBlocked && (
                          <>
                            <span>•</span>
                            <span className="text-[var(--tess-danger)] font-medium">Bloqueado: {item.blocked_reason}</span>
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
                        className="px-2 py-1 rounded-lg bg-[var(--color-atelier-grafite)]/[0.07] hover:bg-[var(--color-atelier-grafite)]/[0.12] text-[11px] text-[var(--color-atelier-grafite)]/85 transition"
                      >
                        Pronto
                      </button>
                    )}
                    {item.status_id === 'ready' && (
                      <button
                        onClick={() => handleQuickTransition(item.id, 'in_progress')}
                        className="px-2 py-1 rounded-lg bg-[var(--tess-accent)] hover:bg-[var(--tess-accent-hover)] text-[var(--tess-on-accent)] font-medium text-[11px] transition"
                      >
                        Iniciar
                      </button>
                    )}
                    {item.status_id === 'in_progress' && (
                      <button
                        onClick={() => handleQuickTransition(item.id, 'internal_review')}
                        className="px-2 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-medium text-[11px] transition"
                      >
                        Enviar QA
                      </button>
                    )}
                    {item.status_id === 'internal_review' && (
                      <button
                        onClick={() => handleQuickQaApprove(item.id)}
                        className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-[11px] transition"
                      >
                        Aprovar QA
                      </button>
                    )}
                    {item.status_id === 'client_approval' && (
                      <button
                        onClick={() => handleQuickTransition(item.id, 'done')}
                        className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-[11px] transition"
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
