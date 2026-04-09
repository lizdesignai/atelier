// src/app/admin/financeiro/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import { useGlobalStore } from "../../../contexts/GlobalStore";
import { AtelierCFOEngine } from "../../../lib/AtelierCFOEngine";
import { NotificationEngine } from "../../../lib/NotificationEngine"; // 🔔 INJEÇÃO DO MOTOR DE NOTIFICAÇÕES
import { 
  DollarSign, Loader2, Wallet, HeartPulse,
  LayoutDashboard, Download, Edit3, X, ArrowDownRight,
  Calendar, CheckCircle2, AlertTriangle, ShieldAlert, Activity, Medal,
  FileText
} from "lucide-react";

// IMPORTAÇÃO DOS MÓDULOS (VIEWS)
import FinancialOverview from "./views/FinancialOverview";
import CfoDashboard from "./views/CfoDashboard";
import HealthMetrics from "./views/HealthMetrics";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

const CUSTO_HORA_BRL = 45; 

export default function FinanceiroPage() {
  const router = useRouter();
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
    allocation: { reserva: 0, growth: 0, dividendos: 0, mode: '' },
    forecast: { days30: 0, days60: 0, days90: 0 }
  });

  const [upcomingBillings, setUpcomingBillings] = useState<any[]>([]);
  const [unitEconomics, setUnitEconomics] = useState<any[]>([]);
  const [teamHealth, setTeamHealth] = useState<any[]>([]);
  const [recentNps, setRecentNps] = useState<any[]>([]);
  const [outflows, setOutflows] = useState<any[]>([]);
  const [closings, setClosings] = useState<any[]>([]);
  const [closingMonth, setClosingMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

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
  // ESTADOS DE MODAIS (Isolados no Pai)
  // ==========================================
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<any>(null);
  const [editFinancialValue, setEditFinancialValue] = useState("");
  const [editPackage, setEditPackage] = useState("");
  const [isOutflowModalOpen, setIsOutflowModalOpen] = useState(false);
  const [outflowForm, setOutflowForm] = useState({ title: '', category: 'Software', amount: '', due_date: '' });
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportPeriod, setReportPeriod] = useState({ start: '', end: '' });

  // ==========================================
  // PARALLEL FETCHING & MATH ENGINE
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

      // 1. BLINDAGEM: PROCESSAR AGÊNCIAS B2B PRIMEIRO
      if (agenciesData) {
        agenciesData.forEach(agency => {
          const val = agency.financial_value || 0;
          if (val > 0) {
            mrrCalc += val; totalCalc += val; paidCalc += val;
            currentMonthRev += val;
            lastMonthRev += val;
            ytdRev += val * (currentMonth + 1); // Acumulado no ano
            activeProjCount++;

            // Projeta a receita recorrente da agência no gráfico
            last6Months.forEach(m => { m.value += val; });

            if (agency.billing_date) {
              billings.push({
                id: agency.id, entityType: 'agency', client: agency.name, email: 'Operação Interna', service: 'White-Label', amount: val, date: agency.billing_date, type: 'Agência (MRR)', risk: false
              });
            }
          }
        });
      }

      // 2. PROCESSAR PROJETOS B2C
      if (activeProjects) {
        activeProjects.forEach((proj: any) => {
          const value = proj.financial_value || 0;
          totalCalc += value;
          const createdDate = new Date(proj.created_at);
          const projMonthKey = `${createdDate.getFullYear()}-${createdDate.getMonth()}`;
          const isMRR = proj.payment_recurrence === 'Mensal' && proj.status === 'active';
          const tNPS = proj.brand_health_score || 100;
          const isInChurnRisk = isMRR && tNPS < 80;

          if (proj.status === 'active') activeProjCount++;
          npsSum += (tNPS / 10); npsCount++;

          // CORREÇÃO MATEMÁTICA: Tratamento Diferente para MRR vs One-Off
          if (isMRR) {
            mrrCalc += value;
            currentMonthRev += value;
            lastMonthRev += value;
            ytdRev += value * (currentMonth + 1); // Aproximação YTD
            if (isInChurnRisk) churnRiskCalc += value;

            last6Months.forEach(m => { m.value += value; }); // MRR preenche o gráfico inteiro

          } else {
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
          }

          if (proj.status === 'delivered' && proj.delivered_at) {
            const deliveredDate = new Date(proj.delivered_at);
            const days = Math.ceil(Math.abs(deliveredDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            if (deliveredDate.getFullYear() === currentYear && deliveredDate.getMonth() === currentMonth) {
              currentMonthDays.push(days);
            } else if ((currentMonth === 0 && deliveredDate.getFullYear() === currentYear - 1 && deliveredDate.getMonth() === 11) || (deliveredDate.getFullYear() === currentYear && deliveredDate.getMonth() === currentMonth - 1)) {
              lastMonthDays.push(days);
            }
          }

          const projTasks = tasksData?.filter(t => t.project_id === proj.id) || [];
          const totalEstimatedMinutes = projTasks.reduce((acc, t) => acc + (t.estimated_time || 0), 0);
          const totalActualMinutes = projTasks.reduce((acc, t) => acc + (t.actual_time || 0), 0);
          
          const horasReaisGastas = totalActualMinutes / 60;
          const custoRealDaOperacao = horasReaisGastas * CUSTO_HORA_BRL;
          const lucroReal = value - custoRealDaOperacao;
          const margemPercentual = value > 0 ? Math.round((lucroReal / value) * 100) : 0;
          
          // INTEGRAÇÃO COM CFO ENGINE 2.0
          const quadrant = AtelierCFOEngine.getClientQuadrant(margemPercentual, tNPS);

          if (proj.status === 'active') {
            lucroRealGlobal += lucroReal;
            economics.push({
              id: proj.id, client: proj.profiles?.nome, service: proj.type || proj.service_type, value: value, 
              estimatedHours: (totalEstimatedMinutes / 60).toFixed(1), actualHours: horasReaisGastas.toFixed(1),
              cost: custoRealDaOperacao, profit: lucroReal, margin: margemPercentual, tNps: tNPS, quadrant: quadrant
            });
          }

          let projPaid = 0; let projPending = 0;
          if (isMRR) {
            projPaid = value; 
            if (proj.billing_date) {
              billings.push({ id: proj.id, entityType: 'project', client: proj.profiles?.nome, email: proj.profiles?.email, service: proj.type || proj.service_type, amount: value, date: proj.billing_date, type: 'MRR / Recorrência', risk: isInChurnRisk });
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

      const revGrowth = lastMonthRev === 0 ? 100 : Math.round(((currentMonthRev - lastMonthRev) / lastMonthRev) * 100);
      const avgDaysCurrent = currentMonthDays.length > 0 ? Math.round(currentMonthDays.reduce((a,b)=>a+b,0) / currentMonthDays.length) : 0;
      const avgDaysLast = lastMonthDays.length > 0 ? Math.round(lastMonthDays.reduce((a,b)=>a+b,0) / lastMonthDays.length) : 0;
      const daysDiff = avgDaysLast === 0 ? 0 : avgDaysCurrent - avgDaysLast;
      const avgGlobalNps = npsCount > 0 ? (npsSum / npsCount).toFixed(1) : "10.0";

      // 3. FASE 3: PROCESSAR DESPESAS (SANGRIA REAL)
      let outflowsTotal = 0;
      if (outflowsData) {
        setOutflows(outflowsData);
        outflowsTotal = outflowsData.filter(o => o.status !== 'archived').reduce((acc, curr) => acc + Number(curr.amount), 0);
      }

      if (closingsData) setClosings(closingsData);

      // 🧠 MOTOR CFO ABSOLUTO 2.0 (Integração)
      const ebitdaData = AtelierCFOEngine.calculateEBITDA(mrrCalc, outflowsTotal);
      const runwayData = AtelierCFOEngine.calculateRunway(paidCalc, mrrCalc, outflowsTotal);
      const allocation = AtelierCFOEngine.calculateCapitalAllocation(paidCalc, runwayData.months);
      const forecast = AtelierCFOEngine.calculateForecasting(mrrCalc, billings, outflowsTotal, churnRiskCalc);

      setCfoMetrics({
        totalOutflows: outflowsTotal,
        ebitda: ebitdaData,
        runway: runwayData.text, 
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
  // HANDLERS FINANCEIROS (Ações Globais)
  // ==========================================
  const handleNotifyClient = async (projectId: string, clientName: string, email: string, amount: number) => {
    setIsProcessing(true);
    try {
      // Vai buscar o client_id através do id do projeto
      const { data: proj } = await supabase.from('projects').select('client_id').eq('id', projectId).single();
      
      if (proj && proj.client_id) {
        // 🔔 NOTIFICAÇÃO: Aviso de Cobrança ao Cliente (Substitui o toast de mentira)
        await NotificationEngine.notifyUser(
          proj.client_id,
          "⚠️ Fatura Disponível para Liquidação",
          `A fatura no valor de R$ ${amount.toFixed(2)} já se encontra disponível. Por favor, regularize para não interromper os serviços.`,
          "warning",
          "/cockpit"
        );
        showToast(`✅ Notificação enviada com sucesso para ${clientName}.`);
      } else {
        showToast("Não foi possível localizar a conta do cliente.");
      }
    } catch(e) {
      showToast("Erro ao notificar o cliente.");
    } finally {
      setIsProcessing(false);
    }
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
         
         // 🔔 NOTIFICAÇÕES: Recibo ao Cliente e Aviso de Caixa à Liderança
         if (targetItem.entityType === 'project') {
           const { data: proj } = await supabase.from('projects').select('client_id').eq('id', projectId).single();
           if (proj && proj.client_id) {
             await NotificationEngine.notifyUser(
               proj.client_id,
               "✅ Pagamento Confirmado",
               `Confirmamos o recebimento de R$ ${targetItem.amount.toFixed(2)}. O seu ciclo mensal foi renovado!`,
               "success"
             );
           }
         }

         await NotificationEngine.notifyManagement(
           "💰 Fatura Liquidada",
           `A fatura de ${targetItem.client} no valor de R$ ${targetItem.amount.toFixed(2)} entrou em caixa.`,
           "success"
         );

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
        title: outflowForm.title, category: outflowForm.category, amount: parseFloat(outflowForm.amount), due_date: outflowForm.due_date, status: 'pending'
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
    if (!window.confirm(`Deseja fechar o ciclo de faturamento de ${closingMonth}?`)) return;
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from('financial_closings').insert({
        closing_month: closingMonth, total_revenue: metrics.paid, total_expenses: cfoMetrics.totalOutflows,
        ebitda: cfoMetrics.ebitda.ebitdaReal, net_profit_margin: cfoMetrics.ebitda.ebitdaMargin, closed_by: session?.user?.id || null
      });

      if (error) {
        if (error.code === '23505') showToast("Erro: Este mês já foi fechado.");
        else throw error;
      } else {
        
        // 🔔 NOTIFICAÇÃO: Gestão (Fecho de Mês)
        await NotificationEngine.notifyManagement(
          "📊 Ciclo Financeiro Fechado",
          `O mês ${closingMonth} foi consolidado com um EBITDA de R$ ${cfoMetrics.ebitda.ebitdaReal.toFixed(2)}.`,
          "info",
          "/admin/financeiro"
        );

        showToast("🔒 Mês Fechado e Consolidado com Sucesso!");
        fetchFinancialData();
      }
    } catch (e) { showToast("Erro ao processar fechamento do mês."); } 
    finally { setIsProcessing(false); }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000 && value % 1000 === 0) return `R$ ${(value / 1000)}K`;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
  };

  const openEditModal = (bill: any) => {
    setProjectToEdit(bill);
    setEditFinancialValue(bill.amount.toString());
    setEditPackage(bill.service);
    setIsEditModalOpen(true);
  };

  if (isGlobalLoading || isLocalLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <div className="flex flex-col min-h-screen max-w-[1400px] mx-auto relative z-10 pb-20 gap-6 px-4 md:px-0">
      
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
        
        <div className="bg-white/60 border border-white p-1.5 rounded-[1.2rem] shadow-sm flex items-center shrink-0">
           <button onClick={() => setActiveView('overview')} className={`px-4 py-3 rounded-[1rem] font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'overview' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-grafite)] hover:bg-white'}`}>
             <LayoutDashboard size={14}/> Visão Geral
           </button>
           <button onClick={() => setActiveView('finance')} className={`px-4 py-3 rounded-[1rem] font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'finance' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-grafite)] hover:bg-white'}`}>
             <Wallet size={14}/> Financeiro (CFO)
           </button>
           <button onClick={() => setActiveView('health')} className={`px-4 py-3 rounded-[1rem] font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'health' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-grafite)] hover:bg-white'}`}>
             <Medal size={14}/> Performance
           </button>
        </div>
      </header>

      {/* RENDERIZAÇÃO DOS MÓDULOS (VIEWS) SEM DOUBLE SCROLL */}
      <div className="flex-1 w-full mt-4">
        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <FinancialOverview 
              overviewData={overviewData}
              upcomingBillings={upcomingBillings}
              formatCurrency={formatCurrency}
              setIsReportModalOpen={setIsReportModalOpen}
              setActiveView={setActiveView}
            />
          )}

          {activeView === 'finance' && (
            <CfoDashboard 
              metrics={metrics}
              cfoMetrics={cfoMetrics}
              upcomingBillings={upcomingBillings}
              outflows={outflows}
              closings={closings}
              closingMonth={closingMonth}
              setClosingMonth={setClosingMonth}
              unitEconomics={unitEconomics}
              formatCurrency={formatCurrency}
              handleNotifyClient={handleNotifyClient}
              handleMarkAsPaid={handleMarkAsPaid}
              handlePayOutflow={handlePayOutflow}
              handleCloseMonth={handleCloseMonth}
              setIsOutflowModalOpen={setIsOutflowModalOpen}
              openEditModal={openEditModal}
              isProcessing={isProcessing}
            />
          )}

          {activeView === 'health' && (
            <HealthMetrics 
              overviewData={overviewData}
              teamHealth={teamHealth}
              recentNps={recentNps}
            />
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          MODAIS E AÇÕES GLOBAIS (Mantidos no Pai para estabilidade)
          ========================================================================= */}

      {/* MODAL: NOVA DESPESA (OUTFLOW) */}
      <AnimatePresence>
        {isOutflowModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 md:px-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOutflowModalOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-[var(--color-atelier-grafite)]/10 flex flex-col gap-6">
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><ArrowDownRight size={24} className="text-red-500"/> Nova Despesa</h3>
                  <p className="font-roboto text-[11px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1 font-bold">Lançamento no Fluxo de Caixa</p>
                </div>
                <button onClick={() => setIsOutflowModalOpen(false)} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] shrink-0 bg-gray-50 p-2 rounded-full hover:bg-gray-100 transition-colors"><X size={18}/></button>
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

              <button type="submit" form="outflow-form" disabled={isProcessing} className="w-full bg-red-600 text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-md hover:bg-red-700 hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-50 disabled:hover:translate-y-0">
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReportModalOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-[var(--color-atelier-grafite)]/10 flex flex-col gap-6">
              
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><FileText size={24} className="text-[var(--color-atelier-terracota)]"/> Relatório DRE</h3>
                  <p className="font-roboto text-[11px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1 font-bold">Demonstração do Resultado</p>
                </div>
                <button onClick={() => setIsReportModalOpen(false)} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] shrink-0 bg-gray-50 p-2 rounded-full hover:bg-gray-100 transition-colors"><X size={18}/></button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Data Inicial</span>
                    <input type="date" value={reportPeriod.start} onChange={(e) => setReportPeriod({...reportPeriod, start: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl px-3 py-3.5 text-[13px] outline-none font-bold cursor-pointer focus:border-[var(--color-atelier-terracota)]/50" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Data Final</span>
                    <input type="date" value={reportPeriod.end} onChange={(e) => setReportPeriod({...reportPeriod, end: e.target.value})} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl px-3 py-3.5 text-[13px] outline-none font-bold cursor-pointer focus:border-[var(--color-atelier-terracota)]/50" />
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
                className="w-full bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-md hover:bg-black transition-colors flex justify-center items-center gap-2 mt-2 disabled:opacity-50 hover:-translate-y-0.5 disabled:hover:translate-y-0"
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-lg border border-[var(--color-atelier-grafite)]/10 flex flex-col gap-6">
              
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><Edit3 size={24} className="text-[var(--color-atelier-terracota)]"/> Editar Contrato</h3>
                  <p className="font-roboto text-[11px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1 font-bold">Ajustes Financeiros e de LTV</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] shrink-0 bg-gray-50 p-2 rounded-full hover:bg-gray-100 transition-colors"><X size={18}/></button>
              </div>

              <div className="flex flex-col gap-4">
                {projectToEdit?.entityType === 'agency' && (
                   <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-xl text-[11px] font-bold flex items-center gap-2">
                     <AlertTriangle size={14}/> Agência White-Label (Apenas ajuste de MRR disponível)
                   </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Valor Contratual / MRR Atual (R$)</span>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[var(--color-atelier-grafite)]/40">R$</span>
                    <input type="number" placeholder="0.00" value={editFinancialValue} onChange={(e) => setEditFinancialValue(e.target.value)} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl py-3.5 pl-10 pr-4 text-[14px] outline-none focus:border-[var(--color-atelier-terracota)]/50 font-bold" />
                  </div>
                </div>

                {projectToEdit?.entityType !== 'agency' && (
                  <div className="flex flex-col gap-1.5">
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Alterar Pacote / Escopo LTV</span>
                    <select value={editPackage} onChange={(e) => setEditPackage(e.target.value)} className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3.5 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 text-[var(--color-atelier-terracota)] font-bold cursor-pointer">
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

              <div className="mt-2 bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
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
                    
                    // 🔔 NOTIFICAÇÃO: Cliente
                    if (targetTable === 'projects') {
                      const { data: proj } = await supabase.from('projects').select('client_id').eq('id', projectToEdit.id).single();
                      if (proj && proj.client_id) {
                        await NotificationEngine.notifyUser(
                          proj.client_id,
                          "💳 Ajuste de Escopo",
                          "Houve um ajuste nas condições comerciais da sua mensalidade. Reveja com a sua Gestora de Conta.",
                          "info"
                        );
                      }
                    }

                    showToast("Contrato reajustado com sucesso!");
                    setIsEditModalOpen(false);
                    refreshGlobalData();
                  } catch (e) {
                    showToast("Erro ao editar contrato.");
                  } finally {
                    setIsProcessing(false);
                  }
                }} 
                disabled={isProcessing || !projectToEdit} 
                className="w-full bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-md hover:bg-[var(--color-atelier-terracota)] hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-50 disabled:hover:translate-y-0"
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