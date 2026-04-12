// src/app/admin/gerenciamento/views/BrandIdentity.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabase";
import { 
  FileText, Target, Download, BrainCircuit, Loader2, RotateCcw
} from "lucide-react";
import { pdf } from '@react-pdf/renderer';
import InstagramBriefingPDF from "../../../../components/pdf/InstagramBriefingPDF";
import BrandbookPDF from "../../../../components/pdf/BrandbookPDF";
import { NotificationEngine } from "../../../../lib/NotificationEngine"; // 🔔 INJEÇÃO DO MOTOR DE NOTIFICAÇÕES

// Dicionários locais para traduzir as escolhas do cliente no painel
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

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

interface BrandIdentityProps {
  activeProjectId: string;
  currentProject: any;
}

export default function BrandIdentity({ activeProjectId, currentProject }: BrandIdentityProps) {
  // Estados isolados apenas para este módulo
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [briefing, setBriefing] = useState<any>(null);
  const [labData, setLabData] = useState<any>(null);

  // 1. CARREGAMENTO ISOLADO E BLINDADO (Lazy Fetching)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (!activeProjectId && !currentProject?.client_id) return;

        // 1. Busca do Briefing Inicial (Protegido contra sintaxe falha de IS NULL)
        let foundBriefing = null;
        
        if (activeProjectId) {
          const { data: briefByProj } = await supabase
            .from('instagram_briefings')
            .select('*')
            .eq('project_id', activeProjectId)
            // Forma correta e segura de excluir devolvidos ou apanhar nulos
            .not('status', 'eq', 'returned') 
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (briefByProj) foundBriefing = briefByProj;
        }

        // Se não encontrou pelo projeto, procura pelo Cliente
        if (!foundBriefing && currentProject?.client_id) {
          const { data: briefByClient } = await supabase
            .from('instagram_briefings')
            .select('*')
            .eq('client_id', currentProject.client_id)
            .not('status', 'eq', 'returned')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (briefByClient) foundBriefing = briefByClient;
        }

        setBriefing(foundBriefing);

        // 2. Busca do Laboratório da Marca (Procura Redundante)
        let foundLab = null;
        
        if (activeProjectId) {
          const { data: labByProj } = await supabase
            .from('brandbook_laboratory')
            .select('*')
            .eq('project_id', activeProjectId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (labByProj) foundLab = labByProj;
        }

        // Se não encontrou pelo projeto (comum se o cliente submeteu sem o projeto estar 100% linkado)
        if (!foundLab && currentProject?.client_id) {
          const { data: labByClient } = await supabase
            .from('brandbook_laboratory')
            .select('*')
            .eq('client_id', currentProject.client_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (labByClient) foundLab = labByClient;
        }
        
        setLabData(foundLab);

      } catch (error) {
        console.error("Erro ao carregar Identidade da Marca:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeProjectId, currentProject]);

  // 2. FUNÇÃO: DEVOLVER BRIEFING (Com disparo de Notificação Automática)
  const handleReturnBriefing = async () => {
    if (!briefing || !window.confirm("Tem certeza que deseja devolver este briefing ao cliente para ser refeito?")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('instagram_briefings')
        .update({ status: 'returned' })
        .eq('id', briefing.id);
        
      if (error) throw error;

      // DISPARO DE E-MAIL
      const clientEmail = currentProject?.profiles?.email;
      if (clientEmail) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: clientEmail,
            type: 'briefing_returned',
            clientName: currentProject.profiles.nome?.split(' ')[0] || 'Cliente',
            projectName: currentProject.profiles.nome || 'o seu projeto'
          })
        });
      }

      // 🔔 NOTIFICAÇÃO: Tocar sino do Cliente (In-App)
      if (currentProject?.client_id) {
         await NotificationEngine.notifyUser(
           currentProject.client_id,
           "⚠️ Briefing Devolvido (Revisão Necessária)",
           "O Estúdio solicita mais profundidade nas suas respostas. Por favor, reveja e reenvie o seu Dossiê de Marca.",
           "action",
           "/cockpit"
         );
      }
      
      showToast("Briefing devolvido. O cliente foi notificado por e-mail e painel.");
      setBriefing(null); // Limpa da tela instantaneamente
    } catch (e) {
      showToast("Erro ao devolver briefing.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. FUNÇÃO: COMPILAR IA
  const handleGenerateSourceCode = async () => {
    if (!labData) { showToast("O cliente ainda não preencheu o Laboratório."); return; }
    setIsProcessing(true);
    try {
      const res = await fetch('/api/insights/instagram', {
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
      if (data.error) throw new Error(data.error);
      
      await supabase.from('brandbook_laboratory').update({ ai_source_code: data.insight }).eq('id', labData.id);
      await supabase.from('projects').update({ instagram_ai_insight: data.insight }).eq('id', activeProjectId);
      
      setLabData({ ...labData, ai_source_code: data.insight });

      // 🔔 NOTIFICAÇÃO: Liderança
      await NotificationEngine.notifyManagement(
        "🧠 Dossiê IA Compilado",
        `A Inteligência Artificial completou o perfil matricial do projeto de ${currentProject.profiles?.nome}.`,
        "success",
        "/admin/gerenciamento"
      );

      showToast("Código-Fonte CMO Compilado! ✨");
    } catch (e) { 
      showToast("Erro ao processar a IA."); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  // 4. GERAÇÃO DE PDFS
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
      link.href = url; link.download = `Brandbook_${currentProject.profiles?.nome}.pdf`;
      link.click();
    } catch (error) {
      showToast("Erro ao gerar PDF do Brandbook.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center glass-panel bg-white/40 rounded-2xl border border-white">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full overflow-hidden pb-4">
      
      {/* =========================================================
          COLUNA ESQUERDA: BRIEFING INICIAL
          ========================================================= */}
      <div className="w-full xl:w-1/2 flex flex-col h-full overflow-hidden">
        <div className="glass-panel bg-white/60 p-8 rounded-[2.5rem] border border-white shadow-sm flex flex-col h-full relative overflow-hidden transition-colors hover:bg-white/80">
           
           <div className="flex flex-wrap justify-between items-center border-b border-[var(--color-atelier-grafite)]/10 pb-6 mb-6 shrink-0 gap-4">
             <div>
               <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Briefing de Operação</h2>
               <p className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1 font-bold">Dados de entrada do cliente</p>
             </div>
             <div className="flex gap-2">
               <button onClick={handleReturnBriefing} disabled={!briefing || isProcessing} className="bg-red-50 text-red-600 px-4 py-2.5 rounded-[1rem] text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50">
                 {isProcessing ? <Loader2 size={14} className="animate-spin"/> : <RotateCcw size={14}/>} Devolver
               </button>
               <button onClick={handleDownloadBriefingPDF} disabled={!briefing} className="bg-[var(--color-atelier-grafite)] text-white px-5 py-2.5 rounded-[1rem] text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-all flex items-center gap-2 shadow-md disabled:opacity-50 hover:-translate-y-0.5">
                 <Download size={14}/> PDF
               </button>
             </div>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
             {!briefing ? (
               <div className="flex flex-col items-center justify-center h-full opacity-40 py-10">
                 <FileText size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
                 <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Briefing Ausente</p>
                 <p className="font-roboto text-[12px] text-center mt-2 max-w-sm font-medium">O cliente ainda não preencheu o formulário ou o documento foi devolvido para revisão.</p>
               </div>
             ) : (
               <div className="flex flex-col gap-5 pb-6">
                 {/* CORREÇÃO: Leitura direcionada ao JSON answers que o Modal salvou */}
                 <div className="bg-white/80 p-6 rounded-[1.5rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm transition-all hover:shadow-md">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] block mb-2">Visão do Negócio (O Núcleo & Endgame)</span>
                   <p className="text-[13px] text-[var(--color-atelier-grafite)]/80 leading-relaxed whitespace-pre-wrap font-medium">
                     {briefing.answers?.produto_ancora ? `Produto Âncora: ${briefing.answers.produto_ancora}\n\nGatilho de Compra: ${briefing.answers.gatilho_compra === 'Outro' ? briefing.answers.gatilho_compra_outro : briefing.answers.gatilho_compra}\n\nPonto de Chegada (Endgame): ${briefing.answers.ponto_chegada}` : (briefing.business_vision || "Não preenchido.")}
                   </p>
                 </div>
                 
                 <div className="bg-white/80 p-6 rounded-[1.5rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm transition-all hover:shadow-md">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] block mb-2">Público-Alvo (Cliente Ideal)</span>
                   <p className="text-[13px] text-[var(--color-atelier-grafite)]/80 leading-relaxed whitespace-pre-wrap font-medium">
                     {briefing.answers?.cliente_ideal || briefing.target_audience || "Não preenchido."}
                   </p>
                 </div>
                 
                 <div className="bg-white/80 p-6 rounded-[1.5rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm transition-all hover:shadow-md">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] block mb-2">Concorrentes (Inimigo Comum)</span>
                   <p className="text-[13px] text-[var(--color-atelier-grafite)]/80 leading-relaxed whitespace-pre-wrap font-medium">
                     {briefing.answers?.inimigo_comum || briefing.competitors || "Não preenchido."}
                   </p>
                 </div>
                 
                 <div className="bg-white/80 p-6 rounded-[1.5rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm transition-all hover:shadow-md">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] block mb-2">Diferencial (Padrão de Excelência)</span>
                   <p className="text-[13px] text-[var(--color-atelier-grafite)]/80 leading-relaxed whitespace-pre-wrap font-medium">
                     {briefing.answers?.padrao_excelencia || briefing.unique_value || "Não preenchido."}
                   </p>
                 </div>
                 
                 <div className="bg-white/80 p-6 rounded-[1.5rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm transition-all hover:shadow-md">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] block mb-2">Referências, Estilo e Voz</span>
                   <p className="text-[13px] text-[var(--color-atelier-grafite)]/80 leading-relaxed whitespace-pre-wrap font-medium">
                     {briefing.answers?.persona_marca ? `Persona da Marca: ${briefing.answers.persona_marca}\n\nEstado do Arsenal Visual: ${briefing.answers.arsenal_visual}` : (briefing.references || "Não preenchido.")}
                   </p>
                 </div>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* =========================================================
          COLUNA DIREITA: DNA DA MARCA (O Laboratório)
          ========================================================= */}
      <div className="w-full xl:w-1/2 flex flex-col h-full overflow-hidden">
        <div className="flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-6">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/60 p-6 md:p-8 rounded-[2.5rem] border border-white shadow-sm shrink-0 gap-4 transition-colors hover:bg-white/80">
             <div>
               <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">DNA da Marca (Lab)</h2>
               <p className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 mt-1.5 uppercase tracking-widest font-bold">Laboratório de Expressão do Cliente.</p>
             </div>
             <div className="flex gap-2 w-full md:w-auto">
               <button onClick={handleGenerateSourceCode} disabled={isProcessing || !labData} className="flex-1 md:flex-none px-5 py-3 bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] rounded-[1rem] font-roboto text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-colors hover:-translate-y-0.5 disabled:hover:translate-y-0">
                 {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />} Compilar IA
               </button>
               <button onClick={handleDownloadBrandbookPDF} disabled={!labData} className="flex-1 md:flex-none px-5 py-3 bg-white/80 border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/60 hover:bg-[var(--color-atelier-terracota)] hover:text-white rounded-[1rem] font-roboto text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 transition-colors hover:border-transparent">
                 <Download size={14} /> Brandbook
               </button>
             </div>
          </div>

          {!labData ? (
             <div className="glass-panel bg-white/40 border border-white p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center h-[300px] shadow-sm shrink-0 opacity-60">
               <Target size={48} className="text-[var(--color-atelier-terracota)] mb-4" />
               <p className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Laboratório Vazio</p>
               <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60 mt-2 font-medium">Aguardando o preenchimento do Brandbook pelo cliente.</p>
             </div>
          ) : (
            <>
              {labData.ai_source_code && (
                <div className="bg-[var(--color-atelier-creme)]/60 p-6 md:p-8 rounded-[2.5rem] border border-[var(--color-atelier-terracota)]/20 shadow-inner shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mb-4 block flex items-center gap-1.5"><BrainCircuit size={12}/> Estratégia Extraída (CMO)</span>
                  <div className="text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed whitespace-pre-wrap font-medium">
                    {labData.ai_source_code}
                  </div>
                </div>
              )}

              {/* Matriz e Semiótica em Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
                <div className="glass-panel bg-white/60 p-6 rounded-[2rem] border border-white shadow-sm transition-colors hover:bg-white/80">
                  <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] mb-4 border-b border-[var(--color-atelier-grafite)]/10 pb-3">1. Matriz de Alocação</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center text-xs border-b border-[var(--color-atelier-grafite)]/5 pb-2"><span className="font-bold text-[var(--color-atelier-grafite)]/80">Autoridade Técnica</span> <span className="text-[var(--color-atelier-terracota)] font-bold text-[14px]">{labData.tilt_technical}%</span></div>
                    <div className="flex justify-between items-center text-xs border-b border-[var(--color-atelier-grafite)]/5 pb-2"><span className="font-bold text-[var(--color-atelier-grafite)]/80">Cultura/Operação</span> <span className="text-[var(--color-atelier-terracota)] font-bold text-[14px]">{labData.tilt_culture}%</span></div>
                    <div className="flex justify-between items-center text-xs border-b border-[var(--color-atelier-grafite)]/5 pb-2"><span className="font-bold text-[var(--color-atelier-grafite)]/80">Status/Lifestyle</span> <span className="text-[var(--color-atelier-terracota)] font-bold text-[14px]">{labData.tilt_status}%</span></div>
                    <div className="flex justify-between items-center text-xs"><span className="font-bold text-[var(--color-atelier-grafite)]/80">Comunidade/Tribo</span> <span className="text-[var(--color-atelier-terracota)] font-bold text-[14px]">{labData.tilt_community}%</span></div>
                  </div>
                </div>

                <div className="glass-panel bg-white/60 p-6 rounded-[2rem] border border-white shadow-sm transition-colors hover:bg-white/80">
                  <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] mb-4 border-b border-[var(--color-atelier-grafite)]/10 pb-3">2. Semiótica Visual</h3>
                  <div className="flex flex-col gap-3">
                    {Object.entries(labData.semiotics_choices || {}).map(([key, val]) => (
                      <div key={key} className="text-xs">
                        <span className="font-bold uppercase text-[9px] text-[var(--color-atelier-grafite)]/40 block mb-0.5">{SEMIOTICS_MAP[key] ? key : key}</span>
                        <span className="text-[var(--color-atelier-terracota)] font-bold">{SEMIOTICS_MAP[key]?.[val as 'A'|'B'] || (val as string)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tom de Voz */}
              <div className="glass-panel bg-white/60 p-6 rounded-[2.5rem] border border-white shadow-sm shrink-0 transition-colors hover:bg-white/80">
                <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] mb-4 border-b border-[var(--color-atelier-grafite)]/10 pb-3">3. Teatro de Operações (Voz)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(labData.voice_scenarios || {}).map(([key, val]) => (
                    <div key={key} className="text-xs bg-white/80 p-4 rounded-[1.2rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm">
                      <span className="font-bold uppercase text-[8px] text-[var(--color-atelier-grafite)]/40 block mb-1.5">Cenário: {key === 'price' ? 'Objeção de Preço' : key === 'failure' ? 'Gestão de Crise' : 'Celebração'}</span>
                      <span className="text-[var(--color-atelier-terracota)] font-bold text-[13px] leading-tight block">{VOICE_MAP[val as string] || (val as string)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cofre Visual */}
              {labData.synapses_vault && labData.synapses_vault.length > 0 && (
                <div className="glass-panel bg-white/60 p-6 rounded-[2.5rem] border border-white shadow-sm shrink-0 transition-colors hover:bg-white/80">
                  <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] mb-4 border-b border-[var(--color-atelier-grafite)]/10 pb-3">4. Gatilhos Visuais</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {labData.synapses_vault.map((syn: any, i: number) => (
                      <div key={i} className="relative rounded-[1.2rem] overflow-hidden shadow-sm aspect-square group border border-white">
                        <img src={syn.url} className="w-full h-full object-cover" alt="ref" />
                        <div className="absolute inset-0 bg-black/70 p-3 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                          <Target size={16} className="text-[var(--color-atelier-terracota)] mb-1" />
                          <p className="text-white text-[9px] text-center italic font-medium leading-relaxed">"{syn.reason}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

    </div>
  );
}