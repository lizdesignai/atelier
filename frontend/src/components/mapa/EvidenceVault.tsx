"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Archive, ArrowRight, ArrowUpRight, ArrowDownRight, Image as ImageIcon, FileText } from 'lucide-react';
import { useGlobalStore } from "@/contexts/GlobalStore";

interface Evidence {
  id: string;
  etapa: number;
  tipo: string;
  conteudo: string;
  arquivo_url: string | null;
  created_at: string;
}

interface EvolutionData {
  inicial: { score: number; date: string } | null;
  atual: { score: number; date: string } | null;
}

const ETAPA_MAP: Record<number, string> = {
  0: 'Baseline',
  1: 'Clareza',
  2: 'Percepção',
  3: 'Autoridade',
  4: 'Conversão',
  5: 'Evolução'
};

export default function EvidenceVault() {
  const { isGlobalLoading } = useGlobalStore();
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [evolution, setEvolution] = useState<EvolutionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVault = async () => {
      try {
        const res = await fetch('/api/mapa/evidence/list');
        const json = await res.json();
        if (json.success) {
          setEvidences(json.data);
          setEvolution(json.evolution);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVault();
  }, []);

  if (isGlobalLoading || isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-atelier-terracota)] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Agrupar evidências por etapa
  const groupedEvidences = evidences.reduce((acc, ev) => {
    if (!acc[ev.etapa]) acc[ev.etapa] = [];
    acc[ev.etapa].push(ev);
    return acc;
  }, {} as Record<number, Evidence[]>);

  // Evolução
  const delta = (evolution?.atual?.score || 0) - (evolution?.inicial?.score || 0);
  const hasEvolution = evolution?.inicial && evolution?.atual && evolution.inicial.score !== evolution.atual.score;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-12">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] rounded-full flex items-center justify-center mx-auto mb-6">
          <Archive size={28} />
        </div>
        <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)]">
          Cofre de Evidências
        </h1>
        <p className="text-lg text-[var(--color-atelier-grafite)]/70 max-w-xl mx-auto">
          O registro documentado da sua transformação.
        </p>
      </div>

      <div className="relative border-l border-[var(--color-atelier-grafite)]/20 ml-4 space-y-12 pb-8">
        
        {/* Renderiza por etapas conhecidas (0 a 4) */}
        {[0, 1, 2, 3, 4].map((etapa) => {
          const items = groupedEvidences[etapa];
          if (!items || items.length === 0) return null;

          return (
            <motion.div 
              key={etapa}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative pl-8"
            >
              <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--color-atelier-terracota)] shadow-[0_0_8px_rgba(173,111,64,0.5)]"></div>
              
              <h3 className="font-bold text-lg text-[var(--color-atelier-grafite)] mb-4 tracking-wide uppercase">
                {ETAPA_MAP[etapa]}
              </h3>

              <div className="grid gap-4">
                {items.map((ev) => (
                  <div key={ev.id} className="glass-panel p-6 border border-[var(--color-atelier-grafite)]/10 flex gap-4">
                    <div className="mt-1 text-[var(--color-atelier-grafite)]/40 shrink-0">
                      {ev.tipo === 'texto' ? <FileText size={20} /> : <ImageIcon size={20} />}
                    </div>
                    <div>
                      <p className="text-[var(--color-atelier-grafite)] text-sm font-medium whitespace-pre-wrap leading-relaxed">
                        {ev.conteudo}
                      </p>
                      {ev.arquivo_url && (
                        <a href={ev.arquivo_url} target="_blank" rel="noreferrer" className="text-[var(--color-atelier-terracota)] text-xs font-bold underline mt-3 inline-block">
                          Ver anexo
                        </a>
                      )}
                      <span className="block mt-3 text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/40 tracking-wider">
                        {new Date(ev.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}

        {/* Evolução */}
        {hasEvolution && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative pl-8 pt-4"
          >
            <div className="absolute -left-[5px] top-[26px] w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
            
            <h3 className="font-bold text-lg text-[var(--color-atelier-grafite)] mb-4 tracking-wide uppercase">
              {ETAPA_MAP[5]}
            </h3>

            <div className="glass-panel p-6 border border-green-500/20 bg-green-50/50 flex flex-col md:flex-row items-center gap-6 justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 block mb-1">
                  IPD Atualizado
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-light text-[var(--color-atelier-grafite)]/40 line-through decoration-1">{evolution.inicial!.score}</span>
                  <ArrowRight size={20} className="text-[var(--color-atelier-grafite)]/30" />
                  <span className="text-4xl font-bold text-green-700">{evolution.atual!.score}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-green-200 shadow-sm">
                {delta > 0 ? <ArrowUpRight className="text-green-600" size={20} /> : <ArrowDownRight className="text-red-500" size={20} />}
                <span className={`font-bold ${delta > 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {delta > 0 ? '+' : ''}{delta} pts
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {Object.keys(groupedEvidences).length === 0 && (
          <div className="pl-8">
            <p className="text-[var(--color-atelier-grafite)]/50 text-sm italic">
              Nenhuma evidência registrada ainda.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
