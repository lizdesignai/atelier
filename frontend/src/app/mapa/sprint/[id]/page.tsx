"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGlobalStore } from "@/contexts/GlobalStore";
import { MAPA_STAGES_CONTENT } from '@/app/mapa/content';
import StageTemplate from '@/components/mapa/StageTemplate';

export default function MapaStagePage() {
  const params = useParams();
  const router = useRouter();
  const stageId = Number(params.id);
  const { isGlobalLoading, userProfile } = useGlobalStore();
  
  const [mapaData, setMapaData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMapa = async () => {
    try {
      const res = await fetch('/api/mapa/progress');
      const json = await res.json();
      if (json.success && json.data) {
        setMapaData(json.data);
      }
    } catch (err) {
      console.error('Erro ao buscar mapa:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMapa();
  }, []);

  const handleUpdateProgress = async (field: string, value: any) => {
    try {
      const res = await fetch('/api/mapa/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa: stageId, field, value })
      });
      const data = await res.json();
      if (data.success) {
        // Atualiza estado local optimisticamente
        setMapaData((prev: any) => ({
          ...prev,
          progresso_etapas: {
            ...prev.progresso_etapas,
            [stageId]: data.data.progresso_etapas[stageId]
          }
        }));
      }
    } catch (e) {
      console.error('Erro ao atualizar progresso:', e);
    }
  };

  const handleCompleteStage = async () => {
    try {
      const res = await fetch('/api/mapa/complete-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa: stageId })
      });
      const data = await res.json();
      if (data.success) {
        // Se concluiu semana 4, desbloqueia a 5
        router.push('/mapa');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("showToast", { detail: data.message }));
        }, 500);
      } else {
        window.dispatchEvent(new CustomEvent("showToast", { detail: data.error }));
      }
    } catch (e) {
      console.error('Erro ao completar etapa:', e);
    }
  };

  if (isGlobalLoading || isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-atelier-terracota)] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  const content = MAPA_STAGES_CONTENT[stageId];

  if (!content || !mapaData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--color-atelier-grafite)]/50">Conteúdo não encontrado ou indisponível.</p>
        <button onClick={() => router.push('/mapa')} className="text-sm underline text-[var(--color-atelier-terracota)]">Voltar ao Roadmap</button>
      </div>
    );
  }

  // Verifica se o usuário pode acessar (se a etapa está desbloqueada)
  const currentStage = mapaData.etapa_atual || 0;
  // Desativado temporariamente para modo de desenvolvimento
  // if (stageId > currentStage && stageId !== 5) {
  //   return (
  //     <div className="flex-1 flex flex-col items-center justify-center gap-4">
  //       <p className="text-[var(--color-atelier-grafite)]/50">Esta etapa ainda está bloqueada.</p>
  //       <button onClick={() => router.push('/mapa')} className="text-sm underline text-[var(--color-atelier-terracota)]">Voltar ao Roadmap</button>
  //     </div>
  //   );
  // }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative px-4">
      <StageTemplate 
        content={content} 
        clientName={userProfile?.nome || 'Cliente'} 
        mapaData={mapaData}
        onUpdateProgress={handleUpdateProgress}
        onCompleteStage={handleCompleteStage}
      />
    </div>
  );
}
