// src/app/curadoria/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { 
  CheckCircle2, XCircle, MessageSquare, 
  Send, Loader2, ArrowLeft, MapPin, ChevronRight, ChevronLeft
} from "lucide-react";

interface SocialPost {
  id: string;
  image_url: string;
  caption: string;
  publish_date: string;
  status: string;
}

interface Pin {
  id: string;
  pos_x: number;
  pos_y: number;
  comment: string;
  resolved: boolean;
}

export default function CuradoriaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Estados do Modo Figma (Pinos)
  const [pins, setPins] = useState<Pin[]>([]);
  const [isPinMode, setIsPinMode] = useState(false);
  const [newPinCoords, setNewPinCoords] = useState<{ x: number, y: number } | null>(null);
  const [newPinText, setNewPinText] = useState("");
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    fetchPendingPosts();
  }, []);

  const fetchPendingPosts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .eq('client_id', session.user.id)
        .in('status', ['pending_approval', 'needs_revision'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPosts(data || []);
      
      if (data && data.length > 0) {
        fetchPins(data[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPins = async (postId: string) => {
    const { data } = await supabase
      .from('content_feedback_pins')
      .select('*')
      .eq('post_id', postId);
    setPins(data || []);
  };

  // Carrega os pinos sempre que o post atual muda
  useEffect(() => {
    if (posts.length > 0 && posts[currentIndex]) {
      fetchPins(posts[currentIndex].id);
      setIsPinMode(false);
      setNewPinCoords(null);
    }
  }, [currentIndex, posts]);

  // ==========================================
  // LÓGICA DE COORDENADAS (ESTILO FIGMA)
  // ==========================================
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPinMode || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Impede que clique fora dos limites da imagem gere um pino
    if (x < 0 || x > 100 || y < 0 || y > 100) return;

    setNewPinCoords({ x, y });
  };

  const handleSavePin = async () => {
    if (!newPinCoords || !newPinText.trim() || !posts[currentIndex]) return;
    setIsProcessing(true);

    try {
      const { data, error } = await supabase
        .from('content_feedback_pins')
        .insert({
          post_id: posts[currentIndex].id,
          pos_x: newPinCoords.x,
          pos_y: newPinCoords.y,
          comment: newPinText.trim()
        })
        .select()
        .single();

      if (error) throw error;

      // Muda o status do post para precisar de revisão
      await supabase
        .from('social_posts')
        .update({ status: 'needs_revision' })
        .eq('id', posts[currentIndex].id);

      setPins([...pins, data]);
      setNewPinCoords(null);
      setNewPinText("");
      setIsPinMode(false);
    } catch (error) {
      console.error("Erro ao salvar comentário:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // AÇÕES BINÁRIAS (TINDER STYLE)
  // ==========================================
  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!posts[currentIndex]) return;
    setIsProcessing(true);

    try {
      await supabase
        .from('social_posts')
        .update({ status })
        .eq('id', posts[currentIndex].id);

      // Avança para o próximo ou remove da lista visualmente
      const newPosts = [...posts];
      newPosts.splice(currentIndex, 1);
      setPosts(newPosts);
      
      // Se apagou o último, volta o índice
      if (currentIndex >= newPosts.length) {
        setCurrentIndex(Math.max(0, newPosts.length - 1));
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center"><Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={32} /></div>;
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] w-full relative z-10">
        <CheckCircle2 size={64} className="text-[var(--color-atelier-terracota)] mb-6 opacity-80" />
        <h2 className="font-elegant text-4xl mb-2 text-[var(--color-atelier-grafite)]">Tudo Aprovado.</h2>
        <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/50 mb-8">Não há conteúdos pendentes na sua mesa de curadoria.</p>
        <button onClick={() => router.push('/cockpit')} className="px-6 py-3 bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] rounded-full font-roboto text-[11px] uppercase tracking-widest font-bold transition-colors flex items-center gap-2 shadow-md">
          <ArrowLeft size={16} /> Voltar ao Cockpit
        </button>
      </div>
    );
  }

  const currentPost = posts[currentIndex];

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-60px)] w-full relative z-10 overflow-hidden rounded-[2.5rem] glass-panel bg-white/40 border border-white shadow-[0_15px_40px_rgba(173,111,64,0.05)]">
      
      {/* HEADER DE NAVEGAÇÃO MOBILE (Visível apenas em ecrãs pequenos) */}
      <div className="md:hidden w-full p-6 flex justify-between items-center border-b border-[var(--color-atelier-grafite)]/5 bg-white/50">
        <button onClick={() => router.push('/cockpit')} className="flex items-center gap-2 text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] transition-colors text-[10px] uppercase tracking-widest font-bold">
          <ArrowLeft size={16} /> Sair
        </button>
        <div className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)]">
          {currentIndex + 1} de {posts.length}
        </div>
      </div>

      {/* ÁREA CENTRAL - O PALCO DA FOTOGRAFIA */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative bg-[var(--color-atelier-creme)]/20">
        
        {/* Header Desktop Embutido na Área Central */}
        <div className="hidden md:flex absolute top-8 left-8 right-8 justify-between items-center z-10">
          <button onClick={() => router.push('/cockpit')} className="flex items-center gap-2 text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors text-[11px] uppercase tracking-widest font-bold bg-white/50 px-4 py-2 rounded-full border border-white shadow-sm">
            <ArrowLeft size={16} /> Sair da Curadoria
          </button>
          <div className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] bg-white/50 px-4 py-2 rounded-full border border-white shadow-sm">
            Revisão {currentIndex + 1} de {posts.length}
          </div>
        </div>
        
        <div className="flex items-center justify-center w-full relative h-full max-h-[80vh]">
          {/* Botão Anterior */}
          {posts.length > 1 && (
            <button onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0} className="absolute left-0 md:left-8 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border border-[var(--color-atelier-grafite)]/10 flex items-center justify-center text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] hover:border-[var(--color-atelier-terracota)] disabled:opacity-30 transition-all z-20 shadow-sm">
              <ChevronLeft size={24} />
            </button>
          )}

          {/* O Card do Post */}
          <div 
            className={`relative max-h-full max-w-[450px] w-full aspect-[4/5] rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(122,116,112,0.15)] transition-all bg-gray-100 border-4 border-white ${isPinMode ? 'cursor-crosshair ring-4 ring-[var(--color-atelier-terracota)]' : ''}`}
            onClick={handleImageClick}
          >
            <img 
              ref={imageRef}
              src={currentPost.image_url} 
              alt="Conteúdo em Avaliação" 
              className="w-full h-full object-cover"
              draggable={false}
            />

            {/* OVERLAY DE MODO PINO */}
            <AnimatePresence>
              {isPinMode && !newPinCoords && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                  <span className="bg-[var(--color-atelier-terracota)] text-white px-5 py-3 rounded-full text-xs font-bold uppercase tracking-widest shadow-xl">
                    Clique na imagem para apontar o ajuste
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PINOS EXISTENTES */}
            {pins.map((pin) => (
              <div key={pin.id} className="absolute w-7 h-7 -ml-3.5 -mt-3.5 bg-white border-[3px] border-[var(--color-atelier-terracota)] rounded-full flex items-center justify-center shadow-lg group z-10 cursor-pointer hover:scale-110 transition-transform" style={{ left: `${pin.pos_x}%`, top: `${pin.pos_y}%` }}>
                <span className="text-[10px] font-black text-[var(--color-atelier-terracota)]">{pins.indexOf(pin) + 1}</span>
                {/* Tooltip Hover */}
                <div className="absolute left-10 top-1/2 -translate-y-1/2 bg-white border border-[var(--color-atelier-grafite)]/10 p-3 rounded-xl w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                  <p className="text-xs text-[var(--color-atelier-grafite)] leading-relaxed font-medium">{pin.comment}</p>
                </div>
              </div>
            ))}

            {/* PINO SENDO CRIADO (INPUT POPOVER) */}
            {newPinCoords && (
              <div className="absolute z-30" style={{ left: `${newPinCoords.x}%`, top: `${newPinCoords.y}%` }}>
                <div className="w-5 h-5 -ml-2.5 -mt-2.5 bg-[var(--color-atelier-terracota)] rounded-full animate-ping absolute opacity-60"></div>
                <div className="w-5 h-5 -ml-2.5 -mt-2.5 bg-white border-[3px] border-[var(--color-atelier-terracota)] rounded-full absolute shadow-md"></div>
                
                <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="absolute top-5 left-5 bg-white border border-[var(--color-atelier-grafite)]/10 p-5 rounded-2xl w-64 shadow-[0_20px_40px_rgba(0,0,0,0.1)]">
                  <textarea 
                    autoFocus
                    placeholder="O que deseja ajustar aqui?"
                    value={newPinText}
                    onChange={(e) => setNewPinText(e.target.value)}
                    className="w-full bg-[var(--color-atelier-creme)]/30 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] text-[var(--color-atelier-grafite)] resize-none h-24 outline-none focus:border-[var(--color-atelier-terracota)]/50 focus:bg-white transition-colors custom-scrollbar mb-3 placeholder:text-[var(--color-atelier-grafite)]/40"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setNewPinCoords(null)} className="px-3 py-2 text-[10px] text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-grafite)] font-bold uppercase tracking-widest transition-colors">Cancelar</button>
                    <button onClick={handleSavePin} disabled={isProcessing || !newPinText.trim()} className="px-5 py-2 bg-[var(--color-atelier-terracota)] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 hover:bg-[#8c562e] transition-colors shadow-sm">
                      {isProcessing ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>} Salvar
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </div>

          {/* Botão Próximo */}
          {posts.length > 1 && (
            <button onClick={() => setCurrentIndex(prev => Math.min(posts.length - 1, prev + 1))} disabled={currentIndex === posts.length - 1} className="absolute right-0 md:right-8 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border border-[var(--color-atelier-grafite)]/10 flex items-center justify-center text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] hover:border-[var(--color-atelier-terracota)] disabled:opacity-30 transition-all z-20 shadow-sm">
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      </div>

      {/* BARRA LATERAL DIREITA - INFORMAÇÃO E AÇÃO */}
      <div className="w-full md:w-[400px] border-t md:border-t-0 md:border-l border-[var(--color-atelier-grafite)]/10 bg-white/80 backdrop-blur-xl flex flex-col shrink-0 z-40 relative">
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
          <div className="mb-8 bg-[var(--color-atelier-creme)]/50 p-5 rounded-2xl border border-[var(--color-atelier-grafite)]/5">
            <span className="text-[var(--color-atelier-terracota)] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-3">
              <MessageSquare size={12} /> Proposta de Copywriting
            </span>
            <p className="text-[13px] text-[var(--color-atelier-grafite)]/80 leading-relaxed whitespace-pre-wrap font-medium">
              {currentPost.caption || "Sem texto de legenda para esta publicação."}
            </p>
          </div>

          {currentPost.publish_date && (
            <div className="mb-8 flex items-center gap-4 bg-white p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-grafite)]/5 flex items-center justify-center text-[var(--color-atelier-grafite)]/50">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <span className="text-[var(--color-atelier-grafite)]/40 text-[9px] font-bold uppercase tracking-widest block mb-0.5">Data Sugerida</span>
                <span className="text-[13px] text-[var(--color-atelier-grafite)] font-bold">{new Date(currentPost.publish_date).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          )}

          {/* LISTAGEM DE AJUSTES SOLICITADOS */}
          {pins.length > 0 && (
            <div className="mt-8 border-t border-[var(--color-atelier-grafite)]/10 pt-6">
              <span className="text-[var(--color-atelier-grafite)]/50 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-4">
                <MapPin size={12} /> Ajustes Solicitados ({pins.length})
              </span>
              <div className="flex flex-col gap-3">
                {pins.map((pin, i) => (
                  <div key={pin.id} className="bg-white p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm flex gap-3 items-start group hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 border border-[var(--color-atelier-terracota)]/20">
                      {i + 1}
                    </div>
                    <p className="text-[12px] text-[var(--color-atelier-grafite)] leading-relaxed font-medium pt-1">{pin.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PAINEL DE DECISÃO (Fricção Zero) */}
        <div className="p-6 md:p-8 border-t border-[var(--color-atelier-grafite)]/10 bg-white flex flex-col gap-3 shrink-0">
          <button 
            onClick={() => handleAction('approved')}
            disabled={isProcessing}
            className="w-full bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 hover:-translate-y-0.5"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} 
            Aprovar e Agendar
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setIsPinMode(!isPinMode)}
              className={`flex-1 py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border shadow-sm
                ${isPinMode 
                  ? 'bg-[var(--color-atelier-terracota)]/10 border-[var(--color-atelier-terracota)]/30 text-[var(--color-atelier-terracota)]' 
                  : 'bg-white border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/60 hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)]'}
              `}
            >
              <MapPin size={14} className={isPinMode ? 'text-[var(--color-atelier-terracota)]' : ''} /> 
              {isPinMode ? 'Cancelar Ajuste' : 'Ajuste Rápido'}
            </button>
            
            <button 
              onClick={() => handleAction('rejected')}
              disabled={isProcessing}
              className="flex-1 bg-red-50/50 border border-red-100 text-red-500 hover:bg-red-500 hover:text-white py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <XCircle size={14} /> Recusar Todo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}