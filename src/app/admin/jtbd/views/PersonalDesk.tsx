// src/app/admin/jtbd/views/PersonalDesk.tsx
import { Target, Activity, Clock, CheckCircle2, Eye } from "lucide-react";

interface PersonalDeskProps {
  viewedUser: any;
  isViewingSelf: boolean;
  allUserTasks: any[];
}

export default function PersonalDesk({
  viewedUser,
  isViewingSelf,
  allUserTasks
}: PersonalDeskProps) {
  
  // ============================================================================
  // CÁLCULO DE MÉTRICAS OPERACIONAIS
  // ============================================================================
  
  // 1. Foco Atual: Procura a primeira tarefa que esteja 'in_progress'
  const currentTask = allUserTasks.find(t => t.status === 'in_progress');
  const currentFocus = currentTask ? currentTask.title : "Livre no momento";

  // 2. Carga Visível: Soma do tempo estimado das tarefas não concluídas
  const activeTasks = allUserTasks.filter(t => ['pending', 'in_progress', 'review'].includes(t.status));
  const totalEstMinutes = activeTasks.reduce((acc, t) => acc + (t.estimated_time || 0), 0);
  const cargaHoras = Math.floor(totalEstMinutes / 60);
  const cargaMin = totalEstMinutes % 60;
  const cargaFormatada = cargaMin > 0 ? `${cargaHoras}h ${cargaMin}m` : `${cargaHoras}h`;

  // 3. Eficiência: Percentagem de tarefas concluídas face ao total
  const completedTasksCount = allUserTasks.filter(t => t.status === 'completed').length;
  const totalTasksCount = allUserTasks.length;
  const eficiencia = totalTasksCount === 0 ? 0 : Math.round((completedTasksCount / totalTasksCount) * 100);

  const greeting = isViewingSelf 
    ? `Olá, ${viewedUser?.nome?.split(" ")[0] || ""}` 
    : `Mesa de ${viewedUser?.nome?.split(" ")[0] || ""}`;

  return (
    <div className="shrink-0 flex flex-col w-full animate-[fadeInUp_0.5s_ease-out]">
      
      <div className="w-full glass-panel bg-[var(--color-atelier-grafite)] p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-center min-h-[300px]">
        {/* Efeito de Fundo */}
        <div className="absolute right-[-10%] top-[-20%] w-[300px] h-[300px] bg-[var(--color-atelier-terracota)]/20 rounded-full blur-[60px] pointer-events-none"></div>
        
        <div className="flex flex-col items-center text-center relative z-10 w-full">
          
          {/* Avatar */}
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full bg-white/10 overflow-hidden border border-white/20 flex items-center justify-center text-3xl font-elegant text-white shadow-inner">
              {viewedUser?.avatar_url 
                ? <img src={viewedUser.avatar_url} className="w-full h-full object-cover" alt="Avatar"/> 
                : viewedUser?.nome?.charAt(0)}
            </div>
          </div>
          
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)] mb-1 flex items-center justify-center gap-1">
            {isViewingSelf ? <CheckCircle2 size={12}/> : <Eye size={12}/>} 
            {isViewingSelf ? 'Mesa de Trabalho' : 'Modo Espectador'}
          </span>
          
          <h2 className="font-elegant text-3xl md:text-4xl text-white tracking-wide leading-none mb-6">{greeting}</h2>
          
          {/* Métricas Operacionais */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* Foco Atual */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-inner hover:bg-white/10 transition-colors">
              <Target size={16} className="text-[var(--color-atelier-terracota)] mb-1"/>
              <span className="text-[9px] text-white/50 uppercase tracking-widest mb-1">Foco Atual</span>
              <span className="text-white font-bold text-[11px] truncate w-full px-2">{currentFocus}</span>
            </div>

            {/* Eficiência */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-inner hover:bg-white/10 transition-colors">
              <Activity size={16} className="text-[var(--color-atelier-terracota)] mb-1"/>
              <span className="text-[9px] text-white/50 uppercase tracking-widest mb-1">Eficiência</span>
              <span className="text-white font-bold text-sm">{eficiencia}%</span>
            </div>

            {/* Carga Visível */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-inner hover:bg-white/10 transition-colors">
              <Clock size={16} className="text-[var(--color-atelier-terracota)] mb-1"/>
              <span className="text-[9px] text-white/50 uppercase tracking-widest mb-1">Carga Visível</span>
              <span className="text-white font-bold text-sm">{cargaFormatada}</span>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}