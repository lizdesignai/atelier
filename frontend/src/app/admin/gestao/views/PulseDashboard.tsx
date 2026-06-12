// src/app/admin/gestao/views/PulseDashboard.tsx
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  Activity, Users, Clock, CheckCircle2, 
  Target, Zap, Coffee, ChevronRight, PlayCircle, Loader2
} from "lucide-react";
import { startOfDay, endOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PulseDashboardProps {
  currentUser: any;
}

export default function PulseDashboard({ currentUser }: PulseDashboardProps) {
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

    // 🟢 Escuta alterações na tabela de work_sessions em tempo real
    const channel = supabase.channel('pulse-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_sessions' }, (payload) => {
        console.log("Mudança de sessão detectada, atualizando Pulso...", payload);
        fetchPulseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchPulseData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPulseData = async () => {
    try {
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      // Busca Equipa
      const { data: teamData } = await supabase.from('profiles').select('id, nome, avatar_url, role').in('role', ['colaborador', 'gestor', 'admin']);
      if (teamData) setTeam(teamData);

      // Busca Sessões de Hoje
      const { data: sessionsData } = await supabase
        .from('work_sessions')
        .select('*, tasks(title, projects(profiles(nome)))')
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd)
        .order('start_time', { ascending: false });
      if (sessionsData) setTodaySessions(sessionsData);

      // Busca Tarefas movimentadas hoje
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, status, deadline')
        .or(`updated_at.gte.${todayStart},deadline.gte.${todayStart},deadline.lte.${todayEnd}`);
      if (tasksData) setTodayTasks(tasksData);

    } catch (error) {
      console.error("Erro ao buscar dados do Pulso:", error);
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
    // Membros Ativos agora
    const activeMembersCount = new Set(activeSessions.map(s => s.user_id)).size;
    
    // Total de horas logadas hoje (Fechadas + Ativas até o momento)
    let totalMinutesToday = closedSessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
    activeSessions.forEach(s => {
      totalMinutesToday += Math.floor((now - new Date(s.start_time).getTime()) / 60000);
    });

    // Foco Médio (Tempo médio das sessões fechadas)
    const avgFocusMinutes = closedSessions.length > 0 ? Math.round(closedSessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0) / closedSessions.length) : 0;

    // Burn Down de Tarefas de Hoje
    const tasksDueOrActive = todayTasks.filter(t => t.deadline && new Date(t.deadline) <= endOfDay(new Date()) || t.status === 'completed');
    const tasksCompletedToday = tasksDueOrActive.filter(t => t.status === 'completed').length;
    const totalTasksToday = tasksDueOrActive.length;
    const completionRate = totalTasksToday > 0 ? Math.round((tasksCompletedToday / totalTasksToday) * 100) : 0;

    return { activeMembersCount, totalMinutesToday, avgFocusMinutes, tasksCompletedToday, totalTasksToday, completionRate };
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full gap-6 overflow-hidden relative">
      
      {/* HEADER DA VISÃO */}
      <header className="shrink-0 flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60">Live • Atualização em Tempo Real</span>
          </div>
          <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">O Pulso da Operação</h2>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">{format(now, "HH:mm")}</span>
          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1">{format(now, "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
        </div>
      </header>

      {/* TOP METRICS (At a Glance) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="glass-panel bg-white/70 p-5 rounded-[1.5rem] border border-white shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-[1rem] bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100"><Activity size={20} /></div>
          <div className="flex flex-col">
            <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">{metrics.activeMembersCount} <span className="text-lg text-gray-400">/ {team.length}</span></span>
            <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-gray-400 mt-1">Colaboradores Online</span>
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
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-full text-center opacity-40">
                  <Coffee size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
                  <p className="font-elegant text-2xl">Operação Silenciosa</p>
                  <p className="font-roboto text-[11px] font-bold uppercase tracking-widest mt-2">Nenhum colaborador com tarefas ativas no momento.</p>
                </motion.div>
              ) : (
                activeSessions.map((session) => {
                  const member = team.find(t => t.id === session.user_id);
                  const clientName = session.tasks?.projects?.profiles?.nome || "Projeto Interno";
                  
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                      key={session.id} 
                      className="bg-white p-4 rounded-[1.5rem] border border-blue-100 shadow-sm flex items-center gap-4 group hover:border-blue-300 transition-colors relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 w-1.5 h-full bg-blue-500"></div>
                      
                      {/* Avatar */}
                      <div className="relative shrink-0 ml-2">
                        <div className="w-12 h-12 rounded-[1rem] bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                          {member?.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" /> : <span className="font-elegant text-lg">{member?.nome?.charAt(0)}</span>}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping"></div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex flex-col flex-1 truncate pr-4">
                        <span className="font-bold text-[14px] text-[var(--color-atelier-grafite)] truncate">{member?.nome || "Colaborador"}</span>
                        <div className="flex items-center gap-1.5 mt-0.5 truncate">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] shrink-0">{clientName}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-[11px] text-gray-500 truncate">{session.tasks?.title || "Tarefa Sem Título"}</span>
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
                  return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} key={session.id} className="relative pl-6">
                      {/* Ponto na Timeline */}
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-[var(--color-atelier-terracota)] ring-4 ring-white"></div>
                      
                      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-[12px] text-[var(--color-atelier-grafite)] flex items-center gap-1.5"><PlayCircle size={12} className="text-gray-400"/> {member?.nome.split(" ")[0]} concluiu sessão</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{new Date(session.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mb-2 truncate">{session.tasks?.title || "Tarefa"}</p>
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