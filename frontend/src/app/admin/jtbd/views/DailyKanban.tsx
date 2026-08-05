"use client";

// src/app/admin/jtbd/views/DailyKanban.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle, CheckCircle2, Image as ImageIcon, PlayCircle, FileText, User, Briefcase } from "lucide-react";
import TaskCard from "../components/TaskCard";
import { supabase } from "../../../../lib/supabase";
import ClientAssetsModal from "../../../../components/ClientAssetsModal";

interface DailyKanbanProps {
  pendingTasks: any[];
  inProgressTasks: any[];
  reviewTasks: any[];
  completedTasks: any[];
  isAdminOrManager: boolean;
  updateTaskStatus: (task: any, newStatus: string) => void;
  handleReschedule: (task: any) => void;
  isRescheduling: string | null;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, newStatus: string) => void;
  handleFileUpload?: (taskId: string, files: File[]) => Promise<void>; 
  teamData?: any[];
  currentUser?: any;
  selectedClient?: any;
}

export default function DailyKanban({
  pendingTasks,
  inProgressTasks,
  reviewTasks,
  completedTasks,
  isAdminOrManager,
  updateTaskStatus,
  handleReschedule,
  isRescheduling,
  handleDragOver,
  handleDrop,
  handleFileUpload,
  teamData = [],
  currentUser,
  selectedClient
}: DailyKanbanProps) {

  // ==========================================================================
  // ESTADO GLOBAL DO MODAL DO KANBAN (O MESTRE DE EXIBIÇÃO)
  // ==========================================================================
  const [activeTaskModal, setActiveTaskModal] = useState<{task: any, isFocus: boolean, isReview: boolean, isCompleted: boolean} | null>(null);
  const [activeAssetsTask, setActiveAssetsTask] = useState<any | null>(null);

  useEffect(() => {
    const handleOpenModal = (e: CustomEvent) => {
      if (e.detail) {
        setActiveTaskModal(e.detail);
      }
    };
    window.addEventListener("openTaskModal" as any, handleOpenModal);
    return () => window.removeEventListener("openTaskModal" as any, handleOpenModal);
  }, []);

  // 🟢 UNIFICAÇÃO DA FILA: Junta as tarefas pendentes com as em andamento
  const activeQueueTasks = [...inProgressTasks, ...pendingTasks];

  // ==========================================================================
  // MOTORES DE INTERCEPTAÇÃO: KANBAN -> COCKPIT CLIENTE
  // ==========================================================================
  const promotePostToClient = async (taskId: string) => {
    try {
      await supabase.from('social_posts')
        .update({ status: 'pending_approval' })
        .eq('task_id', taskId)
        .eq('status', 'internal_review');
        
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Arte visual liberada para aprovação do cliente! 🚀" }));
    } catch (e) {
      console.error("Erro ao promover arte ao cliente:", e);
    }
  };

  const handleActionIntercept = async (task: any, newStatus: string) => {
    updateTaskStatus(task, newStatus);
    if (newStatus === 'completed' && task.attachment_url) {
      await promotePostToClient(task.id);
    }
    setActiveTaskModal(null);
  };

  const handleDropIntercept = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault(); 
    const taskId = e.dataTransfer.getData("taskId");
    
    if (!taskId) return;

    const allTasks = [...pendingTasks, ...inProgressTasks, ...reviewTasks, ...completedTasks];
    const task = allTasks.find(t => t.id === taskId);
    
    if (task) {
       handleDrop(e, newStatus);
       if (newStatus === 'completed' && task.attachment_url) {
         await promotePostToClient(task.id);
       }
    }
  };

  const processKanbanUpload = async (taskId: string, files: File[]) => {
    try {
      const allTasks = [...pendingTasks, ...inProgressTasks, ...reviewTasks, ...completedTasks];
      const task = allTasks.find(t => t.id === taskId);
      if (!task) return;

      window.dispatchEvent(new CustomEvent("showToast", { detail: "Fazendo upload das mídias..." }));

      const { data: projData } = await supabase.from('projects').select('client_id').eq('id', task.project_id).single();
      const clientId = projData?.client_id || 'unassigned';

      let newMediaAssets = task.media_assets || [];
      let mainAttachmentUrl = task.attachment_url;

      for (const file of files) {
        const isVideo = file.type.startsWith('video/');
        const bucket = isVideo ? 'community_videos' : 'community_images';
        
        const fileExt = file.name.split('.').pop();
        const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${clientId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
        const fileUrl = publicUrlData.publicUrl;

        newMediaAssets.push({ type: isVideo ? 'video' : 'image', url: fileUrl });
        
        // Mantém attachment_url para retrocompatibilidade
        if (!mainAttachmentUrl && !isVideo) {
          mainAttachmentUrl = fileUrl;
        }
      }

      const isFirstUpload = !task.attachment_url && newMediaAssets.length > 0;
      
      const updatePayload = {
         attachment_url: mainAttachmentUrl,
         media_assets: newMediaAssets,
         status: 'review'
      };

      await supabase.from('tasks').update(updatePayload).eq('id', task.id);

      if (isFirstUpload) {
        await supabase.from('social_posts').insert({
          project_id: task.project_id,
          client_id: clientId,
          task_id: task.id,
          image_url: mainAttachmentUrl,
          media_assets: newMediaAssets,
          title: task.title,
          caption: task.caption || "",
          status: 'internal_review'
        });
      } else {
        const { data: existingPost } = await supabase.from('social_posts').select('id').eq('task_id', task.id).single();
        if (existingPost) {
          await supabase.from('social_posts')
             .update({ media_assets: newMediaAssets, image_url: mainAttachmentUrl })
             .eq('task_id', task.id);
        }
      }

      updateTaskStatus({ ...task, ...updatePayload }, 'review');
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Upload concluído! 🚀" }));
      setActiveTaskModal(null); 
    } catch (error) {
      console.error(error);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Falha ao enviar a mídia." }));
    }
  };

  // ==========================================================================
  // RENDERIZADOR DE CARTÕES PREMIUM (COM COVER TRELLO E FÍSICA CINEMATOGRÁFICA)
  // ==========================================================================
  const renderTask = (task: any, isFocus = false, isReview = false, isCompleted = false) => {
    const badgeColor = isCompleted ? 'bg-green-500/90' : isReview ? 'bg-purple-500/90' : 'bg-[var(--color-atelier-terracota)]/90';
    const badgeText = isCompleted ? 'Aprovado' : isReview ? 'Em Revisão' : 'Anexado';
    
    const isLive = task.status === 'in_progress' || isFocus;
    
    // 🟢 UTILITÁRIO: DETETAR SE É PDF
    const isPdf = task.attachment_url?.toLowerCase().includes('.pdf');
    
    // 🟢 ESTILIZAÇÃO ELEGANTE PARA TAREFAS CONCLUÍDAS (MÊS CORRENTE)
    if (isCompleted) {
      const assignee = teamData.find(t => t.id === task.assigned_to) || { nome: 'Desconhecido', avatar_url: null };
      const clientName = task.agency_subclients?.name || task.projects?.profiles?.nome || task.projects?.title || 'Projeto Não Especificado';
      const clientAvatar = task.projects?.profiles?.avatar_url || null;
      const completedDate = task.completed_at ? new Date(task.completed_at) : (task.updated_at ? new Date(task.updated_at) : new Date(task.deadline));
      const formattedDate = completedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      const formattedTime = completedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      return (
        <motion.div
          key={task.id}
          layout="position"
          layoutId={`task-${task.id}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          transition={{ layout: { type: "spring", stiffness: 350, damping: 28 } }}
          className="shrink-0 relative w-full mb-4 bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow group/completed"
          onClick={() => setActiveTaskModal({ task, isFocus: false, isReview: false, isCompleted: true })}
        >
          {/* Imagem de Capa (Ocupa a parte superior inteira) */}
          {task.attachment_url ? (
            <div className="w-full h-32 relative bg-gray-50 overflow-hidden">
              {isPdf ? (
                <div className="flex flex-col items-center justify-center w-full h-full opacity-30">
                  <FileText size={32} className="text-gray-600 mb-1" />
                  <span className="font-bold text-[8px] uppercase tracking-widest text-gray-600">Doc. PDF</span>
                </div>
              ) : (
                <img src={task.attachment_url} className="w-full h-full object-cover opacity-90 group-hover/completed:scale-105 transition-transform duration-700" alt="Capa" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
              <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur-md text-white text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded shadow-sm flex items-center gap-1">
                <CheckCircle2 size={10} /> Aprovado
              </div>
            </div>
          ) : (
            <div className="w-full h-8 relative bg-gradient-to-r from-gray-50 to-gray-100">
               <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur-md text-white text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded shadow-sm flex items-center gap-1">
                <CheckCircle2 size={10} /> Aprovado
              </div>
            </div>
          )}
          
          {/* Conteúdo Elegante (Título, Autor, Data, Projeto) */}
          <div className="p-3">
            <h3 className="text-xs font-bold text-gray-800 line-clamp-1 mb-3">{task.title}</h3>
            
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-2">
                 {/* Colaborador */}
                 <div className="flex items-center gap-1.5" title={`Feito por ${assignee.nome}`}>
                   {assignee.avatar_url ? (
                     <img src={assignee.avatar_url} className="w-5 h-5 rounded-full object-cover border border-gray-200" alt={assignee.nome} />
                   ) : (
                     <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                       <User size={10} className="text-gray-400" />
                     </div>
                   )}
                 </div>
                 
                 <div className="w-[1px] h-3 bg-gray-200"></div>
                 
                 {/* Projeto / Cliente */}
                 <div 
                   className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-100 p-1 -ml-1 rounded transition-colors group/client" 
                   title={`Projeto: ${clientName}. Clique para ver cofre.`}
                   onClick={(e) => { e.stopPropagation(); setActiveAssetsTask(task); }}
                 >
                   {clientAvatar ? (
                     <img src={clientAvatar} className="w-5 h-5 rounded-full object-cover border border-gray-200" alt={clientName} />
                   ) : (
                     <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                       <Briefcase size={10} className="text-gray-400 group-hover/client:text-[var(--color-atelier-terracota)]" />
                     </div>
                   )}
                   <span className="text-[10px] font-bold text-gray-600 max-w-[100px] truncate group-hover/client:text-[var(--color-atelier-terracota)] transition-colors">{clientName}</span>
                 </div>
              </div>
              
              {/* Data da Conclusão */}
              <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                <Clock size={10} />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={task.id}
        layout="position"
        layoutId={`task-${task.id}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          filter: "blur(0px)",
          ...(isLive ? { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] } : {}) 
        }}
        exit={{ opacity: 0, scale: 0.9, filter: "blur(5px)", transition: { duration: 0.2 } }}
        
        transition={{ 
          layout: { type: "spring", stiffness: 350, damping: 28, mass: 0.8 }, 
          opacity: { duration: 0.3 },
          ...(isLive ? { backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" } } : {})
        }}
        
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        whileDrag={{ 
          scale: 1.06, 
          rotate: 3, 
          zIndex: 9999, 
          cursor: "grabbing",
          boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.3)"
        }}
        
        draggable={!isCompleted}
        onDragStart={(e: any) => {
          if (isCompleted) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData("taskId", task.id);
        }}
        style={isLive ? { backgroundImage: 'linear-gradient(270deg, #3b82f6, #06b6d4, #3b82f6)', backgroundSize: '200% 200%' } : {}}
        className={`shrink-0 flex flex-col relative w-full mb-4 group/wrapper 
          ${isLive ? 'p-[3px] rounded-[1.4rem] shadow-[0_0_20px_rgba(59,130,246,0.4)]' : 'rounded-[1.4rem] cursor-grab active:cursor-grabbing'}
        `}
      >
        <div className={`flex flex-col relative w-full h-full ${isLive ? 'bg-white rounded-[1.3rem] overflow-hidden' : ''}`}>
          
          {/* 🟢 Capa da Arte Visual Integrada Estilo Trello (Miniatura do Kanban) */}
          {task.attachment_url && (
             <div 
               className={`w-full h-36 relative border border-white/80 shadow-sm z-0 bg-gray-100 cursor-pointer overflow-hidden flex items-center justify-center
                 ${isLive ? '' : 'rounded-[1.2rem] rounded-b-none border-b-0 -mb-4'}
               `}
               onClick={() => setActiveTaskModal({ task, isFocus: isLive, isReview, isCompleted })}
             >
               {isPdf ? (
                 <div className="flex flex-col items-center justify-center opacity-40">
                   <FileText size={40} className="text-[var(--color-atelier-grafite)] mb-1" />
                   <span className="font-bold text-[9px] uppercase tracking-widest text-[var(--color-atelier-grafite)]">Doc. PDF</span>
                 </div>
               ) : (
                 <img src={task.attachment_url} className="w-full h-full object-cover opacity-90 group-hover/wrapper:scale-105 transition-transform duration-500" alt="Capa Visual" />
               )}
               
               <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
               <div className={`absolute top-3 right-3 ${badgeColor} backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1`}>
                 {isPdf ? <FileText size={10} /> : <ImageIcon size={10} />} {badgeText}
               </div>
             </div>
          )}
          
          {/* O Cartão - Agora com botões 100% funcionais */}
          <div 
            className="relative z-10 w-full"
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName !== 'BUTTON' && !(e.target as HTMLElement).closest('button')) {
                setActiveTaskModal({ task, isFocus: isLive, isReview, isCompleted });
              }
            }}
          >
            <TaskCard 
              task={task} 
              isFocus={isLive}
              isReview={isReview}
              isCompleted={isCompleted}
              isAdmin={isAdminOrManager} 
              onAction={(newStatus: string) => handleActionIntercept(task, newStatus)} 
              onReschedule={() => handleReschedule(task)} 
              isRescheduling={isRescheduling === task.id}
              forceStaticMode={true} 
              currentUser={currentUser}
              onRevert={() => updateTaskStatus(task, 'review')} 
            />
          </div>

        </div>
      </motion.div>
    );
  };

  return (
    <>
      <div className="flex-1 w-full flex relative z-10 h-full overflow-hidden animate-[fadeIn_0.5s_ease-out]">
        <div className="flex-1 flex gap-6 overflow-x-auto overflow-y-hidden custom-scrollbar pb-2 px-1 h-full items-stretch">
          
          {/* =========================================
              COLUNA 1: FILA DE TRABALHO (Pending + Live)
              ========================================= */}
          <div 
            className="flex flex-col min-w-[360px] w-[360px] shrink-0 h-full max-h-full relative group/col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropIntercept(e, 'pending')}
          >
            <div className="absolute inset-0 bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-sm group-hover/col:shadow-md transition-shadow duration-300 overflow-hidden pointer-events-none z-0"></div>
            
            <div className="relative z-10 flex flex-col h-full p-6">
              <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                  <PlayCircle size={20} className="text-[var(--color-atelier-grafite)]/50"/> {selectedClient ? 'Fila do Cliente' : 'Fila de Trabalho'}
                </h3>
                <span className="bg-white px-3 py-1 rounded-lg text-[11px] font-bold text-[var(--color-atelier-grafite)]/60 shadow-sm border border-[var(--color-atelier-grafite)]/5">
                  {activeQueueTasks.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-3 flex flex-col pt-2 pb-4">
                <AnimatePresence mode="popLayout">
                  {activeQueueTasks.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.9 }} 
                      className="text-center flex flex-col items-center justify-center text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/30 mt-10 pointer-events-none border-2 border-dashed border-[var(--color-atelier-grafite)]/10 rounded-3xl py-12 bg-white/20"
                    >
                      <Clock size={32} className="mb-3 opacity-20" />
                      Mesa Limpa
                    </motion.div>
                  ) : (
                    activeQueueTasks.map(task => {
                      const isLive = task.status === 'in_progress';
                      return renderTask(task, isLive, false, false);
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* =========================================
              COLUNA 2: REVISÃO INTERNA (Aprovação)
              ========================================= */}
          <div 
            className="flex flex-col min-w-[360px] w-[360px] shrink-0 h-full max-h-full relative group/col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropIntercept(e, 'review')}
          >
            <div className="absolute inset-0 bg-orange-50/60 backdrop-blur-xl rounded-[2.5rem] border border-orange-200 shadow-[inset_0_4px_20px_rgba(249,115,22,0.03)] group-hover/col:shadow-md transition-shadow duration-300 overflow-hidden pointer-events-none z-0">
              <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-orange-400/10 rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative z-10 flex flex-col h-full p-6">
              <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-orange-200/50 pb-4">
                <h3 className="font-elegant text-2xl text-orange-900 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-orange-500"/> Revisão Interna
                </h3>
                <span className="bg-white px-3 py-1 rounded-lg text-[11px] font-bold text-orange-600 shadow-sm border border-orange-200">
                  {reviewTasks.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-3 flex flex-col pt-2 pb-4">
                <AnimatePresence mode="popLayout">
                  {reviewTasks.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.9 }} 
                      className="text-center flex flex-col items-center justify-center text-[10px] uppercase font-bold text-orange-900/30 mt-10 pointer-events-none border-2 border-dashed border-orange-300/50 rounded-3xl py-12 bg-orange-100/20"
                    >
                      <AlertTriangle size={32} className="mb-3 opacity-20" />
                      Aguardando Aprovações
                    </motion.div>
                  ) : (
                    reviewTasks.map(task => renderTask(task, false, true, false))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* =========================================
              COLUNA 3: CONCLUÍDAS (Feitos)
              ========================================= */}
          <div 
            className="flex flex-col min-w-[360px] w-[360px] shrink-0 h-full max-h-full relative group/col opacity-90 hover:opacity-100 transition-opacity duration-300"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropIntercept(e, 'completed')}
          >
            <div className="absolute inset-0 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/80 shadow-sm overflow-hidden pointer-events-none z-0"></div>
            
            <div className="relative z-10 flex flex-col h-full p-6">
              <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-500"/> Concluídas
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-3 flex flex-col pt-2 pb-4">
                <AnimatePresence mode="popLayout">
                  {completedTasks.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.9 }} 
                      className="text-center flex flex-col items-center justify-center text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/30 mt-10 pointer-events-none border-2 border-dashed border-[var(--color-atelier-grafite)]/10 rounded-3xl py-12 bg-white/20"
                    >
                      <CheckCircle2 size={32} className="mb-3 opacity-20" />
                      Mesa Limpa
                    </motion.div>
                  ) : (
                    completedTasks.map(task => renderTask(task, false, false, true))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="min-w-[12px] shrink-0 pointer-events-none"></div>
        </div>
      </div>

      {/* ==========================================================================
          O MODAL MESTRE (RENDERIZADO FORA DAS COLUNAS PARA NÃO BUGAR)
          ========================================================================== */}
      <AnimatePresence>
        {activeTaskModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4">
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
                onAction={(newStatus: string) => handleActionIntercept(activeTaskModal.task, newStatus)} 
                onReschedule={() => {
                  handleReschedule(activeTaskModal.task);
                  setActiveTaskModal(null);
                }} 
                isRescheduling={isRescheduling === activeTaskModal.task.id}
                onUpload={processKanbanUpload} 
                forceOpenModal={true} 
                currentUser={currentUser}
                onCloseModal={() => setActiveTaskModal(null)}
                onRevert={(taskId) => {
                  updateTaskStatus(activeTaskModal.task, 'review');
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ClientAssetsModal 
        isOpen={activeAssetsTask !== null}
        onClose={() => setActiveAssetsTask(null)}
        projectId={activeAssetsTask?.project_id}
        subclientId={activeAssetsTask?.subclient_id}
        clientName={activeAssetsTask?.agency_subclients?.name || activeAssetsTask?.projects?.profiles?.nome || 'Cliente'}
      />

    </>
  );
}