"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, FileText, Download, Play, Upload, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { StageContent } from '@/app/mapa/content';
import { useRouter } from 'next/navigation';
import MicroCheck from './MicroCheck';
import CorrectionModule from './CorrectionModule';

interface StageTemplateProps {
  content: StageContent;
  clientName: string;
  mapaData: any;
  onUpdateProgress: (field: string, value: any) => Promise<void>;
  onCompleteStage: () => Promise<void>;
}

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

import { trackMapaEvent } from '@/lib/trackMapaEvent';

export default function StageTemplate({ content, clientName, mapaData, onUpdateProgress, onCompleteStage }: StageTemplateProps) {
  const router = useRouter();
  const progresso = mapaData?.progresso_etapas?.[String(content.id)] || {};
  
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [evidenciaText, setEvidenciaText] = useState(progresso.evidencia_enviada ? 'Evidência já enviada e registada no sistema.' : '');
  const [isSubmittingEvidencia, setIsSubmittingEvidencia] = useState(false);
  const [checkpointAnswers, setCheckpointAnswers] = useState<Record<number, number>>({});
  const [isCompleting, setIsCompleting] = useState(false);

  React.useEffect(() => {
    trackMapaEvent('sprint_started', { sprint_id: content.id, ipd_atual: mapaData.score_total });
  }, [content.id, mapaData.score_total]);

  // --- Handlers ---

  const handleTaskToggle = async (taskId: string) => {
    const currentTasks = progresso.tarefas || {};
    const newState = !currentTasks[taskId];
    await onUpdateProgress('tarefas', { [taskId]: newState });
    if (newState) {
      trackMapaEvent('task_completed', { sprint_id: content.id, task_id: taskId });
    }
  };

  const handleMarkVideoViewed = async () => {
    if (!progresso.aula_vista) {
      await onUpdateProgress('aula_vista', true);
      showToast("Aula marcada como concluída!");
      trackMapaEvent('video_watched', { sprint_id: content.id });
    }
  };

  const generatePDF = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    showToast("A gerar o seu material de apoio...");
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const MapaPDF = (await import('../pdf/MapaPDF')).default; 
      const doc = <MapaPDF clientName={clientName} stageNumber={content.id} mapaData={mapaData} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; 
      link.download = `Mapa_4D_${content.dimensao}_${clientName.split(' ')[0]}.pdf`;
      link.click();
      
      if (!progresso.pdf_aberto) {
        await onUpdateProgress('pdf_aberto', true);
      }
      trackMapaEvent('pdf_downloaded', { sprint_id: content.id, dimensao: content.dimensao });
    } catch (e) {
      console.error(e);
      showToast("Erro ao gerar PDF."); 
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const submitEvidencia = async () => {
    if (!evidenciaText.trim()) return showToast("Por favor, preencha a evidência.");
    setIsSubmittingEvidencia(true);
    try {
      const res = await fetch('/api/mapa/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etapa: content.id,
          tipo: 'texto',
          conteudo: evidenciaText
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Evidência registada com sucesso!");
        await onUpdateProgress('evidencia_enviada', true);
        trackMapaEvent('evidence_submitted', { sprint_id: content.id, tipo: 'texto' });
      } else {
        showToast(data.error || "Erro ao enviar.");
      }
    } catch (e) {
      showToast("Erro de conexão.");
    } finally {
      setIsSubmittingEvidencia(false);
    }
  };

  const submitCheckpoint = async () => {
    const totalQ = content.checkpoint.perguntas.length;
    if (Object.keys(checkpointAnswers).length < totalQ) {
      return showToast("Responda a todas as perguntas do checkpoint.");
    }

    let correctCount = 0;
    content.checkpoint.perguntas.forEach((q, idx) => {
      if (q.opcoes[checkpointAnswers[idx]]?.correta) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / totalQ) * 100);
    await onUpdateProgress('checkpoint_score', score);
    
    trackMapaEvent('checkpoint_attempted', { sprint_id: content.id, score });

    if (score >= 80) {
      showToast(`Aprovado no Checkpoint com ${score}%!`);
      trackMapaEvent('checkpoint_passed', { sprint_id: content.id, score });
    } else {
      showToast(`Score de ${score}%. A revisão é necessária para atingir os 80%.`);
    }
  };

  const handleCompletion = async () => {
    setIsCompleting(true);
    await onCompleteStage();
    trackMapaEvent('sprint_completed', { sprint_id: content.id });
    setIsCompleting(false);
  };

  // --- Calculations ---
  const allTasksDone = content.missao.tarefas.every(t => (progresso.tarefas || {})[t.id]);
  const hasPassedCheckpoint = (progresso.checkpoint_score || 0) >= 80;
  const isReadyToComplete = progresso.aula_vista && progresso.evidencia_enviada && allTasksDone && hasPassedCheckpoint;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12 pb-24">
      
      {/* 1. CONTEXTO */}
      <section className="text-center pt-8">
        <div className="inline-block px-3 py-1 rounded-full border border-[var(--color-atelier-grafite)]/20 text-[var(--color-atelier-grafite)] text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
          Sprint 0{content.id} • {content.dimensao}
        </div>
        <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] mb-4">
          {content.contexto.title}
        </h1>
        <p className="text-[var(--color-atelier-grafite)]/60 text-lg max-w-2xl mx-auto font-medium mb-6">
          {content.contexto.subtitle}
        </p>
        <p className="text-sm text-[var(--color-atelier-grafite)] leading-relaxed max-w-3xl mx-auto">
          {content.contexto.copy}
        </p>
      </section>

      {/* 2. AULA */}
      <section className="glass-panel p-2 flex flex-col overflow-hidden">
        <div className="w-full aspect-video bg-[var(--color-atelier-grafite)] rounded-2xl flex items-center justify-center relative group">
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center rounded-2xl">
            <button 
              onClick={handleMarkVideoViewed}
              className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/30 hover:scale-110 hover:bg-[var(--color-atelier-terracota)] transition-all"
            >
              <Play size={32} className="ml-2" />
            </button>
          </div>
          <span className="absolute bottom-4 left-6 text-white font-bold text-sm tracking-widest uppercase">
            AULA: {content.aula.title}
          </span>
          {progresso.aula_vista && (
            <span className="absolute top-4 right-6 bg-green-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
              <CheckCircle2 size={12} /> Assistida
            </span>
          )}
        </div>

        {content.aula.timestamps && content.aula.timestamps.length > 0 && (
          <div className="p-6 md:px-10 bg-white/30 rounded-b-2xl">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-4">Nesta aula</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {content.aula.timestamps.map((ts, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm text-[var(--color-atelier-grafite)]">
                  <span className="text-[var(--color-atelier-terracota)] font-roboto font-bold bg-[var(--color-atelier-terracota)]/10 px-2 py-0.5 rounded">{ts.time}</span>
                  <span className="font-medium">{ts.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* MICRO-CHECK */}
      {content.microCheck && (
        <section>
          <MicroCheck 
            perguntas={content.microCheck.perguntas}
            onComplete={(score) => onUpdateProgress('micro_check_score', score)}
          />
        </section>
      )}

      {/* 3. GUIA PDF */}
      <section className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 glass-panel p-8 flex items-center justify-between group">
          <div>
            <h3 className="font-roboto font-bold text-lg text-[var(--color-atelier-grafite)] mb-1 flex items-center gap-2">
              <FileText size={18} className="text-[var(--color-atelier-terracota)]" />
              Guia Prático da Semana
            </h3>
            <p className="text-sm text-[var(--color-atelier-grafite)]/60">
              Material de apoio em PDF gerado com as suas respostas.
            </p>
          </div>
          <button 
            onClick={generatePDF}
            disabled={isGeneratingPDF}
            className="flex items-center justify-center gap-2 bg-[var(--color-atelier-grafite)] text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-colors disabled:opacity-50"
          >
            {isGeneratingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Baixar PDF
          </button>
        </div>
      </section>

      {/* 4. MISSÃO (Checklist) */}
      <section className="glass-panel p-8 md:p-12">
        <div className="mb-8">
          <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">{content.missao.title}</h2>
          <p className="text-[var(--color-atelier-grafite)]/60 font-medium">{content.missao.description}</p>
        </div>

        <div className="space-y-3">
          {content.missao.tarefas.map(t => {
            const isDone = (progresso.tarefas || {})[t.id];
            return (
              <div 
                key={t.id}
                onClick={() => handleTaskToggle(t.id)}
                className={`p-4 rounded-2xl border flex flex-col cursor-pointer transition-all hover:shadow-sm
                  ${isDone ? 'bg-green-50/50 border-green-200/50' : 'bg-white/50 border-[var(--color-atelier-grafite)]/10 hover:border-[var(--color-atelier-terracota)]/30'}
                `}
              >
                <div className="flex gap-4 items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors
                    ${isDone ? 'text-green-600 bg-green-100' : 'text-[var(--color-atelier-grafite)]/30'}
                  `}>
                    {isDone ? <CheckCircle2 size={24} /> : <Circle size={24} strokeWidth={1.5} />}
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm md:text-base font-medium transition-colors ${isDone ? 'text-green-800 line-through opacity-70' : 'text-[var(--color-atelier-grafite)]'}`}>
                      {t.texto}
                    </span>
                  </div>
                  <div className="hidden md:flex gap-2 shrink-0">
                    <span className="text-[9px] uppercase font-bold text-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/10 px-2 py-1 rounded">
                      Impacto {t.impacto}
                    </span>
                  </div>
                </div>
                
                {/* Plano Operacional expandido (se houver dados) */}
                {(!isDone && (t.tempo_estimado || t.criterio || t.tipo_evidencia)) && (
                  <div className="mt-4 ml-10 p-4 bg-white/60 border border-[var(--color-atelier-grafite)]/5 rounded-xl space-y-2 text-sm text-[var(--color-atelier-grafite)]/70">
                    {t.tempo_estimado && <p><strong className="text-[var(--color-atelier-grafite)]">⏱ Esforço:</strong> {t.tempo_estimado}</p>}
                    {t.criterio && <p><strong className="text-[var(--color-atelier-grafite)]">✓ Critério:</strong> {t.criterio}</p>}
                    {t.tipo_evidencia && <p><strong className="text-[var(--color-atelier-grafite)]">📎 Evidência:</strong> {t.tipo_evidencia}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. EVIDÊNCIA */}
      <section className="glass-panel p-8 md:p-12">
        <div className="mb-6">
          <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">{content.evidencia.title}</h2>
          <p className="text-[var(--color-atelier-grafite)]/60 font-medium">{content.evidencia.description}</p>
        </div>
        
        <div className="space-y-4">
          <textarea 
            value={evidenciaText}
            onChange={(e) => setEvidenciaText(e.target.value)}
            disabled={progresso.evidencia_enviada}
            placeholder={content.evidencia.placeholder}
            className="w-full h-32 p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/10 bg-white/50 focus:outline-none focus:border-[var(--color-atelier-terracota)]/50 focus:ring-2 focus:ring-[var(--color-atelier-terracota)]/20 transition-all resize-none text-sm disabled:opacity-70 disabled:cursor-not-allowed"
          />
          
          <div className="flex items-center justify-end">
            {!progresso.evidencia_enviada ? (
              <button 
                onClick={submitEvidencia}
                disabled={isSubmittingEvidencia}
                className="flex items-center gap-2 bg-[var(--color-atelier-terracota)] text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest shadow-md hover:bg-[#8c562e] transition-colors"
              >
                {isSubmittingEvidencia ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Enviar Evidência
              </button>
            ) : (
              <span className="flex items-center gap-2 text-green-600 font-bold text-xs uppercase tracking-widest px-4 py-2 bg-green-50 rounded-full">
                <CheckCircle2 size={16} /> Recebido e Auditado
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 6. CHECKPOINT */}
      <section className="glass-panel p-8 md:p-12 border border-[var(--color-atelier-grafite)]/10">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2 flex items-center gap-2">
              <ShieldCheck className="text-[var(--color-atelier-terracota)]" size={28} />
              {content.checkpoint.title}
            </h2>
            <p className="text-[var(--color-atelier-grafite)]/60 font-medium">Você precisa de 80% para desbloquear a próxima fase.</p>
          </div>
          
          {progresso.checkpoint_score > 0 && (
            <div className={`px-4 py-2 rounded-2xl flex flex-col items-center ${progresso.checkpoint_score >= 80 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <span className="text-2xl font-bold">{progresso.checkpoint_score}%</span>
              <span className="text-[9px] uppercase font-bold tracking-widest">Score Obtido</span>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {content.checkpoint.perguntas.map((q, idx) => (
            <div key={idx} className="space-y-3">
              <p className="font-roboto font-bold text-[var(--color-atelier-grafite)] text-sm">{idx + 1}. {q.pergunta}</p>
              <div className="space-y-2">
                {q.opcoes.map((opt, optIdx) => {
                  const isSelected = checkpointAnswers[idx] === optIdx;
                  return (
                    <div 
                      key={optIdx}
                      onClick={() => !hasPassedCheckpoint && setCheckpointAnswers(prev => ({...prev, [idx]: optIdx}))}
                      className={`p-4 rounded-xl border cursor-pointer text-sm transition-all
                        ${hasPassedCheckpoint ? 'cursor-default opacity-80' : 'hover:bg-white'}
                        ${isSelected ? 'bg-white border-[var(--color-atelier-terracota)] shadow-sm' : 'bg-white/40 border-transparent'}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full flex shrink-0 items-center justify-center border mt-0.5
                          ${isSelected ? 'border-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]' : 'border-[var(--color-atelier-grafite)]/30'}
                        `}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <span className={`${isSelected ? 'font-medium text-[var(--color-atelier-grafite)]' : 'text-[var(--color-atelier-grafite)]/70'}`}>
                          {opt.texto}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {!hasPassedCheckpoint && progresso.checkpoint_score > 0 && content.correcao && (
            <div className="mt-8">
              <CorrectionModule 
                score={progresso.checkpoint_score}
                conceitos={content.correcao.conceitos}
                onRetry={() => {
                  setCheckpointAnswers({});
                  onUpdateProgress('checkpoint_score', 0);
                }}
              />
            </div>
          )}

          {!hasPassedCheckpoint && (!progresso.checkpoint_score || progresso.checkpoint_score === 0) && (
            <button 
              onClick={submitCheckpoint}
              className="w-full bg-[var(--color-atelier-grafite)] text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-colors mt-6"
            >
              Avaliar Checkpoint
            </button>
          )}
        </div>
      </section>

      {/* 7. DESBLOQUEIO */}
      {isReadyToComplete && !progresso.concluida && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[var(--color-atelier-grafite)] to-[#2a2a2a] p-12 rounded-[2rem] text-center relative overflow-hidden shadow-2xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(173,111,64,0.3)_0%,transparent_70%)]" />
          <div className="relative z-10">
            <span className="inline-block px-4 py-1.5 bg-white/10 text-white rounded-full text-[10px] uppercase font-bold tracking-widest mb-6 border border-white/20">
              Descoberta da Semana
            </span>
            <h2 className="font-elegant text-3xl md:text-4xl text-white mb-8 italic">
              "{content.descoberta}"
            </h2>
            
            <button 
              onClick={handleCompletion}
              disabled={isCompleting}
              className="mx-auto flex items-center justify-center gap-3 bg-[var(--color-atelier-terracota)] text-white px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#8c562e] hover:scale-105 transition-all shadow-xl disabled:opacity-50"
            >
              {isCompleting ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  Confirmar Evolução e Avançar <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </motion.section>
      )}

      {progresso.concluida && (
        <div className="text-center p-8 glass-panel border border-green-500/30 bg-green-50/50">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
              <h3 className="font-bold text-green-800 text-lg mb-1">Sprint {content.id} Concluído!</h3>
          <p className="text-green-700/70 text-sm mb-6">Você dominou a dimensão da {content.dimensao}.</p>
          <button 
            onClick={() => router.push('/mapa')}
            className="text-xs font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] border border-[var(--color-atelier-grafite)]/20 px-6 py-2 rounded-full hover:bg-white"
          >
            Voltar ao Roadmap
          </button>
        </div>
      )}

    </div>
  );
}
