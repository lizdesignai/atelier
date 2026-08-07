// src/app/admin/analytics/views/OverviewDashboard.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FolderKanban, Target, Users, Search, 
  CheckSquare, Square, Flame, UserCircle2, 
  Edit3, Check, Activity, AlertTriangle,
  Bell, X, Cpu, Play, PanelRightClose, PanelRightOpen,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Settings, Sparkles, Calendar, Layers, Zap, ArrowRight, CheckCircle2, MoreHorizontal, Trello, PlusCircle, PenTool, LayoutTemplate, Briefcase, Video, Filter, MessageSquare, Plus
} from "lucide-react";
import StudioConfigModal from "../../../../components/StudioConfigModal";
import AgencyConfigModal from "../../../../components/AgencyConfigModal";

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
  unifiedWallet?: any[];
  selectedEntityId?: string;
  setSelectedEntityId?: (id: string) => void;
  setSelectedEntityType?: (type: 'project' | 'agency' | 'subclient') => void;
  setIsCaptacaoModalOpen?: (val: boolean) => void;
  isReuniaoModalOpen?: boolean;
  setIsReuniaoModalOpen?: (val: boolean) => void;
  reuniaoForm?: any;
  setReuniaoForm?: (form: any) => void;
  handleAddReuniao?: () => void;
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
  unifiedWallet = [],
  selectedEntityId = '',
  setSelectedEntityId,
  setSelectedEntityType,
  setIsCaptacaoModalOpen,
  isReuniaoModalOpen,
  setIsReuniaoModalOpen,
  reuniaoForm,
  setReuniaoForm,
  handleAddReuniao,
}: OverviewDashboardProps) {
  
  // Estados locais
  const [taskSearch, setTaskSearch] = useState("");
  const [taskFilterCollab, setTaskFilterCollab] = useState<string>('all');
  const [taskFilterClient, setTaskFilterClient] = useState<string>('all');
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [activeQueueIndex, setActiveQueueIndex] = useState(0);

  // Modal Studio
  const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);
  const [studioConfigProject, setStudioConfigProject] = useState<any>(null);

  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [agencyConfigData, setAgencyConfigData] = useState<any>(null);

  // Estados para Carteira Unificada
  const [walletSearch, setWalletSearch] = useState("");
  const [walletFilter, setWalletFilter] = useState<'all'|'agency'|'studio'>('all'); // all acts as studio in the new UI toggle
  const [walletIndex, setWalletIndex] = useState(0);

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
      <motion.div key="overview-desktop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`hidden lg:flex flex-col gap-6 h-full min-h-0 relative shrink-0 transition-all ${isQueueMinimized ? 'w-16' : 'w-[400px]'}`}>
          
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
          <div className="w-full h-full flex flex-col gap-2 min-h-0 relative">
            
            {/* WIDGET 1: PRÓXIMAS TAREFAS */}
            <div className="flex flex-col min-h-0 shrink-0 h-[40%] relative overflow-hidden transition-all pt-2">
              <div className="pb-3 mb-1 shrink-0 flex flex-col gap-3">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Próximas Tarefas</h3>
                    
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center">
                          <button onClick={() => setIsMobileSearchActive(!isMobileSearchActive)} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-all">
                             <Search size={14} />
                          </button>
                          <AnimatePresence>
                            {isMobileSearchActive && (
                              <motion.input 
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 180, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                type="text" 
                                placeholder="Buscar..." 
                                value={taskSearch} 
                                onChange={(e)=>setTaskSearch(e.target.value)} 
                                autoFocus
                                className="absolute right-10 bg-white border border-gray-200 rounded-xl py-1.5 pl-3 pr-3 text-[11px] outline-none focus:border-[var(--color-atelier-terracota)] shadow-xl transition-all text-[var(--color-atelier-grafite)] font-bold z-30" 
                              />
                            )}
                          </AnimatePresence>
                      </div>
                      
                      {/* Filtro Colaborador */}
                      <div className="relative group/collab z-40">
                         <button className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-all">
                           <UserCircle2 size={16} />
                         </button>
                         <div className="absolute top-full right-0 mt-1 bg-white border border-gray-100 shadow-xl rounded-xl p-1.5 flex flex-col gap-1 w-56 opacity-0 pointer-events-none group-hover/collab:opacity-100 group-hover/collab:pointer-events-auto transition-all max-h-48 overflow-y-auto custom-scrollbar">
                            <button onClick={() => setTaskFilterCollab('all')} className={`text-left text-xs px-3 py-1.5 rounded-lg transition-colors ${taskFilterCollab === 'all' ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-bold' : 'hover:bg-gray-50 text-[var(--color-atelier-grafite)]/70'}`}>Todos Colaboradores</button>
                            {team.map(member => (
                              <button key={member.id} onClick={() => setTaskFilterCollab(member.id)} className={`text-left text-xs px-3 py-1.5 rounded-lg transition-colors truncate ${taskFilterCollab === member.id ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-bold' : 'hover:bg-gray-50 text-[var(--color-atelier-grafite)]/70'}`}>{member.name || member.nome}</button>
                            ))}
                         </div>
                      </div>
                      
                      {/* Filtro Cliente */}
                      <div className="relative group/client z-40">
                         <button className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-all">
                           <FolderKanban size={16} />
                         </button>
                         <div className="absolute top-full right-0 mt-1 bg-white border border-gray-100 shadow-xl rounded-xl p-1.5 flex flex-col gap-1 w-72 opacity-0 pointer-events-none group-hover/client:opacity-100 group-hover/client:pointer-events-auto transition-all max-h-64 overflow-y-auto custom-scrollbar">
                            <button onClick={() => setTaskFilterClient('all')} className={`text-left text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-normal break-words ${taskFilterClient === 'all' ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-bold' : 'hover:bg-gray-50 text-[var(--color-atelier-grafite)]/70'}`}>Todos Clientes</button>
                            {clientsWithTasks.map(client => (
                              <button key={client.id as string} onClick={() => setTaskFilterClient(client.id as string)} className={`text-left text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-normal break-words ${taskFilterClient === client.id ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-bold' : 'hover:bg-gray-50 text-[var(--color-atelier-grafite)]/70'}`}>{client.name}</button>
                            ))}
                         </div>
                      </div>
                    </div>
                </div>
              </div>

              {/* HORIZONTAL SLIDER TAREFAS (UM POR VEZ) */}
              <div className="flex-1 min-h-0 flex flex-row overflow-x-auto overflow-y-hidden gap-3 pb-2 pt-1 relative custom-scrollbar snap-x snap-mandatory queue-slider no-scrollbar" onScroll={handleQueueScroll}>
                {(() => {
                   const filteredTasks = activeTasksForQueue
                     .filter(t => t.title.toLowerCase().includes(taskSearch.toLowerCase()) || t.projects?.profiles?.nome?.toLowerCase().includes(taskSearch.toLowerCase()))
                     .filter(t => taskFilterCollab === 'all' || t.assigned_to === taskFilterCollab)
                     .filter(t => taskFilterClient === 'all' || t.project_id === taskFilterClient || t.projects?.id === taskFilterClient);
                   
                   if (filteredTasks.length === 0) {
                     return <div className="w-full flex-1 flex items-center justify-center opacity-40 italic">Nenhuma tarefa encontrada.</div>;
                   }

                   return (
                     <AnimatePresence mode="popLayout">
                       {filteredTasks.map(task => {
                         const isSelected = selectedTaskIds.includes(task.id);
                         return (
                           <motion.div 
                             key={task.id} 
                             initial={{ opacity: 0, scale: 0.95 }}
                             animate={{ opacity: 1, scale: 1 }}
                             exit={{ opacity: 0, scale: 0.95 }}
                             transition={{ duration: 0.2 }}
                             onClick={() => isBulkMode ? toggleTaskSelection(task.id) : null}
                             className={`w-full shrink-0 snap-center p-5 rounded-[1.5rem] border flex flex-col justify-between gap-4 group transition-all duration-300 shadow-sm ${isBulkMode ? 'cursor-pointer hover:scale-[1.02]' : ''} ${isSelected ? 'bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)] shadow-md' : 'bg-white/80 backdrop-blur-md border-[var(--color-atelier-grafite)]/5 hover:border-[var(--color-atelier-terracota)]/30 hover:shadow-md'}`}
                           >
                             <div className="flex flex-col flex-1 w-full" onClick={(e) => { if (isBulkMode) return; setEditingTask(task); }}>
                               {/* Cabeçalho: Client name */}
                               <div className="flex items-center justify-between w-full mb-1">
                                 <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 truncate" title={task.projects?.profiles?.nome}>
                                   {task.projects?.profiles?.nome || "White-Label"}
                                 </span>
                                 <div className="flex items-center gap-2">
                                   {task.urgency && <Flame size={12} className="text-orange-500 shrink-0"/>}
                                   {isBulkMode && (
                                     <div className="shrink-0 text-[var(--color-atelier-terracota)]" onClick={(e) => { e.stopPropagation(); toggleTaskSelection(task.id); }}>
                                       {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-gray-300"/>}
                                     </div>
                                   )}
                                 </div>
                               </div>
                               {/* Title */}
                               <span className="font-roboto font-bold text-[15px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors leading-tight line-clamp-2 mt-1" title={task.title}>{task.title}</span>
                             </div>
                             
                             <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--color-atelier-grafite)]/5">
                               <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-full overflow-hidden border border-white shadow-sm bg-gray-100 flex items-center justify-center shrink-0">
                                   {task.profiles?.avatar_url ? <img src={task.profiles.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 size={12} className="text-gray-300"/>}
                                 </div>
                                 <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)]/60 truncate max-w-[80px]" title={task.profiles?.nome}>
                                   {task.profiles?.nome?.split(' ')[0] || "Não Atribuído"}
                                 </span>
                               </div>
                               
                               <div className="flex items-center gap-2">
                                 <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/10 px-2 py-0.5 rounded-md">
                                   <Calendar size={10} className="inline mr-1" />
                                   {new Date(task.deadline).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})}
                                 </span>
                                 {!isBulkMode && (
                                   <button onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }} className="w-6 h-6 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all shadow-sm border border-green-200" title="Finalizar Tarefa">
                                     <Check size={10} strokeWidth={3} />
                                   </button>
                                 )}
                               </div>
                             </div>
                           </motion.div>
                         );
                       })}
                     </AnimatePresence>
                   );
                 })()}
              </div>

              {/* NAV DE PAGINAÇÃO (Fora do slider para não sobrepor) */}
              {activeTasksForQueue.filter(t => t.title.toLowerCase().includes(taskSearch.toLowerCase()) || t.projects?.profiles?.nome?.toLowerCase().includes(taskSearch.toLowerCase()))
                     .filter(t => taskFilterCollab === 'all' || t.assigned_to === taskFilterCollab)
                     .filter(t => taskFilterClient === 'all' || t.project_id === taskFilterClient || t.projects?.id === taskFilterClient).length > 0 && (
              <div className="flex justify-center items-center gap-3 pt-3 shrink-0 z-10">
                <button onClick={(e) => {
                   const container = e.currentTarget.closest('.flex-col')?.querySelector('.queue-slider');
                   if(container) container.scrollBy({ left: -container.clientWidth, behavior: 'smooth' });
                }} className="w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-all active:scale-95 border border-gray-100"><ChevronLeft size={16}/></button>
                
                <div className="flex gap-1.5 items-center px-2">
                  {activeTasksForQueue.filter(t => t.title.toLowerCase().includes(taskSearch.toLowerCase()) || t.projects?.profiles?.nome?.toLowerCase().includes(taskSearch.toLowerCase()))
                     .filter(t => taskFilterCollab === 'all' || t.assigned_to === taskFilterCollab)
                     .filter(t => taskFilterClient === 'all' || t.project_id === taskFilterClient || t.projects?.id === taskFilterClient).slice(0, 5).map((_, i) => (
                     <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${activeQueueIndex === i ? 'w-5 bg-[var(--color-atelier-terracota)]' : 'w-1.5 bg-gray-300'}`} />
                  ))}
                  {activeTasksForQueue.filter(t => t.title.toLowerCase().includes(taskSearch.toLowerCase()) || t.projects?.profiles?.nome?.toLowerCase().includes(taskSearch.toLowerCase()))
                     .filter(t => taskFilterCollab === 'all' || t.assigned_to === taskFilterCollab)
                     .filter(t => taskFilterClient === 'all' || t.project_id === taskFilterClient || t.projects?.id === taskFilterClient).length > 5 && <span className="text-[10px] text-gray-400 font-bold">+{activeTasksForQueue.filter(t => t.title.toLowerCase().includes(taskSearch.toLowerCase()) || t.projects?.profiles?.nome?.toLowerCase().includes(taskSearch.toLowerCase()))
                     .filter(t => taskFilterCollab === 'all' || t.assigned_to === taskFilterCollab)
                     .filter(t => taskFilterClient === 'all' || t.project_id === taskFilterClient || t.projects?.id === taskFilterClient).length - 5}</span>}
                </div>

                <button onClick={(e) => {
                   const container = e.currentTarget.closest('.flex-col')?.querySelector('.queue-slider');
                   if(container) container.scrollBy({ left: container.clientWidth, behavior: 'smooth' });
                }} className="w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-all active:scale-95 border border-gray-100"><ChevronRight size={16}/></button>
              </div>
              )}
            </div>

            {/* WIDGET 2: CARTEIRA UNIFICADA */}
            <div className="flex flex-col min-h-0 shrink-0 h-[60%] relative overflow-hidden transition-all pt-3 border-t border-[var(--color-atelier-grafite)]/10">
              <div className="pb-3 mb-1 shrink-0 flex items-center justify-between">
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Carteira</h3>
                
                {/* Toggle Switch */}
                <div className="flex bg-white/60 p-1 rounded-full shadow-sm border border-white relative overflow-hidden">
                   <div className={`absolute top-1 bottom-1 w-[48%] rounded-full bg-[var(--color-atelier-terracota)] shadow-sm transition-transform duration-300 ease-out`} style={{ transform: walletFilter === 'agency' ? 'translateX(105%)' : 'translateX(0%)' }}></div>
                   <button onClick={() => { setWalletFilter('all'); setWalletIndex(0); }} className={`relative z-10 px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full transition-colors duration-300 ${walletFilter !== 'agency' ? 'text-white' : 'text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)]'}`}>Studio</button>
                   <button onClick={() => { setWalletFilter('agency'); setWalletIndex(0); }} className={`relative z-10 px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full transition-colors duration-300 ${walletFilter === 'agency' ? 'text-white' : 'text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)]'}`}>Agência</button>
                </div>
              </div>

              {/* SINGLE LARGE CARD */}
              <div className="flex-1 w-full relative flex items-center justify-center mt-2 px-6">
                 {/* Navigation Nav (Left/Right) */}
                 <button onClick={() => setWalletIndex(p => Math.max(0, p - 1))} className="absolute left-0 z-20 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-[var(--color-atelier-terracota)] hover:scale-110 active:scale-95 transition-transform"><ChevronLeft size={18}/></button>
                 <button onClick={() => setWalletIndex(p => p + 1)} className="absolute right-0 z-20 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-[var(--color-atelier-terracota)] hover:scale-110 active:scale-95 transition-transform"><ChevronRight size={18}/></button>
                 
                 <AnimatePresence mode="wait">
                   {(() => {
                     const filteredWallet = unifiedWallet.filter(item => {
                       if (walletFilter === 'agency') return item.type === 'agency';
                       return item.type === 'project';
                     });
                     
                     if (filteredWallet.length === 0) {
                       return (
                          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full rounded-[2rem] border border-dashed border-gray-300 flex items-center justify-center bg-white/40 opacity-50">
                             <span className="text-[10px] uppercase font-bold tracking-widest">Nenhum Cliente</span>
                          </motion.div>
                       );
                     }
                     
                     const safeIndex = Math.min(walletIndex, filteredWallet.length - 1);
                     const item = filteredWallet[safeIndex];
                     const avatarUrl = item.avatar_url || item.profiles?.avatar_url || item.logo_url;
                     const isSelected = selectedEntityId === item.id;

                     return (
                       <motion.div 
                          key={`${item.type}-${item.id}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => { 
                            if(setSelectedEntityId) setSelectedEntityId(item.id); 
                            if(setSelectedEntityType) setSelectedEntityType(item.type as any);
                          }} 
                          className={`w-full h-full shrink-0 flex flex-col justify-end p-6 rounded-[2rem] text-left transition-all duration-300 border shadow-lg cursor-pointer relative overflow-hidden ${isSelected ? 'border-white/60 ring-4 ring-[var(--color-atelier-terracota)]/20 shadow-xl' : 'border-white/20 hover:shadow-xl'}`}
                       >
                          {/* Background Image & Gradient */}
                          <div className="absolute inset-0 z-0 pointer-events-none">
                             {avatarUrl && <img src={avatarUrl} alt="Background" className="w-full h-full object-cover absolute inset-0 opacity-100" />}
                             <div className={`absolute inset-0 ${item.type === 'agency' ? 'bg-gradient-to-t from-[#1E3A8A] via-[#3B82F6]/80 to-transparent' : 'bg-gradient-to-t from-[var(--color-atelier-terracota)] via-[var(--color-atelier-rose)]/80 to-transparent'}`}></div>
                          </div>
                          
                          {item.type === 'project' && (
                            <button onClick={(e) => { 
                               e.stopPropagation(); 
                               setStudioConfigProject(item); 
                               setIsStudioModalOpen(true); 
                            }} className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/20 hover:bg-white backdrop-blur-sm border border-white/30 hover:border-white text-white hover:text-[var(--color-atelier-grafite)] flex items-center justify-center transition-all shadow-sm">
                              <Settings size={14} />
                            </button>
                          )}

                          {item.type === 'agency' && (
                            <button onClick={(e) => { 
                               e.stopPropagation(); 
                               setAgencyConfigData(item); 
                               setIsAgencyModalOpen(true); 
                            }} className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/20 hover:bg-white backdrop-blur-sm border border-white/30 hover:border-white text-white hover:text-blue-600 flex items-center justify-center transition-all shadow-sm">
                              <Settings size={14} />
                            </button>
                          )}

                          <div className="relative z-10 flex items-center gap-4 mt-auto">
                             <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shadow-inner overflow-hidden shrink-0 bg-white/20 backdrop-blur-md border border-white/30 text-white`}>
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt={item.name} className="w-full h-full object-cover" />
                                ) : item.type === 'agency' ? (
                                  <FolderKanban size={24}/>
                                ) : (
                                  <span className="font-elegant text-3xl leading-none uppercase">{item.name?.charAt(0) || "U"}</span>
                                )}
                             </div>
                             <div className="flex flex-col flex-1 min-w-0 pr-2 text-white">
                                <span className="text-[9px] uppercase font-bold tracking-widest opacity-80 mb-0.5">{item.label}</span>
                                <span className="font-elegant text-[22px] truncate leading-tight drop-shadow-sm">{item.name}</span>
                             </div>
                          </div>
                       </motion.div>
                     );
                   })()}
                 </AnimatePresence>
              </div>
              
              {/* Dots indicator */}
              <div className="flex justify-center mt-4 gap-1.5 h-3 shrink-0">
                 {(() => {
                    const filteredWallet = unifiedWallet.filter(item => {
                       if (walletFilter === 'agency') return item.type === 'agency';
                       return item.type === 'project';
                    });
                    if (filteredWallet.length <= 1) return null;
                    const maxDots = Math.min(filteredWallet.length, 10);
                    const safeIndex = Math.min(walletIndex, filteredWallet.length - 1);
                    return Array.from({ length: maxDots }).map((_, i) => (
                       <button
                         key={i}
                         type="button"
                         onClick={() => setWalletIndex(i)}
                         className={`h-1.5 rounded-full transition-all duration-300 ${i === safeIndex ? 'w-5 bg-[var(--color-atelier-terracota)]' : 'w-1.5 bg-[var(--color-atelier-grafite)]/20 hover:bg-[var(--color-atelier-grafite)]/40'}`}
                       />
                    ));
                 })()}
              </div>
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

      <StudioConfigModal 
        isOpen={isStudioModalOpen} 
        onClose={() => setIsStudioModalOpen(false)} 
        project={studioConfigProject}
        onCycleStarted={() => {
           if (typeof window !== 'undefined') {
             window.dispatchEvent(new CustomEvent('refreshGlobalData'));
           }
        }}
        onScheduleCaptacao={() => {
           setIsStudioModalOpen(false);
           if (setIsCaptacaoModalOpen) setIsCaptacaoModalOpen(true);
        }}
        onScheduleReuniao={() => {
           setIsStudioModalOpen(false);
           if (setIsReuniaoModalOpen) setIsReuniaoModalOpen(true);
        }}
      />

      <AgencyConfigModal
        isOpen={isAgencyModalOpen}
        onClose={() => setIsAgencyModalOpen(false)}
        agency={agencyConfigData}
        onSave={() => {
           if (typeof window !== 'undefined') {
             window.dispatchEvent(new CustomEvent('refreshGlobalData'));
           }
        }}
      />
    </>
  );
}