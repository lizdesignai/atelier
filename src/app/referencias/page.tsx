// src/app/referencias/page.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, Plus, Image as ImageIcon, 
  Sparkles, Fingerprint, Type, Palette, Target, CheckCircle2
} from "lucide-react";

// Mock de 5 referências enviadas pelo Designer
const DESIGNER_REFERENCES = [
  { id: 1, img: "https://images.unsplash.com/photo-1600880292089-90a7e086ee3c?q=80&w=2574&auto=format&fit=crop", title: "Minimalismo Geométrico" },
  { id: 2, img: "https://images.unsplash.com/photo-1629019725068-1cb81c4e7df8?q=80&w=2574&auto=format&fit=crop", title: "Serifa Clássica & Heritage" },
  { id: 3, img: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=2574&auto=format&fit=crop", title: "Orgânico & Texturizado" },
  { id: 4, img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2574&auto=format&fit=crop", title: "Tipografia Bold / Brutalista" },
  { id: 5, img: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2670&auto=format&fit=crop", title: "Contemporâneo Fluido" },
];

export default function ReferenciasPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  // Simula as imagens que o cliente subiu
  const [clientMoodboard, setClientMoodboard] = useState([
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2670&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
  ]);

  const nextRef = () => setActiveIndex((prev) => (prev < DESIGNER_REFERENCES.length - 1 ? prev + 1 : prev));
  const prevRef = () => setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));

  const currentRef = DESIGNER_REFERENCES[activeIndex];

  return (
    <div className="relative z-10 max-w-[1500px] mx-auto h-[calc(100vh-80px)] flex flex-col overflow-hidden pb-6">
      
      {/* CABEÇALHO */}
      <header className="mb-6 flex justify-between items-end animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)] shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/60 border border-white text-[var(--color-atelier-grafite)] px-4 py-1.5 rounded-full mb-4 shadow-sm">
            <Fingerprint size={14} className="text-[var(--color-atelier-terracota)]" />
            <span className="font-roboto text-[10px] uppercase tracking-[0.2em] font-bold">Alinhamento Estético</span>
          </div>
          <h1 className="font-elegant text-5xl md:text-[4rem] text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Curadoria <span className="text-[var(--color-atelier-terracota)] italic">Visual.</span>
          </h1>
        </div>
        <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 max-w-sm text-right leading-relaxed hidden md:block">
          Analise as direções abaixo e nos guie. Suas respostas são a matéria-prima da sua nova marca.
        </p>
      </header>

      {/* GRID PRINCIPAL NO-SCROLL (Divisão 3/9) */}
      <div className="flex gap-6 flex-1 min-h-0">
        
        {/* ==========================================
            COLUNA ESQUERDA: MOODBOARD DO CLIENTE
            ========================================== */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}
          className="w-[300px] glass-panel rounded-[2.5rem] flex flex-col shrink-0 overflow-hidden"
        >
          <div className="p-6 border-b border-white/40 bg-white/30 backdrop-blur-md shrink-0">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
              Suas Inspirações <Sparkles size={16} className="text-[var(--color-atelier-terracota)]" />
            </h3>
            <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 mt-1 uppercase tracking-widest font-bold">
              O que atrai o seu olhar?
            </p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
            
            {/* Botão de Upload Magnético */}
            <button className="w-full h-32 rounded-2xl border-2 border-dashed border-[var(--color-atelier-grafite)]/20 hover:border-[var(--color-atelier-terracota)]/50 bg-white/20 hover:bg-white/60 transition-all duration-300 flex flex-col items-center justify-center gap-2 group shadow-sm">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[var(--color-atelier-grafite)]/40 group-hover:text-[var(--color-atelier-terracota)] group-hover:scale-110 transition-all shadow-sm">
                <Plus size={18} strokeWidth={2} />
              </div>
              <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)]">Adicionar Imagem</span>
            </button>

            {/* Imagens do Cliente */}
            {clientMoodboard.map((img, i) => (
              <div key={i} className="w-full h-40 rounded-2xl overflow-hidden border-[3px] border-white shadow-[0_8px_20px_rgba(122,116,112,0.1)] group relative">
                <img src={img} alt={`Inspiração ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <span className="text-white font-roboto text-[10px] uppercase tracking-widest font-bold border border-white/50 px-3 py-1.5 rounded-full">Ver Imagem</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ==========================================
            COLUNA DIREITA: DIREÇÕES DO DESIGNER (Palco Principal)
            ========================================== */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 glass-panel rounded-[2.5rem] flex flex-col relative overflow-hidden bg-white/40"
        >
          {/* Barra de Navegação do Carrossel (Fixo no Topo) */}
          <div className="px-8 py-5 border-b border-white flex justify-between items-center bg-white/50 backdrop-blur-xl shrink-0 z-20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center">
                <ImageIcon size={18} />
              </div>
              <div>
                <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{currentRef.title}</h2>
                <p className="font-roboto text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-atelier-terracota)] mt-1">
                  Direção {activeIndex + 1} de {DESIGNER_REFERENCES.length}
                </p>
              </div>
            </div>

            {/* Controles de Navegação Elegantes */}
            <div className="flex items-center gap-3 bg-white border border-white/60 p-1.5 rounded-full shadow-[0_5px_15px_rgba(122,116,112,0.08)]">
              <button 
                onClick={prevRef} disabled={activeIndex === 0}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--color-atelier-grafite)] transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="w-px h-6 bg-[var(--color-atelier-grafite)]/10"></div>
              <button 
                onClick={nextRef} disabled={activeIndex === DESIGNER_REFERENCES.length - 1}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--color-atelier-grafite)] transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* O Palco Dividido (Imagem GIGANTE Esquerda / Questionário Direita) */}
          <div className="flex-1 flex min-h-0">
            
            {/* A ARTE (Imagem da Referência) */}
            <div className="flex-[1.5] p-6 relative group overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full h-full rounded-[2rem] overflow-hidden border-[4px] border-white shadow-[0_20px_50px_rgba(122,116,112,0.15)] relative"
                >
                  <img src={currentRef.img} alt={currentRef.title} className="w-full h-full object-cover" />
                  {/* Gradiente sutil inferior para estética */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* O QUESTIONÁRIO DE CURADORIA (Rolagem Interna) */}
            <div className="flex-1 border-l border-white/60 bg-white/20 flex flex-col min-h-0">
              <div className="p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8">
                
                <div className="mb-2">
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">Análise Técnica</h3>
                  <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 leading-relaxed">
                    Mergulhe nesta direção visual. Seja sincero e detalhista, pois cada palavra esculpe o próximo passo.
                  </p>
                </div>

                {/* Pergunta 1 */}
                <div className="flex flex-col gap-3 group">
                  <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors">
                    <Target size={14} /> 1. Atmosfera e Percepção Geral
                  </label>
                  <textarea 
                    placeholder="Qual é a sua percepção geral sobre a atmosfera desta direção?"
                    className="w-full bg-white/60 border border-white hover:border-[var(--color-atelier-terracota)]/40 focus:border-[var(--color-atelier-terracota)] focus:bg-white rounded-[1.2rem] p-4 text-[14px] text-[var(--color-atelier-grafite)] outline-none resize-none h-24 transition-all shadow-sm focus:shadow-[0_5px_20px_rgba(173,111,64,0.1)]"
                  ></textarea>
                </div>

                {/* Pergunta 2 */}
                <div className="flex flex-col gap-3 group">
                  <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors">
                    <Type size={14} /> 2. Escolha Tipográfica
                  </label>
                  <textarea 
                    placeholder="Como você avalia as fontes em termos de sofisticação e clareza?"
                    className="w-full bg-white/60 border border-white hover:border-[var(--color-atelier-terracota)]/40 focus:border-[var(--color-atelier-terracota)] focus:bg-white rounded-[1.2rem] p-4 text-[14px] text-[var(--color-atelier-grafite)] outline-none resize-none h-24 transition-all shadow-sm focus:shadow-[0_5px_20px_rgba(173,111,64,0.1)]"
                  ></textarea>
                </div>

                {/* Pergunta 3 */}
                <div className="flex flex-col gap-3 group">
                  <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors">
                    <Palette size={14} /> 3. Paleta Cromática
                  </label>
                  <textarea 
                    placeholder="A paleta de cores desperta a sensação correta para o seu mercado?"
                    className="w-full bg-white/60 border border-white hover:border-[var(--color-atelier-terracota)]/40 focus:border-[var(--color-atelier-terracota)] focus:bg-white rounded-[1.2rem] p-4 text-[14px] text-[var(--color-atelier-grafite)] outline-none resize-none h-24 transition-all shadow-sm focus:shadow-[0_5px_20px_rgba(173,111,64,0.1)]"
                  ></textarea>
                </div>

                {/* Pergunta 4 */}
                <div className="flex flex-col gap-3 group">
                  <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors">
                    <Sparkles size={14} /> 4. Elementos Gráficos
                  </label>
                  <textarea 
                    placeholder="Os elementos (símbolos, texturas) agregam valor ou parecem excessivos?"
                    className="w-full bg-white/60 border border-white hover:border-[var(--color-atelier-terracota)]/40 focus:border-[var(--color-atelier-terracota)] focus:bg-white rounded-[1.2rem] p-4 text-[14px] text-[var(--color-atelier-grafite)] outline-none resize-none h-24 transition-all shadow-sm focus:shadow-[0_5px_20px_rgba(173,111,64,0.1)]"
                  ></textarea>
                </div>

                {/* Pergunta 5: Escala de Alinhamento */}
                <div className="flex flex-col gap-4 group bg-white/40 p-6 rounded-[1.5rem] border border-white shadow-sm">
                  <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] flex items-center justify-between w-full">
                    <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[var(--color-atelier-terracota)]"/> 5. Nível de Alinhamento</span>
                    <span className="text-[var(--color-atelier-terracota)] text-[14px]">Nota: 5</span>
                  </label>
                  <input 
                    type="range" min="0" max="10" step="1" defaultValue="5"
                    className="w-full accent-[var(--color-atelier-terracota)] cursor-pointer h-1.5 bg-black/10 rounded-full appearance-none mt-2"
                  />
                  <div className="flex justify-between w-full font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 mt-1">
                    <span>Totalmente Distante</span>
                    <span>Exatamente Isso</span>
                  </div>
                </div>

                <button className="w-full mt-4 bg-[var(--color-atelier-grafite)] text-white px-6 py-4 rounded-[1.2rem] font-roboto font-bold uppercase tracking-[0.2em] text-[12px] hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-[0_10px_20px_rgba(122,116,112,0.2)] hover:shadow-[0_15px_30px_rgba(173,111,64,0.3)] hover:-translate-y-1 duration-300">
                  Salvar Avaliação desta Direção
                </button>

              </div>
            </div>

          </div>
        </motion.div>

      </div>
    </div>
  );
}