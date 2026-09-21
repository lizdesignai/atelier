// src/app/admin/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase"; 
import { 
  Loader2, Sparkles, BrainCircuit, FileText, Calendar, 
  Save, Plus, X, Phone, Mail, Instagram, Briefcase, 
  Clock, CheckCircle, AlertCircle, FileSearch, Trash2, ArrowRight, Download,
  Star, ThumbsUp, TrendingUp, Award, MessageSquareHeart, Activity
} from "lucide-react";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

const MAPA_QUESTIONS: Record<string, { q: string, A: string, B: string, C: string }> = {
  Q1: { q: "Quando alguém entra no seu perfil pela primeira vez, quanto tempo leva para entender exatamente o que você vende?", A: "Na mesma hora (Bate o olho e entende)", B: "Precisa ler alguns posts para entender", C: "Geralmente me mandam direct perguntando o que eu faço" },
  Q2: { q: "Se retirássemos seu nome e sua foto do perfil, alguém conseguiria reconhecer que aquele conteúdo pertence à sua marca?", A: "Sim, a linguagem e a estética são únicas", B: "Talvez, mas seria difícil ter certeza", C: "Não, pareceria com qualquer outro perfil do meu nicho" },
  Q3: { q: "O link na sua bio...", A: "É claro, direto e diz exatamente o que o cliente vai encontrar lá", B: "É um Linktree genérico com vários botões", C: "Eu nem tenho link ou não sei para onde ele vai direito" },
  Q4: { q: "Quantas provas sociais (depoimentos, prints, resultados) existem no seu perfil hoje?", A: "Estão espalhadas nos Destaques e no Feed constantemente", B: "Tenho algumas soltas, mas não organizadas", C: "Quase nenhuma, as pessoas precisam confiar na minha palavra" },
  Q5: { q: "Quando você fala sobre seus serviços ou produtos...", A: "Eu demonstro como resolvo problemas reais (com bastidores e método)", B: "Eu apenas posto a foto do produto ou digo que a agenda está aberta", C: "Eu tenho vergonha/dificuldade de vender no Instagram" },
  Q6: { q: "Você se posiciona de forma a cobrar mais do que a média do seu mercado?", A: "Sim, meu cliente entende por que sou mais caro", B: "Às vezes, mas ainda perco clientes por preço", C: "Não, preciso dar desconto ou cobrar barato para fechar" },
  Q7: { q: "Seu Instagram atual parece tão profissional e de alto nível quanto o serviço/produto que você entrega na vida real?", A: "Sim, eles estão perfeitamente alinhados", B: "Meu produto é muito melhor do que meu Instagram mostra", C: "Não, meu Instagram parece amador" },
  Q8: { q: "As cores, fontes e estilo visual das suas postagens...", A: "Seguem um manual e um padrão rigoroso que transmitem minha essência", B: "Tento manter um padrão, mas às vezes uso templates variados do Canva", C: "É uma bagunça, cada dia posto de um jeito diferente" },
  Q9: { q: "A qualidade das suas fotos/vídeos e do seu design...", A: "É impecável e demonstra cuidado em cada detalhe", B: "É ok, mas não me destaca da concorrência", C: "É amadora, eu faço do jeito que dá" },
  Q10: { q: "Se um cliente ideal encontrasse seu perfil hoje e quisesse comprar, o que aconteceria?", A: "Ele saberia exatamente onde clicar e qual passo tomar", B: "Ele teria que me mandar um direct para pedir informações", C: "Ele provavelmente ficaria confuso e desistiria" },
  Q11: { q: "Qual a frequência que um post seu se transforma em uma venda real ou pedido de orçamento?", A: "Sempre. Tenho um funil que funciona", B: "De vez em quando, quando eu faço uma oferta direta", C: "Quase nunca. Tenho likes, mas não tenho vendas" },
  Q12: { q: "Suas legendas...", A: "Criam desejo, educam e sempre chamam para uma ação clara", B: "São boas, mas esqueço de chamar para a venda", C: "São emojis ou reflexões soltas" }
};

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'geral' | 'consultoria' | 'orcamentos' | 'briefings' | 'pesquisas' | 'mapa'>('geral');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Estados de Dados
  const [consultorias, setConsultorias] = useState<any[]>([]);
  const [briefings, setBriefings] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [formularios, setFormularios] = useState<any[]>([]);
  const [pesquisas, setPesquisas] = useState<any[]>([]);
  const [mapas, setMapas] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [clientEmails, setClientEmails] = useState<Set<string>>(new Set());

  // Agendador de Reunião
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ leadId: "", title: "", date: "", notes: "" });

  // Carregar dados iniciais do ecossistema
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [resConsultorias, resBriefings, resForms, resMeetings, resPesquisas, resMapas, resClients] = await Promise.all([
        fetch('/api/consultorias/list').then(res => res.json()).catch(() => ({ success: false, data: [] })),
        fetch('/api/briefings/list').then(res => res.json()).catch(() => ({ success: false, data: [] })),
        fetch('/api/forms/list').then(res => res.json()).catch(() => ({ success: false, forms: [] })),
        supabase.from('prospect_meetings').select('*, leads(nome, instagram, telefone)').order('meeting_date', { ascending: true }),
        fetch('/api/pesquisas/list').then(res => res.json()).catch(() => ({ success: false, data: [] })),
        fetch('/api/mapa/list').then(res => res.json()).catch(() => ({ success: false, data: [] })),
        supabase.from('profiles').select('email').eq('role', 'cliente')
      ]);

      if (resConsultorias?.success && resConsultorias.data) {
        setConsultorias(resConsultorias.data);
      }
      if (resForms?.success && resForms.forms) {
        setFormularios(resForms.forms);
      }
      if (resBriefings?.success && resBriefings.data) {
        setBriefings(resBriefings.data);
      }
      if (resPesquisas?.success && resPesquisas.data) {
        setPesquisas(resPesquisas.data);
      }
      if (resMapas?.success && resMapas.data) {
        setMapas(resMapas.data);
      }
      if (resMeetings?.data) setMeetings(resMeetings.data);
      if (resClients?.data) {
        const emails = new Set(resClients.data.map((c: any) => c.email?.toLowerCase().trim()).filter(Boolean));
        setClientEmails(emails);
      }
    } catch (e) {
      console.error('[Dashboard Error]:', e);
      showToast("Erro ao sincronizar QG Estratégico.");
    } finally {
      setIsLoading(false);
    }
  };

  // Agendar Reunião com Prospect
  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.leadId || !meetingForm.title || !meetingForm.date) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase.from('prospect_meetings').insert({
        lead_id: meetingForm.leadId,
        title: meetingForm.title,
        meeting_date: new Date(meetingForm.date).toISOString(),
        notes: meetingForm.notes
      });

      if (error) throw error;
      showToast("🗓️ Reunião de Prospecção agendada!");
      setIsMeetingModalOpen(false);
      setMeetingForm({ leadId: "", title: "", date: "", notes: "" });
      fetchDashboardData();
    } catch (e) {
      showToast("Erro ao agendar reunião.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Marcar formulário como lido
  const handleMarkRead = async (id: string | number, table: string) => {
    try {
      await fetch('/api/forms/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, table })
      });
      setFormularios(prev => prev.map(f => f.id === id && f.table_name === table ? { ...f, lido: true } : f));
    } catch (e) {
      console.error('Erro ao marcar formulário como lido:', e);
    }
  };

  // Baixar PDF do Formulário
  const handleDownloadFormularioPDF = async (form: any) => {
    setIsGeneratingPDF(true);
    showToast("Gerando PDF do Formulário...");
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const FormularioPDF = (await import('../../components/pdf/FormularioPDF')).default;
      
      const clientName = form.dados_completos?.Nome || form.dados_completos?.nome || form.Nome || 'Cliente';
      const doc = <FormularioPDF formType={form.tipo} clientName={clientName} dadosCompletos={form.dados_completos} />;
      const blob = await pdf(doc).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Orcamento_${clientName.replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      showToast("PDF exportado com sucesso!");
    } catch (error) {
      showToast("Erro ao gerar o PDF.");
      console.error(error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Baixar PDF do Mapa
  const handleDownloadMapaPDF = async (mapaData: any) => {
    setIsGeneratingPDF(true);
    showToast("Gerando PDF do Raio-X...");
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const FormularioPDF = (await import('../../components/pdf/FormularioPDF')).default;
      
      const clientName = mapaData.nome_cliente || mapaData.nome || mapaData.Nome || mapaData.nome_marca || 'Cliente';
      
      const mappedData: Record<string, string> = {
        'Nome do Cliente': clientName,
        'WhatsApp': mapaData.whatsapp || mapaData.WhatsApp,
        'E-mail': mapaData.email || mapaData.Email,
        'Instagram': mapaData.instagram || mapaData.Instagram,
        'Score Geral': mapaData.score_geral || mapaData.dados_completos?.Score_Geral,
        'Dimensão Gargalo': mapaData.dimensao_gargalo || mapaData.dados_completos?.Dimensao_Gargalo,
      };

      const rawDados = mapaData.dados_completos || mapaData || {};
      for (const [key, value] of Object.entries(rawDados)) {
        const qKey = key.toUpperCase();
        if (MAPA_QUESTIONS[qKey]) {
          const answerLetter = String(value).toUpperCase();
          const fullAnswer = MAPA_QUESTIONS[qKey][answerLetter as 'A'|'B'|'C'] || answerLetter;
          mappedData[MAPA_QUESTIONS[qKey].q] = fullAnswer;
        }
      }

      const doc = <FormularioPDF formType="Raio-X Instagram" clientName={clientName} dadosCompletos={mappedData} customCoverTitle="Raio X" customHeaderTitle="Raio X" />;
      const blob = await pdf(doc).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `RaioX_${clientName.replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      showToast("PDF exportado com sucesso!");
    } catch (error) {
      showToast("Erro ao gerar o PDF.");
      console.error(error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Baixar PDF do Briefing (IDV ou Insta)
  const handleDownloadBriefingPDF = async (item: any) => {
    setIsGeneratingPDF(true);
    showToast("Gerando PDF do Briefing...");
    try {
      const { pdf } = await import('@react-pdf/renderer');
      
      let doc;
      const clientName = item.data.profiles?.nome || item.data.answers?.Nome_Cliente || 'Cliente';

      if (item.type === 'insta_briefing') {
        const InstagramBriefingPDF = (await import('../../components/pdf/InstagramBriefingPDF')).default;
        doc = <InstagramBriefingPDF data={item.data} clientName={clientName} />;
      } else {
        const BriefingPDF = (await import('../../components/pdf/BriefingPDF')).default;
        const clientBriefing = item.data.answers || item.data;
        doc = <BriefingPDF clientBriefing={clientBriefing} projectName={clientName} />;
      }

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Briefing_${clientName.replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      showToast("PDF de Briefing exportado com sucesso!");
    } catch (error) {
      showToast("Erro ao gerar PDF do Briefing.");
      console.error(error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Renderizadores de Cards Reutilizáveis
  const renderConsultoriaCard = (lead: any) => (
    <div key={`consultoria-${lead.id}`} onClick={() => setSelectedItem({ type: 'consultoria', data: lead })} className="p-4 rounded-xl border border-gray-100 bg-white/80 hover:border-[var(--color-atelier-terracota)]/40 hover:bg-white flex justify-between items-center transition-all cursor-pointer group shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center font-elegant text-xl text-purple-600">{lead.nome?.charAt(0)}</div>
        <div>
          <h4 className="font-bold text-[14px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors">{lead.nome}</h4>
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{lead.nicho || 'Nicho Não Informado'}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[11px] font-mono text-gray-400">{new Date(lead.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        <ArrowRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );

  const renderFormularioCard = (form: any) => {
    const isInsta = (form.tipo || '').toLowerCase().includes('insta') || (form.tipo || '').toLowerCase().includes('gerenciamento');
    
    return (
      <div 
        key={`form-${form.table_name}-${form.id}`} 
        onClick={() => {
          setSelectedItem({ type: 'formulario', data: form });
          if (!form.lido) handleMarkRead(form.id, form.table_name);
        }} 
        className={`p-4 rounded-xl border ${form.lido ? 'border-gray-100 bg-white/80' : 'border-orange-200 bg-orange-50/50'} hover:border-[var(--color-atelier-terracota)]/40 hover:bg-white flex justify-between items-center transition-all cursor-pointer group shadow-sm`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${form.lido ? 'bg-gray-100 text-gray-500' : 'bg-orange-100 text-orange-600'} rounded-xl flex items-center justify-center font-elegant text-xl`}>
            {(form.dados_completos?.Nome || form.dados_completos?.nome || form.Nome || "F").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-[14px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                {form.dados_completos?.Nome || form.dados_completos?.nome || form.Nome || 'Sem Nome'}
              </h4>
              <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${isInsta ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {isInsta ? 'Instagram' : 'Identidade Visual'}
              </span>
              {!form.lido && (
                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-orange-500 text-white animate-pulse">NEW</span>
              )}
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Orçamento Solicitado</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono text-gray-400">{new Date(form.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          <ArrowRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    );
  };

  const renderBriefingCard = (brief: any) => {
    const isInsta = brief.briefing_type === 'INSTA';
    return (
      <div 
        key={`briefing-${brief.briefing_type}-${brief.id}`} 
        onClick={() => setSelectedItem({ type: isInsta ? 'insta_briefing' : 'briefing', data: brief })} 
        className="p-4 rounded-xl border border-gray-100 bg-white/80 hover:border-[var(--color-atelier-terracota)]/40 hover:bg-white flex justify-between items-center transition-all cursor-pointer group shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center font-elegant text-xl">
            {(brief.profiles?.nome || "C").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-[14px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                {brief.profiles?.nome || "Cliente"}
              </h4>
              <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${isInsta ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {isInsta ? 'Instagram' : 'Identidade Visual'}
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Briefing Preenchido</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono text-gray-400">{new Date(brief.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${brief.is_completed || brief.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
            {brief.is_completed || brief.status === 'approved' ? 'Completo' : 'Em Análise'}
          </span>
          <ArrowRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    );
  };

  const renderPesquisaCard = (p: any) => (
    <div 
      key={`pesquisa-${p.pesquisa_type}-${p.id}`} 
      onClick={() => setSelectedItem({ type: 'pesquisa', data: p })} 
      className="p-4 rounded-xl border border-gray-100 bg-white/80 hover:border-[var(--color-atelier-terracota)]/40 hover:bg-white flex justify-between items-center transition-all cursor-pointer group shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${p.pesquisa_type === 'INSTA' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'} rounded-xl flex items-center justify-center font-elegant text-xl`}>
          {(p.nome_cliente || "P").charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-[14px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors">
              {p.nome_cliente || "Cliente"}
            </h4>
            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${p.pesquisa_type === 'INSTA' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {p.pesquisa_type === 'INSTA' ? 'Instagram' : 'Identidade Visual'}
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
            {p.satisfacao_resultado || p.satisfacao_gerenciamento ? `Satisfação: ${p.satisfacao_resultado || p.satisfacao_gerenciamento}` : 'Pesquisa de Satisfação'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {p.chance_indicar && (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
            Nota: {p.chance_indicar}/10
          </span>
        )}
        <span className="text-[11px] font-mono text-gray-400">
          {new Date(p.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
        <ArrowRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );

  const renderMapaCard = (m: any) => (
    <div 
      key={`mapa-${m.id}`} 
      onClick={() => setSelectedItem({ type: 'mapa', data: m })} 
      className="p-4 rounded-xl border border-gray-100 bg-white/80 hover:border-[var(--color-atelier-grafite)]/40 hover:bg-white flex justify-between items-center transition-all cursor-pointer group shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-50 text-[var(--color-atelier-grafite)] rounded-xl flex items-center justify-center font-elegant text-xl">
          {(m.nome_cliente || m.nome || m.Nome || m.nome_marca || "M").charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-[14px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-grafite)] transition-colors">
              {m.nome_cliente || m.nome || m.Nome || m.nome_marca || "Cliente"}
            </h4>
            <span className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase bg-gray-100 text-gray-800">
              Raio-X Instagram
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
            Respostas do Mapa
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[11px] font-mono text-gray-400">
          {new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
        <ArrowRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );

  const renderPesquisasKPIWidget = () => {
    const total = pesquisas.length;
    const idvCount = pesquisas.filter(p => p.pesquisa_type === 'IDV').length;
    const instaCount = pesquisas.filter(p => p.pesquisa_type === 'INSTA').length;

    const scores = pesquisas.map(p => parseFloat(p.chance_indicar)).filter(num => !isNaN(num));
    const avgNps = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "—";
    const promoters = scores.filter(s => s >= 9).length;
    const detractors = scores.filter(s => s < 7).length;
    const npsScore = scores.length > 0 ? Math.round(((promoters - detractors) / scores.length) * 100) : 0;
    const autorizados = pesquisas.filter(p => {
      const val = (p.autoriza_depoimento || '').toLowerCase();
      return val.includes('sim') || val.includes('autorizo');
    }).length;
    const txDepoimento = total > 0 ? Math.round((autorizados / total) * 100) : 0;
    const topSatisfacao = pesquisas.filter(p => {
      const r = (p.satisfacao_resultado || p.satisfacao_gerenciamento || '').toLowerCase();
      return r.includes('5') || r.includes('muito satisfeito');
    }).length;
    const txTopSatisfacao = total > 0 ? Math.round((topSatisfacao / total) * 100) : 0;

    return (
      <div className="bg-gradient-to-br from-white/95 to-amber-50/40 p-5 rounded-[2rem] border border-amber-200/50 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className="font-bold text-[13px] text-[var(--color-atelier-grafite)] uppercase tracking-wider">
                Barômetro Operacional & Satisfação
              </h3>
              <span className="text-[10px] text-gray-400 font-medium">
                Base consolidada: {total} {total === 1 ? 'pesquisa' : 'pesquisas'} ({idvCount} IDV • {instaCount} Instagram)
              </span>
            </div>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-white border border-amber-200 rounded-full text-[10px] font-bold text-amber-800 uppercase tracking-widest shadow-xs">
            NPS Atelier: {npsScore >= 0 ? `+${npsScore}` : npsScore} ({npsScore >= 75 ? 'Zona de Excelência' : npsScore >= 50 ? 'Zona de Qualidade' : 'Em Evolução'})
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5 mb-1">
              <Star size={12} className="text-amber-500 fill-amber-500" /> Nota Média
            </span>
            <span className="text-2xl font-elegant font-bold text-[var(--color-atelier-grafite)]">
              {avgNps} <span className="text-xs font-sans text-gray-400">/ 10</span>
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5 mb-1">
              <ThumbsUp size={12} className="text-blue-500" /> Excelência Total
            </span>
            <span className="text-2xl font-elegant font-bold text-[var(--color-atelier-grafite)]">
              {txTopSatisfacao}%
            </span>
            <span className="text-[9px] text-gray-400 font-medium mt-0.5">
              {topSatisfacao} de {total} no topo da escala
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5 mb-1">
              <MessageSquareHeart size={12} className="text-rose-500" /> Autoriza Depoimento
            </span>
            <span className="text-2xl font-elegant font-bold text-[var(--color-atelier-grafite)]">
              {txDepoimento}%
            </span>
            <span className="text-[9px] text-emerald-600 font-semibold mt-0.5">
              {autorizados} prontos p/ prova social
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5 mb-1">
              <Award size={12} className="text-[var(--color-atelier-terracota)]" /> Alinhamento
            </span>
            <span className="text-2xl font-elegant font-bold text-[var(--color-atelier-grafite)]">
              {total > 0 ? "100%" : "—"}
            </span>
            <span className="text-[9px] text-gray-400 font-medium mt-0.5">
              Percepção de marca valorizada
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col w-full max-w-[1200px] mx-auto h-[calc(100dvh-60px)] md:h-[calc(100vh-60px)] mt-4 px-4 lg:px-8 overflow-hidden animate-[fadeInUp_0.6s_ease-out_both]">
      
      {/* HEADER DA PÁGINA */}
      <div className="mb-6">
        <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">QG da <span className="text-[var(--color-atelier-terracota)] italic">Liziane.</span></h1>
        <p className="text-[12px] uppercase font-bold tracking-widest text-gray-400 mt-1">Central de Inteligência Operacional e Captação</p>
      </div>

      {/* KPI DASHBOARD GLOBAL */}
      {(() => {
        const totalLeads = consultorias.length;
        const totalOrcamentos = formularios.length;
        const totalBriefings = briefings.length;
        
        // Calcular Conversão Real (Forms que viraram Clientes Ativos baseando no e-mail)
        let orcamentosConvertidos = 0;
        formularios.forEach(form => {
          const formEmail = (form.dados_completos?.Email || form.dados_completos?.email || form.Email || form.email || "")?.toLowerCase().trim();
          if (formEmail && clientEmails.has(formEmail)) {
            orcamentosConvertidos++;
          }
        });
        
        const taxaConversaoOrcamento = totalLeads > 0 ? Math.round((totalOrcamentos / totalLeads) * 100) : 0;
        const taxaConversaoReal = totalOrcamentos > 0 ? Math.round((orcamentosConvertidos / totalOrcamentos) * 100) : 0;

        let gargalo = "Operação Saudável";
        let recomendacao = "Mantenha o padrão de qualificação atual.";
        
        if (taxaConversaoReal < 20 && totalOrcamentos > 5) {
          gargalo = "Baixa conversão na Venda (Orçamento -> Cliente)";
          recomendacao = "Muitos orçamentos sendo gerados, mas poucos ativados. Revise suas reuniões de fechamento, follow-up ou adequação de preço.";
        } else if (taxaConversaoOrcamento < 20 && totalLeads > 10) {
          gargalo = "Baixa conversão de Triagem para Orçamentos";
          recomendacao = "Os leads da triagem não estão avançando. Revise o aquecimento no Instagram ou a chamada para ação (CTA).";
        } else if (totalLeads < 10) {
          gargalo = "Baixo volume no Topo do Funil";
          recomendacao = "Invista em tráfego ou conteúdo de atração. A quantidade de leads entrando está muito baixa para sustentar conversões.";
        }

        return (
          <div className="mb-6 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 relative z-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50/50 p-3 rounded-2xl flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Entradas (Triagem)</span>
                <span className="text-2xl font-elegant font-bold text-[var(--color-atelier-grafite)]">{totalLeads}</span>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-2xl flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Orçamentos</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-elegant font-bold text-[var(--color-atelier-grafite)]">{totalOrcamentos}</span>
                  <span className="text-[10px] text-orange-500 font-bold mb-1">{taxaConversaoOrcamento}%</span>
                </div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-2xl flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Fechamentos Reais</span>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-elegant font-bold text-[var(--color-atelier-grafite)]">{orcamentosConvertidos}</span>
                  <span className="text-[10px] text-emerald-500 font-bold mb-1">{taxaConversaoReal}%</span>
                </div>
              </div>
              <div className="bg-gray-50/50 p-3 rounded-2xl flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Agenda</span>
                <span className="text-2xl font-elegant font-bold text-[var(--color-atelier-grafite)]">{meetings.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-gray-50 px-1">
              <div className="flex items-center gap-1.5 shrink-0">
                <AlertCircle size={14} className={gargalo === "Operação Saudável" ? "text-emerald-500" : "text-orange-500"} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">{gargalo}</span>
              </div>
              <div className="h-3 w-px bg-gray-200"></div>
              <p className="text-[11px] text-gray-500 truncate" title={recomendacao}>
                {recomendacao}
              </p>
            </div>
          </div>
        );
      })()}

      {/* LISTAGENS OPERACIONAIS (BOX) */}
      <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-[2rem] border border-gray-100 shadow-sm flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar relative pb-24 mb-4">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 size={24} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>
          ) : (
            <AnimatePresence mode="wait">
              {/* ABA VISÃO GERAL (TODOS AGREGADOS POR DATA) */}
              {activeTab === 'geral' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
                  {(() => {
                    const allItems = [
                      ...consultorias.map(c => ({ _sortDate: new Date(c.created_at).getTime(), _viewType: 'consultoria', data: c })),
                      ...formularios.map(f => ({ _sortDate: new Date(f.created_at).getTime(), _viewType: 'formulario', data: f })),
                      ...briefings.map(b => ({ _sortDate: new Date(b.created_at).getTime(), _viewType: 'briefing', data: b })),
                      ...pesquisas.map(p => ({ _sortDate: new Date(p.created_at).getTime(), _viewType: 'pesquisa', data: p })),
                      ...mapas.map(m => ({ _sortDate: new Date(m.created_at).getTime(), _viewType: 'mapa', data: m }))
                    ].sort((a, b) => b._sortDate - a._sortDate);

                    if (allItems.length === 0) return <div className="text-center p-8 text-gray-400 font-medium text-sm">Nenhuma resposta recebida.</div>;

                    return allItems.map(item => {
                      if (item._viewType === 'consultoria') return renderConsultoriaCard(item.data);
                      if (item._viewType === 'formulario') return renderFormularioCard(item.data);
                      if (item._viewType === 'briefing') return renderBriefingCard(item.data);
                      if (item._viewType === 'pesquisa') return renderPesquisaCard(item.data);
                      if (item._viewType === 'mapa') return renderMapaCard(item.data);
                      return null;
                    });
                  })()}
                </motion.div>
              )}

              {/* LISTA CONSULTORIAS IA */}
              {activeTab === 'consultoria' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
                  {consultorias.length === 0 && <div className="text-center p-8 text-gray-400 font-medium text-sm">Nenhuma triagem recebida.</div>}
                  {consultorias.map(lead => renderConsultoriaCard(lead))}
                </motion.div>
              )}

              {/* LISTA DE ORÇAMENTOS (FORMULÁRIOS TYPEFORM) */}
              {activeTab === 'orcamentos' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
                  {formularios.length === 0 ? (
                    <div className="text-center p-8 text-gray-400 font-medium text-sm">Nenhum orçamento recebido.</div>
                  ) : (
                    formularios.map(form => renderFormularioCard(form))
                  )}
                </motion.div>
              )}

              {/* LISTA DE BRIEFINGS */}
              {activeTab === 'briefings' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
                  {briefings.length === 0 ? (
                    <div className="text-center p-8 text-gray-400 font-medium text-sm">Nenhum briefing recebido.</div>
                  ) : (
                    briefings.map(brief => renderBriefingCard(brief))
                  )}
                </motion.div>
              )}

              {/* LISTA PESQUISAS DE SATISFAÇÃO + WIDGET DE KPIS OPERACIONAIS + FEED DE RELATOS */}
              {activeTab === 'pesquisas' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row gap-6">
                  {/* COLUNA ESQUERDA: KPIs & Lista (70%) */}
                  <div className="flex-1 lg:w-[70%] flex flex-col gap-4">
                    {/* WIDGET DE KPIS & INSIGHTS OPERACIONAIS */}
                    {renderPesquisasKPIWidget()}

                    {/* LISTAGEM DOS CARDS DE PESQUISA */}
                    <div className="flex flex-col gap-2">
                      {pesquisas.length === 0 ? (
                        <div className="text-center p-8 text-gray-400 font-medium text-sm">Nenhuma pesquisa de satisfação recebida.</div>
                      ) : (
                        pesquisas.map(p => renderPesquisaCard(p))
                      )}
                    </div>
                  </div>

                  {/* COLUNA DIREITA: WIDGET DE RELATOS (30% / 25%) */}
                  <div className="lg:w-[30%] flex flex-col gap-4">
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5 flex flex-col gap-4 max-h-full">
                      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                        <MessageSquareHeart size={16} className="text-rose-500" />
                        <h3 className="font-bold text-[12px] uppercase tracking-wider text-[var(--color-atelier-grafite)]">Feed de Relatos</h3>
                      </div>
                      
                      {/* Timeline de Depoimentos */}
                      <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pb-10">
                        {pesquisas.filter(p => p.relato && p.relato.trim().length > 0).length === 0 ? (
                          <div className="text-center p-8 text-gray-400 font-medium text-[11px]">
                            Nenhum relato recebido nas pesquisas até o momento.
                          </div>
                        ) : (
                          pesquisas
                            .filter(p => p.relato && p.relato.trim().length > 0)
                            .map((p, idx) => {
                              const isAutorizado = (p.autoriza_depoimento || '').toLowerCase().includes('sim') || (p.autoriza_depoimento || '').toLowerCase().includes('autorizo');
                              const nota = p.chance_indicar || p.satisfacao_resultado || p.satisfacao_gerenciamento;

                              return (
                                <div key={`relato-${idx}`} className="bg-rose-50/40 p-4 rounded-xl border border-rose-100/50 flex flex-col gap-2.5 relative group hover:border-rose-200 transition-colors mt-2">
                                  <div className={`absolute -top-2.5 -right-2 flex items-center gap-1.5 px-2 py-0.5 rounded shadow-sm border ${isAutorizado ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                                    {nota && <span className="text-[9px] font-bold flex items-center gap-0.5"><Star size={8} className={isAutorizado ? "fill-white" : "fill-gray-400"} /> {nota}/10</span>}
                                    {isAutorizado && (
                                      <>
                                        {nota && <span className="text-[8px] opacity-50">•</span>}
                                        <span className="text-[8px] font-black uppercase tracking-widest">PUB</span>
                                      </>
                                    )}
                                  </div>

                                  <p className="text-[12px] text-[var(--color-atelier-grafite)] italic leading-relaxed text-justify mt-1">
                                    "{p.relato}"
                                  </p>
                                  <div className="flex items-center justify-between mt-1 pt-2 border-t border-rose-100/30">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center font-elegant text-[10px]">
                                        {(p.nome_cliente || "C").charAt(0).toUpperCase()}
                                      </div>
                                      <span className="text-[10px] font-bold text-gray-600">{p.nome_cliente || 'Cliente'}</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-gray-400">
                                      {new Date(p.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* O MAPA (LOW TICKET) */}
              {activeTab === 'mapa' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
                  {mapas.length === 0 ? (
                    <div className="text-center p-8 text-gray-400 font-medium text-sm">Nenhuma resposta recebida para O Mapa.</div>
                  ) : (
                    mapas.map(m => renderMapaCard(m))
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          )}
      </div>

      {/* DETALHAMENTO DE FORMULÁRIOS SELECIONADOS (Modal Popup Centrado) */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-6 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedItem(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-4xl max-h-[90vh] bg-white rounded-[2rem] relative z-10 shadow-2xl flex flex-col overflow-hidden">
              <header className="p-6 border-b bg-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                    {selectedItem.type === 'formulario' ? selectedItem.data.tipo : selectedItem.type === 'consultoria' ? 'Ficha de Consultoria' : selectedItem.type === 'pesquisa' ? (selectedItem.data.pesquisa_type === 'INSTA' ? 'Pesquisa: Instagram' : 'Pesquisa: Identidade Visual') : selectedItem.type === 'mapa' ? 'Raio-X de Instagram' : 'Ficha de Briefing'}
                  </h3>
                  <span className="text-[11px] font-bold text-[var(--color-atelier-terracota)] uppercase tracking-widest block mt-0.5">
                    {selectedItem.data.nome_cliente || selectedItem.data.dados_completos?.Nome || selectedItem.data.nome || selectedItem.data.Nome || selectedItem.data.nome_marca || selectedItem.data.answers?.Nome_Cliente || 'Formulário Submetido'}
                    {selectedItem.data.created_at && (
                      <span className="text-gray-400 font-mono ml-2">
                        • {new Date(selectedItem.data.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedItem.type === 'formulario' && (
                    <button 
                      onClick={() => handleDownloadFormularioPDF(selectedItem.data)} 
                      disabled={isGeneratingPDF}
                      className="h-8 px-3 rounded-full bg-[var(--color-atelier-terracota)]/10 border border-[var(--color-atelier-terracota)]/20 flex items-center justify-center text-[var(--color-atelier-terracota)] hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest gap-2"
                    >
                      {isGeneratingPDF ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      PDF
                    </button>
                  )}
                  {(selectedItem.type === 'briefing' || selectedItem.type === 'insta_briefing') && (
                    <button 
                      onClick={() => handleDownloadBriefingPDF(selectedItem)} 
                      disabled={isGeneratingPDF}
                      className="h-8 px-3 rounded-full bg-[var(--color-atelier-terracota)]/10 border border-[var(--color-atelier-terracota)]/20 flex items-center justify-center text-[var(--color-atelier-terracota)] hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest gap-2"
                    >
                      {isGeneratingPDF ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      PDF
                    </button>
                  )}
                  {selectedItem.type === 'mapa' && (
                    <button 
                      onClick={() => handleDownloadMapaPDF(selectedItem.data)} 
                      disabled={isGeneratingPDF}
                      className="h-8 px-3 rounded-full bg-[var(--color-atelier-grafite)]/10 border border-[var(--color-atelier-grafite)]/20 flex items-center justify-center text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-grafite)] hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest gap-2"
                    >
                      {isGeneratingPDF ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      PDF
                    </button>
                  )}
                  <button onClick={() => setSelectedItem(null)} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"><X size={16}/></button>
                </div>
              </header>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6 bg-[#FAFAFA]">
                {selectedItem.type === 'formulario' ? (
                  // MAPEAR DADOS DO FORMULÁRIO EXTERNO (JSON COMPLETO)
                  <div className="flex flex-col gap-4">
                     {Object.entries(selectedItem.data.dados_completos || {}).map(([key, value]) => (
                        <DataField key={key} label={key.replace(/_/g, ' ')} value={String(value)} />
                     ))}
                  </div>
                ) : selectedItem.type === 'consultoria' ? (
                  // MAPEAR CONSULTORIA DO PAINEL MAKE/REST / BANCO UNIFICADO
                  <div className="flex flex-col gap-4">
                     <DataField label="Nome do Prospect" value={selectedItem.data.nome} />
                     <DataField label="Melhor E-mail" value={selectedItem.data.email} />
                     <DataField label="WhatsApp" value={selectedItem.data.telefone} />
                     <DataField label="Instagram Informado" value={selectedItem.data.instagram} />
                     <DataField label="Nicho / Nome da Marca" value={selectedItem.data.nicho} />
                     <DataField label="Função na Empresa" value={selectedItem.data.funcao_empresa} />
                     <DataField label="Tempo de Mercado / Marca" value={selectedItem.data.tempo_marca} />
                     <div className="h-px bg-gray-200 my-2"></div>
                     <DataField label="Objetivos da Marca (Próximos 6 meses)" value={selectedItem.data.market_positioning} />
                     <DataField label="Diferencial de Mercado" value={selectedItem.data.strategic_justification} />
                     <DataField label="Público Atual" value={selectedItem.data.publico_atual} />
                     <DataField label="Público Desejado" value={selectedItem.data.publico_desejado} />
                     <DataField label="Personalidade da Marca (Se fosse uma pessoa)" value={selectedItem.data.ai_stories_strategy} />
                     <DataField label="Marcas / Referências Inspiracionais" value={selectedItem.data.ai_tone_of_voice} />
                     <DataField label="Como a Consultoria pode Ajudar?" value={selectedItem.data.ai_visual_diagnosis} />
                     <DataField label="Como Conheceu" value={selectedItem.data.como_conheceu} />
                     <DataField label="Possui Logotipo Atual?" value={selectedItem.data.link_logo_atual} />
                     <DataField label="Descrição da Identidade Atual" value={selectedItem.data.descricao_identidade_atual} />
                     <DataField label="Considerações Finais" value={selectedItem.data.ai_brand_archetype} />
                  </div>
                ) : selectedItem.type === 'pesquisa' ? (
                  // MAPEAR PESQUISA DE SATISFAÇÃO (IDV OU INSTAGRAM)
                  <div className="flex flex-col gap-4">
                     <DataField label="Nome do Cliente" value={selectedItem.data.nome_cliente} />
                     <DataField label="E-mail" value={selectedItem.data.email} />
                     <DataField label="WhatsApp" value={selectedItem.data.whatsapp} />
                     <div className="h-px bg-gray-200 my-2"></div>

                     <div className="p-4 bg-amber-50/70 border border-amber-200/60 rounded-2xl flex items-center justify-between">
                       <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-amber-900">
                         Chance de Indicar a Outras Pessoas (NPS)
                       </span>
                       <span className="font-elegant text-2xl font-bold text-amber-900 px-3 py-1 bg-white rounded-xl shadow-sm border border-amber-200">
                         {selectedItem.data.chance_indicar || 'N/A'}/10
                       </span>
                     </div>

                     {selectedItem.data.pesquisa_type === 'IDV' ? (
                       <>
                         <DataField label="Satisfação com o Resultado" value={selectedItem.data.satisfacao_resultado} />
                         <DataField label="A Nova Identidade Representa Melhor a Marca?" value={selectedItem.data.representa_melhor} />
                         <DataField label="Como a Marca Passou a ser Percebida?" value={selectedItem.data.percepcao_marca} />
                       </>
                     ) : (
                       <>
                         <DataField label="Satisfação com o Gerenciamento" value={selectedItem.data.satisfacao_gerenciamento} />
                         <DataField label="O Instagram Melhorou?" value={selectedItem.data.instagram_melhorou} />
                         <DataField label="O que Mais Melhorou?" value={selectedItem.data.o_que_melhorou} />
                       </>
                     )}

                     <DataField label="Relato / Depoimento do Cliente" value={selectedItem.data.relato} />
                     <DataField label="Autorizou uso como Depoimento?" value={selectedItem.data.autoriza_depoimento} />
                  </div>
                ) : selectedItem.type === 'mapa' ? (
                  // MAPEAR O MAPA RAIO X
                  <div className="flex flex-col gap-4">
                     <DataField label="Nome do Cliente" value={selectedItem.data.nome_cliente || selectedItem.data.nome || selectedItem.data.Nome || selectedItem.data.nome_marca} />
                     <DataField label="WhatsApp" value={selectedItem.data.whatsapp || selectedItem.data.WhatsApp} />
                     <DataField label="E-mail" value={selectedItem.data.email || selectedItem.data.Email} />
                     <DataField label="Instagram" value={selectedItem.data.instagram || selectedItem.data.Instagram} />
                     <div className="h-px bg-gray-200 my-2"></div>
                     <div className="flex flex-wrap gap-2 mb-2">
                       <span className="px-3 py-1 bg-amber-50 text-amber-800 rounded-lg text-[10px] font-bold border border-amber-200">Score Geral: {selectedItem.data.score_geral || selectedItem.data.Score_Geral || selectedItem.data.dados_completos?.Score_Geral}</span>
                       <span className="px-3 py-1 bg-gray-50 text-gray-800 rounded-lg text-[10px] font-bold border border-gray-200">Clareza: {selectedItem.data.score_clareza || selectedItem.data.dados_completos?.Score_Clareza}</span>
                       <span className="px-3 py-1 bg-gray-50 text-gray-800 rounded-lg text-[10px] font-bold border border-gray-200">Autoridade: {selectedItem.data.score_autoridade || selectedItem.data.dados_completos?.Score_Autoridade}</span>
                       <span className="px-3 py-1 bg-gray-50 text-gray-800 rounded-lg text-[10px] font-bold border border-gray-200">Percepção: {selectedItem.data.score_percepcao || selectedItem.data.dados_completos?.Score_Percepcao}</span>
                       <span className="px-3 py-1 bg-gray-50 text-gray-800 rounded-lg text-[10px] font-bold border border-gray-200">Conversão: {selectedItem.data.score_conversao || selectedItem.data.dados_completos?.Score_Conversao}</span>
                     </div>
                     <DataField label="Dimensão Gargalo" value={selectedItem.data.dimensao_gargalo || selectedItem.data.dados_completos?.Dimensao_Gargalo} />
                     <div className="h-px bg-gray-200 my-2"></div>
                     
                     {Object.entries(selectedItem.data.dados_completos || selectedItem.data || {}).map(([key, value]) => {
                        const qKey = key.toUpperCase();
                        if (MAPA_QUESTIONS[qKey]) {
                          const answerLetter = String(value).toUpperCase();
                          const fullAnswer = MAPA_QUESTIONS[qKey][answerLetter as 'A'|'B'|'C'] || answerLetter;
                          return <DataField key={qKey} label={MAPA_QUESTIONS[qKey].q} value={fullAnswer} />;
                        }
                        
                        const ignoredKeys = new Set(['id', 'created_at', 'table_name', 'tipo', 'nome', 'Nome', 'nome_marca', 'nome_cliente', 'whatsapp', 'WhatsApp', 'email', 'Email', 'instagram', 'Instagram', 'score_geral', 'Score_Geral', 'score_clareza', 'Score_Clareza', 'score_autoridade', 'Score_Autoridade', 'score_percepcao', 'Score_Percepcao', 'score_conversao', 'Score_Conversao', 'dimensao_gargalo', 'Dimensao_Gargalo', 'dados_completos']);
                        if (ignoredKeys.has(key) || ignoredKeys.has(key.toLowerCase())) return null;
                        
                        return <DataField key={key} label={key.replace(/_/g, ' ')} value={String(value)} />;
                     })}
                  </div>
                ) : selectedItem.type === 'insta_briefing' ? (
                  // MAPEAR DOSSIÊ DE INSTAGRAM
                  <div className="flex flex-col gap-4">
                     <DataField label="Nome do Cliente" value={selectedItem.data.answers?.nome || selectedItem.data.profiles?.nome} />
                     <DataField label="WhatsApp" value={selectedItem.data.answers?.whatsapp} />
                     <DataField label="E-mail" value={selectedItem.data.answers?.email} />
                     <div className="h-px bg-gray-200 my-2"></div>
                     <DataField label="Produto Âncora" value={selectedItem.data.answers?.produto_ancora} />
                     <DataField label="Cliente Ideal (20/80)" value={selectedItem.data.answers?.cliente_ideal} />
                     <DataField label="Gatilho de Compra" value={selectedItem.data.answers?.gatilho_compra === 'Outro' ? selectedItem.data.answers?.gatilho_compra_outro : selectedItem.data.answers?.gatilho_compra} />
                     <DataField label="Inimigo Comum" value={selectedItem.data.answers?.inimigo_comum} />
                     <DataField label="Padrão de Excelência" value={selectedItem.data.answers?.padrao_excelencia} />
                     <DataField label="Persona da Marca" value={selectedItem.data.answers?.persona_marca} />
                     <DataField label="Estado do Arsenal (Visual)" value={selectedItem.data.answers?.arsenal_visual} />
                     <DataField label="Ponto de Chegada (Endgame)" value={selectedItem.data.answers?.ponto_chegada} />
                  </div>
                ) : (
                  // MAPEAR BRIEFING DE IDENTIDADE VISUAL
                   // MAPEAR BRIEFING DE IDENTIDADE VISUAL COMPLETO (120 CAMPOS)
                   <div className="flex flex-col gap-4">
                      {/* DADOS BÁSICOS DE CONTATO */}
                      <DataField label="Nome do Cliente" value={selectedItem.data.answers?.Nome_Cliente || selectedItem.data.answers?.nome || selectedItem.data.profiles?.nome} />
                      <DataField label="WhatsApp" value={selectedItem.data.answers?.WhatsApp || selectedItem.data.answers?.whatsapp} />
                      <DataField label="E-mail" value={selectedItem.data.answers?.Email || selectedItem.data.answers?.email || selectedItem.data.profiles?.email} />
                      <div className="h-px bg-gray-200 my-2"></div>

                      {/* RENDERIZAÇÃO INTELIGENTE DE TODOS OS DEMAIS CAMPOS PREENCHIDOS */}
                      {(() => {
                        const answers = selectedItem.data.answers || {};
                        const ignoredKeys = new Set([
                          'id', 'created_at', 'updated_at', 'notificado', 'lido', 'dados_completos',
                          'Nome_Cliente', 'nome', 'WhatsApp', 'whatsapp', 'Email', 'email', 'status_marca'
                        ]);

                        const LABELS: Record<string, string> = {
                          // Origem e Negócio
                          Nome_Logotipo: "Nome no Logotipo",
                          nome_logo: "Nome no Logotipo",
                          Significado_Nome: "Significado do Nome",
                          significado_nome: "Significado do Nome",
                          tem_significado_nome: "Significado do Nome (Opção)",
                          Tagline: "Tagline Desejada",
                          tagline: "Tagline Desejada",
                          Slogan: "Slogan Corporativo",
                          slogan: "Slogan Corporativo",
                          Produtos_Servicos: "Produtos e Serviços",
                          produtos_servicos: "Produtos e Serviços",
                          o_que_vende: "O que a marca vende?",
                          tipo_produto: "Tipo de Produto / Serviço",
                          tipo_produto_outro: "Tipo de Produto (Detalhe)",
                          motivo_nascimento: "Motivo do Nascimento da Marca",
                          motivo_escolha_negocio: "Por que escolheu este negócio?",
                          historia_importante: "História Marcante",
                          Motivo_Abertura: "Motivo de Abertura / História",
                          motivo_abertura: "Motivo de Abertura / História",
                          conceito_inseparavel: "Conceito Inseparável",
                          frase_resumo: "Frase Resumo da Marca",
                          pitch_10s: "Pitch de 10 Segundos",
                          Proposito: "Propósito da Marca",
                          proposito: "Propósito da Marca",
                          Tempo_Mercado: "Tempo de Mercado",
                          tempo_mercado: "Tempo de Mercado",

                          // Essência e Emoção
                          Emoji_Empresa: "Emoji da Marca",
                          emoji_empresa: "Emoji da Marca",
                          emoji: "Emoji da Marca",
                          Musica_Empresa: "Música da Marca",
                          musica_empresa: "Música da Marca",
                          musica: "Música da Marca",
                          Sentimento_Empresa: "Sentimento Core",
                          sentimento: "Sentimento Core",
                          sentimento_desejado: "Sentimento Desejado",
                          sentimento_desejado_outro: "Sentimento Desejado (Detalhe)",
                          Sentimento_Marca: "Sentimento Exigido da Marca",
                          sentimento_marca: "Sentimento Exigido da Marca",
                          Sentimento_Consumidor: "Sentimento do Consumidor",
                          sentimento_consumidor: "Sentimento do Consumidor",
                          Missao: "Missão de Negócio",
                          missao: "Missão de Negócio",

                          // Público
                          Genero_Publico: "Gênero do Público",
                          genero: "Gênero do Público",
                          Genero_Publico_Outro: "Gênero (Detalhe)",
                          genero_outro: "Gênero (Detalhe)",
                          Classe_Social: "Classe Social",
                          classe: "Classe Social",
                          Classe_Social_Outro: "Classe Social (Detalhe)",
                          classe_outro: "Classe Social (Detalhe)",
                          Idade_Publico: "Idade do Público",
                          idade: "Idade do Público",
                          Idade_Publico_Outro: "Faixa Etária (Detalhe)",
                          idade_outro: "Faixa Etária (Detalhe)",
                          Resumo_Publico: "Resumo do Público",
                          resumo_publico: "Resumo do Público",
                          perfil_cliente: "Perfil do Cliente Ideal",
                          problema_cliente: "Problema que a Marca Resolve",
                          influencia_compra: "Influência na Compra",
                          influencia_compra_outro: "Influência na Compra (Detalhe)",
                          cliente_indesejado: "Cliente Indesejado",

                          // Concorrência e Diferenciais
                          Links_Concorrentes: "Links dos Concorrentes",
                          concorrentes_links: "Links dos Concorrentes",
                          concorrentes: "Principais Concorrentes",
                          concorrentes_bom: "O que os Concorrentes fazem de Bom",
                          O_Que_Nao_Fazer: "O Que NÃO Fazer",
                          nao_fazer: "O Que NÃO Fazer",
                          fazer_diferente: "O que fará de Diferente",
                          evitar_mercado: "O que Evitar do Mercado",
                          Diferencial: "Diferenciais Competitivos",
                          diferencial: "Diferenciais Competitivos",
                          diferenca_outros: "Diferença em Relação aos Outros",
                          diferenca_percebida: "Diferença Percebida pelo Cliente",
                          algo_diferente: "Oferta Diferenciada",
                          motivo_compra: "Por que compram de você?",

                          // Atributos e Personalidade
                          atributos_gerais: "Atributos Gerais",
                          atributos_gerais_outro: "Atributos Gerais (Detalhe)",
                          atributos_top3: "Top 3 Atributos",
                          Top_3_Adjetivos: "Top 3 Adjetivos",
                          top_3_adjetivos: "Top 3 Adjetivos",
                          Adjetivos_Positivos: "Adjetivos Positivos",
                          adjetivos_positivos: "Adjetivos Positivos",
                          Adjetivos_Positivos_Outro: "Adjetivos Positivos (Detalhe)",
                          atributos_nao_transmitir: "Atributos a NÃO Transmitir",
                          atributos_nao_transmitir_outro: "Atributos a NÃO Transmitir (Detalhe)",
                          Adjetivos_Negativos: "Adjetivos Negativos",
                          adjetivos_negativos: "Adjetivos Negativos",
                          Adjetivos_Negativos_Outro: "Adjetivos Negativos (Detalhe)",
                          porque_atributos: "Por que esses atributos?",

                          // Eixos de Posicionamento
                          eixo_tradicional_contemporanea: "Eixo: Tradicional (1) ↔ Contemporânea (5)",
                          eixo_seria_descontraida: "Eixo: Séria (1) ↔ Descontraída (5)",
                          eixo_acessivel_exclusiva: "Eixo: Acessível (1) ↔ Exclusiva (5)",
                          eixo_discreta_ousada: "Eixo: Discreta (1) ↔ Ousada (5)",
                          eixo_racional_emocional: "Eixo: Racional (1) ↔ Emocional (5)",
                          eixo_minimalista_expressiva: "Eixo: Minimalista (1) ↔ Expressiva (5)",

                          // Percepção e Futuro
                          percepcao_primeiravez: "Percepção Primeira Vez",
                          percepcao_poscompra: "Percepção Pós-Compra",
                          percepcao_indesejada: "Percepção Indesejada",
                          falta_marca: "O que Falta na Marca Hoje",
                          Visao_5_Anos: "Visão em 5 Anos",
                          visao_5_anos: "Visão em 5 Anos",
                          empresa_hoje: "Empresa Hoje",
                          empresa_5_anos: "Empresa em 5 Anos",
                          representacao_futuro: "Representação de Futuro",
                          expansao: "Planos de Expansão",
                          como_expandir: "Como Pretende Expandir",
                          unica_coisa_resolver: "Principal Problema a Resolver",
                          validacao_espelho: "Validação Espelho",
                          ajustes_espelho: "Ajustes no Espelho",

                          // Universo Visual e Estilo
                          Referencias_Inspiracoes: "Referências Visuais e Inspirações",
                          referencias: "Referências Visuais",
                          marcas_admiradas: "Marcas Admiradas",
                          gosto_referencias: "O que gosta nas Referências",
                          gosto_referencias_outro: "Referências (Detalhe)",
                          marcas_nao_admiradas: "Marcas NÃO Admiradas",
                          nao_gosto_referencias: "O que não gosta nas Referências",
                          ambiente_proximo: "Ambiente Próximo da Marca",
                          ambiente_proximo_outro: "Ambiente Próximo (Detalhe)",
                          atmosfera_combinada: "Atmosfera da Marca",
                          universo_evitar: "Universo Visual a Evitar",
                          Cor_Desejada: "Cores Desejadas",
                          cor_desejada: "Cores Desejadas",
                          cor_desejada_opcao: "Opção de Cor",
                          cor_desejada_qual: "Qual Cor Desejada",
                          Cor_Nao_Desejada: "Cores Indesejadas",
                          cor_indesejada: "Cores Indesejadas",
                          Simbolo_Especifico: "Símbolo Específico",
                          simbolo_desejado: "Símbolo Desejado",
                          simbolo_indesejado: "Símbolo Indesejado",
                          identidade_preservar: "O que Preservar da Identidade Atual",
                          identidade_abandonar: "O que Abandonar da Identidade Atual",
                          Sobre_Logo_Atual: "Sobre o Logo Atual",
                          logo_atual: "Sobre o Logo Atual",

                          // Aplicações e Finalização
                          Onde_Verao_Identidade: "Onde Verão a Identidade",
                          onde_verao: "Onde Verão a Identidade",
                          aplicacoes: "Aplicações Previstas",
                          aplicacoes_outro: "Aplicações (Detalhe)",
                          aplicacao_principal: "Aplicação Principal",
                          aplicacao_especial: "Aplicação Especial",
                          Motivo_Escolha_Liz: "Motivo da Escolha do Atelier",
                          motivo_escolha: "Motivo da Escolha do Atelier",
                          Ideias_Livres_Extras: "Considerações Finais",
                          ideias_livres: "Considerações Finais",
                          consideracoes_finais: "Considerações Finais"
                        };

                        const renderedKeys = new Set<string>();

                        return Object.entries(answers).map(([key, val]) => {
                          if (!val || ignoredKeys.has(key) || renderedKeys.has(key)) return null;

                          // Normalizar arrays
                          const displayValue = Array.isArray(val) ? val.join(', ') : val;
                          if (typeof displayValue === 'string' && displayValue.trim() === '') return null;

                          const label = LABELS[key] || key.replace(/_/g, ' ');
                          renderedKeys.add(key);

                          return <DataField key={key} label={label} value={displayValue} />;
                        });
                      })()}
                   </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EXPRESS MEETING SCHEDULER */}
      <AnimatePresence>
        {isMeetingModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMeetingModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95 }} className="bg-white p-6 md:p-8 rounded-none md:rounded-[2rem] shadow-2xl relative z-10 w-full h-full md:h-auto md:max-w-md border border-gray-100 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Agendar Reunião</h3>
                <button onClick={() => setIsMeetingModalOpen(false)} className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-gray-100 md:bg-transparent hover:bg-gray-200 transition-colors"><X size={18} className="md:w-4 md:h-4"/></button>
              </div>
              <form onSubmit={handleScheduleMeeting} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Prospect / Lead *</label>
                  <select required value={meetingForm.leadId} onChange={(e) => setMeetingForm({...meetingForm, leadId: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]">
                    <option value="" disabled>Selecionar Pessoa da Triagem...</option>
                    {consultorias.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.instagram || c.email})</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Título / Objetivo *</label>
                  <input type="text" required placeholder="Ex: Alinhamento Comercial e Diagnóstico" value={meetingForm.title} onChange={(e) => setMeetingForm({...meetingForm, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-[13px] font-medium outline-none focus:border-[var(--color-atelier-terracota)]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Data e Hora *</label>
                  <input type="datetime-local" required value={meetingForm.date} onChange={(e) => setMeetingForm({...meetingForm, date: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-[13px] font-medium outline-none focus:border-[var(--color-atelier-terracota)]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Notas / Link</label>
                  <textarea placeholder="Link do Google Meet ou observações..." value={meetingForm.notes} onChange={(e) => setMeetingForm({...meetingForm, notes: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-[13px] font-medium outline-none focus:border-[var(--color-atelier-terracota)] h-20 resize-none" />
                </div>
                <button type="submit" disabled={isProcessing} className="w-full bg-[var(--color-atelier-terracota)] text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-md flex items-center justify-center gap-2 mt-2">
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />} Confirmar Agendamento
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BARRA DE NAVEGAÇÃO INFERIOR FLUTUANTE */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex justify-center w-[95%] md:w-auto">
        <div className="flex flex-wrap items-center bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-1.5 rounded-[2rem] gap-1 z-10 w-full md:w-fit justify-center">
          <button onClick={() => { setActiveTab('geral'); setSelectedItem(null); }} className={`px-4 md:px-5 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex-1 md:flex-none ${activeTab === 'geral' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>Visão Geral</button>
          <button onClick={() => { setActiveTab('consultoria'); setSelectedItem(null); }} className={`px-4 md:px-5 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex-1 md:flex-none ${activeTab === 'consultoria' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>Consultoria</button>
          <button onClick={() => { setActiveTab('orcamentos'); setSelectedItem(null); }} className={`px-4 md:px-5 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex-1 md:flex-none ${activeTab === 'orcamentos' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>
            Orçamentos {formularios.filter(f => !f.lido).length > 0 && <span className="text-white bg-orange-500 px-1.5 py-0.5 rounded ml-1 text-[9px] font-black">{formularios.filter(f => !f.lido).length}</span>}
          </button>
          <button onClick={() => { setActiveTab('briefings'); setSelectedItem(null); }} className={`px-4 md:px-5 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex-1 md:flex-none ${activeTab === 'briefings' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>Briefing</button>
          <button onClick={() => { setActiveTab('pesquisas'); setSelectedItem(null); }} className={`px-4 md:px-5 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex-1 md:flex-none ${activeTab === 'pesquisas' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>Pesquisas</button>
          <button onClick={() => { setActiveTab('mapa'); setSelectedItem(null); }} className={`px-4 md:px-5 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex-1 md:flex-none ${activeTab === 'mapa' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}`}>O Mapa</button>
        </div>
      </div>
      
      </div>
    </>
  );
}

// Subcomponente de amostragem de dados profundos
function DataField({ label, value }: { label: string, value: any }) {
  if (!value) return null;
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1.5 transition-colors hover:border-[var(--color-atelier-terracota)]/10">
      <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">{label}</span>
      <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)] font-medium leading-relaxed whitespace-pre-wrap">{value.toString()}</p>
    </div>
  );
}