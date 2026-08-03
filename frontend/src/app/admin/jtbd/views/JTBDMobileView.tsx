// src/app/admin/jtbd/views/JTBDMobileView.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Flame, Briefcase, FolderKanban, CheckCircle2, Clock, 
  AlertTriangle, Search, ChevronLeft, ChevronRight, PlayCircle,
  MessageSquare, UserCircle2, ArrowRight, X
} from "lucide-react";
import TaskCard from "../components/TaskCard";

interface JTBDMobileViewProps {
  currentUser: any;
  viewedUser: any;
  isViewingSelf: boolean;
  allUserTasks: any[];
  allTasks?: any[];
  assignedClients: any[];
  selectedClient: any;
  onSelectClient: (client: any) => void;
  isAdminOrManager: boolean;
  onOpenTaskModal?: (task: any, isFocus?: boolean, isReview?: boolean, isCompleted?: boolean) => void;
  updateTaskStatus: (task: any, newStatus: string) => void;
}

export default function JTBDMobileView({
  currentUser,
  viewedUser,
  isViewingSelf,
  allUserTasks = [],
  allTasks = [],
  assignedClients = [],
  selectedClient,
  onSelectClient,
  isAdminOrManager,
  onOpenTaskModal,
  updateTaskStatus
}: JTBDMobileViewProps) {
  
  const [walletSearch, setWalletSearch] = useState("");
  const [activeWalletIndex, setActiveWalletIndex] = useState(0);
  const [expandedClientInline, setExpandedClientInline] = useState<any | null>(null);
  
  // Estado das modais/gavetas das tarefas em revisão e concluídas
  const [activeDrawer, setActiveDrawer] = useState<'review' | 'completed' | null>(null);

  // Estado Fértil do Modal TaskCard Direto no Mobile
  const [activeTaskModal, setActiveTaskModal] = useState<{task: any, isFocus: boolean, isReview: boolean, isCompleted: boolean} | null>(null);

  const handleTaskClick = (task: any, isFocus = false, isReview = false, isCompleted = false) => {
    setActiveTaskModal({ task, isFocus, isReview, isCompleted });
    if (onOpenTaskModal) {
      onOpenTaskModal(task, isFocus, isReview, isCompleted);
    }
  };

  // Pool de tarefas completo para busca resiliente
  const tasksPool = (allTasks && allTasks.length > 0) ? allTasks : allUserTasks;

  // 1. Cálculos de Métricas do Colaborador
  const activeTasks = allUserTasks.filter(t => ['pending', 'in_progress', 'review'].includes(t.status));
  const totalEstMinutes = activeTasks.reduce((acc, t) => acc + (t.estimated_time || 0), 0);
  const cargaHoras = Math.floor(totalEstMinutes / 60);
  const cargaMin = totalEstMinutes % 60;
  const cargaFormatada = cargaMin > 0 ? `${cargaHoras}h ${cargaMin}m` : `${cargaHoras}h`;

  const isCompletedStatus = (status: string) => {
    const s = (status || "").toLowerCase();
    return s === 'completed' || s === 'done' || s === 'approved' || s === 'concluido' || s === 'concluída' || s === 'finalizado';
  };

  const completedTasksCount = allUserTasks.filter(t => isCompletedStatus(t.status)).length;
  const totalTasksCount = allUserTasks.length;
  const eficiencia = totalTasksCount === 0 ? 0 : Math.round((completedTasksCount / totalTasksCount) * 100);

  const greeting = isViewingSelf 
    ? `Olá, ${viewedUser?.nome?.split(" ")[0] || ""}` 
    : `Espaço de ${viewedUser?.nome?.split(" ")[0] || ""}`;

  // 2. Filtro Rigoroso do Mês Corrente
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const isFromCurrentMonth = (task: any) => {
    const rawDate = task.completed_at || task.updated_at || task.deadline || task.created_at;
    if (!rawDate) return true; // Se não tem data gravada, mantém no mês corrente para não perder visualização
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return true;
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    } catch {
      return true;
    }
  };

  // 3. Demandas Urgentes
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const urgentTasks = activeTasks.filter(t => {
    if (selectedClient) {
      const matchesClient = selectedClient.type === 'project' ? t.project_id === selectedClient.id : t.subclient_id === selectedClient.id;
      if (!matchesClient) return false;
    }
    if (t.urgency || t.status === 'in_progress') return true;
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    return !isNaN(d.getTime()) && d <= next24h;
  });

  // 4. Tarefas em Revisão (APENAS DO MÊS CORRENTE)
  const isReviewStatus = (status: string) => {
    const s = (status || "").toLowerCase();
    return s === 'review' || s === 'revisão' || s === 'pending_client_approval' || s === 'pending_approval';
  };

  const reviewTasks = tasksPool.filter(t => {
    if (!isReviewStatus(t.status)) return false;
    const matchesUser = t.assigned_to === viewedUser?.id || t.assigned_to === currentUser?.id || isAdminOrManager;
    if (!matchesUser) return false;
    if (selectedClient) {
      const matchesClient = selectedClient.type === 'project' ? t.project_id === selectedClient.id : t.subclient_id === selectedClient.id;
      if (!matchesClient) return false;
    }
    return isFromCurrentMonth(t);
  });

  // 5. Tarefas Concluídas (APENAS DO MÊS CORRENTE)
  const completedTasks = tasksPool.filter(t => {
    if (!isCompletedStatus(t.status)) return false;
    const matchesUser = t.assigned_to === viewedUser?.id || t.assigned_to === currentUser?.id || isAdminOrManager;
    if (!matchesUser) return false;
    if (selectedClient) {
      const matchesClient = selectedClient.type === 'project' ? t.project_id === selectedClient.id : t.subclient_id === selectedClient.id;
      if (!matchesClient) return false;
    }
    return isFromCurrentMonth(t);
  });

  // 6. Carteira do Designer (Unificação e Busca)
  const unifiedWallet = assignedClients.length > 0 ? assignedClients : (() => {
    const map = new Map();
    allUserTasks.forEach(t => {
      const id = t.subclient_id || t.project_id || t.projects?.id;
      const name = t.agency_subclients?.name || t.projects?.profiles?.nome || t.projects?.title;
      const avatar = t.projects?.profiles?.avatar_url || null;
      const label = t.agency_subclients ? 'White-Label' : (t.projects?.type || 'Cliente');
      if (id && name && !map.has(id)) {
        map.set(id, { id, name, avatarUrl: avatar, label, type: t.subclient_id ? 'subclient' : 'project' });
      }
    });
    return Array.from(map.values());
  })();

  const searchLower = walletSearch.trim().toLowerCase();
  const filteredWallet = unifiedWallet.filter(entity => {
    if (!searchLower) return true;
    const name = (entity.name || "").toLowerCase();
    const label = (entity.label || "").toLowerCase();
    return name.includes(searchLower) || label.includes(searchLower);
  });

  const safeWalletIndex = Math.min(activeWalletIndex, Math.max(0, filteredWallet.length - 1));

  return (
    <div className="flex lg:hidden flex-col w-full h-full overflow-y-auto custom-scrollbar gap-5 pb-24">
      
      {/* ==========================================
          HEADER DO COLABORADOR: RETÂNGULO COM FOTO E NÚMEROS
          ========================================== */}
      <div className="w-full bg-[var(--color-atelier-grafite)] p-4 rounded-[2rem] border border-white/10 shadow-sm relative overflow-hidden flex flex-col gap-3 shrink-0">
        <div className="absolute right-[-10%] top-[-20%] w-[200px] h-[200px] bg-[var(--color-atelier-terracota)]/20 rounded-full blur-[40px] pointer-events-none"></div>
        
        <div className="flex items-center justify-between gap-3 relative z-10 w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden border border-white/20 flex items-center justify-center text-lg font-elegant text-white shrink-0 shadow-inner">
              {viewedUser?.avatar_url 
                ? <img src={viewedUser.avatar_url} className="w-full h-full object-cover" alt="Avatar"/> 
                : viewedUser?.nome?.charAt(0)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-1">
                {isViewingSelf ? 'Meu Espaço' : 'Gestão'} • {viewedUser?.role || 'Designer'}
              </span>
              <h2 className="font-elegant text-2xl text-white truncate leading-tight">{greeting}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl flex flex-col items-center">
              <span className="text-[7px] text-white/50 uppercase tracking-widest font-bold">Eficiência</span>
              <span className="text-white font-bold text-[11px]">{eficiencia}%</span>
            </div>
            <div className="bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl flex flex-col items-center">
              <span className="text-[7px] text-white/50 uppercase tracking-widest font-bold">Horas</span>
              <span className="text-[var(--color-atelier-terracota)] font-bold text-[11px]">{cargaFormatada}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          SEÇÃO 1: DEMANDAS URGENTES (H1 + CARROSSEL)
          ========================================== */}
      <div className="flex flex-col w-full shrink-0 gap-2.5">
        <div className="flex items-center justify-between px-1">
          <h1 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
            Demandas <span className="text-[var(--color-atelier-terracota)] italic">Urgentes.</span>
          </h1>
          {selectedClient ? (
            <button onClick={() => onSelectClient(null)} className="text-[9px] font-bold text-[var(--color-atelier-terracota)] underline">
              Limpar Filtro
            </button>
          ) : (
            <span className="bg-orange-500/10 text-orange-600 border border-orange-200 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
              {urgentTasks.length} {urgentTasks.length === 1 ? 'Entrega' : 'Entregas'}
            </span>
          )}
        </div>

        {urgentTasks.length === 0 ? (
          <div className="w-full text-center py-6 bg-white/60 rounded-3xl border border-white text-gray-400 text-[10px] font-bold uppercase tracking-widest">
            {selectedClient ? `Sem entregas urgentes para ${selectedClient.name}` : "Sem demandas urgentes nas próximas 24h 🎉"}
          </div>
        ) : (
          <div className="flex flex-row overflow-x-auto custom-scrollbar gap-3 pb-2 pt-1 snap-x snap-mandatory w-full">
            {urgentTasks.map(task => {
              const clientName = task.agency_subclients?.name || task.projects?.profiles?.nome || task.projects?.title || 'Cliente';
              const isLive = task.status === 'in_progress';
              const hasFeedback = Boolean(task.caption || task.status === 'review' || task.has_feedback);

              return (
                <div 
                  key={task.id} 
                  onClick={() => handleTaskClick(task, isLive, task.status === 'review', false)}
                  className={`shrink-0 w-[82vw] max-w-[310px] snap-center rounded-[1.6rem] p-4 border flex flex-col justify-between gap-3 active:scale-[0.98] transition-all cursor-pointer shadow-xs ${
                    hasFeedback 
                      ? 'bg-orange-50/90 border-orange-500 shadow-md ring-2 ring-orange-400/30' 
                      : 'bg-white/90 border-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] leading-snug line-clamp-2">
                      {task.title}
                    </span>
                    {hasFeedback ? (
                      <span className="bg-orange-500 text-white text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 shadow-xs flex items-center gap-1 animate-bounce">
                        <MessageSquare size={10} /> Feedback
                      </span>
                    ) : isLive ? (
                      <span className="bg-green-500 text-white text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                        Em Andamento
                      </span>
                    ) : (
                      <span className="bg-amber-500/20 text-amber-700 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0">
                        24h
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100/80 pt-2.5">
                    <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)]/70 truncate max-w-[150px]">{clientName}</span>
                    <span className="text-[10px] font-bold text-[var(--color-atelier-terracota)]">
                      {task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'Urgente'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==========================================
          SEÇÃO 2: CARTEIRA DO DESIGNER (BARALHO 3D E NAVEGAÇÃO ILIMITADA)
          ========================================== */}
      <div className="flex flex-col w-full shrink-0 gap-2.5">
        <div className="flex items-center justify-between px-1">
          <h1 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
            Carteira do <span className="text-[var(--color-atelier-terracota)] italic">Designer.</span>
          </h1>
          {!expandedClientInline && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-atelier-terracota)]" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                value={walletSearch}
                onChange={(e) => {
                  setWalletSearch(e.target.value);
                  setActiveWalletIndex(0);
                }}
                className="w-32 bg-white/80 border border-[var(--color-atelier-terracota)]/20 rounded-full py-1 pl-8 pr-3 text-[10px] outline-none shadow-xs text-[var(--color-atelier-grafite)] font-bold"
              />
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {expandedClientInline ? (
            /* VISUALIZAÇÃO INLINE EXPANDIDA DO CLIENTE DA CARTEIRA */
            <motion.div 
              key="expanded-client-inline"
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 15 }} 
              className="w-full bg-white/90 backdrop-blur-md rounded-[2.2rem] border border-white p-4 flex flex-col gap-3 shrink-0 shadow-sm"
            >
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 shrink-0">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">{expandedClientInline.label}</span>
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-tight truncate">{expandedClientInline.name || "White-Label"}</h3>
                </div>
                <button onClick={() => setExpandedClientInline(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition-transform shrink-0">
                  ✕
                </button>
              </div>

              {/* Lista de Demandas do Mês do Cliente */}
              <div className="max-h-[260px] overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1 shrink-0">
                {allUserTasks.filter(t => t.project_id === expandedClientInline.id || t.subclient_id === expandedClientInline.id || t.projects?.id === expandedClientInline.id).length === 0 ? (
                  <div className="text-center py-6 flex flex-col items-center opacity-40">
                    <FolderKanban size={24} className="mb-1 text-[var(--color-atelier-terracota)]" />
                    <span className="text-[9px] uppercase font-bold tracking-widest">Sem tarefas este mês</span>
                  </div>
                ) : (
                  allUserTasks.filter(t => t.project_id === expandedClientInline.id || t.subclient_id === expandedClientInline.id || t.projects?.id === expandedClientInline.id).map(task => (
                    <div 
                      key={task.id} 
                      onClick={() => handleTaskClick(task, task.status === 'in_progress', isReviewStatus(task.status), isCompletedStatus(task.status))} 
                      className="bg-white rounded-xl p-3 border border-gray-100 flex flex-col gap-2 cursor-pointer active:scale-[0.99] transition-transform shadow-2xs"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-roboto font-bold text-[11px] text-[var(--color-atelier-grafite)] leading-tight">{task.title}</span>
                        <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${
                          isCompletedStatus(task.status) ? 'bg-green-500 text-white' : task.status === 'in_progress' ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {isCompletedStatus(task.status) ? 'Concluída' : task.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-50">
                        <span className="text-[9px] font-bold text-[var(--color-atelier-terracota)]">{task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR') : 'Sem Prazo'}</span>
                        <span className="text-[9px] font-bold text-gray-400">Ver Taskcard</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            /* STACKED DECK CARDS (BARALHO 3D DA CARTEIRA) */
            <motion.div key="stacked-deck-inline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center w-full shrink-0">
              <div className="relative w-full h-[240px] flex items-center justify-center my-1">
                {filteredWallet.map((entity, idx) => {
                  const offset = idx - safeWalletIndex;
                  if (offset < 0 || offset > 2) return null;

                  const clientName = entity.name || "White-Label";
                  const avatarUrl = entity.avatarUrl || entity.avatar_url;
                  const clientTasksCount = allUserTasks.filter(t => t.project_id === entity.id || t.subclient_id === entity.id || t.projects?.id === entity.id).length;
                  const isTop = offset === 0;

                  return (
                    <motion.div 
                      key={entity.id} 
                      initial={false}
                      animate={{ 
                        scale: isTop ? 1 : offset === 1 ? 0.94 : 0.88,
                        y: offset * 14,
                        opacity: isTop ? 1 : offset === 1 ? 0.75 : 0.4,
                        zIndex: 30 - offset * 10
                      }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      drag={isTop ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={(e, { offset, velocity }) => {
                        const swipe = offset.x * velocity.x;
                        if (swipe < -10000 && activeWalletIndex < filteredWallet.length - 1) {
                          setActiveWalletIndex(prev => prev + 1);
                        } else if (swipe > 10000 && activeWalletIndex > 0) {
                          setActiveWalletIndex(prev => prev - 1);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isTop) {
                          setExpandedClientInline(entity);
                          onSelectClient(entity);
                        } else {
                          setActiveWalletIndex(idx);
                        }
                      }}
                      className={`absolute w-full h-[220px] rounded-[2.2rem] overflow-hidden border flex flex-col justify-between p-5 cursor-pointer active:scale-95 transition-transform ${isTop ? 'border-white/60 shadow-md' : 'border-white/30'}`}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={clientName} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[var(--color-atelier-terracota)] via-[#6E3827] to-[var(--color-atelier-grafite)]" />
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-atelier-grafite)]/90 via-[var(--color-atelier-grafite)]/40 to-transparent" />
                      
                      <div className="relative z-10 flex items-center justify-between w-full">
                        <span className="bg-white/20 backdrop-blur-md text-white border border-white/30 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                          {entity.label || 'Cliente'}
                        </span>
                        <span className="bg-[var(--color-atelier-terracota)] text-white text-[10px] font-bold px-3 py-1 rounded-full">
                          {clientTasksCount} {clientTasksCount === 1 ? 'Tarefa' : 'Tarefas'}
                        </span>
                      </div>

                      <div className="relative z-10 text-white flex flex-col gap-2.5">
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-white/60 mb-0.5">Cliente / Marca</span>
                          <h3 className="font-elegant text-3xl leading-tight truncate">{clientName}</h3>
                        </div>
                        
                        {isTop && (
                          <div className="bg-white/95 text-[var(--color-atelier-grafite)] w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-wider backdrop-blur-sm shadow-sm">
                            <span>Ver Demandas do Mês</span>
                            <FolderKanban size={14} className="text-[var(--color-atelier-terracota)]" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {filteredWallet.length === 0 && (
                  <div className="w-full text-center py-12 bg-white/40 rounded-3xl text-gray-400 text-xs font-bold uppercase tracking-widest">
                    Nenhum cliente encontrado
                  </div>
                )}
              </div>

              {filteredWallet.length > 1 && (
                <div className="flex items-center justify-center gap-4 mt-3 shrink-0 z-40">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setActiveWalletIndex(prev => (prev > 0 ? prev - 1 : filteredWallet.length - 1));
                    }}
                    className="w-10 h-10 rounded-full bg-white/90 border border-white flex items-center justify-center text-[var(--color-atelier-grafite)] active:scale-90 transition-transform shadow-xs cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {filteredWallet.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveWalletIndex(i);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === safeWalletIndex ? 'w-5 bg-[var(--color-atelier-terracota)]' : 'w-1.5 bg-[var(--color-atelier-grafite)]/20'}`} 
                      />
                    ))}
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setActiveWalletIndex(prev => (prev < filteredWallet.length - 1 ? prev + 1 : 0));
                    }}
                    className="w-10 h-10 rounded-full bg-white/90 border border-white flex items-center justify-center text-[var(--color-atelier-grafite)] active:scale-90 transition-transform shadow-xs cursor-pointer"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ==========================================
          SEÇÃO 3: BOTÕES INTERATIVOS (EM REVISÃO E CONCLUÍDAS DO MÊS)
          ========================================== */}
      <div className="flex items-center gap-3 w-full shrink-0 mt-2">
        {/* BOTÃO 1: EM REVISÃO */}
        <button
          type="button"
          onClick={() => setActiveDrawer('review')}
          className="flex-1 bg-orange-50/90 border border-orange-200 p-3.5 rounded-[1.6rem] flex items-center justify-between shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] uppercase font-bold tracking-wider text-orange-800/60">Mês Corrente</span>
              <span className="font-roboto font-bold text-xs text-orange-950">Em Revisão</span>
            </div>
          </div>
          <span className="bg-orange-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-xs">
            {reviewTasks.length}
          </span>
        </button>

        {/* BOTÃO 2: CONCLUÍDAS */}
        <button
          type="button"
          onClick={() => setActiveDrawer('completed')}
          className="flex-1 bg-green-50/90 border border-green-200 p-3.5 rounded-[1.6rem] flex items-center justify-between shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-600/10 text-green-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] uppercase font-bold tracking-wider text-green-800/60">Mês Corrente</span>
              <span className="font-roboto font-bold text-xs text-green-950">Concluídas</span>
            </div>
          </div>
          <span className="bg-green-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-xs">
            {completedTasks.length}
          </span>
        </button>
      </div>

      {/* ==========================================
          PAINEL/GAVETA FLUTUANTE DAS TAREFAS (REVISÃO / CONCLUÍDAS DO MÊS)
          ========================================== */}
      <AnimatePresence>
        {activeDrawer && (
          <div className="fixed inset-0 z-[99990] flex items-end justify-center px-3 pb-3">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveDrawer(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="relative z-10 w-full max-w-lg bg-white rounded-[2.2rem] border border-gray-100 p-5 shadow-2xl flex flex-col gap-4 max-h-[75vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  {activeDrawer === 'review' ? (
                    <>
                      <AlertTriangle size={20} className="text-orange-500" />
                      <h3 className="font-elegant text-2xl text-orange-950">Em Revisão ({reviewTasks.length})</h3>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} className="text-green-600" />
                      <h3 className="font-elegant text-2xl text-green-950">Concluídas do Mês ({completedTasks.length})</h3>
                    </>
                  )}
                </div>
                <button 
                  onClick={() => setActiveDrawer(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-95 transition-transform"
                >
                  <X size={16} />
                </button>
              </div>

              {/* LISTA DAS TAREFAS DENTRO DA GAVETA */}
              <div className="flex flex-col gap-2.5 overflow-y-auto custom-scrollbar pr-1 flex-1">
                {activeDrawer === 'review' ? (
                  reviewTasks.length === 0 ? (
                    <div className="text-center py-8 text-orange-800/40 text-xs font-bold uppercase tracking-widest">
                      Nenhuma tarefa em revisão este mês ✨
                    </div>
                  ) : (
                    reviewTasks.map(task => {
                      const clientName = task.agency_subclients?.name || task.projects?.profiles?.nome || task.projects?.title || 'Cliente';
                      return (
                        <div 
                          key={task.id}
                          onClick={() => {
                            handleTaskClick(task, false, true, false);
                            setActiveDrawer(null);
                          }}
                          className="bg-orange-50/80 rounded-2xl p-3.5 border border-orange-200 flex flex-col gap-2 cursor-pointer active:scale-[0.99] transition-transform shadow-2xs"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-roboto font-bold text-xs text-orange-950 leading-snug">{task.title}</span>
                            <span className="bg-orange-500 text-white text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0">
                              Revisão
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-orange-200/50 text-[10px] font-bold">
                            <span className="text-orange-900/70">{clientName}</span>
                            <span className="text-orange-600 flex items-center gap-1">Ver Taskcard <ArrowRight size={10} /></span>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : (
                  completedTasks.length === 0 ? (
                    <div className="text-center py-8 text-green-800/40 text-xs font-bold uppercase tracking-widest">
                      Nenhuma tarefa concluída este mês
                    </div>
                  ) : (
                    completedTasks.map(task => {
                      const clientName = task.agency_subclients?.name || task.projects?.profiles?.nome || task.projects?.title || 'Cliente';
                      return (
                        <div 
                          key={task.id}
                          onClick={() => {
                            handleTaskClick(task, false, false, true);
                            setActiveDrawer(null);
                          }}
                          className="bg-white rounded-2xl p-3.5 border border-green-200 flex flex-col gap-2 cursor-pointer active:scale-[0.99] transition-transform shadow-2xs"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-roboto font-bold text-xs text-gray-800 leading-snug">{task.title}</span>
                            <span className="bg-green-600 text-white text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                              <CheckCircle2 size={10} /> Concluída
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px] font-bold">
                            <span className="text-gray-500">{clientName}</span>
                            <span className="text-green-600 flex items-center gap-1">Ver Histórico <ArrowRight size={10} /></span>
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL FÉRTIL DO TASKCARD (DIRETO DENTRO DO MOBILE) */}
      <AnimatePresence>
        {activeTaskModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
              onClick={() => setActiveTaskModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 40 }} 
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="relative z-10 w-full max-w-lg pointer-events-auto shadow-[0_30px_60px_rgba(0,0,0,0.4)] rounded-[2.5rem]"
            >
              <TaskCard 
                task={activeTaskModal.task} 
                isFocus={activeTaskModal.isFocus}
                isReview={activeTaskModal.isReview}
                isCompleted={activeTaskModal.isCompleted}
                isAdmin={isAdminOrManager} 
                onAction={(newStatus: string) => {
                  updateTaskStatus(activeTaskModal.task, newStatus);
                  setActiveTaskModal(null);
                }} 
                onReschedule={() => {
                  setActiveTaskModal(null);
                }} 
                forceOpenModal={true} 
                currentUser={currentUser}
                isRescheduling={false}
                onCloseModal={() => setActiveTaskModal(null)}
                onRevert={(taskId) => {
                  updateTaskStatus(activeTaskModal.task, 'review');
                  setActiveTaskModal(null);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
