// src/app/cofre-missoes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { NotificationEngine } from "../../lib/NotificationEngine"; // 🔔 INJEÇÃO DO MOTOR
import { 
  Loader2, Target, Eye, MessageSquare, 
  UploadCloud, CheckCircle2, ArrowRight, BrainCircuit, 
  Download, Sparkles, X, ChevronRight, Info, Zap
} from "lucide-react";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ============================================================================
// DICIONÁRIO DE DADOS ESTÁTICOS (HQ Unsplash)
// ============================================================================
const SEMIOTICS_PAIRS = [
  {
    id: "lighting", title: "Luz e Atmosfera",
    optA: { img: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=800&auto=format&fit=crop", desc: "Sol da manhã invadindo organicamente, sombras suaves. (Acolhimento)" },
    optB: { img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop", desc: "Luz dura, sombras recortadas e dramáticas. (Poder/Mistério)" }
  },
  {
    id: "framing", title: "Foco e Narrativa",
    optA: { img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop", desc: "Foco macro extremo, texturas detalhadas. (Preciosismo)" },
    optB: { img: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop", desc: "Plano aberto, visão do ambiente em pleno funcionamento. (Expansão)" }
  },
  {
    id: "presence", title: "Presença Humana",
    optA: { img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop", desc: "Pessoas em movimento, leve desfoque, ação do trabalho. (Dinâmica)" },
    optB: { img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop", desc: "Retrato posado, estático, contato visual firme. (Imponência)" }
  },
  {
    id: "temperature", title: "Temperatura de Cor",
    optA: { img: "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?q=80&w=800&auto=format&fit=crop", desc: "Tons quentes, madeira crua, luz amarelada. (Tradição/Proximidade)" },
    optB: { img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop", desc: "Tons frios, cinzas, luz branca cirúrgica. (Hiper-modernidade)" }
  },
  {
    id: "composition", title: "Composição",
    optA: { img: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=800&auto=format&fit=crop", desc: "Elementos casuais e assimétricos na mesa. (Caos Criativo)" },
    optB: { img: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?q=80&w=800&auto=format&fit=crop", desc: "Simetria absoluta, grid perfeito, alinhamento. (Rigor Técnico)" }
  },
  {
    id: "setting", title: "Cenário",
    optA: { img: "https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=800&auto=format&fit=crop", desc: "Texturas urbanas, asfalto, a fricção da rua. (Vivência)" },
    optB: { img: "https://images.unsplash.com/photo-1600607687920-4e2a09be15c7?q=80&w=800&auto=format&fit=crop", desc: "Arquitetura polida, vidros limpos, mármore. (Isolamento/Luxo)" }
  },
  {
    id: "post_prod", title: "Acabamento",
    optA: { img: "https://images.unsplash.com/photo-1493804714600-6edb1cd93080?q=80&w=800&auto=format&fit=crop", desc: "Granulação visível (35mm), imperfeições. (Nostalgia/Verdade)" },
    optB: { img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800&auto=format&fit=crop", desc: "Nitidez digital 4K, alto contraste limpo. (Sofisticação/Eficiência)" }
  },
  {
    id: "negative_space", title: "Espaço Negativo",
    optA: { img: "https://images.unsplash.com/photo-1542744094-3a31f272c490?q=80&w=800&auto=format&fit=crop", desc: "Informação densa preenchendo o frame. (Complexidade)" },
    optB: { img: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop", desc: "Elemento central, 80% de espaço vazio. (Minimalismo Absoluto)" }
  }
];

const SCENARIOS = [
  {
    id: "price", title: "O Confronto de Valor",
    context: "Um prospect comenta publicamente: 'O vosso preço está muito acima do mercado e o concorrente faz mais barato.'",
    options: [
      { id: "A", label: "Acolhedora / Educativa", text: "Compreendemos. O nosso foco é entregar durabilidade que o padrão atual não suporta. Se quiser entender o processo, estamos à disposição." },
      { id: "B", label: "Distante / Soberana", text: "Nossa estrutura não foi desenhada para competir em custo, mas em resultado absoluto. O mercado possui opções para diferentes momentos." },
      { id: "C", label: "Implacável / Agressiva", text: "O barato cobra a conta em retrabalho e frustração. Nós preferimos cobrar apenas uma vez e resolver o problema em definitivo." }
    ]
  },
  {
    id: "failure", title: "O Bastidor do Fracasso",
    context: "A equipa cometeu um erro que atrasou uma entrega, mas já foi 100% resolvido. O que vai para as redes?",
    options: [
      { id: "A", label: "Transparência Radical", text: "Mostramos o erro nos Stories, o caos gerado e como virámos a noite para consertar. O suor constrói confiança." },
      { id: "B", label: "Proteção do Legado", text: "Resolvemos no privado. O feed mantém foco exclusivo na excelência. A marca não sangra em praça pública." },
      { id: "C", label: "Evolução Técnica", text: "Não falamos do erro. Postamos sobre o novo protocolo de segurança que implementámos. Foco na evolução estrutural." }
    ]
  },
  {
    id: "victory", title: "A Celebração da Vitória",
    context: "Acabaram de quebrar o recorde histórico de faturação. O que o público lê no próximo post?",
    options: [
      { id: "A", label: "A Tribo", text: "Agradecimento caloroso à equipa e clientes. Fotos da comemoração interna: 'nós vencemos juntos'." },
      { id: "B", label: "Minimalismo Estratégico", text: "Estética limpa, texto conciso sobre consistência. Sem grandes festas. Mensagem: 'Isto é só mais uma terça-feira'." },
      { id: "C", label: "O Próximo Alvo", text: "A vitória quase não é mencionada. O foco já é no próximo passo. Mensagem: 'O semestre foi bom, mas vamos redefinir o mercado'." }
    ]
  }
];

export default function BrandbookLaboratory() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeZone, setActiveZone] = useState<1 | 2 | 3 | 4 | 5>(1);
  
  const [project, setProject] = useState<any>(null);
  const [labDataId, setLabDataId] = useState<string | null>(null);

  // Módulo 1: Content Tilt (Algoritmo Proporcional Soma 100)
  const [tilt, setTilt] = useState({ technical: 25, culture: 25, status: 25, community: 25 });
  
  // Módulo 2 & 3: Testes de Fluxo
  const [semiotics, setSemiotics] = useState<Record<string, string>>({});
  const [activeSemioticsIndex, setActiveSemioticsIndex] = useState(0);
  
  const [voice, setVoice] = useState<Record<string, string>>({});
  const [activeVoiceIndex, setActiveVoiceIndex] = useState(0);

  // Módulo 4: Dropzone e Modal
  const [synapses, setSynapses] = useState<{url: string, reason: string}[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingSynapseIndex, setPendingSynapseIndex] = useState<number | null>(null);
  const [tempReason, setTempReason] = useState("");

  // Fechamento & Upsell 💰
  const [aiSourceCode, setAiSourceCode] = useState<string | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);

  useEffect(() => {
    fetchLabData();
  }, []);

  const fetchLabData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: projData } = await supabase.from('projects')
        .select('*')
        .eq('client_id', session.user.id)
        .or('service_type.eq.Gestão de Instagram,type.ilike.%Instagram%')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (projData) {
        setProject(projData);
        const { data: labData } = await supabase.from('brandbook_laboratory').select('*').eq('project_id', projData.id).maybeSingle();
        
        if (labData) {
          setLabDataId(labData.id);
          if (labData.tilt_technical !== undefined) {
            setTilt({
              technical: labData.tilt_technical, culture: labData.tilt_culture,
              status: labData.tilt_status, community: labData.tilt_community
            });
          }
          if (labData.semiotics_choices) setSemiotics(labData.semiotics_choices);
          if (labData.voice_scenarios) setVoice(labData.voice_scenarios);
          if (labData.synapses_vault) setSynapses(labData.synapses_vault);
          if (labData.ai_source_code) {
            setAiSourceCode(labData.ai_source_code);
            setActiveZone(5);
          }
        } else {
          const { data: newLab } = await supabase.from('brandbook_laboratory').insert({ project_id: projData.id, client_id: session.user.id }).select().single();
          if (newLab) setLabDataId(newLab.id);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProgress = async () => {
    if (!labDataId) return;
    try {
      await supabase.from('brandbook_laboratory').update({
        tilt_technical: tilt.technical,
        tilt_culture: tilt.culture,
        tilt_status: tilt.status,
        tilt_community: tilt.community,
        semiotics_choices: semiotics,
        voice_scenarios: voice,
        synapses_vault: synapses,
        updated_at: new Date().toISOString()
      }).eq('id', labDataId);
    } catch (error) {
      console.error(error);
    }
  };

  // ==========================================
  // ALGORITMO: FICHAS DE FOCO (Proporcional)
  // ==========================================
  const handleTiltChange = (key: keyof typeof tilt, newValue: number) => {
    const oldVal = tilt[key];
    const delta = newValue - oldVal;
    if (delta === 0) return;

    const otherKeys = (Object.keys(tilt) as (keyof typeof tilt)[]).filter(k => k !== key);
    const otherSum = otherKeys.reduce((acc, k) => acc + tilt[k], 0);

    let newTilt = { ...tilt, [key]: newValue };

    if (otherSum === 0) {
      const split = -delta / otherKeys.length;
      otherKeys.forEach(k => newTilt[k] = Math.max(0, tilt[k] + split));
    } else {
      otherKeys.forEach(k => {
        const proportion = tilt[k] / otherSum;
        newTilt[k] = Math.max(0, Math.round(tilt[k] - (delta * proportion)));
      });
    }

    const currentSum = Object.values(newTilt).reduce((a,b)=>a+b, 0);
    if (currentSum !== 100) {
      const diff = 100 - currentSum;
      const largestKey = otherKeys.reduce((a,b) => newTilt[a] > newTilt[b] ? a : b);
      newTilt[largestKey] += diff;
    }
    setTilt(newTilt);
  };

  // ==========================================
  // FLUXOS DE STEPPER (Auto-Swipe)
  // ==========================================
  const handleSemioticsChoice = (pairId: string, choice: 'A' | 'B') => {
    const newSemiotics = { ...semiotics, [pairId]: choice };
    setSemiotics(newSemiotics);
    
    setTimeout(() => {
      if (activeSemioticsIndex < SEMIOTICS_PAIRS.length - 1) {
        setActiveSemioticsIndex(prev => prev + 1);
      } else {
        saveProgress();
        showToast("Teste de Semiótica Concluído.");
        setActiveZone(3);
      }
    }, 500);
  };

  const handleVoiceChoice = (scenId: string, choiceId: string) => {
    const newVoice = { ...voice, [scenId]: choiceId };
    setVoice(newVoice);

    setTimeout(() => {
      if (activeVoiceIndex < SCENARIOS.length - 1) {
        setActiveVoiceIndex(prev => prev + 1);
      } else {
        saveProgress();
        showToast("Teatro de Operações Concluído.");
        setActiveZone(4);
      }
    }, 500);
  };

  // ==========================================
  // COFRE DE SINAPSES (Upload + Pop-up Obrigatório)
  // ==========================================
  const handleUploadSynapse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `synapse_${Date.now()}.${fileExt}`;
      const filePath = `${project.client_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('moodboard').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('moodboard').getPublicUrl(filePath);
      
      const newSynapses = [...synapses, { url: data.publicUrl, reason: "" }];
      setSynapses(newSynapses);
      
      // Abre o Modal obrigatório
      setTempReason("");
      setPendingSynapseIndex(newSynapses.length - 1);
      
    } catch (error) {
      showToast("Erro ao encriptar imagem.");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const submitSynapseReason = async () => {
    if (pendingSynapseIndex === null || tempReason.trim().length === 0) {
      showToast("O gatilho visual é obrigatório."); return;
    }
    const newSynapses = [...synapses];
    newSynapses[pendingSynapseIndex].reason = tempReason;
    setSynapses(newSynapses);
    setPendingSynapseIndex(null);
    setTempReason("");
    
    await supabase.from('brandbook_laboratory').update({ synapses_vault: newSynapses }).eq('id', labDataId);
    showToast("Sinapse encriptada com sucesso!");
  };

  // ==========================================
  // FECHAMENTO & UPSELL MAGNÉTICO
  // ==========================================
  const generateSourceCode = async () => {
    if (Object.keys(semiotics).length < SEMIOTICS_PAIRS.length) { showToast("Conclua a Zona 2."); return; }
    if (Object.keys(voice).length < SCENARIOS.length) { showToast("Conclua a Zona 3."); return; }

    setIsProcessing(true);
    await saveProgress();

    try {
      showToast("A sintetizar o Manual de Operações...");
      const res = await fetch('/api/insights/brandbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: project.profiles.nome, tilt, semiotics, voice, synapses })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      await supabase.from('brandbook_laboratory').update({ ai_source_code: data.insight }).eq('id', labDataId);
      setAiSourceCode(data.insight);
      setActiveZone(5);
      showToast("Código-Fonte gerado com sucesso! ✨");
    } catch (error) {
      showToast("Erro ao compilar. O Atelier foi notificado.");
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePDF = async () => {
    showToast("A forjar Dossiê PDF Vetorial...");
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const BrandbookPDF = (await import('../../components/pdf/BrandbookPDF')).default; 
      const doc = <BrandbookPDF clientName={project.profiles?.nome} tilt={tilt as any} semiotics={semiotics} voice={voice} synapses={synapses} aiInsight={aiSourceCode||undefined} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `Manual_Operacoes_${project.profiles?.nome}.pdf`;
      link.click();

      // 💥 GATILHO DO PICO DE DOPAMINA: O PDF transferiu, acorda o Upsell passado 1.5 seg
      setTimeout(() => {
        setShowUpsell(true);
      }, 1500);

    } catch (e) {
      console.error(e);
      showToast("Erro na exportação."); 
    }
  };

  const handleAcceptUpsell = async () => {
     setShowUpsell(false);
     showToast("Maravilhoso! A nossa equipa entrará em contacto nas próximas horas.");
     
     // 🔔 SINAL DE FUMO PARA O ESTÚDIO (Lead Quente)
     await NotificationEngine.notifyManagement(
        "🔥 Boiling Lead: Upsell Solicitado",
        `O cliente ${project.profiles?.nome} clicou em Delegar Execução (Upsell) na Zona 5 do Brandbook. Entre em contato rápido.`,
        "success",
        "/admin/clientes"
     );
  };

  // Adicione esta linha para calcular a soma em tempo real
  const totalTilt = tilt.technical + tilt.culture + tilt.status + tilt.community;

  if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <div className="flex flex-col h-full flex-1 w-full relative z-10 overflow-hidden text-[var(--color-atelier-grafite)]">
      
      {/* HEADER DE LUXO (Sem Backgrounds para mesclar com o layout nativo) */}
      <header className="py-4 md:py-6 flex justify-between items-center shrink-0 z-20 px-6 max-w-[1400px] w-full mx-auto animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-white/40 flex items-center justify-center border border-white shadow-sm"><Sparkles size={14} className="text-[var(--color-atelier-terracota)]" /></div>
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50">Laboratório de Expressão</span>
          </div>
          <h1 className="font-elegant text-2xl md:text-3xl text-[var(--color-atelier-grafite)] leading-none mt-1">O Brandbook Vivo</h1>
        </div>
        <button onClick={() => router.push('/cockpit')} className="w-10 h-10 rounded-[1rem] bg-white border border-[var(--color-atelier-grafite)]/10 flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:bg-[var(--color-atelier-grafite)] hover:text-white transition-all shadow-sm">
          <X size={18} />
        </button>
      </header>

      <div className="flex flex-1 min-h-0 relative gap-6 max-w-[1400px] w-full mx-auto animate-[fadeInUp_0.8s_ease-out_0.2s_both] px-6">
        
        {/* SIDEBAR DE NAVEGAÇÃO INTERNA */}
        <div className="w-[260px] hidden md:flex flex-col shrink-0 z-10 h-full border-r border-[var(--color-atelier-grafite)]/5 pr-6 pb-6">
          <div className="py-2 flex-1 overflow-y-auto custom-scrollbar">
            <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/60 leading-relaxed mb-6 font-medium bg-white/40 p-4 rounded-[1.2rem] border border-white shadow-sm">
              Navegue pelas 4 zonas de decisão. O sistema compilará as suas escolhas táticas no Código-Fonte da sua marca.
            </p>
            
            <div className="flex flex-col gap-3">
              {[
                { id: 1, name: "O Eixo de Atenção", icon: <Target size={16}/> },
                { id: 2, name: "Semiótica Visual", icon: <Eye size={16}/> },
                { id: 3, name: "A Prova de Fogo", icon: <MessageSquare size={16}/> },
                { id: 4, name: "Cofre de Sinapses", icon: <UploadCloud size={16}/> },
              ].map(zone => (
                <button 
                  key={zone.id} onClick={() => { setActiveZone(zone.id as any); saveProgress(); }}
                  className={`w-full flex items-center justify-between p-4 rounded-[1.5rem] transition-all border text-left
                    ${activeZone === zone.id ? 'bg-white border-[var(--color-atelier-terracota)]/30 shadow-md ring-1 ring-[var(--color-atelier-terracota)]/10 scale-[1.02] z-10' : 'bg-transparent border-transparent hover:bg-white/50 text-[var(--color-atelier-grafite)]/60'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-[1rem] flex items-center justify-center shadow-inner ${activeZone === zone.id ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20' : 'bg-white border border-white text-[var(--color-atelier-grafite)]/40'}`}>
                      {zone.icon}
                    </div>
                    <span className={`font-roboto text-[10px] uppercase tracking-widest font-bold ${activeZone === zone.id ? 'text-[var(--color-atelier-grafite)]' : ''}`}>Zona {zone.id}</span>
                  </div>
                  <ChevronRight size={14} className={activeZone === zone.id ? 'text-[var(--color-atelier-terracota)]' : 'opacity-0'} />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-[var(--color-atelier-grafite)]/5">
            <button 
              onClick={activeZone === 5 ? () => setActiveZone(1) : generateSourceCode} 
              disabled={isProcessing}
              className={`w-full py-4 rounded-[1.2rem] font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all shadow-md hover:-translate-y-0.5
                ${activeZone === 5 ? 'bg-white text-[var(--color-atelier-grafite)] border border-white' : 'bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)]'}
              `}
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : activeZone === 5 ? <ArrowRight size={16}/> : <BrainCircuit size={16} />}
              {activeZone === 5 ? 'Revisar Zonas' : 'Sintetizar Manual'}
            </button>
          </div>
        </div>

        {/* PALCO PRINCIPAL (No Scroll Wrapper Adaptativo) */}
        <div className="flex-1 relative overflow-y-auto custom-scrollbar px-2 pb-20 pt-2 scroll-smooth flex justify-center items-start">
          <AnimatePresence mode="wait">
            
            {/* =========================================================================
                ZONA 1: O EIXO DE ATENÇÃO (Content Tilt)
                ========================================================================= */}
            {activeZone === 1 && (
              <motion.div key="z1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-2xl flex flex-col gap-6 pb-4 h-full justify-center">
                <div className="text-center shrink-0">
                  <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">O Eixo de Atenção</h2>
                  <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/70 leading-relaxed max-w-xl mx-auto font-medium">
                    Não existe estratégia sem renúncia. Aloque as suas 100 fichas de foco para definir o peso da sua linha editorial. Onde colocamos a energia da sua marca?
                  </p>
                </div>

                <div className="glass-panel bg-white/60 p-6 md:p-10 rounded-[3rem] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.03)] flex flex-col gap-8 transition-colors hover:bg-white/80">
                  
                  <div className="flex items-center justify-center shrink-0">
                    <div className="bg-[var(--color-atelier-creme)]/80 border border-white px-8 py-3.5 rounded-[1.5rem] flex items-center gap-4 shadow-sm">
                      <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Fichas de Foco</span>
                      <span className="font-elegant text-4xl text-[var(--color-atelier-terracota)] leading-none">{totalTilt}<span className="text-sm text-[var(--color-atelier-grafite)]/30">/100</span></span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-8">
                    {[
                      { key: 'technical', label: 'Pragmatismo & Autoridade (O Cérebro)', desc: 'Casos de estudo, dados diretos, teses de mercado e quebra de objeções. A prova técnica.' },
                      { key: 'culture', label: 'Cultura & Operação (O Suor)', desc: 'A realidade nua e crua. Os bastidores, a equipa, os desafios. A humanização pelo esforço.' },
                      { key: 'status', label: 'Status & Recompensa (A Visão)', desc: 'O design de vida. A estética impecável, o ambiente de alto padrão e o desejo aspiracional.' },
                      { key: 'community', label: 'Comunidade & Pertencimento (A Tribo)', desc: 'Diálogo direto, respostas aos clientes, reconhecimento e construção de um ecossistema.' },
                    ].map(pillar => (
                      <div key={pillar.key} className="bg-white/40 p-5 rounded-[1.5rem] border border-white shadow-sm">
                        <div className="flex justify-between items-end mb-4">
                          <div className="pr-4">
                            <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">{pillar.label}</h4>
                            <p className="text-[10px] text-[var(--color-atelier-grafite)]/50 mt-1.5 leading-relaxed font-medium">{pillar.desc}</p>
                          </div>
                          <span className="font-elegant text-3xl text-[var(--color-atelier-terracota)] shrink-0 leading-none">{tilt[pillar.key as keyof typeof tilt]}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={tilt[pillar.key as keyof typeof tilt]} onChange={(e) => handleTiltChange(pillar.key as keyof typeof tilt, parseInt(e.target.value))} className="w-full h-2.5 bg-[var(--color-atelier-grafite)]/10 rounded-full appearance-none cursor-pointer accent-[var(--color-atelier-terracota)] shadow-inner" />
                      </div>
                    ))}
                  </div>
                  
                  <button onClick={() => { setActiveZone(2); saveProgress(); }} className="mt-2 px-8 py-5 bg-[var(--color-atelier-terracota)] text-white rounded-[1.5rem] font-bold uppercase tracking-widest text-[11px] hover:bg-[#8c562e] transition-colors shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2 shrink-0">
                    Avançar para Semiótica <ArrowRight size={14}/>
                  </button>
                </div>
              </motion.div>
            )}

            {/* =========================================================================
                ZONA 2: SEMIÓTICA VISUAL (Esse ou Esse)
                ========================================================================= */}
            {activeZone === 2 && (
              <motion.div key="z2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-4xl flex flex-col gap-8 pb-10 h-full">
                <div className="text-center shrink-0">
                  <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-4">Teste de Semiótica Visual</h2>
                  <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 leading-relaxed max-w-xl mx-auto font-medium">
                    Não avalie o objeto da foto, avalie a <strong>textura e a sintaxe</strong>. Apenas clique na imagem que reflete a essência do seu futuro digital.
                  </p>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
                  <div className="flex items-center gap-2 mb-6">
                    {SEMIOTICS_PAIRS.map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === activeSemioticsIndex ? 'bg-[var(--color-atelier-terracota)] w-6 shadow-sm' : i < activeSemioticsIndex ? 'bg-[var(--color-atelier-terracota)]/40' : 'bg-gray-200'}`}></div>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {SEMIOTICS_PAIRS[activeSemioticsIndex] && (
                      <motion.div key={activeSemioticsIndex} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.3 }} className="w-full flex flex-col gap-6">
                        <h3 className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] text-center mb-2 bg-white px-4 py-2 rounded-full border border-[var(--color-atelier-terracota)]/20 shadow-sm w-fit mx-auto">
                          Rodada {activeSemioticsIndex + 1}: {SEMIOTICS_PAIRS[activeSemioticsIndex].title}
                        </h3>
                        
                        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-stretch">
                          <button 
                            onClick={() => handleSemioticsChoice(SEMIOTICS_PAIRS[activeSemioticsIndex].id, 'A')}
                            className="flex-1 flex flex-col group relative outline-none text-left"
                          >
                            <div className={`w-full aspect-[4/3] md:aspect-square rounded-[3rem] overflow-hidden shadow-lg transition-all duration-300 border-[6px] ${semiotics[SEMIOTICS_PAIRS[activeSemioticsIndex].id] === 'A' ? 'border-[var(--color-atelier-terracota)] scale-[1.02]' : 'border-white/60 group-hover:shadow-2xl'}`}>
                              <img src={SEMIOTICS_PAIRS[activeSemioticsIndex].optA.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="A" />
                            </div>
                            <p className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 mt-5 text-center px-4 leading-relaxed group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                              {SEMIOTICS_PAIRS[activeSemioticsIndex].optA.desc}
                            </p>
                          </button>
                          
                          <div className="hidden md:flex items-center justify-center font-elegant text-2xl text-[var(--color-atelier-grafite)]/20 italic">VS</div>

                          <button 
                            onClick={() => handleSemioticsChoice(SEMIOTICS_PAIRS[activeSemioticsIndex].id, 'B')}
                            className="flex-1 flex flex-col group relative outline-none text-left"
                          >
                            <div className={`w-full aspect-[4/3] md:aspect-square rounded-[3rem] overflow-hidden shadow-lg transition-all duration-300 border-[6px] ${semiotics[SEMIOTICS_PAIRS[activeSemioticsIndex].id] === 'B' ? 'border-[var(--color-atelier-terracota)] scale-[1.02]' : 'border-white/60 group-hover:shadow-2xl'}`}>
                              <img src={SEMIOTICS_PAIRS[activeSemioticsIndex].optB.img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="B" />
                            </div>
                            <p className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 mt-5 text-center px-4 leading-relaxed group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                              {SEMIOTICS_PAIRS[activeSemioticsIndex].optB.desc}
                            </p>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* =========================================================================
                ZONA 3: TEATRO DE OPERAÇÕES
                ========================================================================= */}
            {activeZone === 3 && (
              <motion.div key="z3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-3xl mx-auto flex flex-col gap-6 pb-4 h-full justify-center">
                <div className="text-center shrink-0">
                  <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">A Prova de Fogo</h2>
                  <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/70 leading-relaxed max-w-xl mx-auto font-medium">
                    A verdadeira personalidade de uma marca é forjada no conflito. Como a sua marca responde a estes cenários no ambiente digital?
                  </p>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full">
                  <div className="flex items-center gap-2 mb-6 shrink-0">
                    {SCENARIOS.map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === activeVoiceIndex ? 'bg-[var(--color-atelier-terracota)] w-6 shadow-sm' : i < activeVoiceIndex ? 'bg-[var(--color-atelier-terracota)]/40' : 'bg-gray-200'}`}></div>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {SCENARIOS[activeVoiceIndex] && (
                      <motion.div key={activeVoiceIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="w-full glass-panel bg-white/60 p-8 md:p-12 rounded-[3rem] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.03)] flex flex-col">
                        
                        <div className="mb-8 pb-8 border-b border-[var(--color-atelier-grafite)]/10 text-center shrink-0">
                          <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-white bg-[var(--color-atelier-terracota)] px-3 py-1.5 rounded-lg shadow-sm mb-4 inline-block">Cenário {activeVoiceIndex + 1}: {SCENARIOS[activeVoiceIndex].title}</span>
                          <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)] italic leading-relaxed">"{SCENARIOS[activeVoiceIndex].context}"</p>
                        </div>

                        <div className="flex flex-col gap-4">
                          {SCENARIOS[activeVoiceIndex].options.map(opt => (
                            <button 
                              key={opt.id} onClick={() => handleVoiceChoice(SCENARIOS[activeVoiceIndex].id, opt.id)}
                              className={`p-6 rounded-[1.5rem] cursor-pointer transition-all border flex gap-4 items-center text-left
                                ${voice[SCENARIOS[activeVoiceIndex].id] === opt.id ? 'bg-white border-[var(--color-atelier-terracota)]/40 shadow-md scale-[1.02]' : 'bg-white/50 border-white hover:border-[var(--color-atelier-terracota)]/20 hover:bg-white'}
                              `}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors
                                ${voice[SCENARIOS[activeVoiceIndex].id] === opt.id ? 'bg-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)] text-white' : 'bg-white/50 border-[var(--color-atelier-grafite)]/20 shadow-inner'}
                              `}>
                                {voice[SCENARIOS[activeVoiceIndex].id] === opt.id && <CheckCircle2 size={12} />}
                              </div>
                              <div>
                                <span className={`block font-roboto text-[10px] uppercase tracking-widest font-bold mb-1.5 ${voice[SCENARIOS[activeVoiceIndex].id] === opt.id ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/50'}`}>{opt.label}</span>
                                <p className="text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed font-medium">{opt.text}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* =========================================================================
                ZONA 4: COFRE DE SINAPSES
                ========================================================================= */}
            {activeZone === 4 && (
              <motion.div key="z4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-4xl mx-auto flex flex-col gap-8 pb-10 min-h-full">
                <div className="text-center max-w-2xl mx-auto shrink-0">
                  <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-4">O Cofre de Sinapses</h2>
                  <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 leading-relaxed font-medium bg-white/40 p-4 rounded-2xl border border-white shadow-sm">
                    Abasteça a máquina. Arraste referências visuais que capturam a alma do seu negócio. Não envie logos concorrentes. Envie a textura de um casaco, a luz de um filme, um design automotivo que respeita.
                  </p>
                </div>

                <div className="flex-1 flex flex-col gap-8">
                  <label className="w-full bg-white/60 border-2 border-dashed border-[var(--color-atelier-terracota)]/30 hover:border-[var(--color-atelier-terracota)]/80 hover:bg-white rounded-[3rem] p-16 flex flex-col items-center justify-center cursor-pointer transition-all shadow-sm group">
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadSynapse} disabled={isUploading} />
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-4 text-[var(--color-atelier-terracota)]">
                        <Loader2 size={40} className="animate-spin" />
                        <span className="font-roboto text-[11px] font-bold uppercase tracking-widest bg-white px-4 py-2 rounded-full shadow-sm">A encriptar sinapse visual...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-md border border-[var(--color-atelier-terracota)]/10">
                          <UploadCloud size={32} className="text-[var(--color-atelier-grafite)]/40 group-hover:text-[var(--color-atelier-terracota)] transition-colors" />
                        </div>
                        <span className="font-roboto text-[13px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors">Solte a referência aqui</span>
                      </>
                    )}
                  </label>

                  {synapses.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      {synapses.map((syn, idx) => (
                        <div key={idx} className="glass-panel bg-white/80 p-5 rounded-[2rem] border border-white shadow-sm flex gap-5 items-center hover:shadow-md transition-shadow">
                          <div className="w-20 h-20 rounded-[1.2rem] overflow-hidden shrink-0 border border-white shadow-sm">
                            <img src={syn.url} className="w-full h-full object-cover" alt="Sinapse" />
                          </div>
                          <div className="flex flex-col flex-1 pr-2">
                            <label className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mb-1">Gatilho Registrado</label>
                            <p className="text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed italic line-clamp-2 font-medium">"{syn.reason}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={generateSourceCode} disabled={isProcessing} className="w-full py-5 bg-[var(--color-atelier-grafite)] text-white rounded-[1.5rem] font-bold uppercase tracking-widest text-[11px] shadow-xl hover:bg-[var(--color-atelier-terracota)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 mt-auto disabled:opacity-50">
                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={18} />} SINTETIZAR MANUAL DE OPERAÇÕES
                  </button>
                </div>

                {/* MODAL OBRIGATÓRIO (POP-UP) PÓS UPLOAD */}
                <AnimatePresence>
                  {pendingSynapseIndex !== null && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-md" />
                      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="glass-panel bg-white/90 p-8 md:p-10 rounded-[3rem] shadow-2xl relative z-10 max-w-lg w-full border border-white">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 rounded-[1rem] bg-[var(--color-atelier-terracota)]/10 border border-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-terracota)] flex items-center justify-center shadow-inner"><Target size={20}/></div>
                          <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">O Gatilho Visual</h3>
                        </div>
                        <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 mb-6 leading-relaxed font-medium">
                          Nossa equipe não lê mentes. O que, especificamente, chamou a sua atenção nesta imagem? (Ex: A iluminação dura, a textura da madeira, a cor azul marinho).
                        </p>
                        <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
                          <div className="w-32 h-32 rounded-[1.5rem] overflow-hidden shadow-sm shrink-0 border-4 border-white mx-auto md:mx-0">
                             <img src={synapses[pendingSynapseIndex].url} className="w-full h-full object-cover" alt="" />
                          </div>
                          <textarea 
                            autoFocus maxLength={140}
                            placeholder="Descreva o detalhe que o atraiu..."
                            value={tempReason} onChange={(e) => setTempReason(e.target.value)}
                            className="flex-1 w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-[1.2rem] p-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] resize-none h-32 outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-inner custom-scrollbar"
                          />
                        </div>
                        <button onClick={submitSynapseReason} disabled={tempReason.trim().length === 0} className="w-full py-4 bg-[var(--color-atelier-terracota)] text-white rounded-[1.2rem] font-bold uppercase tracking-widest text-[11px] shadow-md hover:bg-[#8c562e] transition-all hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:opacity-50">
                          Registrar Visão
                        </button>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* =========================================================================
                ZONA 5: O FECHAMENTO (Código-Fonte)
                ========================================================================= */}
            {activeZone === 5 && (
              <motion.div key="z5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto flex flex-col gap-8 pb-10 min-h-full justify-center">
                <div className="glass-panel bg-white/80 p-12 rounded-[3.5rem] text-center shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden border border-white">
                  
                  <div className="w-24 h-24 rounded-[1.5rem] bg-[var(--color-atelier-terracota)]/10 border border-[var(--color-atelier-terracota)]/20 flex items-center justify-center mx-auto mb-8 shadow-inner relative z-10">
                    <CheckCircle2 size={40} className="text-[var(--color-atelier-terracota)]" />
                  </div>
                  
                  <h2 className="font-elegant text-5xl text-[var(--color-atelier-grafite)] mb-4 relative z-10">Código-Fonte <span className="text-[var(--color-atelier-terracota)] italic">Extraído.</span></h2>
                  <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/70 leading-relaxed max-w-lg mx-auto mb-10 relative z-10 font-medium">
                    O nosso Chief Marketing Officer (IA) compilou a sua distribuição de energia, a sua sintaxe visual fotográfica e as suas respostas sob pressão. O DNA inabalável da sua marca está definido.
                  </p>
                  
                  <div className="bg-white p-8 rounded-3xl border border-[var(--color-atelier-grafite)]/5 text-left mb-10 max-h-[35vh] overflow-y-auto custom-scrollbar relative z-10 shadow-inner">
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[var(--color-atelier-grafite)]/5">
                      <BrainCircuit size={16} className="text-[var(--color-atelier-terracota)]" />
                      <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Atelier Core AI</span>
                    </div>
                    <div className="text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed whitespace-pre-wrap font-medium">
                      {aiSourceCode || "Ocorreu um erro ao renderizar o código-fonte."}
                    </div>
                  </div>

                  <button onClick={generatePDF} className="bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white px-10 py-5 rounded-[1.5rem] font-roboto text-[11px] font-bold uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 mx-auto relative z-10 hover:-translate-y-1">
                    <Download size={18} /> Sintetizar Manual PDF
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* =========================================================================
          🚀 UPSELL MODAL (PICO DE DOPAMINA)
          Aparece após o PDF ser extraído com sucesso
          ========================================================================= */}
      <AnimatePresence>
        {showUpsell && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="glass-panel bg-white p-10 md:p-12 rounded-[3.5rem] shadow-2xl relative z-10 max-w-2xl w-full border border-white text-center">
               
               <div className="w-20 h-20 rounded-full bg-[var(--color-atelier-terracota)]/10 border border-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-terracota)] flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Zap size={32} fill="currentColor"/>
               </div>

               <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-4">Estratégia Definida. <br/><span className="text-[var(--color-atelier-terracota)] italic">E a Execução?</span></h2>
               <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/70 leading-relaxed mb-8 max-w-lg mx-auto font-medium">
                 Você tem em mãos um manual tático de elite. No entanto, o design perfeito só ganha vida com uma gestão impecável. <br/><br/>
                 O Atelier pode assumir 100% da criação, copy e publicação da sua marca a partir de hoje. Delegue o esforço e mantenha os resultados.
               </p>

               <div className="flex flex-col gap-3">
                 <button onClick={handleAcceptUpsell} className="w-full bg-[var(--color-atelier-terracota)] text-white py-5 rounded-[1.5rem] font-bold uppercase tracking-widest text-[11px] shadow-lg hover:bg-[#8c562e] hover:-translate-y-0.5 transition-all">
                   Sim, Quero Delegar o Meu Instagram
                 </button>
                 <button onClick={() => setShowUpsell(false)} className="w-full bg-white text-[var(--color-atelier-grafite)]/50 py-4 rounded-[1.5rem] font-bold uppercase tracking-widest text-[10px] hover:text-[var(--color-atelier-grafite)] transition-colors">
                   Não, eu cuido da execução
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}