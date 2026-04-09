// src/app/comunidade/missoes/page.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Target, Medal, Star, CheckCircle2, Clock, 
  Zap, Flame, ShieldCheck, ArrowRight, Loader2, Crown, MessageSquare
} from "lucide-react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ============================================================================
// MAPEAMENTO DE CORES (Garante que o Tailwind compila as classes corretamente)
// ============================================================================
const COLOR_MAP: Record<string, { bg: string, border: string, text: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-500' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-500' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-500' },
  green: { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-500' },
};

// ============================================================================
// MOCK DE MISSÕES (Foco em LTV, Eficiência de Estúdio e Prova Social)
// ============================================================================
const MISSIONS_DB = [
  {
    id: "m1",
    title: "O Batismo de Elite",
    description: "Preencha o seu Dossiê Estratégico (Briefing) em menos de 24 horas após o início do projeto para acelerarmos a conceção da sua marca.",
    xp: 250,
    icon: <ShieldCheck size={20} />,
    color: "blue",
    category: "Onboarding",
    isCompleted: true
  },
  {
    id: "m2",
    title: "A Voz do Império",
    description: "Faça a sua primeira partilha no Mural Global. Apresente a sua marca, os seus desafios ou partilhe uma vitória com a comunidade.",
    xp: 150,
    icon: <MessageSquare size={20} />,
    color: "yellow",
    category: "Comunidade",
    isCompleted: false
  },
  {
    id: "m3",
    title: "Aprovação Cirúrgica",
    description: "Aprove uma Estratégia Mensal ou Direção Visual à primeira, sem solicitar refações. Confiança no processo gera velocidade máxima.",
    xp: 500,
    icon: <Target size={20} />,
    color: "purple",
    category: "Eficiência",
    isCompleted: false
  },
  {
    id: "m4",
    title: "O Eco da Marca",
    description: "Grave um Story no seu Instagram a mostrar os bastidores do seu projeto ou a sua Mesa de Trabalho e mencione o @Atelier.",
    xp: 800,
    icon: <Flame size={20} />,
    color: "orange",
    category: "Embaixador",
    isCompleted: false
  },
  {
    id: "m5",
    title: "Círculo de Influência",
    description: "Indique um parceiro de negócios para o Atelier. Se essa indicação fechar um projeto connosco, você desbloqueia o nível máximo.",
    xp: 5000,
    icon: <Crown size={20} />,
    color: "yellow",
    category: "Network Premium",
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
      showToast(`🚀 Ganhou +${xpAmount} XP! Continue a expandir o seu legado.`);
      setIsProcessing(null);
      
      // Futuro: Chamada Supabase para injetar XP e disparar notificação à gestão
      // await supabase.rpc('add_exp_to_user', { user_id: session.user.id, exp_amount: xpAmount })
    }, 1500);
  };

  const availableMissions = missions.filter(m => !m.isCompleted);
  const completedMissions = missions.filter(m => m.isCompleted);

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto w-full animate-[fadeInUp_0.8s_ease-out_both] pb-10 px-4 md:px-0">
      
      {/* HEADER DA CENTRAL DE MISSÕES */}
      <div className="flex flex-col gap-3 mt-6">
        <Link href="/comunidade" className="inline-flex items-center gap-2 text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors font-roboto text-[10px] uppercase tracking-widest font-bold mb-2 bg-white/60 w-fit px-4 py-2 rounded-full border border-white shadow-sm">
          ← Voltar ao Mural
        </Link>
        <div className="flex items-center gap-3">
          <Target size={28} className="text-[var(--color-atelier-terracota)]" />
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-none">A Roda do <span className="italic text-[var(--color-atelier-terracota)]">Legado.</span></h1>
        </div>
        <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/70 max-w-xl mt-1 font-medium leading-relaxed">
          Complete missões estratégicas para evoluir a presença digital da sua marca e desbloquear benefícios exclusivos no nosso Hub de Negócios.
        </p>
      </div>

      {/* BANNER DE STATUS DO JOGADOR */}
      <div className="glass-panel p-8 md:p-10 rounded-[3rem] bg-gradient-to-br from-[var(--color-atelier-grafite)] to-[#2a2826] border border-[var(--color-atelier-grafite)] shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute top-[-50%] right-[-10%] w-80 h-80 bg-[var(--color-atelier-terracota)]/20 blur-[60px] rounded-full pointer-events-none"></div>
        <div className="absolute inset-0 opacity-20 bg-[url('/noise.png')] mix-blend-overlay pointer-events-none"></div>
        
        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
          <div className="w-20 h-20 rounded-[1.5rem] bg-[var(--color-atelier-terracota)]/10 border border-[var(--color-atelier-terracota)]/30 text-white flex items-center justify-center shadow-inner shrink-0">
            <Medal size={36} className="text-[var(--color-atelier-terracota)]" />
          </div>
          <div className="flex flex-col text-white">
            <span className="font-elegant text-3xl leading-tight mb-1">Progresso Atual</span>
            <span className="font-roboto text-[11px] uppercase tracking-widest text-white/60 font-bold bg-white/10 px-3 py-1.5 rounded-lg w-fit">
              {completedMissions.length} de {missions.length} Missões
            </span>
          </div>
        </div>

        <div className="w-full md:w-1/3 relative z-10 bg-white/5 p-6 rounded-[2rem] border border-white/10 shadow-inner">
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-white/70 mb-3">
            <span>Conclusão Global</span>
            <span className="text-[var(--color-atelier-terracota)]">{Math.round((completedMissions.length / missions.length) * 100)}%</span>
          </div>
          <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${(completedMissions.length / missions.length) * 100}%` }} 
              transition={{ duration: 1.5, ease: "easeOut" }} 
              className="h-full bg-gradient-to-r from-[var(--color-atelier-rose)] to-[var(--color-atelier-terracota)] rounded-full"
            />
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGAÇÃO */}
      <div className="flex gap-2 p-2 bg-white/60 border border-white/80 rounded-[1.5rem] shadow-sm w-full md:w-fit mt-4 mx-auto md:mx-0">
        <button 
          onClick={() => setActiveTab('available')}
          className={`flex-1 md:flex-none px-8 py-3.5 rounded-[1rem] font-roboto text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === 'available' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white hover:text-[var(--color-atelier-grafite)]'}`}
        >
          Disponíveis ({availableMissions.length})
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          className={`flex-1 md:flex-none px-8 py-3.5 rounded-[1rem] font-roboto text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white hover:text-[var(--color-atelier-grafite)]'}`}
        >
          Concluídas ({completedMissions.length})
        </button>
      </div>

      {/* LISTA DE MISSÕES */}
      <div className="flex flex-col gap-5 mt-2">
        <AnimatePresence mode="wait">
          
          {activeTab === 'available' && (
            <motion.div key="available" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col gap-5">
              {availableMissions.length === 0 ? (
                <div className="text-center py-16 glass-panel rounded-[3rem] opacity-60 border border-white">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Todas as Missões Concluídas!</h3>
                  <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 font-medium">O seu compromisso reflete-se nos resultados da sua marca.</p>
                </div>
              ) : (
                availableMissions.map((mission) => {
                  const style = COLOR_MAP[mission.color] || COLOR_MAP.blue;
                  
                  return (
                    <div key={mission.id} className="glass-panel bg-white/70 p-6 md:p-8 rounded-[2.5rem] border border-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:shadow-md hover:bg-white transition-all">
                      
                      <div className="flex items-start md:items-center gap-5">
                        <div className={`w-16 h-16 rounded-[1.2rem] ${style.bg} border ${style.border} ${style.text} flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                          {mission.icon}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-roboto text-[10px] uppercase font-bold tracking-[0.15em] text-[var(--color-atelier-grafite)]/40 mb-1.5">{mission.category}</span>
                          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none mb-2">{mission.title}</h3>
                          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 leading-relaxed max-w-xl font-medium">{mission.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 md:border-l border-[var(--color-atelier-grafite)]/10 md:pl-8 pt-4 md:pt-0 border-t md:border-t-0 shrink-0 mt-2 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                        <div className="flex flex-col items-start md:items-end">
                          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-atelier-grafite)]/40 mb-1">Recompensa</span>
                          <span className="font-elegant text-3xl text-[var(--color-atelier-terracota)] leading-none">+{mission.xp} <span className="text-lg">XP</span></span>
                        </div>
                        <button 
                          onClick={() => handleClaimReward(mission.id, mission.xp)}
                          disabled={isProcessing === mission.id}
                          className="px-6 py-4 rounded-[1.2rem] bg-[var(--color-atelier-grafite)] text-white flex items-center justify-center hover:bg-[var(--color-atelier-terracota)] transition-all shadow-[0_10px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_15px_30px_rgba(173,111,64,0.3)] hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0 shrink-0 font-roboto text-[10px] uppercase tracking-widest font-bold gap-2"
                          title="Reivindicar Missão"
                        >
                          {isProcessing === mission.id ? <Loader2 size={16} className="animate-spin" /> : <>Reivindicar <ArrowRight size={14} /></>}
                        </button>
                      </div>

                    </div>
                  )
                })
              )}
            </motion.div>
          )}

          {activeTab === 'completed' && (
            <motion.div key="completed" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col gap-5">
              {completedMissions.length === 0 ? (
                <div className="text-center py-16 glass-panel rounded-[3rem] opacity-60 border border-white">
                  <Clock size={48} className="mx-auto mb-4 text-[var(--color-atelier-grafite)]/30" />
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Histórico Vazio</h3>
                  <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 font-medium">O seu legado começa assim que completar a primeira missão disponível.</p>
                </div>
              ) : (
                completedMissions.map((mission) => (
                  <div key={mission.id} className="glass-panel bg-white/40 p-6 md:p-8 rounded-[2.5rem] border border-[var(--color-atelier-grafite)]/5 flex flex-col md:flex-row md:items-center justify-between gap-6 opacity-70 hover:opacity-100 transition-all hover:bg-white/60">
                    
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-[1.2rem] bg-green-50 border border-green-100 flex items-center justify-center shrink-0 shadow-inner">
                        <CheckCircle2 size={24} className="text-green-500" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] line-through decoration-[var(--color-atelier-grafite)]/30">{mission.title}</h3>
                        <p className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 mt-1.5">Missão validada pelo Atelier.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-[1rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm">
                      <Star size={14} className="text-green-600 fill-green-600" />
                      <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-green-700">+{mission.xp} XP Extraídos</span>
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