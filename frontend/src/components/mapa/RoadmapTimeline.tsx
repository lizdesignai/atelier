"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, ArrowRight, PlayCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface StageInfo {
  id: number;
  title: string;
  subtitle: string;
  timeEstimate: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
}

interface RoadmapTimelineProps {
  stages: StageInfo[];
}

export default function RoadmapTimeline({ stages }: RoadmapTimelineProps) {
  const router = useRouter();

  const handleStageClick = (stage: StageInfo) => {
    // Liberado temporariamente para modo de desenvolvimento
    router.push(`/mapa/sprint/${stage.id}`);
  };

  return (
    <div className="glass-panel p-6 md:p-8 w-full">
      <div className="mb-8">
        <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Sua jornada</h2>
        <p className="text-[var(--color-atelier-grafite)]/70 mt-2 font-medium">
          O caminho para transformar seu diagnóstico em resultados.
        </p>
      </div>

      <div className="relative border-l-2 border-[var(--color-atelier-grafite)]/10 ml-6 space-y-12 pb-4">
        {stages.map((stage, index) => {
          const isCompleted = stage.status === 'completed';
          const isAvailable = stage.status === 'available' || stage.status === 'in_progress';
          const isLocked = stage.status === 'locked';

          return (
            <motion.div 
              key={stage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative pl-10 group ${isLocked ? 'opacity-60 grayscale' : 'cursor-pointer'}`}
              onClick={() => handleStageClick(stage)}
            >
              {/* Timeline dot */}
              <div 
                className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${isCompleted 
                    ? 'bg-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)] text-white shadow-md' 
                    : isAvailable 
                      ? 'bg-white border-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)] shadow-[0_0_15px_rgba(173,111,64,0.3)]' 
                      : 'bg-[#f4ebe1] border-[var(--color-atelier-grafite)]/20 text-[var(--color-atelier-grafite)]/40'
                  }
                `}
              >
                {isCompleted ? <Check size={16} strokeWidth={3} /> : 
                 isLocked ? <Lock size={14} /> : 
                 <span className="font-bold text-sm">{stage.id === 0 ? 'D' : stage.id === 5 ? 'E' : `0${stage.id}`}</span>}
              </div>

              <div className={`p-5 rounded-2xl transition-all duration-300 border
                ${isAvailable ? 'bg-white border-[var(--color-atelier-terracota)]/30 shadow-sm hover:shadow-md hover:border-[var(--color-atelier-terracota)]' : 'bg-white/40 border-transparent hover:bg-white/60'}
              `}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="micro-title block mb-1">
                      {stage.status === 'completed' ? 'Concluído' : stage.status === 'in_progress' ? 'Em andamento' : stage.status === 'available' ? 'Próxima Etapa' : 'Bloqueado'}
                    </span>
                    <h3 className="font-roboto font-bold tracking-tight text-xl text-[var(--color-atelier-grafite)]">
                      {stage.title}
                    </h3>
                    <p className="text-[var(--color-atelier-grafite)]/70 mt-1 text-sm">
                      {stage.subtitle}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {!isLocked && (
                      <div className="flex items-center text-xs font-medium text-[var(--color-atelier-grafite)]/50 bg-black/5 px-3 py-1.5 rounded-full">
                        <Clock className="w-3 h-3 mr-1.5" />
                        ~{stage.timeEstimate}
                      </div>
                    )}
                    
                    {isAvailable && (
                      <button className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)] text-white shadow-md group-hover:scale-110 transition-transform">
                        <ArrowRight size={18} />
                      </button>
                    )}
                    {isCompleted && (
                      <button className="flex items-center justify-center w-10 h-10 rounded-full bg-transparent border border-[var(--color-atelier-grafite)]/20 text-[var(--color-atelier-grafite)]/60 hover:bg-white transition-colors">
                        <PlayCircle size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
