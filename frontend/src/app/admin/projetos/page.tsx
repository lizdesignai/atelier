"use client";
import { ProjectAssetsManager } from '../../../components/admin/ProjectAssetsManager';

﻿import { AdminTerritoriesManager } from "../../../components/admin/AdminTerritoriesManager";
// src/app/admin/projetos/page.tsx

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Lock, Unlock, Image as ImageIcon, Send, FileText, CheckCircle2, Settings2, Plus, ChevronDown, Calendar, Compass, X, Sparkles, Download, Loader2, Trash2, Archive, Eye, RotateCcw, BrainCircuit, LayoutDashboard, Target, CalendarDays, MapPin, Camera, AlertCircle, ArrowRight, FolderKanban } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { updateProjectAction } from "../../actions/projects";
import { useGlobalStore } from "../../../contexts/GlobalStore"; // Ã°Å¸Â§Â  INJEÃƒâ€¡ÃƒÆ’O DA MEMÃƒâ€œRIA GLOBAL
import RevealCeremonyAdmin from "../../../components/admin/RevealCeremonyAdmin";
import DiaryModule from "../../../components/admin/DiaryModule";
import { NotificationEngine } from "../../../lib/NotificationEngine"; // Ã°Å¸â€â€ INJEÃƒâ€¡ÃƒÆ’O DO MOTOR DE NOTIFICAÃƒâ€¡Ãƒâ€¢ES

// IMPORTAÃƒâ€¡ÃƒÆ’O EXTERNA: Traz apenas o Motor de Gestão de Instagram
import { GerenciamentoWorkspace as ImportWorkspace } from "../gerenciamento/page";

// Importação do nosso Motor de Automação
import { AtelierPMEngine } from "../../../lib/AtelierPMEngine";

// Novo Hook de Título Dinâmico
import { useDynamicTitle } from "../../../hooks/useDynamicTitle"; 

// ============================================================================
// COMPONENTES REUTILIZADOS (Views do Workspace)
// ============================================================================
import dynamic from "next/dynamic";

const VisualFlow = dynamic(() => import("../gerenciamento/views/VisualFlow"), { ssr: false });
const BrandIdentity = dynamic(() => import("../gerenciamento/views/BrandIdentity"), { ssr: false });
const GlobalCalendar = dynamic(() => import("../gerenciamento/views/GlobalCalendar"), { ssr: false });
const MissionsView = dynamic(() => import("../gerenciamento/views/MissionsView"), { ssr: false });

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ============================================================================
// DICIONÃƒÂRIOS GLOBAIS (Partilhados)
// ============================================================================
const isIdvService = (project: any) => {
  if (!project) return false;
  return project.service_type === 'Identidade Visual' || project.type?.includes('Identidade Visual');
};

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

function InfoBlock({ label, value }: { label: string, value: any }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <span className="font-roboto text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50">{label}</span>
      <span className="font-roboto text-sm text-[var(--color-atelier-grafite)] mt-1 whitespace-pre-wrap font-medium">{value}</span>
    </div>
  );
}

// ============================================================================
// COMPONENTE INTERNO: O ROTEADOR DAS ABAS DO INSTAGRAM E B2B
// ============================================================================
export function GerenciamentoWorkspace({ activeProjectId, activeSubclientId, currentProject, activeTab }: { activeProjectId: string, activeSubclientId?: string | null, currentProject: any, activeTab: string }) {
  return (
    <div className="flex flex-col w-full animate-[fadeInUp_0.5s_ease-out] flex-1 min-h-0 relative">
      <div className="flex-1 min-h-0 relative pb-6">
        <AnimatePresence mode="wait">
          {activeTab === 'calendario' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
              <GlobalCalendar activeProjectId={activeProjectId} activeSubclientId={activeSubclientId} currentProject={currentProject} />
            </motion.div>
          )}

          {activeTab === 'posts' && (
            <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
              <VisualFlow activeProjectId={activeProjectId} activeSubclientId={activeSubclientId} currentProject={currentProject} />
            </motion.div>
          )}

          {activeTab === 'identidade' && (
            <motion.div key="identidade" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
              <BrandIdentity activeProjectId={activeProjectId} currentProject={currentProject} />
            </motion.div>
          )}

          {activeTab === 'missoes' && (
            <motion.div key="missoes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
              <MissionsView activeProjectId={activeProjectId} activeSubclientId={activeSubclientId} currentProject={currentProject} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PainelIdentidade() {
  // ==========================================
  // ESTADOS DO SUPABASE E NAVEGAÃƒâ€¡ÃƒÆ’O
  // ==========================================
  const { activeProjects, isGlobalLoading, refreshGlobalData } = useGlobalStore();
  
  const [isLocalLoading, setIsLocalLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);

  // Ã°Å¸Å¸Â¢ ESTADO DO MENU INSTAGRAM E AGÃƒÅ NCIAS
  const [activeTab, setActiveTab] = useState<'calendario' | 'posts' | 'identidade' | 'missoes'>('calendario');

  // Lógica de Subclientes para Agências B2B
  const [agencySubclients, setAgencySubclients] = useState<any[]>([]);
  const [activeSubclientId, setActiveSubclientId] = useState<string | null>(null);

  const [agencies, setAgencies] = useState<any[]>([]);

  useEffect(() => {
    const fetchAgencies = async () => {
      const { data } = await supabase.from('agencies').select('*').eq('status', 'active');
      if (data) {
        setAgencies(data.map(a => ({
          ...a,
          isAgency: true,
          profiles: { nome: a.name, empresa: a.name, avatar_url: null },
          status: 'active'
        })));
      }
    };
    fetchAgencies();
  }, []);

  const validProjects = [
    ...activeProjects.filter(p => ['active', 'delivered', 'archived'].includes(p.status)),
    ...agencies
  ].sort((a, b) => (a.profiles?.nome || "").localeCompare(b.profiles?.nome || ""));

  const currentProject = validProjects.find(p => p.id === activeProjectId);
  const isIdv = isIdvService(currentProject); 
  const isAgency = currentProject?.isAgency === true;

  // Tabs disponíveis (Filtra 'identidade' se for agência)
  const igTabs = [
    { id: 'calendario', label: 'Analytics & Calendário', icon: <CalendarDays size={18} /> },
    { id: 'posts', label: 'Peças Gráficas', icon: <LayoutDashboard size={18} /> },
    { id: 'identidade', label: 'Diretrizes & Briefing', icon: <Target size={18} /> },
    { id: 'missoes', label: 'Solicitações e Arquivos', icon: <Camera size={18} /> },
  ].filter(tab => !(isAgency && tab.id === 'identidade'));

  useDynamicTitle({
    projectName: currentProject?.profiles?.nome,
    tabName: isAgency ? "Agência B2B" : (isIdv ? "Identidade Visual" : "Gestão de Projeto")
  });

  useEffect(() => {
    if (isGlobalLoading) return;
    if (validProjects.length > 0 && !activeProjectId) setActiveProjectId(validProjects[0].id);
    setIsLocalLoading(false);
  }, [isGlobalLoading, activeProjects.length]);

  // Subclients are fetched within the unified studio endpoint now
  useEffect(() => {
    if (!activeProjectId || !isAgency) {
      setAgencySubclients([]);
      setActiveSubclientId(null);
    }
  }, [activeProjectId, isAgency]);

  useEffect(() => {
    if (currentProject) {
      let dataLimite = "";
      if (currentProject.data_limite) {
        try {
          // Trata tanto string ISO quanto o formato do banco
          const val = currentProject.data_limite;
          if (typeof val === 'string') {
             dataLimite = val.split('T')[0];
          } else if (val instanceof Date) {
             dataLimite = val.toISOString().split('T')[0];
          } else {
             const d = new Date(val);
             if (!isNaN(d.getTime())) dataLimite = d.toISOString().split('T')[0];
          }
        } catch (e) {}
      }
      setDeadlineDate(dataLimite);
      setContractUrl(currentProject.contract_url || "");
      setBriefingAiInsight(currentProject.briefing_ai_insight || null);
      setCuradoriaAiInsight(currentProject.curadoria_ai_insight || null);
    }
  }, [currentProject]);

  // ESTADOS DOS ARQUIVOS E BRIEFING
  const [projectAssets, setProjectAssets] = useState<any[]>([]);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [contractUrl, setContractUrl] = useState("");
  const [isUploadingContract, setIsUploadingContract] = useState(false);
  const [clientBriefing, setClientBriefing] = useState<any>(null);
  
  // ESTADOS DE IA & PDF
  const [briefingAiInsight, setBriefingAiInsight] = useState<string | null>(null);
  const [curadoriaAiInsight, setCuradoriaAiInsight] = useState<string | null>(null);
  const [isGeneratingBriefingInsight, setIsGeneratingBriefingInsight] = useState(false);
  const [isGeneratingCuradoriaInsight, setIsGeneratingCuradoriaInsight] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingCuradoriaPDF, setIsGeneratingCuradoriaPDF] = useState(false);
  const [isGeneratingIDVTasks, setIsGeneratingIDVTasks] = useState(false);

  useEffect(() => {
    if (!activeProjectId) return;
    const fetchStudioData = async () => {
      try {
        // Busca direta no Supabase em vez de endpoint de backend inexistente
        const { data: assetsData, error: assetsError } = await supabase
          .from('project_assets')
          .select('*')
          .eq('project_id', activeProjectId)
          .order('created_at', { ascending: false });

        const { data: briefingData, error: briefingError } = await supabase
          .from('client_briefings')
          .select('*')
          .eq('project_id', activeProjectId)
          .single();

        if (assetsError) {
          console.error("Erro ao buscar assets:", assetsError);
        }
        
        setProjectAssets(assetsData || []);
        // Ignore single() error for no rows
        setClientBriefing(briefingData || null);
        if (isAgency || activeProjectId.startsWith('agency-')) {
           const { data: subclientsData, error: subError } = await supabase
             .from('agency_subclients')
             .select('*')
             .eq('agency_id', activeProjectId)
             .order('name');
             
           if (!subError && subclientsData) {
             setAgencySubclients(subclientsData);
             if (subclientsData.length > 0 && !activeSubclientId) {
                setActiveSubclientId(subclientsData[0].id);
             }
           }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          AtelierPMEngine.runRecurrenceHotCheck(activeProjectId, session.user.id).catch(e => {
            console.error("Erro no Hot-Check Background:", e);
          });
        }
      } catch (error) {
        console.error("Erro no fetching unificado do Studio Veronna:", error);
      }
    };
    fetchStudioData();
  }, [activeProjectId, isAgency]);

  const handleReturnBriefing = async () => {
    if (!activeProjectId || !clientBriefing) return;
    if (!window.confirm("Deseja solicitar uma revisão do briefing para o cliente? Ele precisará revisar e reenviar o documento.")) return;
    
    setClientBriefing(null);
    setIsBriefingModalOpen(false);
    
    try {
      await supabase.from('client_briefings').update({ is_completed: false }).eq('project_id', activeProjectId);
      if (currentProject?.client_id) {
        await NotificationEngine.notifyUser(
          currentProject.client_id,
          "Ã¢Å¡Â Ã¯Â¸Â Briefing Devolvido (Revisão Necessária)",
          "A equipe analisou o seu Briefing e solicita mais profundidade nas respostas. Por favor, revise-o no Meu Espaço.",
          "action",
          "/"
        );
      }
      showToast("Solicitação de revisão enviada ao cliente.");
    } catch (e) {
      showToast("Erro ao processar devolução de briefing.");
    }
  };

  const handleDiaryActivity = async () => {
    if (!activeProjectId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        if ((AtelierPMEngine as any).triggerSystemAction) {
          await (AtelierPMEngine as any).triggerSystemAction(activeProjectId, 'community', session.user.id);
        }
      }
    } catch (error) {
      console.error("Erro na automação do Diário de Bordo:", error);
    }
  };

  const handleGenerateBriefingInsight = async () => {
    if (!activeProjectId || !clientBriefing) return;
    setIsGeneratingBriefingInsight(true);
    showToast("Assistente Estratégico: Analisando o briefing...");
    try {
      const res = await fetch('/api/insights/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefingData: clientBriefing,
          clientName: currentProject?.profiles?.nome,
          companyName: currentProject?.profiles?.empresa
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      await updateProjectAction(activeProjectId, { briefing_ai_insight: data.insight });
      setBriefingAiInsight(data.insight);
      refreshGlobalData();
      
      await NotificationEngine.notifyManagement(
        "Ã°Å¸Â§Â  Assistente Estratégico: Análise Concluída",
        `O relatório de inteligência estratégica do cliente ${currentProject?.profiles?.nome} está pronto a ser consultado.`,
        "success",
        "/admin/projetos"
      );

      showToast("Análise Estratégica gerada com sucesso! Ã¢Å“Â¨");
    } catch (e) {
      showToast("Erro ao processar análise da IA.");
    } finally {
      setIsGeneratingBriefingInsight(false);
    }
  };

  const handleGenerateCuradoriaInsight = async () => {
    if (!activeProjectId || adminRefs.length === 0) return;
    setIsGeneratingCuradoriaInsight(true);
    showToast("Assistente de Design: Analisando direções visuais...");
    try {
      const res = await fetch('/api/insights/curadoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminRefs: adminRefs,
          clientMoodboard: clientMoodboard,
          clientName: currentProject?.profiles?.nome
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      await updateProjectAction(activeProjectId, { curadoria_ai_insight: data.insight });
      setCuradoriaAiInsight(data.insight);
      refreshGlobalData(); 
      
      await NotificationEngine.notifyManagement(
        "Ã°Å¸Å½Â¨ Assistente de Design: Análise Concluída",
        `O relatório semiótico para o projeto de ${currentProject?.profiles?.nome} foi compilado.`,
        "success",
        "/admin/projetos"
      );

      showToast("Análise Visual gerada com sucesso! Ã¢Å“Â¨");
    } catch (e) {
      showToast("Erro ao processar análise da IA.");
    } finally {
      setIsGeneratingCuradoriaInsight(false);
    }
  };

  const handleDownloadBriefingPDF = async () => {
    if (!clientBriefing) {
      showToast("Erro: O conteúdo do Briefing ainda não foi carregado.");
      return;
    }
    
    setIsGeneratingPDF(true);
    showToast("Gerando PDF Estratégico...");
    
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const BriefingPDF = (await import('../../../components/pdf/BriefingPDF')).default;
      
      const doc = <BriefingPDF clientBriefing={clientBriefing} projectName={currentProject?.profiles?.nome || 'Cliente'} aiInsight={briefingAiInsight || undefined} />;
      const blob = await pdf(doc).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Briefing_Estrategico_${currentProject?.profiles?.nome || 'Cliente'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      showToast("PDF Estratégico exportado com sucesso!");
    } catch (error) {
      showToast("Erro crítico ao gerar o arquivo vetorial.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateIDVTasks = async () => {
    if (!activeProjectId) return;
    setIsGeneratingIDVTasks(true);
    showToast("AIDV: Gerando Trilha da Marca...");
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/generate-idv-tasks`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      showToast("Trilha da Marca gerada com sucesso! As tarefas foram populadas.");
      refreshGlobalData();
    } catch (e) {
      showToast(e.message || "Erro ao gerar tarefas da trilha.");
    } finally {
      setIsGeneratingIDVTasks(false);
    }
  };

  const handleDownloadCuradoriaPDF = async () => {
    if (adminRefs.length === 0) return;
    setIsGeneratingCuradoriaPDF(true);
    showToast("Gerando PDF da Curadoria...");
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const CuradoriaPDF = (await import('../../../components/pdf/CuradoriaPDF')).default;
      
      const doc = <CuradoriaPDF adminRefs={adminRefs} projectName={currentProject?.profiles?.nome || 'Cliente'} aiInsight={curadoriaAiInsight || undefined} />;
      const blob = await pdf(doc).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Curadoria_${currentProject?.profiles?.nome || 'Cliente'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      showToast("Curadoria exportada com sucesso.");
    } catch (error) {
      showToast("Erro ao gerar PDF da Curadoria.");
    } finally {
      setIsGeneratingCuradoriaPDF(false);
    }
  };

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;

    setIsUploadingAsset(true);
    showToast("Enviando arquivo para o espaço seguro...");

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${activeProjectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('vault_assets').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('vault_assets').getPublicUrl(filePath);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      
      const { data: insertedData, error: dbError } = await supabase
        .from('project_assets')
        .insert({
          project_id: activeProjectId,
          file_name: file.name,
          file_url: publicUrlData.publicUrl,
          file_size: `${fileSizeMB} MB`
        })
        .select();

      if (dbError) throw dbError;
      if (insertedData) setProjectAssets([insertedData[0], ...projectAssets]);
      
      if (currentProject?.client_id) {
        await NotificationEngine.notifyUser(
          currentProject.client_id,
          "Ã°Å¸â€œÂ¦ Novo Material Disponível",
          `A equipe adicionou o arquivo final "${file.name}" ao seu espaço.`,
          "info",
          "/"
        );
      }
      showToast("Ã¢Å“Â¨ Arquivo adicionado aos Materiais Finais!");
    } catch (error: any) {
      showToast("Erro ao fazer upload do arquivo.");
    } finally {
      setIsUploadingAsset(false);
      e.target.value = '';
    }
  };

  const handleRemoveAsset = async (assetId: string) => {
    const confirm = window.confirm("Tem certeza de que deseja excluir este arquivo?");
    if (!confirm) return;
    try {
      await supabase.from('project_assets').delete().eq('id', assetId);
      setProjectAssets(projectAssets.filter(a => a.id !== assetId));
      showToast("Arquivo removido com sucesso.");
    } catch (error) {
      showToast("Erro ao excluir arquivo.");
    }
  };

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;

    setIsUploadingContract(true);
    showToast("Fazendo upload do contrato assinado...");

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${activeProjectId}_contrato_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('vault_assets').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('vault_assets').getPublicUrl(fileName);
      
      const { error: dbError } = await updateProjectAction(activeProjectId, { contract_url: data.publicUrl });
      if (dbError) throw dbError;
      
      setContractUrl(data.publicUrl);
      refreshGlobalData();
      
      if (currentProject?.client_id) {
        await NotificationEngine.notifyUser(
          currentProject.client_id,
          "Ã°Å¸â€œÅ“ Contrato Disponível",
          "A cópia digital do seu contrato assinado já está disponível no seu espaço.",
          "info",
          "/"
        );
      }
      showToast("Contrato anexado com sucesso!");
    } catch (error) {
      showToast("Erro ao fazer upload do contrato.");
    } finally {
      setIsUploadingContract(false);
      e.target.value = ''; 
    }
  };

  const [deadlineDate, setDeadlineDate] = useState("");
  const [daysLeft, setDaysLeft] = useState(0);
  const [isForceUnlocked, setIsForceUnlocked] = useState(false);

  useEffect(() => {
    if (!deadlineDate) {
      setDaysLeft(0);
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(deadlineDate);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    setDaysLeft(diffDays);
  }, [deadlineDate]);

  const handleDeadlineChange = async (newDate: string) => {
    setDeadlineDate(newDate);
    setIsForceUnlocked(false);
    if (activeProjectId) {
      await updateProjectAction(activeProjectId, { data_limite: newDate });
      showToast(`Prazo atualizado: ${newDate.split('-').reverse().join('/')}`);
      refreshGlobalData();
    }
  };

  const handleStageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novaFase = e.target.value;
    if (activeProjectId) {
      await updateProjectAction(activeProjectId, { fase: novaFase });
      showToast("Fase do projeto atualizada com sucesso!");
      refreshGlobalData();
    }
  };

  const handleMarkAsDelivered = async () => {
    if (!activeProjectId) return;
    if (!window.confirm("Deseja marcar este projeto como ENTREGUE? O cliente terá 15 dias de acesso ao painel antes do arquivamento.")) return;

    try {
      await updateProjectAction(activeProjectId, { status: 'delivered', delivered_at: new Date().toISOString() });
      if (currentProject?.client_id) {
        await NotificationEngine.notifyUser(currentProject.client_id, "Ã°Å¸Å½â€° Projeto Entregue!", "Você terá 15 dias de acesso ao Meu Espaço para fazer o download final dos seus materiais.", "success", "/");
      }
      showToast("Projeto marcado como Entregue! A contagem regressiva de 15 dias começou.");
      refreshGlobalData();
    } catch (error) { showToast("Erro ao marcar projeto como entregue."); }
  };

  const handleForceArchive = async () => {
    if (!activeProjectId) return;
    if (!window.confirm("ATENÃƒâ€¡ÃƒÆ’O: O cliente perderá acesso IMEDIATO ao painel e canais deste projeto. Deseja prosseguir?")) return;

    try {
      await updateProjectAction(activeProjectId, { status: 'archived' });
      if (currentProject?.client_id) {
        await NotificationEngine.notifyUser(currentProject.client_id, "Ã°Å¸â€â€™ Acesso Fechado", "O seu projeto foi arquivado. O seu acesso ao painel foi encerrado. Obrigado por confiar na Liz Design.", "info");
      }
      showToast("Projeto Arquivado com sucesso!");
      refreshGlobalData();
    } catch (error) { showToast("Erro ao arquivar projeto."); }
  };

  const handleReactivateProject = async () => {
    if (!activeProjectId) return;
    if (!window.confirm("Deseja REATIVAR este projeto? O cliente voltará a ter acesso total ao painel.")) return;

    try {
      await updateProjectAction(activeProjectId, { status: 'active', delivered_at: null });
      if (currentProject?.client_id) {
        await NotificationEngine.notifyUser(currentProject.client_id, "Ã°Å¸â€â€œ Operação Reativada", "O seu projeto voltou a ficar ativo. Você tem acesso total restaurado ao seu espaço.", "success", "/");
      }
      showToast("Projeto Reativado com sucesso!");
      refreshGlobalData();
    } catch (error) { showToast("Erro ao reativar projeto."); }
  };

  const isCofreUnlocked = (daysLeft === 0 && deadlineDate !== "") || isForceUnlocked;

  // PAINEL DE CURADORIA
  const [showRefsPanel, setShowRefsPanel] = useState(false);
  const [showTerritoriesPanel, setShowTerritoriesPanel] = useState(false);
  const [clientMoodboard, setClientMoodboard] = useState<string[]>([]);
  const [adminRefs, setAdminRefs] = useState<any[]>([]);
  const [activeEvalIndex, setActiveEvalIndex] = useState(0);
  
  const [newRefTitle, setNewRefTitle] = useState("");
  const [newRefImageFiles, setNewRefImageFiles] = useState<File[]>([]);
  const [newRefImagePreviews, setNewRefImagePreviews] = useState<string[]>([]);
  
  const [isSendingRef, setIsSendingRef] = useState(false);

  useEffect(() => {
    if (!showRefsPanel || !activeProjectId) return;
    const fetchCuradoria = async () => {
      const [ { data: strategicData }, { data: directionsData } ] = await Promise.all([
        supabase.from('strategic_answers').select('moodboard_urls').eq('project_id', activeProjectId).maybeSingle(),
        supabase.from('design_directions').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: true })
      ]);
      
      if (strategicData && strategicData.moodboard_urls) setClientMoodboard(strategicData.moodboard_urls);
      else setClientMoodboard([]);

      if (directionsData) {
        setAdminRefs(directionsData);
        if (directionsData.length > 0) setActiveEvalIndex(directionsData.length - 1); 
      } else {
        setAdminRefs([]);
      }
    };
    fetchCuradoria();
  }, [showRefsPanel, activeProjectId]);

  const handleMultiImageUploadRef = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setNewRefImageFiles(prev => [...prev, ...files]);
      const previews = files.map(f => URL.createObjectURL(f));
      setNewRefImagePreviews(prev => [...prev, ...previews]);
    }
  };

  const handleRemoveRefImage = (index: number) => {
    setNewRefImageFiles(prev => prev.filter((_, i) => i !== index));
    setNewRefImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddAdminRef = async () => {
    if (!newRefTitle || newRefImageFiles.length === 0 || !activeProjectId) {
      showToast("Adicione um título e pelo menos uma imagem.");
      return;
    }
    setIsSendingRef(true);
    showToast("Enviando Direções Visuais para o cliente...");

    try {
      const uploadPromises = newRefImageFiles.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${activeProjectId}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('moodboard').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('moodboard').getPublicUrl(filePath);
        return data.publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      const { data: newRefData, error: dbError } = await supabase.from('design_directions').insert({
        project_id: activeProjectId,
        title: newRefTitle,
        image_url: uploadedUrls[0], 
        image_urls: uploadedUrls    
      }).select();

      if (dbError) throw dbError;

      if (newRefData) {
        setAdminRefs([...adminRefs, newRefData[0]]);
        setActiveEvalIndex(adminRefs.length);
      }
      
      if (currentProject?.client_id) {
        await NotificationEngine.notifyUser(currentProject.client_id, "Ã°Å¸Â§Â­ Nova Direção Visual (Moodboard)", "A equipe enviou referências e um novo caminho criativo para a sua marca. Analise e compartilhe a sua opinião no Meu Espaço.", "action", "/");
      }

      showToast("Direção visual enviada com sucesso!");
      setNewRefTitle("");
      setNewRefImageFiles([]);
      setNewRefImagePreviews([]);
    } catch (error) {
      showToast("Erro ao enviar Direção Visual.");
    } finally {
      setIsSendingRef(false);
    }
  };

  const removeAdminRef = async (id: string) => {
    const confirm = window.confirm("Remover esta direção visual permanentemente?");
    if (!confirm) return;
    setAdminRefs(adminRefs.filter(ref => ref.id !== id));
    setActiveEvalIndex(0); 
    showToast("Direção visual removida.");
    try { await supabase.from('design_directions').delete().eq('id', id); } catch (error) { showToast("Erro ao excluir direção no banco."); }
  };

  if (isGlobalLoading || isLocalLoading) {
    return <div className="flex h-[calc(100vh-80px)] items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
        <Settings2 size={48} className="text-[var(--color-atelier-grafite)]" />
        <h2 className="font-elegant text-3xl">Nenhum projeto ativo.</h2>
        <p className="font-roboto text-sm font-medium">Crie um projeto na Base de Clientes para acessar o painel.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-auto min-h-[calc(100dvh-60px)] md:h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6 px-4 md:px-0">
      
      <AnimatePresence>
        {isBriefingModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/40 backdrop-blur-md" onClick={() => setIsBriefingModalOpen(false)}></motion.div>
            
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[var(--color-atelier-creme)] w-full h-full md:max-w-4xl rounded-none md:rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden border border-white">
              
              <div className="p-6 border-b border-white/40 flex justify-between items-center bg-white/60 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-white shadow-inner"><FileText size={18} className="text-[var(--color-atelier-terracota)]" /></div>
                  <span className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Briefing Estratégico</span>
                </div>
                <div className="flex items-center gap-3">
                  
                  <button onClick={handleReturnBriefing} disabled={!clientBriefing} className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-[1.2rem] flex items-center gap-2 font-roboto text-[10px] uppercase tracking-widest font-bold hover:bg-red-500 hover:text-white transition-all shadow-sm disabled:opacity-50">
                    <RotateCcw size={14} /> Solicitar Revisão
                  </button>
                  
                  <button onClick={handleGenerateBriefingInsight} disabled={isGeneratingBriefingInsight || !clientBriefing} className="bg-white border border-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-terracota)] px-4 py-2.5 rounded-[1.2rem] flex items-center gap-2 font-roboto text-[10px] uppercase tracking-widest font-bold hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all shadow-sm disabled:opacity-50">
                    {isGeneratingBriefingInsight ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />} Gerar Análise (IA)
                  </button>

                  <button onClick={handleDownloadBriefingPDF} disabled={isGeneratingPDF || !clientBriefing} className="bg-[var(--color-atelier-grafite)] text-white px-5 py-2.5 rounded-[1.2rem] flex items-center gap-2 font-roboto text-[10px] uppercase tracking-widest font-bold hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-md disabled:opacity-50 hover:-translate-y-0.5 disabled:hover:translate-y-0">
                    {isGeneratingPDF ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Baixar PDF Oficial
                  </button>
                  
                  <button onClick={() => setIsBriefingModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-white text-[var(--color-atelier-grafite)]/50 hover:text-red-500 transition-colors shadow-sm">
                    <X size={16} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 w-full overflow-y-auto custom-scrollbar p-8">
                {clientBriefing ? (
                  <div className="max-w-3xl mx-auto glass-panel bg-white/60 p-10 border border-white rounded-[2.5rem] shadow-sm">
                    <div className="text-center mb-12 border-b border-[var(--color-atelier-grafite)]/10 pb-8">
                      <div className="flex justify-center mb-6">
                        <img src="/images/simbolo-rosa.png" alt="Atelier" className="w-16 h-16 object-contain grayscale opacity-50 drop-shadow-sm" />
                      </div>
                      <h1 className="font-elegant text-5xl text-[var(--color-atelier-grafite)] mb-2">Briefing Oficial</h1>
                      <h2 className="font-roboto text-lg text-[var(--color-atelier-terracota)] uppercase tracking-widest font-bold">{currentProject.profiles?.nome}</h2>
                      <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/50 mt-2 font-medium">Documento Confidencial do Projeto</p>
                    </div>

                    {briefingAiInsight && (
                      <div className="mb-10 bg-white/80 p-8 rounded-[2rem] border border-[var(--color-atelier-terracota)]/20 shadow-sm relative overflow-hidden">
                        <div className="absolute left-0 top-0 h-full w-1.5 bg-[var(--color-atelier-terracota)]"></div>
                        <h3 className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] mb-4 flex items-center gap-2">
                          <Sparkles size={14}/> Diagnóstico de Marca (Assistente IA)
                        </h3>
                        <div className="font-roboto text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed whitespace-pre-wrap font-medium">
                           {briefingAiInsight}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-10">
                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-[var(--color-atelier-grafite)]/5 pb-2">1. Dados & Contato</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InfoBlock label="Nome do Responsável" value={clientBriefing.nome} />
                          <InfoBlock label="WhatsApp" value={clientBriefing.whatsapp} />
                          <InfoBlock label="E-mail de Contato" value={clientBriefing.email} />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-[var(--color-atelier-grafite)]/5 pb-2">2. A Marca</h3>
                        <div className="flex flex-col gap-4">
                          <InfoBlock label="Nome a ser utilizado no Logotipo" value={clientBriefing.nome_logo} />
                          <InfoBlock label="Significado da Escolha do Nome" value={clientBriefing.significado_nome} />
                          <div className="grid grid-cols-2 gap-4">
                            <InfoBlock label="Tagline (Subtítulo)" value={clientBriefing.tagline} />
                            <InfoBlock label="Slogan da Empresa" value={clientBriefing.slogan} />
                          </div>
                          <InfoBlock label="Produtos ou Serviços Oferecidos" value={clientBriefing.produtos_servicos} />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-[var(--color-atelier-grafite)]/5 pb-2">3. Essência & História</h3>
                        <div className="flex flex-col gap-4">
                          <InfoBlock label="Por que a empresa foi aberta? Qual a motivação?" value={clientBriefing.motivo_abertura} />
                          <InfoBlock label="Propósito principal além de lucrar" value={clientBriefing.proposito} />
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <InfoBlock label="Tempo de Mercado" value={clientBriefing.tempo_mercado} />
                            <InfoBlock label="A Marca em Emojis" value={clientBriefing.emoji} />
                            <InfoBlock label="Música que a define" value={clientBriefing.musica} />
                          </div>
                          <InfoBlock label="O Sentimento que a marca vende" value={clientBriefing.sentimento} />
                          <InfoBlock label="Visão de Futuro (Em 5 Anos)" value={clientBriefing.visao_5_anos} />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-[var(--color-atelier-grafite)]/5 pb-2">4. Público Alvo</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                          <InfoBlock label="Gênero" value={clientBriefing.genero === 'Outro' ? clientBriefing.genero_outro : clientBriefing.genero} />
                          <InfoBlock label="Classe Social" value={clientBriefing.classe === 'Outro' ? clientBriefing.classe_outro : clientBriefing.classe} />
                          <InfoBlock label="Idade" value={clientBriefing.idade === 'Outro' ? clientBriefing.idade_outro : clientBriefing.idade} />
                        </div>
                        <InfoBlock label="Resumo Comportamental do Público" value={clientBriefing.resumo_publico} />
                      </div>

                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-[var(--color-atelier-grafite)]/5 pb-2">5. Posicionamento de Mercado</h3>
                        <div className="flex flex-col gap-4">
                          <InfoBlock label="Concorrentes Principais" value={clientBriefing.concorrentes_links} />
                          <InfoBlock label="Diferencial Competitivo" value={clientBriefing.diferencial} />
                          <InfoBlock label="O que definitivamente NÃƒÆ’O fazer (Vícios da concorrência)" value={clientBriefing.nao_fazer} />
                          <InfoBlock label="Referências Visuais do Cliente" value={clientBriefing.referencias} />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-[var(--color-atelier-grafite)]/5 pb-2">6. Personalidade e Estética</h3>
                        <div className="flex flex-col gap-4">
                          <InfoBlock label="Sentimento Exigido da Marca" value={clientBriefing.sentimento_marca} />
                          <InfoBlock label="A Missão Oficial" value={clientBriefing.missao} />
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 bg-white/60 p-6 rounded-3xl border border-white shadow-sm">
                            <div>
                              <p className="font-roboto text-[10px] uppercase font-bold text-[var(--color-atelier-terracota)] mb-2 flex items-center gap-1.5"><CheckCircle2 size={12}/> Adjetivos Positivos (A Marca Ãƒâ€°)</p>
                              <p className="font-roboto text-[13px] font-medium text-[var(--color-atelier-grafite)] leading-relaxed">
                                {clientBriefing.adjetivos_positivos?.join(", ")} {clientBriefing.adjetivos_positivos_outro && `, ${clientBriefing.adjetivos_positivos_outro}`}
                              </p>
                              <p className="mt-3 text-[13px] text-[var(--color-atelier-grafite)] bg-white/80 p-3 rounded-xl border border-white"><strong>Top 3:</strong> <br/><span className="font-medium">{clientBriefing.top_3_adjetivos}</span></p>
                            </div>
                            <div>
                              <p className="font-roboto text-[10px] uppercase font-bold text-red-600 mb-2 flex items-center gap-1.5"><X size={12}/> Adjetivos Negativos (A Marca NÃƒÆ’O Ãƒâ€°)</p>
                              <p className="font-roboto text-[13px] font-medium text-[var(--color-atelier-grafite)] leading-relaxed">
                                {clientBriefing.adjetivos_negativos?.join(", ")} {clientBriefing.adjetivos_negativos_outro && `, ${clientBriefing.adjetivos_negativos_outro}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-[var(--color-atelier-grafite)]/5 pb-2">7. Restrições e Direções Visuais</h3>
                        <div className="flex flex-col gap-4">
                          <InfoBlock label="Pedido de Símbolo Específico" value={clientBriefing.simbolo} />
                          <div className="grid grid-cols-2 gap-4">
                            <InfoBlock label="Cores Desejadas" value={clientBriefing.cor_desejada} />
                            <InfoBlock label="Cores Bloqueadas (Não usar)" value={clientBriefing.cor_nao_desejada} />
                          </div>
                          <InfoBlock label="Onde a Identidade será mais aplicada?" value={clientBriefing.onde_verao} />
                          
                          <div className="mt-4 p-6 border border-white bg-white/40 rounded-3xl shadow-sm">
                            <InfoBlock label="Sobre o Logotipo Atual (O que gosta/não gosta)" value={clientBriefing.logo_atual} />
                            {clientBriefing.logo_atual_url && (
                              <div className="mt-4">
                                <p className="font-roboto text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50 mb-2">Logotipo Antigo Anexado:</p>
                                <img src={clientBriefing.logo_atual_url} alt="Logo Atual" className="max-w-[250px] border-4 border-white shadow-sm rounded-[1rem] hover:scale-105 transition-transform" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-[var(--color-atelier-grafite)]/5 pb-2">8. Considerações Finais</h3>
                        <div className="flex flex-col gap-4">
                          <InfoBlock label="Por que escolheu a Liz Design?" value={clientBriefing.motivo_escolha} />
                          <InfoBlock label="Observações e Extensões" value={clientBriefing.ideias_livres} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-50">
                    <FileText size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
                    <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Briefing não encontrado.</h2>
                    <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/70 font-medium">O cliente ainda não preencheu o formulário estratégico.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          CABEÃƒâ€¡ALHO PRINCIPAL DO ESTÃƒÅ¡DIO
          ========================================== */}
      <header className="flex justify-between items-end shrink-0 animate-[fadeInUp_0.5s_ease-out] relative z-20">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-terracota)]/20 shadow-sm flex items-center justify-center text-[var(--color-atelier-terracota)] font-elegant text-3xl overflow-hidden shrink-0 hover:scale-105 transition-transform">
             {currentProject.profiles?.avatar_url ? (
               <img src={currentProject.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover opacity-90" />
             ) : (
               currentProject.profiles?.nome?.charAt(0) || "C"
             )}
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-1">
              <span className={`px-3 py-1 rounded-lg text-[9px] uppercase tracking-widest font-bold border shadow-inner 
                ${currentProject.status === 'archived' ? 'bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] border-[var(--color-atelier-grafite)]/20' 
                : currentProject.status === 'delivered' ? 'bg-orange-500/10 text-orange-700 border-orange-500/20' 
                : 'bg-green-500/10 text-green-700 border-green-500/20'}`}>
                {currentProject.status === 'archived' ? 'Arquivado (Sem Acesso)' : currentProject.status === 'delivered' ? 'Entregue (Aviso 15 Dias)' : 'Ativo'}
              </span>
              <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">{currentProject.type}</span>
              
              {/* Badge de Contrato Vencendo */}
              {(() => {
                if (currentProject.contract_end) {
                  const endDate = new Date(currentProject.contract_end);
                  const today = new Date();
                  const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                  
                  if (diffDays <= 30 && diffDays >= 0) {
                    return (
                      <span className="px-3 py-1 rounded-lg text-[9px] uppercase tracking-widest font-bold border shadow-inner bg-red-500/10 text-red-600 border-red-500/20 animate-pulse">
                        Vence em {diffDays} dias
                      </span>
                    );
                  }
                  if (diffDays < 0) {
                     return (
                      <span className="px-3 py-1 rounded-lg text-[9px] uppercase tracking-widest font-bold border shadow-inner bg-red-600 text-white border-red-700">
                        Contrato Vencido
                      </span>
                    );
                  }
                }
                return null;
              })()}
            </div>
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsClientMenuOpen(!isClientMenuOpen)}>
              <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none flex items-center gap-2 group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate max-w-[300px] md:max-w-md">
                {currentProject.profiles?.nome || "Cliente"} 
                <ChevronDown size={20} className={`text-[var(--color-atelier-grafite)]/40 transition-transform duration-300 shrink-0 ${isClientMenuOpen ? 'rotate-180' : ''}`} />
                <span className="text-[var(--color-atelier-grafite)]/40 px-2 shrink-0 hidden md:inline">/</span> <span className="text-[var(--color-atelier-terracota)] italic text-3xl shrink-0 hidden md:inline"></span>
              </h1>
            </div>
            
            <AnimatePresence>
              {isClientMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.2 }}
                  className="absolute top-[110%] left-0 w-[calc(100vw-3rem)] max-w-[300px] md:max-w-none md:w-[300px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(122,116,112,0.15)] rounded-2xl overflow-hidden z-50 flex flex-col py-2"
                >
                  <div className="px-4 py-2 border-b border-[var(--color-atelier-grafite)]/5 text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Projetos Ativos</div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {validProjects.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => { 
                          setActiveProjectId(p.id); 
                          setIsClientMenuOpen(false); 
                          showToast(`Acessando espaço de ${p.profiles?.nome}...`); 
                        }}
                        className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${p.id === activeProjectId ? 'bg-[var(--color-atelier-terracota)]/5' : 'hover:bg-white'}`}
                      >
                        <div className="w-8 h-8 rounded-xl border border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] flex items-center justify-center overflow-hidden text-xs font-bold shrink-0 shadow-inner">
                          {p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : p.profiles?.nome?.charAt(0)}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className={`font-roboto text-[13px] truncate ${p.id === activeProjectId ? 'font-bold text-[var(--color-atelier-terracota)]' : 'font-medium text-[var(--color-atelier-grafite)]'}`}>{p.profiles?.nome}</span>
                          <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 truncate mt-0.5">
                            {p.status === 'archived' ? 'Arquivado' : p.status === 'delivered' ? 'Entregue' : p.type}
                          </span>
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


        {/* Ã°Å¸Å¸Â¢ RENDERIZAÃƒâ€¡ÃƒÆ’O CONDICIONAL: Botões IDV ou Menu Instagram / Agência */}
        {isIdv && !isAgency ? (
        <div className="flex flex-col gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both] relative z-10 w-full max-w-6xl mx-auto">
          
          {/* HEADER DASHBOARD */}
          <div className="glass-panel p-6 rounded-[2.5rem] bg-white/40 border border-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[var(--color-atelier-rose)] flex items-center justify-center text-[var(--color-atelier-terracota)]">
                  <FolderKanban size={24} />
                </div>
                <div>
                   <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">{currentProject?.profiles?.nome || 'Projeto IDV'}</h2>
                   <div className="flex items-center gap-3 mt-1">
                      <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Fase Atual:</span>
                      <span className="bg-white px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20 shadow-sm">{currentProject?.idv_phase || currentProject?.fase || 'onboarding'}</span>
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-6">
                {/* Deadline */}
                <div className="flex flex-col items-end">
                   <label className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-1 flex items-center gap-1"><Calendar size={10} /> Deadline</label>
                   <input type="date" value={deadlineDate} onChange={(e) => handleDeadlineChange(e.target.value)} className="bg-white/80 px-4 py-2 rounded-xl text-[12px] text-[var(--color-atelier-grafite)] outline-none cursor-pointer font-bold border border-transparent focus:border-[var(--color-atelier-terracota)]/30 shadow-sm transition-colors" />
                </div>
                {/* Ações Rápidas de Status */}
                <div className="flex items-center gap-2">
                   {currentProject.status === 'archived' ? (
                     <button onClick={handleReactivateProject} className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Reativar"><RotateCcw size={16} /></button>
                   ) : currentProject.status === 'delivered' ? (
                     <button onClick={handleForceArchive} className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all shadow-sm" title="Arquivar"><Archive size={16} /></button>
                   ) : (
                     <button onClick={handleMarkAsDelivered} className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm" title="Entregar"><CheckCircle2 size={16} /></button>
                   )}
                   <button onClick={() => { setIsForceUnlocked(true); showToast("Acesso desbloqueado manualmente."); }} disabled={isCofreUnlocked} className="w-10 h-10 bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)] rounded-full flex items-center justify-center hover:bg-[var(--color-atelier-grafite)] hover:text-white disabled:opacity-30 transition-all shadow-sm" title="Liberar Acesso">
                      {isCofreUnlocked ? <Unlock size={16} className="text-green-600" /> : <Lock size={16} />}
                   </button>
                </div>
             </div>
          </div>

          {/* MAIN ACTIONS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             
             {/* 1. Briefing */}
             <button onClick={() => setIsBriefingModalOpen(true)} className="glass-panel p-6 rounded-[2rem] bg-white/40 flex flex-col items-center justify-center text-center gap-4 border border-white shadow-sm hover:shadow-md hover:bg-white/80 transition-all group">
               <div className="w-16 h-16 rounded-full bg-[var(--color-atelier-grafite)]/5 flex items-center justify-center text-[var(--color-atelier-grafite)] group-hover:scale-110 transition-transform">
                 <FileText size={24} />
               </div>
               <div>
                 <h4 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">Briefing</h4>
                 <p className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest font-bold mt-1">Ler & Ajustar</p>
               </div>
             </button>

             {/* 2. Direcionar */}
             <button onClick={() => setShowTerritoriesPanel(true)} className="glass-panel p-6 rounded-[2rem] bg-white/40 flex flex-col items-center justify-center text-center gap-4 border border-white shadow-sm hover:shadow-md hover:bg-white/80 transition-all group">
               <div className="w-16 h-16 rounded-full bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-terracota)]/20 flex items-center justify-center text-[var(--color-atelier-terracota)] group-hover:scale-110 transition-transform">
                 <Compass size={24} />
               </div>
               <div>
                 <h4 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">Direcionar</h4>
                 <p className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest font-bold mt-1">Moodboards & Conceitos</p>
               </div>
             </button>

             {/* 3. Materiais Finais */}
             <ProjectAssetsManager projectId={activeProjectId} />

             {/* 4. Enviar (Gerar Trilha) */}
             <button onClick={handleGenerateIDVTasks} disabled={isGeneratingIDVTasks} className="glass-panel p-6 rounded-[2rem] bg-[var(--color-atelier-terracota)] flex flex-col items-center justify-center text-center gap-4 border border-[var(--color-atelier-terracota)]/20 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all group disabled:opacity-70 disabled:hover:translate-y-0">
               <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                 {isGeneratingIDVTasks ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
               </div>
               <div>
                 <h4 className="font-elegant text-xl text-white">Enviar</h4>
                 <p className="font-roboto text-[10px] text-white/70 uppercase tracking-widest font-bold mt-1">Propagar Etapa</p>
               </div>
             </button>

          </div>

          {/* SECONDARY ROW (Revelação & Contrato) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Revelação */}
             <div className="glass-panel p-8 rounded-[2.5rem] bg-white/40 border border-white shadow-sm flex flex-col justify-center">
                <RevealCeremonyAdmin project={currentProject} onUpdate={refreshGlobalData} />
             </div>

             {/* Contrato e Financeiro */}
             <div className="glass-panel p-8 rounded-[2.5rem] bg-white/40 border border-white shadow-sm flex flex-col justify-center">
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-6 flex items-center gap-2">
                  <FileText size={20} className="text-[var(--color-atelier-terracota)]" /> Documentos do Projeto
                </h3>
                
                 {!contractUrl ? (
                    <label className="w-full h-full min-h-[100px] bg-white/60 hover:bg-white border-2 border-dashed border-[var(--color-atelier-grafite)]/20 rounded-[1.5rem] p-6 flex flex-col items-center justify-center cursor-pointer transition-all shadow-sm group">
                      <input type="file" onChange={handleContractUpload} disabled={isUploadingContract} className="hidden" />
                      {isUploadingContract ? <Loader2 size={24} className="animate-spin text-[var(--color-atelier-grafite)]/50" /> : <UploadCloud size={24} className="text-[var(--color-atelier-terracota)] mb-3 group-hover:scale-110 transition-transform" />}
                      <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">{isUploadingContract ? "Enviando..." : "Anexar Contrato Assinado (PDF)"}</span>
                    </label>
                 ) : (
                    <div className="w-full bg-green-50 border border-green-200 p-6 rounded-[1.5rem] flex flex-col items-center justify-center gap-4 shadow-sm">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 size={24}/></div>
                      <span className="font-roboto text-[12px] font-bold uppercase tracking-widest text-green-700">Contrato Vigente Anexado</span>
                      <div className="flex gap-2 w-full mt-2">
                        <a href={contractUrl} target="_blank" rel="noreferrer" className="flex-1 bg-white border border-green-200 text-green-700 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest text-center hover:bg-green-100 transition-colors">Visualizar</a>
                        <button onClick={() => { if(window.confirm("Substituir contrato?")) setContractUrl("") }} className="px-5 rounded-xl bg-white border border-red-100 text-red-500 hover:bg-red-50 transition-colors text-[11px] font-bold uppercase tracking-widest">Remover</button>
                      </div>
                    </div>
                 )}
             </div>
          </div>

        </div>

      ) : (
        <div className="flex-1 flex flex-col min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both] relative z-10">
          <GerenciamentoWorkspace activeProjectId={activeProjectId} activeSubclientId={activeSubclientId} currentProject={currentProject} activeTab={activeTab} />
        </div>
      )}

      
      {/* ==========================================
          PAINEL DESLIZANTE (TERRITÃ“RIOS VISUAIS)
          ========================================== */}
      <AnimatePresence>
        {isIdv && showTerritoriesPanel && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTerritoriesPanel(false)} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/40 backdrop-blur-md cursor-pointer"></motion.div>
            
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-[900px] h-full bg-[var(--color-atelier-creme)] shadow-[-20px_0_50px_rgba(122,116,112,0.2)] flex flex-col border-l border-white overflow-hidden"
            >
              <div className="p-8 border-b border-[var(--color-atelier-grafite)]/10 bg-white/60 backdrop-blur-xl flex justify-between items-start shrink-0 z-20">
                <div>
                  <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3"><Compass size={24} className="text-[var(--color-atelier-terracota)]" /> Painel de Direcionar (Moodboards)</h2>
                  <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest font-bold mt-2">
                    Projeto: {currentProject?.profiles?.nome}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowTerritoriesPanel(false)} className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-red-500 transition-all shadow-sm border border-white">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <AdminTerritoriesManager projectId={activeProjectId} currentUser={null} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      

    </div>
  );
}

export default function ProjetosAdminPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-roboto text-[10px] uppercase tracking-widest opacity-50">Carregando Painel...</div>}>
      <PainelIdentidade />
    </Suspense>
  );
}



