"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Grid, CheckCircle2, AlertCircle, Info, CalendarClock, MessageSquare, Loader2, Sparkles, X, ChevronRight 
} from "lucide-react";
import { supabase } from "../../lib/supabase";

// Mock data temporário (Será substituído pelos dados do Supabase)
const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=400&h=400",
  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=400&h=400",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=400&h=400",
  "https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&q=80&w=400&h=400",
  "https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&q=80&w=400&h=400",
  "https://images.unsplash.com/photo-1618220179428-22790b46a0eb?auto=format&fit=crop&q=80&w=400&h=400",
  "https://images.unsplash.com/photo-1616486701797-0f33f61038ec?auto=format&fit=crop&q=80&w=400&h=400",
  "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=400&h=400",
  "https://images.unsplash.com/photo-1600607686027-6c8c634c4491?auto=format&fit=crop&q=80&w=400&h=400"
];

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function SimuladorFeedPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [clientProfile, setClientProfile] = useState<any>(null);
  
  // Estados de Interação
  const [status, setStatus] = useState<'pending' | 'approved' | 'revision'>('pending');
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Busca do perfil para customizar o Header
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('nome, avatar_url').eq('id', session.user.id).single();
        if (profile) setClientProfile(profile);
      }
      // Simulando carregamento das imagens e banco de dados
      setTimeout(() => setIsLoading(false), 800);
    };
    fetchUser();
  }, []);

  const handleApprove = async () => {
    setIsSubmitting(true);
    // TODO: Supabase Update Call
    setTimeout(() => {
      setStatus('approved');
      setIsSubmitting(false);
      showToast("Feed aprovado com sucesso! A equipe será notificada.");
    }, 1000);
  };

  const handleRequestRevision = async () => {
    if (!revisionFeedback.trim()) return;
    setIsSubmitting(true);
    // TODO: Supabase Update Call
    setTimeout(() => {
      setStatus('revision');
      setIsRevisionModalOpen(false);
      setIsSubmitting(false);
      showToast("Revisão solicitada! A equipe irá ajustar conforme o feedback.");
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-60px)] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-auto min-h-[calc(100dvh-60px)] md:h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 pb-6 gap-6 px-4 md:px-0">
      
      {/* 1. CABEÇALHO */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)] w-8 h-8 rounded-xl flex items-center justify-center border border-[var(--color-atelier-grafite)]/10 shadow-sm">
              <Grid size={14} className="text-[var(--color-atelier-terracota)]" />
            </span>
            <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60">Planejamento Visual</span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Simulador de <span className="text-[var(--color-atelier-terracota)] italic">Feed.</span>
          </h1>
        </div>
      </header>

      {/* 2. ESTRUTURA PRINCIPAL (Split Screen) */}
      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* LADO ESQUERDO: INFORMAÇÕES E AÇÕES */}
        <div className="w-full md:w-[380px] flex flex-col gap-6 shrink-0 h-auto md:h-full">
          
          <div className="glass-panel rounded-[2.5rem] bg-white/60 border border-white shadow-sm flex flex-col overflow-hidden h-auto md:h-full">
            <div className="p-8 border-b border-[var(--color-atelier-grafite)]/5 bg-gradient-to-br from-white/80 to-transparent shrink-0">
              <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-1">Mês de Referência</h2>
              <div className="flex items-center gap-2 text-[var(--color-atelier-terracota)]">
                <CalendarClock size={16} />
                <span className="font-roboto font-bold text-sm uppercase tracking-wider">Julho 2026</span>
              </div>
            </div>
            
            <div className="p-8 flex flex-col gap-6 flex-1 overflow-visible md:overflow-y-auto custom-scrollbar">
              
              {/* STATUS DO FEED */}
              <div className="flex flex-col gap-2">
                <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-gray-400">Status da Aprovação</span>
                
                {status === 'pending' && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 px-4 py-3 rounded-2xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                    <span className="font-roboto text-xs font-bold uppercase tracking-wider">Aguardando Aprovação</span>
                  </div>
                )}

                {status === 'approved' && (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-700 px-4 py-3 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-green-500" />
                    <span className="font-roboto text-xs font-bold uppercase tracking-wider">Feed Aprovado!</span>
                  </div>
                )}

                {status === 'revision' && (
                  <div className="bg-red-500/5 border border-red-500/20 text-red-700 px-4 py-3 rounded-2xl flex items-start gap-3">
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <span className="font-roboto text-xs font-bold uppercase tracking-wider">Revisão Solicitada</span>
                      <span className="text-[11px] opacity-80 italic line-clamp-3">"A equipe está trabalhando nos ajustes solicitados. Avisaremos quando a nova versão estiver disponível."</span>
                    </div>
                  </div>
                )}
              </div>

              {/* BOTÕES DE AÇÃO */}
              {status === 'pending' && (
                <div className="flex flex-col gap-3 pt-2">
                  <button 
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className="w-full relative overflow-hidden bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-grafite)]/90 py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all font-roboto text-xs uppercase tracking-[0.2em] font-bold group shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Sparkles size={16} className="group-hover:scale-125 transition-transform" /> Aprovar Planejamento</>}
                  </button>
                  
                  <button 
                    onClick={() => setIsRevisionModalOpen(true)}
                    disabled={isSubmitting}
                    className="w-full bg-transparent border border-[var(--color-atelier-grafite)]/20 text-[var(--color-atelier-grafite)] hover:bg-white hover:border-[var(--color-atelier-grafite)]/40 py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all font-roboto text-[11px] uppercase tracking-widest font-bold"
                  >
                    Solicitar Revisão
                  </button>
                </div>
              )}

              {/* BOX INFORMATIVA */}
              <div className="bg-[var(--color-atelier-terracota)]/5 border border-[var(--color-atelier-terracota)]/20 p-5 rounded-2xl flex items-start gap-3 mt-auto">
                <Info size={16} className="text-[var(--color-atelier-terracota)] shrink-0 mt-0.5" />
                <p className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] leading-relaxed">
                  Esta é uma simulação de como as postagens ficarão organizadas no seu perfil do Instagram.
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* LADO DIREITO: SIMULADOR DE CELULAR / INSTAGRAM GRID */}
        <div className="flex-1 glass-panel rounded-[2.5rem] bg-white/40 border border-white/60 shadow-sm flex items-center justify-center overflow-hidden relative min-h-[500px] md:min-h-0 h-[600px] md:h-full">
          
          {/* Fundo Decorativo */}
          <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
          
          <div className="relative z-10 w-full h-full p-4 md:p-8 flex items-center justify-center overflow-y-auto custom-scrollbar">
            
            {/* CONTAINER MOCKUP CELULAR */}
            <div className="w-full max-w-[400px] bg-white rounded-[2.5rem] shadow-2xl border-[8px] border-white overflow-hidden flex flex-col shrink-0">
              
              {/* Fake Header Instagram */}
              <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                    {clientProfile?.avatar_url ? (
                      <img src={clientProfile.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-elegant font-bold text-[var(--color-atelier-grafite)] bg-[var(--color-atelier-terracota)]/10 text-lg">
                        {clientProfile?.nome?.charAt(0) || "C"}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-roboto text-sm font-bold text-gray-900 leading-none">
                      {clientProfile?.nome || "seu_instagram"}
                    </span>
                    <span className="font-roboto text-[10px] text-gray-500">Visualização de Feed</span>
                  </div>
                </div>
              </div>

              {/* Grid do Feed 3x3 */}
              <div className="grid grid-cols-3 gap-[2px] bg-white p-[2px] flex-1">
                {MOCK_IMAGES.map((url, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="aspect-square relative group overflow-hidden bg-gray-100 cursor-pointer"
                  >
                    <img 
                      src={url} 
                      alt={`Post ${i+1}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                       <span className="opacity-0 group-hover:opacity-100 text-white font-roboto text-[10px] font-bold uppercase tracking-widest transition-opacity">Ver</span>
                    </div>
                  </motion.div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE REVISÃO */}
      <AnimatePresence>
        {isRevisionModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setIsRevisionModalOpen(false)}
            >
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-8 relative"
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => setIsRevisionModalOpen(false)}
                  className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X size={16} />
                </button>

                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-1">Solicitar Revisão</h3>
                <p className="font-roboto text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-6">O que precisa ser ajustado?</p>

                <textarea 
                  value={revisionFeedback}
                  onChange={e => setRevisionFeedback(e.target.value)}
                  placeholder="Ex: Gostaria que a imagem do post 3 fosse mais clara..."
                  className="w-full h-32 rounded-[1.2rem] bg-gray-50 border border-gray-200 p-4 font-roboto text-sm resize-none focus:outline-none focus:border-[var(--color-atelier-terracota)] transition-colors mb-6"
                />

                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsRevisionModalOpen(false)}
                    className="flex-1 py-3.5 rounded-2xl font-roboto text-[11px] uppercase tracking-widest font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleRequestRevision}
                    disabled={isSubmitting || !revisionFeedback.trim()}
                    className="flex-1 py-3.5 rounded-2xl bg-[var(--color-atelier-terracota)] text-white hover:bg-[var(--color-atelier-terracota)]/90 font-roboto text-[11px] uppercase tracking-[0.1em] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : "Enviar Revisão"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
