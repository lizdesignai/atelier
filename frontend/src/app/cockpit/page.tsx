// src/app/cockpit/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { NotificationEngine } from "../../lib/NotificationEngine"; 
import { normalizeImageUrl, getSafeAvatarUrl, handleAvatarError } from "../../lib/imageUtils";
import { 
  Activity, AlertCircle, ArrowRight, CheckCircle2, 
  Clock, Compass, Palette, Loader2, Target, Camera, 
  ChevronRight, ChevronLeft, CalendarDays, MessageSquare, 
  XCircle, Star, Zap, FileText, Download, X, AlignLeft, 
  RotateCcw, Send, PlayCircle, ImageIcon, LayoutDashboard, TrendingUp,
  ChevronDown, ChevronUp, Calendar, Video, Layers, BarChart3,
  RefreshCw, Heart, MessageCircle, ExternalLink, Instagram, Users,
  Edit3, Check, Columns2, Rows3, LayoutGrid, BookOpen, ShieldCheck, CheckSquare
} from "lucide-react";
import dynamic from "next/dynamic";
import { useProfile } from "../../hooks/useProfile";
import { fetchCockpitTasks } from "./actions";
import { ADJUST_TYPES, PULSE_QUESTIONS, PILLARS, OBJECTIVE_KINDS, isPieceTask } from "@/lib/presenca/constants";
import { classifyDemand, getClientTaskDate, parseSafeLocalDate, isDemandPermittedInCycle, isClientVisibleTask, DemandCategory, DemandMeta } from "@/lib/presenca/demandTypes";
import { getProductTypeFromProject } from "@/lib/productHelper";

import { pdf } from '@react-pdf/renderer';
import DirecionamentoEstrategicoPDF from "@/components/pdf/DirecionamentoEstrategicoPDF";

const InstagramBriefingModal = dynamic(() => import("../../components/InstagramBriefingModal"), { ssr: false });
const MissionsVaultModal = dynamic(() => import("../../components/MissionsVaultModal"), { ssr: false });
const AdvancedInstagramMetricsModal = dynamic(() => import("../../components/AdvancedInstagramMetricsModal"), { ssr: false });

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

  // Estados Presença 2.0 (Ciclo de faturamento, aprovação contextual e pulso)
  const [presencaData, setPresencaData] = useState<any>(null);
  const [pulseData, setPulseData] = useState<any>(null);
  const [isPulseModalOpen, setIsPulseModalOpen] = useState(false);
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [pulseAnswers, setPulseAnswers] = useState<Record<string, string>>({});
  const [isSubmittingPulse, setIsSubmittingPulse] = useState(false);
  const [selectedAdjustType, setSelectedAdjustType] = useState<string>("visual");
  const [isCommentMode, setIsCommentMode] = useState(false);
  const [commentText, setCommentText] = useState("");

  // Estados Apify Instagram Analytics & Relatórios
  const [instagramAnalytics, setInstagramAnalytics] = useState<any>(null);
  const [isSyncingInstagram, setIsSyncingInstagram] = useState(false);
  const [isInstagramReportModalOpen, setIsInstagramReportModalOpen] = useState(false);
  const [isAdvancedMetricsOpen, setIsAdvancedMetricsOpen] = useState(false);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const demandsContainerRef = useRef<HTMLDivElement | null>(null);

  // Modo de Exibição do Cockpit: 'side' (Lado a Lado) ou 'stacked' (Barra Abaixo)
  const [layoutMode, setLayoutMode] = useState<'side' | 'stacked'>('side');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('atelier_cockpit_layout_mode');
      if (saved === 'side' || saved === 'stacked') {
        setLayoutMode(saved);
      }
    } catch (_) {}
  }, []);

  const handleSetLayoutMode = (mode: 'side' | 'stacked') => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('atelier_cockpit_layout_mode', mode);
    } catch (_) {}
  };

  useEffect(() => {
    const fetchCockpitData = async () => {
      try {
        let sessionUser: any = null;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) sessionUser = session.user;
        } catch (_) {}

        if (!sessionUser) {
          try {
            const meRes = await fetch("/api/auth/me", { credentials: "include" });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData?.user) sessionUser = meData.user;
            }
          } catch (_) {}
        }

        if (sessionUser) {
          setClientId(sessionUser.id);
          const { data: profile } = await (supabase.from('profiles') as any).select('id, nome, username, instagram, avatar_url').eq('id', sessionUser.id).maybeSingle();
          if (profile) {
            setClientProfile(profile);
            if (profile.nome) setClientName(profile.nome.split(' ')[0]);
          } else if (sessionUser.nome) {
            setClientName(sessionUser.nome.split(' ')[0]);
          }
        }

        let proj: any = null;
        if (sessionUser?.role === 'client') {
          const { data } = await (supabase.from('projects') as any).select('*').eq('client_id', sessionUser.id).in('status', ['active', 'delivered']).order('created_at', { ascending: false }).limit(1).maybeSingle();
          proj = data;
        } else {
          // Se for admin/gestor visitando o cockpit ou projeto de teste
          const { data } = await (supabase.from('projects') as any).select('*').or('service_type.eq.Gestão de Instagram,type.ilike.%Instagram%,type.ilike.%Pacote%').in('status', ['active', 'delivered']).order('created_at', { ascending: false }).limit(1).maybeSingle();
          proj = data;
        }

        if (proj && sessionUser?.role === 'client') {
          const productType = getProductTypeFromProject(proj);
          if (productType === 'idv') {
            router.replace('/');
            return;
          }
          if (productType === 'mapa') {
            router.replace('/mapa');
            return;
          }
        }

        setProject(proj);

        if (proj) {
          setCurrentFocus(proj.current_focus || "A equipe está analisando o seu projeto...");
          
          // 1. Carregar Ciclo de Presença, Pulso e Analytics do Instagram primeiro
          let activeCycle: any = null;
          if (getProductTypeFromProject(proj) === 'instagram') {
            try {
              const [pRes, plRes, igRes] = await Promise.all([
                fetch(`/api/presenca?projectId=${proj.id}`).then(r => r.json()).catch(() => null),
                fetch(`/api/presenca/pulse?projectId=${proj.id}`).then(r => r.json()).catch(() => null),
                fetch(`/api/sync-instagram?projectId=${proj.id}`).then(r => r.json()).catch(() => null)
              ]);
              if (pRes && !pRes.error) {
                setPresencaData(pRes);
                activeCycle = pRes.cycle;
              }
              if (plRes && !plRes.error) {
                setPulseData(plRes);
                if (plRes.existingAnswers) setPulseAnswers(plRes.existingAnswers);
              }
              if (igRes && igRes.success) {
                setInstagramAnalytics(igRes);
              }
            } catch (pErr) {
              console.warn("Aviso ao carregar dados do ciclo de presença e instagram:", pErr);
            }
          }

          // 2. Buscamos e filtramos os POSTS sociais
          const { data: postsData } = await (supabase
            .from('social_posts') as any)
            .select('*')
            .eq('project_id', proj.id)
            .in('status', ['pending_approval', 'approved', 'needs_revision'])
            .order('created_at', { ascending: false });

          // 3. Delimitação de período e busca das tarefas do ciclo
          const year = new Date().getFullYear();
          const month = new Date().getMonth();
          const startRange = activeCycle?.period_start
            ? new Date(activeCycle.period_start).toISOString()
            : new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();
          const endRange = activeCycle?.period_end
            ? new Date(new Date(activeCycle.period_end).getTime() + 86400000).toISOString()
            : new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)).toISOString();

          // Server Action com bypass RLS e amarração ao ciclo ativo
          const rawTasks = await fetchCockpitTasks(proj.id, sessionUser?.id || proj.client_id, startRange, endRange, Date.now(), activeCycle?.id);
            
          let tasksData = rawTasks || [];

          // 4. 🟢 FILTRO REFINADO: Exibir apenas demandas do cliente sem vazamento de tarefas internas ou pontuais
          tasksData = tasksData.filter((task: any) => {
            const hasPost = (postsData || []).find((p: any) => p.task_id === task.id);
            const cycleNumber = activeCycle?.cycle_number ?? 1;

            // 1. Verificação rigorosa de visibilidade pelo cliente
            if (!isClientVisibleTask(task, Boolean(hasPost), cycleNumber)) {
              return false;
            }

            // 2. Restrição estrita de ciclo e período
            if (activeCycle) {
              if (task.cycle_id && task.cycle_id !== activeCycle.id) return false;

              const clientDate = getClientTaskDate(task, hasPost);
              if (isNaN(clientDate.getTime())) return false;

              const cStart = parseSafeLocalDate(activeCycle.period_start);
              const cEnd = parseSafeLocalDate(activeCycle.period_end);
              cStart.setHours(0, 0, 0, 0);
              cEnd.setHours(23, 59, 59, 999);

              // Bloqueio rigoroso de datas fora do ciclo ativo
              if (clientDate < cStart || clientDate > cEnd) return false;
            }

            return true;
          });

          const sortedTasks = tasksData.sort((a, b) => {
            if (a.status === 'pending_client_approval' && b.status !== 'pending_client_approval') return -1;
            if (a.status !== 'pending_client_approval' && b.status === 'pending_client_approval') return 1;
            const dateA = getClientTaskDate(a, (postsData || []).find((p: any) => p.task_id === a.id));
            const dateB = getClientTaskDate(b, (postsData || []).find((p: any) => p.task_id === b.id));
            return dateA.getTime() - dateB.getTime();
          });
          
          setMonthTasks(sortedTasks);

          // 5. Lógica de Bloqueio (Release Day)
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

          // 6. Configuração dos posts visíveis no Studio de aprovação
          const visiblePosts = (postsData || []).filter((p: any) => {
             if (p.status === 'approved') return true;
             if (p.task_id && isTaskLocked(p.task_id)) return false;
             return true;
          });

          const sortedPosts = visiblePosts.sort((a: any, b: any) => {
            if (a.status === 'pending_approval' && b.status !== 'pending_approval') return -1;
            if (a.status !== 'pending_approval' && b.status === 'pending_approval') return 1;
            return 0;
          });

          const normalizedPosts = sortedPosts.map((p: any) => ({
            ...p,
            image_url: normalizeImageUrl(p.image_url),
            media_assets: Array.isArray(p.media_assets)
              ? p.media_assets.map((m: any) => ({ ...m, url: normalizeImageUrl(m.url) }))
              : p.media_assets
          }));
          setAllPosts(normalizedPosts);
          setPendingCount(sortedPosts.filter((p: any) => p.status === 'pending_approval').length);

          const { data: brief } = await (supabase.from('instagram_briefings') as any).select('*').eq('project_id', proj.id).or('status.neq.returned,status.is.null').order('created_at', { ascending: false }).limit(1).maybeSingle(); 
          setBriefing(brief);

          const { count: missionsCount } = await (supabase.from('asset_missions') as any).select('*', { count: 'exact', head: true }).eq('project_id', proj.id).eq('status', 'pending');
          setPendingMissions(missionsCount || 0);

          const { data: plans } = await (supabase.from('content_planning') as any).select('*').eq('project_id', proj.id).eq('status', 'awaiting_approval').order('created_at', { ascending: true });
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
      await (supabase.from('social_posts') as any).update({ status: 'approved' }).eq('id', post.id);
      
      // 2. 🟢 SINC. KANBAN: Dá baixa na tarefa de produção da agência
      if (post.task_id) {
         await (supabase.from('tasks') as any).update({ 
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
      await (supabase.from('content_feedback_pins') as any).insert({
         post_id: post.id,
         comment: postFeedbackText
      });
      
      // 2. Regride o status do Post
      await (supabase.from('social_posts') as any).update({ status: 'needs_revision' }).eq('id', post.id);

      // 3. Devolve a tarefa do Post diretamente para a coluna 'review' do Kanban da equipa
      if (post.task_id) {
        await (supabase.from('tasks') as any).update({ status: 'review' }).eq('id', post.task_id);
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
    const meta = classifyDemand(task);
    try {
      // 1. Atualiza via Presença Engine (com registro de auditoria em ig_approval_events)
      await fetch('/api/presenca/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          action: 'approve',
          actorId: clientId,
          actorName: clientName,
          actorRole: 'cliente'
        })
      });

      // 2. Atualiza compatibilidade legado
      await (supabase.from('tasks') as any).update({ 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      }).eq('id', task.id);
      
      const { data: hasPost } = await (supabase.from('social_posts') as any).select('id').eq('task_id', task.id).maybeSingle();
      if (hasPost) {
        await (supabase.from('social_posts') as any).update({ status: 'approved' }).eq('task_id', task.id);
      }
      
      const now = new Date().toISOString();
      const approveMsg = {
        id: `msg-${Date.now()}`,
        authorName: clientName || 'Cliente',
        role: 'client',
        content: `✅ ${meta.typeLabel} aprovado pelo cliente.`,
        createdAt: now
      };

      setMonthTasks(prev => prev.map(t => {
        if (t.id === task.id) {
          let currentThread: any[] = [];
          try {
            currentThread = t.admin_feedback ? (Array.isArray(t.admin_feedback) ? t.admin_feedback : JSON.parse(t.admin_feedback)) : [];
          } catch { currentThread = []; }
          return {
            ...t,
            status: 'completed',
            ig_publish_status: 'approved',
            admin_feedback: JSON.stringify([...currentThread, approveMsg])
          };
        }
        return t;
      }));

      showToast(`${meta.typeLabel} aprovado com sucesso!`);
    } catch(e) {
      showToast("Erro ao aprovar a atividade.");
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleRejectTask = async (task: any, feedback: string, adjustType: string = 'visual') => {
    if(!feedback.trim()) {
      showToast("Por favor, descreva o que precisa ser ajustado.");
      return;
    }
    setIsActionProcessing(true);
    const meta = classifyDemand(task);
    try {
      // 1. Atualiza via Presença Engine com categorização de problema
      await fetch('/api/presenca/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          action: 'request_adjust',
          adjustType,
          comment: feedback,
          actorId: clientId,
          actorName: clientName,
          actorRole: 'cliente'
        })
      });

      // 2. Atualiza compatibilidade legado
      await (supabase.from('tasks') as any).update({ status: 'review' }).eq('id', task.id);
      
      const { data: hasPost } = await (supabase.from('social_posts') as any).select('id').eq('task_id', task.id).maybeSingle();
      if (hasPost) {
        await (supabase.from('social_posts') as any).update({ status: 'needs_revision' }).eq('task_id', task.id);
        await (supabase.from('content_feedback_pins') as any).insert({
          post_id: hasPost.id,
          comment: feedback
        });
      }

      const now = new Date().toISOString();
      const adjustMsg = {
        id: `msg-${Date.now()}`,
        authorName: clientName || 'Cliente',
        role: 'client',
        content: feedback,
        adjustType,
        createdAt: now
      };

      setMonthTasks(prev => prev.map(t => {
        if (t.id === task.id) {
          let currentThread: any[] = [];
          try {
            currentThread = t.admin_feedback ? (Array.isArray(t.admin_feedback) ? t.admin_feedback : JSON.parse(t.admin_feedback)) : [];
          } catch { currentThread = []; }
          return {
            ...t,
            status: 'review',
            ig_publish_status: 'adjust_requested',
            admin_feedback: JSON.stringify([...currentThread, adjustMsg])
          };
        }
        return t;
      }));
      
      setActivePostFeedbackId(null);
      setPostFeedbackText("");
      showToast("Revisão solicitada com sucesso! A equipe no Focus já foi notificada.");
    } catch(e) {
      showToast("Erro ao solicitar revisão.");
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleCommentTask = async (task: any, comment: string) => {
    if (!comment.trim()) return;
    setIsActionProcessing(true);
    try {
      await fetch('/api/presenca/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          action: 'comment',
          comment,
          actorId: clientId,
          actorName: clientName,
          actorRole: 'cliente'
        })
      });

      const now = new Date().toISOString();
      const commentMsg = {
        id: `msg-${Date.now()}`,
        authorName: clientName || 'Cliente',
        role: 'client',
        content: comment,
        isCommentOnly: true,
        createdAt: now
      };

      setMonthTasks(prev => prev.map(t => {
        if (t.id === task.id) {
          let currentThread: any[] = [];
          try {
            currentThread = t.admin_feedback ? (Array.isArray(t.admin_feedback) ? t.admin_feedback : JSON.parse(t.admin_feedback)) : [];
          } catch { currentThread = []; }
          return {
            ...t,
            admin_feedback: JSON.stringify([...currentThread, commentMsg])
          };
        }
        return t;
      }));

      setCommentText("");
      setIsCommentMode(false);
      showToast("Comentário enviado para a equipe no Focus.");
    } catch(e) {
      showToast("Erro ao enviar comentário.");
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleSubmitPulse = async () => {
    const cycleId = pulseData?.cycleId || presencaData?.cycle?.id;
    if (!cycleId) return;
    setIsSubmittingPulse(true);
    try {
      const res = await fetch('/api/presenca/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId,
          answers: pulseAnswers
        })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setIsPulseModalOpen(false);
      setPulseData((prev: any) => ({ ...prev, needed: false, existingAnswers: pulseAnswers }));
      if (presencaData?.cycle) {
        setPresencaData((prev: any) => ({
          ...prev,
          cycle: {
            ...prev.cycle,
            pulse_answers: pulseAnswers,
            pulse_answered_at: new Date().toISOString()
          }
        }));
      }
      showToast("Direcionamento enviado com sucesso! Nossa equipe iniciará seu planejamento editorial.");
    } catch (e: any) {
      showToast("Erro ao enviar direcionamento: " + e.message);
    } finally {
      setIsSubmittingPulse(false);
    }
  };

  const [isDownloadingDirecionamentoPDF, setIsDownloadingDirecionamentoPDF] = useState(false);

  const handleDownloadDirecionamentoPDF = async () => {
    if (!presencaData?.cycle) return;
    setIsDownloadingDirecionamentoPDF(true);
    showToast("Gerando PDF do Direcionamento Estratégico...");
    try {
      const cName = clientName || "Cliente";
      const doc = (
        <DirecionamentoEstrategicoPDF
          clientName={cName}
          cycleNumber={presencaData.cycle.cycle_number || 1}
          periodStart={presencaData.cycle.period_start}
          periodEnd={presencaData.cycle.period_end}
          answeredAt={presencaData.cycle.pulse_answered_at}
          answers={pulseAnswers || presencaData.cycle.pulse_answers || {}}
          objective={presencaData.cycle.objective}
          editorialStrategy={presencaData.cycle.editorial_strategy}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Direcionamento_Estrategico_Ciclo_${presencaData.cycle.cycle_number || 1}_${cName.replace(/\s+/g, '_')}.pdf`;
      link.click();
      showToast("PDF baixado com sucesso! ✨");
    } catch (e: any) {
      showToast("Erro ao gerar PDF: " + (e?.message || "falha na compilação"));
    } finally {
      setIsDownloadingDirecionamentoPDF(false);
    }
  };

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    return url.match(/\.(mp4|mov|webm)$/i);
  };

  const rawUsername = instagramAnalytics?.profile?.username || clientProfile?.username || clientProfile?.instagram || project?.profiles?.username || presencaData?.client_username || "";
  const currentUsername = rawUsername ? rawUsername.replace(/^@/, '').trim() : "";
  const rawAvatarUrl = instagramAnalytics?.profile?.avatar_url || clientProfile?.avatar_url || userProfile?.avatar_url || null;
  const currentAvatarUrl = rawAvatarUrl ? normalizeImageUrl(rawAvatarUrl, currentUsername) : null;

  const handleSaveUsername = async () => {
    if (!usernameInput.trim()) {
      showToast("Por favor, informe o @username do perfil.");
      return;
    }
    const clean = usernameInput.replace(/^@/, '').trim().toLowerCase();
    setIsSavingUsername(true);
    try {
      const res = await fetch('/api/sync-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: clean,
          projectId: project?.id,
          clientId
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`@${clean} salvo! Dados do perfil sincronizados.`);
        setClientProfile((prev: any) => ({
          ...prev,
          username: clean,
          instagram: clean,
          avatar_url: json.profile?.avatar_url || prev?.avatar_url
        }));
        if (json.profile) {
          setInstagramAnalytics((prev: any) => ({
            ...prev,
            success: true,
            profile: json.profile,
            metrics: {
              ...(prev?.metrics || {}),
              followersCount: json.profile.followers_count ?? prev?.metrics?.followersCount ?? 1420,
              followingCount: json.profile.following_count ?? prev?.metrics?.followingCount ?? 480,
              postsCount: json.profile.posts_count ?? prev?.metrics?.postsCount ?? 9,
            }
          }));
        }
        if (project?.id) {
          const updated = await fetch(`/api/sync-instagram?projectId=${project.id}`).then(r => r.json());
          if (updated?.success) {
            setInstagramAnalytics(updated);
          }
        }
        setIsEditingUsername(false);
      } else {
        showToast("Aviso ao salvar: " + (json.error || "Tente novamente mais tarde."));
      }
    } catch (err: any) {
      showToast("Erro ao sincronizar username: " + err.message);
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleManualSyncInstagram = async () => {
    const targetProjectId = project?.id || presencaData?.cycle?.project_id || presencaData?.project?.id || "6e184ace-0004-4eff-b54d-2c3676bda6a8";
    const targetUser = currentUsername || clientProfile?.instagram || clientProfile?.username || presencaData?.client_username || (clientName !== "Cliente" ? clientName : "") || "dr.iuricardoso";

    if (!targetUser) {
      showToast("Por favor, configure o @username do Instagram antes de sincronizar.");
      setIsEditingUsername(true);
      return;
    }

    setIsSyncingInstagram(true);
    showToast("Sincronizando dados em tempo real com o Instagram...");
    try {
      const res = await fetch('/api/sync-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: targetUser,
          projectId: targetProjectId,
          clientId: clientId || clientProfile?.id || project?.client_id
        })
      });
      const json = await res.json();
      if (json.success) {
        const delta = json.comparison?.delta?.followers;
        const deltaText = delta !== undefined && delta !== null 
          ? (delta > 0 ? `+${delta} novos seguidores` : delta < 0 ? `${delta} seguidores` : "base estável")
          : "perfil atualizado";
        showToast(`Sincronização concluída! (${deltaText})`);

        if (json.profile) {
          setInstagramAnalytics((prev: any) => ({
            ...prev,
            success: true,
            profile: json.profile,
            comparison: json.comparison,
            metrics: {
              ...(prev?.metrics || {}),
              followersCount: json.profile.followers_count ?? prev?.metrics?.followersCount,
              previousFollowersCount: json.comparison?.old?.followers ?? prev?.metrics?.previousFollowersCount,
              followerGain: json.comparison?.delta?.followers ?? prev?.metrics?.followerGain,
              followingCount: json.profile.following_count ?? prev?.metrics?.followingCount,
              postsCount: json.profile.posts_count ?? prev?.metrics?.postsCount,
              lastSyncedAt: json.profile.last_synced_at,
              previousSyncedAt: json.comparison?.old?.syncedAt
            }
          }));
        }

        if (targetProjectId) {
          const updated = await fetch(`/api/sync-instagram?projectId=${targetProjectId}`).then(r => r.json()).catch(() => null);
          if (updated?.success) setInstagramAnalytics(updated);
        }
      } else {
        showToast("Aviso na atualização: " + (json.error || "Tente novamente mais tarde."));
      }
    } catch (err: any) {
      console.error("[Sync Instagram Error]:", err);
      showToast("Erro ao sincronizar perfil do Instagram: " + (err.message || "tente novamente."));
    } finally {
      setIsSyncingInstagram(false);
    }
  };

  // Informações dinâmicas do ciclo e do mês do Cronograma Editorial
  const cycleMonthInfo = useMemo(() => {
    const rawDate = presencaData?.cycle?.period_start
      ? parseSafeLocalDate(presencaData.cycle.period_start)
      : (project?.billing_date ? parseSafeLocalDate(project.billing_date) : new Date());

    const monthName = rawDate.toLocaleDateString('pt-BR', { month: 'long' });
    const monthCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    let periodLabel = "";
    if (presencaData?.cycle?.period_start && presencaData?.cycle?.period_end) {
      const s = parseSafeLocalDate(presencaData.cycle.period_start);
      const e = parseSafeLocalDate(presencaData.cycle.period_end);
      periodLabel = `${s.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')} a ${e.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}`;
    }

    return {
      monthName: monthCapitalized,
      rawMonthName: monthName,
      periodLabel,
      cycleNumber: presencaData?.cycle?.cycle_number || 1
    };
  }, [presencaData?.cycle, project?.billing_date]);

  // Governança refinada do ciclo ativo (dias restantes, progresso temporal e pilares)
  const cycleGovernance = useMemo(() => {
    if (!presencaData?.cycle?.period_start || !presencaData?.cycle?.period_end) {
      return { daysRemaining: 18, progressPercent: 45, periodLabel: "" };
    }
    const start = parseSafeLocalDate(presencaData.cycle.period_start).getTime();
    const end = parseSafeLocalDate(presencaData.cycle.period_end).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const elapsedDays = Math.max(0, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
    const progress = Math.min(100, Math.max(5, Math.round((elapsedDays / totalDays) * 100)));

    const s = parseSafeLocalDate(presencaData.cycle.period_start);
    const e = parseSafeLocalDate(presencaData.cycle.period_end);
    const pLabel = `${s.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${e.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;

    return {
      daysRemaining: Math.max(0, diffDays),
      progressPercent: progress,
      periodLabel: pLabel
    };
  }, [presencaData?.cycle?.period_start, presencaData?.cycle?.period_end]);

  // Demandas fundacionais (etapas estratégicas prévias à formulação e publicação dos posts)
  const foundationalDemands = useMemo(() => {
    return monthTasks.filter(t => classifyDemand(t).isFoundational);
  }, [monthTasks]);

  const pendingFoundationalDemands = useMemo(() => {
    return foundationalDemands.filter(t => {
      const meta = classifyDemand(t);
      if (!meta.requiresClientApproval) return false;
      return t.status !== 'completed' && t.status !== 'approved';
    });
  }, [foundationalDemands]);

  const areFoundationalApproved = pendingFoundationalDemands.length === 0;

  // Agrupamento de demandas por dia: cada dia de entrega/marco do cliente com demandas forma uma coluna
  const tasksByDay = useMemo(() => {
    if (!monthTasks || monthTasks.length === 0) return [];

    const groups: { [key: string]: { dateStr: string; date: Date; tasks: any[] } } = {};

    monthTasks.forEach((task) => {
      const post = allPosts.find(p => p.task_id === task.id);
      const clientDate = getClientTaskDate(task, post);
      if (isNaN(clientDate.getTime())) return;

      const key = `${clientDate.getFullYear()}-${String(clientDate.getMonth() + 1).padStart(2, '0')}-${String(clientDate.getDate()).padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = {
          dateStr: key,
          date: clientDate,
          tasks: []
        };
      }
      groups[key].tasks.push(task);
    });

    return Object.values(groups).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [monthTasks, allPosts]);

  // Listener para rolagem horizontal inteligente, LIBERANDO o scroll vertical dentro das colunas
  useEffect(() => {
    const el = demandsContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      // Se o cursor estiver dentro da lista de demandas de uma coluna que tem scroll, libera rolagem vertical livre!
      const columnCards = target?.closest('.column-cards-scroll');
      if (columnCards) {
        const hasVerticalScroll = columnCards.scrollHeight > columnCards.clientHeight;
        if (hasVerticalScroll && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          // Permite que o scroll vertical ocorra naturalmente dentro da coluna
          const isAtTop = columnCards.scrollTop <= 0 && e.deltaY < 0;
          const isAtBottom = Math.ceil(columnCards.scrollTop + columnCards.clientHeight) >= columnCards.scrollHeight && e.deltaY > 0;
          if (!isAtTop && !isAtBottom) {
            return;
          }
        }
      }

      // No container do widget, o scroll do mouse move lateralmente (horizontal)
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta !== 0) {
        e.preventDefault();
        el.scrollLeft += delta;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [tasksByDay]);

  // ==========================================
  // MOTORES DO PLANEJAMENTO MENSAL E AVALIAÇÃO
  // ==========================================
  const handleApprovePlan = async (planId: string) => {
    setIsProcessing(true);
    try {
      // 1. Atualiza Planejamento para Aprovado
      await (supabase.from('content_planning') as any).update({ status: 'approved' }).eq('id', planId);
      
      // 2. 🟢 SINC. KANBAN: Dá baixa na tarefa de produção da agência (Se associada)
      // Nota: Como o plano pode não ter link direto com a task (task_id não é nativo do planning), 
      // nós fazemos uma query reversa baseada no attachment_url para encontrar a tarefa matriz.
      const plan = monthlyPlan.find(p => p.id === planId);
      if (plan && plan.planning_file_url) {
         const { data: matchedTasks } = await (supabase
            .from('tasks') as any)
            .select('id')
            .eq('attachment_url', plan.planning_file_url)
            .limit(1);
         
         if (matchedTasks && matchedTasks.length > 0) {
             await (supabase.from('tasks') as any).update({ 
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
      await (supabase.from('t_nps_scores') as any).insert({ project_id: project.id, client_id: clientId, score: npsScore, feedback: npsFeedback });
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
      await (supabase.from('content_planning') as any).update({ status: 'needs_revision', feedback: feedback }).eq('id', planId);
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
  const isInstagram = getProductTypeFromProject(project) === 'instagram';

  if (isInstagram) {
    
    return (
      <div className="flex flex-col min-h-screen max-w-[1500px] w-full mx-auto relative z-10 p-4 md:p-8 overflow-x-hidden gap-6 pb-24">
        
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
                    className="w-full md:w-auto bg-gradient-to-r from-[var(--color-atelier-terracota)] to-[#234E80] text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Aprovar Peça</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleApprovePlan(currentItem.id)}
                    className="w-full md:w-auto bg-gradient-to-r from-[var(--color-atelier-terracota)] to-[#234E80] text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Aprovar Estratégia</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* 🟢 CABEÇALHO LIMPO: SAUDAÇÃO */}
        <header className="animate-[fadeInUp_0.5s_ease-out] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <h1 className="font-elegant text-3xl md:text-4xl text-[var(--color-atelier-grafite)] leading-tight tracking-tight">
            {greeting}, <span className="text-[var(--color-atelier-terracota)] italic">{clientName}.</span>
          </h1>
        </header>

        {/* 🟢 INFORMAÇÕES DE CONTRATO */}
        {(project.contract_end || project.posts_quantity > 0 || project.videos_quantity > 0 || project.contract_url) && (
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
             {project.contract_url && (
               <button
                 type="button"
                 onClick={() => window.open(project.contract_url, "_blank")}
                 className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-[var(--color-atelier-grafite)]/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 shadow-sm flex items-center gap-1.5 cursor-pointer hover:text-[var(--color-atelier-terracota)] transition-colors"
               >
                 <FileText size={13} className="text-[var(--color-atelier-terracota)]" />
                 Visualizar Contrato Legal
               </button>
             )}
           </div>
        )}

        {/* 🟢 SEÇÃO SUPERIOR: INSTAGRAM ANALYTICS & AÇÕES (LADO A LADO OU BARRA ABAIXO) */}
        <div className={layoutMode === 'side'
          ? "grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch animate-[fadeInUp_0.45s_ease-out]"
          : "flex flex-col gap-4 sm:gap-5 animate-[fadeInUp_0.45s_ease-out]"
        }>
          
          {/* WIDGET INSTAGRAM ANALYTICS & APYFY TELEMETRIA */}
          <div className={layoutMode === 'side' ? "lg:col-span-8 flex flex-col" : "w-full flex flex-col"}>
            <div className="glass-panel bg-white/70 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-5 sm:p-7 shadow-xs flex flex-col justify-between gap-6 h-full animate-[fadeInUp_0.45s_ease-out]">
              
              {/* Header do Widget */}
              <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4 border-b border-gray-100/80 pb-5">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Foto de Perfil Real com Selo Instagram */}
                  <div className="relative shrink-0">
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border-2 border-white shadow-sm ring-2 ring-[var(--color-atelier-terracota)]/20 bg-gray-100 flex items-center justify-center">
                      {currentAvatarUrl ? (
                        <img 
                          src={currentAvatarUrl} 
                          alt={`@${currentUsername}`}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                            const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                      <div 
                        style={{ display: currentAvatarUrl ? 'none' : 'flex' }}
                        className="w-full h-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white items-center justify-center font-bold text-lg uppercase"
                      >
                        {currentUsername ? currentUsername[0] : <Instagram size={24} />}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center shadow-xs border border-white">
                      <Instagram size={11} />
                    </div>
                  </div>

                  {/* Informações Reais & Edição de Username */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                        {instagramAnalytics?.profile?.full_name || 'Apify Live Telemetry'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-100/80 text-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Tempo Real
                      </span>
                    </div>

                    {isEditingUsername ? (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <div className="flex items-center bg-white border border-[var(--color-atelier-terracota)]/50 rounded-xl px-2.5 py-1 shadow-2xs focus-within:ring-2 focus-within:ring-[var(--color-atelier-terracota)]/20">
                          <span className="text-gray-400 font-bold text-sm">@</span>
                          <input
                            type="text"
                            value={usernameInput}
                            onChange={(e) => setUsernameInput(e.target.value)}
                            placeholder="usuario.instagram"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveUsername();
                              if (e.key === 'Escape') setIsEditingUsername(false);
                            }}
                            className="bg-transparent border-none outline-none font-roboto text-sm font-semibold text-[var(--color-atelier-grafite)] px-1 py-0.5 w-36 sm:w-48"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveUsername}
                          disabled={isSavingUsername}
                          className="px-3 py-1.5 bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white rounded-xl font-roboto text-[10px] font-bold uppercase tracking-wider shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isSavingUsername ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          <span>Salvar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingUsername(false)}
                          className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-colors cursor-pointer"
                          title="Cancelar"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <h2 className="font-elegant text-2xl md:text-3xl text-[var(--color-atelier-grafite)] leading-tight flex items-center gap-2">
                          @{currentUsername || 'perfil.instagram'}
                          {currentUsername && (
                            <a 
                              href={`https://instagram.com/${currentUsername}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-400 hover:text-[var(--color-atelier-terracota)] transition-colors"
                              title="Abrir no Instagram"
                            >
                              <ExternalLink size={15} />
                            </a>
                          )}
                        </h2>
                        <button
                          type="button"
                          onClick={() => {
                            setUsernameInput(currentUsername || "");
                            setIsEditingUsername(true);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-[var(--color-atelier-terracota)] rounded-xl font-roboto text-[10px] font-bold uppercase tracking-wider shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                          title="Alterar @ do Instagram"
                        >
                          <Edit3 size={11} />
                          <span>Editar @</span>
                        </button>
                      </div>
                    )}

                    <p className="font-roboto text-xs text-gray-500 truncate max-w-xl mt-0.5">
                      {instagramAnalytics?.profile?.biography || 'Monitoramento contínuo de conteúdos, engajamento e tração de audiência.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap self-start 2xl:self-center">
                  <button
                    type="button"
                    onClick={handleManualSyncInstagram}
                    disabled={isSyncingInstagram}
                    className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-[var(--color-atelier-grafite)] rounded-xl font-roboto text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    <RefreshCw size={13} className={isSyncingInstagram ? "animate-spin text-[var(--color-atelier-terracota)]" : "text-gray-500"} />
                    <span>{isSyncingInstagram ? "Atualizando..." : "Sincronizar"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAdvancedMetricsOpen(true)}
                    className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-[var(--color-atelier-terracota)] to-[#234E80] hover:from-[#234E80] hover:to-[#6f4222] text-white rounded-xl font-roboto text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ring-1 ring-white/30 whitespace-nowrap shrink-0"
                    title="Auditoria avançada de telemetria, engajamento e tração"
                  >
                    <Activity size={13} strokeWidth={2.4} className="text-amber-200 shrink-0" />
                    <span>Métricas Avançadas</span>
                  </button>
                </div>
              </div>

              {/* KPIs em Grid de 4 Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                
                {/* 1. Seguidores & Ganho */}
                <div className="bg-white/90 rounded-[1.8rem] p-4 sm:p-5 border border-white/90 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Seguidores
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <Users size={15} />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-elegant text-3xl sm:text-4xl text-[var(--color-atelier-grafite)] font-bold">
                      {(instagramAnalytics?.metrics?.followersCount || 1420).toLocaleString('pt-BR')}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 text-emerald-600 font-bold text-xs flex-wrap">
                      <TrendingUp size={13} />
                      <span>
                        {Number(instagramAnalytics?.metrics?.followerGain || 0) >= 0 ? '+' : ''}
                        {Number(instagramAnalytics?.metrics?.followerGain || 0).toLocaleString('pt-BR')} novos
                      </span>
                      {instagramAnalytics?.metrics?.previousFollowersCount && (
                        <span className="text-[10px] text-gray-400 font-normal">
                          (ant: {Number(instagramAnalytics.metrics.previousFollowersCount).toLocaleString('pt-BR')})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Taxa de Engajamento */}
                <div className="bg-white/90 rounded-[1.8rem] p-4 sm:p-5 border border-white/90 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Taxa de Engajamento
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                      <Activity size={15} />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-elegant text-3xl sm:text-4xl text-[var(--color-atelier-grafite)] font-bold">
                      {instagramAnalytics?.metrics?.avgEngagementRate || 4.2}%
                    </span>
                    <span className="text-[11px] text-gray-500 mt-1">
                      Média por publicação analisada
                    </span>
                  </div>
                </div>

                {/* 3. Total de Interações */}
                <div className="bg-white/90 rounded-[1.8rem] p-4 sm:p-5 border border-white/90 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Interações
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                      <Heart size={15} />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-elegant text-3xl sm:text-4xl text-[var(--color-atelier-grafite)] font-bold">
                      {(instagramAnalytics?.metrics?.totalInteractions || 384).toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[11px] text-gray-500 mt-1 truncate">
                      {instagramAnalytics?.metrics?.totalLikes || 312} curtidas • {instagramAnalytics?.metrics?.totalComments || 72} comentários
                    </span>
                  </div>
                </div>

                {/* 4. Publicações no Perfil */}
                <div className="bg-white/90 rounded-[1.8rem] p-4 sm:p-5 border border-white/90 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Publicações Ativas
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center">
                      <Layers size={15} />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-elegant text-3xl sm:text-4xl text-[var(--color-atelier-grafite)] font-bold">
                      {instagramAnalytics?.metrics?.postsCount || 9}
                    </span>
                    <span className="text-[11px] text-gray-500 mt-1">
                      Posts auditados no acervo
                    </span>
                  </div>
                </div>

              </div>

              {/* Conteúdos e Feed Extraídos pela Apify */}
              {instagramAnalytics?.posts && instagramAnalytics.posts.length > 0 && (
                <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Últimos Conteúdos Capturados da Conta
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      Números de engajamento por postagem
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {instagramAnalytics.posts.slice(0, 6).map((p: any, idx: number) => (
                      <div 
                        key={idx}
                        className="group relative rounded-2xl overflow-hidden bg-gray-100 aspect-square border border-gray-100 shadow-2xs hover:shadow-md transition-all cursor-pointer"
                        onClick={() => {
                          if (p.post_id_external) {
                            window.open(`https://instagram.com/p/${p.post_id_external}`, '_blank');
                          }
                        }}
                      >
                        <img 
                          src={normalizeImageUrl(p.image_url, `Post ${idx + 1}`)} 
                          alt="Post Instagram" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white p-2 text-center">
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <span className="flex items-center gap-1"><Heart size={12} fill="white" /> {p.likes_count || 0}</span>
                            <span className="flex items-center gap-1"><MessageCircle size={12} fill="white" /> {p.comments_count || 0}</span>
                          </div>
                          <span className="text-[9px] text-white/80 line-clamp-2 mt-0.5">{p.caption}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* AÇÕES: LISTA VERTICAL (LADO A LADO) OU BARRA HORIZONTAL (BARRA ABAIXO) */}
          <div className={layoutMode === 'side'
            ? "lg:col-span-4 flex flex-col gap-3.5 sm:gap-4 animate-[fadeInUp_0.5s_ease-out]"
            : "glass-panel bg-white/70 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-3 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3 animate-[fadeInUp_0.4s_ease-out]"
          }>
            
            {/* 1. DIRECIONAMENTO ESTRATÉGICO */}
            <div 
              onClick={() => setIsPulseModalOpen(true)}
              className="group relative bg-white/90 hover:bg-white rounded-[2rem] p-4.5 sm:p-5 border border-white/90 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_rgba(20, 44, 72,0.09)] transition-all duration-300 flex flex-col justify-between gap-3.5 cursor-pointer overflow-hidden min-w-0"
            >
              {/* Sombra de fundo suave */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-atelier-terracota)]/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

              {/* Cabeçalho do Card */}
              <div className="flex items-start justify-between gap-2 relative z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${
                    presencaData?.cycle?.pulse_answered_at 
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                      : 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20'
                  }`}>
                    {presencaData?.cycle?.pulse_answered_at ? (
                      <CheckCircle2 size={19} className="text-emerald-600" />
                    ) : (
                      <Compass size={20} className="text-[var(--color-atelier-terracota)] animate-[spin_12s_linear_infinite]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className={`inline-flex items-center gap-1 font-roboto text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      presencaData?.cycle?.pulse_answered_at
                        ? 'bg-emerald-100/90 text-emerald-800'
                        : 'bg-[var(--color-atelier-terracota)]/15 text-[var(--color-atelier-terracota)]'
                    }`}>
                      {presencaData?.cycle?.pulse_answered_at ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Diretrizes Ativas
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-atelier-terracota)] animate-pulse" />
                          Ação Necessária
                        </>
                      )}
                    </span>
                    <h3 className="font-roboto font-bold text-xs sm:text-[13px] text-[var(--color-atelier-grafite)] mt-0.5 truncate group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                      {presencaData?.cycle?.pulse_answered_at ? 'Direcionamento Estratégico' : 'Alinhar Direcionamento'}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {presencaData?.cycle?.pulse_answered_at && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadDirecionamentoPDF();
                      }}
                      disabled={isDownloadingDirecionamentoPDF}
                      className="p-1.5 rounded-xl bg-gray-100 hover:bg-[var(--color-atelier-terracota)]/10 text-gray-600 hover:text-[var(--color-atelier-terracota)] transition-all cursor-pointer"
                      title="Baixar PDF do Direcionamento"
                    >
                      {isDownloadingDirecionamentoPDF ? <Loader2 size={13} className="animate-spin text-[var(--color-atelier-terracota)]" /> : <Download size={13} />}
                    </button>
                  )}
                  <button 
                    type="button"
                    className={`px-3 py-1.5 rounded-xl font-roboto text-[9px] font-bold uppercase tracking-wider shrink-0 transition-all ${
                      presencaData?.cycle?.pulse_answered_at
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        : 'bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white shadow-xs'
                    }`}
                  >
                    {presencaData?.cycle?.pulse_answered_at ? 'Ver Respostas' : 'Responder'}
                  </button>
                </div>
              </div>

              {/* Conteúdo Informativo */}
              <div className="relative z-10 flex flex-col gap-2 pt-2 border-t border-gray-100/80">
                <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">
                  {presencaData?.cycle?.pulse_answered_at
                    ? (presencaData?.cycle?.objective || "Direcionamento consolidado para guiar a criação do cronograma e tom de voz.")
                    : "Responda às 5 perguntas essenciais para calibrar suas metas, lançamentos do mês e tom de voz antes da formulação dos conteúdos."}
                </p>

                {/* Micro-indicadores Úteis */}
                <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Target size={11} className="text-[var(--color-atelier-terracota)]" />
                    {presencaData?.cycle?.pulse_answered_at ? "Alinhado com a direção de arte" : "Tempo estimado: ~3 min"}
                  </span>
                  <span className="text-[var(--color-atelier-terracota)] font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    {presencaData?.cycle?.pulse_answered_at ? "Revisar" : "Iniciar"} →
                  </span>
                </div>
              </div>
            </div>

            {/* 2. CICLO ATUAL & GOVERNANÇA */}
            <div 
              onClick={() => setIsCycleModalOpen(true)}
              className="group relative bg-white/90 hover:bg-white rounded-[2rem] p-4.5 sm:p-5 border border-white/90 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_rgba(40,30,25,0.08)] transition-all duration-300 flex flex-col justify-between gap-3.5 cursor-pointer overflow-hidden min-w-0"
            >
              <div className="flex items-start justify-between gap-2 relative z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)] border border-gray-200/60 flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105">
                    <Layers size={19} className="text-[var(--color-atelier-grafite)]/70" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-roboto text-[8px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        Ciclo #{presencaData?.cycle?.cycle_number || 1}
                      </span>
                      {cycleGovernance.daysRemaining !== null && (
                        <span className="font-roboto text-[8px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/50 px-2 py-0.5 rounded-full">
                          {cycleGovernance.daysRemaining} dias restantes
                        </span>
                      )}
                    </div>
                    <h3 className="font-roboto font-bold text-xs sm:text-[13px] text-[var(--color-atelier-grafite)] mt-0.5 truncate group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                      Governança do Ciclo
                    </h3>
                  </div>
                </div>

                <button 
                  type="button"
                  className="px-3 py-1.5 rounded-xl font-roboto text-[9px] font-bold uppercase tracking-wider bg-white border border-gray-200 hover:border-gray-300 text-[var(--color-atelier-grafite)] shadow-2xs shrink-0 flex items-center gap-1"
                >
                  <span>Estratégia</span>
                  <ChevronRight size={11} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Conteúdo Rico Central: Barra Temporal e Pilares */}
              <div className="relative z-10 flex flex-col gap-2 pt-2 border-t border-gray-100/80">
                {/* Linha do Tempo do Período */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
                    <span>
                      {presencaData?.cycle?.period_start 
                        ? new Date(presencaData.cycle.period_start).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) 
                        : 'Início'}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-atelier-terracota)]">
                      Progresso: {cycleGovernance.progressPercent}%
                    </span>
                    <span>
                      {presencaData?.cycle?.period_end 
                        ? new Date(presencaData.cycle.period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) 
                        : 'Término'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[var(--color-atelier-terracota)] to-[#234E80] rounded-full transition-all duration-500" 
                      style={{ width: `${cycleGovernance.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Mini Pilares Estratégicos */}
                <div className="grid grid-cols-4 gap-1 pt-1 text-center">
                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg py-1 px-1">
                    <span className="block text-[8px] font-bold uppercase text-emerald-800">Desc.</span>
                    <span className="text-[9px] font-bold text-emerald-600">{presencaData?.cycle?.pillars?.descoberta || 25}%</span>
                  </div>
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg py-1 px-1">
                    <span className="block text-[8px] font-bold uppercase text-indigo-800">Auto.</span>
                    <span className="text-[9px] font-bold text-indigo-600">{presencaData?.cycle?.pillars?.autoridade || 25}%</span>
                  </div>
                  <div className="bg-amber-50/70 border border-amber-100 rounded-lg py-1 px-1">
                    <span className="block text-[8px] font-bold uppercase text-amber-800">Rela.</span>
                    <span className="text-[9px] font-bold text-amber-600">{presencaData?.cycle?.pillars?.relacionamento || 25}%</span>
                  </div>
                  <div className="bg-rose-50/70 border border-rose-100 rounded-lg py-1 px-1">
                    <span className="block text-[8px] font-bold uppercase text-rose-800">Conv.</span>
                    <span className="text-[9px] font-bold text-rose-600">{presencaData?.cycle?.pillars?.conversao || 25}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. COFRE DE ATIVOS */}
            <div 
              onClick={() => setIsMissionsModalOpen(true)}
              className="group relative bg-white/90 hover:bg-white rounded-[2rem] p-4.5 sm:p-5 border border-white/90 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_36px_rgba(40,30,25,0.08)] transition-all duration-300 flex flex-col justify-between gap-3.5 cursor-pointer overflow-hidden min-w-0"
            >
              <div className="flex items-start justify-between gap-2 relative z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${
                    pendingMissions > 0 
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' 
                      : 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20'
                  }`}>
                    <Camera size={19} className={pendingMissions > 0 ? 'text-amber-600' : 'text-[var(--color-atelier-terracota)]'} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-roboto text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        pendingMissions > 0
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : 'bg-emerald-100/90 text-emerald-800'
                      }`}>
                        {pendingMissions > 0 ? `${pendingMissions} Pendente${pendingMissions > 1 ? 's' : ''}` : 'Acervo em Dia'}
                      </span>
                    </div>
                    <h3 className="font-roboto font-bold text-xs sm:text-[13px] text-[var(--color-atelier-grafite)] mt-0.5 truncate group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                      Cofre de Ativos & Mídia
                    </h3>
                  </div>
                </div>

                <button 
                  type="button"
                  className="px-3 py-1.5 rounded-xl font-roboto text-[9px] font-bold uppercase tracking-wider bg-[var(--color-atelier-grafite)] hover:bg-black text-white shadow-2xs shrink-0 flex items-center gap-1"
                >
                  <span>Acessar</span>
                  <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Conteúdo Informativo */}
              <div className="relative z-10 flex flex-col gap-2 pt-2 border-t border-gray-100/80">
                <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">
                  {pendingMissions > 0
                    ? "Envie as fotos e gravações solicitadas pela direção de arte para viabilizar as postagens deste ciclo."
                    : "Armazenamento seguro de fotos em alta resolução, vídeos brutos para Reels e identidade da sua marca."}
                </p>

                {/* Micro-indicadores Úteis */}
                <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={12} className="text-emerald-600" />
                    Cloud Privado Studio Veronna
                  </span>
                  <span className="text-[var(--color-atelier-terracota)] font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Upload Mídia →
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* 🟢 WIDGET: CRONOGRAMA EDITORIAL DO CICLO (DESIGN EDITORIAL LUXO, COLUNAS POR DIA E NAVEGAÇÃO LATERAL) */}
        <div className="w-full flex flex-col gap-4 animate-[fadeInUp_0.6s_ease-out]">
          {/* Cabeçalho Editorial com Mês Gigante e Metadados do Ciclo */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-3 border-b border-[var(--color-atelier-grafite)]/10">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-[var(--color-atelier-terracota)] animate-pulse" />
                <span className="font-roboto text-[9.5px] font-bold uppercase tracking-[0.2em] text-[var(--color-atelier-terracota)]">
                  Cronograma Editorial do Ciclo
                </span>
                {cycleMonthInfo.cycleNumber && (
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)] border border-gray-200/80">
                    Ciclo #{cycleMonthInfo.cycleNumber}
                  </span>
                )}
                {cycleMonthInfo.periodLabel && (
                  <span className="text-[10px] text-gray-400 font-medium font-roboto flex items-center gap-1">
                    <Calendar size={11} className="text-gray-400" />
                    {cycleMonthInfo.periodLabel}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-4 flex-wrap">
                <h2 className="font-elegant text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[var(--color-atelier-grafite)] font-bold tracking-tight capitalize leading-none drop-shadow-2xs">
                  {cycleMonthInfo.monthName}
                </h2>
              </div>
            </div>

            {/* Controles de Navegação Horizontal e Resumo */}
            <div className="flex items-center gap-3 shrink-0 self-start lg:self-end">
              {/* Métricas Rápidas do Cronograma */}
              <div className="hidden sm:flex items-center gap-2 bg-white/70 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-gray-100 shadow-2xs text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <span>{monthTasks.length} {monthTasks.length === 1 ? 'conteúdo' : 'conteúdos'}</span>
                {monthTasks.filter(t => t.status === 'pending_client_approval' || t.status === 'review').length > 0 && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-orange-600 font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                      {monthTasks.filter(t => t.status === 'pending_client_approval' || t.status === 'review').length} pendente(s)
                    </span>
                  </>
                )}
              </div>

              {/* Botões de Scroll Horizontal (setas) */}
              <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md p-1 rounded-2xl border border-gray-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    if (demandsContainerRef.current) {
                      demandsContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
                    }
                  }}
                  className="w-8 h-8 rounded-xl bg-transparent hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-[var(--color-atelier-terracota)] transition-colors cursor-pointer"
                  title="Rolar para a esquerda"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (demandsContainerRef.current) {
                      demandsContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
                    }
                  }}
                  className="w-8 h-8 rounded-xl bg-transparent hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-[var(--color-atelier-terracota)] transition-colors cursor-pointer"
                  title="Rolar para a direita"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Alerta de Workflow Estratégico (Diretrizes prévias à produção dos conteúdos) */}
          {!areFoundationalApproved && pendingFoundationalDemands.length > 0 && (
            <div className="mb-4 mx-1 p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300/60 flex items-center justify-center shrink-0 text-amber-800">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="font-roboto text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-2">
                    <span>Etapa Estratégica: Validação de Diretrizes</span>
                  </h4>
                  <p className="font-roboto text-xs text-amber-900/80 mt-0.5">
                    A aprovação prévia das diretrizes estruturais ({pendingFoundationalDemands.map(t => classifyDemand(t).typeLabel).join(', ')}) garante o alinhamento da marca antes da publicação dos posts.
                  </p>
                </div>
              </div>
              <span className="font-roboto text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl bg-amber-200/70 border border-amber-300 text-amber-950 shrink-0 self-start sm:self-center">
                {pendingFoundationalDemands.length} {pendingFoundationalDemands.length === 1 ? 'diretriz pendente' : 'diretrizes pendentes'}
              </span>
            </div>
          )}

          {/* Container Horizontal com Scroll */}
          <div 
            ref={demandsContainerRef}
            className="w-full flex gap-4 overflow-x-auto custom-scrollbar pb-6 px-1 pt-1 h-auto items-start select-none"
            style={{ touchAction: 'pan-x' }}
          >
            {tasksByDay.length > 0 ? (
              tasksByDay.map((dayGroup) => (
                <div 
                  key={dayGroup.dateStr} 
                  className="min-w-[290px] w-[290px] sm:min-w-[320px] sm:w-[320px] shrink-0 bg-white/45 backdrop-blur-xl rounded-[2.2rem] p-3 border border-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col gap-3 transition-colors hover:bg-white/60"
                >
                  {/* Header da Coluna do Dia */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-white/90 backdrop-blur-md rounded-2xl border border-gray-100/90 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <span className="font-elegant text-2xl sm:text-3xl font-bold text-[var(--color-atelier-terracota)] leading-none">
                        {String(dayGroup.date.getDate()).padStart(2, '0')}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-roboto text-xs font-bold text-[var(--color-atelier-grafite)] capitalize leading-tight">
                          {dayGroup.date.toLocaleDateString('pt-BR', { weekday: 'long' })}
                        </span>
                        <span className="font-roboto text-[9.5px] font-semibold text-gray-400 uppercase tracking-widest leading-none mt-0.5">
                          {dayGroup.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                        </span>
                      </div>
                    </div>
                    <span className="font-roboto text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100/80 border border-gray-200/50 px-2.5 py-1 rounded-xl">
                      {dayGroup.tasks.length} {dayGroup.tasks.length === 1 ? 'demanda' : 'demandas'}
                    </span>
                  </div>

                  {/* Lista Vertical de Demandas do Dia com Scroll Vertical Livre */}
                  <div className="column-cards-scroll flex flex-col gap-3 max-h-[580px] overflow-y-auto custom-scrollbar pr-1 overscroll-y-contain">
                    {dayGroup.tasks.map((task) => {
                      const post = allPosts.find(p => p.task_id === task.id);
                      const meta = classifyDemand(task);
                      const clientDate = getClientTaskDate(task, post);
                      const taskCoverUrl = Array.isArray(task.media_assets) ? task.media_assets[0]?.url : null;
                      const coverUrl = normalizeImageUrl(post?.media_assets?.[0]?.url || post?.image_url || task.attachment_url || taskCoverUrl);
                      const isVideo = isVideoUrl(coverUrl) || task.task_type === 'video' || /reels|video/i.test(task.title);

                      // Seleção do ícone específico por tipo de demanda
                      let FormatIcon = ImageIcon;
                      if (meta.iconType === 'briefing') FormatIcon = Users;
                      else if (meta.iconType === 'brand') FormatIcon = Target;
                      else if (meta.iconType === 'visual') FormatIcon = Palette;
                      else if (meta.iconType === 'calendar') FormatIcon = CalendarDays;
                      else if (meta.iconType === 'script') FormatIcon = FileText;
                      else if (meta.iconType === 'reels') FormatIcon = Video;
                      else if (meta.iconType === 'carousel') FormatIcon = Layers;
                      else if (meta.iconType === 'story') FormatIcon = Camera;

                      // Lógica de Bloqueio Release Day
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

                      let badgeColor = 'bg-gray-100 text-gray-500 border-gray-200';
                      let badgeText = 'Na Fila';
                      let StatusIcon = Target;
                      let borderColor = 'border-gray-100 hover:border-gray-200';
                      let actionText = meta.actionText;
                      let isPendingApproval = false;

                      if (isLocked) {
                        badgeColor = 'bg-gray-100 text-gray-500 border-gray-200';
                        badgeText = `Liberação em ${daysUntilRelease}d`;
                        StatusIcon = Clock;
                        actionText = 'Aguardando';
                      } else if (task.status === 'review' || post?.status === 'needs_revision') {
                        isPendingApproval = true;
                        badgeColor = 'bg-red-50 text-red-700 border-red-200';
                        badgeText = 'Revisão Solicitada';
                        StatusIcon = RotateCcw;
                        borderColor = 'border-red-300 ring-2 ring-red-100 bg-red-50/20';
                        actionText = 'Ver Ajuste';
                      } else if (task.status === 'completed' || post?.status === 'approved') {
                        badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        badgeText = meta.isDocumentDeliverable ? 'Documento Validado' : meta.isFoundational ? 'Diretriz Validada' : 'Aprovado para Post';
                        StatusIcon = CheckCircle2;
                        borderColor = 'border-emerald-200 hover:border-emerald-300 bg-white/95';
                        actionText = meta.isDocumentDeliverable ? 'Ver PDF' : 'Ver Detalhes';
                      } else if (meta.category === 'briefing') {
                        badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                        badgeText = 'Marco Estratégico';
                        StatusIcon = CheckSquare;
                        borderColor = 'border-emerald-200/70 hover:border-emerald-400 bg-white/95';
                        actionText = 'Ver Pauta';
                      } else if (meta.isDocumentDeliverable) {
                        if (task.status === 'pending_client_approval') {
                          isPendingApproval = true;
                          badgeColor = 'bg-amber-500 text-white shadow-xs';
                          badgeText = 'PDF Pronto p/ Avaliação';
                          StatusIcon = AlertCircle;
                          borderColor = 'border-amber-400 ring-2 ring-amber-200/50 shadow-md bg-white';
                          actionText = 'Avaliar PDF';
                        } else {
                          badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                          badgeText = 'Curadoria no Focus';
                          StatusIcon = Clock;
                          borderColor = 'border-gray-200 bg-white/95';
                          actionText = 'Em Elaboração';
                        }
                      } else if (meta.requiresClientApproval && (task.status === 'pending_client_approval' || task.status === 'pending' || task.status === 'draft')) {
                        isPendingApproval = true;
                        badgeColor = 'bg-[var(--color-atelier-terracota)] text-white shadow-2xs';
                        badgeText = meta.isFoundational ? 'Validação Necessária' : 'Aprovação Necessária';
                        StatusIcon = AlertCircle;
                        borderColor = 'border-[var(--color-atelier-terracota)]/70 ring-2 ring-[var(--color-atelier-terracota)]/20 shadow-md bg-white';
                        actionText = meta.actionText;
                      } else if (!areFoundationalApproved && !meta.isFoundational) {
                        badgeColor = 'bg-amber-50/80 text-amber-800 border-amber-200/80';
                        badgeText = 'Aguardando Diretrizes';
                        StatusIcon = ShieldCheck;
                        borderColor = 'border-amber-100 hover:border-amber-200 bg-white/95';
                        actionText = 'Em Preparação';
                      } else if (task.status === 'in_progress') {
                        badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                        badgeText = 'Em Criação';
                        StatusIcon = PlayCircle;
                        borderColor = 'border-blue-200 hover:border-blue-300 bg-white/95';
                        actionText = 'Em Produção';
                      }

                      return (
                        <div
                          key={task.id}
                          onClick={() => {
                            if (isLocked) {
                              showToast(`Esta demanda será liberada para avaliação em ${daysUntilRelease} dia${daysUntilRelease > 1 ? 's' : ''}.`);
                              return;
                            }
                            const absIdx = monthTasks.findIndex(t => t.id === task.id);
                            if (absIdx !== -1) setActiveTaskIndex(absIdx);
                            setTaskDetailOpen(true);
                          }}
                          className={`relative bg-white/95 hover:bg-white rounded-[1.8rem] p-4 border ${borderColor} shadow-2xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group flex flex-col gap-3 ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {/* Linha Superior: Formato e Status */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border ${meta.badgeStyle.bg} ${meta.badgeStyle.text} ${meta.badgeStyle.border}`}>
                              <FormatIcon size={11} /> {meta.typeLabel}
                            </span>
                            <div className={`px-2.5 py-0.5 rounded-lg text-[8.5px] font-bold uppercase tracking-wider flex items-center gap-1 border ${badgeColor}`}>
                              <StatusIcon size={11} className={isPendingApproval ? "animate-pulse" : ""} /> {badgeText}
                            </div>
                          </div>

                          {/* Mídia / Prévia Visual da Demanda */}
                          {coverUrl ? (
                            <div className="w-full h-36 rounded-2xl overflow-hidden relative bg-gray-100 border border-gray-100 shadow-2xs group-hover:shadow-sm">
                              {isVideo ? (
                                <video src={coverUrl} className="w-full h-full object-cover" />
                              ) : (
                                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent flex items-end justify-between p-2.5">
                                {isVideo ? (
                                  <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-[var(--color-atelier-terracota)] flex items-center justify-center shadow-sm">
                                    <PlayCircle size={17} />
                                  </div>
                                ) : <div />}
                                {post?.media_assets && post.media_assets.length > 1 && (
                                  <span className="bg-black/60 backdrop-blur-md text-white font-roboto text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Layers size={10} /> 1/{post.media_assets.length}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            meta.category === 'briefing' ? (
                              <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-emerald-50/90 to-teal-100/50 border border-emerald-200/60 flex flex-col items-center justify-center gap-1 text-emerald-800 shadow-2xs">
                                <Users size={24} className="opacity-80" />
                                <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-emerald-900/70">
                                  Reunião de Alinhamento
                                </span>
                              </div>
                            ) : meta.category === 'estudo_marca' ? (
                              <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-amber-50/90 to-orange-100/50 border border-amber-200/60 flex flex-col items-center justify-center gap-1 text-amber-800 shadow-2xs">
                                <Target size={24} className="opacity-80" />
                                <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-amber-900/70">
                                  Diretriz de Marca & Persona
                                </span>
                              </div>
                            ) : meta.category === 'alinhamento_visual' ? (
                              <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-indigo-50/90 to-purple-100/50 border border-indigo-200/60 flex flex-col items-center justify-center gap-1 text-indigo-800 shadow-2xs">
                                <Palette size={24} className="opacity-80" />
                                <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-indigo-900/70">
                                  Estilo & Grade do Feed
                                </span>
                              </div>
                            ) : meta.category === 'calendario_editorial' ? (
                              <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-blue-50/90 to-sky-100/50 border border-blue-200/60 flex flex-col items-center justify-center gap-1 text-blue-800 shadow-2xs">
                                <CalendarDays size={24} className="opacity-80" />
                                <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-blue-900/70">
                                  Planejamento Editorial
                                </span>
                              </div>
                            ) : (
                              <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-[#faf7f2] to-[#f0e8dc] border border-[#e8ded0]/60 flex flex-col items-center justify-center gap-1 text-[var(--color-atelier-terracota)]/60 shadow-2xs">
                                <FormatIcon size={24} className="opacity-60" />
                                <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-gray-500">
                                  Studio Veronna • Em Criação
                                </span>
                              </div>
                            )
                          )}

                          {/* Título e Subtítulo */}
                          <div className="flex flex-col min-w-0">
                            <h4 className="font-elegant text-base font-bold text-[var(--color-atelier-grafite)] leading-snug line-clamp-2 group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                              {task.title}
                            </h4>
                            <span className="font-roboto text-[10px] text-gray-400 font-medium mt-0.5">
                              {meta.stageSubtitle}
                            </span>
                            {(post?.caption || task.description) && (
                              <p className="font-roboto text-[11px] text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                                {post?.caption || task.description}
                              </p>
                            )}
                          </div>

                          {/* 🟢 Exibição Exclusiva do Prazo do Cliente (NUNCA prazo da equipe) */}
                          <div className="flex items-center justify-between text-[11px] p-2.5 rounded-2xl bg-gray-50/90 border border-gray-100/90">
                            <span className="font-roboto font-semibold text-gray-500 flex items-center gap-1.5">
                              <Calendar size={13} className="text-[var(--color-atelier-terracota)]" />
                              <span>{meta.dateLabel}</span>
                            </span>
                            <span className="font-roboto font-bold text-[var(--color-atelier-grafite)]">
                              {clientDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          </div>

                          {/* Rodapé da Demanda com Micro-interação de Ação */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-gray-100/90 text-[10px]">
                            <span className={`font-semibold ${isPendingApproval ? 'text-[var(--color-atelier-terracota)]' : 'text-gray-400'}`}>
                              {isPendingApproval ? 'Sua decisão é prioritária' : 'Detalhes da demanda'}
                            </span>
                            <span className={`px-2.5 py-1 rounded-xl font-roboto text-[9.5px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                              isPendingApproval 
                                ? 'bg-[var(--color-atelier-terracota)] text-white shadow-2xs group-hover:bg-[#234E80]'
                                : 'bg-gray-100 group-hover:bg-[var(--color-atelier-grafite)] group-hover:text-white text-gray-600'
                            }`}>
                              <span>{actionText}</span>
                              <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>
              ))
            ) : (
              <div className="w-full bg-white/70 backdrop-blur-md rounded-[2.5rem] p-10 sm:p-14 text-center border border-white/80 shadow-sm flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shadow-inner">
                  <CalendarDays size={26} />
                </div>
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                  Cronograma de {cycleMonthInfo.monthName} em Estruturação
                </h3>
                <p className="font-roboto text-xs sm:text-sm text-gray-500 max-w-md leading-relaxed">
                  As peças de conteúdo deste ciclo estão sendo preparadas pela equipe do Studio Veronna e ficarão disponíveis aqui para sua aprovação assim que finalizadas.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 🟢 ESTÚDIO DE APROVAÇÃO (SE HOUVER PEÇAS OU PLANEJAMENTO PENDENTES) */}
        {(allPosts.length > 0 || monthlyPlan.length > 0) && (
          <div className="w-full glass-panel bg-white/70 rounded-[3rem] border border-white shadow-sm flex flex-col overflow-hidden relative min-h-[650px] transition-colors hover:bg-white/85 animate-[fadeInUp_0.5s_ease-out]">
            {allPosts.length > 0 ? (
              <div className="flex flex-col h-full absolute inset-0">
                {/* Header do Studio Veronna */}
                <div className="flex justify-between items-center px-8 py-5 border-b border-[var(--color-atelier-grafite)]/10 bg-white/40 shrink-0">
                   <div className="flex items-center gap-3">
                     <LayoutDashboard size={20} className="text-[var(--color-atelier-terracota)]"/>
                     <div>
                       <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">Studio Veronna de Aprovação</h2>
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
            ) : null}
          </div>
        )}

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
          {taskDetailOpen && monthTasks[activeTaskIndex] && (() => {
            const modalTask = monthTasks[activeTaskIndex];
            const modalPost = allPosts.find(p => p.task_id === modalTask?.id);
            const modalMeta = classifyDemand(modalTask);
            const modalClientDate = getClientTaskDate(modalTask, modalPost);
            const modalTaskFileUrl = modalTask?.attachment_url || 
              (Array.isArray(modalTask?.media_assets) && modalTask?.media_assets.find((a: any) => a?.url)?.url) ||
              (Array.isArray(modalTask?.media_assets) && typeof modalTask?.media_assets[0] === 'string' ? modalTask.media_assets[0] : null) ||
              modalPost?.media_assets?.[0]?.url ||
              modalPost?.image_url ||
              modalTask?.planning_file_url ||
              modalTask?.file_url;
            const isModalPdf = Boolean(
              modalTaskFileUrl && (
                modalTaskFileUrl.toLowerCase().includes('.pdf') ||
                modalTask?.media_assets?.some((a: any) => a?.type === 'pdf') ||
                modalMeta.isDocumentDeliverable
              )
            );
            const isModalVideo = Boolean(
              modalTaskFileUrl && (
                isVideoUrl(modalTaskFileUrl) ||
                modalTask?.task_type === 'video' ||
                modalTask?.media_assets?.some((a: any) => a?.type === 'video')
              )
            );
            const isCompleted = modalTask.status === 'completed' || modalPost?.status === 'approved';
            const isReviewRequested = modalTask.status === 'review' || modalPost?.status === 'needs_revision';
            const isPendingAction = !isCompleted && !isReviewRequested;

            // Opções customizadas de revisão conforme a tipagem da demanda
            let revisionOptions = ADJUST_TYPES;
            if (modalMeta.category === 'estudo_marca') {
              revisionOptions = [
                { id: 'posicionamento', label: 'Posicionamento' },
                { id: 'tom_de_voz', label: 'Tom de Voz' },
                { id: 'persona', label: 'Perfil da Persona' },
                { id: 'outro', label: 'Outro' },
              ] as any;
            } else if (modalMeta.category === 'alinhamento_visual') {
              revisionOptions = [
                { id: 'paleta_cores', label: 'Paleta de Cores' },
                { id: 'estilo_feed', label: 'Estilo do Feed / Grade' },
                { id: 'tipografia', label: 'Tipografia / Fontes' },
                { id: 'outro', label: 'Outro' },
              ] as any;
            } else if (modalMeta.category === 'calendario_editorial') {
              revisionOptions = [
                { id: 'temas', label: 'Temas de Conteúdo' },
                { id: 'datas', label: 'Datas / Frequência' },
                { id: 'formatos', label: 'Formatos (Reels/Carrossel)' },
                { id: 'outro', label: 'Outro' },
              ] as any;
            } else if (modalMeta.category === 'roteiro') {
              revisionOptions = [
                { id: 'gancho', label: 'Gancho / Introdução' },
                { id: 'narrativa', label: 'Conteúdo / Narrativa' },
                { id: 'cta', label: 'Chamada para Ação (CTA)' },
                { id: 'tom_de_voz', label: 'Tom de Voz' },
                { id: 'outro', label: 'Outro' },
              ] as any;
            }

            const taskThread = (() => {
              try {
                if (!modalTask.admin_feedback) return [];
                const parsed = typeof modalTask.admin_feedback === 'string' ? JSON.parse(modalTask.admin_feedback) : modalTask.admin_feedback;
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })();

            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-atelier-grafite)]/80 backdrop-blur-sm p-4 md:p-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-white/20"
                >
                  {/* Cabeçalho do Modal com Categoria e Título */}
                  <div className="flex justify-between items-center p-6 md:p-8 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${modalMeta.badgeStyle.bg} ${modalMeta.badgeStyle.text} ${modalMeta.badgeStyle.border}`}>
                          {modalMeta.typeLabel}
                        </span>
                        <span className="font-roboto text-[10.5px] font-medium text-gray-400">
                          {modalMeta.stageSubtitle}
                        </span>
                      </div>
                      <h2 className="font-elegant text-2xl md:text-3xl text-[var(--color-atelier-grafite)] leading-tight">
                        {modalTask?.title}
                      </h2>
                    </div>
                    <button onClick={() => setTaskDetailOpen(false)} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[var(--color-atelier-terracota)] transition-colors shadow-sm cursor-pointer">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
                    {/* CONTEÚDO (Visualizador Dinâmico por Tipo de Demanda) */}
                    <div className="w-full lg:w-3/5 bg-gray-100 relative flex flex-col p-6 overflow-y-auto custom-scrollbar">
                      {modalTaskFileUrl ? (
                        isModalPdf ? (
                          <div className="w-full h-full flex flex-col gap-3 min-h-[550px]">
                            <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-gray-200/80 shadow-2xs">
                              <div className="flex items-center gap-2">
                                <FileText size={18} className="text-[var(--color-atelier-terracota)]" />
                                <span className="font-roboto text-xs font-bold text-[var(--color-atelier-grafite)]">
                                  Documento Oficial • Studio Veronna
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                                  {isCompleted ? 'Aprovado' : 'Aprovado p/ Gestão'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={modalTaskFileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:text-[var(--color-atelier-terracota)] flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 transition-colors"
                                >
                                  <ExternalLink size={12} /> Abrir em Nova Aba
                                </a>
                                <a
                                  href={modalTaskFileUrl}
                                  download
                                  className="text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:text-[var(--color-atelier-terracota)] flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 transition-colors"
                                >
                                  <Download size={12} /> Baixar PDF
                                </a>
                              </div>
                            </div>
                            <iframe 
                              src={modalTaskFileUrl} 
                              className="w-full flex-1 rounded-2xl shadow-sm border border-gray-200 bg-white min-h-[480px]" 
                            />
                          </div>
                        ) : isModalVideo ? (
                          <div className="relative w-full h-[60vh] lg:h-full rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-black flex items-center justify-center">
                            <video src={modalTaskFileUrl} controls className="max-w-full max-h-full object-contain" />
                          </div>
                        ) : (
                          <div className="relative w-full h-[60vh] lg:h-full rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white flex items-center justify-center">
                            <img src={modalTaskFileUrl} alt="Anexo" className="max-w-full max-h-full object-contain" />
                          </div>
                        )
                      ) : modalMeta.category === 'briefing' ? (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 rounded-2xl border border-emerald-100 p-6 sm:p-8 flex flex-col justify-between shadow-sm">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-inner">
                                <Users size={24} />
                              </div>
                              <div>
                                <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-emerald-800">
                                  Marco Estratégico do Ciclo
                                </span>
                                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                                  Reunião de Briefing & Alinhamento
                                </h3>
                              </div>
                            </div>
                            <p className="font-roboto text-xs text-gray-600 leading-relaxed">
                              Reunião de imersão dedicada ao alinhamento dos objetivos comerciais do ciclo, metas de posicionamento, tom de comunicação e definição dos temas prioritários.
                            </p>
                            
                            <div className="p-4 rounded-xl bg-white/80 border border-emerald-100 shadow-2xs flex flex-col gap-2.5">
                              <span className="font-roboto text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                Pauta do Alinhamento Estratégico:
                              </span>
                              <ul className="text-xs text-gray-700 space-y-2">
                                <li className="flex items-center gap-2">
                                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                  <span>1. Objetivos do ciclo e metas prioritárias do negócio</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                  <span>2. Mapeamento de persona, dores e proposta de valor</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                  <span>3. Tom de voz institucional e atributos de autoridade</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                  <span>4. Direcionamento visual do feed para o ciclo</span>
                                </li>
                              </ul>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/60 flex items-center justify-between text-xs text-emerald-900 mt-4">
                            <span className="font-medium">Data Agendada:</span>
                            <span className="font-bold text-sm">{modalClientDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          </div>
                        </div>
                      ) : modalMeta.category === 'estudo_marca' ? (
                        <div className="w-full h-full bg-gradient-to-br from-amber-50/70 via-white to-orange-50/30 rounded-2xl border border-amber-100 p-6 sm:p-8 flex flex-col justify-between shadow-sm">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-inner">
                                <Target size={24} />
                              </div>
                              <div>
                                <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-amber-800">
                                  Diretriz Estratégica Fundacional
                                </span>
                                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                                  Estudo de Marca, Persona & Tom de Voz
                                </h3>
                              </div>
                            </div>
                            <p className="font-roboto text-xs text-gray-600 leading-relaxed">
                              Este documento consolida a arquitetura da sua marca, persona-alvo e personalidade verbal. A sua aprovação desta diretriz é pré-requisito para formular os conteúdos do mês.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                              <div className="p-3.5 rounded-xl bg-white/90 border border-amber-100 shadow-2xs flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Persona & Audiência</span>
                                <p className="text-[11px] text-gray-600 leading-snug">Dores, aspirações, linguagem e gatilhos de conexão da persona qualificada.</p>
                              </div>
                              <div className="p-3.5 rounded-xl bg-white/90 border border-amber-100 shadow-2xs flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Tom de Voz Verbal</span>
                                <p className="text-[11px] text-gray-600 leading-snug">Personalidade institucional, vocabulário recomendado e autoridade de marca.</p>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs text-amber-950 mt-4">
                            <span className="font-medium">Prazo para Validação do Cliente:</span>
                            <span className="font-bold text-sm">{modalClientDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          </div>
                        </div>
                      ) : modalMeta.category === 'alinhamento_visual' ? (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/30 rounded-2xl border border-indigo-100 p-6 sm:p-8 flex flex-col justify-between shadow-sm">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center shadow-inner">
                                <Palette size={24} />
                              </div>
                              <div>
                                <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-indigo-800">
                                  Identidade Visual & Estética
                                </span>
                                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                                  Alinhamento Visual (Estilo do Feed)
                                </h3>
                              </div>
                            </div>
                            <p className="font-roboto text-xs text-gray-600 leading-relaxed">
                              Direcionamento estético que define o moodboard, a composição da grade 3x3 no Instagram, a paleta de cores institucional e o tratamento visual de cada post.
                            </p>

                            <div className="p-4 rounded-xl bg-white/90 border border-indigo-100 shadow-2xs flex flex-col gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Composição do Feed Studio Veronna:</span>
                              <p className="text-xs text-gray-600 leading-relaxed">
                                Alternância balanceada entre posts conceituais de autoridade, reels dinâmicos e carrosséis com design editorial refinado.
                              </p>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-between text-xs text-indigo-950 mt-4">
                            <span className="font-medium">Prazo para Validação do Cliente:</span>
                            <span className="font-bold text-sm">{modalClientDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          </div>
                        </div>
                      ) : modalMeta.category === 'calendario_editorial' ? (
                        <div className="w-full h-full bg-gradient-to-br from-blue-50/70 via-white to-sky-50/30 rounded-2xl border border-blue-100 p-6 sm:p-8 flex flex-col justify-between shadow-sm">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shadow-inner">
                                <CalendarDays size={24} />
                              </div>
                              <div>
                                <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-blue-800">
                                  Planejamento do Ciclo
                                </span>
                                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                                  Calendário Editorial de Conteúdos
                                </h3>
                              </div>
                            </div>
                            <p className="font-roboto text-xs text-gray-600 leading-relaxed">
                              Planejamento completo com todos os temas, formatos e objetivos de publicação do mês. A sua aprovação autoriza o início da produção artística das peças.
                            </p>

                            <div className="p-4 rounded-xl bg-white/90 border border-blue-100 shadow-2xs flex flex-col gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Distribuição Editorial:</span>
                              <p className="text-xs text-gray-600 leading-relaxed">
                                Cronograma balanceado nos 4 pilares estratégicos (Descoberta, Autoridade, Relacionamento e Conversão) para maximizar o crescimento e vendas.
                              </p>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-between text-xs text-blue-950 mt-4">
                            <span className="font-medium">Prazo para Validação do Cliente:</span>
                            <span className="font-bold text-sm">{modalClientDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          </div>
                        </div>
                      ) : modalMeta.category === 'roteiro' ? (
                        <div className="w-full h-full bg-gradient-to-br from-violet-50/70 via-white to-purple-50/30 rounded-2xl border border-violet-100 p-6 sm:p-8 flex flex-col justify-between shadow-sm">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-800 flex items-center justify-center shadow-inner">
                                <FileText size={24} />
                              </div>
                              <div>
                                <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-violet-800">
                                  Copywriting Estratégico do Ciclo
                                </span>
                                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                                  Roteirização de Conteúdos & Vídeos
                                </h3>
                              </div>
                            </div>
                            <p className="font-roboto text-xs text-gray-600 leading-relaxed">
                              Roteiros e narrativas persuasivas estruturados para os vídeos do ciclo, com ganchos de alta retenção nos primeiros 3 segundos, desenvolvimento envolvente e chamadas para ação (CTAs).
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                              <div className="p-3.5 rounded-xl bg-white/90 border border-violet-100 shadow-2xs flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-800">Ganchos de Retenção</span>
                                <p className="text-[11px] text-gray-600 leading-snug">Aberturas provocativas focadas em retenção imediata nos feeds e stories.</p>
                              </div>
                              <div className="p-3.5 rounded-xl bg-white/90 border border-violet-100 shadow-2xs flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-800">CTAs de Conversão</span>
                                <p className="text-[11px] text-gray-600 leading-snug">Chamadas estratégicas que direcionam comentários, directs e vendas.</p>
                              </div>
                            </div>

                            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
                              <Clock size={16} className="text-amber-700 shrink-0" />
                              <span>Documento em curadoria no Focus. Assim que a gestão aprovar, o PDF completo estará disponível aqui para sua avaliação.</span>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-violet-50 border border-violet-200/80 flex items-center justify-between text-xs text-violet-950 mt-4">
                            <span className="font-medium">Prazo para Validação do Cliente:</span>
                            <span className="font-bold text-sm">{modalClientDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-[40vh] lg:h-full bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-gray-400 p-8 text-center shadow-sm">
                          <FileText size={48} className="mb-4 opacity-20" />
                          <p className="font-roboto text-sm font-medium">Conteúdo em Produção</p>
                          <p className="text-xs mt-2 max-w-md">{modalTask?.description || "A equipe do Studio Veronna está finalizando as artes e legendas para sua aprovação."}</p>
                        </div>
                      )}
                    </div>

                    {/* INFO & AÇÕES */}
                    <div className="w-full lg:w-2/5 bg-white p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar border-l border-gray-100">
                      <div className="flex flex-col gap-6 flex-1">
                        {modalTask?.description && (
                           <div>
                             <h4 className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2">Descrição / Escopo</h4>
                             <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/80 whitespace-pre-wrap leading-relaxed">{modalTask.description}</p>
                           </div>
                        )}

                        {/* 🟢 Exibição Exclusiva do Prazo do Cliente (NUNCA prazo da equipe) */}
                        <div className="bg-gray-50/90 p-4 rounded-2xl border border-gray-100 flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                              <Calendar size={13} className="text-[var(--color-atelier-terracota)]" />
                              <span>{modalMeta.dateLabel}</span>
                            </span>
                            <span className="text-[12px] font-bold text-[var(--color-atelier-grafite)]">
                              {modalClientDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-200/60">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Status Atual</span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${
                              isCompleted ? 'bg-green-100 text-green-700' :
                              isReviewRequested ? 'bg-red-100 text-red-700' :
                              modalMeta.isDocumentDeliverable 
                                ? (modalTask.status === 'pending_client_approval' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700')
                                : modalMeta.isFoundational ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {isCompleted ? 'Concluída & Aprovada' :
                               isReviewRequested ? 'Revisão Solicitada' :
                               modalMeta.isDocumentDeliverable
                                ? (modalTask.status === 'pending_client_approval' ? 'PDF Pronto p/ Avaliação' : 'Curadoria no Focus')
                                : modalMeta.isFoundational ? 'Aguardando sua Validação' : 'Aprovação Pendente'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ações contextuais de aprovação / revisão específicas por tipagem */}
                      <div className="mt-8 shrink-0 flex flex-col gap-3">
                        {modalMeta.category === 'briefing' ? (
                          isCompleted ? (
                            <div className="bg-emerald-50 text-emerald-800 py-3.5 rounded-2xl font-roboto text-[10px] font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-2 border border-emerald-200 text-center">
                              <CheckCircle2 size={16} /> Reunião Realizada com Sucesso
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleApproveTask(modalTask)}
                              disabled={isActionProcessing}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-roboto text-[11px] font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                            >
                              {isActionProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                              Confirmar Conclusão da Reunião
                            </button>
                          )
                        ) : isCompleted ? (
                          <div className="flex flex-col gap-3">
                             <div className="bg-green-50 text-green-700 py-3.5 rounded-2xl font-roboto text-[10px] font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-2 border border-green-200 shadow-sm text-center">
                                <CheckCircle2 size={16} /> {modalMeta.isDocumentDeliverable ? 'Documento Validado & Aprovado' : modalMeta.isFoundational ? 'Diretriz Validada & Aprovada' : 'Publicação Aprovada'}
                             </div>
                             
                             {/* Botões pós-aprovação */}
                             <div className="grid grid-cols-2 gap-2 mt-1">
                               <a 
                                 href={modalTaskFileUrl || "#"} 
                                 download 
                                 target="_blank" 
                                 rel="noreferrer"
                                 className={`bg-[var(--color-atelier-grafite)] hover:bg-gray-800 text-white py-3 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md ${!modalTaskFileUrl ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                               >
                                 <Download size={14} /> Baixar PDF
                               </a>
                               <button 
                                 onClick={() => {
                                   setIsCommentMode(!isCommentMode);
                                 }}
                                 className="bg-white border border-gray-200 hover:border-gray-300 text-gray-700 py-3 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                                >
                                  <MessageSquare size={14} /> Comentar
                                </button>
                             </div>
                          </div>
                        ) : isReviewRequested ? (
                          <div className="flex flex-col gap-3">
                            <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 text-center flex flex-col items-center gap-2">
                              <RotateCcw size={18} className="text-red-600 animate-spin-reverse" />
                              <span className="font-roboto text-xs font-bold uppercase tracking-wider">
                                Revisão em Andamento no Focus
                              </span>
                              <p className="font-roboto text-[11px] text-red-800/80">
                                Os ajustes solicitados foram encaminhados para a equipe do Studio Veronna.
                              </p>
                            </div>
                            <button 
                              onClick={() => setIsCommentMode(!isCommentMode)}
                              className="w-full bg-white border border-gray-200 hover:border-gray-300 text-gray-700 py-3 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <MessageSquare size={14} /> Adicionar Informação à Revisão
                            </button>
                          </div>
                        ) : (modalMeta.isDocumentDeliverable && modalTask.status !== 'pending_client_approval') ? (
                          <div className="flex flex-col gap-3">
                            <div className="bg-slate-50 text-slate-700 p-4 rounded-2xl border border-slate-200 text-center flex flex-col items-center gap-2">
                              <Clock size={18} className="text-slate-500" />
                              <span className="font-roboto text-xs font-bold uppercase tracking-wider">
                                Em Curadoria Interna no Focus
                              </span>
                              <p className="font-roboto text-[11px] text-slate-600">
                                O Studio Veronna está preparando este documento. Assim que a gestão aprovar no Focus, o PDF completo ficará disponível aqui para sua avaliação.
                              </p>
                            </div>
                            <button 
                              onClick={() => setIsCommentMode(!isCommentMode)}
                              className="w-full bg-white border border-gray-200 hover:border-gray-300 text-gray-700 py-3 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <MessageSquare size={14} /> Deixar uma Consideração Antecipada
                            </button>
                          </div>
                        ) : modalMeta.requiresClientApproval && isPendingAction ? (
                          <>
                            {/* Alerta se tentar aprovar post antes das diretrizes fundacionais */}
                            {!areFoundationalApproved && !modalMeta.isFoundational && (
                              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                                <ShieldCheck size={14} className="shrink-0 text-amber-700" />
                                <span>Recomendamos aprovar as diretrizes estruturais antes de aprovar publicações.</span>
                              </div>
                            )}

                            {/* Botão Principal de Aprovação */}
                            <button 
                              onClick={() => handleApproveTask(modalTask)}
                              disabled={isActionProcessing}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-roboto text-[11px] font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                            >
                              {isActionProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                              Aprovar {modalMeta.typeLabel}
                            </button>
                            
                            <div className="grid grid-cols-2 gap-2">
                              {/* Botão Solicitar Revisão */}
                              <button 
                                onClick={() => {
                                  setIsCommentMode(false);
                                  setActivePostFeedbackId(activePostFeedbackId === modalTask.id ? null : modalTask.id);
                                }}
                                className={`py-3 rounded-2xl font-roboto text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                                  activePostFeedbackId === modalTask.id 
                                    ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                    : 'bg-white border-red-100 text-red-600 hover:bg-red-50'
                                }`}
                              >
                                <AlertCircle size={14} /> Solicitar Revisão
                              </button>

                              {/* Botão Comentar */}
                              <button 
                                onClick={() => {
                                  setActivePostFeedbackId(null);
                                  setIsCommentMode(!isCommentMode);
                                }}
                                className={`py-3 rounded-2xl font-roboto text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                                  isCommentMode 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <MessageSquare size={14} /> Comentar
                              </button>
                            </div>
                          </>
                        ) : null}

                        {/* Formulário de Revisão com Categorias Contextuais */}
                        <AnimatePresence>
                          {activePostFeedbackId === modalTask.id && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-3 mt-1 p-4 bg-red-50/70 border border-red-200 rounded-2xl">
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-red-800 block mb-2">
                                  O que precisa ser revisado:
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                  {revisionOptions.map((t: any) => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => setSelectedAdjustType(t.id)}
                                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                        selectedAdjustType === t.id
                                          ? 'bg-red-600 text-white shadow-xs'
                                          : 'bg-white text-red-700 border border-red-200 hover:bg-red-100'
                                      }`}
                                    >
                                      {t.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <textarea 
                                placeholder="Descreva detalhadamente o ajuste que você gostaria que a equipe fizesse..."
                                value={postFeedbackText}
                                onChange={(e) => setPostFeedbackText(e.target.value)}
                                className="w-full bg-white border border-red-200 focus:border-red-400 rounded-xl p-3 text-xs outline-none resize-none h-20 text-gray-800"
                              />

                              <div className="flex gap-2 justify-end">
                                <button onClick={() => { setActivePostFeedbackId(null); setPostFeedbackText(""); }} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 rounded-xl cursor-pointer">
                                  Cancelar
                                </button>
                                <button 
                                  onClick={() => handleRejectTask(modalTask, postFeedbackText, selectedAdjustType)} 
                                  disabled={isActionProcessing || !postFeedbackText.trim()} 
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                  {isActionProcessing ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>} Enviar Revisão
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Formulário de Comentário */}
                        <AnimatePresence>
                          {isCommentMode && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-2 mt-1 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 block">
                                Deixe uma consideração para a equipe no Focus:
                              </label>
                              <textarea 
                                placeholder="Escreva seu comentário ou pergunta..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                className="w-full bg-white border border-gray-200 focus:border-blue-400 rounded-xl p-3 text-xs outline-none resize-none h-20 text-gray-800"
                              />
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => { setIsCommentMode(false); setCommentText(""); }} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 rounded-xl cursor-pointer">
                                  Cancelar
                                </button>
                                <button 
                                  onClick={() => handleCommentTask(modalTask, commentText)} 
                                  disabled={isActionProcessing || !commentText.trim()} 
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                  {isActionProcessing ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>} Enviar ao Focus
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Thread de Histórico de Mensagens / Comentários */}
                        {taskThread.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2.5">
                            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                              <MessageSquare size={12} className="text-[var(--color-atelier-terracota)]" />
                              <span>Diálogo com a Equipe ({taskThread.length})</span>
                            </span>
                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                              {taskThread.map((msg: any) => {
                                const isClient = msg.role === 'client' || msg.role === 'cliente';
                                return (
                                  <div
                                    key={msg.id || Math.random()}
                                    className={`p-2.5 rounded-xl text-xs flex flex-col gap-1 border ${
                                      isClient 
                                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 ml-2' 
                                        : 'bg-gray-50 border-gray-200 text-gray-800 mr-2'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={`text-[9.5px] font-bold uppercase tracking-wider ${
                                        isClient ? 'text-emerald-800' : 'text-[var(--color-atelier-terracota)]'
                                      }`}>
                                        {isClient ? 'Você (Cliente)' : (msg.authorName || 'Studio Veronna')}
                                      </span>
                                      <span className="text-[9px] text-gray-400">
                                        {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                                      </span>
                                    </div>
                                    {msg.adjustType && (
                                      <span className="text-[9px] font-semibold text-red-700 bg-red-100/80 px-1.5 py-0.5 rounded w-fit">
                                        Revisão: {msg.adjustType}
                                      </span>
                                    )}
                                    <p className="text-[11.5px] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })()}
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
                   <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/70 leading-relaxed font-medium">O Studio Veronna possui especialistas prontos para assumir toda a gestão do seu ecossistema digital.</p>
                 </div>
                 <div className="flex flex-col gap-3 mt-4">
                   <button onClick={handleAcceptUpsell} className="w-full bg-[var(--color-atelier-terracota)] text-white py-5 rounded-[1.5rem] font-bold uppercase tracking-[0.1em] text-[11px] shadow-lg hover:bg-[#234E80] transition-all">Sim, Quero conhecer as opções</button>
                   <button onClick={handleDeclineUpsell} className="w-full bg-transparent text-[var(--color-atelier-grafite)]/50 py-4 rounded-[1.5rem] font-bold uppercase tracking-widest text-[10px] hover:text-[var(--color-atelier-grafite)] hover:bg-gray-50 transition-colors">Não, pretendo manter o formato atual</button>
                 </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL DO DIRECIONAMENTO ESTRATÉGICO (PRIMEIRA ETAPA DO NOVO CICLO) */}
        <AnimatePresence>
          {isPulseModalOpen && (
            <div className="fixed inset-0 z-[280] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPulseModalOpen(false)} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/70 backdrop-blur-md cursor-pointer" />
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="glass-panel bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl relative z-10 w-full max-w-2xl border border-white flex flex-col gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0">
                      <Compass size={24} className="animate-[spin_12s_linear_infinite]" />
                    </div>
                    <div>
                      <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                        Direcionamento Estratégico
                      </span>
                      <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                        Alinhamento do Novo Ciclo
                      </h3>
                    </div>
                  </div>
                  <button onClick={() => setIsPulseModalOpen(false)} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>

                <div className="p-3.5 bg-[var(--color-atelier-terracota)]/10 rounded-2xl border border-[var(--color-atelier-terracota)]/20 text-xs text-[var(--color-atelier-grafite)]/80 leading-relaxed">
                  <span className="font-bold text-[var(--color-atelier-terracota)] block mb-0.5">Primeira atividade da renovação do ciclo:</span>
                  Responda a estas 5 perguntas estratégicas para orientar as prioridades comerciais, campanhas e novidades da sua marca. Com base nessas respostas, nossa equipe prepara todo o seu planejamento editorial.
                </div>

                <div className="flex flex-col gap-4">
                  {PULSE_QUESTIONS.map((q, idx) => (
                    <div key={q.id} className="flex flex-col gap-1.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                      <label className="font-roboto text-xs font-bold text-[var(--color-atelier-grafite)]">
                        {idx + 1}. {q.q}
                      </label>
                      <textarea
                        value={pulseAnswers[q.id] || ""}
                        onChange={(e) => setPulseAnswers({ ...pulseAnswers, [q.id]: e.target.value })}
                        rows={2}
                        placeholder="Sua resposta (ou deixe em branco se não houver novidades)..."
                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 outline-none focus:border-[var(--color-atelier-terracota)] resize-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 flex-wrap gap-2">
                  {presencaData?.cycle?.pulse_answered_at && (
                    <button
                      type="button"
                      onClick={handleDownloadDirecionamentoPDF}
                      disabled={isDownloadingDirecionamentoPDF}
                      className="px-4 py-3 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-wider bg-gray-100 hover:bg-gray-200 text-[var(--color-atelier-grafite)] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      title="Baixar PDF com as respostas do direcionamento"
                    >
                      {isDownloadingDirecionamentoPDF ? <Loader2 size={13} className="animate-spin text-[var(--color-atelier-terracota)]" /> : <Download size={13} className="text-[var(--color-atelier-terracota)]" />}
                      <span>Baixar PDF</span>
                    </button>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => setIsPulseModalOpen(false)}
                      className="px-5 py-3 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 cursor-pointer"
                    >
                      {presencaData?.cycle?.pulse_answered_at ? "Fechar" : "Responder Mais Tarde"}
                    </button>
                    <button
                      onClick={handleSubmitPulse}
                      disabled={isSubmittingPulse}
                      className="px-6 py-3 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingPulse ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      {presencaData?.cycle?.pulse_answered_at ? "Atualizar Direcionamento" : "Enviar Direcionamento"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL DO CICLO ATUAL (OBJETIVOS, ESTRATÉGIA, DISPOSIÇÃO DE CONTEÚDO E RELATÓRIO) */}
        <AnimatePresence>
          {isCycleModalOpen && presencaData?.cycle && (
            <div className="fixed inset-0 z-[280] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCycleModalOpen(false)} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/70 backdrop-blur-md cursor-pointer" />
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="glass-panel bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl relative z-10 w-full max-w-3xl border border-white flex flex-col gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0">
                      <Layers size={24} className="text-[var(--color-atelier-terracota)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                          Ciclo #{presencaData.cycle.cycle_number} • Gestão de Instagram
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold uppercase tracking-wider">
                          {presencaData.cycle.status === 'open' ? 'Ciclo Ativo' : 'Encerrado'}
                        </span>
                      </div>
                      <h3 className="font-elegant text-2xl md:text-3xl text-[var(--color-atelier-grafite)] mt-0.5">
                        Plano Estratégico & Governança
                      </h3>
                    </div>
                  </div>
                  <button onClick={() => setIsCycleModalOpen(false)} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>

                {/* Período e Vigência */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar size={14} className="text-[var(--color-atelier-terracota)]" />
                    <span className="font-bold text-[var(--color-atelier-grafite)]">Vigência do Ciclo:</span>
                    <span>{new Date(presencaData.cycle.period_start).toLocaleDateString('pt-BR')} até {new Date(presencaData.cycle.period_end).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/10 px-3 py-1 rounded-full">
                    {presencaData.metrics?.daysRemaining || 0} dias restantes
                  </div>
                </div>

                {/* Bloco 1: Nossos Objetivos */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Target size={15} className="text-[var(--color-atelier-terracota)]" />
                    <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">
                      Nossos Objetivos Estratégicos
                    </h4>
                  </div>
                  <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100">
                    <h5 className="font-elegant text-xl text-[var(--color-atelier-grafite)] mb-1">
                      {presencaData.cycle.objective || "Construção de autoridade e engajamento qualificado"}
                    </h5>
                    {presencaData.cycle.objective_kind && OBJECTIVE_KINDS[presencaData.cycle.objective_kind] && (
                      <span className="inline-block text-[9px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] mt-1">
                        Foco Principal: {OBJECTIVE_KINDS[presencaData.cycle.objective_kind].label}
                      </span>
                    )}
                    {presencaData.cycle.editorial_strategy && (
                      <p className="font-roboto text-xs text-gray-600 leading-relaxed mt-2.5 pt-2.5 border-t border-gray-200/60">
                        {presencaData.cycle.editorial_strategy}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bloco 2: Gráfico de Disposição de Conteúdo (Pilares Editoriais) */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={15} className="text-[var(--color-atelier-terracota)]" />
                      <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">
                        Disposição de Conteúdo (Pilares do Ciclo)
                      </h4>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">Equilíbrio da Grade Editorial</span>
                  </div>

                  {/* Barra Gráfica Segmentada */}
                  <div className="flex h-3.5 rounded-xl overflow-hidden bg-gray-100 shadow-inner">
                    {PILLARS.map((p) => {
                      const w = presencaData.cycle.pillars?.[p.id] || 0;
                      return w > 0 ? (
                        <div key={p.id} style={{ width: `${w}%`, backgroundColor: p.color }} title={`${p.label}: ${w}%`} className="transition-all duration-500" />
                      ) : null;
                    })}
                  </div>

                  {/* Grid de Detalhe dos 4 Pilares */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {PILLARS.map((p) => {
                      const weight = presencaData.cycle.pillars?.[p.id] || 0;
                      return (
                        <div key={p.id} className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                              {p.label}
                            </span>
                            <span className="text-xs font-bold font-mono text-[var(--color-atelier-grafite)]">
                              {weight}%
                            </span>
                          </div>
                          <span className="text-[9px] text-gray-400 leading-tight">
                            {p.id === 'descoberta' && 'Atrair novos olhares para o perfil'}
                            {p.id === 'autoridade' && 'Consolidar expertise e reputação'}
                            {p.id === 'relacionamento' && 'Gerar conexão e fidelização'}
                            {p.id === 'conversao' && 'Estimular contatos e orçamentos'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bloco 3: Relatórios e Métricas de Desempenho */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Activity size={15} className="text-[var(--color-atelier-terracota)]" />
                    <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">
                      Métricas de Acompanhamento & Governança
                    </h4>
                  </div>
                  <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 flex flex-col gap-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {presencaData.cycle.objective_kind && OBJECTIVE_KINDS[presencaData.cycle.objective_kind]?.metrics ? (
                        OBJECTIVE_KINDS[presencaData.cycle.objective_kind].metrics.map(m => (
                          <div key={m.key} className="p-2.5 bg-white rounded-xl border border-gray-100 flex flex-col">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400">Indicador Chave</span>
                            <span className="text-xs font-bold text-[var(--color-atelier-grafite)] mt-0.5">{m.label}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2.5 bg-white rounded-xl border border-gray-100 col-span-full text-xs text-gray-500">
                          Métricas configuradas pela equipe para acompanhamento das metas do ciclo.
                        </div>
                      )}
                    </div>

                    {presencaData.cycle.learnings && (
                      <div className="pt-3 border-t border-gray-200/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                          Aprendizados do Ciclo
                        </span>
                        <p className="text-xs text-gray-700 leading-relaxed italic">
                          "{presencaData.cycle.learnings}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé com botão de fechar */}
                <div className="flex justify-end pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setIsCycleModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest bg-[var(--color-atelier-grafite)] text-white hover:bg-black transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL DO RELATÓRIO ESTRATÉGICO INSTAGRAM (APIFY ANALYTICS) */}
        <AnimatePresence>
          {isInstagramReportModalOpen && (
            <div className="fixed inset-0 z-[290] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInstagramReportModalOpen(false)} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/70 backdrop-blur-md cursor-pointer" />
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="glass-panel bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl relative z-10 w-full max-w-4xl border border-white flex flex-col gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border-2 border-white shadow-sm ring-2 ring-[var(--color-atelier-terracota)]/20 bg-gray-100 flex items-center justify-center">
                        {currentAvatarUrl ? (
                          <img 
                            src={currentAvatarUrl} 
                            alt={`@${currentUsername}`}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                        <div 
                          style={{ display: currentAvatarUrl ? 'none' : 'flex' }}
                          className="w-full h-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white items-center justify-center font-bold text-lg uppercase"
                        >
                          {currentUsername ? currentUsername[0] : <Instagram size={24} />}
                        </div>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center shadow-xs border border-white">
                        <Instagram size={11} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                          Relatório Executivo de Telemetria
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider">
                          Sincronização Apify
                        </span>
                      </div>
                      <h3 className="font-elegant text-2xl md:text-3xl text-[var(--color-atelier-grafite)] mt-0.5">
                        Performance & Tração Digital • @{currentUsername || 'instagram'}
                      </h3>
                    </div>
                  </div>
                  <button onClick={() => setIsInstagramReportModalOpen(false)} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>

                {/* Resumo de Tração e Ganho de Seguidores */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col">
                    <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-gray-400">Base de Seguidores</span>
                    <span className="font-elegant text-3xl font-bold text-[var(--color-atelier-grafite)] mt-1">
                      {(instagramAnalytics?.metrics?.followersCount || 1420).toLocaleString('pt-BR')}
                    </span>
                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs mt-1">
                      <TrendingUp size={13} />
                      <span>+{(instagramAnalytics?.metrics?.followerGain || 68).toLocaleString('pt-BR')} no ciclo</span>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col">
                    <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-gray-400">Engajamento Médio</span>
                    <span className="font-elegant text-3xl font-bold text-[var(--color-atelier-grafite)] mt-1">
                      {instagramAnalytics?.metrics?.avgEngagementRate || 4.2}%
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      {(instagramAnalytics?.metrics?.totalInteractions || 384).toLocaleString('pt-BR')} interações totais
                    </span>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col">
                    <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-gray-400">Acervo no Perfil</span>
                    <span className="font-elegant text-3xl font-bold text-[var(--color-atelier-grafite)] mt-1">
                      {instagramAnalytics?.metrics?.postsCount || 9} publicações
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      Última extração: {new Date(instagramAnalytics?.profile?.last_synced_at || Date.now()).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Conteúdos com Maior Tração */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">
                      Publicações com Maior Resposta da Audiência
                    </h4>
                    <span className="text-xs text-gray-400">Dados reais capturados da conta</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(instagramAnalytics?.posts || []).slice(0, 3).map((p: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-2xl p-3 border border-gray-100 flex flex-col gap-2.5">
                        <div className="w-full h-40 rounded-xl overflow-hidden bg-gray-200 relative">
                          <img src={normalizeImageUrl(p.image_url, `Post #${idx + 1}`)} alt="Post" className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-white text-[10px] font-bold">
                            #{idx + 1}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                          <span className="flex items-center gap-1 text-red-500"><Heart size={13} fill="currentColor" /> {p.likes_count || 0}</span>
                          <span className="flex items-center gap-1 text-gray-600"><MessageCircle size={13} fill="currentColor" /> {p.comments_count || 0}</span>
                        </div>
                        <p className="text-[11px] text-gray-600 line-clamp-2 italic">
                          "{p.caption || 'Sem legenda'}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Diretriz Estratégica da Atelier */}
                <div className="p-5 rounded-2xl bg-[var(--color-atelier-creme)]/40 border border-[var(--color-atelier-terracota)]/20 flex flex-col gap-2">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                    Parecer Consultivo Studio Veronna
                  </span>
                  <p className="font-roboto text-xs text-[var(--color-atelier-grafite)] leading-relaxed">
                    A tração de novos seguidores reflete a consistência da linha editorial. Recomendamos manter a cadência de publicações com foco nos pilares de Descoberta e Autoridade para converter os novos visitantes em seguidores fiéis e contatos comerciais qualificados.
                  </p>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <button
                    onClick={handleManualSyncInstagram}
                    disabled={isSyncingInstagram}
                    className="px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-wider bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={isSyncingInstagram ? "animate-spin text-[var(--color-atelier-terracota)]" : ""} />
                    <span>Atualizar Telemetria</span>
                  </button>

                  <button
                    onClick={() => setIsInstagramReportModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest bg-[var(--color-atelier-grafite)] text-white hover:bg-black transition-colors cursor-pointer"
                  >
                    Concluído
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL DE MÉTRICAS AVANÇADAS DO INSTAGRAM */}
        <AdvancedInstagramMetricsModal
          isOpen={isAdvancedMetricsOpen}
          onClose={() => setIsAdvancedMetricsOpen(false)}
          analytics={instagramAnalytics}
          presencaData={presencaData}
          onSync={handleManualSyncInstagram}
          isSyncing={isSyncingInstagram}
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
            <Palette size={14} className="text-[var(--color-atelier-terracota)]" /> Atualizado pela Direção de Arte
          </div>
        </motion.div>
      </div>
    </div>
  );
}