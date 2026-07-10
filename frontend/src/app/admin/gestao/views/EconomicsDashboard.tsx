// src/app/admin/gestao/views/EconomicsDashboard.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  DollarSign, TrendingUp, Heart, ArrowUpRight, 
  ArrowDownRight, Zap, Skull, Star, ShieldAlert, 
  Loader2, Info, Search, TrendingDown, Briefcase
} from "lucide-react";
import { differenceInDays, startOfMonth } from "date-fns";

interface EconomicsDashboardProps {
  currentUser: any;
}

// 🟢 UTILITÁRIO: Extração segura de nós do Supabase (Array vs Object)
function extractNode(node: any): any {
  if (!node) return null;
  return Array.isArray(node) ? node[0] : node;
}

export default function EconomicsDashboard({ currentUser }: EconomicsDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Configuração Econômica (Pode ser movida para um banco de configs no futuro)
  const CUSTO_HORA_AGENCIA = 65; // R$ 65,00 por hora (Custo médio de infra + salários)

  useEffect(() => {
    fetchEconomicsData();
  }, []);

  const fetchEconomicsData = async () => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();

      // Otimização: Paralelização das 5 queries para reduzir latência de rede de ~1.5s para ~300ms
      const [projectsRes, agenciesRes, sessionsRes, npsScoresRes, lastTasksRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, financial_value, type, status, profiles(nome, avatar_url)')
          .eq('status', 'active'),
        supabase
          .from('agencies')
          .select('id, financial_value, name')
          .eq('status', 'active'),
        supabase
          .from('work_sessions')
          .select('duration_minutes, task_id, tasks(project_id, agency_id)')
          .gte('start_time', monthStart),
        supabase
          .from('t_nps_scores')
          .select('project_id, score')
          .order('created_at', { ascending: false }),
        supabase
          .from('tasks')
          .select('project_id, agency_id, completed_at')
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
      ]);

      const projects = projectsRes.data;
      const agencies = agenciesRes.data;
      const sessions = sessionsRes.data;
      const npsScores = npsScoresRes.data;
      const lastTasks = lastTasksRes.data;

      const enrichedData: any[] = [];

      // Processar Projetos Próprios
      if (projects) {
        projects.forEach(proj => {
          const safeProfile = extractNode(proj.profiles);
          const clientName = safeProfile?.nome || "Cliente Desconhecido";
          const avatarUrl = safeProfile?.avatar_url || null;

          const projectSessions = sessions?.filter(s => {
              const safeTask = extractNode(s.tasks);
              return safeTask?.project_id === proj.id;
          }) || [];
          
          const totalMinutes = projectSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
          const totalHours = totalMinutes / 60;
          const operationalCost = totalHours * CUSTO_HORA_AGENCIA;
          const fee = Number(proj.financial_value || 0);
          const grossMargin = fee - operationalCost;
          const marginPercentage = fee > 0 ? (grossMargin / fee) * 100 : 0;

          const latestNps = npsScores?.find(n => n.project_id === proj.id)?.score || null;
          const lastDelivery = lastTasks?.find(t => t.project_id === proj.id)?.completed_at;
          const daysSinceLastDelivery = lastDelivery ? differenceInDays(now, new Date(lastDelivery)) : 99;
          
          const churnRisk = daysSinceLastDelivery > 7 ? 'high' : daysSinceLastDelivery > 4 ? 'medium' : 'low';

          // Classificação de Quadrante
          let classification = "";
          let color = "";
          let icon = null;

          if (fee >= 2000 && totalHours < 15) {
            classification = "Estrela";
            color = "text-green-500 border-green-200 bg-green-50";
            icon = <Star size={12} fill="currentColor" />;
          } else if (fee < 1500 && totalHours > 25) {
            classification = "Vampiro (Tóxico)";
            color = "text-red-500 border-red-200 bg-red-50";
            icon = <Skull size={12} />;
          } else if (grossMargin > fee * 0.5) {
            classification = "Alta Lucratividade";
            color = "text-blue-500 border-blue-200 bg-blue-50";
            icon = <Zap size={12} fill="currentColor" />;
          } else {
            classification = "Equilibrado";
            color = "text-gray-500 border-gray-200 bg-gray-50";
            icon = <Heart size={12} />;
          }

          enrichedData.push({
            id: proj.id,
            sourceType: 'project',
            clientName: clientName,
            avatar: avatarUrl,
            type: proj.type || 'Estúdio',
            fee,
            totalHours,
            operationalCost,
            grossMargin,
            marginPercentage,
            latestNps,
            daysSinceLastDelivery,
            churnRisk,
            classification,
            color,
            icon
          });
        });
      }

      // Processar Agências (White Label)
      if (agencies) {
        agencies.forEach(ag => {
          const agencySessions = sessions?.filter(s => {
              const safeTask = extractNode(s.tasks);
              return safeTask?.agency_id === ag.id;
          }) || [];
          
          const totalMinutes = agencySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
          const totalHours = totalMinutes / 60;
          const operationalCost = totalHours * CUSTO_HORA_AGENCIA;
          const fee = Number(ag.financial_value || 0);
          const grossMargin = fee - operationalCost;
          const marginPercentage = fee > 0 ? (grossMargin / fee) * 100 : 0;

          // Agências não têm NPS associado no nosso modelo atual, e calculamos o último delivery
          const lastDelivery = lastTasks?.find(t => t.agency_id === ag.id)?.completed_at;
          const daysSinceLastDelivery = lastDelivery ? differenceInDays(now, new Date(lastDelivery)) : 99;
          
          const churnRisk = daysSinceLastDelivery > 7 ? 'high' : daysSinceLastDelivery > 4 ? 'medium' : 'low';

          // Classificação
          let classification = "";
          let color = "";
          let icon = null;

          if (fee >= 3000 && totalHours < 30) {
            classification = "Estrela WL";
            color = "text-green-500 border-green-200 bg-green-50";
            icon = <Star size={12} fill="currentColor" />;
          } else if (fee < 2000 && totalHours > 40) {
            classification = "Vampiro WL";
            color = "text-red-500 border-red-200 bg-red-50";
            icon = <Skull size={12} />;
          } else if (grossMargin > fee * 0.4) {
            classification = "Boa Lucratividade";
            color = "text-blue-500 border-blue-200 bg-blue-50";
            icon = <Zap size={12} fill="currentColor" />;
          } else {
            classification = "Equilibrado WL";
            color = "text-indigo-500 border-indigo-200 bg-indigo-50";
            icon = <Briefcase size={12} />;
          }

          enrichedData.push({
            id: ag.id,
            sourceType: 'agency',
            clientName: ag.name,
            avatar: null,
            type: 'Agência WL',
            fee,
            totalHours,
            operationalCost,
            grossMargin,
            marginPercentage,
            latestNps: null,
            daysSinceLastDelivery,
            churnRisk,
            classification,
            color,
            icon
          });
        });
      }

      setProjectsData(enrichedData.sort((a, b) => b.fee - a.fee)); // Ordena pelas contas que mais pagam
    } catch (error) {
      console.error("Erro na auditoria econômica:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Métricas Consolidadas
  const stats = useMemo(() => {
    const mrr = projectsData.reduce((acc, p) => acc + p.fee, 0);
    const avgMargin = projectsData.reduce((acc, p) => acc + p.marginPercentage, 0) / (projectsData.length || 1);
    const totalVampires = projectsData.filter(p => p.classification.includes("Vampiro")).length;
    const churnAlerts = projectsData.filter(p => p.churnRisk === 'high').length;

    return { mrr, avgMargin, totalVampires, churnAlerts };
  }, [projectsData]);

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full gap-6 overflow-hidden">
      
      {/* 🟢 HEADER ULTRA MODERNO (GLASSMORPHISM) */}
      <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-20">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center border border-[var(--color-atelier-terracota)]/20 shadow-inner">
               <DollarSign size={14} className="text-[var(--color-atelier-terracota)]" />
            </div>
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60">Unit Economics & Profitability</span>
          </div>
          <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none tracking-tight">Visão de Negócio</h2>
        </div>

        <div className="flex flex-col items-end gap-3 w-full md:w-auto">
          {/* Barra de Busca Glass */}
          <div className="relative w-full md:w-80 group">
            <div className="absolute inset-0 bg-white/40 backdrop-blur-xl rounded-2xl border border-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] group-hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-all -z-10"></div>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors" size={16} />
            <input 
              type="text" placeholder="Buscar cliente ou agência..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent py-3.5 pl-12 pr-4 text-[13px] font-bold outline-none text-[var(--color-atelier-grafite)] placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* 🟢 TOP ROW: CARDS DE SAÚDE FINANCEIRA */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 shrink-0 z-10">
        <div className="glass-panel bg-white/70 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors"></div>
          <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 relative z-10">MRR (Faturamento Ativo)</span>
          <div className="flex items-center justify-between mt-1 relative z-10">
            <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">R$ {stats.mrr.toLocaleString('pt-BR')}</span>
            <div className="w-10 h-10 rounded-[1rem] bg-green-50 text-green-600 flex items-center justify-center shadow-inner border border-green-100"><ArrowUpRight size={18}/></div>
          </div>
        </div>

        <div className="glass-panel bg-white/70 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col justify-between overflow-hidden relative">
          <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 relative z-10">Margem Bruta Média</span>
          <div className="flex items-center justify-between mt-1 relative z-10">
            <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{stats.avgMargin.toFixed(1)}%</span>
            <div className={`w-10 h-10 rounded-[1rem] flex items-center justify-center shadow-inner border ${stats.avgMargin > 40 ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
              {stats.avgMargin > 40 ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}
            </div>
          </div>
        </div>

        <div className="glass-panel bg-white/70 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col justify-between overflow-hidden relative">
          <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-2 relative z-10">Vampiros Detectados</span>
          <div className="flex items-center justify-between mt-1 relative z-10">
            <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{stats.totalVampires}</span>
            <div className="w-10 h-10 rounded-[1rem] bg-red-50 text-red-600 flex items-center justify-center shadow-inner border border-red-100"><Skull size={18}/></div>
          </div>
        </div>

        <div className="glass-panel bg-[var(--color-atelier-grafite)] p-6 rounded-[2rem] shadow-xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute right-[-20%] top-[-20%] w-40 h-40 bg-[var(--color-atelier-terracota)]/20 blur-[40px] rounded-full group-hover:bg-[var(--color-atelier-terracota)]/30 transition-colors pointer-events-none"></div>
          <div className="absolute top-0 right-0 p-3 opacity-20"><ShieldAlert size={48} className="text-white"/></div>
          <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-white/50 relative z-10 mb-2">Risco de Churn (7 dias)</span>
          <div className="flex items-center justify-between mt-1 relative z-10">
            <span className="font-elegant text-4xl text-white">{stats.churnAlerts}</span>
            <span className="text-[10px] font-bold text-red-400 bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/30">Ação Requerida</span>
          </div>
        </div>
      </div>

      {/* 🟢 CORPO PRINCIPAL: DATA GRID DE ECONOMICS */}
      <div className="flex-1 glass-panel bg-white/50 p-6 rounded-[2.5rem] border border-white shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col relative z-0">
        <div className="flex justify-between items-center mb-6 px-2 shrink-0 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Performance Financeira por Conta</h3>
          <div className="flex gap-2">
             <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase bg-white px-3 py-1.5 rounded-lg shadow-sm"><Info size={12}/> Base: R${CUSTO_HORA_AGENCIA}/h operacional</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white/90 backdrop-blur-md z-10 rounded-t-2xl">
              <tr>
                <th className="py-4 px-6 font-roboto text-[10px] uppercase tracking-widest text-gray-400 font-bold border-b border-gray-100">Cliente / Agência</th>
                <th className="py-4 px-4 font-roboto text-[10px] uppercase tracking-widest text-gray-400 font-bold border-b border-gray-100">Classificação BCG</th>
                <th className="py-4 px-4 font-roboto text-[10px] uppercase tracking-widest text-gray-400 font-bold border-b border-gray-100">Fee Mensal</th>
                <th className="py-4 px-4 font-roboto text-[10px] uppercase tracking-widest text-gray-400 font-bold border-b border-gray-100">Horas (SLA)</th>
                <th className="py-4 px-4 font-roboto text-[10px] uppercase tracking-widest text-gray-400 font-bold border-b border-gray-100">Lucro Real</th>
                <th className="py-4 px-4 font-roboto text-[10px] uppercase tracking-widest text-gray-400 font-bold border-b border-gray-100 text-center">T-NPS</th>
                <th className="py-4 px-6 font-roboto text-[10px] uppercase tracking-widest text-gray-400 font-bold border-b border-gray-100 text-right">Risco (Entrega)</th>
              </tr>
            </thead>
            <tbody className="before:block before:h-2">
              <AnimatePresence>
                {projectsData
                  .filter(p => p.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((proj, idx) => (
                  <motion.tr 
                    key={`${proj.sourceType}-${proj.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                    className="border-b border-gray-50 group hover:bg-white/80 transition-colors"
                  >
                    {/* Cliente */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-[1rem] overflow-hidden border-2 border-white shadow-sm flex items-center justify-center shrink-0 ${proj.sourceType === 'agency' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-[var(--color-atelier-grafite)]'}`}>
                          {proj.avatar ? <img src={proj.avatar} className="w-full h-full object-cover"/> : <span className="font-elegant text-lg">{proj.clientName.charAt(0)}</span>}
                        </div>
                        <div className="flex flex-col max-w-[200px]">
                          <span className="font-bold text-[14px] text-[var(--color-atelier-grafite)] truncate leading-tight">{proj.clientName}</span>
                          <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mt-1 truncate">{proj.type}</span>
                        </div>
                      </div>
                    </td>

                    {/* Classificação */}
                    <td className="py-4 px-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-tight shadow-inner ${proj.color}`}>
                        {proj.icon} {proj.classification}
                      </div>
                    </td>

                    {/* Fee */}
                    <td className="py-4 px-4">
                      <span className="font-elegant text-xl text-[var(--color-atelier-grafite)]">R$ {proj.fee.toLocaleString('pt-BR')}</span>
                    </td>

                    {/* Horas */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">{proj.totalHours.toFixed(1)}h</span>
                        <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mt-0.5">Consumidas</span>
                      </div>
                    </td>

                    {/* Lucro Real */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col w-32">
                        <span className={`font-elegant text-xl ${proj.grossMargin > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          R$ {proj.grossMargin.toLocaleString('pt-BR')}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${proj.marginPercentage > 50 ? 'bg-green-500' : proj.marginPercentage > 20 ? 'bg-blue-400' : 'bg-orange-400'}`} style={{ width: `${Math.max(proj.marginPercentage, 5)}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-gray-500">{Math.round(proj.marginPercentage)}%</span>
                        </div>
                      </div>
                    </td>

                    {/* T-NPS */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col items-center justify-center">
                        {proj.latestNps ? (
                          <>
                            <div className={`w-8 h-8 rounded-[0.5rem] flex items-center justify-center font-bold text-[13px] border shadow-sm ${proj.latestNps >= 9 ? 'bg-green-50 border-green-200 text-green-600' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
                              {proj.latestNps}
                            </div>
                          </>
                        ) : (
                          <div className="w-8 h-8 rounded-[0.5rem] flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-400">
                            <span className="text-[10px]">-</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Churn Risk */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex flex-col items-end">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-widest border shadow-inner ${
                          proj.churnRisk === 'high' ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 
                          proj.churnRisk === 'medium' ? 'bg-orange-50 border-orange-200 text-orange-600' : 
                          'bg-green-50 border-green-200 text-green-600'
                        }`}>
                          {proj.churnRisk === 'high' ? 'Risco Alto' : proj.churnRisk === 'medium' ? 'Atenção' : 'Saudável'}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-1.5">Última: há {proj.daysSinceLastDelivery} dias</span>
                      </div>
                    </td>

                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}