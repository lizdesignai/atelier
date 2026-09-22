import React from 'react';
import { motion } from 'framer-motion';
import { mockMapaData } from '@/app/mapa/mockData';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export default function ScoreModule() {
  const { score } = mockMapaData;

  const data = [
    { subject: 'Clareza', A: score.dimensions.clareza, fullMark: 100 },
    { subject: 'Autoridade', A: score.dimensions.autoridade, fullMark: 100 },
    { subject: 'Conversão', A: score.dimensions.conversao, fullMark: 100 },
    { subject: 'Percepção', A: score.dimensions.percepcao, fullMark: 100 },
  ];

  return (
    <motion.section 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      className="min-h-[70vh] flex flex-col justify-center max-w-4xl mx-auto w-full py-16 border-t border-[var(--color-atelier-grafite)]/10"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl font-light text-[var(--color-atelier-grafite)]">Assinatura Visual</h2>
        <p className="text-[var(--color-atelier-grafite)]/60 mt-2 max-w-lg mx-auto">
          Sua marca tem um bom alcance estético, mas há um desequilíbrio claro na condução para a venda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        
        {/* Gráfico Radar */}
        <div className="h-80 w-full flex justify-center items-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid stroke="var(--color-atelier-grafite)" strokeOpacity={0.1} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-atelier-grafite)', fontSize: 12, fontWeight: 600 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Sua Marca"
                dataKey="A"
                stroke="var(--color-atelier-terracota)"
                strokeWidth={2}
                fill="var(--color-atelier-terracota)"
                fillOpacity={0.2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Detalhes */}
        <div className="grid grid-cols-2 gap-6">
          {[
            { label: 'Clareza', value: score.dimensions.clareza, desc: 'Muito bom' },
            { label: 'Autoridade', value: score.dimensions.autoridade, desc: 'Bom' },
            { label: 'Percepção', value: score.dimensions.percepcao, desc: 'Bom' },
            { label: 'Conversão', value: score.dimensions.conversao, desc: 'Atenção necessária' },
          ].map((dim) => (
            <div key={dim.label} className="glass-panel p-5 text-center">
              <p className="text-xs font-bold text-[var(--color-atelier-grafite)]/50 uppercase tracking-wider mb-1">{dim.label}</p>
              <p className="text-3xl font-light text-[var(--color-atelier-grafite)] mb-1">{dim.value}</p>
              <p className={`text-xs font-medium ${dim.value < 60 ? 'text-[var(--color-atelier-terracota)]' : 'text-green-600/80'}`}>{dim.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </motion.section>
  );
}
