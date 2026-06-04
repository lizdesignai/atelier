// src/app/admin/gerenciamento/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { 
  Loader2, ChevronDown, Smartphone, 
  LayoutDashboard, Target, CalendarDays, Camera
} from "lucide-react";

// ============================================================================
// IMPORTAÇÃO DOS MÓDULOS (VIEWS)
// ============================================================================
import VisualFlow from "./views/VisualFlow";
import BrandIdentity from "./views/BrandIdentity";
import GlobalCalendar from "./views/GlobalCalendar";
import MissionsView from "./views/MissionsView";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ============================================================================
// COMPONENTE INTERNO: O ROTEADOR DAS ABAS (DOCK SUPERIOR DIREITO)
// ============================================================================
export function GerenciamentoWorkspace({ activeProjectId, currentProject }: { activeProjectId: string, currentProject: any }) {
  // Estado centralizado limpo
  const [activeTab, setActiveTab] = useState<'calendario' | 'posts' | 'identidade' | 'missoes'>('calendario');
  
  const tabs = [
    { id: 'calendario', label: 'Analytics & Calendário', icon: <CalendarDays size={20} /> },
    { id: 'posts', label: 'Peças Gráficas', icon: <LayoutDashboard size={20} /> },
    { id: 'identidade', label: 'Diretrizes & Briefing', icon: <Target size={20} /> },
    { id: 'missoes', label: 'Solicitações e Arquivos', icon: <Camera size={20} /> },
  ];

  return (
    <div className="flex flex-col w-full animate-[fadeInUp_0.5s_ease-out] flex-1 min-h-0 relative">
      
      {/* ÁREA DE RENDERIZAÇÃO ISOLADA */}
      <div className="flex-1 min-h-0 relative pb-6">
        <AnimatePresence mode="wait">
          
          {activeTab === 'calendario' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
              <GlobalCalendar activeProjectId={activeProjectId} currentProject={currentProject} />
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

          {activeTab === 'missoes' && (
            <motion.div key="missoes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
              <MissionsView activeProjectId={activeProjectId} currentProject={currentProject} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* =====================================================================
          MENU DE NAVEGAÇÃO FLUTUANTE (DOCK TOPO-DIREITA)
          ===================================================================== */}
      <div className="fixed top-8 right-4 md:right-8 z-[100] flex justify-end">
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex items-center gap-2 p-2 bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-full opacity-40 hover:opacity-100 transition-opacity duration-300 group"
        >
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center justify-center rounded-full transition-all duration-500 overflow-hidden
                  ${isActive 
                    ? 'bg-[var(--color-atelier-grafite)] text-white shadow-lg h-14 px-6' 
                    : 'bg-transparent text-[var(--color-atelier-grafite)]/50 hover:bg-white hover:text-[var(--color-atelier-grafite)] hover:shadow-sm w-12 h-12'
                  }
                `}
                title={!isActive ? tab.label : undefined}
              >
                <div className="shrink-0 relative z-10 flex items-center justify-center">
                  {tab.icon}
                </div>
                
                <AnimatePresence>
                  {isActive && (
                    <motion.div 
                      initial={{ width: 0, opacity: 0, paddingLeft: 0 }}
                      animate={{ width: "auto", opacity: 1, paddingLeft: 10 }}
                      exit={{ width: 0, opacity: 0, paddingLeft: 0 }}
                      className="font-roboto text-[11px] font-bold uppercase tracking-widest whitespace-nowrap z-10"
                    >
                      {tab.label}
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            )
          })}
        </motion.div>
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
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] w-full mx-auto relative z-10 pt-8 pb-6 px-4 md:px-8 gap-6">
      
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
      <header className="flex justify-between items-end shrink-0 animate-[fadeInUp_0.5s_ease-out] relative z-20">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-terracota)]/20 shadow-md flex items-center justify-center text-[var(--color-atelier-terracota)] font-elegant text-3xl overflow-hidden shrink-0 transition-transform hover:scale-105">
             {currentProject.profiles?.avatar_url ? (
               <img src={currentProject.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover opacity-95" />
             ) : (
               currentProject.profiles?.nome?.charAt(0) || "C"
             )}
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-1.5">
              <span className={`px-3 py-1 rounded-lg text-[9px] uppercase tracking-widest font-bold border shadow-inner
                ${currentProject.status === 'archived' ? 'bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] border-[var(--color-atelier-grafite)]/20' 
                : currentProject.status === 'delivered' ? 'bg-orange-500/10 text-orange-700 border-orange-500/20' 
                : 'bg-green-500/10 text-green-700 border-green-500/20'}`}>
                {currentProject.status === 'archived' ? 'Arquivado' : currentProject.status === 'delivered' ? 'Entregue' : 'Em Andamento'}
              </span>
              <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] flex items-center gap-1">
                <Smartphone size={12}/> Gestão de Instagram
              </span>
            </div>
            
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsClientMenuOpen(!isClientMenuOpen)}>
              <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none flex items-center gap-2 group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate max-w-[300px] md:max-w-xl">
                {currentProject.profiles?.nome || "Cliente"} 
                <ChevronDown size={20} className={`text-[var(--color-atelier-grafite)]/40 transition-transform duration-300 shrink-0 ${isClientMenuOpen ? 'rotate-180' : ''}`} />
              </h1>
            </div>
            
            {/* DROPDOWN DE CLIENTES */}
            <AnimatePresence>
              {isClientMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.2 }}
                  className="absolute top-[110%] left-0 w-[300px] md:w-[400px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(122,116,112,0.15)] rounded-[2rem] overflow-hidden z-50 flex flex-col py-2"
                >
                  <div className="px-5 py-3 border-b border-[var(--color-atelier-grafite)]/5 text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Selecione o Cliente Operacional</div>
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                    {dbProjects.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => { setActiveProjectId(p.id); setIsClientMenuOpen(false); }}
                        className={`px-5 py-4 flex items-center gap-4 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${p.id === activeProjectId ? 'bg-[var(--color-atelier-terracota)]/5' : 'hover:bg-[var(--color-atelier-grafite)]/5'}`}
                      >
                        <div className="w-10 h-10 rounded-xl border border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] flex items-center justify-center overflow-hidden text-sm font-bold shrink-0 shadow-inner">
                          {p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : p.profiles?.nome?.charAt(0)}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className={`font-roboto text-[14px] truncate ${p.id === activeProjectId ? 'font-bold text-[var(--color-atelier-terracota)]' : 'font-medium text-[var(--color-atelier-grafite)]'}`}>{p.profiles?.nome}</span>
                          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5 truncate">{p.profiles?.empresa || p.type}</span>
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