"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Grid, CheckCircle2, AlertCircle, CalendarClock, MessageSquare, Loader2, X, 
  ChevronRight, ChevronLeft, Heart, Bookmark, Share2, MoreHorizontal, RefreshCw, Edit3, Sparkles, Pencil
} from "lucide-react";
import { supabase } from "../../lib/supabase";

// Mock data fallback com legendas simuladas
const MOCK_POSTS = [
  {
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=600&h=600",
    caption: "Conectar estética e propósito é a alma do nosso design. Cada detalhe pensado para transmitir autoridade e elegância no feed de Julho. ✨"
  },
  {
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=600&h=600",
    caption: "Linhas limpas, tons sóbrios e um alinhamento visual que atrai olhares exigentes. A simplicidade como sinônimo de sofisticação."
  },
  {
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=600&h=600",
    caption: "Uma identidade marcante não precisa gritar. Ela se afirma nos vazios bem construídos e no contraste tipográfico perfeito."
  },
  {
    image: "https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&q=80&w=600&h=600",
    caption: "Espaços que inspiram. A curadoria de conteúdo desta semana foi planejada para destacar seus diferenciais de mercado."
  },
  {
    image: "https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&q=80&w=600&h=600",
    caption: "Design com intenção: como o direcionamento de arte fortalece a percepção de valor dos seus produtos."
  },
  {
    image: "https://images.unsplash.com/photo-1618220179428-22790b46a0eb?auto=format&fit=crop&q=80&w=600&h=600",
    caption: "Composição harmônica e fluidez. O equilíbrio que a sua marca merece no ambiente digital."
  },
  {
    image: "https://images.unsplash.com/photo-1616486701797-0f33f61038ec?auto=format&fit=crop&q=80&w=600&h=600",
    caption: "Sombra, luz e arquitetura de marca. A narrativa visual do planejamento estratégico de mídia."
  },
  {
    image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=600&h=600",
    caption: "Identidade que inspira confiança. A cada publicação, um degrau a mais na consolidação do seu posicionamento premium."
  },
  {
    image: "https://images.unsplash.com/photo-1600607686027-6c8c634c4491?auto=format&fit=crop&q=80&w=600&h=600",
    caption: "Seja inesquecível. A harmonia visual entre todas as postagens garante a coesão do seu perfil."
  }
];

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function SimuladorFeedPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  // Estados de Dados do Instagram (Apify + Supabase)
  const [instagramData, setInstagramData] = useState<any>({
    username: '',
    full_name: 'Cliente Atelier',
    biography: '✨ Posicionamento de marca & presença digital.\nStudio Atelier • Gestão Estratégica.',
    avatar_url: null,
    followers_count: 1420,
    following_count: 482,
    posts_count: 9
  });

  const [feedPosts, setFeedPosts] = useState<Array<{ image: string; caption: string }>>([]);

  // Estados dos Modais
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [inputUsername, setInputUsername] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Estados de Interação de Aprovação
  const [status, setStatus] = useState<'pending' | 'approved' | 'revision'>('pending');
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para modal de expansão de post (Vislumbre)
  const [expandedPostIndex, setExpandedPostIndex] = useState<number | null>(null);

  // Busca do perfil do cliente e dados salvos no Supabase
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionUserId(session.user.id);
        
        // Buscar perfil
        const { data: profile } = await supabase.from('profiles').select('nome, avatar_url').eq('id', session.user.id).single();
        if (profile) setClientProfile(profile);

        // Buscar projeto ativo do cliente com fallback seguro
        let activeProjId: string | null = null;
        const { data: proj } = await supabase.from('projects').select('id').eq('client_id', session.user.id).in('status', ['active', 'delivered']).limit(1).maybeSingle();
        if (proj) {
          activeProjId = proj.id;
        } else {
          const { data: prof } = await supabase.from('profiles').select('project_id').eq('id', session.user.id).maybeSingle();
          if (prof?.project_id) {
            activeProjId = prof.project_id;
          } else {
            const { data: fallbackProj } = await supabase.from('projects').select('id').limit(1).maybeSingle();
            if (fallbackProj) activeProjId = fallbackProj.id;
          }
        }

        if (activeProjId) {
          setProjectId(activeProjId);
          
          // Buscar perfil salvo em instagram_profiles
          const { data: igProfile } = await supabase.from('instagram_profiles').select('*').eq('project_id', activeProjId).maybeSingle();
          if (igProfile && igProfile.username) {
            setInstagramData(igProfile);
            setInputUsername(igProfile.username);
          }
          
          // Buscar posts salvos da raspagem do instagram
          const { data: dbPosts } = await supabase.from('instagram_feed_posts').select('*').eq('project_id', activeProjId).order('display_order', { ascending: true });
          
          // Buscar posts criados pelo Atelier (social_posts aprovados)
          const { data: atelierPosts } = await supabase.from('social_posts').select('*').eq('project_id', activeProjId).eq('status', 'approved').order('created_at', { ascending: false });
          
          let combinedPosts: Array<{image: string, caption: string}> = [];
          
          if (atelierPosts && atelierPosts.length > 0) {
            combinedPosts = [...combinedPosts, ...atelierPosts.map(p => ({ image: p.image_url, caption: p.caption || "" }))];
          }
          
          if (dbPosts && dbPosts.length > 0) {
            combinedPosts = [...combinedPosts, ...dbPosts.map(p => ({ image: p.image_url, caption: p.caption || "" }))];
          }
          
          if (combinedPosts.length > 0) {
            setFeedPosts(combinedPosts);
          }
        }
      }
      setTimeout(() => setIsLoading(false), 600);
    };
    fetchData();
  }, []);

  // Sincronizar Username com Apify e salvar no Supabase
  const handleSyncInstagram = async (targetUsername?: string) => {
    const userToSync = targetUsername || inputUsername;
    if (!userToSync.trim()) {
      showToast("Informe o username do Instagram.");
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userToSync,
          projectId: projectId,
          clientId: sessionUserId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInstagramData(data.profile);
        showToast(data.syncedWithApify ? "Dados atualizados via Apify com sucesso!" : "Username vinculado com sucesso!");
        setIsSyncModalOpen(false);

        // Re-buscar posts do banco caso tenham sido sincronizados
        if (projectId) {
          const { data: dbPosts } = await supabase.from('instagram_feed_posts').select('*').eq('project_id', projectId).order('display_order', { ascending: true });
          if (dbPosts && dbPosts.length > 0) {
            setFeedPosts(dbPosts.map(p => ({ image: p.image_url, caption: p.caption || "" })));
          }
        }
      } else {
        showToast(data.error || "Erro ao sincronizar com Instagram.");
      }
    } catch (err) {
      console.error(err);
      showToast("Falha na comunicação com o servidor de sincronização.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionFeedback.trim()) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom',
          to: 'lizbranddesign@gmail.com', // or the admin email
          data: {
            subject: 'Revisão Solicitada: Simulador de Feed',
            body: `O cliente (Projeto ID: ${projectId}) solicitou uma revisão no Simulador de Feed.<br><br><strong>Instruções do Cliente:</strong><br>"${revisionFeedback}"`
          }
        })
      });
      
      setStatus('revision');
      setIsRevisionModalOpen(false);
      showToast("Revisão solicitada! A equipe receberá um e-mail com os detalhes.");
    } catch(e) {
      showToast("Erro ao enviar solicitação de revisão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Posts finais: se feedPosts estiver preenchido usa do banco/Apify, caso contrário usa MOCK_POSTS
  const activePosts = feedPosts.length > 0 ? feedPosts : MOCK_POSTS;
  const invertedPosts = [...activePosts].reverse();

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-60px)] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-auto min-h-[calc(100dvh-60px)] max-w-[1200px] mx-auto relative z-10 pb-12 gap-8 px-4 md:px-6">
      
      {/* 1. CABEÇALHO LIMPO COM BOTÃO DE VINCULAÇÃO/APIFY */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] w-7 h-7 rounded-lg flex items-center justify-center">
              <Grid size={14} />
            </span>
            <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60">Simulação de Perfil</span>
          </div>
          <h1 className="font-elegant text-3xl md:text-4xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Simulador de <span className="text-[var(--color-atelier-terracota)] italic">Feed.</span>
          </h1>
        </div>

        {/* BOTÃO VINCULAR INSTAGRAM DISCRETO (SÓ EXIBE SE AINDA NÃO TIVER USERNAME CADASTRADO) */}
        {!instagramData?.username && (
          <button
            type="button"
            onClick={() => setIsSyncModalOpen(true)}
            className="font-roboto text-[11px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] bg-white/70 hover:bg-white border border-gray-200/80 px-3.5 py-1.5 rounded-full shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Edit3 size={13} className={isSyncing ? 'animate-spin text-[var(--color-atelier-terracota)]' : ''} />
            <span>Cadastrar @</span>
          </button>
        )}
      </header>

      {/* 2. ESTRUTURA SEM BORDAS DO CONTAINER (SIMULAÇÃO REAL DO INSTAGRAM) */}
      <div className="w-full max-w-[500px] mx-auto flex flex-col items-center gap-6 animate-[fadeInUp_0.6s_ease-out_0.1s_both]">
        
        {/* CONTAINER DO PERFIL INSTAGRAM COM BORDAS ARREDONDADAS */}
        <div className="w-full bg-white flex flex-col rounded-[2.5rem] overflow-hidden border border-gray-100/80 shadow-md">
          
          {/* HEADER DO PERFIL INSTAGRAM */}
          <div className="p-4 md:p-6 flex flex-col gap-4 border-b border-gray-100">
            <div className="flex items-center justify-between gap-4">
              {/* Foto de Perfil com Anel de Story */}
              <div className="p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 rounded-full shrink-0">
                <div className="w-18 h-18 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-white bg-gray-100 flex items-center justify-center">
                  {clientProfile?.avatar_url || instagramData?.avatar_url ? (
                    <img src={clientProfile?.avatar_url || instagramData?.avatar_url} referrerPolicy="no-referrer" alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-elegant text-2xl font-bold text-[var(--color-atelier-grafite)]">
                      {(clientProfile?.nome || instagramData?.full_name || "C").charAt(0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Estatísticas de Perfil */}
              <div className="flex-1 flex items-center justify-around text-center">
                <div className="flex flex-col">
                  <span className="font-roboto font-bold text-sm md:text-base text-gray-900 leading-tight">
                    {instagramData?.posts_count || 9}
                  </span>
                  <span className="font-roboto text-[11px] text-gray-500">publicações</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-roboto font-bold text-sm md:text-base text-gray-900 leading-tight">
                    {instagramData?.followers_count ? (instagramData.followers_count >= 1000 ? `${(instagramData.followers_count / 1000).toFixed(1)}k` : instagramData.followers_count) : '1.4k'}
                  </span>
                  <span className="font-roboto text-[11px] text-gray-500">seguidores</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-roboto font-bold text-sm md:text-base text-gray-900 leading-tight">
                    {instagramData?.following_count || 482}
                  </span>
                  <span className="font-roboto text-[11px] text-gray-500">seguindo</span>
                </div>
              </div>
            </div>

            {/* Informações da Bio */}
            <div className="flex flex-col gap-0.5 mt-1">
              <div className="flex items-center gap-2">
                <h2 className="font-roboto font-bold text-sm text-gray-900 leading-snug">
                  {instagramData?.full_name || clientProfile?.nome || "Cliente Atelier"}
                </h2>
                {!instagramData?.username ? (
                  <div className="flex items-center gap-1.5 ml-1">
                    {isSyncModalOpen ? (
                      <div className="flex items-center bg-gray-50 rounded-md border border-gray-200 px-2 py-0.5">
                        <span className="text-xs text-gray-400 mr-1">@</span>
                        <input 
                          type="text" 
                          autoFocus
                          value={inputUsername}
                          onChange={(e) => setInputUsername(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSyncInstagram();
                            if (e.key === 'Escape') setIsSyncModalOpen(false);
                          }}
                          className="bg-transparent border-none outline-none text-xs text-gray-600 w-24 p-0 focus:ring-0"
                          placeholder="usuario"
                        />
                        <button onClick={() => handleSyncInstagram()} disabled={isSyncing} className="text-blue-500 hover:text-blue-600 ml-1">
                          {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsSyncModalOpen(true)}
                        className="text-xs text-gray-400 font-normal hover:text-blue-500 flex items-center gap-1 transition-colors"
                        title="Adicionar @ do Instagram"
                      >
                        adicionar @ <Pencil size={10} />
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 font-normal">
                    @{instagramData.username}
                  </span>
                )}
              </div>
              <span className="font-roboto text-[11px] text-gray-500 font-medium">Design & Estratégia Visual</span>
              <p className="font-roboto text-xs text-gray-800 leading-normal mt-1 whitespace-pre-line">
                {instagramData?.biography || "✨ Posicionamento de marca & presença digital.\nStudio Atelier • Gestão Estratégica."}
              </p>
            </div>

            {/* Botões Fictícios de Interação do Perfil */}
            <div className="flex gap-2 mt-2">
              <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-roboto text-xs font-bold py-1.5 rounded-lg transition-colors cursor-default">
                Seguindo
              </button>
              <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-roboto text-xs font-bold py-1.5 rounded-lg transition-colors cursor-default">
                Mensagem
              </button>
            </div>
          </div>

          {/* ABA DO FEED (GRADE ATIVA) */}
          <div className="flex items-center justify-center border-b border-gray-200 py-2">
            <div className="flex items-center gap-2 text-[var(--color-atelier-terracota)] font-bold text-xs uppercase tracking-wider border-b-2 border-[var(--color-atelier-terracota)] pb-2 -mb-2 px-4">
              <Grid size={16} />
              <span>Publicações</span>
            </div>
          </div>

          {/* GRADE DO FEED 3X3 (ORDEM INVERTIDA) */}
          <div className="grid grid-cols-3 gap-[2px] bg-gray-100">
            {invertedPosts.map((post, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setExpandedPostIndex(i)}
                className="aspect-square relative group overflow-hidden bg-gray-200 cursor-pointer"
              >
                <img 
                  src={post.image} 
                  alt={`Publicação ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-white font-roboto text-[10px] uppercase font-bold tracking-widest bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full">
                    Expandir
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

        </div>

        {/* 🟢 BOTÃO DE SOLICITAR REVISÃO (SOLTO) */}
        <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
          <button 
            type="button"
            onClick={() => setIsRevisionModalOpen(true)}
            disabled={isSubmitting}
            className="flex-1 bg-white border border-gray-300 text-[var(--color-atelier-grafite)] hover:bg-gray-50 py-4 px-6 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-sm active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            Solicitar Revisão
          </button>
        </div>

      </div>

      {/* 🟢 MODAL LIGHTBOX DE VISLUMBRE (EXPANDIR POST COM LEGENDA E NAVEGAÇÃO) */}
      <AnimatePresence>
        {expandedPostIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            onClick={() => setExpandedPostIndex(null)}
          >
            <div 
              className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              {/* Botão Fechar */}
              <button 
                onClick={() => setExpandedPostIndex(null)}
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Seta Anterior */}
              <button 
                onClick={() => setExpandedPostIndex(prev => (prev !== null ? (prev - 1 + invertedPosts.length) % invertedPosts.length : 0))}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Seta Próximo */}
              <button 
                onClick={() => setExpandedPostIndex(prev => (prev !== null ? (prev + 1) % invertedPosts.length : 0))}
                className="absolute right-14 md:right-4 top-4 md:top-1/2 md:-translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
              >
                <ChevronRight size={20} />
              </button>

              {/* Imagem Expandida */}
              <div className="w-full md:w-3/5 bg-black flex items-center justify-center overflow-hidden max-h-[50vh] md:max-h-[80vh]">
                <img 
                  src={invertedPosts[expandedPostIndex].image} 
                  alt="Post Expandido" 
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Detalhes do Post & Legenda */}
              <div className="w-full md:w-2/5 p-6 flex flex-col justify-between bg-white overflow-y-auto">
                <div className="flex flex-col gap-4">
                  {/* Header Autor */}
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                      {clientProfile?.avatar_url ? (
                        <img src={clientProfile.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-grafite)]">
                          {clientProfile?.nome?.charAt(0) || "C"}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-roboto font-bold text-sm text-gray-900 leading-tight">
                        {clientProfile?.nome || "Cliente Atelier"}
                      </span>
                      <span className="font-roboto text-[10px] text-gray-400">Post {expandedPostIndex + 1} de {invertedPosts.length}</span>
                    </div>
                  </div>

                  {/* Legenda do Post */}
                  <div className="flex flex-col gap-2">
                    <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)]">Legenda da Publicação</span>
                    <p className="font-roboto text-xs md:text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                      {invertedPosts[expandedPostIndex].caption}
                    </p>
                  </div>
                </div>

                {/* Ações de Mockup do Post */}
                <div className="pt-4 mt-6 border-t border-gray-100 flex justify-between items-center text-gray-400">
                  <div className="flex items-center gap-4">
                    <Heart size={20} className="hover:text-red-500 transition-colors cursor-pointer" />
                    <MessageSquare size={20} className="hover:text-gray-900 transition-colors cursor-pointer" />
                    <Share2 size={20} className="hover:text-gray-900 transition-colors cursor-pointer" />
                  </div>
                  <Bookmark size={20} className="hover:text-gray-900 transition-colors cursor-pointer" />
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE REVISÃO */}
      <AnimatePresence>
        {isRevisionModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
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
              <p className="font-roboto text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-6">O que precisa ser ajustado no feed?</p>

              <textarea 
                value={revisionFeedback}
                onChange={e => setRevisionFeedback(e.target.value)}
                placeholder="Ex: Gostaria que a imagem do post 3 fosse mais clara..."
                className="w-full h-32 rounded-[1.2rem] bg-gray-50 border border-gray-200 p-4 font-roboto text-sm resize-none focus:outline-none focus:border-[var(--color-atelier-terracota)] transition-colors mb-6"
              />

              <div className="flex gap-4">
                <button 
                  onClick={() => setIsRevisionModalOpen(false)}
                  className="flex-1 py-3.5 rounded-2xl font-roboto text-[11px] uppercase tracking-widest font-bold text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRequestRevision}
                  disabled={isSubmitting || !revisionFeedback.trim()}
                  className="flex-1 py-3.5 rounded-2xl bg-[var(--color-atelier-terracota)] text-white hover:bg-[var(--color-atelier-terracota)]/90 font-roboto text-[11px] uppercase tracking-[0.1em] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : "Enviar Revisão"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
