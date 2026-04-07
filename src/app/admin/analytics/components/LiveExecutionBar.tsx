// src/app/admin/analytics/components/LiveExecutionBar.tsx
import { PlayCircle, UserCircle2 } from "lucide-react";

interface LiveExecutionBarProps {
  liveTasks: any[];
}

export default function LiveExecutionBar({ liveTasks }: LiveExecutionBarProps) {
  if (!liveTasks || liveTasks.length === 0) return null;

  return (
    <div className="shrink-0 bg-[var(--color-atelier-grafite)] text-white p-4 rounded-2xl flex items-center gap-4 overflow-x-auto custom-scrollbar shadow-lg animate-[fadeIn_0.5s_ease-out]">
      <div className="flex items-center gap-2 shrink-0 border-r border-white/20 pr-4">
         <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
         <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-white/70">Executando Agora</span>
      </div>
      {liveTasks.map(t => (
        <div key={t.id} className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl shrink-0">
           <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0 border border-white/30">
             {t.profiles?.avatar_url ? <img src={t.profiles.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 size={12}/>}
           </div>
           <div className="flex flex-col">
             <span className="font-roboto text-[11px] font-bold">{t.profiles?.nome}</span>
             <span className="text-[9px] text-white/50 truncate max-w-[150px]">{t.title}</span>
           </div>
           <PlayCircle size={14} className="text-green-400 ml-2" />
        </div>
      ))}
    </div>
  );
}