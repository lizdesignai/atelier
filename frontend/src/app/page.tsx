"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, Eye, CheckCircle2, Loader2, Sparkles, Hammer, Presentation, 
  Package, Search, Compass, FileCheck, FileText, FolderOpen, ArrowRight,
  Calendar, Timer, Download
} from "lucide-react";
import { supabase } from "../lib/supabase"; 
import { IDV_FLOW_PIPELINE } from "./admin/analytics/constants";
import Link from "next/link";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

const IDV_STAGES = [
  { id: "descobrir", label: "Descobrir", phases: ["discover"], icon: Search, href: "/projeto/descobrir" },
  { id: "direcionar", label: "Direcionar", phases: ["define"], icon: Compass, href: "/projeto/direcionar" },
  { id: "construir", label: "Construir", phases: ["develop", "qa"], icon: Hammer, href: "/projeto/construir" },
  { id: "revelar", label: "Revelar", phases: ["present", "client_review"], icon: Presentation, href: "/projeto/revelar" },
  { id: "refinar", label: "Refinar", phases: ["refine"], icon: Sparkles, href: "/projeto/refinar" },
  { id: "ativar", label: "Ativar", phases: ["deliver", "activate"], icon: Package, href: "/projeto/ativar" },
];

const IDV_PHASE_ORDER = ['onboarding', 'discover', 'define', 'develop', 'qa', 'present', 'client_review', 'refine', 'deliver', 'activate'];

// Portfólio — grid animado com shuffle (igual login)
const BASE_LOGOS = Array.from({ length: 20 }, (_, i) => `${i + 1}`);
const DUP_LOGOS = BASE_LOGOS.map(l => l + '_dup');
const EMPTY_SLOTS = Array.from({ length: 9 }, (_, i) => 'empty_' + i);
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
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [dbTasks, setDbTasks] = useState<any[]>([]);

  // Estado do portfólio animado
  const [portfolioGrid, setPortfolioGrid] = useState<string[]>([]);
  const [depths, setDepths] = useState<Record<string, { scale: number; blur: number; opacity: number }>>({});

  useEffect(() => {
    // Inicializar grid do portfólio
    setPortfolioGrid(shuffleArray(ALL_PORTFOLIO));
    const depthMap: Record<string, { scale: number; blur: number; opacity: number }> = {};
    ALL_PORTFOLIO.forEach(item => {
      if (!item.startsWith('empty')) {
        const layer = Math.random();
        if (layer < 0.33) depthMap[item] = { scale: 0.5, blur: 5, opacity: 0.12 };
        else if (layer < 0.66) depthMap[item] = { scale: 0.75, blur: 2, opacity: 0.22 };
        else depthMap[item] = { scale: 1.0, blur: 0, opacity: 0.4 };
      }
    });
    setDepths(depthMap);

    // Shuffle periódico
    const shuffleInterval = setInterval(() => {
      setPortfolioGrid(prev => {
        const grid = [...prev];
        const filled: number[] = [];
        const empty: number[] = [];
        grid.forEach((v, i) => { if (v.startsWith('empty')) empty.push(i); else filled.push(i); });
        for (let k = 0; k < 4; k++) {
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
    }, 2500);

    return () => clearInterval(shuffleInterval);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Better to fetch from Neon:
      try {
        const { getClientActiveProjectAction } = await import('./actions/clientProject');
        const proj = await getClientActiveProjectAction();
        
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (prof) setClientProfile(prof);

        if (proj) {
          setActiveProject(proj);

          const { data: projectTasks } = await supabase
            .from('tasks')
            .select('title, status, stage, task_type')
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
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F0EBE1]">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)] opacity-50" />
      </div>
    );
  }

  const totalTasks = dbTasks.length;
  const completedTasks = dbTasks.filter(t => ['completed', 'done', 'approved', 'archived'].includes(t.status)).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const currentPhase = activeProject?.idv_phase || 'onboarding';
  const currentStage = IDV_STAGES.find(s => s.phases.includes(currentPhase));

  const deliveryDate = activeProject?.data_limite ? new Date(activeProject.data_limite) : null;
  const daysUntilDelivery = deliveryDate 
    ? Math.max(0, Math.ceil((deliveryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) 
    : null;

  const pipeline = IDV_FLOW_PIPELINE[activeProject?.idv_product || 'IDV-CORE'] || [];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6 overflow-hidden">
      
      {/* HEADER */}
      <header className="pt-4 flex flex-col gap-4 shrink-0 animate-[fadeInUp_0.8s_ease-out]">
        <div className="flex items-center gap-3 mb-1">
          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
            <img 
              src="/images/simbolo-rosa.png" 
              alt="Atelier" 
              className="w-9 h-9 object-contain drop-shadow-sm" 
            />
          </div>
          <div className="flex flex-col">
            <span className="micro-title text-[var(--color-atelier-terracota)] tracking-[0.3em]">Projeto de Identidade</span>
            <h1 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-tight">
              Sinta-se em casa, {clientProfile?.nome?.split(' ')[0] || "Cliente"}!
            </h1>
          </div>
        </div>
      </header>

      {/* BANNER STATUS + ARQUIVOS */}
      <div className="flex flex-col lg:flex-row gap-4 shrink-0 animate-[fadeInUp_1s_ease-out_0.1s_both]">
        
        {/* BANNER PRINCIPAL */}
        <div className="relative overflow-hidden rounded-[2rem] border border-white/50 shadow-sm p-6 flex-1 min-h-[100px] flex flex-col justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-[#F0EBE1] via-[var(--color-atelier-terracota)] to-[#F0EBE1] bg-[length:200%_200%] animate-[gradient_8s_ease_infinite] mix-blend-multiply transition-opacity duration-1000" style={{ opacity: 0.1 + ((progressPercent / 100) * 0.9) }}></div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[var(--color-atelier-terracota)] rounded-full blur-[80px] animate-[pulse_6s_ease-in-out_infinite]" style={{ opacity: progressPercent / 100 }}></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60 block mb-1">Projeto</span>
              <span className="font-elegant text-xl text-[var(--color-atelier-grafite)]">{clientProfile?.nome || "Cliente"}</span>
            </div>
            <div className="text-center">
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60 block mb-1">Status</span>
              <div className="bg-white/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/50 inline-block">
                <span className="font-elegant text-lg text-[var(--color-atelier-terracota)]">{currentStage?.label || "Preparação"}</span>
              </div>
            </div>
            <div className="text-center">
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60 block mb-1">Progresso</span>
              <span className="font-elegant text-xl text-[var(--color-atelier-grafite)]">{progressPercent}%</span>
            </div>
            {daysUntilDelivery !== null && (
              <div className="text-center md:text-right">
                <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60 block mb-1">Entrega em</span>
                <div className="flex items-center gap-2 justify-center md:justify-end">
                  <Timer size={16} className="text-[var(--color-atelier-terracota)]" />
                  <span className="font-elegant text-xl text-[var(--color-atelier-grafite)]">{daysUntilDelivery} dias</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ACESSO RÁPIDO A ARQUIVOS */}
        <div className="glass-panel rounded-[2rem] p-5 flex flex-col gap-3 lg:w-[200px] shrink-0">
          <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Meus Arquivos</span>
          <div className="flex flex-col gap-2">
            {activeProject?.contract_url && (
              <a href={activeProject.contract_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-roboto text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-terracota)] transition-colors">
                <FileText size={14} />
                <span>Contrato</span>
              </a>
            )}
            <Link href="/projeto/descobrir" className="flex items-center gap-2 text-sm font-roboto text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-terracota)] transition-colors">
              <FolderOpen size={14} />
              <span>Briefing</span>
            </Link>
            <Link href="/projeto/descobrir" className="flex items-center gap-2 text-sm font-roboto text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-terracota)] transition-colors">
              <Eye size={14} />
              <span>Referências</span>
            </Link>
            {activeProject?.brand_os_url && (
              <a href={activeProject.brand_os_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-roboto text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-terracota)] transition-colors">
                <Download size={14} />
                <span>Ativos</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL: PORTFÓLIO + BASTIDORES */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 animate-[fadeInUp_1s_ease-out_0.2s_both]">
        
        {/* PORTFÓLIO DO STUDIO (80%) — MOSAICO ANIMADO */}
        <div className="flex-1 lg:w-[80%] flex flex-col gap-4 min-h-0">
          <div className="glass-panel flex-1 rounded-[2.5rem] flex flex-col overflow-hidden relative">
            <div className="px-6 py-5 border-b border-[var(--color-atelier-grafite)]/10 bg-white/50 backdrop-blur-md z-10">
              <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">Portfólio do Studio</h3>
              <p className="text-[10px] font-roboto text-[var(--color-atelier-grafite)]/40 uppercase tracking-wider">Marcas que já passaram pelo nosso processo</p>
            </div>

            <div className="flex-1 overflow-hidden relative">
              <div className="absolute inset-0 grid grid-cols-7 grid-rows-7 p-4 items-center justify-items-center">
                {portfolioGrid.map((item, index) => (
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
                          initial={{ opacity: 0, filter: 'blur(16px) grayscale(100%)', scale: 0.2 }}
                          animate={{ 
                            opacity: depths[item]?.opacity || 0.2, 
                            filter: 'blur(' + (depths[item]?.blur || 3) + 'px) grayscale(100%)', 
                            scale: depths[item]?.scale || 0.6
                          }}
                          exit={{ opacity: 0, filter: 'blur(16px) grayscale(100%)', scale: 0.2 }}
                          transition={{ 
                            layout: { type: "spring", stiffness: 60, damping: 20 },
                            opacity: { duration: 1.2 },
                            filter: { duration: 1.2 }
                          }}
                          className="absolute max-w-[55%] max-h-[55%] object-contain"
                          alt=""
                        />
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BASTIDORES (20%) — Fio progressivo */}
        <div className="lg:w-[20%] min-w-[220px] flex flex-col h-full min-h-[400px]">
          <div className="glass-panel flex-1 rounded-[2.5rem] flex flex-col overflow-hidden relative">
            <div className="px-4 py-4 border-b border-[var(--color-atelier-grafite)]/10 bg-white/50 backdrop-blur-md z-10">
              <h3 className="font-elegant text-base text-[var(--color-atelier-grafite)]">Bastidores</h3>
              <p className="text-[9px] font-roboto text-[var(--color-atelier-grafite)]/40 uppercase tracking-wider">Produção ao vivo</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-5">
              <div className="relative pl-5 flex flex-col justify-between h-full min-h-fit">
                {pipeline.map((task: any, idx: number) => {
                  const dbTask = dbTasks.find(t => t.title === task.title);
                  const isDone = dbTask && ['completed', 'done', 'approved', 'archived'].includes(dbTask.status);
                  const isWorking = dbTask && ['in_progress', 'em_andamento'].includes(dbTask.status);
                  const isLast = idx === pipeline.length - 1;
                  
                  return (
                    <div key={idx} className="relative flex-1 min-h-[42px]">
                      {/* Segmento de linha — só aparece se ESTE ponto já foi concluído */}
                      {!isLast && (
                        <div 
                          className="absolute left-[4px] top-[20px] bottom-0 w-[2px] rounded-full transition-all duration-1000 ease-out"
                          style={{ 
                            backgroundColor: isDone ? 'var(--color-atelier-terracota)' : 'transparent',
                            opacity: isDone ? 1 : 0,
                            transform: isDone ? 'scaleY(1)' : 'scaleY(0)',
                            transformOrigin: 'top'
                          }}
                        ></div>
                      )}

                      <div className={
                        "flex items-start gap-3 relative " + 
                        (isDone ? "" : isWorking ? "" : "opacity-35")
                      }>
                        {/* Ponto */}
                        <div 
                          className="shrink-0 mt-[2px] relative z-10 rounded-full transition-all duration-500"
                          style={{
                            width: isDone || isWorking ? '10px' : '8px',
                            height: isDone || isWorking ? '10px' : '8px',
                            backgroundColor: isDone 
                              ? 'var(--color-atelier-terracota)' 
                              : isWorking 
                                ? 'white' 
                                : '#D8D3CB',
                            border: isWorking ? '2.5px solid var(--color-atelier-terracota)' : 'none',
                            boxShadow: isDone 
                              ? '0 0 8px rgba(182,128,104,0.6)' 
                              : isWorking 
                                ? '0 0 10px rgba(182,128,104,0.7)' 
                                : 'none',
                            animation: isWorking ? 'pulse 2s ease-in-out infinite' : 'none'
                          }}
                        ></div>
                        <span className={
                          "font-roboto text-xs leading-snug " + 
                          (isDone 
                            ? "text-[var(--color-atelier-grafite)]/80" 
                            : isWorking 
                              ? "text-[var(--color-atelier-grafite)] font-semibold" 
                              : "text-[var(--color-atelier-grafite)]")
                        }>
                          {task.title}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {pipeline.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-40 text-center py-6">
                  <Eye size={20} className="mb-2 text-[var(--color-atelier-terracota)]" />
                  <p className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]">Aguardando início<br/>da produção</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
