// src/app/admin/financeiro/views/FinancialOverview.tsx
import { motion } from "framer-motion";
import { Calendar, Download } from "lucide-react";

interface FinancialOverviewProps {
  overviewData: {
    currentMonthRevenue: number;
    revenueGrowth: number;
    activeProjects: number;
    avgDeliveryDays: number;
    deliveryDaysChange: number;
    avgNps: number;
    ytdRevenue: number;
    chartData: { monthKey: string; monthLabel: string; value: number }[];
  };
  upcomingBillings: any[];
  formatCurrency: (value: number) => string;
  setIsReportModalOpen: (isOpen: boolean) => void;
  setActiveView: (view: 'overview' | 'finance' | 'health') => void;
}

export default function FinancialOverview({
  overviewData,
  upcomingBillings,
  formatCurrency,
  setIsReportModalOpen,
  setActiveView
}: FinancialOverviewProps) {
  
  // Calcula o valor máximo do gráfico para a barra de 100%
  const maxChartValue = Math.max(...overviewData.chartData.map(d => d.value), 1000);

  return (
    <motion.div 
      key="overview" 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }} 
      className="flex flex-col gap-6 w-full"
    >
      {/* CABEÇALHO DO OVERVIEW E RELATÓRIO */}
      <div className="flex justify-between items-center glass-panel bg-white/40 p-4 rounded-3xl shadow-sm shrink-0 transition-colors hover:bg-white/50">
        <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 flex items-center gap-2 pl-2">
          <Calendar size={14}/> Últimos 6 Meses Consolidado
        </span>
        <button 
          onClick={() => setIsReportModalOpen(true)} 
          className="flex items-center gap-2 bg-white px-5 py-3 rounded-2xl border border-[var(--color-atelier-grafite)]/5 font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)] hover:border-[var(--color-atelier-terracota)]/30 hover:text-[var(--color-atelier-terracota)] transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <Download size={14} /> Exportar Relatório DRE
        </button>
      </div>

      {/* TOP CARDS DE MÉTRICAS GERAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        
        <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-white/40 border-white relative overflow-hidden group hover:bg-white/60 transition-colors">
          <div className="flex justify-between items-start">
            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Receita Bruta (Mês)</span>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border shadow-sm ${overviewData.revenueGrowth >= 0 ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              {overviewData.revenueGrowth >= 0 ? '+' : ''}{overviewData.revenueGrowth}%
            </span>
          </div>
          <div><span className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none block">{formatCurrency(overviewData.currentMonthRevenue)}</span></div>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-white/40 border-white relative overflow-hidden group hover:bg-white/60 transition-colors">
          <div className="flex justify-between items-start">
            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Projetos em Forja</span>
          </div>
          <div><span className="font-elegant text-5xl text-[var(--color-atelier-grafite)] leading-none block">{overviewData.activeProjects}</span></div>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-white/40 border-white relative overflow-hidden group hover:bg-white/60 transition-colors">
          <div className="flex justify-between items-start">
            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Ciclo de Manufatura</span>
            {overviewData.deliveryDaysChange !== 0 && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border shadow-sm ${overviewData.deliveryDaysChange < 0 ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                {overviewData.deliveryDaysChange > 0 ? '+' : ''}{overviewData.deliveryDaysChange} Dias
              </span>
            )}
          </div>
          <div className="flex items-end gap-2">
            <span className="font-elegant text-5xl text-[var(--color-atelier-grafite)] leading-none block">{overviewData.avgDeliveryDays}</span>
            <span className="font-roboto text-sm font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/30 mb-1">Dias</span>
          </div>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)]/20 relative overflow-hidden group hover:bg-[var(--color-atelier-terracota)]/10 transition-colors">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex justify-between items-start relative z-10">
            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">Satisfação (NPS)</span>
          </div>
          <div className="flex items-end gap-2 relative z-10">
            <span className="font-elegant text-5xl text-[var(--color-atelier-terracota)] leading-none block">{overviewData.avgNps}</span>
            <span className="font-roboto text-sm font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]/50 mb-1">/10</span>
          </div>
        </div>

      </div>

      {/* CORPO PRINCIPAL (GRÁFICO E FECHOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* GRÁFICO: EVOLUÇÃO DE RECEITA */}
        <div className="lg:col-span-8 glass-panel bg-white/40 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm min-h-[400px]">
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
            {/* Linhas Guias do Gráfico */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="w-full border-t border-[var(--color-atelier-grafite)]/5 border-dashed"></div>
              <div className="w-full border-t border-[var(--color-atelier-grafite)]/5 border-dashed"></div>
              <div className="w-full border-t border-[var(--color-atelier-grafite)]/5 border-dashed"></div>
              <div className="w-full border-t border-[var(--color-atelier-grafite)]/5 border-dashed"></div>
            </div>

            {/* Barras do Gráfico */}
            {overviewData.chartData.map((data, index) => {
              const heightPercent = Math.max((data.value / maxChartValue) * 100, 5); 
              return (
                <div key={index} className="relative flex flex-col items-center group h-full justify-end z-10 w-[10%]">
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--color-atelier-grafite)] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest whitespace-nowrap pointer-events-none shadow-md">
                    {formatCurrency(data.value)}
                  </div>
                  <div className="w-full bg-[var(--color-atelier-creme)]/50 rounded-t-xl relative border border-white overflow-hidden shadow-inner group-hover:shadow-md transition-shadow" style={{ height: '80%' }}>
                     <motion.div 
                       initial={{ height: 0 }} 
                       animate={{ height: `${heightPercent}%` }} 
                       transition={{ duration: 0.8, delay: index * 0.05 }}
                       className={`absolute bottom-0 w-full rounded-t-xl transition-colors duration-300 ${index === 5 ? 'bg-[var(--color-atelier-terracota)]' : 'bg-[var(--color-atelier-grafite)]/10 group-hover:bg-[var(--color-atelier-terracota)]/50'}`}
                     ></motion.div>
                  </div>
                  <span className="font-roboto text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50 mt-3 group-hover:text-[var(--color-atelier-grafite)] transition-colors">{data.monthLabel}</span>
                  <span className={`font-roboto text-[11px] font-bold mt-1 transition-colors ${index === 5 ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)]'}`}>{formatCurrency(data.value)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* PRÓXIMOS FECHOS (COM SCROLL ATIVO) */}
        <div className="lg:col-span-4 glass-panel bg-white/40 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm min-h-[400px]">
          <div className="flex justify-between items-center border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 shrink-0">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Próximos Fechos</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[300px] flex flex-col gap-3 pr-2">
            {upcomingBillings.map((bill, i) => (
              <div key={i} className="bg-white/80 p-4 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm flex items-center justify-between group hover:border-[var(--color-atelier-terracota)]/30 hover:bg-white transition-all">
                <div className="flex items-center gap-3 w-3/4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-elegant text-xl shrink-0 shadow-inner border border-white/50 ${bill.entityType === 'agency' ? 'bg-blue-50 text-blue-600' : 'bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)]'}`}>
                    {bill.client.charAt(0)}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] truncate">{bill.client}</span>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-0.5 truncate">{bill.type}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-elegant text-xl text-[var(--color-atelier-grafite)] block leading-none mb-1 group-hover:text-[var(--color-atelier-terracota)] transition-colors">{formatCurrency(bill.amount)}</span>
                </div>
              </div>
            ))}
            {upcomingBillings.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">Nenhum fecho pendente</div>
            )}
          </div>

          <button 
            onClick={() => setActiveView('finance')} 
            className="w-full mt-4 py-4 rounded-2xl border border-[var(--color-atelier-grafite)]/10 text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-grafite)] hover:text-white hover:border-transparent transition-all shadow-sm shrink-0"
          >
            Ver Funil Completo
          </button>
        </div>

      </div>
    </motion.div>
  );
}