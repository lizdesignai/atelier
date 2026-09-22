import React from 'react';
import { motion } from 'framer-motion';
import { mockMapaData } from '@/app/mapa/mockData';

export default function BenchmarkModule() {
  const { score, benchmark } = mockMapaData;

  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      className="min-h-[60vh] flex flex-col justify-center max-w-3xl mx-auto w-full py-16 border-t border-[var(--color-atelier-grafite)]/10"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl font-light text-[var(--color-atelier-grafite)]">Onde você se encaixa</h2>
        <p className="text-[var(--color-atelier-grafite)]/60 mt-2 max-w-md mx-auto">
          Comparativo com a média das outras marcas mapeadas pelo nosso diagnóstico.
        </p>
      </div>

      <div className="glass-panel p-8 overflow-hidden">
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-atelier-grafite)]/10">
              <th className="py-4 text-xs font-bold text-[var(--color-atelier-grafite)]/50 uppercase tracking-wider">Dimensão</th>
              <th className="py-4 text-xs font-bold text-[var(--color-atelier-grafite)]/50 uppercase tracking-wider text-center">Você</th>
              <th className="py-4 text-xs font-bold text-[var(--color-atelier-grafite)]/50 uppercase tracking-wider text-center">Média</th>
              <th className="py-4 text-xs font-bold text-[var(--color-atelier-grafite)]/50 uppercase tracking-wider text-right">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-atelier-grafite)]/5">
            {[
              { label: 'Total', yours: score.total, avg: benchmark.total },
              { label: 'Clareza', yours: score.dimensions.clareza, avg: benchmark.dimensions.clareza },
              { label: 'Autoridade', yours: score.dimensions.autoridade, avg: benchmark.dimensions.autoridade },
              { label: 'Percepção', yours: score.dimensions.percepcao, avg: benchmark.dimensions.percepcao },
              { label: 'Conversão', yours: score.dimensions.conversao, avg: benchmark.dimensions.conversao },
            ].map((row, i) => {
              const diff = row.yours - row.avg;
              const isPositive = diff >= 0;
              return (
                <tr key={row.label} className={i === 0 ? "bg-[var(--color-atelier-grafite)]/5 font-medium" : ""}>
                  <td className="py-4 pl-4 text-[var(--color-atelier-grafite)]">{row.label}</td>
                  <td className="py-4 text-center text-[var(--color-atelier-grafite)]">{row.yours}</td>
                  <td className="py-4 text-center text-[var(--color-atelier-grafite)]/60">{row.avg}</td>
                  <td className={`py-4 pr-4 text-right font-medium ${isPositive ? 'text-green-600' : 'text-[var(--color-atelier-terracota)]'}`}>
                    {isPositive ? '+' : ''}{diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

      </div>
    </motion.section>
  );
}
