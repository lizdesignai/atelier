// src/app/admin/gestao/components/QualityRadarFeed.tsx
import { Zap, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface QualityRadarFeedProps {
  data: any[];
}

export default function QualityRadarFeed({ data }: QualityRadarFeedProps) {
  return (
    <div className="glass-panel bg-white/70 p-6 rounded-[2rem] shadow-sm flex flex-col h-full overflow-hidden border border-white">
      <div className="shrink-0 mb-5 border-b border-gray-100 pb-4">
        <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
          <Zap size={20} className="text-orange-500" /> Radar de Qualidade
        </h3>
        <p className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
          Alertas de Churn & Feedbacks
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center opacity-40 mt-10">
            <CheckCircle2 size={40} className="text-green-500 mb-2" />
            <p className="font-elegant text-xl">Radar Limpo</p>
            <p className="text-[10px] uppercase tracking-widest font-bold mt-1">Nenhum risco detetado.</p>
          </div>
        ) : (
          data.map((alert, idx) => (
            <div key={idx} className={`p-4 rounded-2xl border flex gap-3 items-start ${alert.type === 'churn' ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
              <div className="shrink-0 mt-0.5">
                {alert.type === 'churn' ? <Clock size={16} className="text-orange-500" /> : <AlertTriangle size={16} className="text-red-500" />}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[12px]">{alert.client}</span>
                <span className="text-[11px] mt-1 opacity-80 leading-snug">{alert.msg}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}