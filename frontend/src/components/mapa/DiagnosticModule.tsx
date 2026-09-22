import React from 'react';
import { motion } from 'framer-motion';
import { mockMapaData } from '@/app/mapa/mockData';
import { AlertCircle } from 'lucide-react';

export default function DiagnosticModule() {
  const { diagnostic } = mockMapaData;

  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      className="min-h-[70vh] flex flex-col justify-center max-w-3xl mx-auto w-full py-16 border-t border-[var(--color-atelier-grafite)]/10"
    >
      <div className="text-center mb-12">
        <p className="text-sm font-semibold text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mb-4">
          Seu principal gargalo
        </p>
        <h2 className="text-4xl md:text-5xl font-bold text-[var(--color-atelier-terracota)]">
          {diagnostic.gargalo_principal}
        </h2>
        <div className="mt-4 inline-block bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] px-4 py-1 rounded-full text-lg font-medium">
          {diagnostic.score_gargalo}/100
        </div>
        <p className="text-[var(--color-atelier-grafite)]/80 mt-8 max-w-xl mx-auto text-lg">
          "{diagnostic.interpretacao}"
        </p>
      </div>

      <div className="space-y-6 mt-8">
        <h3 className="text-sm font-bold text-[var(--color-atelier-grafite)]/50 uppercase tracking-wider mb-4 text-center">
          O que encontramos
        </h3>
        
        {diagnostic.issues.map((issue) => (
          <div key={issue.id} className="flex gap-4 p-6 glass-panel hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center font-bold text-sm">
                {issue.id}
              </div>
            </div>
            <div>
              <h4 className="text-lg font-bold text-[var(--color-atelier-grafite)]">{issue.title}</h4>
              <p className="text-[var(--color-atelier-grafite)]/70 mt-1">{issue.description}</p>
            </div>
          </div>
        ))}
      </div>

    </motion.section>
  );
}
