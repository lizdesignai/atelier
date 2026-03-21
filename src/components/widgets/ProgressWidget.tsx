// src/components/widgets/ProgressWidget.tsx
import React from 'react';

interface ProgressWidgetProps {
  clientName: string;
  progressPercentage: number;
  currentStage: string;
}

export default function ProgressWidget({ clientName, progressPercentage, currentStage }: ProgressWidgetProps) {
  return (
    // Utilizamos um fundo escuro e elegante (grafite) com um leve degradê para a cor madeira.
    // A borda translúcida (border-white/10) dá o aspecto de vidro premium.
    <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-atelier-grafite to-[#5a5450] p-10 shadow-2xl border border-white/10 flex flex-col justify-center min-h-[280px] group">
      
      {/* Elementos Decorativos de Fundo (Luzes desfocadas para dar volume e sofisticação) */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-atelier-terracota opacity-20 rounded-full blur-3xl transition-all duration-700 group-hover:opacity-30"></div>
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-atelier-rose opacity-10 rounded-full blur-2xl"></div>

      {/* Conteúdo Principal */}
      <div className="relative z-10">
        <h1 className="text-5xl font-elegant text-atelier-creme mb-3 tracking-wide">
          Olá, {clientName}.
        </h1>
        <p className="text-atelier-rose/80 text-lg mb-10 font-roboto font-light max-w-md">
          A sua identidade está sendo forjada. Acompanhe a manufatura do seu projeto em tempo real.
        </p>

        {/* Seção da Barra de Progresso */}
        <div className="mt-auto">
          <div className="flex justify-between items-end mb-3 font-roboto">
            <div className="flex flex-col">
              <span className="text-xs text-atelier-creme/50 uppercase tracking-widest mb-1">Etapa Atual</span>
              <span className="text-atelier-creme font-medium text-lg">{currentStage}</span>
            </div>
            <span className="text-3xl font-elegant text-atelier-terracota drop-shadow-md">
              {progressPercentage}%
            </span>
          </div>
          
          {/* Fundo da Barra (Trilha) */}
          <div className="w-full bg-black/40 rounded-full h-4 backdrop-blur-md overflow-hidden p-[2px] border border-white/5">
            {/* O Preenchimento da Barra com efeito de "brilho interno" e animação suave */}
            <div 
              className="bg-gradient-to-r from-atelier-rose to-atelier-terracota h-full rounded-full relative shadow-[0_0_15px_rgba(173,111,64,0.5)] transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            >
              {/* Detalhe de luz refletida no topo da barra para aspecto 3D */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/30 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}