// src/app/admin/analytics/views/ProjectsManager.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  FolderKanban, Briefcase, UserCircle2, MapPin, 
  Sparkles, Loader2, PlusCircle, Trash2, Save, 
  Layers, CheckSquare, Square, Flame, Edit3, Check, X, ArrowRight
} from "lucide-react";
import { ALL_SKILLS } from "../constants";

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
  adHocDemand: { title: string; projectId: string; assigneeId: string; taskType: string; urgency: boolean; subclientId?: string; description: string };
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
  
  // 🟢 INJEÇÃO: Passando o routingRules como prop para poder utilizá-lo no Auto-Fill do Modal
  routingRules?: any[]; 
}

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
  routingRules = [] // fallback vazio
}: ProjectsManagerProps) {

  const [isAdHocModalOpen, setIsAdHocModalOpen] = useState(false);
  const [isSubclientModalOpen, setIsSubclientModalOpen] = useState(false);
  const [isCreatingSubclient, setIsCreatingSubclient] = useState(false);
  const [subclientForm, setSubclientForm] = useState({ name: "", count: 0 });

  const isSubclientView = selectedEntityType === 'subclient';
  const displayData = isSubclientView 
    ? agencySubclients.find(s => s.id === selectedEntityId) 
    : selectedEntityData;

  // =======================================================================
  // 🟢 MAGIA DE ROTEAMENTO NO AD-HOC (Auto-Fill baseado nas regras salvas)
  // =======================================================================
  useEffect(() => {
    // Sempre que o "Escopo (Tag)" muda no formulário de Ad-Hoc, procuramos uma regra que corresponda a esse Projeto + Tag
    if (isAdHocModalOpen && adHocDemand.taskType) {
      
      const currentProjectAnchorId = isSubclientView && displayData ? displayData.agency_id : selectedEntityId;
      
      // Existe uma regra gravada para este Projeto/Agência e para esta Tag?
      const existingRule = routingRules.find(
        r => r.project_id === currentProjectAnchorId && r.task_type === adHocDemand.taskType
      );

      // Se sim, e o assign atual estiver vazio ou for diferente do roteamento, atualiza automaticamente
      if (existingRule && adHocDemand.assigneeId !== existingRule.assignee_id) {
        setAdHocDemand({ ...adHocDemand, assigneeId: existingRule.assignee_id });
        console.log(`[Routing Engine] Roteamento Automático aplicado: Executor preenchido.`);
      }
    }
  }, [adHocDemand.taskType, isAdHocModalOpen, selectedEntityId, isSubclientView, displayData]);

  // ==========================================
  // FUNÇÃO BLINDADA: ADICIONAR DEMANDA PONTUAL
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
        deliverables_count: subclientForm.count
      });

      if (error) throw error;
      
      showToast("Perfil White-Label criado com sucesso!");
      setIsSubclientModalOpen(false);
      setSubclientForm({ name: "", count: 0 });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch(e) {
      console.error(e);
      showToast("Erro ao criar perfil de cliente delegado.");
    } finally {
      setIsCreatingSubclient(false);
    }
  };

  const getTasksForCurrentView = () => {
    if (isSubclientView && displayData) {
      return tasks.filter(t => t.subclient_id === displayData.id);
    }
    return tasks.filter(t => t.project_id === selectedEntityId && !t.subclient_id);
  };

  const visibleTasks = getTasksForCurrentView();

  return (
    <motion.div key="projects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
      
      {/* SIDEBAR UNIFICADA */}
      <div className="w-full lg:w-[320px] glass-panel bg-white/40 p-5 rounded-[2.5rem] border border-white shadow-sm flex flex-col h-[300px] lg:h-full shrink-0 transition-all hover:bg-white/50">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-4 px-2 block border-b border-[var(--color-atelier-grafite)]/10 pb-4">Carteira Unificada</span>
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
          {unifiedWallet.map(item => {
            const avatarUrl = item.avatar_url || item.profiles?.avatar_url || item.logo_url;
            
            return (
              <button 
                  key={`${item.type}-${item.id}`} 
                  onClick={() => { setSelectedEntityId(item.id); setSelectedEntityType(item.type as any); }} 
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

            <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-4 mb-6 shrink-0">
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
              
              <div className="flex gap-3">
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
                                 <span className="font-roboto font-bold text-[16px] text-[var(--color-atelier-grafite)]">{sub.name}</span>
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
          MODAL DE DEMANDA PONTUAL (Com Descrição e Routing Automático)
          ========================================== */}
      <AnimatePresence>
        {isAdHocModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdHocModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-white/20 flex flex-col gap-6">
              
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><Flame size={24} className="text-[var(--color-atelier-terracota)]"/> Demanda Pontual</h3>
                  <p className="font-roboto text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Adicionar tarefa para: {displayData?.name || displayData?.profiles?.nome}</p>
                </div>
                <button onClick={() => setIsAdHocModalOpen(false)} className="text-gray-400 hover:text-black transition-colors"><X size={20}/></button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Título da Tarefa <span className="text-red-500">*</span></span>
                  <input 
                    type="text" 
                    placeholder="Ex: Criar banner para o site..." 
                    value={adHocDemand.title} 
                    onChange={(e) => setAdHocDemand({...adHocDemand, title: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium transition-colors" 
                  />
                </div>

                {/* CAMPO DE DESCRIÇÃO BLINDADO */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Instruções / Descrição</span>
                  <textarea 
                    placeholder="Detalhes para o executor, links de referência, etc..." 
                    value={adHocDemand.description || ""} 
                    onChange={(e) => setAdHocDemand({...adHocDemand, description: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium resize-none h-24 custom-scrollbar transition-colors" 
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Escopo (Tag)</span>
                  <select 
                    value={adHocDemand.taskType} 
                    onChange={(e) => setAdHocDemand({...adHocDemand, taskType: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium cursor-pointer"
                  >
                    <option value="">Definir Escopo...</option>
                    {ALL_SKILLS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Para o Executor <span className="text-red-500">*</span></span>
                  <select 
                    value={adHocDemand.assigneeId} 
                    onChange={(e) => setAdHocDemand({...adHocDemand, assigneeId: e.target.value})} 
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-grafite)] font-medium cursor-pointer"
                  >
                    <option value="">Escolher Membro da Equipe...</option>
                    {team.map(t => {
                      const isRecommended = adHocDemand.taskType && t.skills?.includes(adHocDemand.taskType);
                      return <option key={t.id} value={t.id}>{t.nome} {isRecommended ? '⭐' : ''}</option>
                    })}
                  </select>
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
                className="w-full bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-md hover:bg-[var(--color-atelier-terracota)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 hover:-translate-y-0.5 disabled:hover:translate-y-0"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <PlusCircle size={16}/>} Despachar Tarefa
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MODAL: CRIAR PERFIL WHITE-LABEL
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