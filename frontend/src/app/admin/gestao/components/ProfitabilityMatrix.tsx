// src/app/admin/gestao/components/ProfitabilityMatrix.tsx
import { TrendingUp } from "lucide-react";

interface ProfitabilityMatrixProps {
  data: any[];
}

export default function ProfitabilityMatrix({ data }: ProfitabilityMatrixProps) {
  return (
    <div className="glass-panel bg-[var(--color-atelier-grafite)] text-white p-6 rounded-[2rem] shadow-xl flex flex-col h-full overflow-hidden relative border border-white/10">
      {/* Efeito visual de luz */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-atelier-terracota)]/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="shrink-0 mb-5 border-b border-white/10 pb-4 relative z-10">
        <h3 className="font-elegant text-2xl flex items-center gap-2">
          <TrendingUp size={20} className="text-[var(--color-atelier-terracota)]" /> Custo Operacional
        </h3>
        <p className="font-roboto text-[10px] font-bold uppercase tracking-widest text-white/50 mt-1">
          Lucratividade de Projetos
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2 relative z-10">
        {data.length === 0 ? (
          <span className="text-white/40 italic text-sm text-center mt-10">Calculando matriz financeira...</span>
        ) : (
          data.map((proj) => (
            <div key={proj.id} className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col gap-3 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex flex-col truncate pr-2">
                  <span className="font-bold text-[14px] truncate">{proj.name}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">{proj.type}</span>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg bg-white/10 shrink-0 ${proj.healthColor}`}>
                  {proj.health}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3 mt-1">
                <div className="flex flex-col">
                  <span className="text-[8px] uppercase tracking-widest text-white/40 mb-0.5">Tempo Consumido</span>
                  <span className="font-elegant text-lg leading-none">{proj.hours}h</span>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-[8px] uppercase tracking-widest text-white/40 mb-0.5">Fee Estimado</span>
                  <span className="font-elegant text-lg leading-none text-[var(--color-atelier-terracota)]">R$ {proj.fee}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}