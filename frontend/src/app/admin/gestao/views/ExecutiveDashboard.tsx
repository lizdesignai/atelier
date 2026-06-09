// src/app/admin/gestao/views/ExecutiveDashboard.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  Users, TrendingUp, AlertTriangle, Clock, 
  DollarSign, Activity, CheckCircle2, XCircle, Zap, ShieldCheck, Loader2
} from "lucide-react";
import { startOfWeek, endOfWeek, differenceInDays } from "date-fns";

interface ExecutiveDashboardProps {
  currentUser: any;
}

// 🟢 UTILITÁRIO: Extração segura de nós do Supabase (resolve o erro de Array vs Objeto)
function extractProfile(profileNode: any): any {
  if (!profileNode) return null;
  return Array.isArray(profileNode) ? profileNode[0] : profileNode;
}

export default function ExecutiveDashboard({ currentUser }: ExecutiveDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [slaData, setSlaData] = useState<any[]>([]);
  const [profitabilityData, setProfitabilityData] = useState<any[]>([]);
  const [qualityRadar, setQualityRadar] = useState<any[]>([]);

  useEffect(() => {
    fetchExecutiveTelemetry();
  }, []);

  const fetchExecutiveTelemetry = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString(); // Segunda-feira
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();

      // 1. DADOS DE SLA E EQUIPA (work_sessions)
      const { data: team } = await supabase.from('profiles').select('id, nome, role, avatar_url').in('role', ['colaborador', 'gestor', 'admin']);
      const { data: sessions } = await supabase.from('work_sessions').select('*').gte('start_time', weekStart).lte('start_time', weekEnd);
      
      const teamSla = team?.map(member => {
        const memberSessions = sessions?.filter(s => s.user_id === member.id) || [];
        const totalMinutes = memberSessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
        const totalHours = totalMinutes / 60;
        
        // Regra de SLA: 30h/semana (6h ativas/dia * 5 dias)
        let status = 'On Target';
        let color = 'text-green-500 bg-green-50 border-green-200';
        
        if (totalHours > 35) {
          status = 'Burnout Risco';
          color = 'text-red-600 bg-red-50 border-red-200';
        } else if (totalHours < 15) {
          status = 'Sub-alocado';
          color = 'text-orange-500 bg-orange-50 border-orange-200';
        }

        return { ...member, totalHours, status, color };
      }).sort((a, b) => b.totalHours - a.totalHours) || [];

      setSlaData(teamSla);

      // 2. DADOS DE RENTABILIDADE (Projects + Tasks)
      const { data: activeProjects } = await supabase.from('projects').select('id, profiles(nome), financial_value, type, status').eq('status', 'active');
      const { data: tasks } = await supabase.from('tasks').select('project_id, actual_time, estimated_time').in('status', ['completed', 'in_progress', 'review']);

      const profitMatrix = activeProjects?.map(proj => {
        // 🟢 Correção do Type Error: Usamos a extração segura
        const safeProfile = extractProfile(proj.profiles);
        const clientName = safeProfile?.nome || 'Desconhecido';

        const projTasks = tasks?.filter(t => t.project_id === proj.id) || [];
        const totalMinutesSpent = projTasks.reduce((acc, t) => acc + (t.actual_time || t.estimated_time || 0), 0);
        const totalHoursSpent = totalMinutesSpent / 60;
        const fee = Number(proj.financial_value || 0);

        // Cálculo Rápido de Rentabilidade (Assumindo custo hora da agência ~ R$50 para cálculo base)
        const CUSTO_HORA_BASE = 50;
        const operCost = totalHoursSpent * CUSTO_HORA_BASE;
        const margin = fee - operCost;
        
        let health = 'Saudável';
        let healthColor = 'text-green-600';
        
        if (margin < 0) {
          health = 'Tóxico (Prejuízo)';
          healthColor = 'text-red-600';
        } else if (margin < fee * 0.3) {
          health = 'Margem Baixa';
          healthColor = 'text-orange-500';
        }

        return { 
          id: proj.id, 
          name: clientName, 
          type: proj.type,
          fee, 
          hours: totalHoursSpent.toFixed(1), 
          margin, 
          health, 
          healthColor 
        };
      }).sort((a, b) => a.margin - b.margin) || []; // Ordena dos mais tóxicos para os mais rentáveis

      setProfitabilityData(profitMatrix);

      // 3. RADAR DE QUALIDADE (Tarefas Rejeitadas & Churn Imínente)
      const { data: allTasks } = await supabase.from('tasks').select('id, title, status, project_id, completed_at');
      const alerts: any[] = [];

      activeProjects?.forEach(proj => {
        // 🟢 Correção do Type Error: Usamos a extração segura
        const safeProfile = extractProfile(proj.profiles);
        const clientName = safeProfile?.nome || 'Cliente';

        const pTasks = allTasks?.filter(t => t.project_id === proj.id) || [];
        const completed = pTasks.filter(t => t.status === 'completed' && t.completed_at);
        
        // Verifica Churn (Sem entregas há 7+ dias)
        if (completed.length > 0) {
          const lastDelivery = new Date(Math.max(...completed.map(t => new Date(t.completed_at).getTime())));
          const daysSinceLast = differenceInDays(now, lastDelivery);
          if (daysSinceLast >= 7) {
            alerts.push({ type: 'churn', client: clientName, msg: `Há ${daysSinceLast} dias sem receber entregas finalizadas.` });
          }
        } else if (pTasks.length > 0) {
            alerts.push({ type: 'churn', client: clientName, msg: `Projeto ativo mas sem nenhuma entrega concluída.` });
        }
      });

      // Busca rejeições do cliente na social_posts
      const { data: rejectedPosts } = await supabase.from('social_posts').select('title, client_id, status').eq('status', 'needs_revision');
      rejectedPosts?.forEach(post => {
        alerts.push({ type: 'quality', client: 'Avaliação Cliente', msg: `Ajuste solicitado na arte: ${post.title}` });
      });

      setQualityRadar(alerts);

    } catch (error) {
      console.error("Erro na Telemetria de Gestão:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full gap-6 overflow-hidden">
      
      {/* HEADER C-LEVEL */}
      <header className="shrink-0 flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] px-3 py-1.5 rounded-full mb-2 shadow-sm border border-white">
            <ShieldCheck size={12} strokeWidth={2.5} />
            <span className="text-[9px] uppercase tracking-widest font-bold">Gestão & Inteligência</span>
          </div>
          <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Produtividade <span className="text-[var(--color-atelier-terracota)] italic">& RH.</span>
          </h1>
        </div>
      </header>

      {/* AS 3 ZONAS DE INTELIGÊNCIA */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* ZONA 1: SLA DA EQUIPA */}
        <div className="glass-panel bg-white/70 p-6 rounded-[2rem] shadow-sm flex flex-col h-full overflow-hidden border border-white">
          <div className="shrink-0 mb-5 border-b border-gray-100 pb-4">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><Users size={20} className="text-blue-500"/> Capacidade & SLA</h3>
            <p className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Horas Ativas na Semana Atual</p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
            {slaData.map((member) => (
              <div key={member.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                    {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" /> : <span className="font-elegant text-sm">{member.nome.charAt(0)}</span>}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[14px] text-[var(--color-atelier-grafite)]">{member.nome}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{member.role}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-elegant text-xl leading-none text-[var(--color-atelier-grafite)]">{member.totalHours.toFixed(1)}h</span>
                  <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${member.color}`}>
                    {member.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ZONA 2: MATRIZ DE RENTABILIDADE */}
        <div className="glass-panel bg-[var(--color-atelier-grafite)] text-white p-6 rounded-[2rem] shadow-xl flex flex-col h-full overflow-hidden relative border border-white/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-atelier-terracota)]/20 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="shrink-0 mb-5 border-b border-white/10 pb-4 relative z-10">
            <h3 className="font-elegant text-2xl flex items-center gap-2"><TrendingUp size={20} className="text-[var(--color-atelier-terracota)]"/> Custo Operacional</h3>
            <p className="font-roboto text-[10px] font-bold uppercase tracking-widest text-white/50 mt-1">Lucratividade de Projetos</p>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2 relative z-10">
            {profitabilityData.length === 0 ? (
              <span className="text-white/40 italic text-sm text-center mt-10">Calculando matriz financeira...</span>
            ) : (
              profitabilityData.map((proj) => (
                <div key={proj.id} className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col gap-3 hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="font-bold text-[14px]">{proj.name}</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">{proj.type}</span>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg bg-white/10 ${proj.healthColor}`}>{proj.health}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                    <div className="flex flex-col">
                      <span className="text-[8px] uppercase tracking-widest text-white/40 mb-0.5">Tempo Consumido</span>
                      <span className="font-elegant text-lg leading-none">{proj.hours}h</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] uppercase tracking-widest text-white/40 mb-0.5">Fee Estimado</span>
                      <span className="font-elegant text-lg leading-none text-[var(--color-atelier-terracota)]">R$ {proj.fee}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ZONA 3: RADAR DE QUALIDADE */}
        <div className="glass-panel bg-white/70 p-6 rounded-[2rem] shadow-sm flex flex-col h-full overflow-hidden border border-white">
          <div className="shrink-0 mb-5 border-b border-gray-100 pb-4">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><Zap size={20} className="text-orange-500"/> Radar de Qualidade</h3>
            <p className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Alertas de Churn & Feedbacks</p>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
            {qualityRadar.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center opacity-40 mt-10">
                <CheckCircle2 size={40} className="text-green-500 mb-2" />
                <p className="font-elegant text-xl">Radar Limpo</p>
                <p className="text-[10px] uppercase tracking-widest font-bold mt-1">Nenhum risco detetado.</p>
              </div>
            ) : (
              qualityRadar.map((alert, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border flex gap-3 items-start ${alert.type === 'churn' ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                  <div className="shrink-0 mt-0.5">
                    {alert.type === 'churn' ? <Clock size={16} className="text-orange-500" /> : <AlertTriangle size={16} className="text-red-500" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[12px]">{alert.client}</span>
                    <span className="text-[11px] mt-1 opacity-80 leading-snug">{alert.msg}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}