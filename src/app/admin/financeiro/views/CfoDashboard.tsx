// src/app/admin/financeiro/views/CfoDashboard.tsx
import { motion } from "framer-motion";
import { 
  TrendingUp, AlertTriangle, ArrowDownRight, BrainCircuit, 
  ShieldAlert, Edit3, CreditCard, Clock, Mail, CheckCircle2, 
  Plus, Zap, Lock, Loader2, Map, Activity 
} from "lucide-react";

interface CfoDashboardProps {
  metrics: { mrr: number; churnRiskAmount: number; paid: number };
  cfoMetrics: {
    totalOutflows: number;
    ebitda: { ebitdaReal: number; ebitdaMargin: number };
    runway: string;
    allocation: { reserva: number; growth: number; dividendos: number; mode: string };
    forecast: { days30: number; days60: number; days90: number };
  };
  upcomingBillings: any[];
  outflows: any[];
  closings: any[];
  closingMonth: string;
  setClosingMonth: (val: string) => void;
  unitEconomics: any[];
  formatCurrency: (value: number) => string;
  handleNotifyClient: (projectId: string, clientName: string, email: string, amount: number) => void;
  handleMarkAsPaid: (id: string) => void;
  handlePayOutflow: (id: string) => void;
  handleCloseMonth: () => void;
  setIsOutflowModalOpen: (val: boolean) => void;
  openEditModal: (bill: any) => void;
  isProcessing: boolean;
}

export default function CfoDashboard({
  metrics,
  cfoMetrics,
  upcomingBillings,
  outflows,
  closings,
  closingMonth,
  setClosingMonth,
  unitEconomics,
  formatCurrency,
  handleNotifyClient,
  handleMarkAsPaid,
  handlePayOutflow,
  handleCloseMonth,
  setIsOutflowModalOpen,
  openEditModal,
  isProcessing
}: CfoDashboardProps) {

  return (
    <motion.div 
      key="finance" 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }} 
      className="flex flex-col gap-6 w-full"
    >
      {/* WIDGETS DE TOPO (MRR, SANGRIA, EBITDA, RUNWAY) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
        
        {/* WIDGET 1: MRR & RISCO */}
        <div className={`glass-panel p-6 flex flex-col justify-between h-36 relative overflow-hidden transition-colors ${metrics.churnRiskAmount > 0 ? 'bg-white/90 border-orange-200' : 'bg-white/40 border-white'}`}>
          {metrics.churnRiskAmount > 0 && <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>}
          <div className="flex justify-between items-start">
            <div className={`w-10 h-10 rounded-[1rem] flex items-center justify-center shadow-inner ${metrics.churnRiskAmount > 0 ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'}`}>
              <TrendingUp size={18} />
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm ${metrics.churnRiskAmount > 0 ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
              MRR Global
            </span>
          </div>
          <div>
            <div className="flex items-end justify-between">
              <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none">{formatCurrency(metrics.mrr)}</span>
              {metrics.churnRiskAmount > 0 && (
                <span className="text-[11px] font-bold text-orange-500 mb-0.5 flex items-center gap-1" title="Baseado na queda de T-NPS">
                  <AlertTriangle size={12}/> Risco: {formatCurrency(metrics.churnRiskAmount)}
                </span>
              )}
            </div>
            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 block mt-1.5">B2C + White-Label (B2B)</span>
          </div>
        </div>

        {/* WIDGET 2: CUSTOS FIXOS / SANGRIA */}
        <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-red-50/40 border-red-100 relative overflow-hidden group hover:bg-red-50/60 transition-colors">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-[1rem] bg-red-500/10 text-red-600 border border-red-500/20 flex items-center justify-center shadow-inner"><ArrowDownRight size={18} /></div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg shadow-sm">Custos Fixos</span>
          </div>
          <div>
            <span className="font-elegant text-4xl text-red-900 leading-none">{formatCurrency(cfoMetrics.totalOutflows)}</span>
            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-red-900/40 block mt-1.5">Sangria Ativa (Neste Mês)</span>
          </div>
        </div>

        {/* WIDGET 3: EBITDA LÍQUIDO */}
        <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)]/20 relative overflow-hidden group hover:bg-[var(--color-atelier-terracota)]/10 transition-colors">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="w-10 h-10 rounded-[1rem] bg-white/60 border border-white text-[var(--color-atelier-terracota)] flex items-center justify-center shadow-inner"><BrainCircuit size={18} /></div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] bg-white/50 border border-white px-2.5 py-1 rounded-lg shadow-sm">Margem: {cfoMetrics.ebitda.ebitdaMargin}%</span>
          </div>
          <div className="relative z-10">
            <span className="font-elegant text-4xl text-[var(--color-atelier-terracota)] leading-none">{formatCurrency(cfoMetrics.ebitda.ebitdaReal)}</span>
            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 block mt-1.5">EBITDA Real</span>
          </div>
        </div>

        {/* WIDGET 4: RUNWAY */}
        <div className="glass-panel p-6 flex flex-col justify-between h-36 bg-[var(--color-atelier-grafite)] border-[var(--color-atelier-grafite)] text-white relative overflow-hidden group">
          <div className="absolute inset-0 opacity-10 bg-[url('/noise.png')] mix-blend-overlay"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="w-10 h-10 rounded-[1rem] bg-white/10 text-white flex items-center justify-center border border-white/10 shadow-inner"><ShieldAlert size={18} /></div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] bg-white/90 border border-white px-2.5 py-1 rounded-lg shadow-sm">Runway</span>
          </div>
          <div className="flex items-end gap-2 relative z-10">
            <span className="font-elegant text-5xl leading-none">{cfoMetrics.runway}</span>
            <span className="font-roboto text-sm font-bold uppercase tracking-widest text-white/50 mb-1">Meses de Vida</span>
          </div>
        </div>

      </div>

      {/* FORECASTING DE RECEITA LÍQUIDA (MÓDULO CFO) */}
      <div className="glass-panel bg-white/40 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm shrink-0">
        <div className="flex justify-between items-end border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6">
          <div>
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><TrendingUp size={20} className="text-[var(--color-atelier-terracota)]"/> Forecasting (Net Cash)</h3>
            <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1">Projeção do fluxo de caixa líquido futuro (Entradas projetadas - Saídas projetadas)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 hover:bg-white transition-colors p-6 rounded-[1.5rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute top-0 w-full h-1 bg-[var(--color-atelier-grafite)]/20 group-hover:h-1.5 transition-all"></div>
            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2">Próximos 30 Dias</span>
            <span className={`font-elegant text-4xl ${cfoMetrics.forecast.days30 < 0 ? 'text-red-500' : 'text-[var(--color-atelier-grafite)]'}`}>{formatCurrency(cfoMetrics.forecast.days30)}</span>
          </div>
          <div className="bg-white/80 hover:bg-white transition-colors p-6 rounded-[1.5rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute top-0 w-full h-1 bg-[var(--color-atelier-terracota)]/40 group-hover:h-1.5 transition-all"></div>
            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2">Próximos 60 Dias</span>
            <span className={`font-elegant text-4xl ${cfoMetrics.forecast.days60 < 0 ? 'text-red-500' : 'text-[var(--color-atelier-terracota)]'}`}>{formatCurrency(cfoMetrics.forecast.days60)}</span>
          </div>
          <div className="bg-white/80 hover:bg-white transition-colors p-6 rounded-[1.5rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute top-0 w-full h-1 bg-green-400/50 group-hover:h-1.5 transition-all"></div>
            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2">Próximos 90 Dias</span>
            <span className={`font-elegant text-4xl ${cfoMetrics.forecast.days90 < 0 ? 'text-red-500' : 'text-green-700'}`}>{formatCurrency(cfoMetrics.forecast.days90)}</span>
          </div>
        </div>
      </div>

      {/* RECEBÍVEIS E DESPESAS LADO A LADO */}
      <div className="flex flex-col lg:flex-row gap-6 shrink-0 h-[450px]">
        
        {/* RECEBÍVEIS (Upcoming Billings) */}
        <div className="flex-1 glass-panel bg-white/40 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden">
          <div className="flex justify-between items-center border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 shrink-0">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Recebíveis (Entradas)</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
            {upcomingBillings.map((bill, i) => (
              <div key={`bill-${bill.id}-${i}`} className="bg-white/80 p-5 rounded-[1.2rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm flex flex-col gap-4 relative overflow-hidden group shrink-0 hover:border-blue-200 hover:shadow-md transition-all">
                {bill.risk && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-bl-lg flex items-center gap-1"><AlertTriangle size={8}/> Risco</div>}
                
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/50 shadow-inner ${bill.entityType === 'agency' ? 'bg-blue-50 text-blue-500' : bill.type.includes('MRR') ? 'bg-blue-50 text-blue-500' : 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)]'}`}><CreditCard size={18} /></div>
                    <div className="flex flex-col pr-2">
                      <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)] truncate max-w-[150px]">{bill.client}</span>
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-0.5 truncate max-w-[150px]">{bill.type}</span>
                    </div>
                  </div>
                  <button onClick={() => openEditModal(bill)} className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/30 hover:text-[var(--color-atelier-terracota)] flex items-center gap-1 transition-colors"><Edit3 size={14}/></button>
                </div>

                <div className="flex justify-between items-end bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-orange-600 flex items-center gap-1"><Clock size={12}/> {bill.date === 'Na Entrega' ? 'Entrega' : new Date(bill.date).toLocaleDateString('pt-BR')}</span>
                  <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{formatCurrency(bill.amount)}</span>
                </div>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity h-0 group-hover:h-auto overflow-hidden">
                  {/* UPDATE DA TIPAGEM: Injeta ID, Client, Email, Amount */}
                  <button onClick={() => handleNotifyClient(bill.id, bill.client, bill.email, bill.amount)} disabled={isProcessing} className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/20 py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:border-blue-300 hover:text-blue-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 shadow-sm mt-2 disabled:opacity-50">
                    <Mail size={12} /> Notificar
                  </button>
                  <button onClick={() => handleMarkAsPaid(bill.id)} disabled={isProcessing} className="flex-1 bg-green-500 text-white py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-green-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 shadow-sm mt-2 disabled:opacity-50">
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

        {/* DESPESAS (Outflows) */}
        <div className="flex-1 glass-panel bg-white/40 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden">
          <div className="flex justify-between items-center border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 shrink-0">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Contas a Pagar (Saídas)</h3>
            <button onClick={() => setIsOutflowModalOpen(true)} className="bg-[var(--color-atelier-terracota)] text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-[#8c562e] transition-colors flex items-center gap-1 shadow-sm"><Plus size={12}/> Nova</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
            {outflows.map((outflow, i) => (
              <div key={`out-${outflow.id}-${i}`} className={`bg-white/80 p-4 rounded-[1.2rem] border flex items-center justify-between shadow-sm transition-all hover:shadow-md ${outflow.status === 'paid' ? 'border-green-100 opacity-60' : 'border-red-100 hover:border-red-300'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner border border-white/50 ${outflow.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
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

      {/* ALOCAÇÃO DE CAPITAL E FECHAMENTO DO MÊS */}
      <div className="flex flex-col lg:flex-row gap-6 shrink-0">
        
        {/* ALOCAÇÃO (Módulo Inteligente) */}
        <div className="flex-1 glass-panel bg-white/40 p-8 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden min-w-[50%]">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6">
            <div>
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-1 flex items-center gap-2"><Zap size={20} className="text-yellow-500 fill-yellow-500"/> Alocação de Capital</h3>
              <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest">Distribuição do Caixa: {formatCurrency(metrics.paid)}</p>
            </div>
            {/* BADGE DE MODO DE ALOCAÇÃO DO MOTOR */}
            {cfoMetrics.allocation.mode && (
              <div className="bg-[var(--color-atelier-grafite)] text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm mt-3 md:mt-0">
                <BrainCircuit size={12}/> {cfoMetrics.allocation.mode}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/80 p-5 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm text-center transition-all hover:bg-white hover:scale-[1.02]">
              <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-2 block">Blindagem (Reserva)</span>
              <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">{formatCurrency(cfoMetrics.allocation.reserva)}</span>
            </div>
            <div className="bg-blue-50/80 p-5 rounded-2xl border border-blue-100 shadow-sm text-center transition-all hover:bg-blue-50 hover:scale-[1.02]">
              <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-blue-600/70 mb-2 block">Tráfego & Growth</span>
              <span className="font-elegant text-3xl text-blue-900">{formatCurrency(cfoMetrics.allocation.growth)}</span>
            </div>
            <div className="bg-green-50/80 p-5 rounded-2xl border border-green-100 shadow-sm text-center transition-all hover:bg-green-50 hover:scale-[1.02]">
              <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-green-600/70 mb-2 block">Dividendos Sócios</span>
              <span className="font-elegant text-3xl text-green-900">{formatCurrency(cfoMetrics.allocation.dividendos)}</span>
            </div>
          </div>
        </div>

        {/* FECHAMENTO DE MÊS (Congelamento) */}
        <div className="w-full lg:w-[400px] glass-panel bg-[var(--color-atelier-grafite)] text-white p-8 flex flex-col rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden shrink-0 relative group hover:shadow-3xl transition-shadow">
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[var(--color-atelier-terracota)]/20 rounded-full blur-3xl pointer-events-none group-hover:bg-[var(--color-atelier-terracota)]/30 transition-colors"></div>
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
                className="w-full mt-2 bg-[var(--color-atelier-terracota)] text-white py-4 rounded-[1.2rem] font-bold uppercase tracking-widest text-[11px] shadow-lg hover:bg-white hover:text-[var(--color-atelier-grafite)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-[var(--color-atelier-terracota)] disabled:hover:text-white"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <Lock size={16}/>} Fechar Ciclo Financeiro
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MATRIZ DE QUADRANTES (UNIT ECONOMICS FIX) */}
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
              <div key={`${eco.id}-${i}`} className="bg-white/80 p-5 rounded-[1.2rem] border border-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group relative overflow-hidden shrink-0 hover:shadow-md transition-shadow">
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
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[1rem] text-[11px] font-bold border shadow-inner ${eco.tNps >= 90 ? 'bg-green-50 text-green-700 border-green-200' : eco.tNps >= 70 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {eco.tNps >= 90 ? <TrendingUp size={12}/> : <ArrowDownRight size={12}/>} T-NPS: {eco.tNps}
                    </div>
                </div>
                
                <div className="flex flex-col md:items-end w-full md:w-1/3 border-t md:border-t-0 md:border-l border-[var(--color-atelier-grafite)]/5 pt-4 md:pt-0 md:pl-6 px-3">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mb-0.5">Lucro Líquido Real</span>
                    <div className="flex items-center gap-2">
                      <span className="font-elegant text-2xl text-[var(--color-atelier-terracota)] leading-none">{formatCurrency(eco.profit)}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${eco.margin >= 60 ? 'bg-green-100 text-green-700 border-green-200' : eco.margin >= 40 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{eco.margin}%</span>
                    </div>
                    <span className={`text-[9px] mt-2 font-bold uppercase tracking-widest text-${q.color}-600 bg-${q.color}-50 px-2.5 py-1 rounded-lg border border-${q.color}-100`}>Ação CFO: {q.action}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </motion.div>
  );
}