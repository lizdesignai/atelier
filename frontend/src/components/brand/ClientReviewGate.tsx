import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Edit3, RefreshCw, Clock, ArrowRight } from 'lucide-react';

interface ClientReviewGateProps {
  onDecision: (decision: string, feedback: string) => void;
  pdfUrl?: string;
  isSubmitting?: boolean;
}

export function ClientReviewGate({ onDecision, pdfUrl, isSubmitting }: ClientReviewGateProps) {
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (!selectedDecision) return;
    onDecision(selectedDecision, feedback);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div className="glass-panel p-8 rounded-[2rem] flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-6">
          <div>
            <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Janela de Aprovação (48h)</h2>
            <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60 mt-2">
              Analise a apresentação com calma e compartilhe sua decisão estruturada.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] px-4 py-2 rounded-full font-roboto font-bold text-xs uppercase tracking-widest">
            <Clock size={14} />
            Aguardando Decisão
          </div>
        </div>

        {pdfUrl && (
          <div className="flex justify-between items-center bg-[#F0EBE1] p-4 rounded-xl border border-[var(--color-atelier-grafite)]/10">
            <span className="font-elegant text-lg text-[var(--color-atelier-grafite)]">Apresentação Oficial (PDF)</span>
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-sm font-bold tracking-widest text-[var(--color-atelier-terracota)] uppercase flex items-center gap-2 hover:underline">
              Visualizar <ArrowRight size={14} />
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <button 
            onClick={() => setSelectedDecision('approve')}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${selectedDecision === 'approve' ? 'border-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/5' : 'border-transparent bg-white hover:border-[var(--color-atelier-grafite)]/10'}`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedDecision === 'approve' ? 'bg-[var(--color-atelier-terracota)] text-white' : 'bg-[#F0EBE1] text-[var(--color-atelier-grafite)]'}`}>
              <Check size={24} />
            </div>
            <div className="text-center">
              <span className="font-elegant text-xl block text-[var(--color-atelier-grafite)]">Aprovar</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1 block">Avançar p/ Entrega</span>
            </div>
          </button>

          <button 
            onClick={() => setSelectedDecision('adjust')}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${selectedDecision === 'adjust' ? 'border-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/5' : 'border-transparent bg-white hover:border-[var(--color-atelier-grafite)]/10'}`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedDecision === 'adjust' ? 'bg-[var(--color-atelier-terracota)] text-white' : 'bg-[#F0EBE1] text-[var(--color-atelier-grafite)]'}`}>
              <Edit3 size={24} />
            </div>
            <div className="text-center">
              <span className="font-elegant text-xl block text-[var(--color-atelier-grafite)]">Pequenos Ajustes</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1 block">Aprovar com ressalvas</span>
            </div>
          </button>

          <button 
            onClick={() => setSelectedDecision('revise')}
            className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${selectedDecision === 'revise' ? 'border-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/5' : 'border-transparent bg-white hover:border-[var(--color-atelier-grafite)]/10'}`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedDecision === 'revise' ? 'bg-[var(--color-atelier-terracota)] text-white' : 'bg-[#F0EBE1] text-[var(--color-atelier-grafite)]'}`}>
              <RefreshCw size={24} />
            </div>
            <div className="text-center">
              <span className="font-elegant text-xl block text-[var(--color-atelier-grafite)]">Solicitar Revisão</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1 block">Refinamento estrutural</span>
            </div>
          </button>
        </div>

        {selectedDecision && selectedDecision !== 'approve' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
            <label className="font-roboto text-xs uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)] mb-2 block">
              Feedback Consolidado
            </label>
            <textarea 
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Descreva pontualmente os ajustes necessários..."
              className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 min-h-[120px] focus:outline-none focus:border-[var(--color-atelier-terracota)]/50 font-roboto text-sm text-[var(--color-atelier-grafite)]"
            />
          </motion.div>
        )}

        {selectedDecision && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex justify-end">
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || (selectedDecision !== 'approve' && feedback.trim() === '')}
              className="bg-[var(--color-atelier-terracota)] text-white px-8 py-3 rounded-full font-roboto text-xs uppercase tracking-widest font-bold disabled:opacity-50 hover:bg-[#A07050] transition-colors"
            >
              {isSubmitting ? 'Enviando...' : 'Confirmar Decisão'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
