"use client";

import React, { useEffect, useState } from 'react';
import { useGlobalStore } from "@/contexts/GlobalStore";
import MapaDashboard from '@/components/mapa/MapaDashboard';
import RoadmapTimeline, { StageInfo } from '@/components/mapa/RoadmapTimeline';
import ProgressBar from '@/components/mapa/ProgressBar';

export default function MapaPage() {
  const { isGlobalLoading } = useGlobalStore();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMapa() {
      try {
        const res = await fetch('/api/mapa/progress');
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        }
      } catch (err) {
        console.error('Erro ao buscar mapa:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMapa();
  }, []);

  if (isGlobalLoading || isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-atelier-terracota)] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[var(--color-atelier-grafite)]/50">Nenhum mapa encontrado.</p>
      </div>
    );
  }

  // Construir estágios da trilha baseados no banco
  const currentStageNum = data.etapa_atual || 0;
  
  const buildStageStatus = (stageNum: number): 'locked' | 'available' | 'in_progress' | 'completed' => {
    if (stageNum < currentStageNum) return 'completed';
    if (stageNum === currentStageNum) {
      // Check if started
      const prog = data.progresso_etapas?.[String(stageNum)];
      if (prog && (prog.aula_vista || prog.pdf_aberto || Object.keys(prog.tarefas || {}).length > 0)) {
        return 'in_progress';
      }
      return 'available';
    }
    return 'locked';
  };

  const stages: StageInfo[] = [
    {
      id: 0,
      title: 'Baseline',
      subtitle: 'O seu estado atual documentado.',
      timeEstimate: '10 min',
      status: buildStageStatus(0),
    },
    {
      id: 1,
      title: 'Clareza',
      subtitle: 'Antes de querer atenção, você precisa ser entendido.',
      timeEstimate: '45 min',
      status: buildStageStatus(1),
    },
    {
      id: 2,
      title: 'Percepção',
      subtitle: 'O que sua marca parece antes mesmo de alguém ler.',
      timeEstimate: '1h 30m',
      status: buildStageStatus(2),
    },
    {
      id: 3,
      title: 'Autoridade',
      subtitle: 'Autoridade não é dizer que você é bom. É provar.',
      timeEstimate: '2h',
      status: buildStageStatus(3),
    },
    {
      id: 4,
      title: 'Conversão',
      subtitle: 'Deixando claro o próximo passo de compra.',
      timeEstimate: '1h',
      status: buildStageStatus(4),
    },
    {
      id: 5,
      title: 'Evolução',
      subtitle: 'Reavaliando seu perfil para ver o que mudou.',
      timeEstimate: '15 min',
      status: buildStageStatus(5),
    }
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative px-4 md:px-8">
      <div className="w-full max-w-4xl mx-auto pb-24 space-y-6 pt-4">
        
        <ProgressBar currentStage={Math.min(currentStageNum, 5)} totalStages={5} />
        
        <MapaDashboard mapaData={data} benchmarkData={data.benchmark} />
        
        <RoadmapTimeline stages={stages} />

      </div>
    </div>
  );
}
