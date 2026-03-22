// src/app/admin/projetos/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UploadCloud, Clock, Lock, Unlock, 
  Image as ImageIcon, Send, FileText, CheckCircle2,
  MoreVertical, Settings2, Plus, ChevronRight, ChevronDown, Calendar,
  Compass, X, MessageSquare, Target, Palette, Sparkles, Type, Download
} from "lucide-react";

// Função para disparar os Toasts
const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// Mock de Clientes Ativos
const ACTIVE_CLIENTS = [
  { id: "1", name: "Igor Santos", type: "IDV Premium", avatar: "https://ui-avatars.com/api/?name=Igor+Santos&background=ad6f40&color=fbf4e4", deadline: "2026-04-10" },
  { id: "2", name: "Mariana Silva", type: "Rebranding Pleno", avatar: "https://ui-avatars.com/api/?name=Mariana+Silva&background=4a4643&color=fbf4e4", deadline: "2026-03-25" },
  { id: "3", name: "Carlos Nogueira", type: "Identidade + Web", avatar: "https://ui-avatars.com/api/?name=Carlos+Nogueira&background=e8e2d7&color=4a4643", deadline: "2026-04-05" },
];

// Mock das 6 Direções avaliadas pelo cliente (Para a gaveta do Admin)
const CLIENT_EVALUATIONS = [
  {
    id: 1, 
    title: "Minimalismo Geométrico", 
    img: "https://images.unsplash.com/photo-1600880292089-90a7e086ee3c?q=80&w=600&auto=format&fit=crop",
    score: 8,
    answers: {
      q1: "Muito limpo. Transmite exatamente a tranquilidade que procuro.",
      q2: "As fontes sem serifa são modernas, mas sinto falta de algo mais quente.",
      q3: "A paleta neutra é ótima, mas talvez precise de um tom de destaque.",
      q4: "Adorei as linhas retas."
    }
  },
  {
    id: 2, 
    title: "Serifa Clássica & Heritage", 
    img: "https://images.unsplash.com/photo-1629019725068-1cb81c4e7df8?q=80&w=600&auto=format&fit=crop",
    score: 4,
    answers: {
      q1: "Achei um pouco antigo demais para o meu negócio atual.",
      q2: "A serifa é bonita, mas parece muito rígida.",
      q3: "Muito escura, parece pesada.",
      q4: "Não usaria texturas rústicas."
    }
  },
  {
    id: 3, 
    title: "Orgânico & Texturizado", 
    img: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=600&auto=format&fit=crop",
    score: 9,
    answers: {
      q1: "Perfeito! Muito próximo do que imagino para a marca.",
      q2: "As fontes mais fluidas são acolhedoras.",
      q3: "Adorei os tons terrosos, super alinhado.",
      q4: "As texturas orgânicas são o ponto alto desta referência."
    }
  }
];

export default function WorkspaceDesigner() {
  const [activeClientId, setActiveClientId] = useState(ACTIVE_CLIENTS[0].id);
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
  const currentClient = ACTIVE_CLIENTS.find(c => c.id === activeClientId) || ACTIVE_CLIENTS[0];

  // ==========================================
  // ESTADOS DO PAINEL DE REFERÊNCIAS
  // ==========================================
  const [showRefsPanel, setShowRefsPanel] = useState(false);
  const [newRefTitle, setNewRefTitle] = useState("");
  const [newRefImage, setNewRefImage] = useState<string | null>(null); // NOVIDADE: Guarda a imagem lida do PC
  const [adminRefs, setAdminRefs] = useState([...CLIENT_EVALUATIONS]);
  
  // Estado para navegação das avaliações do cliente no Drawer
  const [activeEvalIndex, setActiveEvalIndex] = useState(0);

  // NOVIDADE: Processa o upload visual da imagem
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRefImage(reader.result as string); // Cria uma URL local para preview
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddAdminRef = () => {
    if (!newRefTitle || !newRefImage) {
      showToast("Por favor, adicione um título e selecione uma imagem.");
      return;
    }
    showToast("Nova direção visual enviada para o cliente avaliar.");
    setAdminRefs([...adminRefs, { 
      id: Date.now(), 
      title: newRefTitle, 
      img: newRefImage, // NOVIDADE: Usa a imagem selecionada em vez da fixa
      score: 0,
      answers: { q1: "Aguardando avaliação...", q2: "Aguardando avaliação...", q3: "Aguardando avaliação...", q4: "Aguardando avaliação..." }
    }]);
    setNewRefTitle("");
    setNewRefImage(null); // Reseta a imagem após envio
  };

  const removeAdminRef = (id: number) => {
    setAdminRefs(adminRefs.filter(ref => ref.id !== id));
    showToast("Direção visual removida.");
    setActiveEvalIndex(0); // Reseta o índice de navegação
  };

  // ==========================================
  // MOTOR DE TEMPO
  // ==========================================
  const [deadlineDate, setDeadlineDate] = useState(currentClient.deadline);
  const [daysLeft, setDaysLeft] = useState(0);
  const [isForceUnlocked, setIsForceUnlocked] = useState(false);

  useEffect(() => {
    setDeadlineDate(currentClient.deadline);
    setIsForceUnlocked(false);
  }, [currentClient.id]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(deadlineDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    setDaysLeft(diffDays);
  }, [deadlineDate]);

  const isCofreUnlocked = daysLeft === 0 || isForceUnlocked;
  
  const [postTitle, setPostTitle] = useState("");
  const [postText, setPostText] = useState("");

  const handlePostDiary = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Atualização publicada no Diário de ${currentClient.name}!`);
    setPostTitle("");
    setPostText("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          CABEÇALHO
          ========================================== */}
      <header className="flex justify-between items-end shrink-0 animate-[fadeInUp_0.5s_ease-out] relative z-20">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-white border border-white shadow-sm flex items-center justify-center text-[var(--color-atelier-terracota)] font-elegant text-3xl overflow-hidden">
             <img src={currentClient.avatar} alt={currentClient.name} className="w-full h-full object-cover opacity-90" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-green-500/10 text-green-700 px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold border border-green-500/20">Ativo</span>
              <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">{currentClient.type}</span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsClientMenuOpen(!isClientMenuOpen)}>
              <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none flex items-center gap-2 group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                {currentClient.name} <ChevronDown size={20} className={`text-[var(--color-atelier-grafite)]/40 transition-transform duration-300 ${isClientMenuOpen ? 'rotate-180' : ''}`} />
                <span className="text-[var(--color-atelier-grafite)]/40 px-2">/</span> <span className="text-[var(--color-atelier-terracota)] italic text-3xl">Mesa de Trabalho</span>
              </h1>
            </div>
            <AnimatePresence>
              {isClientMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.2 }}
                  className="absolute top-[110%] left-0 w-[300px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(122,116,112,0.15)] rounded-2xl overflow-hidden z-50 flex flex-col py-2"
                >
                  <div className="px-4 py-2 border-b border-[var(--color-atelier-grafite)]/5 text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Projetos em Forja</div>
                  {ACTIVE_CLIENTS.map(client => (
                    <div 
                      key={client.id} onClick={() => { setActiveClientId(client.id); setIsClientMenuOpen(false); showToast(`A carregar mesa de trabalho de ${client.name}...`); }}
                      className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${client.id === activeClientId ? 'bg-[var(--color-atelier-terracota)]/5' : 'hover:bg-white'}`}
                    >
                      <img src={client.avatar} alt="" className="w-8 h-8 rounded-full border border-[var(--color-atelier-grafite)]/10" />
                      <div className="flex flex-col">
                        <span className={`font-roboto text-[13px] ${client.id === activeClientId ? 'font-bold text-[var(--color-atelier-terracota)]' : 'font-medium text-[var(--color-atelier-grafite)]'}`}>{client.name}</span>
                        <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50">{client.type}</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex gap-3 relative z-10">
          <button onClick={() => setShowRefsPanel(true)} className="glass-panel px-5 py-2.5 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:text-white hover:bg-[var(--color-atelier-terracota)] hover:border-transparent transition-all flex items-center gap-2 shadow-sm">
            <Compass size={14} /> Curadoria / Referências
          </button>
          <button onClick={() => showToast("A carregar Briefing Estratégico do cliente...")} className="glass-panel px-5 py-2.5 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] transition-colors flex items-center gap-2">
            <FileText size={14} /> Briefing
          </button>
          <button onClick={() => showToast("A abrir definições avançadas do projeto.")} className="glass-panel px-3 py-2.5 rounded-xl text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] transition-colors">
            <MoreVertical size={16} />
          </button>
        </div>
      </header>

      {/* ==========================================
          COLUNAS PRINCIPAIS
          ========================================== */}
      <div className="flex gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both] relative z-10">
        
        {/* COLUNA ESQUERDA: COFRE E UPLOAD */}
        <div className="w-[55%] flex flex-col gap-6 h-full">
          <div className="glass-panel p-8 rounded-[2.5rem] bg-white/60 shrink-0">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><Settings2 size={20} className="text-[var(--color-atelier-terracota)]" /> Engenharia do Cofre</h3>
              <div className="flex items-center gap-2">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Status do Cliente:</span>
                {isCofreUnlocked ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200"><Unlock size={12}/> Desbloqueado</span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-200"><Lock size={12}/> Bloqueado</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex-1 bg-white/50 border border-white p-4 rounded-2xl shadow-sm hover:border-[var(--color-atelier-terracota)]/30 transition-colors group">
                <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 mb-3"><Calendar size={14} className="text-[var(--color-atelier-terracota)]" /> Data Limite (Deadline)</label>
                <div className="flex items-center gap-4">
                  <input type="date" value={deadlineDate} onChange={(e) => { setDeadlineDate(e.target.value); setIsForceUnlocked(false); showToast(`Prazo atualizado para ${e.target.value.split('-').reverse().join('/')}`); }} className="flex-1 bg-transparent text-[14px] text-[var(--color-atelier-grafite)] outline-none cursor-pointer font-medium" />
                </div>
              </div>
              <div className="w-24 h-full flex flex-col items-center justify-center bg-white/60 border border-white rounded-2xl shadow-sm">
                 <span className="font-elegant text-3xl text-[var(--color-atelier-terracota)] leading-none">{daysLeft}</span>
                 <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 mt-1">Dias Úteis</span>
              </div>
              <button onClick={() => { setIsForceUnlocked(true); showToast("Cofre desbloqueado manualmente."); }} disabled={isCofreUnlocked} className="h-[82px] px-6 bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] rounded-2xl font-roboto font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--color-atelier-terracota)] transition-all shadow-[0_10px_20px_rgba(122,116,112,0.15)] disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2">
                <Unlock size={16} /> Forçar<br/>Abertura
              </button>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[2.5rem] bg-white/60 flex-1 flex flex-col min-h-0">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2 mb-2"><UploadCloud size={20} className="text-[var(--color-atelier-terracota)]" /> Ativos Finais</h3>
            <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mb-6">Faça o upload dos arquivos que o cliente receberá quando o cofre for aberto.</p>
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-2">
              <div onClick={() => showToast("Seletor de ficheiros (PDF) ativado.")} className="border-2 border-dashed border-[var(--color-atelier-grafite)]/20 bg-white/40 hover:bg-white/80 transition-colors rounded-2xl p-5 flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[var(--color-atelier-terracota)]"><FileText size={20} /></div>
                  <div><span className="block font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">Brandbook Oficial (PDF)</span><span className="block font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 mt-0.5">Nenhum arquivo selecionado</span></div>
                </div>
                <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center group-hover:scale-110 transition-transform"><Plus size={18} /></div>
              </div>
              <div className="border border-[var(--color-atelier-terracota)]/30 bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)]"><CheckCircle2 size={20} /></div>
                  <div><span className="block font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">Logos e Vetores (.ZIP)</span><span className="block font-roboto text-[11px] text-green-600 font-bold mt-0.5">logos_final_v1.zip (24MB)</span></div>
                </div>
                <button onClick={() => showToast("Ficheiro removido.")} className="text-[11px] font-bold uppercase tracking-widest text-red-500/70 hover:text-red-600 transition-colors">Remover</button>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: DIÁRIO */}
        <div className="flex-1 glass-panel p-8 rounded-[2.5rem] bg-gradient-to-br from-white/90 to-white/50 flex flex-col h-full border-[var(--color-atelier-terracota)]/10 shadow-[0_15px_40px_rgba(173,111,64,0.05)]">
          <div className="mb-6 pb-4 border-b border-[var(--color-atelier-grafite)]/10">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2 mb-1"><ImageIcon size={20} className="text-[var(--color-atelier-terracota)]" /> Atualizar Diário</h3>
            <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60">Poste atualizações visuais na timeline do cliente.</p>
          </div>
          <form onSubmit={handlePostDiary} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-5">
              <div onClick={() => showToast("A abrir galeria...")} className="w-full h-48 rounded-[1.5rem] border-2 border-dashed border-[var(--color-atelier-grafite)]/20 bg-white/40 hover:bg-white/80 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[var(--color-atelier-grafite)]/40 group-hover:text-[var(--color-atelier-terracota)] transition-colors"><UploadCloud size={24} /></div>
                <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)]">Arraste a Imagem</span>
              </div>
              <div className="flex flex-col gap-2 group/input">
                <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1">Título da Atualização</label>
                <input type="text" required value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Ex: Estudo de Tipografia..." className="w-full bg-white/60 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3.5 px-4 text-[14px] outline-none shadow-sm" />
              </div>
              <div className="flex flex-col gap-2 group/input flex-1">
                <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1">Narrativa (Copy)</label>
                <textarea required value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="Explique a decisão de design..." className="w-full h-full min-h-[120px] resize-none bg-white/60 border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3.5 px-4 text-[14px] outline-none shadow-sm custom-scrollbar" />
              </div>
            </div>
            <button type="submit" className="mt-6 w-full bg-[var(--color-atelier-terracota)] text-white h-14 rounded-2xl font-roboto font-bold uppercase tracking-[0.2em] text-[12px] hover:bg-[#8c562e] transition-colors shadow-[0_10px_20px_rgba(173,111,64,0.3)] hover:-translate-y-0.5 flex items-center justify-center gap-2 shrink-0">
              <Send size={16} /> Publicar no Diário
            </button>
          </form>
        </div>

      </div>

      {/* ==========================================
          3. PAINEL DESLIZANTE (DRAWER) - REFERÊNCIAS E RESPOSTAS
          ========================================== */}
      <AnimatePresence>
        {showRefsPanel && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRefsPanel(false)} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/20 backdrop-blur-sm cursor-pointer"></motion.div>
            
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-[700px] h-full bg-[var(--color-atelier-creme)] shadow-[-20px_0_50px_rgba(122,116,112,0.2)] flex flex-col border-l border-white overflow-hidden"
            >
              {/* Header do Drawer */}
              <div className="p-8 border-b border-[var(--color-atelier-grafite)]/10 bg-white/40 flex justify-between items-start shrink-0">
                <div>
                  <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
                    Avaliações do Cliente
                  </h2>
                  <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest font-bold mt-2">
                    Projeto: {currentClient.name} • {adminRefs.length} Direções Enviadas
                  </p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => showToast("A gerar dossiê PDF com todas as respostas do cliente...")}
                    className="h-10 px-4 rounded-xl bg-white flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] transition-all shadow-sm border border-[var(--color-atelier-terracota)]/20 hover:border-[var(--color-atelier-terracota)]/40"
                  >
                    <Download size={14} /> Exportar Dossiê PDF
                  </button>
                  <button onClick={() => setShowRefsPanel(false)} className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-red-500 transition-all shadow-sm border border-white">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Corpo Rolável do Drawer */}
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-8 gap-8">
                
                {/* MOODBOARD DO CLIENTE */}
                <section className="pb-8 border-b border-[var(--color-atelier-grafite)]/5">
                  <div className="flex items-center gap-2 mb-6 pb-2 border-b border-[var(--color-atelier-grafite)]/5">
                    <ImageIcon size={16} className="text-[var(--color-atelier-terracota)]" />
                    <h3 className="font-roboto text-[13px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Moodboard Publicado Pelo Cliente</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="aspect-square rounded-2xl overflow-hidden border-4 border-white shadow-sm group relative">
                      <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Ref Cliente 1" />
                    </div>
                    <div className="aspect-square rounded-2xl overflow-hidden border-4 border-white shadow-sm group relative">
                      <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Ref Cliente 2" />
                    </div>
                  </div>
                </section>

                {/* SECÇÃO DE AVALIAÇÕES (CARROSSEL) */}
                <section>
                  <div className="flex items-center gap-2 mb-6 pb-2 border-b border-[var(--color-atelier-grafite)]/5">
                    <Sparkles size={16} className="text-[var(--color-atelier-terracota)]" />
                    <h3 className="font-roboto text-[13px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Avaliações das Direções Enviadas</h3>
                  </div>
                  
                  {/* Abas de Navegação das Imagens */}
                  <div className="flex overflow-x-auto custom-scrollbar gap-3 pb-4 shrink-0">
                    {adminRefs.map((ref, index) => (
                      <button 
                        key={ref.id}
                        onClick={() => setActiveEvalIndex(index)}
                        className={`
                          shrink-0 w-32 flex flex-col gap-2 p-2 rounded-xl border transition-all cursor-pointer text-left
                          ${activeEvalIndex === index ? 'bg-white border-[var(--color-atelier-terracota)]/40 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}
                        `}
                      >
                        <div className="w-full h-16 rounded-lg overflow-hidden border border-white shadow-inner">
                          <img src={ref.img} className="w-full h-full object-cover" alt={ref.title} />
                        </div>
                        <span className={`font-roboto text-[9px] uppercase tracking-widest font-bold truncate w-full ${activeEvalIndex === index ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/50'}`}>
                          {ref.title}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Exibição da Avaliação do Cliente para a Imagem Ativa */}
                  {adminRefs[activeEvalIndex] && (
                    <motion.div 
                      key={activeEvalIndex}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-6"
                    >
                      {/* Bloco de Imagem e Nota */}
                      <div className="flex gap-6 items-start bg-white/40 p-4 rounded-[2rem] border border-white shadow-sm">
                        <div className="w-40 h-40 rounded-2xl overflow-hidden border-4 border-white shadow-sm shrink-0">
                          <img src={adminRefs[activeEvalIndex].img} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex flex-col pt-2 flex-1 pr-2">
                          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-1">{adminRefs[activeEvalIndex].title}</h3>
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Alinhamento Global:</span>
                            <span className="bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20 px-3 py-1 rounded-full text-[12px] font-bold font-roboto">
                              {adminRefs[activeEvalIndex].score}/10
                            </span>
                          </div>
                          <button 
                            onClick={() => removeAdminRef(adminRefs[activeEvalIndex].id)}
                            className="self-start text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"
                          >
                            <X size={12} /> Remover Direção do Projeto
                          </button>
                        </div>
                      </div>

                      {/* Respostas Individuais */}
                      <div className="flex flex-col gap-4">
                        <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
                          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 mb-2">
                            <Target size={12} className="text-[var(--color-atelier-terracota)]"/> 1. Atmosfera e Percepção Geral
                          </span>
                          <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)] leading-relaxed">
                            {adminRefs[activeEvalIndex].answers.q1}
                          </p>
                        </div>

                        <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
                          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 mb-2">
                            <Type size={12} className="text-[var(--color-atelier-terracota)]"/> 2. Escolha Tipográfica
                          </span>
                          <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)] leading-relaxed">
                            {adminRefs[activeEvalIndex].answers.q2}
                          </p>
                        </div>

                        <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
                          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 mb-2">
                            <Palette size={12} className="text-[var(--color-atelier-terracota)]"/> 3. Paleta Cromática
                          </span>
                          <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)] leading-relaxed">
                            {adminRefs[activeEvalIndex].answers.q3}
                          </p>
                        </div>

                        <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
                          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 mb-2">
                            <Sparkles size={12} className="text-[var(--color-atelier-terracota)]"/> 4. Elementos Gráficos
                          </span>
                          <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)] leading-relaxed">
                            {adminRefs[activeEvalIndex].answers.q4}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </section>

                {/* Zona de Envio de Nova Referência COM UPLOAD DE IMAGEM REAL */}
                <div className="mt-4 border-t border-[var(--color-atelier-grafite)]/10 pt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Plus size={16} className="text-[var(--color-atelier-terracota)]" />
                    <h3 className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Enviar Nova Direção ao Cliente</h3>
                  </div>
                  <div className="bg-[var(--color-atelier-terracota)]/5 p-5 rounded-[1.5rem] border border-[var(--color-atelier-terracota)]/20">
                    <div className="flex flex-col gap-4">
                       
                       {/* Dropzone de Imagem Real */}
                       <label className="w-full h-32 rounded-xl border-2 border-dashed border-[var(--color-atelier-grafite)]/20 hover:border-[var(--color-atelier-terracota)]/40 bg-white/50 cursor-pointer flex flex-col items-center justify-center transition-colors group relative overflow-hidden shadow-sm">
                         <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                         {newRefImage ? (
                           <>
                             <img src={newRefImage} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                               <span className="text-white font-roboto text-[10px] font-bold uppercase tracking-widest border border-white/50 px-3 py-1.5 rounded-full">Trocar Imagem</span>
                             </div>
                           </>
                         ) : (
                           <>
                             <UploadCloud size={24} className="text-[var(--color-atelier-grafite)]/40 group-hover:text-[var(--color-atelier-terracota)] mb-2" />
                             <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)]">Clique para anexar a imagem da direção</span>
                           </>
                         )}
                       </label>

                       {/* Input de Título e Botão de Envio */}
                       <div className="flex flex-col sm:flex-row gap-3">
                         <input 
                           type="text" value={newRefTitle} onChange={(e) => setNewRefTitle(e.target.value)}
                           placeholder="Título da Direção (Ex: Tipografia Clássica)"
                           className="flex-1 bg-white border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 text-[13px] outline-none shadow-sm"
                         />
                         <button 
                           onClick={handleAddAdminRef} 
                           className="px-6 bg-[var(--color-atelier-grafite)] text-white py-3 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-sm shrink-0"
                         >
                           Enviar e Publicar
                         </button>
                       </div>

                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}