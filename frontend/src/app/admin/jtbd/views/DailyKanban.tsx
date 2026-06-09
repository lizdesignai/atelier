// src/app/admin/jtbd/views/DailyKanban.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle, CheckCircle2, Image as ImageIcon, PlayCircle, FileText } from "lucide-react";
import TaskCard from "../components/TaskCard";
import { supabase } from "../../../../lib/supabase";

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
  handleFileUpload?: (taskId: string, file: File) => Promise<void>; 
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
  handleFileUpload
}: DailyKanbanProps) {

  // ==========================================================================
  // ESTADO GLOBAL DO MODAL DO KANBAN (O MESTRE DE EXIBIÇÃO)
  // ==========================================================================
  const [activeTaskModal, setActiveTaskModal] = useState<any | null>(null);

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

  const processKanbanUpload = async (taskId: string, file: File) => {
    try {
      const allTasks = [...pendingTasks, ...inProgressTasks, ...reviewTasks, ...completedTasks];
      const task = allTasks.find(t => t.id === taskId);
      if (!task) return;

      window.dispatchEvent(new CustomEvent("showToast", { detail: "Processando arquivo gráfico e conectando ao Visual Flow..." }));

      const { data: projData } = await supabase.from('projects').select('client_id').eq('id', task.project_id).single();
      const clientId = projData?.client_id || 'unassigned';

      const fileExt = file.name.split('.').pop();
      const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${clientId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('community_images').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('community_images').getPublicUrl(filePath);
      const fileUrl = publicUrlData.publicUrl;

      await supabase.from('social_posts').insert({
        project_id: task.project_id,
        client_id: clientId,
        task_id: task.id,
        image_url: fileUrl,
        title: task.title,
        caption: task.description || "",
        status: 'internal_review'
      });

      await supabase.from('tasks').update({ 
        attachment_url: fileUrl,
        status: 'review'
      }).eq('id', task.id);

      updateTaskStatus({ ...task, attachment_url: fileUrl }, 'review');
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Ficheiro enviado para a fila de Revisão Interna! 🎨" }));
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

    return (
      <motion.div 
        key={task.id}
        layout="position"
        layoutId={`task-${task.id}`}
        
        initial={{ opacity: 0, y: 30, scale: 0.95, filter: "blur(8px)" }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1, 
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
        
        draggable={!task.is_blocked && !isCompleted}
        onDragStart={(e: any) => {
          if (task.is_blocked || isCompleted) {
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
                  <PlayCircle size={20} className="text-[var(--color-atelier-grafite)]/50"/> Fila de Trabalho
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
                onCloseModal={() => setActiveTaskModal(null)}
                onRevert={(taskId) => {
                  updateTaskStatus(activeTaskModal.task, 'review');
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}