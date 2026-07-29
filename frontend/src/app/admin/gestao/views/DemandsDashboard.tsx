// src/app/admin/gestao/views/DemandsDashboard.tsx
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  Layers, Filter, CheckSquare, Clock, AlertCircle, 
  UserCircle2, Loader2, Briefcase, Zap, Search,
  ChevronDown, BarChart3, Target, Activity, Trophy, PieChart
} from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";

// 🟢 UTILITÁRIO: Extração segura de nós do Supabase
function extractNode(node: any): any {
  if (!node) return null;
  return Array.isArray(node) ? node[0] : node;
}

// 🟢 WIDGET: Anéis Concêntricos (Estilo Apple Watch)
const ConcentricRings = ({ completed, review, pending, total, size = 100 }: { completed: number, review: number, pending: number, total: number, size?: number }) => {
  const getOffset = (val: number, r: number) => {
    const circumference = 2 * Math.PI * r;
    if (total === 0) return circumference;
    return circumference - (val / total) * circumference;
  };

  return (
    <div className="relative flex items-center justify-center filter drop-shadow-md" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Ring 1: Concluídas (Verde) */}
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(34,197,94,0.15)" strokeWidth="8" />
        <motion.circle cx="50" cy="50" r="42" fill="none" stroke="#22c55e" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 42} initial={{ strokeDashoffset: 2 * Math.PI * 42 }} animate={{ strokeDashoffset: getOffset(completed, 42) }} transition={{ duration: 1.5, ease: "easeOut" }} />
        
        {/* Ring 2: Em Revisão (Laranja) */}
        <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(249,115,22,0.15)" strokeWidth="8" />
        <motion.circle cx="50" cy="50" r="28" fill="none" stroke="#f97316" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 28} initial={{ strokeDashoffset: 2 * Math.PI * 28 }} animate={{ strokeDashoffset: getOffset(review, 28) }} transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }} />
        
        {/* Ring 3: Pendentes (Grafite/Azul) */}
        <circle cx="50" cy="50" r="14" fill="none" stroke="rgba(122,116,112,0.15)" strokeWidth="8" />
        <motion.circle cx="50" cy="50" r="14" fill="none" stroke="var(--color-atelier-grafite)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 14} initial={{ strokeDashoffset: 2 * Math.PI * 14 }} animate={{ strokeDashoffset: getOffset(pending, 14) }} transition={{ duration: 1.5, delay: 0.4, ease: "easeOut" }} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center bg-white/80 rounded-full backdrop-blur-sm shadow-inner" style={{ width: size * 0.35, height: size * 0.35 }}>
        <Activity size={size * 0.18} className="text-[var(--color-atelier-terracota)]" />
      </div>
    </div>
  );
};

interface DemandsDashboardProps {
  currentUser: any;
}

export default function DemandsDashboard({ currentUser }: DemandsDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  // 🟢 ESTADO DA CHAVINHA DE ALTERNÂNCIA (SUB-TABS)
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'log'>('overview');

  // Dados Brutos
  const [tasks, setTasks] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]); 

  // Filtros Inteligentes (Agora apenas no Log)
  const [filterCollab, setFilterCollab] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetchDemandData();
  }, []);

  const fetchDemandData = async () => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      const { data: teamData } = await supabase.from('profiles').select('id, nome, avatar_url').in('role', ['colaborador', 'gestor', 'admin']);
      if (teamData) setTeam(teamData);

      const [resProjects, resAgencies, resSubs] = await Promise.all([
        supabase.from('projects').select('id, profiles(nome)').eq('status', 'active'),
        supabase.from('agencies').select('id, name').eq('status', 'active'),
        supabase.from('agency_subclients').select('id, name, agency_id')
      ]);

      const unifiedSources: any[] = [];
      if (resProjects.data) {
        resProjects.data.forEach(p => {
          const profile = extractNode(p.profiles);
          unifiedSources.push({ id: p.id, type: 'project', name: profile?.nome || 'Projeto Desconhecido', label: 'Estúdio' });
        });
      }
      if (resAgencies.data) {
        resAgencies.data.forEach(a => unifiedSources.push({ id: a.id, type: 'agency', name: a.name, label: 'Agência WL' }));
      }
      if (resSubs.data) {
        resSubs.data.forEach(s => unifiedSources.push({ id: s.id, type: 'subclient', name: s.name, label: 'Subcliente WL' }));
      }
      
      setSources(unifiedSources.sort((a, b) => a.name.localeCompare(b.name)));

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .or(`created_at.gte.${monthStart},deadline.gte.${monthStart},completed_at.gte.${monthStart},status.in.(pending,review,needs_revision)`)
        .order('created_at', { ascending: false });

      if (tasksData) setTasks(tasksData);
    } catch (error) {
      console.error("Erro ao buscar dados de demanda:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtragem (Apenas usada na aba Log)
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCollab = filterCollab === "all" || task.assigned_to === filterCollab;
      const matchesStatus = filterStatus === "all" || 
        (filterStatus === "completed" && task.status === "completed") ||
        (filterStatus === "pending" && task.status === "pending") ||
        (filterStatus === "review" && (task.status === "review" || task.status === "needs_revision"));

      let matchesSource = filterSource === "all";
      if (filterSource !== "all") {
        const [sourceType, sourceId] = filterSource.split("::");
        if (sourceType === "project") matchesSource = task.project_id === sourceId;
        if (sourceType === "agency") matchesSource = task.agency_id === sourceId;
        if (sourceType === "subclient") matchesSource = task.subclient_id === sourceId;
      }

      return matchesSearch && matchesCollab && matchesStatus && matchesSource;
    });
  }, [tasks, searchQuery, filterCollab, filterSource, filterStatus]);

  // KPIs Globais (Sempre usam `tasks` brutas para a Visão Geral não ser afetada pelos filtros ocultos)
  const kpis = useMemo(() => {
    const totalMonth = tasks.length;
    const completedMonth = tasks.filter(t => t.status === 'completed').length;
    const reviewMonth = tasks.filter(t => t.status === 'review' || t.status === 'needs_revision').length;
    const pendingMonth = tasks.filter(t => t.status === 'pending').length;
    
    const completionsByCollab: Record<string, number> = {};
    tasks.forEach(t => {
      if (t.status === 'completed' && t.assigned_to) {
        completionsByCollab[t.assigned_to] = (completionsByCollab[t.assigned_to] || 0) + 1;
      }
    });

    const ranking = Object.entries(completionsByCollab)
      .map(([id, count]) => {
        const member = team.find(m => m.id === id);
        return { id, name: member?.nome || 'Desconhecido', avatar: member?.avatar_url, count };
      })
      .sort((a, b) => b.count - a.count);

    return { totalMonth, completedMonth, reviewMonth, pendingMonth, ranking };
  }, [tasks, team]);

  // Motor: Top Demandantes Globais
  const topSources = useMemo(() => {
    if (sources.length === 0 || tasks.length === 0) return { list: [], maxHours: 1 };
    
    const sourceMap: Record<string, { count: number, hours: number, name: string, type: string, label: string }> = {};
    let localMaxHours = 1;

    tasks.forEach(t => {
      let sId = null;
      let sType = "";
      if (t.subclient_id) { sId = t.subclient_id; sType = "subclient"; }
      else if (t.agency_id) { sId = t.agency_id; sType = "agency"; }
      else if (t.project_id) { sId = t.project_id; sType = "project"; }

      if (sId) {
        const key = `${sType}::${sId}`;
        if (!sourceMap[key]) {
          const sourceDef = sources.find(s => s.id === sId && s.type === sType);
          sourceMap[key] = {
            count: 0,
            hours: 0,
            name: sourceDef?.name || "Desconhecido",
            type: sType,
            label: sourceDef?.label || "Indefinido"
          };
        }
        sourceMap[key].count += 1;
        sourceMap[key].hours += (t.estimated_time || 60) / 60; 
        if (sourceMap[key].hours > localMaxHours) localMaxHours = sourceMap[key].hours;
      }
    });

    const list = Object.values(sourceMap).sort((a, b) => b.count - a.count).slice(0, 5); // Aumentado para Top 5
    return { list, maxHours: localMaxHours };
  }, [tasks, sources]);

  // 🟢 NOVO MOTOR: Distribuição de Carga de Trabalho (Studio vs WL)
  const workloadDistribution = useMemo(() => {
    let studioTasks = 0;
    let agencyWLTasks = 0;
    let subclientWLTasks = 0;

    tasks.forEach(t => {
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
      total
    };
  }, [tasks]);

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* 🟢 CABEÇALHO GLOBAL E CHAVINHA DE ALTERNÂNCIA */}
      <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center border border-[var(--color-atelier-terracota)]/20 shadow-inner">
               <Layers size={14} className="text-[var(--color-atelier-terracota)]" />
            </div>
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60">Análise de Demanda Mensal</span>
          </div>
          <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none tracking-tight">Ecosistema de Tarefas</h2>
        </div>

        {/* Segmented Control (Chavinha) */}
        <div className="bg-white/40 p-1.5 rounded-[1rem] border border-white shadow-sm flex items-center shrink-0 w-full md:w-auto overflow-hidden">
          <button 
            onClick={() => setActiveSubTab('overview')} 
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest transition-all ${activeSubTab === 'overview' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/60'}`}
          >
            Visão Geral
          </button>
          <button 
            onClick={() => setActiveSubTab('log')} 
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest transition-all ${activeSubTab === 'log' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/60'}`}
          >
            Registro Operacional
          </button>
        </div>
      </div>

      {/* 🟢 RENDERIZAÇÃO CONDICIONAL DAS SUB-TELAS */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          
          {/* ======================================================================
              TELA 1: VISÃO GERAL (DASHBOARDS ESTATICOS DO MÊS)
              ====================================================================== */}
          {activeSubTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex flex-col lg:flex-row gap-6"
            >
              {/* COLUNA ESQUERDA: WIDGETS DE OPERAÇÃO */}
              <div className="flex-1 flex flex-col gap-6 min-w-0">
                
                {/* WIDGET 1: COMPACT RINGS & KPIS */}
                <div className="glass-panel bg-white/60 p-5 rounded-[2rem] border border-white shadow-sm flex flex-col md:flex-row items-center gap-6 shrink-0 relative overflow-hidden group">
                  <div className="absolute right-[-10%] top-[-50%] w-64 h-64 bg-[var(--color-atelier-terracota)]/5 rounded-full blur-3xl pointer-events-none transition-colors group-hover:bg-[var(--color-atelier-terracota)]/10"></div>
                  
                  <div className="shrink-0 scale-90 md:scale-100">
                    <ConcentricRings completed={kpis.completedMonth} review={kpis.reviewMonth} pending={kpis.pendingMonth} total={kpis.totalMonth} size={110} />
                  </div>
                  
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full z-10 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5"><BarChart3 size={12}/> Total</span>
                      <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none">{kpis.totalMonth}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-green-500 mb-1 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Prontas</span>
                      <span className="font-bold text-[22px] text-[var(--color-atelier-grafite)] leading-none">{kpis.completedMonth}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-1 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Revisão</span>
                      <span className="font-bold text-[22px] text-[var(--color-atelier-grafite)] leading-none">{kpis.reviewMonth}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[var(--color-atelier-grafite)]"></div> Fila</span>
                      <span className="font-bold text-[22px] text-[var(--color-atelier-grafite)] leading-none">{kpis.pendingMonth}</span>
                    </div>
                  </div>
                </div>

                {/* ROW 2: TOP SOURCES E DISTRIBUIÇÃO */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                  
                  {/* WIDGET 2: Maiores Demandantes (Expandido em Altura) */}
                  <div className="glass-panel bg-white/60 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col h-full overflow-hidden">
                    <div className="flex justify-between items-center mb-5 shrink-0 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                      <span className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 flex items-center gap-2"><Briefcase size={16} className="text-[var(--color-atelier-terracota)]"/> Top Demandantes</span>
                      <span className="text-[9px] uppercase font-bold text-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/10 px-2.5 py-1 rounded-lg border border-[var(--color-atelier-terracota)]/20 shadow-sm">Mês Atual</span>
                    </div>
                    
                    <div className="flex flex-col gap-3.5 overflow-y-auto custom-scrollbar flex-1 pr-2">
                      {topSources.list.length === 0 ? (
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center h-full opacity-50">Sem volume suficiente</div>
                      ) : (
                        topSources.list.map((src, i) => (
                          <div key={i} className="flex flex-col bg-white/80 p-4 rounded-[1.2rem] border border-gray-100 shadow-sm hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex flex-col overflow-hidden pr-2">
                                <span className="text-[13px] font-bold text-[var(--color-atelier-grafite)] truncate">{src.name}</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">{src.label}</span>
                              </div>
                              <div className="flex flex-col items-end shrink-0 pl-3 border-l border-gray-100">
                                <span className="text-[16px] font-bold text-[var(--color-atelier-terracota)] leading-none">{src.count}</span>
                                <span className="text-[8px] uppercase tracking-widest text-gray-400 mt-1">Reqs</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${(src.hours / topSources.maxHours) * 100}%` }} transition={{ duration: 1 }} className="h-full bg-[var(--color-atelier-grafite)] rounded-full"></motion.div>
                              </div>
                              <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)]/70 shrink-0">~{src.hours.toFixed(1)}h</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* WIDGET 3 (NOVO): Distribuição de Carga */}
                  <div className="glass-panel bg-white/60 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col h-full overflow-hidden">
                    <div className="flex justify-between items-center mb-5 shrink-0 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                      <span className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 flex items-center gap-2"><PieChart size={16} className="text-indigo-500"/> Distribuição de Carga</span>
                    </div>

                    <div className="flex-1 flex flex-col justify-center gap-6">
                      <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${workloadDistribution.studio}%` }} className="bg-[var(--color-atelier-terracota)] h-full"></motion.div>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${workloadDistribution.agencyWL}%` }} className="bg-blue-500 h-full border-l border-white/20"></motion.div>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${workloadDistribution.subclientWL}%` }} className="bg-indigo-400 h-full border-l border-white/20"></motion.div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-[var(--color-atelier-terracota)] shadow-sm"></div>
                            <span className="font-bold text-[12px] text-[var(--color-atelier-grafite)]">Estúdio</span>
                          </div>
                          <span className="font-elegant text-xl">{workloadDistribution.studio.toFixed(1)}%</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div>
                            <span className="font-bold text-[12px] text-[var(--color-atelier-grafite)]">Agências (WL)</span>
                          </div>
                          <span className="font-elegant text-xl">{workloadDistribution.agencyWL.toFixed(1)}%</span>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-indigo-400 shadow-sm"></div>
                            <span className="font-bold text-[12px] text-[var(--color-atelier-grafite)]">Subclientes (WL)</span>
                          </div>
                          <span className="font-elegant text-xl">{workloadDistribution.subclientWL.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* COLUNA DIREITA: LEADERBOARD VERTICAL GIGANTE */}
              <div className="w-full lg:w-[350px] xl:w-[400px] shrink-0 h-full glass-panel bg-[var(--color-atelier-grafite)] text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden">
                <div className="absolute top-[-10%] left-[-20%] w-80 h-80 bg-[var(--color-atelier-terracota)]/10 blur-[80px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-20%] w-72 h-72 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none"></div>
                
                <div className="flex flex-col mb-8 shrink-0 relative z-10 border-b border-white/10 pb-6">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--color-atelier-terracota)]/20 flex items-center justify-center border border-[var(--color-atelier-terracota)]/30 shadow-inner mb-4">
                    <Trophy size={28} className="text-[var(--color-atelier-terracota)]"/>
                  </div>
                  <h3 className="font-elegant text-4xl text-white leading-tight">Painel de<br/>Rankeamento</h3>
                  <p className="font-roboto text-[11px] font-bold uppercase tracking-widest text-white/50 mt-3 flex items-center gap-2">
                    <Activity size={14}/> Escoamento Real Mensal
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-2 relative z-10">
                  <AnimatePresence>
                    {kpis.ranking.length === 0 ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center opacity-40 mt-12 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mb-4"><CheckSquare size={32}/></div>
                        <p className="font-elegant text-2xl">Vazio</p>
                        <span className="text-[10px] font-bold uppercase tracking-widest mt-2">Aguardando Entregas</span>
                      </motion.div>
                    ) : (
                      kpis.ranking.map((member, idx) => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          key={member.id} 
                          className="bg-white/5 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/10 flex items-center justify-between hover:bg-white/10 hover:border-white/30 transition-all group shadow-sm hover:shadow-xl"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0 shadow-inner ${idx === 0 ? 'bg-[var(--color-atelier-terracota)] text-white ring-4 ring-[var(--color-atelier-terracota)]/30 scale-110' : idx === 1 ? 'bg-gray-300 text-[var(--color-atelier-grafite)]' : idx === 2 ? 'bg-orange-300 text-[var(--color-atelier-grafite)]' : 'bg-white/10 text-white/50'}`}>
                              {idx + 1}º
                            </div>
                            <div className="w-12 h-12 rounded-[1rem] overflow-hidden border border-white/20 bg-gray-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                              {member.avatar ? <img src={member.avatar} className="w-full h-full object-cover"/> : <span className="font-elegant text-lg text-white">{member.name.charAt(0)}</span>}
                            </div>
                            <span className="font-bold text-[14px] truncate max-w-[120px]">{member.name.split(" ")[0]}</span>
                          </div>
                          <div className="flex flex-col items-end shrink-0 pl-4 border-l border-white/10">
                            <span className="font-elegant text-3xl text-[var(--color-atelier-terracota)] leading-none">{member.count}</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 mt-1.5">Concluídas</span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </motion.div>
          )}

          {/* ======================================================================
              TELA 2: REGISTRO OPERACIONAL (DATA GRID FOCADO)
              ====================================================================== */}
          {activeSubTab === 'log' && (
            <motion.div 
              key="log"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex flex-col gap-6"
            >
              {/* FILTROS DO REGISTRO */}
              <div className="shrink-0 glass-panel bg-white/40 p-4 rounded-[2rem] border border-white shadow-sm flex flex-col xl:flex-row items-center justify-between gap-4">
                
                {/* Search */}
                <div className="relative w-full xl:w-80 group">
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-xl rounded-2xl border border-white shadow-sm -z-10"></div>
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" placeholder="Filtrar registro por título..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent py-3.5 pl-12 pr-4 text-[13px] font-bold outline-none text-[var(--color-atelier-grafite)] placeholder-gray-400"
                  />
                </div>

                {/* Dropdowns */}
                <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto pb-1">
                  <div className="flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 shrink-0 border-r border-gray-200">
                    <Filter size={12} /> Refinar
                  </div>
                  <div className="relative shrink-0">
                    <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="appearance-none bg-white/90 backdrop-blur-md border border-white rounded-xl pl-4 pr-10 py-3 text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] outline-none shadow-sm cursor-pointer hover:bg-white transition-colors">
                      <option value="all">Todas as Origens</option>
                      {sources.map(s => <option key={`${s.type}::${s.id}`} value={`${s.type}::${s.id}`}>[{s.label}] {s.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative shrink-0">
                    <select value={filterCollab} onChange={e => setFilterCollab(e.target.value)} className="appearance-none bg-white/90 backdrop-blur-md border border-white rounded-xl pl-4 pr-10 py-3 text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] outline-none shadow-sm cursor-pointer hover:bg-white transition-colors">
                      <option value="all">Toda a Equipe</option>
                      {team.map(t => <option key={t.id} value={t.id}>{t.nome.split(" ")[0]}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* PILLS DE STATUS */}
              <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: 'all', label: 'Visão Geral', count: filteredTasks.length, icon: <Layers size={18}/>, color: 'text-gray-600', bg: 'bg-gray-100', borderColor: 'border-gray-300' },
                  { id: 'completed', label: 'Prontos', count: filteredTasks.filter(t=>t.status==='completed').length, icon: <CheckSquare size={18}/>, color: 'text-green-600', bg: 'bg-green-100', borderColor: 'border-green-400' },
                  { id: 'review', label: 'Em Revisão', count: filteredTasks.filter(t=>t.status==='review'||t.status==='needs_revision').length, icon: <AlertCircle size={18}/>, color: 'text-orange-600', bg: 'bg-orange-100', borderColor: 'border-orange-400' },
                  { id: 'pending', label: 'A Fazer (Fila)', count: filteredTasks.filter(t=>t.status==='pending').length, icon: <Clock size={18}/>, color: 'text-[var(--color-atelier-grafite)]', bg: 'bg-gray-200', borderColor: 'border-[var(--color-atelier-grafite)]' },
                ].map(status => (
                  <button 
                    key={status.id}
                    onClick={() => setFilterStatus(status.id)}
                    className={`relative overflow-hidden flex items-center justify-start gap-3 p-4 rounded-[1.2rem] transition-all duration-300 border ${filterStatus === status.id ? `bg-white ${status.borderColor} shadow-lg scale-[1.02] z-10` : `bg-white/40 border-transparent hover:bg-white/80 shadow-sm`}`}
                  >
                    {filterStatus === status.id && <motion.div layoutId="status-pill-bg" className="absolute inset-0 bg-gradient-to-r from-white to-gray-50/50 -z-10"></motion.div>}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-inner ${filterStatus === status.id ? status.bg + ' ' + status.color : 'bg-gray-50 text-gray-400'}`}>
                      {status.icon}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className={`text-[13px] font-bold uppercase tracking-wider leading-none ${filterStatus === status.id ? status.color : 'text-gray-500'}`}>{status.label}</span>
                      <span className="text-[10px] font-bold text-gray-400 mt-1">{status.count} Registros</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* LISTA EXPANDIDA */}
              <div className="flex-1 glass-panel bg-white/50 rounded-[2.5rem] border border-white shadow-sm flex flex-col overflow-hidden min-h-0">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-3.5">
                  <AnimatePresence mode="popLayout">
                    {filteredTasks.length === 0 ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-center opacity-40">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 border border-gray-200"><Filter size={32} className="text-gray-400" /></div>
                        <p className="font-elegant text-3xl">Log Vazio</p>
                        <p className="text-[12px] font-bold uppercase tracking-widest mt-2 text-gray-400">Modifique a sintonia dos filtros para encontrar resultados.</p>
                      </motion.div>
                    ) : (
                      filteredTasks.map((task, idx) => {
                        const executor = team.find(t => t.id === task.assigned_to);
                        
                        let sourceTag = "Interno";
                        let sourceColor = "from-gray-100 to-gray-50 border-gray-200 text-gray-600";
                        let sourceName = "Sem Projeto";

                        if (task.subclient_id) {
                          const sub = sources.find(s => s.id === task.subclient_id);
                          sourceTag = "White-Label";
                          sourceColor = "from-indigo-50 to-white border-indigo-100 text-indigo-600";
                          sourceName = sub?.name || "Subcliente";
                        } else if (task.agency_id) {
                          const ag = sources.find(s => s.id === task.agency_id);
                          sourceTag = "Agência WL";
                          sourceColor = "from-blue-50 to-white border-blue-100 text-blue-600";
                          sourceName = ag?.name || "Agência";
                        } else if (task.project_id) {
                          const proj = sources.find(s => s.id === task.project_id);
                          sourceTag = "Estúdio";
                          sourceColor = "from-[var(--color-atelier-terracota)]/10 to-white border-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-terracota)]";
                          sourceName = proj?.name || "Projeto Próprio";
                        }

                        return (
                          <motion.div 
                            key={task.id}
                            layout
                            initial={{ opacity: 0, scale: 0.98, y: 10 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white/90 hover:bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all"
                          >
                            <div className="flex flex-col flex-1 overflow-hidden">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-md border bg-gradient-to-br ${sourceColor} shadow-inner shrink-0`}>
                                  {sourceTag}
                                </span>
                                <span className="text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 truncate max-w-[300px]">{sourceName}</span>
                              </div>
                              <span className={`font-bold text-[16px] leading-tight ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-[var(--color-atelier-grafite)]'}`}>
                                {task.title}
                              </span>
                            </div>

                            <div className="flex items-center justify-end gap-6 shrink-0 sm:border-l sm:border-gray-100 sm:pl-6">
                              <div className="flex flex-col text-right">
                                <span className={`text-[12px] font-bold uppercase tracking-widest flex items-center justify-end gap-1.5 ${task.status === 'completed' ? 'text-green-500' : task.status === 'review' || task.status === 'needs_revision' ? 'text-orange-500' : 'text-[var(--color-atelier-grafite)]'}`}>
                                  {task.status === 'completed' && <CheckSquare size={16}/>}
                                  {task.status === 'completed' ? 'Concluída' : task.status === 'review' || task.status === 'needs_revision' ? 'Revisão' : 'Pendente'}
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-1">Status Atual</span>
                              </div>

                              <div className="relative group/avatar cursor-pointer">
                                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white bg-gray-50 flex items-center justify-center shadow-md group-hover:border-[var(--color-atelier-terracota)]/50 transition-colors">
                                  {executor?.avatar_url ? <img src={executor.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 size={18} className="text-gray-400"/>}
                                </div>
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[var(--color-atelier-grafite)] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                                  {executor?.nome || 'Não Atribuído'}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}