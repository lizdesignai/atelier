// src/app/admin/financeiro/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { 
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, 
  CreditCard, Calendar, CheckCircle2, Clock, Loader2, Wallet
} from "lucide-react";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function FinanceiroPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    mrr: 0,
    totalContracted: 0,
    pendingReceivables: 0,
    paid: 0
  });
  const [upcomingBillings, setUpcomingBillings] = useState<any[]>([]);

  useEffect(() => {
    const fetchFinancials = async () => {
      setIsLoading(true);
      try {
        const { data: projects, error } = await supabase
          .from('projects')
          .select('*, profiles(nome, empresa)')
          .in('status', ['active', 'delivered']);

        if (error) throw error;

        let mrrCalc = 0;
        let totalCalc = 0;
        let pendingCalc = 0;
        let paidCalc = 0;
        let billings: any[] = [];

        if (projects) {
          projects.forEach((proj: any) => {
            const value = proj.financial_value || 0;
            totalCalc += value;

            // Cálculo de MRR (Receita Recorrente)
            if (proj.payment_recurrence === 'Mensal' && proj.status === 'active') {
              mrrCalc += value;
            }

            // Lógica de Pagamentos / Recebíveis baseada no Split
            let projPaid = 0;
            let projPending = 0;

            if (proj.payment_recurrence === 'Mensal') {
              // Assumindo que mensal é pago no início do ciclo
              projPaid = value; 
              // Próxima cobrança é baseada na data de faturação
              if (proj.billing_date) {
                billings.push({
                  id: proj.id,
                  client: proj.profiles?.nome,
                  service: proj.service_type,
                  amount: value,
                  date: proj.billing_date,
                  type: 'Recorrência Mensal'
                });
              }
            } else {
              // Contratos Únicos com Split
              if (proj.payment_split === '100% Antecipado') {
                projPaid = value;
              } else if (proj.payment_split === '50% Entrada / 50% Entrega') {
                if (proj.status === 'delivered') {
                  projPaid = value; // Pago na totalidade
                } else {
                  projPaid = value * 0.5; // Só pagou entrada
                  projPending = value * 0.5; // Falta a entrega
                  
                  billings.push({
                    id: proj.id,
                    client: proj.profiles?.nome,
                    service: proj.service_type,
                    amount: projPending,
                    date: proj.data_limite || 'Na Entrega',
                    type: 'Parcela Final (Entrega)'
                  });
                }
              } else if (proj.payment_split === '30% / 30% / 40%') {
                if (proj.status === 'delivered') {
                  projPaid = value;
                } else if (proj.progress >= 50) {
                  projPaid = value * 0.6; // 30 + 30
                  projPending = value * 0.4;
                } else {
                  projPaid = value * 0.3; // Só entrada
                  projPending = value * 0.7;
                }
              } else {
                projPending = value; // Default safety
              }
            }

            paidCalc += projPaid;
            pendingCalc += projPending;
          });
        }

        setMetrics({
          mrr: mrrCalc,
          totalContracted: totalCalc,
          pendingReceivables: pendingCalc,
          paid: paidCalc
        });

        // Ordena as cobranças por data (as mais próximas primeiro)
        billings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setUpcomingBillings(billings);

      } catch (error) {
        console.error("Erro ao carregar financeiro:", error);
        showToast("Erro ao carregar dados financeiros.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFinancials();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  if (isLoading) {
    return <div className="flex h-[calc(100vh-80px)] items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6">
      <header className="shrink-0 flex flex-col gap-2 animate-[fadeInUp_0.5s_ease-out]">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] w-8 h-8 rounded-xl flex items-center justify-center">
            <DollarSign size={16} className="text-[var(--color-atelier-terracota)]" />
          </span>
          <span className="micro-title">Inteligência de Negócio</span>
        </div>
        <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
          Centro <span className="text-[var(--color-atelier-terracota)] italic">Financeiro.</span>
        </h1>
      </header>

      {/* MÉTRICAS PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-[fadeInUp_0.6s_ease-out]">
        <div className="glass-panel p-6 flex flex-col gap-4 bg-white/60">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center"><TrendingUp size={18} /></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-md">MRR</span>
          </div>
          <div>
            <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{formatCurrency(metrics.mrr)}</span>
            <span className="micro-title block mt-1">Receita Recorrente Mensal</span>
          </div>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-4 bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)]/20">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center"><Wallet size={18} /></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] bg-white/50 px-2 py-1 rounded-md">Volume</span>
          </div>
          <div>
            <span className="font-elegant text-4xl text-[var(--color-atelier-terracota)]">{formatCurrency(metrics.totalContracted)}</span>
            <span className="micro-title block mt-1">Valor Total Contratado</span>
          </div>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-4 bg-white/60">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center"><ArrowDownRight size={18} /></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-1 rounded-md">A Receber</span>
          </div>
          <div>
            <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{formatCurrency(metrics.pendingReceivables)}</span>
            <span className="micro-title block mt-1">Valores Pendentes</span>
          </div>
        </div>

        <div className="glass-panel p-6 flex flex-col gap-4 bg-white/60">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center"><ArrowUpRight size={18} /></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-50 px-2 py-1 rounded-md">Liquidado</span>
          </div>
          <div>
            <span className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{formatCurrency(metrics.paid)}</span>
            <span className="micro-title block mt-1">Capital em Caixa</span>
          </div>
        </div>
      </div>

      {/* FLUXO DE CAIXA / PRÓXIMAS COBRANÇAS */}
      <div className="flex-1 glass-panel bg-white/40 p-8 flex flex-col animate-[fadeInUp_0.7s_ease-out]">
        <h3 className="font-roboto font-bold text-[12px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-6 flex items-center gap-2">
          <Calendar size={16} /> Previsão de Entradas & Próximas Cobranças
        </h3>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {upcomingBillings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 opacity-40 text-center">
              <CheckCircle2 size={32} className="mb-2" />
              <p className="font-elegant text-2xl">Caixa Atualizado.</p>
              <p className="font-roboto text-[12px] uppercase tracking-widest font-bold mt-1">Nenhum recebível futuro provisionado.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingBillings.map((bill, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  key={`${bill.id}-${i}`}
                  className="bg-white/80 p-5 rounded-2xl border border-white shadow-sm flex items-center justify-between group hover:border-[var(--color-atelier-terracota)]/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-atelier-terracota)]/5 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0">
                      <CreditCard size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">{bill.client}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">{bill.service}</span>
                        <span className="text-[10px] text-[var(--color-atelier-grafite)]/30">•</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)]">{bill.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{formatCurrency(bill.amount)}</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-orange-500 mt-1 flex items-center gap-1">
                      <Clock size={10}/> Vence: {bill.date === 'Na Entrega' ? 'Na Entrega' : new Date(bill.date).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}