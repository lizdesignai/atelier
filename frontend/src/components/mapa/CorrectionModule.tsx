"use client";

import React from 'react';
import { RefreshCcw, BookOpen, ChevronRight } from 'lucide-react';

interface Concept {
  titulo: string;
  resumo: string;
}

interface CorrectionModuleProps {
  score: number;
  conceitos: Concept[];
  onRetry: () => void;
}

export default function CorrectionModule({ score, conceitos, onRetry }: CorrectionModuleProps) {
  return (
    <div className="glass-panel p-8 md:p-12 border-2 border-[var(--color-atelier-terracota)]/20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-atelier-terracota)]" />
      
      <div className="mb-8">
        <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-widest mb-4">
          Score: {score}%
        </span>
        <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">
          Ainda não dominamos este ponto.
        </h2>
        <p className="text-[var(--color-atelier-grafite)]/70 font-medium">
          Você não atingiu a pontuação mínima de 80%. Para que seu sistema funcione na prática, precisamos garantir que estes conceitos estão 100% claros.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] flex items-center gap-2">
          <BookOpen size={16} className="text-[var(--color-atelier-terracota)]" /> Revise estes conceitos:
        </h3>
        
        <div className="grid gap-4">
          {conceitos.map((c, i) => (
            <div key={i} className="bg-white/60 border border-[var(--color-atelier-grafite)]/10 p-5 rounded-xl">
              <h4 className="font-bold text-[var(--color-atelier-grafite)] mb-2">{c.titulo}</h4>
              <p className="text-sm text-[var(--color-atelier-grafite)]/70">{c.resumo}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-start">
        <button 
          onClick={onRetry}
          className="flex items-center gap-2 bg-[var(--color-atelier-terracota)] text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#8c562e] transition-colors"
        >
          <RefreshCcw size={16} /> Refazer o Checkpoint
        </button>
      </div>
    </div>
  );
}
