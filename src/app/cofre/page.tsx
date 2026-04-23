// src/app/cofre/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion"; 
import { 
  Lock, Unlock, Clock, Download, ArrowRight, 
  Sparkles, Fingerprint, Layers, Eye, HeartHandshake, Loader2, Star, Zap,
  Briefcase
} from "lucide-react";
import { supabase } from "../../lib/supabase"; 
import { NotificationEngine } from "../../lib/NotificationEngine";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function CofrePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState<number | '--'>('--');
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("Cliente");

  // 🟢 NOVO: Suporte a Múltiplos Projetos
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any>(null);

  const [showNpsModal, setShowNpsModal] = useState(false);
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsFeedback, setNpsFeedback] = useState("");
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [isProcessingNps, setIsProcessingNps] = useState(false);

  useEffect(() => {
    const fetchProjectsAndDeadline = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      setClientId(session.user.id);

      // 1. Busca TODOS os projetos ativos do cliente
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, type, data_limite, profiles(nome)')
        .eq('client_id', session.user.id)
        .in('status', ['active', 'delivered'])
        .order('created_at', { ascending: false });

      if (projects && projects.length > 0) {
        setAllProjects(projects);
        
        // 2. Define o projeto ativo (Pode ser alterado depois no Dropdown)
        setActiveProject(projects[0]);

        // 3. Define o nome do Cliente (apenas 1 vez)
        const perfil: any = Array.isArray(projects[0].profiles) ? projects[0].profiles[0] : projects[0].profiles;
        if (perfil?.nome) {
          setClientName(perfil.nome.split(' ')[0]);
        }
      } else {
        setIsLoading(false);
        return;
      }
    };

    fetchProjectsAndDeadline();
  }, []);

  // 4. Recalcula os Dias e o Desbloqueio sempre que o activeProject mudar
  useEffect(() => {
    if (!activeProject) return;

    if (activeProject.data_limite) {
      const today = new Date();
      const deadline = new Date(activeProject.data_limite);
      today.setHours(0, 0, 0, 0);
      deadline.setHours(0, 0, 0, 0);
      
      const diffTime = deadline.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        setDaysLeft(0);
        setIsUnlocked(true);
      } else {
        setDaysLeft(diffDays);
        setIsUnlocked(false);
      }
    } else {
      setDaysLeft('--');
      setIsUnlocked(false);
    }
    
    setIsLoading(false);
  }, [activeProject]);


  // ==========================================
  // MOTORES DE AVALIAÇÃO E UPSELL
  // ==========================================
  const handleSubmitNps = async () => {
    if (npsScore === null || !activeProject || !clientId) return;
    setIsProcessingNps(true);
    try {
      await supabase.from('t_nps_scores').insert({
        project_id: activeProject.id,
        client_id: clientId,
        score: npsScore,
        feedback: npsFeedback,
      });

      setShowNpsModal(false);

      if (npsScore >= 9) {
        setTimeout(() => setShowUpsellModal(true), 500); 
      } else {
        showToast("A sua avaliação foi registada com sucesso. Muito obrigado pela confiança!");
        setNpsScore(null);
        setNpsFeedback("");
      }
    } catch (error) {
      showToast("Erro ao enviar avaliação.");
    } finally {
      setIsProcessingNps(false);
    }
  };

  const handleSkipNps = () => {
    setShowNpsModal(false);
    setNpsScore(null);
    setNpsFeedback("");
  };

  const handleAcceptUpsell = async () => {
    setShowUpsellModal(false);
    showToast("Excelente decisão! A nossa equipa entrará em contacto muito em breve.");
    
    await NotificationEngine.notifyManagement(
       "🔥 Boiling Lead: Escala Pós-IDV (Upsell)",
       `O cliente ${clientName} retirou a Identidade Visual do Cofre (Proj: ${activeProject?.name || activeProject?.type}), avaliou com nota ${npsScore} e manifestou interesse em delegar o Instagram.`,
       "success",
       "/admin/clientes"
    );
    
    setNpsScore(null);
    setNpsFeedback("");
  };

  const handleDeclineUpsell = () => {
    setShowUpsellModal(false);
    showToast("Avaliação registada. Estaremos sempre à disposição!");
    setNpsScore(null);
    setNpsFeedback("");
  };

  // Lógica Visual do Cofre
  const numericDaysLeft = typeof daysLeft === 'number' ? daysLeft : 30;
  const clampedDays = Math.min(Math.max(numericDaysLeft, 0), 30);
  const progressRatio = Math.max(0, 1 - (clampedDays / 30)); 
  
  const currentGrayscale = (1 - progressRatio) * 100;
  const currentBlur = 20 - (progressRatio * 15); 
  const glowOpacity = progressRatio * 0.8; 

  if (isLoading) {
    return <div className="flex h-[calc(100vh-80px)] items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4">
        <Lock size={48} className="text-[var(--color-atelier-grafite)]/20 mb-4" />
        <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Cofre Vazio</h2>
        <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/50 mt-2">Você não possui nenhum projeto ativo ou entregue no momento.</p>
      </div>
    );
  }

  return (
    <div className="relative z-10 max-w-[1400px] mx-auto h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      
      <AnimatePresence mode="wait">
        
        {/* ==========================================
            ESTADO 1: O COFRE ENIGMÁTICO (Bloqueado)
            ========================================== */}
        {!isUnlocked && (
          <motion.div 
            key="locked"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col items-center justify-center relative w-full h-full px-4"
          >
            <div className="relative w-full h-full max-h-[800px] rounded-[4rem] overflow-hidden flex flex-col items-center justify-center border border-white/40 shadow-[0_40px_100px_rgba(122,116,112,0.15)]">
              
              {/* 🟢 NOVO: Dropdown de Múltiplos Projetos (Cofre Trancado) */}
              {allProjects.length > 1 && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
                  <div className="bg-white/40 backdrop-blur-md border border-white px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
                    <Briefcase size={14} className="text-[var(--color-atelier-terracota)]" />
                    <select 
                      className="bg-transparent text-[11px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] outline-none cursor-pointer"
                      value={activeProject.id}
                      onChange={(e) => setActiveProject(allProjects.find(p => p.id === e.target.value))}
                    >
                      {allProjects.map(p => (
                        <option key={p.id} value={p.id}>{p.type === 'idv' ? 'Identidade Visual' : p.type} {p.name ? `- ${p.name}` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div 
                className="absolute inset-0 bg-cover bg-center scale-110"
                style={{ 
                  backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')", 
                  filter: `grayscale(${currentGrayscale}%) blur(${currentBlur}px)`,
                  transition: "filter 0.5s ease-out" 
                }}
              ></div>
              
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(251,244,228,0.9)_100%)]"></div>
              <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>

              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-atelier-terracota)] rounded-full blur-[120px] mix-blend-overlay transition-opacity duration-700"
                style={{ opacity: glowOpacity }}
              ></div>

              <div className="relative z-10 flex flex-col items-center text-center p-12">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="w-28 h-28 rounded-full border border-white/60 bg-white/30 backdrop-blur-xl flex items-center justify-center mb-10 shadow-[0_10px_40px_rgba(173,111,64,0.2)] relative"
                >
                  {typeof daysLeft === 'number' && daysLeft <= 3 && <div className="absolute inset-0 bg-[var(--color-atelier-terracota)]/30 rounded-full animate-ping"></div>}
                  <Lock size={36} strokeWidth={1.5} className="text-[var(--color-atelier-terracota)] drop-shadow-md" />
                </motion.div>

                <h1 className="font-elegant text-6xl md:text-[5.5rem] text-[var(--color-atelier-grafite)] mb-6 tracking-tight leading-none drop-shadow-sm">
                  O Segredo <br/><span className="text-[var(--color-atelier-terracota)] italic">em Forja.</span>
                </h1>
                
                <p className="font-roboto text-[16px] text-[var(--color-atelier-grafite)]/60 max-w-md leading-[1.8] mb-12 font-medium">
                  A sua obra-prima está sendo lapidada no escuro. As formas estão nascendo, as cores estão aquecendo.
                </p>

                <div className="flex flex-col items-center gap-2 bg-white/50 backdrop-blur-md border border-white px-10 py-5 rounded-[2rem] shadow-sm">
                  <span className="font-roboto text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--color-atelier-grafite)]/50">
                    {daysLeft === '--' ? 'Aguardando Cronograma' : 'Desbloqueio Oficial em'}
                  </span>
                  <span className="font-elegant text-6xl text-[var(--color-atelier-terracota)] drop-shadow-sm tracking-tighter">
                    {daysLeft} {daysLeft !== '--' && <span className="text-3xl text-[var(--color-atelier-grafite)]/40 ml-1 tracking-normal font-sans">Dias</span>}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================
            ESTADO 2: A REVELAÇÃO (No Scroll / SPA Mode)
            ========================================== */}
        {isUnlocked && (
          <motion.div 
            key="unlocked"
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 60, damping: 20, mass: 1, delay: 0.2 }}
            className="w-full h-full flex flex-col pt-6 px-4 md:px-0"
          >
            <motion.div 
              initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.5, ease: "easeOut" }}
              className="fixed inset-0 bg-white z-50 pointer-events-none"
            ></motion.div>

            {/* Cabeçalho Compacto e Dropdown */}
            <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, type: "spring" }}
                    className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-700 px-4 py-1.5 rounded-full shadow-sm"
                  >
                    <Unlock size={14} strokeWidth={2.5} />
                    <span className="font-roboto text-[10px] uppercase tracking-[0.2em] font-black">Identidade Desbloqueada</span>
                  </motion.div>

                  {/* 🟢 NOVO: Dropdown de Múltiplos Projetos (Cofre Aberto) */}
                  {allProjects.length > 1 && (
                    <select 
                      className="bg-white/50 backdrop-blur-sm border border-[var(--color-atelier-grafite)]/10 text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] px-3 py-1.5 rounded-full outline-none cursor-pointer shadow-sm hover:border-[var(--color-atelier-terracota)]/40 transition-colors"
                      value={activeProject.id}
                      onChange={(e) => setActiveProject(allProjects.find(p => p.id === e.target.value))}
                    >
                      {allProjects.map(p => (
                        <option key={p.id} value={p.id}>{p.type === 'idv' ? 'Identidade Visual' : p.type} {p.name ? `- ${p.name}` : ''}</option>
                      ))}
                    </select>
                  )}
                </div>
                
                <h1 className="font-elegant text-5xl md:text-[4rem] text-[var(--color-atelier-grafite)] tracking-tight leading-none">
                  O seu <span className="text-[var(--color-atelier-terracota)] italic">novo legado.</span>
                </h1>
              </div>
              <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 max-w-sm md:text-right leading-relaxed font-medium">
                Toda grande marca tem um ponto de virada. Aceda ao seu ecossistema visual abaixo.
              </p>
            </header>

            {/* Grid No-Scroll */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pb-6">
              
              <motion.div 
                initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1, duration: 0.8 }}
                className="lg:col-span-7 glass-panel p-3 rounded-[2.5rem] relative group flex flex-col h-[400px] lg:h-full border border-white shadow-sm"
              >
                <div className="w-full flex-1 rounded-[2rem] overflow-hidden relative shadow-inner group-hover:shadow-[0_20px_50px_rgba(173,111,64,0.15)] transition-all duration-700">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10"></div>
                  <img 
                    src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2670&auto=format&fit=crop" 
                    alt="Apresentação da Marca" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3s] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  />
                  <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <button className="bg-white/90 backdrop-blur-xl text-[var(--color-atelier-grafite)] px-8 py-5 rounded-[1.5rem] font-roboto font-bold uppercase tracking-[0.1em] text-[11px] flex items-center gap-3 shadow-[0_15px_30px_rgba(0,0,0,0.2)] hover:scale-105 transition-transform">
                      <Eye size={18} className="text-[var(--color-atelier-terracota)]" /> Abrir Brandbook Oficial
                    </button>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2, duration: 0.8 }}
                className="lg:col-span-5 flex flex-col gap-6 h-[500px] lg:h-full overflow-y-auto custom-scrollbar"
              >
                <div className="glass-panel p-8 rounded-[2.5rem] flex flex-col gap-5 border border-white shadow-sm shrink-0">
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2 mb-2">
                    Seus Ativos <Sparkles size={16} className="text-[var(--color-atelier-terracota)]" />
                  </h3>
                  
                  <div className="flex flex-col gap-3">
                    <button className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white/60 border border-white hover:border-[var(--color-atelier-terracota)]/40 hover:bg-white transition-all duration-300 group shadow-sm hover:shadow-md hover:-translate-y-0.5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[1rem] bg-white border border-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] group-hover:bg-[var(--color-atelier-terracota)] group-hover:text-white transition-colors shadow-inner">
                          <Fingerprint size={20} strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">Logos e Vetores</span>
                          <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 font-medium">Download Original</span>
                        </div>
                      </div>
                      <Download size={18} className="text-[var(--color-atelier-grafite)]/30 group-hover:text-[var(--color-atelier-terracota)] transition-colors mr-2" />
                    </button>

                    <button className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white/60 border border-white hover:border-[var(--color-atelier-terracota)]/40 hover:bg-white transition-all duration-300 group shadow-sm hover:shadow-md hover:-translate-y-0.5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[1rem] bg-white border border-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] group-hover:bg-[var(--color-atelier-terracota)] group-hover:text-white transition-colors shadow-inner">
                          <Layers size={20} strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">Mockups (Aplicações)</span>
                          <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 font-medium">Exemplos Práticos</span>
                        </div>
                      </div>
                      <Download size={18} className="text-[var(--color-atelier-grafite)]/30 group-hover:text-[var(--color-atelier-terracota)] transition-colors mr-2" />
                    </button>
                  </div>
                </div>

                <div className="glass-panel p-8 rounded-[2.5rem] flex-1 flex flex-col justify-center items-center text-center bg-gradient-to-br from-[var(--color-atelier-grafite)] to-[#363330] group relative overflow-hidden shadow-sm min-h-[250px] shrink-0">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
                  <div className="absolute right-[-20%] bottom-[-20%] w-[250px] h-[250px] bg-[var(--color-atelier-terracota)]/40 rounded-full blur-[60px] group-hover:bg-[var(--color-atelier-terracota)]/60 transition-colors duration-1000"></div>
                  
                  <HeartHandshake size={36} strokeWidth={1.5} className="text-[var(--color-atelier-terracota)] mb-4 relative z-10" />
                  <h3 className="font-elegant text-3xl md:text-4xl text-white mb-2 relative z-10 leading-tight">
                    O seu legado importa.
                  </h3>
                  <p className="font-roboto text-[13px] text-white/70 max-w-[85%] mb-8 relative z-10 leading-relaxed font-medium">
                    Partilhe a sua jornada. O seu relato inspirará futuras marcas no nosso Mural de Sucesso.
                  </p>
                  
                  <button 
                    onClick={() => setShowNpsModal(true)}
                    className="bg-white text-[var(--color-atelier-grafite)] px-8 py-4 rounded-[1.2rem] font-roboto font-bold uppercase tracking-[0.1em] text-[11px] hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all duration-300 shadow-[0_10px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_30px_rgba(173,111,64,0.4)] flex items-center gap-3 relative z-10 hover:-translate-y-1"
                  >
                    Deixar Relato <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNpsModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleSkipNps} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/60 backdrop-blur-md cursor-pointer" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="glass-panel bg-white/95 backdrop-blur-xl p-10 md:p-12 rounded-[3.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.15)] relative z-10 w-full max-w-xl border border-white flex flex-col gap-8 text-center">
                <div className="mx-auto w-20 h-20 rounded-[1.5rem] bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shadow-inner">
                  <Star size={32} />
                </div>
                
                <div>
                  <h3 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-3">Como avalia a entrega?</h3>
                  <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/60 font-medium">De 0 a 10, quão alinhada esta Identidade Visual está com a visão e os valores do seu negócio?</p>
                </div>
                
                <div className="flex justify-between gap-2 mt-2">
                  {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                    <button 
                      key={num} 
                      onClick={() => setNpsScore(num)} 
                      className={`w-9 h-12 md:w-11 md:h-14 rounded-[1rem] font-bold text-[14px] md:text-[16px] transition-all
                        ${npsScore === num 
                          ? 'bg-[var(--color-atelier-terracota)] text-white shadow-lg scale-110 border-transparent' 
                          : 'bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/50 hover:border-[var(--color-atelier-terracota)]/40 hover:text-[var(--color-atelier-terracota)]'
                        }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <textarea 
                  value={npsFeedback} 
                  onChange={e => setNpsFeedback(e.target.value)} 
                  placeholder="Deixe um comentário opcional. O que mais gostou no processo de criação da sua marca?" 
                  className="w-full bg-gray-50/50 border border-[var(--color-atelier-grafite)]/10 rounded-2xl p-5 text-[13px] font-medium text-[var(--color-atelier-grafite)] resize-none h-28 outline-none focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 focus:shadow-sm transition-all custom-scrollbar" 
                />

                <div className="flex gap-4 mt-2">
                  <button onClick={handleSkipNps} className="flex-1 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-grafite)] transition-colors rounded-[1.2rem] hover:bg-gray-50">
                    Pular Avaliação
                  </button>
                  <button onClick={handleSubmitNps} disabled={npsScore === null || isProcessingNps} className="flex-1 bg-[var(--color-atelier-grafite)] text-white py-4 rounded-[1.2rem] text-[11px] font-bold uppercase tracking-[0.1em] shadow-md hover:bg-[var(--color-atelier-terracota)] transition-colors disabled:opacity-50 flex justify-center items-center gap-2 hover:-translate-y-0.5 disabled:hover:translate-y-0">
                    {isProcessingNps ? <Loader2 size={16} className="animate-spin"/> : "Enviar Relato"}
                  </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpsellModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="glass-panel bg-white p-10 md:p-12 rounded-[3.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.2)] relative z-10 w-full max-w-xl border border-white flex flex-col gap-6 text-center">
                <div className="mx-auto w-20 h-20 rounded-[1.5rem] bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center mb-2 shadow-inner border border-[var(--color-atelier-terracota)]/20">
                  <Zap size={32} fill="currentColor" />
                </div>
                
                <div>
                  <h3 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-4 leading-tight">Pronto para o Próximo Nível?</h3>
                  <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/70 leading-relaxed font-medium">
                    Ficamos muito felizes que tenha adorado a sua nova Identidade Visual! Sabia que as marcas que delegam 100% da sua presença digital crescem em média 3x mais rápido? <br/><br/>O Atelier pode assumir toda a gestão e produção de conteúdo do seu Instagram.
                  </p>
                </div>

                <div className="flex flex-col gap-3 mt-4">
                  <button onClick={handleAcceptUpsell} className="w-full bg-[var(--color-atelier-terracota)] text-white py-5 rounded-[1.5rem] font-bold uppercase tracking-[0.1em] text-[11px] shadow-lg hover:bg-[#8c562e] hover:-translate-y-0.5 transition-all">
                    Sim, Quero Delegar o Meu Instagram
                  </button>
                  <button onClick={handleDeclineUpsell} className="w-full bg-transparent border border-transparent hover:border-gray-100 text-[var(--color-atelier-grafite)]/50 py-4 rounded-[1.5rem] font-bold uppercase tracking-widest text-[10px] hover:text-[var(--color-atelier-grafite)] hover:bg-gray-50 transition-colors">
                    Não, apenas a Identidade Visual está ótimo.
                  </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}