// src/app/admin/metricas/page.tsx
"use client";

import { motion } from "framer-motion";
import { 
  BarChart3, TrendingUp, Wallet, Timer, 
  Award, ArrowUpRight, Download, ArrowRight,
  ChevronDown, Activity
} from "lucide-react";

export default function MetricasPage() {
  
  // Mock de Dados Financeiros para o Gráfico Cinético (Últimos 6 meses)
  const REVENUE_DATA = [
    { month: "Jun", value: 45, label: "45K" },
    { month: "Jul", value: 68, label: "68K" },
    { month: "Ago", value: 52, label: "52K" },
    { month: "Set", value: 95, label: "95K" },
    { month: "Out", value: 110, label: "110K" },
    { month: "Nov", value: 142, label: "142K" }, // Mês Atual
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          1. CABEÇALHO DO DIRETOR
          ========================================== */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] w-8 h-8 rounded-xl flex items-center justify-center border border-[var(--color-atelier-terracota)]/20">
              <BarChart3 size={16} />
            </span>
            <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60">
              Inteligência de Negócio
            </span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Saúde & <span className="text-[var(--color-atelier-terracota)] italic">Métricas.</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button className="bg-white/60 backdrop-blur-md border border-white px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] transition-colors">
            Últimos 6 Meses <ChevronDown size={14} />
          </button>
          <button className="bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] px-5 py-2.5 rounded-xl font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-[var(--color-atelier-terracota)] transition-all shadow-[0_10px_20px_rgba(122,116,112,0.15)] flex items-center gap-2 hover:-translate-y-0.5">
            <Download size={14} /> Exportar Relatório
          </button>
        </div>
      </header>

      {/* ==========================================
          2. O ECRÃ DIVIDIDO (No Scroll)
          ========================================== */}
      <div className="flex flex-col gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both] overflow-y-auto custom-scrollbar pr-2 pb-4">
        
        {/* LINHA 1: KPIs DE ALTA FREQUÊNCIA (4 Colunas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 shrink-0">
          
          {/* KPI 1: Faturação */}
          <div className="glass-panel p-6 rounded-[2rem] bg-gradient-to-br from-white/90 to-white/50 border border-white shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="w-10 h-10 rounded-[1rem] bg-[var(--color-atelier-creme)] flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0">
                <Wallet size={18} strokeWidth={2} />
              </div>
              <span className="flex items-center gap-1 font-roboto text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                <TrendingUp size={12} /> +24%
              </span>
            </div>
            <div className="relative z-10">
              <p className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 mb-1">Receita Bruta (Mês)</p>
              <h3 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                $142.500
              </h3>
            </div>
          </div>

          {/* KPI 2: Projetos Ativos */}
          <div className="glass-panel p-6 rounded-[2rem] bg-white/60 border border-white shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="w-10 h-10 rounded-[1rem] bg-[var(--color-atelier-grafite)]/5 flex items-center justify-center text-[var(--color-atelier-grafite)] shrink-0">
                <Activity size={18} strokeWidth={2} />
              </div>
            </div>
            <div className="relative z-10">
              <p className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 mb-1">Projetos em Forja</p>
              <h3 className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">
                14
              </h3>
            </div>
          </div>

          {/* KPI 3: Tempo de Entrega */}
          <div className="glass-panel p-6 rounded-[2rem] bg-white/60 border border-white shadow-sm relative overflow-hidden group">
             <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="w-10 h-10 rounded-[1rem] bg-[var(--color-atelier-grafite)]/5 flex items-center justify-center text-[var(--color-atelier-grafite)] shrink-0">
                <Timer size={18} strokeWidth={2} />
              </div>
              <span className="flex items-center gap-1 font-roboto text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                -2 Dias
              </span>
            </div>
            <div className="relative z-10">
              <p className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 mb-1">Ciclo de Manufatura</p>
              <h3 className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">
                18 <span className="text-[20px] text-[var(--color-atelier-grafite)]/40 font-sans">Dias</span>
              </h3>
            </div>
          </div>

          {/* KPI 4: NPS / Qualidade */}
          <div className="glass-panel p-6 rounded-[2rem] bg-white/60 border border-white shadow-sm relative overflow-hidden group">
            <div className="absolute right-[-10%] top-[-10%] w-24 h-24 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-xl pointer-events-none"></div>
             <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="w-10 h-10 rounded-[1rem] bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0 border border-[var(--color-atelier-terracota)]/20">
                <Award size={18} strokeWidth={2} />
              </div>
            </div>
            <div className="relative z-10">
              <p className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 mb-1">Satisfação (NPS)</p>
              <h3 className="font-elegant text-4xl text-[var(--color-atelier-terracota)] drop-shadow-sm">
                9.8 <span className="text-[20px] text-[var(--color-atelier-terracota)]/40 font-sans">/10</span>
              </h3>
            </div>
          </div>

        </div>

        {/* LINHA 2: GRÁFICO E PIPELINE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[400px]">
          
          {/* GRÁFICO DE RECEITA (8 Colunas) */}
          <div className="lg:col-span-8 glass-panel rounded-[3rem] p-8 md:p-10 bg-white/50 border border-white flex flex-col shadow-[0_15px_40px_rgba(122,116,112,0.05)] relative overflow-hidden">
            
            <div className="flex justify-between items-start mb-10 relative z-10">
              <div>
                <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-1">Evolução de Receita</h3>
                <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/50">Crescimento financeiro dos últimos 6 meses consolidados.</p>
              </div>
              <h2 className="font-elegant text-4xl text-[var(--color-atelier-terracota)]">$412.5K <span className="block text-right font-roboto text-[10px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mt-1">YTD Total</span></h2>
            </div>

            {/* Construção do Gráfico em CSS Puro (Cinético e Lindo) */}
            <div className="flex-1 flex items-end justify-between gap-2 md:gap-4 mt-auto relative z-10 pt-10">
              
              {/* Linhas de grade horizontais abstratas */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="w-full h-px bg-[var(--color-atelier-grafite)] border-t border-dashed"></div>
                <div className="w-full h-px bg-[var(--color-atelier-grafite)] border-t border-dashed"></div>
                <div className="w-full h-px bg-[var(--color-atelier-grafite)] border-t border-dashed"></div>
                <div className="w-full h-px bg-[var(--color-atelier-grafite)]"></div>
              </div>

              {REVENUE_DATA.map((data, index) => (
                <div key={index} className="flex flex-col items-center gap-3 flex-1 group z-10">
                  {/* Tooltip Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm border border-white px-3 py-1.5 rounded-lg shadow-sm font-roboto font-bold text-[11px] text-[var(--color-atelier-terracota)] mb-2 translate-y-2 group-hover:translate-y-0 duration-300">
                    ${data.label}
                  </div>
                  
                  {/* Barra do Gráfico Animada */}
                  <div className="w-full max-w-[60px] h-[200px] bg-white/40 rounded-t-2xl relative overflow-hidden border-x border-t border-white/60">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${(data.value / 150) * 100}%` }}
                      transition={{ duration: 1.5, delay: 0.3 + (index * 0.1), ease: [0.16, 1, 0.3, 1] }}
                      className={`
                        absolute bottom-0 w-full rounded-t-xl transition-colors duration-500
                        ${index === REVENUE_DATA.length - 1 
                          ? 'bg-gradient-to-t from-[var(--color-atelier-terracota)] to-[var(--color-atelier-rose)] shadow-[0_0_20px_rgba(173,111,64,0.4)]' 
                          : 'bg-gradient-to-t from-[var(--color-atelier-grafite)]/20 to-[var(--color-atelier-grafite)]/40 group-hover:from-[var(--color-atelier-terracota)]/40 group-hover:to-[var(--color-atelier-terracota)]/60'
                        }
                      `}
                    >
                      {/* Reflexo de vidro interno na barra */}
                      <div className="absolute top-0 w-full h-1/3 bg-gradient-to-b from-white/40 to-transparent"></div>
                    </motion.div>
                  </div>
                  
                  {/* Rótulo do Mês */}
                  <span className={`font-roboto text-[11px] uppercase tracking-widest font-bold ${index === REVENUE_DATA.length - 1 ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/50'}`}>
                    {data.month}
                  </span>
                </div>
              ))}
            </div>

          </div>

          {/* PIPELINE DE PAGAMENTOS (4 Colunas) */}
          <div className="lg:col-span-4 glass-panel rounded-[3rem] p-8 bg-gradient-to-br from-[var(--color-atelier-grafite)] to-[#4a4643] flex flex-col relative overflow-hidden group shadow-[0_20px_50px_rgba(122,116,112,0.2)]">
            
            <div className="absolute right-[-20%] top-[-10%] w-[300px] h-[300px] bg-[var(--color-atelier-terracota)]/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-[var(--color-atelier-terracota)]/30 transition-colors duration-1000"></div>

            <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10 relative z-10">
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-creme)]">Próximos Fechos</h3>
              <ArrowUpRight size={18} className="text-[var(--color-atelier-terracota)]" />
            </div>

            <div className="flex flex-col gap-4 flex-1 relative z-10">
              
              {/* Item do Pipeline 1 */}
              <div className="bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 p-4 rounded-2xl transition-all cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-creme)] flex items-center justify-center text-[var(--color-atelier-terracota)] font-elegant text-lg">
                    I
                  </div>
                  <div className="flex flex-col">
                    <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-creme)]">Igor Castro</span>
                    <span className="font-roboto text-[10px] text-[var(--color-atelier-creme)]/50 uppercase tracking-widest font-bold">Parcela Final (Cofre)</span>
                  </div>
                </div>
                <span className="font-elegant text-xl text-[var(--color-atelier-terracota)]">$5.000</span>
              </div>

              {/* Item do Pipeline 2 */}
              <div className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-4 rounded-2xl transition-all cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[var(--color-atelier-creme)]/50 font-elegant text-lg">
                    C
                  </div>
                  <div className="flex flex-col">
                    <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-creme)]">Carlos Nogueira</span>
                    <span className="font-roboto text-[10px] text-[var(--color-atelier-creme)]/50 uppercase tracking-widest font-bold">Fecho de Contrato</span>
                  </div>
                </div>
                <span className="font-elegant text-xl text-[var(--color-atelier-creme)]/80">$12.500</span>
              </div>

              {/* Item do Pipeline 3 */}
              <div className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-4 rounded-2xl transition-all cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[var(--color-atelier-creme)]/50 font-elegant text-lg">
                    M
                  </div>
                  <div className="flex flex-col">
                    <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-creme)]">Maison Vasconcelos</span>
                    <span className="font-roboto text-[10px] text-[var(--color-atelier-creme)]/50 uppercase tracking-widest font-bold">Pagamento Inicial</span>
                  </div>
                </div>
                <span className="font-elegant text-xl text-[var(--color-atelier-creme)]/80">$8.000</span>
              </div>

            </div>

            <button className="mt-6 w-full pt-4 border-t border-white/10 font-roboto text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--color-atelier-creme)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors flex items-center justify-center gap-2 relative z-10">
              Ver Funil Completo <ArrowRight size={12} />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}