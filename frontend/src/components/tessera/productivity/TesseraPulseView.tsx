// src/components/tessera/productivity/TesseraPulseView.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Clock,
  Activity,
  Layers,
  Coffee,
  DollarSign,
  Edit2,
  Loader2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { endOfDay, startOfMonth } from 'date-fns';

interface TesseraPulseViewProps {
  currentUser: any;
}

function extractNode(node: any): any {
  if (!node) return null;
  return Array.isArray(node) ? node[0] : node;
}

export default function TesseraPulseView({ currentUser }: TesseraPulseViewProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [team, setTeam] = useState<any[]>([]);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);

  const [tasks, setTasks] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [filterSource, setFilterSource] = useState<string>('all');
  const [monthSessions, setMonthSessions] = useState<any[]>([]);
  const [demandSortBy, setDemandSortBy] = useState<
    'valuePerHour' | 'valuePerDelivery' | 'more_demands' | 'less_demands' | 'more_time' | 'less_time'
  >('valuePerHour');

  // 🟢 1. O MOTOR DE TEMPO REAL (TICK ENGINE)
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // 🟢 2. BUSCA DE DADOS E SUBSCRIPÇÕES REALTIME
  useEffect(() => {
    fetchPulseData();

    const channel = supabase
      .channel('pulse-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_sessions' }, () => {
        fetchPulseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchPulseData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        fetchPulseData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPulseData = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://atelier-zwlt.onrender.com';
      const res = await fetch(`${backendUrl}/api/v1/management/pulse`);
      if (res.ok) {
        const { data } = await res.json();
        setTeam(data.team || []);
        setTodaySessions(data.sessions || []);
        setTodayTasks(data.tasks || []);
      }

      const currentNow = new Date();
      const monthStart = startOfMonth(currentNow).toISOString();

      const [overviewRes, resSubs, resMonthSessions] = await Promise.all([
        fetch('/api/clients/overview').then((r) => r.json()).catch(() => ({})),
        (supabase.from('agency_subclients') as any).select('id, name, agency_id'),
        (supabase.from('work_sessions') as any)
          .select('duration_minutes, task_id, tasks(project_id, agency_id, subclient_id)')
          .gte('start_time', monthStart),
      ]);

      const unifiedSources: any[] = [];

      if (overviewRes?.data?.enrichedProjects) {
        overviewRes.data.enrichedProjects.forEach((p: any) => {
          if (p.isAgency) {
            unifiedSources.push({
              id: p.client_id,
              type: 'agency',
              name: p.profiles?.nome || 'Agência',
              label: 'Agência WL',
              fee: Number(p.financial_value || 0),
            });
          } else if (!p.isLead && p.status === 'active') {
            unifiedSources.push({
              id: p.id,
              type: 'project',
              name: p.profiles?.nome || 'Projeto Desconhecido',
              label: 'Studio Veronna',
              fee: Number(p.financial_value || 0),
            });
          }
        });
      }

      if (resSubs?.data) {
        (resSubs.data as any[]).forEach((s: any) =>
          unifiedSources.push({
            id: s.id,
            type: 'subclient',
            name: s.name,
            label: 'Subcliente WL',
            fee: 0,
            agency_id: s.agency_id,
          })
        );
      }
      setSources(unifiedSources.sort((a, b) => a.name.localeCompare(b.name)));

      if (resMonthSessions?.data) setMonthSessions(resMonthSessions.data);

      const { data: tasksData } = await (supabase.from('tasks') as any)
        .select('*')
        .or(
          `created_at.gte.${monthStart},deadline.gte.${monthStart},completed_at.gte.${monthStart},status.in.(pending,review,needs_revision)`
        )
        .order('deadline', { ascending: true });

      if (tasksData) setTasks(tasksData);
    } catch (error) {
      console.error('Erro ao buscar dados do Pulso via API:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🟢 3. PROCESSAMENTO DE MÉTRICAS (MEMOIZADO)
  const activeSessions = useMemo(() => todaySessions.filter((s) => s.end_time === null), [todaySessions]);
  const closedSessions = useMemo(() => todaySessions.filter((s) => s.end_time !== null), [todaySessions]);

  const metrics = useMemo(() => {
    let totalMinutesToday = closedSessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
    activeSessions.forEach((s) => {
      totalMinutesToday += Math.floor((now - new Date(s.start_time).getTime()) / 60000);
    });

    const avgFocusMinutes =
      closedSessions.length > 0
        ? Math.round(
            closedSessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0) / closedSessions.length
          )
        : 0;

    const tasksDueOrActive = todayTasks.filter(
      (t) => (t.deadline && new Date(t.deadline) <= endOfDay(new Date())) || t.status === 'completed'
    );
    const tasksCompletedToday = tasksDueOrActive.filter((t) => t.status === 'completed').length;
    const totalTasksToday = tasksDueOrActive.length;
    const completionRate = totalTasksToday > 0 ? Math.round((tasksCompletedToday / totalTasksToday) * 100) : 0;

    const memberData: Record<string, { minutes: number; completed: number }> = {};
    team.forEach((m) => {
      memberData[m.id] = { minutes: 0, completed: 0 };
    });

    closedSessions.forEach((s) => {
      if (memberData[s.user_id]) memberData[s.user_id].minutes += s.duration_minutes || 0;
    });
    activeSessions.forEach((s) => {
      if (memberData[s.user_id]) {
        memberData[s.user_id].minutes += Math.floor((now - new Date(s.start_time).getTime()) / 60000);
      }
    });
    tasksDueOrActive.forEach((t) => {
      if (t.status === 'completed' && t.assigned_to && memberData[t.assigned_to]) {
        memberData[t.assigned_to].completed += 1;
      }
    });

    return { totalMinutesToday, avgFocusMinutes, tasksCompletedToday, totalTasksToday, completionRate, memberData };
  }, [activeSessions, closedSessions, todayTasks, now, team]);

  const demandMetrics = useMemo(() => {
    const primarySources = sources.filter((s) => s.type !== 'subclient');

    const sourceStats = primarySources
      .map((source) => {
        const sourceTasks = tasks.filter((t) => {
          if (source.type === 'project') return t.project_id === source.id;
          if (source.type === 'agency') {
            const isDirect = t.agency_id === source.id;
            const isSubclient =
              t.subclient_id && sources.find((sub) => sub.id === t.subclient_id)?.agency_id === source.id;
            return isDirect || isSubclient;
          }
          return false;
        });

        const sourceSessions = monthSessions.filter((s) => {
          const t = extractNode(s.tasks);
          if (!t) return false;
          if (source.type === 'project') return t.project_id === source.id;
          if (source.type === 'agency') {
            const isDirect = t.agency_id === source.id;
            const isSubclient =
              t.subclient_id && sources.find((sub) => sub.id === t.subclient_id)?.agency_id === source.id;
            return isDirect || isSubclient;
          }
          return false;
        });

        const totalTasks = sourceTasks.length;
        const completedTasks = sourceTasks.filter((t) => t.status === 'completed').length;
        const totalMinutes = sourceSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
        const totalHours = totalMinutes / 60;

        const fee = source.fee || 0;
        const valuePerDelivery = completedTasks > 0 ? fee / completedTasks : 0;
        const valuePerHour = totalHours > 0 ? fee / totalHours : 0;

        return {
          ...source,
          totalTasks,
          completedTasks,
          totalMinutes,
          totalHours,
          valuePerDelivery,
          valuePerHour,
        };
      })
      .filter((s) => s.totalTasks > 0 || s.totalMinutes > 0);

    sourceStats.sort((a, b) => {
      if (demandSortBy === 'valuePerHour') return b.valuePerHour - a.valuePerHour;
      if (demandSortBy === 'valuePerDelivery') return b.valuePerDelivery - a.valuePerDelivery;
      if (demandSortBy === 'more_demands') return b.totalTasks - a.totalTasks;
      if (demandSortBy === 'less_demands') return a.totalTasks - b.totalTasks;
      if (demandSortBy === 'more_time') return b.totalHours - a.totalHours;
      if (demandSortBy === 'less_time') return a.totalHours - b.totalHours;
      return 0;
    });

    return sourceStats;
  }, [sources, tasks, monthSessions, demandSortBy]);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 size={36} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 🟢 RIBBON DE PRESENÇA E FOCO DA EQUIPE */}
      <div className="tess-card p-5 border border-[var(--color-atelier-grafite)]/10">
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-[var(--color-atelier-grafite)]/8">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="tess-eyebrow">Presença Operacional em Tempo Real</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-[var(--color-atelier-grafite)]/70">
            <span>
              Foco Hoje:{' '}
              <strong className="font-roboto tabular-nums text-[var(--color-atelier-grafite)]">
                {Math.floor(metrics.totalMinutesToday / 60)}h {metrics.totalMinutesToday % 60}m
              </strong>
            </span>
            <span className="text-[var(--color-atelier-grafite)]/20">•</span>
            <span>
              Entregas:{' '}
              <strong className="font-roboto tabular-nums text-[var(--color-atelier-grafite)]">
                {metrics.tasksCompletedToday}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5 overflow-x-auto pb-2 scrollbar-none">
          {team.map((member) => {
            const status = member.current_status || 'offline';
            const isOnline = status === 'online';
            const isIdle = status === 'idle';
            const dotColor = isOnline ? 'bg-emerald-500' : isIdle ? 'bg-amber-400' : 'bg-stone-300';
            const mData = metrics.memberData[member.id] || { minutes: 0, completed: 0 };
            const focusHours = Math.floor(mData.minutes / 60);
            const focusMins = mData.minutes % 60;
            const timeStr = `${focusHours}h ${focusMins}m`;

            return (
              <div
                key={member.id}
                className="group relative flex flex-col items-center gap-1.5 shrink-0 transition-transform hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="relative">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-[var(--color-atelier-creme)] overflow-hidden ring-1 ring-[var(--color-atelier-grafite)]/12 shadow-2xs flex items-center justify-center transition-all ${
                      isOnline ? 'ring-2 ring-emerald-500/40' : ''
                    }`}
                  >
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.nome} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-elegant text-base font-bold text-[var(--color-atelier-grafite)]">
                        {member.nome.charAt(0)}
                      </span>
                    )}
                  </div>
                  {/* Ponto de status */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-white rounded-full ring-2 ring-white flex items-center justify-center shadow-xs">
                    {isOnline && <div className="absolute w-full h-full bg-emerald-500 rounded-full animate-ping opacity-60"></div>}
                    <div className={`relative w-2.5 h-2.5 rounded-full ${dotColor}`}></div>
                  </div>
                </div>

                <span className="font-roboto tabular-nums text-[11px] font-bold text-[var(--color-atelier-grafite)]/75">
                  {timeStr}
                </span>

                <span className="font-roboto tabular-nums text-[9px] font-bold uppercase tracking-wider text-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/10 px-2 py-0.5 rounded-md">
                  {mData.completed} entregas
                </span>

                {/* Tooltip de nome */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-md transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {member.nome.split(' ')[0]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🟢 CORPO PRINCIPAL EM SPLIT VIEW NATURAL (7 cols / 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: PRÓXIMAS ENTREGAS (7 COLUNAS) */}
        <div className="lg:col-span-7 tess-card p-6 border border-[var(--color-atelier-grafite)]/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-atelier-grafite)]/8">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-[var(--tess-bordo)]" />
              <h3 className="font-elegant text-xl md:text-2xl text-[var(--color-atelier-grafite)]">
                Próximas Entregas
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--tess-info)] bg-[var(--tess-info)]/10 px-2.5 py-1 rounded-lg border border-[var(--tess-info)]/20">
              Prazo Apertado
            </span>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {(() => {
                const nowMs = Date.now();
                const cutoffMs = nowMs - 14 * 24 * 60 * 60 * 1000;
                const upcoming = tasks
                  .filter(
                    (t) =>
                      (t.status === 'pending' || t.status === 'review' || t.status === 'needs_revision') &&
                      new Date(t.deadline).getTime() >= cutoffMs
                  )
                  .sort(
                    (a, b) =>
                      Math.abs(new Date(a.deadline).getTime() - nowMs) -
                      Math.abs(new Date(b.deadline).getTime() - nowMs)
                  )
                  .slice(0, 15);

                if (upcoming.length === 0) {
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center justify-center py-12 text-center text-[var(--color-atelier-grafite)]/40"
                    >
                      <Coffee size={40} className="mb-2 text-[var(--color-atelier-grafite)]/30" />
                      <p className="font-elegant text-xl">Tudo em Dia</p>
                      <p className="text-xs text-[var(--color-atelier-grafite)]/60 mt-1">
                        Nenhuma tarefa pendente próxima ao vencimento.
                      </p>
                    </motion.div>
                  );
                }

                return upcoming.map((task) => {
                  const member = team.find((t) => t.id === task.assigned_to);

                  let sourceName = 'Projeto Interno';
                  if (task.subclient_id) {
                    const s = sources.find((x) => x.id === task.subclient_id);
                    sourceName = s ? s.name : 'Subcliente';
                  } else if (task.agency_id) {
                    const s = sources.find((x) => x.id === task.agency_id);
                    sourceName = s ? s.name : 'Agência';
                  } else if (task.project_id) {
                    const s = sources.find((x) => x.id === task.project_id);
                    sourceName = s ? s.name : 'Studio Veronna';
                  }

                  const isLate = new Date(task.deadline) < new Date();

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      key={task.id}
                      className="tess-surface hover:bg-white/90 p-3.5 sm:p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/10 transition-all flex items-center gap-3 sm:gap-4 group shadow-2xs"
                    >
                      <div
                        className={`w-1.5 h-10 rounded-full shrink-0 ${
                          task.status === 'pending'
                            ? 'bg-[var(--tess-info)]'
                            : task.status === 'needs_revision'
                            ? 'bg-[var(--tess-danger)]'
                            : 'bg-[var(--color-atelier-terracota)]'
                        }`}
                      />

                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-creme)] flex items-center justify-center overflow-hidden ring-1 ring-[var(--color-atelier-grafite)]/10">
                          {member?.avatar_url ? (
                            <img src={member.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-elegant text-sm text-[var(--color-atelier-grafite)]">
                              {member?.nome?.charAt(0) || '?'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col flex-1 truncate pr-2">
                        <span className="font-bold text-xs sm:text-sm text-[var(--color-atelier-grafite)] truncate">
                          {task.title || 'Tarefa Sem Título'}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 truncate text-[10px] text-[var(--color-atelier-grafite)]/60">
                          <span className="font-bold uppercase tracking-wider text-[var(--color-atelier-terracota)] shrink-0">
                            {sourceName}
                          </span>
                          <span>•</span>
                          <span className="truncate">{member?.nome || 'Não atribuído'}</span>
                        </div>
                      </div>

                      <div
                        className={`px-3 py-1.5 rounded-xl font-roboto tabular-nums text-[11px] font-bold tracking-wider shrink-0 text-center border ${
                          isLate
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-[var(--color-atelier-creme)] text-[var(--color-atelier-grafite)] border-[var(--color-atelier-grafite)]/12'
                        }`}
                      >
                        {new Date(task.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </div>

                      <button
                        onClick={() => router.push(`/admin/task/${task.id}`)}
                        className="w-8 h-8 rounded-xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] hover:border-[var(--color-atelier-terracota)]/30 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                        title="Ver detalhes da demanda"
                      >
                        <Edit2 size={13} />
                      </button>
                    </motion.div>
                  );
                });
              })()}
            </AnimatePresence>
          </div>
        </div>

        {/* COLUNA DIREITA: DEMANDAS & UNIT ECONOMICS (5 COLUNAS) */}
        <div className="lg:col-span-5 tess-card p-6 border border-[var(--color-atelier-grafite)]/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-atelier-grafite)]/8">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-[var(--color-atelier-terracota)]" />
              <h3 className="font-elegant text-xl md:text-2xl text-[var(--color-atelier-grafite)]">
                Demandas &amp; Economia
              </h3>
            </div>
            <span className="tess-eyebrow">Mês Atual</span>
          </div>

          {/* Filtros em linha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              className="tess-surface border border-[var(--color-atelier-grafite)]/12 text-[11px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/80 rounded-xl px-3 py-1.5 outline-none cursor-pointer hover:bg-white transition-colors"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
            >
              <option value="all">Todas as Origens</option>
              <option value="project">Studio Veronna</option>
              <option value="agency">Agências (WL)</option>
            </select>

            <select
              className="tess-surface border border-[var(--color-atelier-grafite)]/12 text-[11px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/80 rounded-xl px-3 py-1.5 outline-none cursor-pointer hover:bg-white transition-colors"
              value={demandSortBy}
              onChange={(e) => setDemandSortBy(e.target.value as any)}
            >
              <option value="valuePerHour">Melhor Hora Paga</option>
              <option value="valuePerDelivery">Melhor Valor/Entrega</option>
              <option value="more_demands">Mais Demandas</option>
              <option value="less_demands">Menos Demandas</option>
              <option value="more_time">Mais Tempo Gasto</option>
              <option value="less_time">Menos Tempo Gasto</option>
            </select>
          </div>

          <div className="space-y-3 pt-1">
            <AnimatePresence>
              {(() => {
                const filteredMetrics = demandMetrics.filter((m) => {
                  if (filterSource === 'all') return true;
                  return m.type === filterSource;
                });

                if (filteredMetrics.length === 0) {
                  return (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-12 text-center text-xs text-[var(--color-atelier-grafite)]/50 italic"
                    >
                      Nenhum dado financeiro ou de demanda no período.
                    </motion.div>
                  );
                }

                return filteredMetrics.map((metric, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    key={metric.id}
                    className="tess-surface p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/10 hover:border-[var(--color-atelier-terracota)]/30 transition-all space-y-3 shadow-2xs"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-col truncate pr-2">
                        <span className="font-bold text-xs sm:text-sm text-[var(--color-atelier-grafite)] truncate">
                          {metric.name}
                        </span>
                        <span className="tess-eyebrow text-[9px] mt-0.5">{metric.label}</span>
                      </div>
                      <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-roboto tabular-nums font-bold flex items-center gap-1 shrink-0">
                        <DollarSign size={12} />
                        {metric.fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center pt-1 border-t border-[var(--color-atelier-grafite)]/6">
                      <div className="flex flex-col bg-[var(--color-atelier-creme)] rounded-xl p-2 border border-[var(--color-atelier-grafite)]/8">
                        <span className="font-roboto tabular-nums text-base font-bold text-[var(--color-atelier-grafite)]">
                          {metric.totalTasks}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/50 mt-0.5">
                          Demandas
                        </span>
                      </div>

                      <div className="flex flex-col bg-[var(--color-atelier-creme)] rounded-xl p-2 border border-[var(--color-atelier-grafite)]/8">
                        <span className="font-roboto tabular-nums text-base font-bold text-[var(--color-atelier-grafite)]">
                          {metric.totalHours.toFixed(1)}h
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/50 mt-0.5">
                          Tempo
                        </span>
                      </div>

                      <div className="flex flex-col bg-amber-50/70 rounded-xl p-2 border border-amber-200/60">
                        <span className="font-roboto tabular-nums text-base font-bold text-amber-800">
                          {metric.valuePerHour > 0 ? `R$${Math.round(metric.valuePerHour)}` : '-'}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-amber-700/70 mt-0.5">
                          R$/Hora
                        </span>
                      </div>

                      <div className="flex flex-col bg-sky-50/70 rounded-xl p-2 border border-sky-200/60">
                        <span className="font-roboto tabular-nums text-base font-bold text-[var(--tess-info)]">
                          {metric.valuePerDelivery > 0 ? `R$${Math.round(metric.valuePerDelivery)}` : '-'}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--tess-info)]/70 mt-0.5">
                          R$/Entrega
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ));
              })()}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
