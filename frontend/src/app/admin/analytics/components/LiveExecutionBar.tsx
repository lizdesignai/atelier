// src/app/admin/analytics/components/LiveExecutionBar.tsx
import { PlayCircle, UserCircle2 } from "lucide-react";

interface LiveExecutionBarProps {
  liveTasks: any[];
}

export default function LiveExecutionBar({ liveTasks }: LiveExecutionBarProps) {
  if (!liveTasks || liveTasks.length === 0) return null;

  return (
    <div className="shrink-0 bg-[var(--color-atelier-grafite)] text-white py-1.5 px-3 rounded-xl flex items-center gap-2.5 overflow-x-auto custom-scrollbar shadow-sm animate-[fadeIn_0.5s_ease-out]">
      <div className="flex items-center gap-2 shrink-0 border-r border-white/20 pr-3">
         <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
         <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-white/70">Em Andamento</span>
      </div>
      {liveTasks.map(t => (
        <div key={t.id} className="flex items-center gap-2.5 bg-white/10 px-3 py-1.5 rounded-xl shrink-0">
           <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0 border border-white/30">
             {t.profiles?.avatar_url ? <img src={t.profiles.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 size={11}/>}
           </div>
           <div className="flex flex-col">
             <span className="font-roboto text-[10.5px] font-bold leading-tight">{t.profiles?.nome}</span>
             <span className="text-[8.5px] text-white/60 truncate max-w-[140px] leading-tight">{t.title}</span>
           </div>
           <PlayCircle size={13} className="text-green-400 ml-1 shrink-0" />
        </div>
      ))}
    </div>
  );
}
