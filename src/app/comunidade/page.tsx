// src/app/comunidade/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe2, Trophy, Star, Medal, Sparkles, 
  UploadCloud, Send, Heart, MessageCircle, Share2, Award, 
  MoreVertical, Loader2, User, ImageIcon, CheckCircle2, AlertCircle, Trash2,
  Palette, MapPin, Target, Users, Clock, Flame, X, Lock
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ==========================================
// A RODA DO LEGADO (Catálogo Estrutural Mestre)
// ==========================================
const ERAS = [
  {
    id: "fundicao", name: "Era da Fundição", desc: "0 a 3 meses",
    missions: [
      { id: 1, name: "A Primeira Tinta", desc: "Primeira foto autêntica de um material impresso recebido da gráfica.", icon: <Palette size={16} />, exp: 150 },
      { id: 2, name: "Domínio do Território", desc: "A fachada física ou o ambiente de trabalho respirando a nova identidade.", icon: <MapPin size={16} />, exp: 200 },
      { id: 3, name: "O Novo Padrão", desc: "Lançamento oficial do novo site ou a virada de chave no feed.", icon: <Globe2 size={16} />, exp: 200 },
    ]
  },
  {
    id: "tracao", name: "Era da Tração", desc: "3 a 6 meses",
    missions: [
      { id: 4, name: "Primeiro Sangue", desc: "O primeiro contrato fechado onde o cliente relatou confiança na nova marca.", icon: <Target size={16} />, exp: 300 },
      { id: 5, name: "Caixa de Ressonância", desc: "A primeira campanha ou funil de vendas rodando ativamente com a IDV.", icon: <Sparkles size={16} />, exp: 300 },
      { id: 6, name: "Embaixadores", desc: "Foto natural da equipa ou de clientes reais utilizando os touchpoints.", icon: <Users size={16} />, exp: 250 },
    ]
  },
  {
    id: "expansao", name: "Era da Expansão", desc: "6 a 12 meses",
    missions: [
      { id: 7, name: "O Efeito Atelier", desc: "Indicação de um parceiro de negócios que assinou contrato com o atelier.", icon: <Flame size={16} />, exp: 1000 },
      { id: 8, name: "Sinergia de Elite", desc: "Collab ou parceria fechada com outro membro dentro da comunidade.", icon: <Award size={16} />, exp: 500 },
    ]
  },
  {
    id: "legado", name: "Era do Legado", desc: "1 ano +",
    missions: [
      { id: 9, name: "Prova do Tempo", desc: "Comemoração de 1 ano de consistência visual rigorosa na marca.", icon: <Clock size={16} />, exp: 800 },
      { id: 10, name: "Titã do Mercado", desc: "Alcançou um marco de faturação, abriu filial ou saiu num veículo de media.", icon: <Trophy size={16} />, exp: 1500 },
    ]
  }
];

export default function ComunidadePage() {
  // ==========================================
  // ESTADOS GERAIS
  // ==========================================
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [exp, setExp] = useState(0);
  const [posts, setPosts] = useState<any[]>([]);
  
  const [newPostText, setNewPostText] = useState("");
  const [newPostImagePreview, setNewPostImagePreview] = useState<string | null>(null);
  const [newPostImageFile, setNewPostImageFile] = useState<File | null>(null);

  // Estados de Interface e Lógica Real
  const [activeEra, setActiveEra] = useState("fundicao");
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [completedMissions, setCompletedMissions] = useState<number[]>([]); 

  // Estados de Comentários
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [commentsData, setCommentsData] = useState<Record<string, any[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<string | null>(null);
  
  const feedRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // 1. CARREGA DADOS (LÓGICA CORRIGIDA)
  // ==========================================
  const fetchCommunityData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // 1.1 Perfil e EXP REAL
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profileData) {
        setUserProfile(profileData);
        setExp(profileData.exp || 0); // Define o EXP real vindo do banco
      }

      // 1.2 Missões Completadas (Busca REAL do banco)
      const { data: userMissions } = await supabase.from('user_missions').select('mission_id').eq('user_id', session.user.id);
      if (userMissions) {
        setCompletedMissions(userMissions.map(m => m.mission_id));
      }

      // 1.3 Feed de Posts
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*, profiles(nome, avatar_url, role)')
        .order('created_at', { ascending: false });
      
      if (postsError) throw postsError;

      // 1.4 Lógica de Curtidas Real
      const { data: myLikes } = await supabase.from('post_likes').select('post_id').eq('user_id', session.user.id);
      const myLikedPostIds = myLikes?.map(like => like.post_id) || [];

      if (postsData) {
        const postsWithLikes = postsData.map(post => ({
          ...post,
          is_liked_by_me: myLikedPostIds.includes(post.id)
        }));
        setPosts(postsWithLikes);
      }

    } catch (error) {
      console.error("Erro ao carregar comunidade:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityData();
  }, []);

  // ==========================================
  // RANKS DINÂMICOS (Baseado no EXP Mestre)
  // ==========================================
  const getRankName = (currentExp: number) => {
    if (currentExp < 1000) return "Visionário";
    if (currentExp < 3000) return "Vanguardista";
    return "Titã do Legado";
  };

  const currentLevel = Math.floor(exp / 1000) + 1;
  const expInCurrentLevel = exp % 1000;
  const progressPercentage = (expInCurrentLevel / 1000) * 100;
  const rankName = getRankName(exp);

  // ==========================================
  // FUNÇÕES DE PUBLICAÇÃO
  // ==========================================
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

      const { data: insertedPost, error: dbError } = await supabase
        .from('community_posts')
        .insert({
          author_id: userProfile.id,
          text_content: newPostText,
          image_url: imageUrl,
          status: userProfile.role === 'admin' ? 'approved' : 'pending' 
        })
        .select('*, profiles(nome, avatar_url, role)');

      if (dbError) throw dbError;

      if (insertedPost) {
        setPosts(prev => [{ ...insertedPost[0], is_liked_by_me: false, likes_count: 0 }, ...prev]);
      }
      
      setNewPostText(""); setNewPostImagePreview(null); setNewPostImageFile(null);
      feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      showToast(userProfile.role !== 'admin' ? "Publicação enviada para análise do Atelier." : "Publicado com sucesso!");

    } catch (error) {
      console.error(error);
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
      showToast("Publicação aprovada!");
    } catch (error) {
      showToast("Erro ao aprovar publicação.");
    }
  };

  // ==========================================
  // FUNÇÕES DE INTERAÇÃO (Aplausos Blindados)
  // ==========================================
  const handleLike = async (postId: string) => {
    if (!userProfile) return;
    
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    const post = posts[postIndex];
    const isLiking = !post.is_liked_by_me;
    const newLikesCount = isLiking ? (post.likes_count || 0) + 1 : Math.max(0, (post.likes_count || 0) - 1);

    // 1. Atualização Optimista (Atualiza a tela na hora)
    setPosts(prevPosts => prevPosts.map(p => p.id === postId ? { 
      ...p, 
      likes_count: newLikesCount,
      is_liked_by_me: isLiking
    } : p));

    try {
      // 2. Grava ou Remove da tabela de histórico de likes
      if (isLiking) {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: userProfile.id });
      } else {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userProfile.id);
      }

      // 3. FORÇA a atualização da contagem direta no banco de dados (Ignora falha de triggers)
      await supabase.from('community_posts').update({ likes_count: newLikesCount }).eq('id', postId);

    } catch (error) {
      console.error("Erro no aplauso:", error);
      showToast("Erro ao processar aplauso. A sincronizar...");
      fetchCommunityData(); // Reverte caso algo falhe
    }
  };

  const toggleComments = async (postId: string) => {
    if (expandedComments.includes(postId)) {
      setExpandedComments(expandedComments.filter(id => id !== postId));
    } else {
      setExpandedComments([...expandedComments, postId]);
      // Busca os comentários se a gaveta abrir
      if (!commentsData[postId]) {
        const { data } = await supabase
          .from('post_comments')
          .select('*, profiles(nome, avatar_url)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });
        if (data) {
          setCommentsData(prev => ({ ...prev, [postId]: data }));
        }
      }
    }
  };

  const handleSendComment = async (postId: string) => {
    const content = commentInputs[postId];
    if (!content?.trim() || !userProfile) return;

    setIsSubmittingComment(postId);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({ post_id: postId, user_id: userProfile.id, content: content.trim() })
        .select('*, profiles(nome, avatar_url)');

      if (error) throw error;

      if (data) {
        setCommentsData(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data[0]]
        }));
        setCommentInputs(prev => ({ ...prev, [postId]: "" }));
      }
    } catch (error) {
      showToast("Erro ao enviar comentário.");
    } finally {
      setIsSubmittingComment(null);
    }
  };

  // ==========================================
  // EXCLUSÃO BLINDADA (Fim do Bug do Post que Volta)
  // ==========================================
  const handleDeleteRequest = (postId: string) => {
    setPostToDelete(postId);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;

    try {
      // 1. PRIMEIRO: Destruir todas as dependências do post (Força a limpeza manual para evitar conflitos de Foreign Keys)
      await supabase.from('post_likes').delete().eq('post_id', postToDelete);
      await supabase.from('post_comments').delete().eq('post_id', postToDelete);
      await supabase.from('user_missions').delete().eq('post_id', postToDelete);

      // 2. DEPOIS: Apagar o post principal
      const { error } = await supabase.from('community_posts').delete().eq('id', postToDelete);
      if (error) throw error;

      // 3. Atualizar a Interface
      setPosts(prevPosts => prevPosts.filter(p => p.id !== postToDelete));
      showToast("A publicação foi apagada da comunidade.");
    } catch (error) {
      showToast("Erro ao apagar publicação.");
      console.error(error);
    } finally {
      setPostToDelete(null);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  const activeEraData = ERAS.find(e => e.id === activeEra);

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (ESTÉTICA ATELIER) */}
      <AnimatePresence>
        {postToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPostToDelete(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="bg-[#FEF5E6] border border-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-4 shadow-inner border border-red-200">
                <Trash2 size={24} />
              </div>
              <h2 className="font-elegant text-3xl text-[#5c4b3c] mb-2">Apagar Publicação?</h2>
              <p className="font-roboto text-[13px] text-[#5c4b3c]/70 mb-8 leading-relaxed">Esta ação é irreversível. A sua partilha será permanentemente removida do mural da comunidade.</p>
              
              <div className="flex w-full gap-3">
                <button onClick={() => setPostToDelete(null)} className="flex-1 py-3.5 rounded-xl border border-[#8c6e54]/30 font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54] hover:bg-[#8c6e54]/5 transition-colors">Cancelar</button>
                <button onClick={confirmDeletePost} className="flex-1 py-3.5 rounded-xl bg-red-500 text-white font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-red-600 shadow-md hover:-translate-y-0.5 transition-all">Sim, Apagar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/60 text-[var(--color-atelier-grafite)] px-4 py-1.5 rounded-full flex items-center gap-2 border border-white shadow-sm">
              <Globe2 size={14} className="text-[var(--color-atelier-terracota)]" />
              <span className="font-roboto text-[10px] uppercase tracking-widest font-bold">O Atelier</span>
            </span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Comunidade & <span className="text-[var(--color-atelier-terracota)] italic">Status.</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60 max-w-sm text-right">
            Partilhe resultados, construa autoridade e conecte-se. A sua evolução dita o seu lugar na Roda do Legado.
          </p>
        </div>
      </header>

      <div className="flex gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* COLUNA ESQUERDA: PERFIL GAMIFICADO (35%) */}
        <div className="w-[350px] flex flex-col gap-6 h-full shrink-0">
          
          {/* Cartão de Status (Nível e EXP) */}
          <div className="glass-panel p-8 rounded-[2.5rem] bg-gradient-to-br from-[var(--color-atelier-grafite)] to-[#2a2826] text-white shadow-[0_20px_50px_rgba(122,116,112,0.15)] flex flex-col items-center text-center relative overflow-hidden shrink-0">
            <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-[var(--color-atelier-terracota)]/20 blur-[40px] rounded-full pointer-events-none"></div>
            <div className="w-24 h-24 rounded-full border-4 border-white/10 p-1 relative mb-4 shadow-xl">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-[var(--color-atelier-terracota)] flex items-center justify-center font-elegant text-4xl">{userProfile?.nome?.charAt(0) || "U"}</div>
              )}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[var(--color-atelier-terracota)] border-2 border-[var(--color-atelier-grafite)] flex items-center justify-center font-elegant text-sm text-white shadow-lg">
                {currentLevel}
              </div>
            </div>
            
            <h2 className="font-elegant text-2xl mb-1">{userProfile?.nome || "Membro"}</h2>
            <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/10 px-3 py-1 rounded-full border border-[var(--color-atelier-terracota)]/20 mb-6">
              {userProfile?.role === 'admin' ? 'Fundadora (Mentor)' : rankName}
            </span>

            <div className="w-full flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-white/70">Prestígio Comercial</span>
                <span className="font-roboto text-[12px] font-bold text-[var(--color-atelier-terracota)]">{expInCurrentLevel} / 1000 EXP</span>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden shadow-inner">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-[var(--color-atelier-terracota)] rounded-full relative">
                  <div className="absolute inset-0 bg-white/20 w-full animate-[slideRight_2s_ease-in-out_infinite]"></div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* A Roda do Legado (Dinâmica com o Banco de Dados) */}
          <div className="glass-panel p-6 rounded-[2.5rem] bg-white/60 border border-white flex-1 flex flex-col min-h-0 shadow-[0_10px_30px_rgba(122,116,112,0.05)] relative overflow-hidden group/widget">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--color-atelier-terracota)]/5 rounded-full blur-3xl transition-colors duration-700 pointer-events-none z-0"></div>

            <div className="flex flex-col mb-4 relative z-10">
              <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                <Medal size={18} className="text-[var(--color-atelier-terracota)]" /> A Roda do Legado
              </h3>
            </div>

            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mb-3 shrink-0 relative z-10">
              {ERAS.map(era => {
                const isActive = activeEra === era.id;
                return (
                  <button 
                    key={era.id} 
                    onClick={() => setActiveEra(era.id)}
                    className={`relative px-4 py-2 rounded-xl font-roboto text-[9px] uppercase tracking-widest font-bold whitespace-nowrap transition-colors duration-300 ${isActive ? 'text-white' : 'text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)]'}`}
                  >
                    {isActive && (
                      <motion.div layoutId="eraTab" className="absolute inset-0 bg-[var(--color-atelier-terracota)] rounded-xl shadow-sm" initial={false} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} style={{ zIndex: -1 }} />
                    )}
                    <span className="relative z-10">{era.name}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3 relative z-10">
              <motion.div key={`foco-${activeEra}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)]/80 mb-1 px-1 flex items-center gap-1.5">
                <Target size={10} /> Foco: {activeEraData?.desc}
              </motion.div>
              
              <AnimatePresence mode="wait">
                <motion.div key={activeEra} variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }} initial="hidden" animate="show" exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }} className="flex flex-col gap-3">
                  {activeEraData?.missions.map(mission => {
                    // VERIFICAÇÃO EXATA NO ARRAY DE MISSÕES COMPLETADAS
                    const isCompleted = completedMissions.includes(mission.id);

                    return (
                      <motion.div 
                        key={mission.id} 
                        variants={{ hidden: { opacity: 0, y: 20, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } } }}
                        whileHover={isCompleted ? { scale: 1.02, y: -2 } : {}}
                        className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-3 relative overflow-hidden group/mission ${isCompleted ? 'bg-white border-[var(--color-atelier-terracota)]/20 shadow-[0_4px_15px_rgba(173,111,64,0.05)] cursor-pointer' : 'bg-white/30 border-white/50 opacity-70 grayscale hover:grayscale-0 hover:opacity-100 hover:bg-white/50 cursor-default'}`}
                      >
                        {isCompleted && <div className="absolute right-0 top-0 w-1 h-full bg-green-500/80 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>}

                        <div className="flex items-start gap-3 relative z-10">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-colors duration-500 ${isCompleted ? 'bg-gradient-to-br from-[var(--color-atelier-terracota)] to-[#8c562e] text-white' : 'bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]'}`}>
                            {mission.icon}
                          </div>
                          <div className="flex flex-col flex-1 pt-0.5">
                            <div className="flex justify-between items-start">
                              <span className={`font-roboto text-[13px] font-bold leading-tight ${isCompleted ? 'text-[var(--color-atelier-grafite)]' : 'text-[var(--color-atelier-grafite)]/60'}`}>{mission.name}</span>
                              <span className={`font-roboto text-[10px] font-bold px-2 py-0.5 rounded-full ${isCompleted ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)]'}`}>
                                {isCompleted ? <span className="flex items-center gap-1"><CheckCircle2 size={10}/> Validada</span> : `+${mission.exp} XP`}
                              </span>
                            </div>
                            <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/60 mt-1.5 leading-relaxed">{mission.desc}</span>
                          </div>
                        </div>
                        
                        {!isCompleted && (
                          <div className="w-full bg-[var(--color-atelier-grafite)]/5 p-2 rounded-xl mt-1 flex items-center justify-center gap-1.5 opacity-0 group-hover/mission:opacity-100 transition-opacity duration-300">
                             <Lock size={12} className="text-[var(--color-atelier-grafite)]/40" />
                             <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">Requer partilha visual no mural</span>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA: O FEED */}
        <div className="flex-1 flex flex-col h-full min-h-0 relative">
          
          <div ref={feedRef} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 pb-6 pt-2 pr-2">
            <AnimatePresence>
              
              {posts.length === 0 && (
                 <div className="text-center p-10 opacity-50 flex flex-col items-center h-full justify-center">
                   <Globe2 size={40} className="mb-4 text-[var(--color-atelier-terracota)]" />
                   <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">O Atelier está silencioso.</h3>
                   <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2">Seja o primeiro a partilhar os resultados da sua marca!</p>
                 </div>
              )}

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
                    className={`glass-panel p-6 rounded-[2.5rem] border flex flex-col gap-4 shadow-[0_10px_30px_rgba(122,116,112,0.05)] transition-all ${isPending ? 'bg-white/40 border-orange-200/50 opacity-90' : 'bg-white/80 border-white'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full border border-white shadow-sm overflow-hidden shrink-0 flex items-center justify-center bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] font-elegant text-xl">
                          {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt={post.profiles.nome} className="w-full h-full object-cover" /> : post.profiles?.nome?.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-[14px] text-[var(--color-atelier-grafite)] flex items-center gap-2">
                            {post.profiles?.nome || "Membro"}
                            {isPending && (
                              <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-roboto text-[9px] uppercase tracking-widest font-black border border-orange-200 flex items-center gap-1">
                                <AlertCircle size={10} /> Em Análise
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2 font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 mt-0.5">
                            <span>{post.profiles?.role === 'admin' ? 'Mentor VRTICE' : 'Membro Premium'}</span>
                            <span>•</span>
                            <span>{formatTime(post.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isPending && isAdmin && (
                           <button onClick={() => handleApprovePost(post.id)} className="bg-green-500 text-white px-4 py-2 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest shadow-md hover:bg-green-600 transition-colors flex items-center gap-2">
                             <CheckCircle2 size={14} /> Aprovar Publicação
                           </button>
                        )}
                        {(isAdmin || isMyPost) && (
                          <button onClick={() => handleDeleteRequest(post.id)} className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-atelier-grafite)]/30 hover:bg-red-50 hover:text-red-500 transition-colors" title="Apagar Publicação">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="font-roboto text-[14px] leading-relaxed text-[var(--color-atelier-grafite)] whitespace-pre-wrap px-1">
                      {post.text_content}
                    </p>

                    {post.image_url && (
                      <div onClick={() => window.open(post.image_url, "_blank")} className="w-full rounded-2xl overflow-hidden border-[4px] border-white shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                        <img src={post.image_url} alt="Publicação" className="w-full max-h-[400px] object-cover" />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-[var(--color-atelier-grafite)]/5 mt-2 px-1">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleLike(post.id)} 
                          disabled={isPending} 
                          className={`px-4 py-2 rounded-xl bg-white/60 hover:bg-white border border-white shadow-sm flex items-center gap-2 font-roboto text-[11px] font-bold transition-colors disabled:opacity-50 ${isLiked ? 'text-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)]/20' : 'text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-terracota)]'}`}
                        >
                          <Heart size={14} className={isLiked ? 'fill-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)]' : ''} /> 
                          {post.likes_count || 0} Aplausos
                        </button>
                        <button 
                          onClick={() => toggleComments(post.id)} 
                          disabled={isPending} 
                          className={`px-4 py-2 rounded-xl bg-white/60 hover:bg-white border border-white shadow-sm flex items-center gap-2 font-roboto text-[11px] font-bold transition-colors disabled:opacity-50 ${isCommentsOpen ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-terracota)]'}`}
                        >
                          <MessageCircle size={14} /> Comentar
                        </button>
                      </div>
                      <button disabled={isPending} onClick={() => showToast("Link copiado para a área de transferência!")} className="p-2 text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] transition-colors disabled:opacity-50">
                        <Share2 size={16} />
                      </button>
                    </div>

                    {/* A GAVETA DE COMENTÁRIOS NATIVA (Real) */}
                    <AnimatePresence>
                      {isCommentsOpen && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-[var(--color-atelier-grafite)]/5 pt-4 mt-2 flex flex-col gap-4"
                        >
                          {/* Lista de Comentários */}
                          <div className="flex flex-col gap-3 px-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {!commentsData[post.id] ? (
                              <div className="flex justify-center p-2"><Loader2 size={14} className="animate-spin text-[var(--color-atelier-grafite)]/30" /></div>
                            ) : commentsData[post.id]?.length === 0 ? (
                              <div className="text-[11px] text-[var(--color-atelier-grafite)]/40 italic font-roboto">Sem comentários. Seja o primeiro a inspirar!</div>
                            ) : (
                              commentsData[post.id]?.map((comment: any) => (
                                <div key={comment.id} className="flex gap-3 items-start bg-white/40 p-3 rounded-2xl border border-white shadow-sm">
                                  <div className="w-8 h-8 rounded-full border border-white overflow-hidden shrink-0 flex items-center justify-center bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] font-elegant text-xs">
                                    {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : comment.profiles?.nome?.charAt(0)}
                                  </div>
                                  <div className="flex flex-col flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)]">{comment.profiles?.nome}</span>
                                      <span className="font-roboto text-[9px] font-bold text-[var(--color-atelier-grafite)]/40">{formatTime(comment.created_at)}</span>
                                    </div>
                                    <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/80 leading-snug">{comment.content}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          
                          {/* Enviar Novo Comentário */}
                          <div className="flex gap-2 items-center">
                            <input 
                              type="text" 
                              value={commentInputs[post.id] || ""} 
                              onChange={(e) => setCommentInputs({...commentInputs, [post.id]: e.target.value})}
                              placeholder="Escreva um comentário..." 
                              className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-full px-4 py-2.5 text-[12px] font-roboto outline-none focus:border-[var(--color-atelier-terracota)]/40 shadow-sm"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSendComment(post.id); }}
                            />
                            <button 
                              onClick={() => handleSendComment(post.id)}
                              disabled={isSubmittingComment === post.id || !commentInputs[post.id]?.trim()}
                              className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)] text-white flex items-center justify-center shrink-0 hover:bg-[#8c562e] transition-colors disabled:opacity-50"
                            >
                              {isSubmittingComment === post.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={14} className="ml-0.5" />}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          <div className="glass-panel p-4 rounded-[2rem] bg-white/90 border border-white shadow-[0_-10px_40px_rgba(122,116,112,0.1)] shrink-0 z-20 mt-4">
            {newPostImagePreview && (
              <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-white shadow-sm mb-3 ml-2">
                <img src={newPostImagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button type="button" onClick={() => {setNewPostImagePreview(null); setNewPostImageFile(null)}} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors text-xs backdrop-blur-sm">✕</button>
              </div>
            )}
            <form onSubmit={handlePublish} className="flex items-center gap-3">
              <label className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] hover:bg-[var(--color-atelier-creme)] transition-colors cursor-pointer shrink-0">
                <ImageIcon size={20} />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isPublishing} />
              </label>
              <input type="text" value={newPostText} onChange={(e) => setNewPostText(e.target.value)} disabled={isPublishing} placeholder="Partilhe a vitória da sua marca. Como ela respira hoje no mundo real?" className="flex-1 bg-transparent border-none outline-none font-roboto text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 px-2 disabled:opacity-50" />
              <button type="submit" disabled={!newPostText.trim() || isPublishing} className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--color-atelier-terracota)] text-white hover:bg-[#8c562e] transition-transform shadow-md disabled:opacity-50 disabled:bg-[var(--color-atelier-grafite)]/10 disabled:text-[var(--color-atelier-grafite)]/30 shrink-0 hover:-translate-y-0.5">
                {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-1" />}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}