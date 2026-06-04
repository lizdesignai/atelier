// src/app/admin/jtbd/components/TaskCard.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  Clock, Target, Activity, Flame, ArrowRight, 
  Loader2, PlayCircle, PauseCircle, ChevronRight, 
  CheckCircle2, X, Save, AlignLeft, Paperclip, UploadCloud, Eye, Image as ImageIcon 
} from "lucide-react";

interface TaskCardProps {
  task: any;
  isFocus?: boolean;
  isReview?: boolean;
  isCompleted?: boolean;
  isAdmin: boolean;
  onAction: (newStatus: string) => void;
  onReschedule: () => void;
  isRescheduling: boolean;
  onUpload?: (taskId: string, file: File) => Promise<void>; 
}

export default function TaskCard({ 
  task, 
  isFocus, 
  isReview, 
  isCompleted, 
  isAdmin, 
  onAction, 
  onReschedule, 
  isRescheduling,
  onUpload
}: TaskCardProps) {
  
  // Estados Locais para o Modal de Detalhes, Edição e Upload
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localDeadline, setLocalDeadline] = useState(task.deadline);
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);
  const [isUploading, setIsUploading] = useState(false); 

  // 🟢 BLINDAGEM SÊNIOR: Previne que tarefas "Sem Prazo" sejam marcadas como atrasadas falsamente (Date(null) = 1970)
  const isDelayed = !isCompleted && localDeadline && new Date(localDeadline) < new Date();
  const isBlockedClass = task.is_blocked && !isCompleted ? "opacity-60 cursor-not-allowed grayscale" : "cursor-grab active:cursor-grabbing";

  // Função interna para alterar o prazo (Apenas Admin)
  const handleUpdateDeadline = async () => {
    if (!isAdmin) return;
    setIsSavingDeadline(true);
    try {
      const { error } = await supabase.from('tasks').update({ deadline: localDeadline }).eq('id', task.id);
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Prazo atualizado com sucesso!" }));
      setIsModalOpen(false);
    } catch (e) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao atualizar prazo." }));
    } finally {
      setIsSavingDeadline(false);
    }
  };

  // Função interna para lidar com o ficheiro selecionado
  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    setIsUploading(true);
    try {
      await onUpload(task.id, file);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Material anexado com sucesso!" }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Falha ao enviar o arquivo." }));
    } finally {
      setIsUploading(false);
      // Limpa o input para permitir enviar o mesmo ficheiro novamente se houver falha
      e.target.value = '';
    }
  };

  return (
    <>
      {/* O CARTÃO DO KANBAN */}
      <motion.div 
        draggable={!task.is_blocked && !isCompleted}
        onDragStart={(e: any) => {
          if (task.is_blocked || isCompleted) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData("taskId", task.id);
        }}
        onClick={() => setIsModalOpen(true)}
        animate={isDelayed && !isFocus ? { boxShadow: ["0px 0px 0px rgba(239,68,68,0)", "0px 0px 15px rgba(239,68,68,0.4)", "0px 0px 0px rgba(239,68,68,0)"] } : {}}
        transition={isDelayed && !isFocus ? { repeat: Infinity, duration: 2 } : {}}
        className={`p-5 rounded-2xl flex flex-col gap-3 group transition-all relative overflow-hidden ${isBlockedClass}
          ${isCompleted ? 'bg-white/40 border border-[var(--color-atelier-grafite)]/10' : 'bg-white border border-[var(--color-atelier-grafite)]/5 shadow-[0_4px_12px_rgba(122,116,112,0.05)] hover:shadow-[0_8px_24px_rgba(122,116,112,0.1)] hover:border-[var(--color-atelier-terracota)]/30'}
          ${task.urgency && !isCompleted ? 'border-orange-300 ring-1 ring-orange-500/20' : ''}
          ${isDelayed && !isCompleted ? 'border-red-300' : ''}
        `}
      >
        {isFocus && <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>}
        {task.urgency && !isCompleted && !isFocus && <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>}

        <div className="flex justify-between items-start pointer-events-none">
          <div className="flex flex-col pr-4">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1 flex items-center gap-1">
              {task.projects?.type === 'Identidade Visual' ? <Target size={10}/> : <Activity size={10}/>}
              {task.projects?.profiles?.nome?.split(" ")[0]} • {task.stage}
            </span>
            <span className={`font-roboto font-bold text-[14px] leading-snug ${isCompleted ? 'text-[var(--color-atelier-grafite)]/40 line-through' : 'text-[var(--color-atelier-grafite)]'}`}>
              {task.title}
            </span>
          </div>
          {task.urgency && !isCompleted && <Flame size={16} className="text-orange-500 shrink-0 mt-1 animate-pulse" />}
        </div>

        {!isCompleted && (
          <div className="flex items-center justify-between border-t border-[var(--color-atelier-grafite)]/5 pt-4 mt-2">
            
            <div className="flex flex-col gap-1">
              <span className={`text-[10px] uppercase font-bold tracking-widest flex items-center gap-1 ${isDelayed ? 'text-red-500' : 'text-[var(--color-atelier-grafite)]/50'}`}>
                <Clock size={12}/> {task.deadline ? new Date(localDeadline).toLocaleDateString('pt-BR') : 'Sem Prazo'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[var(--color-atelier-grafite)]/30 uppercase font-bold tracking-widest bg-gray-50 px-2 py-0.5 rounded">Est: {task.estimated_time}m</span>
                
                {/* BOTAO REAGENDAR */}
                <button 
                  onClick={(e) => { e.stopPropagation(); onReschedule(); }}
                  disabled={isRescheduling}
                  className="text-[9px] uppercase font-bold tracking-widest text-blue-500 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer pointer-events-auto disabled:opacity-50"
                >
                  {isRescheduling ? <Loader2 size={10} className="animate-spin"/> : <ArrowRight size={10}/>} Adiar
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10 pointer-events-auto">
              {task.is_blocked ? (
                <span className="text-[9px] uppercase font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm" title="Aguardando fase anterior">Pendente</span>
              ) : (
                <>
                  {task.status === 'pending' && (
                    <button onClick={(e) => { e.stopPropagation(); onAction('in_progress'); }} className="bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white px-4 h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm flex items-center gap-2">
                      <PlayCircle size={14} /> Iniciar
                    </button>
                  )}

                  {isFocus && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); onAction('pending'); }} className="bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-200 w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm" title="Pausar">
                        <PauseCircle size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onAction('review'); }} className="bg-orange-500 border border-orange-600 text-white hover:bg-orange-600 px-4 h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_4px_10px_rgba(249,115,22,0.3)] hover:-translate-y-0.5 flex items-center gap-1">
                        Revisão <ChevronRight size={14}/>
                      </button>
                    </>
                  )}

                  {isReview && (
                    <>
                      {isAdmin ? (
                        <button onClick={(e) => { e.stopPropagation(); onAction('completed'); }} className="bg-green-500 border border-green-600 text-white hover:bg-green-600 px-4 h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_4px_10px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 flex items-center gap-1">
                          Concluir <CheckCircle2 size={14}/>
                        </button>
                      ) : (
                        <span className="bg-orange-50 border border-orange-200 text-orange-600 px-3 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold uppercase tracking-widest animate-pulse cursor-not-allowed">
                          Aguardando
                        </span>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        
        {isCompleted && (
          <div className="absolute right-[-15px] bottom-[-15px] opacity-10 pointer-events-none">
            <CheckCircle2 size={100} className="text-green-500" />
          </div>
        )}
      </motion.div>

      {/* =====================================================================
          MODAL DE DETALHES RÁPIDOS DA TAREFA (QUICK VIEW)
          ===================================================================== */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-lg border border-white/20 flex flex-col gap-6"
            >
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div className="pr-4">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)] mb-1 block">
                    {task.projects?.profiles?.nome} • {task.stage}
                  </span>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-tight">
                    {task.title}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] shrink-0 bg-gray-50 p-2 rounded-full"><X size={20}/></button>
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2">
                  <AlignLeft size={14}/> Briefing / Instruções
                </h4>
                <div className="bg-[var(--color-atelier-creme)]/30 p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/5 text-[13px] text-[var(--color-atelier-grafite)]/80 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                  {task.description ? task.description : <span className="italic text-gray-400">Nenhuma instrução detalhada fornecida para esta tarefa.</span>}
                </div>
              </div>

              {/* 🟢 MÓDULO DE UPLOAD E ANEXOS (Atualizado com Accept explícito para Imagens e Mídia) */}
              <div className="flex flex-col gap-3">
                <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2">
                  <ImageIcon size={14}/> Material Final (Imagens/Vídeos/PDF)
                </h4>
                
                {task.attachment_url ? (
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-sm transition-colors hover:border-[var(--color-atelier-terracota)]/30">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0">
                        <Paperclip size={16} />
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-[12px] font-bold text-[var(--color-atelier-grafite)] truncate">Entrega Final</span>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-gray-400 mt-0.5">Mídia anexada à tarefa</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pl-2">
                      <a 
                        href={task.attachment_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="w-9 h-9 flex items-center justify-center bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-200 rounded-xl text-gray-600 transition-all shadow-sm"
                        title="Visualizar Arquivo"
                      >
                        <Eye size={16} />
                      </a>
                      {/* Botão de substituição (apenas se não estiver concluída e houver a prop onUpload) */}
                      {!isCompleted && onUpload && (
                        <label className="w-9 h-9 flex items-center justify-center bg-orange-50 hover:bg-orange-100 border border-transparent hover:border-orange-200 rounded-xl text-orange-600 transition-all shadow-sm cursor-pointer" title="Substituir Arquivo">
                          <input 
                            type="file" 
                            accept="image/*,video/*,application/pdf" 
                            className="hidden" 
                            onChange={handleFileSelection} 
                            disabled={isUploading} 
                          />
                          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                        </label>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={`p-6 rounded-2xl border-2 border-dashed flex flex-col items-center gap-3 transition-colors text-center
                    ${(!isCompleted && onUpload) ? 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-[var(--color-atelier-terracota)]/50 cursor-pointer' : 'bg-gray-50 border-gray-100 opacity-60'}`}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={28} className="animate-spin text-[var(--color-atelier-terracota)]" />
                        <span className="font-bold uppercase tracking-widest text-[10px] text-[var(--color-atelier-terracota)] mt-1">Fazendo Upload Seguro...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={28} className="text-gray-300" />
                        <span className="font-bold uppercase tracking-widest text-[10px] text-gray-500">Área de Entrega de Peças</span>
                        {!isCompleted && onUpload ? (
                          <label className="mt-2 bg-white border border-gray-200 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:text-white hover:bg-[var(--color-atelier-terracota)] hover:border-transparent cursor-pointer shadow-sm transition-all">
                            {/* 🟢 Aceita explicitamente Imagens, Vídeos e PDFs */}
                            <input 
                              type="file" 
                              accept="image/*,video/*,application/pdf" 
                              className="hidden" 
                              onChange={handleFileSelection} 
                              disabled={isUploading} 
                            />
                            Anexar Imagem ou Material
                          </label>
                        ) : (
                          <span className="text-[10px] italic text-gray-400 max-w-[200px] mt-1">Nenhuma imagem anexada e a tarefa encontra-se encerrada.</span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ÁREA ADMINISTRATIVA: ALTERAÇÃO DE PRAZO */}
              {isAdmin && (
                <div className="mt-4 pt-6 border-t border-gray-100 flex flex-col gap-3">
                  <h4 className="font-roboto text-[10px] font-bold uppercase tracking-widest text-orange-500 flex items-center gap-2">
                    <Clock size={12}/> Ajuste de Prazo (Admin)
                  </h4>
                  <div className="flex items-center gap-3">
                    <input 
                      type="datetime-local" 
                      value={localDeadline ? new Date(localDeadline).toISOString().slice(0, 16) : ""} 
                      onChange={(e) => setLocalDeadline(e.target.value ? new Date(e.target.value).toISOString() : null)} 
                      className="flex-1 bg-white border border-gray-200 rounded-xl p-3 text-[13px] outline-none focus:border-orange-400 shadow-sm" 
                    />
                    <button 
                      onClick={handleUpdateDeadline} 
                      disabled={isSavingDeadline || localDeadline === task.deadline}
                      className="bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white px-5 h-[46px] rounded-xl text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                    >
                      {isSavingDeadline ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Atualizar
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}