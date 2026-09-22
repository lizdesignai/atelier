"use client";

import React from 'react';

interface ProgressBarProps {
  currentStage: number; // 0 to 5
  totalStages: number; // usually 5
}

export default function ProgressBar({ currentStage, totalStages }: ProgressBarProps) {
  const progressPercentage = Math.min(100, Math.max(0, (currentStage / totalStages) * 100));

  return (
    <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel px-4 md:px-6 py-4">
      <div className="flex flex-col">
        <span className="micro-title hidden md:block">Seu Avanço</span>
        <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/70">
          Sprint {currentStage} de {totalStages}
        </span>
      </div>
      
      <div className="w-full md:flex-1 md:max-w-md h-3 bg-white/40 rounded-full overflow-hidden border border-white/50 shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-[var(--color-atelier-madeira)] to-[var(--color-atelier-terracota)] transition-all duration-1000 ease-out rounded-full"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
