// src/app/comunidade/perfil/[username]/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, MapPin, Calendar, Edit3, 
  Camera, Heart, MessageCircle, Share2, Send, AlertCircle, Sparkles, X, Trophy, Trash2
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";

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

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setCurrentUser(session.user);

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

          const { data: postsData } = await supabase
            .from('community_posts')
            .select('*, profiles(nome, avatar_url, role, username)')
            .order('created_at', { ascending: false });

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
      // Usar o ID do usuário no nome garante unicidade e evita conflitos
      const fileName = `cover_${profile.id}_${Date.now()}.${fileExt}`;
      
      // 1. Upload para o Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('community_covers')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Se já existir algo com esse nome, ele substitui
        });

      if (uploadError) {
        console.error("Erro no Storage:", uploadError);
        throw new Error("Erro de permissão no Storage. Verifique as políticas de RLS.");
      }
      
      // 2. Pegar a URL Pública
      const { data: { publicUrl } } = supabase.storage
        .from('community_covers')
        .getPublicUrl(fileName);
      
      // 3. Atualizar a tabela de Perfis
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ cover_url: publicUrl })
        .eq('id', profile.id);
      
      if (dbError) throw dbError;

      setProfile({ ...profile, cover_url: publicUrl });
      showToast("Capa atualizada com sucesso! ✨");
    } catch (error: any) {
      console.error("Erro completo:", error);
      showToast(error.message || "Erro ao atualizar a capa.");
    } finally {
      setIsUploadingCover(false);
      // Limpar o input para permitir subir a mesma imagem novamente se necessário
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
      console.error(error);
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
      }
    } catch (error) {
      showToast("Erro ao enviar comentário.");
    } finally {
      setIsSubmittingComment(null);
    }
  };

  const confirmDeletePost = async (postId: string) => {
    if (!window.confirm("Deseja apagar permanentemente esta partilha?")) return;
    setAllPosts(prev => prev.filter(p => p.id !== postId)); 
    try {
      const { error } = await supabase.from('community_posts').delete().eq('id', postId);
      if (error) throw error;
      showToast("Publicação apagada com sucesso.");
    } catch (error) {
      showToast("Erro ao apagar a publicação.");
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
          MODAL DE EDIÇÃO FORA DO BLOCO ANIMADO
          Isto resolve o bug do modal quebrado!
          ========================================== */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#FEF5E6] border border-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Perfil na Comunidade</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-[var(--color-atelier-grafite)]/50 hover:text-red-500"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Username único</label>
                  <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} placeholder="ex: lizdesign" className="bg-white px-4 py-3.5 rounded-xl outline-none border border-white focus:border-[var(--color-atelier-terracota)]/40 shadow-sm text-[13px] font-roboto" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Bio da Marca (Elevator Pitch)</label>
                  <textarea value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} placeholder="Escreva sobre o que a sua empresa faz..." className="bg-white px-4 py-3.5 rounded-xl outline-none border border-white focus:border-[var(--color-atelier-terracota)]/40 shadow-sm text-[13px] font-roboto h-24 resize-none custom-scrollbar" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Data de Aniversário (Marca ou Fundador)</label>
                  <input type="date" value={editForm.anniversary_date} onChange={e => setEditForm({...editForm, anniversary_date: e.target.value})} className="bg-white px-4 py-3.5 rounded-xl outline-none border border-white focus:border-[var(--color-atelier-terracota)]/40 shadow-sm text-[13px] font-roboto" />
                </div>
                <button type="submit" disabled={isSavingEdit} className="mt-4 py-3.5 rounded-2xl bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#8c562e] shadow-[0_10px_20px_rgba(173,111,64,0.3)] hover:-translate-y-0.5 transition-all flex items-center justify-center">
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
        <div className="w-full max-w-[1200px] glass-panel rounded-[2.5rem] bg-white/80 border border-white shadow-[0_10px_30px_rgba(122,116,112,0.05)] overflow-hidden relative">
          
          {/* CAPA (Cover) */}
          <div className="w-full h-[200px] md:h-[250px] bg-gradient-to-br from-[var(--color-atelier-terracota)]/20 to-[var(--color-atelier-rose)]/20 relative group">
            {profile.cover_url ? (
              <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[var(--color-atelier-grafite)]/5 flex items-center justify-center opacity-50">
                <Sparkles size={40} className="text-[var(--color-atelier-grafite)]/20" />
              </div>
            )}

            {/* BOTÃO DA CAPA (Sempre visível para o dono, resolvendo o bug de cliques) */}
            {isOwnProfile && (
              <label className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white cursor-pointer hover:bg-black/60 transition-colors z-30 shadow-sm border border-white/20">
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={isUploadingCover} />
                {isUploadingCover ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              </label>
            )}
          </div>

          {/* INFORMAÇÕES DO PERFIL */}
          <div className="px-6 md:px-10 pb-8 relative">
            
            <div className="relative flex justify-between items-end -mt-16 md:-mt-20 mb-4">
              <div className="relative group">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white bg-[var(--color-atelier-creme)] shadow-md overflow-hidden text-[var(--color-atelier-terracota)] flex items-center justify-center font-elegant text-5xl">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    profile.nome?.charAt(0)
                  )}
                </div>
                {isOwnProfile && (
                  <label className="absolute inset-0 rounded-full bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isUploadingAvatar} />
                    {isUploadingAvatar ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                    <span className="font-roboto text-[9px] font-bold uppercase tracking-widest mt-1">Atualizar</span>
                  </label>
                )}
              </div>

              {/* BOTAO EDITAR */}
              {isOwnProfile && (
                <button 
                  onClick={() => { setEditForm({ bio: profile.bio || '', username: profile.username || '', anniversary_date: profile.anniversary_date || '' }); setIsEditModalOpen(true); }} 
                  className="px-5 py-2.5 rounded-full border border-[var(--color-atelier-grafite)]/20 text-[var(--color-atelier-grafite)] font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-grafite)]/5 transition-colors shadow-sm flex items-center gap-2"
                >
                  <Edit3 size={14} /> Editar Perfil
                </button>
              )}
            </div>

            <div className="flex flex-col mt-2">
              <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-none">{profile.nome}</h1>
              <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/50 mt-1 mb-4">@{profile.username || profile.nome?.toLowerCase().replace(/\s/g, '')}</p>
              
              <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/80 leading-relaxed max-w-2xl whitespace-pre-wrap">
                {profile.bio || (isOwnProfile ? "A sua marca ainda não tem uma Bio. Clique em 'Editar Perfil' para adicionar." : "Esta marca ainda não adicionou uma biografia.")}
              </p>

              <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-6 border-t border-[var(--color-atelier-grafite)]/5 pt-6">
                <div className="flex items-center gap-2 text-[var(--color-atelier-grafite)]/60 font-roboto text-[12px]">
                  <Calendar size={16} /> Entrou em {formatTime(profile.created_at)}
                </div>
                {profile.empresa && (
                  <div className="flex items-center gap-2 text-[var(--color-atelier-grafite)]/60 font-roboto text-[12px]">
                    <MapPin size={16} /> {profile.empresa}
                  </div>
                )}
                <div className="flex items-center gap-2 bg-[var(--color-atelier-terracota)]/10 px-3 py-1.5 rounded-full border border-[var(--color-atelier-terracota)]/20">
                  <Sparkles size={14} className="text-[var(--color-atelier-terracota)]" />
                  <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)]">
                    {getRankName(profile.exp, profile.role)} • {profile.exp || 0} XP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            O FEED DO UTILIZADOR (LIMITADO A 700PX)
            ========================================== */}
        <div className="w-full max-w-[700px] mt-8 flex flex-col items-center">
          
          {/* BARRA DE NAVEGAÇÃO / ABAS NATIVAS */}
          <div className="flex w-full overflow-x-auto custom-scrollbar gap-2 mb-8 bg-white/60 p-2 rounded-full border border-white shadow-sm shrink-0">
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
                className={`flex-1 py-2.5 px-4 rounded-full font-roboto text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center gap-2
                  ${activeTab === tab.id ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/60 hover:bg-[var(--color-atelier-grafite)]/5'}
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-full flex flex-col gap-8">
            {filteredPosts.length === 0 ? (
              <div className="text-center p-14 opacity-50 flex flex-col items-center justify-center glass-panel rounded-[2.5rem]">
                <Sparkles size={40} className="mb-4 text-[var(--color-atelier-terracota)]" />
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Nenhuma partilha ainda.</h3>
              </div>
            ) : (
              <AnimatePresence>
                {filteredPosts.map((post, index) => {
                  const isLiked = post.is_liked_by_me;
                  const isCommentsOpen = expandedComments.includes(post.id);

                  return (
                    <motion.div 
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                      className="glass-panel rounded-[2.5rem] flex flex-col shadow-[0_10px_30px_rgba(122,116,112,0.05)] overflow-hidden border border-white bg-white/80 w-full"
                    >
                      <div className="p-6 pb-4 flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full border border-[var(--color-atelier-terracota)]/20 shadow-sm overflow-hidden shrink-0 flex items-center justify-center bg-[var(--color-atelier-grafite)] text-white font-elegant text-xl">
                            {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : post.profiles?.nome?.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-[14px] text-[var(--color-atelier-grafite)] flex items-center gap-2">
                              {post.profiles?.nome}
                            </span>
                            <div className="flex items-center gap-1.5 font-roboto text-[10px] text-[var(--color-atelier-grafite)]/40 mt-0.5">
                              <span className="font-bold text-[var(--color-atelier-terracota)]">@{post.profiles?.username || post.profiles?.nome?.toLowerCase().replace(/\s/g, '')}</span>
                              <span>•</span>
                              <span>{formatTime(post.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* BOTAO APAGAR MOSTRADO SÓ PARA O DONO OU ADMIN */}
                        {(isOwnProfile || currentUser?.role === 'admin') && activeTab !== 'aplausos' && (
                          <button onClick={() => confirmDeletePost(post.id)} className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-atelier-grafite)]/30 hover:bg-red-50 hover:text-red-500 transition-colors" title="Apagar">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div className="px-6 pb-4">
                        <p className="font-roboto text-[14px] leading-relaxed text-[var(--color-atelier-grafite)] whitespace-pre-wrap">
                          {post.text_content}
                        </p>
                      </div>

                      {post.image_url && (
                        <div onDoubleClick={() => handleLike(post.id)} className="w-full bg-[var(--color-atelier-grafite)]/5 relative cursor-pointer group">
                          <img src={post.image_url} alt="Publicação" className="w-full max-h-[600px] object-cover" />
                        </div>
                      )}

                      <div className="p-5 flex items-center justify-between bg-white/40 border-t border-white/50">
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleLike(post.id)} 
                            className={`px-4 py-2 rounded-full flex items-center gap-2 font-roboto text-[12px] font-bold transition-all ${isLiked ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)]' : 'bg-transparent text-[var(--color-atelier-grafite)]/60 hover:bg-[var(--color-atelier-grafite)]/5'}`}
                          >
                            <Heart size={18} className={isLiked ? 'fill-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)]' : ''} /> 
                            {post.likes_count || 0}
                          </button>
                          <button 
                            onClick={() => toggleComments(post.id)} 
                            className={`px-4 py-2 rounded-full flex items-center gap-2 font-roboto text-[12px] font-bold transition-all ${isCommentsOpen ? 'bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)]' : 'bg-transparent text-[var(--color-atelier-grafite)]/60 hover:bg-[var(--color-atelier-grafite)]/5'}`}
                          >
                            <MessageCircle size={18} /> Comentar
                          </button>
                        </div>
                        <button onClick={() => showToast("Link copiado para a área de transferência!")} className="p-2 text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] transition-colors rounded-full hover:bg-[var(--color-atelier-grafite)]/5">
                          <Share2 size={18} />
                        </button>
                      </div>

                      <AnimatePresence>
                        {isCommentsOpen && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-[var(--color-atelier-grafite)]/5 border-t border-[var(--color-atelier-grafite)]/5 flex flex-col"
                          >
                            <div className="flex flex-col gap-4 p-6 max-h-64 overflow-y-auto custom-scrollbar">
                              {!commentsData[post.id] ? (
                                <div className="flex justify-center p-2"><Loader2 size={16} className="animate-spin text-[var(--color-atelier-grafite)]/30" /></div>
                              ) : commentsData[post.id]?.length === 0 ? (
                                <div className="text-[12px] text-[var(--color-atelier-grafite)]/40 italic font-roboto text-center py-2">Sem comentários.</div>
                              ) : (
                                commentsData[post.id]?.map((comment: any) => (
                                  <div key={comment.id} className="flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-full border border-white overflow-hidden shrink-0 flex items-center justify-center bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] font-elegant text-xs shadow-sm">
                                      {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : comment.profiles?.nome?.charAt(0)}
                                    </div>
                                    <div className="flex flex-col flex-1 bg-white/60 p-3.5 rounded-2xl rounded-tl-none border border-white shadow-sm">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)]">{comment.profiles?.nome}</span>
                                        <span className="font-roboto text-[9px] font-bold text-[var(--color-atelier-grafite)]/40">{formatTime(comment.created_at)}</span>
                                      </div>
                                      <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/90 leading-snug">{comment.content}</p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                            
                            <div className="flex gap-3 items-center p-4 pt-2 bg-white/40 border-t border-[var(--color-atelier-grafite)]/5">
                              <input 
                                type="text" 
                                value={commentInputs[post.id] || ""} 
                                onChange={(e) => setCommentInputs({...commentInputs, [post.id]: e.target.value})}
                                placeholder="Escreva a sua opinião..." 
                                className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-full px-5 py-3 text-[13px] font-roboto outline-none focus:border-[var(--color-atelier-terracota)]/40 shadow-sm transition-colors"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSendComment(post.id); }}
                              />
                              <button 
                                onClick={() => handleSendComment(post.id)}
                                disabled={isSubmittingComment === post.id || !commentInputs[post.id]?.trim()}
                                className="w-12 h-12 rounded-full bg-[var(--color-atelier-terracota)] text-white flex items-center justify-center shrink-0 hover:bg-[#8c562e] transition-colors disabled:opacity-50 shadow-md"
                              >
                                {isSubmittingComment === post.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </>
  );
}