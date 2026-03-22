// src/app/comunidade/page.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe2, Trophy, Star, Medal, Sparkles, 
  UploadCloud, Send, Heart, MessageCircle, Share2, Award, ArrowUpRight,
  MoreVertical // <-- ERRO CORRIGIDO: Ícone importado aqui
} from "lucide-react";

// Função para disparar os Toasts Globais
const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ==========================================
// MOCKS DE DADOS (Gamificação e Feed)
// ==========================================
const INITIAL_EXP = 2450;
const EXP_TO_NEXT_LEVEL = 3000;

const INITIAL_POSTS = [
  {
    id: 1,
    author: "Mariana Silva",
    project: "Rebranding Pleno",
    avatar: "https://ui-avatars.com/api/?name=Mariana+Silva&background=4a4643&color=fbf4e4",
    time: "Há 2 horas",
    text: "Acabaram de chegar as novas embalagens da coleção de Inverno! A textura do papel cotton com a tipografia brutalista ficou surreal. Obrigada equipa Atelier por esta visão. ✨",
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2670&auto=format&fit=crop",
    likes: 14,
    comments: 3
  },
  {
    id: 2,
    author: "Carlos Nogueira",
    project: "Identidade + Web",
    avatar: "https://ui-avatars.com/api/?name=Carlos+Nogueira&background=e8e2d7&color=4a4643",
    time: "Ontem",
    text: "O novo site já está no ar. A paleta de cores nova aumentou o nosso tempo de retenção na página em 40% esta semana. O poder do design estratégico é real.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop",
    likes: 32,
    comments: 5
  }
];

const BADGES = [
  { id: 1, name: "Primeira Impressão", desc: "Aprovou o moodboard de primeira.", icon: <Star size={16} />, active: true },
  { id: 2, name: "Embaixador da Marca", desc: "Publicou 3 aplicações reais da marca.", icon: <Globe2 size={16} />, active: true },
  { id: 3, name: "Mestre Tipográfico", desc: "Uso perfeito das fontes secundárias.", icon: <Award size={16} />, active: false },
  { id: 4, name: "Visionário", desc: "Completou 1 ano de IDV intacta.", icon: <Trophy size={16} />, active: false },
];

export default function ComunidadePage() {
  const [exp, setExp] = useState(INITIAL_EXP);
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [newPostText, setNewPostText] = useState("");
  const [newPostImage, setNewPostImage] = useState<string | null>(null);

  // Cálculo de Nível (1000 EXP por nível)
  const currentLevel = Math.floor(exp / 1000) + 1;
  const expInCurrentLevel = exp % 1000;
  const progressPercentage = (expInCurrentLevel / 1000) * 100;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewPostImage(reader.result as string);
      reader.readAsDataURL(file);
      showToast("Imagem carregada. Pronta para publicação.");
    }
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    showToast("✨ Publicação enviada! Você ganhou +150 EXP.");
    
    // Simula o ganho de EXP e a adição ao feed
    setExp(prev => prev + 150);
    setPosts([{
      id: Date.now(),
      author: "Igor Castro",
      project: "IDV Premium",
      avatar: "https://ui-avatars.com/api/?name=Igor+Castro&background=ad6f40&color=fbf4e4",
      time: "Agora mesmo",
      text: newPostText,
      image: newPostImage || undefined,
      likes: 0,
      comments: 0
    }, ...posts]);

    setNewPostText("");
    setNewPostImage(null);
  };

  const handleLike = (postId: number) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
    showToast("Aplauso enviado!");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          1. CABEÇALHO
          ========================================== */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/60 text-[var(--color-atelier-grafite)] px-4 py-1.5 rounded-full flex items-center gap-2 border border-white shadow-sm">
              <Globe2 size={14} className="text-[var(--color-atelier-terracota)]" />
              <span className="font-roboto text-[10px] uppercase tracking-widest font-bold">Ecossistema Atelier</span>
            </span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Comunidade & <span className="text-[var(--color-atelier-terracota)] italic">Status.</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60 max-w-sm text-right">
            Partilhe como a sua marca está a ganhar vida no mundo real. Inspire outros visionários e suba de nível no nosso ecossistema.
          </p>
        </div>
      </header>

      {/* ==========================================
          2. A ESTRUTURA SPLIT-SCREEN
          ========================================== */}
      <div className="flex gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* COLUNA ESQUERDA: PERFIL GAMIFICADO (35%) */}
        <div className="w-[350px] flex flex-col gap-6 h-full shrink-0">
          
          {/* Cartão de Status (Nível e EXP) */}
          <div className="glass-panel p-8 rounded-[2.5rem] bg-gradient-to-br from-[var(--color-atelier-grafite)] to-[#2a2826] text-white shadow-[0_20px_50px_rgba(122,116,112,0.15)] flex flex-col items-center text-center relative overflow-hidden shrink-0">
            {/* Decoração de Fundo */}
            <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-[var(--color-atelier-terracota)]/20 blur-[40px] rounded-full pointer-events-none"></div>
            
            <div className="w-24 h-24 rounded-full border-4 border-white/10 p-1 relative mb-4">
              <img src="https://ui-avatars.com/api/?name=Igor+Castro&background=ad6f40&color=fbf4e4" alt="Avatar" className="w-full h-full rounded-full object-cover" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[var(--color-atelier-terracota)] border-2 border-[var(--color-atelier-grafite)] flex items-center justify-center font-elegant text-sm text-white shadow-lg">
                {currentLevel}
              </div>
            </div>
            
            <h2 className="font-elegant text-2xl mb-1">Igor Castro</h2>
            <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-white/50 mb-6">Membro Premium</span>

            <div className="w-full flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-white/70">Progresso de Marca</span>
                <span className="font-roboto text-[12px] font-bold text-[var(--color-atelier-terracota)]">{expInCurrentLevel} / 1000 EXP</span>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-[var(--color-atelier-terracota)] rounded-full relative"
                >
                  <div className="absolute inset-0 bg-white/20 w-full animate-[slideRight_2s_ease-in-out_infinite]"></div>
                </motion.div>
              </div>
              <p className="font-roboto text-[9px] text-white/40 mt-1">Partilhe aplicações da sua marca para ganhar EXP.</p>
            </div>
          </div>

          {/* O Cofre de Conquistas (Medalhas) */}
          <div className="glass-panel p-6 rounded-[2.5rem] bg-white/60 border border-white flex-1 flex flex-col min-h-0 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                <Medal size={18} className="text-[var(--color-atelier-terracota)]" /> Conquistas
              </h3>
              <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">
                {BADGES.filter(b => b.active).length} de {BADGES.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
              {BADGES.map(badge => (
                <div 
                  key={badge.id} 
                  className={`
                    p-4 rounded-2xl border transition-all flex items-center gap-4
                    ${badge.active ? 'bg-white border-white shadow-sm' : 'bg-white/30 border-transparent opacity-60 grayscale'}
                  `}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${badge.active ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)]' : 'bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]'}`}>
                    {badge.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-roboto text-[12px] font-bold ${badge.active ? 'text-[var(--color-atelier-grafite)]' : 'text-[var(--color-atelier-grafite)]/60'}`}>{badge.name}</span>
                    <span className="font-roboto text-[9px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-0.5">{badge.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA: O FEED DA COMUNIDADE (65%) */}
        <div className="flex-1 flex flex-col gap-6 h-full min-h-0">
          
          {/* Publicador (Criar Novo Post) */}
          <div className="glass-panel p-6 rounded-[2.5rem] bg-white/80 border border-white shadow-[0_15px_30px_rgba(122,116,112,0.05)] shrink-0">
            <form onSubmit={handlePublish} className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-terracota)]/20 shrink-0 overflow-hidden">
                  <img src="https://ui-avatars.com/api/?name=Igor+Castro&background=ad6f40&color=fbf4e4" alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <textarea 
                  value={newPostText} onChange={(e) => setNewPostText(e.target.value)}
                  placeholder="Partilhe uma foto do seu novo cartão, site ou farda. Como a sua marca está a respirar hoje?"
                  className="flex-1 bg-transparent border-none outline-none resize-none font-roboto text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 h-12 pt-2 custom-scrollbar"
                />
              </div>

              {/* Preview da Imagem no Publicador */}
              {newPostImage && (
                <div className="relative w-full h-48 rounded-2xl overflow-hidden border-4 border-white shadow-sm ml-14 max-w-[85%]">
                  <img src={newPostImage} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setNewPostImage(null)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-red-500 hover:bg-white shadow-sm transition-colors">
                    <Trophy size={14} className="hidden" /> {/* Ignorar, hack para manter lucide */}
                    ✕
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[var(--color-atelier-grafite)]/5 pl-14">
                <div className="flex gap-2">
                  <label className="cursor-pointer px-4 py-2 rounded-xl hover:bg-[var(--color-atelier-grafite)]/5 flex items-center gap-2 font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] transition-colors">
                    <UploadCloud size={16} /> Anexar Foto
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
                <button 
                  type="submit" 
                  disabled={!newPostText.trim()}
                  className="px-6 py-2.5 bg-[var(--color-atelier-terracota)] text-white rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-[#8c562e] transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  <Sparkles size={14} /> Publicar
                </button>
              </div>
            </form>
          </div>

          {/* O Feed de Publicações (Timeline) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 flex flex-col gap-6 pb-20">
            <AnimatePresence>
              {posts.map((post, index) => (
                <motion.div 
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                  className="glass-panel p-6 rounded-[2.5rem] bg-white/60 border border-white shadow-[0_10px_30px_rgba(122,116,112,0.05)] flex flex-col gap-4"
                >
                  {/* Header do Post */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border border-white shadow-sm overflow-hidden shrink-0">
                        <img src={post.avatar} alt={post.author} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-[14px] text-[var(--color-atelier-grafite)]">{post.author}</span>
                        <div className="flex items-center gap-2 font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 mt-0.5">
                          <span>{post.project}</span>
                          <span>•</span>
                          <span>{post.time}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => showToast("Opções da publicação...")} className="text-[var(--color-atelier-grafite)]/30 hover:text-[var(--color-atelier-terracota)] transition-colors"><MoreVertical size={16} /></button>
                  </div>

                  {/* Texto do Post */}
                  <p className="font-roboto text-[14px] leading-relaxed text-[var(--color-atelier-grafite)]">
                    {post.text}
                  </p>

                  {/* Imagem do Post (se existir) */}
                  {post.image && (
                    <div 
                      onClick={() => showToast("A abrir imagem em alta resolução...")}
                      className="w-full rounded-2xl overflow-hidden border-[4px] border-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <img src={post.image} alt="Publicação" className="w-full max-h-[400px] object-cover" />
                    </div>
                  )}

                  {/* Interações (Likes e Comentários) */}
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--color-atelier-grafite)]/5 mt-2">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleLike(post.id)}
                        className="px-4 py-2 rounded-xl bg-white/60 hover:bg-white border border-white shadow-sm flex items-center gap-2 font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-terracota)] transition-colors"
                      >
                        <Heart size={14} className={post.likes > 30 ? 'fill-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)]' : ''} /> 
                        {post.likes} Aplausos
                      </button>
                      <button 
                        onClick={() => showToast("A abrir comentários da publicação...")}
                        className="px-4 py-2 rounded-xl bg-white/60 hover:bg-white border border-white shadow-sm flex items-center gap-2 font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-terracota)] transition-colors"
                      >
                        <MessageCircle size={14} /> {post.comments} Comentários
                      </button>
                    </div>
                    <button onClick={() => showToast("Link copiado para a área de transferência!")} className="p-2 text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] transition-colors">
                      <Share2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </div>
  );
}