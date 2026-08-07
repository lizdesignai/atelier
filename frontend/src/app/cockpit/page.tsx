// src/app/cockpit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { NotificationEngine } from "../../lib/NotificationEngine"; 
import { 
  Activity, AlertCircle, ArrowRight, CheckCircle2, 
  Clock, Compass, Sparkles, Loader2, Target, Camera, 
  ChevronRight, ChevronLeft, CalendarDays, MessageSquare, 
  XCircle, Star, Zap, FileText, Download, X, AlignLeft, 
  RotateCcw, Send, PlayCircle, ImageIcon, LayoutDashboard, TrendingUp,
  ChevronDown, ChevronUp, Calendar, Video
} from "lucide-react";
import dynamic from "next/dynamic";
import { useProfile } from "../../hooks/useProfile";
import { fetchCockpitTasks } from "./actions";

const InstagramBriefingModal = dynamic(() => import("../../components/InstagramBriefingModal"), { ssr: false });
const MissionsVaultModal = dynamic(() => import("../../components/MissionsVaultModal"), { ssr: false });

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function CockpitPage() {
  const router = useRouter();
  const { data: userProfile } = useProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientName, setClientName] = useState("Cliente");
  const [clientId, setClientId] = useState("");
  const [project, setProject] = useState<any>(null);

// Estados Gerais
  const [pendingCount, setPendingCount] = useState(0);
  const [currentFocus, setCurrentFocus] = useState("A equipe está analisando o seu projeto...");
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
  const [briefing, setBriefing] = useState<any>(null);
  const [pendingMissions, setPendingMissions] = useState(0);
  const [isMissionsModalOpen, setIsMissionsModalOpen] = useState(false);
  
  // Acordeão de Acessos Rápidos e Carrossel Topo de Aprovações Pendentes
  const [isQuickAccessOpen, setIsQuickAccessOpen] = useState(true);
  const [activePendingIndex, setActivePendingIndex] = useState(0);
  
  // Estado do Planejamento Editorial Mensal
  const [monthlyPlan, setMonthlyPlan] = useState<any[]>([]);
  const [feedbackText, setFeedbackText] = useState<{ [key: string]: string }>({});
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  // ESTADOS DO NOVO CARROSSEL DE ARTES E TAREFAS
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [monthTasks, setMonthTasks] = useState<any[]>([]);
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const [postFeedbackText, setPostFeedbackText] = useState("");
  const [activePostFeedbackId, setActivePostFeedbackId] = useState<string | null>(null);
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // Estados T-NPS e Upsell
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

        const { data: profile } = await supabase.from('profiles').select('nome').eq('id', session.user.id).single();
        if (profile?.nome) setClientName(profile.nome.split(' ')[0]);

        const { data: proj } = await supabase.from('projects').select('*').eq('client_id', session.user.id).in('status', ['active', 'delivered']).order('created_at', { ascending: false }).limit(1).maybeSingle();
        setProject(proj);

        if (proj) {
          setCurrentFocus(proj.current_focus || "A equipe está analisando o seu projeto...");
          
          // 1. Buscamos e preparamos as TASKS primeiro
          const year = new Date().getFullYear();
          const month = new Date().getMonth();
          const startRange = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();
          const endRange = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)).toISOString();

          // 🟢 WORKER REALTIME: Volta a usar a Server Action para bypass RLS, resolvendo a lista vazia
          const rawTasks = await fetchCockpitTasks(proj.id, session.user.id, startRange, endRange, Date.now());
            
          let tasksData = rawTasks || [];

          // 🟢 Filtro de Transparência: Oculta etapas puramente internas da agência (Setup, Risco, Gestão Interna).
          const blockedTerms = ['setup', 'onboarding', 'mitigação', 'mitigacao', 'risco', 'gestão contínua', 'gestao continua', 'interno', 'gargalo', 'admin'];
          tasksData = tasksData.filter((t: any) => {
            const stage = (t.stage || '').toLowerCase();
            const title = (t.title || '').toLowerCase();
            return !blockedTerms.some(term => stage.includes(term) || title.includes(term));
          });

          const sortedTasks = tasksData.sort((a, b) => {
            if (a.status === 'pending_client_approval' && b.status !== 'pending_client_approval') return -1;
            if (a.status !== 'pending_client_approval' && b.status === 'pending_client_approval') return 1;
            return 0;
          });
          
          setMonthTasks(sortedTasks);

          // 2. Lógica de Bloqueio (Release Day)
          const releaseDay = proj.content_release_day;
          const today = new Date();
          const isTaskLocked = (taskId: string) => {
            if (!releaseDay || today.getDate() >= releaseDay) return false;
            const task = tasksData.find((t: any) => t.id === taskId);
            if (!task) return false;
            const taskDate = new Date(task.deadline);
            if (taskDate.getMonth() === today.getMonth() && taskDate.getFullYear() === today.getFullYear()) {
              return taskDate.getDate() > releaseDay;
            }
            return false;
          };

          // 3. Buscamos e filtramos os POSTS
          const { data: postsData } = await supabase
            .from('social_posts')
            .select('*')
            .eq('project_id', proj.id)
            .in('status', ['pending_approval', 'approved'])
            .order('created_at', { ascending: false });
            
          const visiblePosts = (postsData || []).filter((p: any) => {
             if (p.status === 'approved') return true;
             // Se estiver pendente, mas a tarefa associada está bloqueada pelo Release Day, ocultamos da galeria de aprovação
             if (p.task_id && isTaskLocked(p.task_id)) return false;
             return true;
          });

          const sortedPosts = visiblePosts.sort((a: any, b: any) => {
            if (a.status === 'pending_approval' && b.status !== 'pending_approval') return -1;
            if (a.status !== 'pending_approval' && b.status === 'pending_approval') return 1;
            return 0;
          });

          setAllPosts(sortedPosts);
          setPendingCount(sortedPosts.filter((p: any) => p.status === 'pending_approval').length);

          const { data: brief } = await supabase.from('instagram_briefings').select('*').eq('project_id', proj.id).or('status.neq.returned,status.is.null').order('created_at', { ascending: false }).limit(1).maybeSingle(); 
          setBriefing(brief);

          const { count: missionsCount } = await supabase.from('asset_missions').select('*', { count: 'exact', head: true }).eq('project_id', proj.id).eq('status', 'pending');
          setPendingMissions(missionsCount || 0);

          const { data: plans } = await supabase.from('content_planning').select('*').eq('project_id', proj.id).eq('status', 'awaiting_approval').order('created_at', { ascending: true });
          if (plans) setMonthlyPlan(plans);
        }
      } catch (error) {
        console.error("Erro ao carregar o Meu Espaço:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCockpitData();
    
    // 🟢 INITIALIZE POLL WORKER (30 segundos)
    const workerInterval = setInterval(fetchCockpitData, 30000);
    return () => clearInterval(workerInterval);
  }, []);

  // ==========================================
  // MOTORES DE APROVAÇÃO DO CARROSSEL DE ARTES
  // ==========================================
  const handleApprovePost = async () => {
    setIsActionProcessing(true);
    try {
      const post = allPosts[activeCarouselIndex];
      
      // 1. Atualiza Post para Aprovado
      await supabase.from('social_posts').update({ status: 'approved' }).eq('id', post.id);
      
      // 2. 🟢 SINC. KANBAN: Dá baixa na tarefa de produção da agência
      if (post.task_id) {
         await supabase.from('tasks').update({ 
             status: 'completed', 
             completed_at: new Date().toISOString() 
         }).eq('id', post.task_id);
      }

      const newPosts = [...allPosts];
      newPosts[activeCarouselIndex].status = 'approved';
      
      const resorted = newPosts.sort((a, b) => {
        if (a.status === 'pending_approval' && b.status !== 'pending_approval') return -1;
        if (a.status !== 'pending_approval' && b.status === 'pending_approval') return 1;
        return 0;
      });

      setAllPosts(resorted);
      setPendingCount(resorted.filter(p => p.status === 'pending_approval').length);
      setActiveCarouselIndex(0); 
      
      showToast("Arte validada com sucesso! Peça Finalizada.");
    } catch(e) {
      showToast("Erro ao aprovar a arte.");
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleRejectPost = async () => {
    if(!postFeedbackText.trim()) { 
      showToast("Por favor, descreva o que precisa ser ajustado."); 
      return; 
    }
    setIsActionProcessing(true);
    try {
      const post = allPosts[activeCarouselIndex];
      
      // 1. Insere o comentário na tabela de pins
      await supabase.from('content_feedback_pins').insert({
         post_id: post.id,
         comment: postFeedbackText
      });
      
      // 2. Regride o status do Post
      await supabase.from('social_posts').update({ status: 'needs_revision' }).eq('id', post.id);

      // 3. Devolve a tarefa do Post diretamente para a coluna 'review' do Kanban da equipa
      if (post.task_id) {
        await supabase.from('tasks').update({ status: 'review' }).eq('id', post.task_id);
      }
      
      const newPosts = allPosts.filter((_, idx) => idx !== activeCarouselIndex);
      setAllPosts(newPosts);
      setPendingCount(newPosts.filter(p => p.status === 'pending_approval').length);
      setActiveCarouselIndex(0);
      setPostFeedbackText("");
      setActivePostFeedbackId(null);
      
      showToast("Sua solicitação de revisão foi enviada com sucesso!");
    } catch(e) {
      showToast("Erro ao enviar a revisão.");
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleApproveTask = async (task: any) => {
    setIsActionProcessing(true);
    try {
      await supabase.from('tasks').update({ 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      }).eq('id', task.id);
      
      const { data: hasPost } = await supabase.from('social_posts').select('id').eq('task_id', task.id).maybeSingle();
      if (hasPost) {
        await supabase.from('social_posts').update({ status: 'approved' }).eq('task_id', task.id);
      }
      
      setMonthTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed' } : t));
      setTaskDetailOpen(false);
      showToast("Atividade aprovada com sucesso!");
    } catch(e) {
      showToast("Erro ao aprovar a atividade.");
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleRejectTask = async (task: any, feedback: string) => {
    if(!feedback.trim()) {
      showToast("Por favor, descreva o que precisa ser ajustado.");
      return;
    }
    setIsActionProcessing(true);
    try {
      await supabase.from('tasks').update({ status: 'review' }).eq('id', task.id);
      
      const { data: hasPost } = await supabase.from('social_posts').select('id').eq('task_id', task.id).maybeSingle();
      if (hasPost) {
        await supabase.from('social_posts').update({ status: 'needs_revision' }).eq('task_id', task.id);
        await supabase.from('content_feedback_pins').insert({
          post_id: hasPost.id,
          comment: feedback
        });
      } else {
        // Se não tiver social_post para pendurar o feedback, adiciona no histórico de admin_feedback da task
        const newFeedback = { text: feedback, by: clientName, date: new Date().toISOString(), type: 'client_revision' };
        await supabase.from('tasks').update({ 
           admin_feedback: [...(task.admin_feedback || []), newFeedback] 
        }).eq('id', task.id);
      }
      
      setMonthTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'review' } : t));
      setTaskDetailOpen(false);
      setPostFeedbackText("");
      showToast("Revisão solicitada! A equipe receberá o feedback.");
    } catch(e) {
      showToast("Erro ao solicitar revisão.");
    } finally {
      setIsActionProcessing(false);
    }
  };

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    return url.match(/\.(mp4|mov|webm)$/i);
  };

  // ==========================================
  // MOTORES DO PLANEJAMENTO MENSAL E AVALIAÇÃO
  // ==========================================
  const handleApprovePlan = async (planId: string) => {
    setIsProcessing(true);
    try {
      // 1. Atualiza Planejamento para Aprovado
      await supabase.from('content_planning').update({ status: 'approved' }).eq('id', planId);
      
      // 2. 🟢 SINC. KANBAN: Dá baixa na tarefa de produção da agência (Se associada)
      // Nota: Como o plano pode não ter link direto com a task (task_id não é nativo do planning), 
      // nós fazemos uma query reversa baseada no attachment_url para encontrar a tarefa matriz.
      const plan = monthlyPlan.find(p => p.id === planId);
      if (plan && plan.planning_file_url) {
         const { data: matchedTasks } = await supabase
            .from('tasks')
            .select('id')
            .eq('attachment_url', plan.planning_file_url)
            .limit(1);
         
         if (matchedTasks && matchedTasks.length > 0) {
             await supabase.from('tasks').update({ 
                 status: 'completed', 
                 completed_at: new Date().toISOString() 
             }).eq('id', matchedTasks[0].id);
         }
      }

      setMonthlyPlan(monthlyPlan.filter(p => p.id !== planId));
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
      await supabase.from('t_nps_scores').insert({ project_id: project.id, client_id: clientId, score: npsScore, feedback: npsFeedback });
      setShowNpsModal(false);
      if (npsScore >= 9) {
        setTimeout(() => setShowUpsellModal(true), 500); 
      } else {
        showToast("Avaliação registada. A equipa avançará com a execução!");
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
    showToast("Estratégia aprovada! A equipe iniciará a confecção das peças gráficas.");
    setShowNpsModal(false);
    setNpsScore(null);
    setNpsFeedback("");
  };

  const handleAcceptUpsell = async () => {
    setShowUpsellModal(false);
    showToast("Excelente! A nossa equipa entrará em contato muito em breve.");
    await NotificationEngine.notifyManagement(
       "📈 Interesse em Serviços de Gestão",
       `O cliente ${clientName} (${project?.profiles?.nome}) avaliou com nota ${npsScore} e quer aderir à gestão completa.`,
       "success", "/admin/clientes"
    );
    setNpsScore(null);
    setNpsFeedback("");
  };

  const handleDeclineUpsell = () => {
    setShowUpsellModal(false);
    setNpsScore(null);
    setNpsFeedback("");
  };

  const handleRejectPlan = async (planId: string) => {
    const feedback = feedbackText[planId];
    if (!feedback || feedback.trim() === "") {
      showToast("Por favor, descreva o ajuste necessário para orientar a equipe.");
      return;
    }
    setIsProcessing(true);
    try {
      await supabase.from('content_planning').update({ status: 'needs_revision', feedback: feedback }).eq('id', planId);
      setMonthlyPlan(monthlyPlan.filter(p => p.id !== planId));
      setActiveFeedbackId(null);
      showToast("Feedback enviado. A estratégia voltou para a análise da equipe.");
    } catch (error) {
      showToast("Erro ao enviar feedback.");
    } finally {
      setIsProcessing(false);
    }
  };

  const [greeting, setGreeting] = useState("Olá");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Bom dia" : hour < 19 ? "Boa tarde" : "Boa noite");
  }, []);
  // Semanas removidas para focar em uma fila única

  if (isLoading) return <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center"><Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={32} /></div>;

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-4 opacity-50">
        <Compass size={48} className="text-[var(--color-atelier-grafite)]" />
        <h2 className="font-elegant text-3xl">Nenhum projeto ativo.</h2>
      </div>
    );
  }

  // ==========================================================================
  // RENDERIZAÇÃO CONDICIONAL: INSTAGRAM OS
  // ==========================================================================
  const rawType = project.service_type || project.type || project.service || "";
  const isInstagram = rawType === 'Gestão de Instagram' || rawType.toLowerCase().includes('instagram');

  if (isInstagram) {
    
    return (
      <div className="flex flex-col h-auto min-h-[calc(100dvh-60px)] md:h-[calc(100vh-60px)] max-w-[1500px] w-full mx-auto relative z-10 p-4 md:p-8 overflow-x-hidden md:overflow-hidden gap-6">
        
        {/* 🟢 TOP BANNER CARROSSEL DE APROVAÇÕES PENDENTES */}
        {(() => {
          const pendingPosts = allPosts.filter(p => p.status === 'pending_approval');
          const pendingPlans = monthlyPlan.filter(p => p.status === 'pending' || p.status === 'pending_approval');
          const pendingApprovalItems = [
            ...pendingPosts.map(p => ({ id: p.id, title: p.title || 'Peça Gráfica', type: 'post', item: p })),
            ...pendingPlans.map(p => ({ id: p.id, title: p.title || 'Planejamento Mensal', type: 'plan', item: p }))
          ];

          if (pendingApprovalItems.length === 0) return null;

          const safeIndex = Math.min(activePendingIndex, pendingApprovalItems.length - 1);
          const currentItem = pendingApprovalItems[safeIndex];

          return (
            <div className="glass-panel bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-200/80 p-4 md:p-5 rounded-[2.2rem] shadow-sm hidden md:flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-center gap-3.5 min-w-0 w-full md:w-auto">
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm shrink-0">
                  <AlertCircle size={20} className="animate-bounce" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-roboto text-[9px] font-bold uppercase tracking-widest bg-orange-500/20 text-orange-700 px-2 py-0.5 rounded-full">
                      Aprovação Pendente {pendingApprovalItems.length > 1 ? `(${safeIndex + 1}/${pendingApprovalItems.length})` : ''}
                    </span>
                  </div>
                  <h3 className="font-roboto font-bold text-sm md:text-base text-[var(--color-atelier-grafite)] truncate leading-tight mt-0.5">
                    {currentItem.title}
                  </h3>
                </div>
              </div>

              {/* CONTROLES DE NAVEGAÇÃO DO CARROSSEL DE APROVAÇÕES PENDENTES */}
              {pendingApprovalItems.length > 1 && (
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-orange-100 shadow-2xs shrink-0">
                  <button 
                    type="button"
                    onClick={() => setActivePendingIndex(prev => (prev - 1 + pendingApprovalItems.length) % pendingApprovalItems.length)}
                    className="w-7 h-7 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] active:scale-90 transition-transform cursor-pointer"
                    title="Anterior"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="flex items-center gap-1 px-1">
                    {pendingApprovalItems.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePendingIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === safeIndex ? 'w-4 bg-orange-500' : 'w-1.5 bg-orange-300/40'
                        }`}
                      />
                    ))}
                  </div>
                  <button 
                    type="button"
                    onClick={() => setActivePendingIndex(prev => (prev + 1) % pendingApprovalItems.length)}
                    className="w-7 h-7 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] active:scale-90 transition-transform cursor-pointer"
                    title="Próximo"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {/* BOTÃO DE AÇÃO RÁPIDA DE APROVAÇÃO */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
                {currentItem.type === 'post' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const idx = allPosts.findIndex(p => p.id === currentItem.id);
                      if (idx !== -1) setActiveCarouselIndex(idx);
                      handleApprovePost();
                    }}
                    className="w-full md:w-auto bg-gradient-to-r from-[var(--color-atelier-terracota)] to-[#8c562e] text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Aprovar Peça</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleApprovePlan(currentItem.id)}
                    className="w-full md:w-auto bg-gradient-to-r from-[var(--color-atelier-terracota)] to-[#8c562e] text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Aprovar Estratégia</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* 🟢 CABEÇALHO LIMPO: APENAS SAUDAÇÃO */}
        <header className="animate-[fadeInUp_0.5s_ease-out] flex justify-between items-center shrink-0">
          <h1 className="font-elegant text-3xl md:text-4xl text-[var(--color-atelier-grafite)] leading-tight tracking-tight">
            {greeting}, <span className="text-[var(--color-atelier-terracota)] italic">{clientName}.</span>
          </h1>
        </header>

        {/* 🟢 INFORMAÇÕES DE CONTRATO */}
        {(project.contract_end || project.posts_quantity > 0 || project.videos_quantity > 0) && (
           <div className="animate-[fadeInUp_0.6s_ease-out] flex flex-wrap items-center gap-2 -mt-3 mb-2">
             {project.contract_end && (
               <span className="px-3 py-1.5 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 shadow-sm flex items-center gap-1.5">
                 <Calendar size={13} className="text-[var(--color-atelier-terracota)]" />
                 Até {new Date(project.contract_end).toLocaleDateString('pt-BR')}
               </span>
             )}
             {project.posts_quantity > 0 && (
               <span className="px-3 py-1.5 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 shadow-sm flex items-center gap-1.5">
                 <LayoutDashboard size={13} className="text-[var(--color-atelier-terracota)]" />
                 {project.posts_quantity} Posts/Mês
               </span>
             )}
             {project.videos_quantity > 0 && (
               <span className="px-3 py-1.5 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 shadow-sm flex items-center gap-1.5">
                 <Video size={13} className="text-[var(--color-atelier-terracota)]" />
                 {project.videos_quantity} Vídeos/Mês
               </span>
             )}
           </div>
        )}

          {/* 🟢 NOVO WIDGET: FILA ÚNICA DE DEMANDAS (SLIDER HORIZONTAL ESTILO JTBD) */}
        <div className="w-full flex flex-col gap-3 animate-[fadeInUp_0.6s_ease-out]">
          <div className="flex justify-between items-end mb-1">
             <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] capitalize">
               {new Date().toLocaleString('pt-BR', { month: 'long' })}
             </h2>
          </div>

          <div className="w-full flex gap-4 overflow-x-auto overflow-y-hidden custom-scrollbar pb-6 px-1 pt-1 h-auto items-stretch">
            {monthTasks.length > 0 ? monthTasks.map((task, absoluteIndex) => {
              const post = allPosts.find(p => p.task_id === task.id);
              const coverUrl = post?.media_assets?.[0]?.url || task.attachment_url;
              const isVideo = isVideoUrl(coverUrl);
              const caption = post?.caption || task.description;

              // Color-coding dinâmico via JTBD
              // in_progress = Azul
              // review / pending_client_approval = Laranja
              // completed = Verde
              // Outros = Cinza Neutro
              let borderColor = 'border-gray-100';
              let ringColor = 'hover:ring-1 hover:ring-gray-200';
              let badgeColor = 'bg-gray-100 text-gray-500';
              let badgeText = 'Na Fila';
              let Icon = Target;
              
              const releaseDay = project?.content_release_day;
              const today = new Date();
              let isLocked = false;
              let daysUntilRelease = 0;
              
              if (releaseDay && today.getDate() < releaseDay) {
                const taskDate = new Date(task.deadline);
                if (taskDate.getMonth() === today.getMonth() && taskDate.getFullYear() === today.getFullYear()) {
                  if (taskDate.getDate() > releaseDay) {
                     isLocked = true;
                     daysUntilRelease = releaseDay - today.getDate();
                  }
                }
              }

              if (isLocked) {
                borderColor = 'border-gray-200';
                badgeColor = 'bg-gray-200 text-gray-500';
                badgeText = `Liberação em ${daysUntilRelease} dia${daysUntilRelease > 1 ? 's' : ''}`;
                Icon = Clock; // Importado lucide-react Lock ou Clock
              } else if (task.status === 'in_progress') {
                borderColor = 'border-blue-400 ring-1 ring-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]';
                badgeColor = 'bg-blue-500 text-white';
                badgeText = 'Em Execução';
                Icon = PlayCircle;
              } else if (task.status === 'review' || task.status === 'pending_client_approval') {
                borderColor = 'border-orange-400 ring-1 ring-orange-400/50 shadow-[0_0_15px_rgba(251,146,60,0.2)]';
                badgeColor = 'bg-orange-500 text-white';
                badgeText = 'Revisão / Aprovação';
                Icon = AlertCircle;
              } else if (task.status === 'completed') {
                borderColor = 'border-green-400 ring-1 ring-green-400/50 shadow-[0_0_15px_rgba(74,222,128,0.2)]';
                badgeColor = 'bg-green-500 text-white';
                badgeText = 'Concluída';
                Icon = CheckCircle2;
              }

              return (
                <div 
                  key={task.id} 
                  onClick={() => { 
                    if (isLocked) {
                      showToast(`Esta demanda será liberada para avaliação em ${daysUntilRelease} dia${daysUntilRelease > 1 ? 's' : ''}.`);
                      return;
                    }
                    setActiveTaskIndex(absoluteIndex); 
                    setTaskDetailOpen(true); 
                  }}
                  className={`min-w-[280px] w-[280px] sm:min-w-[320px] sm:w-[320px] bg-white rounded-[2rem] p-5 ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:-translate-y-1'} transition-all group flex flex-col gap-4 relative overflow-hidden shadow-sm border ${borderColor} shrink-0`}
                >
                  {/* Data e Status */}
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-bold text-[var(--color-atelier-terracota)] uppercase tracking-widest bg-[var(--color-atelier-creme)]/50 px-2.5 py-1 rounded-md">
                      {new Date(task.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                    </span>
                    <div className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm ${badgeColor}`}>
                       <Icon size={12}/> {badgeText}
                    </div>
                  </div>

                  {/* Titulo */}
                  <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-tight">{task.title}</h3>

                  {/* Mídia Cover */}
                  {coverUrl ? (
                    <div className="w-full h-36 rounded-xl overflow-hidden relative bg-gray-100 border border-gray-100 shrink-0">
                       {isVideo ? (
                         <video src={coverUrl} className="w-full h-full object-cover" />
                       ) : coverUrl.toLowerCase().endsWith('.pdf') ? (
                         <div className="w-full h-full flex flex-col items-center justify-center text-[var(--color-atelier-terracota)] opacity-80">
                            <FileText size={32} className="mb-2"/>
                            <span className="text-[10px] font-bold uppercase tracking-widest">Documento PDF</span>
                         </div>
                       ) : (
                         <img src={coverUrl} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                       )}
                       <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[var(--color-atelier-grafite)] shadow-sm">
                         {isVideo ? <PlayCircle size={14}/> : coverUrl.toLowerCase().endsWith('.pdf') ? <FileText size={14}/> : <ImageIcon size={14}/>}
                       </div>
                    </div>
                  ) : (
                    <div className="w-full h-12 rounded-xl bg-gray-50 border border-gray-100 border-dashed flex items-center justify-center shrink-0">
                       <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400">Em Desenvolvimento</span>
                    </div>
                  )}

                  {/* Legenda (Trunca em 3 linhas) */}
                  {caption && (
                    <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/70 line-clamp-3 leading-relaxed bg-gray-50/80 p-3 rounded-xl border border-gray-100 flex-1">
                      {caption}
                    </p>
                  )}

                  {/* Ações Inferiores (Copiar / Baixar) */}
                  <div className="flex items-center gap-2 mt-auto border-t border-gray-50 pt-4">
                     <button 
                       onClick={(e) => { 
                         e.stopPropagation(); 
                         if (caption) { navigator.clipboard.writeText(caption); showToast("Legenda copiada!"); }
                       }}
                       className={`flex-1 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors border shadow-sm ${caption ? 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100' : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed shadow-none'}`}
                     >
                       <AlignLeft size={14} /> Copiar
                     </button>

                     <a 
                       href={coverUrl || "#"} 
                       download 
                       target="_blank" 
                       rel="noreferrer"
                       onClick={(e) => {
                         e.stopPropagation();
                         if (!coverUrl) e.preventDefault();
                       }}
                       className={`flex-1 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors border shadow-sm ${coverUrl ? 'bg-[var(--color-atelier-grafite)] border-[var(--color-atelier-grafite)] text-white hover:bg-gray-800' : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed shadow-none'}`}
                     >
                       <Download size={14} /> Baixar
                     </a>
                  </div>
                </div>
              );
            }) : null}
          </div>
        </div>

        {/* 🟢 O CORE DA PLATAFORMA: GRID PRINCIPAL E CARROSSEL */}
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          
          {/* COLUNA ESQUERDA: WIDGET VERTICAL DE DIAGNÓSTICO E ACESSOS RÁPIDOS EM ACORDEÃO */}
          <div className="w-full lg:w-[380px] flex flex-col gap-6 shrink-0 h-auto md:h-full">
            
            {/* WIDGET VERTICAL CARD: BRIEFING PENDENTE COM FOTO DE PERFIL COMO BACKGROUND */}
            {!briefing && (
              <div className="relative overflow-hidden rounded-[2.5rem] p-6 md:p-8 text-white shadow-xl flex flex-col justify-end min-h-[320px] border border-white/20 shrink-0 group">
                {/* Imagem de Fundo (Foto de Perfil do Cliente) ou Gradiente Base */}
                {userProfile?.avatar_url || project?.profiles?.avatar_url ? (
                  <img 
                    src={userProfile?.avatar_url || project?.profiles?.avatar_url} 
                    alt={clientName} 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none" 
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[var(--color-atelier-terracota)] via-[#6E3827] to-[var(--color-atelier-grafite)]" />
                )}

                {/* Gradiente de Sobreposição Sofisticado para Prover Alto Contraste */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-atelier-grafite)] via-[var(--color-atelier-grafite)]/85 to-[var(--color-atelier-terracota)]/30 pointer-events-none" />

                {/* Conteúdo Vertical do Card */}
                <div className="relative z-10 flex flex-col items-start gap-3">
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] bg-[var(--color-atelier-terracota)] text-white px-3 py-1 rounded-full shadow-sm">
                    Briefing Pendente
                  </span>
                  
                  <div className="flex flex-col">
                    <h3 className="font-elegant text-3xl md:text-4xl leading-tight text-white truncate max-w-[280px]">
                      {clientName}
                    </h3>
                    <p className="font-roboto text-xs text-white/80 leading-relaxed mt-1">
                      Preencha o seu briefing estratégico para orientar o direcionamento criativo da sua marca.
                    </p>
                  </div>

                  {/* Botão de Ação Destacado */}
                  <button 
                    type="button"
                    onClick={() => setIsBriefingModalOpen(true)} 
                    className="w-full bg-white text-[var(--color-atelier-grafite)] py-3.5 px-4 rounded-2xl font-bold uppercase tracking-wider text-[11px] shadow-lg hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation mt-2"
                  >
                    <Target size={16} className="text-[var(--color-atelier-terracota)]" />
                    <span>Preencher Briefing Agora</span>
                    <ArrowRight size={14} className="text-[var(--color-atelier-terracota)]" />
                  </button>
                </div>
              </div>
            )}

            {/* Avisos Importantes Adicionais (Arquivos Solicitados) */}
            {pendingMissions > 0 && (
              <div className="glass-panel bg-white/90 border border-orange-200 p-6 rounded-[2rem] shadow-sm flex flex-col gap-4 shrink-0">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><Camera size={18}/></div>
                     <div>
                       <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-none">Materiais Solicitados ({pendingMissions})</h3>
                     </div>
                  </div>
                  <button onClick={() => setIsMissionsModalOpen(true)} className="w-full bg-orange-500 text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-sm hover:bg-orange-600 transition-colors flex justify-center items-center gap-2 hover:-translate-y-0.5">
                    Enviar Arquivos <ArrowRight size={14}/>
                  </button>
                </div>
              </div>
            )}

            {/* Links Rápidos Permanentes (FORMATO ACORDEÃO) */}
            <div className="glass-panel p-5 md:p-6 rounded-[2rem] border border-white bg-white/60 shadow-sm flex flex-col gap-3 transition-all">
              <button 
                type="button" 
                onClick={() => setIsQuickAccessOpen(!isQuickAccessOpen)}
                className="flex items-center justify-between w-full cursor-pointer outline-none"
              >
                <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2">
                  <Compass size={14} className="text-[var(--color-atelier-terracota)]" /> Acessos Rápidos
                </h4>
                <div className="w-7 h-7 rounded-full bg-white/80 border border-gray-100 flex items-center justify-center text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] transition-colors">
                  {isQuickAccessOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isQuickAccessOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="flex flex-col gap-2.5 overflow-hidden pt-2"
                  >
                    <button onClick={() => setIsMissionsModalOpen(true)} className="flex items-center gap-4 p-3.5 rounded-2xl bg-white hover:border-[var(--color-atelier-terracota)]/30 border border-transparent shadow-sm transition-all group hover:-translate-y-0.5 w-full text-left cursor-pointer">
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)] group-hover:bg-[var(--color-atelier-terracota)]/10 transition-colors shrink-0"><Camera size={16}/></div>
                      <div className="flex flex-col items-start flex-1 overflow-hidden">
                        <span className="font-bold text-[12px] text-[var(--color-atelier-grafite)] truncate">Cofre de Arquivos</span>
                        <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Gerenciar Material Bruto</span>
                      </div>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-[var(--color-atelier-terracota)]" />
                    </button>

                    <button onClick={() => window.open(project.contract_url, "_blank")} disabled={!project.contract_url} className="flex items-center gap-4 p-3.5 rounded-2xl bg-white hover:border-[var(--color-atelier-terracota)]/30 border border-transparent shadow-sm transition-all group hover:-translate-y-0.5 w-full text-left disabled:opacity-50 cursor-pointer">
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)] group-hover:bg-[var(--color-atelier-terracota)]/10 transition-colors shrink-0"><FileText size={16}/></div>
                      <div className="flex flex-col items-start flex-1 overflow-hidden">
                        <span className="font-bold text-[12px] text-[var(--color-atelier-grafite)] truncate">Contrato Legal</span>
                        <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Documento Assinado</span>
                      </div>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-[var(--color-atelier-terracota)]" />
                    </button>

                    {briefing && (
                      <button onClick={() => setIsBriefingModalOpen(true)} className="flex items-center gap-4 p-3.5 rounded-2xl bg-white hover:border-[var(--color-atelier-terracota)]/30 border border-transparent shadow-sm transition-all group hover:-translate-y-0.5 w-full text-left cursor-pointer">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)] group-hover:bg-[var(--color-atelier-terracota)]/10 transition-colors shrink-0"><Target size={16}/></div>
                        <div className="flex flex-col items-start flex-1 overflow-hidden">
                          <span className="font-bold text-[12px] text-[var(--color-atelier-grafite)] truncate">Brandbook / Briefing</span>
                          <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Visualizar Diretrizes</span>
                        </div>
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-[var(--color-atelier-terracota)]" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* COLUNA DIREITA: O CARROSSEL (ESTÚDIO DE APROVAÇÃO) */}
          <div className="hidden md:flex flex-1 glass-panel bg-white/70 rounded-[3rem] border border-white shadow-sm flex-col overflow-hidden relative min-h-[600px] md:min-h-0 h-[600px] md:h-auto transition-colors hover:bg-white/85">
            
            {/* 1. SE EXISTIREM PEÇAS GRÁFICAS */}
            {allPosts.length > 0 ? (
              <div className="flex flex-col h-full absolute inset-0">
                {/* Header do Estúdio */}
                <div className="flex justify-between items-center px-8 py-5 border-b border-[var(--color-atelier-grafite)]/10 bg-white/40 shrink-0">
                   <div className="flex items-center gap-3">
                     <LayoutDashboard size={20} className="text-[var(--color-atelier-terracota)]"/>
                     <div>
                       <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">Estúdio de Aprovação</h2>
                       <p className="font-roboto text-[9px] uppercase tracking-widest font-bold text-gray-400 mt-1">Peças Gráficas e Audiovisuais</p>
                     </div>
                   </div>
                   
                   {/* Navegação do Carrossel */}
                   {allPosts.length > 1 && (
                     <div className="flex items-center gap-3 bg-white p-1.5 rounded-full shadow-sm border border-gray-100">
                       <button onClick={() => setActiveCarouselIndex(prev => prev > 0 ? prev - 1 : allPosts.length - 1)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-[var(--color-atelier-terracota)] hover:bg-[var(--color-atelier-terracota)]/10 transition-colors">
                         <ChevronLeft size={16} />
                       </button>
                       <span className="text-[11px] font-bold text-[var(--color-atelier-grafite)] px-2 font-roboto uppercase tracking-widest">
                         {activeCarouselIndex + 1} / {allPosts.length}
                       </span>
                       <button onClick={() => setActiveCarouselIndex(prev => prev < allPosts.length - 1 ? prev + 1 : 0)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-[var(--color-atelier-terracota)] hover:bg-[var(--color-atelier-terracota)]/10 transition-colors">
                         <ChevronRight size={16} />
                       </button>
                     </div>
                   )}
                </div>

                {/* Corpo Dividido: Mídia (Esq) + Info (Dir) */}
                <div className="flex flex-col md:flex-row flex-1 min-h-0">
                   <div className="w-full md:w-3/5 bg-gray-100 relative flex flex-col overflow-y-auto custom-scrollbar border-r border-gray-200 p-6 gap-6">
                      {(allPosts[activeCarouselIndex]?.media_assets && allPosts[activeCarouselIndex].media_assets.length > 0) ? (
                        allPosts[activeCarouselIndex].media_assets.map((asset: any, idx: number) => (
                          <div key={idx} className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white group flex-shrink-0">
                            {asset.type === 'video' ? (
                               <video src={asset.url} controls className="w-full max-h-[60vh] object-contain" />
                            ) : (
                               <img src={asset.url} alt={`Mídia ${idx + 1}`} className="w-full max-h-[60vh] object-contain" />
                            )}
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a href={asset.url} download target="_blank" rel="noreferrer" className="bg-white/90 backdrop-blur-md text-[var(--color-atelier-grafite)] p-2.5 rounded-xl shadow-lg flex items-center justify-center hover:text-[var(--color-atelier-terracota)] transition-colors" title="Baixar Arquivo">
                                <Download size={16} />
                              </a>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="relative w-full h-full min-h-[50vh] flex items-center justify-center rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white group">
                          {isVideoUrl(allPosts[activeCarouselIndex]?.image_url) ? (
                            <video src={allPosts[activeCarouselIndex]?.image_url} controls autoPlay loop className="w-full h-full max-h-[70vh] object-contain" />
                          ) : (
                            <img src={allPosts[activeCarouselIndex]?.image_url} alt="Arte" className="w-full h-full max-h-[70vh] object-contain" />
                          )}
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a href={allPosts[activeCarouselIndex]?.image_url} download target="_blank" rel="noreferrer" className="bg-white/90 backdrop-blur-md text-[var(--color-atelier-grafite)] p-2.5 rounded-xl shadow-lg flex items-center justify-center hover:text-[var(--color-atelier-terracota)] transition-colors" title="Baixar Arquivo">
                              <Download size={16} />
                            </a>
                          </div>
                        </div>
                      )}
                      
                      {/* Badge de Status sobre a imagem */}
                      <div className={`absolute top-6 left-6 px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest shadow-md flex items-center gap-1.5 backdrop-blur-md border border-white/20
                        ${allPosts[activeCarouselIndex]?.status === 'approved' ? 'bg-green-500/90 text-white' : 'bg-orange-500/90 text-white animate-pulse'}
                      `}>
                        {allPosts[activeCarouselIndex]?.status === 'approved' ? <><CheckCircle2 size={12}/> Finalizada</> : <><AlertCircle size={12}/> Aguardando Aprovação</>}
                      </div>
                   </div>

                   {/* Info e Ações */}
                   <div className="w-full md:w-2/5 bg-white p-8 flex flex-col h-full overflow-y-auto custom-scrollbar">
                      <div className="mb-6">
                        <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-tight">
                          {allPosts[activeCarouselIndex]?.title || "Postagem Padrão"}
                        </h2>
                      </div>

                      {/* Legenda */}
                      <div className="bg-gray-50 p-5 rounded-[1.5rem] border border-gray-100 shadow-inner flex-1 overflow-y-auto custom-scrollbar min-h-[150px]">
                        <h4 className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-3 flex items-center gap-2">
                          <AlignLeft size={14}/> Legenda Proposta
                        </h4>
                        <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/80 whitespace-pre-wrap leading-relaxed">
                          {allPosts[activeCarouselIndex]?.caption || <span className="italic opacity-50">Sem legenda disponível para esta peça...</span>}
                        </p>
                      </div>

                      {/* Links Externos (se houverem) */}
                      {allPosts[activeCarouselIndex]?.external_links && allPosts[activeCarouselIndex]?.external_links.length > 0 && (
                        <div className="mt-4 flex flex-col gap-2">
                          <span className="font-bold text-[11px] uppercase tracking-widest text-[var(--color-atelier-grafite)]">Links de Apoio / Referência</span>
                          {allPosts[activeCarouselIndex].external_links.map((link: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 bg-[var(--color-atelier-creme)] p-3 rounded-[1rem] border border-[var(--color-atelier-grafite)]/10">
                              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0 shadow-sm"><Target size={14}/></div>
                              <div className="flex flex-col flex-1 overflow-hidden">
                                <a href={link} target="_blank" rel="noreferrer" className="text-[12px] text-[var(--color-atelier-terracota)] truncate hover:underline">
                                  {link}
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Ações (Só exibe se estiver pendente) */}
                      {allPosts[activeCarouselIndex]?.status === 'pending_approval' && (
                        <div className="mt-6 flex flex-col gap-3 shrink-0">
                          {!activePostFeedbackId ? (
                            <>
                              <button 
                                onClick={handleApprovePost}
                                disabled={isActionProcessing}
                                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-roboto text-[11px] font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 disabled:opacity-50"
                              >
                                {isActionProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Aprovar Arte
                              </button>
                              <button 
                                onClick={() => setActivePostFeedbackId(allPosts[activeCarouselIndex]?.id)}
                                className="w-full bg-white border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 py-3.5 rounded-2xl font-roboto text-[11px] font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-sm"
                              >
                                <MessageSquare size={14} /> Solicitar Ajuste
                              </button>
                            </>
                          ) : (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col gap-2">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-1.5 ml-1"><RotateCcw size={12}/> O que precisa ajustar?</span>
                              <textarea 
                                placeholder="Descreva as alterações..."
                                value={postFeedbackText}
                                onChange={(e) => setPostFeedbackText(e.target.value)}
                                className="w-full bg-red-50/50 border border-red-200 focus:border-red-400 rounded-2xl p-4 text-[13px] outline-none resize-none h-24 shadow-sm custom-scrollbar transition-colors text-red-900 font-medium"
                              />
                              <div className="flex gap-2 justify-end mt-1">
                                <button onClick={() => { setActivePostFeedbackId(null); setPostFeedbackText(""); }} className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                                <button onClick={handleRejectPost} disabled={isActionProcessing || !postFeedbackText.trim()} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm">
                                  {isActionProcessing ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>} Enviar Revisão
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      )}
                      
                      {allPosts[activeCarouselIndex]?.status === 'approved' && (
                        <div className="mt-6 bg-green-50 text-green-700 py-4 rounded-2xl font-roboto text-[11px] font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-2 border border-green-200 shadow-sm shrink-0">
                          <CheckCircle2 size={16} /> Arte Finalizada e Aprovada
                        </div>
                      )}
                   </div>
                </div>
              </div>

            // 2. SE NÃO HOUVER ARTES, MAS HOUVER PLANEJAMENTO PDF
            ) : monthlyPlan.length > 0 ? (
              <div className="flex flex-col h-full absolute inset-0 overflow-y-auto custom-scrollbar p-8 md:p-12">
                <div className="flex items-center gap-3 mb-8 border-b border-[var(--color-atelier-grafite)]/10 pb-6 shrink-0">
                  <div className="w-12 h-12 rounded-[1.2rem] bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100"><CalendarDays size={20}/></div>
                  <div>
                    <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Planejamento Estratégico</h2>
                    <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest font-bold mt-1">Aprove a linha editorial do mês.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {monthlyPlan.map((plan) => (
                    <div key={plan.id} className="bg-white p-6 rounded-[2rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm flex flex-col lg:flex-row gap-6 transition-all hover:shadow-md hover:border-[var(--color-atelier-terracota)]/20">
                      
                      <div className="flex-1 flex flex-col gap-4">
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          <span className="block font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">Referência</span>
                          <span className="font-roboto text-[14px] font-bold text-[var(--color-atelier-grafite)]">{plan.hook || "Estratégia Mensal"}</span>
                        </div>
                        
                        {plan.planning_file_url && (
                           <button onClick={() => setPreviewPdfUrl(plan.planning_file_url)} className="w-full text-left flex items-center gap-3 bg-[var(--color-atelier-creme)]/40 p-4 rounded-2xl border border-[var(--color-atelier-terracota)]/10 hover:border-[var(--color-atelier-terracota)]/30 hover:bg-[var(--color-atelier-terracota)]/5 transition-colors group">
                             <FileText size={20} className="text-[var(--color-atelier-terracota)] group-hover:scale-110 transition-transform shrink-0" />
                             <div className="flex flex-col overflow-hidden">
                               <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)]">Acessar Documento Oficial</span>
                             </div>
                           </button>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-[var(--color-atelier-grafite)]/10 pt-4 lg:pt-0 lg:pl-6">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button onClick={() => handleApprovePlan(plan.id)} disabled={isProcessing} className="flex-1 bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] py-4 rounded-2xl font-roboto text-[11px] font-bold uppercase tracking-[0.1em] transition-all shadow-md flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-50">
                            <CheckCircle2 size={16} /> Aprovar Estratégia
                          </button>
                          <button onClick={() => setActiveFeedbackId(activeFeedbackId === plan.id ? null : plan.id)} className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/60 hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)] py-4 rounded-2xl font-roboto text-[11px] font-bold uppercase tracking-[0.1em] transition-all shadow-sm flex items-center justify-center gap-2">
                            <MessageSquare size={16} /> Ajustar
                          </button>
                        </div>

                        <AnimatePresence>
                          {activeFeedbackId === plan.id && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3">
                              <div className="bg-[var(--color-atelier-creme)]/40 p-4 rounded-2xl border border-[var(--color-atelier-terracota)]/10 flex flex-col gap-3 shadow-inner">
                                <textarea 
                                  placeholder="O que devemos ajustar na abordagem deste planejamento?"
                                  value={feedbackText[plan.id] || ""}
                                  onChange={(e) => setFeedbackText({...feedbackText, [plan.id]: e.target.value})}
                                  className="w-full bg-white border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl p-3 text-[13px] font-medium text-[var(--color-atelier-grafite)] resize-none h-20 outline-none shadow-sm custom-scrollbar transition-colors"
                                />
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setActiveFeedbackId(null)} className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-grafite)] transition-colors bg-white rounded-lg shadow-sm">Cancelar</button>
                                  <button onClick={() => handleRejectPlan(plan.id)} disabled={isProcessing || !feedbackText[plan.id]?.trim()} className="px-5 py-2 bg-red-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
                                    <XCircle size={12} /> Solicitar Alteração
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
              </div>

            ) : (
              <div className="hidden md:flex flex-col items-center justify-center h-full text-center opacity-70 p-8 absolute inset-0">
                <div className="w-24 h-24 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-6">
                  <CheckCircle2 size={40} className="text-gray-300" />
                </div>
                <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-2">Tudo em Dia</h2>
                <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/60 font-medium max-w-sm">
                  Não existem pendências de aprovação de arte ou planejamento estratégico no momento.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* MODAIS */}
        <InstagramBriefingModal 
          isOpen={isBriefingModalOpen} 
          onClose={() => setIsBriefingModalOpen(false)} 
          projectId={project.id} 
          clientId={clientId} 
          onSuccess={() => { setIsBriefingModalOpen(false); window.location.reload(); }} 
        />
        <MissionsVaultModal 
          isOpen={isMissionsModalOpen} 
          onClose={() => setIsMissionsModalOpen(false)} 
          projectId={project?.id} 
          clientId={clientId} 
          clientName={clientName} 
        />

        {/* MODAL DE DETALHE DE TAREFA */}
        <AnimatePresence>
          {taskDetailOpen && monthTasks[activeTaskIndex] && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-atelier-grafite)]/80 backdrop-blur-sm p-4 md:p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white/20"
              >
                <div className="flex justify-between items-center p-6 md:p-8 border-b border-gray-100 bg-gray-50/50">
                  <div>
                    <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">{monthTasks[activeTaskIndex]?.title}</h2>
                  </div>
                  <button onClick={() => setTaskDetailOpen(false)} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[var(--color-atelier-terracota)] transition-colors shadow-sm">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
                  {/* CONTEÚDO (Visualizador) */}
                  <div className="w-full lg:w-3/5 bg-gray-100 relative flex flex-col p-6 overflow-y-auto custom-scrollbar">
                    {monthTasks[activeTaskIndex]?.attachment_url ? (
                      monthTasks[activeTaskIndex].attachment_url.toLowerCase().endsWith('.pdf') ? (
                        <iframe src={monthTasks[activeTaskIndex].attachment_url} className="w-full h-[60vh] lg:h-full rounded-2xl shadow-sm border border-gray-200" />
                      ) : (
                        <div className="relative w-full h-[60vh] lg:h-full rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white flex items-center justify-center">
                          <img src={monthTasks[activeTaskIndex].attachment_url} alt="Anexo" className="max-w-full max-h-full object-contain" />
                        </div>
                      )
                    ) : (
                      <div className="w-full h-[40vh] lg:h-full bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-gray-400 p-8 text-center shadow-sm">
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p className="font-roboto text-sm font-medium">Nenhum anexo visual para esta tarefa.</p>
                        <p className="text-xs mt-2 max-w-md">{monthTasks[activeTaskIndex]?.description || "Verifique as descrições ou aguarde a equipa disponibilizar os ficheiros finais."}</p>
                      </div>
                    )}
                  </div>

                  {/* INFO & AÇÕES */}
                  <div className="w-full lg:w-2/5 bg-white p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar border-l border-gray-100">
                    <div className="flex flex-col gap-6 flex-1">
                      {monthTasks[activeTaskIndex]?.description && (
                         <div>
                           <h4 className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2">Descrição / Escopo</h4>
                           <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/80 whitespace-pre-wrap leading-relaxed">{monthTasks[activeTaskIndex].description}</p>
                         </div>
                      )}

                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-3">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Prazo Acordado</span>
                           <span className="text-[11px] font-bold text-[var(--color-atelier-grafite)]">{new Date(monthTasks[activeTaskIndex]?.deadline).toLocaleDateString('pt-PT')}</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Status Atual</span>
                           <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${monthTasks[activeTaskIndex]?.status === 'pending_client_approval' ? 'bg-orange-100 text-orange-700' : monthTasks[activeTaskIndex]?.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                             {monthTasks[activeTaskIndex]?.status === 'pending_client_approval' ? 'Aprovação Pendente' : monthTasks[activeTaskIndex]?.status === 'completed' ? 'Concluída' : 'Em Andamento'}
                           </span>
                         </div>
                      </div>
                    </div>

                    {/* Ações baseadas no status */}
                    <div className="mt-8 shrink-0">
                      {monthTasks[activeTaskIndex]?.status === 'pending_client_approval' ? (
                        <div className="flex flex-col gap-3">
                          <button 
                            onClick={() => handleApproveTask(monthTasks[activeTaskIndex])}
                            disabled={isActionProcessing}
                            className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-roboto text-[11px] font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                          >
                            {isActionProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Aprovar Atividade
                          </button>
                          
                          {activePostFeedbackId !== monthTasks[activeTaskIndex].id ? (
                            <button 
                              onClick={() => setActivePostFeedbackId(monthTasks[activeTaskIndex].id)}
                              className="w-full bg-white border border-red-100 text-red-500 hover:bg-red-50 py-3.5 rounded-2xl font-roboto text-[11px] font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                              <MessageSquare size={14} /> Solicitar Ajuste
                            </button>
                          ) : (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col gap-2 mt-2">
                              <textarea 
                                placeholder="O que precisa ser ajustado?"
                                value={postFeedbackText}
                                onChange={(e) => setPostFeedbackText(e.target.value)}
                                className="w-full bg-red-50/50 border border-red-200 focus:border-red-400 rounded-2xl p-4 text-[13px] outline-none resize-none h-24 shadow-sm text-red-900"
                              />
                              <div className="flex gap-2 justify-end mt-1">
                                <button onClick={() => { setActivePostFeedbackId(null); setPostFeedbackText(""); }} className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 rounded-xl">Cancelar</button>
                                <button onClick={() => handleRejectTask(monthTasks[activeTaskIndex], postFeedbackText)} disabled={isActionProcessing || !postFeedbackText.trim()} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-50">
                                  {isActionProcessing ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>} Enviar Revisão
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      ) : monthTasks[activeTaskIndex]?.status === 'completed' ? (
                        <div className="flex flex-col gap-3">
                           <div className="bg-green-50 text-green-700 py-3.5 rounded-2xl font-roboto text-[10px] font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-2 border border-green-200 shadow-sm text-center">
                             <CheckCircle2 size={16} /> Atividade Concluída
                           </div>
                           
                           {/* Botões pós-aprovação */}
                           <div className="grid grid-cols-2 gap-3 mt-2">
                             <a 
                               href={monthTasks[activeTaskIndex]?.attachment_url || "#"} 
                               download 
                               target="_blank" 
                               rel="noreferrer"
                               className={`bg-[var(--color-atelier-grafite)] hover:bg-gray-800 text-white py-3.5 rounded-2xl font-roboto text-[9px] font-bold uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-1 shadow-md ${!monthTasks[activeTaskIndex]?.attachment_url ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                             >
                               <Download size={16} /> Baixar Mídia
                             </a>
                             <button 
                               onClick={() => {
                                 if (monthTasks[activeTaskIndex]?.description) {
                                   navigator.clipboard.writeText(monthTasks[activeTaskIndex].description);
                                   showToast("Legenda copiada com sucesso!");
                                 } else {
                                   showToast("Nenhuma legenda disponível para copiar.");
                                 }
                               }}
                               className="bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 py-3.5 rounded-2xl font-roboto text-[9px] font-bold uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-1 shadow-sm"
                             >
                               <AlignLeft size={16} /> Copiar Legenda
                             </button>
                           </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 text-gray-400 py-4 rounded-2xl font-roboto text-[11px] font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-2 border border-gray-200 text-center">
                          Aguardando Finalização da Equipa
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        
        {/* MODAL DE PREVIEW DE PDF */}
        <AnimatePresence>
          {previewPdfUrl && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center px-4 py-8">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreviewPdfUrl(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer" />
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-5xl h-[90vh] border border-white/20 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[var(--color-atelier-grafite)]/10 pb-4 shrink-0 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">Visualização do Documento</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <a href={previewPdfUrl} download target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] transition-colors shadow-sm">
                      <Download size={14}/> Baixar Cópia
                    </a>
                    <button onClick={() => setPreviewPdfUrl(null)} className="text-gray-400 hover:text-[var(--color-atelier-terracota)] bg-gray-50 hover:bg-gray-100 p-3 rounded-full transition-colors border border-gray-200">
                      <X size={18}/>
                    </button>
                  </div>
                </div>
                <div className="flex-1 bg-gray-100/50 rounded-2xl overflow-hidden border border-gray-200 shadow-inner flex items-center justify-center">
                  <iframe src={`${previewPdfUrl}#toolbar=0&navpanes=0`} className="w-full h-full border-none" title="PDF Preview" />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAIS T-NPS E UPSELL */}
        <AnimatePresence>
          {showNpsModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/60 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="glass-panel bg-white/95 backdrop-blur-xl p-10 md:p-12 rounded-[3.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.15)] relative z-10 w-full max-w-xl border border-white flex flex-col gap-8 text-center">
                 <div className="mx-auto w-20 h-20 rounded-[1.5rem] bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shadow-inner"><Star size={32} /></div>
                 <div>
                   <h3 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-3">Como avalia as propostas?</h3>
                   <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/60 font-medium">De 0 a 10, quão alinhada esta estratégia visual está com a visão da sua marca?</p>
                 </div>
                 <div className="flex justify-between gap-2 mt-2">
                    {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                      <button key={num} onClick={() => setNpsScore(num)} className={`w-9 h-12 md:w-11 md:h-14 rounded-[1rem] font-bold text-[14px] md:text-[16px] transition-all ${npsScore === num ? 'bg-[var(--color-atelier-terracota)] text-white shadow-lg scale-110 border-transparent' : 'bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/50 hover:border-[var(--color-atelier-terracota)]/40'}`}>
                        {num}
                      </button>
                    ))}
                 </div>
                 <textarea value={npsFeedback} onChange={e => setNpsFeedback(e.target.value)} placeholder="Deixe um comentário opcional..." className="w-full bg-gray-50/50 border border-[var(--color-atelier-grafite)]/10 rounded-2xl p-5 text-[13px] font-medium text-[var(--color-atelier-grafite)] resize-none h-28 outline-none focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 transition-all custom-scrollbar" />
                 <div className="flex gap-4 mt-2">
                   <button onClick={handleSkipNps} className="flex-1 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-grafite)] transition-colors rounded-xl hover:bg-gray-50">Pular Avaliação</button>
                   <button onClick={handleSubmitNps} disabled={npsScore === null || isProcessing} className="flex-1 bg-[var(--color-atelier-grafite)] text-white py-4 rounded-[1.2rem] text-[11px] font-bold uppercase tracking-[0.1em] shadow-md hover:bg-[var(--color-atelier-terracota)] transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                     {isProcessing ? <Loader2 size={16} className="animate-spin"/> : "Enviar Feedback"}
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
                 <div className="mx-auto w-20 h-20 rounded-[1.5rem] bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center mb-2 shadow-inner"><Zap size={32} fill="currentColor" /></div>
                 <div>
                   <h3 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-4 leading-tight">Pronto para acelerar os resultados?</h3>
                   <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/70 leading-relaxed font-medium">A Liz Design possui especialistas prontos para assumir toda a gestão do seu ecossistema digital.</p>
                 </div>
                 <div className="flex flex-col gap-3 mt-4">
                   <button onClick={handleAcceptUpsell} className="w-full bg-[var(--color-atelier-terracota)] text-white py-5 rounded-[1.5rem] font-bold uppercase tracking-[0.1em] text-[11px] shadow-lg hover:bg-[#8c562e] transition-all">Sim, Quero conhecer as opções</button>
                   <button onClick={handleDeclineUpsell} className="w-full bg-transparent text-[var(--color-atelier-grafite)]/50 py-4 rounded-[1.5rem] font-bold uppercase tracking-widest text-[10px] hover:text-[var(--color-atelier-grafite)] hover:bg-gray-50 transition-colors">Não, pretendo manter o formato atual</button>
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
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60">Resumo Executivo</span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-tight tracking-tight">{greeting}, <span className="text-[var(--color-atelier-terracota)] italic">{clientName}.</span></h1>
          
          {/* 🟢 INFORMAÇÕES DE CONTRATO (GERAL) */}
          {(project.contract_end || project.posts_quantity > 0 || project.videos_quantity > 0) && (
             <div className="flex flex-wrap items-center gap-2 mt-4">
               {project.contract_end && (
                 <span className="px-3 py-1.5 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 shadow-sm flex items-center gap-1.5">
                   <Calendar size={13} className="text-[var(--color-atelier-terracota)]" />
                   Até {new Date(project.contract_end).toLocaleDateString('pt-BR')}
                 </span>
               )}
               {project.posts_quantity > 0 && (
                 <span className="px-3 py-1.5 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 shadow-sm flex items-center gap-1.5">
                   <LayoutDashboard size={13} className="text-[var(--color-atelier-terracota)]" />
                   {project.posts_quantity} Posts/Mês
                 </span>
               )}
               {project.videos_quantity > 0 && (
                 <span className="px-3 py-1.5 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 shadow-sm flex items-center gap-1.5">
                   <Video size={13} className="text-[var(--color-atelier-terracota)]" />
                   {project.videos_quantity} Vídeos/Mês
                 </span>
               )}
             </div>
          )}

          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-4 max-w-md font-medium leading-relaxed">O seu painel de acompanhamento diário. Acompanhe a evolução do projeto e faça a gestão das entregas com eficiência.</p>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-[fadeInUp_0.6s_ease-out]">
        <motion.div whileHover={{ y: -4 }} className="md:col-span-8 glass-panel p-8 md:p-12 flex flex-col justify-between bg-white/60 relative overflow-hidden rounded-[3rem] border border-white shadow-sm transition-colors hover:bg-white/80">
          <div className="flex items-start justify-between mb-8">
            <div>
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2 block">Atenção Solicitada</span>
              <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Nenhuma Pendência</h2>
            </div>
            <div className="w-14 h-14 rounded-[1.2rem] flex items-center justify-center shrink-0 shadow-inner border bg-green-50 text-green-500 border-green-100"><CheckCircle2 size={28} /></div>
          </div>
          <div>
            <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/80 mb-8 leading-relaxed font-medium">Não há avaliações aguardando a sua ação no momento. A nossa equipe de design continua focada na próxima fase criativa do seu projeto.</p>
            <button onClick={() => window.open(project.contract_url, "_blank")} disabled={!project.contract_url} className="px-8 py-5 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-[0.1em] flex items-center gap-3 transition-all outline-none bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)] shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
              Acessar Contrato Assinado <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="md:col-span-4 glass-panel p-8 md:p-10 flex flex-col justify-between bg-white/60 relative overflow-hidden rounded-[3rem] border border-white shadow-sm transition-colors hover:bg-white/80">
          <div className="absolute -right-6 -top-6 w-40 h-40 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div>
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2 flex items-center gap-2"><Activity size={12} className="text-[var(--color-atelier-terracota)]"/> Status Geral</span>
            <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-6">Saúde do Projeto</h2>
          </div>
          
          <div className="text-center mt-2 relative z-10">
             <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white shadow-sm text-[var(--color-atelier-terracota)] font-roboto text-[10px] font-bold uppercase tracking-widest border border-[var(--color-atelier-terracota)]/10"><TrendingUp size={12} /> Ritmo Saudável</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="md:col-span-12 glass-panel p-6 md:p-8 bg-white/70 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between border-l-4 border-l-[var(--color-atelier-grafite)] rounded-[2rem] rounded-l-lg shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[1rem] bg-white shadow-inner flex items-center justify-center shrink-0 border border-white/50"><Clock size={20} className="text-[var(--color-atelier-grafite)]" /></div>
            <div>
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 block mb-1">Acompanhamento Transparente</span>
              <h3 className="font-roboto text-[15px] font-bold text-[var(--color-atelier-grafite)] flex items-center gap-2">Andamento da Equipe: <span className="font-normal text-[var(--color-atelier-terracota)]">{currentFocus}</span></h3>
            </div>
          </div>
          <div className="text-[11px] font-roboto font-bold text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest flex items-center gap-2 shrink-0 bg-white px-5 py-2.5 rounded-xl shadow-sm border border-white">
            <Sparkles size={14} className="text-[var(--color-atelier-terracota)]" /> Atualizado pela Direção de Arte
          </div>
        </motion.div>
      </div>
    </div>
  );
}