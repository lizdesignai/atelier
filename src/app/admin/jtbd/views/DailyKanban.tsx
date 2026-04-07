// src/app/admin/jtbd/views/DailyKanban.tsx
import { Clock, Crosshair, PlayCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import TaskCard from "../components/TaskCard";

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

  return (
    <div className="flex-1 flex gap-6 overflow-x-auto custom-scrollbar pb-6 min-h-[550px] animate-[fadeInUp_0.7s_ease-out]">
        
      {/* =========================================
          COLUNA 1: FILA DE ESPERA (Backlog Diário)
          ========================================= */}
      <div 
        className="flex flex-col min-w-[340px] w-[340px] shrink-0 bg-white/40 p-5 rounded-[2.5rem] border border-white h-full shadow-sm"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, 'pending')}
      >
        <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
            <Clock size={18} className="text-[var(--color-atelier-grafite)]/40"/> Fila de Espera
          </h3>
          <span className="bg-white px-2.5 py-1 rounded-md text-[11px] font-bold text-[var(--color-atelier-grafite)]/60 shadow-sm border border-[var(--color-atelier-grafite)]/5">
            {pendingTasks.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
          {pendingTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              isAdmin={isAdminOrManager} 
              onAction={(newStatus: string) => updateTaskStatus(task, newStatus)} 
              onReschedule={() => handleReschedule(task)} 
              isRescheduling={isRescheduling === task.id} 
            />
          ))}
          {pendingTasks.length === 0 && (
            <div className="text-center text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/30 mt-10 pointer-events-none border-2 border-dashed border-[var(--color-atelier-grafite)]/10 rounded-2xl py-8">
              Arraste para cá
            </div>
          )}
        </div>
      </div>

      {/* =========================================
          COLUNA 2: EM FOCO (Live Execution)
          ========================================= */}
      <div 
        className="flex flex-col min-w-[340px] w-[340px] shrink-0 bg-blue-50/70 p-5 rounded-[2.5rem] border border-blue-200 h-full shadow-inner relative overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, 'in_progress')}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1.5 bg-blue-500 rounded-b-full shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
        <div className="absolute top-[-50px] left-[-50px] w-40 h-40 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-blue-200/50 pb-4 relative z-10">
          <h3 className="font-elegant text-2xl text-blue-900 flex items-center gap-2">
            <Crosshair size={18} className="text-blue-500"/> Em Foco 
            <span className="text-[10px] font-sans uppercase font-bold tracking-widest text-blue-500 bg-blue-100 px-2 py-0.5 rounded animate-pulse">Live</span>
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4 relative z-10">
          {inProgressTasks.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-center opacity-40 pointer-events-none border-2 border-dashed border-blue-300 rounded-2xl p-6">
               <PlayCircle size={48} className="mb-4 text-blue-500 opacity-50"/>
               <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-blue-900">Arraste uma missão para iniciar o Tracker</span>
             </div>
          ) : (
            inProgressTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                isFocus 
                isAdmin={isAdminOrManager} 
                onAction={(newStatus: string) => updateTaskStatus(task, newStatus)} 
                onReschedule={() => handleReschedule(task)} 
                isRescheduling={isRescheduling === task.id}
              />
            ))
          )}
        </div>
      </div>

      {/* =========================================
          COLUNA 3: REVISÃO INTERNA (Aprovação)
          ========================================= */}
      <div 
        className="flex flex-col min-w-[340px] w-[340px] shrink-0 bg-orange-50/70 p-5 rounded-[2.5rem] border border-orange-200 h-full shadow-sm relative overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, 'review')}
      >
        <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-orange-400/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-orange-200/50 pb-4 relative z-10">
          <h3 className="font-elegant text-2xl text-orange-900 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500"/> Revisão Interna
          </h3>
          <span className="bg-white px-2.5 py-1 rounded-md text-[11px] font-bold text-orange-600 shadow-sm border border-orange-200">
            {reviewTasks.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4 relative z-10">
          {reviewTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              isReview 
              isAdmin={isAdminOrManager} 
              onAction={(newStatus: string) => updateTaskStatus(task, newStatus)} 
              onReschedule={() => handleReschedule(task)} 
              isRescheduling={isRescheduling === task.id}
            />
          ))}
          {reviewTasks.length === 0 && (
            <div className="text-center text-[10px] uppercase font-bold text-orange-900/30 mt-10 pointer-events-none border-2 border-dashed border-orange-300 rounded-2xl py-8">
              Aguardando aprovações
            </div>
          )}
        </div>
      </div>

      {/* =========================================
          COLUNA 4: ARSENAL (Concluídos)
          ========================================= */}
      <div 
        className="flex flex-col min-w-[340px] w-[340px] shrink-0 bg-white/40 p-5 rounded-[2.5rem] border border-white/60 h-full shadow-sm opacity-80 hover:opacity-100 transition-opacity"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, 'completed')}
      >
        <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-500"/> Arsenal (Feitos)
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
          {completedTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              isCompleted 
              isAdmin={isAdminOrManager} 
              onAction={() => {}} 
              onReschedule={() => {}} 
              isRescheduling={false} 
            />
          ))}
          {completedTasks.length === 0 && (
            <div className="text-center text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/30 mt-10 pointer-events-none border-2 border-dashed border-[var(--color-atelier-grafite)]/10 rounded-2xl py-8">
              Mesa limpa
            </div>
          )}
        </div>
      </div>

    </div>
  );
}