// src/app/admin/analytics/views/ProjectsManager.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  FolderKanban, Briefcase, UserCircle2, MapPin, 
  Sparkles, Loader2, PlusCircle, Trash2, Save, 
  Layers, CheckSquare, Square, Flame, Edit3, Check, X, 
  ArrowRight, Trello, ExternalLink, Lock, PanelRightClose, PanelRightOpen
} from "lucide-react";
import { ALL_SKILLS } from "../constants";

// 🟢 TIPAGEM ESTRITA BLINDADA
interface ProjectsManagerProps {
  unifiedWallet: any[];
  selectedEntityId: string;
  setSelectedEntityId: (id: string) => void;
  selectedEntityType: 'project' | 'agency' | 'subclient';
  setSelectedEntityType: (type: 'project' | 'agency' | 'subclient') => void;
  selectedEntityData: any;
  setIsCaptacaoModalOpen: (isOpen: boolean) => void;
  handleAutoDeploy: (project: any, subclient_id?: string) => void;
  isProcessing: boolean;
  tasks: any[];
  adHocDemand: { 
    title: string; 
    projectId: string; 
    assigneeId: string; 
    taskType: string; 
    urgency: boolean; 
    subclientId?: string; 
    description: string;
    deadline: string; 
    estTime: number; 
  };
  setAdHocDemand: (demand: any) => void;
  team: any[];
  handleAddAdHocDemand: () => void;
  agencySubclients: any[];
  handleDeleteSubclient: (id: string) => void;
  handleUpdateSubclientDemand: (id: string, count: number) => void;
  groupTasksByStage: (tasks: any[]) => Record<string, any[]>;
  isBulkMode: boolean;
  toggleTaskSelection: (id: string) => void;
  selectedTaskIds: string[];
  setEditingTask: (task: any) => void;
  handleCompleteTask: (id: string) => void;
  isIdvService: (project: any) => boolean;
  showToast: (msg: string) => void;
  handleStartTask: (taskId: string, userId: string) => Promise<void>;
  routingRules?: any[]; 
}

// 🟢 Helper Inteligente para formatar o link do Trello para modo "Embed" (Iframe Nativo)
const getTrelloEmbedUrl = (url: string) => {
  if (!url) return "";
  if (url.includes('.html')) return url; // Já está formatado
  const match = url.match(/trello\.com\/b\/([a-zA-Z0-9]+)/);
  if (match && match[1]) {
    return `https://trello.com/b/${match[1]}.html`;
  }
  return url;
};

export default function ProjectsManager({
  unifiedWallet,
  selectedEntityId,
  setSelectedEntityId,
  selectedEntityType,
  setSelectedEntityType,
  selectedEntityData,
  setIsCaptacaoModalOpen,
  handleAutoDeploy,
  isProcessing,
  tasks,
  adHocDemand,
  setAdHocDemand,
  team,
  handleAddAdHocDemand,
  agencySubclients,
  handleDeleteSubclient,
  handleUpdateSubclientDemand,
  groupTasksByStage,
  isBulkMode,
  toggleTaskSelection,
  selectedTaskIds,
  setEditingTask,
  handleCompleteTask,
  isIdvService,
  showToast,
  handleStartTask,
  routingRules = [] 
}: ProjectsManagerProps) {

  const [isAdHocModalOpen, setIsAdHocModalOpen] = useState(false);
  const [isSubclientModalOpen, setIsSubclientModalOpen] = useState(false);
  const [isCreatingSubclient, setIsCreatingSubclient] = useState(false);
  const [subclientForm, setSubclientForm] = useState({ name: "", count: 0, trello_url: "" });

  // 🟢 ESTADOS DO MÓDULO TRELLO E SPLIT-SCREEN
  const [isTrelloModalOpen, setIsTrelloModalOpen] = useState(false);
  const [isTrelloInputOpen, setIsTrelloInputOpen] = useState(false);
  const [trelloUrlInput, setTrelloUrlInput] = useState("");
  const [isProcessingTrello, setIsProcessingTrello] = useState(false);
  const [activeTrelloEntity, setActiveTrelloEntity] = useState<any>(null);
  const [isTrelloSidebarOpen, setIsTrelloSidebarOpen] = useState(true); // Controle dos 20% do formulário

  const isSubclientView = selectedEntityType === 'subclient';
  const displayData = isSubclientView 
    ? agencySubclients.find(s => s.id === selectedEntityId) 
    : selectedEntityData;

  const hasTrello = Boolean(displayData?.trello_url);

  // =======================================================================
  // MAGIA DE ROTEAMENTO NO AD-HOC (Auto-Fill baseado nas regras salvas)
  // =======================================================================
  useEffect(() => {
    if ((isAdHocModalOpen || isTrelloModalOpen) && adHocDemand.taskType) {
      const currentProjectAnchorId = isSubclientView && displayData ? displayData.agency_id : selectedEntityId;
      const existingRule = routingRules.find(r => r.project_id === currentProjectAnchorId && r.task_type === adHocDemand.taskType);

      if (existingRule && adHocDemand.assigneeId !== existingRule.assignee_id) {
        setAdHocDemand({ ...adHocDemand, assigneeId: existingRule.assignee_id });
      }
    }
  }, [adHocDemand.taskType, isAdHocModalOpen, isTrelloModalOpen, selectedEntityId, isSubclientView, displayData]);

  // ==========================================
  // VINCULAR TRELLO DINAMICAMENTE
  // ==========================================
  const handleSaveTrelloUrl = async () => {
    if (!trelloUrlInput.trim()) return;
    setIsProcessingTrello(true);
    try {
      const table = isSubclientView ? 'agency_subclients' : 'agencies';
      const { error } = await supabase.from(table).update({ trello_url: trelloUrlInput }).eq('id', displayData.id);
      if (error) throw error;
      
      displayData.trello_url = trelloUrlInput;
      showToast("Quadro do Trello vinculado com sucesso!");
      setIsTrelloInputOpen(false);
      setTrelloUrlInput("");
    } catch (e) {
      showToast("Erro ao vincular Trello.");
    } finally {
      setIsProcessingTrello(false);
    }
  };

  // ==========================================
  // ADICIONAR DEMANDA PONTUAL (TELA PRINCIPAL)
  // ==========================================
  const executeAdHocSubmit = () => {
    if (!adHocDemand.title.trim() || !adHocDemand.assigneeId.trim()) {
      showToast("Preencha o título e selecione um executor obrigatoriamente.");
      return;
    }

    if (isSubclientView && displayData) {
      setAdHocDemand({
        ...adHocDemand,
        projectId: displayData.agency_id, 
        subclientId: displayData.id        
      });
    } else {
      setAdHocDemand({
        ...adHocDemand,
        projectId: selectedEntityType === 'project' || selectedEntityType === 'agency' ? selectedEntityId : "",
        subclientId: undefined
      });
    }

    setTimeout(() => {
      handleAddAdHocDemand();
      setIsAdHocModalOpen(false);
    }, 50);
  };

  // ==========================================
  // ADICIONAR DEMANDA PONTUAL (VIA TRELLO SPLIT-SCREEN)
  // Mantém a janela aberta e limpa o texto para envios múltiplos
  // ==========================================
  const executeTrelloAdHocSubmit = () => {
    if (!adHocDemand.title.trim() || !adHocDemand.assigneeId.trim()) {
      showToast("Preencha o título e o executor.");
      return;
    }

    const isSub = Boolean(activeTrelloEntity.agency_id);

    setAdHocDemand({
      ...adHocDemand,
      projectId: isSub ? activeTrelloEntity.agency_id : (activeTrelloEntity.client_id || activeTrelloEntity.id),
      subclientId: isSub ? activeTrelloEntity.id : undefined
    });

    setTimeout(() => {
      handleAddAdHocDemand();
      // UX Viciante: Limpa apenas os dados de texto para a próxima demanda, não fecha o Trello
      setAdHocDemand((prev: any) => ({ ...prev, title: "", description: "" }));
      showToast("✅ Demanda enviada ao estúdio!");
    }, 50);
  };

  const handleCreateSubclient = async () => {
    if (!subclientForm.name.trim()) {
      showToast("O nome da marca/cliente é obrigatório.");
      return;
    }
    
    setIsCreatingSubclient(true);
    try {
      const { error } = await supabase.from('agency_subclients').insert({
        agency_id: selectedEntityId,
        name: subclientForm.name,
        deliverables_count: subclientForm.count,
        trello_url: subclientForm.trello_url || null 
      });

      if (error) throw error;
      
      showToast("Perfil White-Label criado com sucesso!");
      setIsSubclientModalOpen(false);
      setSubclientForm({ name: "", count: 0, trello_url: "" });
      
      setTimeout(() => window.location.reload(), 1000);
    } catch(e) {
      showToast("Erro ao criar perfil de cliente delegado.");
    } finally {
      setIsCreatingSubclient(false);
    }
  };

  const getTasksForCurrentView = () => {
    if (isSubclientView && displayData) return tasks.filter(t => t.subclient_id === displayData.id);
    return tasks.filter(t => t.project_id === selectedEntityId && !t.subclient_id);
  };

  const visibleTasks = getTasksForCurrentView();

  return (
    <motion.div key="projects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden relative">
      
      {/* SIDEBAR UNIFICADA */}
      <div className="w-full lg:w-[320px] glass-panel bg-white/40 p-5 rounded-[2.5rem] border border-white shadow-sm flex flex-col h-[300px] lg:h-full shrink-0 transition-all hover:bg-white/50">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-4 px-2 block border-b border-[var(--color-atelier-grafite)]/10 pb-4">Carteira Unificada</span>
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
          {unifiedWallet.map(item => {
            const avatarUrl = item.avatar_url || item.profiles?.avatar_url || item.logo_url;
            return (
              <button 
                  key={`${item.type}-${item.id}`} 
                  onClick={() => { setSelectedEntityId(item.id); setSelectedEntityType(item.type as any); setIsTrelloInputOpen(false); }} 
                  className={`p-4 rounded-[1.2rem] text-left transition-all border ${selectedEntityId === item.id ? 'bg-white border-[var(--color-atelier-terracota)]/30 shadow-sm scale-[1.02]' : 'border-transparent hover:bg-white/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-inner border border-white/50 overflow-hidden shrink-0 ${item.type === 'agency' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-[var(--color-atelier-terracota)]'}`}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : item.type === 'agency' ? (
                      <Briefcase size={14}/>
                    ) : (
                      <span className="font-elegant text-[14px] leading-none uppercase">{item.name?.charAt(0) || "U"}</span>
                    )}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className={`font-roboto font-bold text-[13px] truncate transition-colors ${selectedEntityId === item.id ? 'text-[var(--color-atelier-grafite)]' : 'text-[var(--color-atelier-grafite)]/70'}`}>{item.name}</span>
                    <span className={`text-[9px] uppercase font-bold tracking-widest ${item.type === 'agency' ? 'text-blue-500' : 'text-[var(--color-atelier-terracota)]/80'}`}>{item.label}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* PAINEL DINÂMICO DE GESTÃO */}
      <div className="flex-1 glass-panel bg-white/80 p-8 flex flex-col rounded-[2.5rem] shadow-sm overflow-hidden h-full relative">
        {!selectedEntityId ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-40"><FolderKanban size={48} className="mb-4 text-[var(--color-atelier-terracota)]"/><p className="font-elegant text-3xl">Selecione um Cliente ou Agência</p></div>
        ) : (
          <>
            <button 
              onClick={() => setIsAdHocModalOpen(true)}
              className="absolute bottom-8 right-8 z-40 bg-[var(--color-atelier-grafite)] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.3)] hover:scale-110 hover:bg-[var(--color-atelier-terracota)] transition-all duration-300 group"
              title="Adicionar Demanda Pontual"
            >
              <PlusCircle size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>

            <div className="flex flex-col xl:flex-row justify-between xl:items-start gap-4 mb-6 shrink-0 border-b border-[var(--color-atelier-grafite)]/5 pb-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shadow-inner border border-white/50 overflow-hidden shrink-0 
                  ${selectedEntityType === 'agency' ? 'bg-blue-50 text-blue-600' : isSubclientView ? 'bg-indigo-50 text-indigo-500' : 'bg-gray-50 text-[var(--color-atelier-terracota)]'}
                `}>
                  {selectedEntityType === 'agency' ? (
                    displayData?.logo_url ? <img src={displayData.logo_url} className="w-full h-full object-cover" /> : <Briefcase size={28}/>
                  ) : isSubclientView ? (
                    <UserCircle2 size={28} />
                  ) : (
                    displayData?.profiles?.avatar_url ? <img src={displayData.profiles.avatar_url} className="w-full h-full object-cover" /> : <span className="font-elegant text-2xl uppercase">{displayData?.profiles?.nome?.charAt(0) || "W"}</span>
                  )}
                </div>
                <div>
                  <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] tracking-tight">
                    {selectedEntityType === 'agency' || isSubclientView ? displayData?.name : displayData?.profiles?.nome}
                  </h2>
                  <p className="text-[11px] font-bold text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest mt-1">
                    {selectedEntityType === 'agency' ? 'Operação White-Label (Agência)' : isSubclientView ? 'Subcliente Delegado (White-Label)' : displayData?.service_type}
                  </p>
                </div>
              </div>
              
              {/* BARRA DE AÇÕES INTELIGENTE */}
              <div className="flex gap-3 flex-wrap justify-end items-center">
                 
                 {(selectedEntityType === 'agency' || isSubclientView) && (
                   hasTrello ? (
                     <button 
                       onClick={() => { setActiveTrelloEntity(displayData); setIsTrelloSidebarOpen(true); setIsTrelloModalOpen(true); }} 
                       className="bg-[#0079BF] text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#026AA7] transition-all flex items-center gap-2 shadow-sm hover:-translate-y-0.5"
                     >
                       <Trello size={14} /> Abrir Trello Board
                     </button>
                   ) : (
                     isTrelloInputOpen ? (
                       <div className="flex items-center gap-2 bg-white pl-4 pr-2 py-1.5 rounded-xl shadow-sm border border-[var(--color-atelier-terracota)]/40 transition-all">
                         <Trello size={14} className="text-[#0079BF]" />
                         <input 
                           type="url" 
                           placeholder="Cole o Link Trello..." 
                           value={trelloUrlInput} 
                           onChange={(e) => setTrelloUrlInput(e.target.value)}
                           className="text-[11px] font-roboto font-medium outline-none w-40 text-[var(--color-atelier-grafite)] placeholder-gray-400 bg-transparent"
                           autoFocus
                         />
                         <button onClick={handleSaveTrelloUrl} disabled={isProcessingTrello} className="w-7 h-7 flex items-center justify-center bg-gray-50 rounded-lg text-[var(--color-atelier-terracota)] hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors">
                           {isProcessingTrello ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}
                         </button>
                         <button onClick={() => setIsTrelloInputOpen(false)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                           <X size={12}/>
                         </button>
                       </div>
                     ) : (
                       <button 
                         onClick={() => setIsTrelloInputOpen(true)}
                         className="bg-white text-[#0079BF] border border-[#0079BF]/20 px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#0079BF] hover:text-white transition-all flex items-center gap-2 shadow-sm hover:-translate-y-0.5"
                       >
                         <Trello size={14} /> Vincular Trello
                       </button>
                     )
                   )
                 )}

                 <button onClick={() => setIsCaptacaoModalOpen(true)} className="bg-[var(--color-atelier-grafite)] text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-sm hover:-translate-y-0.5">
                   <MapPin size={14} className="text-[var(--color-atelier-terracota)]"/> Agendar Captação
                 </button>
                 {(selectedEntityType === 'project' || isSubclientView) && (
                   <button 
                     onClick={() => {
                       const projectToDeploy = isSubclientView ? { id: displayData.agency_id } : displayData;
                       handleAutoDeploy(projectToDeploy, isSubclientView ? displayData.id : undefined);
                     }} 
                     disabled={isProcessing} 
                     className="bg-[var(--color-atelier-terracota)] text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#8c562e] transition-all flex items-center gap-2 shadow-sm hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                   >
                     {isProcessing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} 
                     {visibleTasks.length > 0 ? "Renovar Ciclo Mensal" : "Iniciar Produção"}
                   </button>
                 )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-16">
               {selectedEntityType === 'agency' ? (
                 <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_ease-out]">
                    <div className="flex justify-between items-center border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                      <h4 className="font-roboto font-bold text-[12px] uppercase tracking-widest text-gray-500">Perfis Sob Demanda</h4>
                      <button onClick={() => setIsSubclientModalOpen(true)} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-100 transition-colors shadow-sm border border-blue-100">
                        <PlusCircle size={14}/> Novo Perfil
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {agencySubclients.filter(s => s.agency_id === selectedEntityId).length === 0 ? (
                         <div className="col-span-1 md:col-span-2 text-center py-10 opacity-50">
                           <UserCircle2 size={32} className="mx-auto mb-2 text-gray-400" />
                           <span className="font-bold text-[12px] uppercase tracking-widest">Nenhum cliente cadastrado</span>
                         </div>
                       ) : (
                         agencySubclients.filter(s => s.agency_id === selectedEntityId).map(sub => (
                           <div key={sub.id} className="bg-white/80 p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 group hover:border-[var(--color-atelier-terracota)]/30 transition-all hover:bg-white relative overflow-hidden">
                              <div className="flex justify-between items-start z-10 relative">
                                 <span className="font-roboto font-bold text-[16px] text-[var(--color-atelier-grafite)] flex items-center gap-2">
                                   {sub.name}
                                   {sub.trello_url && <span title="Conectado ao Trello" className="flex items-center"><Trello size={14} className="text-[#0079BF]" /></span>}
                                 </span>
                                 <button onClick={() => handleDeleteSubclient(sub.id)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                              </div>
                              <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100 z-10 relative">
                                 <div className="flex-1">
                                    <span className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Carga Mensal (Posts)</span>
                                    <input 
                                      type="number" 
                                      defaultValue={sub.deliverables_count} 
                                      onBlur={(e) => handleUpdateSubclientDemand(sub.id, parseInt(e.target.value))}
                                      className="bg-transparent font-bold text-[18px] outline-none w-full text-blue-600" 
                                    />
                                 </div>
                                 <Save size={18} className="text-gray-300 hover:text-blue-500 transition-colors cursor-pointer"/>
                              </div>
                              
                              <button 
                                onClick={() => { setSelectedEntityId(sub.id); setSelectedEntityType('subclient'); }}
                                className="w-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-colors mt-2 flex items-center justify-center gap-2 relative z-10"
                              >
                                Gerir Este Cliente <ArrowRight size={14}/>
                              </button>
                           </div>
                         ))
                       )}
                    </div>
                 </div>
               ) : (
                 Object.keys(groupTasksByStage(visibleTasks)).map(stage => (
                    <div key={stage} className="mb-6 animate-[fadeIn_0.4s_ease-out]">
                      <h4 className="font-roboto font-bold text-[11px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-3 flex items-center gap-2 border-b border-[var(--color-atelier-grafite)]/5 pb-2"><Layers size={12}/> {stage}</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {visibleTasks.filter(t => t.stage === stage).map(task => {
                          const isSelected = selectedTaskIds.includes(task.id);
                          const executorName = task.profiles?.nome ? task.profiles.nome.split(" ")[0] : "Aguardando Responsável";

                          return (
                            <div 
                              key={task.id} 
                              onClick={() => isBulkMode ? toggleTaskSelection(task.id) : null}
                              className={`p-5 rounded-[1.2rem] border flex flex-col gap-3 transition-all group ${isBulkMode ? 'cursor-pointer hover:scale-[1.02]' : ''} ${isSelected ? 'bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)] shadow-sm' : 'bg-white/80 border-[var(--color-atelier-grafite)]/5 hover:border-[var(--color-atelier-terracota)]/30 hover:bg-white shadow-sm'}`}
                            >
                              <div className="flex justify-between items-start">
                                 <div className="flex gap-3">
                                   {isBulkMode && (
                                     <div className="shrink-0 text-[var(--color-atelier-terracota)] mt-0.5">
                                       {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-gray-300"/>}
                                     </div>
                                   )}
                                   <span className={`text-[13px] font-bold leading-tight pr-4 transition-colors group-hover:text-[var(--color-atelier-terracota)] ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-[var(--color-atelier-grafite)]'}`}>{task.title}</span>
                                 </div>
                                 {!isBulkMode && <button onClick={() => setEditingTask(task)} className="opacity-0 group-hover:opacity-100 text-[var(--color-atelier-grafite)]/30 hover:text-[var(--color-atelier-terracota)] transition-opacity"><Edit3 size={14}/></button>}
                              </div>
                              <div className="flex justify-between items-end border-t border-[var(--color-atelier-grafite)]/5 pt-3 mt-1">
                                 <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100 border border-white shadow-inner flex items-center justify-center text-xs font-bold text-gray-400">
                                      {task.profiles?.avatar_url ? <img src={task.profiles.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 size={10} className="text-gray-300"/>}
                                    </div>
                                    <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)]">
                                      {executorName}
                                    </span>
                                 </div>
                                 <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-[var(--color-atelier-grafite)]/40'}`}>
                                   {task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR') : 'Sem Prazo'}
                                 </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                 ))
               )}
            </div>
          </>
        )}
      </div>

      {/* ==========================================
          MODAL GERAL: AD HOC DEMAND (Para projetos diretos sem trello)
          ========================================== */}
      <AnimatePresence>
        {isAdHocModalOpen && !isTrelloModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 md:px-8 py-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdHocModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-white/20 flex flex-col gap-6"
            >
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-2 shrink-0">
                <div>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                    <Flame size={24} className="text-[var(--color-atelier-terracota)]"/> Demanda Pontual
                  </h3>
                  <p className="font-roboto text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Adicionar tarefa para: {displayData?.name || displayData?.profiles?.nome}
                  </p>
                </div>
                <button onClick={() => setIsAdHocModalOpen(false)} className="text-gray-400 hover:text-black transition-colors bg-gray-50 p-2 rounded-full"><X size={16}/></button>
              </div>
              
              <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 pb-2">
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Título da Tarefa <span className="text-red-500">*</span></span>
                  <input 
                    type="text" placeholder="Ex: Criar banner para o site..." 
                    value={adHocDemand.title} onChange={(e) => setAdHocDemand({...adHocDemand, title: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium transition-colors shadow-sm" 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Instruções / Descrição</span>
                  <textarea 
                    placeholder="Detalhes para o executor, links de referência, etc..." 
                    value={adHocDemand.description || ""} onChange={(e) => setAdHocDemand({...adHocDemand, description: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium resize-none h-24 custom-scrollbar transition-colors shadow-sm" 
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Escopo (Tag)</span>
                  <select 
                    value={adHocDemand.taskType} onChange={(e) => setAdHocDemand({...adHocDemand, taskType: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium cursor-pointer shadow-sm"
                  >
                    <option value="">Definir Escopo...</option>
                    {ALL_SKILLS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Para o Executor <span className="text-red-500">*</span></span>
                  <select 
                    value={adHocDemand.assigneeId} onChange={(e) => setAdHocDemand({...adHocDemand, assigneeId: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium cursor-pointer shadow-sm"
                  >
                    <option value="">Escolher Membro da Equipe...</option>
                    {team.map(t => {
                      const isRecommended = adHocDemand.taskType && t.skills?.includes(adHocDemand.taskType);
                      return <option key={t.id} value={t.id}>{t.nome} {isRecommended ? '⭐' : ''}</option>
                    })}
                  </select>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col gap-1.5 w-1/2">
                    <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Deadline</span>
                    <input type="datetime-local" value={adHocDemand.deadline} onChange={(e) => setAdHocDemand({...adHocDemand, deadline: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[12px] outline-none focus:border-orange-500 shadow-sm font-medium" />
                  </div>
                  <div className="flex flex-col gap-1.5 w-1/2">
                    <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Tempo Est. (Min)</span>
                    <input type="number" value={adHocDemand.estTime} onChange={(e) => setAdHocDemand({...adHocDemand, estTime: parseInt(e.target.value) || 0})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-orange-500 shadow-sm font-medium" />
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl bg-orange-50/50 border border-orange-100 hover:bg-orange-50 transition-colors mt-2">
                  <input type="checkbox" className="hidden" checked={adHocDemand.urgency || false} onChange={(e) => setAdHocDemand({...adHocDemand, urgency: e.target.checked})} />
                  <div className={`w-5 h-5 rounded flex items-center justify-center border ${adHocDemand.urgency ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-orange-200'}`}>
                    {adHocDemand.urgency && <Check size={12} strokeWidth={3}/>}
                  </div>
                  <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-orange-600 flex items-center gap-1">Classificar como Urgente</span>
                </label>
              </div>

              <button 
                onClick={executeAdHocSubmit} 
                disabled={isProcessing || !adHocDemand.title.trim() || !adHocDemand.assigneeId} 
                className="w-full bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-md hover:bg-[var(--color-atelier-terracota)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:-translate-y-0.5 disabled:hover:translate-y-0 shrink-0"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <PlusCircle size={16}/>} Despachar Tarefa
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          🟢 O MÁGICO MODAL TRELLO (SPLIT-SCREEN + LOGIN)
          ========================================== */}
      <AnimatePresence>
        {isTrelloModalOpen && activeTrelloEntity && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center px-4 md:px-10 py-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTrelloModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full h-full max-w-[1600px] bg-white rounded-[2.5rem] shadow-2xl relative z-10 flex overflow-hidden border border-white/20"
            >
              
              {/* LADO ESQUERDO: TRELLO IFRAME */}
              <motion.div 
                animate={{ width: isTrelloSidebarOpen ? '75%' : '100%' }} 
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                className="h-full flex flex-col bg-gray-50 border-r border-gray-200 shadow-inner"
              >
                {/* Header Nativo Trello */}
                <div className="bg-[#0079BF] px-5 py-3 flex items-center justify-between text-white shrink-0 z-20 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm shadow-inner">
                      <Trello size={20} /> 
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[14px] leading-none">{activeTrelloEntity.profiles?.nome || activeTrelloEntity.name}</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-white/70 mt-1">Ambiente Trello Nativo</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botão para Forçar Cookie/Login no Trello */}
                    <button 
                      onClick={() => window.open('https://trello.com/login', '_blank')} 
                      className="px-4 py-2 bg-yellow-400 text-yellow-900 hover:bg-yellow-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 border border-yellow-500/50 shadow-sm mr-2"
                      title="Clique aqui para fazer login no Trello numa nova aba caso o quadro não carregue."
                    >
                      <Lock size={14}/> Autorizar Acesso
                    </button>

                    <button onClick={() => window.open(activeTrelloEntity.trello_url, '_blank')} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 border border-white/10">
                      <ExternalLink size={14}/> Nova Aba
                    </button>
                    
                    <button 
                      onClick={() => setIsTrelloSidebarOpen(!isTrelloSidebarOpen)} 
                      className="px-4 py-2 bg-[var(--color-atelier-terracota)] hover:bg-[#8c562e] rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-inner border border-white/10"
                    >
                      {isTrelloSidebarOpen ? <PanelRightClose size={14}/> : <PanelRightOpen size={14}/>} {isTrelloSidebarOpen ? 'Ocultar Painel' : 'Nova Demanda'}
                    </button>
                    
                    <button onClick={() => setIsTrelloModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-red-500 transition-colors border border-white/10 ml-2">
                      <X size={18}/>
                    </button>
                  </div>
                </div>

                <div className="flex-1 w-full bg-white relative z-10">
                  <iframe src={getTrelloEmbedUrl(activeTrelloEntity.trello_url)} className="w-full h-full border-none" title="Trello Board Embedded" />
                </div>
              </motion.div>

              {/* LADO DIREITO: FORMULÁRIO DE DEMANDA RECOLHÍVEL (25%) */}
              <AnimatePresence initial={false}>
                {isTrelloSidebarOpen && (
                  <motion.div 
                    initial={{ width: 0, opacity: 0 }} 
                    animate={{ width: '25%', opacity: 1 }} 
                    exit={{ width: 0, opacity: 0 }} 
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    className="h-full bg-white flex flex-col shrink-0 overflow-hidden"
                  >
                    <div className="flex-1 flex flex-col h-full w-full min-w-[320px] overflow-y-auto custom-scrollbar p-6">
                      
                      <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 shrink-0">
                        <div>
                          <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                            <Flame size={24} className="text-[var(--color-atelier-terracota)]"/> Demanda Express
                          </h3>
                          <p className="font-roboto text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Integrado ao Atelier OS
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Título da Tarefa <span className="text-red-500">*</span></span>
                          <input 
                            type="text" placeholder="Ex: Criar banner para o site..." 
                            value={adHocDemand.title} onChange={(e) => setAdHocDemand({...adHocDemand, title: e.target.value})} 
                            className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium transition-colors shadow-sm" 
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Instruções / Descrição</span>
                          <textarea 
                            placeholder="Copie as infos do card do Trello e cole aqui..." 
                            value={adHocDemand.description || ""} onChange={(e) => setAdHocDemand({...adHocDemand, description: e.target.value})} 
                            className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium resize-none h-24 custom-scrollbar transition-colors shadow-sm" 
                          />
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Escopo (Tag)</span>
                          <select 
                            value={adHocDemand.taskType} onChange={(e) => setAdHocDemand({...adHocDemand, taskType: e.target.value})} 
                            className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium cursor-pointer shadow-sm"
                          >
                            <option value="">Definir Escopo...</option>
                            {ALL_SKILLS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Para o Executor <span className="text-red-500">*</span></span>
                          <select 
                            value={adHocDemand.assigneeId} onChange={(e) => setAdHocDemand({...adHocDemand, assigneeId: e.target.value})} 
                            className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium cursor-pointer shadow-sm"
                          >
                            <option value="">Escolher Membro da Equipe...</option>
                            {team.map(t => {
                              const isRecommended = adHocDemand.taskType && t.skills?.includes(adHocDemand.taskType);
                              return <option key={t.id} value={t.id}>{t.nome} {isRecommended ? '⭐' : ''}</option>
                            })}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Deadline Trello</span>
                          <input type="datetime-local" value={adHocDemand.deadline} onChange={(e) => setAdHocDemand({...adHocDemand, deadline: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[12px] outline-none focus:border-orange-500 shadow-sm font-medium" />
                        </div>
                      </div>

                      <button 
                        onClick={executeTrelloAdHocSubmit} 
                        disabled={isProcessing || !adHocDemand.title.trim() || !adHocDemand.assigneeId} 
                        className="w-full bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-md hover:bg-[var(--color-atelier-terracota)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6 hover:-translate-y-0.5 disabled:hover:translate-y-0 shrink-0"
                      >
                        {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <PlusCircle size={16}/>} Despachar Tarefa
                      </button>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MODAL: CRIAR PERFIL WHITE-LABEL (COM TRELLO)
          ========================================== */}
      <AnimatePresence>
        {isSubclientModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSubclientModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-blue-500/20 flex flex-col gap-6">
              
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div>
                  <h3 className="font-elegant text-3xl text-blue-600 flex items-center gap-2"><Briefcase size={24} /> Novo Perfil</h3>
                  <p className="font-roboto text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Cliente Delegado (White-Label)</p>
                </div>
                <button onClick={() => setIsSubclientModalOpen(false)} className="text-gray-400 hover:text-black transition-colors"><X size={20}/></button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Nome do Cliente/Marca <span className="text-red-500">*</span></span>
                  <input 
                    type="text" 
                    placeholder="Ex: Clínica Odonto..." 
                    value={subclientForm.name} 
                    onChange={(e) => setSubclientForm({...subclientForm, name: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-blue-500 text-[var(--color-atelier-grafite)] font-medium transition-colors" 
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Volume Mensal Contratado (Posts)</span>
                  <input 
                    type="number" 
                    placeholder="Ex: 12" 
                    value={subclientForm.count || ""} 
                    onChange={(e) => setSubclientForm({...subclientForm, count: parseInt(e.target.value) || 0})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-blue-500 text-[var(--color-atelier-grafite)] font-medium transition-colors" 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5">
                    <Trello size={12}/> Link do Quadro Trello (Opcional)
                  </span>
                  <input 
                    type="url" 
                    placeholder="https://trello.com/b/..." 
                    value={subclientForm.trello_url} 
                    onChange={(e) => setSubclientForm({...subclientForm, trello_url: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[#0079BF] focus:bg-[#0079BF]/5 text-[#0079BF] font-medium transition-colors placeholder:text-gray-400" 
                  />
                </div>
              </div>

              <button 
                onClick={handleCreateSubclient} 
                disabled={isCreatingSubclient || !subclientForm.name.trim()} 
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 hover:-translate-y-0.5 disabled:hover:translate-y-0"
              >
                {isCreatingSubclient ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Criar Perfil
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}