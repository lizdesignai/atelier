// src/app/admin/analytics/views/ProjectsManager.tsx
import { motion } from "framer-motion";
import { 
  FolderKanban, Briefcase, UserCircle2, MapPin, 
  Sparkles, Loader2, PlusCircle, Trash2, Save, 
  Layers, CheckSquare, Square, Flame, Edit3, Check 
} from "lucide-react";
import { ALL_SKILLS } from "../constants";

interface ProjectsManagerProps {
  unifiedWallet: any[];
  selectedEntityId: string;
  setSelectedEntityId: (id: string) => void;
  selectedEntityType: 'project' | 'agency';
  setSelectedEntityType: (type: 'project' | 'agency') => void;
  selectedEntityData: any;
  setIsCaptacaoModalOpen: (isOpen: boolean) => void;
  handleAutoDeploy: (project: any) => void;
  isProcessing: boolean;
  tasks: any[];
  adHocDemand: { title: string; projectId: string; assigneeId: string; taskType: string; urgency: boolean };
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
  handleStartTask
}: ProjectsManagerProps) {

  return (
    <motion.div key="projects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
      
      {/* SIDEBAR UNIFICADA (70/30 Contextual) */}
      <div className="w-full lg:w-[320px] glass-panel bg-white/40 p-5 rounded-[2rem] border border-white shadow-sm flex flex-col h-[300px] lg:h-full shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-4 px-2 block border-b border-[var(--color-atelier-grafite)]/10 pb-4">Carteira Unificada</span>
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
          {unifiedWallet.map(item => (
            <button 
                key={`${item.type}-${item.id}`} 
                onClick={() => { setSelectedEntityId(item.id); setSelectedEntityType(item.type as any); }} 
                className={`p-4 rounded-xl text-left transition-all border ${selectedEntityId === item.id ? 'bg-white border-[var(--color-atelier-terracota)]/30 shadow-md' : 'border-transparent hover:bg-white/50'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === 'agency' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-[var(--color-atelier-terracota)]'}`}>
                  {item.type === 'agency' ? <Briefcase size={14}/> : <UserCircle2 size={14}/>}
                </div>
                <div className="flex flex-col truncate">
                  <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] truncate">{item.name}</span>
                  <span className={`text-[9px] uppercase font-bold ${item.type === 'agency' ? 'text-blue-500' : 'text-[var(--color-atelier-terracota)]'}`}>{item.label}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* PAINEL DINÂMICO DE GESTÃO */}
      <div className="flex-1 glass-panel bg-white/80 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-full">
        {!selectedEntityId ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-40"><FolderKanban size={48} className="mb-4 text-[var(--color-atelier-terracota)]"/><p className="font-elegant text-3xl">Selecione um Cliente ou Agência</p></div>
        ) : (
          <>
            <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-4 mb-6 shrink-0">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${selectedEntityType === 'agency' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-[var(--color-atelier-terracota)]'}`}>
                  {selectedEntityType === 'agency' ? <Briefcase size={28}/> : <span className="font-elegant text-2xl">{selectedEntityData?.profiles?.nome?.charAt(0) || "W"}</span>}
                </div>
                <div>
                  <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{selectedEntityType === 'agency' ? selectedEntityData?.name : selectedEntityData?.profiles?.nome}</h2>
                  <p className="text-[11px] font-bold text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest mt-1">{selectedEntityType === 'agency' ? 'Operação White-Label' : selectedEntityData?.service_type}</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                 <button onClick={() => setIsCaptacaoModalOpen(true)} className="bg-[var(--color-atelier-grafite)] text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg">
                   <MapPin size={14} className="text-[var(--color-atelier-terracota)]"/> Agendar Captação
                 </button>
                 {selectedEntityType === 'project' && (
                   <button onClick={() => handleAutoDeploy(selectedEntityData)} disabled={isProcessing} className="bg-[var(--color-atelier-terracota)] text-white px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#8c562e] transition-all flex items-center gap-2">
                     {isProcessing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} 
                     {tasks.filter(t => t.project_id === selectedEntityData.id).length > 0 ? "Renovar Ciclo Mensal" : "Instanciar Produção"}
                   </button>
                 )}
              </div>
            </div>

            <div className="bg-[var(--color-atelier-grafite)] p-6 rounded-[2rem] mb-8 flex flex-col md:flex-row items-end gap-4 shadow-xl relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
              
              <div className="flex flex-col gap-2 flex-1 relative z-10 w-full">
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/50 ml-1">Injetar Demanda Puntual</span>
                <input type="text" placeholder="Título da tarefa urgente..." value={adHocDemand.title} onChange={(e) => setAdHocDemand({...adHocDemand, title: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white text-[13px] outline-none focus:border-[var(--color-atelier-terracota)] transition-colors" />
              </div>
              
              <div className="flex flex-col gap-2 w-full md:w-48 relative z-10">
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/50 ml-1">Tag (Domínio)</span>
                <select value={adHocDemand.taskType} onChange={(e) => setAdHocDemand({...adHocDemand, taskType: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white text-[12px] outline-none">
                  <option value="" className="text-black">Definir Escopo...</option>
                  {ALL_SKILLS.map(s => <option key={s.id} value={s.id} className="text-black">{s.label}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2 w-full md:w-56 relative z-10">
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/50 ml-1">Para o Executor</span>
                <select value={adHocDemand.assigneeId} onChange={(e) => setAdHocDemand({...adHocDemand, assigneeId: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white text-[12px] outline-none">
                  <option value="" className="text-black">Escolher...</option>
                  {team.map(t => {
                    const isRecommended = adHocDemand.taskType && t.skills?.includes(adHocDemand.taskType);
                    return <option key={t.id} value={t.id} className="text-black">{t.nome} {isRecommended ? '⭐' : ''}</option>
                  })}
                </select>
              </div>

              <button onClick={handleAddAdHocDemand} disabled={isProcessing || !adHocDemand.title || !adHocDemand.assigneeId} className="bg-[var(--color-atelier-terracota)] text-white w-full md:w-14 h-[46px] rounded-xl flex items-center justify-center hover:bg-white hover:text-[var(--color-atelier-grafite)] transition-all shrink-0">
                {isProcessing ? <Loader2 className="animate-spin" size={20}/> : <PlusCircle size={20}/>}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
               {selectedEntityType === 'agency' ? (
                 <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_ease-out]">
                    <div className="flex justify-between items-center border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                      <h4 className="font-roboto font-bold text-[12px] uppercase tracking-widest text-gray-500">Perfis Sob Demanda</h4>
                      <button onClick={() => showToast("Adicionar novo perfil em breve...")} className="text-[10px] font-bold text-[var(--color-atelier-terracota)] flex items-center gap-1 hover:underline"><PlusCircle size={14}/> Novo Perfil</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {agencySubclients.filter(s => s.agency_id === selectedEntityId).map(sub => (
                         <div key={sub.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 group hover:border-[var(--color-atelier-terracota)]/30 transition-all">
                            <div className="flex justify-between items-start">
                               <span className="font-roboto font-bold text-[15px] text-[var(--color-atelier-grafite)]">{sub.name}</span>
                               <button onClick={() => handleDeleteSubclient(sub.id)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                            </div>
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                               <div className="flex-1">
                                  <span className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Carga Mensal (Posts)</span>
                                  <input 
                                    type="number" 
                                    defaultValue={sub.deliverables_count} 
                                    onBlur={(e) => handleUpdateSubclientDemand(sub.id, parseInt(e.target.value))}
                                    className="bg-transparent font-bold text-[18px] outline-none w-full text-[var(--color-atelier-terracota)]" 
                                  />
                               </div>
                               <Save size={18} className="text-gray-300 group-hover:text-[var(--color-atelier-terracota)] transition-colors"/>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               ) : (
                 Object.keys(groupTasksByStage(tasks.filter(t => t.project_id === selectedEntityId))).map(stage => (
                    <div key={stage} className="mb-6">
                      <h4 className="font-roboto font-bold text-[11px] uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2 border-b border-[var(--color-atelier-grafite)]/5 pb-2"><Layers size={12}/> {stage}</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {tasks.filter(t => t.project_id === selectedEntityId && t.stage === stage).map(task => {
                          const isSelected = selectedTaskIds.includes(task.id);
                          return (
                            <div 
                              key={task.id} 
                              onClick={() => isBulkMode ? toggleTaskSelection(task.id) : null}
                              className={`p-5 rounded-2xl border flex flex-col gap-3 transition-colors group ${isBulkMode ? 'cursor-pointer' : ''} ${isSelected ? 'bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)] shadow-md' : 'bg-white border-[var(--color-atelier-grafite)]/5 hover:border-[var(--color-atelier-terracota)]/30 shadow-sm'}`}
                            >
                              <div className="flex justify-between items-start">
                                 <div className="flex gap-3">
                                   {isBulkMode && (
                                     <div className="shrink-0 text-[var(--color-atelier-terracota)] mt-0.5">
                                       {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-gray-300"/>}
                                     </div>
                                   )}
                                   <span className={`text-[13px] font-bold leading-tight pr-4 ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-[var(--color-atelier-grafite)]'}`}>{task.title}</span>
                                 </div>
                                 {!isBulkMode && <button onClick={() => setEditingTask(task)} className="opacity-0 group-hover:opacity-100 text-[var(--color-atelier-grafite)]/30 hover:text-[var(--color-atelier-terracota)] transition-opacity"><Edit3 size={14}/></button>}
                              </div>
                              <div className="flex justify-between items-end border-t border-[var(--color-atelier-grafite)]/5 pt-3 mt-1">
                                 <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-100 border border-white">
                                      {task.profiles?.avatar_url ? <img src={task.profiles.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 size={10} className="text-gray-300"/>}
                                    </div>
                                    <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)]">{task.profiles?.nome?.split(" ")[0] || "A definir"}</span>
                                 </div>
                                 <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)]/40 bg-gray-50 px-2 py-1 rounded-md">{new Date(task.deadline).toLocaleDateString('pt-BR')}</span>
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
    </motion.div>
  );
}