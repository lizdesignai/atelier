// src/app/admin/projetos/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UploadCloud, Lock, Unlock, 
  Image as ImageIcon, Send, FileText, CheckCircle2,
  Settings2, Plus, ChevronDown, Calendar,
  Compass, X, Sparkles, Download, Loader2, Trash2, Archive, Eye, RotateCcw, BrainCircuit,
  LayoutDashboard, Target, CalendarDays, MapPin
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useGlobalStore } from "../../../contexts/GlobalStore"; // 🧠 INJEÇÃO DA MEMÓRIA GLOBAL
import DiaryModule from "../../../components/admin/DiaryModule";
import { pdf } from '@react-pdf/renderer';

// IMPORTAÇÃO EXTERNA: Traz apenas o Motor de Gestão de Instagram
import { GerenciamentoWorkspace } from "../gerenciamento/page";

// Importação do nosso Motor de Automação
import { AtelierPMEngine } from "../../../lib/AtelierPMEngine";

// Importação dos Módulos PDF
import BriefingPDF from "../../../components/pdf/BriefingPDF"; 
import CuradoriaPDF from "../../../components/pdf/CuradoriaPDF"; 
import InstagramBriefingPDF from "../../../components/pdf/InstagramBriefingPDF"; 
import BrandbookPDF from "../../../components/pdf/BrandbookPDF"; 

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ============================================================================
// DICIONÁRIOS GLOBAIS (Partilhados)
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
      <span className="font-roboto text-sm text-[var(--color-atelier-grafite)] mt-1 whitespace-pre-wrap">{value}</span>
    </div>
  );
}

function WorkspaceDesigner() {
  // ==========================================
  // ESTADOS DO SUPABASE (CONSUMO DE RAM)
  // ==========================================
  const { activeProjects, isGlobalLoading, refreshGlobalData } = useGlobalStore();
  
  const [isLocalLoading, setIsLocalLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);

  // Derivação automática
  const validProjects = activeProjects.filter(p => ['active', 'delivered', 'archived'].includes(p.status));
  const currentProject = validProjects.find(p => p.id === activeProjectId);
  const isIdv = isIdvService(currentProject); 

  // Carregamento instantâneo via RAM
  useEffect(() => {
    if (isGlobalLoading) return;
    
    if (validProjects.length > 0 && !activeProjectId) {
      setActiveProjectId(validProjects[0].id);
    }
    setIsLocalLoading(false);
  }, [isGlobalLoading, activeProjects.length]);

  useEffect(() => {
    if (currentProject) {
      setDeadlineDate(currentProject.data_limite || "");
      setContractUrl(currentProject.contract_url || "");
      setBriefingAiInsight(currentProject.briefing_ai_insight || null);
      setCuradoriaAiInsight(currentProject.curadoria_ai_insight || null);
    }
  }, [currentProject]);

  // ==========================================
  // ESTADOS DOS FICHEIROS, CONTRATO E BRIEFING
  // ==========================================
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

  // FETCHING PARALELO (Ativos e Briefing)
  useEffect(() => {
    if (!activeProjectId) return;
    const fetchAssetsAndBriefing = async () => {
      try {
        const [ { data: assetsData }, { data: briefingData } ] = await Promise.all([
          supabase.from('project_assets').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false }),
          supabase.from('client_briefings').select('answers, is_completed').eq('project_id', activeProjectId).maybeSingle()
        ]);
        
        if (assetsData) setProjectAssets(assetsData);
        
        // Verifica se o briefing existe e se está preenchido (is_completed !== false)
        if (briefingData && briefingData.answers && briefingData.is_completed !== false) {
          setClientBriefing(briefingData.answers);
        } else {
          setClientBriefing(null);
        }
      } catch (error) {
        console.error("Erro no fetching paralelo:", error);
      }
    };
    fetchAssetsAndBriefing();
  }, [activeProjectId]);

  // ==========================================
  // NOVA AÇÃO: DEVOLVER BRIEFING (Optimistic UI)
  // ==========================================
  const handleReturnBriefing = async () => {
    if (!activeProjectId || !clientBriefing) return;
    if (!window.confirm("Deseja devolver o briefing para o cliente? Ele precisará revisar e reenviar.")) return;
    
    // MUTAÇÃO OTIMISTA: Limpa a tela imediatamente
    setClientBriefing(null);
    setIsBriefingModalOpen(false);
    showToast("Briefing devolvido. O cliente foi notificado para rever.");

    // BACKGROUND SYNC
    try {
      await supabase.from('client_briefings').update({ is_completed: false }).eq('project_id', activeProjectId);
    } catch (e) {
      showToast("Erro ao processar devolução de briefing.");
    }
  };

  // ==========================================
  // PONTO DE INTERVENÇÃO 4: AUTOMAÇÃO DO DIÁRIO DE BORDO
  // ==========================================
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

  // ==========================================
  // MOTORES DE INTELIGÊNCIA ARTIFICIAL
  // ==========================================
  const handleGenerateBriefingInsight = async () => {
    if (!activeProjectId || !clientBriefing) return;
    setIsGeneratingBriefingInsight(true);
    showToast("IA CBO: A analisar o briefing detalhadamente...");
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

      await supabase.from('projects').update({ briefing_ai_insight: data.insight }).eq('id', activeProjectId);
      setBriefingAiInsight(data.insight);
      refreshGlobalData(); // Sincroniza RAM
      showToast("Diagnóstico CBO gerado com sucesso! ✨");
    } catch (e) {
      showToast("Erro ao processar insight da IA.");
    } finally {
      setIsGeneratingBriefingInsight(false);
    }
  };

  const handleGenerateCuradoriaInsight = async () => {
    if (!activeProjectId || adminRefs.length === 0) return;
    setIsGeneratingCuradoriaInsight(true);
    showToast("IA Diretora de Arte: A ler direções visuais...");
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

      await supabase.from('projects').update({ curadoria_ai_insight: data.insight }).eq('id', activeProjectId);
      setCuradoriaAiInsight(data.insight);
      refreshGlobalData(); // Sincroniza RAM
      showToast("Análise Visual gerada com sucesso! ✨");
    } catch (e) {
      showToast("Erro ao processar insight da IA.");
    } finally {
      setIsGeneratingCuradoriaInsight(false);
    }
  };

  // ==========================================
  // MOTORES DE PDF VETORIAL
  // ==========================================
  const handleDownloadBriefingPDF = async () => {
    if (!clientBriefing) {
      showToast("Erro: O conteúdo do Briefing ainda não foi carregado.");
      return;
    }
    
    setIsGeneratingPDF(true);
    showToast("A forjar Dossiê Vetorial...");
    
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const BriefingPDF = (await import('../../../components/pdf/BriefingPDF')).default;
      
      const doc = <BriefingPDF clientBriefing={clientBriefing} projectName={currentProject?.profiles?.nome || 'Cliente'} aiInsight={briefingAiInsight || undefined} />;
      const blob = await pdf(doc).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Dossie_Estrategico_${currentProject?.profiles?.nome || 'Cliente'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      showToast("Dossiê exportado com sucesso!");
    } catch (error) {
      console.error("Crash no PDF:", error);
      showToast("Erro crítico ao gerar o arquivo vetorial.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadCuradoriaPDF = async () => {
    if (adminRefs.length === 0) return;
    setIsGeneratingCuradoriaPDF(true);
    showToast("A compilar a Curadoria em PDF Vetorial...");
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
      console.error(error);
      showToast("Erro ao gerar PDF da Curadoria.");
    } finally {
      setIsGeneratingCuradoriaPDF(false);
    }
  };

  // UPLOAD DE ATIVOS FINAIS E CONTRATO
  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;

    setIsUploadingAsset(true);
    showToast("A enviar ficheiro para o cofre seguro...");

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
      showToast("✨ Ficheiro adicionado aos Ativos Finais!");

    } catch (error: any) {
      console.error("Erro no upload:", error);
      showToast("Erro ao fazer upload do ficheiro.");
    } finally {
      setIsUploadingAsset(false);
      e.target.value = '';
    }
  };

  const handleRemoveAsset = async (assetId: string) => {
    const confirm = window.confirm("Tem a certeza que deseja apagar este ficheiro do cofre?");
    if (!confirm) return;

    try {
      await supabase.from('project_assets').delete().eq('id', assetId);
      setProjectAssets(projectAssets.filter(a => a.id !== assetId));
      showToast("Ficheiro removido do cofre.");
    } catch (error) {
      showToast("Erro ao apagar ficheiro.");
    }
  };

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;

    setIsUploadingContract(true);
    showToast("A fazer upload do contrato assinado...");

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${activeProjectId}_contrato_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('vault_assets').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('vault_assets').getPublicUrl(fileName);
      
      const { error: dbError } = await supabase.from('projects').update({ contract_url: data.publicUrl }).eq('id', activeProjectId);
      if (dbError) throw dbError;
      
      setContractUrl(data.publicUrl);
      refreshGlobalData(); // Sync Global RAM
      showToast("Contrato arquivado com sucesso no Cofre!");

    } catch (error) {
      console.error(error);
      showToast("Erro ao fazer upload do contrato.");
    } finally {
      setIsUploadingContract(false);
      e.target.value = ''; 
    }
  };


  // ==========================================
  // MOTOR DE TEMPO E FASE E ENTREGAS (OTIMISTA)
  // ==========================================
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
      await supabase.from('projects').update({ data_limite: newDate }).eq('id', activeProjectId);
      showToast(`Prazo gravado: ${newDate.split('-').reverse().join('/')}`);
      refreshGlobalData(); // Sync
    }
  };

  const handleStageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novaFase = e.target.value;
    if (activeProjectId) {
      await supabase.from('projects').update({ fase: novaFase }).eq('id', activeProjectId);
      showToast("Fase do projeto atualizada com sucesso!");
      refreshGlobalData(); // Sync
    }
  };

  const handleMarkAsDelivered = async () => {
    if (!activeProjectId) return;
    if (!window.confirm("Deseja marcar este projeto como ENTREGUE? O cliente terá 15 dias de acesso às abas antes delas serem arquivadas.")) return;

    try {
      await supabase
        .from('projects')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', activeProjectId);

      showToast("Projeto marcado como Entregue! A contagem regressiva de 15 dias começou.");
      refreshGlobalData(); // Sync
    } catch (error) {
      showToast("Erro ao marcar projeto como entregue.");
    }
  };

  const handleForceArchive = async () => {
    if (!activeProjectId) return;
    if (!window.confirm("ATENÇÃO: O cliente perderá acesso IMEDIATO ao cofre e canais deste projeto. Deseja prosseguir?")) return;

    try {
      await supabase.from('projects').update({ status: 'archived' }).eq('id', activeProjectId);
      showToast("Projeto Arquivado com sucesso! O cliente está agora na fase de Legado.");
      refreshGlobalData(); // Sync
    } catch (error) {
      showToast("Erro ao arquivar projeto.");
    }
  };

  const handleReactivateProject = async () => {
    if (!activeProjectId) return;
    if (!window.confirm("Deseja REATIVAR este projeto? O cliente voltará a ter acesso total à sua mesa de trabalho.")) return;

    try {
      await supabase.from('projects').update({ status: 'active', delivered_at: null }).eq('id', activeProjectId);
      showToast("Projeto Reativado com sucesso!");
      refreshGlobalData(); // Sync
    } catch (error) {
      showToast("Erro ao reativar projeto.");
    }
  };

  const isCofreUnlocked = (daysLeft === 0 && deadlineDate !== "") || isForceUnlocked;

  // ==========================================
  // PAINEL DE CURADORIA (MULTI-IMAGENS & PDF)
  // ==========================================
  const [showRefsPanel, setShowRefsPanel] = useState(false);
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
    showToast("A enviar Direções Visuais para o cliente...");

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
    
    // MUTAÇÃO OTIMISTA
    setAdminRefs(adminRefs.filter(ref => ref.id !== id));
    setActiveEvalIndex(0); 
    showToast("Direção visual removida.");
    
    try {
      await supabase.from('design_directions').delete().eq('id', id);
    } catch (error) {
      showToast("Erro ao remover direção no banco.");
    }
  };

  if (isGlobalLoading || isLocalLoading) {
    return <div className="flex h-[calc(100vh-80px)] items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
        <Settings2 size={48} className="text-[var(--color-atelier-grafite)]" />
        <h2 className="font-elegant text-3xl">Nenhum projeto ativo.</h2>
        <p className="font-roboto text-sm">Crie um projeto na Base de Clientes para aceder à Mesa de Trabalho.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          MODAL DO BRIEFING (DOSSIÊ ADMIN)
          ========================================== */}
      <AnimatePresence>
        {isBriefingModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsBriefingModalOpen(false)}></motion.div>
            
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[#FEF5E6] w-full h-full max-w-4xl rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden border border-white">
              
              <div className="p-5 border-b border-[var(--color-atelier-grafite)]/10 flex justify-between items-center bg-white/50 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-[var(--color-atelier-terracota)]" />
                  <span className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Dossiê Estratégico do Cliente</span>
                </div>
                <div className="flex items-center gap-3">
                  
                  {/* NOVO BOTÃO: DEVOLVER BRIEFING */}
                  <button onClick={handleReturnBriefing} disabled={!clientBriefing} className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-full flex items-center gap-2 font-roboto text-[10px] uppercase tracking-widest font-bold hover:bg-red-500 hover:text-white transition-all shadow-sm disabled:opacity-50">
                    <RotateCcw size={14} /> Devolver Briefing
                  </button>
                  
                  {/* BOTÃO CÉREBRO DA IA */}
                  <button onClick={handleGenerateBriefingInsight} disabled={isGeneratingBriefingInsight || !clientBriefing} className="bg-white border border-[var(--color-atelier-terracota)]/40 text-[var(--color-atelier-terracota)] px-4 py-2 rounded-full flex items-center gap-2 font-roboto text-[10px] uppercase tracking-widest font-bold hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all shadow-sm disabled:opacity-50">
                    {isGeneratingBriefingInsight ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />} Gerar IA (CBO)
                  </button>

                  <button onClick={handleDownloadBriefingPDF} disabled={isGeneratingPDF || !clientBriefing} className="bg-[var(--color-atelier-grafite)] text-white px-4 py-2 rounded-full flex items-center gap-2 font-roboto text-[10px] uppercase tracking-widest font-bold hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-md disabled:opacity-50">
                    {isGeneratingPDF ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Baixar PDF Vetorial
                  </button>
                  
                  <button onClick={() => setIsBriefingModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 w-full bg-white overflow-y-auto custom-scrollbar p-8">
                {clientBriefing ? (
                  <div className="max-w-3xl mx-auto bg-white p-8 border border-[var(--color-atelier-grafite)]/10 rounded-[2rem] shadow-sm">
                    <div className="text-center mb-12 border-b-2 border-[var(--color-atelier-terracota)] pb-8">
                      <div className="flex justify-center mb-6">
                        <img src="/images/simbolo-rosa.png" alt="Atelier" className="w-16 h-16 object-contain grayscale opacity-50" />
                      </div>
                      <h1 className="font-elegant text-5xl text-[var(--color-atelier-grafite)] mb-2">Briefing Oficial</h1>
                      <h2 className="font-roboto text-lg text-[var(--color-atelier-terracota)] uppercase tracking-widest font-bold">{currentProject.profiles?.nome}</h2>
                      <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/50 mt-2">Documento Confidencial de Identidade Visual</p>
                    </div>

                    {/* Exibição em Tempo Real do Insight da IA */}
                    {briefingAiInsight && (
                      <div className="mb-10 bg-[var(--color-atelier-creme)] p-6 rounded-2xl border-l-4 border-[var(--color-atelier-terracota)]">
                        <h3 className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] mb-4 flex items-center gap-2">
                          <Sparkles size={14}/> Diagnóstico de Marca (CBO AI)
                        </h3>
                        <div className="font-roboto text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed whitespace-pre-wrap">
                           {briefingAiInsight}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-10">
                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-gray-100 pb-2">1. Dados & Contato</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoBlock label="Nome do Responsável" value={clientBriefing.nome} />
                          <InfoBlock label="WhatsApp" value={clientBriefing.whatsapp} />
                          <InfoBlock label="E-mail de Contato" value={clientBriefing.email} />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-gray-100 pb-2">2. A Marca</h3>
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
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-gray-100 pb-2">3. Essência & História</h3>
                        <div className="flex flex-col gap-4">
                          <InfoBlock label="Por que a empresa foi aberta? Qual a motivação?" value={clientBriefing.motivo_abertura} />
                          <InfoBlock label="Propósito principal além de lucrar" value={clientBriefing.proposito} />
                          <div className="grid grid-cols-3 gap-4">
                            <InfoBlock label="Tempo de Mercado" value={clientBriefing.tempo_mercado} />
                            <InfoBlock label="A Marca em Emojis" value={clientBriefing.emoji} />
                            <InfoBlock label="Música que a define" value={clientBriefing.musica} />
                          </div>
                          <InfoBlock label="O Sentimento que a marca vende" value={clientBriefing.sentimento} />
                          <InfoBlock label="Visão de Futuro (Em 5 Anos)" value={clientBriefing.visao_5_anos} />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-gray-100 pb-2">4. Público Alvo</h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <InfoBlock label="Gênero" value={clientBriefing.genero === 'Outro' ? clientBriefing.genero_outro : clientBriefing.genero} />
                          <InfoBlock label="Classe Social" value={clientBriefing.classe === 'Outro' ? clientBriefing.classe_outro : clientBriefing.classe} />
                          <InfoBlock label="Idade" value={clientBriefing.idade === 'Outro' ? clientBriefing.idade_outro : clientBriefing.idade} />
                        </div>
                        <InfoBlock label="Resumo Comportamental do Público" value={clientBriefing.resumo_publico} />
                      </div>

                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-gray-100 pb-2">5. Posicionamento de Mercado</h3>
                        <div className="flex flex-col gap-4">
                          <InfoBlock label="Concorrentes Principais" value={clientBriefing.concorrentes_links} />
                          <InfoBlock label="Diferencial Competitivo" value={clientBriefing.diferencial} />
                          <InfoBlock label="O que definitivamente NÃO fazer (Vícios da concorrência)" value={clientBriefing.nao_fazer} />
                          <InfoBlock label="Referências Visuais do Cliente" value={clientBriefing.referencias} />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-gray-100 pb-2">6. Personalidade e Estética</h3>
                        <div className="flex flex-col gap-4">
                          <InfoBlock label="Sentimento Exigido da Marca" value={clientBriefing.sentimento_marca} />
                          <InfoBlock label="A Missão Oficial" value={clientBriefing.missao} />
                          
                          <div className="grid grid-cols-2 gap-8 mt-2 bg-gray-50 p-4 rounded-xl">
                            <div>
                              <p className="font-roboto text-[10px] uppercase font-bold text-[var(--color-atelier-terracota)] mb-2">Adjetivos Positivos (A Marca É)</p>
                              <p className="font-roboto text-sm text-[var(--color-atelier-grafite)] leading-relaxed">
                                {clientBriefing.adjetivos_positivos?.join(", ")} {clientBriefing.adjetivos_positivos_outro && `, ${clientBriefing.adjetivos_positivos_outro}`}
                              </p>
                              <p className="mt-2 text-sm text-[var(--color-atelier-grafite)]"><strong>Top 3:</strong> {clientBriefing.top_3_adjetivos}</p>
                            </div>
                            <div>
                              <p className="font-roboto text-[10px] uppercase font-bold text-red-600 mb-2">Adjetivos Negativos (A Marca NÃO É)</p>
                              <p className="font-roboto text-sm text-[var(--color-atelier-grafite)] leading-relaxed">
                                {clientBriefing.adjetivos_negativos?.join(", ")} {clientBriefing.adjetivos_negativos_outro && `, ${clientBriefing.adjetivos_negativos_outro}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-gray-100 pb-2">7. Restrições e Direções Visuais</h3>
                        <div className="flex flex-col gap-4">
                          <InfoBlock label="Pedido de Símbolo Específico" value={clientBriefing.simbolo} />
                          <div className="grid grid-cols-2 gap-4">
                            <InfoBlock label="Cores Desejadas" value={clientBriefing.cor_desejada} />
                            <InfoBlock label="Cores Bloqueadas (Não usar)" value={clientBriefing.cor_nao_desejada} />
                          </div>
                          <InfoBlock label="Onde a Identidade será mais aplicada?" value={clientBriefing.onde_verao} />
                          
                          <div className="mt-4 p-4 border border-gray-200 rounded-xl">
                            <InfoBlock label="Sobre o Logotipo Atual (O que gosta/não gosta)" value={clientBriefing.logo_atual} />
                            {clientBriefing.logo_atual_url && (
                              <div className="mt-4">
                                <p className="font-roboto text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50 mb-2">Logotipo Antigo Anexado:</p>
                                <img src={clientBriefing.logo_atual_url} alt="Logo Atual" className="max-w-[200px] border rounded-lg" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-gray-100 pb-2">8. Considerações Finais</h3>
                        <div className="flex flex-col gap-4">
                          <InfoBlock label="Por que escolheu o Atelier?" value={clientBriefing.motivo_escolha} />
                          <InfoBlock label="Ideias Livres e Extensões" value={clientBriefing.ideias_livres} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-50">
                    <FileText size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
                    <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Briefing não encontrado.</h2>
                    <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/70">O cliente ainda não preencheu o formulário estratégico.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          CABEÇALHO PRINCIPAL DO ESTÚDIO
          ========================================== */}
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
                {currentProject.status === 'archived' ? 'Arquivado (Sem Acesso)' : currentProject.status === 'delivered' ? 'Entregue (Aviso 15 Dias)' : 'Ativo'}
              </span>
              <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">{currentProject.type}</span>
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
                  className="absolute top-[110%] left-0 w-[300px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(122,116,112,0.15)] rounded-2xl overflow-hidden z-50 flex flex-col py-2"
                >
                  <div className="px-4 py-2 border-b border-[var(--color-atelier-grafite)]/5 text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Projetos no Estúdio</div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {validProjects.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => { 
                          setActiveProjectId(p.id); 
                          setIsClientMenuOpen(false); 
                          showToast(`A carregar mesa de ${p.profiles?.nome}...`); 
                        }}
                        className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${p.id === activeProjectId ? 'bg-[var(--color-atelier-terracota)]/5' : 'hover:bg-white'}`}
                      >
                        <div className="w-8 h-8 rounded-full border border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] flex items-center justify-center overflow-hidden text-xs font-bold shrink-0">
                          {p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : p.profiles?.nome?.charAt(0)}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className={`font-roboto text-[13px] truncate ${p.id === activeProjectId ? 'font-bold text-[var(--color-atelier-terracota)]' : 'font-medium text-[var(--color-atelier-grafite)]'}`}>{p.profiles?.nome}</span>
                          <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 truncate">
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

        <div className="flex gap-3 relative z-10 shrink-0">
          <button onClick={() => setShowRefsPanel(true)} className="glass-panel px-5 py-2.5 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:text-white hover:bg-[var(--color-atelier-terracota)] hover:border-transparent transition-all flex items-center gap-2 shadow-sm">
            <Compass size={14} /> Curadoria <span className="hidden md:inline">/ Referências</span>
          </button>
          <button onClick={() => setIsBriefingModalOpen(true)} className="glass-panel px-5 py-2.5 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] transition-colors flex items-center gap-2">
            <FileText size={14} /> Ler Briefing
          </button>
        </div>
      </header>

      {/* ==========================================
          MESA DE TRABALHO DINÂMICA (IDV ou INSTAGRAM)
          ========================================== */}
      {isIdv ? (
        <div className="flex gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both] relative z-10">
          
          {/* 1. COLUNA ESQUERDA: ENGENHARIA DO PROJETO */}
          <div className="w-[33%] flex flex-col h-full">
            <div className="glass-panel p-8 rounded-[2.5rem] bg-white/70 backdrop-blur-xl flex flex-col border border-white h-full shadow-[0_15px_40px_rgba(173,111,64,0.05)]">
              
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-[var(--color-atelier-grafite)]/5">
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                  <Settings2 size={20} className="text-[var(--color-atelier-terracota)]" /> Engenharia
                </h3>
                <div className="flex items-center gap-2">
                  {isCofreUnlocked ? (
                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200"><Unlock size={12}/> Aberto</span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-200"><Lock size={12}/> Fechado</span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-5 flex-1">
                
                {/* Box: Deadline */}
                <div className="bg-white/80 border border-white p-5 rounded-3xl shadow-[0_5px_15px_rgba(0,0,0,0.02)] flex flex-col gap-3 group transition-all hover:shadow-[0_10px_20px_rgba(173,111,64,0.05)] hover:border-[var(--color-atelier-terracota)]/20">
                   <div className="flex items-center justify-between w-full">
                     <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2"><Calendar size={14} className="text-[var(--color-atelier-terracota)]" /> Deadline</label>
                     <span className="font-elegant text-3xl text-[var(--color-atelier-terracota)] leading-none">{deadlineDate ? daysLeft : "-"} <span className="text-[10px] uppercase font-bold opacity-40 font-roboto">Dias</span></span>
                   </div>
                   <input type="date" value={deadlineDate} onChange={(e) => handleDeadlineChange(e.target.value)} className="w-full bg-white px-4 py-3 rounded-xl text-[13px] text-[var(--color-atelier-grafite)] outline-none cursor-pointer font-medium border border-[var(--color-atelier-grafite)]/5" />
                </div>

                {/* Box: Fase Atual */}
                <div className="bg-white/80 border border-white p-5 rounded-3xl shadow-[0_5px_15px_rgba(0,0,0,0.02)] flex flex-col gap-3 group transition-all hover:shadow-[0_10px_20px_rgba(173,111,64,0.05)] hover:border-[var(--color-atelier-terracota)]/20">
                   <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2"><Sparkles size={14} className="text-[var(--color-atelier-terracota)]" /> Fase Atual</label>
                   <select value={currentProject?.fase || "reuniao"} onChange={handleStageChange} className="w-full bg-white px-4 py-3 rounded-xl text-[13px] font-bold text-[var(--color-atelier-terracota)] outline-none cursor-pointer border border-[var(--color-atelier-grafite)]/5">
                      <option value="reuniao">1. Reunião de Alinhamento</option>
                      <option value="pesquisa">2. Estudo e Pesquisa</option>
                      <option value="direcionamento">3. Direcionamento Criativo</option>
                      <option value="processo">4. Processo Criativo IDV</option>
                      <option value="apresentacao">5. Apresentação Oficial</option>
                   </select>
                </div>

                {/* Box: Contrato */}
                <div className="bg-white/80 border border-white p-5 rounded-3xl shadow-[0_5px_15px_rgba(0,0,0,0.02)] flex flex-col gap-3 group transition-all hover:shadow-[0_10px_20px_rgba(173,111,64,0.05)] hover:border-[var(--color-atelier-terracota)]/20">
                   <div className="flex justify-between items-center w-full">
                     <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2"><FileText size={14} className="text-[var(--color-atelier-terracota)]" /> Contrato</label>
                     {contractUrl && <CheckCircle2 size={14} className="text-green-500" />}
                   </div>
                   
                   {!contractUrl ? (
                      <label className="w-full bg-white border border-dashed border-[var(--color-atelier-grafite)]/20 hover:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                        <input type="file" accept=".pdf" className="hidden" onChange={handleContractUpload} disabled={isUploadingContract} />
                        {isUploadingContract ? <Loader2 size={14} className="animate-spin text-[var(--color-atelier-terracota)]" /> : <UploadCloud size={14} className="text-[var(--color-atelier-grafite)]/40" />}
                        <span className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)]/60">{isUploadingContract ? "Anexando..." : "Anexar Assinado (PDF)"}</span>
                      </label>
                   ) : (
                      <div className="flex w-full gap-2">
                        <button onClick={() => window.open(contractUrl, "_blank")} className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl py-3 flex items-center justify-center gap-2 hover:border-[var(--color-atelier-terracota)] transition-colors"><Eye size={14} className="text-[var(--color-atelier-terracota)]" /><span className="font-roboto text-[11px] font-bold">Visualizar Documento</span></button>
                        <button onClick={() => { if(window.confirm("Deseja substituir este contrato?")) setContractUrl("") }} className="w-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"><X size={14}/></button>
                      </div>
                   )}
                </div>

                {/* Botões de Ação Rápida */}
                <div className="mt-auto grid grid-cols-2 gap-3 pt-6 border-t border-[var(--color-atelier-grafite)]/5">
                  {currentProject.status === 'archived' ? (
                     <button onClick={handleReactivateProject} className="bg-blue-600 text-white rounded-xl py-3.5 font-bold uppercase tracking-widest text-[9px] hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm"><RotateCcw size={14} /> Reativar</button>
                  ) : currentProject.status === 'delivered' ? (
                     <button onClick={handleForceArchive} className="bg-orange-600 text-white rounded-xl py-3.5 font-bold uppercase tracking-widest text-[9px] hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-sm"><Archive size={14} /> Arquivar</button>
                  ) : (
                     <button onClick={handleMarkAsDelivered} className="bg-green-600 text-white rounded-xl py-3.5 font-bold uppercase tracking-widest text-[9px] hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-sm"><CheckCircle2 size={14} /> Entregar</button>
                  )}
                  <button onClick={() => { setIsForceUnlocked(true); showToast("Cofre desbloqueado manualmente."); }} disabled={isCofreUnlocked} className="bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] rounded-xl py-3.5 font-bold uppercase tracking-widest text-[9px] hover:bg-[var(--color-atelier-terracota)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"><Unlock size={14} /> Abrir Cofre</button>
                </div>

              </div>
            </div>
          </div>

          {/* 2. COLUNA DO MEIO: COFRE / ATIVOS */}
          <div className="w-[30%] flex flex-col h-full">
            <div className="glass-panel p-8 rounded-[2.5rem] bg-white/70 backdrop-blur-xl flex flex-col border border-white h-full shadow-[0_15px_40px_rgba(173,111,64,0.05)]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><UploadCloud size={20} className="text-[var(--color-atelier-terracota)]" /> Ativos Finais</h3>
              </div>
              <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/50 mb-8 leading-relaxed">Ficheiros e apresentações que o cliente recebe no fim do projeto.</p>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-2">
                <label className="w-full bg-white/50 hover:bg-white border-2 border-dashed border-[var(--color-atelier-terracota)]/20 hover:border-[var(--color-atelier-terracota)]/50 rounded-3xl p-6 flex flex-col items-center justify-center group cursor-pointer transition-all shrink-0">
                  <input type="file" onChange={handleAssetUpload} disabled={isUploadingAsset} className="hidden" />
                  <div className="w-14 h-14 rounded-full bg-[var(--color-atelier-creme)] border border-white shadow-sm flex items-center justify-center text-[var(--color-atelier-terracota)] mb-3 group-hover:scale-110 transition-transform">
                    {isUploadingAsset ? <Loader2 size={24} className="animate-spin" /> : <Plus size={24} />}
                  </div>
                  <span className="block font-roboto font-bold text-[12px] text-[var(--color-atelier-grafite)] uppercase tracking-widest">{isUploadingAsset ? "A processar..." : "Adicionar Ficheiro"}</span>
                </label>

                <AnimatePresence>
                  {projectAssets.map(asset => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={asset.id} className="bg-white border border-[var(--color-atelier-grafite)]/5 rounded-2xl p-4 flex flex-col items-start shadow-[0_5px_15px_rgba(0,0,0,0.02)] hover:border-[var(--color-atelier-terracota)]/30 transition-colors group shrink-0 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-atelier-terracota)]/50"></div>
                      <div className="flex items-center gap-3 overflow-hidden w-full mb-3 pl-2">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0"><FileText size={16} /></div>
                        <a href={asset.file_url} target="_blank" rel="noreferrer" className="block font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] transition-colors truncate leading-tight pr-2">{asset.file_name}</a>
                      </div>
                      <div className="flex justify-between items-center w-full pl-2">
                        <span className="block font-roboto text-[9px] text-[var(--color-atelier-grafite)]/40 font-bold uppercase tracking-widest">{asset.file_size}</span>
                        <button onClick={() => handleRemoveAsset(asset.id)} className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/30 hover:text-red-500 flex items-center gap-1 transition-colors shrink-0"><Trash2 size={12} /> Apagar</button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {projectAssets.length === 0 && !isUploadingAsset && (
                  <div className="text-center p-6 text-[var(--color-atelier-grafite)]/30 font-roboto text-[11px] uppercase tracking-widest font-bold h-full flex flex-col items-center justify-center gap-3 opacity-50">
                    <UploadCloud size={32}/> O cofre está vazio.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. COLUNA DIREITA: DIÁRIO (MÓDULO EXTRAÍDO) */}
          <div className="w-[37%] h-full">
              <DiaryModule 
                 activeProjectId={activeProjectId} 
                 currentProject={currentProject} 
                 onActivity={handleDiaryActivity} 
              />
          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both] relative z-10">
          <GerenciamentoWorkspace activeProjectId={activeProjectId as string} currentProject={currentProject} />
        </div>
      )}

      {/* ==========================================
          PAINEL DESLIZANTE (CURADORIA & MULTI-IMAGENS)
          ========================================== */}
      <AnimatePresence>
        {isIdv && showRefsPanel && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRefsPanel(false)} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/20 backdrop-blur-sm cursor-pointer"></motion.div>
            
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-[800px] h-full bg-[var(--color-atelier-creme)] shadow-[-20px_0_50px_rgba(122,116,112,0.2)] flex flex-col border-l border-white overflow-hidden"
            >
              <div className="p-8 border-b border-[var(--color-atelier-grafite)]/10 bg-white/40 flex justify-between items-start shrink-0">
                <div>
                  <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3">Avaliações do Cliente</h2>
                  <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest font-bold mt-2">
                    Projeto: {currentProject?.profiles?.nome} • {adminRefs.length} Direções
                  </p>
                </div>
                <div className="flex gap-3">

                  {/* BOTÃO DE CÉREBRO DA IA DA CURADORIA */}
                  <button onClick={handleGenerateCuradoriaInsight} disabled={isGeneratingCuradoriaInsight || adminRefs.length === 0} className="bg-white border border-[var(--color-atelier-terracota)]/40 text-[var(--color-atelier-terracota)] px-4 py-2 rounded-xl flex items-center gap-2 font-roboto text-[10px] uppercase tracking-widest font-bold hover:border-[var(--color-atelier-terracota)] hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors shadow-sm disabled:opacity-50">
                    {isGeneratingCuradoriaInsight ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />} Gerar IA Diretor
                  </button>

                  <button onClick={handleDownloadCuradoriaPDF} disabled={isGeneratingCuradoriaPDF || adminRefs.length === 0} className="bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] px-4 py-2 rounded-xl flex items-center gap-2 font-roboto text-[10px] uppercase tracking-widest font-bold hover:border-[var(--color-atelier-terracota)] transition-colors shadow-sm disabled:opacity-50">
                    {isGeneratingCuradoriaPDF ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Baixar PDF Curadoria
                  </button>

                  <button onClick={() => setShowRefsPanel(false)} className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-red-500 transition-all shadow-sm border border-white">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-8 gap-8 relative">
                
                {/* Exibição em Tempo Real do Insight da IA da Curadoria */}
                {curadoriaAiInsight && (
                  <div className="mb-4 bg-white/60 p-6 rounded-2xl border-l-4 border-[var(--color-atelier-terracota)] shadow-sm">
                    <h3 className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] mb-4 flex items-center gap-2">
                      <Sparkles size={14}/> Análise Semiótica (Direção de Arte)
                    </h3>
                    <div className="font-roboto text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed whitespace-pre-wrap">
                        {curadoriaAiInsight}
                    </div>
                  </div>
                )}

                <section className="pb-8 border-b border-[var(--color-atelier-grafite)]/5">
                  <div className="flex items-center gap-2 mb-6 pb-2 border-b border-[var(--color-atelier-grafite)]/5">
                    <ImageIcon size={16} className="text-[var(--color-atelier-terracota)]" />
                    <h3 className="font-roboto text-[13px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Moodboard do Cliente</h3>
                  </div>
                  {clientMoodboard.length === 0 ? (
                    <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/40 italic">O cliente ainda não adicionou referências.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {clientMoodboard.map((img, i) => (
                        <div key={i} className="aspect-square rounded-2xl overflow-hidden border-4 border-white shadow-sm group relative">
                          <img src={img} onClick={() => window.open(img, "_blank")} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer" alt="Ref Cliente" />
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-6 pb-2 border-b border-[var(--color-atelier-grafite)]/5">
                    <Sparkles size={16} className="text-[var(--color-atelier-terracota)]" />
                    <h3 className="font-roboto text-[13px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Direções Enviadas e Avaliações</h3>
                  </div>
                  
                  {adminRefs.length === 0 ? (
                    <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/40 italic mb-6">Nenhuma direção visual enviada ainda.</p>
                  ) : (
                    <>
                      <div className="flex overflow-x-auto custom-scrollbar gap-3 pb-4 shrink-0">
                        {adminRefs.map((ref, index) => {
                          const coverImage = ref.image_urls && ref.image_urls.length > 0 ? ref.image_urls[0] : ref.image_url;
                          return (
                            <button key={ref.id} onClick={() => setActiveEvalIndex(index)} className={`shrink-0 w-32 flex flex-col gap-2 p-2 rounded-xl border transition-all cursor-pointer text-left ${activeEvalIndex === index ? 'bg-white border-[var(--color-atelier-terracota)]/40 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                              <div className="w-full h-16 rounded-lg overflow-hidden border border-white shadow-inner"><img src={coverImage} className="w-full h-full object-cover" alt={ref.title} /></div>
                              <span className={`font-roboto text-[9px] uppercase tracking-widest font-bold truncate w-full ${activeEvalIndex === index ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/50'}`}>{ref.title}</span>
                            </button>
                          )
                        })}
                      </div>

                      {adminRefs[activeEvalIndex] && (
                        <motion.div key={activeEvalIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
                          <div className="flex gap-6 items-start bg-white/40 p-6 rounded-[2rem] border border-white shadow-sm flex-col">
                            
                            <div className="flex justify-between w-full items-start">
                              <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-1">{adminRefs[activeEvalIndex].title}</h3>
                              <div className="flex items-center gap-2">
                                <span className={`border px-4 py-1.5 rounded-full text-[13px] font-bold font-roboto ${adminRefs[activeEvalIndex].score > 0 ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)]/20' : 'bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)]/40 border-transparent'}`}>
                                  {adminRefs[activeEvalIndex].score > 0 ? `Nota: ${adminRefs[activeEvalIndex].score}/10` : 'Pendente'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
                              {(adminRefs[activeEvalIndex].image_urls && adminRefs[activeEvalIndex].image_urls.length > 0 
                                  ? adminRefs[activeEvalIndex].image_urls 
                                  : [adminRefs[activeEvalIndex].image_url]
                               ).map((imgUrl: string, idx: number) => (
                                <div key={idx} className="w-full aspect-square rounded-xl overflow-hidden border-2 border-white shadow-sm cursor-pointer" onClick={() => window.open(imgUrl, "_blank")}>
                                  <img src={imgUrl} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" alt="" />
                                </div>
                              ))}
                            </div>

                            <div className="flex flex-col pt-2 flex-1 w-full">
                              <div className="flex flex-col gap-3 w-full bg-white/60 p-5 rounded-2xl mb-4 border border-[var(--color-atelier-grafite)]/5">
                                <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] border-b border-[var(--color-atelier-grafite)]/5 pb-2">Análise Estratégica do Cliente</span>
                                <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]"><strong>Atmosfera:</strong> {adminRefs[activeEvalIndex].feedback?.q1 || "-"}</p>
                                <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]"><strong>Tipografia:</strong> {adminRefs[activeEvalIndex].feedback?.q2 || "-"}</p>
                                <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]"><strong>Cores:</strong> {adminRefs[activeEvalIndex].feedback?.q3 || "-"}</p>
                                <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]"><strong>Elementos:</strong> {adminRefs[activeEvalIndex].feedback?.q4 || "-"}</p>
                              </div>

                              <button onClick={() => removeAdminRef(adminRefs[activeEvalIndex].id)} className="self-end text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"><X size={12} /> Apagar Direção</button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                </section>

                <div className="mt-4 border-t border-[var(--color-atelier-grafite)]/10 pt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Plus size={16} className="text-[var(--color-atelier-terracota)]" />
                    <h3 className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Enviar Nova Direção (Múltiplas Imagens)</h3>
                  </div>
                  <div className="bg-[var(--color-atelier-terracota)]/5 p-6 rounded-[2rem] border border-[var(--color-atelier-terracota)]/20">
                    <div className="flex flex-col gap-4">
                       <label className="w-full min-h-[100px] rounded-xl border-2 border-dashed border-[var(--color-atelier-grafite)]/20 hover:border-[var(--color-atelier-terracota)]/40 bg-white/50 cursor-pointer flex flex-col items-center justify-center transition-colors group relative p-4">
                         <input type="file" accept="image/*" multiple className="hidden" onChange={handleMultiImageUploadRef} disabled={isSendingRef} />
                         
                         {newRefImagePreviews.length > 0 ? (
                           <div className="flex flex-wrap gap-3 justify-center w-full relative z-20">
                             {newRefImagePreviews.map((preview, i) => (
                               <div key={i} className="w-20 h-20 rounded-lg overflow-hidden relative shadow-sm border border-white">
                                 <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                 <button type="button" onClick={(e) => { e.preventDefault(); handleRemoveRefImage(i); }} className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center hover:scale-110"><X size={10}/></button>
                               </div>
                             ))}
                             <div className="w-20 h-20 rounded-lg border-2 border-dashed border-[var(--color-atelier-grafite)]/20 flex flex-col items-center justify-center text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)]">
                               <Plus size={20}/>
                             </div>
                           </div>
                         ) : (
                           <><UploadCloud size={24} className="mb-2" /><span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Upload da Arte Gráfica</span></>
                         )}
                       </label>

                       <div className="flex flex-col sm:flex-row gap-3">
                         <input type="text" value={newRefTitle} onChange={(e) => setNewRefTitle(e.target.value)} disabled={isSendingRef} placeholder="Título da Direção (Ex: Rota Clássica)" className="flex-1 bg-white border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 text-[13px] outline-none shadow-sm disabled:opacity-50" />
                         <button onClick={handleAddAdminRef} disabled={isSendingRef || newRefImageFiles.length === 0} className="px-8 bg-[var(--color-atelier-grafite)] text-white py-3 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-sm shrink-0 disabled:opacity-50 flex items-center justify-center gap-2">
                           {isSendingRef ? <Loader2 size={16} className="animate-spin" /> : <Send size={14}/>} Enviar
                         </button>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function WorkspaceDesignerPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-roboto text-[10px] uppercase tracking-widest opacity-50">Sincronizando Estúdio...</div>}>
      <WorkspaceDesigner />
    </Suspense>
  );
}