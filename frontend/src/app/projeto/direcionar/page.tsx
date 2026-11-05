"use client";
import { useState, useEffect } from "react";
import { 
  Loader2, Compass, Bell, CheckCircle2, 
  Palette, Layers, Target, Type, Sparkles,
  ExternalLink, ChevronRight, ChevronLeft, Save,
  FileText, Download, MessageSquare, AlertCircle, XCircle, Clock, Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Territories } from "../../../components/brand/Territories";
import { getTerritoryEvaluationAction, submitTerritoryEvaluationAction } from "../../actions/territory";
import { getClientActiveProjectAction } from "../../actions/clientProject";
import { supabase } from "../../../lib/supabase";
import { NotificationEngine } from "../../../lib/NotificationEngine";
import { normalizeImageUrl } from "../../../lib/imageUtils";

export default function DirecionarPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  
  // 001 - Curadoria Visual
  const [directions, setDirections] = useState<any[]>([]);
  const [activeDirectionIndex, setActiveDirectionIndex] = useState(0);
  const [isSavingDirection, setIsSavingDirection] = useState(false);

  // 003 - Direcionamento Criativo
  const [creativeDirections, setCreativeDirections] = useState<any[]>([]);
  const [isActionProcessing, setIsActionProcessing] = useState(false);
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  // Navegação entre Etapas
  const [activeTab, setActiveTab] = useState<'curadoria' | 'territorios' | 'direcionamento'>('curadoria');

  const fetchPageData = async () => {
    setIsLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (authData.authenticated) setProfile(authData.user);
      
      const proj = await getClientActiveProjectAction();
      if (proj) {
        setProject(proj);

        // 1. Territórios Conceituais
        const evalData = await getTerritoryEvaluationAction(proj.id);
        if (evalData && evalData.territories && evalData.territories.length > 0 && evalData.status !== 'draft') {
          setEvaluation(evalData);
        } else {
          setEvaluation(null);
        }

        // 2. Curadoria Visual (design_directions)
        const { data: dirs } = await (supabase
          .from('design_directions') as any)
          .select('*')
          .eq('project_id', proj.id)
          .order('created_at', { ascending: true });

        const safeDirs = (dirs || []).filter(Boolean);
        setDirections(safeDirs);

        // 3. Direcionamento Criativo Oficial (content_planning)
        const { data: plans } = await (supabase
          .from('content_planning') as any)
          .select('*')
          .eq('project_id', proj.id)
          .order('created_at', { ascending: false });

        const safePlans = plans || [];
        const dirPlans = safePlans.filter((p: any) => 
          p.pillar === 'Direcionamento Criativo' || 
          p.hook?.toLowerCase().includes('direcionamento') ||
          p.hook?.toLowerCase().includes('direção')
        );
        const finalPlans = dirPlans.length > 0 ? dirPlans : safePlans;
        setCreativeDirections(finalPlans);

        // Ajusta aba padrão inteligente
        const hasPendingDirecionamento = finalPlans.some((p: any) => p.status === 'awaiting_approval');
        if (hasPendingDirecionamento) {
          setActiveTab('direcionamento');
        } else if (safeDirs.length > 0) {
          setActiveTab('curadoria');
        } else if (evalData && evalData.territories && evalData.territories.length > 0 && evalData.status !== 'draft') {
          setActiveTab('territorios');
        } else if (finalPlans.length > 0) {
          setActiveTab('direcionamento');
        }
      }
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  const handleEvaluateTerritory = async (chosenId: string, feedback: string) => {
    if (!evaluation) return;
    try {
      const updated = await submitTerritoryEvaluationAction(evaluation.id, chosenId, feedback);
      setEvaluation(updated);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Avaliação de território enviada com sucesso!' }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao enviar avaliação.' }));
    }
  };

  const handleFeedbackChange = (key: string, value: string) => {
    const updated = [...directions];
    const current = updated[activeDirectionIndex];
    if (!current) return;
    if (!current.feedback || typeof current.feedback !== 'object') {
      current.feedback = { q1: "", q2: "", q3: "", q4: "" };
    }
    current.feedback[key] = value;
    setDirections(updated);
  };

  const handleScoreChange = (score: number) => {
    const updated = [...directions];
    if (!updated[activeDirectionIndex]) return;
    updated[activeDirectionIndex].score = score;
    setDirections(updated);
  };

  const handleSaveDirectionEvaluation = async () => {
    const currentDir = directions[activeDirectionIndex];
    if (!currentDir) return;

    setIsSavingDirection(true);
    window.dispatchEvent(new CustomEvent('showToast', { detail: 'Enviando avaliação para a equipe...' }));

    try {
      const { error } = await (supabase
        .from('design_directions') as any)
        .update({
          score: currentDir.score || 0,
          feedback: currentDir.feedback,
          status: 'evaluated'
        })
        .eq('id', currentDir.id);

      if (error) throw error;

      await NotificationEngine.notifyManagement(
        "✨ Curadoria Visual Avaliada",
        `O cliente ${profile?.nome?.split(' ')[0] || 'do projeto'} avaliou a Direção "${currentDir.title}" com nota ${currentDir.score || 0}/10.`,
        currentDir.score && currentDir.score >= 8 ? "success" : "info",
        "/admin/projetos"
      );

      window.dispatchEvent(new CustomEvent('showToast', { detail: '✨ Avaliação enviada com sucesso para o Studio Veronna!' }));
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao salvar avaliação.' }));
    } finally {
      setIsSavingDirection(false);
    }
  };

  // ==========================================
  // MOTORES DO 003 - DIRECIONAMENTO CRIATIVO
  // ==========================================
  const handleApproveDirecionamento = async (planId: string) => {
    setIsActionProcessing(true);
    try {
      // 1. Atualiza content_planning para 'approved'
      await (supabase.from('content_planning') as any)
        .update({ status: 'approved' })
        .eq('id', planId);

      // 2. Conclui tarefa associada de Direcionamento Criativo no Kanban/Analytics
      if (project?.id) {
        await (supabase.from('tasks') as any)
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          })
          .eq('project_id', project.id)
          .ilike('title', '%direcionamento%');
      }

      // 3. Notifica o estúdio
      await NotificationEngine.notifyManagement(
        "✅ Direcionamento Criativo Aprovado",
        `O cliente ${profile?.nome || 'do projeto'} aprovou o Direcionamento Criativo Oficial da marca!`,
        "success",
        "/admin/projetos"
      );

      setCreativeDirections(prev => prev.map(p => p.id === planId ? { ...p, status: 'approved' } : p));
      window.dispatchEvent(new CustomEvent('showToast', { detail: '✨ Direcionamento Criativo aprovado com sucesso! Projeto liberado para Construção.' }));
    } catch (e) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao aprovar o direcionamento.' }));
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleRejectDirecionamento = async (planId: string) => {
    const feedback = feedbackText[planId];
    if (!feedback || feedback.trim() === "") {
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Por favor, descreva o que precisa ser ajustado.' }));
      return;
    }

    setIsActionProcessing(true);
    try {
      // 1. Atualiza content_planning para 'needs_revision' e salva feedback
      await (supabase.from('content_planning') as any)
        .update({ 
          status: 'needs_revision', 
          feedback: feedback.trim() 
        })
        .eq('id', planId);

      // 2. Regride tarefa associada para 'review' para chamar atenção da equipe
      if (project?.id) {
        await (supabase.from('tasks') as any)
          .update({ status: 'review' })
          .eq('project_id', project.id)
          .ilike('title', '%direcionamento%');
      }

      // 3. Notifica a gestão
      await NotificationEngine.notifyManagement(
        "⚠️ Ajuste Solicitado no Direcionamento",
        `O cliente ${profile?.nome || 'do projeto'} solicitou ajustes no Direcionamento Criativo: "${feedback.trim()}"`,
        "warning",
        "/admin/projetos"
      );

      setCreativeDirections(prev => prev.map(p => p.id === planId ? { ...p, status: 'needs_revision', feedback: feedback.trim() } : p));
      setActiveFeedbackId(null);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Solicitação de revisão enviada com sucesso! A equipe do Studio Veronna já foi notificada.' }));
    } catch (e) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao enviar feedback de revisão.' }));
    } finally {
      setIsActionProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)] opacity-50" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 md:p-8 text-[var(--color-atelier-grafite)] text-center">
        Nenhum projeto ativo encontrado.
      </div>
    );
  }

  const hasTerritoriesToSend = evaluation && evaluation.territories && evaluation.territories.length > 0;
  const hasDirections = directions.length > 0;
  const hasCreativeDirections = creativeDirections.length > 0;
  const currentDir = directions[activeDirectionIndex];
  const currentDirImages = currentDir 
    ? ((currentDir.image_urls && currentDir.image_urls.length > 0) 
        ? currentDir.image_urls 
        : (currentDir.image_url ? [currentDir.image_url] : []))
    : [];

  const latestCreativeDirection = creativeDirections[0];

  return (
    <div className="flex flex-col h-full w-full max-w-[1300px] mx-auto px-4 md:px-8 lg:px-12 relative z-10 pb-12 gap-6 overflow-y-auto custom-scrollbar">
      
      {/* Header Editorial da Fase */}
      <header className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 border-b border-[var(--color-atelier-grafite)]/10 pb-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-orange-100/70 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0">
              <Compass size={18} />
            </span>
            <span className="text-[10px] font-roboto font-bold uppercase tracking-[0.25em] text-[var(--color-atelier-terracota)]">
              Fase 02 • Direcionar
            </span>
          </div>
          <h2 className="font-elegant text-2xl md:text-3xl text-[var(--color-atelier-grafite)] font-bold mt-1">
            Curadoria Visual, Territórios & Direcionamento
          </h2>
          <p className="font-roboto text-xs md:text-sm text-[var(--color-atelier-grafite)]/65 max-w-2xl">
            Caminhos visuais, moodboards estéticos e documento oficial de direcionamento em PDF para homologar a identidade do seu negócio.
          </p>
        </div>

        {/* Status Pill & Abas 001, 002, 003 */}
        <div className="shrink-0 flex items-center gap-2">
          {hasTerritoriesToSend || hasDirections || hasCreativeDirections ? (
            <div className="flex items-center gap-2 flex-wrap">
              {hasDirections && (
                <button
                  type="button"
                  onClick={() => setActiveTab('curadoria')}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'curadoria'
                      ? 'bg-[var(--color-atelier-terracota)] text-white shadow-sm'
                      : 'bg-white/80 text-[var(--color-atelier-grafite)]/70 hover:bg-white border border-black/[0.06]'
                  }`}
                >
                  <Palette size={12} />
                  001 • Curadoria ({directions.length})
                </button>
              )}

              {hasTerritoriesToSend && (
                <button
                  type="button"
                  onClick={() => setActiveTab('territorios')}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'territorios'
                      ? 'bg-[var(--color-atelier-terracota)] text-white shadow-sm'
                      : 'bg-white/80 text-[var(--color-atelier-grafite)]/70 hover:bg-white border border-black/[0.06]'
                  }`}
                >
                  <Layers size={12} />
                  002 • Territórios ({evaluation.territories.length})
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('direcionamento')}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'direcionamento'
                    ? 'bg-[var(--color-atelier-terracota)] text-white shadow-sm'
                    : 'bg-white/80 text-[var(--color-atelier-grafite)]/70 hover:bg-white border border-black/[0.06]'
                }`}
              >
                <FileText size={12} />
                003 • Direcionamento Criativo {hasCreativeDirections && `(${creativeDirections.length})`}
              </button>
            </div>
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-orange-50/80 border border-orange-200/80 text-[var(--color-atelier-terracota)] text-[10px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
              <Palette size={11} className="text-[var(--color-atelier-terracota)]" />
              Fase Liberada • Em Curadoria
            </span>
          )}
        </div>
      </header>

      {/* Conteúdo Principal */}
      {(!hasDirections && !hasTerritoriesToSend && !hasCreativeDirections && activeTab !== 'direcionamento') ? (
        /* Card Reassegurador de Espera com Aviso */
        <div className="flex flex-col items-center justify-center my-auto py-8 max-w-3xl mx-auto w-full gap-6">
          <div className="glass-panel p-7 sm:p-10 rounded-[2.5rem] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(20,44,72,0.06)] flex flex-col items-center text-center w-full relative overflow-hidden">
            
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#234E80]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-100/70 border border-orange-200/60 flex items-center justify-center text-[var(--color-atelier-terracota)] shadow-sm">
                <Compass size={38} className="text-[var(--color-atelier-terracota)]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs border-2 border-white">
                <CheckCircle2 size={13} strokeWidth={2.8} />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9.5px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={10} /> Fase 01 Descobrir Concluída
              </span>
            </div>

            <h3 className="font-elegant text-2xl sm:text-3xl text-[var(--color-atelier-grafite)] font-bold mb-3">
              Curadoria Visual & Territórios em Preparação
            </h3>

            <p className="font-roboto text-sm sm:text-base text-[var(--color-atelier-grafite)]/75 leading-relaxed max-w-xl mb-6">
              A fase <strong>Descobrir</strong> foi concluída com sucesso e a etapa de <strong>Direcionamento</strong> já está liberada! 
              Nossa equipe criativa do Studio Veronna está agora produzindo a curadoria das referências e os caminhos visuais para a sua marca.
            </p>

            <div className="w-full bg-gradient-to-r from-orange-50/70 via-amber-50/60 to-orange-50/70 border border-[var(--color-atelier-terracota)]/25 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center gap-3.5 text-left mb-6 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <Bell size={18} className="animate-bounce" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-roboto font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]">
                  Aviso Importante: Aguarde o Envio
                </span>
                <p className="text-[12px] font-roboto text-[var(--color-atelier-grafite)]/70 leading-normal">
                  Como ainda não enviamos os arquivos para a curadoria visual, escolha do território e direcionamento criativo em PDF, por favor aguarde. <strong>Assim que os arquivos estiverem disponíveis, você será notificado para realizar a sua validação.</strong>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-4 border-t border-[var(--color-atelier-grafite)]/10 text-left">
              <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.04] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[var(--color-atelier-terracota)]">
                  <Palette size={13} />
                  <span className="text-[10px] font-roboto font-bold uppercase tracking-wider">001 Curadoria</span>
                </div>
                <p className="text-[10.5px] font-roboto text-[var(--color-atelier-grafite)]/65 leading-tight">
                  Referências de arte, tipografia, paletas e elementos gráficos.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.04] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[var(--color-atelier-terracota)]">
                  <Layers size={13} />
                  <span className="text-[10px] font-roboto font-bold uppercase tracking-wider">002 Territórios</span>
                </div>
                <p className="text-[10.5px] font-roboto text-[var(--color-atelier-grafite)]/65 leading-tight">
                  Rotas conceituais estruturadas para o posicionamento da marca.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.04] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[var(--color-atelier-terracota)]">
                  <FileText size={13} />
                  <span className="text-[10px] font-roboto font-bold uppercase tracking-wider">003 Direcionamento</span>
                </div>
                <p className="text-[10.5px] font-roboto text-[var(--color-atelier-grafite)]/65 leading-tight">
                  Documento executivo em PDF para aprovar ou solicitar ajustes.
                </p>
              </div>
            </div>

          </div>
        </div>
      ) : activeTab === 'direcionamento' ? (
        /* ========================================================
           VISTA DA ETAPA 003: DIRECIONAMENTO CRIATIVO OFICIAL (PDF)
           ======================================================== */
        <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_ease-out]">
          
          {!hasCreativeDirections ? (
            /* Card de Espera do PDF */
            <div className="glass-panel p-8 sm:p-12 rounded-[2.5rem] bg-white/90 backdrop-blur-xl border border-white shadow-sm flex flex-col items-center text-center max-w-2xl mx-auto my-6 gap-5">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[var(--color-atelier-terracota)]">
                <FileText size={32} />
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-0.5 rounded-full bg-orange-100/80 text-[var(--color-atelier-terracota)] text-[10px] font-roboto font-bold uppercase tracking-widest">
                  Etapa 003 • Lançamento em PDF
                </span>
              </div>
              <h3 className="font-elegant text-2xl sm:text-3xl text-[var(--color-atelier-grafite)] font-bold">
                Direcionamento Criativo em Elaboração
              </h3>
              <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/70 leading-relaxed">
                Nossos diretores de arte do Studio Veronna estão sintetizando as decisões da curadoria e dos territórios no 
                <strong> Documento Oficial de Direcionamento Criativo em PDF</strong>. Assim que for submetido, você poderá visualizá-lo, aprovar ou solicitar ajustes diretamente por aqui.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {creativeDirections.map((plan: any) => {
                const fileUrl = plan.planning_file_url || (plan.media_assets && plan.media_assets[0]?.url);
                const isApproved = plan.status === 'approved';
                const isAwaiting = plan.status === 'awaiting_approval';
                const isRevision = plan.status === 'needs_revision';

                return (
                  <div 
                    key={plan.id}
                    className="glass-panel p-6 sm:p-8 rounded-[2.5rem] bg-white/95 backdrop-blur-xl border border-white shadow-md flex flex-col lg:flex-row gap-8 items-start relative overflow-hidden transition-all hover:shadow-lg"
                  >
                    {/* Borda de status decorativa */}
                    <div className={`absolute top-0 left-0 w-2 h-full ${
                      isApproved ? 'bg-emerald-500' : isRevision ? 'bg-rose-500' : 'bg-[var(--color-atelier-terracota)]'
                    }`} />

                    {/* Coluna de Informações e Acesso ao PDF */}
                    <div className="flex-1 flex flex-col gap-5 pl-2 sm:pl-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-3 py-1 rounded-full bg-orange-100/80 text-[var(--color-atelier-terracota)] text-[10px] font-roboto font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <FileText size={12} /> Etapa 003 • Documento Oficial
                        </span>

                        {isApproved && (
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-roboto font-bold uppercase tracking-widest flex items-center gap-1.5 border border-emerald-200">
                            <CheckCircle2 size={12} /> Aprovado Oficialmente
                          </span>
                        )}
                        {isAwaiting && (
                          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-roboto font-bold uppercase tracking-widest flex items-center gap-1.5 border border-amber-200 animate-pulse">
                            <Clock size={12} /> Aguarda Sua Validação
                          </span>
                        )}
                        {isRevision && (
                          <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-roboto font-bold uppercase tracking-widest flex items-center gap-1.5 border border-rose-200">
                            <AlertCircle size={12} /> Revisão Solicitada
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-elegant text-2xl sm:text-3xl text-[var(--color-atelier-grafite)] font-bold">
                          {plan.hook || "Direcionamento Criativo Oficial"}
                        </h3>
                        {plan.briefing && (
                          <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/75 mt-2 leading-relaxed whitespace-pre-wrap">
                            {plan.briefing}
                          </p>
                        )}
                      </div>

                      {/* Parecer de Revisão Solicitada */}
                      {isRevision && plan.feedback && (
                        <div className="bg-rose-50 border border-rose-200/80 p-4 rounded-2xl flex flex-col gap-1.5">
                          <span className="text-[10px] font-roboto font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                            <MessageSquare size={12} /> Seu parecer enviado à equipe:
                          </span>
                          <p className="text-xs font-roboto text-rose-900 font-medium whitespace-pre-wrap leading-relaxed">
                            "{plan.feedback}"
                          </p>
                          <span className="text-[10px] font-roboto text-rose-600/80 mt-1">
                            A equipe do Studio Veronna está lapidando o material com base nas suas observações.
                          </span>
                        </div>
                      )}

                      {/* Botão de Abrir o Documento PDF */}
                      {fileUrl && (
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setPreviewPdfUrl(fileUrl)}
                            className="flex items-center gap-3 bg-[var(--color-atelier-creme)]/60 hover:bg-[var(--color-atelier-terracota)]/10 p-4 rounded-2xl border border-[var(--color-atelier-terracota)]/20 hover:border-[var(--color-atelier-terracota)]/40 transition-all group text-left cursor-pointer shadow-xs"
                          >
                            <div className="w-10 h-10 rounded-xl bg-white border border-[var(--color-atelier-terracota)]/20 flex items-center justify-center text-[var(--color-atelier-terracota)] group-hover:scale-105 transition-transform shrink-0 shadow-2xs">
                              <FileText size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-roboto text-xs font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                                Visualizar Direcionamento Criativo (PDF)
                              </span>
                              <span className="text-[10px] font-roboto text-gray-500">
                                Clique para abrir a apresentação completa na tela
                              </span>
                            </div>
                          </button>

                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-5 py-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-roboto font-bold uppercase tracking-wider text-gray-700 transition-colors shrink-0 shadow-xs"
                          >
                            <ExternalLink size={14} /> Abrir em Nova Aba
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Coluna de Ações: Aprovação e Ajustes */}
                    <div className="w-full lg:w-[340px] flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-[var(--color-atelier-grafite)]/10 pt-6 lg:pt-0 lg:pl-8 shrink-0">
                      
                      {isApproved ? (
                        <div className="bg-emerald-50 border border-emerald-200/80 p-6 rounded-2xl flex flex-col items-center text-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={24} />
                          </div>
                          <span className="font-roboto font-bold text-xs uppercase tracking-wider text-emerald-800">
                            Direcionamento Aprovado
                          </span>
                          <p className="text-[11.5px] font-roboto text-emerald-700 leading-relaxed">
                            O caminho visual e estratégico da sua marca foi validado. Nossa equipe iniciou a etapa de Construção!
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <span className="text-[11px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 mb-1">
                            Sua Decisão Oficial
                          </span>

                          <button
                            type="button"
                            onClick={() => handleApproveDirecionamento(plan.id)}
                            disabled={isActionProcessing}
                            className="w-full py-4 px-6 rounded-2xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white text-xs font-roboto font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5"
                          >
                            {isActionProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            Aprovar Direcionamento
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveFeedbackId(activeFeedbackId === plan.id ? null : plan.id)}
                            disabled={isActionProcessing}
                            className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-gray-50 border border-[var(--color-atelier-grafite)]/15 text-[var(--color-atelier-grafite)]/80 hover:text-[var(--color-atelier-terracota)] hover:border-[var(--color-atelier-terracota)] text-xs font-roboto font-bold uppercase tracking-wider shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <MessageSquare size={15} /> Solicitar Ajustes
                          </button>

                          {/* Caixa de Texto de Revisão Expansível */}
                          <AnimatePresence>
                            {activeFeedbackId === plan.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden mt-2"
                              >
                                <div className="bg-[#faf9f8] p-4 rounded-2xl border border-[var(--color-atelier-terracota)]/20 flex flex-col gap-3 shadow-inner">
                                  <label className="text-[10px] font-roboto font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/70">
                                    O que gostaria de ajustar no direcionamento?
                                  </label>
                                  <textarea
                                    placeholder="Descreva detalhadamente pontos de cor, tipografia, referências ou elementos que deseja calibrar..."
                                    value={feedbackText[plan.id] || ""}
                                    onChange={(e) => setFeedbackText({ ...feedbackText, [plan.id]: e.target.value })}
                                    rows={4}
                                    className="w-full bg-white border border-gray-200 focus:border-[var(--color-atelier-terracota)] rounded-xl p-3 text-xs text-gray-800 outline-none resize-none shadow-2xs"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setActiveFeedbackId(null)}
                                      className="px-3.5 py-1.5 text-[10px] font-roboto font-bold uppercase tracking-wider text-gray-500 hover:text-gray-800 bg-white rounded-lg border border-gray-200 transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRejectDirecionamento(plan.id)}
                                      disabled={isActionProcessing || !feedbackText[plan.id]?.trim()}
                                      className="px-4 py-1.5 text-[10px] font-roboto font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                      <Send size={12} /> Enviar Parecer
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                        </div>
                      )}

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      ) : activeTab === 'territorios' && hasTerritoriesToSend ? (
        <Territories
          evaluationId={evaluation.id}
          territories={evaluation.territories}
          status={evaluation.status}
          chosenTerritoryId={evaluation.chosen_territory_id}
          feedback={evaluation.feedback}
          onEvaluate={handleEvaluateTerritory}
          isClient={true}
        />
      ) : (
        /* Vista da Curadoria Visual (001) */
        <div className="flex flex-col gap-6">
          
          {/* Seletor de Direções Visuais */}
          {directions.length > 1 && (
            <div className="flex overflow-x-auto custom-scrollbar gap-3 pb-2 shrink-0">
              {directions.map((dir, idx) => {
                const cover = (dir?.image_urls && dir.image_urls.length > 0) ? dir.image_urls[0] : (dir?.image_url || '');
                const isSelected = activeDirectionIndex === idx;
                const isEvaluated = dir.score && dir.score > 0;

                return (
                  <button
                    key={dir.id || idx}
                    type="button"
                    onClick={() => setActiveDirectionIndex(idx)}
                    className={`shrink-0 flex items-center gap-3 p-2.5 pr-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-white border-[var(--color-atelier-terracota)] shadow-sm ring-1 ring-[var(--color-atelier-terracota)]/20'
                        : 'bg-white/60 border-white hover:bg-white'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-black/[0.06] shrink-0">
                      <img src={normalizeImageUrl(cover)} alt={dir.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-[11px] font-roboto font-bold truncate ${isSelected ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>
                        {dir.title}
                      </span>
                      <span className="text-[9.5px] font-roboto text-[var(--color-atelier-grafite)]/50 uppercase tracking-wider">
                        {isEvaluated ? `Nota ${dir.score}/10 • Avaliado` : 'Pendente de Avaliação'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Área da Direção Ativa */}
          {currentDir && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Galeria de Imagens da Direção */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="bg-white/80 p-4 sm:p-6 rounded-[2.5rem] border border-white shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-black/[0.04]">
                    <div>
                      <span className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                        Painel de Referências Visuais
                      </span>
                      <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] font-bold">
                        {currentDir.title}
                      </h3>
                    </div>
                    {currentDir.score && currentDir.score > 0 && (
                      <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={12} /> Nota {currentDir.score}/10
                      </span>
                    )}
                  </div>

                  {currentDir.description && (
                    <p className="font-roboto text-xs md:text-sm text-[var(--color-atelier-grafite)]/70 leading-relaxed">
                      {currentDir.description}
                    </p>
                  )}

                  {/* Grid de Imagens */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {currentDirImages.map((img: string, i: number) => (
                      <div 
                        key={i} 
                        className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-black/[0.06] shadow-2xs group relative cursor-pointer"
                        onClick={() => window.open(normalizeImageUrl(img), "_blank")}
                      >
                        <img 
                          src={normalizeImageUrl(img)} 
                          alt={`${currentDir.title} ref ${i+1}`} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <ExternalLink size={20} className="text-white drop-shadow-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Formulário Oficial de Avaliação */}
              <div className="lg:col-span-5 flex flex-col gap-5 sticky top-6">
                <div className="glass-panel p-6 sm:p-7 rounded-[2.5rem] bg-white/95 backdrop-blur-xl border border-white shadow-md flex flex-col gap-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-black/[0.05]">
                    <Sparkles size={16} className="text-[var(--color-atelier-terracota)]" />
                    <h4 className="font-roboto font-bold text-xs uppercase tracking-widest text-[var(--color-atelier-grafite)]">
                      Sua Avaliação da Curadoria
                    </h4>
                  </div>

                  {/* Pergunta 1: No geral, o que achou desse projeto? */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-roboto font-bold text-[var(--color-atelier-grafite)]">
                      No geral, o que achou desse projeto?
                    </label>
                    <textarea
                      rows={2}
                      value={currentDir?.feedback?.q1 || ""}
                      onChange={(e) => handleFeedbackChange("q1", e.target.value)}
                      placeholder="Compartilhe suas primeiras impressões sobre este caminho visual..."
                      className="w-full bg-[#faf9f8] border border-black/[0.08] focus:border-[var(--color-atelier-terracota)] rounded-xl p-3 text-xs font-roboto text-[var(--color-atelier-grafite)] outline-none resize-none transition-colors"
                    />
                  </div>

                  {/* Pergunta 2: O que acha da fonte usada? */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-roboto font-bold text-[var(--color-atelier-grafite)]">
                      O que acha da fonte usada?
                    </label>
                    <textarea
                      rows={2}
                      value={currentDir?.feedback?.q2 || ""}
                      onChange={(e) => handleFeedbackChange("q2", e.target.value)}
                      placeholder="Avalie a tipografia, legibilidade, elegância ou estilo da fonte..."
                      className="w-full bg-[#faf9f8] border border-black/[0.08] focus:border-[var(--color-atelier-terracota)] rounded-xl p-3 text-xs font-roboto text-[var(--color-atelier-grafite)] outline-none resize-none transition-colors"
                    />
                  </div>

                  {/* Pergunta 3: O que acha da paleta de cor? */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-roboto font-bold text-[var(--color-atelier-grafite)]">
                      O que acha da paleta de cor?
                    </label>
                    <textarea
                      rows={2}
                      value={currentDir?.feedback?.q3 || ""}
                      onChange={(e) => handleFeedbackChange("q3", e.target.value)}
                      placeholder="As cores transmitem a atmosfera e a emoção desejadas para a marca?"
                      className="w-full bg-[#faf9f8] border border-black/[0.08] focus:border-[var(--color-atelier-terracota)] rounded-xl p-3 text-xs font-roboto text-[var(--color-atelier-grafite)] outline-none resize-none transition-colors"
                    />
                  </div>

                  {/* Pergunta 4: E dos elementos gráficos? */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-roboto font-bold text-[var(--color-atelier-grafite)]">
                      E dos elementos gráficos? (Podem ser padrões, ícones, elementos que “enfeitam” o projeto)
                    </label>
                    <textarea
                      rows={2}
                      value={currentDir?.feedback?.q4 || ""}
                      onChange={(e) => handleFeedbackChange("q4", e.target.value)}
                      placeholder="Opine sobre as formas, ícones, texturas e ornamentos gráficos..."
                      className="w-full bg-[#faf9f8] border border-black/[0.08] focus:border-[var(--color-atelier-terracota)] rounded-xl p-3 text-xs font-roboto text-[var(--color-atelier-grafite)] outline-none resize-none transition-colors"
                    />
                  </div>

                  {/* Pergunta 5: De 0 a 10, qual sua nota? */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-black/[0.04]">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-roboto font-bold text-[var(--color-atelier-grafite)]">
                        De 0 a 10, qual sua nota?
                      </label>
                      <span className="text-sm font-roboto font-black text-[var(--color-atelier-terracota)]">
                        {currentDir?.score ?? 0} / 10
                      </span>
                    </div>

                    <div className="grid grid-cols-11 gap-1">
                      {Array.from({ length: 11 }).map((_, n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => handleScoreChange(n)}
                          className={`py-1.5 text-center text-xs font-roboto font-bold rounded-lg transition-all cursor-pointer ${
                            (currentDir?.score || 0) === n
                              ? 'bg-[var(--color-atelier-terracota)] text-white shadow-2xs scale-105'
                              : 'bg-white hover:bg-orange-100/60 text-[var(--color-atelier-grafite)]/70 border border-black/[0.06]'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between text-[9.5px] font-roboto uppercase tracking-wider text-[var(--color-atelier-grafite)]/45">
                      <span>0 - Distante</span>
                      <span>10 - Excelente</span>
                    </div>
                  </div>

                  {/* Botão de Envio */}
                  <button
                    type="button"
                    onClick={handleSaveDirectionEvaluation}
                    disabled={isSavingDirection}
                    className="w-full py-3.5 px-4 rounded-xl bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white text-xs font-roboto font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
                  >
                    {isSavingDirection ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Enviando Avaliação...
                      </>
                    ) : (
                      <>
                        <Save size={15} /> Salvar Avaliação desta Direção
                      </>
                    )}
                  </button>

                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DE PDF INTEGRADO */}
      <AnimatePresence>
        {previewPdfUrl && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setPreviewPdfUrl(null)} 
              className="absolute inset-0 bg-black/70 backdrop-blur-md cursor-pointer" 
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-5xl h-full max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#faf9f8]">
                <div className="flex items-center gap-2.5">
                  <FileText size={18} className="text-[var(--color-atelier-terracota)]" />
                  <span className="font-roboto text-xs font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]">
                    Direcionamento Criativo Oficial (PDF)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-[var(--color-atelier-terracota)] rounded-xl text-[10px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download size={12} /> Baixar
                  </a>
                  <button
                    onClick={() => setPreviewPdfUrl(null)}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 w-full h-full bg-gray-50">
                <iframe
                  src={previewPdfUrl}
                  className="w-full h-full border-0"
                  title="PDF Direcionamento Criativo"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
