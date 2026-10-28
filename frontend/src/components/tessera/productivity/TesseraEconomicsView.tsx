// src/components/tessera/productivity/TesseraEconomicsView.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Zap,
  Skull,
  Star,
  ShieldAlert,
  Loader2,
  Info,
  Search,
  Heart,
  Briefcase,
} from 'lucide-react';
import { differenceInDays, startOfMonth } from 'date-fns';

interface TesseraEconomicsViewProps {
  currentUser: any;
}

function extractNode(node: any): any {
  if (!node) return null;
  return Array.isArray(node) ? node[0] : node;
}

export default function TesseraEconomicsView({ currentUser }: TesseraEconomicsViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const CUSTO_HORA_AGENCIA = 65; // R$ 65,00/h base operacional

  useEffect(() => {
    fetchEconomicsData();
  }, []);

  const fetchEconomicsData = async () => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();

      const overviewRes = await fetch('/api/clients/overview').then((r) => r.json()).catch(() => ({}));
      const allProjects = overviewRes?.data?.enrichedProjects || [];

      const { data: sessions } = await (supabase.from('work_sessions') as any)
        .select('duration_minutes, task_id, tasks(project_id, agency_id, subclient_id)')
        .gte('start_time', monthStart);

      const { data: subclients } = await (supabase.from('agency_subclients') as any).select('id, agency_id');

      const subclientAgencyMap: Record<string, string> = {};
      if (subclients) {
        (subclients as any[]).forEach((sub: any) => {
          if (sub.agency_id) subclientAgencyMap[sub.id] = sub.agency_id;
        });
      }

      const { data: npsScores } = await (supabase.from('t_nps_scores') as any)
        .select('project_id, score')
        .order('created_at', { ascending: false });

      const { data: lastTasks } = await (supabase.from('tasks') as any)
        .select('project_id, agency_id, subclient_id, completed_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      const enrichedData: any[] = [];

      allProjects.forEach((proj: any) => {
        if (proj.isLead || proj.status !== 'active') return;

        if (!proj.isAgency) {
          const clientName = proj.profiles?.nome || 'Cliente Desconhecido';
          const avatarUrl = proj.profiles?.avatar_url || null;

          const projectSessions =
            sessions?.filter((s: any) => {
              const safeTask = extractNode(s.tasks);
              return safeTask?.project_id === proj.id;
            }) || [];

          const totalMinutes = projectSessions.reduce((acc: number, s: any) => acc + (s.duration_minutes || 0), 0);
          const totalHours = totalMinutes / 60;
          const operationalCost = totalHours * CUSTO_HORA_AGENCIA;
          const fee = Number(proj.financial_value || 0);
          const grossMargin = fee - operationalCost;
          const marginPercentage = fee > 0 ? (grossMargin / fee) * 100 : 0;

          const latestNps = npsScores?.find((n: any) => n.project_id === proj.id)?.score || null;
          const lastDelivery = lastTasks?.find((t: any) => t.project_id === proj.id)?.completed_at;
          const daysSinceLastDelivery = lastDelivery ? differenceInDays(now, new Date(lastDelivery)) : 99;

          const churnRisk = daysSinceLastDelivery > 7 ? 'high' : daysSinceLastDelivery > 4 ? 'medium' : 'low';

          let classification = '';
          let color = '';
          let icon = null;

          if (fee >= 2000 && totalHours < 15) {
            classification = 'Estrela';
            color = 'text-emerald-700 border-emerald-200 bg-emerald-50';
            icon = <Star size={12} fill="currentColor" />;
          } else if (fee < 1500 && totalHours > 25) {
            classification = 'Vampiro (Tóxico)';
            color = 'text-rose-700 border-rose-200 bg-rose-50';
            icon = <Skull size={12} />;
          } else if (grossMargin > fee * 0.5) {
            classification = 'Alta Lucratividade';
            color = 'text-[var(--tess-info)] border-blue-200 bg-blue-50';
            icon = <Zap size={12} fill="currentColor" />;
          } else {
            classification = 'Equilibrado';
            color = 'text-stone-600 border-stone-200 bg-stone-50';
            icon = <Heart size={12} />;
          }

          enrichedData.push({
            id: proj.id,
            sourceType: 'project',
            clientName,
            avatar: avatarUrl,
            type: proj.type || 'Studio Veronna',
            fee,
            totalHours,
            operationalCost,
            grossMargin,
            marginPercentage,
            latestNps,
            daysSinceLastDelivery,
            churnRisk,
            classification,
            color,
            icon,
          });
        }
      });

      allProjects.forEach((proj: any) => {
        if (proj.isLead || proj.status !== 'active') return;

        if (proj.isAgency) {
          const ag = proj;
          const agencySessions =
            sessions?.filter((s: any) => {
              const safeTask = extractNode(s.tasks);
              const belongsToAgency = safeTask?.agency_id === ag.id || safeTask?.agency_id === ag.client_id;
              const belongsToSubclientOfAgency =
                safeTask?.subclient_id && subclientAgencyMap[safeTask.subclient_id] === (ag.id || ag.client_id);
              return belongsToAgency || belongsToSubclientOfAgency;
            }) || [];

          const totalMinutes = agencySessions.reduce((acc: number, s: any) => acc + (s.duration_minutes || 0), 0);
          const totalHours = totalMinutes / 60;
          const operationalCost = totalHours * CUSTO_HORA_AGENCIA;
          const fee = Number(ag.financial_value || 0);
          const grossMargin = fee - operationalCost;
          const marginPercentage = fee > 0 ? (grossMargin / fee) * 100 : 0;

          const lastDelivery = lastTasks?.find(
            (t: any) =>
              t.agency_id === (ag.id || ag.client_id) ||
              (t.subclient_id && subclientAgencyMap[t.subclient_id] === (ag.id || ag.client_id))
          )?.completed_at;
          const daysSinceLastDelivery = lastDelivery ? differenceInDays(now, new Date(lastDelivery)) : 99;

          const churnRisk = daysSinceLastDelivery > 7 ? 'high' : daysSinceLastDelivery > 4 ? 'medium' : 'low';

          let classification = '';
          let color = '';
          let icon = null;

          if (fee >= 3000 && totalHours < 30) {
            classification = 'Estrela WL';
            color = 'text-emerald-700 border-emerald-200 bg-emerald-50';
            icon = <Star size={12} fill="currentColor" />;
          } else if (fee < 2000 && totalHours > 40) {
            classification = 'Vampiro WL';
            color = 'text-rose-700 border-rose-200 bg-rose-50';
            icon = <Skull size={12} />;
          } else if (grossMargin > fee * 0.4) {
            classification = 'Boa Lucratividade';
            color = 'text-[var(--tess-info)] border-blue-200 bg-blue-50';
            icon = <Zap size={12} fill="currentColor" />;
          } else {
            classification = 'Equilibrado WL';
            color = 'text-indigo-700 border-indigo-200 bg-indigo-50';
            icon = <Briefcase size={12} />;
          }

          enrichedData.push({
            id: ag.client_id || ag.id,
            sourceType: 'agency',
            clientName: ag.profiles?.nome || ag.name || 'Agência',
            avatar: null,
            type: 'Agência WL',
            fee,
            totalHours,
            operationalCost,
            grossMargin,
            marginPercentage,
            latestNps: null,
            daysSinceLastDelivery,
            churnRisk,
            classification,
            color,
            icon,
          });
        }
      });

      setProjectsData(enrichedData.sort((a, b) => b.fee - a.fee));
    } catch (error) {
      console.error('Erro na auditoria econômica:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const mrr = projectsData.reduce((acc, p) => acc + p.fee, 0);
    const avgMargin =
      projectsData.reduce((acc, p) => acc + p.marginPercentage, 0) / (projectsData.length || 1);
    const totalVampires = projectsData.filter((p) => p.classification.includes('Vampiro')).length;
    const churnAlerts = projectsData.filter((p) => p.churnRisk === 'high').length;

    return { mrr, avgMargin, totalVampires, churnAlerts };
  }, [projectsData]);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 size={36} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 🟢 TOP ROW: 4 CARDS DE SAÚDE FINANCEIRA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="tess-card p-5 border border-[var(--color-atelier-grafite)]/10 flex flex-col justify-between space-y-3">
          <span className="tess-eyebrow">MRR (Faturamento Ativo)</span>
          <div className="flex items-center justify-between">
            <span className="font-roboto tabular-nums text-2xl sm:text-3xl font-bold text-[var(--color-atelier-grafite)]">
              R$ {stats.mrr.toLocaleString('pt-BR')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center ring-1 ring-emerald-200/60">
              <ArrowUpRight size={16} />
            </div>
          </div>
        </div>

        {/* Margem Média */}
        <div className="tess-card p-5 border border-[var(--color-atelier-grafite)]/10 flex flex-col justify-between space-y-3">
          <span className="tess-eyebrow">Margem Bruta Média</span>
          <div className="flex items-center justify-between">
            <span className="font-roboto tabular-nums text-2xl sm:text-3xl font-bold text-[var(--color-atelier-grafite)]">
              {stats.avgMargin.toFixed(1)}%
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ring-1 ${
                stats.avgMargin > 40
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60'
                  : 'bg-amber-50 text-amber-700 ring-amber-200/60'
              }`}
            >
              {stats.avgMargin > 40 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </div>
          </div>
        </div>

        {/* Vampiros */}
        <div className="tess-card p-5 border border-[var(--color-atelier-grafite)]/10 flex flex-col justify-between space-y-3">
          <span className="tess-eyebrow">Vampiros Detectados</span>
          <div className="flex items-center justify-between">
            <span className="font-roboto tabular-nums text-2xl sm:text-3xl font-bold text-[var(--tess-bordo)]">
              {stats.totalVampires}
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center ring-1 ring-rose-200/60">
              <Skull size={16} />
            </div>
          </div>
        </div>

        {/* Risco de Churn (Dark card) */}
        <div className="tess-card p-5 border border-[var(--color-atelier-grafite)]/10 bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] rounded-3xl relative overflow-hidden flex flex-col justify-between space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Risco de Churn</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
              Ação Requerida
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-roboto tabular-nums text-2xl sm:text-3xl font-bold text-white">
              {stats.churnAlerts}
            </span>
            <ShieldAlert size={24} className="text-rose-400 opacity-80" />
          </div>
        </div>
      </div>

      {/* 🟢 BARRA DE BUSCA E AUDITORIA */}
      <div className="tess-card p-4 border border-[var(--color-atelier-grafite)]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40" size={15} />
          <input
            type="text"
            placeholder="Buscar cliente ou agência..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full tess-surface border border-[var(--color-atelier-grafite)]/12 rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-[var(--color-atelier-grafite)] placeholder-[var(--color-atelier-grafite)]/40 outline-none focus:ring-1 focus:ring-[var(--tess-accent)] transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-atelier-grafite)]/60 bg-[var(--color-atelier-creme)] px-3 py-1.5 rounded-xl border border-[var(--color-atelier-grafite)]/10 shrink-0">
          <Info size={13} className="text-[var(--color-atelier-terracota)]" />
          <span>Base de cálculo: R$ {CUSTO_HORA_AGENCIA}/h operacional</span>
        </div>
      </div>

      {/* 🟢 TABELA DE PERFORMANCE FINANCEIRA BCG */}
      <div className="tess-card p-6 border border-[var(--color-atelier-grafite)]/10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-atelier-grafite)]/8">
          <h3 className="font-elegant text-xl md:text-2xl text-[var(--color-atelier-grafite)]">
            Rentabilidade por Conta
          </h3>
          <span className="tess-eyebrow">Matriz BCG Operacional</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-atelier-grafite)]/10">
                <th className="py-3 px-4 font-roboto text-[10px] uppercase tracking-wider text-[var(--color-atelier-grafite)]/50 font-bold">
                  Cliente / Agência
                </th>
                <th className="py-3 px-4 font-roboto text-[10px] uppercase tracking-wider text-[var(--color-atelier-grafite)]/50 font-bold">
                  Classificação BCG
                </th>
                <th className="py-3 px-4 font-roboto text-[10px] uppercase tracking-wider text-[var(--color-atelier-grafite)]/50 font-bold">
                  Fee Mensal
                </th>
                <th className="py-3 px-4 font-roboto text-[10px] uppercase tracking-wider text-[var(--color-atelier-grafite)]/50 font-bold">
                  Horas Consumidas
                </th>
                <th className="py-3 px-4 font-roboto text-[10px] uppercase tracking-wider text-[var(--color-atelier-grafite)]/50 font-bold">
                  Lucro Real
                </th>
                <th className="py-3 px-4 font-roboto text-[10px] uppercase tracking-wider text-[var(--color-atelier-grafite)]/50 font-bold text-center">
                  T-NPS
                </th>
                <th className="py-3 px-4 font-roboto text-[10px] uppercase tracking-wider text-[var(--color-atelier-grafite)]/50 font-bold text-right">
                  Risco de Churn
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-atelier-grafite)]/6">
              <AnimatePresence>
                {projectsData
                  .filter((p) => p.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((proj, idx) => (
                    <motion.tr
                      key={`${proj.sourceType}-${proj.id}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                      className="hover:bg-white/70 transition-colors"
                    >
                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl overflow-hidden ring-1 ring-[var(--color-atelier-grafite)]/10 flex items-center justify-center shrink-0 ${
                              proj.sourceType === 'agency'
                                ? 'bg-sky-50 text-[var(--tess-info)]'
                                : 'bg-[var(--color-atelier-creme)] text-[var(--color-atelier-grafite)]'
                            }`}
                          >
                            {proj.avatar ? (
                              <img src={proj.avatar} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-elegant text-sm font-bold">{proj.clientName.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex flex-col max-w-[200px]">
                            <span className="font-bold text-xs sm:text-sm text-[var(--color-atelier-grafite)] truncate">
                              {proj.clientName}
                            </span>
                            <span className="tess-eyebrow text-[9px] mt-0.5 truncate">{proj.type}</span>
                          </div>
                        </div>
                      </td>

                      {/* Classificação */}
                      <td className="py-3.5 px-4">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${proj.color}`}
                        >
                          {proj.icon} <span>{proj.classification}</span>
                        </div>
                      </td>

                      {/* Fee */}
                      <td className="py-3.5 px-4 font-roboto tabular-nums font-bold text-sm text-[var(--color-atelier-grafite)]">
                        R$ {proj.fee.toLocaleString('pt-BR')}
                      </td>

                      {/* Horas */}
                      <td className="py-3.5 px-4 font-roboto tabular-nums font-bold text-sm text-[var(--color-atelier-grafite)]">
                        {proj.totalHours.toFixed(1)}h
                      </td>

                      {/* Lucro Real */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col w-32">
                          <span
                            className={`font-roboto tabular-nums font-bold text-sm ${
                              proj.grossMargin > 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            R$ {proj.grossMargin.toLocaleString('pt-BR')}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-1.5 flex-1 bg-[var(--color-atelier-creme)] rounded-full overflow-hidden ring-1 ring-[var(--color-atelier-grafite)]/6">
                              <div
                                className={`h-full ${
                                  proj.marginPercentage > 50
                                    ? 'bg-emerald-500'
                                    : proj.marginPercentage > 20
                                    ? 'bg-sky-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.max(Math.min(proj.marginPercentage, 100), 5)}%` }}
                              />
                            </div>
                            <span className="font-roboto tabular-nums text-[10px] font-bold text-[var(--color-atelier-grafite)]/50">
                              {Math.round(proj.marginPercentage)}%
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* T-NPS */}
                      <td className="py-3.5 px-4 text-center">
                        {proj.latestNps ? (
                          <div
                            className={`inline-flex w-7 h-7 rounded-lg items-center justify-center font-roboto tabular-nums font-bold text-xs border ${
                              proj.latestNps >= 9
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`}
                          >
                            {proj.latestNps}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-atelier-grafite)]/30">-</span>
                        )}
                      </td>

                      {/* Churn Risk */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider border ${
                              proj.churnRisk === 'high'
                                ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse'
                                : proj.churnRisk === 'medium'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            }`}
                          >
                            {proj.churnRisk === 'high' ? 'Alto' : proj.churnRisk === 'medium' ? 'Médio' : 'Baixo'}
                          </span>
                          <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 mt-1 font-roboto tabular-nums">
                            {proj.daysSinceLastDelivery >= 99
                              ? 'Sem entregas'
                              : `há ${proj.daysSinceLastDelivery}d`}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
