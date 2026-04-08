// src/app/admin/financeiro/views/HealthMetrics.tsx
import { motion } from "framer-motion";
import { Star, Activity, Medal, CheckCircle2, HeartPulse } from "lucide-react";

interface HealthMetricsProps {
  overviewData: {
    avgNps: number;
  };
  teamHealth: any[];
  recentNps: any[];
}

export default function HealthMetrics({
  overviewData,
  teamHealth,
  recentNps
}: HealthMetricsProps) {

  // Lógica de Gamificação isolada no seu devido lugar
  const getNextLevelExp = (currentExp: number) => {
    if (currentExp < 500) return 500;
    if (currentExp < 1500) return 1500;
    if (currentExp < 3000) return 3000;
    return 5000;
  };

  return (
    <motion.div 
      key="health" 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }} 
      className="flex flex-col gap-6 w-full"
    >
      
      {/* WIDGETS DE DESTAQUE (Média NPS, On-Time, Top Performer) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="glass-panel p-8 bg-white/60 rounded-[2.5rem] flex flex-col gap-4 border border-white items-center text-center justify-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-green-500/10 text-green-600 flex items-center justify-center mb-2"><Star size={24} /></div>
          <span className="font-elegant text-5xl text-[var(--color-atelier-grafite)] leading-none">{overviewData.avgNps}</span>
          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Média Global de T-NPS</span>
        </div>
        
        <div className="glass-panel p-8 bg-white/60 rounded-[2.5rem] flex flex-col gap-4 border border-white items-center text-center justify-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2"><Activity size={24} /></div>
          <span className="font-elegant text-5xl text-[var(--color-atelier-grafite)] leading-none">94%</span>
          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Entregas no Prazo (On-Time)</span>
        </div>

        <div className="glass-panel p-8 bg-[var(--color-atelier-terracota)]/5 border border-[var(--color-atelier-terracota)]/20 rounded-[2.5rem] flex flex-col items-center text-center justify-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[var(--color-atelier-terracota)] text-white flex items-center justify-center mb-4 shadow-lg"><Medal size={24} /></div>
          <span className="font-roboto text-[14px] font-bold text-[var(--color-atelier-grafite)]">{teamHealth[0]?.nome || "Membro"}</span>
          <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mt-1">Top Performer do Mês</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* LEADERBOARD DA EQUIPA (GAMIFICAÇÃO) */}
        <div className="lg:col-span-8 glass-panel bg-white/40 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-[450px]">
          <div className="flex justify-between items-end border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 shrink-0">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">Leaderboard de Produtividade</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
            {teamHealth.map((member, index) => {
              const nextLevelExp = getNextLevelExp(member.perf.exp_points);
              const progress = Math.min((member.perf.exp_points / nextLevelExp) * 100, 100);
              
              return (
                <div key={member.id} className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm flex flex-col md:flex-row items-center gap-6 relative">
                  <div className="absolute top-0 left-0 bg-[var(--color-atelier-grafite)] text-white w-6 h-6 rounded-br-lg flex items-center justify-center text-[10px] font-bold">#{index + 1}</div>
                  
                  <div className="flex items-center gap-4 w-full md:w-1/3 shrink-0 pl-4">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-inner border border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] flex items-center justify-center font-elegant text-2xl">
                      {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" alt="" /> : member.nome.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">{member.nome}</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)]">{member.perf.level_name}</span>
                    </div>
                  </div>

                  <div className="flex-1 w-full flex flex-col gap-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">
                      <span>Experiência (EXP)</span>
                      <span>{member.perf.exp_points} / {nextLevelExp}</span>
                    </div>
                    <div className="h-2.5 w-full bg-[var(--color-atelier-grafite)]/5 rounded-full overflow-hidden shadow-inner">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1 }} className="h-full bg-gradient-to-r from-[var(--color-atelier-rose)] to-[var(--color-atelier-terracota)] rounded-full"></motion.div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto shrink-0 justify-between md:justify-end border-t md:border-t-0 md:border-l border-[var(--color-atelier-grafite)]/10 pt-4 md:pt-0 md:pl-6">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">T-NPS</span>
                      <span className="font-roboto font-bold text-[14px] text-green-600 flex items-center gap-1"><Star size={12}/> {member.perf.avg_tnps}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">Tarefas</span>
                      <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)] flex items-center gap-1"><CheckCircle2 size={12}/> {member.perf.total_tasks_completed}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* FEEDBACKS T-NPS RECENTES */}
        <div className="lg:col-span-4 glass-panel bg-white/60 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-[450px]">
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 flex items-center justify-between shrink-0">
            <span>Feedbacks (T-NPS)</span>
            <HeartPulse size={20} className="text-[var(--color-atelier-terracota)]" />
          </h3>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
            {recentNps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-40 text-center">
                <HeartPulse size={32} className="mb-2" />
                <p className="font-elegant text-xl">Aguardando Avaliações</p>
              </div>
            ) : (
              recentNps.map((nps, i) => (
                <div key={i} className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="font-roboto font-bold text-[12px] text-[var(--color-atelier-grafite)]">{nps.client}</span>
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mt-0.5">Resp: {nps.member}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${nps.score >= 9 ? 'bg-green-100 text-green-700' : nps.score >= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {nps.score}
                    </div>
                  </div>
                  <p className="text-[12px] text-[var(--color-atelier-grafite)]/70 italic leading-relaxed">"{nps.feedback}"</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}