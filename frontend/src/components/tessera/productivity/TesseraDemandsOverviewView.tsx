// src/components/tessera/productivity/TesseraDemandsOverviewView.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  Layers,
  BarChart3,
  CheckSquare,
  AlertCircle,
  Clock,
  Briefcase,
  PieChart,
  Trophy,
  Activity,
  Loader2,
} from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';

interface TesseraDemandsOverviewViewProps {
  currentUser: any;
}

function extractNode(node: any): any {
  if (!node) return null;
  return Array.isArray(node) ? node[0] : node;
}

// 🟢 WIDGET: Anéis Concêntricos com Paleta Studio Veronna
const ConcentricRings = ({
  completed,
  review,
  pending,
  total,
  size = 110,
}: {
  completed: number;
  review: number;
  pending: number;
  total: number;
  size?: number;
}) => {
  const getOffset = (val: number, r: number) => {
    const circumference = 2 * Math.PI * r;
    if (total === 0) return circumference;
    return circumference - (val / total) * circumference;
  };

  return (
    <div
      className="relative flex items-center justify-center filter drop-shadow-xs"
      style={{ width: size, height: size }}
    >
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Ring 1: Concluídas (Esmeralda / Sucesso) */}
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(31, 122, 85, 0.15)" strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="var(--tess-success, #1F7A55)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 42}
          initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
          animate={{ strokeDashoffset: getOffset(completed, 42) }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />

        {/* Ring 2: Em Revisão (Terracota) */}
        <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(195, 106, 74, 0.18)" strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r="28"
          fill="none"
          stroke="var(--color-atelier-terracota, #C36A4A)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 28}
          initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
          animate={{ strokeDashoffset: getOffset(review, 28) }}
          transition={{ duration: 1.2, delay: 0.15, ease: 'easeOut' }}
        />

        {/* Ring 3: Pendentes (Navy / Grafite) */}
        <circle cx="50" cy="50" r="14" fill="none" stroke="rgba(20, 44, 72, 0.15)" strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r="14"
          fill="none"
          stroke="var(--tess-accent, #142C48)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 14}
          initial={{ strokeDashoffset: 2 * Math.PI * 14 }}
          animate={{ strokeDashoffset: getOffset(pending, 14) }}
          transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
        />
      </svg>
      <div
        className="absolute flex flex-col items-center justify-center bg-[var(--color-atelier-creme)] rounded-full ring-1 ring-[var(--color-atelier-grafite)]/10 shadow-inner"
        style={{ width: size * 0.36, height: size * 0.36 }}
      >
        <Activity size={size * 0.18} className="text-[var(--tess-bordo)]" />
      </div>
    </div>
  );
};

export default function TesseraDemandsOverviewView({ currentUser }: TesseraDemandsOverviewViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);

  useEffect(() => {
    fetchDemandData();
  }, []);

  const fetchDemandData = async () => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();

      const { data: teamData } = await (supabase.from('profiles') as any)
        .select('id, nome, avatar_url')
        .in('role', ['colaborador', 'gestor', 'admin']);
      if (teamData) setTeam(teamData);

      const [resProjects, resAgencies, resSubs] = await Promise.all([
        (supabase.from('projects') as any).select('id, profiles(nome)').eq('status', 'active'),
        (supabase.from('agencies') as any).select('id, name').eq('status', 'active'),
        (supabase.from('agency_subclients') as any).select('id, name, agency_id'),
      ]);

      const unifiedSources: any[] = [];
      if (resProjects.data) {
        (resProjects.data as any[]).forEach((p: any) => {
          const profile = extractNode(p.profiles);
          unifiedSources.push({
            id: p.id,
            type: 'project',
            name: profile?.nome || 'Projeto Desconhecido',
            label: 'Studio Veronna',
          });
        });
      }
      if (resAgencies.data) {
        (resAgencies.data as any[]).forEach((a: any) =>
          unifiedSources.push({ id: a.id, type: 'agency', name: a.name, label: 'Agência WL' })
        );
      }
      if (resSubs.data) {
        (resSubs.data as any[]).forEach((s: any) =>
          unifiedSources.push({ id: s.id, type: 'subclient', name: s.name, label: 'Subcliente WL' })
        );
      }

      setSources(unifiedSources.sort((a, b) => a.name.localeCompare(b.name)));

      const { data: tasksData } = await (supabase.from('tasks') as any)
        .select('*')
        .or(
          `created_at.gte.${monthStart},deadline.gte.${monthStart},completed_at.gte.${monthStart},status.in.(pending,review,needs_revision)`
        )
        .order('created_at', { ascending: false });

      if (tasksData) setTasks(tasksData);
    } catch (error) {
      console.error('Erro ao buscar visão geral de demandas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const kpis = useMemo(() => {
    const totalMonth = tasks.length;
    const completedMonth = tasks.filter((t) => t.status === 'completed').length;
    const reviewMonth = tasks.filter((t) => t.status === 'review' || t.status === 'needs_revision').length;
    const pendingMonth = tasks.filter((t) => t.status === 'pending').length;

    const completionsByCollab: Record<string, number> = {};
    tasks.forEach((t) => {
      if (t.status === 'completed' && t.assigned_to) {
        completionsByCollab[t.assigned_to] = (completionsByCollab[t.assigned_to] || 0) + 1;
      }
    });

    const ranking = Object.entries(completionsByCollab)
      .map(([id, count]) => {
        const member = team.find((m) => m.id === id);
        return { id, name: member?.nome || 'Desconhecido', avatar: member?.avatar_url, count };
      })
      .sort((a, b) => b.count - a.count);

    return { totalMonth, completedMonth, reviewMonth, pendingMonth, ranking };
  }, [tasks, team]);

  const topSources = useMemo(() => {
    if (sources.length === 0 || tasks.length === 0) return { list: [], maxHours: 1 };

    const sourceMap: Record<string, { count: number; hours: number; name: string; type: string; label: string }> = {};
    let localMaxHours = 1;

    tasks.forEach((t) => {
      let sId = null;
      let sType = '';
      if (t.subclient_id) {
        sId = t.subclient_id;
        sType = 'subclient';
      } else if (t.agency_id) {
        sId = t.agency_id;
        sType = 'agency';
      } else if (t.project_id) {
        sId = t.project_id;
        sType = 'project';
      }

      if (sId) {
        const key = `${sType}::${sId}`;
        if (!sourceMap[key]) {
          const sourceDef = sources.find((s) => s.id === sId && s.type === sType);
          sourceMap[key] = {
            count: 0,
            hours: 0,
            name: sourceDef?.name || 'Desconhecido',
            type: sType,
            label: sourceDef?.label || 'Indefinido',
          };
        }
        sourceMap[key].count += 1;
        sourceMap[key].hours += (t.estimated_time || 60) / 60;
        if (sourceMap[key].hours > localMaxHours) localMaxHours = sourceMap[key].hours;
      }
    });

    const list = Object.values(sourceMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return { list, maxHours: localMaxHours };
  }, [tasks, sources]);

  const workloadDistribution = useMemo(() => {
    let studioTasks = 0;
    let agencyWLTasks = 0;
    let subclientWLTasks = 0;

    tasks.forEach((t) => {
      if (t.subclient_id) subclientWLTasks++;
      else if (t.agency_id) agencyWLTasks++;
      else if (t.project_id) studioTasks++;
    });

    const total = studioTasks + agencyWLTasks + subclientWLTasks;
    if (total === 0) return { studio: 0, agencyWL: 0, subclientWL: 0, total: 1 };

    return {
      studio: (studioTasks / total) * 100,
      agencyWL: (agencyWLTasks / total) * 100,
      subclientWL: (subclientWLTasks / total) * 100,
      total,
    };
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 size={36} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA (8 COLUNAS) */}
        <div className="lg:col-span-8 space-y-6">
          {/* WIDGET 1: ANÉIS E RESUMO OPERACIONAL */}
          <div className="tess-card p-6 border border-[var(--color-atelier-grafite)]/10 flex flex-col md:flex-row items-center gap-6">
            <div className="shrink-0">
              <ConcentricRings
                completed={kpis.completedMonth}
                review={kpis.reviewMonth}
                pending={kpis.pendingMonth}
                total={kpis.totalMonth}
                size={120}
              />
            </div>

            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full border-t md:border-t-0 md:border-l border-[var(--color-atelier-grafite)]/10 pt-4 md:pt-0 md:pl-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/50 mb-1 flex items-center gap-1.5">
                  <BarChart3 size={12} /> Total Mês
                </span>
                <span className="font-roboto tabular-nums text-3xl md:text-4xl font-bold text-[var(--color-atelier-grafite)]">
                  {kpis.totalMonth}
                </span>
                <span className="text-[10px] text-[var(--color-atelier-grafite)]/50 mt-0.5">demandas geradas</span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Prontas
                </span>
                <span className="font-roboto tabular-nums text-3xl md:text-4xl font-bold text-emerald-700">
                  {kpis.completedMonth}
                </span>
                <span className="text-[10px] text-emerald-600/70 mt-0.5">
                  {kpis.totalMonth > 0 ? Math.round((kpis.completedMonth / kpis.totalMonth) * 100) : 0}% concluídas
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-atelier-terracota)] mb-1 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-atelier-terracota)]"></div> Em Revisão
                </span>
                <span className="font-roboto tabular-nums text-3xl md:text-4xl font-bold text-[var(--color-atelier-terracota)]">
                  {kpis.reviewMonth}
                </span>
                <span className="text-[10px] text-[var(--color-atelier-terracota)]/70 mt-0.5">aguardando validação</span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--tess-info)] mb-1 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[var(--tess-info)]"></div> Em Fila
                </span>
                <span className="font-roboto tabular-nums text-3xl md:text-4xl font-bold text-[var(--tess-info)]">
                  {kpis.pendingMonth}
                </span>
                <span className="text-[10px] text-[var(--tess-info)]/70 mt-0.5">a iniciar</span>
              </div>
            </div>
          </div>

          {/* ROW 2: TOP DEMANDANTES & DISTRIBUIÇÃO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* WIDGET 2: TOP DEMANDANTES */}
            <div className="tess-card p-6 border border-[var(--color-atelier-grafite)]/10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-atelier-grafite)]/8">
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-[var(--color-atelier-terracota)]" />
                  <h4 className="font-elegant text-lg text-[var(--color-atelier-grafite)]">Top Demandantes</h4>
                </div>
                <span className="tess-eyebrow">Top 5</span>
              </div>

              <div className="space-y-3">
                {topSources.list.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--color-atelier-grafite)]/50 italic">
                    Sem volume suficiente de demandas.
                  </div>
                ) : (
                  topSources.list.map((src, i) => (
                    <div
                      key={i}
                      className="tess-surface p-3.5 rounded-2xl border border-[var(--color-atelier-grafite)]/10 hover:border-[var(--color-atelier-terracota)]/30 transition-all space-y-2 shadow-2xs"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col overflow-hidden pr-2">
                          <span className="text-xs font-bold text-[var(--color-atelier-grafite)] truncate">
                            {src.name}
                          </span>
                          <span className="tess-eyebrow text-[9px] mt-0.5">{src.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-roboto tabular-nums text-sm font-bold text-[var(--color-atelier-terracota)]">
                            {src.count}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-[var(--color-atelier-grafite)]/40">
                            reqs
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-1.5 flex-1 bg-[var(--color-atelier-creme)] rounded-full overflow-hidden ring-1 ring-[var(--color-atelier-grafite)]/8">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(src.hours / topSources.maxHours) * 100}%` }}
                            transition={{ duration: 0.8 }}
                            className="h-full bg-[var(--color-atelier-grafite)] rounded-full"
                          />
                        </div>
                        <span className="font-roboto tabular-nums text-[10px] font-bold text-[var(--color-atelier-grafite)]/70 shrink-0">
                          ~{src.hours.toFixed(1)}h
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* WIDGET 3: DISTRIBUIÇÃO DE CARGA */}
            <div className="tess-card p-6 border border-[var(--color-atelier-grafite)]/10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-atelier-grafite)]/8">
                <div className="flex items-center gap-2">
                  <PieChart size={16} className="text-[var(--tess-bordo)]" />
                  <h4 className="font-elegant text-lg text-[var(--color-atelier-grafite)]">Distribuição de Carga</h4>
                </div>
                <span className="tess-eyebrow">Origens</span>
              </div>

              <div className="space-y-4">
                {/* Barra segmentada */}
                <div className="h-3 w-full bg-[var(--color-atelier-creme)] rounded-full overflow-hidden flex ring-1 ring-[var(--color-atelier-grafite)]/10 shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${workloadDistribution.studio}%` }}
                    className="bg-[var(--color-atelier-terracota)] h-full"
                    title={`Studio Veronna: ${workloadDistribution.studio.toFixed(1)}%`}
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${workloadDistribution.agencyWL}%` }}
                    className="bg-[var(--tess-accent)] h-full border-l border-white/20"
                    title={`Agências WL: ${workloadDistribution.agencyWL.toFixed(1)}%`}
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${workloadDistribution.subclientWL}%` }}
                    className="bg-indigo-400 h-full border-l border-white/20"
                    title={`Subclientes WL: ${workloadDistribution.subclientWL.toFixed(1)}%`}
                  />
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 rounded-xl tess-surface border border-[var(--color-atelier-grafite)]/10 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-atelier-terracota)]" />
                      <span className="text-xs font-bold text-[var(--color-atelier-grafite)]">Studio Veronna</span>
                    </div>
                    <span className="font-roboto tabular-nums font-bold text-sm text-[var(--color-atelier-grafite)]">
                      {workloadDistribution.studio.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl tess-surface border border-[var(--color-atelier-grafite)]/10 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--tess-accent)]" />
                      <span className="text-xs font-bold text-[var(--color-atelier-grafite)]">Agências (WL)</span>
                    </div>
                    <span className="font-roboto tabular-nums font-bold text-sm text-[var(--color-atelier-grafite)]">
                      {workloadDistribution.agencyWL.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl tess-surface border border-[var(--color-atelier-grafite)]/10 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                      <span className="text-xs font-bold text-[var(--color-atelier-grafite)]">Subclientes (WL)</span>
                    </div>
                    <span className="font-roboto tabular-nums font-bold text-sm text-[var(--color-atelier-grafite)]">
                      {workloadDistribution.subclientWL.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: LEADERBOARD VERTICAL TESSERA (4 COLUNAS) */}
        <div className="lg:col-span-4 tess-card p-6 border border-[var(--color-atelier-grafite)]/10 bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] rounded-3xl relative overflow-hidden space-y-5 shadow-lg">
          <div className="flex flex-col border-b border-white/10 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-atelier-terracota)]/20 flex items-center justify-center ring-1 ring-[var(--color-atelier-terracota)]/30 mb-3 shadow-inner">
              <Trophy size={24} className="text-[var(--color-atelier-terracota)]" />
            </div>
            <h3 className="font-elegant text-2xl text-white leading-tight">Painel de Rankeamento</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 mt-1 flex items-center gap-1.5">
              <Activity size={12} /> Escoamento Mensal
            </span>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {kpis.ranking.length === 0 ? (
                <div className="text-center py-10 opacity-50 flex flex-col items-center">
                  <CheckSquare size={32} className="mb-2 text-white/40" />
                  <p className="font-elegant text-lg text-white">Vazio</p>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 mt-1">
                    Aguardando Entregas
                  </span>
                </div>
              ) : (
                kpis.ranking.map((member, idx) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    key={member.id}
                    className="bg-white/6 hover:bg-white/10 p-3.5 rounded-2xl ring-1 ring-white/10 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          idx === 0
                            ? 'bg-[var(--color-atelier-terracota)] text-white shadow-xs'
                            : idx === 1
                            ? 'bg-stone-300 text-[var(--color-atelier-grafite)]'
                            : idx === 2
                            ? 'bg-amber-300 text-[var(--color-atelier-grafite)]'
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {idx + 1}º
                      </div>

                      <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/20 bg-stone-800 flex items-center justify-center shrink-0">
                        {member.avatar ? (
                          <img src={member.avatar} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-elegant text-sm text-white">{member.name.charAt(0)}</span>
                        )}
                      </div>

                      <span className="font-bold text-xs text-white truncate max-w-[110px]">
                        {member.name.split(' ')[0]}
                      </span>
                    </div>

                    <div className="flex flex-col items-end shrink-0 pl-3 border-l border-white/10">
                      <span className="font-roboto tabular-nums font-bold text-2xl text-[var(--color-atelier-terracota)] leading-none">
                        {member.count}
                      </span>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-white/40 mt-1">
                        concluídas
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
