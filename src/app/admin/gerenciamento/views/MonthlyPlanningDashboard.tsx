// src/app/admin/gerenciamento/views/MonthlyPlanningDashboard.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabase";
import { AtelierPMEngine } from "../../../../lib/AtelierPMEngine"; 
import { NotificationEngine } from "../../../../lib/NotificationEngine"; // 🔔 INJEÇÃO DO MOTOR DE NOTIFICAÇÕES
import { Send, Bot, User, Maximize2, Minimize2, FileText, Loader2, Save, Calendar, Target, Zap, Link } from "lucide-react";

interface MonthlyPlanningProps {
  activeProjectId: string;
  currentProject: any;
}

export default function MonthlyPlanningDashboard({ activeProjectId, currentProject }: MonthlyPlanningProps) {
  // ==========================================
  // ESTADOS DO COPILOTO (IA)
  // ==========================================
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // ==========================================
  // ESTADOS DO EDITOR DE TEXTO (Planeamento)
  // ==========================================
  const [planHook, setPlanHook] = useState(""); 
  const [jtbdTaskName, setJtbdTaskName] = useState(""); 
  
  const [isAvulso, setIsAvulso] = useState(false); 
  const [editorContent, setEditorContent] = useState("");
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [labData, setLabData] = useState<any>(null);

  // Estados Específicos: Post Avulso
  const [planDate, setPlanDate] = useState("");
  const [planPillar, setPlanPillar] = useState("Autoridade Técnica");

  // Estados Específicos: Planeamento Mensal
  const [campaignObjective, setCampaignObjective] = useState("Brand Awareness (Alcance)");
  const [postQuantity, setPostQuantity] = useState("8 Posts/mês");

  // Inteligência de preenchimento automático para Avulsos
  useEffect(() => {
    if (isAvulso && !jtbdTaskName) {
      setJtbdTaskName("Design & Copy: Post "); 
    }
  }, [isAvulso]);

  // Efeito 1: Carregar Histórico e Rascunho
  useEffect(() => {
    fetchHistoryAndPlan();
  }, [activeProjectId]);

  const fetchHistoryAndPlan = async () => {
    try {
      const { data: chatData } = await supabase
        .from('copilot_interactions')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: true });
      if (chatData) setChatHistory(chatData);

      const { data: planData } = await supabase
        .from('content_planning')
        .select('*')
        .eq('project_id', activeProjectId)
        .eq('status', 'pending')
        .maybeSingle();

      if (planData) {
        setPlanHook(planData.hook || "");
        setPlanDate(planData.publish_date ? planData.publish_date.split('T')[0] : "");
        
        if (planData.is_avulso) {
          setIsAvulso(true);
        } else {
          setIsAvulso(false);
        }
        setPlanPillar(planData.pillar || "Autoridade Técnica");
        setEditorContent(planData.briefing || "");
      } else {
        setPlanHook(""); setJtbdTaskName(""); setPlanDate(""); setPlanPillar("Autoridade Técnica"); setEditorContent(""); setIsAvulso(false);
      }

      const { data: lab } = await supabase.from('brandbook_laboratory').select('*').eq('project_id', activeProjectId).maybeSingle();
      if (lab) setLabData(lab);

    } catch (error) {
      console.error("Erro ao carregar dados do planeamento:", error);
    }
  };

  // ==========================================
  // MOTOR DO CHATBOT COM STREAMING ATIVO E INJEÇÃO DE CONTEXTO
  // ==========================================
  const handleSendMessage = async () => {
    if (!prompt.trim()) return;
    
    const userMsg = { project_id: activeProjectId, role: 'user', content: prompt };
    setChatHistory(prev => [...prev, userMsg]);
    setPrompt("");
    setIsTyping(true);

    try {
      await supabase.from('copilot_interactions').insert(userMsg);

      // MÁGICA DA IA: Injeta as definições do painel silenciosamente no prompt para orientar a IA
      const uiContext = isAvulso 
        ? `[Diretriz do Sistema: O gestor está a pedir um POST AVULSO. Pilar: ${planPillar}.]`
        : `[Diretriz do Sistema: O gestor está a fazer um PLANEAMENTO MENSAL. Objetivo: ${campaignObjective}. Volume: ${postQuantity}. O Tema Central é: "${planHook}".]`;
      
      const enrichedPrompt = `${uiContext}\n\nPedido do utilizador: ${userMsg.content}`;

      const res = await fetch('/api/insights/content-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: enrichedPrompt, 
          labData, 
          clientName: currentProject?.profiles?.nome 
        })
      });

      if (!res.ok) throw new Error("Falha na API da IA");
      if (!res.body) throw new Error("Stream de resposta vazio");

      const aiMsg = { project_id: activeProjectId, role: 'assistant', content: "" };
      setChatHistory(prev => [...prev, aiMsg]);
      setIsTyping(false); 

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let finalResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        finalResponse += chunk;

        setChatHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1].content = finalResponse;
          return newHistory;
        });
      }

      await supabase.from('copilot_interactions').insert({
        project_id: activeProjectId,
        role: 'assistant',
        content: finalResponse
      });

    } catch (error) {
      console.error("Erro no chat:", error);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro na comunicação com a IA." }));
      setIsTyping(false);
    }
  };

  // ==========================================
  // GRAVAÇÃO E OVERWRITE
  // ==========================================
  const handleSavePlanning = async (sendToClient: boolean = false) => {
    if (sendToClient) {
      if (!planHook || !editorContent) {
        window.dispatchEvent(new CustomEvent("showToast", { detail: "Preencha o Título Principal e o Conteúdo antes de enviar." }));
        return;
      }
      if (isAvulso && !jtbdTaskName) {
        window.dispatchEvent(new CustomEvent("showToast", { detail: "Para posts avulsos, defina a Tarefa JTBD (ex: Design & Copy: Post 1)." }));
        return;
      }
    }

    setIsSaving(true);
    try {
      const newStatus = sendToClient ? 'awaiting_approval' : 'pending'; 

      const { data: existing } = await supabase
        .from('content_planning')
        .select('id')
        .eq('project_id', activeProjectId)
        .eq('status', 'pending')
        .maybeSingle();

      const payload = {
        project_id: activeProjectId,
        client_id: currentProject?.client_id,
        publish_date: isAvulso && planDate ? new Date(planDate).toISOString() : null,
        pillar: isAvulso ? planPillar : campaignObjective, // Reutiliza a coluna 'pillar' para guardar o objetivo se for mensal
        hook: planHook,
        briefing: editorContent,
        status: newStatus,
        is_avulso: isAvulso 
      };

      if (existing) {
        await supabase.from('content_planning').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('content_planning').insert(payload);
      }

      if ((AtelierPMEngine as any).syncTaskContent) {
         const targetTaskName = isAvulso ? jtbdTaskName : "Calendário Editorial";
         await (AtelierPMEngine as any).syncTaskContent(activeProjectId, targetTaskName, planHook, editorContent);
      }

      if (sendToClient) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          if (isAvulso && (AtelierPMEngine as any).triggerPostApproval) {
             await (AtelierPMEngine as any).triggerPostApproval(planHook, session.user.id);
          }
          if (!isAvulso && (AtelierPMEngine as any).triggerSystemAction) {
             await (AtelierPMEngine as any).triggerSystemAction(activeProjectId, 'planning', session.user.id);
          }
        }
        
        // 🔔 NOTIFICAÇÃO: Disparo para o Cliente
        await NotificationEngine.notifyUser(
          currentProject.client_id,
          isAvulso ? "📝 Nova Ideia de Conteúdo" : "📅 Novo Planeamento Mensal",
          isAvulso 
            ? "O estúdio enviou uma nova abordagem criativa para a sua validação." 
            : "A estratégia editorial do próximo ciclo já está disponível no seu Cockpit para aprovação.",
          "action",
          "/cockpit"
        );

        window.dispatchEvent(new CustomEvent("showToast", { detail: isAvulso ? `Post Avulso enviado! A tarefa '${jtbdTaskName}' foi fechada.` : "Planeamento enviado! Macro-Tarefa JTBD concluída." }));
        setPlanHook(""); setJtbdTaskName(""); setEditorContent(""); setPlanDate(""); setIsAvulso(false);
      } else {
        window.dispatchEvent(new CustomEvent("showToast", { detail: "Rascunho gravado e JTBD sincronizado." }));
      }

    } catch (e) {
      console.error(e);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao gravar o documento." }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px] pb-4">
      
      {/* COLUNA ESQUERDA: COPILOTO IA */}
      <div className={`transition-all duration-500 flex flex-col glass-panel bg-[var(--color-atelier-grafite)]/90 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden border border-white/10 shadow-xl shrink-0 ${isEditorExpanded ? 'hidden lg:flex lg:w-1/4 opacity-40 hover:opacity-100' : 'w-full lg:w-1/2'}`}>
        
        <div className="p-5 border-b border-white/10 bg-black/20 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 rounded-[1rem] bg-[var(--color-atelier-terracota)] flex items-center justify-center text-white shadow-inner"><Bot size={22}/></div>
          <div>
            <h3 className="font-elegant text-2xl text-white leading-none">Copiloto CMO</h3>
            <p className="text-[9px] uppercase tracking-widest text-white/50 font-bold mt-1">Baseado na Ciência de Marketing</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-4">
          {chatHistory.length === 0 && (
            <div className="m-auto text-center opacity-50 flex flex-col items-center">
              <Bot size={40} className="text-white mb-3"/>
              <p className="font-elegant text-2xl text-white">Aguardando Ordens</p>
              <p className="text-[11px] font-roboto text-white/70 max-w-[220px] mt-2">Utilize o chat para forjar estratégias e copies antes de passar para o documento.</p>
            </div>
          )}
          
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-white/20 text-white' : 'bg-[var(--color-atelier-terracota)] text-white shadow-md'}`}>
                {msg.role === 'user' ? <User size={14}/> : <Bot size={14}/>}
              </div>
              <div className={`p-4 rounded-[1.2rem] text-[13px] leading-relaxed max-w-[85%] whitespace-pre-wrap ${msg.role === 'user' ? 'bg-white/10 text-white rounded-tr-sm border border-white/5' : 'bg-white text-[var(--color-atelier-grafite)] rounded-tl-sm shadow-md font-medium'}`}>
                {msg.content}
              </div>
            </div>
          ))}

          {isTyping && (
             <div className="flex gap-3 animate-pulse">
               <div className="w-8 h-8 rounded-full bg-[var(--color-atelier-terracota)] flex items-center justify-center text-white shadow-md"><Bot size={14}/></div>
               <div className="p-4 bg-white rounded-[1.2rem] rounded-tl-sm text-[var(--color-atelier-grafite)] flex items-center gap-2"><Loader2 size={14} className="animate-spin text-[var(--color-atelier-terracota)]"/> <span className="text-[10px] font-bold uppercase tracking-widest">A processar dados...</span></div>
             </div>
          )}
        </div>

        <div className="p-5 bg-black/20 shrink-0">
          <div className="relative">
            <textarea 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Crie um gancho sobre autoridade..."
              className="w-full bg-white/5 border border-white/10 rounded-[1.2rem] py-4 pl-4 pr-14 text-white text-[13px] resize-none h-16 outline-none focus:border-[var(--color-atelier-terracota)] custom-scrollbar transition-colors"
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            />
            <button onClick={handleSendMessage} disabled={isTyping || !prompt.trim()} className="absolute right-2 top-2 bottom-2 bg-[var(--color-atelier-terracota)] text-white w-12 rounded-[1rem] hover:bg-[#8c562e] transition-colors flex items-center justify-center disabled:opacity-50 hover:-translate-y-0.5 disabled:hover:translate-y-0 shadow-sm">
              <Send size={16}/>
            </button>
          </div>
        </div>
      </div>

      {/* COLUNA DIREITA: WIDGET EXPANSÍVEL (EDITOR DE TEXTO) */}
      <div className={`transition-all duration-500 flex flex-col glass-panel bg-white/60 rounded-[2.5rem] border border-white shadow-sm overflow-hidden shrink-0 ${isEditorExpanded ? 'w-full lg:w-3/4' : 'w-full lg:w-1/2'}`}>
        
        {/* Cabeçalho do Editor */}
        <div className="p-6 border-b border-[var(--color-atelier-grafite)]/10 flex justify-between items-center shrink-0 bg-white/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[1rem] bg-white border border-white flex items-center justify-center text-[var(--color-atelier-terracota)] shadow-inner">
               <FileText size={20} />
            </div>
            <div>
              <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">Documento Base</h3>
              <p className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1.5">Editor Master de Operação</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleSavePlanning(false)} disabled={isSaving} className="px-5 py-3 bg-white/80 hover:bg-white text-[var(--color-atelier-grafite)] border border-white rounded-xl transition-all flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest shadow-sm disabled:opacity-50 hover:shadow-md hover:-translate-y-0.5">
              {isSaving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Rascunho
            </button>
            <button onClick={() => setIsEditorExpanded(!isEditorExpanded)} className="p-3 bg-white/80 hover:bg-white text-[var(--color-atelier-grafite)] border border-white rounded-xl transition-all shadow-sm hidden lg:block hover:shadow-md hover:-translate-y-0.5">
              {isEditorExpanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
            </button>
          </div>
        </div>

        {/* Inputs de Metadados Dinâmicos */}
        <div className="p-6 border-b border-[var(--color-atelier-grafite)]/5 bg-white/30 flex flex-col gap-4 shrink-0">
          
          <div className="flex flex-col gap-1.5">
            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5">
              <Target size={12}/> {isAvulso ? "Gancho Editorial (Hook)" : "Tema da Campanha / Foco Mensal"}
            </span>
            <input 
              type="text" 
              placeholder={isAvulso ? "Ex: 3 erros silenciosos que estão a destruir o seu negócio..." : "Ex: Mês de Autoridade em Logística"} 
              value={planHook} 
              onChange={(e) => setPlanHook(e.target.value)} 
              className="w-full bg-white border border-transparent rounded-[1.2rem] p-3.5 text-[14px] font-bold text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm transition-colors" 
            />
          </div>

          {/* Sincronização JTBD (Só em Avulso) */}
          {isAvulso && (
            <div className="flex flex-col gap-1.5">
              <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-orange-600 ml-1 flex items-center gap-1.5">
                <Link size={12}/> Nome Exato da Tarefa (Sincronização JTBD)
              </span>
              <input 
                type="text" 
                placeholder="Ex: Design & Copy: Post 1" 
                value={jtbdTaskName} 
                onChange={(e) => setJtbdTaskName(e.target.value)} 
                className="w-full bg-orange-50 border border-orange-100 rounded-[1.2rem] p-3.5 text-[13px] font-bold text-orange-800 outline-none focus:border-orange-400 shadow-sm transition-colors placeholder:text-orange-300" 
              />
            </div>
          )}
          
          <div className="flex flex-col md:flex-row gap-4">
            
            {/* Modalidade (Sempre Visível) */}
            <div className="flex flex-col gap-1.5 w-full md:w-1/3">
              <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5"><Zap size={12}/> Modalidade</span>
              <select 
                value={isAvulso ? "avulso" : "mensal"} 
                onChange={(e) => setIsAvulso(e.target.value === "avulso")} 
                className="w-full bg-white border border-transparent rounded-[1.2rem] p-3 text-[13px] text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm font-bold cursor-pointer transition-colors"
              >
                <option value="mensal">Planeamento Mensal</option>
                <option value="avulso">Conteúdo Avulso</option>
              </select>
            </div>

            {/* Alternância Dinâmica de Campos (Mensal vs Avulso) */}
            {!isAvulso ? (
              <>
                <div className="flex flex-col gap-1.5 w-full md:w-1/3">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5"><Target size={12}/> Objetivo</span>
                  <select 
                    value={campaignObjective} 
                    onChange={(e) => setCampaignObjective(e.target.value)} 
                    className="w-full bg-white border border-transparent rounded-[1.2rem] p-3 text-[13px] text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm cursor-pointer font-medium transition-colors"
                  >
                    <option>Brand Awareness (Alcance)</option>
                    <option>Geração de Leads</option>
                    <option>Venda Direta (Conversão)</option>
                    <option>Engajamento & Comunidade</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 w-full md:w-1/3">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5"><Calendar size={12}/> Volume de Posts</span>
                  <select 
                    value={postQuantity} 
                    onChange={(e) => setPostQuantity(e.target.value)} 
                    className="w-full bg-white border border-transparent rounded-[1.2rem] p-3 text-[13px] text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm cursor-pointer font-medium transition-colors"
                  >
                    <option>4 Posts/mês</option>
                    <option>8 Posts/mês</option>
                    <option>12 Posts/mês</option>
                    <option>16 Posts/mês</option>
                    <option>30 Posts/mês</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5 w-full md:w-1/3">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5"><Calendar size={12}/> Publicação</span>
                  <input 
                    type="date" 
                    value={planDate} 
                    onChange={(e) => setPlanDate(e.target.value)} 
                    className="w-full bg-white border border-transparent rounded-[1.2rem] p-3 text-[13px] text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm cursor-pointer font-medium transition-colors" 
                  />
                </div>

                <div className="flex flex-col gap-1.5 w-full md:w-1/3">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5"><FileText size={12}/> Pilar Estratégico</span>
                  <select 
                    value={planPillar} 
                    onChange={(e) => setPlanPillar(e.target.value)} 
                    className="w-full bg-white border border-transparent rounded-[1.2rem] p-3 text-[13px] text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm cursor-pointer font-medium transition-colors"
                  >
                    <option>Autoridade Técnica</option>
                    <option>Cultura e Bastidores</option>
                    <option>Status e Lifestyle</option>
                    <option>Comunidade e Pertencimento</option>
                    <option>Promocional / Venda Direta</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Área de Redação */}
        <div className="flex-1 p-0 relative min-h-[250px]">
          <textarea
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            placeholder="Redija a estratégia criativa e o copywriting aqui..."
            className="w-full h-full p-8 text-[14px] text-[var(--color-atelier-grafite)] leading-loose resize-none outline-none bg-transparent custom-scrollbar font-medium placeholder-[var(--color-atelier-grafite)]/30"
          />
        </div>

        <div className="p-6 border-t border-[var(--color-atelier-grafite)]/5 bg-white/60 shrink-0 flex justify-end">
          <button 
            onClick={() => handleSavePlanning(true)} 
            disabled={isSaving || !planHook || !editorContent}
            className={`px-8 py-4 text-white rounded-[1.2rem] text-[11px] font-bold uppercase tracking-[0.15em] transition-all flex items-center gap-3 shadow-md hover:shadow-lg disabled:opacity-50 hover:-translate-y-0.5 disabled:hover:translate-y-0
              ${isAvulso ? 'bg-[var(--color-atelier-terracota)] hover:bg-[#8c562e]' : 'bg-[var(--color-atelier-grafite)] hover:bg-black'}
            `}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} 
            {isAvulso ? "Enviar Post" : "Enviar Planeamento"}
          </button>
        </div>

      </div>

    </div>
  );
}