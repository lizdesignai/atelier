// src/app/admin/gestao/views/WorkforceDashboard.tsx
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  Users, Target, RotateCcw, Clock, 
  FileText, Copy, CheckCircle2, AlertTriangle, 
  TrendingUp, TrendingDown, Loader2, X
} from "lucide-react";
import { startOfMonth, endOfMonth, differenceInBusinessDays, differenceInHours } from "date-fns";

interface WorkforceDashboardProps {
  currentUser: any;
}

export default function WorkforceDashboard({ currentUser }: WorkforceDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // SLA Configuration
  const HOURS_PER_DAY = 6; 
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  const businessDaysInMonth = differenceInBusinessDays(currentMonthEnd, currentMonthStart);
  const EXPECTED_MONTHLY_HOURS = businessDaysInMonth * HOURS_PER_DAY;

  useEffect(() => {
    fetchWorkforceData();
  }, []);

  const fetchWorkforceData = async () => {
    try {
      // 1. Busca perfis da equipa
      const { data: teamData } = await supabase
        .from('profiles')
        .select('id, nome, role, avatar_url')
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
        // A. Cálculo de Horas (SLA)
        const memberSessions = sessions?.filter(s => s.user_id === member.id) || [];
        const totalMinutes = memberSessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
        const totalHours = totalMinutes / 60;
        const slaPercentage = Math.min(Math.round((totalHours / EXPECTED_MONTHLY_HOURS) * 100), 100);

        // B. Cálculo de Qualidade (Refação)
        const memberTasks = tasks?.filter(t => t.assigned_to === member.id) || [];
        const completedTasks = memberTasks.filter(t => t.status === 'completed').length;
        
        // Consideramos refação se a tarefa teve feedback do admin ou se está/esteve em needs_revision
        const reworkedTasks = memberTasks.filter(t => t.admin_feedback !== null || t.status === 'needs_revision').length;
        const totalInvolved = completedTasks + reworkedTasks;
        
        const reworkRate = totalInvolved > 0 ? Math.round((reworkedTasks / totalInvolved) * 100) : 0;

        // C. Cálculo de Velocidade (Lead Time Médio em Horas)
        let leadTimeSum = 0;
        let leadTimeCount = 0;
        memberTasks.forEach(t => {
          if (t.started_at && t.completed_at) {
            const hours = differenceInHours(new Date(t.completed_at), new Date(t.started_at));
            if (hours >= 0) {
              leadTimeSum += hours;
              leadTimeCount++;
            }
          }
        });
        const avgLeadTime = leadTimeCount > 0 ? (leadTimeSum / leadTimeCount).toFixed(1) : 0;

        return {
          ...member,
          totalHours,
          slaPercentage,
          completedTasks,
          reworkRate,
          avgLeadTime
        };
      });

      // Ordenar por SLA (Aderência)
      setTeamStats(stats.sort((a, b) => b.slaPercentage - a.slaPercentage));

    } catch (error) {
      console.error("Erro ao gerar telemetria de RH:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // MOTOR DE DIAGNÓSTICO INTERNO (Substitui a IA por um Algoritmo de Template)
  // ==========================================================================
  const generateDiagnosticReport = (member: any) => {
    let aderenciaText = "";
    if (member.slaPercentage >= 90) aderenciaText = "Excelente aderência à carga horária estipulada (SLA). O colaborador demonstra alto comprometimento com o tempo produtivo.";
    else if (member.slaPercentage >= 70) aderenciaText = "Aderência satisfatória, mas com espaço para otimização de foco diário.";
    else aderenciaText = "Baixa aderência à carga horária. É necessário avaliar se existem gargalos operacionais ou falta de alocação de tarefas.";

    let qualidadeText = "";
    if (member.reworkRate <= 10) qualidadeText = "Taxa de qualidade altíssima. As entregas são precisas e raramente exigem ajustes pela direção de arte ou cliente.";
    else if (member.reworkRate <= 30) qualidadeText = "Qualidade dentro da média do estúdio. Algumas refações pontuais, comuns no fluxo criativo.";
    else qualidadeText = "Alto índice de refação identificado. Recomenda-se uma revisão mais atenta aos briefings antes de enviar as peças para aprovação.";

    const report = `📋 DIAGNÓSTICO DE DESEMPENHO: ${member.nome.toUpperCase()}
Mês de Referência: ${currentMonthStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}

📊 MÉTRICAS CONSOLIDADAS:
• Horas Produtivas: ${member.totalHours.toFixed(1)}h (Meta: ${EXPECTED_MONTHLY_HOURS}h)
• Aderência ao SLA: ${member.slaPercentage}%
• Tarefas Concluídas: ${member.completedTasks}
• Índice de Refação: ${member.reworkRate}%
• Lead Time Médio: ${member.avgLeadTime}h por tarefa

🔍 ANÁLISE DE ADERÊNCIA:
${aderenciaText}

🎨 ANÁLISE DE QUALIDADE E PRECISÃO:
${qualidadeText}

🎯 RECOMENDAÇÃO DO SISTEMA:
${member.reworkRate > 30 ? 'Priorizar alinhamento de briefing e revisão em pares.' : member.slaPercentage < 70 ? 'Revisar gestão de tempo e priorização no Kanban.' : 'Manter o ritmo atual. Excelente performance operacional.'}
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

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full gap-6 overflow-hidden relative">
      
      {/* HEADER DA VISÃO */}
      <header className="shrink-0 flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-[var(--color-atelier-terracota)]" />
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60">Workforce & Performance</span>
          </div>
          <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">Análise de Colaboradores</h2>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">SLA Mensal</span>
          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1">Meta: {EXPECTED_MONTHLY_HOURS}h ativas/mês</span>
        </div>
      </header>

      {/* GRID DE COLABORADORES */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          
          {teamStats.map(member => (
            <div key={member.id} className="glass-panel bg-white/70 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col gap-5 hover:shadow-md transition-all group">
              
              {/* Topo: Avatar + Nome + Botão Report */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-[1.2rem] bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shadow-inner shrink-0">
                    {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" /> : <span className="font-elegant text-xl text-[var(--color-atelier-grafite)]">{member.nome.charAt(0)}</span>}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[16px] text-[var(--color-atelier-grafite)]">{member.nome}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mt-0.5">{member.role}</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => generateDiagnosticReport(member)}
                  className="bg-blue-50 text-blue-600 border border-blue-100 px-4 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
                >
                  <FileText size={14} /> Gerar Diagnóstico
                </button>
              </div>

              {/* Corpo: Métricas Split */}
              <div className="grid grid-cols-3 gap-4 border-t border-[var(--color-atelier-grafite)]/5 pt-5">
                
                {/* Aderência */}
                <div className="flex flex-col gap-2 border-r border-[var(--color-atelier-grafite)]/5 pr-4">
                  <div className="flex items-center gap-1.5 text-[var(--color-atelier-grafite)]/50">
                    <Target size={12} /> <span className="text-[9px] font-bold uppercase tracking-widest">Aderência (SLA)</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{member.slaPercentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-1">
                    <div className={`h-full rounded-full ${member.slaPercentage >= 90 ? 'bg-green-500' : member.slaPercentage >= 60 ? 'bg-orange-400' : 'bg-red-500'}`} style={{ width: `${member.slaPercentage}%` }}></div>
                  </div>
                </div>

                {/* Qualidade (Refação) */}
                <div className="flex flex-col gap-2 border-r border-[var(--color-atelier-grafite)]/5 pr-4 pl-2">
                  <div className="flex items-center gap-1.5 text-[var(--color-atelier-grafite)]/50">
                    <RotateCcw size={12} /> <span className="text-[9px] font-bold uppercase tracking-widest">Taxa de Refação</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-elegant text-2xl leading-none ${member.reworkRate <= 15 ? 'text-green-600' : member.reworkRate <= 30 ? 'text-orange-500' : 'text-red-500'}`}>
                      {member.reworkRate}%
                    </span>
                    {member.reworkRate <= 15 ? <TrendingDown size={14} className="text-green-500" /> : <TrendingUp size={14} className="text-red-500" />}
                  </div>
                  <span className="text-[9px] font-bold text-gray-400">Entregas devolvidas</span>
                </div>

                {/* Lead Time */}
                <div className="flex flex-col gap-2 pl-2">
                  <div className="flex items-center gap-1.5 text-[var(--color-atelier-grafite)]/50">
                    <Clock size={12} /> <span className="text-[9px] font-bold uppercase tracking-widest">Velocidade</span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{member.avgLeadTime}</span>
                    <span className="text-sm text-gray-400 mb-0.5">h</span>
                  </div>
                  <span className="text-[9px] font-bold text-gray-400">Tempo médio / peça</span>
                </div>

              </div>
            </div>
          ))}

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