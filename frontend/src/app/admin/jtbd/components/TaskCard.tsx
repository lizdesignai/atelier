// src/app/admin/jtbd/components/TaskCard.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  Clock, Target, Activity, Flame, ArrowRight, 
  Loader2, PlayCircle, PauseCircle, ChevronRight, 
  CheckCircle2, X, Save, AlignLeft, Paperclip, UploadCloud, Eye, 
  Image as ImageIcon, ZoomIn, RotateCcw, MessageSquare, Send, FileText, Timer, PlusCircle
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
  onUpload?: (taskId: string, files: File[]) => Promise<void>;
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

  // 🟢 LEGENDA E LINK (NOVIDADE)
  const [localCaption, setLocalCaption] = useState(task.caption || "");
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const [localExternalLinks, setLocalExternalLinks] = useState<string[]>(task.external_links || []);
  const [newLinkInput, setNewLinkInput] = useState("");
  const [isSavingLink, setIsSavingLink] = useState(false);

  const handleSaveCaption = async () => {
    setIsSavingCaption(true);
    try {
      await supabase.from('tasks').update({ caption: localCaption }).eq('id', task.id);
      await supabase.from('social_posts').update({ caption: localCaption }).eq('task_id', task.id);
      task.caption = localCaption; // atualiza ref
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Legenda atualizada com sucesso!" }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao atualizar legenda." }));
    } finally {
      setIsSavingCaption(false);
    }
  };

  const handleSaveLinks = async () => {
    setIsSavingLink(true);
    try {
      await supabase.from('tasks').update({ external_links: localExternalLinks }).eq('id', task.id);
      await supabase.from('social_posts').update({ external_links: localExternalLinks }).eq('task_id', task.id);
      task.external_links = localExternalLinks;
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Links salvos com sucesso!" }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao atualizar links." }));
    } finally {
      setIsSavingLink(false);
    }
  };

  // 🟢 TELEMETRIA DE TEMPO (LIVE TIMER)
  const [liveSeconds, setLiveSeconds] = useState(0);

  const isEffectivelyModalOpen = isModalOpen || forceOpenModal;
  const isDelayed = !isCompleted && localDeadline && new Date(localDeadline) < new Date();

  // Busca a imagem do social_post se o Kanban ainda não a tiver nativamente
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

  // 🟢 MOTOR DE CÁLCULO AO VIVO (CRONÓMETRO)
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (task.status === 'in_progress' && task.started_at) {
      const startTimestamp = new Date(task.started_at).getTime();
      
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.floor((now - startTimestamp) / 1000);
        setLiveSeconds(diff > 0 ? diff : 0);
      };

      updateTimer(); // Atualiza instantaneamente ao renderizar
      interval = setInterval(updateTimer, 1000); // Roda a cada segundo
    } else {
      setLiveSeconds(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [task.status, task.started_at]);

  const displayImageUrl = task.attachment_url || relatedPost?.image_url;
  const isRejectedByClient = relatedPost?.status === 'needs_revision';
  const isPdf = displayImageUrl?.toLowerCase().includes('.pdf');

  const badgeColor = isCompleted ? 'bg-green-500/90' : isReview ? 'bg-purple-500/90' : 'bg-[var(--color-atelier-terracota)]/90';
  const badgeText = isCompleted ? 'Aprovado' : isReview ? 'Em Revisão' : 'Anexado';

  // Formatador de Segundos para HH:MM:SS
  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Tempo Acumulado Global (Minutos armazenados + Segundos ativos)
  const totalAccumulatedSeconds = (task.actual_time || 0) * 60;
  const totalSpentSeconds = totalAccumulatedSeconds + liveSeconds;

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
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !onUpload) return;
    if (files.length > 10) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Limite de 10 mídias por vez." }));
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(task.id, files);
    } catch (error) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Falha ao enviar o arquivo." }));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleReturnToReview = async () => {
    if (!onRevert) {
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
      <motion.div 
        draggable={!isCompleted && !forceStaticMode}
        onDragStart={(e: any) => {
          if (isCompleted || forceStaticMode) {
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
          ${forceStaticMode ? 'cursor-pointer hover:shadow-md' : "cursor-grab active:cursor-grabbing"}
          ${isCompleted ? 'bg-white/40 border border-[var(--color-atelier-grafite)]/10' : 'bg-white border border-[var(--color-atelier-grafite)]/5 shadow-[0_4px_12px_rgba(122,116,112,0.05)]'}
          ${task.urgency && !isCompleted ? 'border-orange-300 ring-1 ring-orange-500/20' : ''}
          ${isDelayed && !isCompleted ? 'border-red-300' : ''}
        `}
      >
        {isFocus && <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-20"></div>}
        {task.urgency && !isCompleted && !isFocus && <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 z-20"></div>}

        {/* COVER VISUAL (Oculta se forceStaticMode para evitar duplicação no Kanban) */}
        {displayImageUrl && !forceStaticMode && (
          <div className="w-full h-36 relative bg-gray-100 border-b border-[var(--color-atelier-grafite)]/10 shrink-0 overflow-hidden pointer-events-none flex items-center justify-center">
            {isPdf ? (
              <div className="flex flex-col items-center justify-center opacity-40">
                <FileText size={48} className="text-[var(--color-atelier-grafite)] mb-2" />
                <span className="font-bold text-[10px] uppercase tracking-widest text-[var(--color-atelier-grafite)]">Documento PDF</span>
              </div>
            ) : (
              <img src={displayImageUrl} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-95" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
               <span className="bg-white/95 backdrop-blur-sm text-[var(--color-atelier-grafite)] px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest shadow-sm flex items-center gap-1.5">
                 {isPdf ? <FileText size={12}/> : <ImageIcon size={12} />} Mídia Anexada
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
                
                {/* 🟢 BLABLA DE TEMPO (ESTIMADO vs INVESTIDO) */}
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 uppercase font-bold tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                    Est: {task.estimated_time}m
                  </span>
                  
                  {totalSpentSeconds > 0 && (
                    <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded flex items-center gap-1 shadow-sm border
                      ${task.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse' : 'bg-gray-100 text-gray-500 border-gray-200'}
                    `}>
                      <Timer size={10} /> {formatTime(totalSpentSeconds)}
                    </span>
                  )}

                  {!isFocus && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onReschedule(); }}
                      disabled={isRescheduling}
                      className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded transition-colors flex items-center gap-1 text-blue-500 hover:bg-blue-50 cursor-pointer pointer-events-auto disabled:opacity-50`}
                    >
                      {isRescheduling ? <Loader2 size={10} className="animate-spin"/> : <ArrowRight size={10}/>} Adiar
                    </button>
                  )}
                </div>
              </div>

              {/* ZONA DE BOTÕES */}
              <div className="flex items-center gap-2 relative z-10 pointer-events-auto">
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
                      {task.status === 'pending_client_approval' ? (
                        <span className="px-3 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold uppercase tracking-widest cursor-not-allowed bg-blue-50 border border-blue-200 text-blue-600 animate-pulse shadow-sm gap-1.5">
                          <Timer size={12} /> Cliente Avaliando
                        </span>
                      ) : isAdmin ? (
                        <button onClick={(e) => { e.stopPropagation(); onAction('completed'); }} className="bg-green-500 border border-green-600 text-white hover:bg-green-600 px-4 h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_4px_10px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 flex items-center gap-1">
                          Aprovar <CheckCircle2 size={14}/>
                        </button>
                      ) : (
                        <span className={`px-3 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold uppercase tracking-widest cursor-not-allowed ${isRejectedByClient ? 'bg-red-50 border border-red-200 text-red-600 animate-pulse' : 'bg-orange-50 border border-orange-200 text-orange-600 animate-pulse'}`}>
                          {isRejectedByClient ? 'Ajuste Exigido' : 'Em Análise'}
                        </span>
                      )}
                    </>
                  )}

                  {isCompleted && (
                    <span className="text-[9px] uppercase font-bold tracking-widest flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 shadow-sm">
                      <CheckCircle2 size={12} /> Finalizado
                    </span>
                  )}
                </>
              </div>
            </div>
          )}
          
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
          MODAL DE DETALHES RÁPIDOS DA TAREFA E VISUALIZADOR DE ARTE/PDF
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

              <div className="flex flex-col md:flex-row gap-6 shrink-0 w-full">
                <div className="flex flex-col gap-3 w-full md:w-1/2">
                  <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2">
                    <AlignLeft size={14}/> Instruções da Equipe (Interno)
                  </h4>
                  <div className="bg-[var(--color-atelier-creme)]/30 p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/5 text-[13px] text-[var(--color-atelier-grafite)]/80 whitespace-pre-wrap h-32 overflow-y-auto custom-scrollbar">
                    {task.description ? task.description : <span className="italic text-gray-400">Nenhuma instrução detalhada fornecida para esta tarefa.</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-1/2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2">
                      <MessageSquare size={14}/> Legenda do Post (Público)
                    </h4>
                    {localCaption !== (task.caption || "") && (
                      <button onClick={handleSaveCaption} disabled={isSavingCaption} className="bg-[var(--color-atelier-terracota)] text-white hover:bg-[#8c562e] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1">
                        {isSavingCaption ? <Loader2 size={10} className="animate-spin"/> : <Save size={10}/>} Salvar
                      </button>
                    )}
                  </div>
                  <textarea 
                    value={localCaption}
                    onChange={(e) => setLocalCaption(e.target.value)}
                    placeholder="Escreva a legenda visível para o cliente..."
                    className="w-full bg-white p-4 rounded-2xl border border-[var(--color-atelier-terracota)]/30 text-[13px] text-[var(--color-atelier-grafite)] resize-none h-32 overflow-y-auto custom-scrollbar focus:outline-none focus:border-[var(--color-atelier-terracota)] shadow-sm transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2">
                    {isPdf ? <FileText size={14}/> : <ImageIcon size={14}/>} Material Final Anexado
                  </h4>
                  {isRejectedByClient && (
                    <div className="flex items-center gap-2">
                      <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">Recusado pelo Cliente</span>
                      <button onClick={handleReturnToReview} className="bg-gray-100 text-[var(--color-atelier-grafite)] hover:bg-orange-500 hover:text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm">
                        <RotateCcw size={10} /> Retornar p/ Revisão
                      </button>
                    </div>
                  )}
                </div>
                
                {((task.media_assets && task.media_assets.length > 0) || displayImageUrl) ? (
                  <div className="flex flex-col gap-3">
                    
                    {(task.media_assets && task.media_assets.length > 0) ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {task.media_assets.map((asset: any, idx: number) => (
                          <div key={idx} className={`w-full h-24 sm:h-32 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative group bg-gray-100 ${isRejectedByClient ? 'border-red-300 ring-2 ring-red-500/20' : ''}`}>
                            {asset.type === 'video' ? (
                               <video src={asset.url} className="w-full h-full object-cover" />
                            ) : (
                               <img src={asset.url} alt="Arte" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <a href={asset.url} target="_blank" rel="noreferrer" className="bg-white/95 backdrop-blur-md p-2 rounded-full text-[var(--color-atelier-grafite)] opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl transform translate-y-2 group-hover:translate-y-0">
                                 <Eye size={14} />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {isPdf ? (
                          <div className={`w-full h-48 sm:h-56 rounded-[1.5rem] overflow-hidden border border-gray-200 shadow-sm relative group bg-gray-100 flex flex-col items-center justify-center ${isRejectedByClient ? 'border-red-300 ring-2 ring-red-500/20' : ''}`}>
                             <FileText size={48} className="text-gray-300 mb-4" />
                             <span className="font-bold uppercase tracking-widest text-[11px] text-gray-500">Documento PDF</span>
                             
                             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                               <a href={displayImageUrl!} target="_blank" rel="noreferrer" className="bg-white text-[var(--color-atelier-grafite)] px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg flex items-center gap-2 hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors">
                                 <Eye size={14}/> Ler Documento
                               </a>
                               <a href={displayImageUrl!} download target="_blank" rel="noreferrer" className="text-white font-bold uppercase tracking-widest text-[9px] underline hover:text-[var(--color-atelier-terracota)] transition-colors">
                                 Fazer Download
                               </a>
                             </div>
                          </div>
                        ) : (
                          <div className={`w-full h-48 sm:h-56 rounded-[1.5rem] overflow-hidden border border-gray-200 shadow-sm relative group cursor-pointer bg-gray-100 ${isRejectedByClient ? 'border-red-300 ring-2 ring-red-500/20' : ''}`} onClick={() => setIsLightboxOpen(true)}>
                            <img src={displayImageUrl!} alt="Arte Anexada" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <div className="bg-white/95 backdrop-blur-md px-5 py-3 rounded-full text-[var(--color-atelier-grafite)] opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl transform translate-y-4 group-hover:translate-y-0 flex items-center gap-2">
                                 <ZoomIn size={18} /> <span className="text-[10px] font-bold uppercase tracking-widest">Expandir Arte</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-200 shadow-sm transition-colors hover:border-[var(--color-atelier-terracota)]/30">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0">
                          <Paperclip size={16} />
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-[12px] font-bold text-[var(--color-atelier-grafite)] truncate">Arquivo Anexado</span>
                          <span className="text-[9px] uppercase font-bold tracking-widest text-green-600 mt-0.5 flex items-center gap-1"><CheckCircle2 size={10}/> Vinculado ao Fluxo</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pl-2">
                        {onUpload && (
                          <label className="flex items-center justify-center gap-2 h-9 px-4 bg-orange-50 hover:bg-orange-100 border border-transparent hover:border-orange-200 rounded-xl text-orange-600 transition-all shadow-sm cursor-pointer" title="Substituir Arquivo">
                            <input type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={handleFileSelection} disabled={isUploading} />
                            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                            <span className="font-bold text-[10px] uppercase tracking-widest hidden sm:block">Substituir</span>
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2">
                          <Target size={14}/> Links Externos (Referência)
                        </h4>
                        {JSON.stringify(localExternalLinks) !== JSON.stringify(task.external_links || []) && (
                          <button onClick={handleSaveLinks} disabled={isSavingLink} className="bg-[var(--color-atelier-terracota)] text-white hover:bg-[#8c562e] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1">
                            {isSavingLink ? <Loader2 size={10} className="animate-spin"/> : <Save size={10}/>} Salvar Links
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="url"
                          value={newLinkInput}
                          onChange={(e) => setNewLinkInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newLinkInput.trim()) {
                              e.preventDefault();
                              setLocalExternalLinks([...localExternalLinks, newLinkInput.trim()]);
                              setNewLinkInput("");
                            }
                          }}
                          placeholder="https://exemplo.com/material"
                          className="flex-1 bg-white p-3 rounded-xl border border-gray-200 text-[12px] text-[var(--color-atelier-grafite)] focus:outline-none focus:border-[var(--color-atelier-terracota)] shadow-sm transition-colors"
                        />
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            if (newLinkInput.trim()) {
                              setLocalExternalLinks([...localExternalLinks, newLinkInput.trim()]);
                              setNewLinkInput("");
                            }
                          }}
                          className="bg-[var(--color-atelier-grafite)] text-white px-4 rounded-xl flex items-center justify-center hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-sm"
                        >
                          <PlusCircle size={16} />
                        </button>
                      </div>
                      {localExternalLinks.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {localExternalLinks.map((link: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] px-3 py-1.5 rounded-lg border border-[var(--color-atelier-terracota)]/20 text-[11px] font-medium">
                              <span className="max-w-[150px] truncate">{link}</span>
                              <button onClick={() => setLocalExternalLinks(localExternalLinks.filter((_, idx) => idx !== i))} className="hover:text-red-500">
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {isAdmin && isReview && !isCompleted && task.status !== 'pending_client_approval' && (
                      <div className="border-t border-gray-100 pt-4 mt-2">
                         {!isAdminReviewing ? (
                           <div className="flex gap-3">
                             <button onClick={() => setIsAdminReviewing(true)} className="flex-1 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2">
                               <MessageSquare size={14} /> Solicitar Ajuste
                             </button>
                             <button onClick={() => { onAction('completed'); handleCloseModal(); }} className="flex-1 bg-green-500 text-white hover:bg-green-600 py-3.5 rounded-xl font-bold uppercase tracking-[0.1em] transition-all shadow-md flex items-center justify-center gap-2 hover:-translate-y-0.5">
                               <CheckCircle2 size={14} /> Aprovar p/ Cliente
                             </button>
                           </div>
                         ) : (
                           <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col gap-3 bg-red-50/50 p-4 rounded-2xl border border-red-100">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-1.5"><RotateCcw size={12}/> Feedback</span>
                             <textarea 
                               placeholder="Detalhe o que precisa ser alterado neste arquivo..." 
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
                  </div>
                ) : (
                  <div className={`p-6 rounded-2xl border-2 border-dashed flex flex-col items-center gap-3 transition-colors text-center ${(!isCompleted && onUpload) ? 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-[var(--color-atelier-terracota)]/50 cursor-pointer' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
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
                            <input type="file" accept="image/*,video/*,application/pdf" className="hidden" onChange={handleFileSelection} disabled={isUploading} />
                            Anexar Imagem ou PDF
                          </label>
                        ) : (
                          <span className="text-[10px] italic text-gray-400 max-w-[200px] mt-1">Nenhum ficheiro anexado e a tarefa encontra-se encerrada.</span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 🟢 DASHBOARD DE TELEMETRIA E GESTÃO DE PRAZO (ADMIN VIEW) */}
              {isAdmin && (
                <div className="mt-4 pt-6 border-t border-gray-100 flex flex-col gap-5 shrink-0">
                  <div className="flex flex-col gap-3">
                    <h4 className="font-roboto text-[10px] font-bold uppercase tracking-widest text-orange-500 flex items-center gap-2">
                      <Clock size={12}/> Ajuste de Prazo
                    </h4>
                    <div className="flex items-center gap-3">
                      <input 
                        type="datetime-local" 
                        value={localDeadline ? new Date(localDeadline).toISOString().slice(0, 16) : ""} 
                        onChange={(e) => setLocalDeadline(e.target.value ? new Date(e.target.value).toISOString() : null)} 
                        className="flex-1 bg-white border border-gray-200 rounded-xl p-3 text-[13px] outline-none focus:border-orange-400 shadow-sm" 
                      />
                      <button onClick={handleUpdateDeadline} disabled={isSavingDeadline || localDeadline === task.deadline} className="bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white px-5 h-[46px] rounded-xl text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm">
                        {isSavingDeadline ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Atualizar
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex flex-col gap-3">
                     <h4 className="font-roboto text-[10px] font-bold uppercase tracking-widest text-blue-500 flex items-center gap-2">
                       <Timer size={12}/> Telemetria de Produção
                     </h4>
                     <div className="flex justify-between items-center">
                       <span className="text-[12px] font-bold text-[var(--color-atelier-grafite)]/70">Tempo Total Investido</span>
                       <span className="font-elegant text-2xl text-blue-600">{formatTime(totalSpentSeconds)}</span>
                     </div>
                     {task.status === 'in_progress' && (
                       <div className="flex justify-between items-center pt-3 border-t border-blue-200/50 mt-1">
                         <span className="text-[11px] font-medium text-blue-500/70">Sessão Atual (Ativa)</span>
                         <span className="text-[13px] font-bold text-blue-500 animate-pulse bg-blue-100 px-3 py-1 rounded-lg shadow-sm">{formatTime(liveSeconds)}</span>
                       </div>
                     )}
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          LIGHTBOX IMERSIVO
          ===================================================================== */}
      <AnimatePresence>
        {isLightboxOpen && displayImageUrl && !isPdf && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLightboxOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl cursor-zoom-out" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative z-10 max-w-5xl max-h-full flex flex-col items-center pointer-events-none">
              <img src={displayImageUrl} alt="Arte Expandida" className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10 pointer-events-auto" />
              <button onClick={() => setIsLightboxOpen(false)} className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors pointer-events-auto border border-white/20 shadow-sm"><X size={20} /></button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}