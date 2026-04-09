// src/app/cockpit/relatorios/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { 
  ArrowLeft, FileText, Download, Calendar, 
  TrendingUp, Star, Loader2, ChevronRight, Award
} from "lucide-react";

export default function ClientReportsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        // 1. Busca Perfil para o Nome
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', session.user.id)
          .single();
          
        if (profile?.nome) setClientName(profile.nome.split(' ')[0]);

        // 2. Busca Projeto Ativo
        const { data: project } = await supabase
          .from('projects')
          .select('id')
          .eq('client_id', session.user.id)
          .in('status', ['active', 'delivered'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!project) {
          setIsLoading(false);
          return;
        }

        // 3. Busca Relatórios APROVADOS deste projeto
        const { data: approvedReports } = await supabase
          .from('monthly_reports')
          .select('*')
          .eq('project_id', project.id)
          .eq('status', 'approved')
          .order('report_month_year', { ascending: false });

        if (approvedReports && approvedReports.length > 0) {
          setReports(approvedReports);
          setSelectedReport(approvedReports[0]); // Seleciona o mais recente por padrão
        }

      } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [router]);

  // Motor de Renderização Elegante para o Markdown da IA
  const renderRichText = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine) return <div key={index} className="h-4"></div>; // Espaçamento
      
      // Processamento básico de negrito (**texto**)
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      
      if (cleanLine.startsWith('###')) {
        return <h3 key={index} className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mt-6 mb-3">{cleanLine.replace('###', '').trim()}</h3>;
      }
      
      if (cleanLine.startsWith('-')) {
        return (
          <li key={index} className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/80 mb-2 ml-4 list-disc marker:text-[var(--color-atelier-terracota)] font-medium leading-relaxed">
            {parts.map((part, idx) => 
              part.startsWith('**') && part.endsWith('**') 
                ? <strong key={idx} className="text-[var(--color-atelier-grafite)] font-bold">{part.slice(2, -2)}</strong> 
                : part
            )}
          </li>
        );
      }
      
      return (
        <p key={index} className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/80 mb-3 leading-relaxed font-medium">
          {parts.map((part, idx) => 
            part.startsWith('**') && part.endsWith('**') 
              ? <strong key={idx} className="text-[var(--color-atelier-grafite)] font-bold">{part.slice(2, -2)}</strong> 
              : part
          )}
        </p>
      );
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--color-atelier-creme)]">
        <Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={40} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[var(--color-atelier-creme)] flex flex-col items-center pt-8 pb-20 px-4 md:px-8 selection:bg-[var(--color-atelier-terracota)] selection:text-white">
      
      {/* LUZES VOLUMÉTRICAS DE FUNDO */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-[var(--color-atelier-terracota)]/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-[var(--color-atelier-rose)]/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-[1200px] relative z-10 flex flex-col h-full">
        
        {/* NAVEGAÇÃO SUPERIOR */}
        <button 
          onClick={() => router.push('/cockpit')}
          className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors mb-8 w-fit bg-white/50 px-4 py-2 rounded-full border border-white shadow-sm"
        >
          <ArrowLeft size={14} /> Voltar ao Cockpit
        </button>

        <header className="mb-10 animate-[fadeInUp_0.5s_ease-out]">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={16} className="text-[var(--color-atelier-terracota)]" />
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60">
              Arquivo Confidencial
            </span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-tight tracking-tight">
            Auditorias <span className="text-[var(--color-atelier-terracota)] italic">C-Level.</span>
          </h1>
          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-3 max-w-xl font-medium leading-relaxed">
            {clientName}, aqui documentamos a evolução do seu equity digital. Aceda às análises estratégicas mensais e descarregue os documentos oficiais.
          </p>
        </header>

        {reports.length === 0 ? (
          <div className="glass-panel flex-1 bg-white/60 p-12 rounded-[3.5rem] border border-white shadow-sm flex flex-col items-center justify-center text-center opacity-70">
            <div className="w-24 h-24 rounded-[2rem] bg-white border border-[var(--color-atelier-grafite)]/5 flex items-center justify-center mb-6 shadow-inner">
              <Calendar size={40} className="text-[var(--color-atelier-grafite)]/30" />
            </div>
            <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">O cofre está a ser preparado.</h2>
            <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/60 font-medium max-w-md">
              O seu primeiro relatório estratégico ficará disponível aqui no encerramento do ciclo mensal atual.
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[600px] animate-[fadeInUp_0.7s_ease-out]">
            
            {/* BARRA LATERAL (LISTA DE MESES) */}
            <div className="w-full lg:w-[320px] flex flex-col gap-4 shrink-0">
              <div className="glass-panel p-6 rounded-[2.5rem] bg-white/60 border border-white shadow-sm h-full flex flex-col">
                <h3 className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mb-6 px-2">Histórico de Relatórios</h3>
                
                <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2">
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`w-full text-left p-5 rounded-[1.5rem] flex items-center justify-between transition-all border
                        ${selectedReport?.id === report.id 
                          ? 'bg-white border-[var(--color-atelier-terracota)]/20 shadow-md scale-[1.02]' 
                          : 'bg-transparent border-transparent hover:bg-white/50 hover:border-white'
                        }
                      `}
                    >
                      <div className="flex flex-col">
                        <span className={`font-roboto text-[13px] font-bold capitalize ${selectedReport?.id === report.id ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>
                          {formatDate(report.report_month_year)}
                        </span>
                        <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 font-medium mt-1 flex items-center gap-1">
                          <TrendingUp size={10} /> Score: {report.performance_score}/100
                        </span>
                      </div>
                      <ChevronRight size={16} className={selectedReport?.id === report.id ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/20'} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PAINEL CENTRAL (VISUALIZAÇÃO DO RELATÓRIO) */}
            <div className="flex-1 glass-panel bg-white/70 rounded-[3rem] border border-white shadow-sm flex flex-col overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-atelier-terracota)]/5 rounded-full blur-3xl pointer-events-none"></div>

              <AnimatePresence mode="wait">
                <motion.div 
                  key={selectedReport?.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col h-full"
                >
                  {/* HEADER DO RELATÓRIO */}
                  <div className="p-8 md:p-10 border-b border-white bg-white/40 backdrop-blur-md shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-6 z-10">
                    <div>
                      <span className="inline-block bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] px-3 py-1 rounded-full font-roboto text-[9px] uppercase tracking-widest font-bold mb-3 border border-[var(--color-atelier-terracota)]/20">
                        Documento Oficial
                      </span>
                      <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] capitalize leading-none">
                        {formatDate(selectedReport.report_month_year)}
                      </h2>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="font-roboto text-[8px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 font-bold mb-1">Performance</span>
                        <div className="flex items-center gap-1.5 text-[var(--color-atelier-grafite)] font-bold">
                          <Award size={16} className="text-[var(--color-atelier-terracota)]"/> 
                          <span className="text-xl">{selectedReport.performance_score}</span>
                          <span className="text-[10px] text-[var(--color-atelier-grafite)]/40">/100</span>
                        </div>
                      </div>
                      <div className="w-px h-10 bg-[var(--color-atelier-grafite)]/10 hidden sm:block"></div>
                      <button 
                        onClick={() => window.open(selectedReport.pdf_url, '_blank')}
                        className="px-6 py-4 rounded-[1.2rem] bg-[var(--color-atelier-grafite)] text-white font-roboto text-[10px] font-bold uppercase tracking-[0.1em] hover:bg-[var(--color-atelier-terracota)] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2"
                      >
                        <Download size={16} /> Transferir PDF
                      </button>
                    </div>
                  </div>

                  {/* CONTEÚDO (SCROLLÁVEL) */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 z-10">
                    <div className="max-w-3xl mx-auto flex flex-col gap-10">
                      
                      <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-50">
                        <div className="flex items-center gap-2 mb-4">
                          <Star size={18} className="text-[var(--color-atelier-terracota)] fill-[var(--color-atelier-terracota)]/20" />
                          <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Visão do Estrategista</h3>
                        </div>
                        <p className="font-roboto text-[15px] leading-relaxed text-[var(--color-atelier-grafite)] font-medium text-justify">
                          {selectedReport.executive_summary}
                        </p>
                      </section>

                      <section>
                        <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-6 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                          Auditoria Detalhada
                        </h3>
                        <div className="bg-white/50 p-6 rounded-[2rem] border border-white">
                          {renderRichText(selectedReport.detailed_analysis)}
                        </div>
                      </section>

                      <section className="bg-[var(--color-atelier-creme)]/50 p-8 rounded-[2rem] border border-[var(--color-atelier-terracota)]/20 shadow-inner">
                        <div className="flex items-center gap-2 mb-6">
                          <TrendingUp size={20} className="text-[var(--color-atelier-terracota)]" />
                          <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Plano de Intervenção</h3>
                        </div>
                        <div>
                          {renderRichText(selectedReport.action_plan)}
                        </div>
                      </section>

                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}