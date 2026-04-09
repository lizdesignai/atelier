// src/app/curadoria/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { NotificationEngine } from "../../lib/NotificationEngine"; // 🔔 INJEÇÃO DO MOTOR DE NOTIFICAÇÕES
import { 
  CheckCircle2, XCircle, MessageSquare, 
  Send, Loader2, ArrowLeft, MapPin, 
  Heart, Sparkles, Clock, ImageIcon, MousePointerClick
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

      // 1. Buscar perfil para o Mockup
      const { data: profile } = await supabase.from('profiles').select('nome, avatar_url').eq('id', session.user.id).single();
      if (profile) setClientProfile(profile);

      // 2. Buscar Projeto Ativo do Cliente
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

      // 3. Buscar Posts Pendentes
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
    const { data } = await supabase.from('content_feedback_pins').select('*').eq('post_id', postId);
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
      const currentPostId = posts[currentIndex].id;

      const { data, error } = await supabase
        .from('content_feedback_pins')
        .insert({
          post_id: currentPostId,
          pos_x: newPinCoords.x,
          pos_y: newPinCoords.y,
          comment: newPinText.trim()
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('social_posts').update({ status: 'needs_revision' }).eq('id', currentPostId);

      // 🔔 NOTIFICAÇÃO: Avisa a gestão de que o cliente marcou um ajuste na imagem (Modo Figma)
      await NotificationEngine.notifyManagement(
        "📍 Revisão Visual Solicitada",
        `O cliente ${clientProfile?.nome?.split(' ')[0]} inseriu um novo apontamento visual na peça criativa (Fluxo de Impacto).`,
        "warning",
        "/admin/curadoria" // Rota hipotética do admin para ver os pins
      );

      setPins([...pins, data]);
      setNewPinCoords(null);
      setNewPinText("");
      setIsPinMode(false);
      showToast("Ajuste visual marcado com sucesso.");
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

      // 🔔 NOTIFICAÇÃO: Avisa a gestão da aprovação ou rejeição
      if (status === 'approved') {
        await NotificationEngine.notifyManagement(
          "✅ Arte Aprovada!",
          `O cliente ${clientProfile?.nome?.split(' ')[0]} aprovou a peça criativa no Fluxo de Impacto. Pronto a agendar.`,
          "success",
          "/admin/curadoria" 
        );
      } else {
        await NotificationEngine.notifyManagement(
          "❌ Arte Recusada",
          `O cliente ${clientProfile?.nome?.split(' ')[0]} devolveu a peça criativa para revisão.`,
          "warning", // Correção: Trocado de "error" para "warning" para respeitar a tipagem do NotificationEngine
          "/admin/curadoria"
        );
      }

      const newPosts = [...posts];
      newPosts.splice(currentIndex, 1);
      setPosts(newPosts);
      
      if (currentIndex >= newPosts.length) {
        setCurrentIndex(Math.max(0, newPosts.length - 1));
      }
      showToast(status === 'approved' ? "Aprovado para Publicação! ✨" : "Devolvido para a nossa Mesa Criativa.");
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

  // ==========================================
  // RENDERIZAÇÃO DE ESTADOS (CARREGAMENTO & VAZIO)
  // ==========================================
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--color-atelier-creme)] relative overflow-hidden">
        <div className="absolute w-64 h-64 bg-[var(--color-atelier-terracota)]/20 rounded-full blur-[100px] animate-pulse"></div>
        <Loader2 className="animate-spin text-[var(--color-atelier-terracota)] relative z-10" size={40} />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full relative z-10 bg-[var(--color-atelier-creme)] overflow-hidden px-4">
        <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-[120px] pointer-events-none"></motion.div>
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 5, repeat: Infinity }} className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-atelier-rose)]/20 rounded-full blur-[120px] pointer-events-none"></motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel bg-white/60 p-10 md:p-16 rounded-[3.5rem] border border-white shadow-[0_30px_60px_rgba(122,116,112,0.1)] flex flex-col items-center text-center max-w-lg relative z-10">
          <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-6 shadow-inner border border-green-100">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h2 className="font-elegant text-5xl mb-4 text-[var(--color-atelier-grafite)]">Mesa Limpa.</h2>
          <p className="font-roboto text-[14px] font-medium text-[var(--color-atelier-grafite)]/60 mb-10 leading-relaxed">
            Não há artes a aguardar a sua aprovação no momento. A nossa equipa criativa está a operar nos bastidores para garantir a excelência do seu próximo conteúdo.
          </p>
          <button onClick={() => router.push('/cockpit')} className="w-full py-5 bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] rounded-[1.5rem] font-roboto text-[11px] uppercase tracking-[0.1em] font-bold transition-all shadow-xl flex items-center justify-center gap-3 hover:-translate-y-1">
            <ArrowLeft size={16} /> Voltar ao Painel Central
          </button>
        </motion.div>
      </div>
    );
  }

  const currentPost = posts[currentIndex];

  // ==========================================
  // RENDERIZAÇÃO DA TELA DE CURADORIA
  // ==========================================
  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-[#0a0a0a] text-white overflow-hidden font-roboto selection:bg-[var(--color-atelier-terracota)] selection:text-white">
      
      {/* HEADER MOBILE */}
      <div className="lg:hidden w-full p-6 flex justify-between items-center bg-black/60 backdrop-blur-xl z-50 border-b border-white/5 absolute top-0 left-0">
        <button onClick={() => router.push('/cockpit')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-[10px] uppercase tracking-widest font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10">
          <ArrowLeft size={14} /> Sair
        </button>
        <div className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/10 px-4 py-2 rounded-full border border-[var(--color-atelier-terracota)]/20 shadow-sm">
          {currentIndex + 1} / {posts.length}
        </div>
      </div>

      {/* ÁREA CENTRAL - O PALCO IMERSIVO */}
      <div className="flex-1 flex flex-col relative overflow-hidden h-full">
        
        {/* Ambilight Background */}
        <div className="absolute inset-0 z-0 overflow-hidden flex items-center justify-center">
          {currentPost?.image_url && (
            <motion.img 
              key={`bg-${currentPost.id}`}
              initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 0.3, scale: 1.2 }} transition={{ duration: 1 }}
              src={currentPost.image_url} 
              className="w-full h-full object-cover blur-[100px] brightness-50 saturate-150 transform-gpu" 
              alt="bg" 
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#0a0a0a]"></div>
        </div>

        {/* Header Desktop Imersivo */}
        <div className="hidden lg:flex absolute top-8 left-8 right-8 justify-between items-center z-30 pointer-events-none">
          <button onClick={() => router.push('/cockpit')} className="pointer-events-auto flex items-center gap-2 text-white hover:text-[var(--color-atelier-terracota)] transition-colors text-[10px] uppercase tracking-widest font-bold bg-white/10 backdrop-blur-xl px-6 py-3 rounded-full border border-white/20 shadow-2xl hover:bg-white/20">
            <ArrowLeft size={16} /> Retornar ao Estúdio
          </button>
          <div className="font-roboto text-[10px] uppercase tracking-widest font-bold text-white bg-black/40 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 flex items-center gap-3 shadow-2xl">
            <Sparkles size={14} className="text-[var(--color-atelier-terracota)]" /> Curadoria Visual <span className="text-white/20">|</span> {currentIndex + 1} de {posts.length}
          </div>
        </div>
        
        {/* MOCKUP DO TELEMÓVEL (High-End) */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 pt-28 lg:pt-4 relative z-20 overflow-y-auto custom-scrollbar pb-[140px] lg:pb-36">
          
          <motion.div 
            key={`mockup-${currentPost.id}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative shadow-[0_40px_80px_rgba(0,0,0,0.8)] rounded-[3rem] sm:rounded-[3.5rem] border-[6px] sm:border-[12px] border-[#1a1a1a] bg-white w-full max-w-[400px] flex flex-col overflow-hidden ring-1 ring-white/20"
          >
            
            {/* Dynamic Island / Notch */}
            <div className="w-full h-12 bg-white flex items-end justify-center pb-2 shrink-0 z-10 relative border-b border-gray-50">
              <div className="absolute top-1 sm:top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-20 shadow-inner flex items-center justify-between px-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-[#111] border border-white/10 flex items-center justify-center"><div className="w-1 h-1 rounded-full bg-blue-900/50"></div></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-[#111] border border-white/10"></div>
              </div>
            </div>

            {/* Cabeçalho do Post (Instagram Style) */}
            <div className="flex items-center justify-between px-4 py-3 bg-white shrink-0 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-fuchsia-600 p-[2px]">
                  <div className="w-full h-full bg-white rounded-full border-[2px] border-white overflow-hidden flex items-center justify-center">
                    {clientProfile?.avatar_url ? <img src={clientProfile.avatar_url} className="w-full h-full object-cover" alt="Avatar"/> : <span className="text-black font-bold text-[10px]">{clientProfile?.nome?.charAt(0) || "A"}</span>}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[13px] text-black leading-tight">{clientProfile?.nome?.split(' ')[0] || 'sua_marca'}</span>
                </div>
              </div>
              <div className="flex gap-1 opacity-80 hover:opacity-100 cursor-pointer">
                <div className="w-1 h-1 bg-black rounded-full"></div>
                <div className="w-1 h-1 bg-black rounded-full"></div>
                <div className="w-1 h-1 bg-black rounded-full"></div>
              </div>
            </div>

            {/* Área da Imagem (O Palco Interativo) */}
            <div 
              className={`relative w-full bg-gray-50 overflow-hidden flex items-center justify-center ${isPinMode ? 'cursor-crosshair' : 'cursor-pointer'}`}
              onClick={handleImageClick}
              onDoubleClick={handleDoubleTap}
            >
              {currentPost?.image_url ? (
                <img 
                  ref={imageRef}
                  src={currentPost.image_url} 
                  alt="Conteúdo" 
                  className="w-full h-auto object-contain max-h-[500px]"
                  draggable={false}
                />
              ) : (
                <div className="w-full aspect-square flex flex-col items-center justify-center opacity-30 text-black">
                  <ImageIcon size={48} className="mb-2"/>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Sem Mídia</span>
                </div>
              )}

              {/* Animação do Coração (Double Tap) */}
              <AnimatePresence>
                {showHeart && (
                  <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.2, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ type: "spring" }} className="absolute inset-0 flex items-center justify-center z-40 drop-shadow-2xl">
                    <Heart size={100} className="text-white fill-white drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* OVERLAY DE MODO PINO */}
              <AnimatePresence>
                {isPinMode && !newPinCoords && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center pointer-events-none z-20">
                    <div className="flex flex-col items-center gap-3">
                      <MousePointerClick size={32} className="text-white animate-bounce drop-shadow-lg" />
                      <span className="bg-[var(--color-atelier-terracota)] text-white px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-2xl text-center border border-white/20">
                        Toque no detalhe a ajustar
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* PINOS EXISTENTES */}
              {pins.map((pin) => (
                <div key={pin.id} className="absolute w-6 h-6 -ml-3 -mt-3 bg-white/95 backdrop-blur-md border-[3px] border-[var(--color-atelier-terracota)] rounded-full flex items-center justify-center shadow-lg group z-30 cursor-pointer hover:scale-110 transition-transform" style={{ left: `${pin.pos_x}%`, top: `${pin.pos_y}%` }}>
                  <span className="text-[10px] font-black text-[var(--color-atelier-terracota)] leading-none mt-px">{pins.indexOf(pin) + 1}</span>
                  {/* Tooltip Hover */}
                  <div className="absolute left-8 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-xl border border-gray-100 p-3 rounded-xl w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl z-50">
                    <p className="text-[11px] text-[var(--color-atelier-grafite)] leading-relaxed font-medium">{pin.comment}</p>
                  </div>
                </div>
              ))}

              {/* PINO SENDO CRIADO (Posicionamento Inteligente) */}
              {newPinCoords && (
                <div className="absolute z-40" style={{ left: `${newPinCoords.x}%`, top: `${newPinCoords.y}%` }}>
                  <div className="w-5 h-5 -ml-2.5 -mt-2.5 bg-[var(--color-atelier-terracota)] rounded-full animate-ping absolute opacity-60"></div>
                  <div className="w-5 h-5 -ml-2.5 -mt-2.5 bg-white border-[3px] border-[var(--color-atelier-terracota)] rounded-full absolute shadow-md"></div>
                  
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} 
                    className="absolute top-5 bg-white/95 backdrop-blur-xl border border-gray-200 p-5 rounded-2xl w-[260px] shadow-[0_30px_60px_rgba(0,0,0,0.3)] flex flex-col gap-3"
                    style={{
                      // Lógica de espelho: se clicar muito à direita, a caixa abre para a esquerda.
                      transform: newPinCoords.x > 50 ? 'translateX(calc(-100% + 10px))' : 'translateX(-10px)'
                    }}
                  >
                    <textarea 
                      autoFocus
                      placeholder="Descreva o que deseja alterar neste ponto exato..."
                      value={newPinText}
                      onChange={(e) => setNewPinText(e.target.value)}
                      className="w-full bg-[var(--color-atelier-creme)]/50 border border-gray-200 rounded-xl p-3 text-[12px] text-[var(--color-atelier-grafite)] resize-none h-24 outline-none focus:border-[var(--color-atelier-terracota)]/50 focus:bg-white transition-colors custom-scrollbar shadow-inner"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setNewPinCoords(null)} className="px-4 py-2 text-[9px] text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-grafite)] hover:bg-gray-50 rounded-lg font-bold uppercase tracking-widest transition-colors">Cancelar</button>
                      <button onClick={handleSavePin} disabled={isProcessing || !newPinText.trim()} className="px-5 py-2.5 bg-[var(--color-atelier-terracota)] text-white rounded-lg text-[9px] font-bold uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 hover:bg-[#8c562e] transition-colors shadow-md">
                        {isProcessing ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>} Apontar
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>

            {/* Ações Inferiores e Legenda Mockup */}
            <div className="bg-white flex flex-col flex-1 border-t border-gray-100 z-10 shrink-0">
               <div className="px-4 py-3.5 flex items-center gap-4 shrink-0 text-black">
                 <Heart size={24} className="hover:text-gray-500 cursor-pointer transition-colors" />
                 <MessageSquare size={24} className="hover:text-gray-500 cursor-pointer transition-colors -scale-x-100" />
                 <Send size={24} className="hover:text-gray-500 cursor-pointer transition-colors" />
                 <div className="ml-auto w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 hover:bg-gray-200 cursor-pointer transition-colors">
                    <span className="text-[8px] font-black text-black">...</span>
                 </div>
               </div>
               
               {/* Container com Scroll para o Copy */}
               <div className="px-4 pb-6 overflow-y-auto custom-scrollbar flex-1 max-h-[150px]">
                 <p className="text-[13px] text-black leading-relaxed whitespace-pre-wrap font-medium">
                   <span className="font-bold mr-2 text-[14px]">{clientProfile?.nome?.split(' ')[0] || 'sua_marca'}</span>
                   {currentPost?.caption || <span className="text-gray-400 italic">A legenda deste conteúdo está sendo processada ou não foi fornecida.</span>}
                 </p>
               </div>
            </div>

          </motion.div>
        </div>

        {/* STORYLINE INFINITO (Timeline Cinematográfica Flutuante) */}
        {posts.length > 1 && (
          <div className="absolute bottom-0 left-0 w-full h-[120px] bg-gradient-to-t from-black via-black/80 to-transparent z-30 flex items-end pb-6 px-6 overflow-x-auto custom-scrollbar gap-4">
            {posts.map((post, idx) => (
              <button 
                key={post.id} 
                onClick={() => setCurrentIndex(idx)}
                className={`h-[70px] w-[50px] shrink-0 rounded-[0.8rem] overflow-hidden transition-all duration-300 relative focus:outline-none shadow-md
                  ${currentIndex === idx ? 'border-2 border-white scale-125 shadow-[0_10px_30px_rgba(255,255,255,0.2)] z-10 -translate-y-3' : 'border border-white/20 opacity-40 hover:opacity-100 hover:scale-110'}
                `}
              >
                {post.image_url ? (
                  <img src={post.image_url} className="w-full h-full object-cover" alt="Thumb" />
                ) : (
                  <div className="w-full h-full bg-[#222] flex items-center justify-center"><ImageIcon size={16} className="text-white/30"/></div>
                )}
                {post.status === 'needs_revision' && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full shadow-md border border-[#222]"></div>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* BARRA LATERAL DIREITA - THE INSPECTOR (Glassmorphism Luxo) */}
      <div className="w-full lg:w-[420px] bg-black/40 backdrop-blur-3xl border-l border-white/10 flex flex-col shrink-0 shadow-[-30px_0_60px_rgba(0,0,0,0.8)] z-40 relative h-full">
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          
          <div className="mb-10 flex flex-col gap-2">
            <span className="bg-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/30 px-3.5 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest w-fit backdrop-blur-md shadow-sm">
              Aprovação Rápida = Double Tap na Imagem
            </span>
            <h2 className="font-elegant text-4xl text-white mt-3">Visão do Estrategista</h2>
          </div>

          <div className="mb-8 bg-white/5 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-inner">
            <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
              <MessageSquare size={14} className="text-[var(--color-atelier-terracota)]"/> Legenda Oficial
            </span>
            <p className="text-[13px] text-white/90 leading-relaxed whitespace-pre-wrap font-medium max-h-56 overflow-y-auto custom-scrollbar pr-2">
              {currentPost?.caption || <span className="text-white/30 italic">A aguardar redação final da equipa de Copy.</span>}
            </p>
          </div>

          {currentPost?.publish_date && (
            <div className="mb-8 flex items-center gap-4 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-lg">
              <div className="w-14 h-14 rounded-[1.2rem] bg-[var(--color-atelier-terracota)]/20 border border-[var(--color-atelier-terracota)]/30 flex items-center justify-center text-[var(--color-atelier-terracota)] shadow-inner">
                <Clock size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest block mb-1">Agendamento Estratégico</span>
                <span className="text-[15px] text-white font-bold">{new Date(currentPost.publish_date).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
            </div>
          )}

          {/* LISTAGEM DE AJUSTES SOLICITADOS (PINOS) */}
          <AnimatePresence>
            {pins.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 border-t border-white/10 pt-8 overflow-hidden">
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-6">
                  <MapPin size={14} className="text-orange-400"/> Apontamentos Visuais ({pins.length})
                </span>
                <div className="flex flex-col gap-3">
                  {pins.map((pin, i) => (
                    <div key={pin.id} className="bg-black/40 p-5 rounded-[1.5rem] border border-white/10 shadow-inner flex gap-4 items-start group hover:border-[var(--color-atelier-terracota)]/50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-atelier-terracota)] text-white flex items-center justify-center text-[11px] font-black shrink-0 shadow-lg border border-white/20">
                        {i + 1}
                      </div>
                      <p className="text-[13px] text-white/80 leading-relaxed font-medium pt-1">{pin.comment}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* PAINEL DE DECISÃO (Fricção Zero) - Fixo no Fundo */}
        <div className="p-8 border-t border-white/10 bg-black/60 backdrop-blur-3xl flex flex-col gap-4 shrink-0 shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
          <button 
            onClick={() => handleAction('approved')}
            disabled={isProcessing}
            className="w-full bg-[var(--color-atelier-terracota)] hover:bg-white hover:text-black text-white py-5 rounded-[1.5rem] text-[12px] font-bold uppercase tracking-[0.1em] transition-all shadow-[0_15px_30px_rgba(173,111,64,0.3)] flex items-center justify-center gap-3 hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} 
            Aprovar para Publicação
          </button>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => setIsPinMode(!isPinMode)}
              className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 border shadow-sm
                ${isPinMode 
                  ? 'bg-white/20 border-white text-white shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-[1.02]' 
                  : 'bg-black/50 border-white/10 text-white/50 hover:border-white/30 hover:text-white'}
              `}
            >
              <MapPin size={16} className={isPinMode ? 'text-white' : ''} /> 
              {isPinMode ? 'Cancelar Apontamento' : 'Marcar Ajuste'}
            </button>
            
            <button 
              onClick={() => handleAction('rejected')}
              disabled={isProcessing}
              className="flex-1 bg-red-950/30 border border-red-900/50 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-500 py-4 rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <XCircle size={16} /> Recusar Totalmente
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}