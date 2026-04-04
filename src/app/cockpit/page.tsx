// src/app/cockpit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { 
  Activity, AlertCircle, ArrowRight, CheckCircle2, 
  Clock, Compass, Sparkles, Loader2, TrendingUp, 
  Target, Camera, LayoutDashboard, SlidersHorizontal, ChevronRight,
  CalendarDays, MessageSquare, XCircle
} from "lucide-react";
import InstagramBriefingModal from "../../components/InstagramBriefingModal";

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
        const { data: proj } = await supabase.from('projects').select('*').eq('client_id', session.user.id).in('status', ['active', 'delivered']).order('created_at', { ascending: false }).limit(1).single();
        setProject(proj);

        if (proj) {
          setHealthScore(proj.brand_health_score ?? 85);
          setCurrentFocus(proj.current_focus || "Liz está a analisar a sua audiência...");

          // 3. Buscar Dados de Gargalo (Posts Pendentes)
          const { count: postsCount } = await supabase.from('social_posts').select('*', { count: 'exact', head: true }).eq('project_id', proj.id).in('status', ['pending_approval', 'needs_revision']);
          setPendingCount(postsCount || 0);

          if (proj.type === 'Gestão de Instagram') {
            // 4. Buscar Briefing de Instagram
            const { data: brief } = await supabase.from('instagram_briefings').select('*').eq('project_id', proj.id).maybeSingle();
            setBriefing(brief);

            // 5. Buscar Missões Pendentes
            const { count: missionsCount } = await supabase.from('asset_missions').select('*', { count: 'exact', head: true }).eq('project_id', proj.id).eq('status', 'pending');
            setPendingMissions(missionsCount || 0);

            // 6. Buscar Direções do Brandbook Pendentes de Avaliação
            const { data: directions } = await supabase.from('design_directions').select('score').eq('project_id', proj.id);
            const pendingDirs = directions?.filter(d => !d.score || d.score === 0).length || 0;
            setPendingDirections(pendingDirs);

            // 7. Buscar Planeamento Editorial Mensal (Ideias de Posts Pendentes de Texto)
            const { data: plans } = await supabase.from('content_planning').select('*').eq('project_id', proj.id).in('status', ['pending', 'needs_revision']).order('publish_date', { ascending: true });
            if (plans) setMonthlyPlan(plans);
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
  // MOTORES DO PLANEAMENTO MENSAL
  // ==========================================
  const handleApprovePlan = async (planId: string) => {
    setIsProcessing(true);
    try {
      await supabase.from('content_planning').update({ status: 'approved' }).eq('id', planId);
      setMonthlyPlan(monthlyPlan.filter(p => p.id !== planId));
      showToast("Estratégia aprovada! O estúdio iniciará a confeção da arte.");
    } catch (error) {
      showToast("Erro ao aprovar a estratégia.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectPlan = async (planId: string) => {
    const feedback = feedbackText[planId];
    if (!feedback || feedback.trim() === "") {
      showToast("Por favor, justifique o ajuste necessário para orientar a equipa.");
      return;
    }
    setIsProcessing(true);
    try {
      await supabase.from('content_planning').update({ status: 'rejected', feedback: feedback }).eq('id', planId);
      setMonthlyPlan(monthlyPlan.filter(p => p.id !== planId));
      setActiveFeedbackId(null);
      showToast("Feedback enviado. A estratégia será reformulada.");
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
  if (project.type === 'Gestão de Instagram') {
    
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
            <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-3 max-w-lg leading-relaxed">
              Bem-vindo ao seu painel de controle executivo. Aqui transformamos estética em dados e conteúdo em equity para a sua marca.
            </p>
          </div>
        </header>

        {/* THE FORGE (Painel de Fundição / Tracker de Etapas) */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel bg-white/70 p-8 md:p-10 rounded-[2.5rem] border border-white shadow-[0_15px_40px_rgba(173,111,64,0.05)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-atelier-terracota)]/5 rounded-full blur-3xl"></div>
          
          <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-8 relative z-10">The Forge <span className="text-[var(--color-atelier-grafite)]/40 text-xl">/ Tracker de Evolução</span></h2>
          
          <div className="flex flex-col md:flex-row justify-between relative gap-8 md:gap-0 z-10">
            <div className="hidden md:block absolute top-8 left-16 right-16 h-1 bg-[var(--color-atelier-grafite)]/5 z-0 rounded-full"></div>
            <div className="hidden md:block absolute top-8 left-16 h-1 bg-gradient-to-r from-[var(--color-atelier-terracota)] to-orange-400 z-0 transition-all duration-1000 rounded-full shadow-sm" style={{ width: `${(currentPhase - 1) * 33}%` }}></div>
            
            {[
              { step: 1, title: 'Diagnóstico', desc: 'Dossiê de Mercado', icon: <Target size={18}/> },
              { step: 2, title: 'Aura Visual', desc: 'Brandbook', icon: <SlidersHorizontal size={18}/> },
              { step: 3, title: 'Confecção', desc: 'Fluxo de Impacto', icon: <LayoutDashboard size={18}/> },
              { step: 4, title: 'Governança', desc: 'Oráculo Analytics', icon: <Activity size={18}/> },
            ].map((phase, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center gap-4 group">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-sm
                  ${currentPhase > phase.step ? 'bg-[var(--color-atelier-terracota)] text-white border-none scale-105' 
                  : currentPhase === phase.step ? 'bg-white border-2 border-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)] ring-4 ring-[var(--color-atelier-terracota)]/10 scale-110' 
                  : 'bg-white/50 border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/30'}
                `}>
                  {currentPhase > phase.step ? <CheckCircle2 size={24} /> : phase.icon}
                </div>
                <div className="text-center">
                  <span className={`block font-roboto text-[12px] font-bold uppercase tracking-widest transition-colors ${currentPhase >= phase.step ? 'text-[var(--color-atelier-grafite)]' : 'text-[var(--color-atelier-grafite)]/40'}`}>{phase.title}</span>
                  <span className="block font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 mt-1">{phase.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* =========================================================
            NOVA SECÇÃO: ESTRATÉGIA EDITORIAL MENSAL (Planeamento)
            ========================================================= */}
        {monthlyPlan.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-panel bg-white/70 p-8 md:p-10 rounded-[2.5rem] border border-white shadow-[0_15px_40px_rgba(173,111,64,0.05)]">
            <div className="flex items-start justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-6 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays size={16} className="text-[var(--color-atelier-terracota)]" />
                  <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)]">Estratégia do Mês</span>
                </div>
                <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Validação de Copy & Contexto</h2>
                <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 max-w-2xl leading-relaxed">
                  Antes de confecionarmos a arte gráfica, validamos a intenção. Aprove os ganchos e as abordagens abaixo para que o estúdio inicie a produção dos ativos visuais.
                </p>
              </div>
              <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-2xl border border-orange-100 flex flex-col items-center justify-center shadow-inner shrink-0">
                <span className="font-elegant text-2xl leading-none">{monthlyPlan.length}</span>
                <span className="font-roboto text-[8px] font-bold uppercase tracking-widest mt-1">Pendentes</span>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {monthlyPlan.map((plan) => (
                <div key={plan.id} className="bg-white p-6 md:p-8 rounded-[2rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm flex flex-col md:flex-row gap-8">
                  
                  {/* Lado Esquerdo: Dados Estratégicos */}
                  <div className="w-full md:w-1/3 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-[var(--color-atelier-grafite)]/10 pb-6 md:pb-0 md:pr-6 shrink-0">
                    <div>
                      <span className="block font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">Data Sugerida</span>
                      <span className="font-roboto text-[14px] font-medium text-[var(--color-atelier-grafite)]">
                        {plan.publish_date ? new Date(plan.publish_date).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'short' }) : "A definir"}
                      </span>
                    </div>
                    <div>
                      <span className="block font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">Pilar (Tilt)</span>
                      <span className="inline-block bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-terracota)] px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest">
                        {plan.pillar || "Estratégico"}
                      </span>
                    </div>
                  </div>

                  {/* Lado Direito: Copy e Ações */}
                  <div className="flex-1 flex flex-col">
                    <div className="mb-6">
                      <h4 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-3 leading-tight">"{plan.hook}"</h4>
                      <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 leading-relaxed whitespace-pre-wrap">
                        {plan.briefing}
                      </p>
                    </div>

                    <div className="mt-auto flex flex-col sm:flex-row gap-3 pt-4 border-t border-[var(--color-atelier-grafite)]/5">
                      <button 
                        onClick={() => handleApprovePlan(plan.id)}
                        disabled={isProcessing}
                        className="flex-1 bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] py-3 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} /> Aprovar Ideia
                      </button>
                      
                      <button 
                        onClick={() => setActiveFeedbackId(activeFeedbackId === plan.id ? null : plan.id)}
                        className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)] py-3 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <MessageSquare size={16} /> Solicitar Ajuste
                      </button>
                    </div>

                    {/* Área de Input de Feedback (Aparece ao clicar em Solicitar Ajuste) */}
                    <AnimatePresence>
                      {activeFeedbackId === plan.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mt-4 bg-[var(--color-atelier-creme)]/30 p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/10 flex flex-col gap-3">
                            <textarea 
                              placeholder="O que devemos ajustar na abordagem deste conteúdo?"
                              value={feedbackText[plan.id] || ""}
                              onChange={(e) => setFeedbackText({...feedbackText, [plan.id]: e.target.value})}
                              className="w-full bg-white border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl p-3 text-[12px] text-[var(--color-atelier-grafite)] resize-none h-20 outline-none shadow-sm custom-scrollbar"
                            />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setActiveFeedbackId(null)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 hover:text-red-500 transition-colors">Cancelar</button>
                              <button onClick={() => handleRejectPlan(plan.id)} disabled={isProcessing || !feedbackText[plan.id]?.trim()} className="px-6 py-2 bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`md:col-span-8 glass-panel p-8 md:p-10 flex flex-col justify-between relative overflow-hidden transition-all duration-500 rounded-[2.5rem] border shadow-sm
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
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner
                ${(!briefing || pendingCount > 0 || pendingDirections > 0 || pendingMissions > 0 || pendingPlanCount > 0) ? 'bg-orange-50 text-orange-500 border border-orange-100' : 'bg-green-50 text-green-500 border border-green-100'}
              `}>
                {(!briefing || pendingCount > 0 || pendingDirections > 0 || pendingMissions > 0 || pendingPlanCount > 0) ? <AlertCircle size={28} /> : <CheckCircle2 size={28} />}
              </div>
            </div>

            <div>
              <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/80 mb-8 leading-relaxed max-w-xl">
                {!briefing ? 'Para ativarmos o nosso Chief Marketing Officer (IA) e desenharmos o seu Brandbook, precisamos que responda a algumas perguntas estratégicas sobre o seu negócio.' 
                : pendingPlanCount > 0 ? `Temos ${pendingPlanCount} ideias de conteúdo aguardando a sua aprovação textual na secção acima. Valide para iniciarmos a criação gráfica.`
                : pendingDirections > 0 ? `O Diretor de Arte enviou ${pendingDirections} direções visuais. A sua avaliação vai calibrar a estética final da sua marca.` 
                : pendingCount > 0 ? `O Fluxo de Impacto tem ${pendingCount} conteúdos aguardando a sua validação. A aprovação rápida com "Double Tap" mantém a máquina a rodar.` 
                : pendingMissions > 0 ? `Temos ${pendingMissions} missões de captura aguardando o envio dos seus materiais crus para o nosso Cofre de Ativos.` 
                : 'Não há ações exigidas da sua parte neste momento. O nosso estúdio está a produzir a próxima vaga de conteúdo.'}
              </p>

              {!briefing ? (
                <button onClick={() => setIsBriefingModalOpen(true)} className="px-8 py-4 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-all bg-[var(--color-atelier-terracota)] text-white hover:bg-[#8c562e] shadow-md hover:-translate-y-0.5">
                  Preencher Dossiê Agora <ArrowRight size={16} />
                </button>
              ) : pendingPlanCount > 0 ? (
                <button onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })} className="px-8 py-4 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-all bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] shadow-md hover:-translate-y-0.5">
                  Revisar Estratégia <ArrowRight size={16} />
                </button>
              ) : pendingDirections > 0 ? (
                <button onClick={() => router.push('/cofre-missoes')} className="px-8 py-4 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-all bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] shadow-md hover:-translate-y-0.5">
                  Acessar Brandbook <ArrowRight size={16} />
                </button>
              ) : pendingCount > 0 ? (
                <button onClick={() => router.push('/curadoria')} className="px-8 py-4 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-all bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] shadow-md hover:-translate-y-0.5">
                  Acessar Fluxo de Impacto <ArrowRight size={16} />
                </button>
              ) : pendingMissions > 0 ? (
                <button onClick={() => router.push('/cofre-missoes')} className="px-8 py-4 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-all bg-orange-500 text-white hover:bg-orange-600 shadow-md hover:-translate-y-0.5">
                  Abrir Cofre de Missões <ArrowRight size={16} />
                </button>
              ) : (
                <button disabled className="px-8 py-4 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-all bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/40 cursor-not-allowed">
                  Monitorando Ativos <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          </motion.div>

          {/* ACESSOS RÁPIDOS */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="md:col-span-4 flex flex-col gap-4">
            <button onClick={() => router.push('/curadoria')} className="flex-1 glass-panel bg-white/70 hover:bg-white p-6 rounded-[2rem] border border-[var(--color-atelier-grafite)]/5 flex items-center gap-4 transition-all group shadow-sm hover:shadow-md">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] group-hover:scale-110 transition-transform"><LayoutDashboard size={20}/></div>
              <div className="text-left flex-1">
                <span className="block font-elegant text-xl text-[var(--color-atelier-grafite)]">Brandbook & Curadoria</span>
                <span className="block font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1">Aprovação de Fluxo</span>
              </div>
              <ChevronRight size={20} className="text-[var(--color-atelier-grafite)]/20 group-hover:text-[var(--color-atelier-terracota)] transition-colors"/>
            </button>
            
            <button onClick={() => router.push('/cofre-missoes')} className="flex-1 glass-panel bg-white/70 hover:bg-white p-6 rounded-[2rem] border border-[var(--color-atelier-grafite)]/5 flex items-center gap-4 transition-all group shadow-sm hover:shadow-md">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-atelier-grafite)]/5 flex items-center justify-center text-[var(--color-atelier-grafite)] group-hover:scale-110 transition-transform"><Camera size={20}/></div>
              <div className="text-left flex-1">
                <span className="block font-elegant text-xl text-[var(--color-atelier-grafite)]">Cofre de Missões</span>
                <span className="block font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1">Envio de Material Cru</span>
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
            <span className="micro-title text-[var(--color-atelier-grafite)]/60 font-bold tracking-widest text-[10px] uppercase">
              Resumo Executivo
            </span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-tight tracking-tight">
            {greeting}, <span className="text-[var(--color-atelier-terracota)] italic">{clientName}.</span>
          </h1>
          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 max-w-md">
            O seu painel de controlo diário. Sem métricas de vaidade, apenas o que impacta o crescimento da sua marca hoje.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-[fadeInUp_0.6s_ease-out]">
        
        <motion.div whileHover={{ y: -4 }} className={`md:col-span-8 glass-panel p-8 md:p-10 flex flex-col justify-between relative overflow-hidden transition-all duration-500 rounded-[2rem] border
            ${pendingCount > 0 ? 'bg-white/90 border-orange-200 shadow-[0_15px_40px_rgba(249,115,22,0.08)]' : 'bg-white/60 border-white/40 shadow-sm'}
          `}>
          {pendingCount > 0 && <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>}
          
          <div className="flex items-start justify-between mb-8">
            <div>
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2 block">
                Ação Requerida
              </span>
              <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                {pendingCount > 0 ? 'Aprovações Pendentes' : 'Tudo em Dia'}
              </h2>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner
              ${pendingCount > 0 ? 'bg-orange-50 text-orange-500 border border-orange-100' : 'bg-green-50 text-green-500 border border-green-100'}
            `}>
              {pendingCount > 0 ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
            </div>
          </div>

          <div>
            <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/80 mb-6 leading-relaxed">
              {pendingCount > 0 
                ? `Existem ${pendingCount} peças criativas aguardando a sua validação. A sua aprovação rápida garante que o cronograma de publicações se mantém intacto.` 
                : 'Não há publicações a aguardar a sua aprovação neste momento. O estúdio está a produzir as próximas peças.'}
            </p>

            <button onClick={() => router.push('/curadoria')} className={`px-6 py-3.5 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-all outline-none
                ${pendingCount > 0 
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md hover:shadow-lg hover:-translate-y-0.5' 
                  : 'bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)]'}
              `}>
              {pendingCount > 0 ? 'Revisar Conteúdo Agora' : 'Ver Histórico de Curadoria'}
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="md:col-span-4 glass-panel p-8 flex flex-col justify-between bg-white/70 relative overflow-hidden rounded-[2rem] border border-white/50 shadow-sm">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-2xl"></div>
          
          <div>
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2 flex items-center gap-2">
              <Activity size={12} className="text-[var(--color-atelier-terracota)]"/> Atelier Pulse
            </span>
            <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-6">Saúde da Marca</h2>
          </div>

          <div className="flex flex-col items-center justify-center my-4 relative z-10">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100" />
                <motion.circle 
                  initial={{ strokeDasharray: "0 400" }}
                  animate={{ strokeDasharray: `${(healthScore / 100) * 364} 400` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="6" fill="transparent" 
                  strokeLinecap="round"
                  className="text-[var(--color-atelier-terracota)] drop-shadow-md" 
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none mt-1">{healthScore}</span>
                <span className="font-roboto text-[9px] font-bold text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest mt-1">/ 100</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-2 relative z-10">
             <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-roboto text-[9px] font-bold uppercase tracking-widest border border-[var(--color-atelier-terracota)]/20">
               <TrendingUp size={12} /> Crescimento Sólido
             </span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="md:col-span-12 glass-panel p-6 md:p-8 bg-white/60 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between border-l-4 border-l-[var(--color-atelier-grafite)] rounded-r-[2rem] rounded-l-lg shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--color-atelier-grafite)]/5 flex items-center justify-center shrink-0 border border-[var(--color-atelier-grafite)]/10">
              <Clock size={20} className="text-[var(--color-atelier-grafite)]" />
            </div>
            <div>
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 block mb-1">
                Transparência de Estúdio
              </span>
              <h3 className="font-roboto text-[14px] font-bold text-[var(--color-atelier-grafite)] flex items-center gap-2">
                Foco Atual: <span className="font-normal text-[var(--color-atelier-terracota)]">{currentFocus}</span>
              </h3>
            </div>
          </div>
          
          <div className="text-[11px] font-roboto font-medium text-[var(--color-atelier-grafite)]/50 italic flex items-center gap-2 shrink-0 bg-white/50 px-4 py-2 rounded-full">
            <Sparkles size={14} className="text-[var(--color-atelier-terracota)]" /> Atualizado em tempo real pelo Diretor de Arte
          </div>
        </motion.div>

      </div>
    </div>
  );
}