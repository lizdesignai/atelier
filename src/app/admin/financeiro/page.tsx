// src/app/admin/financeiro/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { 
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, 
  CreditCard, Calendar, CheckCircle2, Clock, Loader2, Wallet,
  Activity, AlertTriangle, Target, BrainCircuit, HeartPulse,
  Medal, Star, LayoutDashboard, Download, ArrowDown, Map
} from "lucide-react";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

const CUSTO_HORA_BRL = 45; 

export default function FinanceiroPage() {
  const [activeView, setActiveView] = useState<'overview' | 'finance' | 'health'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  
  // ==========================================
  // ESTADOS FINANCEIROS & PERFORMANCE
  // ==========================================
  const [metrics, setMetrics] = useState({
    mrr: 0, totalContracted: 0, pendingReceivables: 0, paid: 0, lucroRealTotal: 0, churnRiskAmount: 0
  });
  const [upcomingBillings, setUpcomingBillings] = useState<any[]>([]);
  const [unitEconomics, setUnitEconomics] = useState<any[]>([]);
  const [teamHealth, setTeamHealth] = useState<any[]>([]);
  const [recentNps, setRecentNps] = useState<any[]>([]);

  // ==========================================
  // ESTADOS: VISÃO GERAL (Analytics Preditivo Real)
  // ==========================================
  const [overviewData, setOverviewData] = useState({
    currentMonthRevenue: 0,
    revenueGrowth: 0,
    activeProjects: 0,
    avgDeliveryDays: 0,
    deliveryDaysChange: 0,
    avgNps: 0,
    ytdRevenue: 0,
    chartData: [] as { monthKey: string, monthLabel: string, value: number }[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. CARREGAR DADOS FINANCEIROS E PROJETOS
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*, profiles(nome, empresa)')
        .in('status', ['active', 'delivered']);

      if (error) throw error;

      // 2. CARREGAR TAREFAS PARA CRUZAMENTO DE TEMPO REAL (UNIT ECONOMICS)
      const { data: tasksData } = await supabase.from('tasks').select('project_id, estimated_time, actual_time');

      let mrrCalc = 0; let totalCalc = 0; let pendingCalc = 0; let paidCalc = 0;
      let lucroRealGlobal = 0; let churnRiskCalc = 0;
      let billings: any[] = []; let economics: any[] = [];

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      let currentMonthRev = 0; let lastMonthRev = 0;
      let activeProjCount = 0;
      let npsSum = 0; let npsCount = 0;
      let ytdRev = 0;
      let currentMonthDays: number[] = []; let lastMonthDays: number[] = [];

      const last6Months: { monthKey: string, monthLabel: string, value: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        last6Months.push({
          monthKey: `${d.getFullYear()}-${d.getMonth()}`,
          monthLabel: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
          value: 0
        });
      }

      if (projects) {
        projects.forEach((proj: any) => {
          const value = proj.financial_value || 0;
          totalCalc += value;

          // CÁLCULOS VISÃO GERAL
          const createdDate = new Date(proj.created_at);
          const projMonth = createdDate.getMonth();
          const projYear = createdDate.getFullYear();
          const projMonthKey = `${projYear}-${projMonth}`;

          if (projYear === currentYear) ytdRev += value;

          if (projYear === currentYear && projMonth === currentMonth) {
            currentMonthRev += value;
          } else if (
            (currentMonth === 0 && projYear === currentYear - 1 && projMonth === 11) || 
            (projYear === currentYear && projMonth === currentMonth - 1)
          ) {
            lastMonthRev += value;
          }

          const chartItem = last6Months.find(m => m.monthKey === projMonthKey);
          if (chartItem) chartItem.value += value;

          if (proj.status === 'active') activeProjCount++;

          const tNPS = proj.brand_health_score || 100;
          npsSum += (tNPS / 10); 
          npsCount++;

          if (proj.status === 'delivered' && proj.delivered_at) {
            const deliveredDate = new Date(proj.delivered_at);
            const days = Math.ceil(Math.abs(deliveredDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (deliveredDate.getFullYear() === currentYear && deliveredDate.getMonth() === currentMonth) {
              currentMonthDays.push(days);
            } else if (
              (currentMonth === 0 && deliveredDate.getFullYear() === currentYear - 1 && deliveredDate.getMonth() === 11) || 
              (deliveredDate.getFullYear() === currentYear && deliveredDate.getMonth() === currentMonth - 1)
            ) {
              lastMonthDays.push(days);
            }
          }

          // ==========================================
          // NOVO UNIT ECONOMICS (Custo Operacional Sênior)
          // ==========================================
          const isInChurnRisk = proj.payment_recurrence === 'Mensal' && proj.status === 'active' && tNPS < 80;

          if (proj.payment_recurrence === 'Mensal' && proj.status === 'active') {
            mrrCalc += value;
            if (isInChurnRisk) churnRiskCalc += value;
          }

          // Cruza os dados do JTBD deste projeto específico
          const projTasks = tasksData?.filter(t => t.project_id === proj.id) || [];
          const totalEstimatedMinutes = projTasks.reduce((acc, t) => acc + (t.estimated_time || 0), 0);
          const totalActualMinutes = projTasks.reduce((acc, t) => acc + (t.actual_time || 0), 0);
          
          const horasReaisGastas = totalActualMinutes / 60;
          const custoRealDaOperacao = horasReaisGastas * CUSTO_HORA_BRL;
          const lucroReal = value - custoRealDaOperacao;
          const margemPercentual = value > 0 ? Math.round((lucroReal / value) * 100) : 0;
          
          if (proj.status === 'active') {
            lucroRealGlobal += lucroReal;
            economics.push({
              id: proj.id, 
              client: proj.profiles?.nome, 
              service: proj.type,
              value: value, 
              estimatedHours: (totalEstimatedMinutes / 60).toFixed(1),
              actualHours: horasReaisGastas.toFixed(1),
              cost: custoRealDaOperacao, 
              profit: lucroReal, 
              margin: margemPercentual, 
              tNps: tNPS
            });
          }

          // LÓGICA DE SPLIT DE PAGAMENTOS
          let projPaid = 0; let projPending = 0;
          if (proj.payment_recurrence === 'Mensal') {
            projPaid = value; 
            if (proj.billing_date && proj.status === 'active') {
              billings.push({
                id: proj.id, client: proj.profiles?.nome, service: proj.type, amount: value,
                date: proj.billing_date, type: 'MRR / Recorrência Mensal', risk: isInChurnRisk
              });
            }
          } else {
            if (proj.payment_split === '100% Antecipado') projPaid = value;
            else if (proj.payment_split === '50% Entrada / 50% Entrega') {
              if (proj.status === 'delivered') projPaid = value; 
              else {
                projPaid = value * 0.5; projPending = value * 0.5; 
                billings.push({ id: proj.id, client: proj.profiles?.nome, service: proj.type, amount: projPending, date: proj.data_limite || 'Na Entrega', type: 'Parcela Final (Entrega)' });
              }
            } else if (proj.payment_split === '30% / 30% / 40%') {
              if (proj.status === 'delivered') projPaid = value;
              else if (proj.progress >= 50) {
                projPaid = value * 0.6; projPending = value * 0.4;
                billings.push({ id: proj.id, client: proj.profiles?.nome, service: proj.type, amount: projPending, date: proj.data_limite || 'Na Entrega', type: 'Parcela Final (40%)' });
              } else {
                projPaid = value * 0.3; projPending = value * 0.7;
                billings.push({ id: proj.id, client: proj.profiles?.nome, service: proj.type, amount: value * 0.3, date: 'No Meio do Projeto', type: 'Segunda Parcela (30%)' });
              }
            } else projPending = value; 
          }

          paidCalc += projPaid;
          pendingCalc += projPending;
        });
      }

      const revGrowth = lastMonthRev === 0 ? 100 : Math.round(((currentMonthRev - lastMonthRev) / lastMonthRev) * 100);
      const avgDaysCurrent = currentMonthDays.length > 0 ? Math.round(currentMonthDays.reduce((a,b)=>a+b,0) / currentMonthDays.length) : 0;
      const avgDaysLast = lastMonthDays.length > 0 ? Math.round(lastMonthDays.reduce((a,b)=>a+b,0) / lastMonthDays.length) : 0;
      const daysDiff = avgDaysLast === 0 ? 0 : avgDaysCurrent - avgDaysLast;
      const avgGlobalNps = npsCount > 0 ? (npsSum / npsCount).toFixed(1) : "10.0";

      setOverviewData({
        currentMonthRevenue: currentMonthRev,
        revenueGrowth: revGrowth,
        activeProjects: activeProjCount,
        avgDeliveryDays: avgDaysCurrent || 18,
        deliveryDaysChange: daysDiff,
        avgNps: parseFloat(avgGlobalNps),
        ytdRevenue: ytdRev,
        chartData: last6Months
      });

      setMetrics({ mrr: mrrCalc, totalContracted: totalCalc, pendingReceivables: pendingCalc, paid: paidCalc, lucroRealTotal: lucroRealGlobal, churnRiskAmount: churnRiskCalc });
      
      billings.sort((a, b) => {
        if (a.date === 'Na Entrega') return 1; if (b.date === 'Na Entrega') return -1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      setUpcomingBillings(billings);
      
      economics.sort((a, b) => a.margin - b.margin);
      setUnitEconomics(economics);

      // CARREGAR DADOS DE SAÚDE (GAMIFICAÇÃO & T-NPS REAIS)
      const { data: teamData } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url, role, team_performance(exp_points, level_name, total_tasks_completed, avg_tnps, on_time_rate)')
        .in('role', ['admin', 'gestor', 'colaborador']);
      
      if (teamData) {
        const sortedTeam = teamData.map(t => ({
          ...t, perf: t.team_performance?.[0] || { exp_points: 0, level_name: 'Novato', total_tasks_completed: 0, avg_tnps: 10.0, on_time_rate: 100 }
        })).sort((a, b) => b.perf.exp_points - a.perf.exp_points);
        setTeamHealth(sortedTeam);
      }

      const { data: npsData } = await supabase
        .from('t_nps_scores')
        .select(`
          id, score, feedback, 
          profiles!t_nps_scores_client_id_fkey(nome), 
          assignee:profiles!t_nps_scores_assignee_id_fkey(nome)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (npsData && npsData.length > 0) {
        setRecentNps(npsData.map((n: any) => ({
          id: n.id,
          client: n.profiles?.nome || "Cliente",
          score: n.score,
          feedback: n.feedback,
          member: n.assignee?.nome || "Equipa"
        })));
      } else {
        setRecentNps([]);
      }

    } catch (error) {
      console.error("Erro geral:", error);
      showToast("Erro ao carregar dados do painel.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000 && value % 1000 === 0) {
      return `R$ ${(value / 1000)}K`;
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  const getNextLevelExp = (currentExp: number) => {
    if (currentExp < 500) return 500;
    if (currentExp < 1500) return 1500;
    if (currentExp < 3000) return 3000;
    return 5000;
  };

  if (isLoading) return <div className="flex h-[calc(100vh-80px)] items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  const maxChartValue = Math.max(...overviewData.chartData.map(d => d.value), 1000);

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6 px-4 md:px-0">
      
      {/* HEADER DE COMANDO TRIPLO */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4 mt-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] w-8 h-8 rounded-xl flex items-center justify-center">
              {activeView === 'overview' ? <LayoutDashboard size={16} className="text-[var(--color-atelier-terracota)]" /> : activeView === 'finance' ? <DollarSign size={16} className="text-[var(--color-atelier-terracota)]" /> : <HeartPulse size={16} className="text-[var(--color-atelier-terracota)]" />}
            </span>
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">
              Inteligência de Negócio
            </span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            {activeView === 'overview' ? 'Saúde &' : activeView === 'finance' ? 'Centro' : 'Métricas &'} <span className="text-[var(--color-atelier-terracota)] italic">{activeView === 'overview' ? 'Métricas.' : activeView === 'finance' ? 'Financeiro.' : 'Saúde.'}</span>
          </h1>
        </div>
        
        <div className="bg-white/60 border border-white p-1.5 rounded-2xl shadow-sm flex items-center shrink-0">
           <button onClick={() => setActiveView('overview')} className={`px-4 py-3 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'overview' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-grafite)]'}`}>
             <LayoutDashboard size={14}/> Visão Geral
           </button>
           <button onClick={() => setActiveView('finance')} className={`px-4 py-3 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'finance' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-grafite)]'}`}>
             <Wallet size={14}/> Económico
           </button>
           <button onClick={() => setActiveView('health')} className={`px-4 py-3 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'health' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-grafite)]'}`}>
             <Medal size={14}/> Performance
           </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">

          {/* =========================================================================
              VISÃO 1: SAÚDE & MÉTRICAS (OVERVIEW)
              ========================================================================= */}
          {activeView === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-4">
              
              <div className="flex justify-between items-center bg-white/60 border border-white p-4 rounded-2xl shadow-sm shrink-0">
                <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2">
                  <Calendar size={14}/> Últimos 6 Meses Consolidado
                </span>
                <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-[var(--color-atelier-grafite)]/10 font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)] hover:border-[var(--color-atelier-terracota)] transition-colors shadow-sm">
                  <Download size={12} /> Exportar Relatório
                </button>
              </div>

              {/* TOP CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-white/60 border-white relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Receita Bruta (Mês)</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${overviewData.revenueGrowth >= 0 ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      {overviewData.revenueGrowth >= 0 ? '+' : ''}{overviewData.revenueGrowth}%
                    </span>
                  </div>
                  <div>
                    <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none block">{formatCurrency(overviewData.currentMonthRevenue)}</span>
                  </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-white/60 border-white relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Projetos em Forja</span>
                  </div>
                  <div>
                    <span className="font-elegant text-5xl text-[var(--color-atelier-grafite)] leading-none block">{overviewData.activeProjects}</span>
                  </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-white/60 border-white relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Ciclo de Manufatura</span>
                    {overviewData.deliveryDaysChange !== 0 && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded border ${overviewData.deliveryDaysChange < 0 ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                        {overviewData.deliveryDaysChange > 0 ? '+' : ''}{overviewData.deliveryDaysChange} Dias
                      </span>
                    )}
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="font-elegant text-5xl text-[var(--color-atelier-grafite)] leading-none block">{overviewData.avgDeliveryDays}</span>
                    <span className="font-roboto text-sm font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/30 mb-1">Dias</span>
                  </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)]/20 relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-2xl"></div>
                  <div className="flex justify-between items-start relative z-10">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">Satisfação (NPS)</span>
                  </div>
                  <div className="flex items-end gap-2 relative z-10">
                    <span className="font-elegant text-5xl text-[var(--color-atelier-terracota)] leading-none block">{overviewData.avgNps}</span>
                    <span className="font-roboto text-sm font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]/50 mb-1">/10</span>
                  </div>
                </div>

              </div>

              {/* MAIN BODY */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                
                {/* EVOLUÇÃO DE RECEITA (GRÁFICO) */}
                <div className="lg:col-span-8 glass-panel bg-white/40 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-full">
                  <div className="flex justify-between items-start shrink-0">
                    <div>
                      <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Evolução de Receita</h3>
                      <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/50 mt-1 max-w-sm">Crescimento financeiro dos últimos 6 meses consolidados.</p>
                    </div>
                    <div className="text-right">
                      <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] block">{formatCurrency(overviewData.ytdRevenue)}</span>
                      <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)]">YTD Total</span>
                    </div>
                  </div>

                  <div className="flex-1 flex items-end justify-between mt-8 relative px-4">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      <div className="w-full border-t border-[var(--color-atelier-grafite)]/5 border-dashed"></div>
                      <div className="w-full border-t border-[var(--color-atelier-grafite)]/5 border-dashed"></div>
                      <div className="w-full border-t border-[var(--color-atelier-grafite)]/5 border-dashed"></div>
                      <div className="w-full border-t border-[var(--color-atelier-grafite)]/5 border-dashed"></div>
                    </div>

                    {overviewData.chartData.map((data, index) => {
                      const heightPercent = Math.max((data.value / maxChartValue) * 100, 5); 
                      return (
                        <div key={index} className="relative flex flex-col items-center group h-full justify-end z-10 w-[10%]">
                          <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--color-atelier-grafite)] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest whitespace-nowrap pointer-events-none">
                            {formatCurrency(data.value)}
                          </div>
                          
                          <div className="w-full bg-[var(--color-atelier-creme)]/50 rounded-t-xl relative border border-white overflow-hidden" style={{ height: '80%' }}>
                             <motion.div 
                               initial={{ height: 0 }}
                               animate={{ height: `${heightPercent}%` }}
                               transition={{ duration: 1, delay: index * 0.1 }}
                               className={`absolute bottom-0 w-full rounded-t-xl transition-colors duration-300 ${index === 5 ? 'bg-[var(--color-atelier-terracota)]' : 'bg-[var(--color-atelier-grafite)]/10 group-hover:bg-[var(--color-atelier-terracota)]/50'}`}
                             ></motion.div>
                          </div>
                          
                          <span className="font-roboto text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50 mt-3">{data.monthLabel}</span>
                          <span className={`font-roboto text-[11px] font-bold mt-1 ${index === 5 ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>{formatCurrency(data.value)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* PRÓXIMOS FECHOS (TOP 3) */}
                <div className="lg:col-span-4 glass-panel bg-white/60 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-full">
                  <div className="flex justify-between items-center border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 shrink-0">
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Próximos Fechos</h3>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-4">
                    {upcomingBillings.slice(0, 3).map((bill, i) => (
                      <div key={i} className="bg-white/80 p-5 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm flex items-center justify-between group hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20 flex items-center justify-center font-elegant text-xl shrink-0">
                            {bill.client.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] truncate max-w-[120px]">{bill.client}</span>
                            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-0.5">{bill.type}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-elegant text-xl text-[var(--color-atelier-grafite)] block leading-none mb-1">{formatCurrency(bill.amount)}</span>
                        </div>
                      </div>
                    ))}
                    {upcomingBillings.length === 0 && (
                      <div className="flex-1 flex items-center justify-center text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">
                        Nenhum fecho pendente
                      </div>
                    )}
                  </div>
                  
                  <button onClick={() => setActiveView('finance')} className="w-full mt-4 py-4 rounded-xl border border-[var(--color-atelier-grafite)]/10 text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-grafite)] hover:text-white transition-all shadow-sm">
                    Ver Funil Completo
                  </button>
                </div>

              </div>
            </motion.div>
          )}
          
          {/* =========================================================================
              VISÃO 2: FINANCEIRO E PREDIÇÃO (ECONÓMICO) - UNIT ECONOMICS REAL
              ========================================================================= */}
          {activeView === 'finance' && (
            <motion.div key="finance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className={`glass-panel p-6 flex flex-col justify-between h-36 relative overflow-hidden transition-colors ${metrics.churnRiskAmount > 0 ? 'bg-white/90 border-orange-200' : 'bg-white/60 border-white'}`}>
                  {metrics.churnRiskAmount > 0 && <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>}
                  <div className="flex justify-between items-start">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${metrics.churnRiskAmount > 0 ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}><TrendingUp size={18} /></div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${metrics.churnRiskAmount > 0 ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>Predictive MRR</span>
                  </div>
                  <div>
                    <div className="flex items-end justify-between">
                      <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{formatCurrency(metrics.mrr)}</span>
                      {metrics.churnRiskAmount > 0 && (
                        <span className="text-[11px] font-bold text-orange-500 mb-1.5 flex items-center gap-1" title="Baseado na queda de T-NPS"><AlertTriangle size={12}/> Risco: {formatCurrency(metrics.churnRiskAmount)}</span>
                      )}
                    </div>
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 block mt-1">Receita Mensal Recorrente</span>
                  </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)]/20 relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="flex justify-between items-start relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center"><BrainCircuit size={18} /></div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] bg-white/50 border border-white px-2 py-1 rounded-md">Margem Operacional Real</span>
                  </div>
                  <div className="relative z-10">
                    <span className="font-elegant text-4xl text-[var(--color-atelier-terracota)] leading-none">{formatCurrency(metrics.lucroRealTotal)}</span>
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 block mt-2">Custo Baseado no JTBD</span>
                  </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-white/60 border-white">
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 text-[var(--color-atelier-grafite)] flex items-center justify-center"><ArrowDownRight size={18} /></div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 bg-gray-50 border border-gray-100 px-2 py-1 rounded-md">Recebíveis</span>
                  </div>
                  <div>
                    <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none">{formatCurrency(metrics.pendingReceivables)}</span>
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 block mt-2">Valores Pendentes</span>
                  </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-white/60 border-white">
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center"><ArrowUpRight size={18} /></div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-green-600 bg-green-50 border border-green-100 px-2 py-1 rounded-md">Liquidado</span>
                  </div>
                  <div>
                    <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none">{formatCurrency(metrics.paid)}</span>
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 block mt-2">Capital em Caixa</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-7 glass-panel bg-white/40 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-[400px]">
                  <div className="flex justify-between items-end border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 shrink-0">
                    <div>
                      <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">Unit Economics (Lucratividade Sênior)</h3>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
                    {unitEconomics.map((eco, i) => {
                      // Se a margem for muito baixa mas o NPS for alto, avisa a elasticidade de preço
                      const elasticidadeDePreco = eco.margin < 30 && eco.tNps >= 90;
                      
                      return (
                        <div key={`${eco.id}-${i}`} className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm flex flex-col gap-4 group relative overflow-hidden">
                          <div className={`absolute top-0 left-0 w-1 h-full ${eco.margin >= 60 ? 'bg-green-500' : eco.margin >= 40 ? 'bg-yellow-400' : 'bg-orange-500'}`}></div>
                          
                          <div className="flex justify-between items-start pl-2">
                            <div className="flex flex-col">
                              <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">{eco.client}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">{eco.service}</span>
                                {elasticidadeDePreco && (
                                  <span className="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded text-[8px] uppercase tracking-widest font-bold flex items-center gap-1">
                                    <Map size={8}/> Reprecificar (Elasticidade Alta)
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold border ${eco.tNps >= 90 ? 'bg-green-50 text-green-700 border-green-200' : eco.tNps >= 70 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                 {eco.tNps >= 90 ? <TrendingUp size={12}/> : <ArrowDownRight size={12}/>} T-NPS: {eco.tNps}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6 pl-2 pt-3 border-t border-[var(--color-atelier-grafite)]/5">
                             <div className="flex flex-col">
                               <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40">Contrato</span>
                               <span className="font-roboto text-[13px] font-bold text-[var(--color-atelier-grafite)]">{formatCurrency(eco.value)}</span>
                             </div>
                             <div className="flex flex-col border-l border-[var(--color-atelier-grafite)]/10 pl-4">
                               <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40">Tempo Real</span>
                               <span className="font-roboto text-[13px] font-medium text-[var(--color-atelier-grafite)]/80">{eco.actualHours}h <span className="text-[9px]">(Est: {eco.estimatedHours}h)</span></span>
                             </div>
                             <div className="flex flex-col ml-auto text-right">
                               <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">Lucro Real</span>
                               <div className="flex items-center gap-2">
                                 <span className="font-elegant text-xl text-[var(--color-atelier-terracota)] leading-none">{formatCurrency(eco.profit)}</span>
                                 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${eco.margin >= 60 ? 'bg-green-100 text-green-700' : eco.margin >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}`}>{eco.margin}%</span>
                               </div>
                             </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="lg:col-span-5 glass-panel bg-white/60 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-[400px]">
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 flex items-center justify-between shrink-0">
                     <span>Próximas Cobranças</span>
                     <Calendar size={20} className="text-[var(--color-atelier-terracota)]" />
                  </h3>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
                    {upcomingBillings.map((bill, i) => (
                      <div key={`bill-${bill.id}-${i}`} className="bg-white/80 p-4 rounded-2xl border border-white shadow-sm flex flex-col gap-3 relative overflow-hidden">
                        {bill.risk && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-bl-lg flex items-center gap-1"><AlertTriangle size={8}/> Risco de Churn</div>}
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bill.type.includes('MRR') ? 'bg-blue-50 text-blue-500' : 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)]'}`}><CreditCard size={18} /></div>
                          <div className="flex flex-col pr-6">
                            <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] truncate">{bill.client}</span>
                            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-0.5">{bill.type}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-end border-t border-[var(--color-atelier-grafite)]/5 pt-2">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-1"><Clock size={12}/> {bill.date === 'Na Entrega' ? 'Na Entrega' : new Date(bill.date).toLocaleDateString('pt-BR')}</span>
                          <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{formatCurrency(bill.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* =========================================================================
              VISÃO 3: MÉTRICAS E SAÚDE DA EQUIPA (GAMIFICAÇÃO & T-NPS)
              ========================================================================= */}
          {activeView === 'health' && (
            <motion.div key="health" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-4">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-8 bg-white/60 rounded-[2.5rem] flex flex-col gap-4 border border-white items-center text-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-green-500/10 text-green-600 flex items-center justify-center mb-2"><Star size={24} /></div>
                  <span className="font-elegant text-5xl text-[var(--color-atelier-grafite)] leading-none">{overviewData.avgNps}</span>
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Média Global de T-NPS</span>
                </div>
                
                <div className="glass-panel p-8 bg-white/60 rounded-[2.5rem] flex flex-col gap-4 border border-white items-center text-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2"><Activity size={24} /></div>
                  <span className="font-elegant text-5xl text-[var(--color-atelier-grafite)] leading-none">94%</span>
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Entregas no Prazo (On-Time)</span>
                </div>

                <div className="glass-panel p-8 bg-[var(--color-atelier-terracota)]/5 border border-[var(--color-atelier-terracota)]/20 rounded-[2.5rem] flex flex-col items-center text-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-[var(--color-atelier-terracota)] text-white flex items-center justify-center mb-4 shadow-lg"><Medal size={24} /></div>
                  <span className="font-roboto text-[14px] font-bold text-[var(--color-atelier-grafite)]">{teamHealth[0]?.nome || "Membro"}</span>
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mt-1">Top Performer do Mês</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                {/* LEADERBOARD */}
                <div className="lg:col-span-8 glass-panel bg-white/40 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-[450px]">
                  <div className="flex justify-between items-end border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 shrink-0">
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">Leaderboard de Produtividade</h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
                    {teamHealth.map((member, index) => {
                      const nextLevelExp = getNextLevelExp(member.perf.exp_points);
                      const progress = Math.min((member.perf.exp_points / nextLevelExp) * 100, 100);
                      
                      return (
                        <div key={member.id} className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm flex flex-col md:flex-row items-center gap-6 relative">
                          <div className="absolute top-0 left-0 bg-[var(--color-atelier-grafite)] text-white w-6 h-6 rounded-br-lg flex items-center justify-center text-[10px] font-bold">#{index + 1}</div>
                          
                          <div className="flex items-center gap-4 w-full md:w-1/3 shrink-0 pl-4">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-inner border border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] flex items-center justify-center font-elegant text-2xl">
                              {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" alt="" /> : member.nome.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">{member.nome}</span>
                              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)]">{member.perf.level_name}</span>
                            </div>
                          </div>

                          <div className="flex-1 w-full flex flex-col gap-2">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">
                              <span>Experiência (EXP)</span>
                              <span>{member.perf.exp_points} / {nextLevelExp}</span>
                            </div>
                            <div className="h-2.5 w-full bg-[var(--color-atelier-grafite)]/5 rounded-full overflow-hidden shadow-inner">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1 }} className="h-full bg-gradient-to-r from-[var(--color-atelier-rose)] to-[var(--color-atelier-terracota)] rounded-full"></motion.div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 w-full md:w-auto shrink-0 justify-between md:justify-end border-t md:border-t-0 md:border-l border-[var(--color-atelier-grafite)]/10 pt-4 md:pt-0 md:pl-6">
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">T-NPS</span>
                              <span className="font-roboto font-bold text-[14px] text-green-600 flex items-center gap-1"><Star size={12}/> {member.perf.avg_tnps}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">Tarefas</span>
                              <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)] flex items-center gap-1"><CheckCircle2 size={12}/> {member.perf.total_tasks_completed}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* FEEDBACKS T-NPS RECENTES */}
                <div className="lg:col-span-4 glass-panel bg-white/60 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-[450px]">
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 flex items-center justify-between shrink-0">
                    <span>Feedbacks (T-NPS)</span>
                    <HeartPulse size={20} className="text-[var(--color-atelier-terracota)]" />
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
                    {recentNps.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full opacity-40 text-center">
                        <HeartPulse size={32} className="mb-2" />
                        <p className="font-elegant text-xl">Aguardando Avaliações</p>
                      </div>
                    ) : (
                      recentNps.map((nps, i) => (
                        <div key={i} className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <span className="font-roboto font-bold text-[12px] text-[var(--color-atelier-grafite)]">{nps.client}</span>
                              <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mt-0.5">Resp: {nps.member}</span>
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${nps.score >= 9 ? 'bg-green-100 text-green-700' : nps.score >= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              {nps.score}
                            </div>
                          </div>
                          <p className="text-[12px] text-[var(--color-atelier-grafite)]/70 italic leading-relaxed">"{nps.feedback}"</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}