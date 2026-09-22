import React from 'react';
import { motion } from 'framer-motion';
import { mockMapaData } from '@/app/mapa/mockData';
import { ArrowDown } from 'lucide-react';

export default function DashboardModule() {
  const { score } = mockMapaData;

  const renderProgressBar = (label: string, value: number) => {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-[var(--color-atelier-grafite)] uppercase tracking-wider text-xs">{label}</span>
          <span className="font-bold text-[var(--color-atelier-grafite)]">{value}</span>
        </div>
        <div className="w-full bg-[var(--color-atelier-grafite)]/10 h-2 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="bg-[var(--color-atelier-terracota)] h-full"
          />
        </div>
      </div>
    );
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[80vh] flex flex-col justify-center max-w-3xl mx-auto w-full py-12"
    >
      <div className="text-center space-y-6 mb-16">
        <div className="inline-block px-3 py-1 rounded-full border border-[var(--color-atelier-terracota)]/30 text-[var(--color-atelier-terracota)] text-xs font-bold uppercase tracking-widest mb-4">
          Atualizado em 21/09/2026
        </div>
        <h1 className="text-4xl md:text-5xl font-light text-[var(--color-atelier-grafite)]">
          Seu Mapa
        </h1>
        <p className="text-[var(--color-atelier-grafite)]/60 text-lg">
          Diagnóstico da presença digital da sua marca.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 glass-panel p-8">
        
        {/* Score Principal */}
        <div className="md:col-span-2 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[var(--color-atelier-grafite)]/10 pb-8 md:pb-0 md:pr-8">
          <p className="text-sm font-semibold text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mb-2">Seu Score</p>
          <div className="text-7xl font-bold text-[var(--color-atelier-grafite)] leading-none mb-2">
            {score.total}<span className="text-3xl text-[var(--color-atelier-grafite)]/40">/100</span>
          </div>
          <p className="text-[var(--color-atelier-terracota)] font-medium">Acima da média</p>
          
          <div className="mt-6 flex justify-between w-full text-sm text-[var(--color-atelier-grafite)]/60">
            <span>Média: {mockMapaData.benchmark.total}</span>
            <span className="text-green-600 font-medium">+{score.total - mockMapaData.benchmark.total} pts</span>
          </div>
        </div>

        {/* Dimensões */}
        <div className="md:col-span-3 space-y-6 flex flex-col justify-center">
          {renderProgressBar('Clareza', score.dimensions.clareza)}
          {renderProgressBar('Autoridade', score.dimensions.autoridade)}
          {renderProgressBar('Percepção', score.dimensions.percepcao)}
          {renderProgressBar('Conversão', score.dimensions.conversao)}
        </div>
      </div>

      <div className="mt-16 text-center space-y-6">
        <h3 className="text-2xl font-light text-[var(--color-atelier-grafite)]">
          Seu principal gargalo hoje é <span className="font-bold text-[var(--color-atelier-terracota)]">Conversão</span>.
        </h3>
        
        <button className="mx-auto flex flex-col items-center gap-2 text-sm font-bold text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors mt-8">
          <span>Entender por quê</span>
          <ArrowDown size={20} className="animate-bounce mt-2" />
        </button>
      </div>

    </motion.section>
  );
}
