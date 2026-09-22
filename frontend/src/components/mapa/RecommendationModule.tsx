import React from 'react';
import { motion } from 'framer-motion';
import { mockMapaData } from '@/app/mapa/mockData';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function RecommendationModule() {
  const { recommendation } = mockMapaData;

  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      className="min-h-[70vh] flex flex-col justify-center max-w-3xl mx-auto w-full py-16 border-t border-[var(--color-atelier-grafite)]/10"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl font-light text-[var(--color-atelier-grafite)]">Seu próximo passo</h2>
        <p className="text-[var(--color-atelier-grafite)]/60 mt-2 max-w-lg mx-auto">
          Você já sabe onde está. Agora precisa decidir o que fazer com essa informação.
        </p>
      </div>

      <div className="bg-gradient-to-br from-[var(--color-atelier-grafite)] to-[#2a2a2a] text-white p-8 md:p-12 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-atelier-terracota)]/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-sm font-medium">
            <Sparkles size={16} className="text-[var(--color-atelier-terracota)]" />
            <span>O que seu diagnóstico indica</span>
          </div>
          
          <h3 className="text-3xl md:text-4xl font-light">
            {recommendation.title}
          </h3>
          
          <p className="text-white/70 max-w-md text-lg leading-relaxed">
            {recommendation.reason}
          </p>

          <div className="pt-8 flex flex-col sm:flex-row gap-4 items-center">
            <button className="w-full sm:w-auto bg-[var(--color-atelier-terracota)] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#d27555] transition-colors flex items-center justify-center gap-2">
              Conhecer a solução
              <ArrowRight size={20} />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 rounded-xl font-medium text-white/50 hover:text-white transition-colors">
              Quer continuar trabalhando nisso sozinho?
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
