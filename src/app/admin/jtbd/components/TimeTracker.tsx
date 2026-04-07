// src/app/admin/jtbd/components/TimeTracker.tsx
import { useState, useEffect } from "react";
import { Clock, PlayCircle, CheckCircle2 } from "lucide-react";

interface TimeTrackerProps {
  allUserTasks: any[];
}

export default function TimeTracker({ allUserTasks }: TimeTrackerProps) {
  // Estado para forçar a re-renderização a cada minuto (Tick)
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // Filtragem e Ordenação Inteligente
  const trackedTasks = allUserTasks.filter(t => 
    t.actual_time > 0 || t.status === 'in_progress' || t.status === 'review' || t.status === 'completed'
  ).sort((a, b) => {
    // Ordena para mostrar as "Em Foco" no topo e as recém alteradas a seguir
    if (a.status === 'in_progress') return -1;
    if (b.status === 'in_progress') return 1;
    return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
  });

  const getTaskRealTime = (task: any) => {
    let time = task.actual_time || 0;
    if (task.status === 'in_progress' && task.started_at) {
      const diff = Math.floor((new Date().getTime() - new Date(task.started_at).getTime()) / 60000);
      time += Math.max(0, diff);
    }
    return time;
  };

  const formatHours = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="w-full h-full glass-panel bg-white/60 p-6 rounded-[2.5rem] border border-white shadow-sm flex flex-col overflow-hidden">
      <div className="flex justify-between items-center border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-4 shrink-0">
        <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
          <Clock size={20} className="text-[var(--color-atelier-terracota)]"/> Time Tracker
        </h3>
        <span className="bg-[var(--color-atelier-grafite)]/5 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
          Tempo Gasto
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
        {trackedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-40 text-center">
            <Clock size={32} className="mb-2 text-[var(--color-atelier-grafite)]" />
            <p className="font-roboto text-[11px] font-bold uppercase tracking-widest">Nenhum tempo registado</p>
          </div>
        ) : (
          trackedTasks.map(task => {
            const minutes = getTaskRealTime(task);
            const isRunning = task.status === 'in_progress';
            
            return (
              <div key={task.id} className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${isRunning ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:border-gray-200 shadow-sm'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isRunning ? 'bg-blue-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                    {isRunning ? <PlayCircle size={14}/> : <CheckCircle2 size={14}/>}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className={`font-roboto font-bold text-[12px] truncate ${isRunning ? 'text-blue-900' : 'text-[var(--color-atelier-grafite)]'}`}>
                      {task.title}
                    </span>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-gray-400 truncate">
                      {task.projects?.profiles?.nome || "Interno"}
                    </span>
                  </div>
                </div>
                <div className="text-right pl-2 shrink-0">
                  <span className={`font-elegant text-lg ${isRunning ? 'text-blue-600' : 'text-[var(--color-atelier-terracota)]'}`}>
                    {formatHours(minutes)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
}