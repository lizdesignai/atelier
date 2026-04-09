// src/app/admin/gerenciamento/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { 
  Loader2, ChevronDown, Smartphone, 
  BrainCircuit, LayoutDashboard, Target, CalendarDays, BarChart3 
} from "lucide-react";

// ============================================================================
// IMPORTAÇÃO DOS MÓDULOS (VIEWS)
// ============================================================================
import MonthlyPlanningDashboard from "./views/MonthlyPlanningDashboard";
import VisualFlow from "./views/VisualFlow";
import BrandIdentity from "./views/BrandIdentity";
import GlobalCalendar from "./views/GlobalCalendar";
import RelatoriosView from "./views/RelatoriosView"; // 🟢 A NOVA VIEW

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ============================================================================
// COMPONENTE INTERNO: O ROTEADOR DAS ABAS (WORKSPACE)
// ============================================================================
export function GerenciamentoWorkspace({ activeProjectId, currentProject }: { activeProjectId: string, currentProject: any }) {
  // Estado centralizado para gerir a navegação entre os módulos (Agora inclui 'relatorios')
  const [activeTab, setActiveTab] = useState<'calendario' | 'planeamento_mensal' | 'posts' | 'identidade' | 'relatorios'>('calendario');

  return (
    <div className="flex flex-col gap-6 w-full animate-[fadeInUp_0.5s_ease-out] flex-1 min-h-0">
      
      {/* MENU DE NAVEGAÇÃO MODULAR (Glass Pill) */}
      <div className="glass-panel p-2 rounded-[1.5rem] flex gap-2 overflow-x-auto custom-scrollbar shrink-0 shadow-sm border border-white">
        {[
          { id: 'calendario', label: 'Analytics & Calendário', icon: <CalendarDays size={14} /> },
          { id: 'planeamento_mensal', label: 'Planeamento Estratégico & IA', icon: <BrainCircuit size={14} /> },
          { id: 'posts', label: 'Fluxo de Arte Visual', icon: <LayoutDashboard size={14} /> },
          { id: 'identidade', label: 'DNA da Marca & Briefing', icon: <Target size={14} /> },
          { id: 'relatorios', label: 'Auditoria C-Level', icon: <BarChart3 size={14} /> }, // 🟢 NOVA ABA REGISTADA
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 rounded-[1rem] font-roboto text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap
              ${activeTab === tab.id ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md scale-[1.02]' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/60 hover:text-[var(--color-atelier-grafite)]'}
            `}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ÁREA DE RENDERIZAÇÃO ISOLADA (LAZY LOADING LOCAL) */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          
          {activeTab === 'calendario' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
              <GlobalCalendar activeProjectId={activeProjectId} currentProject={currentProject} />
            </motion.div>
          )}

          {activeTab === 'planeamento_mensal' && (
            <motion.div key="planning" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
              <MonthlyPlanningDashboard activeProjectId={activeProjectId} currentProject={currentProject} />
            </motion.div>
          )}

          {activeTab === 'posts' && (
            <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
              <VisualFlow activeProjectId={activeProjectId} currentProject={currentProject} />
            </motion.div>
          )}

          {activeTab === 'identidade' && (
            <motion.div key="identidade" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
              <BrandIdentity activeProjectId={activeProjectId} currentProject={currentProject} />
            </motion.div>
          )}

          {/* 🟢 RENDERIZAÇÃO DA NOVA VIEW CORRIGIDA */}
          {activeTab === 'relatorios' && (
            <motion.div key="relatorios" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
              <RelatoriosView activeProjectId={activeProjectId} currentProject={currentProject} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL (O HOST DA ROTA ADMIN)
// ============================================================================
export function GerenciamentoInstagram() {
  const [isLoading, setIsLoading] = useState(true);
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);

  // O Host carrega APENAS a lista de projetos. Super leve e otimizado.
  useEffect(() => {
    const fetchInstagramProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*, profiles(nome, avatar_url, empresa, instagram)')
          .or('service_type.eq.Gestão de Instagram,type.ilike.%Instagram%')
          .in('status', ['active', 'delivered', 'archived'])
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data && data.length > 0) {
          setDbProjects(data);
          setActiveProjectId(data[0].id);
        }
      } catch (error) {
        showToast("Erro ao carregar os clientes.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInstagramProjects();
  }, []);

  const currentProject = dbProjects.find(p => p.id === activeProjectId);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-4 opacity-40">
        <Smartphone size={48} className="text-[var(--color-atelier-grafite)]" />
        <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Nenhum Cliente Ativo.</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pt-8 pb-6 px-4 gap-6">
      
      {/* CABEÇALHO SUPERIOR (SELEÇÃO DE CLIENTE) */}
      <header className="flex justify-between items-end shrink-0 animate-[fadeInUp_0.5s_ease-out] relative z-20">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-terracota)]/20 shadow-sm flex items-center justify-center text-[var(--color-atelier-terracota)] font-elegant text-3xl overflow-hidden shrink-0 transition-transform hover:scale-105">
             {currentProject.profiles?.avatar_url ? (
               <img src={currentProject.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover opacity-90" />
             ) : (
               currentProject.profiles?.nome?.charAt(0) || "C"
             )}
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-1">
              <span className={`px-3 py-1 rounded-lg text-[9px] uppercase tracking-widest font-bold border shadow-inner
                ${currentProject.status === 'archived' ? 'bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] border-[var(--color-atelier-grafite)]/20' 
                : currentProject.status === 'delivered' ? 'bg-orange-500/10 text-orange-700 border-orange-500/20' 
                : 'bg-green-500/10 text-green-700 border-green-500/20'}`}>
                {currentProject.status === 'archived' ? 'Arquivado' : currentProject.status === 'delivered' ? 'Entregue' : 'Ativo'}
              </span>
              <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] flex items-center gap-1">
                <Smartphone size={12}/> Gestão de Instagram
              </span>
            </div>
            
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsClientMenuOpen(!isClientMenuOpen)}>
              <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none flex items-center gap-2 group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate max-w-[300px] md:max-w-md">
                {currentProject.profiles?.nome || "Cliente"} 
                <ChevronDown size={20} className={`text-[var(--color-atelier-grafite)]/40 transition-transform duration-300 shrink-0 ${isClientMenuOpen ? 'rotate-180' : ''}`} />
              </h1>
            </div>
            
            {/* DROPDOWN DE CLIENTES - Glassmorphism Premium */}
            <AnimatePresence>
              {isClientMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.2 }}
                  className="absolute top-[110%] left-0 w-[300px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(122,116,112,0.15)] rounded-2xl overflow-hidden z-50 flex flex-col py-2"
                >
                  <div className="px-4 py-2 border-b border-[var(--color-atelier-grafite)]/5 text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Selecione o Cliente</div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {dbProjects.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => { setActiveProjectId(p.id); setIsClientMenuOpen(false); }}
                        className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${p.id === activeProjectId ? 'bg-[var(--color-atelier-terracota)]/5' : 'hover:bg-[var(--color-atelier-grafite)]/5'}`}
                      >
                        <div className="w-8 h-8 rounded-xl border border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] flex items-center justify-center overflow-hidden text-xs font-bold shrink-0 shadow-inner">
                          {p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : p.profiles?.nome?.charAt(0)}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className={`font-roboto text-[13px] truncate ${p.id === activeProjectId ? 'font-bold text-[var(--color-atelier-terracota)]' : 'font-medium text-[var(--color-atelier-grafite)]'}`}>{p.profiles?.nome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* RENDERIZAÇÃO DO WORKSPACE */}
      <GerenciamentoWorkspace activeProjectId={activeProjectId as string} currentProject={currentProject} />
    </div>
  );
}

export default function GerenciamentoPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-roboto text-[10px] uppercase tracking-widest opacity-50">A Carregar Dashboard...</div>}>
      <GerenciamentoInstagram />
    </Suspense>
  );
}