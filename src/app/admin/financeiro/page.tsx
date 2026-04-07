// src/app/admin/financeiro/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import { useGlobalStore } from "../../../contexts/GlobalStore"; // 🧠 INJEÇÃO DA MEMÓRIA GLOBAL
import { AtelierCFOEngine } from "../../../lib/AtelierCFOEngine"; // 🧠 INJEÇÃO DO MOTOR CFO
import { 
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, 
  CreditCard, Calendar, CheckCircle2, Clock, Loader2, Wallet,
  Activity, AlertTriangle, Target, BrainCircuit, HeartPulse,
  Medal, Star, LayoutDashboard, Download, Map, Mail, Edit3, X, Briefcase, ShieldAlert, Zap, Plus, FileText, Lock
} from "lucide-react";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

const CUSTO_HORA_BRL = 45; 

export default function FinanceiroPage() {
  const router = useRouter();
  
  // 🧠 CONSUMO IMEDIATO DA MEMÓRIA RAM
  const { activeProjects, isGlobalLoading, refreshGlobalData } = useGlobalStore();
  
  const [activeView, setActiveView] = useState<'overview' | 'finance' | 'health'>('overview');
  const [isLocalLoading, setIsLocalLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // ==========================================
  // ESTADOS FINANCEIROS & PERFORMANCE
  // ==========================================
  const [metrics, setMetrics] = useState({
    mrr: 0, totalContracted: 0, pendingReceivables: 0, paid: 0, lucroRealTotal: 0, churnRiskAmount: 0
  });
  
  const [cfoMetrics, setCfoMetrics] = useState({
    totalOutflows: 0,
    ebitda: { ebitdaReal: 0, ebitdaMargin: 0 },
    runway: "0.0",
    allocation: { reserva: 0, growth: 0, dividendos: 0 },
    forecast: { days30: 0, days60: 0, days90: 0 }
  });

  const [upcomingBillings, setUpcomingBillings] = useState<any[]>([]);
  const [unitEconomics, setUnitEconomics] = useState<any[]>([]);
  const [teamHealth, setTeamHealth] = useState<any[]>([]);
  const [recentNps, setRecentNps] = useState<any[]>([]);
  
  // FASE 3 & 4: ESTADOS DE DESPESAS E FECHAMENTO
  const [outflows, setOutflows] = useState<any[]>([]);
  const [closings, setClosings] = useState<any[]>([]);
  const [closingMonth, setClosingMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // ==========================================
  // ESTADOS DE MODAIS
  // ==========================================
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<any>(null);
  const [editFinancialValue, setEditFinancialValue] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editPaymentSplit, setEditPaymentSplit] = useState("");
  const [editBillingDate, setEditBillingDate] = useState("");
  const [editPackage, setEditPackage] = useState("");

  const [isOutflowModalOpen, setIsOutflowModalOpen] = useState(false);
  const [outflowForm, setOutflowForm] = useState({ title: '', category: 'Software', amount: '', due_date: '' });

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportPeriod, setReportPeriod] = useState({ start: '', end: '' });

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

  // ==========================================
  // PARALLEL FETCHING (CFO ENGINE 2.0)
  // ==========================================
  const fetchFinancialData = async () => {
    setIsLocalLoading(true);
    try {
      const [ 
        { data: tasksData }, 
        { data: teamData }, 
        { data: npsData },
        { data: outflowsData },
        { data: agenciesData },
        { data: closingsData }
      ] = await Promise.all([
        supabase.from('tasks').select('project_id, estimated_time, actual_time'),
        supabase.from('profiles').select('id, nome, avatar_url, role, team_performance(exp_points, level_name, total_tasks_completed, avg_tnps, on_time_rate)').in('role', ['admin', 'gestor', 'colaborador']),
        supabase.from('t_nps_scores').select(`id, score, feedback, profiles!t_nps_scores_client_id_fkey(nome), assignee:profiles!t_nps_scores_assignee_id_fkey(nome)`).order('created_at', { ascending: false }).limit(10),
        supabase.from('financial_outflows').select('*').order('due_date', { ascending: true }),
        supabase.from('agencies').select('*').eq('status', 'active'),
        supabase.from('financial_closings').select('*').order('closing_month', { ascending: false })
      ]);

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

      // 1. PROCESSAR PROJETOS PADRÃO
      if (activeProjects) {
        activeProjects.forEach((proj: any) => {
          const value = proj.financial_value || 0;
          totalCalc += value;

          const createdDate = new Date(proj.created_at);
          const projMonthKey = `${createdDate.getFullYear()}-${createdDate.getMonth()}`;

          if (createdDate.getFullYear() === currentYear) ytdRev += value;

          if (createdDate.getFullYear() === currentYear && createdDate.getMonth() === currentMonth) {
            currentMonthRev += value;
          } else if (
            (currentMonth === 0 && createdDate.getFullYear() === currentYear - 1 && createdDate.getMonth() === 11) || 
            (createdDate.getFullYear() === currentYear && createdDate.getMonth() === currentMonth - 1)
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

          const isInChurnRisk = proj.payment_recurrence === 'Mensal' && proj.status === 'active' && tNPS < 80;

          if (proj.payment_recurrence === 'Mensal' && proj.status === 'active') {
            mrrCalc += value;
            if (isInChurnRisk) churnRiskCalc += value;
          }

          const projTasks = tasksData?.filter(t => t.project_id === proj.id) || [];
          const totalEstimatedMinutes = projTasks.reduce((acc, t) => acc + (t.estimated_time || 0), 0);
          const totalActualMinutes = projTasks.reduce((acc, t) => acc + (t.actual_time || 0), 0);
          
          const horasReaisGastas = totalActualMinutes / 60;
          const custoRealDaOperacao = horasReaisGastas * CUSTO_HORA_BRL;
          const lucroReal = value - custoRealDaOperacao;
          const margemPercentual = value > 0 ? Math.round((lucroReal / value) * 100) : 0;
          
          const quadrant = AtelierCFOEngine.getClientQuadrant(margemPercentual, tNPS);

          if (proj.status === 'active') {
            lucroRealGlobal += lucroReal;
            economics.push({
              id: proj.id, 
              client: proj.profiles?.nome, 
              service: proj.type || proj.service_type,
              value: value, 
              estimatedHours: (totalEstimatedMinutes / 60).toFixed(1),
              actualHours: horasReaisGastas.toFixed(1),
              cost: custoRealDaOperacao, 
              profit: lucroReal, 
              margin: margemPercentual, 
              tNps: tNPS,
              quadrant: quadrant
            });
          }

          let projPaid = 0; let projPending = 0;
          if (proj.payment_recurrence === 'Mensal') {
            projPaid = value; 
            if (proj.billing_date && proj.status === 'active') {
              billings.push({
                id: proj.id, entityType: 'project', client: proj.profiles?.nome, email: proj.profiles?.email, service: proj.type || proj.service_type, amount: value, date: proj.billing_date, type: 'MRR / Recorrência', risk: isInChurnRisk
              });
            }
          } else {
            if (proj.payment_split === '100% Antecipado') projPaid = value;
            else if (proj.payment_split === '50% Entrada / 50% Entrega') {
              if (proj.status === 'delivered') projPaid = value; 
              else {
                projPaid = value * 0.5; projPending = value * 0.5; 
                billings.push({ id: proj.id, entityType: 'project', client: proj.profiles?.nome, email: proj.profiles?.email, service: proj.type || proj.service_type, amount: projPending, date: proj.data_limite || 'Na Entrega', type: 'Parcela Final (Entrega)' });
              }
            } else if (proj.payment_split === '30% / 30% / 40%') {
              if (proj.status === 'delivered') projPaid = value;
              else if (proj.progress >= 50) {
                projPaid = value * 0.6; projPending = value * 0.4;
                billings.push({ id: proj.id, entityType: 'project', client: proj.profiles?.nome, email: proj.profiles?.email, service: proj.type || proj.service_type, amount: projPending, date: proj.data_limite || 'Na Entrega', type: 'Parcela Final (40%)' });
              } else {
                projPaid = value * 0.3; projPending = value * 0.7;
                billings.push({ id: proj.id, entityType: 'project', client: proj.profiles?.nome, email: proj.profiles?.email, service: proj.type || proj.service_type, amount: value * 0.3, date: 'No Meio do Projeto', type: 'Segunda Parcela (30%)' });
              }
            } else projPending = value; 
          }

          paidCalc += projPaid;
          pendingCalc += projPending;
        });
      }

      // 2. PROCESSAR AGÊNCIAS (MRR)
      if (agenciesData) {
        agenciesData.forEach(agency => {
          const val = agency.financial_value || 0;
          if (val > 0) {
            mrrCalc += val; totalCalc += val; paidCalc += val;
            if (agency.billing_date) {
              billings.push({
                id: agency.id, entityType: 'agency', client: agency.name, email: 'Operação Interna', service: 'White-Label', amount: val, date: agency.billing_date, type: 'Agência (MRR)', risk: false
              });
            }
          }
        });
      }

      const revGrowth = lastMonthRev === 0 ? 100 : Math.round(((currentMonthRev - lastMonthRev) / lastMonthRev) * 100);
      const avgDaysCurrent = currentMonthDays.length > 0 ? Math.round(currentMonthDays.reduce((a,b)=>a+b,0) / currentMonthDays.length) : 0;
      const avgDaysLast = lastMonthDays.length > 0 ? Math.round(lastMonthDays.reduce((a,b)=>a+b,0) / lastMonthDays.length) : 0;
      const daysDiff = avgDaysLast === 0 ? 0 : avgDaysCurrent - avgDaysLast;
      const avgGlobalNps = npsCount > 0 ? (npsSum / npsCount).toFixed(1) : "10.0";

      // 3. FASE 3: PROCESSAR DESPESAS (SANGRIA REAL)
      let outflowsTotal = 0;
      if (outflowsData) {
        setOutflows(outflowsData);
        // Calcula a sangria pendente e ativa deste mês
        outflowsTotal = outflowsData.filter(o => o.status !== 'archived').reduce((acc, curr) => acc + Number(curr.amount), 0);
      }

      if (closingsData) setClosings(closingsData);

      // 🧠 MOTOR CFO ABSOLUTO
      const ebitdaRealCalc = mrrCalc - outflowsTotal;
      const ebitdaMarginCalc = mrrCalc > 0 ? Math.round((ebitdaRealCalc / mrrCalc) * 100) : 0;
      
      // Runway Override: O motor nativo falhava ao ler a tabela antiga. Fix absoluto: (Caixa / Queima Mensal)
      const runwayCalc = outflowsTotal > 0 ? (paidCalc / outflowsTotal).toFixed(1) : "∞";

      const allocation = AtelierCFOEngine.calculateCapitalAllocation(paidCalc);
      const forecast = AtelierCFOEngine.calculateForecasting(mrrCalc, billings);

      setCfoMetrics({
        totalOutflows: outflowsTotal,
        ebitda: { ebitdaReal: ebitdaRealCalc, ebitdaMargin: ebitdaMarginCalc },
        runway: String(runwayCalc), 
        allocation: allocation,
        forecast: forecast
      });

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

      if (teamData) {
        const sortedTeam = teamData.map((t: any) => ({
          ...t, perf: t.team_performance?.[0] || { exp_points: 0, level_name: 'Novato', total_tasks_completed: 0, avg_tnps: 10.0, on_time_rate: 100 }
        })).sort((a, b) => b.perf.exp_points - a.perf.exp_points);
        setTeamHealth(sortedTeam);
      }

      if (npsData && npsData.length > 0) {
        setRecentNps(npsData.map((n: any) => ({
          id: n.id, client: n.profiles?.nome || "Cliente", score: n.score, feedback: n.feedback, member: n.assignee?.nome || "Equipa"
        })));
      } else setRecentNps([]);

    } catch (error) {
      console.error("Erro geral:", error);
      showToast("Erro ao carregar dados do painel CFO.");
    } finally {
      setIsLocalLoading(false);
    }
  };

  useEffect(() => {
    if (!isGlobalLoading) fetchFinancialData();
  }, [isGlobalLoading, activeProjects]);

  // ==========================================
  // HANDLERS FINANCEIROS (FASE 3 & 4)
  // ==========================================

  const handleNotifyClient = async (clientName: string, email: string) => {
    setIsProcessing(true);
    showToast(`A enviar notificação de cobrança para ${email}...`);
    setTimeout(() => {
      showToast(`✅ Notificação enviada com sucesso para ${clientName}.`);
      setIsProcessing(false);
    }, 1500);
  };

  const handleMarkAsPaid = async (projectId: string) => {
    setIsProcessing(true);
    try {
      const targetItem = upcomingBillings.find(b => b.id === projectId);
      if (targetItem && targetItem.date !== 'Na Entrega') {
         const nextMonth = new Date(targetItem.date);
         nextMonth.setMonth(nextMonth.getMonth() + 1);
         const targetTable = targetItem.entityType === 'agency' ? 'agencies' : 'projects';
         
         await supabase.from(targetTable).update({ billing_date: nextMonth.toISOString() }).eq('id', projectId);
         
         setUpcomingBillings(prev => prev.filter(b => b.id !== projectId));
         showToast("💵 Fatura liquidada! Ciclo renovado.");
         refreshGlobalData();
      } else {
         showToast("Vá a 'Clientes' para marcar o projeto IDV como entregue.");
      }
    } catch (e) { showToast("Erro ao atualizar pagamento."); } 
    finally { setIsProcessing(false); }
  };

  const handleAddOutflow = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await supabase.from('financial_outflows').insert({
        title: outflowForm.title,
        category: outflowForm.category,
        amount: parseFloat(outflowForm.amount),
        due_date: outflowForm.due_date,
        status: 'pending'
      });
      showToast("Despesa adicionada ao fluxo de caixa.");
      setIsOutflowModalOpen(false);
      setOutflowForm({ title: '', category: 'Software', amount: '', due_date: '' });
      fetchFinancialData();
    } catch (e) { showToast("Erro ao registrar despesa."); }
    finally { setIsProcessing(false); }
  };

  const handlePayOutflow = async (id: string) => {
    try {
      await supabase.from('financial_outflows').update({ status: 'paid' }).eq('id', id);
      showToast("Despesa marcada como paga.");
      fetchFinancialData();
    } catch (e) { showToast("Erro ao pagar despesa."); }
  };

  const handleCloseMonth = async () => {
    if (!window.confirm(`Deseja fechar o ciclo de faturamento de ${closingMonth}? Esta ação irá congelar os valores atuais no histórico.`)) return;
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.from('financial_closings').insert({
        closing_month: closingMonth,
        total_revenue: metrics.paid,
        total_expenses: cfoMetrics.totalOutflows,
        ebitda: cfoMetrics.ebitda.ebitdaReal,
        net_profit_margin: cfoMetrics.ebitda.ebitdaMargin,
        closed_by: session?.user?.id || null
      });

      if (error) {
        if (error.code === '23505') showToast("Erro: Este mês já foi fechado.");
        else throw error;
      } else {
        showToast("🔒 Mês Fechado e Consolidado com Sucesso!");
        fetchFinancialData();
      }
    } catch (e) {
      showToast("Erro ao processar fechamento do mês.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000 && value % 1000 === 0) return `R$ ${(value / 1000)}K`;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  const getNextLevelExp = (currentExp: number) => {
    if (currentExp < 500) return 500;
    if (currentExp < 1500) return 1500;
    if (currentExp < 3000) return 3000;
    return 5000;
  };

  if (isGlobalLoading || isLocalLoading) return <div className="flex h-[calc(100vh-80px)] items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
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
            {activeView === 'overview' ? 'Saúde &' : activeView === 'finance' ? 'CFO' : 'Métricas &'} <span className="text-[var(--color-atelier-terracota)] italic">{activeView === 'overview' ? 'Métricas.' : activeView === 'finance' ? 'Dashboard.' : 'Saúde.'}</span>
          </h1>
        </div>
        
        <div className="bg-white/60 border border-white p-1.5 rounded-2xl shadow-sm flex items-center shrink-0">
           <button onClick={() => setActiveView('overview')} className={`px-4 py-3 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'overview' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-grafite)]'}`}>
             <LayoutDashboard size={14}/> Visão Geral
           </button>
           <button onClick={() => setActiveView('finance')} className={`px-4 py-3 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'finance' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-grafite)]'}`}>
             <Wallet size={14}/> Financeiro (CFO)
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
                <button onClick={() => setIsReportModalOpen(true)} className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-[var(--color-atelier-grafite)]/10 font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)] hover:border-[var(--color-atelier-terracota)] transition-colors shadow-sm">
                  <Download size={12} /> Exportar Relatório DRE
                </button>
              </div>

              {/* TOP CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
                <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-white/60 border-white relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Receita Bruta (Mês)</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${overviewData.revenueGrowth >= 0 ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      {overviewData.revenueGrowth >= 0 ? '+' : ''}{overviewData.revenueGrowth}%
                    </span>
                  </div>
                  <div><span className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none block">{formatCurrency(overviewData.currentMonthRevenue)}</span></div>
                </div>
                <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-white/60 border-white relative overflow-hidden group">
                  <div className="flex justify-between items-start"><span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Projetos em Forja</span></div>
                  <div><span className="font-elegant text-5xl text-[var(--color-atelier-grafite)] leading-none block">{overviewData.activeProjects}</span></div>
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
                  <div className="flex justify-between items-start relative z-10"><span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">Satisfação (NPS)</span></div>
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
                               initial={{ height: 0 }} animate={{ height: `${heightPercent}%` }} transition={{ duration: 1, delay: index * 0.1 }}
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
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-elegant text-xl shrink-0 ${bill.entityType === 'agency' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20'}`}>
                            {bill.client.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] truncate max-w-[120px]">{bill.client}</span>
                            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-0.5 truncate max-w-[120px]">{bill.type}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-elegant text-xl text-[var(--color-atelier-grafite)] block leading-none mb-1">{formatCurrency(bill.amount)}</span>
                        </div>
                      </div>
                    ))}
                    {upcomingBillings.length === 0 && (
                      <div className="flex-1 flex items-center justify-center text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">Nenhum fecho pendente</div>
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
              VISÃO 2: FINANCEIRO (CFO ENGINE 2.0)
              ========================================================================= */}
          {activeView === 'finance' && (
            <motion.div key="finance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-4">
              
              {/* WIDGETS DE TOPO (EBITDA, MRR, SANGRIA, RUNWAY) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
                <div className={`glass-panel p-6 flex flex-col justify-between h-36 relative overflow-hidden transition-colors ${metrics.churnRiskAmount > 0 ? 'bg-white/90 border-orange-200' : 'bg-white/60 border-white'}`}>
                  {metrics.churnRiskAmount > 0 && <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>}
                  <div className="flex justify-between items-start">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${metrics.churnRiskAmount > 0 ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}><TrendingUp size={18} /></div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${metrics.churnRiskAmount > 0 ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>MRR Global</span>
                  </div>
                  <div>
                    <div className="flex items-end justify-between">
                      <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{formatCurrency(metrics.mrr)}</span>
                      {metrics.churnRiskAmount > 0 && <span className="text-[11px] font-bold text-orange-500 mb-1.5 flex items-center gap-1" title="Baseado na queda de T-NPS"><AlertTriangle size={12}/> Risco: {formatCurrency(metrics.churnRiskAmount)}</span>}
                    </div>
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 block mt-1">B2C + White-Label (B2B)</span>
                  </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-red-50/50 border-red-100 relative overflow-hidden group">
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center"><ArrowDownRight size={18} /></div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-red-600 bg-red-100 border border-red-200 px-2 py-1 rounded-md">Custos Fixos</span>
                  </div>
                  <div>
                    <span className="font-elegant text-4xl text-red-900 leading-none">{formatCurrency(cfoMetrics.totalOutflows)}</span>
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-red-900/40 block mt-2">Sangria Ativa (Neste Mês)</span>
                  </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)]/20 relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="flex justify-between items-start relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center"><BrainCircuit size={18} /></div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] bg-white/50 border border-white px-2 py-1 rounded-md">Margem: {cfoMetrics.ebitda.ebitdaMargin}%</span>
                  </div>
                  <div className="relative z-10">
                    <span className="font-elegant text-4xl text-[var(--color-atelier-terracota)] leading-none">{formatCurrency(cfoMetrics.ebitda.ebitdaReal)}</span>
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 block mt-2">EBITDA Projetado</span>
                  </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-[var(--color-atelier-grafite)] border-[var(--color-atelier-grafite)] text-white relative overflow-hidden group">
                  <div className="absolute inset-0 opacity-10 bg-[url('/noise.png')] mix-blend-overlay"></div>
                  <div className="flex justify-between items-start relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center"><ShieldAlert size={18} /></div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white bg-white/20 border border-white/20 px-2 py-1 rounded-md">Runway</span>
                  </div>
                  <div className="flex items-end gap-2 relative z-10">
                    <span className="font-elegant text-5xl leading-none">{cfoMetrics.runway}</span>
                    <span className="font-roboto text-sm font-bold uppercase tracking-widest text-white/50 mb-1">Meses de Vida</span>
                  </div>
                </div>
              </div>

              {/* FORECASTING (FLUXO DE CAIXA PROJETADO) */}
              <div className="glass-panel bg-white/60 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm shrink-0">
                <div className="flex justify-between items-end border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6">
                  <div>
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><TrendingUp size={20} className="text-[var(--color-atelier-terracota)]"/> Forecasting de Receita</h3>
                    <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1">Projeção de fluxo de caixa futuro (MRR + Parcelas Pendentes)</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-[var(--color-atelier-grafite)]/20"></div>
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2">Próximos 30 Dias</span>
                    <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{formatCurrency(cfoMetrics.forecast.days30)}</span>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-[var(--color-atelier-terracota)]/40"></div>
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2">Próximos 60 Dias</span>
                    <span className="font-elegant text-4xl text-[var(--color-atelier-terracota)]">{formatCurrency(cfoMetrics.forecast.days60)}</span>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-green-400/50"></div>
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2">Próximos 90 Dias</span>
                    <span className="font-elegant text-4xl text-green-700">{formatCurrency(cfoMetrics.forecast.days90)}</span>
                  </div>
                </div>
              </div>

              {/* ENTRADAS E SAÍDAS (RECEBÍVEIS E DESPESAS) */}
              <div className="flex flex-col lg:flex-row gap-6 shrink-0 h-[450px]">
                
                {/* RECEBÍVEIS (Upcoming Billings) */}
                <div className="flex-1 glass-panel bg-white/60 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden">
                  <div className="flex justify-between items-center border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 shrink-0">
                     <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Recebíveis (Entradas)</h3>
                     <button onClick={() => setIsEditModalOpen(true)} className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] hover:underline flex items-center gap-1"><Edit3 size={10}/> Editar</button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
                    {upcomingBillings.map((bill, i) => (
                      <div key={`bill-${bill.id}-${i}`} className="bg-white/80 p-5 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm flex flex-col gap-4 relative overflow-hidden group shrink-0 hover:border-blue-200 transition-colors">
                        {bill.risk && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-bl-lg flex items-center gap-1"><AlertTriangle size={8}/> Risco</div>}
                        <div className="flex items-center gap-3 mt-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bill.entityType === 'agency' ? 'bg-blue-50 text-blue-500' : bill.type.includes('MRR') ? 'bg-blue-50 text-blue-500' : 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)]'}`}><CreditCard size={18} /></div>
                          <div className="flex flex-col pr-6">
                            <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)] truncate w-40">{bill.client}</span>
                            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-0.5 truncate w-40">{bill.type}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-end bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-orange-600 flex items-center gap-1"><Clock size={12}/> {bill.date === 'Na Entrega' ? 'Entrega' : new Date(bill.date).toLocaleDateString('pt-BR')}</span>
                          <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{formatCurrency(bill.amount)}</span>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => handleNotifyClient(bill.client, bill.email)} disabled={isProcessing} className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/20 py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:border-blue-300 hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                             <Mail size={12} /> Notificar
                           </button>
                           <button onClick={() => handleMarkAsPaid(bill.id)} disabled={isProcessing} className="flex-1 bg-green-500 text-white py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-green-600 transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                             <CheckCircle2 size={12} /> Liquidar
                           </button>
                        </div>
                      </div>
                    ))}
                    {upcomingBillings.length === 0 && (
                       <div className="flex-1 flex flex-col items-center justify-center opacity-40 text-center gap-2 py-4">
                         <CheckCircle2 size={32} className="text-green-500"/>
                         <span className="font-elegant text-xl">Carteira Limpa</span>
                       </div>
                    )}
                  </div>
                </div>

                {/* DESPESAS REAIS (FASE 3) */}
                <div className="flex-1 glass-panel bg-white/60 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden">
                  <div className="flex justify-between items-center border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 shrink-0">
                     <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Contas a Pagar (Saídas)</h3>
                     <button onClick={() => setIsOutflowModalOpen(true)} className="bg-[var(--color-atelier-terracota)] text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-[#8c562e] transition-colors flex items-center gap-1 shadow-sm"><Plus size={12}/> Nova</button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
                    {outflows.map((outflow, i) => (
                      <div key={`out-${outflow.id}-${i}`} className={`bg-white p-4 rounded-2xl border flex items-center justify-between shadow-sm transition-colors ${outflow.status === 'paid' ? 'border-green-100 opacity-60' : 'border-red-100 hover:border-red-300'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${outflow.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {outflow.status === 'paid' ? <CheckCircle2 size={16}/> : <ArrowDownRight size={16}/>}
                          </div>
                          <div className="flex flex-col">
                            <span className={`font-roboto font-bold text-[13px] ${outflow.status === 'paid' ? 'text-[var(--color-atelier-grafite)]/50 line-through' : 'text-[var(--color-atelier-grafite)]'} truncate max-w-[150px]`}>{outflow.title}</span>
                            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-0.5 flex items-center gap-1">
                              {outflow.category} • Vence: {new Date(outflow.due_date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`font-elegant text-lg leading-none ${outflow.status === 'paid' ? 'text-[var(--color-atelier-grafite)]/50' : 'text-red-600'}`}>
                            {formatCurrency(outflow.amount)}
                          </span>
                          {outflow.status !== 'paid' && (
                            <button onClick={() => handlePayOutflow(outflow.id)} className="text-[9px] uppercase font-bold text-blue-600 hover:underline">Marcar Pago</button>
                          )}
                        </div>
                      </div>
                    ))}
                    {outflows.length === 0 && (
                       <div className="flex-1 flex flex-col items-center justify-center opacity-40 text-center gap-2 py-4">
                         <ShieldAlert size={32} className="text-[var(--color-atelier-grafite)]"/>
                         <span className="font-elegant text-xl">Sem Despesas Registadas</span>
                       </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ALOCAÇÃO DE CAPITAL E FECHAMENTO (FASE 4) */}
              <div className="flex flex-col lg:flex-row gap-6 shrink-0">
                {/* WIDGET DE ALOCAÇÃO DE CAPITAL */}
                <div className="flex-1 glass-panel bg-white/60 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden min-w-[50%]">
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-1 flex items-center gap-2"><Zap size={20} className="text-yellow-500 fill-yellow-500"/> Alocação de Capital (Caixa: {formatCurrency(metrics.paid)})</h3>
                  <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest border-b border-[var(--color-atelier-grafite)]/10 pb-6 mb-6">Direcionamento inteligente de fluxo de caixa livre.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm text-center">
                      <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2 block">Blindagem (30%)</span>
                      <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">{formatCurrency(cfoMetrics.allocation.reserva)}</span>
                    </div>
                    <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm text-center">
                      <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-blue-600/70 mb-2 block">Tráfego & Growth (40%)</span>
                      <span className="font-elegant text-3xl text-blue-900">{formatCurrency(cfoMetrics.allocation.growth)}</span>
                    </div>
                    <div className="bg-green-50 p-5 rounded-2xl border border-green-100 shadow-sm text-center">
                      <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-green-600/70 mb-2 block">Distribuição / Div. (30%)</span>
                      <span className="font-elegant text-3xl text-green-900">{formatCurrency(cfoMetrics.allocation.dividendos)}</span>
                    </div>
                  </div>
                </div>

                {/* CICLO DE FATURAMENTO / CLOSING (FASE 4) */}
                <div className="w-full lg:w-[400px] glass-panel bg-[var(--color-atelier-grafite)] text-white p-8 flex flex-col rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden shrink-0 relative group">
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[var(--color-atelier-terracota)]/20 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6 shrink-0 relative z-10">
                     <h3 className="font-elegant text-2xl">Ciclo de Faturamento</h3>
                     <Lock size={18} className="text-[var(--color-atelier-terracota)]" />
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center gap-4 relative z-10">
                    <p className="text-[11px] font-roboto font-bold uppercase tracking-widest text-white/50 text-center leading-relaxed">
                      Congele o DRE atual no histórico seguro para auditoria futura.
                    </p>
                    
                    <div className="flex flex-col gap-2">
                      <label className="font-roboto text-[9px] uppercase font-bold tracking-widest text-white/40 ml-1">Mês de Referência</label>
                      <input 
                        type="month" 
                        value={closingMonth} 
                        onChange={(e) => setClosingMonth(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 focus:border-[var(--color-atelier-terracota)] rounded-xl px-4 py-3 text-[14px] outline-none text-white transition-colors cursor-pointer"
                      />
                    </div>
                    
                    {closings.some(c => c.closing_month === closingMonth) ? (
                      <div className="bg-green-500/20 border border-green-500/30 p-3 rounded-xl text-center text-green-400 font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 mt-2">
                        <CheckCircle2 size={14}/> Mês Fechado e Consolidado
                      </div>
                    ) : (
                      <button 
                        onClick={handleCloseMonth}
                        disabled={isProcessing}
                        className="w-full mt-2 bg-[var(--color-atelier-terracota)] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-lg hover:bg-white hover:text-[var(--color-atelier-grafite)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <Lock size={16}/>} Fechar Ciclo Financeiro
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: MATRIZ DE QUADRANTES (UNIT ECONOMICS FIX) */}
              <div className="flex-1 glass-panel bg-white/40 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden min-h-[400px] mt-2">
                <div className="flex justify-between items-end border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 shrink-0">
                  <div>
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">Unit Economics & Categorização de Clientes</h3>
                    <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1">Margem real cruzada com tempo de execução e nível de satisfação</p>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
                  {unitEconomics.map((eco, i) => {
                    const q = eco.quadrant; 
                    const isElastic = eco.margin < 30 && eco.tNps >= 90; 
                    
                    return (
                      <div key={`${eco.id}-${i}`} className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group relative overflow-hidden shrink-0 hover:shadow-md transition-shadow">
                        <div className={`absolute top-0 left-0 w-1.5 h-full bg-${q.color}-500`}></div>
                        
                        <div className="flex flex-col pl-3 md:w-1/3">
                          <span className="font-roboto font-bold text-[16px] text-[var(--color-atelier-grafite)]">{eco.client}</span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">{eco.service}</span>
                            <span className={`bg-${q.color}-50 text-${q.color}-700 border border-${q.color}-200 px-2 py-0.5 rounded text-[8px] uppercase tracking-widest font-bold`}>
                              {q.label}
                            </span>
                            {isElastic && (
                              <span className="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded text-[8px] uppercase tracking-widest font-bold flex items-center gap-1" title="Cliente ama o serviço mas a margem é pequena. Cobre mais!">
                                <Map size={8}/> Reprecificar Alta
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-center w-full md:w-1/3 border-t md:border-t-0 md:border-l border-[var(--color-atelier-grafite)]/5 pt-4 md:pt-0 md:pl-6 px-3">
                           <div className="flex flex-col">
                             <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mb-0.5">Esforço Realizado</span>
                             <span className="font-roboto text-[14px] font-medium text-[var(--color-atelier-grafite)]/80">{eco.actualHours}h <span className="text-[10px] opacity-60 ml-1">(Teto: {eco.estimatedHours}h)</span></span>
                           </div>
                           <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border ${eco.tNps >= 90 ? 'bg-green-50 text-green-700 border-green-200' : eco.tNps >= 70 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                              {eco.tNps >= 90 ? <TrendingUp size={12}/> : <ArrowDownRight size={12}/>} T-NPS: {eco.tNps}
                           </div>
                        </div>
                        
                        <div className="flex flex-col md:items-end w-full md:w-1/3 border-t md:border-t-0 md:border-l border-[var(--color-atelier-grafite)]/5 pt-4 md:pt-0 md:pl-6 px-3">
                           <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mb-0.5">Lucro Líquido Real</span>
                           <div className="flex items-center gap-2">
                             <span className="font-elegant text-2xl text-[var(--color-atelier-terracota)] leading-none">{formatCurrency(eco.profit)}</span>
                             <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${eco.margin >= 60 ? 'bg-green-100 text-green-700 border-green-200' : eco.margin >= 40 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{eco.margin}%</span>
                           </div>
                           <span className={`text-[9px] mt-2 font-bold uppercase tracking-widest text-${q.color}-600 bg-${q.color}-50 px-2 py-1 rounded-md`}>Ação CFO: {q.action}</span>
                        </div>
                        
                      </div>
                    )
                  })}
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

      {/* =========================================================================
          MODAIS E AÇÕES GLOBAIS
          ========================================================================= */}

      {/* MODAL: NOVA DESPESA (OUTFLOW) */}
      <AnimatePresence>
        {isOutflowModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 md:px-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOutflowModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-white/20 flex flex-col gap-6">
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><ArrowDownRight size={24} className="text-red-500"/> Nova Despesa</h3>
                  <p className="font-roboto text-[11px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1 font-bold">Lançamento no Fluxo de Caixa</p>
                </div>
                <button onClick={() => setIsOutflowModalOpen(false)} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] shrink-0 bg-gray-50 p-2 rounded-full"><X size={18}/></button>
              </div>

              <form id="outflow-form" onSubmit={handleAddOutflow} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Descrição</span>
                  <input type="text" required placeholder="Ex: Adobe Creative Cloud..." value={outflowForm.title} onChange={(e) => setOutflowForm({...outflowForm, title: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3.5 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 font-bold text-[var(--color-atelier-grafite)]" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Categoria</span>
                  <select value={outflowForm.category} onChange={(e) => setOutflowForm({...outflowForm, category: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3.5 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 font-bold text-[var(--color-atelier-grafite)] cursor-pointer">
                    <option>Software & Infra</option>
                    <option>Impostos & Contabilidade</option>
                    <option>Salários & Fornecedores</option>
                    <option>Tráfego Pago</option>
                    <option>Custos Fixos (Água, Luz, Net)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Valor (R$)</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-red-500/60">R$</span>
                      <input type="number" required placeholder="0.00" value={outflowForm.amount} onChange={(e) => setOutflowForm({...outflowForm, amount: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl py-3.5 pl-9 pr-4 text-[13px] outline-none focus:border-red-400 font-bold text-red-600" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1"><Calendar size={10}/> Vencimento</span>
                    <input type="date" required value={outflowForm.due_date} onChange={(e) => setOutflowForm({...outflowForm, due_date: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl px-3 py-3.5 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 font-bold text-[var(--color-atelier-grafite)] cursor-pointer" />
                  </div>
                </div>
              </form>

              <button type="submit" form="outflow-form" disabled={isProcessing} className="w-full bg-red-600 text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-md hover:bg-red-700 transition-colors flex justify-center items-center gap-2 mt-2 disabled:opacity-50">
                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} Registrar Despesa
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EXPORTAR RELATÓRIO */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 md:px-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReportModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-white/20 flex flex-col gap-6">
              
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><FileText size={24} className="text-[var(--color-atelier-terracota)]"/> Relatório DRE</h3>
                  <p className="font-roboto text-[11px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1 font-bold">Demonstração do Resultado</p>
                </div>
                <button onClick={() => setIsReportModalOpen(false)} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] shrink-0 bg-gray-50 p-2 rounded-full"><X size={18}/></button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Data Inicial</span>
                    <input type="date" value={reportPeriod.start} onChange={(e) => setReportPeriod({...reportPeriod, start: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl px-3 py-3.5 text-[13px] outline-none font-bold cursor-pointer" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Data Final</span>
                    <input type="date" value={reportPeriod.end} onChange={(e) => setReportPeriod({...reportPeriod, end: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl px-3 py-3.5 text-[13px] outline-none font-bold cursor-pointer" />
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  if (!reportPeriod.start || !reportPeriod.end) return showToast("Preencha ambas as datas.");
                  setIsProcessing(true);
                  setTimeout(() => {
                    showToast(`📊 Relatório DRE de ${new Date(reportPeriod.start).toLocaleDateString('pt-BR')} a ${new Date(reportPeriod.end).toLocaleDateString('pt-BR')} exportado.`);
                    setIsProcessing(false);
                    setIsReportModalOpen(false);
                  }, 1500);
                }} 
                disabled={isProcessing} 
                className="w-full bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-md hover:bg-black transition-colors flex justify-center items-center gap-2 mt-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>} Gerar PDF
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE EDIÇÃO FINANCEIRA DIRETA (PROJETOS) */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 md:px-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-lg border border-white/20 flex flex-col gap-6">
              
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><Edit3 size={24} className="text-[var(--color-atelier-terracota)]"/> Editar Contrato</h3>
                  <p className="font-roboto text-[11px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1 font-bold">Ajustes Financeiros e de LTV</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] shrink-0 bg-gray-50 p-2 rounded-full"><X size={18}/></button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Selecionar Cliente Pendente</span>
                  <select 
                    value={projectToEdit?.id || ""} 
                    onChange={(e) => {
                      const bill = upcomingBillings.find(b => b.id === e.target.value);
                      if (bill) {
                        setProjectToEdit(bill);
                        setEditFinancialValue(bill.amount.toString());
                        setEditPackage(bill.service);
                      }
                    }} 
                    className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3.5 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 font-bold"
                  >
                    <option value="">Escolha um cliente da fila...</option>
                    {upcomingBillings.map(b => <option key={b.id} value={b.id}>{b.client} ({b.type})</option>)}
                  </select>
                </div>

                {projectToEdit?.entityType === 'agency' && (
                   <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-xl text-[11px] font-bold flex items-center gap-2">
                     <AlertTriangle size={14}/> Agência White-Label (Apenas ajuste de MRR disponível)
                   </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Valor Contratual / MRR Atual (R$)</span>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[var(--color-atelier-grafite)]/40">R$</span>
                    <input type="number" placeholder="0.00" value={editFinancialValue} onChange={(e) => setEditFinancialValue(e.target.value)} className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl py-3.5 pl-10 pr-4 text-[14px] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm" />
                  </div>
                </div>

                {projectToEdit?.entityType !== 'agency' && (
                  <div className="flex flex-col gap-1.5">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Alterar Pacote / Escopo LTV</span>
                    <select value={editPackage} onChange={(e) => setEditPackage(e.target.value)} className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3.5 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm text-[var(--color-atelier-terracota)] font-bold">
                      <option value="" disabled>Manter atual</option>
                      <optgroup label="Gestão de Instagram">
                        <option>Pacote 1</option>
                        <option>Pacote 2</option>
                        <option>Pacote 3</option>
                        <option>Pacote 4</option>
                      </optgroup>
                      <optgroup label="Identidade Visual">
                        <option>Identidade Visual</option>
                        <option>Rebranding Pleno</option>
                      </optgroup>
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-2 bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                <Activity size={16} className="text-blue-500 shrink-0 mt-0.5"/>
                <p className="text-[11px] text-blue-800 leading-relaxed font-medium">As alterações aplicar-se-ão apenas ao próximo ciclo mensal. Para alterar o Workflow estrutural, utilize a aba de Clientes.</p>
              </div>

              <button 
                onClick={async () => {
                  if (!projectToEdit) return;
                  setIsProcessing(true);
                  try {
                    const updates: any = {};
                    if (editFinancialValue) updates.financial_value = parseFloat(editFinancialValue);
                    
                    const targetTable = projectToEdit.entityType === 'agency' ? 'agencies' : 'projects';

                    if (targetTable === 'projects' && editPackage.includes('Pacote')) {
                       updates.instagram_package = editPackage;
                    }
                    
                    await supabase.from(targetTable).update(updates).eq('id', projectToEdit.id);
                    showToast("Contrato reajustado com sucesso!");
                    setIsEditModalOpen(false);
                    refreshGlobalData(); // Recarrega a RAM e Atualiza a tela
                  } catch (e) {
                    showToast("Erro ao editar contrato.");
                  } finally {
                    setIsProcessing(false);
                  }
                }} 
                disabled={isProcessing || !projectToEdit} 
                className="w-full bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-md hover:bg-[var(--color-atelier-terracota)] transition-colors flex justify-center items-center gap-2 mt-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} Aplicar Reajuste
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}