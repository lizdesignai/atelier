"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Target, Upload, Camera } from 'lucide-react';
import { useGlobalStore } from "@/contexts/GlobalStore";
import { trackMapaEvent } from '@/lib/trackMapaEvent';

interface BaselineTemplateProps {
  mapaData: any;
  onComplete: () => Promise<void>;
  onUpdateProgress: (field: string, value: any) => Promise<void>;
}

export default function BaselineTemplate({ mapaData, onUpdateProgress, onComplete }: BaselineTemplateProps) {
  const router = useRouter();
  const progresso = mapaData?.progresso_etapas?.['0'] || {};
  
  const [objetivos, setObjetivos] = useState(progresso.objetivos || '');
  const [compromisso, setCompromisso] = useState(progresso.compromisso || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    trackMapaEvent('sprint_started', { sprint_id: 0, ipd_atual: mapaData.score_total });
  }, [mapaData.score_total]);

  const handleSubmit = async () => {
    if (!objetivos.trim() || !compromisso) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Preencha seus objetivos e aceite o compromisso." }));
      return;
    }
    setIsSubmitting(true);
    await onUpdateProgress('objetivos', objetivos);
    await onUpdateProgress('compromisso', compromisso);
    await onComplete();
    trackMapaEvent('sprint_completed', { sprint_id: 0 });
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-block px-3 py-1 rounded-full border border-[var(--color-atelier-grafite)]/20 text-[var(--color-atelier-grafite)] text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
          Sprint 0 • Baseline
        </div>
        <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)]">
          O Seu Estado Atual
        </h1>
        <p className="text-lg text-[var(--color-atelier-grafite)]/70 max-w-xl mx-auto">
          Antes de iniciarmos a transformação, precisamos documentar onde você está hoje.
        </p>
      </div>

      <div className="glass-panel p-8 md:p-10 space-y-8 border-t-4 border-t-[var(--color-atelier-terracota)]">
        
        {/* Objetivos */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[var(--color-atelier-terracota)]">
            <Target size={24} />
            <h2 className="font-roboto font-bold text-xl text-[var(--color-atelier-grafite)]">Seus Objetivos</h2>
          </div>
          <p className="text-sm text-[var(--color-atelier-grafite)]/70">O que você espera melhorar nas próximas 4 semanas?</p>
          <textarea 
            value={objetivos}
            onChange={(e) => setObjetivos(e.target.value)}
            placeholder="Ex: Quero deixar claro o que vendo, melhorar a estética do meu feed e organizar meus cases..."
            className="w-full bg-white/50 border border-[var(--color-atelier-grafite)]/20 rounded-xl p-4 min-h-[120px] focus:outline-none focus:border-[var(--color-atelier-terracota)] transition-colors text-sm"
          />
        </div>

        {/* Screenshots */}
        <div className="space-y-4 pt-6 border-t border-[var(--color-atelier-grafite)]/10">
          <div className="flex items-center gap-3 text-[var(--color-atelier-terracota)]">
            <Camera size={24} />
            <h2 className="font-roboto font-bold text-xl text-[var(--color-atelier-grafite)]">O Seu "Antes"</h2>
          </div>
          <p className="text-sm text-[var(--color-atelier-grafite)]/70">Para medir sua evolução, você precisará comparar o antes e depois.</p>
          
          <div className="border-2 border-dashed border-[var(--color-atelier-grafite)]/20 rounded-xl p-8 text-center bg-white/30 hover:bg-white/50 transition-colors cursor-pointer">
             <Upload size={32} className="mx-auto text-[var(--color-atelier-grafite)]/30 mb-4" />
             <p className="font-medium text-sm text-[var(--color-atelier-grafite)]">Fazer upload de screenshots</p>
             <p className="text-xs text-[var(--color-atelier-grafite)]/50 mt-2">Recomendamos: 1 print da sua Bio e 1 print do seu Feed atual.</p>
             <p className="text-xs text-[var(--color-atelier-terracota)] mt-4 font-bold">(Funcionalidade na Fase 2)</p>
          </div>
        </div>

        {/* Compromisso */}
        <div className="space-y-4 pt-6 border-t border-[var(--color-atelier-grafite)]/10">
          <label className="flex items-start gap-4 cursor-pointer group">
            <div className={`mt-1 w-6 h-6 rounded flex items-center justify-center shrink-0 border transition-all ${compromisso ? 'bg-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)]' : 'bg-white border-[var(--color-atelier-grafite)]/30 group-hover:border-[var(--color-atelier-terracota)]/50'}`}>
              {compromisso && <Check size={14} className="text-white" strokeWidth={3} />}
            </div>
            <div className="select-none">
              <span className="block font-bold text-[var(--color-atelier-grafite)] mb-1">O Compromisso</span>
              <span className="text-sm text-[var(--color-atelier-grafite)]/70 leading-relaxed block">
                Comprometo-me a dedicar aproximadamente 2 horas por semana, durante 4 semanas, para assistir às aulas, aplicar os templates e submeter as evidências.
              </span>
            </div>
          </label>
        </div>

      </div>

      <div className="flex justify-center">
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || !objetivos.trim() || !compromisso}
          className="bg-[var(--color-atelier-terracota)] text-white px-8 py-4 rounded-full text-sm font-bold uppercase tracking-widest shadow-xl hover:-translate-y-1 hover:bg-[#8c562e] transition-all disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {isSubmitting ? 'A salvar...' : 'Iniciar Minha Jornada'}
        </button>
      </div>

    </div>
  );
}
