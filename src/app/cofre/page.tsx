// src/app/cofre/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion"; 
import { 
  Lock, Unlock, Clock, Download, ArrowRight, 
  Sparkles, Fingerprint, Layers, Eye, HeartHandshake
} from "lucide-react";

export default function CofrePage() {
  const [daysLeft, setDaysLeft] = useState(12);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const progressRatio = Math.max(0, 1 - (daysLeft / 12)); 
  const currentGrayscale = (1 - progressRatio) * 100;
  const currentBlur = 20 - (progressRatio * 15); 
  const glowOpacity = progressRatio * 0.8; 

  useEffect(() => {
    if (daysLeft === 0) {
      setIsUnlocked(true);
    } else {
      setIsUnlocked(false);
    }
  }, [daysLeft]);

  return (
    // Removido o min-h e overflow-hidden para forçar o limite da tela (No Scroll)
    <div className="relative z-10 max-w-[1400px] mx-auto h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      
      {/* SIMULADOR DE TEMPO (Painel Dev) */}
      <div className="fixed top-6 right-10 z-50 bg-white/60 backdrop-blur-xl px-5 py-4 rounded-2xl border border-white shadow-[0_15px_40px_rgba(173,111,64,0.15)] flex flex-col gap-3 items-center w-72">
        <span className="font-roboto text-[9px] uppercase tracking-widest font-black text-[var(--color-atelier-terracota)]">
          Controle do Tempo (Pico de Dopamina)
        </span>
        <input 
          type="range" min="0" max="12" step="1" value={daysLeft} 
          onChange={(e) => setDaysLeft(Number(e.target.value))}
          className="w-full accent-[var(--color-atelier-terracota)] cursor-ew-resize h-1 bg-[var(--color-atelier-grafite)]/10 rounded-full appearance-none"
        />
        <div className="flex justify-between w-full font-roboto text-[10px] font-bold text-[var(--color-atelier-grafite)]">
          <span>Dia 0 (Revelação)</span>
          <span>{daysLeft} dias</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* ==========================================
            ESTADO 1: O COFRE ENIGMÁTICO (Bloqueado)
            ========================================== */}
        {!isUnlocked && (
          <motion.div 
            key="locked"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col items-center justify-center relative w-full h-full"
          >
            <div className="relative w-full h-full max-h-[800px] rounded-[4rem] overflow-hidden flex flex-col items-center justify-center border border-white/40 shadow-[0_40px_100px_rgba(122,116,112,0.15)]">
              
              <div 
                className="absolute inset-0 bg-cover bg-center scale-110"
                style={{ 
                  backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')", 
                  filter: `grayscale(${currentGrayscale}%) blur(${currentBlur}px)`,
                  transition: "filter 0.5s ease-out" 
                }}
              ></div>
              
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(251,244,228,0.9)_100%)]"></div>
              <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>

              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-atelier-terracota)] rounded-full blur-[120px] mix-blend-overlay transition-opacity duration-700"
                style={{ opacity: glowOpacity }}
              ></div>

              <div className="relative z-10 flex flex-col items-center text-center p-12">
                
                <motion.div 
                  animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-28 h-28 rounded-full border border-white/60 bg-white/30 backdrop-blur-xl flex items-center justify-center mb-10 shadow-[0_10px_40px_rgba(173,111,64,0.2)] relative"
                >
                  {daysLeft <= 1 && <div className="absolute inset-0 bg-[var(--color-atelier-terracota)]/30 rounded-full animate-ping"></div>}
                  <Lock size={36} strokeWidth={1.5} className="text-[var(--color-atelier-terracota)] drop-shadow-md" />
                </motion.div>

                <h1 className="font-elegant text-6xl md:text-[5.5rem] text-[var(--color-atelier-grafite)] mb-6 tracking-tight leading-none drop-shadow-sm">
                  O Segredo <br/><span className="text-[var(--color-atelier-terracota)] italic">em Forja.</span>
                </h1>
                
                <p className="font-roboto text-[16px] text-[var(--color-atelier-grafite)]/60 max-w-md leading-[1.8] mb-12">
                  A sua obra-prima está sendo lapidada no escuro. As formas estão nascendo, as cores estão aquecendo.
                </p>

                <div className="flex flex-col items-center gap-2 bg-white/50 backdrop-blur-md border border-white px-10 py-5 rounded-[2rem] shadow-sm">
                  <span className="font-roboto text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--color-atelier-grafite)]/50">Desbloqueio Oficial em</span>
                  <span className="font-elegant text-6xl text-[var(--color-atelier-terracota)] drop-shadow-sm tracking-tighter">
                    {daysLeft} <span className="text-3xl text-[var(--color-atelier-grafite)]/40 ml-1 tracking-normal font-sans">Dias</span>
                  </span>
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            ESTADO 2: A REVELAÇÃO (No Scroll / SPA Mode)
            ========================================== */}
        {isUnlocked && (
          <motion.div 
            key="unlocked"
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 60, damping: 20, mass: 1, delay: 0.2 }}
            className="w-full h-full flex flex-col pt-6"
          >
            <motion.div 
              initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.5, ease: "easeOut" }}
              className="fixed inset-0 bg-white z-50 pointer-events-none"
            ></motion.div>

            {/* Cabeçalho Compacto */}
            <header className="mb-6 flex justify-between items-end">
              <div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, type: "spring" }}
                  className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-700 px-4 py-1.5 rounded-full mb-4 shadow-sm"
                >
                  <Unlock size={14} strokeWidth={2.5} />
                  <span className="font-roboto text-[10px] uppercase tracking-[0.2em] font-black">Identidade Desbloqueada</span>
                </motion.div>
                <h1 className="font-elegant text-5xl md:text-[4rem] text-[var(--color-atelier-grafite)] tracking-tight leading-none">
                  O seu <span className="text-[var(--color-atelier-terracota)] italic">novo legado.</span>
                </h1>
              </div>
              <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 max-w-sm text-right leading-relaxed">
                Toda grande marca tem um ponto de virada. Acesse o seu ecossistema visual abaixo.
              </p>
            </header>

            {/* Grid No-Scroll (Preenche a altura restante) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pb-6">
              
              {/* O Brandbook (Ocupa 7 colunas e toda a altura) */}
              <motion.div 
                initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1, duration: 0.8 }}
                className="lg:col-span-7 glass-panel p-3 rounded-[2.5rem] relative group flex flex-col h-full"
              >
                <div className="w-full flex-1 rounded-[2rem] overflow-hidden relative shadow-[0_15px_40px_rgba(122,116,112,0.1)] group-hover:shadow-[0_20px_50px_rgba(173,111,64,0.15)] transition-all duration-700">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10"></div>
                  <img 
                    src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2670&auto=format&fit=crop" 
                    alt="Apresentação da Marca" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3s] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  />
                  <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <button className="bg-white/90 backdrop-blur-xl text-[var(--color-atelier-grafite)] px-8 py-4 rounded-full font-roboto font-bold uppercase tracking-widest text-[12px] flex items-center gap-3 shadow-[0_15px_30px_rgba(0,0,0,0.2)] hover:scale-105 transition-transform">
                      <Eye size={18} className="text-[var(--color-atelier-terracota)]" /> Abrir Brandbook Oficial
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Coluna da Direita (Arquivos e Feedback) - 5 Colunas */}
              <motion.div 
                initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2, duration: 0.8 }}
                className="lg:col-span-5 flex flex-col gap-6 h-full"
              >
                {/* Painel de Arquivos (Mais compacto) */}
                <div className="glass-panel p-6 rounded-[2.5rem] flex flex-col gap-4">
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2 mb-2">
                    Seus Ativos <Sparkles size={16} className="text-[var(--color-atelier-terracota)]" />
                  </h3>
                  
                  <div className="flex flex-col gap-3">
                    <button className="flex items-center justify-between p-4 rounded-[1.2rem] bg-white/60 border border-white hover:border-[var(--color-atelier-terracota)]/40 hover:bg-white transition-all duration-300 group shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-creme)] flex items-center justify-center text-[var(--color-atelier-terracota)] group-hover:bg-[var(--color-atelier-terracota)] group-hover:text-white transition-colors">
                          <Fingerprint size={18} strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">Logos e Vetores</span>
                        </div>
                      </div>
                      <Download size={16} className="text-[var(--color-atelier-grafite)]/30 group-hover:text-[var(--color-atelier-terracota)] transition-colors" />
                    </button>

                    <button className="flex items-center justify-between p-4 rounded-[1.2rem] bg-white/60 border border-white hover:border-[var(--color-atelier-terracota)]/40 hover:bg-white transition-all duration-300 group shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-creme)] flex items-center justify-center text-[var(--color-atelier-terracota)] group-hover:bg-[var(--color-atelier-terracota)] group-hover:text-white transition-colors">
                          <Layers size={18} strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">Mockups (Aplicações)</span>
                        </div>
                      </div>
                      <Download size={16} className="text-[var(--color-atelier-grafite)]/30 group-hover:text-[var(--color-atelier-terracota)] transition-colors" />
                    </button>
                  </div>
                </div>

                {/* Mural de Feedback Compacto e Magnético (Induz à ação) */}
                <div className="glass-panel p-6 rounded-[2.5rem] flex-1 flex flex-col justify-center items-center text-center bg-gradient-to-br from-[var(--color-atelier-grafite)] to-[#4a4643] group relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
                  <div className="absolute right-[-20%] bottom-[-20%] w-[200px] h-[200px] bg-[var(--color-atelier-terracota)]/40 rounded-full blur-[50px] group-hover:bg-[var(--color-atelier-terracota)]/60 transition-colors duration-1000"></div>
                  
                  <HeartHandshake size={32} strokeWidth={1.5} className="text-[var(--color-atelier-terracota)] mb-3 relative z-10" />
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-creme)] mb-2 relative z-10">
                    O seu legado importa.
                  </h3>
                  <p className="font-roboto text-[13px] text-[var(--color-atelier-creme)]/70 max-w-[80%] mb-6 relative z-10 leading-relaxed">
                    Partilhe a sua jornada. Seu relato inspirará futuras marcas no nosso Mural de Sucesso.
                  </p>
                  
                  <button className="bg-[var(--color-atelier-creme)] text-[var(--color-atelier-grafite)] px-6 py-3 rounded-full font-roboto font-black uppercase tracking-widest text-[11px] hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all duration-300 shadow-[0_10px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_30px_rgba(173,111,64,0.4)] flex items-center gap-2 relative z-10 hover:-translate-y-0.5">
                    Deixar Relato <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}