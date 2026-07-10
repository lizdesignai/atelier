// src/app/admin/gestao/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { Loader2, ShieldAlert, Activity, Users, DollarSign, Layers } from "lucide-react";

// Importação dos Pilares de Gestão (Alta Direção)
import dynamic from "next/dynamic";

const PulseDashboard = dynamic(() => import("./views/PulseDashboard"), { ssr: false });
const WorkforceDashboard = dynamic(() => import("./views/WorkforceDashboard"), { ssr: false });
const EconomicsDashboard = dynamic(() => import("./views/EconomicsDashboard"), { ssr: false });
const DemandsDashboard = dynamic(() => import("./views/DemandsDashboard"), { ssr: false });
const PersonalProductivity = dynamic(() => import("./views/PersonalProductivity"), { ssr: false });

export default function GestaoPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // 🟢 Adicionado 'demands' aos tipos de abas ativas
  const [activeTab, setActiveTab] = useState<'pulse' | 'workforce' | 'economics' | 'demands'>('pulse');

  useEffect(() => {
    const authenticateAndRoute = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = "/login";
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setCurrentUser(profile);
      } catch (error) {
        console.error("Erro na autenticação do Módulo de Gestão:", error);
      } finally {
        setIsLoading(false);
      }
    };

    authenticateAndRoute();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-60px)] items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex h-[calc(100vh-60px)] flex-col items-center justify-center text-center gap-4">
        <ShieldAlert size={48} className="text-red-500" />
        <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Acesso Negado</h2>
        <p className="text-gray-500 font-roboto">Não foi possível validar as suas credenciais de acesso.</p>
      </div>
    );
  }

  const isAdminOrManager = currentUser.role === 'admin' || currentUser.role === 'gestor';

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 px-4 md:px-0 pt-6 pb-6">
      
      {isAdminOrManager ? (
        <div className="flex flex-col h-full gap-4">
          
          {/* NAVEGAÇÃO ESTRATÉGICA (TAB SWITCHER ATUALIZADO) */}
          <div className="flex justify-center md:justify-start shrink-0">
            <div className="bg-white/60 border border-white p-1.5 rounded-2xl shadow-sm flex items-center shrink-0 w-full md:w-auto overflow-x-auto custom-scrollbar">
              <button 
                onClick={() => setActiveTab('pulse')} 
                className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'pulse' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}
              >
                <Activity size={14} /> Pulso Live
              </button>
              {/* 🟢 NOVA ABA INSERIDA NA UX */}
              <button 
                onClick={() => setActiveTab('demands')} 
                className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'demands' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}
              >
                <Layers size={14} /> Demandas
              </button>
              <button 
                onClick={() => setActiveTab('workforce')} 
                className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'workforce' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}
              >
                <Users size={14} /> Equipe & RH
              </button>
              <button 
                onClick={() => setActiveTab('economics')} 
                className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'economics' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}
              >
                <DollarSign size={14} /> Unit Economics
              </button>
            </div>
          </div>

          {/* RENDERIZADOR DINÂMICO DE VISÕES */}
          <div className="flex-1 min-h-0 relative">
            <AnimatePresence mode="wait">
              {activeTab === 'pulse' && (
                <motion.div 
                  key="pulse" 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                  transition={{ duration: 0.2 }} className="absolute inset-0 h-full"
                >
                  <PulseDashboard currentUser={currentUser} />
                </motion.div>
              )}
              {/* 🟢 RENDER DA NOVA TELA */}
              {activeTab === 'demands' && (
                <motion.div 
                  key="demands" 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                  transition={{ duration: 0.2 }} className="absolute inset-0 h-full"
                >
                  <DemandsDashboard currentUser={currentUser} />
                </motion.div>
              )}
              {activeTab === 'workforce' && (
                <motion.div 
                  key="workforce" 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                  transition={{ duration: 0.2 }} className="absolute inset-0 h-full"
                >
                  <WorkforceDashboard currentUser={currentUser} />
                </motion.div>
              )}
              {activeTab === 'economics' && (
                <motion.div 
                  key="economics" 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                  transition={{ duration: 0.2 }} className="absolute inset-0 h-full"
                >
                  <EconomicsDashboard currentUser={currentUser} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
        </div>
      ) : (
        /* VISÃO PROTEGIDA DO COLABORADOR */
        <PersonalProductivity currentUser={currentUser} />
      )}
      
    </div>
  );
}