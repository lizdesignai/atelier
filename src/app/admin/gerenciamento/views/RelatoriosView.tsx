// src/app/admin/gerenciamento/views/RelatoriosView.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FileText, Sparkles, TrendingUp, Download, CheckCircle2, 
  Loader2, Instagram, Edit3, Play
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { pdf } from '@react-pdf/renderer';
import RelatorioMensalPDF from '@/components/pdf/RelatorioMensalPDF'; 
import { NotificationEngine } from '@/lib/NotificationEngine';

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

interface Report {
  id: string;
  report_month_year: string;
  executive_summary: string;
  detailed_analysis: string;
  action_plan: string;
  performance_score: number;
  status: 'draft' | 'pending_approval' | 'approved';
  pdf_url?: string;
  created_at: string;
}

// 🟢 NOVA INTERFACE: Recebe o cliente diretamente do Header Pai
interface RelatoriosViewProps {
  activeProjectId: string;
  currentProject: any;
}

export default function RelatoriosView({ activeProjectId, currentProject }: RelatoriosViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [recentSnapshot, setRecentSnapshot] = useState<any | null>(null);

  // Busca os dados do relatório sempre que o cliente ativo muda no Header Pai
  useEffect(() => {
    if (!activeProjectId) return;
    
    const fetchReportData = async () => {
      setIsLoading(true);
      
      const { data: report } = await supabase
        .from('monthly_reports')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      setCurrentReport(report || null);

      const { data: snapshot } = await supabase
        .from('instagram_snapshots')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      setRecentSnapshot(snapshot || null);
      setIsLoading(false);
    };

    fetchReportData();
  }, [activeProjectId]);

  const handleGenerateAIReport = async () => {
    if (!activeProjectId || !currentProject) return;
    
    const instagramHandle = currentProject.profiles?.instagram;
    if (!instagramHandle) {
      showToast("Erro: O cliente não tem o @ do Instagram configurado no perfil.");
      return;
    }

    setIsGenerating(true);
    showToast("A invocar o Motor CMO... A extrair dados do Instagram.");

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: activeProjectId, instagramHandle })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na geração");
      
      showToast("Relatório forjado com sucesso! Atualizando tela...");
      
      // Força um refresh local para exibir o novo rascunho sem recarregar a página
      const { data: report } = await supabase.from('monthly_reports').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false }).limit(1).single();
      setCurrentReport(report || null);
      
      const { data: snapshot } = await supabase.from('instagram_snapshots').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false }).limit(1).single();
      setRecentSnapshot(snapshot || null);

    } catch (error: any) {
      showToast(`Erro: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!currentReport) return;
    setIsSaving(true);
    try {
      await supabase.from('monthly_reports').update({
        executive_summary: currentReport.executive_summary,
        detailed_analysis: currentReport.detailed_analysis,
        action_plan: currentReport.action_plan,
      }).eq('id', currentReport.id);
      
      showToast("Rascunho gravado com sucesso.");
    } catch (error) {
      showToast("Erro ao gravar alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveAndGeneratePDF = async () => {
    if (!currentReport || !currentProject || !recentSnapshot) return;
    
    setIsSaving(true);
    showToast("A forjar PDF executivo de alta resolução...");
    
    try {
      const doc = <RelatorioMensalPDF 
        clientName={currentProject.profiles?.nome}
        instagramHandle={currentProject.profiles?.instagram || '@cliente'}
        monthName={new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
        metrics={{
          followers: recentSnapshot.followers_count,
          engagementRate: recentSnapshot.avg_engagement_rate
        }}
        report={currentReport}
      />;

      // Código direto sem array vazio (Corrigido para TS Rigoroso)
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();

      const fileName = `${currentProject.id}/${currentReport.report_month_year.split('T')[0]}_Relatorio.pdf`;
      
      showToast("A enviar documento para o Cofre do Cliente...");
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(fileName, blob, { contentType: 'application/pdf', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('monthly_reports').update({ 
        status: 'approved',
        pdf_url: publicUrl 
      }).eq('id', currentReport.id);

      if (dbError) throw dbError;
      
      setCurrentReport({ ...currentReport, status: 'approved', pdf_url: publicUrl });

      await NotificationEngine.notifyUser(
        currentProject.client_id, 
        "📊 Novo Relatório Estratégico",
        "O seu relatório executivo deste mês já está disponível para análise e download.",
        "success",
        "/cockpit/relatorios" 
      );

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: currentProject.profiles?.email || 'geral@lizdesign.com.br', 
          type: 'vault_new_asset',
          clientName: currentProject.profiles?.nome.split(' ')[0],
          link: publicUrl
        })
      });

      showToast("✨ Relatório Aprovado e Cliente Notificado!");

    } catch (error: any) {
      console.error(error);
      showToast("Erro ao aprovar e gerar o PDF.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20 w-full"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  if (!currentProject) return null;

  return (
    <div className="flex-1 glass-panel h-full rounded-[3rem] bg-white/60 border border-white shadow-sm flex flex-col overflow-hidden relative animate-[fadeInUp_0.5s_ease-out]">
      
      {/* CABEÇALHO DO CLIENTE SELECIONADO (Herdado Automaticamente) */}
      <div className="p-8 md:p-10 border-b border-white bg-white/40 backdrop-blur-md shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)] px-3 py-1 rounded-full font-roboto text-[9px] uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Instagram size={12} className="text-[var(--color-atelier-terracota)]"/> {currentProject.profiles?.instagram || 'Instagram Indefinido'}
            </span>
            {currentReport?.status === 'approved' && (
              <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full font-roboto text-[9px] uppercase tracking-widest font-bold flex items-center gap-1 border border-green-100">
                <CheckCircle2 size={12}/> Cliente Notificado
              </span>
            )}
          </div>
          <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none">
            Resultados Mensais: <span className="italic text-[var(--color-atelier-terracota)]">{currentProject.profiles?.nome.split(' ')[0]}</span>
          </h2>
        </div>

        {!currentReport || currentReport.status !== 'approved' ? (
          <button 
            onClick={handleGenerateAIReport}
            disabled={isGenerating}
            className="px-6 py-4 rounded-[1.2rem] bg-[var(--color-atelier-grafite)] text-white font-roboto text-[11px] font-bold uppercase tracking-[0.1em] hover:bg-black transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isGenerating ? (
              <><Loader2 size={16} className="animate-spin" /> Processando Dados...</>
            ) : (
              <><Sparkles size={16} className="text-[var(--color-atelier-terracota)]"/> Forjar Novo Relatório</>
            )}
          </button>
        ) : (
          <button onClick={() => window.open(currentReport.pdf_url, '_blank')} className="px-6 py-4 rounded-[1.2rem] bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] font-roboto text-[11px] font-bold uppercase tracking-[0.1em] hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-2 hover:-translate-y-0.5">
            <Download size={16} className="text-[var(--color-atelier-terracota)]"/> Baixar PDF Oficial
          </button>
        )}
      </div>

      {/* CONTEÚDO DO RELATÓRIO (Ocupa 100% da largura agora) */}
      {isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white/20">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-20 h-20 bg-[var(--color-atelier-terracota)]/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Sparkles size={32} className="text-[var(--color-atelier-terracota)]" />
            </motion.div>
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">O CMO está a redigir a análise...</h3>
            <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/50 mt-2 font-medium">Extraindo métricas, cruzando dados e desenhando o plano de ação.</p>
        </div>
      ) : !currentReport ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white/20 opacity-50 p-8 text-center">
            <FileText size={48} className="mb-4 text-[var(--color-atelier-grafite)]/40" />
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Nenhum relatório para este ciclo.</h3>
            <p className="font-roboto text-[13px] mt-2 font-medium">Clique no botão "Forjar Novo Relatório" para iniciar a extração de dados do Apify e análise via Gemini.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 flex flex-col gap-10 bg-gradient-to-b from-transparent to-white/40">
          
          {/* MÉTRICAS (Snapshot) */}
          {recentSnapshot && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-white shadow-sm flex flex-col gap-2">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Audiência Total</span>
                <div className="flex items-end gap-3">
                  <span className="font-elegant text-5xl text-[var(--color-atelier-grafite)] leading-none">{recentSnapshot.followers_count.toLocaleString()}</span>
                  <span className="flex items-center text-green-500 font-bold text-[11px] mb-1.5 bg-green-50 px-2 py-0.5 rounded-full"><TrendingUp size={12} className="mr-1"/> Crescimento</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-white shadow-sm flex flex-col gap-2">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Engajamento Médio</span>
                <div className="flex items-end gap-3">
                  <span className="font-elegant text-5xl text-[var(--color-atelier-grafite)] leading-none">{recentSnapshot.avg_engagement_rate}%</span>
                </div>
              </div>
              <div className="bg-[var(--color-atelier-terracota)] p-6 rounded-[2rem] shadow-md flex flex-col gap-2 text-white">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-white/70">Performance Score</span>
                <div className="flex items-end gap-3">
                  <span className="font-elegant text-5xl leading-none text-white">{currentReport.performance_score}</span>
                  <span className="text-white/50 font-bold text-[11px] mb-1.5 uppercase tracking-widest">/ 100</span>
                </div>
              </div>
            </div>
          )}

          {/* EDITOR RICH TEXT / ANÁLISE IA */}
          <div className="flex flex-col gap-8 bg-white/60 p-8 rounded-[2.5rem] border border-white shadow-sm max-w-5xl">
            
            <div className="flex flex-col gap-3 group/edit">
              <div className="flex items-center justify-between">
                <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-2">
                  1. Resumo Executivo
                </label>
                <Edit3 size={14} className="text-[var(--color-atelier-grafite)]/20 group-focus-within/edit:text-[var(--color-atelier-terracota)] transition-colors"/>
              </div>
              <textarea 
                value={currentReport.executive_summary}
                onChange={(e) => setCurrentReport({...currentReport, executive_summary: e.target.value})}
                className="w-full bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] p-5 text-[14px] font-medium text-[var(--color-atelier-grafite)] outline-none resize-none h-32 transition-all shadow-sm custom-scrollbar"
              />
            </div>

            <div className="flex flex-col gap-3 group/edit">
              <div className="flex items-center justify-between">
                <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-2">
                  2. Diagnóstico & Análise (Markdown)
                </label>
                <Edit3 size={14} className="text-[var(--color-atelier-grafite)]/20 group-focus-within/edit:text-[var(--color-atelier-terracota)] transition-colors"/>
              </div>
              <textarea 
                value={currentReport.detailed_analysis}
                onChange={(e) => setCurrentReport({...currentReport, detailed_analysis: e.target.value})}
                className="w-full bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] p-5 text-[13px] leading-relaxed text-[var(--color-atelier-grafite)] font-mono outline-none resize-none h-64 transition-all shadow-sm custom-scrollbar"
              />
            </div>

            <div className="flex flex-col gap-3 group/edit">
              <div className="flex items-center justify-between">
                <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-2">
                  3. Plano de Ação Estratégico
                </label>
                <Edit3 size={14} className="text-[var(--color-atelier-grafite)]/20 group-focus-within/edit:text-[var(--color-atelier-terracota)] transition-colors"/>
              </div>
              <textarea 
                value={currentReport.action_plan}
                onChange={(e) => setCurrentReport({...currentReport, action_plan: e.target.value})}
                className="w-full bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] p-5 text-[13px] leading-relaxed text-[var(--color-atelier-grafite)] font-mono outline-none resize-none h-40 transition-all shadow-sm custom-scrollbar"
              />
            </div>

          </div>
        </div>
      )}

      {/* RODAPÉ DE AÇÕES */}
      {currentReport && currentReport.status !== 'approved' && !isGenerating && (
        <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-white shrink-0 flex flex-col md:flex-row justify-end gap-3 z-10">
          <button 
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="px-6 py-4 rounded-[1.2rem] bg-gray-50 border border-gray-100 text-[var(--color-atelier-grafite)]/60 font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-gray-100 hover:text-[var(--color-atelier-grafite)] transition-colors"
          >
            Guardar Rascunho
          </button>
          <button 
            onClick={handleApproveAndGeneratePDF}
            disabled={isSaving}
            className="px-8 py-4 rounded-[1.2rem] bg-green-500 text-white font-roboto text-[11px] font-bold uppercase tracking-[0.1em] hover:bg-green-600 transition-all shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor"/>}
            Aprovar & Gerar PDF
          </button>
        </div>
      )}
    </div>
  );
}