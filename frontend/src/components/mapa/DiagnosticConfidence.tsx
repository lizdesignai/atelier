"use client";

import React from 'react';
import { ShieldCheck, CircleDot, Circle } from 'lucide-react';

interface DimensionConfidence {
  dimensao: string;
  score: number;
  level: 'Inicial' | 'Confirmado' | 'Validado';
}

interface DiagnosticConfidenceProps {
  dimensions: DimensionConfidence[];
}

export default function DiagnosticConfidence({ dimensions }: DiagnosticConfidenceProps) {
  return (
    <div className="glass-panel p-6 border border-[var(--color-atelier-grafite)]/10 mt-6">
      <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] mb-4">Confiança do Diagnóstico</h3>
      <div className="grid gap-3">
        {dimensions.map((dim) => (
          <div key={dim.dimensao} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 pb-2 sm:pb-0 border-b sm:border-0 border-[var(--color-atelier-grafite)]/5 last:border-0">
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
              <span className="text-sm font-medium text-[var(--color-atelier-grafite)] sm:w-24">{dim.dimensao}</span>
              <span className="text-sm font-bold text-[var(--color-atelier-grafite)]/70">{dim.score}/100</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-medium">
              {dim.level === 'Inicial' && (
                <span className="flex items-center gap-2 text-[var(--color-atelier-grafite)]/50">
                  <Circle size={14} /> Diagnóstico Inicial
                </span>
              )}
              {dim.level === 'Confirmado' && (
                <span className="flex items-center gap-2 text-[var(--color-atelier-terracota)]">
                  <CircleDot size={14} /> Evidências Analisadas
                </span>
              )}
              {dim.level === 'Validado' && (
                <span className="flex items-center gap-2 text-green-600">
                  <ShieldCheck size={14} /> Validado
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
