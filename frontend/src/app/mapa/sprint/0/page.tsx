"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalStore } from "@/contexts/GlobalStore";
import BaselineTemplate from '@/components/mapa/BaselineTemplate';

export default function Sprint0Page() {
  const router = useRouter();
  const { isGlobalLoading } = useGlobalStore();
  
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
        body: JSON.stringify({ etapa: 0, field, value })
      });
      const data = await res.json();
      if (data.success) {
        setMapaData((prev: any) => ({
          ...prev,
          progresso_etapas: {
            ...prev.progresso_etapas,
            '0': data.data.progresso_etapas['0']
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
        body: JSON.stringify({ etapa: 0 })
      });
      const data = await res.json();
      if (data.success) {
        router.push('/mapa');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("showToast", { detail: "Baseline documentado. Sprint 1 desbloqueado!" }));
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

  if (!mapaData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--color-atelier-grafite)]/50">Conteúdo não encontrado ou indisponível.</p>
        <button onClick={() => router.push('/mapa')} className="text-sm underline text-[var(--color-atelier-terracota)]">Voltar ao Roadmap</button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative px-4">
      <BaselineTemplate 
        mapaData={mapaData}
        onUpdateProgress={handleUpdateProgress}
        onComplete={handleCompleteStage}
      />
    </div>
  );
}
