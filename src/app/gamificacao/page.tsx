// src/app/gamificacao/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Trophy, Compass, Sparkles, Key, Lock, 
  Milestone, Eye, Star, Clock
} from "lucide-react";

// Mock da Jornada do Fundador (Artefatos de Status)
const ARTIFACTS = [
  {
    id: 1,
    title: "A Pedra Fundamental",
    description: "Você deu o primeiro passo. O portal foi acessado e a forja da sua marca foi oficialmente iniciada.",
    icon: Milestone,
    unlocked: true,
    date: "12 Nov, 2026"
  },
  {
    id: 2,
    title: "Visão Aguçada",
    description: "Você calibrou a nossa bússola. O questionário de referências visuais foi preenchido com maestria.",
    icon: Compass,
    unlocked: true,
    date: "14 Nov, 2026"
  },
  {
    id: 3,
    title: "O Alquimista",
    description: "A essência foi aprovada. O Moodboard e as diretrizes estratégicas receberam o seu selo de validação.",
    icon: Sparkles,
    unlocked: false,
    date: "Pendente"
  },
  {
    id: 4,
    title: "A Chave Mestra",
    description: "O ápice da jornada. O Cofre foi aberto e o ecossistema da sua nova Identidade Visual foi revelado ao mundo.",
    icon: Key,
    unlocked: false,
    date: "O Grande Dia"
  }
];

export default function JornadaPage() {
  const [mounted, setMounted] = useState(false);
  const unlockedCount = ARTIFACTS.filter(a => a.unlocked).length;
  const progressPercentage = (unlockedCount / ARTIFACTS.length) * 100;
  
  // Circunferência do anel de progresso (R = 120)
  const circleRadius = 120;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative z-10 max-w-[1500px] mx-auto h-[calc(100vh-80px)] flex flex-col overflow-hidden pb-6">
      
      {/* ==========================================
          1. CABEÇALHO (Editorial)
          ========================================== */}
      <header className="mb-8 flex justify-between items-end animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)] shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 bg-[var(--color-atelier-terracota)]/10 border border-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-terracota)] px-4 py-1.5 rounded-full mb-4 shadow-sm">
            <Trophy size={14} />
            <span className="font-roboto text-[10px] uppercase tracking-[0.2em] font-bold">Sala de Troféus</span>
          </div>
          <h1 className="font-elegant text-5xl md:text-[4rem] text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            A Jornada do <span className="text-[var(--color-atelier-terracota)] italic">Fundador.</span>
          </h1>
        </div>
        <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 max-w-md text-right leading-relaxed hidden md:block">
          Sua marca não é apenas um design, é um legado. Cada etapa concluída e validada por você é forjada como um artefato nesta galeria.
        </p>
      </header>

      {/* ==========================================
          2. O PALCO DA JORNADA (No Scroll Split)
          ========================================== */}
      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
        
        {/* COLUNA ESQUERDA: O MONÓLITO DE PROGRESSO */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:w-[420px] glass-panel rounded-[3rem] flex flex-col items-center justify-center relative overflow-hidden shrink-0 group border-white/60 shadow-[0_20px_50px_rgba(122,116,112,0.1)]"
        >
          {/* Efeitos de Luz de Fundo */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent z-0"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[var(--color-atelier-terracota)]/10 rounded-full blur-[80px] pointer-events-none transition-all duration-1000 group-hover:bg-[var(--color-atelier-terracota)]/20"></div>

          <div className="relative z-10 flex flex-col items-center text-center p-8">
            
            <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-10">
              O Seu Legado
            </h3>

            {/* O ANEL DE PROGRESSO ESCULTURAL (SVG) */}
            <div className="relative w-[280px] h-[280px] flex items-center justify-center mb-10">
              {/* O Anel de Fundo (Cinza/Transparente) */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-xl" viewBox="0 0 280 280">
                <circle 
                  cx="140" cy="140" r={circleRadius} 
                  fill="none" 
                  stroke="rgba(122,116,112,0.1)" 
                  strokeWidth="6"
                />
                {/* O Anel de Progresso Animado (Terracota) */}
                <motion.circle 
                  cx="140" cy="140" r={circleRadius} 
                  fill="none" 
                  stroke="var(--color-atelier-terracota)" 
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={mounted ? { strokeDashoffset } : { strokeDashoffset: circumference }}
                  transition={{ duration: 2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                />
              </svg>
              
              {/* O Núcleo do Anel */}
              <div className="w-[210px] h-[210px] rounded-full bg-white/40 backdrop-blur-md border border-white flex flex-col items-center justify-center shadow-[inset_0_10px_30px_rgba(255,255,255,0.8)] relative overflow-hidden">
                <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-white/60 to-transparent"></div>
                <Star size={40} strokeWidth={1} className="text-[var(--color-atelier-terracota)] mb-2 relative z-10" />
                <span className="font-elegant text-5xl text-[var(--color-atelier-grafite)] relative z-10">{progressPercentage}%</span>
                <span className="font-roboto text-[9px] uppercase tracking-[0.3em] font-bold text-[var(--color-atelier-grafite)]/50 mt-1 relative z-10">Concluído</span>
              </div>
            </div>

            <div className="bg-white/60 border border-white px-6 py-3 rounded-full flex flex-col items-center shadow-sm">
              <span className="font-roboto text-[10px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 font-bold mb-0.5">Status Atual</span>
              <span className="font-elegant text-xl text-[var(--color-atelier-grafite)]">Visionário em Ascensão</span>
            </div>

          </div>
        </motion.div>

        {/* COLUNA DIREITA: A GALERIA DE ARTEFATOS (Grid 2x2) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar pb-4 pr-2">
          {ARTIFACTS.map((artifact, index) => (
            <motion.div 
              key={artifact.id}
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.8, delay: 0.4 + (index * 0.1) }}
              whileHover={artifact.unlocked ? { y: -5, scale: 1.02 } : {}}
              className={`
                relative flex flex-col p-8 rounded-[2.5rem] h-full min-h-[280px] transition-all duration-500 overflow-hidden
                ${artifact.unlocked 
                  ? 'glass-panel cursor-pointer group bg-white/50 border-white shadow-[0_15px_30px_rgba(122,116,112,0.05)] hover:shadow-[0_20px_40px_rgba(173,111,64,0.15)]' 
                  : 'bg-[var(--color-atelier-grafite)]/5 border border-[var(--color-atelier-grafite)]/10 cursor-not-allowed'
                }
              `}
            >
              {/* Efeito de Luz para os desbloqueados */}
              {artifact.unlocked && (
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-[40px] group-hover:bg-[var(--color-atelier-terracota)]/20 transition-colors duration-500"></div>
              )}

              <div className="flex justify-between items-start mb-6 relative z-10">
                {/* O Ícone do Artefato */}
                <div className={`
                  w-16 h-16 rounded-[1.5rem] flex items-center justify-center relative overflow-hidden
                  ${artifact.unlocked 
                    ? 'bg-white border border-white shadow-sm text-[var(--color-atelier-terracota)]' 
                    : 'bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/30'
                  }
                `}>
                  {!artifact.unlocked && <div className="absolute inset-0 backdrop-blur-[2px]"></div>}
                  <artifact.icon size={28} strokeWidth={1.5} className={artifact.unlocked ? 'drop-shadow-sm group-hover:scale-110 transition-transform duration-500' : ''} />
                </div>

                {/* Selo de Status */}
                <div className={`px-4 py-1.5 rounded-full border text-[9px] uppercase tracking-widest font-bold ${artifact.unlocked ? 'bg-green-500/10 border-green-500/20 text-green-700' : 'bg-black/5 border-black/5 text-[var(--color-atelier-grafite)]/40 flex items-center gap-1.5'}`}>
                  {!artifact.unlocked && <Lock size={10} />}
                  {artifact.unlocked ? 'Desbloqueado' : 'Bloqueado'}
                </div>
              </div>

              <div className="relative z-10 flex-1 flex flex-col">
                <h3 className={`font-elegant text-2xl mb-3 ${artifact.unlocked ? 'text-[var(--color-atelier-grafite)]' : 'text-[var(--color-atelier-grafite)]/40'}`}>
                  {artifact.title}
                </h3>
                <p className={`font-roboto text-[13px] leading-relaxed mb-6 ${artifact.unlocked ? 'text-[var(--color-atelier-grafite)]/70' : 'text-[var(--color-atelier-grafite)]/30'}`}>
                  {artifact.description}
                </p>
                
                {/* Data / Linha do Tempo */}
                <div className={`mt-auto pt-5 border-t flex items-center gap-2 font-roboto text-[11px] uppercase tracking-widest font-bold ${artifact.unlocked ? 'border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-terracota)]' : 'border-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)]/30'}`}>
                  {artifact.unlocked ? <Eye size={14} /> : <Clock size={14} />}
                  {artifact.date}
                </div>
              </div>

            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}