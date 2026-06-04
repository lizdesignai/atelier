// src/app/admin/jtbd/views/DailyKanban.tsx
import { Clock, Crosshair, PlayCircle, AlertTriangle, CheckCircle2, Image as ImageIcon } from "lucide-react";
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
  handleDrop
}: DailyKanbanProps) {

  // ==========================================================================
  // MOTORES DE INTERCEPTAÇÃO: KANBAN <-> VISUAL FLOW <-> COCKPIT CLIENTE
  // ==========================================================================
  const promotePostToClient = async (taskId: string) => {
    try {
      // Quando a tarefa for aprovada no Kanban, o post avança para a aprovação do cliente
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
  };

  const handleDropIntercept = async (e: React.DragEvent, newStatus: string) => {
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId && newStatus === 'completed') {
      const allTasks = [...pendingTasks, ...inProgressTasks, ...reviewTasks, ...completedTasks];
      const task = allTasks.find(t => t.id === taskId);
      if (task && task.attachment_url) {
        await promotePostToClient(task.id);
      }
    }
    handleDrop(e, newStatus);
  };

  // 🟢 O SUPER-MOTOR DE UPLOAD DO KANBAN
  // Se o designer fizer o upload da imagem POR DENTRO DO KANBAN, ele faz todo o fluxo inverso!
  const processKanbanUpload = async (taskId: string, file: File) => {
    try {
      const allTasks = [...pendingTasks, ...inProgressTasks, ...reviewTasks, ...completedTasks];
      const task = allTasks.find(t => t.id === taskId);
      if (!task) return;

      window.dispatchEvent(new CustomEvent("showToast", { detail: "Processando arte gráfica e conectando ao Visual Flow..." }));

      // 1. Resgatar Client ID
      const { data: projData } = await supabase.from('projects').select('client_id').eq('id', task.project_id).single();
      const clientId = projData?.client_id || 'unassigned';

      // 2. Storage Upload Seguro
      const fileExt = file.name.split('.').pop();
      const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${clientId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('community_images').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('community_images').getPublicUrl(filePath);
      const fileUrl = publicUrlData.publicUrl;

      // 3. Cadastrar Post no Visual Flow (internal_review = Oculto do cliente, visível para a Gestão)
      await supabase.from('social_posts').insert({
        project_id: task.project_id,
        client_id: clientId,
        task_id: task.id,
        image_url: fileUrl,
        title: task.title,
        caption: task.description || "",
        status: 'internal_review'
      });

      // 4. Atualizar a Tarefa do Kanban (Adiciona imagem e move para a coluna de Revisão)
      await supabase.from('tasks').update({ 
        attachment_url: fileUrl,
        status: 'review'
      }).eq('id', task.id);

      // 5. Mutação Otimista na Interface
      updateTaskStatus({ ...task, attachment_url: fileUrl }, 'review');
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Arte enviada para a fila de Revisão Interna! 🎨" }));

    } catch (error) {
      console.error(error);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Falha ao enviar a mídia." }));
    }
  };

  // ==========================================================================
  // RENDERIZADOR DE CARTÕES PREMIUM (COM CAPA VISUAL INTELIGENTE)
  // ==========================================================================
  const renderTask = (task: any, isFocus = false, isReview = false, isCompleted = false) => {
    const badgeColor = isCompleted ? 'bg-green-500/90' : isReview ? 'bg-purple-500/90' : 'bg-[var(--color-atelier-terracota)]/90';
    const badgeText = isCompleted ? 'Aprovado' : isReview ? 'Em Revisão' : 'Anexado';

    return (
      <div key={task.id} className="shrink-0 flex flex-col relative w-full mb-1 group/wrapper">
        {/* 🟢 Capa da Arte Visual (Correção de Esmagamento) */}
        {task.attachment_url && (
           <div className="w-full h-32 rounded-[1.2rem] rounded-b-none overflow-hidden relative border border-b-0 border-white/80 shadow-sm -mb-4 z-0 bg-gray-100">
             <img src={task.attachment_url} className="w-full h-full object-cover opacity-90 group-hover/wrapper:scale-105 transition-transform duration-500" alt="Capa Visual" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
             <div className={`absolute top-3 right-3 ${badgeColor} backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1`}>
               <ImageIcon size={10} /> {badgeText}
             </div>
           </div>
        )}
        <div className="relative z-10 w-full">
          <TaskCard 
            task={task} 
            isFocus={isFocus}
            isReview={isReview}
            isCompleted={isCompleted}
            isAdmin={isAdminOrManager} 
            onAction={(newStatus: string) => handleActionIntercept(task, newStatus)} 
            onReschedule={() => handleReschedule(task)} 
            isRescheduling={isRescheduling === task.id}
            onUpload={processKanbanUpload} // 🟢 Injeção do Motor de Upload
          />
        </div>
      </div>
    );
  };

  return (
    // 🟢 ENGENHARIA SÊNIOR: Removido o `transform` (animate) da raiz para evitar que os pop-ups `fixed` fiquem presos dentro da coluna
    <div className="flex-1 w-full flex relative z-10 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex-1 flex gap-6 overflow-x-auto custom-scrollbar pb-6 px-1 h-full items-stretch">
        
        {/* =========================================
            COLUNA 1: FILA DE ESPERA (Backlog Diário)
            ========================================= */}
        <div 
          className="flex flex-col min-w-[340px] w-[340px] shrink-0 h-full relative group/col"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropIntercept(e, 'pending')}
        >
          <div className="absolute inset-0 bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-sm group-hover/col:shadow-md transition-shadow duration-300 overflow-hidden pointer-events-none z-0"></div>
          
          <div className="relative z-10 flex flex-col h-full p-5">
            <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                <Clock size={18} className="text-[var(--color-atelier-grafite)]/40"/> Fila de Espera
              </h3>
              <span className="bg-white px-3 py-1 rounded-lg text-[11px] font-bold text-[var(--color-atelier-grafite)]/60 shadow-sm border border-[var(--color-atelier-grafite)]/5">
                {pendingTasks.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4 pb-4">
              {pendingTasks.length === 0 ? (
                <div className="text-center flex flex-col items-center justify-center text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/30 mt-10 pointer-events-none border-2 border-dashed border-[var(--color-atelier-grafite)]/10 rounded-3xl py-12 bg-white/20">
                  <Clock size={32} className="mb-3 opacity-20" />
                  Arraste para cá
                </div>
              ) : (
                pendingTasks.map(task => renderTask(task, false, false, false))
              )}
            </div>
          </div>
        </div>

        {/* =========================================
            COLUNA 2: EM ANDAMENTO (Live Execution)
            ========================================= */}
        <div 
          className="flex flex-col min-w-[340px] w-[340px] shrink-0 h-full relative group/col"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropIntercept(e, 'in_progress')}
        >
          <div className="absolute inset-0 bg-blue-50/60 backdrop-blur-xl rounded-[2.5rem] border border-blue-100 shadow-[inset_0_4px_20px_rgba(59,130,246,0.05)] group-hover/col:shadow-md transition-shadow duration-300 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1.5 bg-blue-500 rounded-b-full shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
            <div className="absolute top-[-50px] left-[-50px] w-40 h-40 bg-blue-400/10 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10 flex flex-col h-full p-5">
            <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-blue-200/50 pb-4">
              <h3 className="font-elegant text-2xl text-blue-900 flex items-center gap-2">
                <Crosshair size={18} className="text-blue-500"/> Em Andamento 
                <span className="text-[10px] font-sans uppercase font-bold tracking-widest text-blue-500 bg-blue-100 px-2 py-0.5 rounded animate-pulse shadow-sm">Live</span>
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4 pb-4">
              {inProgressTasks.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-60 pointer-events-none border-2 border-dashed border-blue-300/50 rounded-3xl p-6 bg-blue-100/20">
                   <PlayCircle size={48} className="mb-4 text-blue-500 opacity-50"/>
                   <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-blue-900/60 max-w-[200px]">Arraste uma tarefa para iniciar a Execução</span>
                 </div>
              ) : (
                inProgressTasks.map(task => renderTask(task, true, false, false))
              )}
            </div>
          </div>
        </div>

        {/* =========================================
            COLUNA 3: REVISÃO INTERNA (Aprovação)
            ========================================= */}
        <div 
          className="flex flex-col min-w-[340px] w-[340px] shrink-0 h-full relative group/col"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropIntercept(e, 'review')}
        >
          <div className="absolute inset-0 bg-orange-50/60 backdrop-blur-xl rounded-[2.5rem] border border-orange-200 shadow-[inset_0_4px_20px_rgba(249,115,22,0.03)] group-hover/col:shadow-md transition-shadow duration-300 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-orange-400/10 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10 flex flex-col h-full p-5">
            <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-orange-200/50 pb-4">
              <h3 className="font-elegant text-2xl text-orange-900 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-500"/> Revisão Interna
              </h3>
              <span className="bg-white px-3 py-1 rounded-lg text-[11px] font-bold text-orange-600 shadow-sm border border-orange-200">
                {reviewTasks.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4 pb-4">
              {reviewTasks.length === 0 ? (
                <div className="text-center flex flex-col items-center justify-center text-[10px] uppercase font-bold text-orange-900/30 mt-10 pointer-events-none border-2 border-dashed border-orange-300/50 rounded-3xl py-12 bg-orange-100/20">
                  <AlertTriangle size={32} className="mb-3 opacity-20" />
                  Aguardando aprovações
                </div>
              ) : (
                reviewTasks.map(task => renderTask(task, false, true, false))
              )}
            </div>
          </div>
        </div>

        {/* =========================================
            COLUNA 4: CONCLUÍDAS (Feitos)
            ========================================= */}
        <div 
          className="flex flex-col min-w-[340px] w-[340px] shrink-0 h-full relative group/col opacity-90 hover:opacity-100 transition-opacity duration-300"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropIntercept(e, 'completed')}
        >
          <div className="absolute inset-0 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/80 shadow-sm overflow-hidden pointer-events-none z-0"></div>
          
          <div className="relative z-10 flex flex-col h-full p-5">
            <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-500"/> Concluídas
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4 pb-4">
              {completedTasks.length === 0 ? (
                <div className="text-center flex flex-col items-center justify-center text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/30 mt-10 pointer-events-none border-2 border-dashed border-[var(--color-atelier-grafite)]/10 rounded-3xl py-12 bg-white/20">
                  <CheckCircle2 size={32} className="mb-3 opacity-20" />
                  Mesa limpa
                </div>
              ) : (
                completedTasks.map(task => renderTask(task, false, false, true))
              )}
            </div>
          </div>
        </div>

        {/* SPACER INVISÍVEL */}
        <div className="min-w-[12px] shrink-0 pointer-events-none"></div>

      </div>
    </div>
  );
}