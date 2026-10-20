// src/app/tessera/productivity/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Loader2, Activity, Users, DollarSign, Layers, ShieldAlert } from 'lucide-react';
import PulseDashboard from '@/app/admin/gestao/views/PulseDashboard';
import DemandsDashboard from '@/app/admin/gestao/views/DemandsDashboard';
import WorkforceDashboard from '@/app/admin/gestao/views/WorkforceDashboard';
import EconomicsDashboard from '@/app/admin/gestao/views/EconomicsDashboard';

const TABS: Array<{ id: 'pulse' | 'demands' | 'workforce' | 'economics'; label: string; icon: React.ComponentType<any> }> = [
  { id: 'pulse', label: 'Pulso Live', icon: Activity },
  { id: 'demands', label: 'Demandas & Entregas', icon: Layers },
  { id: 'workforce', label: 'Equipe & RH', icon: Users },
  { id: 'economics', label: 'Unit Economics', icon: DollarSign },
];

export default function TesseraProductivityPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pulse' | 'workforce' | 'economics' | 'demands'>('pulse');

  useEffect(() => {
    const authenticate = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = '/login';
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setCurrentUser(profile);
      } catch (error) {
        console.error('Erro na autenticação do Tessera Produtividade:', error);
      } finally {
        setIsLoading(false);
      }
    };

    authenticate();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={36} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center gap-3">
        <ShieldAlert size={40} className="text-red-500" />
        <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Acesso Não Autorizado</h2>
        <p className="text-xs text-[var(--color-atelier-grafite)]/60">Credenciais não encontradas.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho do Módulo de Produtividade dentro do Tessera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--color-atelier-grafite)]/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="tess-eyebrow">Tessera Intelligence · Operações</span>
          </div>
          <h2 className="font-elegant text-2xl md:text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2 mt-1">
            <Activity className="w-6 h-6 text-[var(--tess-bordo)]" />
            <span>Produtividade &amp; Performance</span>
          </h2>
          <p className="text-xs text-[var(--color-atelier-grafite)]/65 mt-1">
            Monitoramento em tempo real do pulso operacional, distribuição de esforço e rentabilidade unitária.
          </p>
        </div>

        {/* Seletor de Visões do Módulo */}
        <div className="inline-flex items-center gap-1 p-1 rounded-2xl tess-surface ring-1 ring-[var(--color-atelier-grafite)]/10 self-start md:self-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'text-[var(--tess-accent-text)]'
                    : 'text-[var(--color-atelier-grafite)]/55 hover:text-[var(--color-atelier-grafite)]'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="tessera-productivity-tab"
                    className="absolute inset-0 rounded-xl bg-[var(--color-atelier-creme)] shadow-xs ring-1 ring-[var(--color-atelier-grafite)]/10 -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Renderização do Pilar Selecionado */}
      <div className="relative min-h-[500px]">
        <AnimatePresence mode="wait">
          {activeTab === 'pulse' && (
            <motion.div
              key="pulse"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <PulseDashboard currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} />
            </motion.div>
          )}

          {activeTab === 'demands' && (
            <motion.div
              key="demands"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <DemandsDashboard currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} />
            </motion.div>
          )}

          {activeTab === 'workforce' && (
            <motion.div
              key="workforce"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <WorkforceDashboard currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} />
            </motion.div>
          )}

          {activeTab === 'economics' && (
            <motion.div
              key="economics"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <EconomicsDashboard currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
