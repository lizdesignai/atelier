"use client";

import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Loader2, Instagram } from 'lucide-react';
import { motion } from 'framer-motion';
import { trackMapaEvent } from '@/lib/trackMapaEvent';

interface ShareCardProps {
  clientName: string;
  totalDelta: number;
  currentTotal: number;
}

export default function ShareCard({ clientName, totalDelta, currentTotal }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!cardRef.current || isExporting) return;
    
    setIsExporting(true);
    window.dispatchEvent(new CustomEvent("showToast", { detail: "A preparar a sua imagem para os Stories..." }));
    
    try {
      // Pequeno delay para garantir rendering das fontes web
      await new Promise(r => setTimeout(r, 500));
      
      const dataUrl = await toPng(cardRef.current, { 
        quality: 1.0, 
        pixelRatio: 3, // High-res for Instagram
        cacheBust: true,
      });
      
      const link = document.createElement('a');
      link.download = `Evolucao_Mapa4D_${clientName.split(' ')[0]}.png`;
      link.href = dataUrl;
      link.click();
      
      trackMapaEvent('share_card_downloaded', { ipd_final: currentTotal, delta: totalDelta });
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Imagem descarregada com sucesso!" }));
    } catch (err) {
      console.error('Error generating image:', err);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao gerar a imagem." }));
    } finally {
      setIsExporting(false);
    }
  };

  if (totalDelta <= 0) return null; // Only show share card if there is a positive evolution

  return (
    <div className="glass-panel p-8 md:p-12 text-center mt-8 border border-[var(--color-atelier-terracota)]/20 relative overflow-hidden">
      
      <div className="mb-10 relative z-10">
        <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2 flex items-center justify-center gap-3">
          <Instagram className="text-[var(--color-atelier-terracota)]" /> 
          Partilhe a sua Vitória
        </h3>
        <p className="text-sm text-[var(--color-atelier-grafite)]/70 font-medium">
          A prova social é o principal motor de autoridade. Mostre aos seus seguidores o quanto a sua marca evoluiu.
        </p>
      </div>

      {/* The invisible/absolute wrapper for high-res render, OR just scale down a large div */}
      <div className="flex justify-center mb-8 relative z-10">
        {/* CARD CONTAINER (Aspect ratio 9:16 approx for Stories) */}
        <div 
          className="relative bg-white shadow-2xl rounded-3xl overflow-hidden flex flex-col justify-between border-[8px] border-[#fbf4e4]"
          style={{ width: '320px', height: '568px' }} // Proporção IG Story escalada
        >
          {/* O Card real que será capturado pela biblioteca (precisa estar na tela, mas escondido se preferir. Aqui deixaremos visível como preview) */}
          <div 
            ref={cardRef}
            className="absolute inset-0 bg-[#fbf4e4] flex flex-col justify-between p-8"
            style={{ width: '1080px', height: '1920px', transform: 'scale(0.296)', transformOrigin: 'top left' }} // Resolução nativa 1080x1920 reduzida para caber no preview
          >
            {/* Background Texture/Pattern */}
            <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#ad6f40] rounded-full blur-[150px] opacity-20" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#7a7470] rounded-full blur-[150px] opacity-10" />

            {/* Header */}
            <div className="relative z-10 text-center mt-12">
              <span className="text-3xl font-bold uppercase tracking-[0.4em] text-[#ad6f40] mb-4 block">Método Mapa 4D</span>
              <span className="font-elegant text-6xl text-[#7a7470] italic">O Diagnóstico.</span>
            </div>

            {/* Center Content */}
            <div className="relative z-10 flex flex-col items-center justify-center bg-white/60 p-16 rounded-[4rem] border border-white/50 backdrop-blur-md shadow-2xl mx-8">
              <span className="text-3xl font-bold uppercase tracking-widest text-[#7a7470]/50 mb-6">A Evolução de {clientName.split(' ')[0]}</span>
              
              <div className="flex items-center justify-center gap-4 mb-4">
                <span className="font-elegant text-[180px] text-[#2e7d32] leading-none">+{totalDelta}</span>
              </div>
              <span className="text-4xl font-bold text-[#7a7470] uppercase tracking-widest mb-12">Pontos de Evolução</span>

              <div className="w-full h-px bg-[#7a7470]/10 mb-12" />

              <span className="text-3xl text-[#7a7470]/60 uppercase tracking-widest mb-4">IPD Atualizado</span>
              <span className="text-[120px] font-bold text-[#ad6f40] leading-none">{currentTotal}<span className="text-6xl text-[#ad6f40]/50">/100</span></span>
            </div>

            {/* Footer */}
            <div className="relative z-10 text-center mb-12 flex flex-col items-center">
              <span className="text-3xl font-bold uppercase tracking-[0.3em] text-[#7a7470]/80">Atelier Liz Design</span>
              <div className="w-16 h-1 bg-[#ad6f40] mt-6" />
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={handleExport}
        disabled={isExporting}
        className="mx-auto flex items-center justify-center gap-3 bg-[var(--color-atelier-grafite)] text-white px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-all shadow-xl disabled:opacity-50 relative z-10"
      >
        {isExporting ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
        Descarregar para os Stories
      </button>

    </div>
  );
}
