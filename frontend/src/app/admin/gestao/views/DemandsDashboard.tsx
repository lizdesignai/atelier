// src/app/admin/gestao/views/DemandsDashboard.tsx
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  Layers, Filter, CheckSquare, Clock, AlertCircle, 
  UserCircle2, Loader2, Briefcase, Zap, Search, ChevronRight
} from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";

// 🟢 UTILITÁRIO: Extração segura de nós do Supabase
function extractNode(node: any): any {
  if (!node) return null;
  return Array.isArray(node) ? node[0] : node;
}

interface DemandsDashboardProps {
  currentUser: any;
}

export default function DemandsDashboard({ currentUser }: DemandsDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Dados Brutos
  const [tasks, setTasks] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]); // Lista unificada de Projetos, Agências e Subclientes

  // Filtros Inteligentes
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

      // 1. Busca Equipe
      const { data: teamData } = await supabase.from('profiles').select('id, nome, avatar_url').in('role', ['colaborador', 'gestor', 'admin']);
      if (teamData) setTeam(teamData);

      // 2. Busca Fontes (Projetos, Agências, Subclientes)
      const [resProjects, resAgencies, resSubs] = await Promise.all([
        supabase.from('projects').select('id, profiles(nome)').eq('status', 'active'),
        supabase.from('agencies').select('id, name').eq('status', 'active'),
        supabase.from('agency_subclients').select('id, name, agency_id')
      ]);

      const unifiedSources = [];
      if (resProjects.data) {
        resProjects.data.forEach(p => {
          const profile = extractNode(p.profiles);
          unifiedSources.push({ id: p.id, type: 'project', name: profile?.nome || 'Projeto Desconhecido', label: 'Estúdio' });
        });
      }
      if (resAgencies.data) {
        resAgencies.data.forEach(a => unifiedSources.push({ id: a.id, type: 'agency', name: a.name, label: 'Agência (White-Label)' }));
      }
      if (resSubs.data) {
        resSubs.data.forEach(s => unifiedSources.push({ id: s.id, type: 'subclient', name: s.name, label: 'Subcliente (White-Label)' }));
      }
      
      setSources(unifiedSources.sort((a, b) => a.name.localeCompare(b.name)));

      // 3. Busca Tarefas do Mês
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd)
        .order('created_at', { ascending: false });

      if (tasksData) setTasks(tasksData);

    } catch (error) {
      console.error("Erro ao buscar dados de demanda:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================================
  // MOTOR DE FILTRAGEM REATIVA
  // ==========================================================================
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filtro de Texto
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filtro de Colaborador
      const matchesCollab = filterCollab === "all" || task.assigned_to === filterCollab;
      
      // Filtro de Status
      const matchesStatus = filterStatus === "all" || 
        (filterStatus === "completed" && task.status === "completed") ||
        (filterStatus === "pending" && task.status === "pending") ||
        (filterStatus === "review" && task.status === "review");

      // Filtro de Origem (Source)
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

  // ==========================================================================
  // KPI COMPUTATIONS
  // ==========================================================================
  const kpis = useMemo(() => {
    const totalMonth = tasks.length;
    const completedMonth = tasks.filter(t => t.status === 'completed').length;
    const reviewMonth = tasks.filter(t => t.status === 'review' || t.status === 'needs_revision').length;
    
    // Calcula o Colaborador com mais entregas (Ranking)
    const completionsByCollab: Record<string, number> = {};
    filteredTasks.forEach(t => {
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

    return { totalMonth, completedMonth, reviewMonth, ranking };
  }, [tasks, filteredTasks, team]);

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full gap-6 overflow-hidden">
      
      {/* HEADER E FILTROS */}
      <div className="shrink-0 flex flex-col gap-4">
        <header className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers size={14} className="text-[var(--color-atelier-terracota)]" />
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60">Controle de Fluxo Operacional</span>
            </div>
            <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">Demandas & Dados</h2>
          </div>

          {/* BUSCA DE TEXTO RÁPIDA */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Buscar tarefa..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/60 border border-white rounded-xl py-2 pl-9 pr-4 text-[11px] font-bold outline-none focus:border-[var(--color-atelier-terracota)] transition-all w-64 shadow-sm"
            />
          </div>
        </header>

        {/* BARRA DE FILTROS INTELIGENTES */}
        <div className="flex items-center gap-3 bg-white/40 p-2 rounded-2xl border border-white shadow-sm overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 shrink-0 border-r border-gray-200">
            <Filter size={12} /> Filtros
          </div>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-[11px] font-bold text-[var(--color-atelier-grafite)] outline-none shadow-sm cursor-pointer shrink-0">
            <option value="all">Todos os Status</option>
            <option value="pending">A Fazer (Pending)</option>
            <option value="review">Em Revisão (Review)</option>
            <option value="completed">Concluídas (Done)</option>
          </select>

          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-[11px] font-bold text-[var(--color-atelier-grafite)] outline-none shadow-sm cursor-pointer shrink-0">
            <option value="all">Todas as Origens (Estúdio + White-Label)</option>
            {sources.map(s => (
              <option key={`${s.type}::${s.id}`} value={`${s.type}::${s.id}`}>
                [{s.label}] {s.name}
              </option>
            ))}
          </select>

          <select value={filterCollab} onChange={e => setFilterCollab(e.target.value)} className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-[11px] font-bold text-[var(--color-atelier-grafite)] outline-none shadow-sm cursor-pointer shrink-0">
            <option value="all">Toda a Equipe</option>
            {team.map(t => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* MÉTRICAS GERAIS (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="glass-panel bg-white/70 p-5 rounded-[1.5rem] border border-white shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-gray-400">Total Criado (Mês)</span>
            <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mt-1">{kpis.totalMonth}</span>
          </div>
          <div className="w-12 h-12 rounded-[1rem] bg-gray-50 text-[var(--color-atelier-grafite)]/50 flex items-center justify-center border border-gray-100"><Layers size={20} /></div>
        </div>
        <div className="glass-panel bg-white/70 p-5 rounded-[1.5rem] border border-white shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-gray-400">Escoamento (Concluídas)</span>
            <span className="font-elegant text-3xl text-green-600 mt-1">{kpis.completedMonth}</span>
          </div>
          <div className="w-12 h-12 rounded-[1rem] bg-green-50 text-green-600 flex items-center justify-center border border-green-100"><CheckSquare size={20} /></div>
        </div>
        <div className="glass-panel bg-white/70 p-5 rounded-[1.5rem] border border-white shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-gray-400">Gargalo (Em Revisão)</span>
            <span className="font-elegant text-3xl text-orange-500 mt-1">{kpis.reviewMonth}</span>
          </div>
          <div className="w-12 h-12 rounded-[1rem] bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100"><AlertCircle size={20} /></div>
        </div>
      </div>

      {/* CORPO PRINCIPAL (Split View) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* LISTA DE TAREFAS FILTRADAS (Esq) */}
        <div className="lg:col-span-8 glass-panel bg-white/60 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center mb-5 shrink-0 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Demandas Registradas</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
              {filteredTasks.length} Resultados
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
            <AnimatePresence>
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                  <Filter size={40} className="mb-3 text-[var(--color-atelier-grafite)]" />
                  <p className="font-elegant text-2xl">Nenhum resultado</p>
                  <p className="text-[10px] uppercase font-bold tracking-widest mt-1">Ajuste os filtros acima.</p>
                </div>
              ) : (
                filteredTasks.map((task, idx) => {
                  const executor = team.find(t => t.id === task.assigned_to);
                  
                  // Identificação de Origem Inteligente
                  let sourceTag = "Interno";
                  let sourceColor = "bg-gray-100 text-gray-500";
                  let sourceName = "Sem Projeto";

                  if (task.subclient_id) {
                    const sub = sources.find(s => s.id === task.subclient_id);
                    sourceTag = "White-Label";
                    sourceColor = "bg-indigo-50 border-indigo-100 text-indigo-600";
                    sourceName = sub?.name || "Subcliente";
                  } else if (task.agency_id) {
                    const ag = sources.find(s => s.id === task.agency_id);
                    sourceTag = "Agência WL";
                    sourceColor = "bg-blue-50 border-blue-100 text-blue-600";
                    sourceName = ag?.name || "Agência";
                  } else if (task.project_id) {
                    const proj = sources.find(s => s.id === task.project_id);
                    sourceTag = "Estúdio";
                    sourceColor = "bg-[var(--color-atelier-terracota)]/10 border-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-terracota)]";
                    sourceName = proj?.name || "Projeto Próprio";
                  }

                  return (
                    <motion.div 
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-[var(--color-atelier-terracota)]/30 transition-colors"
                    >
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${sourceColor}`}>
                            {sourceTag}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 truncate max-w-[200px]">{sourceName}</span>
                        </div>
                        <span className={`font-bold text-[14px] ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-[var(--color-atelier-grafite)]'}`}>
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 sm:border-l sm:border-gray-100 sm:pl-4">
                        <div className="flex flex-col text-right">
                          <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Status</span>
                          <span className={`text-[11px] font-bold mt-0.5 ${task.status === 'completed' ? 'text-green-500' : task.status === 'review' ? 'text-orange-500' : 'text-[var(--color-atelier-grafite)]'}`}>
                            {task.status === 'completed' ? 'Concluída' : task.status === 'review' ? 'Em Revisão' : 'Pendente'}
                          </span>
                        </div>

                        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center shadow-inner" title={`Executor: ${executor?.nome || 'Nenhum'}`}>
                          {executor?.avatar_url ? <img src={executor.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 size={16} className="text-gray-400"/>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RANKING DE COLABORADORES (Dir) */}
        <div className="lg:col-span-4 glass-panel bg-[var(--color-atelier-grafite)] text-white p-6 rounded-[2rem] shadow-xl flex flex-col h-full overflow-hidden relative">
          <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-[var(--color-atelier-terracota)]/20 blur-[60px] rounded-full pointer-events-none"></div>
          
          <div className="flex justify-between items-center mb-6 shrink-0 relative z-10 border-b border-white/10 pb-4">
            <div>
              <h3 className="font-elegant text-2xl flex items-center gap-2"><Zap size={20} className="text-[var(--color-atelier-terracota)]"/> Força Produtiva</h3>
              <p className="font-roboto text-[9px] font-bold uppercase tracking-widest text-white/50 mt-1">Conclusões por Colaborador (Filtro Atual)</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2 relative z-10">
            {kpis.ranking.length === 0 ? (
              <div className="text-center opacity-40 mt-10 text-[11px] font-bold uppercase tracking-widest">Nenhuma tarefa concluída neste filtro.</div>
            ) : (
              kpis.ranking.map((member, idx) => (
                <div key={member.id} className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white text-[var(--color-atelier-grafite)] flex items-center justify-center font-bold text-[10px] shrink-0">
                      {idx + 1}º
                    </div>
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20 bg-gray-800 flex items-center justify-center shrink-0">
                      {member.avatar ? <img src={member.avatar} className="w-full h-full object-cover"/> : <span className="font-elegant text-sm text-white">{member.name.charAt(0)}</span>}
                    </div>
                    <span className="font-bold text-[13px] truncate pr-2">{member.name}</span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="font-elegant text-2xl text-[var(--color-atelier-terracota)] leading-none">{member.count}</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-white/40 mt-0.5">Entregas</span>
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