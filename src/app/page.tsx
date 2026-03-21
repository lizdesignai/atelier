// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  Lock, Clock, Hash, ChevronRight, ArrowUpRight,
  Eye, FileText, ArrowRight, CheckCircle2, Bell, Settings
} from "lucide-react";

export default function Home() {
  const [clientName] = useState("Igor");
  const [daysLeft] = useState(12);
  const [isLoading, setIsLoading] = useState(true);
  
  // Lógica do Briefing: Controla se o projeto já começou a "ganhar cor"
  const [briefingSent, setBriefingSent] = useState(false);

  // Matemática de Cor do Cofre: Só inicia se o briefing for enviado
  const progressRatio = briefingSent ? Math.max(0, 1 - (daysLeft / 12)) : 0; 
  const currentGrayscale = (1 - progressRatio) * 100;
  const currentBlur = briefingSent ? 20 - (progressRatio * 15) : 30; // Desfoque pesado se não iniciou
  const glowOpacity = progressRatio * 0.6; 
  const progressPercent = briefingSent ? 65 : 0;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    // Estrutura flexível travada na altura da tela (No Scroll absoluto)
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-8">
      
      {/* ==========================================
          1. CABEÇALHO CONCIERGE & CONTROLES
          ========================================== */}
      <header className="pt-4 flex justify-between items-end shrink-0 animate-[fadeInUp_0.8s_ease-out]">
        <div>
          <div className="flex items-center gap-3 mb-6">
            {/* O Logo da Liz Animado (Vivo e Pulsante) */}
            <div className="relative w-6 h-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-[var(--color-atelier-terracota)] blur-md opacity-30 animate-pulse"></div>
              <img 
                src="/images/Símbolo Rosa.png" 
                alt="Liz Logo" 
                className="w-full h-full object-contain relative z-10 animate-[pulse_3s_ease-in-out_infinite]" 
              />
            </div>
            <span className="micro-title text-[var(--color-atelier-terracota)] tracking-[0.3em]">
              Fase Atual: {briefingSent ? 'Estruturação Visual' : 'Aguardando Fundação'}
            </span>
          </div>
          
          <h1 className="font-elegant text-6xl md:text-7xl text-[var(--color-atelier-grafite)] tracking-wide leading-[1.1]">
            Bem-vindo de volta,<br />
            <span className="text-[var(--color-atelier-terracota)] italic pr-4">{clientName}</span>.
          </h1>
        </div>

        {/* Controles do Usuário (Notificações e Configurações) */}
        <div className="flex items-center gap-3 mb-2">
          <button className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] transition-colors relative group">
            <Bell size={20} />
            {/* Indicador de Notificação (Ponto Terracota) */}
            <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-[var(--color-atelier-terracota)] rounded-full border-2 border-white shadow-sm"></span>
          </button>
          
          <button className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] transition-colors hover:rotate-90 duration-500">
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* ==========================================
          2. O GRID PRINCIPAL (Cofre Gigante + Lateral Dinâmica)
          ========================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0 animate-[fadeInUp_1s_ease-out_0.2s_both]">
        
        {/* COLUNA ESQUERDA (O COFRE MONUMENTAL - 8 Colunas) */}
        <div className="lg:col-span-8 flex flex-col h-full">
          <div className="relative w-full h-full rounded-[3rem] overflow-hidden shadow-[0_30px_60px_rgba(122,116,112,0.15)] group cursor-default border border-white/60">
            
            {/* Fundo do Cofre com Lógica de Saturação */}
            <div 
              className="absolute inset-0 bg-cover bg-center scale-110"
              style={{ 
                backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')",
                filter: `grayscale(${currentGrayscale}%) blur(${currentBlur}px)`,
                transition: "filter 1.5s ease-out"
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-atelier-creme)]/95 via-[var(--color-atelier-creme)]/60 to-transparent backdrop-blur-sm"></div>
            
            {/* Brilho da Forja */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--color-atelier-terracota)] rounded-full blur-[120px] mix-blend-overlay transition-opacity duration-[2s]"
              style={{ opacity: glowOpacity }}
            ></div>

            <div className="absolute inset-0 p-10 md:p-14 flex flex-col justify-between z-10">
              
              <div className="flex justify-between items-start">
                <div className="bg-white/80 backdrop-blur-xl border border-white px-5 py-3 rounded-full flex items-center gap-3 shadow-sm">
                  <Lock size={16} className="text-[var(--color-atelier-terracota)]" />
                  <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">
                    O Cofre de Identidade
                  </span>
                </div>
                
                {/* O Contador Escultural (Só inicia se tiver briefing) */}
                <div className="text-right">
                  <p className="micro-title text-[var(--color-atelier-grafite)]/70 mb-1">
                    {briefingSent ? 'Revelação em' : 'Tempo Pausado'}
                  </p>
                  <p className={`font-elegant text-[2.5rem] flex items-center justify-end gap-2 drop-shadow-sm transition-colors duration-1000 ${briefingSent ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/40'}`}>
                    <Clock size={20} className="opacity-40" /> {briefingSent ? daysLeft : '--'} Dias
                  </p>
                </div>
              </div>

              <div className="max-w-2xl">
                <h2 className="font-elegant text-5xl md:text-6xl text-[var(--color-atelier-grafite)] mb-8 leading-[1.1]">
                  A sua marca está ganhando forma e alma.
                </h2>
                
                {/* Barra de Progresso Cinética */}
                <div className="w-full">
                  <div className="flex justify-between items-end mb-3">
                    <span className="micro-title text-[var(--color-atelier-grafite)]/60">Progresso Geral</span>
                    <span className={`font-roboto font-bold text-2xl transition-colors duration-1000 ${briefingSent ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/30'}`}>
                      {isLoading ? 0 : progressPercent}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-white/40 rounded-full overflow-hidden p-[2px] border border-white/60 shadow-inner">
                    <div 
                      className="h-full rounded-full transition-all duration-[2s] ease-[cubic-bezier(0.16,1,0.3,1)] relative"
                      style={{ 
                        width: `${isLoading ? 0 : progressPercent}%`,
                        background: briefingSent ? 'linear-gradient(to right, var(--color-atelier-rose), var(--color-atelier-terracota))' : 'transparent'
                      }}
                    >
                      {briefingSent && <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (Briefing e Diário de Bordo - 4 Colunas) */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full min-h-0">
          
          {/* ==========================================
              MÓDULO DE AÇÃO: BRIEFING ESTRATÉGICO
              ========================================== */}
          {!briefingSent ? (
            <div className="glass-panel px-5 py-4 rounded-[1.5rem] flex items-center justify-between gap-4 shrink-0 bg-gradient-to-r from-white/90 to-white/50 border border-white shadow-[0_8px_20px_rgba(173,111,64,0.05)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0">
                  <FileText size={16} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] leading-none mb-1">Briefing Pendente</span>
                  <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/60 leading-tight">Necessário para iniciar.</span>
                </div>
              </div>
              
              <button 
                onClick={() => setBriefingSent(true)}
                className="bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] px-5 py-2.5 rounded-full font-roboto font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--color-atelier-terracota)] transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 shrink-0"
              >
                Preencher
              </button>
            </div>
          ) : (
            <div className="px-5 py-3 rounded-[1.5rem] flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-700 shrink-0">
               <CheckCircle2 size={16} />
               <span className="font-roboto text-[10px] font-bold uppercase tracking-[0.2em]">Fundação Estabelecida.</span>
            </div>
          )}

          {/* ==========================================
              DIÁRIO DO ATELIER (Feed Vertical Centralizado)
              ========================================== */}
          <div className="glass-panel flex-1 rounded-[2.5rem] flex flex-col overflow-hidden relative min-h-0">
             <div className="px-6 py-5 border-b border-[var(--color-atelier-grafite)]/10 bg-white/30 backdrop-blur-md z-10 flex justify-between items-center shrink-0">
               <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                 <Eye size={18} className="text-[var(--color-atelier-terracota)]" /> Diário de Bordo
               </h3>
               <ArrowUpRight size={16} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] cursor-pointer" />
             </div>

             {/* Área de Rolagem do Feed */}
             <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-8">
                
                {/* Post Editorial Vertical 1 */}
                <div className="group cursor-pointer border-b border-[var(--color-atelier-grafite)]/10 pb-6">
                  <div className="w-full h-[220px] rounded-[1.5rem] overflow-hidden mb-4 relative shadow-sm group-hover:shadow-md transition-all">
                    <img 
                      src="https://images.unsplash.com/photo-1629019725068-1cb81c4e7df8?q=80&w=2574&auto=format&fit=crop" 
                      alt="Estudo" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out"
                    />
                    <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-atelier-terracota)]"></span>
                      <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">
                        Hoje • 14:32
                      </span>
                    </div>
                  </div>
                  <h4 className="font-elegant text-[22px] text-[var(--color-atelier-grafite)] mb-2 leading-tight group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                    Família Tipográfica
                  </h4>
                  <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 leading-relaxed">
                    Escolhemos uma serifa de alto contraste para assinar a marca principal, garantindo a imposição visual exigida no seu nicho.
                  </p>
                </div>

                {/* Post Editorial Vertical 2 */}
                <div className="group cursor-pointer pb-2">
                  <div className="w-full h-[220px] rounded-[1.5rem] overflow-hidden mb-4 relative shadow-sm group-hover:shadow-md transition-all">
                    <img 
                      src="https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=2574&auto=format&fit=crop" 
                      alt="Estudo Cores" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out"
                    />
                    <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-atelier-grafite)]/30"></span>
                      <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                        13 Nov • 09:15
                      </span>
                    </div>
                  </div>
                  <h4 className="font-elegant text-[22px] text-[var(--color-atelier-grafite)] mb-2 leading-tight group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                    Estudo de Texturas
                  </h4>
                  <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 leading-relaxed">
                    Aprovamos a paleta de materiais orgânicos. Os papéis texturizados trarão a sensação tátil ideal para a papelaria.
                  </p>
                </div>

             </div>
          </div>

        </div>

      </section>
    </div>
  );
}