"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, Sparkles, Hammer, Presentation, 
  Package, Search, Compass, FileText, FolderOpen, ArrowRight,
  Calendar, Download, TrendingUp, Lock,
  ChevronDown, X, ExternalLink, Check,
  Activity, Clock, CheckCircle2, ShieldCheck, Layers, Cpu, Palette, Eye
} from "lucide-react";
import { supabase } from "../lib/supabase"; 
import { IDV_FLOW_PIPELINE } from "./admin/analytics/constants";
import Link from "next/link";
import DescobrirPage from "./projeto/descobrir/page";
import DirecionarPage from "./projeto/direcionar/page";
import RevelarPage from "./projeto/revelar/page";
import { getProductTypeFromProject } from "@/lib/productHelper";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

const IDV_PHASE_ORDER = ['onboarding', 'discover', 'define', 'develop', 'qa', 'present', 'client_review', 'refine', 'deliver', 'activate'];

const CRAFT_STAGE_DETAILS: Record<string, {
  focus: string;
  rigorBadge: string;
  checklist: { label: string; status: 'done' | 'doing' | 'todo' }[];
  nextMilestone: string;
}> = {
  onboarding: {
    focus: "Imersão no DNA & Mapeamento de Universo",
    rigorBadge: "Fundação Estratégica",
    checklist: [
      { label: "Análise do Briefing & Visão da Marca", status: "done" },
      { label: "Diagnóstico Semiótico & Benchmark", status: "done" },
      { label: "Definição dos Atributos Centrais", status: "doing" }
    ],
    nextMilestone: "Abertura do Brand Lab"
  },
  discover: {
    focus: "Imersão no DNA & Mapeamento de Universo",
    rigorBadge: "Fundação Estratégica",
    checklist: [
      { label: "Análise do Briefing & Visão da Marca", status: "done" },
      { label: "Diagnóstico Semiótico & Benchmark", status: "done" },
      { label: "Definição dos Atributos Centrais", status: "doing" }
    ],
    nextMilestone: "Abertura do Brand Lab"
  },
  define: {
    focus: "Curadoria de Territórios & Brand Lab",
    rigorBadge: "Direção Conceitual",
    checklist: [
      { label: "Mapeamento Estético & Moodboards", status: "done" },
      { label: "Construção dos 3 Territórios Visuais", status: "doing" },
      { label: "Validação & Parecer no Brand Lab", status: "todo" }
    ],
    nextMilestone: "Decisão do Território Visual"
  },
  develop: {
    focus: "Construção Geométrica do Símbolo & Sistema",
    rigorBadge: "Precisão Vetorial",
    checklist: [
      { label: "Desenho Vetorial & Proporção Áurea", status: "doing" },
      { label: "Harmonia Tipográfica & Grid de Kerning", status: "todo" },
      { label: "Testes de Contraste, Escala & Redutibilidade", status: "todo" }
    ],
    nextMilestone: "Cerimônia de Revelação"
  },
  qa: {
    focus: "Validação Técnica & Rigor de Aplicação",
    rigorBadge: "Controle de Qualidade",
    checklist: [
      { label: "Estudo de Versatilidade & Mockups", status: "doing" },
      { label: "Geração de Matrizes Monocromáticas", status: "todo" },
      { label: "Aprovação Técnica da Diretoria", status: "todo" }
    ],
    nextMilestone: "Cerimônia de Revelação"
  },
  present: {
    focus: "Cerimônia de Revelação da Marca",
    rigorBadge: "Apresentação Executiva",
    checklist: [
      { label: "Montagem do Keynote & Vídeo Conceito", status: "done" },
      { label: "Simulações em Contexto Real de Negócio", status: "doing" },
      { label: "Parecer Oficial & Decisão do Cliente", status: "todo" }
    ],
    nextMilestone: "Aprovação & Lapidação"
  },
  client_review: {
    focus: "Avaliação Executiva da Marca",
    rigorBadge: "Apresentação Executiva",
    checklist: [
      { label: "Análise da Cerimônia de Revelação", status: "done" },
      { label: "Coleta do Parecer Estratégico", status: "doing" },
      { label: "Confirmação do Caminho Aprovado", status: "todo" }
    ],
    nextMilestone: "Aprovação & Lapidação"
  },
  refine: {
    focus: "Lapidação Óptica & Ajustes Finos",
    rigorBadge: "Alta Fidelidade",
    checklist: [
      { label: "Calibração Óptica dos Vetores", status: "doing" },
      { label: "Matrizes Cromáticas (Pantone / CMYK / RGB)", status: "todo" },
      { label: "Homologação dos Ativos Finais", status: "todo" }
    ],
    nextMilestone: "Empacotamento de Ativos"
  },
  deliver: {
    focus: "Empacotamento de Ativos & Brandbook",
    rigorBadge: "Handover Executivo",
    checklist: [
      { label: "Exportação de Vetores em Alta Resolução", status: "doing" },
      { label: "Brandbook Executivo & Diretrizes de Uso", status: "todo" },
      { label: "Brand Starter Kit Final", status: "todo" }
    ],
    nextMilestone: "Entrega Final Concluída"
  },
  activate: {
    focus: "Ativação da Marca no Mercado",
    rigorBadge: "Ativação Total",
    checklist: [
      { label: "Arquivos Prontos para Impressão & Digital", status: "done" },
      { label: "Brandbook e Kit de Ativos Disponíveis", status: "done" },
      { label: "Suporte e Acompanhamento de Ativação", status: "doing" }
    ],
    nextMilestone: "Marca em Plena Operação"
  }
};

// Portfólio — logos do estúdio para o background da Jornada Criativa
const BASE_LOGOS = Array.from({ length: 20 }, (_, i) => `${i + 1}`);
const DUP_LOGOS = BASE_LOGOS.map(l => l + '_dup');
const EMPTY_SLOTS = Array.from({ length: 6 }, (_, i) => 'empty_' + i);
const ALL_PORTFOLIO = [...BASE_LOGOS, ...DUP_LOGOS, ...EMPTY_SLOTS];

function shuffleArray(array: string[]) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Home() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isDescobrirModalOpen, setIsDescobrirModalOpen] = useState(false);
  const [isDirecionarModalOpen, setIsDirecionarModalOpen] = useState(false);
  const [isRevelarModalOpen, setIsRevelarModalOpen] = useState(false);
  const [isFilesMenuOpen, setIsFilesMenuOpen] = useState(false);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [dbTasks, setDbTasks] = useState<any[]>([]);
  const [prodTab, setProdTab] = useState<'bancada' | 'timeline'>('bancada');

  // Estado do mosaico animado de fundo
  const [portfolioGrid, setPortfolioGrid] = useState<string[]>([]);
  const [depths, setDepths] = useState<Record<string, { scale: number; blur: number; opacity: number }>>({});

  const filesMenuRef = useRef<HTMLDivElement>(null);

  // Inicialização e shuffle periódico dos logos do estúdio
  useEffect(() => {
    setPortfolioGrid(shuffleArray(ALL_PORTFOLIO));
    const depthMap: Record<string, { scale: number; blur: number; opacity: number }> = {};
    ALL_PORTFOLIO.forEach(item => {
      if (!item.startsWith('empty')) {
        const layer = Math.random();
        if (layer < 0.33) depthMap[item] = { scale: 0.5, blur: 4, opacity: 0.12 };
        else if (layer < 0.66) depthMap[item] = { scale: 0.75, blur: 2, opacity: 0.2 };
        else depthMap[item] = { scale: 1.0, blur: 0, opacity: 0.3 };
      }
    });
    setDepths(depthMap);

    const shuffleInterval = setInterval(() => {
      setPortfolioGrid(prev => {
        const grid = [...prev];
        const filled: number[] = [];
        const empty: number[] = [];
        grid.forEach((v, i) => { if (v.startsWith('empty')) empty.push(i); else filled.push(i); });
        for (let k = 0; k < 3; k++) {
          if (!filled.length || !empty.length) break;
          const fi = Math.floor(Math.random() * filled.length);
          const ei = Math.floor(Math.random() * empty.length);
          const tmp = grid[filled[fi]];
          grid[filled[fi]] = grid[empty[ei]];
          grid[empty[ei]] = tmp;
          filled.splice(fi, 1);
          empty.splice(ei, 1);
        }
        return grid;
      });
    }, 3000);

    return () => clearInterval(shuffleInterval);
  }, []);

  // Fechar menu de arquivos ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filesMenuRef.current && !filesMenuRef.current.contains(event.target as Node)) {
        setIsFilesMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const { getClientActiveProjectAction } = await import('./actions/clientProject');
        const proj = await getClientActiveProjectAction();
        
        if (proj) {
          const productType = getProductTypeFromProject(proj);
          if (productType === 'instagram') {
            router.replace('/cockpit');
            return;
          }
          if (productType === 'mapa') {
            router.replace('/mapa');
            return;
          }
          setActiveProject(proj);
        }

        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (prof) setClientProfile(prof);

        if (proj) {
          const { data: projectTasks } = await supabase
            .from('tasks')
            .select('title, status, stage, task_type, is_adhoc, deadline')
            .eq('project_id', proj.id);
          if (projectTasks) setDbTasks(projectTasks);
        }
      } catch (error) {
        console.error(error);
      }

      setIsLoading(false);
    };

    fetchDashboardData();

    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F0EBE1]">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)] opacity-50" />
      </div>
    );
  }

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";
  const clientFirstName = clientProfile?.nome?.trim().split(' ')[0] || "Cliente";

  const totalTasks = dbTasks.length;
  const completedTasks = dbTasks.filter(t => ['completed', 'done', 'approved', 'archived'].includes(t.status)).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (activeProject?.progress || 14);

  const currentPhaseNormalized = activeProject?.idv_phase || 'discover';

  // Cálculo da Data Prevista Verdadeira (21 dias de ciclo criativo)
  const createdDate = activeProject?.created_at ? new Date(activeProject.created_at) : new Date();
  let trueDeliveryDate = new Date(createdDate.getTime() + (21 * 24 * 60 * 60 * 1000));
  
  if (activeProject?.delivery_target_date) {
    trueDeliveryDate = new Date(activeProject.delivery_target_date);
  } else if (activeProject?.data_limite) {
    const dLim = new Date(activeProject.data_limite);
    if (dLim.getTime() > createdDate.getTime() + (24 * 60 * 60 * 1000)) {
      trueDeliveryDate = dLim;
    }
  }

  const formattedTrueDeliveryDate = trueDeliveryDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // As 6 fases canônicas da Identidade Visual
  const IDV_STAGES = [
    { 
      id: "descobrir", 
      number: "01", 
      label: "Descobrir", 
      sublabel: "Briefing & Fundação",
      tags: ["DNA da Marca", "Diagnóstico", "Briefing"],
      phases: ["onboarding", "discover"], 
      icon: Search, 
      action: () => setIsDescobrirModalOpen(true),
      actionLabel: "Ver Briefing",
      isFoundationDone: true
    },
    { 
      id: "direcionar", 
      number: "02", 
      label: "Direcionar", 
      sublabel: "Brand Lab & Territórios",
      tags: ["3 Territórios", "Moodboards", "Cores"],
      phases: ["define"], 
      icon: Compass, 
      action: () => setIsDirecionarModalOpen(true),
      actionLabel: "Abrir Brand Lab",
      isFoundationDone: false
    },
    { 
      id: "construir", 
      number: "03", 
      label: "Construir", 
      sublabel: "Símbolo & Sistema Visual",
      tags: ["Grid Áureo", "Tipografia", "Mockups"],
      phases: ["develop", "qa"], 
      icon: Hammer, 
      action: null,
      actionLabel: "Em Laboratório Criativo",
      isFoundationDone: false
    },
    { 
      id: "revelar", 
      number: "04", 
      label: "Revelar", 
      sublabel: "Apresentação & Decisão",
      tags: ["Cerimônia", "Keynote", "Aprovação"],
      phases: ["present", "client_review"], 
      icon: Presentation, 
      action: () => setIsRevelarModalOpen(true),
      actionLabel: "Ver Apresentação",
      isFoundationDone: false
    },
    { 
      id: "refinar", 
      number: "05", 
      label: "Refinar", 
      sublabel: "Lapidação & Ajustes",
      tags: ["Ajuste Óptico", "Pantone", "Fidelidade"],
      phases: ["refine"], 
      icon: Sparkles, 
      action: null,
      actionLabel: "Em Lapidação",
      isFoundationDone: false
    },
    { 
      id: "ativar", 
      number: "06", 
      label: "Ativar", 
      sublabel: "Brand Kit & Handover",
      tags: ["Brandbook", "Vetores SVG", "Kit Ativos"],
      phases: ["deliver", "activate"], 
      icon: Package, 
      action: () => {
        if (activeProject?.brand_os_url) window.open(activeProject.brand_os_url, "_blank");
        else showToast("Os arquivos finais estão sendo empacotados.");
      },
      actionLabel: "Baixar Ativos",
      isFoundationDone: false
    },
  ];

  const getStageStatus = (stage: typeof IDV_STAGES[0]) => {
    if (stage.id === 'descobrir') return 'completed';

    const currentIdx = IDV_PHASE_ORDER.indexOf(currentPhaseNormalized);
    const stageMaxIdx = Math.max(...stage.phases.map(p => IDV_PHASE_ORDER.indexOf(p)));

    if (stage.phases.includes(currentPhaseNormalized)) {
      return 'current';
    } else if (currentIdx > stageMaxIdx) {
      return 'completed';
    } else {
      return 'upcoming';
    }
  };

  const currentStageInfo = IDV_STAGES.find(s => s.phases.includes(currentPhaseNormalized)) || IDV_STAGES[1];

  // Ação necessária do cliente (Aparece SOMENTE se houver ação pendente)
  const needsClientAction = (currentPhaseNormalized === 'define') || (['present', 'client_review'].includes(currentPhaseNormalized));
  
  const clientActionInfo = currentPhaseNormalized === 'define' ? {
    badge: "Fase 02 • Decisão de Território",
    title: "Avaliação do Território Visual",
    description: "Os caminhos conceituais estão prontos no Brand Lab. Valide a direção estética para desenharmos os símbolos.",
    buttonLabel: "Abrir Brand Lab",
    action: () => setIsDirecionarModalOpen(true),
    icon: Compass
  } : (['present', 'client_review'].includes(currentPhaseNormalized)) ? {
    badge: "Fase 04 • Momento da Decisão",
    title: "Revelação da Marca & Parecer Oficial",
    description: "A sua Identidade Visual foi concebida! Assista à cerimônia de revelação da marca e aprove.",
    buttonLabel: "Assistir Revelação",
    action: () => setIsRevelarModalOpen(true),
    icon: Presentation
  } : null;

  const pipeline = IDV_FLOW_PIPELINE[activeProject?.idv_product || 'IDV-CORE'] || [];

  return (
    <div className="flex flex-col h-[calc(100dvh-105px)] max-w-[1440px] mx-auto w-full gap-3.5 relative z-10 px-2 md:px-5 overflow-hidden justify-between">
      
      {/* 🟢 HEADER LIMPO, ELEGANTE E MINIMALISTA (Altura controlada) */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 shrink-0">
        <div>
          <h1 className="font-elegant text-3xl md:text-4xl lg:text-5xl text-[var(--color-atelier-grafite)] leading-tight tracking-tight">
            {greeting}, <span className="text-[var(--color-atelier-terracota)] italic">{clientFirstName}.</span>
          </h1>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="px-3 py-1 bg-white/80 border border-white/80 rounded-full text-[10.5px] font-roboto font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/70 shadow-2xs backdrop-blur-md flex items-center gap-1.5">
              <Calendar size={12} className="text-[var(--color-atelier-terracota)]" />
              Previsão de Entrega: <strong className="text-[var(--color-atelier-grafite)] font-bold">{formattedTrueDeliveryDate}</strong>
            </span>

            <span className="px-3 py-1 bg-white/80 border border-white/80 rounded-full text-[10.5px] font-roboto font-bold uppercase tracking-wider text-[var(--color-atelier-terracota)] shadow-2xs backdrop-blur-md flex items-center gap-1.5">
              <Sparkles size={12} />
              Fase: {currentStageInfo.label}
            </span>

            {needsClientAction && (
              <span className="px-2.5 py-0.5 bg-amber-500 text-white rounded-full text-[9.5px] font-roboto font-bold uppercase tracking-widest shadow-2xs animate-pulse flex items-center gap-1">
                Ação Solicitada
              </span>
            )}
          </div>
        </div>

        {/* 🟢 BOTÃO EXPANSÍVEL: MEUS ARQUIVOS */}
        <div className="relative shrink-0" ref={filesMenuRef}>
          <button
            type="button"
            onClick={() => setIsFilesMenuOpen(!isFilesMenuOpen)}
            className="px-4 py-2.5 rounded-full bg-white/90 hover:bg-white text-[var(--color-atelier-grafite)] border border-white/90 shadow-[0_6px_18px_rgba(40,30,25,0.06)] backdrop-blur-xl transition-all duration-300 flex items-center gap-2 cursor-pointer hover:shadow-md hover:-translate-y-0.5 group"
          >
            <FolderOpen size={15} className="text-[var(--color-atelier-terracota)] group-hover:scale-110 transition-transform" />
            <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">
              Meus Arquivos
            </span>
            <ChevronDown size={13} className={`text-gray-400 transition-transform duration-300 ${isFilesMenuOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {isFilesMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_20px_40px_rgba(40,30,25,0.14)] p-1.5 z-50 flex flex-col gap-0.5 ring-1 ring-black/5"
              >
                <div className="px-2.5 py-1.5 border-b border-gray-100">
                  <span className="text-[9px] font-roboto uppercase font-bold tracking-widest text-gray-400">
                    Documentação Oficial
                  </span>
                </div>

                {activeProject?.contract_url ? (
                  <a
                    href={activeProject.contract_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsFilesMenuOpen(false)}
                    className="p-2 rounded-xl hover:bg-[var(--color-atelier-creme)]/60 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-[var(--color-atelier-terracota)]" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-[var(--color-atelier-grafite)]">Contrato Assinado</span>
                        <span className="text-[9px] text-gray-400">PDF Autenticado</span>
                      </div>
                    </div>
                    <ExternalLink size={11} className="text-gray-300 group-hover:text-[var(--color-atelier-terracota)]" />
                  </a>
                ) : (
                  <div className="p-2 rounded-xl opacity-50 flex items-center gap-2">
                    <FileText size={14} className="text-gray-400" />
                    <span className="text-[11px] font-medium text-gray-500">Contrato em formalização</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsFilesMenuOpen(false);
                    setIsDirecionarModalOpen(true);
                  }}
                  className="p-2 rounded-xl hover:bg-[var(--color-atelier-creme)]/60 transition-colors flex items-center justify-between group text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Compass size={14} className="text-[var(--color-atelier-terracota)]" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-[var(--color-atelier-grafite)]">Brand Lab & Territórios</span>
                      <span className="text-[9px] text-gray-400">Diretrizes estéticas</span>
                    </div>
                  </div>
                  <ArrowRight size={11} className="text-gray-300 group-hover:text-[var(--color-atelier-terracota)]" />
                </button>

                <Link
                  href="/brandbook"
                  onClick={() => setIsFilesMenuOpen(false)}
                  className="p-2 rounded-xl hover:bg-[var(--color-atelier-creme)]/60 transition-colors flex items-center justify-between group text-left"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[var(--color-atelier-terracota)]" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-[var(--color-atelier-grafite)]">Brandbook & Guidelines</span>
                      <span className="text-[9px] text-gray-400">Manual da marca</span>
                    </div>
                  </div>
                  <ArrowRight size={11} className="text-gray-300 group-hover:text-[var(--color-atelier-terracota)]" />
                </Link>

                {activeProject?.brand_os_url ? (
                  <a
                    href={activeProject.brand_os_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsFilesMenuOpen(false)}
                    className="p-2 rounded-xl hover:bg-[var(--color-atelier-creme)]/60 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <Download size={14} className="text-green-600" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-[var(--color-atelier-grafite)]">Brand Starter Kit</span>
                        <span className="text-[9px] text-gray-400">Vetores e logos</span>
                      </div>
                    </div>
                    <ExternalLink size={11} className="text-gray-300 group-hover:text-green-600" />
                  </a>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* 🟢 LAYOUT PRINCIPAL EM 2 COLUNAS (Jornada Criativa 70% | Produção ao Vivo 30% - NO SCROLL) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-10 gap-4 items-stretch overflow-hidden">
        
        {/* ========================================================= */}
        {/* COLUNA ESQUERDA: JORNADA CRIATIVA COM LOGO LIZ DESIGN & WATERMARK (70% - 7 colunas) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 flex flex-col h-full min-h-0">
          
          <div className="glass-panel relative rounded-[2.2rem] bg-white/75 backdrop-blur-2xl border border-white/80 shadow-[0_16px_40px_rgba(40,30,25,0.05)] flex flex-col h-full min-h-0 overflow-hidden p-5 md:p-6 justify-between gap-3">
            
            {/* 🟢 WATERMARK ANIMADO: Mosaico de logos clássicos do estúdio Liz Design em background */}
            <div className="absolute inset-0 grid grid-cols-5 grid-rows-4 p-3 items-center justify-items-center opacity-[0.08] pointer-events-none overflow-hidden select-none z-0">
              {portfolioGrid.slice(0, 20).map((item, index) => (
                <div key={index} className="flex items-center justify-center relative w-full h-full">
                  <AnimatePresence mode="wait">
                    {item && !item.startsWith('empty') && (
                      <motion.img
                        layout
                        key={item}
                        src={"/images/login/" + item.replace('_dup', '') + ".svg"}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          const el = e.currentTarget;
                          if (el.src.includes('.svg')) el.src = el.src.replace('.svg', '.png');
                          else el.style.display = 'none';
                        }}
                        initial={{ opacity: 0, filter: 'blur(8px) grayscale(100%)', scale: 0.3 }}
                        animate={{ 
                          opacity: depths[item]?.opacity || 0.25, 
                          filter: 'blur(' + (depths[item]?.blur || 2) + 'px) grayscale(100%)', 
                          scale: depths[item]?.scale || 0.65
                        }}
                        exit={{ opacity: 0, filter: 'blur(8px) grayscale(100%)', scale: 0.3 }}
                        transition={{ 
                          layout: { type: "spring", stiffness: 60, damping: 20 },
                          opacity: { duration: 1.2 },
                          filter: { duration: 1.2 }
                        }}
                        className="absolute max-w-[65%] max-h-[65%] object-contain"
                        alt=""
                      />
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Conteúdo com z-10 sobreposto ao mosaico */}
            <div className="relative z-10 flex flex-col gap-3 shrink-0">
              
              {/* Header do Card com a Logo Oficial do estúdio Liz Design */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-atelier-grafite)]/10">
                <div className="flex items-center gap-3">
                  {/* Logo Oficial do Estúdio Liz Design */}
                  <div className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-white/90 flex items-center justify-center shrink-0 p-1.5 backdrop-blur-md">
                    <img 
                      src="/images/simbolo-rosa.png" 
                      alt="Liz Design Studio" 
                      className="w-full h-full object-contain" 
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-elegant text-xl md:text-2xl text-[var(--color-atelier-grafite)] leading-tight font-bold">
                        Jornada Criativa da Marca
                      </h3>
                      <span className="text-[9px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] px-2 py-0.5 rounded-full bg-orange-50 border border-orange-100 hidden sm:inline-block">
                        Liz Design Studio
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-roboto font-bold uppercase tracking-wider text-[var(--color-atelier-terracota)]">
                        <TrendingUp size={11} /> Metodologia Autoral • Ritmo Saudável
                      </span>
                    </div>
                  </div>
                </div>

                {/* Porcentagem e Barra de Progresso Compacta */}
                <div className="flex flex-col sm:items-end gap-1 shrink-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-elegant text-2xl md:text-3xl text-[var(--color-atelier-grafite)] leading-none font-bold">
                      {progressPercent}%
                    </span>
                    <span className="text-[10px] font-roboto uppercase font-bold tracking-wider text-[var(--color-atelier-grafite)]/50">
                      concluído
                    </span>
                  </div>
                  
                  <div className="w-40 sm:w-48 bg-black/5 h-2 rounded-full overflow-hidden p-0.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-[var(--color-atelier-rose)] via-[var(--color-atelier-terracota)] to-amber-600 rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* CARD DE AÇÃO COMPACTO (Apenas quando houver ação solicitada) */}
              {needsClientAction && clientActionInfo && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 px-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-[var(--color-atelier-terracota)]/30 flex items-center justify-between gap-3 shadow-2xs shrink-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-atelier-terracota)] animate-ping shrink-0" />
                    <span className="text-[11.5px] font-roboto font-bold text-[var(--color-atelier-grafite)] truncate">
                      {clientActionInfo.title}: <span className="font-normal text-[var(--color-atelier-grafite)]/75">{clientActionInfo.description}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clientActionInfo.action}
                    className="px-3.5 py-1.5 rounded-lg bg-[var(--color-atelier-terracota)] hover:bg-[#8c562e] text-white text-[10px] font-roboto font-bold uppercase tracking-wider shrink-0 transition-all shadow-2xs hover:shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    {clientActionInfo.buttonLabel} <ArrowRight size={11} />
                  </button>
                </motion.div>
              )}

            </div>

            {/* 🟢 ESTEIRA DAS 6 FASES COM TAGS DE ENTREGÁVEIS (Grid 2x3 compacto e perfeito para NO-SCROLL) */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-2.5 flex-1 min-h-0 items-stretch">
              {IDV_STAGES.map((stage) => {
                const status = getStageStatus(stage);
                const isCompleted = status === 'completed';
                const isCurrent = status === 'current';
                const StageIcon = stage.icon;

                return (
                  <motion.div
                    key={stage.id}
                    whileHover={{ y: -2 }}
                    className={`p-3 md:p-3.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                      isCurrent 
                        ? 'bg-white shadow-[0_8px_20px_rgba(173,111,64,0.12)] border-[var(--color-atelier-terracota)]/50 ring-1 ring-[var(--color-atelier-terracota)]/20' 
                        : isCompleted 
                        ? 'bg-white/85 border-green-200/70 shadow-2xs' 
                        : 'bg-white/40 border-white/60 opacity-65'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-roboto text-[8.5px] font-bold tracking-widest uppercase text-gray-400">
                          0{stage.number}
                        </span>

                        {isCompleted ? (
                          <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full text-[8.5px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1 border border-green-200">
                            <Check size={9} strokeWidth={3} /> Concluída
                          </span>
                        ) : isCurrent ? (
                          <span className="px-1.5 py-0.5 bg-orange-50 text-[var(--color-atelier-terracota)] rounded-full text-[8.5px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1 border border-orange-200 animate-pulse">
                            <Sparkles size={9} /> Em Andamento
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded-full text-[8.5px] font-roboto font-bold uppercase tracking-wider flex items-center gap-0.5">
                            <Lock size={8} /> Próxima
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mb-0.5">
                        <StageIcon size={14} className={isCurrent ? "text-[var(--color-atelier-terracota)]" : isCompleted ? "text-green-600" : "text-gray-400"} />
                        <h4 className="font-elegant text-sm md:text-base text-[var(--color-atelier-grafite)] font-bold">{stage.label}</h4>
                      </div>
                      
                      <p className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/60 font-medium leading-tight mb-2">
                        {stage.sublabel}
                      </p>

                      {/* Micro-tags com entregáveis específicos da fase */}
                      <div className="flex flex-wrap gap-1">
                        {stage.tags?.map((tag, tIdx) => (
                          <span key={tIdx} className="px-1.5 py-0.5 rounded-md bg-black/[0.03] text-[8px] font-roboto font-medium text-[var(--color-atelier-grafite)]/70 border border-black/[0.04]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--color-atelier-grafite)]/5 flex items-center justify-between mt-2">
                      {stage.action ? (
                        <button
                          type="button"
                          onClick={stage.action}
                          className={`text-[9.5px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer ${
                            isCurrent 
                              ? 'text-[var(--color-atelier-terracota)] hover:underline' 
                              : 'text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-terracota)]'
                          }`}
                        >
                          {stage.actionLabel} <ArrowRight size={10} />
                        </button>
                      ) : (
                        <span className="text-[9.5px] font-roboto font-bold uppercase tracking-wider text-gray-400">
                          {stage.actionLabel}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

          </div>

        </div>

        {/* ========================================================= */}
        {/* COLUNA DIREITA: PRODUÇÃO AO VIVO & BANCADA DO ESTÚDIO (30% - 3 colunas) */}
        {/* ========================================================= */}
        <aside className="lg:col-span-3 flex flex-col h-full min-h-0">
          <div className="glass-panel p-4 md:p-5 rounded-[2.2rem] bg-white/75 backdrop-blur-2xl border border-white/80 shadow-[0_16px_40px_rgba(40,30,25,0.05)] flex flex-col h-full min-h-0 justify-between gap-3">
            
            {/* Header do Widget de Produção com Tabs de Alternância */}
            <div className="flex flex-col gap-2 pb-2.5 border-b border-[var(--color-atelier-grafite)]/10 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-atelier-terracota)] animate-ping" />
                  <span className="font-roboto text-[8.5px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)]">
                    Ateliê Liz Design
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-orange-50 text-[var(--color-atelier-terracota)] font-roboto text-[8px] font-bold uppercase tracking-wider border border-orange-100 flex items-center gap-1">
                  <Activity size={10} /> Ao Vivo
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <h3 className="font-elegant text-lg md:text-xl text-[var(--color-atelier-grafite)] font-bold">
                  Produção
                </h3>

                {/* Segmented Control: Bancada vs Linha do Tempo */}
                <div className="flex items-center p-0.5 bg-black/[0.04] rounded-xl border border-black/[0.05]">
                  <button
                    type="button"
                    onClick={() => setProdTab('bancada')}
                    className={`px-2 py-1 rounded-lg text-[9px] font-roboto font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                      prodTab === 'bancada'
                        ? 'bg-white text-[var(--color-atelier-grafite)] shadow-2xs font-bold'
                        : 'text-gray-400 hover:text-[var(--color-atelier-grafite)]'
                    }`}
                  >
                    <Palette size={10} className={prodTab === 'bancada' ? 'text-[var(--color-atelier-terracota)]' : ''} /> Bancada
                  </button>
                  <button
                    type="button"
                    onClick={() => setProdTab('timeline')}
                    className={`px-2 py-1 rounded-lg text-[9px] font-roboto font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                      prodTab === 'timeline'
                        ? 'bg-white text-[var(--color-atelier-grafite)] shadow-2xs font-bold'
                        : 'text-gray-400 hover:text-[var(--color-atelier-grafite)]'
                    }`}
                  >
                    <Clock size={10} className={prodTab === 'timeline' ? 'text-[var(--color-atelier-terracota)]' : ''} /> Etapas
                  </button>
                </div>
              </div>
            </div>

            {/* CORPO DO WIDGET */}
            {(() => {
              const visibleTasks = dbTasks.filter(t => t.is_adhoc !== true && t.task_type !== 'gate');
              const STAGE_ORDER = ['onboarding', 'discover', 'define', 'develop', 'qa', 'present', 'client_review', 'refine', 'deliver', 'activate'];
              
              const sortedTasks = [...visibleTasks].sort((a, b) => {
                const stageA = STAGE_ORDER.indexOf(a.stage);
                const stageB = STAGE_ORDER.indexOf(b.stage);
                const sA = stageA === -1 ? 99 : stageA;
                const sB = stageB === -1 ? 99 : stageB;
                if (sA !== sB) return sA - sB;
                
                const d1 = a.deadline ? new Date(a.deadline).getTime() : 9999999999999;
                const d2 = b.deadline ? new Date(b.deadline).getTime() : 9999999999999;
                if (d1 !== d2) return d1 - d2;
                
                const aDone = ['completed', 'done', 'approved', 'archived'].includes(a.status) ? -1 : 1;
                const bDone = ['completed', 'done', 'approved', 'archived'].includes(b.status) ? -1 : 1;
                return aDone - bDone;
              });

              const tasksToRender = sortedTasks.length > 0 ? sortedTasks : pipeline;
              
              const activeTask = sortedTasks.find(t => ['in_progress', 'em_andamento'].includes(t.status))
                || sortedTasks.find(t => !['completed', 'done', 'approved', 'archived'].includes(t.status))
                || tasksToRender[3]
                || { title: "Análise do Briefing & Brand Snapshot", stage: currentPhaseNormalized };

              const currentCraft = CRAFT_STAGE_DETAILS[currentPhaseNormalized] || CRAFT_STAGE_DETAILS['define'];

              if (prodTab === 'bancada') {
                return (
                  <div className="flex-1 flex flex-col justify-between min-h-0 overflow-y-auto custom-scrollbar gap-2.5 pr-0.5">
                    {/* Card de Foco em Execução */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-white/95 to-amber-50/40 border border-white shadow-2xs flex flex-col gap-2 shrink-0">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-orange-100/70 text-[var(--color-atelier-terracota)] text-[8px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-atelier-terracota)] animate-pulse" />
                          Em Bancada Criativa
                        </span>
                        <span className="text-[9px] font-roboto font-bold text-[var(--color-atelier-terracota)]">
                          {currentCraft.rigorBadge}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-elegant text-base text-[var(--color-atelier-grafite)] font-bold leading-snug">
                          {activeTask.title}
                        </h4>
                        <p className="text-[9.5px] font-roboto text-[var(--color-atelier-grafite)]/60 font-medium mt-0.5">
                          {currentCraft.focus}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[var(--color-atelier-grafite)]/5 flex items-center justify-between text-[9px] text-gray-500 font-roboto">
                        <span>Direção: <strong>Liz Design</strong></span>
                        <span className="text-[var(--color-atelier-terracota)] font-semibold">100% Autoral</span>
                      </div>
                    </div>

                    {/* Telemetria e Critérios de Rigor Técnico */}
                    <div className="p-3 rounded-2xl bg-white/80 border border-white/90 shadow-2xs flex flex-col gap-2 shrink-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[8.5px] font-roboto uppercase font-bold tracking-widest text-gray-400 flex items-center gap-1">
                          <ShieldCheck size={11} className="text-[var(--color-atelier-terracota)]" /> Rigor Técnico
                        </span>
                        <span className="text-[8.5px] font-roboto font-bold text-gray-400">
                          {currentStageInfo.label}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {currentCraft.checklist.map((item, cIdx) => (
                          <div key={cIdx} className="flex items-center gap-2">
                            {item.status === 'done' ? (
                              <CheckCircle2 size={13} className="text-green-600 shrink-0" />
                            ) : item.status === 'doing' ? (
                              <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-atelier-terracota)] animate-pulse" />
                              </span>
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />
                            )}
                            <span className={`text-[10px] font-roboto leading-tight ${
                              item.status === 'done' 
                                ? 'text-[var(--color-atelier-grafite)]/60 line-through decoration-black/20' 
                                : item.status === 'doing'
                                  ? 'text-[var(--color-atelier-grafite)] font-bold'
                                  : 'text-gray-400'
                            }`}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Previsão do Próximo Marco */}
                    <div className="px-3 py-2 rounded-xl bg-orange-50/60 border border-orange-100 flex items-center justify-between text-[9px] font-roboto shrink-0">
                      <span className="text-[var(--color-atelier-grafite)]/70 font-medium">Próximo Marco:</span>
                      <strong className="text-[var(--color-atelier-terracota)] font-bold">{currentCraft.nextMilestone}</strong>
                    </div>

                    {/* Selo de Garantia de Excelência */}
                    <div className="p-2.5 rounded-xl bg-black/[0.02] border border-black/[0.04] text-center shrink-0">
                      <p className="text-[8.5px] font-roboto text-gray-400 uppercase tracking-widest font-semibold">
                        Design Exclusivo • 0% Templates • Alta Precisão
                      </p>
                    </div>
                  </div>
                );
              }

              // Visualização da Linha do Tempo Completa
              return (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 min-h-0">
                  <div className="relative pl-4 flex flex-col gap-2.5 py-1">
                    {tasksToRender.map((taskOrDbTask: any, idx: number) => {
                      const dbTask = sortedTasks.length > 0 ? taskOrDbTask : undefined;
                      const isDone = dbTask && ['completed', 'done', 'approved', 'archived'].includes(dbTask.status);
                      const isWorking = dbTask && ['in_progress', 'em_andamento'].includes(dbTask.status);
                      const isLast = idx === tasksToRender.length - 1;
                      const taskTitle = taskOrDbTask.title;

                      return (
                        <div key={idx} className="relative min-h-[36px] flex flex-col justify-center">
                          {/* Linha vertical conectora */}
                          {!isLast && (
                            <div className="absolute left-[3px] top-[14px] bottom-[-10px] w-[2px] bg-[var(--color-atelier-grafite)]/10 rounded-full" />
                          )}
                          
                          {!isLast && (
                            <div 
                              className="absolute left-[3px] top-[14px] bottom-[-10px] w-[2px] rounded-full transition-all duration-700 ease-out"
                              style={{ 
                                backgroundColor: isDone ? 'var(--color-atelier-terracota)' : 'transparent',
                                opacity: isDone ? 1 : 0,
                                transform: isDone ? 'scaleY(1)' : 'scaleY(0)',
                                transformOrigin: 'top'
                              }}
                            />
                          )}

                          <div className={`flex items-start gap-2.5 relative ${isDone ? "" : isWorking ? "" : "opacity-40"}`}>
                            <div 
                              className="shrink-0 mt-[3px] relative z-10 rounded-full transition-all duration-500"
                              style={{
                                width: isDone || isWorking ? '9px' : '7px',
                                height: isDone || isWorking ? '9px' : '7px',
                                backgroundColor: isDone 
                                  ? 'var(--color-atelier-terracota)' 
                                  : isWorking 
                                    ? 'white' 
                                    : '#D8D3CB',
                                border: isWorking ? '2px solid var(--color-atelier-terracota)' : 'none',
                                boxShadow: isDone 
                                  ? '0 0 6px rgba(182,128,104,0.6)' 
                                  : isWorking 
                                    ? '0 0 8px rgba(182,128,104,0.7)' 
                                    : 'none',
                                animation: isWorking ? 'pulse 2s ease-in-out infinite' : 'none'
                              }}
                            />
                            
                            <div className="flex flex-col min-w-0">
                              <span className={`font-roboto text-[11px] leading-tight truncate ${
                                isDone 
                                  ? "text-[var(--color-atelier-grafite)]/75 font-medium line-through decoration-black/20" 
                                  : isWorking 
                                    ? "text-[var(--color-atelier-terracota)] font-bold" 
                                    : "text-[var(--color-atelier-grafite)]"
                              }`}>
                                {taskTitle}
                              </span>
                              {dbTask?.deadline && !isDone && (
                                <span className="text-[8.5px] text-gray-400 font-roboto mt-0.5">
                                  Prazo: {new Date(dbTask.deadline).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {pipeline.length === 0 && dbTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-40 text-center py-8">
                      <p className="font-roboto text-xs text-[var(--color-atelier-grafite)]">
                        Aguardando início da produção das demandas.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Barra de progresso de entregas no rodapé */}
            <div className="pt-2 border-t border-[var(--color-atelier-grafite)]/10 flex items-center justify-between shrink-0">
              <span className="text-[9px] font-roboto font-bold uppercase tracking-wider text-gray-400">
                {completedTasks} de {totalTasks} concluídas
              </span>
              <div className="w-20 bg-black/5 h-1.5 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full bg-[var(--color-atelier-terracota)] rounded-full transition-all duration-500"
                  style={{ width: `${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 14}%` }}
                />
              </div>
            </div>

          </div>
        </aside>

      </div>

      {/* 🟢 MODALS DE INTERAÇÃO DO CLIENTE */}
      <AnimatePresence>
        {isDescobrirModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDescobrirModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-6xl h-full max-h-[90vh] bg-[#F0EBE1] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white">
              <div className="absolute top-6 right-6 z-[210]">
                <button onClick={() => setIsDescobrirModalOpen(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-red-500 shadow-sm border border-[var(--color-atelier-grafite)]/5 transition-colors cursor-pointer">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-auto relative z-[205]">
                <DescobrirPage />
              </div>
            </motion.div>
          </div>
        )}

        {isDirecionarModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDirecionarModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-6xl h-full max-h-[90vh] bg-[#F0EBE1] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white">
              <div className="absolute top-6 right-6 z-[210]">
                <button onClick={() => setIsDirecionarModalOpen(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-red-500 shadow-sm border border-[var(--color-atelier-grafite)]/5 transition-colors cursor-pointer">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-auto relative z-[205]">
                <DirecionarPage />
              </div>
            </motion.div>
          </div>
        )}

        {isRevelarModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRevelarModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-6xl h-full max-h-[90vh] bg-[#F0EBE1] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white">
              <div className="absolute top-6 right-6 z-[210]">
                <button onClick={() => setIsRevelarModalOpen(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-red-500 shadow-sm border border-[var(--color-atelier-grafite)]/5 transition-colors cursor-pointer">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-auto relative z-[205]">
                <RevelarPage />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
