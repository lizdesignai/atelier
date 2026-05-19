// src/app/admin/gerenciamento/views/MonthlyPlanningDashboard.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabase";
import { AtelierPMEngine } from "../../../../lib/AtelierPMEngine"; 
import { NotificationEngine } from "../../../../lib/NotificationEngine";
import { Send, FileText, Loader2, Save, Calendar, Target, Zap, Link } from "lucide-react";

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
  const [planHook, setPlanHook] = useState(""); 
  const [jtbdTaskName, setJtbdTaskName] = useState(""); 
  
  const [isAvulso, setIsAvulso] = useState(false); 
  const [editorContent, setEditorContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
  }, [isAvulso]);

  // Efeito 1: Carregar Rascunho Atual
  useEffect(() => {
    fetchPlan();
  }, [activeProjectId]);

  const fetchPlan = async () => {
    try {
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
    } catch (error) {
      console.error("Erro ao carregar dados do planejamento:", error);
    }
  };

  // ==========================================
  // GRAVAÇÃO E OVERWRITE
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
          isAvulso ? "📝 Nova Ideia de Conteúdo" : "📅 Novo Planejamento Mensal",
          isAvulso 
            ? "A equipe enviou uma nova abordagem criativa para a sua aprovação." 
            : "A estratégia editorial do próximo ciclo já está disponível no seu painel para aprovação.",
          "action",
          "/meu-espaco"
        );

        showToast(isAvulso ? `Arte pontual enviada com sucesso!` : "Planejamento enviado com sucesso!");
        
        // Limpar o formulário para a próxima criação
        setPlanHook(""); 
        setJtbdTaskName(""); 
        setEditorContent(""); 
        setPlanDate(""); 
        setIsAvulso(false);
      } else {
        showToast("Rascunho salvo com sucesso.");
      }

    } catch (e) {
      console.error(e);
      showToast("Erro ao salvar o documento.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[600px] pb-4">
      
      {/* ==========================================
          ÁREA ÚNICA: EDITOR DE TEXTO EXPANDIDO
          ========================================== */}
      <div className="flex flex-col glass-panel bg-white/60 rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-full">
        
        {/* Cabeçalho do Editor */}
        <div className="p-6 border-b border-[var(--color-atelier-grafite)]/10 flex justify-between items-center shrink-0 bg-white/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[1rem] bg-white border border-white flex items-center justify-center text-[var(--color-atelier-terracota)] shadow-inner">
               <FileText size={20} />
            </div>
            <div>
              <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">Documento Base</h3>
              <p className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 mt-1.5">
                Editor de Roteiro e Copy
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleSavePlanning(false)} 
              disabled={isSaving} 
              className="px-6 py-3 bg-white/80 hover:bg-white text-[var(--color-atelier-grafite)] border border-white rounded-xl transition-all flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest shadow-sm disabled:opacity-50 hover:shadow-md hover:-translate-y-0.5"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Salvar Rascunho
            </button>
          </div>
        </div>

        {/* Inputs de Metadados Dinâmicos */}
        <div className="p-6 border-b border-[var(--color-atelier-grafite)]/5 bg-white/30 flex flex-col gap-5 shrink-0">
          
          <div className="flex flex-col gap-2">
            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5">
              <Target size={12}/> {isAvulso ? "Linha Editorial (Tema)" : "Tema da Campanha / Foco Mensal"}
            </span>
            <input 
              type="text" 
              placeholder={isAvulso ? "Ex: 3 erros silenciosos que estão destruindo o seu negócio..." : "Ex: Mês de Autoridade em Logística"} 
              value={planHook} 
              onChange={(e) => setPlanHook(e.target.value)} 
              className="w-full bg-white border border-transparent rounded-[1.2rem] p-4 text-[14px] font-bold text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm transition-colors" 
            />
          </div>

          {/* Sincronização JTBD (Só em Avulso) */}
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
            
            {/* Modalidade (Sempre Visível) */}
            <div className="flex flex-col gap-2 w-full md:w-1/3">
              <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5"><Zap size={12}/> Modalidade</span>
              <select 
                value={isAvulso ? "avulso" : "mensal"} 
                onChange={(e) => setIsAvulso(e.target.value === "avulso")} 
                className="w-full bg-white border border-transparent rounded-[1.2rem] p-4 text-[13px] text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm font-bold cursor-pointer transition-colors"
              >
                <option value="mensal">Planejamento Mensal</option>
                <option value="avulso">Conteúdo Pontual</option>
              </select>
            </div>

            {/* Alternância Dinâmica de Campos (Mensal vs Avulso) */}
            {!isAvulso ? (
              <>
                <div className="flex flex-col gap-2 w-full md:w-1/3">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5"><Target size={12}/> Objetivo</span>
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
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5"><Calendar size={12}/> Volume de Posts</span>
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
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5"><Calendar size={12}/> Publicação</span>
                  <input 
                    type="date" 
                    value={planDate} 
                    onChange={(e) => setPlanDate(e.target.value)} 
                    className="w-full bg-white border border-transparent rounded-[1.2rem] p-4 text-[13px] text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm cursor-pointer font-medium transition-colors" 
                  />
                </div>

                <div className="flex flex-col gap-2 w-full md:w-1/3">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5"><FileText size={12}/> Pilar Estratégico</span>
                  <select 
                    value={planPillar} 
                    onChange={(e) => setPlanPillar(e.target.value)} 
                    className="w-full bg-white border border-transparent rounded-[1.2rem] p-4 text-[13px] text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm cursor-pointer font-medium transition-colors"
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
        <div className="flex-1 p-0 relative min-h-[300px]">
          <textarea
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            placeholder="Redija a estratégia criativa e o copywriting aqui..."
            className="w-full h-full p-8 text-[14px] text-[var(--color-atelier-grafite)] leading-loose resize-none outline-none bg-transparent custom-scrollbar font-medium placeholder-[var(--color-atelier-grafite)]/30"
          />
        </div>

        {/* Rodapé e Ação de Envio */}
        <div className="p-6 border-t border-[var(--color-atelier-grafite)]/5 bg-white/60 shrink-0 flex justify-end">
          <button 
            onClick={() => handleSavePlanning(true)} 
            disabled={isSaving || !planHook || !editorContent}
            className={`px-10 py-5 text-white rounded-[1.2rem] text-[11px] font-bold uppercase tracking-[0.15em] transition-all flex items-center gap-3 shadow-md hover:shadow-lg disabled:opacity-50 hover:-translate-y-0.5 disabled:hover:translate-y-0
              ${isAvulso ? 'bg-[var(--color-atelier-terracota)] hover:bg-[#8c562e]' : 'bg-[var(--color-atelier-grafite)] hover:bg-black'}
            `}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} 
            {isAvulso ? "Enviar Post" : "Enviar Planejamento"}
          </button>
        </div>

      </div>
    </div>
  );
}