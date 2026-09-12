// src/app/admin/gestao/views/PulseDashboard.tsx
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, Target, Coffee, 
  PlayCircle, Loader2, Zap, Clock, Activity, Layers, Users, DollarSign, Edit2, MoreVertical
} from "lucide-react";
import { startOfDay, endOfDay, format, startOfMonth, endOfMonth } from "date-fns";
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
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now()); // O "Tick Engine" Global
  const [team, setTeam] = useState<any[]>([]);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  
  // States migrados do DemandsDashboard
  const [tasks, setTasks] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [filterCollab, setFilterCollab] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [monthSessions, setMonthSessions] = useState<any[]>([]); // Adicionado
  const [demandSortBy, setDemandSortBy] = useState<'more_demands'|'less_demands'|'more_time'|'less_time'|'valuePerHour'|'valuePerDelivery'>('valuePerHour');

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
      if (res.ok) {
        const { data } = await res.json();
        setTeam(data.team || []);
        setTodaySessions(data.sessions || []);
        setTodayTasks(data.tasks || []);
      }

      // 🟢 BUSCA DE DEMANDAS (Migrado do DemandsDashboard)
      const currentNow = new Date();
      const monthStart = startOfMonth(currentNow).toISOString();
      
      const [resProjects, resAgencies, resSubs, resMonthSessions] = await Promise.all([
        supabase.from('projects').select('id, financial_value, profiles(nome)').eq('status', 'active'),
        supabase.from('agencies').select('id, financial_value, name').eq('status', 'active'),
        supabase.from('agency_subclients').select('id, name, agency_id'),
        supabase.from('work_sessions').select('duration_minutes, task_id, tasks(project_id, agency_id, subclient_id)').gte('start_time', monthStart)
      ]);

      const unifiedSources: any[] = [];
      if (resProjects.data) {
        resProjects.data.forEach(p => {
          const profile = extractNode(p.profiles);
          unifiedSources.push({ id: p.id, type: 'project', name: profile?.nome || 'Projeto Desconhecido', label: 'Estúdio', fee: Number(p.financial_value || 0) });
        });
      }
      if (resAgencies.data) {
        resAgencies.data.forEach(a => unifiedSources.push({ id: a.id, type: 'agency', name: a.name, label: 'Agência WL', fee: Number(a.financial_value || 0) }));
      }
      if (resSubs.data) {
        resSubs.data.forEach(s => unifiedSources.push({ id: s.id, type: 'subclient', name: s.name, label: 'Subcliente WL', fee: 0 }));
      }
      setSources(unifiedSources.sort((a, b) => a.name.localeCompare(b.name)));

      if (resMonthSessions.data) setMonthSessions(resMonthSessions.data);

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .or(`created_at.gte.${monthStart},deadline.gte.${monthStart},completed_at.gte.${monthStart},status.in.(pending,review,needs_revision)`)
        .order('deadline', { ascending: true }); // Ordenado por prazo apertado

      if (tasksData) setTasks(tasksData);

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

    const tasksDueOrActive = todayTasks.filter(t => (t.deadline && new Date(t.deadline) <= endOfDay(new Date())) || t.status === 'completed');
    const tasksCompletedToday = tasksDueOrActive.filter(t => t.status === 'completed').length;
    const totalTasksToday = tasksDueOrActive.length;
    const completionRate = totalTasksToday > 0 ? Math.round((tasksCompletedToday / totalTasksToday) * 100) : 0;

    const memberData: Record<string, { minutes: number, completed: number }> = {};
    team.forEach(m => { memberData[m.id] = { minutes: 0, completed: 0 }; });
    
    closedSessions.forEach(s => {
      if (memberData[s.user_id]) memberData[s.user_id].minutes += (s.duration_minutes || 0);
    });
    activeSessions.forEach(s => {
      if (memberData[s.user_id]) {
        memberData[s.user_id].minutes += Math.floor((now - new Date(s.start_time).getTime()) / 60000);
      }
    });
    tasksDueOrActive.forEach(t => {
      if (t.status === 'completed' && t.assigned_to && memberData[t.assigned_to]) {
        memberData[t.assigned_to].completed += 1;
      }
    });

    return { totalMinutesToday, avgFocusMinutes, tasksCompletedToday, totalTasksToday, completionRate, memberData };
  }, [activeSessions, closedSessions, todayTasks, now, team]);

  const demandMetrics = useMemo(() => {
    // Calcular dados por fonte (Estúdio, Agência, Subcliente)
    const sourceStats = sources.map(source => {
      const sourceTasks = tasks.filter(t => 
        (source.type === 'project' && t.project_id === source.id) ||
        (source.type === 'agency' && t.agency_id === source.id) ||
        (source.type === 'subclient' && t.subclient_id === source.id)
      );
      
      const sourceSessions = monthSessions.filter(s => {
        const t = extractNode(s.tasks);
        return t && (
          (source.type === 'project' && t.project_id === source.id) ||
          (source.type === 'agency' && t.agency_id === source.id) ||
          (source.type === 'subclient' && t.subclient_id === source.id)
        );
      });

      const totalTasks = sourceTasks.length;
      const completedTasks = sourceTasks.filter(t => t.status === 'completed').length;
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
        valuePerHour
      };
    }).filter(s => s.totalTasks > 0 || s.totalMinutes > 0);

    // Sorting
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
      <header className="shrink-0 flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-4 relative z-20">
        <div className="flex flex-wrap items-center gap-6 shrink-0 py-2 flex-1">
          {team.map((member) => {
            const status = member.current_status || 'offline';
            const isOnline = status === 'online';
            const isIdle = status === 'idle';
            const dotColor = isOnline ? 'bg-green-500' : isIdle ? 'bg-orange-400' : 'bg-gray-300';
            const mData = metrics.memberData[member.id] || { minutes: 0, completed: 0 };
            const focusHours = Math.floor(mData.minutes / 60);
            const focusMins = mData.minutes % 60;
            const timeStr = `${focusHours}h ${focusMins}m`;

            return (
              <div key={member.id} className="relative group flex flex-col items-center gap-1.5 transition-transform hover:scale-105 shrink-0">
                {/* Avatar + Bolinha */}
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm flex items-center justify-center transition-all ${isOnline ? 'ring-2 ring-green-500/30' : ''}`}>
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.nome} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-elegant text-[14px] text-[var(--color-atelier-grafite)] font-bold">{member.nome.charAt(0)}</span>
                    )}
                  </div>
                  {/* Ponto de Status Absoluto */}
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-white border-2 border-white rounded-full z-10 flex items-center justify-center shadow-sm">
                    {isOnline && <div className="absolute w-full h-full bg-green-500 rounded-full animate-ping opacity-60"></div>}
                    <div className={`relative w-full h-full rounded-full ${dotColor}`}></div>
                  </div>
                </div>

                {/* Tempo em foco (meio) */}
                <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)]/70">{timeStr}</span>
                
                {/* Entregas (inferior) */}
                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/10 px-2 py-0.5 rounded-md">
                  {mData.completed} entregas
                </span>

                {/* Tooltip Hover (Nome) */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-[var(--color-atelier-grafite)] text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                  {member.nome.split(" ")[0]}
                </div>
              </div>
            );
          })}
        </div>

        {/* NAV HORIZONTAL COMPACTA */}
        <div className="bg-white/60 border border-white p-1.5 rounded-2xl shadow-sm flex items-center shrink-0 gap-1 ml-4">
          <button 
            onClick={() => setActiveTab?.('pulse')} 
            className={`px-3.5 py-2 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'pulse' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50 w-10 h-10 p-0'}`}
            title="Pulso Live"
          >
            <Activity size={16} /> {activeTab === 'pulse' && <span>Pulso Live</span>}
          </button>
          <button 
            onClick={() => setActiveTab?.('workforce')} 
            className={`px-3.5 py-2 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'workforce' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50 w-10 h-10 p-0'}`}
            title="Equipe & RH"
          >
            <Users size={16} /> {activeTab === 'workforce' && <span>Equipe & RH</span>}
          </button>
          <button 
            onClick={() => setActiveTab?.('economics')} 
            className={`px-3.5 py-2 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'economics' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50 w-10 h-10 p-0'}`}
            title="Unit Economics"
          >
            <DollarSign size={16} /> {activeTab === 'economics' && <span>Unit Economics</span>}
          </button>
        </div>
      </header>



      {/* CORPO PRINCIPAL (Split View) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* COLUNA ESQUERDA: PRÓXIMAS TAREFAS (A VENCER) (7 Colunas) */}
        <div className="lg:col-span-7 glass-panel bg-white/50 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><Zap size={20} className="text-blue-500"/> Próximas Entregas</h3>
            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-blue-100">Prazo Apertado</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
            <AnimatePresence mode="popLayout">
              {(() => {
                // Filtrar tarefas pendentes e em revisão, ordenadas por deadline
                const upcoming = tasks.filter(t => t.status === 'pending' || t.status === 'review' || t.status === 'needs_revision').slice(0, 15);
                if (upcoming.length === 0) {
                  return (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center justify-center h-full text-center opacity-40">
                      <Coffee size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
                      <p className="font-elegant text-2xl">Tudo em Dia</p>
                      <p className="font-roboto text-[11px] font-bold uppercase tracking-widest mt-2">Nenhuma tarefa pendente próxima ao vencimento.</p>
                    </motion.div>
                  );
                }
                
                return upcoming.map((task) => {
                  const member = team.find(t => t.id === task.assigned_to);
                  
                  let sourceName = "Projeto Interno";
                  if (task.subclient_id) {
                    const s = sources.find(x => x.id === task.subclient_id);
                    sourceName = s ? s.name : "Subcliente";
                  } else if (task.agency_id) {
                    const s = sources.find(x => x.id === task.agency_id);
                    sourceName = s ? s.name : "Agência";
                  } else if (task.project_id) {
                    const s = sources.find(x => x.id === task.project_id);
                    sourceName = s ? s.name : "Estúdio";
                  }
                  
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9, x: 20 }}
                      key={task.id} 
                      className="bg-white shrink-0 p-4 rounded-[1.5rem] border border-blue-100 shadow-sm flex items-center gap-4 group hover:border-blue-300 transition-colors relative overflow-hidden"
                    >
                      <div className={`absolute left-0 top-0 w-1.5 h-full ${task.status === 'pending' ? 'bg-blue-500' : 'bg-orange-400'}`}></div>
                      
                      {/* Avatar do Responsável */}
                      <div className="relative shrink-0 ml-2">
                        <div className="w-12 h-12 rounded-[1rem] bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                          {member?.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" /> : <span className="font-elegant text-lg">{member?.nome?.charAt(0) || '?'}</span>}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex flex-col flex-1 truncate pr-4">
                        <span className="font-bold text-[14px] text-[var(--color-atelier-grafite)] truncate">{task.title || "Tarefa Sem Título"}</span>
                        <div className="flex items-center gap-1.5 mt-0.5 truncate">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] shrink-0">{sourceName}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-[11px] text-gray-500 truncate">{member?.nome || "Não atribuído"}</span>
                        </div>
                      </div>

                      {/* Deadline */}
                      <div className={`px-4 py-2.5 rounded-xl border font-roboto text-[11px] font-bold tracking-wider shrink-0 w-28 text-center shadow-inner ${new Date(task.deadline) < new Date() ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                        {new Date(task.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                        <button 
                          onClick={() => router.push(`/admin/task/${task.id}`)}
                          className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:text-[var(--color-atelier-terracota)] hover:border-[var(--color-atelier-terracota)]/30 hover:bg-orange-50 flex items-center justify-center transition-all shadow-sm"
                          title="Gerenciar Demanda"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  );
                });
              })()}
            </AnimatePresence>
          </div>
        </div>

        {/* COLUNA DIREITA: DEMANDAS & UNIT ECONOMICS (5 Colunas) */}
        <div className="lg:col-span-5 glass-panel bg-white/70 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col h-full overflow-hidden">
          <div className="flex flex-col gap-4 mb-6 shrink-0 border-b border-gray-100 pb-4">
            <div className="flex justify-between items-center">
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                <Layers size={20} className="text-[var(--color-atelier-terracota)]"/> Demandas & Economia
              </h3>
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Visão Geral do Mês</span>
            </div>
            
            {/* Filtros Dropdown */}
            <div className="flex items-center gap-2 relative z-20">
              <select
                className="bg-gray-50 border border-gray-200 text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/70 rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:bg-gray-100"
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
              >
                <option value="all">Todos (Estúdio, Agências, Subs)</option>
                <option value="project">Apenas Projetos/Estúdio</option>
                <option value="agency">Apenas Agências</option>
                <option value="subclient">Apenas Subclientes</option>
              </select>
              
              <select
                className="bg-gray-50 border border-gray-200 text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/70 rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:bg-gray-100"
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
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pr-2 gap-3">
            <AnimatePresence>
              {(() => {
                const filteredMetrics = demandMetrics.filter(m => {
                  if (filterSource === 'all') return true;
                  return m.type === filterSource;
                });

                if (filteredMetrics.length === 0) {
                  return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 text-center text-[11px] font-bold uppercase tracking-widest text-gray-400 italic">
                      Nenhum dado financeiro ou de demanda no período.
                    </motion.div>
                  );
                }

                return filteredMetrics.map((metric, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} 
                    key={metric.id} 
                    className="bg-white shrink-0 p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-[var(--color-atelier-terracota)]/30 transition-colors flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col truncate pr-2">
                        <span className="font-bold text-[13px] text-[var(--color-atelier-grafite)] truncate">{metric.name}</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">{metric.label}</span>
                      </div>
                      <div className="bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-lg text-[12px] font-bold flex items-center gap-1 shrink-0">
                        <DollarSign size={12}/> {metric.fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="flex flex-col bg-gray-50 rounded-lg p-2 border border-gray-100">
                        <span className="font-elegant text-lg text-[var(--color-atelier-grafite)] leading-none">{metric.totalTasks}</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mt-1">Demandas</span>
                      </div>
                      <div className="flex flex-col bg-gray-50 rounded-lg p-2 border border-gray-100">
                        <span className="font-elegant text-lg text-[var(--color-atelier-grafite)] leading-none">{metric.totalHours.toFixed(1)}h</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mt-1">Tempo</span>
                      </div>
                      <div className="flex flex-col bg-orange-50 rounded-lg p-2 border border-orange-100">
                        <span className="font-elegant text-lg text-orange-700 leading-none">
                          {metric.valuePerHour > 0 ? `R$${Math.round(metric.valuePerHour)}` : '-'}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-orange-400 mt-1">R$/Hora</span>
                      </div>
                      <div className="flex flex-col bg-blue-50 rounded-lg p-2 border border-blue-100">
                        <span className="font-elegant text-lg text-blue-700 leading-none">
                          {metric.valuePerDelivery > 0 ? `R$${Math.round(metric.valuePerDelivery)}` : '-'}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-blue-400 mt-1">R$/Entrega</span>
                      </div>
                    </div>
                  </motion.div>
                ));
              })()}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </motion.div>
  );
}