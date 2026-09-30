import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Video, PlaySquare, Image as ImageIcon, Sparkles, Loader2, Compass } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AtelierPMEngine } from '../lib/AtelierPMEngine';

interface StudioConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  onCycleStarted?: () => void;
  onScheduleCaptacao?: () => void;
  onScheduleReuniao?: () => void;
}

export default function StudioConfigModal({ isOpen, onClose, project, onCycleStarted, onScheduleCaptacao, onScheduleReuniao }: StudioConfigModalProps) {
  const [postsQty, setPostsQty] = useState(0);
  const [reelsQty, setReelsQty] = useState(0);
  const [cofreDate, setCofreDate] = useState('');
  const [idvFase, setIdvFase] = useState('onboarding');
  const [idvProduct, setIdvProduct] = useState('IDV-CORE');
  const [idvComplexity, setIdvComplexity] = useState('C2');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingIDV, setIsGeneratingIDV] = useState(false);

  const isIdv = project?.service_type === 'idv' || project?.service_type === 'Identidade Visual' || project?.type?.includes('Identidade Visual') || project?.name?.toLowerCase().includes('idv') || project?.profiles?.nome?.toLowerCase().includes('idv');

  useEffect(() => {
    if (project && isOpen) {
      setPostsQty(project.posts_quantity || 0);
      setReelsQty(project.videos_quantity || 0);
      setCofreDate('');
      setIdvFase(project.fase || 'onboarding');
      setIdvProduct(project.idv_product || 'IDV-CORE');
      setIdvComplexity(project.idv_complexity || 'C2');
    }
  }, [project, isOpen]);

  const handleStartNewMonth = async () => {
    if (!project) return;
    setIsSubmitting(true);
    try {
      await supabase.from('projects').update({
        posts_quantity: postsQty,
        videos_quantity: reelsQty,
      }).eq('id', project.id);

      await AtelierPMEngine.startNewMonth(project.id, postsQty, reelsQty, cofreDate);
      window.dispatchEvent(new CustomEvent('showToast', { detail: '✨ Novo mês iniciado com sucesso!' }));
      
      if (onCycleStarted) onCycleStarted();
      onClose();
    } catch (error) {
      console.error(error);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao iniciar o novo mês.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateIDV = async () => {
    if (!project) return;
    setIsSubmitting(true);
    try {
      await supabase.from('projects').update({
        fase: idvFase,
        idv_product: idvProduct,
        idv_complexity: idvComplexity
      }).eq('id', project.id);
      window.dispatchEvent(new CustomEvent('showToast', { detail: '✨ Fase do projeto atualizada com sucesso!' }));
      if (onCycleStarted) onCycleStarted();
      onClose();
    } catch (error) {
      console.error(error);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao atualizar fase.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateIDVTasks = async () => {
    if (!project) return;
    setIsGeneratingIDV(true);
    window.dispatchEvent(new CustomEvent('showToast', { detail: 'AIDV: Gerando Trilha da Marca...' }));
    try {
      const res = await fetch(`/api/projects/${project.id}/generate-idv-tasks`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Trilha da Marca gerada com sucesso!' }));
      if (onCycleStarted) onCycleStarted();
      onClose();
    } catch (error: any) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: error.message || "Erro ao gerar tarefas da trilha." }));
    } finally {
      setIsGeneratingIDV(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-[var(--color-luxury-void)]/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className={`px-6 py-5 text-white flex justify-between items-center ${isIdv ? 'bg-gradient-to-r from-[var(--color-atelier-grafite)] to-gray-600' : 'bg-gradient-to-r from-[var(--color-atelier-terracota)] to-[var(--color-atelier-rose)]'}`}>
             <div>
               <h3 className="font-elegant text-2xl drop-shadow-sm">Configuração {isIdv ? 'do Projeto' : 'Mensal'}</h3>
               <p className="text-[10px] uppercase font-bold tracking-widest opacity-80 mt-1">{project.name || project.profiles?.nome || 'Cliente Studio Veronna'} - {isIdv ? 'IDV' : 'IG'}</p>
             </div>
             <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors">
               <X size={16} />
             </button>
          </div>

          <div className="p-6 flex flex-col gap-6">
            {/* Ações Rápidas */}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-3 block">Ações Rápidas</span>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={onScheduleReuniao} className="flex items-center justify-center gap-2 py-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-[var(--color-atelier-terracota)]/10 hover:border-[var(--color-atelier-terracota)]/30 hover:text-[var(--color-atelier-terracota)] transition-all font-bold text-xs text-gray-600">
                    <Calendar size={16} />
                    Agendar Reunião
                 </button>
                 {!isIdv && (
                 <button onClick={onScheduleCaptacao} className="flex items-center justify-center gap-2 py-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-[var(--color-atelier-terracota)]/10 hover:border-[var(--color-atelier-terracota)]/30 hover:text-[var(--color-atelier-terracota)] transition-all font-bold text-xs text-gray-600">
                    <Video size={16} />
                    Nova Captação
                 </button>
                 )}
                 {isIdv && (
                 <button onClick={handleGenerateIDVTasks} disabled={isGeneratingIDV} className="flex items-center justify-center gap-2 py-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-[var(--color-atelier-terracota)]/10 hover:border-[var(--color-atelier-terracota)]/30 hover:text-[var(--color-atelier-terracota)] transition-all font-bold text-xs text-gray-600 disabled:opacity-50">
                    {isGeneratingIDV ? <Loader2 size={16} className="animate-spin" /> : <Compass size={16} />}
                    Gerar Trilha (AIDV)
                 </button>
                 )}
              </div>
            </div>

            {/* Demanda Mensal ou Fase */}
            {isIdv ? (
              
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block">IDV FLOW Config</span>
                
                <div className="flex items-center justify-between">
                   <label className="text-xs font-bold text-gray-600">Produto</label>
                   <select value={idvProduct} onChange={e => setIdvProduct(e.target.value)} className="w-1/2 bg-white px-3 py-2 rounded-xl text-xs font-bold text-[var(--color-atelier-terracota)] outline-none border border-gray-200">
                      <option value="IDV-ESS">IDV-ESS (8 dias)</option>
                      <option value="IDV-CORE">IDV-CORE (13 dias)</option>
                      <option value="IDV-SYSTEM">IDV-SYSTEM (18 dias)</option>
                      <option value="REBRAND">REBRAND (20 dias)</option>
                   </select>
                </div>
                
                <div className="flex items-center justify-between">
                   <label className="text-xs font-bold text-gray-600">Complexidade</label>
                   <select value={idvComplexity} onChange={e => setIdvComplexity(e.target.value)} className="w-1/2 bg-white px-3 py-2 rounded-xl text-xs font-bold text-[var(--color-atelier-terracota)] outline-none border border-gray-200">
                      <option value="C1">C1 (Menos complexo)</option>
                      <option value="C2">C2 (Padrão)</option>
                      <option value="C3">C3 (Mais complexo)</option>
                   </select>
                </div>
                
                <div className="flex items-center justify-between">
                   <label className="text-xs font-bold text-gray-600">Fase Atual</label>
                   <select value={idvFase} onChange={e => setIdvFase(e.target.value)} className="w-1/2 bg-white px-3 py-2 rounded-xl text-[10px] font-bold text-[var(--color-atelier-terracota)] outline-none border border-gray-200">
                      <option value="onboarding">0. ONBOARDING (Ready)</option>
                      <option value="pesquisa">1. DISCOVER</option>
                      <option value="direcionamento">2. DEFINE</option>
                      <option value="processo">3. DEVELOP</option>
                      <option value="qa">4. QA</option>
                      <option value="apresentacao">5. PRESENT</option>
                      <option value="client_review">🔒 GATE 2 (48h)</option>
                      <option value="refinamento">6. REFINE</option>
                      <option value="entrega">7. DELIVER</option>
                      <option value="ativacao">8. ACTIVATE</option>
                   </select>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-4 block">Demanda do Mês</span>
                  
                  <div className="flex flex-col gap-4">
                     <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                           <ImageIcon size={14} className="text-[var(--color-atelier-terracota)]" /> Quantidade de Posts
                        </label>
                        <input 
                          type="number" 
                          min="0"
                          value={postsQty}
                          onChange={e => setPostsQty(Number(e.target.value))}
                          className="w-20 text-center bg-white border border-gray-200 rounded-lg py-1.5 text-sm font-bold focus:border-[var(--color-atelier-terracota)] outline-none"
                        />
                     </div>
                     <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
                           <PlaySquare size={14} className="text-[var(--color-atelier-terracota)]" /> Quantidade de Reels
                        </label>
                        <input 
                          type="number" 
                          min="0"
                          value={reelsQty}
                          onChange={e => setReelsQty(Number(e.target.value))}
                          className="w-20 text-center bg-white border border-gray-200 rounded-lg py-1.5 text-sm font-bold focus:border-[var(--color-atelier-terracota)] outline-none"
                        />
                     </div>
                  </div>
                </div>

                {/* Data Cofre */}
                <div>
                   <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 block">Data de Liberação (Cofre)</label>
                   <input 
                     type="date" 
                     value={cofreDate}
                     onChange={e => setCofreDate(e.target.value)}
                     className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold text-gray-700 outline-none focus:border-[var(--color-atelier-terracota)] transition-colors"
                   />
                </div>
              </>
            )}
          </div>

          <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 flex justify-end">
             {isIdv ? (
               <button 
                 onClick={handleUpdateIDV}
                 disabled={isSubmitting}
                 className="flex items-center gap-2 px-6 py-3 bg-[var(--color-atelier-grafite)] text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg hover:shadow-xl hover:bg-black transition-all disabled:opacity-50"
               >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Salvar Projeto
               </button>
             ) : (
               <button 
                 onClick={handleStartNewMonth}
                 disabled={isSubmitting}
                 className="flex items-center gap-2 px-6 py-3 bg-[var(--color-atelier-terracota)] text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg hover:shadow-xl hover:bg-[#965f36] transition-all disabled:opacity-50"
               >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Iniciar Novo Mês
               </button>
             )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
