import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockMapaData } from '@/app/mapa/mockData';
import { MessageSquareQuote, ChevronDown } from 'lucide-react';

export default function EvidenceModule() {
  const { evidences } = mockMapaData;
  const [isScienceOpen, setIsScienceOpen] = useState(false);

  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      className="min-h-[60vh] flex flex-col justify-center max-w-3xl mx-auto w-full py-16 border-t border-[var(--color-atelier-grafite)]/10"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl font-light text-[var(--color-atelier-grafite)]">Evidências do Diagnóstico</h2>
        <p className="text-[var(--color-atelier-grafite)]/60 mt-2 max-w-lg mx-auto">
          O diagnóstico não é baseado em uma opinião. Ele foi construído a partir das suas próprias respostas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {evidences.map((ev, idx) => (
          <div key={idx} className="bg-[var(--color-atelier-grafite)]/5 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <MessageSquareQuote size={20} className="text-[var(--color-atelier-terracota)]/50 mb-4" />
              <p className="text-sm text-[var(--color-atelier-grafite)]/70 italic line-clamp-3 mb-4">
                "{ev.pergunta}"
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-[var(--color-atelier-grafite)]/5">
              <p className="text-sm font-medium text-[var(--color-atelier-grafite)]">
                {ev.resposta}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Ciência Layer */}
      <div className="glass-panel overflow-hidden">
        <button 
          onClick={() => setIsScienceOpen(!isScienceOpen)}
          className="w-full p-6 flex justify-between items-center text-left focus:outline-none hover:bg-[var(--color-atelier-grafite)]/5 transition-colors"
        >
          <div>
            <h4 className="font-bold text-[var(--color-atelier-grafite)]">Por que isso importa?</h4>
            <p className="text-sm text-[var(--color-atelier-grafite)]/60 mt-1">A ciência por trás do diagnóstico</p>
          </div>
          <ChevronDown className={`transform transition-transform ${isScienceOpen ? 'rotate-180' : ''}`} />
        </button>
        
        <AnimatePresence>
          {isScienceOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-6 pt-0 border-t border-[var(--color-atelier-grafite)]/5 text-sm text-[var(--color-atelier-grafite)]/70 space-y-4">
                <p>
                  Pessoas tendem a usar sinais visuais, clareza de informação e consistência para formar julgamentos rápidos sobre uma organização ou marca (Heurística de Disponibilidade e Efeito Halo).
                </p>
                <p>
                  <strong>O que isso significa para você?</strong> Sua comunicação não é apenas estética. Ela também funciona como um sistema de sinalização. Quando o caminho de compra não é evidente, a carga cognitiva aumenta, reduzindo drasticamente a probabilidade de ação por parte do visitante.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
