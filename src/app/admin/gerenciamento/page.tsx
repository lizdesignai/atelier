// src/app/admin/gerenciamento/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { 
  Camera, CheckCircle2, Clock, Send, UploadCloud, 
  BrainCircuit, LayoutDashboard, Target, MapPin, 
  Loader2, Activity, Trash2, ChevronDown, Smartphone, 
  Download, CalendarDays, Eye, MessageSquare, Sparkles, X, FileText
} from "lucide-react";
import InstagramBriefingModal from "../../../components/InstagramBriefingModal";
import { pdf } from '@react-pdf/renderer';
import InstagramBriefingPDF from "../../../components/pdf/InstagramBriefingPDF";
import BrandbookPDF from "../../../components/pdf/BrandbookPDF";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// Dicionários para traduzir as escolhas do cliente no Admin
const SEMIOTICS_MAP: Record<string, { A: string, B: string }> = {
  lighting: { A: "Luz Natural (Acolhedor)", B: "Luz Dura & Sombras (Cinemático)" },
  framing: { A: "Macro/Detalhe (Intimista)", B: "Plano Aberto (Operacional)" },
  presence: { A: "Movimento Real (Cândido)", B: "Retrato Posado (Autoridade)" },
  temperature: { A: "Tons Quentes (Tradição)", B: "Tons Frios (Hiper-modernidade)" },
  composition: { A: "Caos Criativo (Assimétrico)", B: "Rigor Técnico (Simetria)" },
  setting: { A: "Urbano/Rua (Vivência)", B: "Interior Polido (Isolamento/Luxo)" },
  post_prod: { A: "Granulação/Analógico (Verdade)", B: "Nitidez 4K (Sofisticação)" },
  negative_space: { A: "Informação Densa (Complexidade)", B: "Espaço Vazio (Minimalismo)" }
};

const VOICE_MAP: Record<string, string> = {
  A: "Oculto/Educativo",
  B: "Estrategista Frio/Soberano",
  C: "Implacável/Agressivo"
};

// ============================================================================
// COMPONENTE INTERNO: O WORKSPACE DE INSTAGRAM ADMIN
// ============================================================================
export function InstagramWorkspace({ activeProjectId, currentProject }: { activeProjectId: string, currentProject: any }) {
  const [activeTab, setActiveTab] = useState<'planeamento' | 'posts' | 'briefing_inicial' | 'briefing' | 'agente'>('planeamento');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [posts, setPosts] = useState<any[]>([]);
  const [pins, setPins] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<any>(null); // Briefing Inicial
  
  // Novos Estados
  const [monthlyPlan, setMonthlyPlan] = useState<any[]>([]);
  const [labData, setLabData] = useState<any>(null);

  // Formulários: Planeamento Mensal
  const [newPlanDate, setNewPlanDate] = useState("");
  const [newPlanPillar, setNewPlanPillar] = useState("Autoridade Técnica");
  const [newPlanHook, setNewPlanHook] = useState("");
  const [newPlanBrief, setNewPlanBrief] = useState("");

  // Formulários: Curadoria Visual
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(""); 
  const [newPostCaption, setNewPostCaption] = useState("");

  // Estados: Agente IA
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (activeProjectId && currentProject) fetchInstagramData();
  }, [activeProjectId, currentProject]);

  // Se o utilizador selecionar uma ideia aprovada para criar a arte, preenchemos o texto
  useEffect(() => {
    if (selectedPlanId) {
      const selectedPlan = monthlyPlan.find(p => p.id === selectedPlanId);
      if (selectedPlan) {
        setNewPostCaption(`**${selectedPlan.hook}**\n\n${selectedPlan.briefing}`);
      }
    } else {
      setNewPostCaption("");
    }
  }, [selectedPlanId, monthlyPlan]);

  const fetchInstagramData = async () => {
    setIsLoading(true);
    try {
      if (!activeProjectId) return;

      // 1. Busca Artes Visuais (Foco direto no project_id para evitar crashs de "undefined")
      const { data: postsData, error: postsError } = await supabase
        .from('social_posts')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false });
        
      if (postsError) console.error("Erro ao carregar posts:", postsError);
      if (postsData) setPosts(postsData);

      const postIds = postsData?.map(p => p.id) || [];
      if (postIds.length > 0) {
        const { data: pinsData } = await supabase.from('content_feedback_pins').select('*').in('post_id', postIds);
        if (pinsData) setPins(pinsData);
      }

      // 2. Busca do Briefing Inicial (Cascata: Primeiro por Projeto, depois por Cliente)
      let foundBriefing = null;
      
      const { data: briefByProj } = await supabase
        .from('instagram_briefings')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      foundBriefing = briefByProj;

      if (!foundBriefing && currentProject?.client_id) {
        const { data: briefByClient } = await supabase
          .from('instagram_briefings')
          .select('*')
          .eq('client_id', currentProject.client_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        foundBriefing = briefByClient;
      }

      setBriefing(foundBriefing);

      // 3. Dados do Laboratório e Planeamento Mensal
      const { data: lab } = await supabase.from('brandbook_laboratory').select('*').eq('project_id', activeProjectId).maybeSingle();
      if (lab) setLabData(lab);

      const { data: plans } = await supabase.from('content_planning').select('*').eq('project_id', activeProjectId).order('publish_date', { ascending: true });
      if (plans) setMonthlyPlan(plans);

    } catch (error) {
      console.error("Erro ao carregar dados do Instagram:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // MOTOR 1: PLANEAMENTO ESTRATÉGICO MENSAL
  // ==========================================
  const handleCreatePlan = async () => {
    if (!newPlanHook || !newPlanBrief || !activeProjectId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('content_planning').insert({
        project_id: activeProjectId,
        client_id: currentProject.client_id,
        publish_date: newPlanDate ? new Date(newPlanDate).toISOString() : null,
        pillar: newPlanPillar,
        hook: newPlanHook,
        briefing: newPlanBrief,
        status: 'pending'
      });
      if (error) throw error;
      
      showToast("Estratégia enviada para validação do cliente!");
      setNewPlanDate(""); setNewPlanHook(""); setNewPlanBrief(""); setNewPlanPillar("Autoridade Técnica");
      fetchInstagramData();
    } catch (error) {
      showToast("Erro ao criar planeamento.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm("Apagar esta estratégia?")) return;
    try {
      await supabase.from('content_planning').delete().eq('id', id);
      setMonthlyPlan(monthlyPlan.filter(p => p.id !== id));
      showToast("Estratégia removida.");
    } catch (error) {
      showToast("Erro ao apagar.");
    }
  };

  // ==========================================
  // MOTOR 2: CURADORIA DE POSTS (VISUAL)
  // ==========================================
  const handleCreatePost = async () => {
    if (!newPostImage || !activeProjectId || !currentProject) {
      showToast("Selecione uma imagem e garanta que há um cliente ativo.");
      return;
    }
    setIsProcessing(true);
    try {
      const fileExt = newPostImage.name.split('.').pop();
      const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${currentProject.client_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('moodboard').upload(filePath, newPostImage, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('moodboard').getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('social_posts').insert({
        project_id: activeProjectId,
        client_id: currentProject.client_id,
        image_url: publicUrlData.publicUrl,
        caption: newPostCaption,
        status: 'pending_approval' // Garante que cai na fila de espera
      });

      if (dbError) throw dbError;

      if (selectedPlanId) {
        await supabase.from('content_planning').update({ status: 'completed' }).eq('id', selectedPlanId);
      }

      showToast("Arte gráfica enviada para a mesa do cliente!");
      setNewPostImage(null); setNewPostCaption(""); setSelectedPlanId("");
      fetchInstagramData(); // Atualiza a tela instantaneamente
    } catch (error) {
      console.error(error);
      showToast("Erro ao criar post visual. Verifique as permissões de Bucket.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm("Apagar arte do fluxo?")) return;
    try {
      await supabase.from('social_posts').delete().eq('id', id);
      setPosts(posts.filter(p => p.id !== id));
      showToast("Arte Removida.");
    } catch (error) {}
  };

  // ==========================================
  // GERAR PDFS (Briefing & Brandbook)
  // ==========================================
  const handleDownloadBriefingPDF = async () => {
    if (!briefing) return;
    showToast("A forjar PDF do Briefing...");
    try {
      const doc = <InstagramBriefingPDF data={briefing} clientName={currentProject.profiles?.nome} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `Briefing_${currentProject.profiles?.nome}.pdf`;
      link.click();
    } catch (error) {
      showToast("Erro ao gerar PDF.");
    }
  };

  const handleDownloadBrandbookPDF = async () => {
    if (!labData) return;
    showToast("A forjar Dossiê PDF Vetorial...");
    try {
      const tiltObj = { 
        technical: labData.tilt_technical || 0, 
        culture: labData.tilt_culture || 0, 
        lifestyle: labData.tilt_status || 0, 
        community: labData.tilt_community || 0 
      };
      
      const doc = <BrandbookPDF clientName={currentProject.profiles?.nome} tilt={tiltObj as any} semiotics={labData.semiotics_choices} voice={labData.voice_scenarios} synapses={labData.synapses_vault} aiInsight={labData.ai_source_code} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `Manual_Operacoes_${currentProject.profiles?.nome}.pdf`;
      link.click();
    } catch (error) {
      showToast("Erro ao gerar PDF do Brandbook.");
    }
  };

  // ==========================================
  // MOTOR 4: CÓDIGO FONTE (CMO IA)
  // ==========================================
  const handleGenerateSourceCode = async () => {
    if (!labData) { showToast("O cliente ainda não preencheu o Laboratório."); return; }
    setIsProcessing(true);
    try {
      const res = await fetch('/api/insights/brandbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientName: currentProject.profiles.nome, 
          tilt: { technical: labData.tilt_technical, culture: labData.tilt_culture, status: labData.tilt_status, community: labData.tilt_community }, 
          semiotics: labData.semiotics_choices, 
          voice: labData.voice_scenarios, 
          synapses: labData.synapses_vault 
        })
      });
      const data = await res.json();
      if (data.error) throw new Error();
      
      await supabase.from('brandbook_laboratory').update({ ai_source_code: data.insight }).eq('id', labData.id);
      await supabase.from('projects').update({ instagram_ai_insight: data.insight }).eq('id', activeProjectId);
      
      showToast("Código-Fonte CMO Gerado! ✨");
      fetchInstagramData();
    } catch (e) { 
      showToast("Erro ao processar a IA."); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  // ==========================================
  // MOTOR 5: AGENTE IA (GERADOR DE CONTEÚDO)
  // ==========================================
  const handleGenerateContent = async () => {
    setIsGenerating(true);
    showToast("A conectar ao Agente IA...");
    try {
      const res = await fetch('/api/insights/content-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, labData, clientName: currentProject.profiles?.nome })
      });
      
      if (res.ok) {
        const data = await res.json();
        setAiResponse(data.insight || data.content || "Conteúdo gerado.");
      } else {
        setTimeout(() => {
          const tom = labData?.voice_scenarios?.price ? VOICE_MAP[labData.voice_scenarios.price] : "Profissional e Elegante";
          setAiResponse(`**Gancho Estratégico (Hook):**\n"Descubra o segredo por trás do nosso padrão de excelência."\n\n**Copywriting (Baseado no Tom de Voz: ${tom}):**\n${aiPrompt}\n\nA nossa equipa não foca apenas na estética, mas no rigor de cada entrega.\n\n**Chamada para Ação (CTA):**\nClique no link da bio para reservar o seu momento connosco.`);
          setIsGenerating(false);
          showToast("Conteúdo forjado com sucesso!");
        }, 1500);
      }
    } catch (e) {
      showToast("Erro na ligação ao Agente.");
      setIsGenerating(false);
    }
  };

  const approvedPlans = monthlyPlan.filter(plan => plan.status === 'approved');
  // Filtro abrangente de posts visuais da curadoria (Exclui apenas o que foi rejeitado por completo)
  const visiblePosts = posts.filter(p => ['pending', 'pending_approval', 'needs_revision', 'approved'].includes(p.status));

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <div className="flex flex-col gap-6 w-full animate-[fadeInUp_0.5s_ease-out] flex-1 min-h-0">
      
      {/* NAVEGAÇÃO INTERNA DO ADMIN */}
      <div className="glass-panel bg-white/70 p-2 rounded-2xl flex gap-2 overflow-x-auto custom-scrollbar shrink-0 border border-white shadow-sm">
        {[
          { id: 'planeamento', label: 'Estratégia Mensal', icon: <CalendarDays size={16} /> },
          { id: 'agente', label: 'Agente IA (Copiloto)', icon: <BrainCircuit size={16} /> },
          { id: 'posts', label: 'Fluxo de Arte Visual', icon: <LayoutDashboard size={16} /> },
          { id: 'briefing_inicial', label: 'Briefing Inicial', icon: <FileText size={16} /> },
          { id: 'briefing', label: 'DNA da Marca (Lab)', icon: <Target size={16} /> },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap
              ${activeTab === tab.id ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white hover:text-[var(--color-atelier-terracota)]'}
            `}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ÁREA DE CONTEÚDO */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          
          {/* =======================================
              ABA 1: ESTRATÉGIA MENSAL (Hooks & Copy)
              ======================================= */}
          {activeTab === 'planeamento' && (
            <motion.div key="plan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col md:flex-row gap-6 h-full min-h-0">
              
              <div className="w-full md:w-1/3 glass-panel bg-white/80 p-8 rounded-[2rem] flex flex-col gap-5 shadow-sm h-fit border border-white shrink-0 overflow-y-auto custom-scrollbar max-h-full">
                <div className="border-b border-[var(--color-atelier-grafite)]/5 pb-4 mb-2 shrink-0">
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Novo Planeamento</h3>
                  <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1">Enviar ideia para validação</p>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Data Sugerida</span>
                  <input type="date" value={newPlanDate} onChange={(e) => setNewPlanDate(e.target.value)} className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm" />
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Pilar de Conteúdo</span>
                  <select value={newPlanPillar} onChange={(e) => setNewPlanPillar(e.target.value)} className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm">
                    <option>Autoridade Técnica</option>
                    <option>Cultura e Bastidores</option>
                    <option>Status e Lifestyle</option>
                    <option>Comunidade e Pertencimento</option>
                    <option>Promocional / Venda Direta</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">O Gancho (Hook / Título)</span>
                  <input type="text" placeholder="Ex: 3 erros que custam o seu lucro..." value={newPlanHook} onChange={(e) => setNewPlanHook(e.target.value)} className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm" />
                </div>

                <div className="flex flex-col gap-1 flex-1 shrink-0">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Briefing / Copywriting</span>
                  <textarea placeholder="Descreva o contexto do post e a copy completa..." value={newPlanBrief} onChange={(e) => setNewPlanBrief(e.target.value)} className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] resize-none h-32 md:h-full min-h-[120px] outline-none focus:border-[var(--color-atelier-terracota)]/50 custom-scrollbar shadow-sm" />
                </div>

                <button onClick={handleCreatePlan} disabled={isProcessing || !newPlanHook || !newPlanBrief} className="w-full bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 shadow-md shrink-0">
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar ao Cliente
                </button>
              </div>

              <div className="w-full md:w-2/3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 pb-4">
                {monthlyPlan.filter(p => p.status !== 'completed').map(plan => (
                  <div key={plan.id} className="glass-panel bg-white/70 p-6 rounded-[2rem] border border-white shadow-sm relative group shrink-0">
                    <button onClick={() => handleDeletePlan(plan.id)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-2 rounded-full shadow-md z-10"><Trash2 size={14}/></button>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="pr-12">
                        <span className="inline-block px-3 py-1 bg-[var(--color-atelier-creme)]/80 text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20 rounded-lg text-[9px] font-bold uppercase tracking-widest mb-2">
                          {plan.publish_date ? new Date(plan.publish_date).toLocaleDateString('pt-PT') : 'Sem data'} • {plan.pillar}
                        </span>
                        <h4 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">"{plan.hook}"</h4>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest shrink-0 border
                        ${plan.status === 'approved' ? 'bg-green-50 border-green-200 text-green-600' : plan.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-orange-50 border-orange-200 text-orange-600'}
                      `}>
                        {plan.status === 'approved' ? 'Arte Pendente' : plan.status === 'rejected' ? 'Ajuste Solicitado' : 'Aguardando Cliente'}
                      </div>
                    </div>

                    <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/80 leading-relaxed mb-4 bg-white/50 p-4 rounded-xl border border-white">
                      {plan.briefing}
                    </p>

                    {plan.status === 'rejected' && plan.feedback && (
                      <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 mt-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1 block">Ajuste Solicitado pelo Cliente:</span>
                        <p className="text-[12px] text-red-700 italic">{plan.feedback}</p>
                      </div>
                    )}

                    {plan.status === 'approved' && (
                      <div className="mt-4 border-t border-[var(--color-atelier-grafite)]/10 pt-4 flex justify-end">
                        <button onClick={() => { setActiveTab('posts'); setSelectedPlanId(plan.id); }} className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] hover:text-[#8c562e] transition-colors flex items-center gap-1.5">
                          <UploadCloud size={14} /> Ir para Submissão de Arte Gráfica
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {monthlyPlan.filter(p => p.status !== 'completed').length === 0 && (
                  <div className="glass-panel bg-white/40 border border-white p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center h-[300px] shadow-sm shrink-0">
                    <CalendarDays size={48} className="text-[var(--color-atelier-terracota)]/30 mb-4" />
                    <p className="font-elegant text-3xl text-[var(--color-atelier-grafite)]/50">Sem Pendências</p>
                    <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/40 mt-2">Crie mais estratégias mensais para aprovação.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* =======================================
              ABA 2: AGENTE IA (CRIADOR DE CONTEÚDO)
              ======================================= */}
          {activeTab === 'agente' && (
            <motion.div key="agente" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col md:flex-row gap-6 h-full min-h-0">
              
              <div className="w-full md:w-1/3 glass-panel bg-white/80 p-8 rounded-[2rem] flex flex-col gap-5 shadow-sm h-full shrink-0 border border-white">
                 <div className="border-b border-[var(--color-atelier-grafite)]/5 pb-4 mb-2">
                   <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><Sparkles className="text-[var(--color-atelier-terracota)]"/> Copiloto IA</h3>
                   <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1">Criação guiada pelo DNA da Marca</p>
                 </div>
                 
                 <p className="text-[12px] text-[var(--color-atelier-grafite)]/70 leading-relaxed">
                   O Agente lerá o Brandbook do cliente (Tom de Voz, Fichas de Foco) para gerar copies precisas. Descreva a intenção do post abaixo.
                 </p>
                 
                 <div className="flex-1 flex flex-col min-h-0">
                   <textarea
                     placeholder="Ex: Quero um post para sexta-feira sobre os bastidores da nossa operação logística..."
                     value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                     className="w-full flex-1 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] resize-none outline-none focus:border-[var(--color-atelier-terracota)]/50 custom-scrollbar shadow-inner"
                   />
                 </div>

                 <button onClick={handleGenerateContent} disabled={isGenerating || !aiPrompt} className="w-full bg-gradient-to-r from-[var(--color-atelier-grafite)] to-gray-800 hover:to-[var(--color-atelier-terracota)] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 shadow-md shrink-0">
                   {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />} Gerar Conteúdo
                 </button>
              </div>

              <div className="w-full md:w-2/3 glass-panel bg-white/60 p-8 rounded-[2.5rem] border border-white shadow-sm flex flex-col h-full min-h-0">
                 {aiResponse ? (
                   <div className="flex flex-col h-full min-h-0">
                     <div className="flex justify-between items-center mb-6 border-b border-[var(--color-atelier-grafite)]/10 pb-4 shrink-0">
                       <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Resultado Gerado</h3>
                       <button onClick={() => {
                          setNewPlanBrief(aiResponse);
                          setNewPlanHook("Ideia IA: " + aiPrompt.substring(0, 25) + "...");
                          setActiveTab('planeamento');
                       }} className="px-5 py-2.5 bg-[var(--color-atelier-terracota)] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#8c562e] transition-colors shadow-sm flex items-center gap-2">
                         <Send size={14}/> Enviar para Planeamento
                       </button>
                     </div>
                     <div className="overflow-y-auto custom-scrollbar pr-2 flex-1 text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed whitespace-pre-wrap font-medium bg-white/50 p-6 rounded-2xl border border-white shadow-inner">
                       {aiResponse}
                     </div>
                   </div>
                 ) : (
                   <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                     <BrainCircuit size={64} className="mb-6 text-[var(--color-atelier-terracota)]" />
                     <p className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Aguardando Instruções</p>
                     <p className="font-roboto text-sm max-w-sm text-center mt-2 text-[var(--color-atelier-grafite)]/70">A sua inteligência artificial está pronta para forjar conteúdos alinhados com o Código-Fonte do cliente.</p>
                   </div>
                 )}
              </div>
            </motion.div>
          )}

          {/* =======================================
              ABA 3: FLUXO DE ARTE VISUAL
              ======================================= */}
          {activeTab === 'posts' && (
            <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col md:flex-row gap-6 h-full min-h-0">
              
              <div className="w-full md:w-1/3 glass-panel bg-white/80 p-8 rounded-[2rem] flex flex-col gap-5 shadow-sm h-fit shrink-0 border border-white overflow-y-auto custom-scrollbar max-h-full">
                <div className="border-b border-[var(--color-atelier-grafite)]/5 pb-4 mb-2 shrink-0">
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Submeter Arte</h3>
                  <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1">Vincular Design ao Copy</p>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Ideia Aprovada (Opcional)</span>
                  <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[12px] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm">
                    <option value="">Apenas fazer upload sem ideia prévia...</option>
                    {approvedPlans.map(plan => (
                      <option key={plan.id} value={plan.id}>"{plan.hook}" - {plan.pillar}</option>
                    ))}
                  </select>
                </div>
                
                <label className="w-full h-48 bg-white border-2 border-dashed border-[var(--color-atelier-grafite)]/20 hover:border-[var(--color-atelier-terracota)]/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden group shadow-inner shrink-0 mt-2">
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setNewPostImage(e.target.files?.[0] || null)} />
                  {newPostImage ? (
                    <img src={URL.createObjectURL(newPostImage)} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <>
                      <UploadCloud size={32} className="text-[var(--color-atelier-grafite)]/30 mb-3 group-hover:scale-110 group-hover:text-[var(--color-atelier-terracota)] transition-all" />
                      <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)]">Upload da Arte Gráfica</span>
                    </>
                  )}
                </label>

                <div className="flex flex-col gap-1 flex-1 min-h-0 shrink-0 mt-2">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Copy / Legenda</span>
                  <textarea placeholder="Escreva a copy que acompanha esta arte..." value={newPostCaption} onChange={(e) => setNewPostCaption(e.target.value)} className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] resize-none h-32 md:min-h-[120px] outline-none focus:border-[var(--color-atelier-terracota)]/50 custom-scrollbar shadow-sm" />
                </div>

                <button onClick={handleCreatePost} disabled={isProcessing || !newPostImage} className="w-full bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 shadow-md shrink-0">
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Disparar para Fluxo do Cliente
                </button>
              </div>

              <div className="w-full md:w-2/3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 pb-4">
                {visiblePosts.map(post => {
                  const postPins = pins.filter(pin => pin.post_id === post.id);
                  return (
                    <div key={post.id} className="glass-panel bg-white/70 p-6 rounded-[2.5rem] flex flex-col md:flex-row gap-6 border border-white shadow-sm relative group shrink-0">
                      <button onClick={() => handleDeletePost(post.id)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-2 rounded-full shadow-md z-10"><Trash2 size={14}/></button>
                      
                      <div className="w-32 h-40 rounded-2xl overflow-hidden shrink-0 border border-[var(--color-atelier-grafite)]/5 shadow-inner relative">
                        <img src={post.image_url} alt="Post" className="w-full h-full object-cover" />
                        <div className={`absolute top-2 left-2 backdrop-blur-md px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest border
                          ${post.status === 'approved' ? 'bg-green-500/80 border-green-400 text-white' : post.status === 'needs_revision' ? 'bg-orange-500/80 border-orange-400 text-white' : 'bg-black/60 border-white/20 text-white'}
                        `}>
                          {post.status === 'approved' ? 'Aprovado' : post.status === 'needs_revision' ? 'Ajustes' : 'Pendente'}
                        </div>
                      </div>
                      
                      <div className="flex flex-col flex-1 justify-center min-w-0">
                        <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/80 leading-relaxed mb-4 truncate italic">
                          {post.caption?.substring(0, 80) || "Arte visual enviada..."}
                        </p>
                        {postPins.length > 0 ? (
                          <div className="bg-[var(--color-atelier-creme)]/80 p-4 rounded-xl border border-[var(--color-atelier-terracota)]/20 shadow-sm mt-auto max-h-32 overflow-y-auto custom-scrollbar">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-1.5 mb-2"><MapPin size={12}/> Pinos do Cliente (Ajustes)</span>
                            <ul className="flex flex-col gap-2">
                              {postPins.map((pin, i) => (
                                <li key={pin.id} className="text-[11px] text-[var(--color-atelier-grafite)] flex gap-2 items-start bg-white p-2 rounded-lg shadow-sm">
                                  <span className="font-black text-[var(--color-atelier-terracota)] mt-0.5">{i + 1}.</span> {pin.comment}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="bg-white/50 p-4 rounded-xl border border-white flex items-center gap-2 justify-center opacity-60">
                            <Clock size={14}/> <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">A aguardar revisão do cliente.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {visiblePosts.length === 0 && (
                  <div className="glass-panel bg-white/40 border border-white p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center h-[300px] shadow-sm shrink-0">
                    <CheckCircle2 size={48} className="text-[var(--color-atelier-terracota)]/30 mb-4" />
                    <p className="font-elegant text-3xl text-[var(--color-atelier-grafite)]/50">Fluxo Vazio</p>
                    <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/40 mt-2">Nenhuma arte gráfica aguardando aprovação ou em revisão.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* =======================================
              ABA 4: BRIEFING INICIAL DO CLIENTE
              ======================================= */}
          {activeTab === 'briefing_inicial' && (
            <motion.div key="briefing_inicial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col h-full overflow-hidden">
              <div className="glass-panel bg-white/80 p-8 rounded-[2.5rem] border border-white shadow-sm flex flex-col h-full relative overflow-hidden">
                 
                 <div className="flex justify-between items-center border-b border-[var(--color-atelier-grafite)]/10 pb-6 mb-6 shrink-0">
                   <div>
                     <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Briefing de Operação</h2>
                     <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1">Dados submetidos na entrada do projeto.</p>
                   </div>
                   <button onClick={handleDownloadBriefingPDF} disabled={!briefing} className="bg-[var(--color-atelier-grafite)] text-white px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-all flex items-center gap-2 shadow-md disabled:opacity-50 hover:-translate-y-0.5">
                     <Download size={14}/> PDF do Briefing
                   </button>
                 </div>

                 <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                   {!briefing ? (
                     <div className="flex flex-col items-center justify-center h-full opacity-40">
                       <FileText size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
                       <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Briefing Ausente</p>
                       <p className="font-roboto text-[12px] text-center mt-2 max-w-sm">O cliente ainda não preencheu o formulário de briefing inicial na sua plataforma.</p>
                     </div>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       
                       <div className="flex flex-col gap-6">
                         <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                           <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] block mb-2">Visão do Negócio</span>
                           <p className="text-[13px] text-[var(--color-atelier-grafite)]/80 leading-relaxed whitespace-pre-wrap">{briefing.business_vision || "Não preenchido."}</p>
                         </div>
                         <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                           <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] block mb-2">Público-Alvo</span>
                           <p className="text-[13px] text-[var(--color-atelier-grafite)]/80 leading-relaxed whitespace-pre-wrap">{briefing.target_audience || "Não preenchido."}</p>
                         </div>
                       </div>

                       <div className="flex flex-col gap-6">
                         <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                           <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] block mb-2">Concorrentes</span>
                           <p className="text-[13px] text-[var(--color-atelier-grafite)]/80 leading-relaxed whitespace-pre-wrap">{briefing.competitors || "Não preenchido."}</p>
                         </div>
                         <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                           <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] block mb-2">Diferencial (Unique Value)</span>
                           <p className="text-[13px] text-[var(--color-atelier-grafite)]/80 leading-relaxed whitespace-pre-wrap">{briefing.unique_value || "Não preenchido."}</p>
                         </div>
                         <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                           <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] block mb-2">Referências e Estilo</span>
                           <p className="text-[13px] text-[var(--color-atelier-grafite)]/80 leading-relaxed whitespace-pre-wrap">{briefing.references || "Não preenchido."}</p>
                         </div>
                       </div>

                     </div>
                   )}
                 </div>

              </div>
            </motion.div>
          )}

          {/* =======================================
              ABA 5: DNA DA MARCA (O Laboratório)
              ======================================= */}
          {activeTab === 'briefing' && (
            <motion.div key="briefing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 pb-10 h-full overflow-y-auto custom-scrollbar pr-2">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/70 p-6 md:p-8 rounded-[2.5rem] border border-white shadow-sm shrink-0 gap-4">
                 <div>
                   <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Brandbook / Código-Fonte</h2>
                   <p className="font-roboto text-xs text-[var(--color-atelier-grafite)]/50 mt-1 uppercase tracking-widest font-bold">Os dados do Laboratório de Expressão do Cliente.</p>
                 </div>
                 <div className="flex gap-2 w-full md:w-auto">
                   <button onClick={handleGenerateSourceCode} disabled={isProcessing || !labData} className="flex-1 md:flex-none px-5 py-3.5 bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] rounded-2xl font-roboto text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50">
                     {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={16} />} Compilar IA
                   </button>
                   <button onClick={handleDownloadBrandbookPDF} disabled={!labData} className="flex-1 md:flex-none px-5 py-3.5 bg-white border border-[var(--color-atelier-terracota)]/30 text-[var(--color-atelier-terracota)] hover:bg-[var(--color-atelier-terracota)] hover:text-white rounded-2xl font-roboto text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors">
                     <Download size={14} /> Brandbook
                   </button>
                 </div>
              </div>

              {labData?.ai_source_code && (
                <div className="bg-[var(--color-atelier-creme)]/50 p-8 rounded-[2.5rem] border border-[var(--color-atelier-terracota)]/20 shadow-inner shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mb-4 block">Estratégia Extraída (CMO)</span>
                  <div className="text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed whitespace-pre-wrap font-medium">
                    {labData.ai_source_code}
                  </div>
                </div>
              )}

              {labData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
                  {/* TILT */}
                  <div className="glass-panel bg-white/80 p-8 rounded-[2.5rem] border border-white shadow-sm">
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-6 border-b border-[var(--color-atelier-grafite)]/10 pb-4">1. Matriz de Alocação</h3>
                    <div className="flex flex-col gap-5">
                      <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2"><span className="font-bold text-[var(--color-atelier-grafite)]">Autoridade Técnica</span> <span className="text-[var(--color-atelier-terracota)] font-bold text-lg">{labData.tilt_technical}%</span></div>
                      <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2"><span className="font-bold text-[var(--color-atelier-grafite)]">Cultura/Operação</span> <span className="text-[var(--color-atelier-terracota)] font-bold text-lg">{labData.tilt_culture}%</span></div>
                      <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2"><span className="font-bold text-[var(--color-atelier-grafite)]">Status/Lifestyle</span> <span className="text-[var(--color-atelier-terracota)] font-bold text-lg">{labData.tilt_status}%</span></div>
                      <div className="flex justify-between items-center text-sm"><span className="font-bold text-[var(--color-atelier-grafite)]">Comunidade/Tribo</span> <span className="text-[var(--color-atelier-terracota)] font-bold text-lg">{labData.tilt_community}%</span></div>
                    </div>
                  </div>

                  {/* SEMIÓTICA */}
                <div className="glass-panel bg-white/80 p-8 rounded-[2rem] border border-white shadow-sm">
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-6 border-b pb-2">2. Semiótica Visual</h3>
                  <div className="flex flex-col gap-3">
                    {Object.entries(labData.semiotics_choices || {}).map(([key, val]) => (
                      <div key={key} className="text-sm">
                        <span className="font-bold uppercase text-[10px] text-[var(--color-atelier-grafite)]/50 block mb-1">{SEMIOTICS_MAP[key] ? key : key}</span>
                        <span className="text-[var(--color-atelier-terracota)] font-medium">{SEMIOTICS_MAP[key]?.[val as 'A'|'B'] || (val as string)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                  {/* TOM DE VOZ */}
                  <div className="glass-panel bg-white/80 p-8 rounded-[2.5rem] border border-white shadow-sm md:col-span-2">
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-6 border-b border-[var(--color-atelier-grafite)]/10 pb-4">3. Teatro de Operações (Voz)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(labData.voice_scenarios || {}).map(([key, val]) => (
                        <div key={key} className="text-sm bg-[var(--color-atelier-creme)]/30 p-5 rounded-2xl border border-[var(--color-atelier-grafite)]/5 shadow-sm">
                          <span className="font-bold uppercase text-[9px] text-[var(--color-atelier-grafite)]/50 block mb-2">Cenário: {key === 'price' ? 'Objeção de Preço' : key === 'failure' ? 'Gestão de Crise' : 'Celebração'}</span>
                          <span className="text-[var(--color-atelier-terracota)] font-bold text-[13px]">{VOICE_MAP[val as string] || (val as string)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SINAPSES (Cofre Visual) */}
                  <div className="glass-panel bg-white/80 p-8 rounded-[2.5rem] border border-white shadow-sm md:col-span-2">
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-6 border-b border-[var(--color-atelier-grafite)]/10 pb-4">4. Cofre de Sinapses (Gatilhos do Cliente)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(labData.synapses_vault || []).map((syn: any, i: number) => (
                        <div key={i} className="relative rounded-2xl overflow-hidden shadow-md aspect-[4/5] group border-4 border-white">
                          <img src={syn.url} className="w-full h-full object-cover" alt="ref" />
                          <div className="absolute inset-0 bg-black/80 p-4 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md">
                            <Target size={20} className="text-[var(--color-atelier-terracota)] mb-2" />
                            <p className="text-white text-[11px] text-center italic font-medium leading-relaxed">"{syn.reason}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL (O HOST DA ROTA ADMIN)
// ============================================================================
export function GerenciamentoInstagram() {
  const [isLoading, setIsLoading] = useState(true);
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);

  useEffect(() => {
    const fetchInstagramProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*, profiles(nome, avatar_url, empresa)')
          .or('service_type.eq.Gestão de Instagram,type.ilike.%Instagram%')
          .in('status', ['active', 'delivered', 'archived'])
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data && data.length > 0) {
          setDbProjects(data);
          setActiveProjectId(data[0].id);
        }
      } catch (error) {
        showToast("Erro ao carregar os clientes.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInstagramProjects();
  }, []);

  const currentProject = dbProjects.find(p => p.id === activeProjectId);

  if (isLoading) {
    return <div className="flex h-[100vh] items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[100vh] gap-4 opacity-50">
        <Smartphone size={48} className="text-[var(--color-atelier-grafite)]" />
        <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Nenhum Cliente Ativo.</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100vh] max-w-[1400px] mx-auto relative z-10 pt-8 pb-6 px-4 gap-6">
      <header className="flex justify-between items-end shrink-0 animate-[fadeInUp_0.5s_ease-out] relative z-20">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-terracota)]/20 shadow-sm flex items-center justify-center text-[var(--color-atelier-terracota)] font-elegant text-3xl overflow-hidden shrink-0">
             {currentProject.profiles?.avatar_url ? (
               <img src={currentProject.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover opacity-90" />
             ) : (
               currentProject.profiles?.nome?.charAt(0) || "C"
             )}
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-1">
              <span className={`px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold border 
                ${currentProject.status === 'archived' ? 'bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] border-[var(--color-atelier-grafite)]/20' 
                : currentProject.status === 'delivered' ? 'bg-orange-500/10 text-orange-700 border-orange-500/20' 
                : 'bg-green-500/10 text-green-700 border-green-500/20'}`}>
                {currentProject.status === 'archived' ? 'Arquivado' : currentProject.status === 'delivered' ? 'Entregue' : 'Ativo'}
              </span>
              <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] flex items-center gap-1">
                <Smartphone size={12}/> Gestão de Instagram (Admin)
              </span>
            </div>
            
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsClientMenuOpen(!isClientMenuOpen)}>
              <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none flex items-center gap-2 group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate max-w-[300px] md:max-w-md">
                {currentProject.profiles?.nome || "Cliente"} 
                <ChevronDown size={20} className={`text-[var(--color-atelier-grafite)]/40 transition-transform duration-300 shrink-0 ${isClientMenuOpen ? 'rotate-180' : ''}`} />
              </h1>
            </div>
            
            <AnimatePresence>
              {isClientMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.2 }}
                  className="absolute top-[110%] left-0 w-[300px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(122,116,112,0.15)] rounded-2xl overflow-hidden z-50 flex flex-col py-2"
                >
                  <div className="px-4 py-2 border-b border-[var(--color-atelier-grafite)]/5 text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Clientes de Instagram</div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {dbProjects.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => { setActiveProjectId(p.id); setIsClientMenuOpen(false); }}
                        className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${p.id === activeProjectId ? 'bg-[var(--color-atelier-terracota)]/5' : 'hover:bg-white'}`}
                      >
                        <div className="w-8 h-8 rounded-full border border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] flex items-center justify-center overflow-hidden text-xs font-bold shrink-0">
                          {p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : p.profiles?.nome?.charAt(0)}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className={`font-roboto text-[13px] truncate ${p.id === activeProjectId ? 'font-bold text-[var(--color-atelier-terracota)]' : 'font-medium text-[var(--color-atelier-grafite)]'}`}>{p.profiles?.nome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <InstagramWorkspace activeProjectId={activeProjectId as string} currentProject={currentProject} />
    </div>
  );
}

export default function GerenciamentoPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-roboto text-[10px] uppercase tracking-widest opacity-50">A Carregar Instagram Admin...</div>}>
      <GerenciamentoInstagram />
    </Suspense>
  );
}