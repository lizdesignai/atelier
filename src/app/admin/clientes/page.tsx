// src/app/admin/clientes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Search, Filter, Plus, ArrowRight, 
  Mail, Building, Calendar, MoreVertical, 
  CheckCircle2, Clock, AlertCircle, X, Edit2, Trash2, Ban, Loader2,
  DollarSign, Briefcase, CreditCard, RotateCcw, Percent, Sparkles
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useGlobalStore } from "../../../contexts/GlobalStore"; // 🧠 INJEÇÃO DA MEMÓRIA GLOBAL

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ============================================================================
// DICIONÁRIOS DO SISTEMA ZERO-TOUCH & PIPELINES (Espelhado do Analytics)
// ============================================================================
const IDV_PIPELINE = [
  { stage: "Setup & Onboarding", type: "setup", title: "Formulário de cadastro & Contrato", daysOffset: 0, estTime: 30 },
  { stage: "Setup & Onboarding", type: "setup", title: "Pagamento", daysOffset: 1, estTime: 15 },
  { stage: "Imersão", type: "reuniao", title: "Reunião de briefing", daysOffset: 2, estTime: 60 },
  { stage: "Imersão", type: "copy", title: "Formulário de briefing detalhado", daysOffset: 3, estTime: 30 },
  { stage: "Exploração", type: "design", title: "Estudo da marca, Concorrentes & Moodboard", daysOffset: 5, estTime: 180 },
  { stage: "Exploração", type: "copy", title: "Envio de Direcionamento Criativo", daysOffset: 6, estTime: 30 },
  { stage: "Design Sprint", type: "design", title: "Testes de Fontes e Modificações", daysOffset: 8, estTime: 120 },
  { stage: "Design Sprint", type: "design", title: "Testes de Símbolos & Paletas", daysOffset: 10, estTime: 180 },
  { stage: "Design Sprint", type: "design", title: "Montagem dos Mockups & Extras", daysOffset: 13, estTime: 240 },
  { stage: "Apresentação", type: "design", title: "Montagem de Apresentação Final", daysOffset: 15, estTime: 120 },
  { stage: "Apresentação", type: "reuniao", title: "Reunião de Apresentação", daysOffset: 16, estTime: 60 },
  { stage: "Handover", type: "design", title: "Fechamento de Arquivos e Envio Drive", daysOffset: 18, estTime: 60 }
];

const IG_SETUP = [
  { stage: "Setup Inicial", type: "setup", title: "Assinatura do contrato & Pagamento", daysOffset: 0, estTime: 30 },
  { stage: "Imersão", type: "reuniao", title: "Reunião de briefing", daysOffset: 2, estTime: 60 },
  { stage: "Estratégia", type: "copy", title: "Estudo de marca, Persona, Tom de voz", daysOffset: 5, estTime: 180 },
  { stage: "Estratégia", type: "design", title: "Alinhamento Visual (Estilo do Feed)", daysOffset: 7, estTime: 120 },
];

const IG_PACKAGES: Record<string, any[]> = {
  "Pacote 1": [
    { stage: "Copywriting", type: "copy", title: "Roteirização de 6 Vídeos", daysOffset: 10, estTime: 120 },
    ...Array.from({length: 6}).map((_, i) => ({ stage: "Produção de Vídeo", type: "video", title: `Edição de Vídeo ${i+1} + Capa`, daysOffset: 12 + i, estTime: 60 })),
    { stage: "Aprovação", type: "setup", title: "Aprovação do Cliente & Agendamento", daysOffset: 18, estTime: 45 }
  ],
  "Pacote 2": [
    { stage: "Copywriting", type: "copy", title: "Revisão de Texto enviado pelo Cliente", daysOffset: 10, estTime: 30 },
    ...Array.from({length: 4}).map((_, i) => ({ stage: "Design Gráfico", type: "design", title: `Design de Post/Carrossel ${i+1}`, daysOffset: 12 + i, estTime: 60 })),
    { stage: "Aprovação", type: "setup", title: "Aprovação & Agendamento", daysOffset: 16, estTime: 45 }
  ],
  "Pacote 3": [
    { stage: "Estratégia", type: "copy", title: "Calendário Editorial de Conteúdos", daysOffset: 10, estTime: 90 },
    ...Array.from({length: 8}).map((_, i) => ({ stage: "Produção de Arte", type: "design", title: `Design & Copy: Post ${i+1}`, daysOffset: 12 + (i * 0.5), estTime: 60 })),
    { stage: "Aprovação", type: "setup", title: "Agendamento Sistêmico", daysOffset: 18, estTime: 60 },
    { stage: "Relatório", type: "setup", title: "Geração de Relatório Mensal", daysOffset: 30, estTime: 60 }
  ],
  "Pacote 4": [
    { stage: "Estratégia", type: "copy", title: "Calendário Editorial & Organização de Perfil", daysOffset: 10, estTime: 120 },
    { stage: "Estratégia", type: "setup", title: "Análise de Perfil", daysOffset: 12, estTime: 60 },
    ...Array.from({length: 12}).map((_, i) => ({ stage: "Produção de Arte", type: "design", title: `Design & Copy: Post ${i+1}`, daysOffset: 13 + (i * 0.5), estTime: 60 })),
    { stage: "Produção Contínua", type: "copy", title: "Criação de Roteiros Diários de Stories", daysOffset: 20, estTime: 180 },
    { stage: "Relatório", type: "setup", title: "Relatório Mensal Profundo", daysOffset: 30, estTime: 90 }
  ]
};

export default function BaseClientesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); 

  // 🧠 CONSUMO DIRETO DA MEMÓRIA GLOBAL (Substitui a query lenta de projetos)
  const { activeProjects, isGlobalLoading, refreshGlobalData } = useGlobalStore();

  // Estados Locais Modificados
  const [enrichedProjects, setEnrichedProjects] = useState<any[]>([]);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados dos Modais e Menus
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // ==========================================
  // ESTADOS: CRIAR NOVO PROJETO
  // ==========================================
  const [selectedClientId, setSelectedClientId] = useState("");
  const [serviceType, setServiceType] = useState<"Identidade Visual" | "Gestão de Instagram">("Identidade Visual");
  const [projectPackage, setProjectPackage] = useState("Identidade Visual Premium");
  const [financialValue, setFinancialValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Transferência Bancária");
  const [paymentRecurrence, setPaymentRecurrence] = useState("Único");
  const [paymentSplit, setPaymentSplit] = useState("50/50");
  const [billingDate, setBillingDate] = useState("");

  // ==========================================
  // ESTADOS: EDITAR PROJETO FINANCEIRO
  // ==========================================
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<any>(null);
  const [editFinancialValue, setEditFinancialValue] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editPaymentSplit, setEditPaymentSplit] = useState("");
  const [editBillingDate, setEditBillingDate] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // ==========================================
  // BUSCAR DADOS PARALELOS (READ)
  // ==========================================
  useEffect(() => {
    if (isGlobalLoading) return;

    const fetchLocalData = async () => {
      setIsLocalLoading(true);
      try {
        // Disparamos as tarefas e a lista de clientes em paralelo
        const [ { data: tasksData }, { data: clientsData } ] = await Promise.all([
          supabase.from('tasks').select('project_id, status'),
          supabase.from('profiles').select('id, nome, email').eq('role', 'client')
        ]);

        if (clientsData) setAvailableClients(clientsData);

        // Enriquece os projetos já vindos da Memória RAM
        if (activeProjects) {
          const enriched = activeProjects.map(p => {
            const pTasks = tasksData?.filter(t => t.project_id === p.id) || [];
            const totalTasks = pTasks.length;
            const completedTasks = pTasks.filter(t => t.status === 'completed').length;
            const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

            return { ...p, calculatedProgress: progress };
          });
          setEnrichedProjects(enriched);
        }

      } catch (error) {
        console.error("Erro local ao buscar dados do CRM:", error);
      } finally {
        setIsLocalLoading(false);
      }
    };

    fetchLocalData();
  }, [isGlobalLoading, activeProjects]);

  // Lógica dinâmica para sub-pacotes
  useEffect(() => {
    if (serviceType === "Identidade Visual") {
      setProjectPackage("Identidade Visual Premium");
      setPaymentRecurrence("Único");
    } else {
      setProjectPackage("Pacote 1");
      setPaymentRecurrence("Mensal");
      setPaymentSplit("100% Antecipado");
    }
  }, [serviceType]);

  // ============================================================================
  // CRIAR PROJETO E AUTO-DEPLOY DE PIPELINE (Zero-Touch)
  // ============================================================================
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      showToast("Selecione um cliente válido da lista.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // 1. CRIA O PROJETO (Contrato)
      const projectPayload = {
        client_id: selectedClientId,
        service_type: serviceType,
        type: serviceType === 'Gestão de Instagram' ? projectPackage : serviceType, 
        status: 'active',
        phase: 'Mesa de Trabalho',
        fase: 'reuniao', 
        progress: 0,
        financial_value: financialValue ? parseFloat(financialValue) : 0,
        payment_method: paymentMethod,
        payment_recurrence: paymentRecurrence,
        payment_split: paymentSplit,
        billing_date: billingDate || null,
        data_limite: billingDate || null 
      };

      const { data: newProject, error: projError } = await supabase.from('projects').insert(projectPayload).select().single();
      if (projError) throw projError;
      
      // 2. SELECIONA O PIPELINE E FAZ O DEPLOY (Backward Scheduling Baseado na Data)
      let pipeline: any[] = [];
      if (serviceType === 'Identidade Visual') {
        pipeline = IDV_PIPELINE;
      } else {
        pipeline = [...IG_SETUP, ...(IG_PACKAGES[projectPackage] || [])];
      }

      const baseDate = billingDate ? new Date(billingDate) : new Date();
      const today = new Date();

      const tasksToInsert = pipeline.map((t) => {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + t.daysOffset);
        
        return {
          project_id: newProject.id,
          client_id: selectedClientId,
          creator_id: session?.user?.id || null,
          assigned_to: null, 
          title: t.title,
          stage: t.stage,
          task_type: t.type,
          estimated_time: t.estTime,
          deadline: targetDate.toISOString(),
          status: 'pending'
        };
      });

      if (tasksToInsert.length > 0) {
        const { error: tasksError } = await supabase.from('tasks').insert(tasksToInsert);
        if (tasksError) throw tasksError;
      }

      showToast("✨ Projeto forjado e Pipeline Instanciado no JTBD!");
      setIsNewClientModalOpen(false);
      setSelectedClientId("");
      setFinancialValue("");
      setBillingDate("");
      
      // 🧠 Aciona a atualização da Memória Global em vez do fetch antigo
      refreshGlobalData();
    } catch (error) {
      console.error("Erro ao criar:", error);
      showToast("Erro ao criar projeto. Verifique as tabelas do banco.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // AÇÕES DO MENU (EDITAR, SUSPENDER, APAGAR)
  // ==========================================
  const handleMenuAction = async (action: string, project: any) => {
    setOpenMenuId(null);

    if (action === 'Editar') {
      setProjectToEdit(project);
      setEditFinancialValue(project.financial_value || "");
      setEditPaymentMethod(project.payment_method || "Transferência Bancária");
      setEditPaymentSplit(project.payment_split || "50/50");
      setEditBillingDate(project.billing_date || "");
      setIsEditModalOpen(true);
      return;
    }

    if (action === 'Suspender') {
      const confirm = window.confirm(`Deseja suspender o acesso do cliente ${project.profiles?.nome}? Eles não poderão aceder ao estúdio.`);
      if (!confirm) return;
      const { error } = await supabase.from('projects').update({ status: 'archived' }).eq('id', project.id);
      if (error) showToast("Erro ao suspender projeto.");
      else { showToast("Projeto suspenso com sucesso."); refreshGlobalData(); }
      return;
    }

    if (action === 'Reativar') {
      const confirm = window.confirm(`Deseja reativar o projeto de ${project.profiles?.nome}?`);
      if (!confirm) return;
      const { error } = await supabase.from('projects').update({ status: 'active' }).eq('id', project.id);
      if (error) showToast("Erro ao reativar projeto.");
      else { showToast("Projeto reativado com sucesso."); refreshGlobalData(); }
      return;
    }

    if (action === 'Apagar') {
      const confirm = window.confirm("ATENÇÃO: Deseja apagar este contrato e todas as tarefas permanentemente?");
      if (!confirm) return;
      const { error } = await supabase.from('projects').delete().eq('id', project.id);
      if (error) showToast("Erro ao apagar contrato.");
      else { showToast("Contrato apagado permanentemente."); refreshGlobalData(); }
      return;
    }
  };

  // GRAVAR EDIÇÕES FINANCEIRAS
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToEdit) return;

    setIsEditing(true);
    try {
      const { error } = await supabase.from('projects').update({
        financial_value: editFinancialValue ? parseFloat(editFinancialValue) : 0,
        payment_method: editPaymentMethod,
        payment_split: editPaymentSplit,
        billing_date: editBillingDate || null
      }).eq('id', projectToEdit.id);

      if (error) throw error;
      
      showToast("Dados contratuais atualizados com sucesso!");
      setIsEditModalOpen(false);
      refreshGlobalData();
    } catch (error) {
      showToast("Erro ao atualizar o projeto.");
    } finally {
      setIsEditing(false);
    }
  };

  // Filtragem local otimizada
  const filteredClients = enrichedProjects.filter(project => {
    const nome = project.profiles?.nome || "";
    const empresa = project.profiles?.empresa || "";
    
    const matchesSearch = nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          empresa.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || project.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleManageClient = (clientName: string, service: string) => {
    showToast(`A aceder à área de ${service} de ${clientName}...`);
    router.push('/admin/projetos');
  };

  const formatDate = (dateString: string) => {
    if(!dateString) return "Indefinido";
    return new Date(dateString).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          1. CABEÇALHO DO CRM E FILTROS FIXOS
          ========================================== */}
      <header className="shrink-0 flex flex-col gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div className="flex justify-between items-end mt-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] w-8 h-8 rounded-xl flex items-center justify-center">
                <Users size={16} className="text-[var(--color-atelier-terracota)]" />
              </span>
              <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60">
                Gestão de Relacionamento
              </span>
            </div>
            <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
              Base de <span className="text-[var(--color-atelier-terracota)] italic">Clientes.</span>
            </h1>
          </div>

          <button 
            onClick={() => setIsNewClientModalOpen(true)}
            className="bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] px-6 py-3.5 rounded-full font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-[var(--color-atelier-terracota)] transition-all duration-300 shadow-[0_10px_20px_rgba(122,116,112,0.2)] hover:shadow-[0_15px_30px_rgba(173,111,64,0.3)] hover:-translate-y-0.5 flex items-center gap-2"
          >
            <Plus size={16} /> Novo Contrato
          </button>
        </div>

        <div className="glass-panel p-2 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 border border-white">
          <div className="relative w-full md:w-[350px] group/search">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40 group-focus-within/search:text-[var(--color-atelier-terracota)] transition-colors" />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou empresa..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/60 border border-transparent focus:bg-white focus:border-[var(--color-atelier-terracota)]/30 rounded-xl py-2.5 pl-11 pr-4 text-[13px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar pb-1 md:pb-0 px-1">
            <FilterButton label="Todos" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
            <FilterButton label="Em Forja (Ativos)" active={filterStatus === 'active'} onClick={() => setFilterStatus('active')} />
            <FilterButton label="Pendentes" active={filterStatus === 'pending'} onClick={() => setFilterStatus('pending')} />
            <FilterButton label="Legado (Concluídos / Suspensos)" active={filterStatus === 'archived'} onClick={() => setFilterStatus('archived')} />
          </div>
        </div>
      </header>

      {/* ==========================================
          2. A LISTA DE CLIENTES E PROJETOS
          ========================================== */}
      <div className="flex-1 glass-panel rounded-[2.5rem] bg-white/40 border border-white/60 flex flex-col overflow-hidden shadow-[0_15px_40px_rgba(122,116,112,0.05)] animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        <div className="grid grid-cols-12 gap-4 px-8 py-5 border-b border-[var(--color-atelier-grafite)]/10 bg-white/60 backdrop-blur-md shrink-0">
          <div className="col-span-4 font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">Identificação</div>
          <div className="col-span-3 font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">Status de Operação</div>
          <div className="col-span-3 font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">Progresso Unitário</div>
          <div className="col-span-2 font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 text-right">Ação</div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2 relative">
          {/* Validação de Carregamento Duplo (RAM + Local) */}
          {isGlobalLoading || isLocalLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={32} />
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredClients.map((project, index) => (
                <motion.div 
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="grid grid-cols-12 gap-4 px-4 py-4 rounded-[1.5rem] bg-white/50 border border-transparent hover:border-white hover:bg-white hover:shadow-[0_10px_30px_rgba(173,111,64,0.08)] transition-all items-center group cursor-pointer"
                  onClick={(e) => {
                    if (openMenuId === project.id) return;
                    handleManageClient(project.profiles?.nome || "Cliente", project.service_type || "Projeto");
                  }}
                >
                  
                  {/* 1. Avatar e Identificação */}
                  <div className="col-span-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-terracota)] font-elegant text-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform overflow-hidden">
                      {project.profiles?.avatar_url ? (
                        <img src={project.profiles.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                      ) : (
                        project.profiles?.nome?.charAt(0) || "C"
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-roboto font-bold text-[15px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate">
                        {project.profiles?.nome || "Cliente Sem Nome"}
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 font-roboto text-[11px] text-[var(--color-atelier-grafite)]/60 truncate">
                          <Building size={12} /> {project.profiles?.empresa || "Sem Empresa"}
                        </span>
                        <span className="hidden xl:flex items-center gap-1 font-roboto text-[11px] text-[var(--color-atelier-grafite)]/40 truncate">
                          <Mail size={12} /> {project.profiles?.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Status */}
                  <div className="col-span-3 flex flex-col justify-center items-start gap-2">
                    {project.status === 'active' && <StatusBadge icon={Clock} text="Em Forja" color="terracota" />}
                    {project.status === 'pending' && <StatusBadge icon={AlertCircle} text="Ação Pendente" color="orange" />}
                    {project.status === 'delivered' && <StatusBadge icon={CheckCircle2} text="Entregue" color="green" />}
                    {project.status === 'archived' && <StatusBadge icon={Ban} text="Suspenso" color="gray" />}
                    
                    <span className="font-roboto text-[12px] font-bold text-[var(--color-atelier-grafite)]/70 truncate w-full pr-4">
                      {project.instagram_package || project.type}
                    </span>
                  </div>

                  {/* 3. Escopo e Progresso Automático Baseado em Tarefas Unitárias */}
                  <div className="col-span-3 flex flex-col justify-center pr-8">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)]/70 truncate mr-2">
                        Workflow Progress
                      </span>
                      <span className="font-roboto text-[12px] font-bold text-[var(--color-atelier-grafite)] flex items-center gap-1">
                        {project.status === 'delivered' || project.calculatedProgress === 100 ? (
                          <><CheckCircle2 size={12} className="text-green-500"/> 100%</>
                        ) : (
                          <><Sparkles size={12} className="text-[var(--color-atelier-terracota)] opacity-50"/> {project.calculatedProgress}%</>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${project.status === 'delivered' || project.calculatedProgress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-[var(--color-atelier-rose)] to-[var(--color-atelier-terracota)]'}`}
                        style={{ width: `${project.status === 'delivered' ? 100 : project.calculatedProgress}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest font-bold">
                      <Calendar size={10} /> Ciclo (Billing): {formatDate(project.billing_date)}
                    </div>
                  </div>

                  {/* 4. Ações (Botões Funcionais) */}
                  <div className="col-span-2 flex justify-end items-center gap-3 relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); 
                        setOpenMenuId(openMenuId === project.id ? null : project.id);
                      }}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm ${openMenuId === project.id ? 'bg-[var(--color-atelier-terracota)] text-white border-transparent' : 'bg-white border-white/50 text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] hover:border-[var(--color-atelier-terracota)]/30 group-hover:bg-white'}`}
                    >
                      <MoreVertical size={16} />
                    </button>

                    <AnimatePresence>
                      {openMenuId === project.id && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-[110%] right-[60px] w-52 bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(122,116,112,0.15)] rounded-2xl overflow-hidden z-50 flex flex-col py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button onClick={() => handleMenuAction('Editar', project)} className="px-4 py-2.5 flex items-center gap-2 text-[11px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)]/5 hover:text-[var(--color-atelier-terracota)] transition-colors w-full text-left">
                            <DollarSign size={14} /> Editar Financeiro
                          </button>
                          
                          {project.status === 'archived' ? (
                            <button onClick={() => handleMenuAction('Reativar', project)} className="px-4 py-2.5 flex items-center gap-2 text-[11px] font-roboto font-bold uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-colors w-full text-left">
                              <RotateCcw size={14} /> Reativar Projeto
                            </button>
                          ) : (
                            <button onClick={() => handleMenuAction('Suspender', project)} className="px-4 py-2.5 flex items-center gap-2 text-[11px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)]/5 hover:text-[var(--color-atelier-terracota)] transition-colors w-full text-left">
                              <Ban size={14} /> Suspender Acesso
                            </button>
                          )}
                          
                          <div className="h-px bg-[var(--color-atelier-grafite)]/10 my-1 w-full"></div>
                          <button onClick={() => handleMenuAction('Apagar', project)} className="px-4 py-2.5 flex items-center gap-2 text-[11px] font-roboto font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors w-full text-left">
                            <Trash2 size={14} /> Apagar Contrato
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/admin/projetos');
                      }}
                      className="bg-transparent border border-[var(--color-atelier-terracota)]/30 text-[var(--color-atelier-terracota)] px-5 py-2.5 rounded-xl font-roboto font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all shadow-sm flex items-center gap-2 group-hover:border-transparent"
                    >
                      JTBD <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>

                </motion.div>
              ))}
              
              {filteredClients.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-40 text-center">
                  <Search size={32} className="text-[var(--color-atelier-grafite)]/20 mb-3" />
                  <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)]/50">Nenhum contrato encontrado.</p>
                  <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/40 mt-1">Registe um novo projeto para gerir a carteira de clientes.</p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ==========================================
          MODAL DE EDIÇÃO (APENAS FINANCEIRO)
          ========================================== */}
      <AnimatePresence>
        {isEditModalOpen && projectToEdit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-[var(--color-atelier-grafite)]/40 backdrop-blur-sm cursor-pointer"
            ></motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[600px] max-h-full overflow-hidden bg-[var(--color-atelier-creme)] rounded-[2.5rem] shadow-[0_20px_50px_rgba(122,116,112,0.2)] border border-white flex flex-col"
            >
              <div className="p-6 md:p-8 border-b border-[var(--color-atelier-grafite)]/10 bg-white/60 backdrop-blur-xl flex justify-between items-start shrink-0 z-10">
                <div>
                  <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                    <DollarSign size={24} className="text-[var(--color-atelier-terracota)]" /> 
                    Contrato Financeiro
                  </h2>
                  <p className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-2">
                    Cliente: {projectToEdit.profiles?.nome}
                  </p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors shadow-sm border border-white/50">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                <form id="edit-contract-form" onSubmit={handleEditSubmit} className="flex flex-col gap-8">
                  <div className="bg-[var(--color-atelier-terracota)]/5 p-6 rounded-3xl border border-[var(--color-atelier-terracota)]/20">
                    <h3 className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mb-4 flex items-center gap-2">
                      <CreditCard size={14} /> Ajustar Recebíveis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-2">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Valor Contratual (R$)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[var(--color-atelier-grafite)]/40">R$</span>
                          <input 
                            type="number" required placeholder="0.00"
                            value={editFinancialValue} onChange={(e) => setEditFinancialValue(e.target.value)}
                            className="w-full bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3 pl-10 pr-4 text-[14px] font-bold text-[var(--color-atelier-grafite)] outline-none shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Método</label>
                        <select 
                          value={editPaymentMethod} onChange={(e) => setEditPaymentMethod(e.target.value)}
                          className="w-full bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 text-[13px] outline-none shadow-sm text-[var(--color-atelier-grafite)] font-medium cursor-pointer"
                        >
                          <option>Transferência Bancária</option>
                          <option>Pix</option>
                          <option>Cartão de Crédito (Stripe)</option>
                          <option>Dinheiro (Internacional)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Modelo de Pagamento</label>
                        <select 
                          value={editPaymentSplit} onChange={(e) => setEditPaymentSplit(e.target.value)}
                          className="w-full bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 text-[13px] outline-none shadow-sm text-[var(--color-atelier-grafite)] font-medium cursor-pointer"
                        >
                          <option>50% Entrada / 50% Entrega</option>
                          <option>30% / 30% / 40%</option>
                          <option>100% Antecipado</option>
                          <option>Faturado ao fim do mês</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1 flex items-center gap-1"><Calendar size={10}/> Data de Cobrança</label>
                        <input 
                          type="date"
                          value={editBillingDate} onChange={(e) => setEditBillingDate(e.target.value)}
                          className="w-full bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 text-[13px] outline-none shadow-sm text-[var(--color-atelier-grafite)] font-medium cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 md:p-8 border-t border-[var(--color-atelier-grafite)]/10 bg-white/40 shrink-0">
                <button 
                  type="submit" 
                  form="edit-contract-form"
                  disabled={isEditing}
                  className="w-full bg-[var(--color-atelier-terracota)] text-[var(--color-atelier-creme)] py-4 rounded-2xl font-roboto font-bold uppercase tracking-[0.2em] text-[12px] hover:bg-[#8c562e] transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isEditing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Salvar Alterações Contratuais
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          FASE 3: MODAL DE NOVO CONTRATO (E AUTO-DEPLOY)
          ========================================== */}
      <AnimatePresence>
        {isNewClientModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsNewClientModalOpen(false)}
              className="absolute inset-0 bg-[var(--color-atelier-grafite)]/40 backdrop-blur-sm cursor-pointer"
            ></motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[800px] max-h-full overflow-hidden bg-[var(--color-atelier-creme)] rounded-[2.5rem] shadow-[0_20px_50px_rgba(122,116,112,0.2)] border border-white flex flex-col"
            >
              <div className="p-6 md:p-8 border-b border-[var(--color-atelier-grafite)]/10 bg-white/60 backdrop-blur-xl flex justify-between items-start shrink-0 z-10">
                <div>
                  <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                    <Briefcase size={24} className="text-[var(--color-atelier-terracota)]" /> 
                    Firmar Novo Contrato
                  </h2>
                  <p className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-2">
                    Gera Tarefas (JTBD) automaticamente
                  </p>
                </div>
                <button onClick={() => setIsNewClientModalOpen(false)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors shadow-sm border border-white/50">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                <form id="new-contract-form" onSubmit={handleCreateProject} className="flex flex-col gap-8">
                  
                  <div className="bg-white/40 p-6 rounded-3xl border border-white">
                    <h3 className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] mb-4 flex items-center gap-2">
                      <Users size={14} className="text-[var(--color-atelier-terracota)]"/> 1. Atribuição de Cliente
                    </h3>
                    <div className="flex flex-col gap-2">
                      <select 
                        required 
                        value={selectedClientId} 
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 text-[13px] outline-none shadow-sm font-bold text-[var(--color-atelier-grafite)] cursor-pointer"
                      >
                        <option value="" disabled>-- Selecione um cliente da base --</option>
                        {availableClients.map(client => (
                          <option key={client.id} value={client.id}>{client.nome} ({client.email})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-white/40 p-6 rounded-3xl border border-white">
                    <h3 className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] mb-4 flex items-center gap-2">
                      <Sparkles size={14} className="text-[var(--color-atelier-terracota)]"/> 2. Estrutura do Serviço
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex flex-col gap-2">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 pl-1">Área Core</label>
                        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-transparent">
                          <button 
                            type="button"
                            onClick={() => setServiceType("Identidade Visual")}
                            className={`flex-1 py-2.5 rounded-lg font-roboto text-[11px] font-bold uppercase tracking-widest transition-all ${serviceType === "Identidade Visual" ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-[var(--color-atelier-grafite)]/5'}`}
                          >
                            Identidade Visual
                          </button>
                          <button 
                            type="button"
                            onClick={() => setServiceType("Gestão de Instagram")}
                            className={`flex-1 py-2.5 rounded-lg font-roboto text-[11px] font-bold uppercase tracking-widest transition-all ${serviceType === "Gestão de Instagram" ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-[var(--color-atelier-grafite)]/5'}`}
                          >
                            Instagram
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 pl-1">Pacote Específico</label>
                        <select 
                          value={projectPackage}
                          onChange={(e) => setProjectPackage(e.target.value)}
                          className="w-full bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 text-[13px] outline-none shadow-sm font-bold text-[var(--color-atelier-terracota)] cursor-pointer h-full"
                        >
                          {serviceType === "Identidade Visual" ? (
                            <>
                              <option>Identidade Visual</option>
                              <option>Rebranding Pleno</option>
                              <option>Identidade + Web Design</option>
                            </>
                          ) : (
                            <>
                              <option>Pacote 1</option>
                              <option>Pacote 2</option>
                              <option>Pacote 3</option>
                              <option>Pacote 4</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[var(--color-atelier-terracota)]/5 p-6 rounded-3xl border border-[var(--color-atelier-terracota)]/20 relative overflow-hidden">
                    <h3 className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mb-4 flex items-center gap-2 relative z-10">
                      <DollarSign size={14} /> 3. Financeiro & Ciclo
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                      <div className="flex flex-col gap-2">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Valor Contratual (R$)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[var(--color-atelier-grafite)]/40">R$</span>
                          <input 
                            type="number" required placeholder="0.00"
                            value={financialValue} onChange={(e) => setFinancialValue(e.target.value)}
                            className="w-full bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3 pl-10 pr-4 text-[14px] font-bold text-[var(--color-atelier-grafite)] outline-none shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Método de Pagamento</label>
                        <select 
                          value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 text-[13px] outline-none shadow-sm text-[var(--color-atelier-grafite)] font-medium cursor-pointer"
                        >
                          <option>Transferência Bancária</option>
                          <option>Pix</option>
                          <option>Cartão de Crédito (Stripe)</option>
                          <option>Dinheiro (Internacional)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Modelo de Pagamento</label>
                        <select 
                          value={paymentSplit} onChange={(e) => setPaymentSplit(e.target.value)}
                          className="w-full bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 text-[13px] outline-none shadow-sm text-[var(--color-atelier-grafite)] font-medium cursor-pointer"
                        >
                          {serviceType === "Identidade Visual" ? (
                            <>
                              <option>50% Entrada / 50% Entrega</option>
                              <option>30% / 30% / 40%</option>
                              <option>100% Antecipado (Desconto)</option>
                            </>
                          ) : (
                            <>
                              <option>100% Antecipado (Mensal)</option>
                              <option>Faturado ao fim do mês</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1 flex items-center gap-1"><Calendar size={10}/> Início do Ciclo (Deadline Base)</label>
                        <input 
                          type="date" required
                          value={billingDate} onChange={(e) => setBillingDate(e.target.value)}
                          className="w-full bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 text-[13px] outline-none shadow-sm text-[var(--color-atelier-grafite)] font-medium cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                </form>
              </div>

              <div className="p-6 md:p-8 border-t border-[var(--color-atelier-grafite)]/10 bg-white/40 shrink-0">
                <button 
                  type="submit" 
                  form="new-contract-form"
                  disabled={isSubmitting || !selectedClientId}
                  className="w-full bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] py-4 rounded-2xl font-roboto font-bold uppercase tracking-[0.2em] text-[12px] hover:bg-[var(--color-atelier-terracota)] hover:-translate-y-0.5 transition-all shadow-[0_10px_20px_rgba(122,116,112,0.15)] disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                  Validar Contrato e Gerar Tarefas (Auto-Deploy)
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function FilterButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`
        px-5 py-2.5 rounded-xl font-roboto font-bold uppercase tracking-widest text-[10px] transition-all whitespace-nowrap
        ${active 
          ? 'bg-[var(--color-atelier-terracota)] text-white shadow-[0_4px_10px_rgba(173,111,64,0.3)]' 
          : 'bg-transparent text-[var(--color-atelier-grafite)]/60 hover:bg-white hover:text-[var(--color-atelier-grafite)] border border-transparent hover:border-white'
        }
      `}
    >
      {label}
    </button>
  );
}

function StatusBadge({ icon: Icon, text, color }: { icon: any, text: string, color: 'terracota' | 'orange' | 'green' | 'gray' }) {
  const colorStyles = {
    terracota: 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)]/20',
    orange: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    green: 'bg-green-500/10 text-green-700 border-green-500/20',
    gray: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  };

  return (
    <div className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 font-roboto text-[9px] uppercase tracking-widest font-black ${colorStyles[color]}`}>
      <Icon size={10} strokeWidth={2.5} /> {text}
    </div>
  );
}