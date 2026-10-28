// src/app/admin/gestao/views/OperationsDashboard.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Layers, FileText } from 'lucide-react';
import PulseDashboard from './PulseDashboard';
import DemandsDashboard from './DemandsDashboard';

interface OperationsDashboardProps {
  currentUser: any;
}

export default function OperationsDashboard({ currentUser }: OperationsDashboardProps) {
  const [subMode, setSubMode] = useState<'live' | 'overview' | 'log'>('live');

  return (
    <div className="flex flex-col h-auto md:h-full gap-5 overflow-y-auto md:overflow-hidden">
      {/* 🟢 SUB-TOOLBAR UNIFICADA DE OPERAÇÕES (TESSERA SEM DUPLICAÇÃO) */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-atelier-grafite)]/10">
        <div className="flex items-center gap-2">
          <span className="tess-eyebrow">Operações · Esteira do Estúdio</span>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-2xl tess-surface ring-1 ring-[var(--color-atelier-grafite)]/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubMode('live')}
            className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subMode === 'live'
                ? 'text-[var(--tess-accent-text)]'
                : 'text-[var(--color-atelier-grafite)]/55 hover:text-[var(--color-atelier-grafite)]'
            }`}
          >
            {subMode === 'live' && (
              <motion.div
                layoutId="tessera-ops-subtab"
                className="absolute inset-0 rounded-xl bg-[var(--color-atelier-creme)] shadow-xs ring-1 ring-[var(--color-atelier-grafite)]/10 -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
            <Zap size={14} className={subMode === 'live' ? 'text-[var(--tess-accent-text)]' : 'text-[var(--color-atelier-grafite)]/45'} />
            <span>Pulso Live (Hoje)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubMode('overview')}
            className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subMode === 'overview'
                ? 'text-[var(--tess-accent-text)]'
                : 'text-[var(--color-atelier-grafite)]/55 hover:text-[var(--color-atelier-grafite)]'
            }`}
          >
            {subMode === 'overview' && (
              <motion.div
                layoutId="tessera-ops-subtab"
                className="absolute inset-0 rounded-xl bg-[var(--color-atelier-creme)] shadow-xs ring-1 ring-[var(--color-atelier-grafite)]/10 -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
            <Layers size={14} className={subMode === 'overview' ? 'text-[var(--tess-accent-text)]' : 'text-[var(--color-atelier-grafite)]/45'} />
            <span>Ecosistema Mensal</span>
          </button>

          <button
            type="button"
            onClick={() => setSubMode('log')}
            className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subMode === 'log'
                ? 'text-[var(--tess-accent-text)]'
                : 'text-[var(--color-atelier-grafite)]/55 hover:text-[var(--color-atelier-grafite)]'
            }`}
          >
            {subMode === 'log' && (
              <motion.div
                layoutId="tessera-ops-subtab"
                className="absolute inset-0 rounded-xl bg-[var(--color-atelier-creme)] shadow-xs ring-1 ring-[var(--color-atelier-grafite)]/10 -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
            <FileText size={14} className={subMode === 'log' ? 'text-[var(--tess-accent-text)]' : 'text-[var(--color-atelier-grafite)]/45'} />
            <span>Registro de Demandas</span>
          </button>
        </div>
      </div>

      {/* 🟢 CORPO OPERACIONAL CONDICIONAL */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {subMode === 'live' && (
            <motion.div
              key="ops-live"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="h-full"
            >
              <PulseDashboard currentUser={currentUser} hideHeaderNav={true} />
            </motion.div>
          )}

          {subMode === 'overview' && (
            <motion.div
              key="ops-overview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="h-full"
            >
              <DemandsDashboard 
                currentUser={currentUser} 
                hideHeaderNav={true} 
                hideTitle={true} 
                forcedSubTab="overview" 
                hideSubTabSwitcher={true} 
              />
            </motion.div>
          )}

          {subMode === 'log' && (
            <motion.div
              key="ops-log"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="h-full"
            >
              <DemandsDashboard 
                currentUser={currentUser} 
                hideHeaderNav={true} 
                hideTitle={true} 
                forcedSubTab="log" 
                hideSubTabSwitcher={true} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
