// src/app/comunidade/missoes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Target, Medal, Star, CheckCircle2, Clock, 
  Zap, Flame, ShieldCheck, ArrowRight, Loader2, Play
} from "lucide-react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// MOCK DE MISSÕES (Estrutura pronta para ser migrada para o Supabase futuramente)
const MISSIONS_DB = [
  {
    id: "m1",
    title: "O Primeiro Passo",
    description: "Complete o seu perfil na comunidade adicionando uma foto de avatar e uma biografia detalhada.",
    xp: 150,
    icon: <ShieldCheck size={20} className="text-blue-500" />,
    color: "blue",
    category: "Setup",
    isCompleted: true // Exemplo de concluída
  },
  {
    id: "m2",
    title: "Voz do Império",
    description: "Faça a sua primeira partilha no Mural Global. Apresente a sua marca ou partilhe uma pequena vitória.",
    xp: 300,
    icon: <Zap size={20} className="text-yellow-500" />,
    color: "yellow",
    category: "Comunidade",
    isCompleted: false
  },
  {
    id: "m3",
    title: "Embaixador da Marca",
    description: "Grave um Story no Instagram a mostrar os bastidores do seu projeto e mencione o @Atelier.",
    xp: 1000,
    icon: <Flame size={20} className="text-orange-500" />,
    color: "orange",
    category: "Marketing",
    isCompleted: false
  },
  {
    id: "m4",
    title: "Visão Estratégica",
    description: "Aprove o Moodboard ou a Identidade Visual sem pedir refações no primeiro envio da equipa.",
    xp: 500,
    icon: <Target size={20} className="text-purple-500" />,
    color: "purple",
    category: "Projetos",
    isCompleted: false
  },
  {
    id: "m5",
    title: "Feedback de Ouro",
    description: "Preencha a pesquisa de T-NPS (Nível de Satisfação) no final de um ciclo de projeto.",
    xp: 400,
    icon: <Star size={20} className="text-green-500" />,
    color: "green",
    category: "Projetos",
    isCompleted: false
  }
];

export default function MissoesPage() {
  const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available');
  const [missions, setMissions] = useState(MISSIONS_DB);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Simulação de reivindicação de XP
  const handleClaimReward = (missionId: string, xpAmount: number) => {
    setIsProcessing(missionId);
    
    // Simula o delay de ir ao banco de dados validar a ação
    setTimeout(() => {
      setMissions(prev => prev.map(m => m.id === missionId ? { ...m, isCompleted: true } : m));
      showToast(`🚀 Ganhaste +${xpAmount} XP! Continua a subir no Leaderboard.`);
      setIsProcessing(null);
      
      // Aqui entraria a chamada real ao Supabase:
      // await supabase.rpc('add_exp_to_user', { user_id: session.user.id, exp_amount: xpAmount })
    }, 1500);
  };

  const availableMissions = missions.filter(m => !m.isCompleted);
  const completedMissions = missions.filter(m => m.isCompleted);

  return (
    <div className="flex flex-col gap-6 w-full animate-[fadeInUp_0.8s_ease-out_both]">
      
      {/* HEADER DA CENTRAL DE MISSÕES */}
      <div className="flex flex-col gap-2 px-2 mt-4 md:mt-0">
        <Link href="/comunidade" className="inline-flex items-center gap-2 text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors font-roboto text-[11px] uppercase tracking-widest font-bold mb-2">
          ← Voltar ao Mural
        </Link>
        <div className="flex items-center gap-3">
          <Target size={28} className="text-[var(--color-atelier-terracota)]" />
          <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none">A Roda do Legado</h1>
        </div>
        <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 max-w-lg mt-1">
          Complete missões estratégicas para evoluir o nível da sua marca e desbloquear autoridade máxima no nosso Hub de Negócios.
        </p>
      </div>

      {/* BANNER DE STATUS DO JOGADOR */}
      <div className="glass-panel p-6 rounded-[2.5rem] bg-gradient-to-br from-[var(--color-atelier-grafite)] to-black border border-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-[var(--color-atelier-terracota)]/20 blur-[50px] rounded-full pointer-events-none"></div>
        <div className="absolute inset-0 opacity-20 bg-[url('/noise.png')] mix-blend-overlay pointer-events-none"></div>
        
        <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center shadow-inner shrink-0">
            <Medal size={32} className="text-[var(--color-atelier-terracota)]" />
          </div>
          <div className="flex flex-col text-white">
            <span className="font-elegant text-2xl leading-tight">Progresso Atual</span>
            <span className="font-roboto text-[11px] uppercase tracking-widest text-white/50 font-bold mt-1">
              {completedMissions.length} de {missions.length} Missões Concluídas
            </span>
          </div>
        </div>

        <div className="w-full md:w-1/3 relative z-10">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/70 mb-2">
            <span>Conclusão</span>
            <span className="text-[var(--color-atelier-terracota)]">{Math.round((completedMissions.length / missions.length) * 100)}%</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${(completedMissions.length / missions.length) * 100}%` }} 
              transition={{ duration: 1, ease: "easeOut" }} 
              className="h-full bg-gradient-to-r from-[var(--color-atelier-rose)] to-[var(--color-atelier-terracota)] rounded-full"
            />
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGAÇÃO */}
      <div className="flex gap-2 p-1.5 bg-white/60 border border-white rounded-2xl shadow-sm w-full md:w-fit mt-2">
        <button 
          onClick={() => setActiveTab('available')}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === 'available' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}
        >
          Disponíveis ({availableMissions.length})
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}
        >
          Concluídas ({completedMissions.length})
        </button>
      </div>

      {/* LISTA DE MISSÕES */}
      <div className="flex flex-col gap-4 pb-10">
        <AnimatePresence mode="wait">
          
          {activeTab === 'available' && (
            <motion.div key="available" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col gap-4">
              {availableMissions.length === 0 ? (
                <div className="text-center py-12 glass-panel rounded-[2.5rem] opacity-60">
                  <CheckCircle2 size={40} className="mx-auto mb-4 text-green-500" />
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Tudo Limpo!</h3>
                  <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60 mt-1">Já concluiu todas as missões disponíveis de momento.</p>
                </div>
              ) : (
                availableMissions.map((mission, idx) => (
                  <div key={mission.id} className="glass-panel bg-white/80 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-[var(--color-atelier-terracota)]/30 transition-all">
                    
                    <div className="flex items-start md:items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-${mission.color}-50 border border-${mission.color}-100 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                        {mission.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">{mission.category}</span>
                        <h3 className="font-roboto font-bold text-[16px] text-[var(--color-atelier-grafite)] leading-tight">{mission.title}</h3>
                        <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/70 mt-1 leading-relaxed max-w-sm">{mission.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 md:border-l border-[var(--color-atelier-grafite)]/10 md:pl-6 pt-4 md:pt-0 border-t md:border-t-0 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-0.5">Recompensa</span>
                        <span className="font-elegant text-2xl text-[var(--color-atelier-terracota)] leading-none">+{mission.xp} XP</span>
                      </div>
                      <button 
                        onClick={() => handleClaimReward(mission.id, mission.xp)}
                        disabled={isProcessing === mission.id}
                        className="w-12 h-12 rounded-full bg-[var(--color-atelier-grafite)] text-white flex items-center justify-center hover:bg-[var(--color-atelier-terracota)] transition-all shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 shrink-0"
                        title="Reivindicar Missão"
                      >
                        {isProcessing === mission.id ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={18} />}
                      </button>
                    </div>

                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'completed' && (
            <motion.div key="completed" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col gap-4">
              {completedMissions.length === 0 ? (
                <div className="text-center py-12 glass-panel rounded-[2.5rem] opacity-60">
                  <Clock size={40} className="mx-auto mb-4 text-[var(--color-atelier-grafite)]/30" />
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Histórico Vazio</h3>
                  <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60 mt-1">O seu legado começa assim que completar a primeira missão.</p>
                </div>
              ) : (
                completedMissions.map((mission) => (
                  <div key={mission.id} className="glass-panel bg-white/40 p-6 rounded-[2rem] border border-[var(--color-atelier-grafite)]/5 flex flex-col md:flex-row md:items-center justify-between gap-6 opacity-70 hover:opacity-100 transition-opacity">
                    
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={24} className="text-green-500" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="font-roboto font-bold text-[16px] text-[var(--color-atelier-grafite)] line-through decoration-[var(--color-atelier-grafite)]/30">{mission.title}</h3>
                        <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/50 mt-1">Missão concluída com sucesso.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                      <Star size={12} className="text-green-600 fill-green-600" />
                      <span className="font-roboto text-[11px] font-bold text-green-700">+{mission.xp} XP Recebidos</span>
                    </div>

                  </div>
                ))
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}