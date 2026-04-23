// src/app/cockpit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { NotificationEngine } from "../../lib/NotificationEngine"; 
import { 
  Activity, AlertCircle, ArrowRight, CheckCircle2, 
  Clock, Compass, Sparkles, Loader2, TrendingUp, 
  Target, Camera, LayoutDashboard, SlidersHorizontal, ChevronRight,
  CalendarDays, MessageSquare, XCircle, Star, Zap, FileText
} from "lucide-react";
import InstagramBriefingModal from "../../components/InstagramBriefingModal";
import MissionsVaultModal from "../../components/MissionsVaultModal";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function CockpitPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientName, setClientName] = useState("Cliente");
  const [clientId, setClientId] = useState("");
  const [project, setProject] = useState<any>(null);

  // Estados IDV (Originais)
  const [pendingCount, setPendingCount] = useState(0);
  const [healthScore, setHealthScore] = useState(85);
  const [currentFocus, setCurrentFocus] = useState("A alinhar estratégia visual");

  // Estados Instagram OS (Novos)
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
  const [briefing, setBriefing] = useState<any>(null);
  const [pendingMissions, setPendingMissions] = useState(0);
  const [pendingDirections, setPendingDirections] = useState(0);
  
  // Estado do Planeamento Editorial Mensal
  const [monthlyPlan, setMonthlyPlan] = useState<any[]>([]);
  const [feedbackText, setFeedbackText] = useState<{ [key: string]: string }>({});
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);

  // NOVO: Estado para verificar se há relatórios mensais disponíveis
  const [hasReports, setHasReports] = useState(false);

  // ESTADO: COFRE DE MISSÕES
  const [isMissionsModalOpen, setIsMissionsModalOpen] = useState(false);

  // ==========================================
  // ESTADOS T-NPS E UPSELL (Psicologia de Conversão)
  // ==========================================
  const [showNpsModal, setShowNpsModal] = useState(false);
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsFeedback, setNpsFeedback] = useState("");
  const [showUpsellModal, setShowUpsellModal] = useState(false);

  useEffect(() => {
    const fetchCockpitData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error("Sessão não encontrada.");
        setClientId(session.user.id);

        // 1. Buscar Perfil
        const { data: profile } = await supabase.from('profiles').select('nome').eq('id', session.user.id).single();
        if (profile?.nome) setClientName(profile.nome.split(' ')[0]);

        // 2. Buscar Projeto Ativo
        const { data: proj } = await supabase.from('projects').select('*').eq('client_id', session.user.id).in('status', ['active', 'delivered']).order('created_at', { ascending: false }).limit(1).maybeSingle();
        setProject(proj);

        if (proj) {
          setHealthScore(proj.brand_health_score ?? 85);
          setCurrentFocus(proj.current_focus || "Liz está a analisar a sua audiência...");

          // 3. Buscar Dados de Gargalo (Posts Pendentes)
          const { count: postsCount } = await supabase.from('social_posts').select('*', { count: 'exact', head: true }).eq('project_id', proj.id).eq('status', 'pending_approval');
          setPendingCount(postsCount || 0);

          if (proj.type === 'Gestão de Instagram' || proj.service_type === 'Gestão de Instagram') {
            
            const { data: brief } = await supabase
              .from('instagram_briefings')
              .select('*')
              .eq('project_id', proj.id)
              .or('status.neq.returned,status.is.null')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(); // Correção aplicada aqui (caso não haja briefing)
            setBriefing(brief);

            // 5. Buscar Missões Pendentes
            const { count: missionsCount } = await supabase.from('asset_missions').select('*', { count: 'exact', head: true }).eq('project_id', proj.id).eq('status', 'pending');
            setPendingMissions(missionsCount || 0);

            // 6. Buscar Direções do Brandbook Pendentes de Avaliação
            const { data: directions } = await supabase.from('design_directions').select('score').eq('project_id', proj.id);
            const pendingDirs = directions?.filter(d => !d.score || d.score === 0).length || 0;
            setPendingDirections(pendingDirs);

            // 7. Buscar Planeamento Editorial Mensal
            const { data: plans } = await supabase.from('content_planning').select('*').eq('project_id', proj.id).eq('status', 'pending').order('publish_date', { ascending: true });
            if (plans) setMonthlyPlan(plans);

            // 8. Verificar se existem Relatórios Executivos Aprovados (Usando maybeSingle se for para buscar dados, mas como usa count, está OK)
            // Para garantir estabilidade, deixamos o count, mas a lógica de relatórios e snapshots que usava .single() noutros locais deve ser .maybeSingle()
            const { count: reportsCount } = await supabase.from('monthly_reports').select('*', { count: 'exact', head: true }).eq('project_id', proj.id).eq('status', 'approved');
            setHasReports((reportsCount || 0) > 0);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar o Cockpit:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCockpitData();
  }, []);

  // ==========================================
  // MOTORES DO PLANEAMENTO MENSAL E T-NPS
  // ==========================================
  const handleApprovePlan = async (planId: string) => {
    setIsProcessing(true);
    try {
      await supabase.from('content_planning').update({ status: 'approved' }).eq('id', planId);
      setMonthlyPlan(monthlyPlan.filter(p => p.id !== planId));
      
      // Abre a cortina do T-NPS (Micro-Gatilho de Qualidade)
      setShowNpsModal(true);
    } catch (error) {
      showToast("Erro ao aprovar a estratégia.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitNps = async () => {
    if (npsScore === null || !project) return;
    setIsProcessing(true);
    try {
      await supabase.from('t_nps_scores').insert({
        project_id: project.id,
        client_id: clientId,
        score: npsScore,
        feedback: npsFeedback,
      });

      setShowNpsModal(false);

      // 🧠 O PICO DE DOPAMINA: Se for Promotor (9 ou 10), oferece o Upsell.
      if (npsScore >= 9) {
        setTimeout(() => {
          setShowUpsellModal(true);
        }, 500); // Delay sutil para a troca de modais parecer elegante
      } else {
        showToast("Aprovação e Avaliação registadas com sucesso. O Estúdio avança!");
        setNpsScore(null);
        setNpsFeedback("");
      }

    } catch (error) {
      showToast("Erro ao enviar avaliação.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipNps = () => {
    showToast("Estratégia aprovada! O estúdio iniciará a confeção da arte.");
    setShowNpsModal(false);
    setNpsScore(null);
    setNpsFeedback("");
  };

  // ==========================================
  // 🚀 LÓGICA DO UPSELL
  // ==========================================
  const handleAcceptUpsell = async () => {
    setShowUpsellModal(false);
    showToast("Excelente! A nossa equipa entrará em contacto muito em breve.");
    
    // 🔔 SINAL DE FUMO PARA A GESTÃO (LEAD QUENTE)
    await NotificationEngine.notifyManagement(
       "🔥 Boiling Lead: Upsell Aceite!",
       `O cliente ${clientName} (${project?.profiles?.nome}) avaliou-nos com nota ${npsScore} e manifestou interesse em escalar o plano no Cockpit.`,
       "success",
       "/admin/clientes"
    );
    
    setNpsScore(null);
    setNpsFeedback("");
  };

  const handleDeclineUpsell = () => {
    setShowUpsellModal(false);
    showToast("Aprovação registada com sucesso. O Estúdio avança!");
    setNpsScore(null);
    setNpsFeedback("");
  };

  const handleRejectPlan = async (planId: string) => {
    const feedback = feedbackText[planId];
    if (!feedback || feedback.trim() === "") {
      showToast("Por favor, justifique o ajuste necessário para orientar a equipa.");
      return;
    }
    setIsProcessing(true);
    try {
      await supabase.from('content_planning').update({ status: 'needs_revision', feedback: feedback }).eq('id', planId);
      setMonthlyPlan(monthlyPlan.filter(p => p.id !== planId));
      setActiveFeedbackId(null);
      showToast("Feedback enviado. A estratégia voltou para a mesa da equipa de conteúdo.");
    } catch (error) {
      showToast("Erro ao enviar feedback.");
    } finally {
      setIsProcessing(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 19 ? "Boa tarde" : "Boa noite";

  if (isLoading) return <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center"><Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={32} /></div>;

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-4 opacity-50">
        <Compass size={48} className="text-[var(--color-atelier-grafite)]" />
        <h2 className="font-elegant text-3xl">Nenhum projeto ativo.</h2>
        <p className="font-roboto text-sm">Aguarde o Atelier iniciar a sua mesa de trabalho.</p>
      </div>
    );
  }

  // ==========================================================================
  // RENDERIZAÇÃO CONDICIONAL: INSTAGRAM OS (A Nova Experiência de Luxo)
  // ==========================================================================
  if (project.type === 'Gestão de Instagram' || project.service_type === 'Gestão de Instagram') {
    
    // Cálculo do 'The Forge' (Progresso)
    let currentPhase = 1;
    if (briefing) currentPhase = 2;
    if (briefing && pendingDirections === 0 && project.instagram_ai_insight) currentPhase = 3;
    if (pendingCount > 0 || healthScore > 85) currentPhase = 4;

    const pendingPlanCount = monthlyPlan.length;

    return (
      <div className="flex flex-col max-w-[1200px] mx-auto w-full gap-8 relative z-10 pb-10 px-4 md:px-0">
        
        {/* CABEÇALHO E TRANSPARÊNCIA */}
        <header className="animate-[fadeInUp_0.5s_ease-out] flex flex-col md:flex-row md:items-end justify-between gap-4 mt-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60">
                {currentFocus}
              </span>
            </div>
            <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-tight tracking-tight">
              {greeting}, <span className="text-[var(--color-atelier-terracota)] italic">{clientName}.</span>
            </h1>
            <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-3 max-w-lg leading-relaxed font-medium">
              Bem-vindo ao seu painel de controle executivo. Aqui transformamos estética em dados e conteúdo em equity para a sua marca.
            </p>
          </div>
        </header>

        {/* THE FORGE (Painel de Fundição / Tracker de Etapas) */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel bg-white/60 p-8 md:p-10 rounded-[3rem] border border-white shadow-sm relative overflow-hidden transition-colors hover:bg-white/80">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-atelier-terracota)]/5 rounded-full blur-3xl"></div>
          
          <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-8 relative z-10">The Forge <span className="text-[var(--color-atelier-grafite)]/40 text-xl">/ Tracker de Evolução</span></h2>
          
          <div className="flex flex-col md:flex-row justify-between relative gap-8 md:gap-0 z-10">
            <div className="hidden md:block absolute top-8 left-16 right-16 h-1.5 bg-[var(--color-atelier-grafite)]/5 z-0 rounded-full shadow-inner"></div>
            <div className="hidden md:block absolute top-8 left-16 h-1.5 bg-gradient-to-r from-[var(--color-atelier-rose)] to-[var(--color-atelier-terracota)] z-0 transition-all duration-1000 rounded-full shadow-sm" style={{ width: `${(currentPhase - 1) * 33}%` }}></div>
            
            {[
              { step: 1, title: 'Diagnóstico', desc: 'Dossiê de Mercado', icon: <Target size={18}/> },
              { step: 2, title: 'Aura Visual', desc: 'Brandbook', icon: <SlidersHorizontal size={18}/> },
              { step: 3, title: 'Confecção', desc: 'Fluxo de Impacto', icon: <LayoutDashboard size={18}/> },
              { step: 4, title: 'Governança', desc: 'Oráculo Analytics', icon: <Activity size={18}/> },
            ].map((phase, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center gap-4 group">
                <div className={`w-16 h-16 rounded-[1.2rem] flex items-center justify-center transition-all duration-700 shadow-sm
                  ${currentPhase > phase.step ? 'bg-[var(--color-atelier-terracota)] text-white border-none scale-105' 
                  : currentPhase === phase.step ? 'bg-white border-2 border-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)] shadow-[0_0_20px_rgba(173,111,64,0.2)] scale-110' 
                  : 'bg-white/50 border border-white text-[var(--color-atelier-grafite)]/30'}
                `}>
                  {currentPhase > phase.step ? <CheckCircle2 size={24} /> : phase.icon}
                </div>
                <div className="text-center">
                  <span className={`block font-roboto text-[12px] font-bold uppercase tracking-widest transition-colors ${currentPhase >= phase.step ? 'text-[var(--color-atelier-grafite)]' : 'text-[var(--color-atelier-grafite)]/40'}`}>{phase.title}</span>
                  <span className="block font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 mt-1 font-medium">{phase.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* =========================================================
            SECÇÃO: ESTRATÉGIA EDITORIAL MENSAL E APROVAÇÃO
            ========================================================= */}
        {monthlyPlan.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-panel bg-white/60 p-8 md:p-12 rounded-[3.5rem] border border-white shadow-sm transition-colors hover:bg-white/80">
            <div className="flex items-start justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-6 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays size={16} className="text-[var(--color-atelier-terracota)]" />
                  <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)]">Estratégia do Mês</span>
                </div>
                <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Validação de Copy & Contexto</h2>
                <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 max-w-2xl leading-relaxed font-medium">
                  Antes de confecionarmos a arte gráfica, validamos a intenção. Aprove os ganchos e as abordagens abaixo para que o estúdio inicie a produção dos ativos visuais.
                </p>
              </div>
              <div className="bg-orange-50 text-orange-600 px-5 py-3 rounded-2xl border border-orange-100 flex flex-col items-center justify-center shadow-inner shrink-0">
                <span className="font-elegant text-3xl leading-none">{monthlyPlan.length}</span>
                <span className="font-roboto text-[8px] font-bold uppercase tracking-widest mt-1">Pendentes</span>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {monthlyPlan.map((plan) => (
                <div key={plan.id} className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm flex flex-col md:flex-row gap-8 transition-all hover:shadow-md hover:border-[var(--color-atelier-terracota)]/20">
                  
                  {/* Lado Esquerdo: Dados Estratégicos */}
                  <div className="w-full md:w-1/3 flex flex-col gap-5 border-b md:border-b-0 md:border-r border-[var(--color-atelier-grafite)]/10 pb-6 md:pb-0 md:pr-6 shrink-0">
                    <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                      <span className="block font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">Data Sugerida</span>
                      <span className="font-roboto text-[14px] font-bold text-[var(--color-atelier-grafite)]">
                        {plan.publish_date ? new Date(plan.publish_date).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'short' }) : "A definir"}
                      </span>
                    </div>
                    <div className="bg-[var(--color-atelier-creme)]/40 p-4 rounded-2xl border border-[var(--color-atelier-terracota)]/10">
                      <span className="block font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">Pilar (Tilt)</span>
                      <span className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                        {plan.pillar || "Estratégico"}
                      </span>
                    </div>
                  </div>

                  {/* Lado Direito: Copy e Ações */}
                  <div className="flex-1 flex flex-col">
                    <div className="mb-8">
                      <h4 className="font-elegant text-2xl md:text-3xl text-[var(--color-atelier-grafite)] mb-4 leading-tight">"{plan.hook}"</h4>
                      <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/80 leading-relaxed whitespace-pre-wrap font-medium bg-white/40 p-6 rounded-3xl border border-gray-50 shadow-inner">
                        {plan.briefing}
                      </p>
                    </div>

                    <div className="mt-auto flex flex-col sm:flex-row gap-3 pt-4 border-t border-[var(--color-atelier-grafite)]/5">
                      <button 
                        onClick={() => handleApprovePlan(plan.id)}
                        disabled={isProcessing}
                        className="flex-1 bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] py-4 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-[0.1em] transition-all shadow-md flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} /> Aprovar Ideia
                      </button>
                      
                      <button 
                        onClick={() => setActiveFeedbackId(activeFeedbackId === plan.id ? null : plan.id)}
                        className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/60 hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)] py-4 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-[0.1em] transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <MessageSquare size={16} /> Solicitar Ajuste
                      </button>
                    </div>

                    {/* Área de Input de Feedback */}
                    <AnimatePresence>
                      {activeFeedbackId === plan.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mt-4 bg-[var(--color-atelier-creme)]/40 p-5 rounded-3xl border border-[var(--color-atelier-terracota)]/10 flex flex-col gap-3 shadow-inner">
                            <textarea 
                              placeholder="O que devemos ajustar na abordagem deste conteúdo?"
                              value={feedbackText[plan.id] || ""}
                              onChange={(e) => setFeedbackText({...feedbackText, [plan.id]: e.target.value})}
                              className="w-full bg-white border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-2xl p-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] resize-none h-24 outline-none shadow-sm custom-scrollbar transition-colors"
                            />
                            <div className="flex justify-end gap-3 mt-1">
                              <button onClick={() => setActiveFeedbackId(null)} className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-grafite)] transition-colors bg-white rounded-xl shadow-sm">Cancelar</button>
                              <button onClick={() => handleRejectPlan(plan.id)} disabled={isProcessing || !feedbackText[plan.id]?.trim()} className="px-6 py-2.5 bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
                                <XCircle size={14} /> Recusar e Enviar Ajuste
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                </div>
              ))}
            </div>
          </motion.section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* MÓDULO DE AÇÃO EXIGIDA (Gargalos) */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`md:col-span-8 glass-panel p-8 md:p-10 flex flex-col justify-between relative overflow-hidden transition-all duration-500 rounded-[3rem] border shadow-sm
            ${(!briefing || pendingCount > 0 || pendingDirections > 0 || pendingMissions > 0 || pendingPlanCount > 0) ? 'bg-white/90 border-orange-200' : 'bg-white/60 border-white'}
          `}>
            
            <div className="flex items-start justify-between mb-8">
              <div>
                <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2 block">
                  Ação Requerida do Cliente
                </span>
                <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                  {!briefing ? 'Dossiê de Mercado Pendente' : pendingPlanCount > 0 ? 'Validação de Estratégia Pendente' : pendingDirections > 0 ? 'Brandbook: Avaliação Pendente' : pendingCount > 0 ? 'Curadoria: Aprovações Pendentes' : pendingMissions > 0 ? 'Cofre: Missões Pendentes' : 'Mesa Limpa. Tudo em Dia.'}
                </h2>
              </div>
              <div className={`w-16 h-16 rounded-[1.2rem] flex items-center justify-center shrink-0 shadow-inner border
                ${(!briefing || pendingCount > 0 || pendingDirections > 0 || pendingMissions > 0 || pendingPlanCount > 0) ? 'bg-orange-50 text-orange-500 border-orange-100' : 'bg-green-50 text-green-500 border-green-100'}
              `}>
                {(!briefing || pendingCount > 0 || pendingDirections > 0 || pendingMissions > 0 || pendingPlanCount > 0) ? <AlertCircle size={28} /> : <CheckCircle2 size={28} />}
              </div>
            </div>

            <div>
              <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/80 mb-8 leading-relaxed max-w-xl font-medium">
                {!briefing ? 'Para ativarmos o nosso Chief Marketing Officer (IA) e desenharmos o seu Brandbook, precisamos que responda a algumas perguntas estratégicas sobre o seu negócio.' 
                : pendingPlanCount > 0 ? `Temos ${pendingPlanCount} ideias de conteúdo aguardando a sua aprovação textual na secção acima. Valide para iniciarmos a criação gráfica.`
                : pendingDirections > 0 ? `O Diretor de Arte enviou ${pendingDirections} direções visuais. A sua avaliação vai calibrar a estética final da sua marca.` 
                : pendingCount > 0 ? `O Fluxo de Impacto tem ${pendingCount} conteúdos aguardando a sua validação. A aprovação rápida com "Double Tap" mantém a máquina a rodar.` 
                : pendingMissions > 0 ? `Temos ${pendingMissions} missões de captura aguardando o envio dos seus materiais crus para o nosso Cofre de Ativos.` 
                : 'Não há ações exigidas da sua parte neste momento. O nosso estúdio está a produzir a próxima vaga de conteúdo.'}
              </p>

              {!briefing ? (
                <button onClick={() => setIsBriefingModalOpen(true)} className="px-8 py-5 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-[0.1em] flex items-center gap-3 transition-all bg-[var(--color-atelier-terracota)] text-white hover:bg-[#8c562e] shadow-md hover:-translate-y-0.5">
                  Preencher Briefing Agora <ArrowRight size={16} />
                </button>
              ) : pendingPlanCount > 0 ? (
                <button onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })} className="px-8 py-5 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-[0.1em] flex items-center gap-3 transition-all bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] shadow-md hover:-translate-y-0.5">
                  Revisar Estratégia <ArrowRight size={16} />
                </button>
              ) : pendingDirections > 0 ? (
                <button onClick={() => setIsMissionsModalOpen(true)} className="px-8 py-5 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-[0.1em] flex items-center gap-3 transition-all bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] shadow-md hover:-translate-y-0.5">
                  Acessar Brandbook <ArrowRight size={16} />
                </button>
              ) : pendingCount > 0 ? (
                <button onClick={() => router.push('/curadoria')} className="px-8 py-5 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-[0.1em] flex items-center gap-3 transition-all bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] shadow-md hover:-translate-y-0.5">
                  Acessar Fluxo de Impacto <ArrowRight size={16} />
                </button>
              ) : pendingMissions > 0 ? (
                <button onClick={() => setIsMissionsModalOpen(true)} className="px-8 py-5 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-[0.1em] flex items-center gap-3 transition-all bg-orange-500 text-white hover:bg-orange-600 shadow-md hover:-translate-y-0.5">
                  Abrir Cofre de Missões <ArrowRight size={16} />
                </button>
              ) : (
                <button disabled className="px-8 py-5 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-all bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/40 cursor-not-allowed shadow-sm">
                  Monitorando Ativos <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          </motion.div>

          {/* ACESSOS RÁPIDOS */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="md:col-span-4 flex flex-col gap-4">
            
            {/* NOVO ACESSO: RELATÓRIOS MENSAIS */}
            <button 
              onClick={() => router.push('/cockpit/relatorios')} 
              className={`flex-1 glass-panel p-6 rounded-[2.5rem] border flex items-center gap-5 transition-all group shadow-sm hover:shadow-md hover:-translate-y-1
                ${hasReports ? 'bg-white border-[var(--color-atelier-terracota)]/30 scale-[1.02]' : 'bg-white/60 hover:bg-white border-white'}
              `}
            >
              <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-transform shadow-inner border
                ${hasReports ? 'bg-[var(--color-atelier-terracota)] text-white border-[var(--color-atelier-terracota)] group-hover:rotate-12' : 'bg-white border-white text-[var(--color-atelier-grafite)] group-hover:scale-110'}
              `}>
                <FileText size={20}/>
              </div>
              <div className="text-left flex-1">
                <span className={`block font-elegant text-2xl ${hasReports ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>Auditoria</span>
                <span className="block font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest font-bold mt-1">Relatório Mensal</span>
              </div>
              <ChevronRight size={20} className={hasReports ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/20 group-hover:text-[var(--color-atelier-terracota)] transition-colors'}/>
            </button>

            <button onClick={() => router.push('/curadoria')} className="flex-1 glass-panel bg-white/60 hover:bg-white p-6 rounded-[2.5rem] border border-white flex items-center gap-5 transition-all group shadow-sm hover:shadow-md hover:-translate-y-1">
              <div className="w-14 h-14 rounded-[1.2rem] bg-white border border-white shadow-inner flex items-center justify-center text-[var(--color-atelier-grafite)] group-hover:scale-110 transition-transform"><LayoutDashboard size={20}/></div>
              <div className="text-left flex-1">
                <span className="block font-elegant text-2xl text-[var(--color-atelier-grafite)]">Brandbook</span>
                <span className="block font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest font-bold mt-1">Aprovação Visual</span>
              </div>
              <ChevronRight size={20} className="text-[var(--color-atelier-grafite)]/20 group-hover:text-[var(--color-atelier-terracota)] transition-colors"/>
            </button>
            
            <button onClick={() => setIsMissionsModalOpen(true)} className="flex-1 glass-panel bg-white/60 hover:bg-white p-6 rounded-[2.5rem] border border-white flex items-center gap-5 transition-all group shadow-sm hover:shadow-md hover:-translate-y-1">
              <div className="w-14 h-14 rounded-[1.2rem] bg-white border border-white shadow-inner flex items-center justify-center text-[var(--color-atelier-grafite)] group-hover:scale-110 transition-transform"><Camera size={20}/></div>
              <div className="text-left flex-1">
                <span className="block font-elegant text-2xl text-[var(--color-atelier-grafite)]">Missões</span>
                <span className="block font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest font-bold mt-1">Envio de Material</span>
              </div>
              <ChevronRight size={20} className="text-[var(--color-atelier-grafite)]/20 group-hover:text-[var(--color-atelier-terracota)] transition-colors"/>
            </button>
          </motion.div>

        </div>

        <InstagramBriefingModal 
          isOpen={isBriefingModalOpen} 
          onClose={() => setIsBriefingModalOpen(false)} 
          projectId={project.id} 
          clientId={clientId} 
          onSuccess={() => {
            setIsBriefingModalOpen(false);
            window.location.reload(); 
          }} 
        />

        <MissionsVaultModal 
          isOpen={isMissionsModalOpen} 
          onClose={() => setIsMissionsModalOpen(false)} 
          projectId={project.id} 
          clientId={clientId} 
          clientName={clientName} 
        />

        {/* =========================================================================
            MODAL T-NPS (Micro-Gatilho de Qualidade)
            ========================================================================= */}
        <AnimatePresence>
          {showNpsModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/60 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="glass-panel bg-white/95 backdrop-blur-xl p-10 md:p-12 rounded-[3.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.15)] relative z-10 w-full max-w-xl border border-white flex flex-col gap-8 text-center">
                 <div className="mx-auto w-20 h-20 rounded-[1.5rem] bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shadow-inner">
                   <Star size={32} />
                 </div>
                 
                 <div>
                   <h3 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-3">Como avalia a entrega?</h3>
                   <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/60 font-medium">De 0 a 10, quão alinhada esta estratégia está com a visão e os valores da sua marca?</p>
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
                   placeholder="Deixe um comentário opcional. O que lhe agradou mais? O que podemos refinar?" 
                   className="w-full bg-gray-50/50 border border-[var(--color-atelier-grafite)]/10 rounded-2xl p-5 text-[13px] font-medium text-[var(--color-atelier-grafite)] resize-none h-28 outline-none focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 focus:shadow-sm transition-all custom-scrollbar" 
                 />

                 <div className="flex gap-4 mt-2">
                   <button onClick={handleSkipNps} className="flex-1 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-grafite)] transition-colors rounded-xl hover:bg-gray-50">
                     Pular Avaliação
                   </button>
                   <button onClick={handleSubmitNps} disabled={npsScore === null || isProcessing} className="flex-1 bg-[var(--color-atelier-grafite)] text-white py-4 rounded-[1.2rem] text-[11px] font-bold uppercase tracking-[0.1em] shadow-md hover:bg-[var(--color-atelier-terracota)] transition-colors disabled:opacity-50 flex justify-center items-center gap-2 hover:-translate-y-0.5 disabled:hover:translate-y-0">
                     {isProcessing ? <Loader2 size={16} className="animate-spin"/> : "Enviar Resposta"}
                   </button>
                 </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* =========================================================================
            🚀 UPSELL MODAL (PICO DE DOPAMINA)
            ========================================================================= */}
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
                     Ficamos felizes que esteja a adorar o nosso trabalho estratégico. Sabia que clientes que delegam 100% da execução crescem em média 3x mais rápido? <br/><br/>Podemos assumir toda a produção gráfica e gestão diária da sua marca.
                   </p>
                 </div>

                 <div className="flex flex-col gap-3 mt-4">
                   <button onClick={handleAcceptUpsell} className="w-full bg-[var(--color-atelier-terracota)] text-white py-5 rounded-[1.5rem] font-bold uppercase tracking-[0.1em] text-[11px] shadow-lg hover:bg-[#8c562e] hover:-translate-y-0.5 transition-all">
                     Sim, Quero Escalar os Meus Resultados
                   </button>
                   <button onClick={handleDeclineUpsell} className="w-full bg-transparent border border-transparent hover:border-gray-100 text-[var(--color-atelier-grafite)]/50 py-4 rounded-[1.5rem] font-bold uppercase tracking-widest text-[10px] hover:text-[var(--color-atelier-grafite)] hover:bg-gray-50 transition-colors">
                     Manter o meu plano atual
                   </button>
                 </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  // ==========================================================================
  // RENDERIZAÇÃO CONDICIONAL: IDENTIDADE VISUAL
  // ==========================================================================
  return (
    <div className="flex flex-col max-w-[1000px] mx-auto w-full gap-8 relative z-10 pb-10 px-4 md:px-0">
      
      <header className="animate-[fadeInUp_0.5s_ease-out] flex flex-col md:flex-row md:items-end justify-between gap-4 mt-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Compass size={16} className="text-[var(--color-atelier-terracota)]" />
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60">
              Resumo Executivo
            </span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-tight tracking-tight">
            {greeting}, <span className="text-[var(--color-atelier-terracota)] italic">{clientName}.</span>
          </h1>
          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-3 max-w-md font-medium leading-relaxed">
            O seu painel de controlo diário. Sem métricas de vaidade, apenas o que impacta a construção da sua marca hoje.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-[fadeInUp_0.6s_ease-out]">
        
        <motion.div whileHover={{ y: -4 }} className={`md:col-span-8 glass-panel p-8 md:p-12 flex flex-col justify-between relative overflow-hidden transition-all duration-500 rounded-[3rem] border
            ${pendingCount > 0 ? 'bg-white/90 border-orange-200 shadow-[0_20px_50px_rgba(249,115,22,0.08)]' : 'bg-white/60 border-white shadow-sm'}
          `}>
          {pendingCount > 0 && <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>}
          
          <div className="flex items-start justify-between mb-8">
            <div>
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2 block">
                Ação Requerida
              </span>
              <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                {pendingCount > 0 ? 'Aprovações Pendentes' : 'Tudo em Dia'}
              </h2>
            </div>
            <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shrink-0 shadow-inner border
              ${pendingCount > 0 ? 'bg-orange-50 text-orange-500 border-orange-100' : 'bg-green-50 text-green-500 border-green-100'}
            `}>
              {pendingCount > 0 ? <AlertCircle size={28} /> : <CheckCircle2 size={28} />}
            </div>
          </div>

          <div>
            <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/80 mb-8 leading-relaxed font-medium">
              {pendingCount > 0 
                ? `Existem ${pendingCount} peças criativas aguardando a sua validação. A sua aprovação rápida garante que o cronograma do projeto se mantém intacto.` 
                : 'Não há aprovações a aguardar a sua validação neste momento. O estúdio está focado a produzir a próxima vaga de design.'}
            </p>

            <button onClick={() => router.push('/curadoria')} className={`px-8 py-5 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-[0.1em] flex items-center gap-3 transition-all outline-none
                ${pendingCount > 0 
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md hover:shadow-lg hover:-translate-y-0.5' 
                  : 'bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)] shadow-sm hover:shadow-md hover:-translate-y-0.5'}
              `}>
              {pendingCount > 0 ? 'Revisar Conteúdo Agora' : 'Ver Histórico de Curadoria'}
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="md:col-span-4 glass-panel p-8 md:p-10 flex flex-col justify-between bg-white/60 relative overflow-hidden rounded-[3rem] border border-white shadow-sm transition-colors hover:bg-white/80">
          <div className="absolute -right-6 -top-6 w-40 h-40 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div>
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2 flex items-center gap-2">
              <Activity size={12} className="text-[var(--color-atelier-terracota)]"/> Atelier Pulse
            </span>
            <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-6">Saúde da Marca</h2>
          </div>

          <div className="flex flex-col items-center justify-center my-6 relative z-10">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="66" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white drop-shadow-sm" />
                <motion.circle 
                  initial={{ strokeDasharray: "0 414" }}
                  animate={{ strokeDasharray: `${(healthScore / 100) * 414} 414` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  cx="72" cy="72" r="66" stroke="currentColor" strokeWidth="6" fill="transparent" 
                  strokeLinecap="round"
                  className="text-[var(--color-atelier-terracota)] drop-shadow-md" 
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-elegant text-5xl text-[var(--color-atelier-grafite)] leading-none mt-1">{healthScore}</span>
                <span className="font-roboto text-[9px] font-bold text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest mt-1.5">/ 100</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-2 relative z-10">
             <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white shadow-sm text-[var(--color-atelier-terracota)] font-roboto text-[10px] font-bold uppercase tracking-widest border border-[var(--color-atelier-terracota)]/10">
               <TrendingUp size={12} /> Crescimento Sólido
             </span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="md:col-span-12 glass-panel p-6 md:p-8 bg-white/70 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between border-l-4 border-l-[var(--color-atelier-grafite)] rounded-[2rem] rounded-l-lg shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[1rem] bg-white shadow-inner flex items-center justify-center shrink-0 border border-white/50">
              <Clock size={20} className="text-[var(--color-atelier-grafite)]" />
            </div>
            <div>
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 block mb-1">
                Transparência de Estúdio
              </span>
              <h3 className="font-roboto text-[15px] font-bold text-[var(--color-atelier-grafite)] flex items-center gap-2">
                Foco Atual: <span className="font-normal text-[var(--color-atelier-terracota)]">{currentFocus}</span>
              </h3>
            </div>
          </div>
          
          <div className="text-[11px] font-roboto font-bold text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest flex items-center gap-2 shrink-0 bg-white px-5 py-2.5 rounded-xl shadow-sm border border-white">
            <Sparkles size={14} className="text-[var(--color-atelier-terracota)]" /> Atualizado pelo Diretor de Arte
          </div>
        </motion.div>

      </div>
    </div>
  );
}