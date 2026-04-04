// src/app/cockpit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { 
  Activity, AlertCircle, ArrowRight, CheckCircle2, 
  Clock, Compass, Sparkles, Loader2, TrendingUp
} from "lucide-react";

export default function CockpitPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [clientName, setClientName] = useState("Cliente");
  const [pendingCount, setPendingCount] = useState(0);
  const [healthScore, setHealthScore] = useState(85);
  const [currentFocus, setCurrentFocus] = useState("A alinhar estratégia visual");

  useEffect(() => {
    const fetchCockpitData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error("Sessão não encontrada.");

        // 1. Buscar Nome do Cliente (com fallback seguro)
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.nome) {
          setClientName(profile.nome.split(' ')[0]);
        }

        // 2. Buscar Dados do Projeto (Saúde e Foco)
        const { data: project } = await supabase
          .from('projects')
          .select('brand_health_score, current_focus')
          .eq('client_id', session.user.id)
          .in('status', ['active', 'delivered'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (project) {
          setHealthScore(project.brand_health_score ?? 85);
          setCurrentFocus(project.current_focus || "A desenhar novas peças criativas");
        }

        // 3. Buscar Gargalo (Contagem rigorosa de aprovações pendentes)
        const { count, error: countError } = await supabase
          .from('social_posts')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', session.user.id)
          .eq('status', 'pending_approval');

        if (!countError) {
          setPendingCount(count || 0);
        }

      } catch (error) {
        console.error("Erro Crítico ao carregar o Cockpit:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCockpitData();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 19 ? "Boa tarde" : "Boa noite";

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-[1000px] mx-auto w-full gap-8 relative z-10 pb-10 px-4 md:px-0">
      
      {/* CABEÇALHO EXECUTIVO */}
      <header className="animate-[fadeInUp_0.5s_ease-out] flex flex-col md:flex-row md:items-end justify-between gap-4 mt-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Compass size={16} className="text-[var(--color-atelier-terracota)]" />
            <span className="micro-title text-[var(--color-atelier-grafite)]/60 font-bold tracking-widest text-[10px] uppercase">
              Resumo Executivo
            </span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-tight tracking-tight">
            {greeting}, <span className="text-[var(--color-atelier-terracota)] italic">{clientName}.</span>
          </h1>
          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 max-w-md">
            O seu painel de controlo diário. Sem métricas de vaidade, apenas o que impacta o crescimento da sua marca hoje.
          </p>
        </div>
      </header>

      {/* GRID DO COCKPIT */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-[fadeInUp_0.6s_ease-out]">
        
        {/* 1. MÓDULO DE AÇÃO EXIGIDA (O Gargalo) */}
        <motion.div 
          whileHover={{ y: -4 }}
          className={`md:col-span-8 glass-panel p-8 md:p-10 flex flex-col justify-between relative overflow-hidden transition-all duration-500 rounded-[2rem] border
            ${pendingCount > 0 ? 'bg-white/90 border-orange-200 shadow-[0_15px_40px_rgba(249,115,22,0.08)]' : 'bg-white/60 border-white/40 shadow-sm'}
          `}
        >
          {pendingCount > 0 && <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>}
          
          <div className="flex items-start justify-between mb-8">
            <div>
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2 block">
                Ação Requerida
              </span>
              <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                {pendingCount > 0 ? 'Aprovações Pendentes' : 'Tudo em Dia'}
              </h2>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner
              ${pendingCount > 0 ? 'bg-orange-50 text-orange-500 border border-orange-100' : 'bg-green-50 text-green-500 border border-green-100'}
            `}>
              {pendingCount > 0 ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
            </div>
          </div>

          <div>
            <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/80 mb-6 leading-relaxed">
              {pendingCount > 0 
                ? `Existem ${pendingCount} peças criativas aguardando a sua validação. A sua aprovação rápida garante que o cronograma de publicações se mantém intacto.` 
                : 'Não há publicações a aguardar a sua aprovação neste momento. O estúdio está a produzir as próximas peças.'}
            </p>

            <button 
              onClick={() => router.push('/curadoria')}
              className={`px-6 py-3.5 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-all outline-none
                ${pendingCount > 0 
                  ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-md hover:shadow-lg hover:-translate-y-0.5' 
                  : 'bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)]'}
              `}
            >
              {pendingCount > 0 ? 'Revisar Conteúdo Agora' : 'Ver Histórico de Curadoria'}
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>

        {/* 2. ATELIER PULSE (Saúde da Marca) */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="md:col-span-4 glass-panel p-8 flex flex-col justify-between bg-white/70 relative overflow-hidden rounded-[2rem] border border-white/50 shadow-sm"
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-2xl"></div>
          
          <div>
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2 flex items-center gap-2">
              <Activity size={12} className="text-[var(--color-atelier-terracota)]"/> Atelier Pulse
            </span>
            <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-6">Saúde da Marca</h2>
          </div>

          <div className="flex flex-col items-center justify-center my-4 relative z-10">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100" />
                <motion.circle 
                  initial={{ strokeDasharray: "0 400" }}
                  animate={{ strokeDasharray: `${(healthScore / 100) * 364} 400` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="6" fill="transparent" 
                  strokeLinecap="round"
                  className="text-[var(--color-atelier-terracota)] drop-shadow-md" 
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none mt-1">{healthScore}</span>
                <span className="font-roboto text-[9px] font-bold text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest mt-1">/ 100</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-2 relative z-10">
             <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-roboto text-[9px] font-bold uppercase tracking-widest border border-[var(--color-atelier-terracota)]/20">
               <TrendingUp size={12} /> Crescimento Sólido
             </span>
          </div>
        </motion.div>

        {/* 3. PRÓXIMOS PASSOS (Transparência Operacional) */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="md:col-span-12 glass-panel p-6 md:p-8 bg-white/60 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between border-l-4 border-l-[var(--color-atelier-grafite)] rounded-r-[2rem] rounded-l-lg shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--color-atelier-grafite)]/5 flex items-center justify-center shrink-0 border border-[var(--color-atelier-grafite)]/10">
              <Clock size={20} className="text-[var(--color-atelier-grafite)]" />
            </div>
            <div>
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 block mb-1">
                Transparência de Estúdio
              </span>
              <h3 className="font-roboto text-[14px] font-bold text-[var(--color-atelier-grafite)] flex items-center gap-2">
                Foco Atual: <span className="font-normal text-[var(--color-atelier-terracota)]">{currentFocus}</span>
              </h3>
            </div>
          </div>
          
          <div className="text-[11px] font-roboto font-medium text-[var(--color-atelier-grafite)]/50 italic flex items-center gap-2 shrink-0 bg-white/50 px-4 py-2 rounded-full">
            <Sparkles size={14} className="text-[var(--color-atelier-terracota)]" /> Atualizado em tempo real pelo Diretor de Arte
          </div>
        </motion.div>

      </div>
    </div>
  );
}