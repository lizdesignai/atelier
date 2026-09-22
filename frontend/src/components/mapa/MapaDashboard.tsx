"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import DiagnosticConfidence from './DiagnosticConfidence';

interface MapaDashboardProps {
  mapaData: any;
  benchmarkData: any;
}

export default function MapaDashboard({ mapaData, benchmarkData }: MapaDashboardProps) {
  if (!mapaData) return null;

  const score = {
    total: mapaData.score_total || 0,
    dimensions: {
      clareza: mapaData.score_clareza || 0,
      autoridade: mapaData.score_autoridade || 0,
      percepcao: mapaData.score_percepcao || 0,
      conversao: mapaData.score_conversao || 0,
    }
  };

  const data = [
    { subject: 'Clareza', A: score.dimensions.clareza, fullMark: 100 },
    { subject: 'Autoridade', A: score.dimensions.autoridade, fullMark: 100 },
    { subject: 'Conversão', A: score.dimensions.conversao, fullMark: 100 },
    { subject: 'Percepção', A: score.dimensions.percepcao, fullMark: 100 },
  ];

  const diff = score.total - (benchmarkData?.total || 0);

  const getLevel = (stageNum: number) => {
    if (mapaData.mapa_verificado || (mapaData.mapa_inicial && mapaData.mapa_inicial.id !== mapaData.id)) return 'Validado';
    const stage = mapaData.progresso_etapas?.[stageNum];
    if (stage?.concluida && stage?.evidencia_enviada) return 'Confirmado';
    return 'Inicial';
  };

  const confidenceDimensions = [
    { dimensao: 'Clareza', score: score.dimensions.clareza, level: getLevel(1) },
    { dimensao: 'Percepção', score: score.dimensions.percepcao, level: getLevel(2) },
    { dimensao: 'Autoridade', score: score.dimensions.autoridade, level: getLevel(3) },
    { dimensao: 'Conversão', score: score.dimensions.conversao, level: getLevel(4) },
  ] as any;

  return (
    <div className="w-full">
      <div className="text-center space-y-4 mb-10">
        <div className="inline-block px-3 py-1 rounded-full border border-[var(--color-atelier-terracota)]/30 text-[var(--color-atelier-terracota)] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">
          MÉTODO 4D
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-elegant text-5xl md:text-6xl text-[var(--color-atelier-grafite)]">
            Seu Mapa
          </h1>
          {mapaData.mapa_verificado && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-bold uppercase tracking-widest mt-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Mapa Verificado
            </div>
          )}
        </div>
        <p className="text-lg font-medium text-[var(--color-atelier-grafite)]/60">IPD: {score.total}/100</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 glass-panel p-8 md:p-12 mb-8">
        
        {/* Score Principal */}
        <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[var(--color-atelier-grafite)]/10 pb-8 md:pb-0">
          <p className="micro-title mb-4">Índice de Presença Digital (IPD)</p>
          <div className="text-8xl font-light text-[var(--color-atelier-grafite)] leading-none mb-4 tracking-tighter">
            {score.total}<span className="text-4xl text-[var(--color-atelier-grafite)]/30">/100</span>
          </div>
          
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider
            ${diff >= 0 ? 'bg-green-100/50 text-green-700' : 'bg-red-100/50 text-red-700'}
          `}>
            {diff >= 0 ? 'Acima da média' : 'Abaixo da média'}
          </div>
          
          <div className="mt-6 w-full max-w-xs px-6 flex justify-between text-sm font-medium text-[var(--color-atelier-grafite)]/60">
            <span>Média da base: {benchmarkData?.total || 0}</span>
            <span className={diff >= 0 ? 'text-green-600' : 'text-red-500'}>
              {diff > 0 ? '+' : ''}{diff} pts
            </span>
          </div>

          {mapaData.principal_gargalo && (
            <div className="mt-8 p-4 bg-[var(--color-atelier-terracota)]/5 rounded-2xl border border-[var(--color-atelier-terracota)]/20 w-full max-w-xs text-center">
              <span className="block text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)] mb-1">Maior Oportunidade</span>
              <span className="font-roboto font-bold text-[var(--color-atelier-grafite)]">{mapaData.principal_gargalo.toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Gráfico Radar */}
        <div className="h-80 w-full flex flex-col justify-center items-center">
          <p className="micro-title mb-2">Assinatura Visual</p>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                <PolarGrid stroke="var(--color-atelier-grafite)" strokeOpacity={0.1} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-atelier-grafite)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Sua Marca"
                  dataKey="A"
                  stroke="var(--color-atelier-terracota)"
                  strokeWidth={2}
                  fill="var(--color-atelier-terracota)"
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
      
      <DiagnosticConfidence dimensions={confidenceDimensions} />
    </div>
  );
}
