// src/app/admin/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase"; 
import { 
  FORM_LABELS, 
  BRIEFING_LABELS, 
  BRIEFING_CATEGORIES, 
  normalizeBriefingAnswers 
} from "../../lib/briefingConstants"; 
import { 
  Loader2, BrainCircuit, FileText, Calendar, 
  Save, Plus, X, Phone, Mail, Instagram, Briefcase, 
  Clock, CheckCircle, AlertCircle, FileSearch, Trash2, ArrowRight, Download,
  Star, ThumbsUp, TrendingUp, Award, MessageSquareHeart, Activity, LayoutDashboard, Users, FileSignature, FileEdit, Compass,
  ChevronDown, Copy, Check, ExternalLink, Search, Filter, MessageCircle, Sparkles, RefreshCw, Eye, ShieldCheck, Flame, Quote,
  Heart, Share2, MessageSquare, Layers, ArrowUpRight, BarChart3
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

const ATELIER_FORMS_CATEGORIES = [
  {
    category: "1. Orçamentos & Inscrições",
    items: [
      {
        title: "Cadastro / Orçamento de Identidade Visual",
        url: "https://lizdesign.com.br/form-cadastro",
        tag: "IDV"
      },
      {
        title: "Orçamento de Gerenciamento de Instagram",
        url: "https://lizdesign.com.br/form-socialmedia",
        tag: "Social Media"
      },
      {
        title: "Inscrição para Consultoria de Posicionamento",
        url: "https://lizdesign.com.br/form-consultoria",
        tag: "Consultoria"
      }
    ]
  },
  {
    category: "2. Briefings, Imersão & Diagnósticos",
    items: [
      {
        title: "Formulário de Briefing | Identidade Visual",
        url: "https://lizdesign.com.br/form-briefing",
        tag: "Briefing",
        detail: "Ajuste concorrentes 1 a 4"
      },
      {
        title: "Brand Discovery (Imersão de Marca)",
        url: "https://lizdesign.com.br/form-brand-discovery",
        tag: "DNA & Imersão"
      },
      {
        title: "Dossiê Estratégico (Onboarding Atelier)",
        url: "https://lizdesign.com.br/onboarding",
        tag: "Onboarding"
      },
      {
        title: "Raio-X do Instagram (Quiz / Diagnóstico)",
        url: "https://lizdesign.com.br/form-raiox",
        tag: "Quiz / Diagnóstico"
      }
    ]
  },
  {
    category: "3. Pesquisas de Satisfação & Reviews",
    items: [
      {
        title: "Brand Experience Review",
        url: "https://lizdesign.com.br/form-brand-experience",
        tag: "Review"
      },
      {
        title: "Pesquisa de Satisfação — Identidade Visual",
        url: "https://lizdesign.com.br/form-pesquisa-idv",
        tag: "Satisfação IDV"
      },
      {
        title: "Pesquisa de Satisfação — Gerenciamento de Instagram",
        url: "https://lizdesign.com.br/form-pesquisa-instagram",
        tag: "Satisfação Gestão"
      }
    ]
  }
];

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'geral' | 'orcamentos' | 'consultoria' | 'briefings' | 'pesquisas' | 'mapa'>('geral');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'clients' | 'idv' | 'insta'>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [pesquisasSubTab, setPesquisasSubTab] = useState<'depoimentos' | 'avaliacoes'>('depoimentos');

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

  // PERSPECTIVAS DO QG:
  // 'penetracao' = Métricas de Penetração Comercial (atual)
  // 'produtividade' = Relatório Mensal de Produtividade do Studio (Instagram consolidado de clientes via Apify)
  // null = Nenhum botão selecionado -> Header de métricas oculto para economizar espaço de tela!
  const [activePerspective, setActivePerspective] = useState<'penetracao' | 'produtividade' | null>('penetracao');
  const [productivityData, setProductivityData] = useState<any>(null);
  const [isSyncingProductivity, setIsSyncingProductivity] = useState(false);
  const [selectedProductivityClient, setSelectedProductivityClient] = useState<string>('all');
  const [productivitySort, setProductivitySort] = useState<'engagement' | 'recent' | 'likes' | 'views'>('engagement');
  const [productivityViewMode, setProductivityViewMode] = useState<'feed' | 'insights' | 'marcas'>('feed');

  // Dropdown e Cópia de Links Rápidos
  const [isFormsExpanded, setIsFormsExpanded] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Agendador de Reunião
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ leadId: "", title: "", date: "", notes: "" });

  const handleCopyLink = async (url: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedUrl(url);
      showToast("Link copiado com sucesso!");
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      showToast("Erro ao copiar o link.");
    }
  };

  const getWhatsAppUrl = (phone?: string, name?: string) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '');
    if (!clean) return null;
    const fullNumber = clean.length <= 11 ? `55${clean}` : clean;
    const greeting = name 
      ? `Olá ${name}! Aqui é a Liziane do Studio Veronna. Gostaria de dar continuidade ao seu formulário.` 
      : `Olá! Aqui é a Liziane do Studio Veronna. Gostaria de conversar sobre o seu formulário.`;
    return `https://wa.me/${fullNumber}?text=${encodeURIComponent(greeting)}`;
  };

  const copyToClipboard = async (text: string, msg = "Copiado para a área de transferência!") => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      showToast(msg);
    } catch {
      showToast("Não foi possível copiar.");
    }
  };

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
        (supabase.from('prospect_meetings') as any).select('*, leads(nome, instagram, telefone)').order('meeting_date', { ascending: true }),
        fetch('/api/pesquisas/list').then(res => res.json()).catch(() => ({ success: false, data: [] })),
        fetch('/api/mapa/list').then(res => res.json()).catch(() => ({ success: false, data: [] })),
        (supabase.from('profiles') as any).select('email').eq('role', 'cliente')
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
        const emails = new Set<string>(resClients.data.map((c: any) => c.email?.toLowerCase().trim()).filter(Boolean));
        setClientEmails(emails);
      }
    } catch (e) {
      console.error('[Dashboard Error]:', e);
      showToast("Erro ao sincronizar QG Estratégico.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductivityData = async (forceSync = false) => {
    try {
      setIsSyncingProductivity(true);
      const res = await fetch('/api/admin/studio-productivity');
      if (res.ok) {
        const data = await res.json();
        setProductivityData(data);
      }
    } catch (err) {
      console.error('Falha ao carregar produtividade do studio:', err);
    } finally {
      setIsSyncingProductivity(false);
    }
  };

  const syncApifyLive = async () => {
    try {
      setIsSyncingProductivity(true);
      showToast("Conectando à Apify para coletar métricas e posts de clientes...");
      const res = await fetch('/api/admin/studio-productivity', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Sincronização via Apify concluída com sucesso!");
      } else {
        showToast(data.warning || "Sincronização finalizada com dados locais.");
      }
      await fetchProductivityData(false);
    } catch (err) {
      showToast("Erro na comunicação com a Apify. Exibindo dados locais.");
      await fetchProductivityData(false);
    } finally {
      setIsSyncingProductivity(false);
    }
  };

  useEffect(() => {
    if (activePerspective === 'produtividade' && !productivityData) {
      fetchProductivityData(false);
    }
  }, [activePerspective, productivityData]);

  // Mapeamento de briefings para detecção precisa de Fechamentos Reais
  // Regra de negócio: um cliente só preenche o briefing após fechar contrato.
  // Portanto, detectamos correspondência entre orçamentos e briefings preenchidos.
  const briefingKeys = useMemo(() => {
    const emailSet = new Set<string>();
    const phoneSet = new Set<string>();
    const nameSet = new Set<string>();

    briefings.forEach(b => {
      const d = b.answers?.dados_completos || b.answers || {};
      const email = (b.profiles?.email || d.Email || d.email || b.answers?.Email || b.answers?.email || '')?.toLowerCase().trim();
      const phone = (d.WhatsApp || d.whatsapp || b.answers?.WhatsApp || b.answers?.whatsapp || '')?.replace(/\D/g, '');
      const name = (b.profiles?.nome || d.Nome_Cliente || d.nome || b.answers?.Nome_Cliente || b.answers?.nome || '')?.toLowerCase().trim();

      if (email && email.includes('@')) emailSet.add(email);
      if (phone && phone.length >= 8) phoneSet.add(phone.slice(-8));
      if (name && name.length >= 3) nameSet.add(name);
    });

    return { emailSet, phoneSet, nameSet };
  }, [briefings]);

  const isFormConverted = (form: any) => {
    const d = form.dados_completos || {};
    const fEmail = (d.Email || d.email || form.Email || form.email || '')?.toLowerCase().trim();
    const fPhone = (d.WhatsApp || d.whatsapp || form.WhatsApp || form.whatsapp || '')?.replace(/\D/g, '');
    const fName = (d.Nome || d.nome || form.Nome || '')?.toLowerCase().trim();

    if (fEmail && briefingKeys.emailSet.has(fEmail)) return true;
    if (fPhone && fPhone.length >= 8 && briefingKeys.phoneSet.has(fPhone.slice(-8))) return true;
    if (fName && fName.length >= 3 && briefingKeys.nameSet.has(fName)) return true;
    return false;
  };

  const isLeadConverted = (lead: any) => {
    const email = (lead.email || '')?.toLowerCase().trim();
    const phone = (lead.telefone || '')?.replace(/\D/g, '');
    const name = (lead.nome || '')?.toLowerCase().trim();

    if (email && briefingKeys.emailSet.has(email)) return true;
    if (phone && phone.length >= 8 && briefingKeys.phoneSet.has(phone.slice(-8))) return true;
    if (name && name.length >= 3 && briefingKeys.nameSet.has(name)) return true;
    return false;
  };

  const convertedFormIds = useMemo(() => {
    const set = new Set<string>();
    formularios.forEach(f => {
      if (isFormConverted(f)) {
        set.add(String(f.id));
      }
    });
    return set;
  }, [formularios, briefingKeys]);

  // Funnel & Performance Metrics com Cálculo Correto de Fechamentos Reais
  const metrics = useMemo(() => {
    const totalLeads = consultorias.length;
    const totalOrcamentos = formularios.length;
    const unreadOrcamentos = formularios.filter(f => !f.lido).length;
    const totalBriefings = briefings.length;
    const totalPesquisas = pesquisas.length;
    const totalMapas = mapas.length;

    // Fechamentos Reais: Orçamentos onde o cliente avançou e preencheu o Briefing
    const fechamentosReais = convertedFormIds.size;
    const taxaConversaoOrcamento = totalLeads > 0 ? Math.round((totalOrcamentos / totalLeads) * 100) : 0;
    const taxaConversaoReal = totalOrcamentos > 0 ? Math.round((fechamentosReais / totalOrcamentos) * 100) : 0;

    let gargalo = "Operação com Fluxo Saudável";
    let recomendacao = "Equilíbrio positivo entre atração, orçamentos e fechamentos validados.";
    let gargaloSeverity: 'healthy' | 'warning' | 'alert' = 'healthy';

    if (taxaConversaoReal < 15 && totalOrcamentos > 5) {
      gargalo = "Atenção no Fechamento Comercial (Orçamento -> Briefing)";
      recomendacao = "Volume alto de orçamentos pendentes de avanço. Reative os prospects via WhatsApp.";
      gargaloSeverity = 'warning';
    } else if (taxaConversaoOrcamento < 20 && totalLeads > 10) {
      gargalo = "Atenção na Qualificação da Triagem";
      recomendacao = "Leads da triagem demorando para pedir proposta comercial.";
      gargaloSeverity = 'warning';
    } else if (totalLeads < 10) {
      gargalo = "Atenção ao Topo do Funil de Atração";
      recomendacao = "Volume reduzido de novas pessoas conhecendo o Studio Veronna.";
      gargaloSeverity = 'alert';
    }

    return {
      totalLeads,
      totalOrcamentos,
      unreadOrcamentos,
      totalBriefings,
      totalPesquisas,
      totalMapas,
      fechamentosReais,
      taxaConversaoOrcamento,
      taxaConversaoReal,
      gargalo,
      recomendacao,
      gargaloSeverity
    };
  }, [consultorias, formularios, briefings, pesquisas, mapas, convertedFormIds]);

  // Agendar Reunião com Prospect
  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.leadId || !meetingForm.title || !meetingForm.date) return;
    setIsProcessing(true);

    try {
      const { error } = await (supabase.from('prospect_meetings') as any).insert({
        lead_id: meetingForm.leadId,
        title: meetingForm.title,
        meeting_date: new Date(meetingForm.date).toISOString(),
        notes: meetingForm.notes
      });

      if (error) throw error;
      showToast("🗓️ Reunião de Prospecção agendada com sucesso!");
      setIsMeetingModalOpen(false);
      setMeetingForm({ leadId: "", title: "", date: "", notes: "" });
      fetchDashboardData();
    } catch (e) {
      showToast("Erro ao agendar reunião.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenMeetingForLead = (leadId: string, leadName: string) => {
    setMeetingForm({
      leadId: leadId || "",
      title: `Alinhamento Comercial • ${leadName || 'Prospect'}`,
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      notes: ""
    });
    setIsMeetingModalOpen(true);
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

  // Filtros Globais Unificados com Busca
  const filterMatchesSearch = (item: any, type: string) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();

    let name = "";
    let email = "";
    let phone = "";
    let brand = "";
    let niche = "";

    if (type === 'consultoria') {
      name = item.nome || "";
      email = item.email || "";
      phone = item.telefone || "";
      niche = `${item.nicho || ""} ${item.funcao_empresa || ""}`;
    } else if (type === 'formulario') {
      const d = item.dados_completos || {};
      name = d.Nome || d.nome || item.Nome || "";
      email = d.Email || d.email || item.Email || item.email || "";
      phone = d.WhatsApp || d.whatsapp || item.WhatsApp || "";
      brand = d.Nome_Marca_Area || d.nome_marca_area || "";
      niche = d.Nicho || item.nicho || "";
    } else if (type === 'briefing') {
      name = item.profiles?.nome || item.answers?.Nome_Cliente || item.answers?.nome || "";
      email = item.profiles?.email || item.answers?.Email || item.answers?.email || "";
      phone = item.answers?.WhatsApp || item.answers?.whatsapp || "";
      brand = item.profiles?.empresa || item.answers?.Nome_Marca || item.answers?.nome_marca || "";
    } else if (type === 'pesquisa') {
      name = item.nome_cliente || "";
      email = item.email || "";
      phone = item.whatsapp || "";
    } else if (type === 'mapa') {
      name = item.nome_cliente || item.nome || item.Nome || item.nome_marca || "";
      email = item.email || item.Email || "";
      phone = item.whatsapp || item.WhatsApp || "";
      brand = item.instagram || item.Instagram || "";
    }

    return (
      name.toLowerCase().includes(term) ||
      email.toLowerCase().includes(term) ||
      phone.toLowerCase().includes(term) ||
      brand.toLowerCase().includes(term) ||
      niche.toLowerCase().includes(term)
    );
  };

  // Renderizadores de Cards Reutilizáveis
  const renderConsultoriaCard = (lead: any) => {
    const isConverted = isLeadConverted(lead);
    const waUrl = getWhatsAppUrl(lead.telefone, lead.nome);

    return (
      <div 
        key={`consultoria-${lead.id}`} 
        onClick={() => setSelectedItem({ type: 'consultoria', data: lead })} 
        className="p-4 sm:p-5 rounded-2xl border border-[var(--color-atelier-grafite)]/10 bg-white/70 backdrop-blur-md hover:border-[var(--color-atelier-terracota)]/40 hover:bg-white hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-center font-elegant text-xl text-purple-700 shrink-0">
            {lead.nome?.charAt(0) || "C"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-[14.5px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate">
                {lead.nome}
              </h4>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-purple-100/70 text-purple-900 border border-purple-200">
                Consultoria & Triagem
              </span>
              {isConverted && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle size={10} className="text-emerald-600" /> Fechamento Real (Briefing OK)
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-gray-500 mt-0.5 truncate">
              {lead.nicho || 'Nicho Não Informado'}{lead.funcao_empresa ? ` • ${lead.funcao_empresa}` : ''}
              {lead.instagram ? ` • @${lead.instagram.replace('@', '')}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          {waUrl && (
            <a 
              href={waUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center"
              title="Conversar no WhatsApp"
            >
              <MessageCircle size={14} />
            </a>
          )}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenMeetingForLead(lead.id, lead.nome);
            }}
            className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors flex items-center justify-center"
            title="Agendar Reunião de Proposta"
          >
            <Calendar size={14} />
          </button>
          <span className="text-[11px] font-mono text-gray-400">
            {new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="w-7 h-7 rounded-full bg-gray-50 group-hover:bg-[var(--color-atelier-terracota)] group-hover:text-white flex items-center justify-center text-gray-400 transition-all">
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    );
  };

  const renderFormularioCard = (form: any) => {
    const isInsta = (form.tipo || '').toLowerCase().includes('insta') || (form.tipo || '').toLowerCase().includes('gerenciamento');
    const d = form.dados_completos || {};
    const nicho = d.Nicho || form.nicho || '';
    const posts = d.Quantidade_Posts || form.quantidade_posts || '';
    const invest = d.Investimento || form.Investimento || form.investimento || '';
    const marcaArea = d.Nome_Marca_Area || form.Nome_Marca_Area || form.nome_marca_area || '';
    const clientName = d.Nome || d.nome || form.Nome || 'Sem Nome';
    const isConverted = convertedFormIds.has(String(form.id));
    const waPhone = d.WhatsApp || d.whatsapp || form.WhatsApp || form.whatsapp;
    const waUrl = getWhatsAppUrl(waPhone, clientName);
    
    let subtitle = "Orçamento Solicitado";
    if (isInsta) {
      if (nicho && posts) subtitle = `${nicho} • ${posts} posts${invest ? ` • ${invest}` : ''}`;
      else if (nicho) subtitle = `${nicho}${invest ? ` • ${invest}` : ''}`;
      else if (invest) subtitle = `Investimento: ${invest}`;
    } else {
      if (marcaArea && invest) subtitle = `${marcaArea} • ${invest}`;
      else if (marcaArea) subtitle = marcaArea;
      else if (invest) subtitle = `Investimento: ${invest}`;
    }
    
    return (
      <div 
        key={`form-${form.table_name}-${form.id}`} 
        onClick={() => {
          setSelectedItem({ type: 'formulario', data: form });
          if (!form.lido) handleMarkRead(form.id, form.table_name);
        }} 
        className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          form.lido 
            ? 'border-[var(--color-atelier-grafite)]/10 bg-white/70 backdrop-blur-md hover:border-[var(--color-atelier-terracota)]/40 hover:bg-white hover:shadow-md' 
            : 'border-orange-300 bg-orange-50/60 shadow-sm hover:bg-orange-50/80 hover:border-orange-400'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-11 h-11 ${form.lido ? 'bg-gray-100 text-gray-700' : 'bg-orange-500 text-white font-bold'} rounded-2xl flex items-center justify-center font-elegant text-xl shrink-0 shadow-xs`}>
            {clientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-[14.5px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate">
                {clientName}
              </h4>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${isInsta ? 'bg-amber-100/70 text-amber-900 border border-amber-200' : 'bg-[var(--color-veronna-navy)]/10 text-[var(--color-veronna-navy)] border border-[var(--color-veronna-navy)]/20'}`}>
                {isInsta ? 'Gerenciamento Instagram' : 'Identidade Visual'}
              </span>
              {!form.lido && (
                <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-widest bg-orange-500 text-white animate-pulse">
                  NOVO
                </span>
              )}
              {isConverted && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle size={10} className="text-emerald-600" /> Fechamento Real (Briefing OK)
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-gray-500 mt-0.5 truncate">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          {waUrl && (
            <a 
              href={waUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center"
              title="Conversar no WhatsApp"
            >
              <MessageCircle size={14} />
            </a>
          )}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadFormularioPDF(form);
            }}
            disabled={isGeneratingPDF}
            className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors flex items-center justify-center"
            title="Baixar PDF do Orçamento"
          >
            <Download size={14} />
          </button>
          <span className="text-[11px] font-mono text-gray-400">
            {new Date(form.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="w-7 h-7 rounded-full bg-gray-50 group-hover:bg-[var(--color-atelier-terracota)] group-hover:text-white flex items-center justify-center text-gray-400 transition-all">
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    );
  };

  const renderBriefingCard = (brief: any) => {
    const isInsta = brief.briefing_type === 'INSTA';
    const clientName = brief.profiles?.nome || brief.answers?.Nome_Cliente || brief.answers?.nome || "Cliente";
    const brandName = brief.profiles?.empresa || brief.answers?.Nome_Marca || brief.answers?.nome_marca || brief.answers?.Nome_Logotipo || "";
    const waPhone = brief.answers?.WhatsApp || brief.answers?.whatsapp;
    const waUrl = getWhatsAppUrl(waPhone, clientName);

    return (
      <div 
        key={`briefing-${brief.briefing_type}-${brief.id}`} 
        onClick={() => setSelectedItem({ type: isInsta ? 'insta_briefing' : 'briefing', data: brief })} 
        className="p-4 sm:p-5 rounded-2xl border border-[var(--color-atelier-grafite)]/10 bg-white/70 backdrop-blur-md hover:border-[var(--color-atelier-terracota)]/40 hover:bg-white hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 bg-stone-100 text-stone-700 rounded-2xl flex items-center justify-center font-elegant text-xl shrink-0">
            {clientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-[14.5px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate">
                {clientName}
                {brandName ? <span className="font-normal text-gray-400 font-sans text-xs ml-1.5">• {brandName}</span> : null}
              </h4>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${isInsta ? 'bg-amber-100/70 text-amber-900 border border-amber-200' : 'bg-[var(--color-veronna-navy)]/10 text-[var(--color-veronna-navy)] border border-[var(--color-veronna-navy)]/20'}`}>
                {isInsta ? 'Instagram Dossiê' : 'Briefing IDV'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <CheckCircle size={9} className="text-emerald-600" /> Contrato Fechado
              </span>
            </div>
            <p className="text-[11px] font-medium text-gray-500 mt-0.5">
              Briefing de Imersão e Diretrizes Estratégicas
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          {waUrl && (
            <a 
              href={waUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center"
              title="Conversar no WhatsApp"
            >
              <MessageCircle size={14} />
            </a>
          )}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadBriefingPDF(brief);
            }}
            disabled={isGeneratingPDF}
            className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors flex items-center justify-center"
            title="Baixar PDF do Briefing"
          >
            <Download size={14} />
          </button>
          <span className="text-[11px] font-mono text-gray-400">
            {new Date(brief.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="w-7 h-7 rounded-full bg-gray-50 group-hover:bg-[var(--color-atelier-terracota)] group-hover:text-white flex items-center justify-center text-gray-400 transition-all">
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    );
  };

  const renderPesquisaCard = (p: any) => {
    const isAutorizado = (p.autoriza_depoimento || '').toLowerCase().includes('sim') || (p.autoriza_depoimento || '').toLowerCase().includes('autorizo');
    const waUrl = getWhatsAppUrl(p.whatsapp, p.nome_cliente);

    return (
      <div 
        key={`pesquisa-${p.pesquisa_type}-${p.id}`} 
        onClick={() => setSelectedItem({ type: 'pesquisa', data: p })} 
        className="p-4 sm:p-5 rounded-2xl border border-[var(--color-atelier-grafite)]/10 bg-white/70 backdrop-blur-md hover:border-[var(--color-atelier-terracota)]/40 hover:bg-white hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-11 h-11 ${p.pesquisa_type === 'INSTA' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'} rounded-2xl flex items-center justify-center font-elegant text-xl shrink-0`}>
            {(p.nome_cliente || "P").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-[14.5px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate">
                {p.nome_cliente || "Cliente"}
              </h4>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${p.pesquisa_type === 'INSTA' ? 'bg-amber-100/70 text-amber-900 border border-amber-200' : 'bg-emerald-100/70 text-emerald-900 border border-emerald-200'}`}>
                {p.pesquisa_type === 'INSTA' ? 'Review Instagram' : 'Review IDV'}
              </span>
              {isAutorizado && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                  <Star size={10} className="fill-rose-500" /> Depoimento Autorizado
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-gray-500 mt-0.5 truncate">
              {p.satisfacao_resultado || p.satisfacao_gerenciamento ? `Satisfação: ${p.satisfacao_resultado || p.satisfacao_gerenciamento}` : 'Pesquisa de Satisfação & Percepção'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          {p.chance_indicar && (
            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/10 text-amber-900 border border-amber-300 font-roboto tabular-nums">
              NPS {p.chance_indicar}/10
            </span>
          )}
          {waUrl && (
            <a 
              href={waUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center"
              title="Agradecer no WhatsApp"
            >
              <MessageCircle size={14} />
            </a>
          )}
          <span className="text-[11px] font-mono text-gray-400">
            {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="w-7 h-7 rounded-full bg-gray-50 group-hover:bg-[var(--color-atelier-terracota)] group-hover:text-white flex items-center justify-center text-gray-400 transition-all">
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    );
  };

  const renderMapaCard = (m: any) => {
    const clientName = m.nome_cliente || m.nome || m.Nome || m.nome_marca || "Cliente";
    const waUrl = getWhatsAppUrl(m.whatsapp || m.WhatsApp, clientName);

    return (
      <div 
        key={`mapa-${m.id}`} 
        onClick={() => setSelectedItem({ type: 'mapa', data: m })} 
        className="p-4 sm:p-5 rounded-2xl border border-[var(--color-atelier-grafite)]/10 bg-white/70 backdrop-blur-md hover:border-[var(--color-atelier-terracota)]/40 hover:bg-white hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 bg-sky-50 text-sky-800 rounded-2xl flex items-center justify-center font-elegant text-xl shrink-0">
            {clientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-[14.5px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate">
                {clientName}
              </h4>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-sky-100/70 text-sky-900 border border-sky-200">
                Raio-X Instagram
              </span>
              {(m.score_geral || m.Score_Geral) && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                  Score: {m.score_geral || m.Score_Geral}
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-gray-500 mt-0.5">
              Diagnóstico Estratégico de Perfil & Gargalos
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          {waUrl && (
            <a 
              href={waUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors flex items-center justify-center"
              title="Conversar no WhatsApp"
            >
              <MessageCircle size={14} />
            </a>
          )}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadMapaPDF(m);
            }}
            disabled={isGeneratingPDF}
            className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors flex items-center justify-center"
            title="Baixar PDF do Raio-X"
          >
            <Download size={14} />
          </button>
          <span className="text-[11px] font-mono text-gray-400">
            {new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="w-7 h-7 rounded-full bg-gray-50 group-hover:bg-[var(--color-atelier-terracota)] group-hover:text-white flex items-center justify-center text-gray-400 transition-all">
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    );
  };

  // Modernizada View de Pesquisas & NPS com Disposição de Widgets Editorial
  const renderPesquisasModernView = () => {
    const total = pesquisas.length;
    const scores = pesquisas.map(p => parseFloat(p.chance_indicar)).filter(num => !isNaN(num));
    const avgNps = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "10";
    const promoters = scores.filter(s => s >= 9).length;
    const detractors = scores.filter(s => s < 7).length;
    const npsScore = scores.length > 0 ? Math.round(((promoters - detractors) / scores.length) * 100) : 100;
    
    const relatosCompletos = pesquisas.filter(p => p.relato && p.relato.trim().length > 0);
    const autorizados = pesquisas.filter(p => {
      const val = (p.autoriza_depoimento || '').toLowerCase();
      return val.includes('sim') || val.includes('autorizo');
    }).length;
    const txDepoimento = total > 0 ? Math.round((autorizados / total) * 100) : 100;

    return (
      <div className="flex flex-col gap-5 animate-in fade-in duration-200">
        {/* BARÔMETRO DE EXPERIÊNCIA MODERNO EM CARDS DE VIDRO */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="tess-card p-4 rounded-2xl flex flex-col justify-between border border-amber-200/50 bg-amber-50/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Star size={13} className="text-amber-500 fill-amber-500" /> NPS Veronna
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/15 text-amber-900 border border-amber-300">
                EXCELÊNCIA
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-elegant font-bold text-amber-950">
                {npsScore >= 0 ? `+${npsScore}` : npsScore}
              </span>
              <span className="text-xs text-amber-800 font-medium">
                Média {avgNps}/10
              </span>
            </div>
          </div>

          <div className="tess-card p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <ThumbsUp size={13} className="text-blue-500" /> Satisfação Geral
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-elegant font-bold text-[var(--color-atelier-grafite)]">
                100%
              </span>
              <span className="text-[10.5px] text-emerald-600 font-semibold">
                Percepção valorizada
              </span>
            </div>
          </div>

          <div className="tess-card p-4 rounded-2xl flex flex-col justify-between border border-rose-200/40 bg-rose-50/15">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
              <MessageSquareHeart size={13} className="text-rose-500" /> Depoimentos
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-elegant font-bold text-rose-950">
                {autorizados}
              </span>
              <span className="text-[10.5px] text-rose-700 font-bold">
                {txDepoimento}% autorizados
              </span>
            </div>
          </div>

          <div className="tess-card p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Award size={13} className="text-[var(--color-atelier-terracota)]" /> Base Avaliada
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-elegant font-bold text-[var(--color-atelier-grafite)]">
                {total}
              </span>
              <span className="text-[10.5px] text-gray-400 font-medium">
                Respostas consolidadas
              </span>
            </div>
          </div>
        </div>

        {/* SUB-SELETOR EDITORIAL: MURAL DE PROVA SOCIAL VS DETALHES DE AUDITORIA */}
        <div className="flex items-center justify-between border-b border-gray-200/70 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPesquisasSubTab('depoimentos')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                pesquisasSubTab === 'depoimentos'
                  ? 'bg-[var(--color-atelier-terracota)] text-white shadow-2xs'
                  : 'text-gray-500 hover:text-[var(--color-atelier-grafite)] hover:bg-gray-100'
              }`}
            >
              <Quote size={13} />
              <span>Mural de Prova Social ({relatosCompletos.length})</span>
            </button>
            <button
              onClick={() => setPesquisasSubTab('avaliacoes')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                pesquisasSubTab === 'avaliacoes'
                  ? 'bg-[var(--color-atelier-terracota)] text-white shadow-2xs'
                  : 'text-gray-500 hover:text-[var(--color-atelier-grafite)] hover:bg-gray-100'
              }`}
            >
              <FileSearch size={13} />
              <span>Fichas Detalhadas ({pesquisas.length})</span>
            </button>
          </div>

          <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
            Clique no depoimento para copiar o texto pronto para marketing.
          </span>
        </div>

        {/* CONTEÚDO DA SUB-ABA DE PESQUISAS */}
        {pesquisasSubTab === 'depoimentos' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatosCompletos.map((p, idx) => {
              const isAutorizado = (p.autoriza_depoimento || '').toLowerCase().includes('sim') || (p.autoriza_depoimento || '').toLowerCase().includes('autorizo');
              const nota = p.chance_indicar || p.satisfacao_resultado || p.satisfacao_gerenciamento;
              const waUrl = getWhatsAppUrl(p.whatsapp, p.nome_cliente);

              return (
                <div 
                  key={`mural-relato-${idx}`}
                  className="p-5 rounded-3xl bg-white border border-gray-100 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group relative overflow-hidden"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-elegant text-base font-bold flex items-center justify-center">
                          {(p.nome_cliente || "C").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-[13.5px] text-[var(--color-atelier-grafite)]">
                            {p.nome_cliente || 'Cliente Studio Veronna'}
                          </h4>
                          <span className="text-[10px] text-gray-400">
                            {p.pesquisa_type === 'INSTA' ? 'Gerenciamento Instagram' : 'Identidade Visual'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {nota && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                            <Star size={10} className="fill-amber-500 text-amber-500" /> {nota}/10
                          </span>
                        )}
                        {isAutorizado && (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                            PUB
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="relative pl-3 border-l-2 border-[var(--color-atelier-terracota)]/30 mt-1">
                      <p className="text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed italic">
                        "{p.relato}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-[10px] font-mono text-gray-400">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </span>

                    <div className="flex items-center gap-2">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-500 hover:text-emerald-700 text-[11px] font-medium border border-gray-200 transition flex items-center gap-1"
                          title="Agradecer no WhatsApp"
                        >
                          <MessageCircle size={12} /> Contato
                        </a>
                      )}
                      <button
                        onClick={() => copyToClipboard(`"${p.relato}"\n\n— ${p.nome_cliente || 'Cliente Studio Veronna'}`, "Depoimento copiado para marketing!")}
                        className="px-3 py-1 rounded-xl bg-[var(--color-atelier-terracota)] text-white text-[11px] font-bold shadow-2xs hover:opacity-90 transition flex items-center gap-1.5"
                      >
                        <Copy size={11} /> Copiar Depoimento
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {pesquisas.map(p => renderPesquisaCard(p))}
          </div>
        )}
      </div>
    );
  };

  // Itens filtrados para a visão atual
  const filteredItems = useMemo(() => {
    if (activeTab === 'geral') {
      const all = [
        ...consultorias.map(c => ({ _sortDate: new Date(c.created_at).getTime(), _viewType: 'consultoria', data: c })),
        ...formularios.map(f => ({ _sortDate: new Date(f.created_at).getTime(), _viewType: 'formulario', data: f })),
        ...briefings.map(b => ({ _sortDate: new Date(b.created_at).getTime(), _viewType: 'briefing', data: b })),
        ...pesquisas.map(p => ({ _sortDate: new Date(p.created_at).getTime(), _viewType: 'pesquisa', data: p })),
        ...mapas.map(m => ({ _sortDate: new Date(m.created_at).getTime(), _viewType: 'mapa', data: m }))
      ].sort((a, b) => b._sortDate - a._sortDate);

      return all.filter(item => {
        const matchesSearch = filterMatchesSearch(item.data, item._viewType);
        if (!matchesSearch) return false;

        if (filterStatus === 'unread') {
          return item._viewType === 'formulario' && !item.data.lido;
        }
        if (filterStatus === 'clients') {
          if (item._viewType === 'formulario') return isFormConverted(item.data);
          if (item._viewType === 'consultoria') return isLeadConverted(item.data);
          if (item._viewType === 'briefing') return true; // Todo briefing preenchido é cliente fechado
          return false;
        }
        if (filterStatus === 'idv') {
          return (
            (item._viewType === 'formulario' && !(item.data.tipo || '').toLowerCase().includes('insta')) ||
            (item._viewType === 'briefing' && item.data.briefing_type !== 'INSTA') ||
            (item._viewType === 'pesquisa' && item.data.pesquisa_type === 'IDV')
          );
        }
        if (filterStatus === 'insta') {
          return (
            (item._viewType === 'formulario' && (item.data.tipo || '').toLowerCase().includes('insta')) ||
            (item._viewType === 'briefing' && item.data.briefing_type === 'INSTA') ||
            (item._viewType === 'pesquisa' && item.data.pesquisa_type === 'INSTA') ||
            item._viewType === 'mapa'
          );
        }

        return true;
      });
    }

    if (activeTab === 'orcamentos') {
      return formularios.filter(f => {
        const matchesSearch = filterMatchesSearch(f, 'formulario');
        if (!matchesSearch) return false;
        if (filterStatus === 'unread') return !f.lido;
        if (filterStatus === 'clients') return isFormConverted(f);
        if (filterStatus === 'idv') return !(f.tipo || '').toLowerCase().includes('insta');
        if (filterStatus === 'insta') return (f.tipo || '').toLowerCase().includes('insta');
        return true;
      });
    }

    if (activeTab === 'consultoria') {
      return consultorias.filter(c => {
        const matchesSearch = filterMatchesSearch(c, 'consultoria');
        if (!matchesSearch) return false;
        if (filterStatus === 'clients') return isLeadConverted(c);
        return true;
      });
    }

    if (activeTab === 'briefings') {
      return briefings.filter(b => {
        const matchesSearch = filterMatchesSearch(b, 'briefing');
        if (!matchesSearch) return false;
        if (filterStatus === 'idv') return b.briefing_type !== 'INSTA';
        if (filterStatus === 'insta') return b.briefing_type === 'INSTA';
        return true;
      });
    }

    if (activeTab === 'pesquisas') {
      return pesquisas.filter(p => {
        const matchesSearch = filterMatchesSearch(p, 'pesquisa');
        if (!matchesSearch) return false;
        if (filterStatus === 'idv') return p.pesquisa_type === 'IDV';
        if (filterStatus === 'insta') return p.pesquisa_type === 'INSTA';
        return true;
      });
    }

    if (activeTab === 'mapa') {
      return mapas.filter(m => filterMatchesSearch(m, 'mapa'));
    }

    return [];
  }, [activeTab, consultorias, formularios, briefings, pesquisas, mapas, searchTerm, filterStatus, convertedFormIds, briefingKeys]);

  const filteredProductivityPosts = useMemo(() => {
    if (!productivityData?.posts) return [];
    let list = [...productivityData.posts];
    if (selectedProductivityClient !== 'all') {
      list = list.filter((p: any) => p.clientUsername === selectedProductivityClient);
    }
    if (productivitySort === 'engagement') {
      list.sort((a: any, b: any) => (b.likes + b.comments * 2) - (a.likes + a.comments * 2));
    } else if (productivitySort === 'recent') {
      list.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (productivitySort === 'likes') {
      list.sort((a: any, b: any) => b.likes - a.likes);
    } else if (productivitySort === 'views') {
      list.sort((a: any, b: any) => b.views - a.views);
    }
    return list;
  }, [productivityData, selectedProductivityClient, productivitySort]);

  // =========================================================================
  // RELATÓRIO MENSAL DE PRODUTIVIDADE DO STUDIO (CONSOLIDADO INSTAGRAM VIA APIFY)
  // =========================================================================
  const renderStudioProductivityReport = () => {
    if (isSyncingProductivity && !productivityData) {
      return (
        <div className="flex flex-col h-72 items-center justify-center tess-card gap-3">
          <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
          <p className="text-xs font-medium text-gray-500">Coletando telemetria das marcas atendidas no Instagram...</p>
        </div>
      );
    }

    const period = productivityData?.period || 'Novembro 2026';
    const clients = productivityData?.clients || [];
    const topPosts = productivityData?.topPosts || [];
    const insights = productivityData?.insights || {};

    return (
      <div className="flex flex-col gap-4 pb-8 animate-in fade-in duration-200">
        
        {/* 1. BARRA SUPERIOR DO RELATÓRIO MENSAL */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl bg-white/80 backdrop-blur-md border border-[var(--color-atelier-grafite)]/10 shadow-2xs">
          {/* IDENTIFICAÇÃO E SUB-TABS */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              <div>
                <h3 className="text-xs font-bold text-[var(--color-atelier-grafite)] uppercase tracking-wider">
                  Relatório do Studio
                </h3>
                <span className="text-[10px] text-gray-400 font-medium">
                  {period} • {clients.length} Marcas Monitoradas
                </span>
              </div>
            </div>

            {/* SELETOR DE MODO DO RELATÓRIO */}
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-gray-100/80 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setProductivityViewMode('feed')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  productivityViewMode === 'feed'
                    ? 'bg-white text-[var(--color-atelier-grafite)] shadow-2xs font-extrabold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Layers size={12} />
                <span>Mural de Criações ({filteredProductivityPosts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setProductivityViewMode('insights')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  productivityViewMode === 'insights'
                    ? 'bg-white text-[var(--color-atelier-grafite)] shadow-2xs font-extrabold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Sparkles size={12} />
                <span>Insights & Destaques</span>
              </button>

              <button
                type="button"
                onClick={() => setProductivityViewMode('marcas')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  productivityViewMode === 'marcas'
                    ? 'bg-white text-[var(--color-atelier-grafite)] shadow-2xs font-extrabold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Instagram size={12} />
                <span>Marcas Atendidas ({clients.length})</span>
              </button>
            </div>
          </div>

          {/* FILTROS E AÇÃO APIFY */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* FILTRO DE CLIENTE */}
            <div className="relative">
              <select
                value={selectedProductivityClient}
                onChange={(e) => setSelectedProductivityClient(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)] cursor-pointer"
              >
                <option value="all">Todas as Marcas ({clients.length})</option>
                {clients.map((c: any) => (
                  <option key={c.username} value={c.username}>
                    @{c.username} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ORDENADOR */}
            {productivityViewMode === 'feed' && (
              <div className="relative">
                <select
                  value={productivitySort}
                  onChange={(e: any) => setProductivitySort(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)] cursor-pointer"
                >
                  <option value="engagement">Mais Engajados</option>
                  <option value="recent">Mais Recentes</option>
                  <option value="likes">Mais Curtidos</option>
                  <option value="views">Mais Views</option>
                </select>
              </div>
            )}

            {/* BOTÃO SINCRONIZAR APIFY */}
            <button
              type="button"
              onClick={syncApifyLive}
              disabled={isSyncingProductivity}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-atelier-terracota)] text-white hover:opacity-90 text-xs font-medium shadow-2xs transition"
              title="Disparar scraper ao vivo no Apify"
            >
              <RefreshCw size={12} className={isSyncingProductivity ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{isSyncingProductivity ? 'Coletando...' : 'Sincronizar Apify'}</span>
            </button>
          </div>
        </div>

        {/* 2. CONTEÚDO BASEADO NA SUB-TAB DO RELATÓRIO */}

        {/* 2.1 MURAL DE CRIAÇÕES (FEED CONSOLIDADO) */}
        {productivityViewMode === 'feed' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>Exibindo <strong>{filteredProductivityPosts.length}</strong> publicações produzidas este mês</span>
              <span className="text-[11px] text-gray-400">Ordenado por {productivitySort === 'engagement' ? 'Engajamento' : productivitySort === 'recent' ? 'Data Recente' : productivitySort === 'likes' ? 'Curtidas' : 'Visualizações'}</span>
            </div>

            {filteredProductivityPosts.length === 0 ? (
              <div className="text-center p-12 tess-card text-gray-400 text-xs">
                Nenhum post encontrado para este cliente. Dispare a sincronização via Apify para carregar.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredProductivityPosts.map((post: any) => (
                  <div 
                    key={post.id}
                    className="group bg-white rounded-2xl border border-[var(--color-atelier-grafite)]/10 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* IMAGEM COM OVERLAY E BADGES */}
                    <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
                      <img 
                        src={post.imageUrl} 
                        alt={post.caption}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e: any) => {
                          e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      
                      {/* BADGE DE CLIENTE & FORMATO */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 z-10">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold">
                          <span className="truncate max-w-[120px]">@{post.clientUsername}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          post.type === 'reel' 
                            ? 'bg-rose-500/90 text-white backdrop-blur-md' 
                            : 'bg-indigo-500/90 text-white backdrop-blur-md'
                        }`}>
                          {post.type === 'reel' ? 'Reel' : 'Carrossel'}
                        </span>
                      </div>

                      {/* STATS OVERLAY INFERIOR */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-6 text-white flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 font-semibold">
                          <span className="flex items-center gap-1" title="Curtidas">
                            <Heart size={13} className="text-rose-400 fill-rose-400" />
                            {post.likes}
                          </span>
                          <span className="flex items-center gap-1" title="Comentários">
                            <MessageSquare size={13} className="text-white/80" />
                            {post.comments}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded backdrop-blur-xs">
                          {post.views ? `${(post.views / 1000).toFixed(1)}k views` : 'Em alta'}
                        </span>
                      </div>
                    </div>

                    {/* CORPO DO CARD (COPY E DATA) */}
                    <div className="p-3.5 flex flex-col justify-between flex-1 gap-2.5">
                      <p className="text-xs text-[var(--color-atelier-grafite)] font-medium line-clamp-3 leading-relaxed">
                        {post.caption}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-400">
                        <span>{new Date(post.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                        <a 
                          href={post.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[var(--color-atelier-terracota)] font-semibold hover:underline"
                        >
                          <span>Ver post</span>
                          <ArrowUpRight size={12} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2.2 INSIGHTS & DESTAQUES */}
        {productivityViewMode === 'insights' && (
          <div className="space-y-6">
            {/* TOP 3 POSTS DO MÊS */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Flame size={16} className="text-orange-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]">
                  Hall da Fama • Top 3 Posts Mais Engajados do Mês
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topPosts.map((post: any, idx: number) => (
                  <div key={post.id} className="p-4 rounded-2xl bg-white border border-orange-200/60 shadow-xs flex flex-col justify-between gap-3 relative overflow-hidden">
                    <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-orange-100 text-orange-800 font-black text-sm flex items-end justify-start pl-2.5 pb-1">
                      #{idx + 1}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={post.imageUrl} 
                        alt="Thumbnail" 
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-200"
                        onError={(e: any) => {
                          e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-orange-700 block">
                          @{post.clientUsername}
                        </span>
                        <h5 className="text-xs font-bold text-[var(--color-atelier-grafite)] truncate">
                          {post.caption.slice(0, 40)}...
                        </h5>
                        <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-gray-500">
                          <span>❤️ {post.likes}</span>
                          <span>💬 {post.comments}</span>
                          <span>👀 {(post.views / 1000).toFixed(1)}k</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11.5px] text-gray-600 line-clamp-2 leading-relaxed bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      &quot;{post.caption}&quot;
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* QUADRANTES ESTRATÉGICOS DO STUDIO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Formato Mais Eficiente</span>
                <p className="text-sm font-bold text-[var(--color-atelier-grafite)] mt-2">
                  {insights.melhorFormato}
                </p>
                <span className="text-[10.5px] text-gray-500 mt-1">Gera até 3.4x mais views orgânicas</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ritmo de Publicação</span>
                <p className="text-sm font-bold text-[var(--color-atelier-grafite)] mt-2">
                  {insights.frequenciaPublicacao}
                </p>
                <span className="text-[10.5px] text-gray-500 mt-1">Cadência constante entre todas as marcas</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tração Consolidada</span>
                <p className="text-sm font-bold text-emerald-800 mt-2">
                  {insights.taxaCrescimento}
                </p>
                <span className="text-[10.5px] text-gray-500 mt-1">Crescimento de base líquida de seguidores</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Diretriz do Próximo Mês</span>
                <p className="text-xs font-semibold text-[var(--color-atelier-grafite)] mt-2 leading-relaxed">
                  {insights.diretrizProximoMes}
                </p>
                <span className="text-[10.5px] text-[var(--color-atelier-terracota)] mt-1 font-bold">Foco Estratégico</span>
              </div>
            </div>
          </div>
        )}

        {/* 2.3 MARCAS ATENDIDAS */}
        {productivityViewMode === 'marcas' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>{clients.length} perfis gerenciados ativamente pelo Studio Veronna</span>
              <span className="text-[11px] text-gray-400">Telemetria de audiência e produção mensal</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {clients.map((c: any) => (
                <div 
                  key={c.username}
                  className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 shrink-0">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt={c.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        ) : (
                          <Instagram size={20} className="text-[var(--color-atelier-terracota)]" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-sm font-bold text-[var(--color-atelier-grafite)] truncate">
                          {c.name}
                        </h5>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-gray-100 text-gray-600">
                          {c.company}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        @{c.username}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <span className="text-sm font-bold text-[var(--color-atelier-grafite)] block tabular-nums">
                        {(c.followersCount || 1000).toLocaleString('pt-BR')}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600">
                        +{(c.followerDelta || 180)} este mês
                      </span>
                    </div>

                    <a 
                      href={`https://instagram.com/${c.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[var(--color-atelier-terracota)] hover:bg-white transition"
                      title="Abrir perfil no Instagram"
                    >
                      <ArrowUpRight size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden animate-in fade-in duration-300">
      
      {/* =========================================================================
          COCKPIT FIXO SUPERIOR (INTEGRADO, SEM RETÂNGULO BRANCO)
          ========================================================================= */}
      <div className="shrink-0 space-y-3 pt-2 pb-2 z-30">
        
        {/* 1. CABEÇALHO COM TÍTULO E AÇÕES (SEM LIVE OPS) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="font-elegant text-3xl sm:text-4xl text-[var(--color-atelier-grafite)] tracking-tight">
              QG da <span className="text-[var(--color-atelier-terracota)] italic">Liziane.</span>
            </h1>
            <p className="text-xs text-[var(--color-atelier-grafite)]/70 mt-0.5 max-w-2xl">
              Gestão unificada de propostas, orçamentos, briefings, NPS e diagnósticos estratégicos do Studio Veronna.
            </p>
          </div>

          {/* TOOLBAR EXECUTIVA DIREITA */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* BOTÃO LINKS RÁPIDOS */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFormsExpanded(!isFormsExpanded)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-medium transition-all shadow-2xs ${
                  isFormsExpanded
                    ? "bg-[var(--color-atelier-grafite)] text-white border-[var(--color-atelier-grafite)] shadow-md"
                    : "bg-white/80 backdrop-blur-md text-[var(--color-atelier-grafite)] border-[var(--color-atelier-grafite)]/15 hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)]"
                }`}
              >
                <span>Links de Formulários</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isFormsExpanded ? "bg-[var(--color-atelier-terracota)] text-white" : "bg-gray-100 text-gray-700"
                }`}>
                  10
                </span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isFormsExpanded ? "rotate-180" : ""}`} />
              </button>

              {/* DROPDOWN FLUTUANTE DE FORMULÁRIOS */}
              {isFormsExpanded && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFormsExpanded(false)} />
                  <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] max-w-[90vw] bg-white rounded-3xl border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-50 p-2 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50 rounded-2xl mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)] block">
                        Atalhos para Captação
                      </span>
                      <span className="text-[10.5px] text-gray-400">
                        Envie para novos clientes ou prospects no WhatsApp.
                      </span>
                    </div>
                    <div className="max-h-[65vh] overflow-y-auto custom-scrollbar flex flex-col divide-y divide-gray-100 p-1">
                      {ATELIER_FORMS_CATEGORIES.map(category => (
                        <div key={category.category} className="py-2 first:pt-1 last:pb-1">
                          <div className="px-3 py-1 text-[9.5px] font-bold uppercase tracking-wider text-gray-400">
                            {category.category}
                          </div>
                          <div className="flex flex-col mt-1 gap-1">
                            {category.items.map(item => {
                              const isCopied = copiedUrl === item.url;
                              return (
                                <div key={item.url} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                                  <span className="text-[12px] font-medium text-[var(--color-atelier-grafite)] truncate" title={item.title}>
                                    {item.title}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyLink(item.url)}
                                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[var(--color-atelier-terracota)] hover:bg-gray-100 transition-colors"
                                      title="Copiar link"
                                    >
                                      {isCopied ? <Check size={14} className="text-emerald-600 stroke-[2.5]" /> : <Copy size={13} />}
                                    </button>
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[var(--color-atelier-terracota)] hover:bg-gray-100 transition-colors"
                                      title="Abrir formulário"
                                    >
                                      <ExternalLink size={13} />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* BOTÃO NOVA REUNIÃO */}
            <button
              type="button"
              onClick={() => {
                setMeetingForm({ leadId: "", title: "", date: "", notes: "" });
                setIsMeetingModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[var(--color-atelier-terracota)] text-white hover:opacity-90 transition-all text-xs font-medium shadow-2xs"
            >
              <Calendar size={14} />
              <span>Nova Reunião</span>
            </button>

            {/* SEPARADOR SUTIL */}
            <div className="h-5 w-[1px] bg-gray-200 hidden sm:block mx-0.5" />

            {/* BOTÃO 1: PENETRAÇÃO DO NEGÓCIO (APENAS ÍCONE) */}
            <button
              type="button"
              onClick={() => setActivePerspective(prev => prev === 'penetracao' ? null : 'penetracao')}
              className={`w-8 h-8 flex items-center justify-center rounded-2xl border text-xs transition-all shadow-2xs hover:scale-105 shrink-0 relative ${
                activePerspective === 'penetracao'
                  ? 'bg-[var(--color-atelier-grafite)] text-white border-[var(--color-atelier-grafite)] shadow-sm'
                  : 'bg-white/80 hover:bg-white text-[var(--color-atelier-grafite)] border-[var(--color-atelier-grafite)]/15 hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)]'
              }`}
              title={activePerspective === 'penetracao' ? 'Penetração do Negócio (Ativo — clique para ocultar)' : 'Penetração do Negócio'}
            >
              <TrendingUp size={13} className={activePerspective === 'penetracao' ? 'text-amber-300' : ''} />
              {activePerspective === 'penetracao' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-white" />
              )}
            </button>

            {/* BOTÃO 2: PRODUTIVIDADE DO STUDIO (APENAS ÍCONE) */}
            <button
              type="button"
              onClick={() => {
                setActivePerspective(prev => prev === 'produtividade' ? null : 'produtividade');
                if (activePerspective !== 'produtividade') {
                  fetchProductivityData(false);
                }
              }}
              className={`w-8 h-8 flex items-center justify-center rounded-2xl border text-xs transition-all shadow-2xs hover:scale-105 shrink-0 relative ${
                activePerspective === 'produtividade'
                  ? 'bg-gradient-to-r from-orange-600 to-[var(--color-atelier-terracota)] text-white border-transparent shadow-sm'
                  : 'bg-white/80 hover:bg-white text-[var(--color-atelier-grafite)] border-[var(--color-atelier-grafite)]/15 hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)]'
              }`}
              title={activePerspective === 'produtividade' ? 'Produtividade do Studio (Ativo — clique para voltar)' : 'Produtividade do Studio'}
            >
              <Sparkles size={13} className={activePerspective === 'produtividade' ? 'text-amber-200' : 'text-orange-500'} />
              {activePerspective === 'produtividade' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-white" />
              )}
            </button>

            {/* ATUALIZAR (APENAS ÍCONE) */}
            <button
              type="button"
              onClick={() => {
                if (activePerspective === 'produtividade') {
                  fetchProductivityData(true);
                } else {
                  fetchDashboardData();
                }
              }}
              disabled={isLoading || isSyncingProductivity}
              className="w-8 h-8 flex items-center justify-center rounded-2xl border border-[var(--color-atelier-grafite)]/15 bg-white/80 hover:bg-white text-xs text-[var(--color-atelier-grafite)] transition-all shadow-2xs hover:scale-105 shrink-0"
              title="Atualizar dados"
            >
              <RefreshCw size={13} className={(isLoading || isSyncingProductivity) ? "animate-spin text-[var(--color-atelier-terracota)]" : ""} />
            </button>
          </div>
        </div>

        {/* 2. TELEMETRIA E KPIS (CONDICIONAL AO MODO ATIVO - TOTALMENTE OCULTO SE NENHUM SELECIONADO) */}
        {activePerspective === 'penetracao' && (
          <div className="space-y-2 animate-in fade-in duration-200">
            {/* 2. TELEMETRIA EDITORIAL INTEGRADA (PIPELINE CONTÍNUO, SEM BOXES) */}
            <div className="flex items-center justify-between gap-3 sm:gap-6 py-2 px-1 border-y border-[var(--color-atelier-grafite)]/10 overflow-x-auto custom-scrollbar">
              {/* ETAPA 1: TRIAGEM */}
              <button
                type="button"
                onClick={() => { setActiveTab('consultoria'); setFilterStatus('all'); }}
                className="flex items-center gap-2.5 shrink-0 group text-left cursor-pointer transition-transform hover:-translate-y-0.5"
                title="Filtrar Consultorias & Leads"
              >
                <span className="text-2xl sm:text-3xl font-elegant font-bold text-[var(--color-atelier-grafite)] tabular-nums group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                  {metrics.totalLeads}
                </span>
                <div className="flex flex-col">
                  <span className="text-[9.5px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-[var(--color-atelier-grafite)]">Triagem</span>
                  <span className="text-[11px] font-medium text-[var(--color-atelier-grafite)]/70">Leads de Entrada</span>
                </div>
              </button>

              <span className="text-gray-300 font-light select-none hidden sm:inline">/</span>

              {/* ETAPA 2: ORÇAMENTOS */}
              <button
                type="button"
                onClick={() => { setActiveTab('orcamentos'); setFilterStatus('all'); }}
                className="flex items-center gap-2.5 shrink-0 group text-left cursor-pointer transition-transform hover:-translate-y-0.5"
                title="Filtrar Orçamentos"
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-elegant font-bold text-orange-950 tabular-nums group-hover:text-orange-600 transition-colors">
                    {metrics.totalOrcamentos}
                  </span>
                  {metrics.unreadOrcamentos > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black uppercase bg-orange-500 text-white animate-pulse">
                      +{metrics.unreadOrcamentos}
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-widest text-orange-900">Orçamentos</span>
                    <span className="text-[9.5px] font-bold text-orange-700 bg-orange-100/70 px-1 rounded">
                      {metrics.taxaConversaoOrcamento}% conv.
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-gray-500">Propostas Geradas</span>
                </div>
              </button>

              <span className="text-gray-300 font-light select-none hidden sm:inline">/</span>

              {/* ETAPA 3: FECHAMENTOS REAIS (BRIEFING OK) */}
              <button
                type="button"
                onClick={() => { setActiveTab('orcamentos'); setFilterStatus('clients'); }}
                className="flex items-center gap-2.5 shrink-0 group text-left cursor-pointer transition-transform hover:-translate-y-0.5"
                title="Filtrar Fechamentos Reais (Clientes com Briefing)"
              >
                <span className="text-2xl sm:text-3xl font-elegant font-bold text-emerald-950 tabular-nums group-hover:text-emerald-600 transition-colors">
                  {metrics.fechamentosReais}
                </span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-widest text-emerald-900">Fechamentos Reais</span>
                    <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100/70 px-1 rounded">
                      {metrics.taxaConversaoReal}% taxa
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-800/80">Validados via Briefing</span>
                </div>
              </button>

              <span className="text-gray-300 font-light select-none hidden sm:inline">/</span>

              {/* ETAPA 4: BRIEFINGS & IMERSÃO */}
              <button
                type="button"
                onClick={() => { setActiveTab('briefings'); setFilterStatus('all'); }}
                className="flex items-center gap-2.5 shrink-0 group text-left cursor-pointer transition-transform hover:-translate-y-0.5"
                title="Filtrar Briefings & Imersão"
              >
                <span className="text-2xl sm:text-3xl font-elegant font-bold text-[var(--color-atelier-grafite)] tabular-nums group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                  {metrics.totalBriefings}
                </span>
                <div className="flex flex-col">
                  <span className="text-[9.5px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-[var(--color-atelier-grafite)]">Briefings</span>
                  <span className="text-[11px] font-medium text-[var(--color-atelier-grafite)]/70">Dossiês Preenchidos</span>
                </div>
              </button>

              <span className="text-gray-300 font-light select-none hidden sm:inline">/</span>

              {/* ETAPA 5: PESQUISAS & NPS */}
              <button
                type="button"
                onClick={() => { setActiveTab('pesquisas'); setFilterStatus('all'); }}
                className="flex items-center gap-2.5 shrink-0 group text-left cursor-pointer transition-transform hover:-translate-y-0.5"
                title="Filtrar Pesquisas & NPS"
              >
                <span className="text-2xl sm:text-3xl font-elegant font-bold text-amber-950 tabular-nums group-hover:text-amber-600 transition-colors">
                  {metrics.totalPesquisas}
                </span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-widest text-amber-900">Pesquisas & NPS</span>
                    <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100/70 px-1 rounded">
                      NPS 100%
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-gray-500">{metrics.totalMapas} Raio-X Instagram</span>
                </div>
              </button>
            </div>

            {/* 3. GARGALO COMPACTO & DISCRETO (LINHA DE STATUS PURA, SEM BOX) */}
            <div className="flex items-center justify-between text-[11.5px] text-gray-500 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  metrics.gargaloSeverity === 'healthy' ? 'bg-emerald-500' : metrics.gargaloSeverity === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
                }`} />
                <span className="font-semibold text-gray-700 shrink-0">
                  {metrics.gargalo}:
                </span>
                <span className="truncate text-gray-500 font-normal">
                  {metrics.recomendacao}
                </span>
              </div>
              {metrics.unreadOrcamentos > 0 && (
                <button
                  onClick={() => {
                    setActiveTab('orcamentos');
                    setFilterStatus('unread');
                  }}
                  className="text-[10.5px] font-bold text-orange-600 hover:text-orange-700 hover:underline shrink-0 ml-2"
                >
                  Ver {metrics.unreadOrcamentos} Novos
                </button>
              )}
            </div>
          </div>
        )}

        {/* TELEMETRIA DE PRODUTIVIDADE DO STUDIO (INSTAGRAM CONSOLIDADO) */}
        {activePerspective === 'produtividade' && (
          <div className="space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-3 sm:gap-6 py-2 px-1 border-y border-[var(--color-atelier-grafite)]/10 overflow-x-auto custom-scrollbar">
              {/* ETAPA 1: POSTS PRODUZIDOS */}
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-2xl sm:text-3xl font-elegant font-bold text-[var(--color-atelier-grafite)] tabular-nums">
                  {productivityData?.totalPostsMonth || 0}
                </span>
                <div className="flex flex-col">
                  <span className="text-[9.5px] font-bold uppercase tracking-widest text-gray-400">Produção Mensal</span>
                  <span className="text-[11px] font-medium text-[var(--color-atelier-grafite)]/70">Posts Publicados</span>
                </div>
              </div>

              <span className="text-gray-300 font-light select-none hidden sm:inline">/</span>

              {/* ETAPA 2: ALCANCE TOTAL VIEWS */}
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-2xl sm:text-3xl font-elegant font-bold text-orange-950 tabular-nums">
                  {productivityData?.totalViewsMonth ? `${(productivityData.totalViewsMonth / 1000).toFixed(1)}k` : '0k'}
                </span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-widest text-orange-900">Alcance Consolidado</span>
                    <span className="text-[9.5px] font-bold text-orange-700 bg-orange-100/70 px-1 rounded">
                      Views
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-gray-500">Impressões em Clientes</span>
                </div>
              </div>

              <span className="text-gray-300 font-light select-none hidden sm:inline">/</span>

              {/* ETAPA 3: CURTIDAS & INTERAÇÕES */}
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-2xl sm:text-3xl font-elegant font-bold text-emerald-950 tabular-nums">
                  {productivityData?.totalLikesMonth ? `${productivityData.totalLikesMonth.toLocaleString('pt-BR')}` : '0'}
                </span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-widest text-emerald-900">Interações Totais</span>
                    <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100/70 px-1 rounded">
                      +{productivityData?.totalCommentsMonth || 0} coments
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-800/80">Curtidas Geradas</span>
                </div>
              </div>

              <span className="text-gray-300 font-light select-none hidden sm:inline">/</span>

              {/* ETAPA 4: ENGAJAMENTO MÉDIO */}
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-2xl sm:text-3xl font-elegant font-bold text-purple-950 tabular-nums">
                  {productivityData?.avgEngagementRate ? `${productivityData.avgEngagementRate}%` : '0%'}
                </span>
                <div className="flex flex-col">
                  <span className="text-[9.5px] font-bold uppercase tracking-widest text-purple-900">Engajamento Médio</span>
                  <span className="text-[11px] font-medium text-purple-800/80">Média Geral das Marcas</span>
                </div>
              </div>

              <span className="text-gray-300 font-light select-none hidden sm:inline">/</span>

              {/* ETAPA 5: NOVOS SEGUIDORES */}
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-2xl sm:text-3xl font-elegant font-bold text-amber-950 tabular-nums">
                  +{productivityData?.totalFollowersDelta ? `${productivityData.totalFollowersDelta.toLocaleString('pt-BR')}` : '0'}
                </span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-widest text-amber-900">Novos Seguidores</span>
                    <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100/70 px-1 rounded">
                      {productivityData?.monitoredClientsCount || 0} Marcas
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-gray-500">Crescimento Líquido</span>
                </div>
              </div>
            </div>

            {/* LINHA DE STATUS DO STUDIO */}
            <div className="flex items-center justify-between text-[11.5px] text-gray-500 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-gray-700 shrink-0">
                  Produção Studio Veronna:
                </span>
                <span className="truncate text-gray-500 font-normal">
                  {productivityData?.insights?.melhorFormato || 'Reels e carrosséis com alta taxa de retenção nas contas dos clientes.'}
                </span>
              </div>
              <button
                onClick={() => syncApifyLive()}
                disabled={isSyncingProductivity}
                className="text-[10.5px] font-bold text-[var(--color-atelier-terracota)] hover:underline shrink-0 ml-2 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles size={11} className={isSyncingProductivity ? 'animate-spin' : ''} />
                {isSyncingProductivity ? 'Coletando via Apify...' : 'Sincronizar Apify Agora'}
              </button>
            </div>
          </div>
        )}

        {/* 4. BARRA DE NAVEGAÇÃO SUPERIOR EM SEGMENTED PILLS + BUSCA + DROPDOWN FLUTUANTE DE FILTRO (SOME NA PRODUTIVIDADE) */}
        {activePerspective !== 'produtividade' && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1">
          {/* SEGMENTED TABS COM CONTAGEM */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/80 backdrop-blur-md border border-[var(--color-atelier-grafite)]/10 overflow-x-auto custom-scrollbar shrink-0">
            <button
              onClick={() => { setActiveTab('geral'); setFilterStatus('all'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'geral' 
                  ? 'bg-[var(--color-atelier-terracota)] text-white shadow-sm' 
                  : 'text-gray-500 hover:text-[var(--color-atelier-grafite)] hover:bg-white/60'
              }`}
            >
              <LayoutDashboard size={13} />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => { setActiveTab('orcamentos'); setFilterStatus('all'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-1.5 shrink-0 relative ${
                activeTab === 'orcamentos' 
                  ? 'bg-[var(--color-atelier-terracota)] text-white shadow-sm' 
                  : 'text-gray-500 hover:text-[var(--color-atelier-grafite)] hover:bg-white/60'
              }`}
            >
              <FileSignature size={13} />
              <span>Orçamentos</span>
              <span className="text-[10px] opacity-75 tabular-nums">({metrics.totalOrcamentos})</span>
              {metrics.unreadOrcamentos > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[8.5px] font-black ${
                  activeTab === 'orcamentos' ? 'bg-orange-400 text-white' : 'bg-orange-500 text-white'
                }`}>
                  {metrics.unreadOrcamentos}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('consultoria'); setFilterStatus('all'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'consultoria' 
                  ? 'bg-[var(--color-atelier-terracota)] text-white shadow-sm' 
                  : 'text-gray-500 hover:text-[var(--color-atelier-grafite)] hover:bg-white/60'
              }`}
            >
              <Users size={13} />
              <span>Consultorias</span>
              <span className="text-[10px] opacity-75 tabular-nums">({metrics.totalLeads})</span>
            </button>

            <button
              onClick={() => { setActiveTab('briefings'); setFilterStatus('all'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'briefings' 
                  ? 'bg-[var(--color-atelier-terracota)] text-white shadow-sm' 
                  : 'text-gray-500 hover:text-[var(--color-atelier-grafite)] hover:bg-white/60'
              }`}
            >
              <Briefcase size={13} />
              <span>Briefings</span>
              <span className="text-[10px] opacity-75 tabular-nums">({metrics.totalBriefings})</span>
            </button>

            <button
              onClick={() => { setActiveTab('pesquisas'); setFilterStatus('all'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'pesquisas' 
                  ? 'bg-[var(--color-atelier-terracota)] text-white shadow-sm' 
                  : 'text-gray-500 hover:text-[var(--color-atelier-grafite)] hover:bg-white/60'
              }`}
            >
              <Star size={13} />
              <span>Pesquisas & NPS</span>
              <span className="text-[10px] opacity-75 tabular-nums">({metrics.totalPesquisas})</span>
            </button>

            <button
              onClick={() => { setActiveTab('mapa'); setFilterStatus('all'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'mapa' 
                  ? 'bg-[var(--color-atelier-grafite)] text-white shadow-sm' 
                  : 'text-gray-500 hover:text-[var(--color-atelier-grafite)] hover:bg-white/60'
              }`}
            >
              <Compass size={13} />
              <span>Raio-X</span>
              <span className="text-[10px] opacity-75 tabular-nums">({metrics.totalMapas})</span>
            </button>
          </div>

          {/* CAMPO DE BUSCA + MENU FLUTUANTE DE FILTRO EXPANSÍVEL */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* INPUT DE BUSCA */}
            <div className="relative flex-1 md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail, nicho..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-2xl bg-white/80 border border-[var(--color-atelier-grafite)]/15 text-xs text-[var(--color-atelier-grafite)] placeholder-gray-400 outline-none focus:border-[var(--color-atelier-terracota)] transition"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* MENU FLUTUANTE DE FILTRO EXPANSÍVEL */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-medium transition-all shadow-2xs ${
                  filterStatus !== 'all'
                    ? "bg-[var(--color-atelier-terracota)] text-white border-[var(--color-atelier-terracota)] shadow-xs"
                    : "bg-white/90 text-gray-700 border-gray-200 hover:border-gray-300"
                }`}
              >
                <Filter size={13} />
                <span>
                  {filterStatus === 'all' && 'Filtrar'}
                  {filterStatus === 'unread' && 'Não lidos'}
                  {filterStatus === 'clients' && 'Clientes'}
                  {filterStatus === 'idv' && 'IDV'}
                  {filterStatus === 'insta' && 'Instagram'}
                </span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${isFilterDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isFilterDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl border border-gray-100 shadow-[0_12px_36px_rgba(0,0,0,0.12)] p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={() => { setFilterStatus('all'); setIsFilterDropdownOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition ${
                        filterStatus === 'all' ? 'bg-gray-100 text-[var(--color-atelier-grafite)] font-bold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>Todos</span>
                      {filterStatus === 'all' && <Check size={13} className="text-[var(--color-atelier-terracota)]" />}
                    </button>
                    <button
                      onClick={() => { setFilterStatus('unread'); setIsFilterDropdownOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition ${
                        filterStatus === 'unread' ? 'bg-orange-50 text-orange-900 font-bold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>Não lidos</span>
                      {filterStatus === 'unread' && <Check size={13} className="text-orange-600" />}
                    </button>
                    <button
                      onClick={() => { setFilterStatus('clients'); setIsFilterDropdownOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition ${
                        filterStatus === 'clients' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>Clientes (Fechados)</span>
                      {filterStatus === 'clients' && <Check size={13} className="text-emerald-600" />}
                    </button>
                    <button
                      onClick={() => { setFilterStatus('idv'); setIsFilterDropdownOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition ${
                        filterStatus === 'idv' ? 'bg-blue-50 text-blue-900 font-bold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>IDV</span>
                      {filterStatus === 'idv' && <Check size={13} className="text-blue-600" />}
                    </button>
                    <button
                      onClick={() => { setFilterStatus('insta'); setIsFilterDropdownOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition ${
                        filterStatus === 'insta' ? 'bg-amber-50 text-amber-900 font-bold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>Instagram</span>
                      {filterStatus === 'insta' && <Check size={13} className="text-amber-600" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      </div>

      {/* =========================================================================
          ÁREA COM ROLAGEM DINÂMICA (SCROLLABLE CONTENT AREA)
          ========================================================================= */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-4 pr-1">
        {isLoading ? (
          <div className="flex h-56 items-center justify-center tess-card">
            <Loader2 size={28} className="animate-spin text-[var(--color-atelier-terracota)]" />
          </div>
        ) : activePerspective === 'produtividade' ? (
          <motion.div
            key="productivity-report-screen"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            {renderStudioProductivityReport()}
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {/* VISÃO GERAL */}
            {activeTab === 'geral' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2.5">
                {filteredItems.length === 0 ? (
                  <div className="text-center p-12 tess-card text-gray-400 font-medium text-xs">
                    Nenhum registro encontrado para os filtros selecionados.
                  </div>
                ) : (
                  filteredItems.map((item: any) => {
                    if (item._viewType === 'consultoria') return renderConsultoriaCard(item.data);
                    if (item._viewType === 'formulario') return renderFormularioCard(item.data);
                    if (item._viewType === 'briefing') return renderBriefingCard(item.data);
                    if (item._viewType === 'pesquisa') return renderPesquisaCard(item.data);
                    if (item._viewType === 'mapa') return renderMapaCard(item.data);
                    return null;
                  })
                )}
              </motion.div>
            )}

            {/* ORÇAMENTOS */}
            {activeTab === 'orcamentos' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2.5">
                {filteredItems.length === 0 ? (
                  <div className="text-center p-12 tess-card text-gray-400 font-medium text-xs">
                    Nenhum orçamento recebido.
                  </div>
                ) : (
                  filteredItems.map((form: any) => renderFormularioCard(form))
                )}
              </motion.div>
            )}

            {/* CONSULTORIAS */}
            {activeTab === 'consultoria' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2.5">
                {filteredItems.length === 0 ? (
                  <div className="text-center p-12 tess-card text-gray-400 font-medium text-xs">
                    Nenhuma triagem de consultoria recebida.
                  </div>
                ) : (
                  filteredItems.map((lead: any) => renderConsultoriaCard(lead))
                )}
              </motion.div>
            )}

            {/* BRIEFINGS */}
            {activeTab === 'briefings' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2.5">
                {filteredItems.length === 0 ? (
                  <div className="text-center p-12 tess-card text-gray-400 font-medium text-xs">
                    Nenhum briefing recebido.
                  </div>
                ) : (
                  filteredItems.map((brief: any) => renderBriefingCard(brief))
                )}
              </motion.div>
            )}

            {/* PESQUISAS & NPS (MODERNIZADO) */}
            {activeTab === 'pesquisas' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {renderPesquisasModernView()}
              </motion.div>
            )}

            {/* RAIO-X (MAPA) */}
            {activeTab === 'mapa' && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2.5">
                {filteredItems.length === 0 ? (
                  <div className="text-center p-12 tess-card text-gray-400 font-medium text-xs">
                    Nenhum diagnóstico de Raio-X encontrado.
                  </div>
                ) : (
                  filteredItems.map((m: any) => renderMapaCard(m))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* =========================================================================
          MODAL DE INSPEÇÃO EXECUTIVA (DETALHES DO PROSPECT / FORMULÁRIO)
          ========================================================================= */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-6 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedItem(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 16 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.96, y: 16 }} 
              transition={{ type: 'spring', damping: 26, stiffness: 320 }} 
              className="w-full max-w-5xl max-h-[92vh] bg-white rounded-3xl relative z-10 shadow-2xl flex flex-col overflow-hidden border border-gray-100"
            >
              {/* HEADER DO MODAL */}
              <header className="p-5 sm:p-6 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                      {selectedItem.type === 'formulario' ? selectedItem.data.tipo : selectedItem.type === 'consultoria' ? 'Ficha de Consultoria & Triagem' : selectedItem.type === 'pesquisa' ? (selectedItem.data.pesquisa_type === 'INSTA' ? 'Pesquisa: Gestão Instagram' : 'Pesquisa: Identidade Visual') : selectedItem.type === 'mapa' ? 'Raio-X de Instagram' : 'Dossiê de Briefing'}
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--color-atelier-terracota)] uppercase tracking-widest block mt-0.5">
                    {selectedItem.data.nome_cliente || selectedItem.data.dados_completos?.Nome || selectedItem.data.nome || selectedItem.data.Nome || selectedItem.data.nome_marca || selectedItem.data.answers?.Nome_Cliente || 'Formulário Submetido'}
                    {selectedItem.data.created_at && (
                      <span className="text-gray-400 font-mono ml-2 font-normal">
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
                      className="h-8 px-3 rounded-full bg-[var(--color-atelier-terracota)] text-white hover:opacity-90 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-2xs"
                    >
                      {isGeneratingPDF ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      Exportar PDF
                    </button>
                  )}
                  {(selectedItem.type === 'briefing' || selectedItem.type === 'insta_briefing') && (
                    <button 
                      onClick={() => handleDownloadBriefingPDF(selectedItem)} 
                      disabled={isGeneratingPDF}
                      className="h-8 px-3 rounded-full bg-[var(--color-atelier-terracota)] text-white hover:opacity-90 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-2xs"
                    >
                      {isGeneratingPDF ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      Exportar PDF
                    </button>
                  )}
                  {selectedItem.type === 'mapa' && (
                    <button 
                      onClick={() => handleDownloadMapaPDF(selectedItem.data)} 
                      disabled={isGeneratingPDF}
                      className="h-8 px-3 rounded-full bg-[var(--color-atelier-grafite)] text-white hover:opacity-90 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-2xs"
                    >
                      {isGeneratingPDF ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      Exportar PDF
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedItem(null)} 
                    className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </header>

              {/* CORPO DO MODAL */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 flex flex-col gap-6 bg-[#FAFAFA]">
                {selectedItem.type === 'formulario' ? (
                  // MAPEAR DADOS DO FORMULÁRIO COM HIGHLIGHTS E LABELS HUMANIZADAS
                  <div className="flex flex-col gap-5">
                    {(() => {
                      const dados = selectedItem.data.dados_completos || {};
                      const invest = dados.Investimento || dados.investimento;
                      const vaga = dados.Ciente_Vaga || dados.ciente_vaga;
                      const posts = dados.Quantidade_Posts || dados.quantidade_posts;
                      const porte = dados.Porte_Empresa || dados.porte_empresa;
                      const clientName = dados.Nome || dados.nome || selectedItem.data.Nome || 'Cliente';
                      const clientPhone = dados.WhatsApp || dados.whatsapp || selectedItem.data.WhatsApp;
                      const clientEmail = dados.Email || dados.email || selectedItem.data.Email;
                      const waUrl = getWhatsAppUrl(clientPhone, clientName);
                      
                      const ignoredFormKeys = new Set([
                        'id', 'created_at', 'updated_at', 'lido', 'notificado', 
                        'table_name', 'tipo', '__savedat', '_draft_id', '__currentstep'
                      ]);

                      return (
                        <>
                          {/* PAINEL DE CONTATO RÁPIDO DO LEAD */}
                          <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-elegant text-xl flex items-center justify-center font-bold">
                                {clientName.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-[14px] text-[var(--color-atelier-grafite)] block">{clientName}</span>
                                <span className="text-[11px] text-gray-400 font-mono">
                                  {clientEmail || 'E-mail não informado'} {clientPhone ? ` • ${clientPhone}` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:bg-emerald-700 transition"
                                >
                                  <MessageCircle size={13} /> WhatsApp
                                </a>
                              )}
                              <button
                                onClick={() => copyToClipboard(`Nome: ${clientName}\nEmail: ${clientEmail || '-'}\nWhatsApp: ${clientPhone || '-'}\nInvestimento: ${invest || '-'}\nTipo: ${selectedItem.data.tipo}`, "Ficha do lead copiada!")}
                                className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold flex items-center gap-1.5 transition"
                              >
                                <Copy size={13} /> Copiar Ficha
                              </button>
                            </div>
                          </div>

                          {/* HIGHLIGHTS STRIP */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {invest && (
                              <div className="p-3.5 bg-amber-500/10 border border-amber-300/40 rounded-2xl flex flex-col">
                                <span className="text-[9.5px] font-bold uppercase tracking-widest text-amber-900">Investimento Estimado</span>
                                <span className="text-[13px] font-bold text-amber-950 mt-1">{invest}</span>
                              </div>
                            )}
                            {vaga && (
                              <div className="p-3.5 bg-emerald-500/10 border border-emerald-300/40 rounded-2xl flex flex-col">
                                <span className="text-[9.5px] font-bold uppercase tracking-widest text-emerald-900">Ciente da Vaga</span>
                                <span className="text-[13px] font-bold text-emerald-950 mt-1">{vaga}</span>
                              </div>
                            )}
                            {posts && (
                              <div className="p-3.5 bg-blue-500/10 border border-blue-300/40 rounded-2xl flex flex-col">
                                <span className="text-[9.5px] font-bold uppercase tracking-widest text-blue-900">Frequência Mensal</span>
                                <span className="text-[13px] font-bold text-blue-950 mt-1">{posts} posts</span>
                              </div>
                            )}
                            {porte && (
                              <div className="p-3.5 bg-purple-500/10 border border-purple-300/40 rounded-2xl flex flex-col">
                                <span className="text-[9.5px] font-bold uppercase tracking-widest text-purple-900">Porte / Perfil</span>
                                <span className="text-[13px] font-bold text-purple-950 mt-1 truncate" title={porte}>{porte}</span>
                              </div>
                            )}
                          </div>

                          {/* CAMPOS DETALHADOS COM LABELS HUMANIZADAS */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(dados).map(([key, value]) => {
                              if (!value || ignoredFormKeys.has(key.toLowerCase())) return null;
                              const displayVal = Array.isArray(value) ? value.join(', ') : String(value);
                              if (displayVal.trim() === '') return null;
                              const label = FORM_LABELS[key] || FORM_LABELS[key.toLowerCase()] || key.replace(/_/g, ' ');
                              return <DataField key={key} label={label} value={displayVal} />;
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : selectedItem.type === 'consultoria' ? (
                  // MAPEAR CONSULTORIA DO PAINEL MAKE/REST / BANCO UNIFICADO
                  <div className="flex flex-col gap-4">
                     <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="font-bold text-[15px] text-[var(--color-atelier-grafite)] block">{selectedItem.data.nome}</span>
                          <span className="text-[11px] text-gray-500 font-mono">
                            {selectedItem.data.email} • {selectedItem.data.telefone}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getWhatsAppUrl(selectedItem.data.telefone, selectedItem.data.nome) && (
                            <a
                              href={getWhatsAppUrl(selectedItem.data.telefone, selectedItem.data.nome)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:bg-emerald-700 transition"
                            >
                              <MessageCircle size={13} /> Chamar no WhatsApp
                            </a>
                          )}
                          <button
                            onClick={() => handleOpenMeetingForLead(selectedItem.data.id, selectedItem.data.nome)}
                            className="px-3 py-1.5 rounded-xl bg-[var(--color-atelier-terracota)] text-white text-xs font-bold flex items-center gap-1.5 transition"
                          >
                            <Calendar size={13} /> Agendar Reunião
                          </button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       <DataField label="Nome do Prospect" value={selectedItem.data.nome} />
                       <DataField label="Melhor E-mail" value={selectedItem.data.email} />
                       <DataField label="WhatsApp" value={selectedItem.data.telefone} />
                       <DataField label="Instagram Informado" value={selectedItem.data.instagram} />
                       <DataField label="Nicho / Nome da Marca" value={selectedItem.data.nicho} />
                       <DataField label="Função na Empresa" value={selectedItem.data.funcao_empresa} />
                       <DataField label="Tempo de Mercado / Marca" value={selectedItem.data.tempo_marca} />
                       <DataField label="Como Conheceu o Atelier" value={selectedItem.data.como_conheceu} />
                     </div>

                     <div className="h-px bg-gray-200 my-1"></div>

                     <div className="flex flex-col gap-3">
                       <DataField label="Objetivos da Marca (Próximos 6 meses)" value={selectedItem.data.market_positioning} />
                       <DataField label="Diferencial de Mercado" value={selectedItem.data.strategic_justification} />
                       <DataField label="Público Atual" value={selectedItem.data.publico_atual} />
                       <DataField label="Público Desejado" value={selectedItem.data.publico_desejado} />
                       <DataField label="Personalidade da Marca (Se fosse uma pessoa)" value={selectedItem.data.ai_stories_strategy} />
                       <DataField label="Marcas / Referências Inspiracionais" value={selectedItem.data.ai_tone_of_voice} />
                       <DataField label="Como a Consultoria pode Ajudar?" value={selectedItem.data.ai_visual_diagnosis} />
                       <DataField label="Possui Logotipo Atual?" value={selectedItem.data.link_logo_atual} />
                       <DataField label="Descrição da Identidade Atual" value={selectedItem.data.descricao_identidade_atual} />
                       <DataField label="Considerações Finais" value={selectedItem.data.ai_brand_archetype} />
                     </div>
                  </div>
                ) : selectedItem.type === 'pesquisa' ? (
                  // MAPEAR PESQUISA DE SATISFAÇÃO (IDV OU INSTAGRAM)
                  <div className="flex flex-col gap-4">
                     <div className="p-4 bg-amber-500/10 border border-amber-300/40 rounded-2xl flex items-center justify-between">
                       <div>
                         <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-amber-900 block">
                           Chance de Indicar o Studio Veronna (NPS)
                         </span>
                         <span className="text-[12px] text-amber-800 font-medium">
                           {selectedItem.data.nome_cliente || 'Cliente'} • {selectedItem.data.email || ''}
                         </span>
                       </div>
                       <span className="font-elegant text-3xl font-bold text-amber-950 px-4 py-1.5 bg-white rounded-2xl shadow-2xs border border-amber-200">
                         {selectedItem.data.chance_indicar || 'N/A'}/10
                       </span>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       <DataField label="Nome do Cliente" value={selectedItem.data.nome_cliente} />
                       <DataField label="WhatsApp" value={selectedItem.data.whatsapp} />
                       <DataField label="E-mail" value={selectedItem.data.email} />
                       <DataField label="Autorizou uso como Depoimento?" value={selectedItem.data.autoriza_depoimento} />
                     </div>

                     <div className="h-px bg-gray-200 my-1"></div>

                     {selectedItem.data.pesquisa_type === 'IDV' ? (
                       <div className="flex flex-col gap-3">
                         <DataField label="Satisfação com o Resultado" value={selectedItem.data.satisfacao_resultado} />
                         <DataField label="A Nova Identidade Representa Melhor a Marca?" value={selectedItem.data.representa_melhor} />
                         <DataField label="Como a Marca Passou a ser Percebida?" value={selectedItem.data.percepcao_marca} />
                       </div>
                     ) : (
                       <div className="flex flex-col gap-3">
                         <DataField label="Satisfação com o Gerenciamento" value={selectedItem.data.satisfacao_gerenciamento} />
                         <DataField label="O Instagram Melhorou?" value={selectedItem.data.instagram_melhorou} />
                         <DataField label="O que Mais Melhorou?" value={selectedItem.data.o_que_melhorou} />
                       </div>
                     )}

                     <DataField label="Relato / Depoimento do Cliente" value={selectedItem.data.relato} />
                  </div>
                ) : selectedItem.type === 'mapa' ? (
                  // MAPEAR O MAPA RAIO X
                  <div className="flex flex-col gap-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       <DataField label="Nome do Cliente" value={selectedItem.data.nome_cliente || selectedItem.data.nome || selectedItem.data.Nome || selectedItem.data.nome_marca} />
                       <DataField label="WhatsApp" value={selectedItem.data.whatsapp || selectedItem.data.WhatsApp} />
                       <DataField label="E-mail" value={selectedItem.data.email || selectedItem.data.Email} />
                       <DataField label="Instagram" value={selectedItem.data.instagram || selectedItem.data.Instagram} />
                     </div>

                     <div className="flex flex-wrap gap-2 my-2">
                       <span className="px-3 py-1.5 bg-amber-50 text-amber-900 rounded-xl text-[11px] font-bold border border-amber-200">
                         Score Geral: {selectedItem.data.score_geral || selectedItem.data.Score_Geral || selectedItem.data.dados_completos?.Score_Geral}
                       </span>
                       <span className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-xl text-[11px] font-bold border border-gray-200">
                         Clareza: {selectedItem.data.score_clareza || selectedItem.data.dados_completos?.Score_Clareza}
                       </span>
                       <span className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-xl text-[11px] font-bold border border-gray-200">
                         Autoridade: {selectedItem.data.score_autoridade || selectedItem.data.dados_completos?.Score_Autoridade}
                       </span>
                       <span className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-xl text-[11px] font-bold border border-gray-200">
                         Percepção: {selectedItem.data.score_percepcao || selectedItem.data.dados_completos?.Score_Percepcao}
                       </span>
                       <span className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-xl text-[11px] font-bold border border-gray-200">
                         Conversão: {selectedItem.data.score_conversao || selectedItem.data.dados_completos?.Score_Conversao}
                       </span>
                     </div>

                     <DataField label="Dimensão Gargalo Identificada" value={selectedItem.data.dimensao_gargalo || selectedItem.data.dados_completos?.Dimensao_Gargalo} />
                     <div className="h-px bg-gray-200 my-1"></div>
                     
                     <div className="flex flex-col gap-3">
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
                  </div>
                ) : selectedItem.type === 'insta_briefing' ? (
                  // MAPEAR DOSSIÊ DE INSTAGRAM
                  <div className="flex flex-col gap-4">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                       <DataField label="Nome do Cliente" value={selectedItem.data.answers?.nome || selectedItem.data.profiles?.nome} />
                       <DataField label="WhatsApp" value={selectedItem.data.answers?.whatsapp} />
                       <DataField label="E-mail" value={selectedItem.data.answers?.email} />
                     </div>
                     <div className="h-px bg-gray-200 my-1"></div>
                     <div className="flex flex-col gap-3">
                       <DataField label="Produto Âncora" value={selectedItem.data.answers?.produto_ancora} />
                       <DataField label="Cliente Ideal (20/80)" value={selectedItem.data.answers?.cliente_ideal} />
                       <DataField label="Gatilho de Compra" value={selectedItem.data.answers?.gatilho_compra === 'Outro' ? selectedItem.data.answers?.gatilho_compra_outro : selectedItem.data.answers?.gatilho_compra} />
                       <DataField label="Inimigo Comum" value={selectedItem.data.answers?.inimigo_comum} />
                       <DataField label="Padrão de Excelência" value={selectedItem.data.answers?.padrao_excelencia} />
                       <DataField label="Persona da Marca" value={selectedItem.data.answers?.persona_marca} />
                       <DataField label="Estado do Arsenal (Visual)" value={selectedItem.data.answers?.arsenal_visual} />
                       <DataField label="Ponto de Chegada (Endgame)" value={selectedItem.data.answers?.ponto_chegada} />
                     </div>
                  </div>
                ) : (
                   // MAPEAR BRIEFING DE IDENTIDADE VISUAL COM SEÇÕES CATEGORIZADAS
                   <div className="flex flex-col gap-6">
                      {(() => {
                        const rawAnswers = selectedItem.data.answers || {};
                        const normalized = normalizeBriefingAnswers(rawAnswers);
                        const answerMap = new Map();
                        normalized.forEach(item => {
                          answerMap.set(item.key.toLowerCase(), item);
                        });

                        const renderedLowerKeys = new Set();

                        const renderSection = (category: any) => {
                          const categoryItems: any[] = [];
                          for (const k of category.keys) {
                            const found = answerMap.get(k.toLowerCase());
                            if (found && !renderedLowerKeys.has(k.toLowerCase())) {
                              categoryItems.push({ key: k, label: found.label, value: found.value });
                              renderedLowerKeys.add(k.toLowerCase());
                            }
                          }

                          if (categoryItems.length === 0) return null;

                          return (
                            <div key={category.id} className="flex flex-col gap-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
                              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                <h4 className="font-bold text-[12px] uppercase tracking-wider text-[var(--color-atelier-terracota)]">
                                  {category.title}
                                </h4>
                              </div>

                              {category.isEixos ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {categoryItems.map(item => {
                                    const score = parseInt(String(item.value), 10);
                                    const isValidScore = !isNaN(score) && score >= 1 && score <= 5;
                                    return (
                                      <div key={item.key} className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex flex-col gap-2">
                                        <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                                          {item.label}
                                        </span>
                                        {isValidScore ? (
                                          <div className="flex flex-col gap-1 mt-1">
                                            <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                                              <span>1 (Mínimo)</span>
                                              <span className="text-[var(--color-atelier-terracota)] font-black text-[12px]">Nível {score}/5</span>
                                              <span>5 (Máximo)</span>
                                            </div>
                                            <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden flex">
                                              <div 
                                                className="bg-[var(--color-atelier-terracota)] h-full rounded-full transition-all"
                                                style={{ width: `${(score / 5) * 100}%` }}
                                              />
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-sm font-medium text-[var(--color-atelier-grafite)]">{String(item.value)}</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-3">
                                  {categoryItems.map(item => (
                                    <DataField key={item.key} label={item.label} value={item.value} />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        };

                        const sections = BRIEFING_CATEGORIES.map(cat => renderSection(cat)).filter(Boolean);

                        const remainingItems: any[] = [];
                        normalized.forEach(item => {
                          if (!renderedLowerKeys.has(item.key.toLowerCase())) {
                            remainingItems.push(item);
                          }
                        });

                        return (
                          <>
                            {/* HERO RESUMO DE CONTATO */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[var(--color-atelier-terracota)]/5 p-4 rounded-2xl border border-[var(--color-atelier-terracota)]/15">
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block">Marca</span>
                                <span className="text-[13px] font-bold text-[var(--color-atelier-grafite)]">
                                  {rawAnswers.Nome_Marca || rawAnswers.nome_marca || rawAnswers.Nome_Logotipo || selectedItem.data.profiles?.empresa || 'Não informado'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block">WhatsApp</span>
                                <span className="text-[13px] font-bold text-[var(--color-atelier-grafite)]">
                                  {rawAnswers.WhatsApp || rawAnswers.whatsapp || 'Não informado'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block">E-mail</span>
                                <span className="text-[13px] font-bold text-[var(--color-atelier-grafite)] truncate block" title={rawAnswers.Email || rawAnswers.email}>
                                  {rawAnswers.Email || rawAnswers.email || selectedItem.data.profiles?.email || 'Não informado'}
                                </span>
                              </div>
                            </div>

                            {/* SEÇÕES CATEGORIZADAS */}
                            {sections}

                            {/* CAMPOS ADICIONAIS RESTANTES */}
                            {remainingItems.length > 0 && (
                              <div className="flex flex-col gap-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
                                <h4 className="font-bold text-[12px] uppercase tracking-wider text-[var(--color-atelier-terracota)] pb-2 border-b border-gray-100">
                                  Outras Informações Coletadas
                                </h4>
                                {remainingItems.map(item => (
                                  <DataField key={item.key} label={item.label} value={item.value} />
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                   </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL: AGENDAMENTO EXPRESSO DE REUNIÃO
          ========================================================================= */}
      <AnimatePresence>
        {isMeetingModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMeetingModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95 }} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl relative z-10 w-full max-w-md border border-gray-100 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Agendar Reunião</h3>
                  <p className="text-[11px] text-gray-400">Alinhamento comercial com prospect de triagem.</p>
                </div>
                <button onClick={() => setIsMeetingModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleScheduleMeeting} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Prospect / Lead *</label>
                  <select 
                    required 
                    value={meetingForm.leadId} 
                    onChange={(e) => setMeetingForm({...meetingForm, leadId: e.target.value})} 
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]"
                  >
                    <option value="" disabled>Selecionar Pessoa da Triagem...</option>
                    {consultorias.map(c => (
                      <option key={c.id} value={c.id}>{c.nome} ({c.nicho || c.instagram || c.email})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Título / Pauta da Reunião *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: Alinhamento de Posicionamento & Proposta" 
                    value={meetingForm.title} 
                    onChange={(e) => setMeetingForm({...meetingForm, title: e.target.value})} 
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-[13px] font-medium outline-none focus:border-[var(--color-atelier-terracota)]" 
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Data e Horário *</label>
                  <input 
                    type="datetime-local" 
                    required 
                    value={meetingForm.date} 
                    onChange={(e) => setMeetingForm({...meetingForm, date: e.target.value})} 
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-[13px] font-medium outline-none focus:border-[var(--color-atelier-terracota)]" 
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Observações / Link do Google Meet</label>
                  <textarea 
                    placeholder="Link da chamada de vídeo ou notas de preparação..." 
                    value={meetingForm.notes} 
                    onChange={(e) => setMeetingForm({...meetingForm, notes: e.target.value})} 
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-[13px] font-medium outline-none focus:border-[var(--color-atelier-terracota)] h-20 resize-none" 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isProcessing} 
                  className="w-full bg-[var(--color-atelier-terracota)] text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-md flex items-center justify-center gap-2 mt-2 hover:opacity-90 transition"
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                  Confirmar Agendamento
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Subcomponente de amostragem de dados profundos
function DataField({ label, value }: { label: string, value: any }) {
  if (!value) return null;
  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-2xs flex flex-col gap-1 transition-colors hover:border-[var(--color-atelier-terracota)]/20">
      <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
        {label}
      </span>
      <p className="font-roboto text-[13.5px] text-[var(--color-atelier-grafite)] font-medium leading-relaxed whitespace-pre-wrap">
        {value.toString()}
      </p>
    </div>
  );
}
