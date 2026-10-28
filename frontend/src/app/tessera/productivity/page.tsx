// src/app/tessera/productivity/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Loader2, Activity, Users, DollarSign, Zap, Layers, FileText, ShieldAlert } from 'lucide-react';
import TesseraPulseView from '@/components/tessera/productivity/TesseraPulseView';
import TesseraDemandsOverviewView from '@/components/tessera/productivity/TesseraDemandsOverviewView';
import TesseraDemandsLogView from '@/components/tessera/productivity/TesseraDemandsLogView';
import TesseraWorkforceView from '@/components/tessera/productivity/TesseraWorkforceView';
import TesseraEconomicsView from '@/components/tessera/productivity/TesseraEconomicsView';

type TabId = 'pulse' | 'demands_overview' | 'demands_log' | 'workforce' | 'economics';

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<any>;
  group: 'ops' | 'mgmt';
}

const TABS: TabItem[] = [
  { id: 'pulse', label: 'Pulso Live (Hoje)', icon: Zap, group: 'ops' },
  { id: 'demands_overview', label: 'Ecosistema Mensal', icon: Layers, group: 'ops' },
  { id: 'demands_log', label: 'Registro de Demandas', icon: FileText, group: 'ops' },
  { id: 'workforce', label: 'Equipe & RH', icon: Users, group: 'mgmt' },
  { id: 'economics', label: 'Unit Economics', icon: DollarSign, group: 'mgmt' },
];

export default function TesseraProductivityPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>('pulse');

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

  const opsTabs = TABS.filter(t => t.group === 'ops');
  const mgmtTabs = TABS.filter(t => t.group === 'mgmt');

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* 🟢 CABEÇALHO PRINCIPAL DO MÓDULO — NAVEGAÇÃO EM LINHA ÚNICA (SEM SEGUNDA LINHA) */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4 pb-4 border-b border-[var(--color-atelier-grafite)]/10">
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

        {/* 🟢 MENU UNIFICADO EM UMA LINHA ÚNICA */}
        <div className="inline-flex items-center gap-1 p-1 rounded-2xl tess-surface ring-1 ring-[var(--color-atelier-grafite)]/10 self-start 2xl:self-auto overflow-x-auto max-w-full flex-nowrap">
          {/* Submenu Operacional Unificado na Mesma Linha */}
          {opsTabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
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
                <Icon size={14} className={active ? 'text-[var(--tess-accent-text)]' : 'text-[var(--color-atelier-grafite)]/45'} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          {/* Divisor Visual Sutil (Sem quebra de linha) */}
          <div className="h-4 w-px bg-[var(--color-atelier-grafite)]/15 mx-1 shrink-0" />

          {/* Gestão & Finanças na Mesma Linha */}
          {mgmtTabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
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
                <Icon size={14} className={active ? 'text-[var(--tess-accent-text)]' : 'text-[var(--color-atelier-grafite)]/45'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🟢 RENDERIZAÇÃO DIRETA DA VISÃO SELECIONADA */}
      <div className="relative min-h-[500px]">
        <AnimatePresence mode="wait">
          {activeTab === 'pulse' && (
            <motion.div
              key="pulse"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
            >
              <TesseraPulseView currentUser={currentUser} />
            </motion.div>
          )}

          {activeTab === 'demands_overview' && (
            <motion.div
              key="demands_overview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
            >
              <TesseraDemandsOverviewView currentUser={currentUser} />
            </motion.div>
          )}

          {activeTab === 'demands_log' && (
            <motion.div
              key="demands_log"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
            >
              <TesseraDemandsLogView currentUser={currentUser} />
            </motion.div>
          )}

          {activeTab === 'workforce' && (
            <motion.div
              key="workforce"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
            >
              <TesseraWorkforceView currentUser={currentUser} />
            </motion.div>
          )}

          {activeTab === 'economics' && (
            <motion.div
              key="economics"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
            >
              <TesseraEconomicsView currentUser={currentUser} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
