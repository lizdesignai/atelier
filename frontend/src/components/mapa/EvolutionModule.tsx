"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowRight, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EvolutionModuleProps {
  mapaAtual: any;
  mapaInicial?: any;
}

export default function EvolutionModule({ mapaAtual, mapaInicial }: EvolutionModuleProps) {
  const router = useRouter();
  const hasEvolution = mapaInicial && mapaInicial.id !== mapaAtual.id;

  if (!hasEvolution) {
    return (
      <div className="glass-panel p-12 text-center max-w-4xl mx-auto border-dashed border-[var(--color-atelier-terracota)]/30">
        <div className="w-20 h-20 bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] rounded-full flex items-center justify-center mx-auto mb-6">
          <Activity size={32} />
        </div>
        <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-4">A Hora da Verdade</h2>
        <p className="text-[var(--color-atelier-grafite)]/70 text-lg max-w-2xl mx-auto mb-8 font-medium">
          Você percorreu todas as dimensões da sua marca, aplicou as correções e ajustou a sintaxe visual. O seu perfil não é mais o mesmo.
          Chegou o momento de refazer o Raio-X original e descobrir o seu novo Score.
        </p>
        <button 
          onClick={() => {
             // In a real flow, this redirects to the Typeform or native form to generate a new Map record.
             window.dispatchEvent(new CustomEvent("showToast", { detail: "A abrir formulário de Reavaliação..." }));
             setTimeout(() => router.push('/'), 1000);
          }}
          className="bg-[var(--color-atelier-terracota)] text-white px-8 py-4 rounded-full text-sm font-bold uppercase tracking-widest shadow-xl hover:-translate-y-1 hover:bg-[#8c562e] transition-all flex items-center gap-2 mx-auto"
        >
          Refazer o Teste Agora <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  // --- Calculations for Evolution ---
  const currentTotal = mapaAtual.score_total;
  const initialTotal = mapaInicial.score_total;
  const totalDelta = currentTotal - initialTotal;
  
  const dims = [
    { key: 'clareza', label: 'Clareza' },
    { key: 'percepcao', label: 'Percepção' },
    { key: 'autoridade', label: 'Autoridade' },
    { key: 'conversao', label: 'Conversão' }
  ];

  let bestDim = dims[0];
  let bestDelta = -999;

  dims.forEach(dim => {
    const delta = (mapaAtual[`score_${dim.key}`] || 0) - (mapaInicial[`score_${dim.key}`] || 0);
    if (delta > bestDelta) {
      bestDelta = delta;
      bestDim = dim;
    }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      <div className="text-center mb-10">
        <h2 className="font-elegant text-5xl text-[var(--color-atelier-grafite)] mb-4">A sua Evolução</h2>
        <p className="text-[var(--color-atelier-grafite)]/60 text-lg max-w-2xl mx-auto font-medium">
          O resultado do seu trabalho prático ao longo do Método Mapa 4D.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card Antes */}
        <div className="glass-panel p-8 text-center flex flex-col justify-center border border-[var(--color-atelier-grafite)]/5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2">Ponto de Partida</span>
          <span className="text-5xl font-light text-[var(--color-atelier-grafite)]/40 mb-1">{initialTotal}</span>
          <span className="text-xs text-[var(--color-atelier-grafite)]/40">{new Date(mapaInicial.created_at).toLocaleDateString('pt-BR')}</span>
        </div>

        {/* Card Delta Central */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className={`p-8 text-center rounded-[2.5rem] shadow-2xl flex flex-col justify-center relative overflow-hidden border
            ${totalDelta > 0 ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200' : 
              totalDelta < 0 ? 'bg-gradient-to-br from-red-50 to-rose-100 border-red-200' : 'glass-panel'}
          `}
        >
          {totalDelta > 0 && <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={100} /></div>}
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 mb-2 relative z-10">Evolução Global</span>
          <div className="flex items-center justify-center gap-2 relative z-10">
            {totalDelta > 0 ? <ArrowUpRight className="text-green-600" size={32} /> : totalDelta < 0 ? <ArrowDownRight className="text-red-500" size={32} /> : null}
            <span className={`text-6xl font-bold tracking-tighter ${totalDelta > 0 ? 'text-green-700' : totalDelta < 0 ? 'text-red-600' : 'text-[var(--color-atelier-grafite)]'}`}>
              {totalDelta > 0 ? '+' : ''}{totalDelta}
            </span>
          </div>
          <span className="text-xs font-bold text-[var(--color-atelier-grafite)]/50 mt-2 relative z-10">pontos de IPD</span>
        </motion.div>

        {/* Card Depois */}
        <div className="glass-panel p-8 text-center flex flex-col justify-center border-2 border-[var(--color-atelier-terracota)]/20 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-[var(--color-atelier-terracota)]/5" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mb-2 relative z-10">Novo Diagnóstico</span>
          <span className="text-5xl font-bold text-[var(--color-atelier-grafite)] mb-1 relative z-10">{currentTotal}</span>
          <span className="text-xs font-medium text-[var(--color-atelier-grafite)]/60 relative z-10">{new Date(mapaAtual.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      <div className="glass-panel p-8 md:p-12 mt-8">
        <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-8 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
          Avanço por Dimensão
        </h3>
        <div className="space-y-6">
          {dims.map(dim => {
            const oldScore = mapaInicial[`score_${dim.key}`] || 0;
            const newScore = mapaAtual[`score_${dim.key}`] || 0;
            const diff = newScore - oldScore;
            
            return (
              <div key={dim.key} className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
                <div className="w-32 shrink-0">
                  <span className="text-sm font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">{dim.label}</span>
                </div>
                
                <div className="flex-1 w-full h-4 bg-gray-100 rounded-full overflow-hidden relative border border-gray-200">
                  {/* Base (Old Score) */}
                  <div className="absolute left-0 top-0 bottom-0 bg-[var(--color-atelier-grafite)]/20" style={{ width: `${oldScore}%` }} />
                  {/* Delta (Positive) */}
                  {diff > 0 && (
                    <div className="absolute top-0 bottom-0 bg-green-400 opacity-80" style={{ left: `${oldScore}%`, width: `${diff}%` }} />
                  )}
                  {/* Delta (Negative) */}
                  {diff < 0 && (
                    <div className="absolute top-0 bottom-0 bg-red-400 opacity-80" style={{ left: `${newScore}%`, width: `${Math.abs(diff)}%` }} />
                  )}
                </div>
                
                <div className="w-32 shrink-0 flex items-center justify-between font-roboto">
                  <span className="text-xs font-medium text-[var(--color-atelier-grafite)]/50">{oldScore} → <strong className="text-[var(--color-atelier-grafite)] text-sm">{newScore}</strong></span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${diff > 0 ? 'bg-green-100 text-green-700' : diff < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {bestDelta > 0 && (
          <div className="mt-10 p-6 bg-[var(--color-atelier-terracota)]/5 border border-[var(--color-atelier-terracota)]/20 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0 mt-1">
              <TrendingUp size={20} />
            </div>
            <div>
              <h4 className="font-bold text-[var(--color-atelier-grafite)]">O Seu Maior Avanço</h4>
              <p className="text-sm text-[var(--color-atelier-grafite)]/70 mt-1 leading-relaxed font-medium">
                A sua marca teve uma evolução brutal em <strong>{bestDim.label}</strong> (+{bestDelta} pts). Isso mostra que as implementações do Sprint correspondente foram absorvidas e estão a refletir-se diretamente na forma como o mercado lê o seu perfil.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
