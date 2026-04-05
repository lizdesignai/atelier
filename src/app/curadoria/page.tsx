// src/app/curadoria/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { 
  CheckCircle2, XCircle, MessageSquare, 
  Send, Loader2, ArrowLeft, MapPin, ChevronRight, ChevronLeft,
  Smartphone, Heart, Sparkles, Clock
} from "lucide-react";

interface SocialPost {
  id: string;
  image_url: string;
  caption: string;
  publish_date: string;
  status: string;
  project_id: string;
}

interface Pin {
  id: string;
  pos_x: number;
  pos_y: number;
  comment: string;
  resolved: boolean;
}

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function CuradoriaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientProfile, setClientProfile] = useState<any>(null);
  
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Estados do Modo Figma (Pinos)
  const [pins, setPins] = useState<Pin[]>([]);
  const [isPinMode, setIsPinMode] = useState(false);
  const [newPinCoords, setNewPinCoords] = useState<{ x: number, y: number } | null>(null);
  const [newPinText, setNewPinText] = useState("");
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Animação de Double Tap
  const [showHeart, setShowHeart] = useState(false);

  useEffect(() => {
    fetchPendingPosts();
  }, []);

  const fetchPendingPosts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Buscar perfil para o Mockup do Instagram
      const { data: profile } = await supabase.from('profiles').select('nome, avatar_url').eq('id', session.user.id).single();
      if (profile) setClientProfile(profile);

      // 2. Buscar Projeto Ativo do Cliente (Garante a ancoragem correta dos posts)
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', session.user.id)
        .in('status', ['active', 'delivered'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!project) {
        setPosts([]);
        setIsLoading(false);
        return;
      }

      // 3. Buscar Posts pelo project_id (A Abordagem mais Segura)
      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .eq('project_id', project.id)
        .in('status', ['pending_approval', 'needs_revision'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPosts(data || []);
      
      if (data && data.length > 0) {
        fetchPins(data[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar curadoria:", error);
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

      await supabase.from('social_posts').update({ status: 'needs_revision' }).eq('id', posts[currentIndex].id);

      setPins([...pins, data]);
      setNewPinCoords(null);
      setNewPinText("");
      setIsPinMode(false);
      showToast("Ajuste visual marcado e enviado para a equipa.");
    } catch (error) {
      showToast("Erro ao salvar ajuste.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // AÇÕES BINÁRIAS E DOUBLE TAP (Fricção Zero)
  // ==========================================
  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!posts[currentIndex]) return;
    setIsProcessing(true);

    try {
      await supabase.from('social_posts').update({ status }).eq('id', posts[currentIndex].id);

      const newPosts = [...posts];
      newPosts.splice(currentIndex, 1);
      setPosts(newPosts);
      
      if (currentIndex >= newPosts.length) {
        setCurrentIndex(Math.max(0, newPosts.length - 1));
      }
      showToast(status === 'approved' ? "Conteúdo Aprovado para Agendamento! ✨" : "Arte Recusada.");
    } catch (error) {
      showToast("Erro ao processar ação.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDoubleTap = () => {
    if (isPinMode) return; 
    setShowHeart(true);
    setTimeout(() => {
      setShowHeart(false);
      handleAction('approved');
    }, 800);
  };

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-[var(--color-atelier-creme)]"><Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={32} /></div>;
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full relative z-10 bg-[var(--color-atelier-creme)]">
        <CheckCircle2 size={64} className="text-[var(--color-atelier-terracota)] mb-6 opacity-80" />
        <h2 className="font-elegant text-4xl mb-2 text-[var(--color-atelier-grafite)]">Tudo Aprovado.</h2>
        <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/50 mb-8 max-w-md text-center">Não há conteúdos pendentes na sua Mesa de Curadoria. O estúdio está a operar na sua máxima eficiência.</p>
        <button onClick={() => router.push('/cockpit')} className="px-8 py-4 bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] rounded-2xl font-roboto text-[11px] uppercase tracking-widest font-bold transition-all flex items-center gap-3 shadow-lg hover:-translate-y-1">
          <ArrowLeft size={16} /> Voltar ao Cockpit
        </button>
      </div>
    );
  }

  const currentPost = posts[currentIndex];

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[var(--color-atelier-creme)] text-[var(--color-atelier-grafite)] overflow-hidden font-roboto selection:bg-[var(--color-atelier-terracota)] selection:text-white">
      
      {/* HEADER MOBILE */}
      <div className="md:hidden w-full p-6 flex justify-between items-center bg-white/80 backdrop-blur-md z-50 border-b border-[var(--color-atelier-grafite)]/10">
        <button onClick={() => router.push('/cockpit')} className="flex items-center gap-2 text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] transition-colors text-[10px] uppercase tracking-widest font-bold">
          <ArrowLeft size={16} /> Sair
        </button>
        <div className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)]">
          {currentIndex + 1} de {posts.length}
        </div>
      </div>

      {/* ÁREA CENTRAL - CONTEXTO IMERSIVO (MOCKUP) & STORYLINE */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Background Imersivo (Blur) */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[var(--color-atelier-grafite)]/80 z-10 mix-blend-multiply"></div>
          <div className="absolute inset-0 backdrop-blur-3xl z-20 bg-[var(--color-atelier-creme)]/60"></div>
          {currentPost?.image_url && <img src={currentPost.image_url} className="w-full h-full object-cover scale-110 opacity-40 blur-2xl" alt="bg" />}
        </div>

        {/* Header Desktop Imersivo */}
        <div className="hidden md:flex absolute top-8 left-8 right-8 justify-between items-center z-30">
          <button onClick={() => router.push('/cockpit')} className="flex items-center gap-2 text-[var(--color-atelier-grafite)]/80 hover:text-[var(--color-atelier-terracota)] transition-colors text-[11px] uppercase tracking-widest font-bold bg-white/70 backdrop-blur-md px-5 py-2.5 rounded-full border border-white shadow-sm">
            <ArrowLeft size={16} /> Sair da Curadoria
          </button>
          <div className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] bg-white/70 backdrop-blur-md px-5 py-2.5 rounded-full border border-white shadow-sm flex items-center gap-2">
            <Sparkles size={14} /> Revisão {currentIndex + 1} de {posts.length}
          </div>
        </div>
        
        {/* MOCKUP DO TELEMÓVEL */}
        <div className="flex-1 flex items-center justify-center p-4 relative z-20">
          <div className="relative shadow-[0_30px_60px_rgba(0,0,0,0.15)] rounded-[3rem] border-[8px] border-white bg-white w-full max-w-[380px] aspect-[9/19] flex flex-col overflow-hidden">
            
            {/* Notch e Barra Superior Mockup */}
            <div className="w-full h-14 bg-white flex items-end justify-between px-5 pb-2 shrink-0 z-10 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-white rounded-b-3xl z-20 shadow-sm flex justify-center items-end pb-1">
                 <div className="w-12 h-1.5 rounded-full bg-gray-200"></div>
              </div>
              <span className="text-[10px] font-bold text-black">9:41</span>
              <div className="flex gap-1 items-center opacity-80">
                <div className="w-3 h-3 rounded-full border border-black"></div>
                <div className="w-3 h-3 rounded-full border border-black bg-black"></div>
              </div>
            </div>

            {/* Cabeçalho do Post (Instagram Style) */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white shrink-0 border-b border-gray-50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
                <div className="w-full h-full bg-white rounded-full border-2 border-white overflow-hidden">
                  <img src={clientProfile?.avatar_url || '/images/simbolo-rosa.png'} className="w-full h-full object-cover" />
                </div>
              </div>
              <span className="font-bold text-xs text-black">{clientProfile?.nome || 'sua_marca'}</span>
            </div>

            {/* Área da Imagem (O Palco) */}
            <div 
              className={`relative w-full aspect-[4/5] bg-gray-100 overflow-hidden ${isPinMode ? 'cursor-crosshair' : 'cursor-pointer'}`}
              onClick={handleImageClick}
              onDoubleClick={handleDoubleTap}
            >
              {currentPost?.image_url && (
                <img 
                  ref={imageRef}
                  src={currentPost.image_url} 
                  alt="Conteúdo" 
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              )}

              {/* Animação do Coração (Double Tap) */}
              <AnimatePresence>
                {showHeart && (
                  <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.5, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute inset-0 flex items-center justify-center z-40 drop-shadow-2xl">
                    <Heart size={100} className="text-white fill-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* OVERLAY DE MODO PINO */}
              <AnimatePresence>
                {isPinMode && !newPinCoords && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-20">
                    <span className="bg-[var(--color-atelier-terracota)] text-white px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xl text-center">
                      Toque onde deseja ajustar
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* PINOS EXISTENTES */}
              {pins.map((pin) => (
                <div key={pin.id} className="absolute w-6 h-6 -ml-3 -mt-3 bg-white border-[3px] border-[var(--color-atelier-terracota)] rounded-full flex items-center justify-center shadow-lg group z-30 cursor-pointer" style={{ left: `${pin.pos_x}%`, top: `${pin.pos_y}%` }}>
                  <span className="text-[9px] font-black text-[var(--color-atelier-terracota)]">{pins.indexOf(pin) + 1}</span>
                  {/* Tooltip Hover */}
                  <div className="absolute left-8 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md border border-gray-100 p-3 rounded-xl w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                    <p className="text-[11px] text-[var(--color-atelier-grafite)] leading-relaxed font-medium">{pin.comment}</p>
                  </div>
                </div>
              ))}

              {/* PINO SENDO CRIADO */}
              {newPinCoords && (
                <div className="absolute z-40" style={{ left: `${newPinCoords.x}%`, top: `${newPinCoords.y}%` }}>
                  <div className="w-5 h-5 -ml-2.5 -mt-2.5 bg-[var(--color-atelier-terracota)] rounded-full animate-ping absolute opacity-60"></div>
                  <div className="w-5 h-5 -ml-2.5 -mt-2.5 bg-white border-[3px] border-[var(--color-atelier-terracota)] rounded-full absolute shadow-md"></div>
                  
                  <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="absolute top-5 left-[-100px] md:left-5 bg-white/95 backdrop-blur-xl border border-gray-100 p-4 rounded-2xl w-[260px] shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
                    <textarea 
                      autoFocus
                      placeholder="O que deseja ajustar na imagem/vídeo?"
                      value={newPinText}
                      onChange={(e) => setNewPinText(e.target.value)}
                      className="w-full bg-[var(--color-atelier-creme)]/30 border border-gray-200 rounded-xl p-3 text-[12px] text-[var(--color-atelier-grafite)] resize-none h-20 outline-none focus:border-[var(--color-atelier-terracota)]/50 focus:bg-white transition-colors custom-scrollbar mb-3"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setNewPinCoords(null)} className="px-3 py-2 text-[9px] text-[var(--color-atelier-grafite)]/50 hover:text-red-500 font-bold uppercase tracking-widest transition-colors">Cancelar</button>
                      <button onClick={handleSavePin} disabled={isProcessing || !newPinText.trim()} className="px-5 py-2 bg-[var(--color-atelier-terracota)] text-white rounded-xl text-[9px] font-bold uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 hover:bg-[#8c562e] transition-colors shadow-sm">
                        {isProcessing ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>} Enviar
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>

            {/* Ações Inferiores Mockup */}
            <div className="bg-white flex flex-col px-4 pt-3 pb-6 flex-1 border-t border-gray-50 overflow-y-auto custom-scrollbar">
               <div className="flex items-center gap-4 mb-2 shrink-0">
                 <Heart size={22} className="text-black" />
                 <MessageSquare size={22} className="text-black" />
                 <Send size={22} className="text-black" />
               </div>
               <p className="text-[12px] text-black leading-relaxed whitespace-pre-wrap pb-2">
                 <span className="font-bold mr-1">{clientProfile?.nome || 'sua_marca'}</span>
                 {currentPost?.caption || "Sem texto associado."}
               </p>
            </div>

          </div>
        </div>

        {/* STORYLINE INFINITO (Timeline Cinematográfica) */}
        {posts.length > 1 && (
          <div className="h-32 w-full bg-white/40 backdrop-blur-xl border-t border-[var(--color-atelier-grafite)]/10 z-30 shrink-0 flex items-center px-6 overflow-x-auto custom-scrollbar gap-4">
            <div className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 shrink-0 mr-4 w-24 text-right">
              Timeline de Edição
            </div>
            {posts.map((post, idx) => (
              <button 
                key={post.id} 
                onClick={() => setCurrentIndex(idx)}
                className={`h-20 w-16 shrink-0 rounded-xl overflow-hidden transition-all duration-300 relative
                  ${currentIndex === idx ? 'border-2 border-[var(--color-atelier-terracota)] scale-110 shadow-lg' : 'border border-transparent opacity-60 hover:opacity-100'}
                `}
              >
                <img src={post.image_url} className="w-full h-full object-cover" alt="Thumb" />
                {post.status === 'needs_revision' && <div className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></div>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* BARRA LATERAL DIREITA - THE INSPECTOR */}
      <div className="w-full md:w-[420px] bg-white border-l border-[var(--color-atelier-grafite)]/10 flex flex-col shrink-0 shadow-[-20px_0_50px_rgba(0,0,0,0.05)] z-40 relative">
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Curadoria</h2>
            <span className="bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest">
              Double Tap = Aprovar
            </span>
          </div>

          <div className="mb-8 bg-[var(--color-atelier-creme)]/30 p-6 rounded-3xl border border-[var(--color-atelier-grafite)]/5">
            <span className="text-[var(--color-atelier-grafite)]/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-3">
              <MessageSquare size={14} /> Legenda / Copywriting
            </span>
            <p className="text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed whitespace-pre-wrap font-medium max-h-48 overflow-y-auto custom-scrollbar pr-2">
              {currentPost?.caption || "Sem texto de legenda para esta publicação."}
            </p>
          </div>

          {currentPost?.publish_date && (
            <div className="mb-8 flex items-center gap-4 bg-white p-5 rounded-3xl border border-[var(--color-atelier-grafite)]/5 shadow-[0_5px_15px_rgba(0,0,0,0.02)]">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-atelier-grafite)]/5 flex items-center justify-center text-[var(--color-atelier-grafite)]/50">
                <Clock size={20} />
              </div>
              <div>
                <span className="text-[var(--color-atelier-grafite)]/40 text-[10px] font-bold uppercase tracking-widest block mb-0.5">Data Sugerida</span>
                <span className="text-[14px] text-[var(--color-atelier-grafite)] font-bold">{new Date(currentPost.publish_date).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
            </div>
          )}

          {/* LISTAGEM DE AJUSTES SOLICITADOS */}
          {pins.length > 0 && (
            <div className="mt-8 border-t border-[var(--color-atelier-grafite)]/10 pt-8">
              <span className="text-[var(--color-atelier-grafite)]/50 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-4">
                <MapPin size={14} /> Ajustes Técnicos ({pins.length})
              </span>
              <div className="flex flex-col gap-3">
                {pins.map((pin, i) => (
                  <div key={pin.id} className="bg-white p-5 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm flex gap-4 items-start group hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center text-[11px] font-black shrink-0 border border-[var(--color-atelier-terracota)]/20">
                      {i + 1}
                    </div>
                    <p className="text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed font-medium pt-1.5">{pin.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PAINEL DE DECISÃO (Fricção Zero) */}
        <div className="p-8 border-t border-[var(--color-atelier-grafite)]/10 bg-white flex flex-col gap-4 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
          <button 
            onClick={() => handleAction('approved')}
            disabled={isProcessing}
            className="w-full bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white py-5 rounded-2xl text-[12px] font-bold uppercase tracking-widest transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} 
            Aprovar Arte & Legenda
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setIsPinMode(!isPinMode)}
              className={`flex-1 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border shadow-sm
                ${isPinMode 
                  ? 'bg-[var(--color-atelier-terracota)]/10 border-[var(--color-atelier-terracota)]/30 text-[var(--color-atelier-terracota)] ring-2 ring-[var(--color-atelier-terracota)]/20' 
                  : 'bg-white border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)]'}
              `}
            >
              <MapPin size={16} className={isPinMode ? 'text-[var(--color-atelier-terracota)]' : ''} /> 
              {isPinMode ? 'Cancelar Apontamento' : 'Apontar Ajuste Visual'}
            </button>
            
            <button 
              onClick={() => handleAction('rejected')}
              disabled={isProcessing}
              className="flex-1 bg-red-50/50 border border-red-100 text-red-500 hover:bg-red-500 hover:text-white py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <XCircle size={16} /> Recusar Totalmente
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}