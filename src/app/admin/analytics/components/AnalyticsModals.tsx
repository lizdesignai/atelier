// src/app/admin/analytics/components/AnalyticsModals.tsx
import { motion, AnimatePresence } from "framer-motion";
import { 
  Edit3, CheckCircle2, Trash2, X, Loader2, Flame, 
  MapPin, Save, UserCircle2, Activity, FolderKanban, 
  CheckSquare, Square, Check, Target
} from "lucide-react";
import { ALL_SKILLS } from "../constants";

interface AnalyticsModalsProps {
  // Bulk Mode
  selectedTaskIds: string[];
  selectedRuleIds: string[];
  isBulkMode: boolean;
  setIsBulkMode: (val: boolean) => void;
  setSelectedTaskIds: (val: string[]) => void;
  setSelectedRuleIds: (val: string[]) => void;
  bulkModalOpen: boolean;
  setBulkModalOpen: (val: boolean) => void;
  bulkAssigneeId: string;
  setBulkAssigneeId: (val: string) => void;
  bulkDeadline: string;
  setBulkDeadline: (val: string) => void;
  handleBulkTaskUpdate: () => void;
  handleBulkTaskComplete: () => void;
  handleBulkTaskDelete: () => void;
  handleBulkRuleDelete: () => void;
  
  // Single Task Edit
  editingTask: any;
  setEditingTask: (task: any) => void;
  handleUpdateTask: () => void;

  // Collab X-Ray
  selectedCollab: any;
  setSelectedCollab: (collab: any) => void;
  activeTasksForQueue: any[];
  toggleTaskSelection: (id: string) => void;
  handleToggleSkill: (collabId: string, skillId: string) => void;

  // Captação
  isCaptacaoModalOpen: boolean;
  setIsCaptacaoModalOpen: (val: boolean) => void;
  captacaoForm: any;
  setCaptacaoForm: (form: any) => void;
  handleAddCaptacao: () => void;

  // Globais
  isProcessing: boolean;
  team: any[];
}

export default function AnalyticsModals({
  selectedTaskIds, selectedRuleIds, isBulkMode, setIsBulkMode,
  setSelectedTaskIds, setSelectedRuleIds, bulkModalOpen, setBulkModalOpen,
  bulkAssigneeId, setBulkAssigneeId, bulkDeadline, setBulkDeadline,
  handleBulkTaskUpdate, handleBulkTaskComplete, handleBulkTaskDelete, handleBulkRuleDelete,
  editingTask, setEditingTask, handleUpdateTask,
  selectedCollab, setSelectedCollab, activeTasksForQueue, toggleTaskSelection, handleToggleSkill,
  isCaptacaoModalOpen, setIsCaptacaoModalOpen, captacaoForm, setCaptacaoForm, handleAddCaptacao,
  isProcessing, team
}: AnalyticsModalsProps) {

  return (
    <>
      {/* FLOATING ACTION BAR PARA EDIÇÃO EM LOTE */}
      <AnimatePresence>
        {(selectedTaskIds.length > 0 || selectedRuleIds.length > 0) && (
          <motion.div
             initial={{ y: 100, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             exit={{ y: 100, opacity: 0 }}
             className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[var(--color-atelier-grafite)] text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 z-[150]"
          >
             <span className="font-bold text-[13px] bg-white/10 px-3 py-1 rounded-full whitespace-nowrap">
               {selectedTaskIds.length > 0 ? `${selectedTaskIds.length} Tarefas` : `${selectedRuleIds.length} Regras`}
             </span>

             {selectedTaskIds.length > 0 && (
                <>
                   <button onClick={() => setBulkModalOpen(true)} className="flex items-center gap-2 hover:text-[var(--color-atelier-terracota)] transition-colors text-[12px] uppercase tracking-widest font-bold whitespace-nowrap"><Edit3 size={14}/> Editar Lote</button>
                   <button onClick={handleBulkTaskComplete} className="flex items-center gap-2 hover:text-green-400 transition-colors text-[12px] uppercase tracking-widest font-bold whitespace-nowrap"><CheckCircle2 size={14}/> Concluir</button>
                   <button onClick={handleBulkTaskDelete} className="flex items-center gap-2 hover:text-red-400 transition-colors text-[12px] uppercase tracking-widest font-bold whitespace-nowrap"><Trash2 size={14}/> Apagar</button>
                </>
             )}

             {selectedRuleIds.length > 0 && (
                <button onClick={handleBulkRuleDelete} className="flex items-center gap-2 hover:text-red-400 transition-colors text-[12px] uppercase tracking-widest font-bold whitespace-nowrap"><Trash2 size={14}/> Apagar Regras</button>
             )}

             <div className="w-px h-6 bg-white/20"></div>
             
             <button onClick={() => { setSelectedTaskIds([]); setSelectedRuleIds([]); setIsBulkMode(false); }} className="hover:text-gray-300 transition-colors" title="Cancelar"><X size={18}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE EDIÇÃO EM LOTE DE TAREFAS */}
      <AnimatePresence>
        {bulkModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBulkModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-white/20 flex flex-col gap-5">
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Atualizar {selectedTaskIds.length} Tarefas</h3>
                <button onClick={() => setBulkModalOpen(false)} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)]"><X size={20}/></button>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Novo Responsável</span>
                <select value={bulkAssigneeId} onChange={(e) => setBulkAssigneeId(e.target.value)} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50">
                  <option value="">Manter Atuais</option>
                  <option value="unassigned">Ficar em Fila Neutra</option>
                  {team.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Novo Prazo Base (Deadline)</span>
                <input type="datetime-local" value={bulkDeadline} onChange={(e) => setBulkDeadline(e.target.value)} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50" />
                <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 mt-1 italic">Dica: Deixe em branco se desejar manter os prazos originais de cada tarefa.</span>
              </div>

              <button onClick={handleBulkTaskUpdate} disabled={isProcessing || (bulkAssigneeId === "" && bulkDeadline === "")} className="w-full mt-2 bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-md hover:bg-[var(--color-atelier-terracota)] transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Edit3 size={16}/>} Aplicar a Todos
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE EDIÇÃO DE TAREFA ÚNICA */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingTask(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-white/20 flex flex-col gap-5">
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div className="w-full pr-4">
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Modificar Missão</h3>
                  <input type="text" value={editingTask.title} onChange={(e) => setEditingTask({...editingTask, title: e.target.value})} className="w-full bg-transparent font-roboto text-[13px] font-bold text-[var(--color-atelier-grafite)]/80 outline-none mt-1 border-b border-transparent focus:border-[var(--color-atelier-terracota)]/40" />
                </div>
                <button onClick={() => setEditingTask(null)} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] shrink-0"><X size={20}/></button>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Responsável no JTBD</span>
                <select value={editingTask.assigned_to || ""} onChange={(e) => setEditingTask({...editingTask, assigned_to: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50">
                  <option value="">Ficar em Fila Neutra</option>
                  {team.map(t => {
                    const isRecommended = editingTask.task_type && t.skills?.includes(editingTask.task_type);
                    return <option key={t.id} value={t.id}>{t.nome} ({t.role}) {isRecommended ? '⭐' : ''}</option>
                  })}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Data de Entrega (Deadline)</span>
                <input type="datetime-local" value={new Date(editingTask.deadline).toISOString().slice(0, 16)} onChange={(e) => setEditingTask({...editingTask, deadline: new Date(e.target.value).toISOString()})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Instruções Técnicas</span>
                <textarea value={editingTask.description || ""} onChange={(e) => setEditingTask({...editingTask, description: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] resize-none h-24 outline-none focus:border-[var(--color-atelier-terracota)]/50 custom-scrollbar" placeholder="Instruções para a equipa..." />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-orange-50/50 border border-orange-100 hover:bg-orange-50 transition-colors">
                <input type="checkbox" className="hidden" checked={editingTask.urgency} onChange={(e) => setEditingTask({...editingTask, urgency: e.target.checked})} />
                <div className={`w-5 h-5 rounded flex items-center justify-center border ${editingTask.urgency ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-orange-200'}`}>{editingTask.urgency && <CheckCircle2 size={12} strokeWidth={3}/>}</div>
                <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-orange-600 flex items-center gap-1"><Flame size={12}/> Classificar como Granada (Urgente)</span>
              </label>
              <button onClick={handleUpdateTask} disabled={isProcessing} className="w-full mt-2 bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-md hover:bg-[var(--color-atelier-terracota)] transition-colors flex justify-center items-center gap-2">
                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Edit3 size={16}/>} Atualizar Missão
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: RAIO-X DO COLABORADOR */}
      <AnimatePresence>
        {selectedCollab && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedCollab(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[var(--color-atelier-creme)] p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-3xl border border-white/40 flex flex-col h-[85vh]">
              
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-6 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[var(--color-atelier-terracota)]/20 shadow-inner bg-white flex items-center justify-center text-[var(--color-atelier-terracota)] font-elegant text-3xl">
                    {selectedCollab.avatar_url ? <img src={selectedCollab.avatar_url} className="w-full h-full object-cover"/> : selectedCollab.nome.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none mb-1">{selectedCollab.nome}</h3>
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">{selectedCollab.role}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedCollab(null)} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] bg-white p-2 rounded-full shadow-sm"><X size={20}/></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 shrink-0">
                {(() => {
                  const myTasks = activeTasksForQueue.filter(t => t.assigned_to === selectedCollab.id);
                  const estHours = (myTasks.reduce((acc, t) => acc + (t.estimated_time || 0), 0) / 60).toFixed(1);
                  const activeClientsCount = new Set(myTasks.map(t => t.project_id)).size;
                  const inProgress = myTasks.filter(t => t.status === 'in_progress');
                  return (
                    <>
                      <div className="bg-white p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm text-center flex flex-col justify-center h-24">
                        <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] block mb-1">{estHours}h</span>
                        <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Carga Estimada</span>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm text-center flex flex-col justify-center h-24">
                        <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] block mb-1">{myTasks.length}</span>
                        <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Tarefas Filadas</span>
                      </div>
                      <div className="bg-[var(--color-atelier-terracota)]/5 border border-[var(--color-atelier-terracota)]/20 p-4 rounded-2xl shadow-sm text-center flex flex-col justify-center h-24">
                        <span className="font-elegant text-3xl text-[var(--color-atelier-terracota)] block mb-1">{activeClientsCount}</span>
                        <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)]">Projetos em Mãos</span>
                      </div>
                      
                      <div className="col-span-1 md:col-span-3 bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0"><Activity size={18}/></div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-blue-600/70 mb-0.5">Executando Agora</span>
                          <span className="font-roboto font-bold text-[14px] text-blue-900 truncate">
                            {inProgress.length > 0 ? inProgress[0].title : "Mesa limpa ou fora de turno."}
                          </span>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>

              <div className="mt-6 flex-1 bg-white rounded-[2rem] p-6 md:p-8 border border-[var(--color-atelier-grafite)]/5 shadow-sm flex flex-col min-h-0">
                <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-4 shrink-0 flex items-center gap-2"><FolderKanban size={14}/> Fila de Produção</h4>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
                  {activeTasksForQueue.filter(t => t.assigned_to === selectedCollab.id).map(task => {
                    const isSelected = selectedTaskIds.includes(task.id);
                    return (
                      <div 
                        key={task.id} 
                        onClick={() => isBulkMode ? toggleTaskSelection(task.id) : null}
                        className={`p-4 rounded-xl border flex justify-between items-center transition-colors group ${isBulkMode ? 'cursor-pointer' : ''} ${isSelected ? 'bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)] shadow-md' : 'bg-gray-50/50 border-[var(--color-atelier-grafite)]/10 hover:bg-white'}`}
                      >
                        <div className="flex items-center gap-3 w-full truncate pr-4">
                          {isBulkMode && (
                            <div className="shrink-0 text-[var(--color-atelier-terracota)]">
                              {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-gray-300"/>}
                            </div>
                          )}
                          <div className="flex flex-col truncate">
                            <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] truncate">{task.title}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">{task.projects?.profiles?.nome}</span>
                              <span className="text-[9px] text-[var(--color-atelier-grafite)]/20">•</span>
                              <span className={`text-[9px] uppercase font-bold tracking-widest ${new Date(task.deadline) < new Date() ? 'text-red-500' : 'text-[var(--color-atelier-terracota)]'}`}>
                                Vence: {new Date(task.deadline).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border shrink-0
                          ${task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm' : 'bg-white text-[var(--color-atelier-grafite)]/50'}
                        `}>
                          {task.status === 'in_progress' ? 'Em Foco' : 'Fila'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ÁREA DE COMPETÊNCIAS (TAGS) */}
              <div className="mt-6 pt-6 border-t border-[var(--color-atelier-grafite)]/10 shrink-0">
                <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-4 flex items-center gap-2"><Target size={14}/> Competências (Tags de Distribuição)</h4>
                <div className="flex flex-wrap gap-2">
                  {ALL_SKILLS.map(skill => {
                    const hasSkill = selectedCollab.skills?.includes(skill.id);
                    return (
                      <button 
                        key={skill.id}
                        onClick={() => handleToggleSkill(selectedCollab.id, skill.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border shadow-sm ${hasSkill ? 'bg-[var(--color-atelier-terracota)] text-white border-[var(--color-atelier-terracota)]' : 'bg-white border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/60 hover:border-[var(--color-atelier-terracota)]/50'}`}
                      >
                        {skill.label}
                      </button>
                    )
                  })}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: AGENDAR CAPTAÇÃO (LOGÍSTICA) */}
      <AnimatePresence>
        {isCaptacaoModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCaptacaoModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-white/20 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><MapPin size={24} className="text-[var(--color-atelier-terracota)]"/> Logística de Captação</h3>
                  <p className="font-roboto text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Agendar Captação de Campo</p>
                </div>
                <button onClick={() => setIsCaptacaoModalOpen(false)} className="text-gray-400 hover:text-black transition-colors"><X size={20}/></button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                   <span className="text-[9px] font-bold uppercase text-gray-400 ml-1">O que será captado?</span>
                   <input type="text" placeholder="Ex: Reels Coleção de Verão..." value={captacaoForm.title} onChange={(e)=>setCaptacaoForm({...captacaoForm, title: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-[14px] outline-none focus:border-[var(--color-atelier-terracota)]/30" />
                </div>

                <div className="flex flex-col gap-1">
                   <span className="text-[9px] font-bold uppercase text-gray-400 ml-1">Responsável pela Captação</span>
                   <select value={captacaoForm.assigneeId} onChange={(e)=>setCaptacaoForm({...captacaoForm, assigneeId: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-[13px] outline-none">
                     <option value="">Escolher Videomaker/Fotógrafo...</option>
                     {team.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold uppercase text-gray-400 ml-1">Data e Hora</span>
                      <input type="datetime-local" value={captacaoForm.date} onChange={(e)=>setCaptacaoForm({...captacaoForm, date: e.target.value})} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-[12px] outline-none" />
                   </div>
                   <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold uppercase text-gray-400 ml-1">Localização</span>
                      <input type="text" placeholder="Endereço ou Estúdio..." value={captacaoForm.location} onChange={(e)=>setCaptacaoForm({...captacaoForm, location: e.target.value})} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-[12px] outline-none" />
                   </div>
                </div>

                <textarea placeholder="Observações e lista de equipamentos..." value={captacaoForm.notes} onChange={(e)=>setCaptacaoForm({...captacaoForm, notes: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-[12px] h-24 resize-none outline-none focus:border-[var(--color-atelier-terracota)]/30" />
              </div>

              <button onClick={handleAddCaptacao} disabled={isProcessing || !captacaoForm.title || !captacaoForm.assigneeId || !captacaoForm.date} className="w-full bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[12px] shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Confirmar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}