// src/app/admin/clientes/views/ClientSettingsModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, User, Mail, Phone, Instagram, Briefcase, 
  Target, Sparkles, Save, Loader2, LineChart, 
  BrainCircuit, CheckCircle2, DollarSign, Activity,
  Clock, CheckSquare, UploadCloud, FileText, Camera, FolderOpen, FileUp, Link
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ClientSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientProfile: any; 
}

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function ClientSettingsModal({ isOpen, onClose, clientProfile }: ClientSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'financial' | 'metrics' | 'consulting'>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingContract, setIsUploadingContract] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [leadRecordId, setLeadRecordId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: "", email: "", telefone: "", empresa: "", instagram: "", nicho: "", avatar_url: "", contract_url: ""
  });

  const [clientStats, setClientStats] = useState({
    totalLTV: 0, activeMRR: 0, totalTasks: 0, completedTasks: 0,
    hoursWorked: 0, briefingStatus: "Pendente", activeProjects: 0, assetsCount: 0
  });

  const [consultingData, setConsultingData] = useState({
    brand_archetype: "", visual_diagnosis: "", tone_of_voice: "",
    stories_strategy: "", content_pillars: "", strategic_justification: "", market_positioning: ""
  });

  useEffect(() => {
    if (!isOpen || !clientProfile) return;

    const fetchAllClientData = async () => {
      setIsLoading(true);
      try {
        // Popula base inicial
        setFormData(prev => ({
          ...prev,
          nome: clientProfile.nome || "",
          email: clientProfile.email || "",
          telefone: clientProfile.telefone || "",
          empresa: clientProfile.empresa || "",
          instagram: clientProfile.instagram || "",
          nicho: clientProfile.nicho || "",
          avatar_url: clientProfile.avatar_url || ""
        }));

        // 1. Busca Dados Profundos (Leads e Projetos) com Proteção contra Undefined
        let leadPromise: PromiseLike<any> = Promise.resolve({ data: null });
        if (clientProfile.email || clientProfile.instagram) {
          const queryFilters = [];
          if (clientProfile.email) queryFilters.push(`email.eq.${clientProfile.email}`);
          if (clientProfile.instagram) queryFilters.push(`instagram.eq.${clientProfile.instagram}`);
          
          leadPromise = supabase.from('leads')
            .select('*').or(queryFilters.join(','))
            .order('created_at', { ascending: false }).limit(1).maybeSingle();
        }

        const [ { data: lead }, { data: projects } ] = await Promise.all([
          leadPromise,
          supabase.from('projects').select('*').eq('client_id', clientProfile.id)
        ]);

        if (lead) {
          setLeadRecordId(lead.id);
          setFormData(prev => ({ ...prev, telefone: lead.telefone || prev.telefone, instagram: lead.instagram || prev.instagram, nicho: lead.nicho || prev.nicho }));
          if (lead.ai_brand_archetype) {
            setConsultingData({
              brand_archetype: lead.ai_brand_archetype || "", visual_diagnosis: lead.ai_visual_diagnosis || "",
              tone_of_voice: lead.ai_tone_of_voice || "", stories_strategy: lead.ai_stories_strategy || "",
              content_pillars: Array.isArray(lead.ai_content_pillars) ? lead.ai_content_pillars.join('\n') : (lead.ai_content_pillars || ""),
              strategic_justification: lead.strategic_justification || "", market_positioning: lead.market_positioning || ""
            });
          }
        }

        // 2. Extração de Métricas de Projetos
        let ltv = 0; let mrr = 0; let activeProj = 0; let latestProjectId = null;
        
        projects?.forEach(p => {
          if (p.status === 'active' || p.status === 'delivered') { activeProj++; latestProjectId = p.id; }
          if (p.payment_recurrence === 'Mensal' && p.status === 'active') mrr += Number(p.financial_value || 0);
          else ltv += Number(p.financial_value || 0); 
        });

        if (latestProjectId) setActiveProjectId(latestProjectId);
        
        const activeProjData = projects?.find(p => p.id === latestProjectId);
        if (activeProjData?.contract_url) {
          setFormData(prev => ({ ...prev, contract_url: activeProjData.contract_url }));
        }

        // 3. Busca Tarefas e Cofre
        const [ { data: tasks }, { data: briefings }, { data: assets } ] = await Promise.all([
          supabase.from('tasks').select('status, estimated_time').eq('client_id', clientProfile.id),
          supabase.from('instagram_briefings').select('status').eq('client_id', clientProfile.id).order('created_at', { ascending: false }).limit(1),
          supabase.from('project_assets').select('id').eq('project_id', latestProjectId || clientProfile.id) 
        ]);

        let tTasks = 0; let cTasks = 0; let hWorked = 0;
        tasks?.forEach(t => {
          tTasks++;
          if (t.status === 'completed' || t.status === 'approved') { cTasks++; hWorked += Number(t.estimated_time || 0); }
        });

        setClientStats({
          totalLTV: ltv + (mrr * 3), activeMRR: mrr, totalTasks: tTasks, completedTasks: cTasks,
          hoursWorked: Math.round(hWorked / 60), 
          briefingStatus: briefings && briefings.length > 0 ? (briefings[0].status === 'returned' ? 'Devolvido' : 'Concluído') : 'Pendente',
          activeProjects: activeProj, assetsCount: assets?.length || 0
        });

      } catch (error) {
        console.error("Erro ao agregar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllClientData();
  }, [isOpen, clientProfile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'contract') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAvatar = type === 'avatar';
    isAvatar ? setIsUploadingAvatar(true) : setIsUploadingContract(true);
    showToast(`A enviar ${isAvatar ? 'fotografia' : 'contrato'}...`);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}s/${clientProfile.id}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('vault_assets').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('vault_assets').getPublicUrl(fileName);
      
      if (isAvatar) {
        setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', clientProfile.id);
      } else {
        setFormData(prev => ({ ...prev, contract_url: publicUrl }));
        if (activeProjectId) {
          await supabase.from('projects').update({ contract_url: publicUrl }).eq('id', activeProjectId);
        }
      }
      showToast(`${isAvatar ? 'Fotografia' : 'Contrato'} atualizado(a)!`);
    } catch (error) {
      showToast("Erro ao carregar ficheiro.");
    } finally {
      isAvatar ? setIsUploadingAvatar(false) : setIsUploadingContract(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    showToast("A selar dados no cofre central...");

    try {
      // 🟢 Validação de Segurança Anti-Crash
      if (!clientProfile?.id) {
         throw new Error("ID do Perfil Ausente. Por favor, recarregue a página.");
      }

      // Grava Perfil Básico e expõe erros reais da DB
      const { error: profileError } = await supabase.from('profiles').update({
        nome: formData.nome, telefone: formData.telefone, empresa: formData.empresa,
        instagram: formData.instagram, nicho: formData.nicho
      }).eq('id', clientProfile.id);

      if (profileError) throw new Error(`Erro DB Profiles: ${profileError.message}`);

      if (consultingData.brand_archetype || formData.instagram || formData.email) {
        
        // Asseguramos que o email é o identificador mestre.
        const targetEmail = formData.email || clientProfile.email;

        if (targetEmail) {
          const leadPayload = {
            email: targetEmail, // Usado para matching de conflito
            nome: formData.nome, 
            telefone: formData.telefone, 
            instagram: formData.instagram, 
            nicho: formData.nicho,
            status: 'contacted', // Define o status caso seja criado agora
            ai_brand_archetype: consultingData.brand_archetype, 
            ai_visual_diagnosis: consultingData.visual_diagnosis,
            ai_tone_of_voice: consultingData.tone_of_voice, 
            ai_stories_strategy: consultingData.stories_strategy,
            ai_content_pillars: consultingData.content_pillars ? consultingData.content_pillars.split('\n').filter(Boolean) : [],
            strategic_justification: consultingData.strategic_justification, 
            market_positioning: consultingData.market_positioning
          };

          // O '.upsert' diz: Tenta inserir. Se houver conflito na coluna 'email', faz update em vez de dar erro.
          const { data, error: leadErr } = await supabase
            .from('leads')
            .upsert(leadPayload, { onConflict: 'email' }) 
            .select()
            .single();

          if (leadErr) throw new Error(`Erro DB Leads (Upsert): ${leadErr.message}`);
          if (data) setLeadRecordId(data.id);
        }
      }

      showToast("✨ Dossiê guardado e selado com sucesso!");
      setTimeout(() => { onClose(); window.location.reload(); }, 1200); 
    } catch (error: any) {
      console.error("Erro Crítico no Save:", error);
      showToast(`Ação bloqueada: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunConsulting = async () => {
    if (!formData.instagram || !formData.nicho) {
      showToast("O @Instagram e o Nicho devem estar preenchidos no perfil.");
      setActiveTab('profile'); return;
    }
    setIsGenerating(true);
    showToast("Oráculo ativado. Aguarde 30s...");

    try {
      const res = await fetch('/api/consultoria/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: formData.nome, instagram: formData.instagram, nicho: formData.nicho })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setConsultingData({
        brand_archetype: data.insight.brand_archetype || "", visual_diagnosis: data.insight.visual_diagnosis || "",
        tone_of_voice: data.insight.tone_of_voice || "", stories_strategy: data.insight.stories_strategy || "",
        content_pillars: data.insight.content_pillars?.join('\n') || "",
        strategic_justification: data.insight.strategic_justification || "", market_positioning: data.insight.market_positioning || ""
      });
      showToast("Estratégia forjada! Reveja e clique em Gravar.");
    } catch (error: any) {
      showToast(`Erro na IA: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;
  const hasConsultingData = consultingData.brand_archetype !== "";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[var(--color-atelier-grafite)]/80 backdrop-blur-md cursor-pointer"
        />
        
        {/* LAYOUT MASTER-DETAIL EXECUTIVO */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          className="relative w-full max-w-[1200px] h-[90vh] bg-white rounded-[2rem] shadow-[0_30px_80px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden border border-white/20"
        >
          {/* SIDEBAR ESQUERDA FIXA */}
          <aside className="w-full md:w-[280px] bg-gray-50/50 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col shrink-0 z-20">
            <div className="p-8 flex flex-col items-center text-center shrink-0">
              <div className="relative group cursor-pointer mb-5" onClick={() => fileInputRef.current?.click()}>
                <div className="w-28 h-28 rounded-[2rem] bg-white text-[var(--color-atelier-terracota)] flex items-center justify-center font-elegant text-4xl shadow-sm border border-gray-100 overflow-hidden transition-transform group-hover:scale-105">
                  {formData.avatar_url ? <img src={formData.avatar_url} className="w-full h-full object-cover" alt=""/> : formData.nome.charAt(0)}
                </div>
                <div className="absolute inset-0 bg-black/50 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  {isUploadingAvatar ? <Loader2 size={24} className="animate-spin text-white" /> : <Camera size={24} className="text-white" />}
                </div>
                <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, 'avatar')} className="hidden" accept="image/*" />
              </div>
              <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-tight">{formData.nome || "Cliente"}</h2>
              <p className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mt-2 bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm inline-flex items-center gap-1.5">
                <Target size={10}/> {formData.nicho || "Nicho Indefinido"}
              </p>
            </div>

            <div className="flex-1 p-4 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              <SidebarButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={User} label="Dossiê Cadastral" />
              <SidebarButton active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} icon={Activity} label="Hub Operacional" />
              <SidebarButton active={activeTab === 'financial'} onClick={() => setActiveTab('financial')} icon={DollarSign} label="Contratos & Upload" />
              <div className="hidden md:block h-px w-full bg-gray-100 my-2"></div>
              <SidebarButton active={activeTab === 'consulting'} onClick={() => setActiveTab('consulting')} icon={BrainCircuit} label="Auditoria (IA)" highlight={hasConsultingData} />
            </div>
          </aside>

          {/* ÁREA PRINCIPAL ROLÁVEL */}
          <main className="flex-1 flex flex-col relative bg-[#F8F9FA] overflow-hidden">
            
            <header className="h-20 px-10 border-b border-gray-100 flex justify-between items-center shrink-0 bg-white/60 backdrop-blur-xl z-10">
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                {activeTab === 'profile' && 'Dossiê Cadastral'}
                {activeTab === 'financial' && 'Gestão Contratual'}
                {activeTab === 'metrics' && 'Business Intelligence'}
                {activeTab === 'consulting' && 'Cérebro Semiótico (CMO)'}
              </h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shadow-sm border border-gray-100">
                <X size={16} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 pb-32">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>
              ) : (
                <AnimatePresence mode="wait">
                  
                  {/* TAB: PROFILE */}
                  {activeTab === 'profile' && (
                    <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
                      <div className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col gap-5 hover:border-[var(--color-atelier-terracota)]/20 transition-colors">
                        <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] border-b border-gray-50 pb-3">Identidade Base</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <InputGroup label="Nome Completo" icon={User} value={formData.nome} onChange={(e:any)=>setFormData({...formData, nome: e.target.value})} />
                          <InputGroup label="E-mail Principal" icon={Mail} value={formData.email} onChange={(e:any)=>setFormData({...formData, email: e.target.value})} disabled />
                          <InputGroup label="WhatsApp / Telefone" icon={Phone} value={formData.telefone} onChange={(e:any)=>setFormData({...formData, telefone: e.target.value})} />
                          <InputGroup label="Nome da Empresa" icon={Briefcase} value={formData.empresa} onChange={(e:any)=>setFormData({...formData, empresa: e.target.value})} />
                        </div>
                      </div>
                      <div className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col gap-5 hover:border-[var(--color-atelier-terracota)]/20 transition-colors">
                        <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] border-b border-gray-50 pb-3">Telemetria Digital</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <InputGroup label="Instagram (@)" icon={Instagram} value={formData.instagram} onChange={(e:any)=>setFormData({...formData, instagram: e.target.value})} placeholder="@usuario" />
                          <InputGroup label="Nicho de Atuação" icon={Target} value={formData.nicho} onChange={(e:any)=>setFormData({...formData, nicho: e.target.value})} placeholder="Ex: Estética Avançada" />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB: METRICS (Hub Operacional) */}
                  {activeTab === 'metrics' && (
                    <motion.div key="metrics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard icon={CheckSquare} title="Peças Produzidas" value={clientStats.completedTasks} subtitle={`de ${clientStats.totalTasks} tarefas`} color="green" />
                        <MetricCard icon={Clock} title="Horas Trabalhadas" value={clientStats.hoursWorked} subtitle="Investimento real" color="terracota" />
                        <MetricCard icon={FolderOpen} title="Captações (Cofre)" value={clientStats.assetsCount} subtitle="Ficheiros disponíveis" color="purple" />
                        <MetricCard icon={FileText} title="Status Dossiê" value={clientStats.briefingStatus} subtitle="Briefing do cliente" color="blue" />
                      </div>
                    </motion.div>
                  )}

                  {/* TAB: FINANCIAL */}
                  {activeTab === 'financial' && (
                    <motion.div key="financial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[var(--color-atelier-grafite)] p-10 rounded-[2rem] shadow-xl text-white flex flex-col justify-between">
                          <div>
                            <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-white/50 block mb-2">Total Pago (LTV Estimado)</span>
                            <div className="flex items-start gap-1">
                              <span className="text-xl font-bold text-white/40 mt-1">R$</span>
                              <h3 className="font-elegant text-5xl leading-none">{clientStats.totalLTV.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                            </div>
                          </div>
                          <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
                            <span className="text-[11px] font-roboto font-medium text-white/60">Contratos + MRR Acumulado</span>
                            <LineChart size={18} className="text-[var(--color-atelier-terracota)]"/>
                          </div>
                        </div>

                        <div className="bg-white p-10 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between">
                          <div>
                            <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] block mb-2">Receita Mensal Recorrente (MRR Ativo)</span>
                            <div className="flex items-start gap-1">
                              <span className="text-xl font-bold text-[var(--color-atelier-grafite)]/40 mt-1">R$</span>
                              <h3 className="font-elegant text-5xl text-[var(--color-atelier-grafite)] leading-none">{clientStats.activeMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                            </div>
                          </div>
                          <div className="mt-8 pt-4 border-t border-[var(--color-atelier-grafite)]/5 flex items-center justify-between">
                            <span className="text-[11px] font-roboto font-medium text-[var(--color-atelier-grafite)]/50">{clientStats.activeProjects} Contrato(s) Ativos</span>
                            <DollarSign size={18} className="text-green-500"/>
                          </div>
                        </div>
                      </div>

                      {/* UPLOAD DE CONTRATO (NOVA SECÇÃO SOLICITADA) */}
                      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm mt-4 flex flex-col gap-4">
                        <h4 className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] border-b border-gray-50 pb-3 flex items-center gap-2"><FileText size={14}/> Contrato Legal (PDF)</h4>
                        <div className="flex items-center gap-6">
                          {formData.contract_url ? (
                            <div className="flex-1 bg-green-50 border border-green-100 p-4 rounded-xl flex items-center justify-between">
                              <span className="text-[12px] font-bold text-green-700 flex items-center gap-2"><CheckCircle2 size={16}/> Contrato Arquivado no Cofre</span>
                              <a href={formData.contract_url} target="_blank" rel="noreferrer" className="bg-white text-green-700 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-green-100 transition-colors flex items-center gap-2 border border-green-200 shadow-sm"><Link size={12}/> Abrir PDF</a>
                            </div>
                          ) : (
                            <div className="flex-1 bg-gray-50 border border-gray-100 p-4 rounded-xl flex items-center justify-between">
                              <span className="text-[12px] font-medium text-gray-500">Nenhum contrato associado.</span>
                            </div>
                          )}
                          <label className="shrink-0 bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)] px-6 py-3.5 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest cursor-pointer transition-all shadow-sm flex items-center gap-2">
                             <input type="file" onChange={(e) => handleFileUpload(e, 'contract')} accept=".pdf,.doc,.docx" className="hidden" />
                             {isUploadingContract ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />} {formData.contract_url ? 'Substituir' : 'Anexar Ficheiro'}
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB: CONSULTORIA IA */}
                  {activeTab === 'consulting' && (
                    <motion.div key="consulting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-6">
                      {!hasConsultingData && !isGenerating ? (
                        <div className="bg-white/60 border border-white p-12 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-sm mt-4">
                          <BrainCircuit size={48} className="text-[var(--color-atelier-grafite)]/20 mb-6" />
                          <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">Sem Auditoria Estratégica</h3>
                          <p className="font-roboto text-[13px] font-medium text-[var(--color-atelier-grafite)]/60 max-w-md mb-8 leading-relaxed">
                            O perfil deve ter o @Instagram preenchido. O Motor IA aplicará semiótica e resposta direta para forjar um plano.
                          </p>
                          <button onClick={handleRunConsulting} className="px-8 bg-[var(--color-atelier-terracota)] text-white py-3.5 rounded-[1rem] font-roboto font-bold uppercase tracking-[0.1em] text-[11px] hover:bg-[#8c562e] hover:-translate-y-0.5 transition-all shadow-md flex items-center justify-center gap-2">
                            <Sparkles size={14} /> Inicializar Oráculo CMO
                          </button>
                        </div>
                      ) : isGenerating ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="w-20 h-20 bg-[var(--color-atelier-terracota)]/10 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-inner animate-pulse">
                            <Loader2 size={32} className="text-[var(--color-atelier-terracota)] animate-spin" />
                          </div>
                          <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">Sintetizando Dados...</h2>
                          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 font-medium">A cruzar frameworks de Resposta Direta e Design Semiótico (30s).</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-6">
                          <div className="bg-[var(--color-atelier-grafite)] p-8 rounded-[2rem] shadow-lg text-white flex justify-between items-center relative overflow-hidden">
                            <div className="relative z-10">
                              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)] mb-1 block flex items-center gap-2"><Sparkles size={12}/> Auditoria Ativa</span>
                              <h3 className="font-elegant text-3xl leading-none">Dossiê de Posicionamento</h3>
                            </div>
                            <button onClick={handleRunConsulting} className="relative z-10 bg-white/10 hover:bg-white text-white hover:text-[var(--color-atelier-grafite)] px-5 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all border border-white/20 flex items-center gap-2 backdrop-blur-sm">
                              Regenerar Estratégia
                            </button>
                          </div>

                          <TextareaGroup label="Justificativa Estratégica (Oceano Azul)" value={consultingData.strategic_justification} onChange={(val:string)=>setConsultingData({...consultingData, strategic_justification: val})} rows={6} />
                          <TextareaGroup label="Posicionamento de Mercado" value={consultingData.market_positioning} onChange={(val:string)=>setConsultingData({...consultingData, market_positioning: val})} rows={4} />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col gap-2">
                              <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] pl-1">Arquétipo de Marca</label>
                              <input value={consultingData.brand_archetype} onChange={(e)=>setConsultingData({...consultingData, brand_archetype: e.target.value})} className="w-full bg-gray-50 rounded-xl p-3.5 text-[13px] font-bold text-[var(--color-atelier-grafite)] outline-none border border-transparent focus:border-[var(--color-atelier-terracota)]/40 shadow-inner" />
                            </div>
                            <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col gap-2">
                              <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] pl-1">Tom de Voz</label>
                              <textarea value={consultingData.tone_of_voice} onChange={(e)=>setConsultingData({...consultingData, tone_of_voice: e.target.value})} className="w-full bg-transparent text-[13px] leading-relaxed font-medium text-[var(--color-atelier-grafite)] outline-none resize-none h-20 custom-scrollbar" />
                            </div>
                          </div>

                          <TextareaGroup label="Diagnóstico Visual e Estético" value={consultingData.visual_diagnosis} onChange={(val:string)=>setConsultingData({...consultingData, visual_diagnosis: val})} rows={4} />
                          <TextareaGroup label="Dinâmica de Stories (Conversão)" value={consultingData.stories_strategy} onChange={(val:string)=>setConsultingData({...consultingData, stories_strategy: val})} rows={4} />
                          <TextareaGroup label="Pilares de Conteúdo (Um por linha)" value={consultingData.content_pillars} onChange={(val:string)=>setConsultingData({...consultingData, content_pillars: val})} rows={4} />
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* ACTION BAR (COMPACTA - BOTTOM RIGHT) */}
            <div className="absolute bottom-8 right-8 flex items-center gap-3 z-50 p-2 bg-white/80 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
              <button onClick={onClose} className="px-6 py-3 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={isSaving || isGenerating} className="px-8 bg-[var(--color-atelier-grafite)] text-white py-3 rounded-xl font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-[var(--color-atelier-terracota)] transition-all shadow-md disabled:opacity-50 flex items-center gap-2">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Gravar
              </button>
            </div>
            
          </main>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Sub-Componentes UI
function SidebarButton({ active, onClick, icon: Icon, label, highlight = false }: any) {
  return (
    <button onClick={onClick} className={`p-4 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest flex items-center justify-between whitespace-nowrap transition-all ${active ? 'bg-white text-[var(--color-atelier-grafite)] shadow-sm border border-gray-100' : 'hover:bg-white/50 text-gray-500 border border-transparent'}`}>
      <div className="flex items-center gap-3"><Icon size={16} className={active ? 'text-[var(--color-atelier-terracota)]' : (highlight ? 'text-[var(--color-atelier-terracota)]' : 'text-gray-400')}/> {label}</div>
      {highlight && !active && <CheckCircle2 size={14} className="text-green-500 hidden md:block"/>}
    </button>
  );
}

function InputGroup({ label, icon: Icon, value, onChange, disabled = false, placeholder = "" }: any) {
  return (
    <div className="flex flex-col gap-1.5 group/input">
      <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-500 pl-1">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors"><Icon size={16}/></span>
        <input disabled={disabled} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1rem] py-3.5 pl-11 pr-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all disabled:opacity-60 disabled:bg-gray-100" />
      </div>
    </div>
  );
}

function TextareaGroup({ label, value, onChange, rows = 4 }: any) {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col gap-4 group/edit transition-colors hover:border-[var(--color-atelier-terracota)]/20">
      <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] border-b border-gray-50 pb-3">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full bg-transparent text-[13px] leading-relaxed text-[var(--color-atelier-grafite)] font-medium outline-none resize-none custom-scrollbar" />
    </div>
  );
}

function MetricCard({ icon: Icon, title, value, subtitle, color }: any) {
  const colors = { green: 'text-green-600 bg-green-50 border-green-100', terracota: 'text-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/10 border-[var(--color-atelier-terracota)]/20', blue: 'text-blue-600 bg-blue-50 border-blue-100', purple: 'text-purple-600 bg-purple-50 border-purple-100' };
  return (
    <div className="bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col items-center text-center justify-center gap-2 hover:-translate-y-1 transition-transform cursor-default">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner mb-2 ${colors[color as keyof typeof colors]}`}><Icon size={20} /></div>
      <h4 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none">{value}</h4>
      <div><span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-gray-700 block">{title}</span><span className="font-roboto text-[9px] font-medium text-gray-400 mt-1 block">{subtitle}</span></div>
    </div>
  );
}