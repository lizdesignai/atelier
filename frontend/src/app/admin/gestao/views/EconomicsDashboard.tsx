// src/app/admin/gestao/views/EconomicsDashboard.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  DollarSign, TrendingUp, AlertCircle, Heart, 
  ArrowUpRight, ArrowDownRight, Zap, Skull, 
  Star, ShieldAlert, Loader2, Info, Search, TrendingDown
} from "lucide-react";
import { differenceInDays, startOfMonth, endOfMonth } from "date-fns";

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
  const [searchTerm, setSearchSearchTerm] = useState("");

  // Configuração Econômica (Pode ser movida para um banco de configs no futuro)
  const CUSTO_HORA_AGENCIA = 65; // R$ 65,00 por hora (Custo médio de infra + salários)

  useEffect(() => {
    fetchEconomicsData();
  }, []);

  const fetchEconomicsData = async () => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();

      // 1. Buscar Projetos e seus Fees
      const { data: projects } = await supabase
        .from('projects')
        .select('id, financial_value, type, status, profiles(nome, avatar_url)')
        .eq('status', 'active');

      // 2. Buscar Tempo Logado (Total histórico do ciclo atual)
      const { data: sessions } = await supabase
        .from('work_sessions')
        .select('duration_minutes, task_id, tasks(project_id)')
        .gte('start_time', monthStart);

      // 3. Buscar T-NPS (Última nota de cada cliente)
      const { data: npsScores } = await supabase
        .from('t_nps_scores')
        .select('project_id, score')
        .order('created_at', { ascending: false });

      // 4. Buscar Última Entrega (Para detecção de Churn)
      const { data: lastTasks } = await supabase
        .from('tasks')
        .select('project_id, completed_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (!projects) return;

      const enrichedProjects = projects.map(proj => {
        // 🟢 FIX: Extração segura do perfil (Nome e Avatar)
        const safeProfile = extractNode(proj.profiles);
        const clientName = safeProfile?.nome || "Cliente Desconhecido";
        const avatarUrl = safeProfile?.avatar_url || null;

        // A. Cálculo de Tempo e Custo
        const projectSessions = sessions?.filter(s => {
            // 🟢 FIX: Extração segura da task aninhada na sessão
            const safeTask = extractNode(s.tasks);
            return safeTask?.project_id === proj.id;
        }) || [];
        
        const totalMinutes = projectSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
        const totalHours = totalMinutes / 60;
        const operationalCost = totalHours * CUSTO_HORA_AGENCIA;
        const fee = Number(proj.financial_value || 0);
        const grossMargin = fee - operationalCost;
        const marginPercentage = fee > 0 ? (grossMargin / fee) * 100 : 0;

        // B. Saúde e Churn
        const latestNps = npsScores?.find(n => n.project_id === proj.id)?.score || null;
        const lastDelivery = lastTasks?.find(t => t.project_id === proj.id)?.completed_at;
        const daysSinceLastDelivery = lastDelivery ? differenceInDays(now, new Date(lastDelivery)) : 99;
        
        const churnRisk = daysSinceLastDelivery > 7 ? 'high' : daysSinceLastDelivery > 4 ? 'medium' : 'low';

        // C. Classificação de Quadrante
        let classification = "";
        let color = "";
        let icon = null;

        if (fee >= 2000 && totalHours < 15) {
          classification = "Estrela";
          color = "text-green-500";
          icon = <Star size={14} fill="currentColor" />;
        } else if (fee < 1500 && totalHours > 25) {
          classification = "Vampiro (Tóxico)";
          color = "text-red-500";
          icon = <Skull size={14} />;
        } else if (grossMargin > fee * 0.5) {
          classification = "Alta Lucratividade";
          color = "text-blue-500";
          icon = <Zap size={14} fill="currentColor" />;
        } else {
          classification = "Equilibrado";
          color = "text-gray-400";
          icon = <Heart size={14} />;
        }

        return {
          ...proj,
          clientName: clientName,
          avatar: avatarUrl,
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
        };
      });

      setProjectsData(enrichedProjects);
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
      
      {/* HEADER ESTRATÉGICO */}
      <header className="shrink-0 flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-[var(--color-atelier-terracota)]" />
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60">Unit Economics & Profitability</span>
          </div>
          <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">Visão de Negócio</h2>
        </div>

        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchSearchTerm(e.target.value)}
              className="bg-white/60 border border-white rounded-full py-2 pl-10 pr-4 text-xs font-bold outline-none focus:border-[var(--color-atelier-terracota)] transition-all w-64 shadow-sm"
            />
          </div>
        </div>
      </header>

      {/* CARDS DE SAÚDE FINANCEIRA */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="glass-panel bg-white/70 p-5 rounded-[1.5rem] border border-white shadow-sm flex flex-col justify-between group">
          <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-gray-400">MRR (Faturamento Ativo)</span>
          <div className="flex items-center justify-between mt-2">
            <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">R$ {stats.mrr.toLocaleString('pt-BR')}</span>
            <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><ArrowUpRight size={18}/></div>
          </div>
        </div>

        <div className="glass-panel bg-white/70 p-5 rounded-[1.5rem] border border-white shadow-sm flex flex-col justify-between">
          <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-gray-400">Margem Bruta Média</span>
          <div className="flex items-center justify-between mt-2">
            <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">{stats.avgMargin.toFixed(1)}%</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stats.avgMargin > 40 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
              {stats.avgMargin > 40 ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}
            </div>
          </div>
        </div>

        <div className="glass-panel bg-white/70 p-5 rounded-[1.5rem] border border-white shadow-sm flex flex-col justify-between">
          <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-gray-400">Vampiros Detectados</span>
          <div className="flex items-center justify-between mt-2">
            <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">{stats.totalVampires}</span>
            <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center"><Skull size={18}/></div>
          </div>
        </div>

        <div className="glass-panel bg-[var(--color-atelier-grafite)] p-5 rounded-[1.5rem] shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-20"><ShieldAlert size={40} className="text-white"/></div>
          <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-white/50 relative z-10">Risco de Churn (7 dias)</span>
          <div className="flex items-center justify-between mt-2 relative z-10">
            <span className="font-elegant text-3xl text-white">{stats.churnAlerts}</span>
            <span className="text-[10px] font-bold text-red-400 bg-red-500/20 px-2 py-1 rounded-lg">Ação Requerida</span>
          </div>
        </div>
      </div>

      {/* LISTA DE UNIT ECONOMICS DETALHADA */}
      <div className="flex-1 glass-panel bg-white/40 p-6 rounded-[2.5rem] border border-white shadow-sm overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6 px-2">
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Performance por Conta</h3>
          <div className="flex gap-2">
             <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase"><Info size={12}/> Base: R${CUSTO_HORA_AGENCIA}/h operacional</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <tr className="border-b border-gray-100">
                <th className="py-4 px-4 font-roboto text-[10px] uppercase tracking-widest text-gray-400">Cliente</th>
                <th className="py-4 px-4 font-roboto text-[10px] uppercase tracking-widest text-gray-400">Classificação</th>
                <th className="py-4 px-4 font-roboto text-[10px] uppercase tracking-widest text-gray-400">Fee Mensal</th>
                <th className="py-4 px-4 font-roboto text-[10px] uppercase tracking-widest text-gray-400">Horas / Mês</th>
                <th className="py-4 px-4 font-roboto text-[10px] uppercase tracking-widest text-gray-400">Lucro Real</th>
                <th className="py-4 px-4 font-roboto text-[10px] uppercase tracking-widest text-gray-400">T-NPS</th>
                <th className="py-4 px-4 font-roboto text-[10px] uppercase tracking-widest text-gray-400">Status Entrega</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {projectsData
                  .filter(p => p.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((proj, idx) => (
                  <motion.tr 
                    key={proj.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-gray-50 group hover:bg-white/60 transition-colors"
                  >
                    {/* Cliente */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50 flex items-center justify-center">
                          {proj.avatar ? <img src={proj.avatar} className="w-full h-full object-cover"/> : <span className="font-elegant text-sm">{proj.clientName.charAt(0)}</span>}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-[14px] text-[var(--color-atelier-grafite)]">{proj.clientName}</span>
                          <span className="text-[10px] text-gray-400 font-medium">{proj.type}</span>
                        </div>
                      </div>
                    </td>

                    {/* Classificação */}
                    <td className="py-4 px-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-[10px] font-bold uppercase tracking-tight ${proj.color}`}>
                        {proj.icon} {proj.classification}
                      </div>
                    </td>

                    {/* Fee */}
                    <td className="py-4 px-4">
                      <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">R$ {proj.fee.toLocaleString('pt-BR')}</span>
                    </td>

                    {/* Horas */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">{proj.totalHours.toFixed(1)}h</span>
                        <span className="text-[10px] text-gray-400">Consumidas</span>
                      </div>
                    </td>

                    {/* Lucro Real */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className={`font-roboto font-bold text-[14px] ${proj.grossMargin > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          R$ {proj.grossMargin.toLocaleString('pt-BR')}
                        </span>
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${proj.marginPercentage > 50 ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${proj.marginPercentage}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400">{Math.round(proj.marginPercentage)}%</span>
                        </div>
                      </div>
                    </td>

                    {/* T-NPS */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {proj.latestNps ? (
                          <>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${proj.latestNps >= 9 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                              {proj.latestNps}
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Satisfação</span>
                          </>
                        ) : (
                          <span className="text-[10px] text-gray-300 italic">Sem dados</span>
                        )}
                      </div>
                    </td>

                    {/* Churn Risk */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-widest ${
                          proj.churnRisk === 'high' ? 'bg-red-50 text-red-600 animate-pulse' : 
                          proj.churnRisk === 'medium' ? 'bg-orange-50 text-orange-600' : 
                          'bg-green-50 text-green-600'
                        }`}>
                          {proj.churnRisk === 'high' ? 'Risco Alto' : proj.churnRisk === 'medium' ? 'Alerta' : 'Saudável'}
                        </div>
                        <span className="text-[9px] text-gray-400 mt-1">Entrega há {proj.daysSinceLastDelivery} dias</span>
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