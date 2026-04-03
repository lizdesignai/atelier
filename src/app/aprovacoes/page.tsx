// src/app/aprovacoes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { 
  CheckCircle2, XCircle, Image as ImageIcon, Loader2, Send
} from "lucide-react";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function AprovacoesPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchPendingApprovals = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Traz apenas os posts que estão à espera de aprovação
        const { data, error } = await supabase
          .from('social_posts')
          .select('*')
          .eq('client_id', session.user.id)
          .eq('status', 'pending_approval')
          .order('scheduled_date', { ascending: true });

        if (error) throw error;
        if (data) setApprovals(data);

      } catch (error) {
        console.error("Erro ao buscar aprovações:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingApprovals();
  }, []);

  const handleFeedbackChange = (id: string, text: string) => {
    setFeedbackText(prev => ({ ...prev, [id]: text }));
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setIsProcessing(id);
    try {
      const newStatus = action === 'approve' ? 'approved' : 'changes_requested';
      const feedback = action === 'reject' ? feedbackText[id] || "Alteração solicitada sem detalhes." : null;

      if (action === 'reject' && (!feedbackText[id] || feedbackText[id].trim() === "")) {
         showToast("Por favor, descreva a alteração necessária.");
         setIsProcessing(null);
         return;
      }

      // Atualiza o banco de dados
      const { error } = await supabase
        .from('social_posts')
        .update({ 
          status: newStatus, 
          client_feedback: feedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      showToast(action === 'approve' ? "Arte aprovada com sucesso! ✨" : "Pedido de alteração enviado.");
      
      // Remove o card da tela
      setApprovals(prev => prev.filter(post => post.id !== id));

    } catch (error) {
      console.error("Erro ao atualizar post:", error);
      showToast("Ocorreu um erro. Tente novamente.");
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center"><Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={32} /></div>;
  }

  return (
    <div className="flex flex-col max-w-[1000px] mx-auto w-full gap-8">
      
      <header className="animate-[fadeInUp_0.5s_ease-out] text-center mb-4">
        <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-tight mb-2">
          Central de <span className="text-[var(--color-atelier-terracota)] italic">Aprovações.</span>
        </h1>
        <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 max-w-lg mx-auto">
          Revise as peças criativas desenvolvidas pelo estúdio. O seu feedback dita o compasso da publicação.
        </p>
      </header>

      <div className="flex flex-col gap-8 animate-[fadeInUp_0.6s_ease-out]">
        <AnimatePresence>
          {approvals.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Tudo em Dia!</h2>
              <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/50 mt-2">Não tem publicações pendentes de aprovação neste momento.</p>
            </motion.div>
          ) : (
            approvals.map((post) => (
              <motion.div 
                key={post.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -50, filter: "blur(10px)" }}
                className="glass-panel p-6 md:p-8 flex flex-col md:flex-row gap-8 shadow-[0_15px_40px_rgba(173,111,64,0.05)]"
              >
                {/* Visual da Arte */}
                <div className="w-full md:w-[40%] aspect-square md:aspect-[4/5] bg-white/40 rounded-3xl overflow-hidden border border-[var(--color-atelier-grafite)]/10 relative flex shrink-0 group">
                  {post.image_url ? (
                    <img src={post.image_url} alt="Arte do Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full text-[var(--color-atelier-grafite)]/20 bg-white/50 backdrop-blur-sm">
                      <ImageIcon size={48} className="mb-3" />
                      <span className="micro-title">Layout em Validação</span>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-xl text-[var(--color-atelier-terracota)] px-3 py-1.5 rounded-lg font-roboto text-[10px] font-bold uppercase tracking-widest shadow-sm">
                    {post.scheduled_date ? new Date(post.scheduled_date).toLocaleDateString('pt-PT') : 'A Definir'}
                  </div>
                </div>

                {/* Detalhes e Ações */}
                <div className="flex-1 flex flex-col h-full py-2">
                  <span className="micro-title mb-1">{post.post_type}</span>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-4">{post.title}</h3>
                  
                  <div className="bg-white/60 p-6 rounded-2xl border border-white flex-1 mb-6 shadow-sm">
                    <span className="font-roboto text-[10px] uppercase font-bold text-[var(--color-atelier-terracota)] tracking-widest mb-3 block">Legenda Proposta</span>
                    <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/80 whitespace-pre-wrap leading-relaxed">
                      {post.caption || "Sem legenda cadastrada."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 mt-auto">
                    <textarea 
                      placeholder="Quer pedir uma alteração? Escreva aqui antes de reprovar..."
                      value={feedbackText[post.id] || ""}
                      onChange={(e) => handleFeedbackChange(post.id, e.target.value)}
                      className="w-full bg-white/50 border border-white focus:border-red-200 rounded-xl p-4 text-[12px] outline-none shadow-sm resize-none h-20 placeholder:text-[var(--color-atelier-grafite)]/40 transition-colors"
                    />
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={() => handleAction(post.id, 'approve')}
                        disabled={isProcessing !== null}
                        className="flex-1 bg-green-600 text-white py-3.5 rounded-xl font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-green-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isProcessing === post.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Aprovar Design
                      </button>
                      <button 
                        onClick={() => handleAction(post.id, 'reject')}
                        disabled={isProcessing !== null}
                        className="flex-1 bg-white border border-red-100 text-red-500 py-3.5 rounded-xl font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-red-50 hover:border-red-200 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isProcessing === post.id ? <Loader2 size={16} className="animate-spin text-red-500" /> : <XCircle size={16} />}
                        Pedir Alteração
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}