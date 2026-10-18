// src/app/admin/gerenciamento/page.tsx
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { useGlobalStore } from "../../../contexts/GlobalStore";
import { 
  Loader2, ChevronDown, Smartphone, 
  LayoutDashboard, Target, CalendarDays, Camera,
  Compass, BarChart3, Archive, Search, X, Check, Building, Calendar, Instagram,
  PauseCircle, Play
} from "lucide-react";

// ============================================================================
// IMPORTAÇÃO DOS MÓDULOS (VIEWS)
// ============================================================================
import VisualFlow from "./views/VisualFlow";
import BrandIdentity from "./views/BrandIdentity";
import GlobalCalendar from "./views/GlobalCalendar";
import MissionsView from "./views/MissionsView";
import PresencaDashboard from "./views/PresencaDashboard";
import PresencaDesempenho from "./views/PresencaDesempenho";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

const getSafeAvatarUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.includes('cdninstagram.com') || url.includes('fbcdn.net') || url.includes('instagram.f')) {
    return `/api/storage/instagram-photo?url=${encodeURIComponent(url)}`;
  }
  return url;
};

// ============================================================================
// COMPONENTE INTERNO: O ROTEADOR DAS ABAS (DOCK SUPERIOR DIREITO)
// ============================================================================
export function GerenciamentoWorkspace({ activeProjectId, currentProject }: { activeProjectId: string, currentProject: any }) {
  // Estado centralizado limpo: Presença como experiência principal padrão
  const [activeTab, setActiveTab] = useState<'presenca' | 'calendario' | 'posts' | 'identidade' | 'missoes' | 'desempenho'>('presenca');
  
  const tabs = [
    { id: 'presenca', label: 'Presença', icon: <Compass size={15} /> },
    { id: 'calendario', label: 'Calendário', icon: <CalendarDays size={15} /> },
    { id: 'posts', label: 'Peças', icon: <LayoutDashboard size={15} /> },
    { id: 'identidade', label: 'Diretrizes', icon: <Target size={15} /> },
    { id: 'missoes', label: 'Ativos', icon: <Archive size={15} /> },
    { id: 'desempenho', label: 'Desempenho', icon: <BarChart3 size={15} /> },
  ];

  return (
    <div className="flex flex-col w-full animate-[fadeInUp_0.5s_ease-out] relative">
      
      {/* ÁREA DE RENDERIZAÇÃO ISOLADA */}
      <div className="relative pb-16">
        <AnimatePresence mode="wait">

          {activeTab === 'presenca' && (
            <motion.div key="presenca" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <PresencaDashboard activeProjectId={activeProjectId} currentProject={currentProject} />
            </motion.div>
          )}
          
          {activeTab === 'calendario' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <GlobalCalendar activeProjectId={activeProjectId} currentProject={currentProject} />
            </motion.div>
          )}

          {activeTab === 'posts' && (
            <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <VisualFlow activeProjectId={activeProjectId} currentProject={currentProject} />
            </motion.div>
          )}

          {activeTab === 'identidade' && (
            <motion.div key="identidade" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <BrandIdentity activeProjectId={activeProjectId} currentProject={currentProject} />
            </motion.div>
          )}

          {activeTab === 'missoes' && (
            <motion.div key="missoes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <MissionsView activeProjectId={activeProjectId} currentProject={currentProject} />
            </motion.div>
          )}

          {activeTab === 'desempenho' && (
            <motion.div key="desempenho" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <PresencaDesempenho activeProjectId={activeProjectId} currentProject={currentProject} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* =====================================================================
          MENU DE NAVEGAÇÃO FLUTUANTE DISCRETO (CAPSULE DOCK) - OCULTADO
          ===================================================================== */}
      {/* Ocultado conforme solicitação do usuário: visual limpo e imersivo no Presença 2.0 */}

    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL (O HOST DA ROTA ADMIN)
// ============================================================================
export function GerenciamentoInstagram() {
  const searchParams = useSearchParams();
  const urlProjectId = searchParams?.get('projectId');
  const { setActiveProjectId: setGlobalActiveProjectId } = useGlobalStore();

  const [isLoading, setIsLoading] = useState(true);
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchInstagramProjects = async () => {
      try {
        // 1. Tenta carregar via endpoint dedicado de alta fidelidade
        let projects: any[] = [];
        try {
          const res = await fetch('/api/presenca/projects');
          if (res.ok) {
            const json = await res.json();
            projects = json.data || [];
          }
        } catch (e) {
          console.warn('[Gerenciamento] Falha ao consultar /api/presenca/projects, usando fallback.');
        }

        // 2. Fallback via Neon Proxy caso endpoint direto falhe
        if (!projects || projects.length === 0) {
          const { data, error } = await supabase
            .from('projects')
            .select('*, profiles(nome, avatar_url, empresa, instagram, email)')
            .in('status', ['active', 'delivered', 'archived', 'completed', 'paused'])
            .order('created_at', { ascending: false });

          if (error) throw error;
          projects = (data || []).filter((p: any) => 
            p.service_type === 'Gestão de Instagram' || 
            (p.type && (p.type.includes('Instagram') || p.type.startsWith('Pacote')))
          );
        }

        if (projects && projects.length > 0) {
          setDbProjects(projects);
          
          // Se houver projectId na URL e ele existir na lista, seleciona-o
          const matched = urlProjectId ? projects.find((p: any) => p.id === urlProjectId) : null;
          const targetId = matched ? matched.id : projects[0].id;
          setActiveProjectId(targetId);
          setGlobalActiveProjectId(targetId);
        }
      } catch (error) {
        console.error("Erro ao carregar clientes do Instagram:", error);
        showToast("Erro ao carregar os clientes.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstagramProjects();
  }, [urlProjectId, setGlobalActiveProjectId]);

  const currentProject = dbProjects.find(p => p.id === activeProjectId);

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setGlobalActiveProjectId(projectId);
    setIsClientMenuOpen(false);
    setSearchTerm("");
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('projectId', projectId);
      window.history.replaceState(null, '', url.toString());
    }
  };

  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const handleToggleContractPause = async (projectId: string, currentStatus: string) => {
    const isPaused = currentStatus === 'paused';
    const actionLabel = isPaused ? 'reativar' : 'pausar';
    const confirm = window.confirm(
      isPaused 
        ? 'Deseja reativar o contrato deste cliente de Gerenciamento de Instagram? Ele voltará a contar como projeto ativo nas métricas e relatórios.'
        : 'Deseja pausar o contrato deste cliente de Gerenciamento de Instagram? Ele deixará de contar como projeto ativo nas métricas e relatórios até ser reativado.'
    );
    if (!confirm) return;

    setIsTogglingStatus(true);
    try {
      const endpoint = isPaused ? `/api/projects/${projectId}/reactivate` : `/api/projects/${projectId}/pause`;
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erro ao ${actionLabel} contrato`);
      }

      const newStatus = isPaused ? 'active' : 'paused';
      setDbProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
      showToast(isPaused ? 'Contrato reativado com sucesso!' : 'Contrato pausado com sucesso!');
      window.dispatchEvent(new CustomEvent('jtbdRefreshNeeded'));
    } catch (e: any) {
      console.error(`Erro ao ${actionLabel} contrato:`, e);
      showToast(e.message || `Erro ao ${actionLabel} contrato`);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return dbProjects;
    const term = searchTerm.toLowerCase();
    return dbProjects.filter((p: any) => {
      const nome = (p.profiles?.nome || '').toLowerCase();
      const empresa = (p.profiles?.empresa || '').toLowerCase();
      const tipo = (p.type || '').toLowerCase();
      const ig = (p.profiles?.instagram || '').toLowerCase();
      return nome.includes(term) || empresa.includes(term) || tipo.includes(term) || ig.includes(term);
    });
  }, [dbProjects, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex h-auto min-h-[calc(100dvh-60px)] md:h-screen items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-auto min-h-[calc(100dvh-100px)] md:h-[calc(100vh-100px)] gap-4 opacity-40">
        <Smartphone size={48} className="text-[var(--color-atelier-grafite)]" />
        <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Nenhum Cliente Ativo.</h2>
      </div>
    );
  }

  const clientDisplayName = currentProject.profiles?.nome || currentProject.profiles?.empresa || "Cliente Operacional";
  const clientCompany = currentProject.profiles?.empresa;
  const clientInstagram = currentProject.profiles?.instagram;
  const rawAvatar = currentProject.profiles?.avatar_url || currentProject.igProfile?.avatar_url;
  const safeClientAvatar = getSafeAvatarUrl(rawAvatar);
  const clientInitial = (clientDisplayName.trim().charAt(0) || "C").toUpperCase();
  const billingDay = currentProject.billing_date ? new Date(currentProject.billing_date).getUTCDate() : null;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-60px)] max-w-[1400px] w-full mx-auto relative z-10 pt-8 pb-16 px-4 md:px-8 gap-6 overflow-y-auto">
      
      {/* 🟢 FUNDO IMERSIVO PROFISSIONAL (GLOW EFEITO VIDRO) */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-[-1] overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-[var(--color-atelier-terracota)]/10 blur-[140px] rounded-full"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full"
        />
      </div>

      {/* CABEÇALHO SUPERIOR (SELEÇÃO DE CLIENTE) */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-0 shrink-0 animate-[fadeInUp_0.5s_ease-out] relative z-20">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-terracota)]/20 shadow-md flex items-center justify-center text-[var(--color-atelier-terracota)] font-elegant text-3xl overflow-hidden shrink-0 transition-transform hover:scale-105">
             {safeClientAvatar ? (
               <img 
                 src={safeClientAvatar} 
                 alt={clientDisplayName} 
                 referrerPolicy="no-referrer"
                 className="w-full h-full object-cover" 
                 onError={(e) => {
                   (e.target as HTMLElement).style.display = 'none';
                 }}
               />
             ) : (
               <span className="font-bold">{clientInitial}</span>
             )}
          </div>
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`px-2.5 py-0.5 rounded-lg text-[9px] uppercase tracking-widest font-bold border shadow-inner
                ${currentProject.status === 'paused' ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                : currentProject.status === 'archived' ? 'bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] border-[var(--color-atelier-grafite)]/20' 
                : currentProject.status === 'delivered' ? 'bg-orange-500/10 text-orange-700 border-orange-500/20' 
                : 'bg-green-500/10 text-green-700 border-green-500/20'}`}>
                {currentProject.status === 'paused' ? 'Contrato Pausado' : currentProject.status === 'archived' ? 'Arquivado' : currentProject.status === 'delivered' ? 'Entregue' : 'Em Andamento'}
              </span>
              <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] flex items-center gap-1">
                <Smartphone size={12}/> Gestão de Instagram
              </span>
              {currentProject.type && (
                <span className="px-2 py-0.5 rounded-md text-[9px] font-roboto font-bold uppercase tracking-wider bg-black/5 text-[var(--color-atelier-grafite)]/70">
                  {currentProject.type}
                </span>
              )}
              {billingDay && (
                <span className="px-2 py-0.5 rounded-md text-[9px] font-roboto font-bold uppercase tracking-wider bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)]">
                  Renovação: Dia {billingDay}
                </span>
              )}
              {/* Botão de Pausar / Reativar Contrato */}
              {currentProject.status === 'paused' ? (
                <button
                  onClick={() => handleToggleContractPause(currentProject.id, currentProject.status)}
                  disabled={isTogglingStatus}
                  className="px-2.5 py-0.5 rounded-lg text-[9px] font-roboto font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                  title="Reativar Contrato de Instagram"
                >
                  <Play size={10} />
                  <span>Reativar Contrato</span>
                </button>
              ) : currentProject.status === 'active' ? (
                <button
                  onClick={() => handleToggleContractPause(currentProject.id, currentProject.status)}
                  disabled={isTogglingStatus}
                  className="px-2.5 py-0.5 rounded-lg text-[9px] font-roboto font-bold uppercase tracking-wider bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border border-amber-200 transition-all flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                  title="Pausar Contrato de Instagram"
                >
                  <PauseCircle size={10} />
                  <span>Pausar Contrato</span>
                </button>
              ) : null}
            </div>
            
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsClientMenuOpen(!isClientMenuOpen)}>
              <div className="flex flex-col">
                <h1 className="font-elegant text-3xl md:text-4xl text-[var(--color-atelier-grafite)] leading-none flex items-center gap-2 group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate max-w-[300px] md:max-w-xl">
                  {clientDisplayName} 
                  <ChevronDown size={20} className={`text-[var(--color-atelier-grafite)]/40 transition-transform duration-300 shrink-0 ${isClientMenuOpen ? 'rotate-180' : ''}`} />
                </h1>
                {(clientCompany || clientInstagram) && (
                  <span className="text-xs text-[var(--color-atelier-grafite)]/60 font-roboto mt-1 flex items-center gap-2">
                    {clientCompany && <span>{clientCompany}</span>}
                    {clientCompany && clientInstagram && <span>•</span>}
                    {clientInstagram && <span className="text-[var(--color-atelier-terracota)] font-medium">@{clientInstagram.replace('@', '')}</span>}
                  </span>
                )}
              </div>
            </div>
            
            {/* DROPDOWN DE CLIENTES COM BUSCA */}
            <AnimatePresence>
              {isClientMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                  transition={{ duration: 0.2 }}
                  className="absolute top-[110%] left-0 w-[calc(100vw-3rem)] max-w-[360px] md:max-w-none md:w-[440px] bg-white/95 backdrop-blur-2xl border border-white shadow-[0_25px_60px_rgba(122,116,112,0.2)] rounded-[2rem] overflow-hidden z-50 flex flex-col py-2"
                >
                  <div className="px-5 py-2.5 border-b border-[var(--color-atelier-grafite)]/5 flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">
                      Selecione o Cliente ({dbProjects.length})
                    </span>
                    <span className="text-[9px] font-roboto font-semibold text-[var(--color-atelier-terracota)]">
                      Gestão Ativa
                    </span>
                  </div>

                  {/* Campo de Busca Rápida */}
                  <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50/60">
                    <Search size={14} className="text-gray-400 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Buscar por cliente, empresa ou pacote..." 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)} 
                      autoFocus
                      className="w-full bg-transparent text-xs font-roboto outline-none text-[var(--color-atelier-grafite)] placeholder:text-gray-400" 
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400">
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Lista de Clientes */}
                  <div className="max-h-[380px] overflow-y-auto custom-scrollbar divide-y divide-gray-50">
                    {filteredProjects.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400 font-roboto">
                        Nenhum cliente encontrado para "{searchTerm}".
                      </div>
                    ) : (
                      filteredProjects.map(p => {
                        const isSelected = p.id === activeProjectId;
                        const pName = p.profiles?.nome || p.profiles?.empresa || "Cliente sem nome";
                        const pEmpresa = p.profiles?.empresa;
                        const pAvatar = p.profiles?.avatar_url;
                        const safePAvatar = getSafeAvatarUrl(pAvatar);
                        const pInitial = (pName.trim().charAt(0) || "C").toUpperCase();
                        const pBillingDay = p.billing_date ? new Date(p.billing_date).getUTCDate() : null;

                        return (
                          <div 
                            key={p.id} 
                            onClick={() => handleSelectProject(p.id)}
                            className={`px-5 py-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-[var(--color-atelier-terracota)]/10 font-bold' 
                                : 'hover:bg-[var(--color-atelier-grafite)]/5'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl border border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] flex items-center justify-center overflow-hidden text-sm font-bold shrink-0 shadow-inner">
                                {safePAvatar ? (
                                  <img 
                                    src={safePAvatar} 
                                    alt={pName} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span>{pInitial}</span>
                                )}
                              </div>
                              <div className="flex flex-col truncate">
                                <div className="flex items-center gap-2">
                                  <span className={`font-roboto text-[13px] truncate ${isSelected ? 'font-bold text-[var(--color-atelier-terracota)]' : 'font-medium text-[var(--color-atelier-grafite)]'}`}>
                                    {pName}
                                  </span>
                                  {p.current_cycle?.cycle_number && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-atelier-terracota)]/15 text-[var(--color-atelier-terracota)] font-bold shrink-0">
                                      Ciclo {p.current_cycle.cycle_number}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-roboto mt-0.5 truncate">
                                  {pEmpresa && <span className="font-medium text-gray-600 truncate">{pEmpresa}</span>}
                                  {pEmpresa && <span>•</span>}
                                  <span className="uppercase tracking-wider font-semibold">{p.type || 'Instagram'}</span>
                                  {pBillingDay && <span>• Dia {pBillingDay}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold border ${
                                p.status === 'paused' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                p.status === 'delivered' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                'bg-gray-100 text-gray-600 border-gray-200'
                              }`}>
                                {p.status === 'paused' ? 'Pausado' : p.status === 'active' ? 'Ativo' : p.status === 'delivered' ? 'Entregue' : 'Arquivado'}
                              </span>
                              {isSelected && <Check size={14} className="text-[var(--color-atelier-terracota)]" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* RENDERIZAÇÃO DO PAINEL DE TRABALHO */}
      <GerenciamentoWorkspace activeProjectId={activeProjectId as string} currentProject={currentProject} />
    </div>
  );
}

export default function GerenciamentoPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-roboto text-[10px] uppercase tracking-widest opacity-50">Carregando Painel...</div>}>
      <GerenciamentoInstagram />
    </Suspense>
  );
}