// src/app/comunidade/perfil/[username]/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, MapPin, Calendar, Edit3, 
  Camera, Heart, MessageCircle, Share2, Send, AlertCircle, Sparkles, X, Trophy, Trash2, CheckCircle2
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import Link from "next/link";
import { NotificationEngine } from "../../../../lib/NotificationEngine"; // 🔔 INJEÇÃO DO MOTOR DE NOTIFICAÇÕES

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = use(params);
  const decodedIdentifier = decodeURIComponent(resolvedParams.username);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null); 
  
  const [profile, setProfile] = useState<any>(null); 
  const [allPosts, setAllPosts] = useState<any[]>([]); 
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]); 
  
  // Estados de Abas e Edição
  const [activeTab, setActiveTab] = useState('publicacoes');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ bio: '', username: '', anniversary_date: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Estados de Edição de Imagem
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Estados do Feed
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [commentsData, setCommentsData] = useState<Record<string, any[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        let sessionProfile = null;
        if (session) {
          const { data: currentProf } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (currentProf) {
             setCurrentUser(currentProf);
             sessionProfile = currentProf;
          }
        }

        let { data: targetProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', decodedIdentifier)
          .maybeSingle();

        if (!targetProfile) {
          const { data: fallbackProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', decodedIdentifier)
            .maybeSingle();
          targetProfile = fallbackProfile;
        }

        if (targetProfile) {
          setProfile(targetProfile);
          if (session && session.user.id === targetProfile.id) {
            setIsOwnProfile(true);
          }

          let query = supabase.from('community_posts').select('*, profiles(nome, avatar_url, role, username)').order('created_at', { ascending: false });
          
          // Se não for admin nem o próprio dono do perfil, esconde posts "pending" do utilizador
          if (sessionProfile?.role !== 'admin' && session?.user.id !== targetProfile.id) {
             query = query.eq('status', 'approved');
          }
          
          const { data: postsData } = await query;

          const { data: profileLikes } = await supabase.from('post_likes').select('post_id').eq('user_id', targetProfile.id);
          const profileLikedIds = profileLikes?.map(like => like.post_id) || [];
          setLikedPostIds(profileLikedIds);

          let myLikedPostIds: string[] = [];
          if (session) {
            const { data: myLikes } = await supabase.from('post_likes').select('post_id').eq('user_id', session.user.id);
            if (myLikes) myLikedPostIds = myLikes.map(like => like.post_id);
          }

          if (postsData) {
            setAllPosts(postsData.map(post => ({ ...post, is_liked_by_me: myLikedPostIds.includes(post.id) })));
          }
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileAndPosts();
  }, [decodedIdentifier]);

  // Lógica de Filtro do Feed
  const filteredPosts = allPosts.filter(post => {
    if (activeTab === 'aplausos') return likedPostIds.includes(post.id);
    
    if (post.author_id !== profile?.id) return false;
    
    if (activeTab === 'publicacoes') return post.group_slug === 'global' || !post.group_slug;
    if (activeTab === 'networking') return post.group_slug === 'networking';
    if (activeTab === 'feedback') return post.group_slug === 'feedback';
    if (activeTab === 'highlights') return (post.likes_count || 0) >= 5; 
    
    return false;
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEdit(true);
    try {
      const cleanUsername = editForm.username.replace('@', '').toLowerCase();
      const { error } = await supabase.from('profiles').update({
        bio: editForm.bio,
        username: cleanUsername,
        anniversary_date: editForm.anniversary_date || null
      }).eq('id', profile.id);
      
      if (error) throw error;
      setProfile({ ...profile, ...editForm, username: cleanUsername });
      setIsEditModalOpen(false);
      showToast("Perfil atualizado com sucesso!");
    } catch (error) {
      showToast("Erro ao atualizar. O Username já pode estar em uso.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwnProfile) return;

    // Proteção de tamanho: 5MB
    if (file.size > 5 * 1024 * 1024) {
      showToast("A imagem deve ter menos de 5MB");
      return;
    }

    setIsUploadingCover(true);
    showToast("A processar nova capa...");

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cover_${profile.id}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('community_covers')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw new Error("Erro de permissão no Storage.");
      
      const { data: { publicUrl } } = supabase.storage.from('community_covers').getPublicUrl(fileName);
      const { error: dbError } = await supabase.from('profiles').update({ cover_url: publicUrl }).eq('id', profile.id);
      
      if (dbError) throw dbError;

      setProfile({ ...profile, cover_url: publicUrl });
      showToast("Capa atualizada com sucesso! ✨");
    } catch (error: any) {
      showToast(error.message || "Erro ao atualizar a capa.");
    } finally {
      setIsUploadingCover(false);
      e.target.value = "";
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwnProfile) return;

    setIsUploadingAvatar(true);
    showToast("A atualizar a fotografia...");

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${profile.id}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
      
      setProfile({ ...profile, avatar_url: data.publicUrl });
      showToast("Fotografia atualizada com sucesso!");
    } catch (error) {
      showToast("Erro ao atualizar a fotografia.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    const postIndex = allPosts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    const post = allPosts[postIndex];
    const isLiking = !post.is_liked_by_me;
    const newLikesCount = isLiking ? (post.likes_count || 0) + 1 : Math.max(0, (post.likes_count || 0) - 1);

    setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: newLikesCount, is_liked_by_me: isLiking } : p));

    try {
      if (isLiking) {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser.id });
        
        // 🔔 NOTIFICAÇÃO: Avisa o autor do post
        if (post.author_id !== currentUser.id) {
           await NotificationEngine.notifyUser(
             post.author_id,
             "❤️ Nova Reação",
             `${currentUser.nome} gostou da sua publicação na comunidade.`,
             "info",
             "/comunidade"
           );
        }
      } else {
        await supabase.from('post_likes').delete().match({ post_id: postId, user_id: currentUser.id });
      }
    } catch (error) {
      showToast("Erro ao processar aplauso.");
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
    if (!content?.trim() || !currentUser) return;

    setIsSubmittingComment(postId);
    try {
      const { data, error } = await supabase.from('post_comments').insert({ post_id: postId, user_id: currentUser.id, content: content.trim() }).select('*, profiles(nome, avatar_url, username)');
      if (error) throw error;
      if (data) {
        setCommentsData(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data[0]] }));
        setCommentInputs(prev => ({ ...prev, [postId]: "" }));

        // 🔔 NOTIFICAÇÃO: Avisa o dono do post do Comentário
        const postToComment = allPosts.find(p => p.id === postId);
        if (postToComment && postToComment.author_id !== currentUser.id) {
           await NotificationEngine.notifyUser(
             postToComment.author_id,
             "💬 Novo Comentário",
             `${currentUser.nome} respondeu à sua partilha na comunidade.`,
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
    
    setAllPosts(prev => prev.filter(p => p.id !== idBackup)); 
    setPostToDelete(null);
    try {
      const { error } = await supabase.from('community_posts').delete().eq('id', idBackup);
      if (error) throw error;
      showToast("Publicação apagada com sucesso.");
    } catch (error) {
      showToast("Erro ao apagar a publicação.");
    }
  };

  const handleApprovePost = async (postId: string) => {
    if (currentUser?.role !== 'admin') return;
    try {
      const { error } = await supabase.from('community_posts').update({ status: 'approved' }).eq('id', postId);
      if (error) throw error;
      
      setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'approved' } : p));
      
      // 🔔 NOTIFICAÇÃO: Avisa o autor que o post foi aprovado
      const postToApprove = allPosts.find(p => p.id === postId);
      if (postToApprove && postToApprove.author_id) {
         await NotificationEngine.notifyUser(
           postToApprove.author_id,
           "✅ Partilha Aprovada!",
           "A sua publicação foi aprovada pela equipa e já está visível no mural da Comunidade.",
           "success",
           "/comunidade"
         );
      }
      showToast("Publicação aprovada!");
    } catch (error) {
      showToast("Erro ao aprovar publicação.");
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getRankName = (exp: number, role: string) => {
    if (role === 'admin' || role === 'gestor') return "Mentor VRTICE";
    if (!exp || exp < 1000) return "Visionário";
    if (exp < 3000) return "Vanguardista";
    return "Titã do Legado";
  };

  if (isLoading) {
    return <div className="flex justify-center py-20 w-full"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-50 w-full">
        <AlertCircle size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
        <h2 className="font-elegant text-3xl">Perfil não encontrado.</h2>
        <p className="font-roboto text-sm">Este utilizador pode não existir ou o link está incorreto.</p>
      </div>
    );
  }

  return (
    <>
      {/* ==========================================
          MODAL DE ELIMINAÇÃO DE POST (Glassmorphism)
          ========================================== */}
      <AnimatePresence>
        {postToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPostToDelete(null)} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="glass-panel bg-white/95 backdrop-blur-xl border border-white p-10 rounded-[3.5rem] shadow-2xl w-full max-w-sm relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-6 shadow-inner border border-red-100">
                <Trash2 size={28} />
              </div>
              <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-3">Apagar Publicação?</h2>
              <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/70 mb-8 leading-relaxed font-medium">Esta ação é irreversível. A sua partilha será permanentemente removida do feed.</p>
              
              <div className="flex w-full gap-4">
                <button onClick={() => setPostToDelete(null)} className="flex-1 py-4 rounded-[1.2rem] bg-gray-50 border border-transparent font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 hover:bg-gray-100 hover:text-[var(--color-atelier-grafite)] transition-colors">Cancelar</button>
                <button onClick={confirmDeletePost} className="flex-1 py-4 rounded-[1.2rem] bg-red-500 text-white font-roboto text-[11px] font-bold uppercase tracking-[0.1em] hover:bg-red-600 shadow-md hover:-translate-y-0.5 transition-all">Sim, Apagar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MODAL DE EDIÇÃO DE PERFIL
          ========================================== */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel bg-white/95 backdrop-blur-xl border border-white p-10 rounded-[3.5rem] shadow-2xl w-full max-w-md relative z-10 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">Editar Perfil</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:bg-red-50 hover:text-red-500 transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Username único</label>
                  <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} placeholder="ex: lizdesign" className="w-full bg-white px-5 py-4 rounded-2xl outline-none border border-gray-100 focus:border-[var(--color-atelier-terracota)]/40 shadow-sm text-[13px] font-roboto font-medium transition-colors" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Bio da Marca (Elevator Pitch)</label>
                  <textarea value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} placeholder="Escreva sobre o que a sua empresa faz..." className="w-full bg-white px-5 py-4 rounded-2xl outline-none border border-gray-100 focus:border-[var(--color-atelier-terracota)]/40 shadow-sm text-[13px] font-roboto font-medium h-28 resize-none custom-scrollbar transition-colors" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Data de Aniversário (Fundador/Marca)</label>
                  <input type="date" value={editForm.anniversary_date} onChange={e => setEditForm({...editForm, anniversary_date: e.target.value})} className="w-full bg-white px-5 py-4 rounded-2xl outline-none border border-gray-100 focus:border-[var(--color-atelier-terracota)]/40 shadow-sm text-[13px] font-roboto font-medium transition-colors cursor-pointer" />
                </div>
                <button type="submit" disabled={isSavingEdit} className="mt-6 py-5 rounded-[1.2rem] bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-[0.1em] hover:bg-[#8c562e] shadow-md hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:opacity-50 transition-all flex items-center justify-center">
                  {isSavingEdit ? <Loader2 size={16} className="animate-spin" /> : 'Gravar Alterações'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col w-full items-center animate-[fadeInUp_0.5s_ease-out_both] pb-10">
        
        {/* ==========================================
            CABEÇALHO DO PERFIL (FULL-WIDTH 100%)
            ========================================== */}
        <div className="w-full max-w-[1200px] glass-panel rounded-[3.5rem] bg-white/60 border border-white shadow-[0_15px_40px_rgba(122,116,112,0.05)] overflow-hidden relative">
          
          {/* CAPA (Cover) */}
          <div className="w-full h-[250px] md:h-[300px] bg-gradient-to-br from-[var(--color-atelier-terracota)]/10 to-[var(--color-atelier-rose)]/10 relative group">
            {profile.cover_url ? (
              <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[var(--color-atelier-grafite)]/5 flex items-center justify-center opacity-50">
                <Sparkles size={40} className="text-[var(--color-atelier-grafite)]/20" />
              </div>
            )}

            {/* BOTÃO DA CAPA (Sempre visível para o dono) */}
            {isOwnProfile && (
              <label className="absolute top-6 right-6 w-12 h-12 rounded-[1rem] bg-white/20 backdrop-blur-xl flex items-center justify-center text-white cursor-pointer hover:bg-white/40 transition-colors z-30 shadow-sm border border-white/40 hover:scale-105">
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={isUploadingCover} />
                {isUploadingCover ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              </label>
            )}
          </div>

          {/* INFORMAÇÕES DO PERFIL */}
          <div className="px-8 md:px-12 pb-10 relative">
            
            <div className="relative flex flex-col md:flex-row md:justify-between items-center md:items-end -mt-20 md:-mt-24 mb-6 md:mb-4 gap-4 md:gap-0">
              <div className="relative group mx-auto md:mx-0">
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-[2rem] border-[6px] border-white bg-[var(--color-atelier-creme)] shadow-lg overflow-hidden text-[var(--color-atelier-terracota)] flex items-center justify-center font-elegant text-6xl">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    profile.nome?.charAt(0)
                  )}
                </div>
                {isOwnProfile && (
                  <label className="absolute inset-0 rounded-[1.5rem] bg-black/40 backdrop-blur-md flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-20 m-1.5">
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isUploadingAvatar} />
                    {isUploadingAvatar ? <Loader2 size={28} className="animate-spin" /> : <Camera size={28} />}
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest mt-2">Atualizar</span>
                  </label>
                )}
              </div>

              {/* BOTAO EDITAR */}
              {isOwnProfile && (
                <button 
                  onClick={() => { setEditForm({ bio: profile.bio || '', username: profile.username || '', anniversary_date: profile.anniversary_date || '' }); setIsEditModalOpen(true); }} 
                  className="px-6 py-3.5 rounded-[1.2rem] bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] font-roboto text-[11px] font-bold uppercase tracking-[0.1em] hover:border-[var(--color-atelier-terracota)]/40 hover:text-[var(--color-atelier-terracota)] transition-all shadow-sm flex items-center gap-2 hover:-translate-y-0.5"
                >
                  <Edit3 size={14} /> Editar Perfil
                </button>
              )}
            </div>

            <div className="flex flex-col mt-4 md:mt-2 items-center md:items-start text-center md:text-left">
              <h1 className="font-elegant text-5xl md:text-[4rem] text-[var(--color-atelier-grafite)] leading-none tracking-tight">{profile.nome}</h1>
              <p className="font-roboto text-[15px] font-bold text-[var(--color-atelier-terracota)] mt-2 mb-5">@{profile.username || profile.nome?.toLowerCase().replace(/\s/g, '')}</p>
              
              <p className="font-roboto text-[15px] font-medium text-[var(--color-atelier-grafite)]/80 leading-relaxed max-w-3xl whitespace-pre-wrap">
                {profile.bio || (isOwnProfile ? "A sua marca ainda não tem uma Bio. Clique em 'Editar Perfil' para adicionar." : "Esta marca ainda não adicionou uma biografia.")}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 mt-8 pt-6 border-t border-[var(--color-atelier-grafite)]/10 w-full">
                <div className="flex items-center gap-2 text-[var(--color-atelier-grafite)]/60 font-roboto text-[12px] font-medium bg-white/50 px-4 py-2 rounded-xl">
                  <Calendar size={16} /> Entrou em {formatTime(profile.created_at)}
                </div>
                {profile.empresa && (
                  <div className="flex items-center gap-2 text-[var(--color-atelier-grafite)]/60 font-roboto text-[12px] font-medium bg-white/50 px-4 py-2 rounded-xl">
                    <MapPin size={16} /> {profile.empresa}
                  </div>
                )}
                <div className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-[1rem] border border-[var(--color-atelier-terracota)]/20 shadow-sm">
                  <Sparkles size={16} className="text-[var(--color-atelier-terracota)]" />
                  <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)]">
                    {getRankName(profile.exp, profile.role)} • {profile.exp || 0} XP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            O FEED DO UTILIZADOR (LIMITADO A 800PX)
            ========================================== */}
        <div className="w-full max-w-[800px] mt-10 flex flex-col items-center">
          
          {/* BARRA DE NAVEGAÇÃO / ABAS NATIVAS */}
          <div className="flex w-full overflow-x-auto custom-scrollbar gap-2 mb-8 bg-white/40 p-2 rounded-[1.5rem] border border-white shadow-sm shrink-0">
            {[
              { id: 'publicacoes', label: 'Mural' },
              { id: 'highlights', label: 'Highlights', icon: <Trophy size={14} /> },
              { id: 'networking', label: 'Networking' },
              { id: 'feedback', label: 'Feedback' },
              { id: 'aplausos', label: 'Aplausos' }
            ].map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`flex-1 py-3 px-5 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center gap-2
                  ${activeTab === tab.id ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/60 hover:bg-white'}
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-full flex flex-col gap-8">
            {filteredPosts.length === 0 ? (
              <div className="text-center p-16 opacity-60 flex flex-col items-center justify-center glass-panel bg-white/40 border border-white rounded-[3rem]">
                <Sparkles size={48} className="mb-6 text-[var(--color-atelier-terracota)]" />
                <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Nenhuma partilha encontrada.</h3>
                <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/60 mt-2 font-medium">Ainda não existem registos nesta secção.</p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredPosts.map((post, index) => {
                  const isPending = post.status === 'pending';
                  const isAdmin = currentUser?.role === 'admin';
                  const isMyPost = post.author_id === currentUser?.id;
                  const isLiked = post.is_liked_by_me;
                  const isCommentsOpen = expandedComments.includes(post.id);

                  return (
                    <motion.div 
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                      className={`glass-panel rounded-[3rem] flex flex-col shadow-sm overflow-hidden border border-white bg-white/60 w-full transition-colors hover:bg-white/80
                        ${isPending ? 'opacity-80 border-orange-200/50' : ''}
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
                                {post.profiles?.nome}
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
                          {(isMyPost || isAdmin) && activeTab !== 'aplausos' && (
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

                      <div className="p-6 flex items-center justify-between bg-white/40 border-t border-white/50">
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
                        <button onClick={() => showToast("Link copiado para a área de transferência!")} className="p-3 text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] hover:bg-white transition-colors rounded-[1rem] shadow-sm border border-transparent hover:border-white">
                          <Share2 size={18} />
                        </button>
                      </div>

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
            )}
          </div>
        </div>
      </div>
    </>
  );
}