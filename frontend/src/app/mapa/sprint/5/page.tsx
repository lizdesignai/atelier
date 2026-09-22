"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalStore } from "@/contexts/GlobalStore";
import EvolutionModule from '@/components/mapa/EvolutionModule';
import ShareCard from '@/components/mapa/ShareCard';
import { CheckCircle2 } from 'lucide-react';
import { trackMapaEvent } from '@/lib/trackMapaEvent';

export default function EvolucaoPage() {
  const router = useRouter();
  const { isGlobalLoading, userProfile } = useGlobalStore();
  
  const [mapaData, setMapaData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    async function fetchMapa() {
      try {
        const res = await fetch('/api/mapa/progress');
        const json = await res.json();
        if (json.success && json.data) {
          setMapaData(json.data);
          
          if (json.data.score_total >= 80 && !json.data.mapa_verificado) {
            verifyMapa();
          }
        }
      } catch (err) {
        console.error('Erro ao buscar mapa:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMapa();
  }, []);

  const verifyMapa = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/mapa/verify', { method: 'POST' });
      const json = await res.json();
      if (json.success && json.verified) {
        setMapaData((prev: any) => ({ ...prev, mapa_verificado: true }));
        trackMapaEvent('mapa_verified', { 
          ipd_inicial: mapaData?.mapa_inicial?.score_total, 
          ipd_final: mapaData?.score_total,
          delta: (mapaData?.score_total || 0) - (mapaData?.mapa_inicial?.score_total || 0)
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
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
        <p className="text-[var(--color-atelier-grafite)]/50">Nenhum mapa encontrado.</p>
        <button onClick={() => router.push('/mapa')} className="text-sm underline text-[var(--color-atelier-terracota)]">Voltar ao Roadmap</button>
      </div>
    );
  }

  const hasEvolution = mapaData.mapa_inicial && mapaData.mapa_inicial.id !== mapaData.id;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative px-4 pt-8">
      
      <div className="w-full max-w-4xl mx-auto pb-24 space-y-12">
        <div className="inline-block px-3 py-1 rounded-full border border-[var(--color-atelier-grafite)]/20 text-[var(--color-atelier-grafite)] text-[10px] font-bold uppercase tracking-[0.2em] mb-4 mx-auto text-center w-fit flex items-center justify-center">
          Revalidação
        </div>

        <EvolutionModule mapaAtual={mapaData} mapaInicial={mapaData.mapa_inicial} />

        {hasEvolution ? (
          <>
            <ShareCard 
              clientName={userProfile?.nome || 'Cliente'} 
              totalDelta={mapaData.score_total - mapaData.mapa_inicial.score_total}
              currentTotal={mapaData.score_total}
            />
            
            <div className="text-center p-8 glass-panel border border-green-500/30 bg-green-50/50 max-w-4xl mx-auto mt-12">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="font-elegant text-2xl text-green-800 mb-2">Jornada Concluída</h3>
              <p className="text-green-700/70 text-sm mb-6 max-w-lg mx-auto">
                Parabéns! Você chegou ao fim da Jornada Mapa 4D. O seu perfil passou por um filtro profundo de Clareza, Percepção, Autoridade e Conversão.
              </p>
              <button 
                onClick={() => router.push('/mapa')}
                className="text-xs font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] border border-[var(--color-atelier-grafite)]/20 px-6 py-2 rounded-full hover:bg-white transition-colors"
              >
                Voltar ao Dashboard
              </button>
            </div>
          </>
        ) : (
          <div className="text-center p-8 glass-panel border border-[var(--color-atelier-terracota)]/20 max-w-4xl mx-auto mt-12 space-y-6">
            <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Chegou a hora da Verdade</h3>
            <p className="text-[var(--color-atelier-grafite)]/70 max-w-lg mx-auto">
              Você implementou toda a base. Agora, faça a reavaliação completa do seu IPD para compararmos o seu estado atual com o seu diagnóstico original (Baseline).
            </p>
            <button 
              onClick={async () => {
                window.dispatchEvent(new CustomEvent("showToast", { detail: "Simulando revalidação..." }));
                const res = await fetch('/api/mapa/mock-revalidation', { method: 'POST' });
                if (res.ok) window.location.reload();
              }}
              className="bg-[var(--color-atelier-terracota)] text-white px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#8c562e] transition-colors"
            >
              Iniciar Revalidação
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
