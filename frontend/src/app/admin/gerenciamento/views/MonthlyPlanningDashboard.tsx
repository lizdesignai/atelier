// src/app/admin/gerenciamento/views/MonthlyPlanningDashboard.tsx
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../../lib/supabase";
import { AtelierPMEngine } from "../../../../lib/AtelierPMEngine"; 
import { NotificationEngine } from "../../../../lib/NotificationEngine";
import { Send, FileText, Loader2, Save, Calendar, Target, Zap, Link, Play } from "lucide-react";

interface MonthlyPlanningProps {
  activeProjectId: string;
  currentProject: any;
}

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function MonthlyPlanningDashboard({ activeProjectId, currentProject }: MonthlyPlanningProps) {
  
  // ==========================================
  // ESTADOS DO EDITOR DE TEXTO (Planejamento)
  // ==========================================
  const [planId, setPlanId] = useState<string | null>(null); 
  const [currentPlanStatus, setCurrentPlanStatus] = useState<string>("pending");
  
  const [planHook, setPlanHook] = useState(""); 
  const [jtbdTaskName, setJtbdTaskName] = useState(""); 
  
  const [isAvulso, setIsAvulso] = useState(false); 
  const [editorContent, setEditorContent] = useState("");
  
  // Estados de Loading
  const [isSaving, setIsSaving] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  // Estados Específicos: Post Pontual
  const [planDate, setPlanDate] = useState("");
  const [planPillar, setPlanPillar] = useState("Autoridade Técnica");

  // Estados Específicos: Planejamento Mensal
  const [campaignObjective, setCampaignObjective] = useState("Brand Awareness (Alcance)");
  const [postQuantity, setPostQuantity] = useState("8 Posts/mês");

  // Inteligência de preenchimento automático para Pontuais
  useEffect(() => {
    if (isAvulso && !jtbdTaskName) {
      setJtbdTaskName("Design & Copy: Post "); 
    }
  }, [isAvulso, jtbdTaskName]);

  // Carregar Rascunho ou Documento Enviado (Otimizado com useCallback)
  const fetchPlan = useCallback(async () => {
    if (!activeProjectId) return;
    
    try {
      // 🟢 OTIMIZAÇÃO: Busca tanto o rascunho quanto o que já foi enviado ao cliente
      const { data: planData, error } = await supabase
        .from('content_planning')
        .select('*')
        .eq('project_id', activeProjectId)
        .in('status', ['pending', 'awaiting_approval']) 
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Erro no fetchPlan:", error);
      }

      if (planData) {
        setPlanId(planData.id);
        setCurrentPlanStatus(planData.status);
        setPlanHook(planData.hook || "");
        setPlanDate(planData.publish_date ? planData.publish_date.split('T')[0] : "");
        
        if (planData.is_avulso) {
          setIsAvulso(true);
          setPlanPillar(planData.pillar || "Autoridade Técnica");
        } else {
          setIsAvulso(false);
          // Decodifica a string concatenada "Objetivo - Quantidade"
          if (planData.pillar && planData.pillar.includes(' - ')) {
              const [obj, qty] = planData.pillar.split(' - ');
              setCampaignObjective(obj.trim());
              setPostQuantity(qty.trim());
          } else {
              setCampaignObjective(planData.pillar || "Brand Awareness (Alcance)");
              setPostQuantity("8 Posts/mês"); // Valor padrão caso não tenha sido salvo antes
          }
        }
        setEditorContent(planData.briefing || "");
      } else {
        // Reseta tudo se não houver rascunho
        setPlanId(null);
        setCurrentPlanStatus("pending");
        setPlanHook(""); setJtbdTaskName(""); setPlanDate(""); setPlanPillar("Autoridade Técnica"); setEditorContent(""); setIsAvulso(false);
      }
    } catch (error) {
      console.error("Erro crítico ao carregar dados do planejamento:", error);
    }
  }, [activeProjectId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // ==========================================
  // GRAVAÇÃO E OVERWRITE (SALVAR/ENVIAR)
  // ==========================================
  const handleSavePlanning = async (sendToClient: boolean = false) => {
    if (sendToClient) {
      if (!planHook || !editorContent) {
        showToast("Preencha a Linha Editorial e o Conteúdo antes de enviar.");
        return;
      }
      if (isAvulso && !jtbdTaskName) {
        showToast("Para posts pontuais, defina a Sincronização de Tarefa (ex: Design & Copy: Post 1).");
        return;
      }
    }

    setIsSaving(true);
    try {
      const newStatus = sendToClient ? 'awaiting_approval' : 'pending'; 

      const payload = {
        project_id: activeProjectId,
        client_id: currentProject?.client_id,
        publish_date: isAvulso && planDate ? new Date(planDate).toISOString() : null,
        // 🟢 SERIALIZAÇÃO: Une objetivo e quantidade para o Motor ler depois
        pillar: isAvulso ? planPillar : `${campaignObjective} - ${postQuantity}`, 
        hook: planHook,
        briefing: editorContent,
        status: newStatus,
        is_avulso: isAvulso 
      };

      if (planId) {
        await supabase.from('content_planning').update(payload).eq('id', planId);
      } else {
        const { data, error } = await supabase.from('content_planning').insert(payload).select().single();
        if (error) throw error;
        if (data) setPlanId(data.id);
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
          isAvulso ? "📝 Nova Ideia de Conteúdo" : "📅 Novo Planejamento Mensal",
          isAvulso 
            ? "A equipe enviou uma nova abordagem criativa para a sua aprovação." 
            : "A estratégia editorial do próximo ciclo já está disponível no seu painel para aprovação.",
          "action",
          "/meu-espaco"
        );

        showToast(isAvulso ? `Arte pontual enviada com sucesso!` : "Planejamento enviado com sucesso!");
        await fetchPlan(); // Atualiza tela para mostrar o Badge "Aguardando Cliente"
      } else {
        showToast("Rascunho salvo com sucesso.");
        await fetchPlan(); // Recarrega para garantir que o planId está no state
      }

    } catch (e) {
      console.error(e);
      showToast("Erro ao salvar o documento.");
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // 🚀 AÇÃO DIRETA: CRIAR E DESPACHAR PARA O ANALYTICS (ADMIN OVERRIDE)
  // Cria, salva, aprova e gera as tarefas no Analytics num único clique.
  // ==========================================
  const handleDirectDeployToAnalytics = async () => {
    if (!planHook || !editorContent) {
      showToast("Erro: Preencha o Tema e o Conteúdo base antes de despachar para a equipe.");
      return;
    }
    
    if (!window.confirm("As tarefas correspondentes a este planejamento serão enviadas imediatamente para a fila de Produção (Analytics). Deseja confirmar?")) return;
    
    setIsDeploying(true);
    try {
      showToast("A sincronizar com a esteira de produção...");
      
      const payload = {
        project_id: activeProjectId,
        client_id: currentProject?.client_id,
        publish_date: isAvulso && planDate ? new Date(planDate).toISOString() : null,
        pillar: isAvulso ? planPillar : `${campaignObjective} - ${postQuantity}`, 
        hook: planHook,
        briefing: editorContent,
        status: 'approved', // Aprova instantaneamente para sair do rascunho
        is_avulso: isAvulso 
      };

      let finalPlanId = planId;

      // 1. Garante que o documento existe no banco e captura o ID final
      if (planId) {
        const { error } = await supabase.from('content_planning').update(payload).eq('id', planId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('content_planning').insert(payload).select().single();
        if (error) throw error;
        finalPlanId = data.id;
        setPlanId(data.id);
      }

      if (!finalPlanId) throw new Error("Falha Crítica: ID do planejamento não encontrado.");

      // 2. Aciona a inteligência do motor sênior para fatiar e injetar no Analytics
      const { data: { session } } = await supabase.auth.getSession();
      await AtelierPMEngine.deployApprovedPlanningToTasks(finalPlanId, activeProjectId, session?.user?.id);
      
      showToast("✅ Sucesso Absoluto! Tarefas geradas e visíveis no Analytics.");
      
      // 3. Limpa a tela para a próxima criação
      setPlanId(null);
      setPlanHook("");
      setEditorContent("");
      setCurrentPlanStatus("pending");
      await fetchPlan(); 

    } catch (error: any) {
      console.error(error);
      showToast(`Erro na integração com o Analytics: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[600px] pb-4">
      <div className="flex flex-col glass-panel bg-white/60 rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-full">
        
        {/* ==========================================
            CABEÇALHO DO EDITOR
            ========================================== */}
        <div className="p-6 border-b border-[var(--color-atelier-grafite)]/10 flex justify-between items-center shrink-0 bg-white/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[1rem] bg-white border border-white flex items-center justify-center text-[var(--color-atelier-terracota)] shadow-inner">
               <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">Documento Base</h3>
                {/* 🟢 Badge de Status */}
                {currentPlanStatus === 'awaiting_approval' && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-[9px] uppercase tracking-widest font-bold shadow-sm">
                    Aguardando Cliente
                  </span>
                )}
              </div>
              <p className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1.5">
                Criação e Gestão de Pautas
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleSavePlanning(false)} 
              disabled={isSaving || isDeploying} 
              className="px-6 py-3 bg-white/80 hover:bg-white text-[var(--color-atelier-grafite)] border border-white rounded-xl transition-all flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest shadow-sm disabled:opacity-50 hover:shadow-md hover:-translate-y-0.5"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Salvar Rascunho
            </button>
          </div>
        </div>

        {/* ==========================================
            METADADOS DINÂMICOS
            ========================================== */}
        <div className="p-6 border-b border-[var(--color-atelier-grafite)]/5 bg-white/30 flex flex-col gap-5 shrink-0">
          
          <div className="flex flex-col gap-2">
            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5">
              <Target size={12}/> {isAvulso ? "Linha Editorial (Tema)" : "Tema da Campanha / Foco Mensal"}
            </span>
            <input 
              type="text" 
              placeholder={isAvulso ? "Ex: Post Carrossel: 3 Dicas de Vendas" : "Ex: Mês de Autoridade em Logística"} 
              value={planHook} 
              onChange={(e) => setPlanHook(e.target.value)} 
              className="w-full bg-white border border-transparent rounded-[1.2rem] p-4 text-[14px] font-bold text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm transition-colors" 
            />
          </div>

          {isAvulso && (
            <div className="flex flex-col gap-2">
              <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-orange-600 ml-1 flex items-center gap-1.5">
                <Link size={12}/> Sincronização de Tarefa
              </span>
              <input 
                type="text" 
                placeholder="Ex: Design & Copy: Post 1" 
                value={jtbdTaskName} 
                onChange={(e) => setJtbdTaskName(e.target.value)} 
                className="w-full bg-orange-50 border border-orange-100 rounded-[1.2rem] p-4 text-[13px] font-bold text-orange-800 outline-none focus:border-orange-400 shadow-sm transition-colors placeholder:text-orange-300" 
              />
            </div>
          )}
          
          <div className="flex flex-col md:flex-row gap-5">
            <div className="flex flex-col gap-2 w-full md:w-1/3">
              <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5"><Zap size={12}/> Modalidade</span>
              <select 
                value={isAvulso ? "avulso" : "mensal"} 
                onChange={(e) => setIsAvulso(e.target.value === "avulso")} 
                className="w-full bg-white border border-transparent rounded-[1.2rem] p-4 text-[13px] text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm font-bold cursor-pointer transition-colors"
              >
                <option value="mensal">Criar Lote de Posts (Mês)</option>
                <option value="avulso">Criar Tarefa/Post Único</option>
              </select>
            </div>

            {!isAvulso ? (
              <>
                <div className="flex flex-col gap-2 w-full md:w-1/3">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5"><Target size={12}/> Objetivo Geral</span>
                  <select 
                    value={campaignObjective} 
                    onChange={(e) => setCampaignObjective(e.target.value)} 
                    className="w-full bg-white border border-transparent rounded-[1.2rem] p-4 text-[13px] text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm cursor-pointer font-medium transition-colors"
                  >
                    <option>Brand Awareness (Alcance)</option>
                    <option>Geração de Leads</option>
                    <option>Venda Direta (Conversão)</option>
                    <option>Engajamento & Comunidade</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2 w-full md:w-1/3">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5"><Calendar size={12}/> Volume de JTBD (Tarefas a Gerar)</span>
                  <select 
                    value={postQuantity} 
                    onChange={(e) => setPostQuantity(e.target.value)} 
                    className="w-full bg-white border border-transparent rounded-[1.2rem] p-4 text-[13px] text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm cursor-pointer font-medium transition-colors"
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
                <div className="flex flex-col gap-2 w-full md:w-1/3">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5"><Calendar size={12}/> Data de Publicação Prevista</span>
                  <input 
                    type="date" 
                    value={planDate} 
                    onChange={(e) => setPlanDate(e.target.value)} 
                    className="w-full bg-white border border-transparent rounded-[1.2rem] p-4 text-[13px] text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm cursor-pointer font-medium transition-colors" 
                  />
                </div>

                <div className="flex flex-col gap-2 w-full md:w-1/3">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5"><FileText size={12}/> Pilar Estratégico & Formato</span>
                  <select 
                    value={planPillar} 
                    onChange={(e) => setPlanPillar(e.target.value)} 
                    className="w-full bg-white border border-transparent rounded-[1.2rem] p-4 text-[13px] text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm cursor-pointer font-medium transition-colors"
                  >
                    <option>Post / Autoridade</option>
                    <option>Post / Bastidores</option>
                    <option>Vídeo / Reels Curto</option>
                    <option>Vídeo / Conteúdo Denso</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ==========================================
            ÁREA DE REDAÇÃO (O BRIEFING EM SI)
            ========================================== */}
        <div className="flex-1 p-0 relative min-h-[300px]">
          <textarea
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            placeholder="Descreva as instruções completas, legendas ou roteiros que a equipe vai receber..."
            className="w-full h-full p-8 text-[14px] text-[var(--color-atelier-grafite)] leading-loose resize-none outline-none bg-transparent custom-scrollbar font-medium placeholder-[var(--color-atelier-grafite)]/30"
          />
        </div>

        {/* ==========================================
            RODAPÉ DE AÇÕES (DESPACHO DIRETO E ENVIO)
            ========================================== */}
        <div className="p-6 border-t border-[var(--color-atelier-grafite)]/5 bg-white/60 shrink-0 flex flex-col md:flex-row justify-end gap-4">
          
          <button 
            onClick={() => handleSavePlanning(true)} 
            disabled={isSaving || isDeploying || !planHook || !editorContent}
            className={`px-8 py-5 text-white rounded-[1.2rem] text-[10px] font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg disabled:opacity-50 hover:-translate-y-0.5 disabled:hover:translate-y-0
              ${isAvulso ? 'bg-[var(--color-atelier-terracota)] hover:bg-[#8c562e]' : 'bg-[var(--color-atelier-grafite)] hover:bg-black'}
            `}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} 
            Enviar ao Cliente para Aprovação
          </button>

          {/* O BOTÃO TRATOR - DESPACHA DIRETO PARA O ANALYTICS E GERA AS TASKS */}
          <button 
            onClick={handleDirectDeployToAnalytics} 
            disabled={isDeploying || isSaving || !planHook || !editorContent}
            className="px-10 py-5 bg-green-600 text-white rounded-[1.2rem] text-[11px] font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg disabled:opacity-50 hover:-translate-y-0.5 hover:bg-green-700"
          >
            {isDeploying ? <Loader2 size={18} className="animate-spin"/> : <Play size={18} fill="currentColor"/>} 
            Aprovar Forçadamente (Lançar no JTBD)
          </button>

        </div>

      </div>
    </div>
  );
}