import React from 'react';

interface BrandSnapshotData {
  essencia: string;
  publico: string;
  problema: string;
  promessa: string;
  personalidade: string[];
  diferenciais: string;
  ambiente_competitivo: string;
  anti_patterns: string;
}

interface BrandSnapshotProps {
  data: BrandSnapshotData;
  onApprove?: () => void;
  onRequestRevision?: () => void;
  isClient?: boolean;
}

export function BrandSnapshot({ data, onApprove, onRequestRevision, isClient }: BrandSnapshotProps) {
  if (!data) return null;

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-[var(--color-atelier-terracota)]/20 rounded-3xl p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Brand Snapshot</h3>
          <p className="text-sm text-[var(--color-atelier-grafite)]/60 font-roboto mt-1">
            Síntese estratégica do negócio
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center">
          <span className="text-[var(--color-atelier-terracota)] text-xl">⚡</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Essência e Promessa */}
        <div className="space-y-6">
          <div className="bg-[var(--color-atelier-terracota)]/5 rounded-2xl p-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mb-3">Essência</h4>
            <p className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-snug">{data.essencia}</p>
          </div>
          
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2">A Promessa</h4>
            <p className="text-sm font-roboto text-[var(--color-atelier-grafite)]">{data.promessa}</p>
          </div>
          
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2">O Problema que Resolve</h4>
            <p className="text-sm font-roboto text-[var(--color-atelier-grafite)]">{data.problema}</p>
          </div>
        </div>

        {/* Personalidade e Anti-patterns */}
        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-3">Personalidade</h4>
            <div className="flex flex-wrap gap-2">
              {data.personalidade?.map((trait, i) => (
                <span key={i} className="px-3 py-1 bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)] text-xs font-medium rounded-full">
                  {trait}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2">Público</h4>
            <p className="text-sm font-roboto text-[var(--color-atelier-grafite)]">{data.publico}</p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-red-500/50 mb-2">Anti-Patterns (O que não somos)</h4>
            <p className="text-sm font-roboto text-[var(--color-atelier-grafite)]">{data.anti_patterns}</p>
          </div>
        </div>
      </div>

      {isClient && (onApprove || onRequestRevision) && (
        <div className="mt-10 pt-6 border-t border-[var(--color-atelier-grafite)]/10">
          <h4 className="text-sm font-bold text-[var(--color-atelier-grafite)] mb-4 text-center">Isso representa corretamente a direção do negócio?</h4>
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={onRequestRevision}
              className="px-6 py-3 rounded-full text-sm font-medium text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-grafite)]/5 transition-colors"
            >
              ↻ Precisa ajustar
            </button>
            <button 
              onClick={onApprove}
              className="px-8 py-3 rounded-full text-sm font-bold text-white bg-[var(--color-atelier-grafite)] shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              ✓ Sim, é isso
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
