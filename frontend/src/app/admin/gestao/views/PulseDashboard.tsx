// src/app/admin/gestao/views/PulseDashboard.tsx
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  CheckCircle2, Target, Coffee, 
  PlayCircle, Loader2, Zap, Clock, Activity, Layers, Users, DollarSign
} from "lucide-react";
import { startOfDay, endOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PulseDashboardProps {
  currentUser: any;
  activeTab?: string;
  setActiveTab?: (tab: 'pulse' | 'workforce' | 'economics' | 'demands') => void;
}

// 🟢 UTILITÁRIO: Extração segura de nós do Supabase (Array vs Object)
function extractNode(node: any): any {
  if (!node) return null;
  return Array.isArray(node) ? node[0] : node;
}

export default function PulseDashboard({ currentUser, activeTab = 'pulse', setActiveTab }: PulseDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now()); // O "Tick Engine" Global
  const [team, setTeam] = useState<any[]>([]);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);

  // ==========================================================================
  // 1. O MOTOR DE TEMPO REAL (TICK ENGINE)
  // ==========================================================================
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ==========================================================================
  // 2. BUSCA DE DADOS E SUBSCRIPÇÕES REALTIME
  // ==========================================================================
  useEffect(() => {
    fetchPulseData();

    // 🟢 Escuta alterações nas sessões, tarefas e AGORA NOS PERFIS (Presença Absoluta)
    const channel = supabase.channel('pulse-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_sessions' }, () => {
        fetchPulseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchPulseData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        // Dispara quando um colaborador fica Online, Idle ou Offline
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
      if (!res.ok) throw new Error("Falha ao carregar pulse data");
      
      const { data } = await res.json();
      setTeam(data.team || []);
      setTodaySessions(data.sessions || []);
      setTodayTasks(data.tasks || []);
    } catch (error) {
      console.error("Erro ao buscar dados do Pulso via API:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // 3. PROCESSAMENTO DE MÉTRICAS (MEMOIZADO PARA PERFORMANCE)
  // ==========================================================================
  const activeSessions = useMemo(() => todaySessions.filter(s => s.end_time === null), [todaySessions]);
  const closedSessions = useMemo(() => todaySessions.filter(s => s.end_time !== null), [todaySessions]);

  const metrics = useMemo(() => {
    // Total de horas logadas hoje (Fechadas + Ativas até o momento)
    let totalMinutesToday = closedSessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
    activeSessions.forEach(s => {
      totalMinutesToday += Math.floor((now - new Date(s.start_time).getTime()) / 60000);
    });

    // Foco Médio (Tempo médio das sessões fechadas)
    const avgFocusMinutes = closedSessions.length > 0 ? Math.round(closedSessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0) / closedSessions.length) : 0;

    // Burn Down de Tarefas de Hoje
    const tasksDueOrActive = todayTasks.filter(t => (t.deadline && new Date(t.deadline) <= endOfDay(new Date())) || t.status === 'completed');
    const tasksCompletedToday = tasksDueOrActive.filter(t => t.status === 'completed').length;
    const totalTasksToday = tasksDueOrActive.length;
    const completionRate = totalTasksToday > 0 ? Math.round((tasksCompletedToday / totalTasksToday) * 100) : 0;

    return { totalMinutesToday, avgFocusMinutes, tasksCompletedToday, totalTasksToday, completionRate };
  }, [activeSessions, closedSessions, todayTasks, now]);

  // Formatação de Cronómetro HH:MM:SS
  const formatLiveTime = (startTimeString: string) => {
    const start = new Date(startTimeString).getTime();
    const diffSeconds = Math.floor((now - start) / 1000);
    const h = Math.floor(diffSeconds / 3600);
    const m = Math.floor((diffSeconds % 3600) / 60);
    const s = diffSeconds % 60;
    return `${h > 0 ? `${h}h ` : ''}${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-auto md:h-full gap-6 overflow-y-auto md:overflow-hidden relative">
      
      {/* HEADER DA VISÃO */}
      <header className="shrink-0 flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60">Live • Atualização em Tempo Real</span>
          </div>
          <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">O Pulso da Operação</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden xl:flex flex-col items-end mr-2">
            <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{format(now, "HH:mm")}</span>
            <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-0.5">{format(now, "dd 'de' MMMM", { locale: ptBR })}</span>
          </div>
          {/* NAV HORIZONTAL COMPACTA E SOFISTICADA ALINHADA AO HEAD */}
          <div className="bg-white/60 border border-white p-1.5 rounded-2xl shadow-sm flex items-center shrink-0">
            <button 
              onClick={() => setActiveTab?.('pulse')} 
              className={`px-3.5 py-2 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'pulse' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}
            >
              <Activity size={13} /> Pulso Live
            </button>
            <button 
              onClick={() => setActiveTab?.('demands')} 
              className={`px-3.5 py-2 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'demands' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}
            >
              <Layers size={13} /> Demandas
            </button>
            <button 
              onClick={() => setActiveTab?.('workforce')} 
              className={`px-3.5 py-2 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'workforce' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}
            >
              <Users size={13} /> Equipe & RH
            </button>
            <button 
              onClick={() => setActiveTab?.('economics')} 
              className={`px-3.5 py-2 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'economics' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}
            >
              <DollarSign size={13} /> Unit Economics
            </button>
          </div>
        </div>
      </header>

      {/* TOP METRICS (At a Glance) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        
        {/* 🟢 O NOVO WIDGET DE STATUS DA EQUIPE */}
        <div className="glass-panel bg-white/70 p-5 rounded-[1.5rem] border border-white shadow-sm flex flex-col justify-center">
          <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-gray-400 mb-2">Telemetria da Equipe</span>
          
          <div className="flex items-center -space-x-3 overflow-x-auto custom-scrollbar pb-1 pt-1 pl-1">
            {team.map((member) => {
              const status = member.current_status || 'offline';
              const isOnline = status === 'online';
              const isIdle = status === 'idle';
              const dotColor = isOnline ? 'bg-green-500' : isIdle ? 'bg-orange-400' : 'bg-gray-300';
              
              return (
                <div key={member.id} className="relative group cursor-pointer hover:z-20 transition-transform hover:scale-110 shrink-0">
                  <div className={`w-11 h-11 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm flex items-center justify-center transition-all ${isOnline ? 'ring-2 ring-green-500/30' : ''}`}>
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.nome} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-elegant text-[13px] text-[var(--color-atelier-grafite)] font-bold">{member.nome.charAt(0)}</span>
                    )}
                  </div>
                  
                  {/* Ponto de Status Absoluto */}
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-white border-2 border-white rounded-full z-10 flex items-center justify-center shadow-sm">
                    {isOnline && <div className="absolute w-full h-full bg-green-500 rounded-full animate-ping opacity-60"></div>}
                    <div className={`relative w-full h-full rounded-full ${dotColor}`}></div>
                  </div>
                  
                  {/* Tooltip Hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-[var(--color-atelier-grafite)] text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    {member.nome.split(" ")[0]} • {status}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-2 flex items-center gap-3 text-[8px] font-bold uppercase tracking-widest text-gray-400">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> On</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span> Inativo</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span> Off</span>
          </div>
        </div>
        
        <div className="glass-panel bg-white/70 p-5 rounded-[1.5rem] border border-white shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-[1rem] bg-green-50 text-green-600 flex items-center justify-center shrink-0 border border-green-100"><CheckCircle2 size={20} /></div>
          <div className="flex flex-col">
            <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">{metrics.tasksCompletedToday}</span>
            <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-gray-400 mt-1">Entregas de Hoje</span>
          </div>
        </div>

        <div className="glass-panel bg-white/70 p-5 rounded-[1.5rem] border border-white shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-[1rem] bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100"><Target size={20} /></div>
          <div className="flex flex-col">
            <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">{metrics.avgFocusMinutes} <span className="text-lg text-gray-400">min</span></span>
            <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-gray-400 mt-1">Tempo Médio de Foco</span>
          </div>
        </div>

        <div className="glass-panel bg-[var(--color-atelier-grafite)] p-5 rounded-[1.5rem] shadow-lg flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] w-24 h-24 bg-[var(--color-atelier-terracota)]/30 blur-2xl rounded-full"></div>
          <div className="flex justify-between items-end relative z-10">
            <div className="flex flex-col">
              <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-white/50 mb-1">Burn Down Diário</span>
              <span className="font-elegant text-3xl text-white leading-none">{metrics.completionRate}%</span>
            </div>
            <div className="w-10 h-10 rounded-full border-[3px] border-white/20 flex items-center justify-center relative">
               <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                 <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                 <motion.circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-atelier-terracota)" strokeWidth="12" strokeDasharray="251" strokeDashoffset={251 - (251 * metrics.completionRate) / 100} strokeLinecap="round" transition={{ duration: 1 }} />
               </svg>
            </div>
          </div>
        </div>
      </div>

      {/* CORPO PRINCIPAL (Split View) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* COLUNA ESQUERDA: RADAR DE ATIVIDADE AO VIVO (7 Colunas) */}
        <div className="lg:col-span-7 glass-panel bg-white/50 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><Zap size={20} className="text-blue-500"/> Radar de Operação</h3>
            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-blue-100">{activeSessions.length} Em Execução</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
            <AnimatePresence mode="popLayout">
              {activeSessions.length === 0 ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center justify-center h-full text-center opacity-40">
                  <Coffee size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
                  <p className="font-elegant text-2xl">Operação Silenciosa</p>
                  <p className="font-roboto text-[11px] font-bold uppercase tracking-widest mt-2">Nenhum colaborador com tarefas ativas no momento.</p>
                </motion.div>
              ) : (
                activeSessions.map((session) => {
                  const member = team.find(t => t.id === session.user_id);
                  
                  // 🟢 FIX: Blindagem contra dados aninhados do Supabase
                  const safeTask = extractNode(session.tasks);
                  const safeProject = extractNode(safeTask?.projects);
                  const safeProfile = extractNode(safeProject?.profiles);
                  
                  const clientName = safeProfile?.nome || "Projeto Interno";
                  const taskTitle = safeTask?.title || "Tarefa Sem Título";
                  
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9, x: 20 }}
                      key={session.id} 
                      className="bg-white p-4 rounded-[1.5rem] border border-blue-100 shadow-sm flex items-center gap-4 group hover:border-blue-300 transition-colors relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 w-1.5 h-full bg-blue-500"></div>
                      
                      {/* Avatar */}
                      <div className="relative shrink-0 ml-2">
                        <div className="w-12 h-12 rounded-[1rem] bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                          {member?.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" /> : <span className="font-elegant text-lg">{member?.nome?.charAt(0)}</span>}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex flex-col flex-1 truncate pr-4">
                        <span className="font-bold text-[14px] text-[var(--color-atelier-grafite)] truncate">{member?.nome || "Colaborador"}</span>
                        <div className="flex items-center gap-1.5 mt-0.5 truncate">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] shrink-0">{clientName}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-[11px] text-gray-500 truncate">{taskTitle}</span>
                        </div>
                      </div>

                      {/* Live Timer */}
                      <div className="bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100 text-blue-700 font-roboto text-[13px] font-bold tracking-wider shrink-0 w-28 text-center shadow-inner">
                        {formatLiveTime(session.start_time)}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* COLUNA DIREITA: FEED DE CONCLUSÕES (5 Colunas) */}
        <div className="lg:col-span-5 glass-panel bg-white/70 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center mb-6 shrink-0 border-b border-gray-100 pb-4">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><Clock size={20} className="text-[var(--color-atelier-terracota)]"/> Log de Atividades</h3>
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Hoje</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pr-2">
            <div className="relative border-l-2 border-gray-100 ml-3 flex flex-col gap-6 pb-6">
              {closedSessions.length === 0 ? (
                <div className="pl-6 pt-4 text-[11px] font-bold uppercase tracking-widest text-gray-400 italic">Sem histórico para exibir hoje.</div>
              ) : (
                closedSessions.map((session, index) => {
                  const member = team.find(t => t.id === session.user_id);
                  const safeTask = extractNode(session.tasks);
                  
                  return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} key={session.id} className="relative pl-6">
                      {/* Ponto na Timeline */}
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-[var(--color-atelier-terracota)] ring-4 ring-white"></div>
                      
                      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-[12px] text-[var(--color-atelier-grafite)] flex items-center gap-1.5"><PlayCircle size={12} className="text-gray-400"/> {member?.nome.split(" ")[0]} concluiu sessão</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{new Date(session.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mb-2 truncate">{safeTask?.title || "Tarefa Sem Título"}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-widest bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] px-2 py-1 rounded border border-[var(--color-atelier-terracota)]/20">
                            Duração: {session.duration_minutes} min
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}