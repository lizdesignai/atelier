// src/app/admin/analytics/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { 
  BarChart3, Activity, AlertTriangle, Target, 
  FolderKanban, Clock, Users, Loader2, Sparkles
} from "lucide-react";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    activeProjects: 0,
    deliveredProjects: 0,
    avgDeliveryDays: 0,
  });
  const [bottlenecks, setBottlenecks] = useState<any[]>([]);
  const [phaseDistribution, setPhaseDistribution] = useState<any>({});

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const { data: projects, error } = await supabase
          .from('projects')
          .select('*, profiles(nome)')
          .in('status', ['active', 'delivered']);

        if (error) throw error;

        let activeCount = 0;
        let deliveredCount = 0;
        let totalDeliveryTime = 0;
        let phases: any = { 'reuniao': 0, 'pesquisa': 0, 'direcionamento': 0, 'processo': 0, 'apresentacao': 0 };
        let risks: any[] = [];

        if (projects) {
          projects.forEach((proj: any) => {
            if (proj.status === 'active') {
              activeCount++;
              const phaseCode = proj.fase || 'reuniao';
              if (phases[phaseCode] !== undefined) phases[phaseCode]++;

              // Análise de Gargalo (Projeto ativo há mais de 20 dias com progresso baixo)
              const createdDate = new Date(proj.created_at);
              const daysActive = Math.ceil(Math.abs(new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysActive > 20 && (proj.progress || 0) < 60) {
                risks.push({
                  id: proj.id,
                  client: proj.profiles?.nome,
                  daysActive,
                  progress: proj.progress || 0,
                  phase: proj.phase
                });
              }
            } else if (proj.status === 'delivered') {
              deliveredCount++;
              if (proj.delivered_at) {
                const createdDate = new Date(proj.created_at);
                const deliveredDate = new Date(proj.delivered_at);
                const deliveryTime = Math.ceil(Math.abs(deliveredDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                totalDeliveryTime += deliveryTime;
              }
            }
          });
        }

        setMetrics({
          activeProjects: activeCount,
          deliveredProjects: deliveredCount,
          avgDeliveryDays: deliveredCount > 0 ? Math.round(totalDeliveryTime / deliveredCount) : 0
        });

        setPhaseDistribution(phases);
        
        // Ordena os riscos (gargalos) pelos que estão há mais dias ativos
        risks.sort((a, b) => b.daysActive - a.daysActive);
        setBottlenecks(risks);

      } catch (error) {
        console.error("Erro no Analytics:", error);
        showToast("Erro ao carregar dados operacionais.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return <div className="flex h-[calc(100vh-80px)] items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  const phaseNames: any = {
    'reuniao': 'Reunião Inicial',
    'pesquisa': 'Pesquisa',
    'direcionamento': 'Direção de Arte',
    'processo': 'Processo Criativo',
    'apresentacao': 'Apresentação'
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6">
      <header className="shrink-0 flex flex-col gap-2 animate-[fadeInUp_0.5s_ease-out]">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] w-8 h-8 rounded-xl flex items-center justify-center">
            <BarChart3 size={16} className="text-[var(--color-atelier-terracota)]" />
          </span>
          <span className="micro-title">Visão Operacional</span>
        </div>
        <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
          Analytics & <span className="text-[var(--color-atelier-terracota)] italic">Operação.</span>
        </h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-[fadeInUp_0.6s_ease-out]">
        <div className="glass-panel p-6 flex flex-col gap-4 bg-white/60">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center"><FolderKanban size={18} /></div>
          </div>
          <div>
            <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{metrics.activeProjects}</span>
            <span className="micro-title block mt-1">Projetos Ativos em Forja</span>
          </div>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-4 bg-white/60">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center"><Target size={18} /></div>
          </div>
          <div>
            <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{metrics.deliveredProjects}</span>
            <span className="micro-title block mt-1">Projetos Concluídos</span>
          </div>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-4 bg-white/60">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center"><Clock size={18} /></div>
          </div>
          <div>
            <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{metrics.avgDeliveryDays} <span className="text-xl">dias</span></span>
            <span className="micro-title block mt-1">Tempo Médio de Entrega</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 animate-[fadeInUp_0.7s_ease-out]">
        
        {/* DISTRIBUIÇÃO DE FASES (FUNIL) */}
        <div className="glass-panel bg-white/40 p-8 flex flex-col h-full">
          <h3 className="font-roboto font-bold text-[12px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 flex items-center gap-2">
            <Activity size={16} /> Funil de Produção (Workflow)
          </h3>
          <div className="flex-1 flex flex-col justify-center gap-6 pr-4">
            {Object.keys(phaseDistribution).map((phaseKey) => {
              const count = phaseDistribution[phaseKey];
              const percentage = metrics.activeProjects > 0 ? Math.round((count / metrics.activeProjects) * 100) : 0;
              
              return (
                <div key={phaseKey} className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <span className="font-roboto text-[12px] font-bold text-[var(--color-atelier-grafite)]">{phaseNames[phaseKey]}</span>
                    <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">{count} Projetos ({percentage}%)</span>
                  </div>
                  <div className="h-3 w-full bg-white rounded-full overflow-hidden shadow-inner border border-[var(--color-atelier-grafite)]/5">
                    <motion.div 
                      initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1 }}
                      className="h-full bg-[var(--color-atelier-terracota)] rounded-full"
                    ></motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ALERTA DE GARGALOS */}
        <div className="glass-panel bg-[var(--color-atelier-rose)]/5 border border-red-900/5 p-8 flex flex-col h-full">
          <h3 className="font-roboto font-bold text-[12px] uppercase tracking-widest text-red-800/60 border-b border-red-900/10 pb-4 mb-6 flex items-center gap-2">
            <AlertTriangle size={16} /> Projetos em Risco (Gargalos)
          </h3>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {bottlenecks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-50 text-center">
                <Sparkles size={32} className="mb-2 text-green-600" />
                <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Fluxo Perfeito.</p>
                <p className="font-roboto text-[11px] uppercase tracking-widest font-bold mt-1">Nenhum projeto atrasado no sistema.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {bottlenecks.map((risk, i) => (
                  <div key={i} className="bg-white/80 p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">{risk.client}</span>
                      <span className="bg-red-50 text-red-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                        <Clock size={10}/> {risk.daysActive} Dias Ativo
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 bg-red-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${risk.progress}%` }}></div>
                      </div>
                      <span className="font-roboto text-[10px] font-bold text-red-500 w-8">{risk.progress}%</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Fase Estagnada: {risk.phase}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}