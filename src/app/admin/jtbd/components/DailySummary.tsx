// src/app/admin/jtbd/components/DailySummary.tsx
import { useState, useEffect } from "react";
import { Activity, Zap, Video, Layers } from "lucide-react";

interface DailySummaryProps {
  allUserTasks: any[];
}

export default function DailySummary({ allUserTasks }: DailySummaryProps) {
  // Estado para manter os totais atualizados "ao vivo" caso haja tarefa em andamento
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  let productiveMinutes = 0;
  let logisticsMinutes = 0;
  let completedCount = 0;

  const getTaskRealTime = (task: any) => {
    let time = task.actual_time || 0;
    if (task.status === 'in_progress' && task.started_at) {
      const diff = Math.floor((new Date().getTime() - new Date(task.started_at).getTime()) / 60000);
      time += Math.max(0, diff);
    }
    return time;
  };

  const trackedTasks = allUserTasks.filter(t => 
    t.actual_time > 0 || t.status === 'in_progress' || t.status === 'review' || t.status === 'completed'
  );

  trackedTasks.forEach(t => {
    const time = getTaskRealTime(t);
    // Separa o tempo de logística (ruído operacional) do tempo produtivo (foco)
    if (['reuniao', 'captacao'].includes(t.task_type)) {
      logisticsMinutes += time;
    } else {
      productiveMinutes += time;
    }
    if (t.status === 'completed') completedCount++;
  });

  const totalMinutes = productiveMinutes + logisticsMinutes;

  const formatHours = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="w-full h-full glass-panel bg-white/80 p-6 rounded-[2.5rem] border border-white shadow-md flex flex-col justify-between overflow-hidden">
      <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4 shrink-0">
        <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
          <Activity size={20} className="text-[var(--color-atelier-terracota)]"/> Resumo Operacional
        </h3>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4 py-4">
        
        <div className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-2xl shadow-sm hover:border-[var(--color-atelier-terracota)]/20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center"><Zap size={18}/></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Horas Produtivas</span>
              <span className="text-[10px] text-gray-400">Design, Copy, Setup</span>
            </div>
          </div>
          <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">{formatHours(productiveMinutes)}</span>
        </div>

        <div className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-2xl shadow-sm hover:border-[var(--color-atelier-terracota)]/20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center"><Video size={18}/></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Logística & Alinhamento</span>
              <span className="text-[10px] text-gray-400">Reuniões e Captações</span>
            </div>
          </div>
          <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">{formatHours(logisticsMinutes)}</span>
        </div>

        <div className="flex justify-between items-center px-2 pt-2">
          <div className="flex flex-col">
            <span className="font-elegant text-3xl text-[var(--color-atelier-terracota)] leading-none">{formatHours(totalMinutes)}</span>
            <span className="text-[9px] uppercase font-bold tracking-widest text-gray-400 mt-1">Total Registado</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">{completedCount}</span>
            <span className="text-[9px] uppercase font-bold tracking-widest text-gray-400 mt-1 flex items-center gap-1 justify-end"><Layers size={10}/> Entregas Feitas</span>
          </div>
        </div>

      </div>
    </div>
  );
}