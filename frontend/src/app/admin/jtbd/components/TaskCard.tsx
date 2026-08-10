"use client";

// src/app/admin/jtbd/components/TaskCard.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import ClientAssetsModal from "../../../../components/ClientAssetsModal";
import { NotificationEngine } from "../../../../lib/NotificationEngine";
import { formatForDateTimeLocal, parseFromDateTimeLocal } from "../../../../lib/dateUtils";
import { 
  Clock, Target, Activity, Flame, ArrowRight, 
  Loader2, PlayCircle, PauseCircle, ChevronRight, 
  CheckCircle2, X, Save, AlignLeft, Paperclip, UploadCloud, Eye,
  Image as ImageIcon, ZoomIn, RotateCcw, MessageSquare, Send, FileText, Timer, PlusCircle, UserCircle2, Trash2, ExternalLink, Zap
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
  currentUser?: any;
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
  onRevert,
  currentUser
}: TaskCardProps) {
  
  // ==========================================
  // ESTADOS LOCAIS
  // ==========================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localDeadline, setLocalDeadline] = useState(task.internal_deadline || task.deadline);
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);
  const [isUploading, setIsUploading] = useState(false); 
  const [relatedPost, setRelatedPost] = useState<any>(null); 
  
  // LIGHTBOX & REVISÃO DO GESTOR
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isAdminReviewing, setIsAdminReviewing] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState("");
  const [isProcessingFeedback, setIsProcessingFeedback] = useState(false);

  const [isAssetsModalOpen, setIsAssetsModalOpen] = useState(false);

  // ACCORDION STATES
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isCaptionOpen, setIsCaptionOpen] = useState(false);
  const [isMaterialOpen, setIsMaterialOpen] = useState(true);

  // 🟢 LEGENDA E LINK (NOVIDADE)
  const [localCaption, setLocalCaption] = useState(task.caption || "");
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const [localExternalLinks, setLocalExternalLinks] = useState<any[]>(task.external_links || []);
  const [newLinkTitle, setNewLinkTitle] = useState("");
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

  const handleDeleteAsset = async (assetIndex: number) => {
    try {
      const currentAssets = task.media_assets || (displayImageUrl ? [{ type: isPdf ? 'pdf' : 'image', url: displayImageUrl }] : []);
      const updatedAssets = currentAssets.filter((_: any, idx: number) => idx !== assetIndex);
      
      const newMainUrl = updatedAssets.length > 0 ? updatedAssets[0].url : null;

      await supabase.from('tasks').update({
        media_assets: updatedAssets,
        attachment_url: newMainUrl
      }).eq('id', task.id);

      await supabase.from('social_posts').update({
        media_assets: updatedAssets,
        image_url: newMainUrl
      }).eq('task_id', task.id);

      task.media_assets = updatedAssets;
      task.attachment_url = newMainUrl;

      window.dispatchEvent(new CustomEvent("showToast", { detail: "Anexo removido com sucesso!" }));
      window.dispatchEvent(new CustomEvent("jtbdRefreshNeeded"));
    } catch (e) {
      console.error("Erro ao apagar anexo:", e);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao apagar anexo." }));
    }
  };

  // 🟢 TELEMETRIA DE TEMPO (LIVE TIMER)
  const [liveSeconds, setLiveSeconds] = useState(0);

  const isEffectivelyModalOpen = isModalOpen || forceOpenModal;
  const effectiveDisplayDate = task.productivity_deadline || localDeadline;
  const isDelayed = !isCompleted && effectiveDisplayDate && new Date(effectiveDisplayDate) < new Date();

  // Verifica se a query pai já trouxe o social_post, senão busca
  useEffect(() => {
    if (task.id && !task.attachment_url) {
      if (task.social_posts && Array.isArray(task.social_posts) && task.social_posts.length > 0) {
        const sorted = [...task.social_posts].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setRelatedPost(sorted[0]);
        return;
      }

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
  }, [task.id, task.attachment_url, task.social_posts]);

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

  const feedbackThread = (() => {
    try {
      if (!task.admin_feedback) return [];
      const parsed = JSON.parse(task.admin_feedback);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      if (task.admin_feedback) {
        return [{
          id: 'legacy',
          authorName: 'Sistema (Legado)',
          role: 'admin',
          content: task.admin_feedback,
          createdAt: task.updated_at || new Date().toISOString()
        }];
      }
      return [];
    }
  })();

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
      const { error } = await supabase.from('tasks').update({ deadline: localDeadline, internal_deadline: localDeadline }).eq('id', task.id);
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Prazo atualizado com sucesso!" }));
      handleCloseModal(); 
    } catch (e) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao atualizar prazo." }));
    } finally {
      setIsSavingDeadline(false);
    }
  };

  const handleForceToday = async () => {
    if (!isAdmin) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today to ensure it shows as delayed/urgent if needed
    const formattedToday = today.toISOString();
    
    try {
      const { error } = await supabase.from('tasks').update({ 
        deadline: formattedToday, 
        internal_deadline: formattedToday,
        productivity_deadline: formattedToday,
        urgency: true 
      }).eq('id', task.id);
      if (error) throw error;
      
      task.deadline = formattedToday;
      task.internal_deadline = formattedToday;
      task.productivity_deadline = formattedToday;
      task.urgency = true;
      setLocalDeadline(formattedToday);
      
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Data forçada para hoje com urgência!" }));
      window.dispatchEvent(new CustomEvent("jtbdRefreshNeeded"));
    } catch (e) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao forçar data." }));
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
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Por favor, insira uma mensagem." }));
      return;
    }
    setIsProcessingFeedback(true);
    try {
      const newMessage = {
        id: `msg-${Date.now()}`,
        authorName: currentUser?.nome?.split(' ')[0] || (isAdmin ? 'Gestão' : 'Colaborador'),
        authorAvatar: currentUser?.avatar_url || null,
        role: isAdmin ? 'admin' : 'collab',
        content: adminFeedback,
        createdAt: new Date().toISOString()
      };

      const updatedThread = [...feedbackThread, newMessage];
      const stringifiedFeedback = JSON.stringify(updatedThread);
      
      const statusUpdate = (isAdmin && isReview) ? 'in_progress' : task.status;

      await supabase.from('tasks').update({ 
        admin_feedback: stringifiedFeedback,
        status: statusUpdate 
      }).eq('id', task.id);

      task.admin_feedback = stringifiedFeedback;

      if (displayImageUrl && isAdmin && isReview) {
        await supabase.from('social_posts').update({ status: 'internal_review' }).eq('task_id', task.id);
        if (relatedPost) setRelatedPost({ ...relatedPost, status: 'internal_review' });
      }

      // Notifications
      if (isAdmin && task.assigned_to) {
        await NotificationEngine.notifyCollaboratorWithEmail(
          task.assigned_to,
          "💬 Novo Feedback Recebido",
          `A gestão enviou um novo feedback na tarefa "${task.title}".`,
          "task_feedback",
          {
            taskName: task.title,
            projectName: task.agency_subclients?.name || task.projects?.profiles?.nome || 'Projeto',
            link: "/admin/jtbd"
          }
        );
      } else if (!isAdmin) {
        await NotificationEngine.notifyManagement(
          "💬 Resposta do Colaborador", 
          `O colaborador ${newMessage.authorName} respondeu ao feedback na tarefa "${task.title}".`, 
          "info",
          "/admin/analytics"
        );
      }

      setAdminFeedback("");
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Feedback adicionado à thread com sucesso!" }));
      
      if (isAdmin && isReview) {
        onAction('in_progress'); 
        handleCloseModal();
      }
      
      setAdminFeedback("");
      setIsAdminReviewing(false);
    } catch (error) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao enviar mensagem." }));
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
          ${isFocus ? 'gemini-gradient-bg border-transparent' : ''}
        `}
      >
        {isFocus && <div className="absolute top-0 left-0 w-1.5 h-full gemini-gradient-border z-20"></div>}
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
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <div 
                  className="pointer-events-auto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] transition-colors flex items-center gap-1 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setIsAssetsModalOpen(true); }}
                  title="Ver Cofre de Ativos"
                >
                  {task.projects?.type === 'Identidade Visual' ? <Target size={10}/> : <Activity size={10}/>}
                  {(task.agency_subclients?.name || task.projects?.profiles?.nome)?.split(" ")[0]} • {task.stage}
                </div>
                {(task.agency_subclients?.trello_url || task.projects?.trello_url) && (
                  <a
                    href={task.agency_subclients?.trello_url || task.projects?.trello_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="pointer-events-auto text-[9px] font-bold text-[#0079BF] hover:underline flex items-center gap-0.5 bg-[#0079BF]/10 px-1.5 py-0.5 rounded border border-[#0079BF]/20 transition-colors"
                    title="Abrir Trello"
                  >
                    <ExternalLink size={9} /> Trello
                  </a>
                )}
              </div>
              <span className={`font-roboto font-bold text-[14px] leading-snug ${isCompleted ? 'text-[var(--color-atelier-grafite)]/40 line-through' : 'text-[var(--color-atelier-grafite)]'}`}>
                {task.title}
              </span>
              
              {task.external_links && task.external_links.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 pointer-events-auto relative z-20">
                  {task.external_links.map((link: any, i: number) => (
                    <a 
                      key={i} 
                      href={typeof link === 'string' ? link : link.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      onClick={(e) => e.stopPropagation()} 
                      className="text-[9px] font-bold text-[var(--color-atelier-terracota)] hover:text-white bg-[var(--color-atelier-terracota)]/10 hover:bg-[var(--color-atelier-terracota)] px-2 py-0.5 rounded flex items-center gap-1 w-fit border border-[var(--color-atelier-terracota)]/20 transition-colors shadow-sm"
                    >
                       {typeof link === 'string' ? "Link de Referência" : link.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
            {task.urgency && !isCompleted && <Flame size={16} className="text-orange-500 shrink-0 mt-1 animate-pulse" />}
          </div>

          {!isCompleted && (
            <div className="flex items-center justify-between border-t border-[var(--color-atelier-grafite)]/5 pt-4 mt-1">
              <div className="flex flex-col gap-1">
                <span className={`text-[10px] uppercase font-bold tracking-widest flex items-center gap-1 ${isDelayed ? 'text-red-500' : 'text-[var(--color-atelier-grafite)]/50'}`}>
                  {task.productivity_deadline ? (
                    <>
                      <Zap size={12} className="text-purple-600"/> 
                      <span className="text-purple-600">
                        {task.productivity_label || "HOJE"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock size={12}/> 
                      {effectiveDisplayDate ? new Date(effectiveDisplayDate).toLocaleDateString('pt-BR') : 'Sem Prazo'}
                    </>
                  )}
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
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onReschedule(); }}
                        disabled={isRescheduling}
                        className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded transition-colors flex items-center gap-1 text-blue-500 hover:bg-blue-50 cursor-pointer pointer-events-auto disabled:opacity-50`}
                      >
                        {isRescheduling ? <Loader2 size={10} className="animate-spin"/> : <ArrowRight size={10}/>} Adiar
                      </button>
                      
                      {isAdmin && isDelayed && task.assigned_to && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            NotificationEngine.notifyCollaboratorWithEmail(
                              task.assigned_to,
                              "⏰ Atraso Identificado",
                              `A tarefa "${task.title}" encontra-se atrasada. A gestão solicita atualização.`,
                              "task_overdue",
                              { taskName: task.title, projectName: task.agency_subclients?.name || task.projects?.profiles?.nome || 'Projeto' }
                            );
                            window.dispatchEvent(new CustomEvent("showToast", { detail: "Cobrança enviada ao colaborador!" }));
                          }}
                          className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded transition-colors flex items-center gap-1 text-red-500 hover:bg-red-50 cursor-pointer pointer-events-auto border border-red-200 shadow-sm`}
                          title="Enviar aviso de cobrança"
                        >
                          Cobrar
                        </button>
                      )}
                      
                      {isAdmin && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleForceToday(); }}
                          className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded transition-colors flex items-center gap-1 text-red-500 hover:bg-red-50 cursor-pointer pointer-events-auto border border-red-200 shadow-sm"
                          title="Forçar data para hoje (Urgente)"
                        >
                          <Clock size={10}/> Forçar Hoje
                        </button>
                      )}
                    </>
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
                        <div className="flex items-center gap-1.5">
                          <span className="px-3 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold uppercase tracking-widest cursor-not-allowed bg-blue-50 border border-blue-200 text-blue-600 animate-pulse shadow-sm gap-1.5">
                            <Timer size={12} /> Cliente Avaliando
                          </span>
                          {isAdmin && !task.agency_id && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onAction('completed'); }}
                              className="px-3 h-8 rounded-lg bg-green-500 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-green-600 transition-all flex items-center gap-1 shadow-sm"
                              title="Forçar aprovação (cliente sem acesso)"
                            >
                              <Zap size={12} /> Forçar
                            </button>
                          )}
                        </div>
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

      <ClientAssetsModal 
        isOpen={isAssetsModalOpen}
        onClose={() => setIsAssetsModalOpen(false)}
        projectId={task.project_id}
        subclientId={task.subclient_id}
        clientName={task.agency_subclients?.name || task.projects?.profiles?.nome || 'Cliente'}
      />

      {/* =====================================================================
          MODAL DE DETALHES RÁPIDOS DA TAREFA E VISUALIZADOR DE ARTE/PDF
          ===================================================================== */}
      <AnimatePresence>
        {isEffectivelyModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
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
              className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-lg border border-white/20 flex flex-col max-h-[85vh] sm:max-h-[90vh] h-auto overflow-hidden my-auto"
            >
              {/* FIXED HEADER */}
              <div className="p-5 sm:p-8 pb-3 sm:pb-5 flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 shrink-0 bg-white z-20">
                <div className="pr-4">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)] mb-1 block">
                    {task.agency_subclients?.name || task.projects?.profiles?.nome} • {task.stage}
                  </span>
                  <h3 className="font-elegant text-2xl sm:text-3xl text-[var(--color-atelier-grafite)] leading-tight line-clamp-3">
                    {task.title}
                  </h3>
                </div>
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCloseModal(); }} className="w-10 h-10 rounded-full bg-gray-100/80 active:bg-gray-200 active:scale-95 text-gray-500 hover:text-[var(--color-atelier-terracota)] transition-all flex items-center justify-center shrink-0 cursor-pointer touch-manipulation z-20" title="Fechar"><X size={20}/></button>
              </div>

              {/* SCROLLABLE BODY */}
              <div className="p-5 sm:p-8 pt-4 sm:pt-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">

                {/* INSTRUÇÕES (ACCORDION) */}
                <div className="flex flex-col gap-2 shrink-0 order-3">
                  <button 
                    onClick={() => setIsInstructionsOpen(!isInstructionsOpen)}
                    className="flex justify-between items-center w-full focus:outline-none"
                  >
                    <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2">
                      <AlignLeft size={14}/> Instruções da Equipe (Interno)
                    </h4>
                    <ChevronRight size={14} className={`text-gray-400 transition-transform ${isInstructionsOpen ? 'rotate-90' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isInstructionsOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-[var(--color-atelier-creme)]/30 p-4 mt-2 rounded-2xl border border-[var(--color-atelier-grafite)]/5 text-[13px] text-[var(--color-atelier-grafite)]/80 whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                          {task.description ? task.description : <span className="italic text-gray-400">Nenhuma instrução detalhada fornecida para esta tarefa.</span>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* LEGENDA (ACCORDION) */}
                <div className="flex flex-col gap-2 shrink-0 order-4 border-t sm:border-t-0 border-gray-100 pt-5 sm:pt-0">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setIsCaptionOpen(!isCaptionOpen)}
                      className="flex items-center gap-2 focus:outline-none flex-1"
                    >
                      <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2">
                        <MessageSquare size={14}/> Legenda do Post (Público)
                      </h4>
                      <ChevronRight size={14} className={`text-gray-400 transition-transform ${isCaptionOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {localCaption !== (task.caption || "") && (
                      <button onClick={handleSaveCaption} disabled={isSavingCaption} className="bg-[var(--color-atelier-terracota)] text-white hover:bg-[#8c562e] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1 z-10">
                        {isSavingCaption ? <Loader2 size={10} className="animate-spin"/> : <Save size={10}/>} Salvar
                      </button>
                    )}
                  </div>
                  <AnimatePresence>
                    {isCaptionOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <textarea 
                          value={localCaption}
                          onChange={(e) => setLocalCaption(e.target.value)}
                          placeholder="Escreva a legenda visível para o cliente..."
                          className="w-full bg-white p-4 mt-2 rounded-2xl border border-[var(--color-atelier-terracota)]/30 text-[13px] text-[var(--color-atelier-grafite)] resize-none h-40 overflow-y-auto custom-scrollbar focus:outline-none focus:border-[var(--color-atelier-terracota)] shadow-sm transition-colors"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* HISTÓRICO DE FEEDBACK E THREADS */}
                {(!isCompleted || feedbackThread.length > 0) && (
                  <div className="flex flex-col gap-2 shrink-0 border-t border-gray-100 pt-5 order-5">
                    <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2 mb-2">
                      <MessageSquare size={14}/> Histórico de Feedback (Thread)
                    </h4>
                    
                    {feedbackThread.length > 0 ? (
                      <div className="flex flex-col gap-3 mb-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {feedbackThread.map((msg: any) => (
                          <div key={msg.id} className={`flex flex-col gap-1 w-full max-w-[85%] ${msg.role === 'admin' ? 'mr-auto' : 'ml-auto items-end'}`}>
                            <div className="flex items-center gap-2">
                              {msg.authorAvatar ? (
                                <img src={msg.authorAvatar} alt={msg.authorName} className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <UserCircle2 size={14} className="text-gray-400" />
                              )}
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${msg.role === 'admin' ? 'text-[var(--color-atelier-terracota)]' : 'text-blue-500'}`}>{msg.authorName}</span>
                              <span className="text-[9px] text-gray-400">{new Date(msg.createdAt).toLocaleDateString('pt-BR')} {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className={`p-3 rounded-2xl text-[13px] font-medium shadow-sm whitespace-pre-wrap ${msg.role === 'admin' ? 'bg-orange-50 border border-orange-100/50 text-orange-900 rounded-tl-sm' : 'bg-blue-50 border border-blue-100/50 text-blue-900 rounded-tr-sm'}`}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[12px] italic text-gray-400 mb-2">Nenhuma mensagem registrada nesta tarefa.</div>
                    )}

                    {/* Área de Resposta */}
                    {!isCompleted && task.status !== 'pending_client_approval' && (
                      <div className="mt-2 flex flex-col gap-2">
                        <textarea 
                          placeholder={isAdmin ? "Detalhe o que precisa ser alterado..." : "Responda à gestão ou tire uma dúvida..."}
                          value={adminFeedback}
                          onChange={(e) => setAdminFeedback(e.target.value)}
                          className={`w-full bg-white border ${isAdmin ? 'border-orange-200 focus:border-orange-400' : 'border-blue-200 focus:border-blue-400'} rounded-xl p-3 text-[13px] font-medium outline-none resize-none h-20 shadow-sm custom-scrollbar transition-colors`}
                        />
                        <div className="flex justify-end gap-2">
                          {isAdmin && isReview && (
                            <button onClick={() => { onAction('completed'); handleCloseModal(); }} className="px-5 py-2 bg-green-500 text-white hover:bg-green-600 rounded-lg text-[10px] font-bold uppercase tracking-[0.1em] transition-all shadow-sm flex items-center justify-center gap-2">
                              <CheckCircle2 size={14} /> Aprovar p/ Cliente
                            </button>
                          )}
                        <button onClick={handleAdminFeedbackSubmit} disabled={isProcessingFeedback || !adminFeedback.trim()} className={`px-5 py-2 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm ${isAdmin ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                            {isProcessingFeedback ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>} {isAdmin && isReview ? 'Solicitar Ajuste' : 'Enviar Mensagem'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* MATERIAL FINAL ANEXADO (ACCORDION) */}
              <div className="flex flex-col gap-2 shrink-0 order-1 border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between">
                  <button 
                    type="button"
                    onClick={() => setIsMaterialOpen(!isMaterialOpen)}
                    className="flex items-center gap-2 focus:outline-none flex-1 cursor-pointer"
                  >
                    <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2">
                      {isPdf ? <FileText size={14}/> : <ImageIcon size={14}/>} Material Final Anexado ({(task.media_assets?.length) || (displayImageUrl ? 1 : 0)})
                    </h4>
                    <ChevronRight size={14} className={`text-gray-400 transition-transform ${isMaterialOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {isRejectedByClient && (
                    <div className="flex items-center gap-2">
                      <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">Recusado pelo Cliente</span>
                      <button onClick={handleReturnToReview} className="bg-gray-100 text-[var(--color-atelier-grafite)] hover:bg-orange-500 hover:text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1 shadow-sm">
                        <RotateCcw size={10} /> Retornar p/ Revisão
                      </button>
                    </div>
                  )}
                </div>
                
                <AnimatePresence>
                  {isMaterialOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-2"
                    >
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
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2">
                                    <a href={asset.url} target="_blank" rel="noreferrer" className="bg-white/95 backdrop-blur-md p-2 rounded-full text-[var(--color-atelier-grafite)] opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl transform translate-y-2 group-hover:translate-y-0" title="Visualizar">
                                       <Eye size={14} />
                                    </a>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleDeleteAsset(idx); }}
                                      className="bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl transform translate-y-2 group-hover:translate-y-0"
                                      title="Apagar Anexo"
                                    >
                                      <Trash2 size={14} />
                                    </button>
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
                                     <div className="flex items-center gap-2">
                                       <a href={displayImageUrl!} target="_blank" rel="noreferrer" className="bg-white text-[var(--color-atelier-grafite)] px-4 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg flex items-center gap-2 hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors">
                                         <Eye size={14}/> Ler
                                       </a>
                                       <button onClick={() => handleDeleteAsset(0)} className="bg-red-500 text-white p-2.5 rounded-xl font-bold text-[10px] shadow-lg flex items-center gap-1 hover:bg-red-600 transition-colors" title="Apagar Anexo">
                                         <Trash2 size={14}/>
                                       </button>
                                     </div>
                                     <a href={displayImageUrl!} download target="_blank" rel="noreferrer" className="text-white font-bold uppercase tracking-widest text-[9px] underline hover:text-[var(--color-atelier-terracota)] transition-colors">
                                       Fazer Download
                                     </a>
                                   </div>
                                </div>
                              ) : (
                                <div className={`w-full h-48 sm:h-56 rounded-[1.5rem] overflow-hidden border border-gray-200 shadow-sm relative group cursor-pointer bg-gray-100 ${isRejectedByClient ? 'border-red-300 ring-2 ring-red-500/20' : ''}`} onClick={() => setIsLightboxOpen(true)}>
                                  <img src={displayImageUrl!} alt="Arte Anexada" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2">
                                    <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-full text-[var(--color-atelier-grafite)] opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl transform translate-y-4 group-hover:translate-y-0 flex items-center gap-2">
                                       <ZoomIn size={16} /> <span className="text-[10px] font-bold uppercase tracking-widest">Expandir</span>
                                    </div>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleDeleteAsset(0); }}
                                      className="bg-red-500/90 hover:bg-red-600 text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl transform translate-y-4 group-hover:translate-y-0"
                                      title="Apagar Anexo"
                                    >
                                      <Trash2 size={16} />
                                    </button>
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
                                <span className="text-[12px] font-bold text-[var(--color-atelier-grafite)] truncate">Arquivos Anexados ({(task.media_assets?.length) || (displayImageUrl ? 1 : 0)})</span>
                                <span className="text-[9px] uppercase font-bold tracking-widest text-green-600 mt-0.5 flex items-center gap-1"><CheckCircle2 size={10}/> Vinculado ao Fluxo</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 pl-2">
                              {onUpload && (
                                <label className="flex items-center justify-center gap-2 h-9 px-4 bg-orange-50 hover:bg-orange-100 border border-transparent hover:border-orange-200 rounded-xl text-orange-600 transition-all shadow-sm cursor-pointer" title="Adicionar Mídia / Anexos">
                                  <input type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={handleFileSelection} disabled={isUploading} />
                                  {isUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                                  <span className="font-bold text-[10px] uppercase tracking-widest hidden sm:block">Adicionar Anexos</span>
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <div className="bg-gray-50 border border-dashed border-gray-300 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                            <UploadCloud size={32} className="text-gray-400" />
                            <span className="text-[12px] font-bold text-gray-600">Nenhum anexo adicionado a esta tarefa</span>
                            {onUpload && (
                              <label className="mt-2 flex items-center justify-center gap-2 h-9 px-5 bg-[var(--color-atelier-terracota)] text-white hover:bg-[#8c562e] rounded-xl transition-all shadow-sm cursor-pointer" title="Anexar Arquivos">
                                <input type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={handleFileSelection} disabled={isUploading} />
                                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                                <span className="font-bold text-[10px] uppercase tracking-widest">Adicionar Anexos</span>
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 🟢 TELEMETRIA DE PRODUÇÃO (SEM TÍTULO E SUBTÍTULO - APENAS TEMPO E BOTÃO INICIAR/FINALIZAR) */}
              <div className="bg-blue-50/60 border border-blue-100/80 rounded-2xl p-4 flex items-center justify-between gap-3 shrink-0 order-2 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${task.status === 'in_progress' ? 'bg-blue-600 text-white animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                    <Timer size={20} />
                  </div>
                  <span className="font-elegant text-2xl font-bold text-blue-900 tracking-wider">
                    {formatTime(totalSpentSeconds)}
                  </span>
                </div>

                <div>
                  {task.status === 'in_progress' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAction('review');
                        handleCloseModal();
                      }}
                      className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center cursor-pointer touch-manipulation"
                      title="Finalizar (Mover para Revisão)"
                    >
                      <CheckCircle2 size={20} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAction('in_progress');
                      }}
                      className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center cursor-pointer touch-manipulation"
                      title="Iniciar Contagem"
                    >
                      <PlayCircle size={20} />
                    </button>
                  )}
                </div>
              </div>

                    <div className="flex flex-col gap-2 mt-2 sm:mt-4 pt-4 border-t border-gray-100 order-2">
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
                      <div className="flex gap-2 flex-wrap">
                        <input 
                          type="text"
                          value={newLinkTitle}
                          onChange={(e) => setNewLinkTitle(e.target.value)}
                          placeholder="Nome do Link (Ex: Figma)"
                          className="w-1/3 bg-white p-3 rounded-xl border border-gray-200 text-[12px] text-[var(--color-atelier-grafite)] focus:outline-none focus:border-[var(--color-atelier-terracota)] shadow-sm transition-colors"
                        />
                        <input 
                          type="url"
                          value={newLinkInput}
                          onChange={(e) => setNewLinkInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newLinkInput.trim() && newLinkTitle.trim()) {
                              e.preventDefault();
                              setLocalExternalLinks([...localExternalLinks, { title: newLinkTitle.trim(), url: newLinkInput.trim() }]);
                              setNewLinkTitle("");
                              setNewLinkInput("");
                            }
                          }}
                          placeholder="https://exemplo.com/material"
                          className="flex-1 bg-white p-3 rounded-xl border border-gray-200 text-[12px] text-[var(--color-atelier-grafite)] focus:outline-none focus:border-[var(--color-atelier-terracota)] shadow-sm transition-colors"
                        />
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            if (newLinkInput.trim() && newLinkTitle.trim()) {
                              setLocalExternalLinks([...localExternalLinks, { title: newLinkTitle.trim(), url: newLinkInput.trim() }]);
                              setNewLinkTitle("");
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
                          {localExternalLinks.map((link: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] px-3 py-1.5 rounded-lg border border-[var(--color-atelier-terracota)]/20 text-[11px] font-medium">
                              <span className="max-w-[150px] truncate">{typeof link === 'string' ? link : link.title}</span>
                              <button onClick={() => setLocalExternalLinks(localExternalLinks.filter((_, idx) => idx !== i))} className="hover:text-red-500">
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

              {/* 🟢 GESTÃO DE PRAZO (ADMIN VIEW) */}
              {isAdmin && (
                <div className="mt-4 pt-6 border-t border-gray-100 flex flex-col gap-5 shrink-0 order-6 pb-6 sm:pb-0">
                  <div className="flex flex-col gap-3">
                    <h4 className="font-roboto text-[10px] font-bold uppercase tracking-widest text-orange-500 flex items-center gap-2">
                      <Clock size={12}/> Ajuste de Prazo
                    </h4>
                    <div className="flex items-center gap-3">
                      <input 
                        type="datetime-local" 
                        value={formatForDateTimeLocal(localDeadline)} 
                        onChange={(e) => setLocalDeadline(e.target.value ? parseFromDateTimeLocal(e.target.value) : null)} 
                        className="flex-1 bg-white border border-gray-200 rounded-xl p-3 text-[13px] outline-none focus:border-orange-400 shadow-sm" 
                      />
                      <button onClick={handleUpdateDeadline} disabled={isSavingDeadline || localDeadline === task.deadline} className="bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white px-5 h-[46px] rounded-xl text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm">
                        {isSavingDeadline ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Atualizar
                      </button>
                    </div>
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