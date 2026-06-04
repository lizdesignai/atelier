// src/app/admin/jtbd/components/TaskCard.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  Clock, Target, Activity, Flame, ArrowRight, 
  Loader2, PlayCircle, PauseCircle, ChevronRight, 
  CheckCircle2, X, Save, AlignLeft, Paperclip, UploadCloud, Eye, Image as ImageIcon, ZoomIn, RotateCcw, MessageSquare, Send 
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
  forceStaticMode?: boolean; 
  forceOpenModal?: boolean;
  onCloseModal?: () => void;
  onRevert?: (taskId: string) => void; 
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
  onUpload,
  forceStaticMode, 
  forceOpenModal,  
  onCloseModal,
  onRevert 
}: TaskCardProps) {
  
  // ==========================================
  // ESTADOS LOCAIS
  // ==========================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localDeadline, setLocalDeadline] = useState(task.deadline);
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);
  const [isUploading, setIsUploading] = useState(false); 
  const [relatedPost, setRelatedPost] = useState<any>(null); 
  
  // LIGHTBOX & REVISÃO DO GESTOR
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isAdminReviewing, setIsAdminReviewing] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState("");
  const [isProcessingFeedback, setIsProcessingFeedback] = useState(false);

  const isEffectivelyModalOpen = isModalOpen || forceOpenModal;
  const isDelayed = !isCompleted && localDeadline && new Date(localDeadline) < new Date();

  // Busca a imagem do social_post para ser a "Capa do Card" se o Kanban ainda não a tiver nativamente
  useEffect(() => {
    if (task.id && !task.attachment_url) {
      const fetchRelatedPost = async () => {
        try {
          const { data } = await supabase
            .from('social_posts')
            .select('image_url, status')
            .eq('task_id', task.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) setRelatedPost(data);
        } catch (e) {
          console.error("Erro ao buscar post relacionado", e);
        }
      };
      fetchRelatedPost();
    }
  }, [task.id, task.attachment_url]);

  const displayImageUrl = task.attachment_url || relatedPost?.image_url;
  const isRejectedByClient = relatedPost?.status === 'needs_revision';

  // ==========================================
  // MOTORES DE AÇÃO INTERNA
  // ==========================================
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsAdminReviewing(false);
    if (onCloseModal) onCloseModal();
  };

  const handleUpdateDeadline = async () => {
    if (!isAdmin) return;
    setIsSavingDeadline(true);
    try {
      const { error } = await supabase.from('tasks').update({ deadline: localDeadline }).eq('id', task.id);
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Prazo atualizado com sucesso!" }));
      handleCloseModal(); 
    } catch (e) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao atualizar prazo." }));
    } finally {
      setIsSavingDeadline(false);
    }
  };

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    setIsUploading(true);
    try {
      await onUpload(task.id, file);
    } catch (error) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Falha ao enviar o arquivo." }));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleReturnToReview = async () => {
    if (!onRevert) {
      // Caso onRevert não exista, usa onAction como fallback para voltar a revisão
      onAction('review');
      handleCloseModal();
      return;
    }
    try {
      await supabase.from('social_posts').update({ status: 'internal_review' }).eq('task_id', task.id);
      await supabase.from('tasks').update({ status: 'review' }).eq('id', task.id);
      if (relatedPost) setRelatedPost({ ...relatedPost, status: 'internal_review' });
      
      onRevert(task.id);
      handleCloseModal();
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Tarefa devolvida para Revisão Interna." }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao retornar tarefa." }));
    }
  };

  const handleAdminFeedbackSubmit = async () => {
    if (!adminFeedback.trim()) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Por favor, insira um comentário para orientar o colaborador." }));
      return;
    }
    setIsProcessingFeedback(true);
    try {
      const newDesc = task.description 
        ? `${task.description}\n\n🚨 AJUSTE SOLICITADO PELA GESTÃO:\n${adminFeedback}` 
        : `🚨 AJUSTE SOLICITADO PELA GESTÃO:\n${adminFeedback}`;

      await supabase.from('tasks').update({ 
        description: newDesc, 
        admin_feedback: adminFeedback,
        status: 'in_progress' 
      }).eq('id', task.id);

      if (displayImageUrl) {
        await supabase.from('social_posts').update({ status: 'internal_review' }).eq('task_id', task.id);
      }

      window.dispatchEvent(new CustomEvent("showToast", { detail: "Feedback enviado! Tarefa retornou para 'Em Andamento'." }));
      onAction('in_progress'); 
      handleCloseModal();
    } catch (error) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao enviar feedback interno." }));
    } finally {
      setIsProcessingFeedback(false);
    }
  };

  return (
    <>
      {/* =====================================================================
          O CARTÃO DO KANBAN (MINIATURA ESTÁTICA OU ARRASTÁVEL)
          ===================================================================== */}
      <motion.div 
        draggable={!task.is_blocked && !isCompleted && !forceStaticMode}
        onDragStart={(e: any) => {
          if (task.is_blocked || isCompleted || forceStaticMode) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData("taskId", task.id);
        }}
        onClick={() => {
          if (!forceStaticMode) setIsModalOpen(true);
        }}
        animate={isDelayed && !isFocus && !forceStaticMode ? { boxShadow: ["0px 0px 0px rgba(239,68,68,0)", "0px 0px 15px rgba(239,68,68,0.4)", "0px 0px 0px rgba(239,68,68,0)"] } : {}}
        transition={isDelayed && !isFocus && !forceStaticMode ? { repeat: Infinity, duration: 2 } : {}}
        className={`w-full rounded-[1.4rem] flex flex-col group transition-all relative overflow-hidden
          ${forceStaticMode ? 'cursor-pointer hover:shadow-md' : (task.is_blocked && !isCompleted ? "opacity-60 cursor-not-allowed grayscale" : "cursor-grab active:cursor-grabbing")}
          ${isCompleted ? 'bg-white/40 border border-[var(--color-atelier-grafite)]/10' : 'bg-white border border-[var(--color-atelier-grafite)]/5 shadow-[0_4px_12px_rgba(122,116,112,0.05)]'}
          ${task.urgency && !isCompleted ? 'border-orange-300 ring-1 ring-orange-500/20' : ''}
          ${isDelayed && !isCompleted ? 'border-red-300' : ''}
        `}
      >
        {isFocus && <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-20"></div>}
        {task.urgency && !isCompleted && !isFocus && <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 z-20"></div>}

        {/* 🟢 COVER VISUAL ESTILO TRELLO UNIFICADO */}
        {displayImageUrl && (
          <div className="w-full h-36 relative bg-gray-100 border-b border-[var(--color-atelier-grafite)]/10 shrink-0 overflow-hidden pointer-events-none">
            <img src={displayImageUrl} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-95" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
            
            {/* Badges Overlay */}
            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
               <span className="bg-white/95 backdrop-blur-sm text-[var(--color-atelier-grafite)] px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest shadow-sm flex items-center gap-1.5">
                 <ImageIcon size={12} /> Prévia
               </span>
               {isReview && <span className="bg-purple-500 text-white px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest shadow-sm border border-purple-400">Em Revisão</span>}
               {isRejectedByClient && <span className="bg-red-500 text-white px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest shadow-sm border border-red-400 animate-pulse">Ajuste Exigido</span>}
            </div>
          </div>
        )}

        <div className="p-5 flex flex-col gap-3">
          <div className="flex justify-between items-start pointer-events-none relative z-10">
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
            <div className="flex items-center justify-between border-t border-[var(--color-atelier-grafite)]/5 pt-4 mt-1">
              <div className="flex flex-col gap-1">
                <span className={`text-[10px] uppercase font-bold tracking-widest flex items-center gap-1 ${isDelayed ? 'text-red-500' : 'text-[var(--color-atelier-grafite)]/50'}`}>
                  <Clock size={12}/> {task.deadline ? new Date(localDeadline).toLocaleDateString('pt-BR') : 'Sem Prazo'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[var(--color-atelier-grafite)]/30 uppercase font-bold tracking-widest bg-gray-50 px-2 py-0.5 rounded">Est: {task.estimated_time}m</span>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); onReschedule(); }}
                    disabled={isRescheduling}
                    className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded transition-colors flex items-center gap-1 text-blue-500 hover:bg-blue-50 cursor-pointer pointer-events-auto disabled:opacity-50`}
                  >
                    {isRescheduling ? <Loader2 size={10} className="animate-spin"/> : <ArrowRight size={10}/>} Adiar
                  </button>
                </div>
              </div>

              {/* 🟢 ZONA DE BOTÕES REATIVADA (pointer-events-auto garante o clique no Kanban) */}
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
                            Aprovar <CheckCircle2 size={14}/>
                          </button>
                        ) : (
                          <span className={`px-3 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold uppercase tracking-widest cursor-not-allowed ${isRejectedByClient ? 'bg-red-50 border border-red-200 text-red-600 animate-pulse' : 'bg-orange-50 border border-orange-200 text-orange-600 animate-pulse'}`}>
                            {isRejectedByClient ? 'Ajuste Exigido' : 'Aguardando'}
                          </span>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Opção rápida de Reverter na própria capa se estiver Concluída (apenas Admin) */}
          {isCompleted && isAdmin && (
             <div className="flex items-center justify-end border-t border-[var(--color-atelier-grafite)]/5 pt-3 mt-1 relative z-10 pointer-events-auto">
               <button onClick={(e) => { e.stopPropagation(); handleReturnToReview(); }} className="bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white px-3 h-8 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors shadow-sm flex items-center gap-2">
                 <RotateCcw size={12} /> Reverter
               </button>
             </div>
          )}
        </div>
      </motion.div>

      {/* =====================================================================
          MODAL DE DETALHES RÁPIDOS DA TAREFA E VISUALIZADOR DE ARTE
          ===================================================================== */}
      <AnimatePresence>
        {isEffectivelyModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={handleCloseModal} 
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-lg border border-white/20 flex flex-col gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4 shrink-0">
                <div className="pr-4">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)] mb-1 block">
                    {task.projects?.profiles?.nome} • {task.stage}
                  </span>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-tight">
                    {task.title}
                  </h3>
                </div>
                <button onClick={handleCloseModal} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] shrink-0 bg-gray-50 p-2 rounded-full transition-colors"><X size={20}/></button>
              </div>

              <div className="flex flex-col gap-3 shrink-0">
                <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2">
                  <AlignLeft size={14}/> Briefing / Instruções
                </h4>
                <div className="bg-[var(--color-atelier-creme)]/30 p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/5 text-[13px] text-[var(--color-atelier-grafite)]/80 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                  {task.description ? task.description : <span className="italic text-gray-400">Nenhuma instrução detalhada fornecida para esta tarefa.</span>}
                </div>
              </div>

              {/* EXIBIÇÃO RENDERIZADA DA IMAGEM E UPLOAD */}
              <div className="flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2">
                    <ImageIcon size={14}/> Material Final (Arte Visual)
                  </h4>
                  
                  {isRejectedByClient && (
                    <div className="flex items-center gap-2">
                      <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">Recusado pelo Cliente</span>
                      <button 
                        onClick={handleReturnToReview}
                        className="bg-gray-100 text-[var(--color-atelier-grafite)] hover:bg-orange-500 hover:text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <RotateCcw size={10} /> Retornar p/ Revisão
                      </button>
                    </div>
                  )}
                </div>
                
                {displayImageUrl ? (
                  <div className="flex flex-col gap-3">
                    <div 
                      className={`w-full h-48 sm:h-56 rounded-[1.5rem] overflow-hidden border border-gray-200 shadow-sm relative group cursor-pointer bg-gray-100 ${isRejectedByClient ? 'border-red-300 ring-2 ring-red-500/20' : ''}`}
                      onClick={() => setIsLightboxOpen(true)}
                    >
                      <img src={displayImageUrl} alt="Arte Anexada" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="bg-white/95 backdrop-blur-md px-5 py-3 rounded-full text-[var(--color-atelier-grafite)] opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl transform translate-y-4 group-hover:translate-y-0 flex items-center gap-2">
                           <ZoomIn size={18} /> <span className="text-[10px] font-bold uppercase tracking-widest">Expandir Arte</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-200 shadow-sm transition-colors hover:border-[var(--color-atelier-terracota)]/30">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0">
                          <Paperclip size={16} />
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-[12px] font-bold text-[var(--color-atelier-grafite)] truncate">Mídia Anexada</span>
                          <span className="text-[9px] uppercase font-bold tracking-widest text-green-600 mt-0.5 flex items-center gap-1"><CheckCircle2 size={10}/> Vinculada ao Fluxo</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0 pl-2">
                        {onUpload && (
                          <label className="flex items-center justify-center gap-2 h-9 px-4 bg-orange-50 hover:bg-orange-100 border border-transparent hover:border-orange-200 rounded-xl text-orange-600 transition-all shadow-sm cursor-pointer" title="Substituir Arquivo">
                            <input 
                              type="file" 
                              accept="image/*,video/*,application/pdf" 
                              className="hidden" 
                              onChange={handleFileSelection} 
                              disabled={isUploading} 
                            />
                            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                            <span className="font-bold text-[10px] uppercase tracking-widest hidden sm:block">Substituir</span>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* 🟢 REVISÃO INTERNA (GESTÃO / ADMIN) */}
                    {isAdmin && isReview && !isCompleted && (
                      <div className="border-t border-gray-100 pt-4 mt-2">
                         {!isAdminReviewing ? (
                           <div className="flex gap-3">
                             <button onClick={() => setIsAdminReviewing(true)} className="flex-1 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2">
                               <MessageSquare size={14} /> Solicitar Ajuste
                             </button>
                             <button onClick={() => { onAction('completed'); handleCloseModal(); }} className="flex-1 bg-green-500 text-white hover:bg-green-600 py-3.5 rounded-xl font-bold uppercase tracking-[0.1em] transition-all shadow-md flex items-center justify-center gap-2 hover:-translate-y-0.5">
                               <CheckCircle2 size={14} /> Aprovar Arte
                             </button>
                           </div>
                         ) : (
                           <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col gap-3 bg-red-50/50 p-4 rounded-2xl border border-red-100">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-1.5"><RotateCcw size={12}/> Feedback</span>
                             <textarea 
                               placeholder="Detalhe o que precisa ser alterado nesta arte..." 
                               value={adminFeedback}
                               onChange={(e) => setAdminFeedback(e.target.value)}
                               className="w-full bg-white border border-red-100 focus:border-red-300 rounded-xl p-3 text-[13px] font-medium outline-none resize-none h-24 shadow-sm custom-scrollbar"
                             />
                             <div className="flex gap-2 justify-end mt-1">
                               <button onClick={() => setIsAdminReviewing(false)} className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                               <button onClick={handleAdminFeedbackSubmit} disabled={isProcessingFeedback || !adminFeedback.trim()} className="px-5 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm">
                                 {isProcessingFeedback ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>} Enviar Revisão
                               </button>
                             </div>
                           </motion.div>
                         )}
                      </div>
                    )}

                    {/* Botão de Retornar para Revisão quando concluída */}
                    {isAdmin && isCompleted && (
                      <div className="border-t border-gray-100 pt-4 mt-2">
                        <button 
                          onClick={handleReturnToReview}
                          className="w-full bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                          <RotateCcw size={14} /> Reverter para Revisão Interna
                        </button>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className={`p-6 rounded-2xl border-2 border-dashed flex flex-col items-center gap-3 transition-colors text-center
                    ${onUpload ? 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-[var(--color-atelier-terracota)]/50 cursor-pointer' : 'bg-gray-50 border-gray-100 opacity-60'}`}
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
                        {onUpload ? (
                          <label className="mt-2 bg-white border border-gray-200 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:text-white hover:bg-[var(--color-atelier-terracota)] hover:border-transparent cursor-pointer shadow-sm transition-all">
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
                <div className="mt-4 pt-6 border-t border-gray-100 flex flex-col gap-3 shrink-0">
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

      {/* =====================================================================
          LIGHTBOX IMERSIVO (EXIBE A IMAGEM EM TELA CHEIA DENTRO DO SISTEMA)
          ===================================================================== */}
      <AnimatePresence>
        {isLightboxOpen && displayImageUrl && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsLightboxOpen(false)} 
              className="absolute inset-0 bg-black/80 backdrop-blur-xl cursor-zoom-out" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative z-10 max-w-5xl max-h-full flex flex-col items-center pointer-events-none"
            >
              <img src={displayImageUrl} alt="Arte Expandida" className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10 pointer-events-auto" />
              <button 
                onClick={() => setIsLightboxOpen(false)} 
                className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors pointer-events-auto border border-white/20 shadow-sm"
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}