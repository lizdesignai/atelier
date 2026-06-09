// src/app/admin/gestao/components/SLARankingWidget.tsx
import { Users } from "lucide-react";

interface SLARankingWidgetProps {
  data: any[];
}

export default function SLARankingWidget({ data }: SLARankingWidgetProps) {
  return (
    <div className="glass-panel bg-white/70 p-6 rounded-[2rem] shadow-sm flex flex-col h-full overflow-hidden border border-white">
      <div className="shrink-0 mb-5 border-b border-gray-100 pb-4">
        <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
          <Users size={20} className="text-blue-500" /> Capacidade & SLA
        </h3>
        <p className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
          Horas Ativas na Semana Atual
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-40 text-center">
            <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-gray-400">Sem registos na semana</span>
          </div>
        ) : (
          data.map((member) => (
            <div key={member.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} className="w-full h-full object-cover" alt={member.nome} />
                  ) : (
                    <span className="font-elegant text-sm text-[var(--color-atelier-grafite)]">{member.nome.charAt(0)}</span>
                  )}
                </div>
                <div className="flex flex-col truncate">
                  <span className="font-bold text-[14px] text-[var(--color-atelier-grafite)] truncate max-w-[120px]">{member.nome}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{member.role}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0 pl-2">
                <span className="font-elegant text-xl leading-none text-[var(--color-atelier-grafite)]">{member.totalHours.toFixed(1)}h</span>
                <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${member.color}`}>
                  {member.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}