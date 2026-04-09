// src/app/comunidade/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { 
  Globe2, Sparkles, Send, Heart, MessageCircle, Share2, 
  Loader2, ImageIcon, CheckCircle2, AlertCircle, Trash2, X, Users, Lightbulb, Gift
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { NotificationEngine } from "../../lib/NotificationEngine"; // 🔔 INJEÇÃO DO MOTOR DE NOTIFICAÇÕES

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function ComunidadeFeed() {
  const searchParams = useSearchParams();
  const currentGroup = searchParams?.get('grupo') || 'global';

  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  
  // NOVIDADE: Estado para aniversariantes do dia
  const [todaysAnniversaries, setTodaysAnniversaries] = useState<any[]>([]);
  
  const [newPostText, setNewPostText] = useState("");
  const [newPostImagePreview, setNewPostImagePreview] = useState<string | null>(null);
  const [newPostImageFile, setNewPostImageFile] = useState<File | null>(null);

  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [commentsData, setCommentsData] = useState<Record<string, any[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<string | null>(null);

  const publisherRef = useRef<HTMLTextAreaElement>(null);

  const fetchCommunityData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profileData) setUserProfile(profileData);

      // 1. Busca os Posts do Grupo
      let query = supabase.from('community_posts').select('*, profiles(nome, avatar_url, role, username)').order('created_at', { ascending: false });
      
      // 🛡️ BLINDAGEM DE SEGURANÇA: Esconde posts 'pending' de outros utilizadores (Apenas Admin vê tudo)
      if (profileData?.role !== 'admin') {
        query = query.or(`status.eq.approved,author_id.eq.${session.user.id}`);
      }

      if (currentGroup === 'global') {
        query = query.or('group_slug.eq.global,group_slug.is.null');
      } else {
        query = query.eq('group_slug', currentGroup);
      }

      const { data: postsData, error: postsError } = await query;
      if (postsError) throw postsError;

      // 2. Busca Likes
      const { data: myLikes } = await supabase.from('post_likes').select('post_id').eq('user_id', session.user.id);
      const myLikedPostIds = myLikes?.map(like => like.post_id) || [];

      if (postsData) {
        setPosts(postsData.map(post => ({ ...post, is_liked_by_me: myLikedPostIds.includes(post.id) })));
      }

      // 3. Busca Aniversariantes do Dia (Apenas no Mural Global)
      if (currentGroup === 'global') {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        const { data: bdays } = await supabase
          .from('profiles')
          .select('id, nome, username, avatar_url, anniversary_date')
          .not('anniversary_date', 'is', null);

        if (bdays) {
          const celebratingToday = bdays.filter(p => {
            const date = new Date(p.anniversary_date);
            return date.getUTCMonth() + 1 === currentMonth && date.getUTCDate() === currentDay;
          });
          setTodaysAnniversaries(celebratingToday);
        }
      }

    } catch (error) {
      console.error("Erro ao carregar comunidade:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityData();
  }, [currentGroup]);

  // Função para gatilho de "Dar os Parabéns" com auto-resize
  const handleCongratulate = (username: string) => {
    setNewPostText(`@${username} parabéns por mais um ano de sucesso e evolução! 🎉 `);
    if (publisherRef.current) {
      publisherRef.current.focus();
      setTimeout(() => {
        if (publisherRef.current) {
          publisherRef.current.style.height = 'auto';
          publisherRef.current.style.height = `${publisherRef.current.scrollHeight}px`;
        }
      }, 10);
    }
  };

  // UX: Auto-Resize do Textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewPostText(e.target.value);
    if (publisherRef.current) {
      publisherRef.current.style.height = 'auto';
      publisherRef.current.style.height = `${publisherRef.current.scrollHeight}px`;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPostImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewPostImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim() || !userProfile) return;

    setIsPublishing(true);
    showToast("A processar publicação...");

    try {
      let imageUrl = null;
      if (newPostImageFile) {
        const fileExt = newPostImageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('community_images').upload(fileName, newPostImageFile);

        if (!uploadError) {
          const { data } = supabase.storage.from('community_images').getPublicUrl(fileName);
          imageUrl = data.publicUrl;
        }
      }

      const isAdmin = userProfile.role === 'admin';
      const postStatus = isAdmin ? 'approved' : 'pending';

      const { data: insertedPost, error: dbError } = await supabase
        .from('community_posts')
        .insert({
          author_id: userProfile.id,
          text_content: newPostText,
          image_url: imageUrl,
          status: postStatus,
          group_slug: currentGroup 
        })
        .select('*, profiles(nome, avatar_url, role, username)');

      if (dbError) throw dbError;

      if (insertedPost) {
        setPosts(prev => [{ ...insertedPost[0], is_liked_by_me: false, likes_count: 0 }, ...prev]);

        // 🔔 NOTIFICAÇÃO: Avisa a gestão se um cliente enviar um post para aprovação
        if (!isAdmin) {
           await NotificationEngine.notifyManagement(
             "📝 Comunidade: Aprovação Pendente",
             `O cliente ${userProfile.nome} enviou uma nova partilha que requer a sua aprovação para ficar pública.`,
             "warning",
             "/admin/comunidade" // ou a rota correta de gestão
           );
        }
      }
      
      // Reseta o formulário e a altura do textarea
      setNewPostText(""); 
      setNewPostImagePreview(null); 
      setNewPostImageFile(null);
      if (publisherRef.current) publisherRef.current.style.height = 'auto';

      showToast(!isAdmin ? "Publicação enviada para análise." : "Publicado com sucesso!");

    } catch (error) {
      showToast("Erro ao publicar.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleApprovePost = async (postId: string) => {
    if (userProfile?.role !== 'admin') return;
    try {
      const { error } = await supabase.from('community_posts').update({ status: 'approved' }).eq('id', postId);
      if (error) throw error;
      
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'approved' } : p));
      
      // 🔔 NOTIFICAÇÃO: Avisa o autor que o post foi aprovado
      const postToApprove = posts.find(p => p.id === postId);
      if (postToApprove && postToApprove.author_id) {
         await NotificationEngine.notifyUser(
           postToApprove.author_id,
           "✅ Partilha Aprovada!",
           "A sua publicação foi aprovada pela equipa e já está visível no mural da Comunidade.",
           "success",
           "/comunidade"
         );
      }

      showToast("Publicação aprovada com sucesso!");
    } catch (error) {
      showToast("Erro ao aprovar publicação.");
    }
  };

  const handleLike = async (postId: string) => {
    if (!userProfile) return;
    
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    const post = posts[postIndex];
    
    // Atualização Otimista
    const isLiking = !post.is_liked_by_me;
    const newLikesCount = isLiking ? (post.likes_count || 0) + 1 : Math.max(0, (post.likes_count || 0) - 1);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: newLikesCount, is_liked_by_me: isLiking } : p));

    try {
      if (isLiking) {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: userProfile.id });
        
        // 🔔 NOTIFICAÇÃO: Opcional, avisa o dono do post do Like (Se não for ele mesmo)
        if (post.author_id !== userProfile.id) {
           await NotificationEngine.notifyUser(
             post.author_id,
             "❤️ Nova Reação",
             `${userProfile.nome} gostou da sua publicação na comunidade.`,
             "info",
             "/comunidade"
           );
        }
      } else {
        await supabase.from('post_likes').delete().match({ post_id: postId, user_id: userProfile.id });
      }
      // O SQL Trigger 'on_post_like' tratará da contagem final no banco
    } catch (error) {
      fetchCommunityData(); 
    }
  };

  const toggleComments = async (postId: string) => {
    if (expandedComments.includes(postId)) {
      setExpandedComments(expandedComments.filter(id => id !== postId));
    } else {
      setExpandedComments([...expandedComments, postId]);
      if (!commentsData[postId]) {
        const { data } = await supabase.from('post_comments').select('*, profiles(nome, avatar_url, username)').eq('post_id', postId).order('created_at', { ascending: true });
        if (data) setCommentsData(prev => ({ ...prev, [postId]: data }));
      }
    }
  };

  const handleSendComment = async (postId: string) => {
    const content = commentInputs[postId];
    if (!content?.trim() || !userProfile) return;

    setIsSubmittingComment(postId);
    try {
      const { data, error } = await supabase.from('post_comments').insert({ post_id: postId, user_id: userProfile.id, content: content.trim() }).select('*, profiles(nome, avatar_url, username)');
      if (error) throw error;
      if (data) {
        setCommentsData(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data[0]] }));
        setCommentInputs(prev => ({ ...prev, [postId]: "" }));

        // 🔔 NOTIFICAÇÃO: Avisa o dono do post do Comentário
        const postToComment = posts.find(p => p.id === postId);
        if (postToComment && postToComment.author_id !== userProfile.id) {
           await NotificationEngine.notifyUser(
             postToComment.author_id,
             "💬 Novo Comentário",
             `${userProfile.nome} respondeu à sua partilha na comunidade.`,
             "info",
             "/comunidade"
           );
        }
      }
    } catch (error) {
      showToast("Erro ao enviar comentário.");
    } finally {
      setIsSubmittingComment(null);
    }
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    const idBackup = postToDelete;
    
    // Atualização otimista
    setPosts(prev => prev.filter(p => p.id !== idBackup));
    setPostToDelete(null); 
    
    try {
      // O CASCADE DELETE no banco fará a limpeza automática dos likes e comentários.
      const { error } = await supabase.from('community_posts').delete().eq('id', idBackup);
      if (error) throw error;
      showToast("A publicação foi apagada da comunidade.");
    } catch (error) {
      showToast("Erro ao apagar. Permissão negada.");
      fetchCommunityData(); 
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getGroupTitle = () => {
    if (currentGroup === 'networking') return { title: "Networking & Parcerias", icon: <Users size={28} className="text-[var(--color-atelier-terracota)]" /> };
    if (currentGroup === 'feedback') return { title: "Feedback & Ideias", icon: <Lightbulb size={28} className="text-[var(--color-atelier-terracota)]" /> };
    return { title: "Mural Global", icon: <Globe2 size={28} className="text-[var(--color-atelier-terracota)]" /> };
  };

  const groupInfo = getGroupTitle();

  return (
    <div className="flex flex-col gap-6 w-full animate-[fadeInUp_0.8s_ease-out_both]">
      
      {/* =========================================================================
          MODAL DE ELIMINAÇÃO (Glassmorphism Premium)
          ========================================================================= */}
      <AnimatePresence>
        {postToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPostToDelete(null)} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="glass-panel bg-white/95 backdrop-blur-xl border border-white p-10 rounded-[3.5rem] shadow-2xl w-full max-w-sm relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-6 shadow-inner border border-red-100">
                <Trash2 size={28} />
              </div>
              <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-3">Apagar Publicação?</h2>
              <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/70 mb-8 leading-relaxed font-medium">Esta ação é irreversível. A sua partilha será permanentemente removida do feed da comunidade.</p>
              
              <div className="flex w-full gap-4">
                <button onClick={() => setPostToDelete(null)} className="flex-1 py-4 rounded-2xl bg-gray-50 border border-transparent font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 hover:bg-gray-100 hover:text-[var(--color-atelier-grafite)] transition-colors">Cancelar</button>
                <button onClick={confirmDeletePost} className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-roboto text-[11px] font-bold uppercase tracking-[0.1em] hover:bg-red-600 shadow-md hover:-translate-y-0.5 transition-all">Sim, Apagar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between px-2 mt-4 md:mt-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[1rem] bg-white border border-white shadow-sm flex items-center justify-center">
             {groupInfo.icon}
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-none">{groupInfo.title}</h1>
        </div>
      </div>

      {/* MOTOR DE CELEBRAÇÃO (BANNER DE ANIVERSÁRIO) */}
      <AnimatePresence>
        {todaysAnniversaries.length > 0 && currentGroup === 'global' && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            className="bg-gradient-to-r from-[var(--color-atelier-terracota)] to-[#e89b71] p-1.5 rounded-[2.5rem] shadow-lg relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
            <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[2.2rem] flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 border border-white/50">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-[1.2rem] bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shadow-inner shrink-0">
                  <Gift size={28} />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-tight mb-1">Dia de Celebração! 🎉</h3>
                  <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/70 font-medium">
                    A marca de <span className="font-bold text-[var(--color-atelier-terracota)]">{todaysAnniversaries[0].nome}</span> completa mais um ciclo de evolução hoje no Atelier.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => handleCongratulate(todaysAnniversaries[0].username || todaysAnniversaries[0].nome)}
                className="w-full md:w-auto px-8 py-4 rounded-[1.2rem] bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-[0.1em] hover:bg-[#8c562e] transition-all hover:-translate-y-0.5 shadow-md shrink-0"
              >
                Dar os Parabéns
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          O PUBLICADOR FLUIDO
          ========================================================================= */}
      <div className="glass-panel p-6 md:p-8 rounded-[2.5rem] bg-white/60 border border-white shadow-sm hover:shadow-md hover:bg-white/80 transition-all relative z-20">
        <form onSubmit={handlePublish} className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-[1rem] border border-[var(--color-atelier-terracota)]/20 shadow-inner overflow-hidden shrink-0 flex items-center justify-center bg-[var(--color-atelier-grafite)] text-white font-elegant text-xl">
              {userProfile?.avatar_url ? <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" /> : userProfile?.nome?.charAt(0)}
            </div>
            <div className="flex-1 bg-white/80 border border-white focus-within:border-[var(--color-atelier-terracota)]/40 focus-within:shadow-sm focus-within:bg-white rounded-[1.5rem] transition-all">
              <textarea 
                ref={publisherRef}
                rows={1}
                value={newPostText} 
                onChange={handleTextareaChange} 
                disabled={isPublishing} 
                placeholder={
                  currentGroup === 'networking' ? "O que a sua empresa procura ou oferece hoje?" : 
                  currentGroup === 'feedback' ? "Precisa de uma opinião experiente? Partilhe a sua ideia..." :
                  "Que vitória ou insight a sua marca conquistou hoje?"
                }
                className="w-full bg-transparent border-none outline-none font-roboto text-[15px] font-medium text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 resize-none min-h-[56px] overflow-hidden p-4 disabled:opacity-50 transition-all custom-scrollbar" 
              />
            </div>
          </div>
          
          {newPostImagePreview && (
            <div className="relative w-full h-56 rounded-[1.5rem] overflow-hidden border-4 border-white shadow-md ml-[4.5rem] max-w-[calc(100%-4.5rem)]">
              <img src={newPostImagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button type="button" onClick={() => {setNewPostImagePreview(null); setNewPostImageFile(null)}} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors backdrop-blur-md border border-white/20"><X size={14}/></button>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 mt-2 border-t border-[var(--color-atelier-grafite)]/5 ml-[4.5rem]">
            <label className="flex items-center gap-2 px-5 py-2.5 rounded-[1rem] bg-white border border-white shadow-sm text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] hover:border-[var(--color-atelier-terracota)]/20 transition-all cursor-pointer">
              <ImageIcon size={18} />
              <span className="font-roboto text-[11px] font-bold uppercase tracking-widest">Anexar Imagem</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isPublishing} />
            </label>
            
            <button type="submit" disabled={!newPostText.trim() || isPublishing} className="px-8 py-3.5 rounded-[1.2rem] bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-[0.1em] hover:bg-[#8c562e] transition-all shadow-md disabled:opacity-50 flex items-center gap-2 hover:-translate-y-0.5 disabled:hover:translate-y-0">
              {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 
              Publicar
            </button>
          </div>
        </form>
      </div>

      {/* =========================================================================
          A LISTA DE POSTS
          ========================================================================= */}
      {isLoading ? (
        <div className="flex justify-center p-10"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center p-16 opacity-60 flex flex-col items-center justify-center glass-panel bg-white/40 rounded-[3rem] border border-white mt-4">
          <Sparkles size={48} className="mb-6 text-[var(--color-atelier-terracota)]" />
          <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Nenhuma partilha encontrada.</h3>
          <p className="font-roboto text-[14px] font-medium text-[var(--color-atelier-grafite)]/60 mt-2">Seja o primeiro a inspirar a comunidade neste grupo!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 pb-10 mt-4">
          <AnimatePresence>
            {posts.map((post, index) => {
              const isPending = post.status === 'pending';
              const isAdmin = userProfile?.role === 'admin';
              const isMyPost = post.author_id === userProfile?.id;
              const isLiked = post.is_liked_by_me;
              const isCommentsOpen = expandedComments.includes(post.id);

              return (
                <motion.div 
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} exit={{ opacity: 0, scale: 0.95 }}
                  className={`glass-panel rounded-[3rem] flex flex-col shadow-sm overflow-hidden transition-colors border border-white 
                    ${isPending ? 'bg-white/40 border-orange-200/50 opacity-90' : 'bg-white/60 hover:bg-white/80'}
                  `}
                >
                  <div className="p-8 pb-6 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <Link href={`/comunidade/perfil/${post.profiles?.username || post.author_id}`}>
                        <div className="w-14 h-14 rounded-[1.2rem] border border-[var(--color-atelier-terracota)]/20 shadow-inner overflow-hidden shrink-0 flex items-center justify-center bg-white text-[var(--color-atelier-grafite)] font-elegant text-2xl hover:scale-105 transition-transform">
                          {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : post.profiles?.nome?.charAt(0)}
                        </div>
                      </Link>
                      <div className="flex flex-col">
                        <span className="font-bold text-[15px] text-[var(--color-atelier-grafite)] flex items-center gap-2">
                          <Link href={`/comunidade/perfil/${post.profiles?.username || post.author_id}`} className="hover:text-[var(--color-atelier-terracota)] transition-colors">
                            {post.profiles?.nome || "Membro"}
                          </Link>
                          {isPending && (
                            <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full font-roboto text-[9px] uppercase tracking-widest font-black border border-orange-100 flex items-center gap-1 shadow-sm">
                              <AlertCircle size={12} /> Em Análise
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2 font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 mt-1">
                          <span className="font-bold text-[var(--color-atelier-terracota)]">@{post.profiles?.username || post.profiles?.nome?.toLowerCase().replace(/\s/g, '')}</span>
                          <span className="text-gray-300">•</span>
                          <span className="font-medium">{formatTime(post.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isPending && isAdmin && (
                         <button onClick={() => handleApprovePost(post.id)} className="bg-green-500 text-white px-5 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-green-600 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                           <CheckCircle2 size={16} /> Aprovar
                         </button>
                      )}
                      {(isAdmin || isMyPost) && (
                        <button onClick={() => setPostToDelete(post.id)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-transparent shadow-sm text-[var(--color-atelier-grafite)]/40 hover:border-red-100 hover:bg-red-50 hover:text-red-500 transition-colors" title="Apagar">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="px-8 pb-6">
                    <p className="font-roboto text-[15px] font-medium leading-relaxed text-[var(--color-atelier-grafite)]/90 whitespace-pre-wrap">
                      {post.text_content}
                    </p>
                  </div>

                  {post.image_url && (
                    <div onDoubleClick={() => handleLike(post.id)} className="w-full bg-[var(--color-atelier-grafite)]/5 relative cursor-pointer group px-8 pb-8">
                      <div className="w-full rounded-[2rem] overflow-hidden border-4 border-white shadow-md">
                         <img src={post.image_url} alt="Publicação" className="w-full max-h-[600px] object-cover group-hover:scale-105 transition-transform duration-700" />
                      </div>
                    </div>
                  )}

                  <div className="p-6 flex items-center justify-between bg-white/40 border-t border-[var(--color-atelier-grafite)]/5">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleLike(post.id)} 
                        disabled={isPending} 
                        className={`px-5 py-2.5 rounded-[1.2rem] flex items-center gap-2 font-roboto text-[12px] font-bold transition-all shadow-sm disabled:opacity-50 border 
                          ${isLiked ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)]/20' : 'bg-white text-[var(--color-atelier-grafite)]/60 hover:bg-gray-50 hover:text-[var(--color-atelier-grafite)] border-white'}`}
                      >
                        <Heart size={18} className={isLiked ? 'fill-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)]' : ''} /> 
                        {post.likes_count || 0} {post.likes_count === 1 ? 'Gosto' : 'Gostos'}
                      </button>
                      <button 
                        onClick={() => toggleComments(post.id)} 
                        disabled={isPending} 
                        className={`px-5 py-2.5 rounded-[1.2rem] flex items-center gap-2 font-roboto text-[12px] font-bold transition-all shadow-sm disabled:opacity-50 border
                          ${isCommentsOpen ? 'bg-white text-[var(--color-atelier-grafite)] border-white' : 'bg-white/50 text-[var(--color-atelier-grafite)]/60 hover:bg-white hover:text-[var(--color-atelier-grafite)] border-transparent'}`}
                      >
                        <MessageCircle size={18} /> {commentsData[post.id]?.length || 'Comentar'}
                      </button>
                    </div>
                  </div>

                  {/* ZONA DE COMENTÁRIOS FLUIDA */}
                  <AnimatePresence>
                    {isCommentsOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-white/40 border-t border-[var(--color-atelier-grafite)]/5 flex flex-col"
                      >
                        <div className="flex flex-col gap-5 p-8 max-h-80 overflow-y-auto custom-scrollbar">
                          {!commentsData[post.id] ? (
                            <div className="flex justify-center p-4"><Loader2 size={20} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>
                          ) : commentsData[post.id]?.length === 0 ? (
                            <div className="text-[13px] text-[var(--color-atelier-grafite)]/50 italic font-roboto font-medium text-center py-4 bg-white/50 rounded-[1.5rem]">Sem comentários. Partilhe a primeira perspetiva!</div>
                          ) : (
                            commentsData[post.id]?.map((comment: any) => (
                              <div key={comment.id} className="flex gap-4 items-start">
                                <Link href={`/comunidade/perfil/${comment.profiles?.username || comment.user_id}`}>
                                  <div className="w-10 h-10 rounded-[1rem] border border-white overflow-hidden shrink-0 flex items-center justify-center bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] font-elegant text-lg shadow-sm hover:scale-105 transition-transform">
                                    {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : comment.profiles?.nome?.charAt(0)}
                                  </div>
                                </Link>
                                <div className="flex flex-col flex-1 bg-white p-5 rounded-[1.5rem] rounded-tl-sm border border-white shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-roboto text-[12px] font-bold text-[var(--color-atelier-grafite)]">{comment.profiles?.nome}</span>
                                    <span className="font-roboto text-[10px] font-bold text-[var(--color-atelier-grafite)]/40">{formatTime(comment.created_at)}</span>
                                  </div>
                                  <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/90 leading-relaxed font-medium">{comment.content}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        
                        <div className="flex gap-3 items-center p-6 bg-white/80 border-t border-[var(--color-atelier-grafite)]/5">
                          <div className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-[1.5rem] flex items-center focus-within:border-[var(--color-atelier-terracota)]/40 focus-within:shadow-sm transition-all p-1.5">
                            <input 
                              type="text" 
                              value={commentInputs[post.id] || ""} 
                              onChange={(e) => setCommentInputs({...commentInputs, [post.id]: e.target.value})}
                              placeholder="Adicione um comentário à discussão..." 
                              className="flex-1 bg-transparent border-none outline-none font-roboto text-[13px] font-medium text-[var(--color-atelier-grafite)] px-4 placeholder:text-[var(--color-atelier-grafite)]/40"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSendComment(post.id); }}
                            />
                            <button 
                              onClick={() => handleSendComment(post.id)}
                              disabled={isSubmittingComment === post.id || !commentInputs[post.id]?.trim()}
                              className="w-10 h-10 rounded-xl bg-[var(--color-atelier-grafite)] text-white flex items-center justify-center shrink-0 hover:bg-[var(--color-atelier-terracota)] transition-colors disabled:opacity-50 shadow-sm"
                            >
                              {isSubmittingComment === post.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}