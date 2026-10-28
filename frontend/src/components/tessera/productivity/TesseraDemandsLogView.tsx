// src/components/tessera/productivity/TesseraDemandsLogView.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Search,
  Filter,
  CheckSquare,
  AlertCircle,
  Clock,
  UserCircle2,
  ChevronDown,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { startOfMonth } from 'date-fns';

interface TesseraDemandsLogViewProps {
  currentUser: any;
}

function extractNode(node: any): any {
  if (!node) return null;
  return Array.isArray(node) ? node[0] : node;
}

export default function TesseraDemandsLogView({ currentUser }: TesseraDemandsLogViewProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);

  const [filterCollab, setFilterCollab] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
      console.error('Erro ao buscar log de demandas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = (task.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCollab = filterCollab === 'all' || task.assigned_to === filterCollab;
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'completed' && task.status === 'completed') ||
        (filterStatus === 'pending' && task.status === 'pending') ||
        (filterStatus === 'review' && (task.status === 'review' || task.status === 'needs_revision'));

      let matchesSource = filterSource === 'all';
      if (filterSource !== 'all') {
        const [sourceType, sourceId] = filterSource.split('::');
        if (sourceType === 'project') matchesSource = task.project_id === sourceId;
        if (sourceType === 'agency') matchesSource = task.agency_id === sourceId;
        if (sourceType === 'subclient') matchesSource = task.subclient_id === sourceId;
      }

      return matchesSearch && matchesCollab && matchesStatus && matchesSource;
    });
  }, [tasks, searchQuery, filterCollab, filterSource, filterStatus]);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 size={36} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  const statusPills = [
    {
      id: 'all',
      label: 'Visão Geral',
      count: filteredTasks.length,
      icon: Layers,
      color: 'text-[var(--color-atelier-grafite)]',
      border: 'border-[var(--color-atelier-grafite)]/20',
    },
    {
      id: 'completed',
      label: 'Prontos',
      count: filteredTasks.filter((t) => t.status === 'completed').length,
      icon: CheckSquare,
      color: 'text-emerald-700',
      border: 'border-emerald-300',
    },
    {
      id: 'review',
      label: 'Em Revisão',
      count: filteredTasks.filter((t) => t.status === 'review' || t.status === 'needs_revision').length,
      icon: AlertCircle,
      color: 'text-[var(--color-atelier-terracota)]',
      border: 'border-[var(--color-atelier-terracota)]/40',
    },
    {
      id: 'pending',
      label: 'A Fazer',
      count: filteredTasks.filter((t) => t.status === 'pending').length,
      icon: Clock,
      color: 'text-[var(--tess-info)]',
      border: 'border-[var(--tess-info)]/40',
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* 🟢 BARRA DE FILTROS SUPERIOR */}
      <div className="tess-card p-4 border border-[var(--color-atelier-grafite)]/10 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40" size={15} />
          <input
            type="text"
            placeholder="Filtrar registro por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full tess-surface border border-[var(--color-atelier-grafite)]/12 rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-[var(--color-atelier-grafite)] placeholder-[var(--color-atelier-grafite)]/40 outline-none focus:ring-1 focus:ring-[var(--tess-accent)] transition-all"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/50 shrink-0">
            <Filter size={12} /> Refinar
          </div>

          <div className="relative shrink-0">
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="appearance-none tess-surface border border-[var(--color-atelier-grafite)]/12 rounded-xl pl-3 pr-8 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)] outline-none shadow-2xs cursor-pointer hover:bg-white transition-colors"
            >
              <option value="all">Todas as Origens</option>
              {sources.map((s) => (
                <option key={`${s.type}::${s.id}`} value={`${s.type}::${s.id}`}>
                  [{s.label}] {s.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative shrink-0">
            <select
              value={filterCollab}
              onChange={(e) => setFilterCollab(e.target.value)}
              className="appearance-none tess-surface border border-[var(--color-atelier-grafite)]/12 rounded-xl pl-3 pr-8 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)] outline-none shadow-2xs cursor-pointer hover:bg-white transition-colors"
            >
              <option value="all">Toda a Equipe</option>
              {team.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome.split(' ')[0]}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 🟢 CARDS DE STATUS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statusPills.map((pill) => {
          const Icon = pill.icon;
          const active = filterStatus === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => setFilterStatus(pill.id)}
              className={`tess-card p-4 border transition-all text-left flex items-center gap-3 cursor-pointer ${
                active
                  ? `bg-white ${pill.border} ring-2 ring-[var(--tess-accent)]/15 shadow-sm`
                  : 'border-[var(--color-atelier-grafite)]/10 hover:bg-white/80'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  active ? 'bg-[var(--color-atelier-creme)] ' + pill.color : 'bg-stone-100 text-stone-400'
                }`}
              >
                <Icon size={18} />
              </div>
              <div className="flex flex-col">
                <span className={`text-xs font-bold uppercase tracking-wider leading-none ${active ? pill.color : 'text-[var(--color-atelier-grafite)]/70'}`}>
                  {pill.label}
                </span>
                <span className="font-roboto tabular-nums text-[11px] font-bold text-[var(--color-atelier-grafite)]/50 mt-1">
                  {pill.count} Registros
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 🟢 LISTAGEM OPERACIONAL DE DEMANDAS */}
      <div className="tess-card p-6 border border-[var(--color-atelier-grafite)]/10 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-atelier-grafite)]/8">
          <span className="tess-eyebrow">Registro Detalhado ({filteredTasks.length})</span>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredTasks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-16 text-center text-[var(--color-atelier-grafite)]/40 flex flex-col items-center"
              >
                <Filter size={32} className="mb-2 text-[var(--color-atelier-grafite)]/30" />
                <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)]/80">Log Vazio</p>
                <p className="text-xs text-[var(--color-atelier-grafite)]/50 mt-1">
                  Modifique a sintonia dos filtros para encontrar resultados.
                </p>
              </motion.div>
            ) : (
              filteredTasks.map((task) => {
                const executor = team.find((t) => t.id === task.assigned_to);

                let sourceTag = 'Interno';
                let sourceColor = 'bg-stone-100 text-stone-700 border-stone-200';
                let sourceName = 'Sem Projeto';

                if (task.subclient_id) {
                  const sub = sources.find((s) => s.id === task.subclient_id);
                  sourceTag = 'Subcliente WL';
                  sourceColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                  sourceName = sub?.name || 'Subcliente';
                } else if (task.agency_id) {
                  const ag = sources.find((s) => s.id === task.agency_id);
                  sourceTag = 'Agência WL';
                  sourceColor = 'bg-[var(--tess-accent)]/10 text-[var(--tess-accent)] border-[var(--tess-accent)]/20';
                  sourceName = ag?.name || 'Agência';
                } else if (task.project_id) {
                  const proj = sources.find((s) => s.id === task.project_id);
                  sourceTag = 'Studio Veronna';
                  sourceColor = 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)]/20';
                  sourceName = proj?.name || 'Projeto Próprio';
                }

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="tess-surface hover:bg-white/95 p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-2xs cursor-pointer"
                    onClick={() => router.push(`/admin/task/${task.id}`)}
                  >
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${sourceColor} shrink-0`}>
                          {sourceTag}
                        </span>
                        <span className="text-xs font-bold text-[var(--color-atelier-grafite)]/50 truncate max-w-[300px]">
                          {sourceName}
                        </span>
                      </div>
                      <span
                        className={`font-bold text-sm leading-snug ${
                          task.status === 'completed'
                            ? 'line-through text-[var(--color-atelier-grafite)]/40'
                            : 'text-[var(--color-atelier-grafite)]'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 sm:border-l sm:border-[var(--color-atelier-grafite)]/10 sm:pl-5">
                      <div className="flex flex-col sm:text-right">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider flex items-center sm:justify-end gap-1.5 ${
                            task.status === 'completed'
                              ? 'text-emerald-700'
                              : task.status === 'review' || task.status === 'needs_revision'
                              ? 'text-[var(--color-atelier-terracota)]'
                              : 'text-[var(--tess-info)]'
                          }`}
                        >
                          {task.status === 'completed' && <CheckSquare size={14} />}
                          {task.status === 'completed'
                            ? 'Concluída'
                            : task.status === 'review' || task.status === 'needs_revision'
                            ? 'Revisão'
                            : 'Pendente'}
                        </span>
                        <span className="text-[10px] text-[var(--color-atelier-grafite)]/40 mt-0.5">
                          {task.deadline
                            ? `Prazo: ${new Date(task.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
                            : 'Sem prazo'}
                        </span>
                      </div>

                      <div className="relative group/avatar">
                        <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-[var(--color-atelier-grafite)]/12 bg-[var(--color-atelier-creme)] flex items-center justify-center shadow-2xs">
                          {executor?.avatar_url ? (
                            <img src={executor.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <UserCircle2 size={18} className="text-stone-400" />
                          )}
                        </div>
                        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-[var(--color-atelier-grafite)] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md">
                          {executor?.nome || 'Não Atribuído'}
                        </div>
                      </div>

                      <ExternalLink size={14} className="text-[var(--color-atelier-grafite)]/30 group-hover:text-[var(--color-atelier-terracota)] transition-colors shrink-0" />
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
