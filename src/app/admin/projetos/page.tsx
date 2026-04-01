// src/app/admin/projetos/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UploadCloud, Clock, Lock, Unlock, 
  Image as ImageIcon, Send, FileText, CheckCircle2,
  MoreVertical, Settings2, Plus, ChevronRight, ChevronDown, Calendar,
  Compass, X, MessageSquare, Target, Palette, Sparkles, Type, Download, Loader2, Trash2, Link as LinkIcon, Archive, Eye, RotateCcw
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function WorkspaceDesigner() {
  // ==========================================
  // ESTADOS DO SUPABASE (READ & SYNC)
  // ==========================================
  const [isLoading, setIsLoading] = useState(true);
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);

  // Busca os projetos ativos, entregues ou arquivados da base de dados
  useEffect(() => {
    const fetchActiveProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*, profiles(nome, avatar_url, empresa)')
          .in('status', ['active', 'delivered', 'archived']) // AGORA BUSCA OS ARQUIVADOS TAMBÉM
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data && data.length > 0) {
          setDbProjects(data);
          setActiveProjectId(data[0].id);
          setDeadlineDate(data[0].data_limite || "");
          setContractUrl(data[0].contract_url || ""); 
        }
      } catch (error) {
        console.error("Erro ao buscar projetos:", error);
        showToast("Erro ao carregar a mesa de trabalho.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchActiveProjects();
  }, []);

  const currentProject = dbProjects.find(p => p.id === activeProjectId);

  // Atualiza os estados quando muda de projeto no dropdown
  useEffect(() => {
    if (currentProject) {
      setDeadlineDate(currentProject.data_limite || "");
      setContractUrl(currentProject.contract_url || "");
    }
  }, [activeProjectId]);

  // ==========================================
  // ESTADOS DOS FICHEIROS, CONTRATO E BRIEFING
  // ==========================================
  const [projectAssets, setProjectAssets] = useState<any[]>([]);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [contractUrl, setContractUrl] = useState("");
  const [isUploadingContract, setIsUploadingContract] = useState(false);
  
  const [clientBriefing, setClientBriefing] = useState<any>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (!activeProjectId) return;
    const fetchAssetsAndBriefing = async () => {
      // Arquivos do Cofre
      const { data: assetsData } = await supabase
        .from('project_assets')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false });
      
      if (assetsData) setProjectAssets(assetsData);

      // Respostas do Briefing
      const { data: briefingData } = await supabase
        .from('client_briefings')
        .select('answers')
        .eq('project_id', activeProjectId)
        .maybeSingle();
        
      if (briefingData && briefingData.answers) {
        setClientBriefing(briefingData.answers);
      } else {
        setClientBriefing(null);
      }
    };
    fetchAssetsAndBriefing();
  }, [activeProjectId]);

  // UPLOAD DE ATIVOS FINAIS
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

  // UPLOAD DINÂMICO DE CONTRATO (Substitui o Link)
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
      setDbProjects(dbProjects.map(p => p.id === activeProjectId ? { ...p, contract_url: data.publicUrl } : p));
      showToast("Contrato arquivado com sucesso no Cofre!");

    } catch (error) {
      console.error(error);
      showToast("Erro ao fazer upload do contrato.");
    } finally {
      setIsUploadingContract(false);
      e.target.value = ''; 
    }
  };

  // MOTOR DE PDF DO BRIEFING (TypeScript Blindado)
  const handleDownloadBriefingPDF = async () => {
    const element = document.getElementById('briefing-document-pdf');
    if (!element) return;
    
    setIsGeneratingPDF(true);
    showToast("A compilar o Briefing em PDF...");
    
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt: any = {
        margin:       15, 
        filename:     `Briefing_${currentProject?.profiles?.nome || 'Cliente'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      showToast("Download do PDF concluído com sucesso.");
    } catch (error) {
      console.error(error);
      showToast("Erro ao gerar o PDF. Verifique se executou 'npm install html2pdf.js'.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ==========================================
  // MOTOR DE TEMPO E FASE E ENTREGAS E ARQUIVAMENTO
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
      const { error } = await supabase.from('projects').update({ data_limite: newDate }).eq('id', activeProjectId);
      if (error) {
        showToast("Erro ao guardar o prazo na base de dados.");
      } else {
        showToast(`Prazo gravado: ${newDate.split('-').reverse().join('/')}`);
        setDbProjects(dbProjects.map(p => p.id === activeProjectId ? { ...p, data_limite: newDate } : p));
      }
    }
  };

  const handleStageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novaFase = e.target.value;
    if (activeProjectId) {
      const { error } = await supabase.from('projects').update({ fase: novaFase }).eq('id', activeProjectId);
      if (error) {
        showToast("Erro ao alterar fase.");
      } else {
        showToast("Fase do projeto atualizada com sucesso!");
        setDbProjects(dbProjects.map(p => p.id === activeProjectId ? { ...p, fase: novaFase } : p));
      }
    }
  };

  const handleMarkAsDelivered = async () => {
    if (!activeProjectId) return;
    if (!window.confirm("Deseja marcar este projeto como ENTREGUE? O cliente terá 15 dias de acesso às abas antes delas serem arquivadas.")) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: 'delivered', 
          delivered_at: new Date().toISOString() 
        })
        .eq('id', activeProjectId);

      if (error) throw error;

      showToast("Projeto marcado como Entregue! A contagem regressiva de 15 dias começou.");
      setDbProjects(dbProjects.map(p => p.id === activeProjectId ? { ...p, status: 'delivered' } : p));
    } catch (error) {
      showToast("Erro ao marcar projeto como entregue.");
    }
  };

  const handleForceArchive = async () => {
    if (!activeProjectId) return;
    if (!window.confirm("ATENÇÃO: O cliente perderá acesso IMEDIATO ao cofre e canais deste projeto. Deseja prosseguir?")) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'archived' })
        .eq('id', activeProjectId);

      if (error) throw error;

      showToast("Projeto Arquivado com sucesso! O cliente está agora na fase de Legado.");
      setDbProjects(dbProjects.map(p => p.id === activeProjectId ? { ...p, status: 'archived' } : p));
    } catch (error) {
      showToast("Erro ao arquivar projeto.");
    }
  };

  const handleReactivateProject = async () => {
    if (!activeProjectId) return;
    if (!window.confirm("Deseja REATIVAR este projeto? O cliente voltará a ter acesso total à sua mesa de trabalho.")) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'active', delivered_at: null })
        .eq('id', activeProjectId);

      if (error) throw error;

      showToast("Projeto Reativado com sucesso!");
      setDbProjects(dbProjects.map(p => p.id === activeProjectId ? { ...p, status: 'active' } : p));
    } catch (error) {
      showToast("Erro ao reativar projeto.");
    }
  };

  const isCofreUnlocked = (daysLeft === 0 && deadlineDate !== "") || isForceUnlocked;

  // ==========================================
  // DIÁRIO DE BORDO (CREATE POST & VIEW LIST)
  // ==========================================
  const [postTitle, setPostTitle] = useState("");
  const [postText, setPostText] = useState("");
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [diaryPosts, setDiaryPosts] = useState<any[]>([]); // Correção: Estado da lista de posts

  // Busca os posts do Diário para visualização do Admin
  useEffect(() => {
    if (!activeProjectId) return;
    const fetchDiary = async () => {
      const { data } = await supabase
        .from('diary_posts')
        .select('*, profiles(nome, avatar_url, role)')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false });
      if (data) setDiaryPosts(data);
    };
    fetchDiary();
  }, [activeProjectId]);

  const handleDiaryImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPostImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePostDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) return;

    setIsPosting(true);
    showToast("A publicar no Diário do cliente...");
    try {
      let imageUrl = null;

      if (postImageFile) {
        const fileExt = postImageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${activeProjectId}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('community_images').upload(filePath, postImageFile);
        if (!uploadError) {
          const { data } = supabase.storage.from('community_images').getPublicUrl(filePath);
          imageUrl = data.publicUrl;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();

      // Alterado para .select() para obter o post acabado de criar
      const { data: newPost, error } = await supabase.from('diary_posts').insert({
        project_id: activeProjectId,
        author_id: session?.user?.id, 
        title: postTitle,
        content: postText,
        image_url: imageUrl
      }).select('*, profiles(nome, avatar_url, role)').single();

      if (error) throw error;
      
      // Atualiza a UI do Admin instantaneamente
      if (newPost) setDiaryPosts([newPost, ...diaryPosts]);
      
      showToast(`Diário atualizado para ${currentProject?.profiles?.nome}!`);
      setPostTitle("");
      setPostText("");
      setPostImageFile(null);
      setPostImagePreview(null);
    } catch (error) {
      console.error("Erro ao publicar:", error);
      showToast("Erro ao atualizar o diário.");
    } finally {
      setIsPosting(false);
    }
  };

  // ==========================================
  // PAINEL DE CURADORIA (MULTI-IMAGENS & PDF)
  // ==========================================
  const [showRefsPanel, setShowRefsPanel] = useState(false);
  const [clientMoodboard, setClientMoodboard] = useState<string[]>([]);
  const [adminRefs, setAdminRefs] = useState<any[]>([]);
  const [activeEvalIndex, setActiveEvalIndex] = useState(0);
  
  const [newRefTitle, setNewRefTitle] = useState("");
  // Modificado para Array (Múltiplas Imagens)
  const [newRefImageFiles, setNewRefImageFiles] = useState<File[]>([]);
  const [newRefImagePreviews, setNewRefImagePreviews] = useState<string[]>([]);
  
  const [isSendingRef, setIsSendingRef] = useState(false);
  const [isGeneratingCuradoriaPDF, setIsGeneratingCuradoriaPDF] = useState(false);

  useEffect(() => {
    if (!showRefsPanel || !activeProjectId) return;
    
    const fetchCuradoria = async () => {
      const { data: strategicData } = await supabase.from('strategic_answers').select('moodboard_urls').eq('project_id', activeProjectId).maybeSingle();
      if (strategicData && strategicData.moodboard_urls) setClientMoodboard(strategicData.moodboard_urls);
      else setClientMoodboard([]);

      const { data: directionsData } = await supabase.from('design_directions').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: true });
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
      // Faz o upload de todas as imagens em paralelo
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
        image_url: uploadedUrls[0], // Mantém fallback
        image_urls: uploadedUrls    // Salva o Array JSONB
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
    try {
      await supabase.from('design_directions').delete().eq('id', id);
      setAdminRefs(adminRefs.filter(ref => ref.id !== id));
      setActiveEvalIndex(0); 
      showToast("Direção visual removida.");
    } catch (error) {
      showToast("Erro ao remover direção.");
    }
  };

  // MOTOR PDF PARA CURADORIA
  const handleDownloadCuradoriaPDF = async () => {
    const element = document.getElementById('curadoria-document-pdf');
    if (!element) return;
    
    setIsGeneratingCuradoriaPDF(true);
    showToast("A compilar as Direções Visuais em PDF...");
    
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt: any = {
        margin:       15, 
        filename:     `Curadoria_${currentProject?.profiles?.nome || 'Cliente'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      showToast("Download da Curadoria concluído com sucesso.");
    } catch (error) {
      showToast("Erro ao gerar o PDF da Curadoria.");
    } finally {
      setIsGeneratingCuradoriaPDF(false);
    }
  };

  if (isLoading) {
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
          NOVO MODAL DO BRIEFING (DOSSIÊ ADMIN & PDF)
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
                  <button onClick={handleDownloadBriefingPDF} disabled={isGeneratingPDF || !clientBriefing} className="bg-[var(--color-atelier-grafite)] text-white px-4 py-2 rounded-full flex items-center gap-2 font-roboto text-[10px] uppercase tracking-widest font-bold hover:bg-[var(--color-atelier-terracota)] transition-colors disabled:opacity-50">
                    {isGeneratingPDF ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Baixar PDF
                  </button>
                  <button onClick={() => setIsBriefingModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 w-full bg-white overflow-y-auto custom-scrollbar p-8">
                {clientBriefing ? (
                  // ESTE É O CONTEÚDO QUE SERÁ EXPORTADO PARA PDF
                  <div id="briefing-document-pdf" className="max-w-3xl mx-auto bg-white p-8">
                    
                    {/* Header do Documento PDF */}
                    <div className="text-center mb-12 border-b-2 border-[var(--color-atelier-terracota)] pb-8">
                      <div className="flex justify-center mb-6">
                        <img src="/images/simbolo-rosa.png" alt="Atelier" className="w-16 h-16 object-contain grayscale opacity-50" />
                      </div>
                      <h1 className="font-elegant text-5xl text-[var(--color-atelier-grafite)] mb-2">Briefing Oficial</h1>
                      <h2 className="font-roboto text-lg text-[var(--color-atelier-terracota)] uppercase tracking-widest font-bold">{currentProject.profiles?.nome}</h2>
                      <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/50 mt-2">Documento Confidencial de Identidade Visual</p>
                    </div>

                    <div className="flex flex-col gap-10">
                      {/* Secção 1: O Cliente */}
                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-gray-100 pb-2">1. Dados & Contato</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoBlock label="Nome do Responsável" value={clientBriefing.nome} />
                          <InfoBlock label="WhatsApp" value={clientBriefing.whatsapp} />
                          <InfoBlock label="E-mail de Contato" value={clientBriefing.email} />
                        </div>
                      </div>

                      {/* Secção 2: A Marca */}
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

                      {/* Secção 3: O Propósito e a História */}
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

                      {/* Secção 4: O Público */}
                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-gray-100 pb-2">4. Público Alvo</h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <InfoBlock label="Gênero" value={clientBriefing.genero === 'Outro' ? clientBriefing.genero_outro : clientBriefing.genero} />
                          <InfoBlock label="Classe Social" value={clientBriefing.classe === 'Outro' ? clientBriefing.classe_outro : clientBriefing.classe} />
                          <InfoBlock label="Idade" value={clientBriefing.idade === 'Outro' ? clientBriefing.idade_outro : clientBriefing.idade} />
                        </div>
                        <InfoBlock label="Resumo Comportamental do Público" value={clientBriefing.resumo_publico} />
                      </div>

                      {/* Secção 5: Concorrência e Referências */}
                      <div>
                        <h3 className="font-roboto font-black uppercase tracking-widest text-[var(--color-atelier-terracota)] text-sm mb-4 border-b border-gray-100 pb-2">5. Posicionamento de Mercado</h3>
                        <div className="flex flex-col gap-4">
                          <InfoBlock label="Concorrentes Principais" value={clientBriefing.concorrentes_links} />
                          <InfoBlock label="Diferencial Competitivo" value={clientBriefing.diferencial} />
                          <InfoBlock label="O que definitivamente NÃO fazer (Vícios da concorrência)" value={clientBriefing.nao_fazer} />
                          <InfoBlock label="Referências Visuais do Cliente" value={clientBriefing.referencias} />
                        </div>
                      </div>

                      {/* Secção 6: Personalidade e Estética */}
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

                      {/* Secção 7: Visual Constraints */}
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

                      {/* Secção 8: Final */}
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
                <span className="text-[var(--color-atelier-grafite)]/40 px-2 shrink-0">/</span> <span className="text-[var(--color-atelier-terracota)] italic text-3xl shrink-0 hidden md:inline">Mesa de Trabalho</span>
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
                    {dbProjects.map(p => (
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
          COLUNAS PRINCIPAIS
          ========================================== */}
      <div className="flex gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both] relative z-10">
        
        {/* COLUNA ESQUERDA: COFRE E UPLOAD */}
        <div className="w-[55%] flex flex-col gap-6 h-full">
          <div className="glass-panel p-8 rounded-[2.5rem] bg-white/60 shrink-0 border border-white">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><Settings2 size={20} className="text-[var(--color-atelier-terracota)]" /> Engenharia do Projeto</h3>
              <div className="flex items-center gap-2">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Status do Cofre:</span>
                {isCofreUnlocked ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200"><Unlock size={12}/> Desbloqueado</span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-200"><Lock size={12}/> Bloqueado</span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              
              {/* LÓGICA DE DATAS E AÇÕES DE ENCERRAMENTO */}
              <div className="flex items-center gap-6">
                <div className="flex-1 bg-white/50 border border-white p-4 rounded-2xl shadow-sm hover:border-[var(--color-atelier-terracota)]/30 transition-colors group">
                  <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 mb-3"><Calendar size={14} className="text-[var(--color-atelier-terracota)]" /> Data Limite (Deadline)</label>
                  <div className="flex items-center gap-4">
                    <input type="date" value={deadlineDate} onChange={(e) => handleDeadlineChange(e.target.value)} className="flex-1 bg-transparent text-[14px] text-[var(--color-atelier-grafite)] outline-none cursor-pointer font-medium" />
                  </div>
                </div>

                <div className="w-24 h-full flex flex-col items-center justify-center bg-white/60 border border-white rounded-2xl shadow-sm py-4">
                   <span className="font-elegant text-3xl text-[var(--color-atelier-terracota)] leading-none">{deadlineDate ? daysLeft : "-"}</span>
                   <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 mt-1">Dias Restantes</span>
                </div>

                {/* PAINEL DE AÇÕES DE ENCERRAMENTO */}
                <div className="flex flex-col gap-2 h-full">
                  {currentProject.status === 'archived' ? (
                     <button onClick={handleReactivateProject} className="flex-1 px-4 bg-blue-600 text-white rounded-xl font-roboto font-bold uppercase tracking-widest text-[9px] hover:bg-blue-700 transition-all shadow-sm flex flex-col items-center justify-center gap-1">
                       <RotateCcw size={14} /> Reativar<br/>Projeto
                     </button>
                  ) : currentProject.status === 'delivered' ? (
                     <button onClick={handleForceArchive} className="flex-1 px-4 bg-orange-600 text-white rounded-xl font-roboto font-bold uppercase tracking-widest text-[9px] hover:bg-orange-700 transition-all shadow-sm flex flex-col items-center justify-center gap-1">
                       <Archive size={14} /> Forçar<br/>Arquivo
                     </button>
                  ) : (
                     <button onClick={handleMarkAsDelivered} className="flex-1 px-4 bg-green-600 text-white rounded-xl font-roboto font-bold uppercase tracking-widest text-[9px] hover:bg-green-700 transition-all shadow-sm flex flex-col items-center justify-center gap-1">
                       <CheckCircle2 size={14} /> Marcar<br/>Entregue
                     </button>
                  )}
                  
                  <button onClick={() => { setIsForceUnlocked(true); showToast("Cofre desbloqueado manualmente."); }} disabled={isCofreUnlocked} className="flex-1 px-4 bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] rounded-xl font-roboto font-bold uppercase tracking-widest text-[9px] hover:bg-[var(--color-atelier-terracota)] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1">
                    <Unlock size={14} /> Forçar<br/>Abertura
                  </button>
                </div>
              </div>

              {/* LÓGICA DE FASES E UPLOAD DE CONTRATO NATIVO */}
              <div className="flex items-center gap-6">
                <div className="flex-1 bg-white/50 border border-white p-4 rounded-2xl shadow-sm hover:border-[var(--color-atelier-terracota)]/30 transition-colors flex flex-col justify-center gap-2">
                  <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 w-full shrink-0">
                    <Sparkles size={14} className="text-[var(--color-atelier-terracota)]" /> Fase Atual
                  </label>
                  <select 
                    value={currentProject?.fase || "reuniao"} 
                    onChange={handleStageChange}
                    className="w-full bg-transparent text-[13px] font-bold text-[var(--color-atelier-terracota)] outline-none cursor-pointer truncate"
                  >
                    <option value="reuniao">1. Reunião de Alinhamento</option>
                    <option value="pesquisa">2. Estudo e Pesquisa</option>
                    <option value="direcionamento">3. Direcionamento Criativo</option>
                    <option value="processo">4. Processo Criativo IDV</option>
                    <option value="apresentacao">5. Apresentação Oficial</option>
                  </select>
                </div>

                <div className="flex-1 bg-white/50 border border-white p-4 rounded-2xl shadow-sm transition-colors flex flex-col justify-center gap-2 group/contract">
                  <div className="flex justify-between items-center w-full mb-1">
                    <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 shrink-0">
                      <FileText size={14} className="text-[var(--color-atelier-terracota)]" /> Contrato Assinado
                    </label>
                    {contractUrl && <CheckCircle2 size={12} className="text-green-500" />}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!contractUrl ? (
                      <label className="w-full bg-white border border-dashed border-[var(--color-atelier-grafite)]/20 hover:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-2 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
                        <input type="file" accept=".pdf" className="hidden" onChange={handleContractUpload} disabled={isUploadingContract} />
                        {isUploadingContract ? <Loader2 size={14} className="animate-spin text-[var(--color-atelier-terracota)]" /> : <UploadCloud size={14} className="text-[var(--color-atelier-grafite)]/40" />}
                        <span className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)]/60">
                          {isUploadingContract ? "A anexar PDF..." : "Anexar PDF"}
                        </span>
                      </label>
                    ) : (
                      <div className="flex w-full gap-2">
                        <button onClick={() => window.open(contractUrl, "_blank")} className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl px-4 py-2 flex items-center justify-center gap-2 hover:border-[var(--color-atelier-terracota)] transition-colors shadow-sm">
                          <Eye size={14} className="text-[var(--color-atelier-terracota)]" />
                          <span className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)]">Ver Contrato</span>
                        </button>
                        <button onClick={() => { if(window.confirm("Deseja substituir este contrato?")) setContractUrl("") }} className="w-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                          <X size={14}/>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* PAINEL DE ATIVOS (ARQUIVOS) */}
          <div className="glass-panel p-8 rounded-[2.5rem] bg-white/60 flex-1 flex flex-col min-h-0 border border-white">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2 mb-2"><UploadCloud size={20} className="text-[var(--color-atelier-terracota)]" /> Ativos Finais</h3>
            <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mb-6">Faça o upload dos arquivos que o cliente receberá quando o cofre for aberto.</p>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-2">
              <label className="border-2 border-dashed border-[var(--color-atelier-grafite)]/20 bg-white/40 hover:bg-white/80 transition-colors rounded-2xl p-5 flex items-center justify-between group cursor-pointer relative overflow-hidden shrink-0">
                <input type="file" onChange={handleAssetUpload} disabled={isUploadingAsset} className="hidden" />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[var(--color-atelier-terracota)]">
                    {isUploadingAsset ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
                  </div>
                  <div>
                    <span className="block font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">
                      {isUploadingAsset ? "A transferir..." : "Adicionar Novo Ficheiro"}
                    </span>
                    <span className="block font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 mt-0.5">Clique para anexar arquivo final</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center group-hover:scale-110 transition-transform"><Plus size={18} /></div>
              </label>

              <AnimatePresence>
                {projectAssets.map(asset => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    key={asset.id} 
                    className="border border-[var(--color-atelier-terracota)]/30 bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm group shrink-0"
                  >
                    <div className="flex items-center gap-4 overflow-hidden pr-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="flex flex-col truncate">
                        <a href={asset.file_url} target="_blank" rel="noreferrer" className="block font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] transition-colors truncate">
                          {asset.file_name}
                        </a>
                        <div className="flex gap-2 items-center mt-0.5">
                           <span className="block font-roboto text-[10px] text-green-600 font-bold uppercase tracking-widest"><CheckCircle2 size={10} className="inline mr-0.5 mb-0.5"/> Seguro</span>
                           <span className="text-[10px] text-[var(--color-atelier-grafite)]/40 font-bold">• {asset.file_size}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveAsset(asset.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {projectAssets.length === 0 && !isUploadingAsset && (
                 <div className="text-center p-6 text-[var(--color-atelier-grafite)]/40 font-roboto text-[11px] uppercase tracking-widest font-bold h-full flex items-center justify-center">
                   Nenhum ficheiro no cofre.
                 </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: DIÁRIO */}
        <div className="flex-1 glass-panel p-8 rounded-[2.5rem] bg-gradient-to-br from-white/90 to-white/50 flex flex-col h-full border-[var(--color-atelier-terracota)]/10 shadow-[0_15px_40px_rgba(173,111,64,0.05)] border border-white">
          
          <div className="mb-6 pb-4 border-b border-[var(--color-atelier-grafite)]/10 shrink-0">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2 mb-1"><ImageIcon size={20} className="text-[var(--color-atelier-terracota)]" /> Atualizar Diário</h3>
            <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60">Poste atualizações na timeline do cliente.</p>
          </div>

          <form onSubmit={handlePostDiary} className="flex flex-col shrink-0 mb-4 pb-4 border-b border-black/5">
            <div className="flex flex-col gap-4">
              <label className="w-full h-16 rounded-xl border-2 border-dashed border-[var(--color-atelier-grafite)]/20 hover:bg-white/80 transition-all flex items-center justify-center gap-3 cursor-pointer group relative overflow-hidden">
                <input type="file" accept="image/*" className="hidden" onChange={handleDiaryImageSelect} />
                {postImagePreview ? (
                  <img src={postImagePreview} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                ) : (
                  <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)]">Adicionar Imagem (Opcional)</span>
                )}
              </label>

              <div className="flex flex-col gap-2 group/input">
                <input type="text" required value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Título da Atualização" className="w-full bg-white/60 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3 px-4 text-[13px] outline-none shadow-sm" />
              </div>
              <div className="flex flex-col gap-2 group/input">
                <textarea required value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="Explique a decisão de design..." className="w-full h-20 resize-none bg-white/60 border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3 px-4 text-[13px] outline-none shadow-sm custom-scrollbar" />
              </div>
            </div>
            <button type="submit" disabled={isPosting || !postText || !postTitle} className="mt-4 w-full bg-[var(--color-atelier-terracota)] text-white py-3.5 rounded-xl font-roboto font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-[#8c562e] transition-colors shadow-sm disabled:opacity-50">
              {isPosting ? <Loader2 size={14} className="animate-spin inline mr-2" /> : <Send size={14} className="inline mr-2" />}
              Gravar no Diário
            </button>
          </form>

          {/* VER O DIÁRIO DO LADO DO ADMIN */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
             <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Timeline Recente</span>
             {diaryPosts.length === 0 ? (
               <p className="text-[11px] italic text-[var(--color-atelier-grafite)]/40 text-center mt-4">Nenhum post publicado.</p>
             ) : (
               diaryPosts.map((post) => (
                  <div key={post.id} className="bg-white/40 p-4 rounded-2xl border border-white shadow-sm flex flex-col gap-2">
                    {post.image_url && <img src={post.image_url} className="w-full h-24 object-cover rounded-lg border border-[var(--color-atelier-grafite)]/5" alt=""/>}
                    <h4 className="font-elegant text-lg text-[var(--color-atelier-grafite)] leading-tight">{post.title}</h4>
                    <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/70 line-clamp-2">{post.content}</p>
                    <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 font-bold uppercase mt-1">Postado em {new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
               ))
             )}
          </div>
        </div>

      </div>

      {/* ==========================================
          PAINEL DESLIZANTE (CURADORIA & MULTI-IMAGENS)
          ========================================== */}
      <AnimatePresence>
        {showRefsPanel && (
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
                  {/* BOTAO GERAR PDF DA CURADORIA */}
                  <button onClick={handleDownloadCuradoriaPDF} disabled={isGeneratingCuradoriaPDF || adminRefs.length === 0} className="bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] px-4 py-2 rounded-xl flex items-center gap-2 font-roboto text-[10px] uppercase tracking-widest font-bold hover:border-[var(--color-atelier-terracota)] transition-colors shadow-sm disabled:opacity-50">
                    {isGeneratingCuradoriaPDF ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Baixar PDF Curadoria
                  </button>
                  <button onClick={() => setShowRefsPanel(false)} className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-red-500 transition-all shadow-sm border border-white">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-8 gap-8 relative">
                
                {/* DIV ESCONDIDA PARA O GERADOR DE PDF DA CURADORIA */}
                <div className="absolute left-[-9999px] top-0">
                   <div id="curadoria-document-pdf" className="w-[800px] bg-white p-12">
                      <div className="text-center mb-12 border-b-2 border-[var(--color-atelier-terracota)] pb-8">
                        <div className="flex justify-center mb-6"><img src="/images/simbolo-rosa.png" alt="Atelier" className="w-16 h-16 object-contain grayscale opacity-50" /></div>
                        <h1 className="font-elegant text-5xl text-[var(--color-atelier-grafite)] mb-2">Relatório de Curadoria</h1>
                        <h2 className="font-roboto text-lg text-[var(--color-atelier-terracota)] uppercase tracking-widest font-bold">{currentProject?.profiles?.nome}</h2>
                      </div>
                      
                      <div className="flex flex-col gap-12">
                        {adminRefs.map((ref, idx) => {
                          const images = ref.image_urls && ref.image_urls.length > 0 ? ref.image_urls : (ref.image_url ? [ref.image_url] : []);
                          return (
                            <div key={idx} className="flex flex-col gap-4 border-b border-gray-100 pb-8 last:border-0">
                              <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">{idx + 1}. {ref.title}</h3>
                              
                              <div className="grid grid-cols-2 gap-4">
                                {images.map((img: string, i: number) => (
                                  <img key={i} src={img} className="w-full rounded-xl border border-gray-200" alt={`Ref ${i}`}/>
                                ))}
                              </div>
                              
                              <div className="bg-gray-50 p-6 rounded-2xl mt-4">
                                <p className="font-roboto text-[10px] uppercase font-bold text-[var(--color-atelier-terracota)] mb-4">Feedback do Cliente (Nota: {ref.score}/10)</p>
                                <p className="font-roboto text-sm text-[var(--color-atelier-grafite)] mb-2"><strong>Atmosfera:</strong> {ref.feedback?.q1 || "Não avaliado"}</p>
                                <p className="font-roboto text-sm text-[var(--color-atelier-grafite)] mb-2"><strong>Tipografia:</strong> {ref.feedback?.q2 || "Não avaliado"}</p>
                                <p className="font-roboto text-sm text-[var(--color-atelier-grafite)] mb-2"><strong>Cores:</strong> {ref.feedback?.q3 || "Não avaliado"}</p>
                                <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]"><strong>Elementos:</strong> {ref.feedback?.q4 || "Não avaliado"}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                   </div>
                </div>

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

                            {/* GRID DE IMAGENS MÚLTIPLAS */}
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

                {/* NOVO FORMULÁRIO (MULTI UPLOAD DE IMAGENS) */}
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
                           <><UploadCloud size={24} className="text-[var(--color-atelier-grafite)]/40 group-hover:text-[var(--color-atelier-terracota)] mb-2" /><span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)]">Selecione uma ou mais imagens</span></>
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

function InfoBlock({ label, value }: { label: string, value: any }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <span className="font-roboto text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50">{label}</span>
      <span className="font-roboto text-sm text-[var(--color-atelier-grafite)] mt-1 whitespace-pre-wrap">{value}</span>
    </div>
  );
}