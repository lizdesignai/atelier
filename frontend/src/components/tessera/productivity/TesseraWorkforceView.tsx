// src/components/tessera/productivity/TesseraWorkforceView.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Target,
  Clock,
  FileText,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  DollarSign,
  Briefcase,
  CheckSquare,
  AlertCircle,
  Save,
  Edit3,
  PieChart,
  UserCheck,
  PauseCircle,
  Play,
  UserPlus,
  UserX,
} from 'lucide-react';
import CollaboratorAssignmentModal from '@/app/admin/gestao/components/CollaboratorAssignmentModal';
import NovoColaboradorModal from '@/app/admin/gestao/components/NovoColaboradorModal';
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  startOfWeek,
  differenceInBusinessDays,
  differenceInHours,
} from 'date-fns';

interface TesseraWorkforceViewProps {
  currentUser: any;
}

export default function TesseraWorkforceView({ currentUser }: TesseraWorkforceViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [isNewCollabModalOpen, setIsNewCollabModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const [isUpdatingSalary, setIsUpdatingSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState<string>('');
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);

  const [isUpdatingBuffer, setIsUpdatingBuffer] = useState(false);
  const [bufferInput, setBufferInput] = useState<string>('');
  const [editingBufferId, setEditingBufferId] = useState<string | null>(null);

  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  const HOURS_PER_DAY = 6;
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const businessDaysInMonth = differenceInBusinessDays(currentMonthEnd, currentMonthStart);
  const EXPECTED_MONTHLY_HOURS = businessDaysInMonth * HOURS_PER_DAY;

  useEffect(() => {
    fetchWorkforceData();
  }, []);

  const fetchWorkforceData = async () => {
    try {
      let teamData: any[] = [];
      const { data: mainData, error: profileErr } = await (supabase.from('profiles') as any)
        .select('id, nome, role, avatar_url, current_status, last_seen, base_salary, contract_status, deadline_buffer_days')
        .in('role', ['colaborador', 'gestor', 'admin', 'contador']);

      if (profileErr) {
        const fallbackRes = await (supabase.from('profiles') as any)
          .select('id, nome, role, avatar_url, current_status, last_seen, base_salary, deadline_buffer_days')
          .in('role', ['colaborador', 'gestor', 'admin', 'contador']);
        teamData = (fallbackRes.data || []).map((m: any) => ({ ...m, contract_status: 'active' }));
      } else {
        teamData = mainData || [];
      }

      const { data: sessions } = await (supabase.from('work_sessions') as any)
        .select('*, tasks(id, title, task_type)')
        .gte('start_time', currentMonthStart.toISOString())
        .lte('start_time', currentMonthEnd.toISOString());

      const { data: tasks } = await (supabase.from('tasks') as any)
        .select('id, assigned_to, status, admin_feedback, created_at, completed_at, started_at')
        .gte('created_at', currentMonthStart.toISOString());

      if (!teamData) return;

      const stats = teamData.map((member) => {
        const memberSessions = (sessions as any[])?.filter((s: any) => s.user_id === member.id) || [];
        const memberTasks = (tasks as any[])?.filter((t: any) => t.assigned_to === member.id) || [];

        const todayStart = startOfDay(now).toISOString();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();

        const minutesToday = memberSessions
          .filter((s) => s.start_time >= todayStart)
          .reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
        const minutesWeek = memberSessions
          .filter((s) => s.start_time >= weekStart)
          .reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
        const minutesMonth = memberSessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);

        const hoursToday = minutesToday / 60;
        const hoursWeek = minutesWeek / 60;
        const totalHours = minutesMonth / 60;
        const slaPercentage = Math.min(Math.round((totalHours / EXPECTED_MONTHLY_HOURS) * 100), 100);

        const pendingTasks = memberTasks.filter((t) => t.status === 'pending').length;
        const reviewTasks = memberTasks.filter((t) => t.status === 'review' || t.status === 'needs_revision').length;
        const completedTasks = memberTasks.filter((t) => t.status === 'completed').length;

        const reworkedTasks = memberTasks.filter((t) => t.admin_feedback !== null || t.status === 'needs_revision').length;
        const totalInvolved = completedTasks + reworkedTasks;
        const reworkRate = totalInvolved > 0 ? Math.round((reworkedTasks / totalInvolved) * 100) : 0;

        let leadTimeSum = 0;
        let leadTimeCount = 0;
        memberTasks.forEach((t) => {
          if (t.started_at && t.completed_at) {
            const hours = differenceInHours(new Date(t.completed_at), new Date(t.started_at));
            if (hours >= 0) {
              leadTimeSum += hours;
              leadTimeCount++;
            }
          }
        });
        const avgLeadTime = leadTimeCount > 0 ? (leadTimeSum / leadTimeCount).toFixed(1) : 0;

        const activityBreakdown: Record<string, number> = {};
        memberSessions.forEach((s) => {
          const taskNode = Array.isArray(s.tasks) ? s.tasks[0] : s.tasks;
          const typeName = taskNode?.task_type || taskNode?.title || 'Não Categorizado';
          const typeLabel = typeof typeName === 'string' ? typeName.toUpperCase() : 'OUTROS';
          activityBreakdown[typeLabel] = (activityBreakdown[typeLabel] || 0) + (s.duration_minutes || 0);
        });
        const sortedBreakdown = Object.entries(activityBreakdown)
          .map(([name, mins]) => ({ name, hours: mins / 60 }))
          .sort((a, b) => b.hours - a.hours);

        return {
          ...member,
          hoursToday,
          hoursWeek,
          totalHours,
          slaPercentage,
          pendingTasks,
          reviewTasks,
          completedTasks,
          reworkRate,
          avgLeadTime,
          baseSalary: member.base_salary || 0,
          contractStatus: member.contract_status || 'active',
          deadlineBufferDays: member.deadline_buffer_days || 0,
          activityBreakdown: sortedBreakdown,
        };
      });

      const sortedStats = stats.sort((a, b) => {
        const contractRank: Record<string, number> = { active: 1, paused: 2, dismissed: 3 };
        const cDiff = (contractRank[a.contractStatus] || 1) - (contractRank[b.contractStatus] || 1);
        if (cDiff !== 0) return cDiff;
        const rank: Record<string, number> = { online: 1, idle: 2, offline: 3 };
        const statusDiff = (rank[a.current_status || 'offline'] || 3) - (rank[b.current_status || 'offline'] || 3);
        if (statusDiff !== 0) return statusDiff;
        return b.slaPercentage - a.slaPercentage;
      });

      setTeamStats(sortedStats);
      if (sortedStats.length > 0 && !selectedMemberId) setSelectedMemberId(sortedStats[0].id);
    } catch (error) {
      console.error('Erro ao gerar telemetria de RH:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSalary = async (memberId: string) => {
    setIsUpdatingSalary(true);
    const numericValue = parseFloat(salaryInput.replace(/\D/g, '')) / 100;

    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({ base_salary: numericValue || 0 })
        .eq('id', memberId);

      if (error) {
        if (error.code === '42703') {
          alert("A coluna 'base_salary' não existe na tabela profiles.");
        } else {
          throw error;
        }
      } else {
        setTeamStats((prev) => prev.map((m) => (m.id === memberId ? { ...m, baseSalary: numericValue || 0 } : m)));
        setEditingSalaryId(null);
      }
    } catch (error) {
      console.error('Erro ao atualizar salário:', error);
    } finally {
      setIsUpdatingSalary(false);
    }
  };

  const handleUpdateBuffer = async (memberId: string) => {
    setIsUpdatingBuffer(true);
    const numericValue = parseInt(bufferInput, 10) || 0;
    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({ deadline_buffer_days: numericValue })
        .eq('id', memberId);
      if (error) throw error;

      const { data: tasksToUpdate } = await (supabase.from('tasks') as any)
        .select('id, deadline')
        .eq('assigned_to', memberId)
        .in('status', ['pending', 'draft', 'in_progress', 'review']);

      if (tasksToUpdate && tasksToUpdate.length > 0) {
        const updatePromises = (tasksToUpdate as any[]).map((task: any) => {
          if (task.deadline) {
            const dateObj = new Date(task.deadline);
            dateObj.setDate(dateObj.getDate() - numericValue);
            return (supabase.from('tasks') as any).update({ internal_deadline: dateObj.toISOString() }).eq('id', task.id);
          }
          return Promise.resolve();
        });
        await Promise.all(updatePromises);
        window.dispatchEvent(new CustomEvent('jtbdRefreshNeeded'));
      }

      setTeamStats((prev) => prev.map((m) => (m.id === memberId ? { ...m, deadlineBufferDays: numericValue } : m)));
      setEditingBufferId(null);
    } catch (error) {
      console.error('Erro ao atualizar buffer:', error);
    } finally {
      setIsUpdatingBuffer(false);
    }
  };

  const handleToggleContractStatus = async (memberId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paused' ? 'active' : 'paused';
    try {
      const res = await fetch(`/api/admin/collaborators/${memberId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_status: newStatus }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Falha ao alterar status');
      }

      setTeamStats((prev) => prev.map((m) => (m.id === memberId ? { ...m, contractStatus: newStatus } : m)));
      window.dispatchEvent(new CustomEvent('jtbdRefreshNeeded'));
      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: newStatus === 'paused' ? 'Contrato pausado por sazonalidade!' : 'Contrato reativado com sucesso!',
        })
      );
    } catch (e: any) {
      console.error('Erro ao alterar status do contrato:', e);
      window.dispatchEvent(new CustomEvent('showToast', { detail: e.message || 'Erro ao alterar status do contrato.' }));
    }
  };

  const handleDismissCollaborator = async (memberId: string, memberName: string) => {
    const confirm = window.confirm(
      `Tem certeza que deseja demitir/desligar ${memberName}?\n\nO colaborador será desligado da equipe, perderá o acesso e deixará de receber demandas ativas.`
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/api/admin/collaborators/${memberId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_status: 'dismissed' }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Falha ao demitir colaborador');
      }

      setTeamStats((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, contractStatus: 'dismissed', current_status: 'offline' } : m))
      );
      window.dispatchEvent(new CustomEvent('jtbdRefreshNeeded'));
      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: `Colaborador ${memberName} demitido/desligado da equipe.`,
        })
      );
    } catch (e: any) {
      console.error('Erro ao demitir colaborador:', e);
      window.dispatchEvent(new CustomEvent('showToast', { detail: e.message || 'Erro ao demitir colaborador.' }));
    }
  };

  const handleRehireCollaborator = async (memberId: string, memberName: string) => {
    const confirm = window.confirm(`Deseja recontratar e reativar ${memberName} na equipe?`);
    if (!confirm) return;

    try {
      const res = await fetch(`/api/admin/collaborators/${memberId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_status: 'active' }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Falha ao recontratar colaborador');
      }

      setTeamStats((prev) => prev.map((m) => (m.id === memberId ? { ...m, contractStatus: 'active' } : m)));
      window.dispatchEvent(new CustomEvent('jtbdRefreshNeeded'));
      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: `Colaborador ${memberName} reativado com sucesso na equipe!`,
        })
      );
    } catch (e: any) {
      console.error('Erro ao recontratar colaborador:', e);
      window.dispatchEvent(new CustomEvent('showToast', { detail: e.message || 'Erro ao reativar colaborador.' }));
    }
  };

  const generateDiagnosticReport = (member: any) => {
    const aderenciaText =
      member.slaPercentage >= 90
        ? 'Excelente aderência à carga horária estipulada (SLA).'
        : member.slaPercentage >= 70
        ? 'Aderência satisfatória, mas com espaço para otimização.'
        : 'Baixa aderência à carga horária.';
    const qualidadeText =
      member.reworkRate <= 10
        ? 'Taxa de qualidade altíssima. Entregas precisas.'
        : member.reworkRate <= 30
        ? 'Qualidade dentro da média. Refações pontuais.'
        : 'Alto índice de refação identificado. Necessita revisão atenta de briefings.';

    const report = `📋 DIAGNÓSTICO DE DESEMPENHO: ${member.nome.toUpperCase()}
Mês de Referência: ${currentMonthStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}

📊 MÉTRICAS CONSOLIDADAS:
• Horas Hoje: ${member.hoursToday.toFixed(1)}h
• Horas no Mês: ${member.totalHours.toFixed(1)}h (Meta: ${EXPECTED_MONTHLY_HOURS}h)
• Aderência ao SLA: ${member.slaPercentage}%
• Tarefas Concluídas: ${member.completedTasks}
• Índice de Refação: ${member.reworkRate}%
• Lead Time Médio: ${member.avgLeadTime}h por tarefa

🔍 ANÁLISE DE ADERÊNCIA:
${aderenciaText}

🎨 ANÁLISE DE QUALIDADE E PRECISÃO:
${qualidadeText}
`;
    setSelectedReport({ name: member.nome, text: report });
    setIsCopied(false);
  };

  const copyToClipboard = () => {
    if (selectedReport) {
      navigator.clipboard.writeText(selectedReport.text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const selectedMember = useMemo(
    () => teamStats.find((m) => m.id === selectedMemberId),
    [teamStats, selectedMemberId]
  );

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 size={36} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 🟢 SPLIT VIEW NATURAL (Lista de Membros à esquerda / Deep Dive à direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: LISTA DE MEMBROS (4 COLUNAS) */}
        <div className="lg:col-span-4 tess-card p-4 border border-[var(--color-atelier-grafite)]/10 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-atelier-grafite)]/8 px-1">
            <div className="flex items-center gap-2">
              <span className="tess-eyebrow">Membros da Equipe</span>
              <span className="font-roboto tabular-nums text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-atelier-creme)] ring-1 ring-[var(--color-atelier-grafite)]/10">
                {teamStats.length}
              </span>
            </div>
            <button
              onClick={() => setIsNewCollabModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-[var(--tess-accent)]/8 hover:bg-[var(--tess-accent)] text-[var(--tess-accent)] hover:text-white transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider shadow-2xs cursor-pointer"
            >
              <UserPlus size={12} />
              <span>Novo</span>
            </button>
          </div>

          <div className="space-y-2">
            {teamStats.map((member) => {
              const isOnline = member.current_status === 'online';
              const isIdle = member.current_status === 'idle';
              const dotColor = isOnline ? 'bg-emerald-500' : isIdle ? 'bg-amber-400' : 'bg-stone-300';
              const isSelected = selectedMemberId === member.id;

              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left cursor-pointer border ${
                    isSelected
                      ? 'bg-white border-[var(--color-atelier-terracota)]/40 ring-1 ring-[var(--color-atelier-terracota)]/20 shadow-xs'
                      : 'border-transparent hover:bg-white/60 tess-surface'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-creme)] ring-1 ring-[var(--color-atelier-grafite)]/10 flex items-center justify-center overflow-hidden">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-elegant text-sm text-[var(--color-atelier-grafite)]">
                          {member.nome.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ring-2 ring-white rounded-full ${dotColor}`}
                    />
                  </div>

                  <div className="flex flex-col flex-1 truncate">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`font-bold text-xs truncate ${
                          isSelected ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'
                        }`}
                      >
                        {member.nome}
                      </span>
                      {member.contractStatus === 'paused' && (
                        <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                          Pausado
                        </span>
                      )}
                      {member.contractStatus === 'dismissed' && (
                        <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 shrink-0">
                          Demitido
                        </span>
                      )}
                    </div>
                    <span className="tess-eyebrow text-[9px] mt-0.5 truncate">
                      {member.role === 'contador'
                        ? 'Contador'
                        : member.role === 'admin'
                        ? 'Admin'
                        : member.role === 'gestor'
                        ? 'Gestor'
                        : 'Colaborador'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUNA DIREITA: DEEP DIVE DO COLABORADOR SELECIONADO (8 COLUNAS) */}
        <div className="lg:col-span-8 tess-card p-6 sm:p-7 border border-[var(--color-atelier-grafite)]/10 space-y-6">
          {selectedMember ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedMember.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6"
              >
                {/* Cabeçalho do Colaborador */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-[var(--color-atelier-grafite)]/8">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-[var(--color-atelier-creme)] ring-1 ring-[var(--color-atelier-grafite)]/12 flex items-center justify-center overflow-hidden shadow-2xs">
                        {selectedMember.avatar_url ? (
                          <img src={selectedMember.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                            {selectedMember.nome.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div
                        className={`absolute -bottom-1 -right-1 w-4 h-4 ring-2 ring-white rounded-full ${
                          selectedMember.current_status === 'online'
                            ? 'bg-emerald-500'
                            : selectedMember.current_status === 'idle'
                            ? 'bg-amber-400'
                            : 'bg-stone-300'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-elegant text-2xl sm:text-3xl text-[var(--color-atelier-grafite)] leading-tight">
                          {selectedMember.nome}
                        </h3>
                        {selectedMember.contractStatus === 'paused' && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                            <PauseCircle size={10} /> Pausado
                          </span>
                        )}
                        {selectedMember.contractStatus === 'dismissed' && (
                          <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                            <UserX size={10} /> Demitido
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--color-atelier-grafite)]/60">
                        <span className="font-bold uppercase tracking-wider text-[var(--color-atelier-terracota)]">
                          {selectedMember.role === 'contador' ? 'Contadora' : selectedMember.role}
                        </span>
                        <span>•</span>
                        <span>
                          Visto:{' '}
                          {selectedMember.last_seen
                            ? new Date(selectedMember.last_seen).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Desconhecido'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {selectedMember.contractStatus === 'dismissed' ? (
                      <button
                        onClick={() => handleRehireCollaborator(selectedMember.id, selectedMember.nome)}
                        className="text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs border bg-emerald-700 text-white border-emerald-800 hover:bg-emerald-800 cursor-pointer"
                      >
                        <UserCheck size={14} /> Recontratar
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            handleToggleContractStatus(selectedMember.id, selectedMember.contractStatus)
                          }
                          className={`text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs border cursor-pointer ${
                            selectedMember.contractStatus === 'paused'
                              ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700'
                              : 'tess-surface text-[var(--color-atelier-grafite)] border-[var(--color-atelier-grafite)]/12 hover:bg-amber-50 hover:text-amber-800'
                          }`}
                        >
                          {selectedMember.contractStatus === 'paused' ? (
                            <>
                              <Play size={13} /> Reativar
                            </>
                          ) : (
                            <>
                              <PauseCircle size={13} className="text-amber-600" /> Pausar
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDismissCollaborator(selectedMember.id, selectedMember.nome)}
                          className="text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs border bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-700 hover:text-white cursor-pointer"
                        >
                          <UserX size={13} /> Demitir
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setIsAssignmentModalOpen(true)}
                      className="bg-[var(--tess-accent)] text-white text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl hover:bg-[var(--tess-accent-hover)] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <UserCheck size={14} /> Clientes
                    </button>
                  </div>
                </div>

                {/* Sub-cards de Parâmetros Financeiros e Buffer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Salário Base */}
                  <div className="tess-surface p-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/40 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <DollarSign size={18} />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/70">
                        Remuneração Base / Mês
                      </span>
                      {editingSalaryId === selectedMember.id ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="number"
                            autoFocus
                            value={salaryInput}
                            onChange={(e) => setSalaryInput(e.target.value)}
                            className="w-28 bg-white border border-emerald-300 rounded-lg px-2 py-1 text-xs font-bold text-emerald-900 outline-none"
                          />
                          <button
                            onClick={() => handleUpdateSalary(selectedMember.id)}
                            disabled={isUpdatingSalary}
                            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={() => setEditingSalaryId(null)}
                            className="text-stone-400 hover:text-rose-500 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group mt-0.5">
                          <span className="font-roboto tabular-nums text-xl font-bold text-emerald-900">
                            R${' '}
                            {selectedMember.baseSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            onClick={() => {
                              setSalaryInput(selectedMember.baseSalary.toString());
                              setEditingSalaryId(selectedMember.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-emerald-700/60 hover:text-emerald-900 transition-opacity cursor-pointer"
                          >
                            <Edit3 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Buffer de Brevidade */}
                  <div className="tess-surface p-4 rounded-2xl border border-amber-200/70 bg-amber-50/40 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <Clock size={18} />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800/70">
                        Brevidade (Buffer Dias)
                      </span>
                      {editingBufferId === selectedMember.id ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="number"
                            autoFocus
                            value={bufferInput}
                            onChange={(e) => setBufferInput(e.target.value)}
                            className="w-20 bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-bold text-amber-900 outline-none"
                          />
                          <button
                            onClick={() => handleUpdateBuffer(selectedMember.id)}
                            disabled={isUpdatingBuffer}
                            className="text-amber-700 hover:text-amber-900 cursor-pointer"
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={() => setEditingBufferId(null)}
                            className="text-stone-400 hover:text-rose-500 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group mt-0.5">
                          <span className="font-roboto tabular-nums text-xl font-bold text-amber-900">
                            {selectedMember.deadlineBufferDays} dias
                          </span>
                          <button
                            onClick={() => {
                              setBufferInput(selectedMember.deadlineBufferDays.toString());
                              setEditingBufferId(selectedMember.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-amber-700/60 hover:text-amber-900 transition-opacity cursor-pointer"
                          >
                            <Edit3 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* BLOCO 1: SLA E HORAS PRODUTIVAS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[var(--color-atelier-terracota)]" />
                    <span className="tess-eyebrow">Horas Produtivas (SLA)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="tess-surface p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/10">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50">
                        Hoje
                      </span>
                      <div className="font-roboto tabular-nums text-2xl font-bold text-[var(--color-atelier-grafite)] mt-1">
                        {selectedMember.hoursToday.toFixed(1)}
                        <span className="text-sm font-normal text-[var(--color-atelier-grafite)]/50">h</span>
                      </div>
                    </div>

                    <div className="tess-surface p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/10">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50">
                        Esta Semana
                      </span>
                      <div className="font-roboto tabular-nums text-2xl font-bold text-[var(--color-atelier-grafite)] mt-1">
                        {selectedMember.hoursWeek.toFixed(1)}
                        <span className="text-sm font-normal text-[var(--color-atelier-grafite)]/50">h</span>
                      </div>
                    </div>

                    <div className="tess-surface p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/10 bg-[var(--color-atelier-creme)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/60">
                          Mês Atual (SLA)
                        </span>
                        <span className="font-roboto tabular-nums text-xs font-bold text-[var(--color-atelier-terracota)]">
                          {selectedMember.slaPercentage}%
                        </span>
                      </div>
                      <div className="font-roboto tabular-nums text-2xl font-bold text-[var(--color-atelier-grafite)] mt-1">
                        {selectedMember.totalHours.toFixed(1)}
                        <span className="text-sm font-normal text-[var(--color-atelier-grafite)]/50">h</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO 2: PIPELINE DE TAREFAS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-[var(--tess-bordo)]" />
                    <span className="tess-eyebrow">Pipeline de Tarefas</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="tess-surface p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/10 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50">
                          Pendentes
                        </span>
                        <div className="font-roboto tabular-nums text-2xl font-bold text-[var(--tess-info)] mt-1">
                          {selectedMember.pendingTasks}
                        </div>
                      </div>
                      <Clock size={16} className="text-[var(--tess-info)]/40" />
                    </div>

                    <div className="tess-surface p-4 rounded-2xl border border-amber-200/50 bg-amber-50/30 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-800/60">Em Revisão</span>
                        <div className="font-roboto tabular-nums text-2xl font-bold text-[var(--color-atelier-terracota)] mt-1">
                          {selectedMember.reviewTasks}
                        </div>
                      </div>
                      <AlertCircle size={16} className="text-[var(--color-atelier-terracota)]/40" />
                    </div>

                    <div className="tess-surface p-4 rounded-2xl border border-emerald-200/50 bg-emerald-50/30 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-800/60">Concluídas</span>
                        <div className="font-roboto tabular-nums text-2xl font-bold text-emerald-700 mt-1">
                          {selectedMember.completedTasks}
                        </div>
                      </div>
                      <CheckSquare size={16} className="text-emerald-600/40" />
                    </div>
                  </div>
                </div>

                {/* BLOCO 3: QUALIDADE & LEAD TIME */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="tess-surface p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50">
                        Taxa de Refação
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`font-roboto tabular-nums text-2xl font-bold ${
                            selectedMember.reworkRate > 30
                              ? 'text-rose-600'
                              : 'text-[var(--color-atelier-grafite)]'
                          }`}
                        >
                          {selectedMember.reworkRate}%
                        </span>
                        {selectedMember.reworkRate > 30 && (
                          <AlertTriangle size={15} className="text-rose-500" />
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)]/40 uppercase tracking-wider">
                      Meta: &lt;15%
                    </span>
                  </div>

                  <div className="tess-surface p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50">
                        Lead Time Médio
                      </span>
                      <div className="font-roboto tabular-nums text-2xl font-bold text-[var(--color-atelier-grafite)] mt-1">
                        {selectedMember.avgLeadTime}
                        <span className="text-sm font-normal text-[var(--color-atelier-grafite)]/50">h</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)]/40 uppercase tracking-wider">
                      Tempo / Entrega
                    </span>
                  </div>
                </div>

                {/* BLOCO 4: DISTRIBUIÇÃO DE ESFORÇO */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <PieChart size={14} className="text-[var(--color-atelier-terracota)]" />
                    <span className="tess-eyebrow">Distribuição de Esforço por Atividade</span>
                  </div>

                  <div className="tess-surface p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/10 space-y-2.5 max-h-56 overflow-y-auto">
                    {selectedMember.activityBreakdown && selectedMember.activityBreakdown.length > 0 ? (
                      selectedMember.activityBreakdown.map((item: any, idx: number) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-[var(--color-atelier-grafite)] truncate pr-4">{item.name}</span>
                            <span className="font-roboto tabular-nums text-[var(--color-atelier-terracota)] shrink-0">
                              {item.hours.toFixed(1)}h
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-[var(--color-atelier-creme)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--color-atelier-grafite)] rounded-full"
                              style={{
                                width: `${Math.min((item.hours / selectedMember.totalHours) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-xs text-[var(--color-atelier-grafite)]/50 italic py-4">
                        Sem dados de atividade categorizada neste mês.
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTÃO GERADOR DE RELATÓRIO */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => generateDiagnosticReport(selectedMember)}
                    className="bg-[var(--tess-bordo)] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#4a0404] transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <FileText size={14} />
                    <span>Gerar Diagnóstico Automático</span>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <Users size={48} className="mb-2 text-stone-300" />
              <p className="font-elegant text-2xl text-stone-500">Selecione um Colaborador</p>
              <p className="text-xs text-stone-400 mt-1">Clique na lista ao lado para ver o detalhamento.</p>
            </div>
          )}
        </div>
      </div>

      {/* 🟢 MODAL DE DIAGNÓSTICO DE PERFORMANCE */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="tess-solid p-6 sm:p-8 rounded-3xl relative z-10 w-full max-w-lg space-y-4"
            >
              <div className="flex justify-between items-start pb-3 border-b border-[var(--color-atelier-grafite)]/10">
                <div>
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                    <FileText size={20} className="text-[var(--tess-bordo)]" />
                    <span>Relatório de Performance</span>
                  </h3>
                  <span className="tess-eyebrow mt-1">Diagnóstico Automático</span>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-stone-400 hover:text-stone-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="tess-surface rounded-2xl p-4 border border-[var(--color-atelier-grafite)]/10">
                <textarea
                  readOnly
                  value={selectedReport.text}
                  className="w-full h-64 bg-transparent outline-none resize-none text-xs font-mono text-[var(--color-atelier-grafite)]/85 leading-relaxed"
                />
              </div>

              <button
                onClick={copyToClipboard}
                className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[var(--tess-accent)] text-white hover:bg-[var(--tess-accent-hover)]'
                }`}
              >
                {isCopied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                <span>
                  {isCopied ? 'Copiado para a Área de Transferência' : 'Copiar Diagnóstico'}
                </span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CollaboratorAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        collaborator={selectedMember}
      />

      <NovoColaboradorModal
        isOpen={isNewCollabModalOpen}
        onClose={() => setIsNewCollabModalOpen(false)}
        onSuccess={() => {
          fetchWorkforceData();
        }}
        currentUserRole={currentUser?.role}
      />
    </div>
  );
}
