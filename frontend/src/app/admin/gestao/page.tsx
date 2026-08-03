// src/app/admin/gestao/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { Loader2, ShieldAlert, Activity, Users, DollarSign, Layers } from "lucide-react";

// Importação dos Pilares de Gestão (Alta Direção)
import PulseDashboard from "./views/PulseDashboard";
import WorkforceDashboard from "./views/WorkforceDashboard";
import EconomicsDashboard from "./views/EconomicsDashboard";
import DemandsDashboard from "./views/DemandsDashboard"; // 🟢 O NOVO PILAR IMPORTADO

// Importação do Espelho do Colaborador (Operação)
import PersonalProductivity from "./views/PersonalProductivity";

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
      <div className="flex h-auto min-h-[calc(100dvh-60px)] md:h-[calc(100vh-60px)] items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex h-auto min-h-[calc(100dvh-60px)] md:h-[calc(100vh-60px)] flex-col items-center justify-center text-center gap-4">
        <ShieldAlert size={48} className="text-red-500" />
        <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Acesso Negado</h2>
        <p className="text-gray-500 font-roboto">Não foi possível validar as suas credenciais de acesso.</p>
      </div>
    );
  }

  const isAdminOrManager = currentUser.role === 'admin' || currentUser.role === 'gestor';

  return (
    <div className="flex flex-col h-auto min-h-full md:h-full max-w-[1500px] mx-auto relative z-10 px-4 md:px-0 pt-2 pb-4 overflow-y-auto md:overflow-hidden">
      
      {isAdminOrManager ? (
        <div className="flex flex-col h-auto md:h-full gap-4 md:min-h-0">
          
          {/* RENDERIZADOR DINÂMICO DE VISÕES */}
          <div className="flex-1 min-h-0 relative">
            <AnimatePresence mode="wait">
              {activeTab === 'pulse' && (
                <motion.div 
                  key="pulse" 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                  transition={{ duration: 0.2 }} className="absolute inset-0 h-full"
                >
                  <PulseDashboard currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} />
                </motion.div>
              )}
              {activeTab === 'demands' && (
                <motion.div 
                  key="demands" 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                  transition={{ duration: 0.2 }} className="absolute inset-0 h-full"
                >
                  <DemandsDashboard currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} />
                </motion.div>
              )}
              {activeTab === 'workforce' && (
                <motion.div 
                  key="workforce" 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                  transition={{ duration: 0.2 }} className="absolute inset-0 h-full"
                >
                  <WorkforceDashboard currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} />
                </motion.div>
              )}
              {activeTab === 'economics' && (
                <motion.div 
                  key="economics" 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                  transition={{ duration: 0.2 }} className="absolute inset-0 h-full"
                >
                  <EconomicsDashboard currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} />
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