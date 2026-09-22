"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ChevronRight, Play } from 'lucide-react';

interface Question {
  pergunta: string;
  opcoes: { texto: string; correta: boolean }[];
}

interface MicroCheckProps {
  perguntas: Question[];
  onComplete: (score: number) => void;
  videoTimestampFallback?: string;
}

import { trackMapaEvent } from '@/lib/trackMapaEvent';

export default function MicroCheck({ perguntas, onComplete, videoTimestampFallback }: MicroCheckProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const handleSelect = (optIdx: number) => {
    if (showFeedback) return;
    const newAnswers = [...answers, optIdx];
    setAnswers(newAnswers);
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (currentIdx < perguntas.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setShowFeedback(false);
    } else {
      setIsFinished(true);
      const score = answers.reduce((acc, ansIdx, idx) => {
        return acc + (perguntas[idx].opcoes[ansIdx].correta ? 1 : 0);
      }, 0);
      const finalScore = Math.round((score / perguntas.length) * 100);
      onComplete(finalScore);
      trackMapaEvent('micro_check_completed', { score: finalScore });
    }
  };

  if (!perguntas || perguntas.length === 0) return null;

  if (isFinished) {
    const isPerfect = answers.every((ans, idx) => perguntas[idx].opcoes[ans].correta);
    return (
      <div className="bg-[var(--color-atelier-terracota)]/5 border border-[var(--color-atelier-terracota)]/20 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
        {isPerfect ? (
          <>
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-bold text-[var(--color-atelier-grafite)]">Conceitos fixados!</h3>
            <p className="text-sm text-[var(--color-atelier-grafite)]/70">Você está pronto para a missão prática.</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-terracota)] rounded-full flex items-center justify-center">
              <Play size={20} className="ml-1" />
            </div>
            <h3 className="font-bold text-[var(--color-atelier-grafite)]">Atenção aos detalhes</h3>
            <p className="text-sm text-[var(--color-atelier-grafite)]/70">
              Sugerimos revisar o vídeo antes de prosseguir com a missão.
            </p>
          </>
        )}
      </div>
    );
  }

  const q = perguntas[currentIdx];
  const selectedIdx = showFeedback ? answers[currentIdx] : null;

  return (
    <div className="bg-white/80 border border-[var(--color-atelier-grafite)]/10 p-6 rounded-2xl space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
          Micro-Check {currentIdx + 1}/{perguntas.length}
        </span>
      </div>
      
      <p className="font-roboto font-bold text-lg text-[var(--color-atelier-grafite)]">{q.pergunta}</p>

      <div className="space-y-2">
        {q.opcoes.map((opt, idx) => {
          let styleClass = "bg-white border-[var(--color-atelier-grafite)]/10 hover:border-[var(--color-atelier-terracota)]/40";
          let icon = null;

          if (showFeedback) {
            if (opt.correta) {
              styleClass = "bg-green-50 border-green-200 text-green-800";
              icon = <CheckCircle2 size={18} className="text-green-600" />;
            } else if (selectedIdx === idx) {
              styleClass = "bg-red-50 border-red-200 text-red-800";
              icon = <XCircle size={18} className="text-red-600" />;
            } else {
              styleClass = "bg-white/50 border-[var(--color-atelier-grafite)]/5 opacity-50";
            }
          }

          return (
            <button
              key={idx}
              disabled={showFeedback}
              onClick={() => handleSelect(idx)}
              className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all ${styleClass}`}
            >
              <span className="text-sm font-medium">{opt.texto}</span>
              {icon}
            </button>
          );
        })}
      </div>

      {showFeedback && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end pt-4 border-t border-[var(--color-atelier-grafite)]/10">
          <button 
            onClick={handleNext}
            className="flex items-center gap-2 bg-[var(--color-atelier-grafite)] text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors"
          >
            Continuar <ChevronRight size={16} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
