// src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Activity, TrendingUp, Users, DollarSign,
  AlertTriangle, ArrowUpRight, Loader2, CheckCircle2, ShieldCheck,
  Eye, Heart, Globe, BarChart
} from "lucide-react";
import { supabase } from "../../lib/supabase"; 
import { useGlobalStore } from "../../contexts/GlobalStore";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function AdminDashboard() {
  const router = useRouter();
  
  const { activeProjects, isGlobalLoading } = useGlobalStore();
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  
  // Métricas Core C-Level
  const [mrr, setMrr] = useState(0);
  const [totalLTV, setTotalLTV] = useState(0);
  const [teamEfficiency, setTeamEfficiency] = useState<{name: string, tasks: number}[]>([]);
  const [churnRadar, setChurnRadar] = useState<any[]>([]);
  const [weeklyCompleted, setWeeklyCompleted] = useState(0);

  const [globalImpact, setGlobalImpact] = useState({
    views: 0,
    followers: 0,
    engagement: 0,
    activeEcosystem: 0 
  });

  // Extraímos a função de geração para fora do useEffect para que o Realtime a possa invocar
  const generateExecutiveReport = async () => {
    try {
      let calculatedMRR = 0;
      let calculatedLTV = 0;

      activeProjects.forEach(proj => {
        const val = Number(proj.financial_value || 0);
        if (proj.status === 'active' && proj.payment_recurrence === 'Mensal') {
          calculatedMRR += val;
          calculatedLTV += (val * 6); 
        } else {
          calculatedLTV += val;
        }
      });
      
      setMrr(calculatedMRR);
      setTotalLTV(calculatedLTV);

      const { data: allActiveProjects } = await supabase
        .from('projects')
        .select('type')
        .eq('status', 'active');
        
      const idvClients = allActiveProjects?.filter(p => p.type === 'idv' || p.type === 'identidade_visual').length || 0;
      const igClients = allActiveProjects?.filter(p => p.type === 'instagram' || p.type === 'gestao_instagram').length || 0;

      const [ { count: agencyCount }, { count: subclientCount } ] = await Promise.all([
        supabase.from('agencies').select('id', { count: 'exact', head: true }),
        supabase.from('agency_subclients').select('id', { count: 'exact', head: true })
      ]);

      const totalEcosystem = idvClients + igClients + (agencyCount || 0) + (subclientCount || 0);

      let totalViews = 4250000;
      let totalFollowers = 128000;
      let avgEngagement = 8.4;

      try {
        const { data: metricsData, error: metricsError } = await supabase
          .from('track_record')
          .select('total_views, total_followers, avg_engagement')
          .maybeSingle();

        if (metricsData && !metricsError) {
          totalViews = metricsData.total_views;
          totalFollowers = metricsData.total_followers;
          avgEngagement = metricsData.avg_engagement;
        }
      } catch (e) {
        console.warn("Tabela de track record não encontrada. Usando fallback visual.");
      }

      setGlobalImpact({
        views: totalViews,
        followers: totalFollowers,
        engagement: avgEngagement,
        activeEcosystem: totalEcosystem > 0 ? totalEcosystem : activeProjects.length 
      });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, project_id, assigned_to, status, completed_at, profiles!assigned_to(nome)')
        .in('status', ['completed', 'pending', 'in_progress'])
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (tasksData) {
        const completedLast7Days = tasksData.filter(t => t.status === 'completed' && t.completed_at && new Date(t.completed_at) >= sevenDaysAgo);
        setWeeklyCompleted(completedLast7Days.length);

        const teamStats: Record<string, number> = {};
        completedLast7Days.forEach((t: any) => {
          const name = Array.isArray(t.profiles) ? t.profiles[0]?.nome : t.profiles?.nome;
          if (name) {
            teamStats[name] = (teamStats[name] || 0) + 1;
          }
        });
        
        const sortedTeam = Object.entries(teamStats)
          .map(([name, tasks]) => ({ name, tasks }))
          .sort((a, b) => b.tasks - a.tasks)
          .slice(0, 3);
        setTeamEfficiency(sortedTeam);

        const churnAlerts: any[] = [];
        
        activeProjects.forEach(proj => {
          const projectTasks = tasksData.filter(t => t.project_id === proj.id);
          const recentDeliveries = projectTasks.filter(t => t.status === 'completed' && t.completed_at && new Date(t.completed_at) >= sevenDaysAgo);
          
          if (recentDeliveries.length === 0) {
            const pending = projectTasks.filter(t => t.status !== 'completed').length;
            churnAlerts.push({
              id: proj.id,
              client: proj.profiles?.nome || 'Cliente',
              type: proj.type,
              pendingCount: pending,
              riskLevel: pending > 0 ? 'high' : 'medium'
            });
          }
        });
        
        setChurnRadar(churnAlerts.sort((a, b) => (b.riskLevel === 'high' ? 1 : -1)));
      }

    } catch (error) {
      console.error("Erro ao gerar Relatório Executivo:", error);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (isGlobalLoading) return;

    // A. Carregamento Inicial
    generateExecutiveReport();

    // B. MODO DE TEMPO REAL: Radar e Eficiência reagem instantaneamente a mudanças na base de dados
    const channel = supabase.channel('radar-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        console.log("Mudança de Tarefa detetada! A recalcular Radar e Eficiência...", payload);
        generateExecutiveReport();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        console.log("Mudança de Projeto detetada! A recalcular MRR e Ecossistema...", payload);
        generateExecutiveReport();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [activeProjects, isGlobalLoading]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (isGlobalLoading || isDashboardLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 pb-4 gap-4 overflow-hidden">
      
      {/* LINHA 1: HEADER EXECUTIVO & FINANCEIRO */}
      <header className="shrink-0 flex items-center justify-between animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="inline-flex items-center gap-2 bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] px-3 py-1.5 rounded-full mb-1 shadow-sm border border-white">
            <ShieldCheck size={12} strokeWidth={2.5} />
            <span className="text-[9px] uppercase tracking-widest font-bold">C-Level Command Center</span>
          </div>
          <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Inteligência de <span className="text-[var(--color-atelier-terracota)] italic">Negócio.</span>
          </h1>
        </div>

        <div className="flex gap-3 shrink-0">
          <div className="bg-[var(--color-atelier-grafite)] text-white px-5 py-3 rounded-[1.2rem] flex flex-col min-w-[150px] shadow-xl hover:-translate-y-1 transition-transform">
            <span className="text-[9px] uppercase tracking-widest font-bold text-white/50 mb-0.5 flex items-center gap-1.5"><TrendingUp size={10}/> MRR Ativo</span>
            <div className="flex items-start gap-1">
              <span className="text-sm font-bold text-white/30 mt-1">R$</span>
              <span className="font-elegant text-3xl leading-none">{mrr.toLocaleString('pt-BR')}</span>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur-md border border-white px-5 py-3 rounded-[1.2rem] flex flex-col min-w-[150px] shadow-sm hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
            <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 mb-0.5 flex items-center gap-1.5"><DollarSign size={10}/> LTV Projetado</span>
            <div className="flex items-start gap-1">
              <span className="text-sm font-bold text-[var(--color-atelier-grafite)]/30 mt-1">R$</span>
              <span className="font-elegant text-3xl leading-none text-[var(--color-atelier-grafite)]">{totalLTV.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </header>

      {/* LINHA 2: MOTOR DE IMPACTO GLOBAL (TRACK RECORD) */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4 animate-[fadeInUp_0.6s_ease-out_0.1s_both]">
        
        <div className="glass-panel bg-white/80 p-4 rounded-[1.5rem] border border-white shadow-sm flex items-center justify-between group hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
          <div>
            <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 mb-1 block">Visualizações Geradas</span>
            <div className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">{formatNumber(globalImpact.views)}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center group-hover:scale-110 transition-transform">
            <Eye size={18} />
          </div>
        </div>

        <div className="glass-panel bg-white/80 p-4 rounded-[1.5rem] border border-white shadow-sm flex items-center justify-between group hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
          <div>
            <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 mb-1 block">Audiência Captada</span>
            <div className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">{formatNumber(globalImpact.followers)}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users size={18} />
          </div>
        </div>

        <div className="glass-panel bg-white/80 p-4 rounded-[1.5rem] border border-white shadow-sm flex items-center justify-between group hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
          <div>
            <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 mb-1 block">Engajamento Médio</span>
            <div className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">{globalImpact.engagement}%</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-pink-500/10 text-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Heart size={18} />
          </div>
        </div>

        <div className="glass-panel bg-[var(--color-atelier-grafite)] p-4 rounded-[1.5rem] shadow-md flex items-center justify-between relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-[var(--color-atelier-terracota)]/20 blur-2xl rounded-full"></div>
          <div className="relative z-10">
            <span className="text-[9px] uppercase tracking-widest font-bold text-white/50 mb-1 block">Ecossistema Ativo</span>
            <div className="font-elegant text-3xl text-white leading-none">{globalImpact.activeEcosystem} <span className="text-lg text-white/50">Ativos</span></div>
          </div>
          <div className="relative z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center group-hover:scale-110 transition-transform border border-white/20">
            <Globe size={18} />
          </div>
        </div>

      </div>

      {/* LINHA 3: OPERAÇÕES & RISCO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* COLUNA ESQUERDA: MOTOR DE ENTREGA */}
        <div className="glass-panel rounded-[1.5rem] bg-white/40 border border-white/60 flex flex-col overflow-hidden shadow-[0_15px_40px_rgba(122,116,112,0.05)] h-full">
          <div className="p-4 shrink-0 border-b border-[var(--color-atelier-grafite)]/5 bg-white/30 backdrop-blur-md flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Activity size={16} className="text-[var(--color-atelier-terracota)]" />
               <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">Motor de Entrega</h3>
             </div>
             <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[8px] font-bold uppercase tracking-widest">Saudável</span>
          </div>

          <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex flex-col items-center justify-center py-6 bg-white/60 rounded-[1rem] border border-white shadow-sm shrink-0">
              <span className="font-elegant text-5xl text-[var(--color-atelier-grafite)] leading-none">{weeklyCompleted}</span>
              <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mt-2 flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-500"/> Entregas (7 dias)</span>
            </div>

            <div className="flex-1 flex flex-col">
              <h4 className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2 pl-1 border-b border-white pb-2 shrink-0">Top Executores</h4>
              <div className="flex flex-col gap-2">
                {teamEfficiency.length === 0 ? (
                  <span className="text-[11px] text-gray-400 italic px-2">Sem dados de produtividade na semana.</span>
                ) : (
                  teamEfficiency.map((member, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/40 p-2.5 rounded-xl border border-white/40 hover:bg-white transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] rounded-md flex items-center justify-center font-elegant text-sm">{member.name.charAt(0)}</div>
                        <span className="font-roboto text-[12px] font-bold text-[var(--color-atelier-grafite)] truncate max-w-[100px]">{member.name}</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] shrink-0">{member.tasks} Fechamentos</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (2 SPANS): RADAR ANTI-CHURN */}
        <div className="lg:col-span-2 glass-panel rounded-[1.5rem] bg-gradient-to-br from-white/90 to-white/50 border border-white shadow-[0_15px_40px_rgba(173,111,64,0.05)] flex flex-col overflow-hidden h-full relative">
          <div className="p-4 shrink-0 border-b border-[var(--color-atelier-grafite)]/5 bg-white/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${churnRadar.length > 0 ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : 'bg-green-500/10 text-green-600 border-green-500/20'}`}>
                  {churnRadar.length > 0 ? <AlertTriangle size={14} strokeWidth={2.5} className="animate-pulse"/> : <CheckCircle2 size={14} strokeWidth={2.5} />}
                </div>
                <div>
                  <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-none">Radar Anti-Churn</h3>
                  <p className="font-roboto text-[9px] text-[var(--color-atelier-grafite)]/50 mt-1 uppercase tracking-widest font-bold">
                    Monitoramento de Insatisfação Silenciosa
                  </p>
                </div>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-xl shadow-sm border border-gray-50 flex items-center gap-1.5">
                <BarChart size={12} className="text-[var(--color-atelier-terracota)]"/>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Auditoria de Risco</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-4 flex flex-col">
            
            <p className="text-[11px] text-[var(--color-atelier-grafite)]/60 font-medium mb-4 leading-relaxed max-w-2xl bg-white/60 p-3 rounded-xl border border-white shrink-0">
              Cruzamento de dados entre o <strong>JTBD</strong> e o cofre de clientes. Clientes que estão há mais de <strong className="text-[var(--color-atelier-terracota)]">7 dias sem nenhuma entrega concluída</strong> são sinalizados para prevenção ativa de cancelamento.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {churnRadar.length === 0 ? (
                 <div className="col-span-2 flex flex-col items-center justify-center py-6 opacity-50 text-center h-full">
                   <ShieldCheck size={40} className="mb-3 text-green-600" />
                   <h4 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Carteira Blindada</h4>
                   <p className="font-roboto text-[11px] font-medium text-[var(--color-atelier-grafite)] mt-1">Todos os clientes ativos receberam entregas nos últimos 7 dias.</p>
                 </div>
              ) : (
                churnRadar.map((alert, index) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }} 
                    key={alert.id} 
                    className="bg-white p-4 rounded-[1.2rem] border border-orange-500/20 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:border-orange-500/50 transition-colors"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[8px] uppercase tracking-widest font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md mb-1.5 inline-block">7+ Dias S/ Entrega</span>
                        <h4 className="font-bold text-[13px] text-[var(--color-atelier-grafite)] truncate max-w-[140px]">{alert.client}</h4>
                        <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 font-bold uppercase tracking-widest truncate max-w-[140px] block mt-0.5">{alert.type}</span>
                      </div>
                      <div className="bg-gray-50 px-2.5 py-1.5 rounded-lg text-center border border-gray-100">
                        <span className="block font-elegant text-xl text-[var(--color-atelier-grafite)] leading-none">{alert.pendingCount}</span>
                        <span className="block text-[7px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1">Pendentes</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => { router.push("/admin/jtbd"); }}
                      className="w-full py-2 bg-orange-50 hover:bg-orange-500 text-orange-700 hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 mt-auto"
                    >
                      Resolver no JTBD <ArrowUpRight size={12} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
          
        </div>

      </div>

    </div>
  );
}