// src/app/admin/gestao/views/WorkforceDashboard.tsx
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  Users, Target, RotateCcw, Clock, 
  FileText, Copy, CheckCircle2, AlertTriangle, 
  TrendingUp, TrendingDown, Loader2, X, DollarSign,
  Briefcase, CheckSquare, AlertCircle, Save, Edit3
} from "lucide-react";
import { startOfMonth, endOfMonth, startOfDay, startOfWeek, differenceInBusinessDays, differenceInHours } from "date-fns";

interface WorkforceDashboardProps {
  currentUser: any;
}

export default function WorkforceDashboard({ currentUser }: WorkforceDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  
  // Estados para Modal de Diagnóstico e Atualização Financeira
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isUpdatingSalary, setIsUpdatingSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState<string>("");
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);

  // Configuração Temporal (SLA)
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
      // 1. Busca perfis da equipa (Agora incluindo current_status, last_seen e base_salary)
      const { data: teamData } = await supabase
        .from('profiles')
        .select('id, nome, role, avatar_url, current_status, last_seen, base_salary')
        .in('role', ['colaborador', 'gestor', 'admin']);

      // 2. Busca sessões de trabalho do mês atual
      const { data: sessions } = await supabase
        .from('work_sessions')
        .select('*')
        .gte('start_time', currentMonthStart.toISOString())
        .lte('start_time', currentMonthEnd.toISOString());

      // 3. Busca tarefas finalizadas ou revisadas no mês
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, assigned_to, status, admin_feedback, created_at, completed_at, started_at')
        .gte('created_at', currentMonthStart.toISOString());

      if (!teamData) return;

      const stats = teamData.map(member => {
        const memberSessions = sessions?.filter(s => s.user_id === member.id) || [];
        const memberTasks = tasks?.filter(t => t.assigned_to === member.id) || [];

        // A. Cálculos de Tempo (Hoje, Semana, Mês)
        const todayStart = startOfDay(now).toISOString();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();

        const minutesToday = memberSessions.filter(s => s.start_time >= todayStart).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
        const minutesWeek = memberSessions.filter(s => s.start_time >= weekStart).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
        const minutesMonth = memberSessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);

        const hoursToday = minutesToday / 60;
        const hoursWeek = minutesWeek / 60;
        const totalHours = minutesMonth / 60;
        const slaPercentage = Math.min(Math.round((totalHours / EXPECTED_MONTHLY_HOURS) * 100), 100);

        // B. Pipeline de Tarefas
        const pendingTasks = memberTasks.filter(t => t.status === 'pending').length;
        const reviewTasks = memberTasks.filter(t => t.status === 'review' || t.status === 'needs_revision').length;
        const completedTasks = memberTasks.filter(t => t.status === 'completed').length;
        
        // C. Cálculo de Qualidade (Refação)
        const reworkedTasks = memberTasks.filter(t => t.admin_feedback !== null || t.status === 'needs_revision').length;
        const totalInvolved = completedTasks + reworkedTasks;
        const reworkRate = totalInvolved > 0 ? Math.round((reworkedTasks / totalInvolved) * 100) : 0;

        // D. Cálculo de Velocidade (Lead Time)
        let leadTimeSum = 0; let leadTimeCount = 0;
        memberTasks.forEach(t => {
          if (t.started_at && t.completed_at) {
            const hours = differenceInHours(new Date(t.completed_at), new Date(t.started_at));
            if (hours >= 0) { leadTimeSum += hours; leadTimeCount++; }
          }
        });
        const avgLeadTime = leadTimeCount > 0 ? (leadTimeSum / leadTimeCount).toFixed(1) : 0;

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
          baseSalary: member.base_salary || 0
        };
      });

      // Ordenar por Status (Online primeiro) e depois SLA
      const sortedStats = stats.sort((a, b) => {
        const rank: Record<string, number> = { 'online': 1, 'idle': 2, 'offline': 3 };
        const statusDiff = (rank[a.current_status || 'offline'] || 3) - (rank[b.current_status || 'offline'] || 3);
        if (statusDiff !== 0) return statusDiff;
        return b.slaPercentage - a.slaPercentage;
      });

      setTeamStats(sortedStats);
      if (sortedStats.length > 0 && !selectedMemberId) setSelectedMemberId(sortedStats[0].id);

    } catch (error) {
      console.error("Erro ao gerar telemetria de RH:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // ATUALIZAR REMUNERAÇÃO DO COLABORADOR
  // ==========================================================================
  const handleUpdateSalary = async (memberId: string) => {
    setIsUpdatingSalary(true);
    const numericValue = parseFloat(salaryInput.replace(/\D/g, "")) / 100; // Tratamento de máscara se necessário

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ base_salary: numericValue || 0 })
        .eq('id', memberId);

      if (error) {
        if (error.code === '42703') {
          alert("A coluna 'base_salary' ainda não foi criada no banco. Por favor, rode o script SQL fornecido nas instruções.");
        } else {
          throw error;
        }
      } else {
        // Mutação Otimista
        setTeamStats(prev => prev.map(m => m.id === memberId ? { ...m, baseSalary: numericValue || 0 } : m));
        setEditingSalaryId(null);
      }
    } catch (error) {
      console.error("Erro ao atualizar salário:", error);
    } finally {
      setIsUpdatingSalary(false);
    }
  };

  // ==========================================================================
  // MOTOR DE DIAGNÓSTICO
  // ==========================================================================
  const generateDiagnosticReport = (member: any) => {
    let aderenciaText = member.slaPercentage >= 90 ? "Excelente aderência à carga horária estipulada (SLA)." : member.slaPercentage >= 70 ? "Aderência satisfatória, mas com espaço para otimização." : "Baixa aderência à carga horária. Avaliar gargalos operacionais.";
    let qualidadeText = member.reworkRate <= 10 ? "Taxa de qualidade altíssima. Entregas precisas." : member.reworkRate <= 30 ? "Qualidade dentro da média. Refações pontuais." : "Alto índice de refação identificado. Necessita revisão atenta de briefings.";

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

  const selectedMember = useMemo(() => teamStats.find(m => m.id === selectedMemberId), [teamStats, selectedMemberId]);

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full gap-6 overflow-hidden relative">
      
      {/* HEADER DA VISÃO */}
      <header className="shrink-0 flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-[var(--color-atelier-terracota)]" />
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60">Gestão de Talentos & Performance</span>
          </div>
          <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">Análise de Colaboradores</h2>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">SLA Global</span>
          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1">Meta: {EXPECTED_MONTHLY_HOURS}h ativas/mês</span>
        </div>
      </header>

      {/* SPLIT VIEW (Lista vs Detalhes) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* COLUNA ESQUERDA: LISTA DE COLABORADORES */}
        <div className="w-full lg:w-[320px] glass-panel bg-white/50 rounded-[2rem] border border-white shadow-sm flex flex-col h-[250px] lg:h-full shrink-0 overflow-hidden">
          <div className="p-5 border-b border-gray-100 shrink-0 bg-white/40">
            <h3 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-gray-500">Membros da Equipe</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2">
            {teamStats.map(member => {
              const isOnline = member.current_status === 'online';
              const isIdle = member.current_status === 'idle';
              const dotColor = isOnline ? 'bg-green-500' : isIdle ? 'bg-orange-400' : 'bg-gray-300';
              const isSelected = selectedMemberId === member.id;

              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-all outline-none border ${isSelected ? 'bg-white border-[var(--color-atelier-terracota)]/30 shadow-sm' : 'border-transparent hover:bg-white/60'}`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                      {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover"/> : <span className="font-elegant text-sm">{member.nome.charAt(0)}</span>}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full flex items-center justify-center ${dotColor}`}>
                      {isOnline && <div className="absolute w-full h-full bg-green-500 rounded-full animate-ping opacity-60"></div>}
                    </div>
                  </div>
                  <div className="flex flex-col text-left overflow-hidden">
                    <span className={`font-bold text-[13px] truncate ${isSelected ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>{member.nome}</span>
                    <span className="text-[9px] uppercase tracking-widest text-gray-400 truncate">{member.role}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUNA DIREITA: DEEP DIVE DO COLABORADOR */}
        <div className="flex-1 glass-panel bg-white/70 rounded-[2rem] border border-white shadow-sm flex flex-col h-full overflow-hidden">
          {selectedMember ? (
            <AnimatePresence mode="wait">
              <motion.div 
                key={selectedMember.id}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                {/* Cabeçalho do Colaborador */}
                <div className="p-8 border-b border-gray-100 bg-white/40 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="relative shrink-0">
                      <div className="w-20 h-20 rounded-[1.5rem] bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shadow-md">
                        {selectedMember.avatar_url ? <img src={selectedMember.avatar_url} className="w-full h-full object-cover"/> : <span className="font-elegant text-3xl">{selectedMember.nome.charAt(0)}</span>}
                      </div>
                      <div className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 border-4 border-white rounded-full flex items-center justify-center shadow-sm ${selectedMember.current_status === 'online' ? 'bg-green-500' : selectedMember.current_status === 'idle' ? 'bg-orange-400' : 'bg-gray-300'}`}></div>
                    </div>
                    <div>
                      <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-tight">{selectedMember.nome}</h2>
                      <div className="flex items-center gap-3 mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <span className="bg-gray-100 px-2 py-1 rounded-md">{selectedMember.role}</span>
                        <span>•</span>
                        <span>Visto: {selectedMember.last_seen ? new Date(selectedMember.last_seen).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : 'Desconhecido'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Painel Financeiro Direto */}
                  <div className="bg-green-50/50 border border-green-100 p-4 rounded-[1.5rem] flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><DollarSign size={18}/></div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-green-600/60 mb-0.5">Remuneração Base / Mês</span>
                      {editingSalaryId === selectedMember.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            autoFocus
                            value={salaryInput} 
                            onChange={(e) => setSalaryInput(e.target.value)}
                            className="w-24 bg-white border border-green-200 rounded p-1 text-[14px] font-bold text-green-700 outline-none"
                          />
                          <button onClick={() => handleUpdateSalary(selectedMember.id)} disabled={isUpdatingSalary} className="text-green-600 hover:text-green-800"><Save size={16}/></button>
                          <button onClick={() => setEditingSalaryId(null)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <span className="font-elegant text-2xl text-green-700 leading-none">R$ {selectedMember.baseSalary.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          <button onClick={() => { setSalaryInput(selectedMember.baseSalary.toString()); setEditingSalaryId(selectedMember.id); }} className="opacity-0 group-hover:opacity-100 text-green-600/50 hover:text-green-600 transition-opacity"><Edit3 size={14}/></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col gap-8">
                  
                  {/* BLOCO 1: GESTÃO DE TEMPO E ESFORÇO */}
                  <div>
                    <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-4 flex items-center gap-2"><Clock size={14}/> Horas Produtivas (SLA)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Hoje</span>
                        <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">{selectedMember.hoursToday.toFixed(1)}<span className="text-lg text-gray-400">h</span></span>
                      </div>
                      <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Esta Semana</span>
                        <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">{selectedMember.hoursWeek.toFixed(1)}<span className="text-lg text-gray-400">h</span></span>
                      </div>
                      <div className="bg-[var(--color-atelier-grafite)] text-white p-5 rounded-2xl flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute right-0 top-0 opacity-10"><Target size={60}/></div>
                        <span className="text-[10px] uppercase font-bold text-white/50 mb-1 relative z-10">Mês Atual (SLA: {selectedMember.slaPercentage}%)</span>
                        <span className="font-elegant text-3xl relative z-10">{selectedMember.totalHours.toFixed(1)}<span className="text-lg text-white/50">h</span></span>
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 2: DEMANDAS E ENTREGAS */}
                  <div>
                    <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-4 flex items-center gap-2"><Briefcase size={14}/> Pipeline de Tarefas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Pendente</span>
                          <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">{selectedMember.pendingTasks}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center"><Clock size={16}/></div>
                      </div>
                      <div className="bg-orange-50 border border-orange-100 p-5 rounded-2xl flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-orange-400 mb-1">Em Revisão</span>
                          <span className="font-elegant text-3xl text-orange-600">{selectedMember.reviewTasks}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center"><AlertCircle size={16}/></div>
                      </div>
                      <div className="bg-green-50 border border-green-100 p-5 rounded-2xl flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-green-500/70 mb-1">Concluídas</span>
                          <span className="font-elegant text-3xl text-green-600">{selectedMember.completedTasks}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-500 flex items-center justify-center"><CheckSquare size={16}/></div>
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 3: QUALIDADE E PERFORMANCE */}
                  <div>
                    <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-4 flex items-center gap-2"><Target size={14}/> Qualidade e Produtividade</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white border border-gray-200 p-5 rounded-2xl flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Taxa de Refação</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-elegant text-3xl ${selectedMember.reworkRate > 30 ? 'text-red-500' : 'text-[var(--color-atelier-grafite)]'}`}>{selectedMember.reworkRate}%</span>
                            {selectedMember.reworkRate > 30 && <AlertTriangle size={16} className="text-red-500"/>}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ideal: &lt;15%</span>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 p-5 rounded-2xl flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Lead Time Médio</span>
                          <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">{selectedMember.avgLeadTime}<span className="text-lg text-gray-400">h</span></span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tempo/Entrega</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* GERADOR DE RELATÓRIO */}
                  <div className="mt-2 flex justify-end">
                    <button 
                      onClick={() => generateDiagnosticReport(selectedMember)}
                      className="bg-[var(--color-atelier-terracota)] text-white px-6 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-[#8c562e] transition-all shadow-md flex items-center gap-2"
                    >
                      <FileText size={16} /> Gerar Diagnóstico Automático
                    </button>
                  </div>

                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-40 p-8">
              <Users size={64} className="mb-4 text-gray-300" />
              <p className="font-elegant text-3xl text-gray-500">Selecione um Colaborador</p>
              <p className="font-roboto text-[12px] uppercase font-bold tracking-widest mt-2 text-gray-400">Clique na lista ao lado para ver o detalhamento.</p>
            </div>
          )}
        </div>

      </div>

      {/* =====================================================================
          MODAL DE DIAGNÓSTICO DE PERFORMANCE
          ===================================================================== */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedReport(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-lg border border-white/20 flex flex-col gap-6">
              
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
                    <FileText size={24} className="text-[var(--color-atelier-terracota)]"/> Relatório Gerado
                  </h3>
                  <p className="font-roboto text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Diagnóstico Automático do Sistema</p>
                </div>
                <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-black transition-colors"><X size={20}/></button>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 relative group">
                <textarea 
                  readOnly 
                  value={selectedReport.text}
                  className="w-full h-64 bg-transparent outline-none resize-none text-[13px] font-medium text-[var(--color-atelier-grafite)]/80 custom-scrollbar leading-relaxed"
                />
              </div>

              <button 
                onClick={copyToClipboard}
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-sm transition-all flex items-center justify-center gap-2 
                  ${isCopied ? 'bg-green-500 text-white' : 'bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] hover:-translate-y-0.5'}`}
              >
                {isCopied ? <CheckCircle2 size={16}/> : <Copy size={16}/>} 
                {isCopied ? "Copiado para a Área de Transferência" : "Copiar Diagnóstico para o ClipBoard"}
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}