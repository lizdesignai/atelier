// src/app/admin/analytics/views/OverviewDashboard.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FolderKanban, Target, Users, Search, 
  CheckSquare, Square, Flame, UserCircle2, 
  Edit3, Check, Activity, AlertTriangle,
  Bell, X, Cpu, Play, PanelRightClose, PanelRightOpen
} from "lucide-react";

interface OverviewDashboardProps {
  metrics: { activeProjects: number; pendingTasks: number; totalTeam: number };
  activeTasksForQueue: any[];
  validProjects: any[];
  tasks: any[];
  team: any[];
  isBulkMode: boolean;
  selectedTaskIds: string[];
  toggleTaskSelection: (id: string) => void;
  setEditingTask: (task: any) => void;
  handleCompleteTask: (taskId: string) => void;
  setSelectedProjectId: (id: string) => void;
  setActiveView: (view: 'overview' | 'projects' | 'routing') => void;
  setSelectedCollab: (member: any) => void;
  isIdvService: (project: any) => boolean;
  isQueueMinimized?: boolean;
  setIsQueueMinimized?: (val: boolean) => void;
  mobileWidgetView?: 'tarefas' | 'carteira' | 'cliente';
}

export default function OverviewDashboard({
  metrics,
  activeTasksForQueue,
  validProjects,
  tasks,
  team,
  isBulkMode,
  selectedTaskIds,
  toggleTaskSelection,
  setEditingTask,
  handleCompleteTask,
  setSelectedProjectId,
  setActiveView,
  setSelectedCollab,
  isIdvService,
  isQueueMinimized,
  setIsQueueMinimized,
  mobileWidgetView = 'tarefas',
}: OverviewDashboardProps) {
  
  // Estados locais
  const [taskSearch, setTaskSearch] = useState("");
  const [taskFilterCollab, setTaskFilterCollab] = useState<string>('all');
  const [taskFilterClient, setTaskFilterClient] = useState<string>('all');
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [activeQueueIndex, setActiveQueueIndex] = useState(0);

  const handleQueueScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollLeft = target.scrollLeft;
    const cardWidth = target.firstElementChild ? (target.firstElementChild as HTMLElement).offsetWidth + 12 : 280;
    const index = Math.round(scrollLeft / cardWidth);
    if (!isNaN(index) && index >= 0) {
      setActiveQueueIndex(index);
    }
  };
  
  // Clientes com tarefas ativas (Extraídos diretamente das tarefas para contemplar Agências e Studio)
  const clientsWithTasks = Array.from(
    new Map(
      activeTasksForQueue
        .filter(t => t.project_id || t.projects?.id)
        .map(t => [
          t.project_id || t.projects?.id, 
          t.projects?.profiles?.nome || "White-Label"
        ])
    ).entries()
  ).map(([id, name]) => ({ id, name }));
  
  return (
    <>
      {/* ==================================================== */}
      {/* DESKTOP VIEW */}
      {/* ==================================================== */}
      <motion.div key="overview-desktop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`hidden lg:flex flex-col gap-6 h-full min-h-0 relative shrink-0 transition-all ${isQueueMinimized ? 'w-16' : 'w-[350px]'}`}>
          
          {isQueueMinimized ? (
             <div 
               onClick={() => setIsQueueMinimized?.(false)} 
               className="w-full h-full bg-white/60 backdrop-blur-xl border border-white rounded-[2.5rem] p-3 flex flex-col items-center cursor-pointer shadow-sm hover:shadow-md transition-all group" 
               title="Expandir Fila"
             >
                <button className="text-gray-400 hover:text-[var(--color-atelier-terracota)] transition-colors"><PanelRightOpen size={20} /></button>
                <div className="flex flex-col items-center gap-1 opacity-50 font-bold uppercase text-[10px] tracking-widest mt-4" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                   Fila de Produção
                </div>
                <div className="w-8 h-8 rounded-full bg-[var(--color-atelier-terracota)] text-white flex items-center justify-center text-[10px] font-bold shadow-sm mt-auto mb-4">{activeTasksForQueue.length}</div>
             </div>
          ) : (
          <div className="w-full glass-panel p-6 flex flex-col h-full min-h-0 relative overflow-hidden">
            {/* COLUNA 1: FILA GERAL COM BUSCA INTELIGENTE */}
            <button 
              onClick={() => setIsQueueMinimized?.(true)} 
              className="absolute top-6 right-6 text-gray-400 hover:text-[var(--color-atelier-terracota)] transition-colors z-10 bg-white p-1.5 rounded-md shadow-sm border border-gray-100"
              title="Recolher Fila"
            >
              <PanelRightClose size={14} />
            </button>
            <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-4 shrink-0 flex flex-col gap-3 pr-8">
              <div className="flex justify-between items-center mb-1">
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Próximas Tarefas</h3>
                  <span className="text-[var(--color-atelier-grafite)]/50 text-[11px] font-bold uppercase tracking-widest font-roboto">{activeTasksForQueue.length} tarefas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative group flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors" />
                    <input 
                       type="text" 
                       placeholder="Filtrar tarefa..." 
                       value={taskSearch} 
                       onChange={(e)=>setTaskSearch(e.target.value)} 
                       className="w-full bg-white/60 border border-white/50 rounded-xl py-2 pl-9 pr-4 text-[11px] outline-none focus:border-[var(--color-atelier-terracota)]/30 focus:bg-white shadow-sm transition-all text-[var(--color-atelier-grafite)] font-bold" 
                    />
                </div>
                
                {/* Filtro Colaborador */}
                <div className="relative group/collab">
                   <button className="w-8 h-8 rounded-xl bg-white/60 border border-white/50 flex items-center justify-center text-gray-500 hover:text-[var(--color-atelier-terracota)] transition-colors shadow-sm">
                     <UserCircle2 size={16} />
                   </button>
                   <div className="absolute top-full right-0 mt-1 bg-white border border-gray-100 shadow-xl rounded-xl p-1.5 flex flex-col gap-1 w-56 opacity-0 pointer-events-none group-hover/collab:opacity-100 group-hover/collab:pointer-events-auto transition-all z-50 max-h-48 overflow-y-auto custom-scrollbar">
                      <button onClick={() => setTaskFilterCollab('all')} className={`text-left text-xs px-3 py-1.5 rounded-lg transition-colors ${taskFilterCollab === 'all' ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-bold' : 'hover:bg-gray-50 text-gray-600'}`}>Todos Colaboradores</button>
                      {team.map(member => (
                        <button key={member.id} onClick={() => setTaskFilterCollab(member.id)} className={`text-left text-xs px-3 py-1.5 rounded-lg transition-colors truncate ${taskFilterCollab === member.id ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-bold' : 'hover:bg-gray-50 text-gray-600'}`}>{member.name || member.nome}</button>
                      ))}
                   </div>
                </div>

                {/* Filtro Cliente */}
                <div className="relative group/client">
                   <button className="w-8 h-8 rounded-xl bg-white/60 border border-white/50 flex items-center justify-center text-gray-500 hover:text-[var(--color-atelier-terracota)] transition-colors shadow-sm">
                     <FolderKanban size={16} />
                   </button>
                   <div className="absolute top-full right-0 mt-1 bg-white border border-gray-100 shadow-xl rounded-xl p-1.5 flex flex-col gap-1 w-56 opacity-0 pointer-events-none group-hover/client:opacity-100 group-hover/client:pointer-events-auto transition-all z-50 max-h-48 overflow-y-auto custom-scrollbar">
                      <button onClick={() => setTaskFilterClient('all')} className={`text-left text-xs px-3 py-1.5 rounded-lg transition-colors ${taskFilterClient === 'all' ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-bold' : 'hover:bg-gray-50 text-gray-600'}`}>Todos Clientes</button>
                      {clientsWithTasks.map(client => (
                        <button key={client.id as string} onClick={() => setTaskFilterClient(client.id as string)} className={`text-left text-xs px-3 py-1.5 rounded-lg transition-colors truncate ${taskFilterClient === client.id ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-bold' : 'hover:bg-gray-50 text-gray-600'}`}>{client.name}</button>
                      ))}
                   </div>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
              {activeTasksForQueue
                .filter(t => t.title.toLowerCase().includes(taskSearch.toLowerCase()) || t.projects?.profiles?.nome?.toLowerCase().includes(taskSearch.toLowerCase()))
                .filter(t => taskFilterCollab === 'all' || t.assigned_to === taskFilterCollab)
                .filter(t => taskFilterClient === 'all' || t.project_id === taskFilterClient || t.projects?.id === taskFilterClient)
                .map(task => {
                  const isDelayed = task.status !== 'completed' && new Date(task.deadline) < new Date();
                  const isSelected = selectedTaskIds.includes(task.id);
                  
                  return (
                    <div 
                      key={task.id} 
                      onClick={() => isBulkMode ? toggleTaskSelection(task.id) : null}
                      className={`p-5 rounded-[2rem] border flex flex-col group transition-all duration-300 shadow-sm ${isBulkMode ? 'cursor-pointer hover:scale-[1.02]' : ''} ${isSelected ? 'bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)] shadow-md' : 'bg-white border-[var(--color-atelier-grafite)]/5 hover:border-[var(--color-atelier-terracota)]/30 hover:shadow-md'}`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        
                        {isBulkMode && (
                          <div className="shrink-0 text-[var(--color-atelier-terracota)]">
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-300"/>}
                          </div>
                        )}

                        <div className="w-12 h-12 rounded-[1.2rem] overflow-hidden border border-gray-100 shrink-0 bg-gray-50 flex items-center justify-center shadow-inner">
                          {task.projects?.profiles?.avatar_url ? <img src={task.projects.profiles.avatar_url} className="w-full h-full object-cover" /> : <span className="font-elegant text-xl text-[var(--color-atelier-terracota)]">{task.projects?.profiles?.nome?.charAt(0) || "W"}</span>}
                        </div>
                        <div className="flex flex-col cursor-pointer flex-1 justify-center" onClick={(e) => { if (isBulkMode) return; setEditingTask(task); }}>
                          <div className="flex justify-between items-start">
                            <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors leading-tight pr-2">{task.title}</span>
                            {task.urgency && <Flame size={12} className="text-orange-500 shrink-0 mt-0.5"/>}
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mt-1 truncate">
                            {task.projects?.profiles?.nome || "White-Label"} • {new Date(task.deadline).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-atelier-grafite)]/5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden border border-white shadow-sm bg-gray-100 flex items-center justify-center shrink-0">
                            {task.profiles?.avatar_url ? <img src={task.profiles.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 size={12} className="text-gray-300"/>}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] uppercase font-bold text-[var(--color-atelier-grafite)]/30">Executor</span>
                            <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)]/80 leading-none">{task.profiles?.nome?.split(" ")[0] || "Livre"}</span>
                          </div>
                        </div>
                        
                        {!isBulkMode && (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"> 
                            <button onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }} className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all shadow-sm border border-green-200" title="Finalizar Tarefa">
                              <Check size={14} strokeWidth={3} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
          )}
      </motion.div>

      {/* ==================================================== */}
      {/* MOBILE VIEW (COMPACT UI) */}
      {/* ==================================================== */}
      <motion.div key="overview-mobile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex lg:hidden flex-col gap-4 w-full">
        {/* Dynamic Header */}
        <div className="flex items-center justify-between w-full h-10">
           {isMobileSearchActive ? (
             <div className="flex items-center w-full gap-2 animate-[fadeIn_0.2s_ease-out]">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-atelier-terracota)]" />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Buscar tarefa..." 
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    className="w-full bg-white border border-[var(--color-atelier-terracota)]/30 rounded-full py-2 pl-9 pr-4 text-[12px] outline-none shadow-sm text-[var(--color-atelier-grafite)] font-bold"
                  />
                </div>
                <button onClick={() => { setIsMobileSearchActive(false); setTaskSearch(""); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <X size={14} className="text-gray-500" />
                </button>
             </div>
           ) : (
             <div className="flex items-center justify-between w-full animate-[fadeIn_0.2s_ease-out]">
               <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] flex items-baseline gap-2">
                 Fila. <span className="font-roboto font-normal text-xs text-[var(--color-atelier-grafite)]/50 tracking-wider">({activeTasksForQueue.length} tarefas)</span>
               </h2>
               <div className="flex items-center gap-2">
                 <button onClick={() => setIsMobileSearchActive(true)} className="w-9 h-9 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)]">
                   <Search size={16} />
                 </button>
                 
                 {/* Filtros Simplificados */}
                 <button onClick={() => setTaskFilterClient(taskFilterClient === 'all' ? clientsWithTasks[0]?.id || 'all' : 'all')} className={`w-9 h-9 rounded-full shadow-sm border flex items-center justify-center ${taskFilterClient !== 'all' ? 'bg-[var(--color-atelier-terracota)] text-white border-[var(--color-atelier-terracota)]' : 'bg-white border-gray-100 text-[var(--color-atelier-grafite)]/60'}`}>
                   <FolderKanban size={16} />
                 </button>
               </div>
             </div>
           )}
        </div>

        {/* Compact Carousel */}
        {(() => {
            const filteredQueue = activeTasksForQueue
              .filter(t => t.title.toLowerCase().includes(taskSearch.toLowerCase()) || t.projects?.profiles?.nome?.toLowerCase().includes(taskSearch.toLowerCase()))
              .filter(t => taskFilterCollab === 'all' || t.assigned_to === taskFilterCollab)
              .filter(t => taskFilterClient === 'all' || t.project_id === taskFilterClient || t.projects?.id === taskFilterClient);

            return (
              <>
                <div 
                  onScroll={handleQueueScroll}
                  className="flex flex-row overflow-x-auto custom-scrollbar gap-3 pb-2 pt-1 snap-x snap-mandatory w-full"
                >
                   {filteredQueue.map(task => {
                      const avatarUrl = task.projects?.profiles?.avatar_url;
                      return (
                        <div key={task.id} onClick={() => setEditingTask(task)} className="bg-white/90 rounded-[1.2rem] p-3 border border-white flex items-center gap-3 active:scale-[0.98] transition-transform shrink-0 w-[82vw] snap-center">
                           <div className="w-10 h-10 rounded-[1rem] overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center">
                              {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <span className="font-elegant text-[var(--color-atelier-terracota)] font-bold text-lg uppercase">{task.projects?.profiles?.nome?.charAt(0) || "W"}</span>}
                           </div>
                           <div className="flex-1 flex flex-col min-w-0">
                              <span className="font-roboto font-bold text-[12px] text-[var(--color-atelier-grafite)] truncate leading-tight pr-2">{task.title}</span>
                              <span className="text-[10px] text-[var(--color-atelier-grafite)]/50 truncate mt-0.5">{task.projects?.profiles?.nome || "White-Label"}</span>
                           </div>
                           <div className="shrink-0 flex flex-col items-end">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">{new Date(task.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[9px] font-bold text-gray-400">{task.profiles?.nome?.split(" ")[0] || "Livre"}</span>
                                <div className="w-4 h-4 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                                  {task.profiles?.avatar_url ? <img src={task.profiles.avatar_url} className="w-full h-full object-cover" /> : <UserCircle2 size={10} className="text-gray-400" />}
                                </div>
                              </div>
                           </div>
                        </div>
                      )
                   })}
                   {filteredQueue.length === 0 && (
                     <div className="w-full text-center py-8 bg-white/40 rounded-2xl text-[var(--color-atelier-grafite)]/30 text-xs font-bold uppercase tracking-widest">Nenhuma tarefa</div>
                   )}
                </div>

                {/* NAV BOTTOM: NAVEGAÇÃO ENTRE AS TAREFAS DA FILA */}
                {filteredQueue.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    {filteredQueue.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveQueueIndex(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === Math.min(activeQueueIndex, filteredQueue.length - 1) 
                            ? 'w-5 bg-[var(--color-atelier-terracota)]' 
                            : 'w-1.5 bg-[var(--color-atelier-grafite)]/20 hover:bg-[var(--color-atelier-grafite)]/40'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            );
         })()}
      </motion.div>
    </>
  );
}