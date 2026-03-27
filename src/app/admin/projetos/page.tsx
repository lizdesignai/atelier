// src/app/admin/projetos/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UploadCloud, Clock, Lock, Unlock, 
  Image as ImageIcon, Send, FileText, CheckCircle2,
  MoreVertical, Settings2, Plus, ChevronRight, ChevronDown, Calendar,
  Compass, X, MessageSquare, Target, Palette, Sparkles, Type, Download, Loader2, Trash2
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

// Função para disparar os Toasts
const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// Mock das 6 Direções avaliadas pelo cliente (Será ligado na Fase 4)
const CLIENT_EVALUATIONS = [
  {
    id: 1, title: "Minimalismo Geométrico", img: "https://images.unsplash.com/photo-1600880292089-90a7e086ee3c?q=80&w=600&auto=format&fit=crop", score: 8,
    answers: { q1: "Muito limpo. Transmite exatamente a tranquilidade que procuro.", q2: "As fontes sem serifa são modernas, mas sinto falta de algo mais quente.", q3: "A paleta neutra é ótima, mas talvez precise de um tom de destaque.", q4: "Adorei as linhas retas." }
  },
  {
    id: 2, title: "Serifa Clássica & Heritage", img: "https://images.unsplash.com/photo-1629019725068-1cb81c4e7df8?q=80&w=600&auto=format&fit=crop", score: 4,
    answers: { q1: "Achei um pouco antigo demais para o meu negócio atual.", q2: "A serifa é bonita, mas parece muito rígida.", q3: "Muito escura, parece pesada.", q4: "Não usaria texturas rústicas." }
  }
];

export default function WorkspaceDesigner() {
  // ==========================================
  // ESTADOS DO SUPABASE (READ & SYNC)
  // ==========================================
  const [isLoading, setIsLoading] = useState(true);
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);

  // Busca os projetos ativos da base de dados
  useEffect(() => {
    const fetchActiveProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*, profiles(nome, avatar_url, empresa)')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data && data.length > 0) {
          setDbProjects(data);
          setActiveProjectId(data[0].id); // Seleciona o primeiro projeto por defeito
          setDeadlineDate(data[0].deadline || "");
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

  // ==========================================
  // ESTADOS DOS FICHEIROS (ATIVOS FINAIS)
  // ==========================================
  const [projectAssets, setProjectAssets] = useState<any[]>([]);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);

  // Busca os arquivos sempre que o projeto mudar
  useEffect(() => {
    if (!activeProjectId) return;
    const fetchAssets = async () => {
      const { data, error } = await supabase
        .from('project_assets')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false });
      
      if (data) setProjectAssets(data);
    };
    fetchAssets();
  }, [activeProjectId]);

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;

    setIsUploadingAsset(true);
    showToast("A enviar ficheiro para o cofre seguro...");

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${activeProjectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vault_assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('vault_assets')
        .getPublicUrl(filePath);

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

      if (insertedData) {
        setProjectAssets([insertedData[0], ...projectAssets]);
      }
      showToast("✨ Ficheiro adicionado aos Ativos Finais!");

    } catch (error: any) {
      console.error("Erro no upload:", error);
      showToast("Erro ao fazer upload do ficheiro.");
    } finally {
      setIsUploadingAsset(false);
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

  // ==========================================
  // MOTOR DE TEMPO (UPDATE DEADLINE NO BANCO)
  // ==========================================
  const [deadlineDate, setDeadlineDate] = useState("");
  const [daysLeft, setDaysLeft] = useState(0);
  const [isForceUnlocked, setIsForceUnlocked] = useState(false);

  // Atualiza os dias restantes sempre que o deadline muda
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
    
    // Grava no Supabase!
    if (activeProjectId) {
      const { error } = await supabase.from('projects').update({ deadline: newDate }).eq('id', activeProjectId);
      if (error) {
        showToast("Erro ao guardar o prazo na base de dados.");
      } else {
        showToast(`Prazo gravado: ${newDate.split('-').reverse().join('/')}`);
      }
    }
  };

  const isCofreUnlocked = (daysLeft === 0 && deadlineDate !== "") || isForceUnlocked;

  // ==========================================
  // DIÁRIO DE BORDO (CREATE POST NO BANCO)
  // ==========================================
  const [postTitle, setPostTitle] = useState("");
  const [postText, setPostText] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const handlePostDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) return;

    setIsPosting(true);
    try {
      const { error } = await supabase.from('diary_posts').insert({
        project_id: activeProjectId,
        title: postTitle,
        content: postText
      });

      if (error) throw error;
      
      showToast(`Diário atualizado para ${currentProject?.profiles?.nome}!`);
      setPostTitle("");
      setPostText("");
    } catch (error) {
      console.error("Erro ao publicar:", error);
      showToast("Erro ao atualizar o diário.");
    } finally {
      setIsPosting(false);
    }
  };

  // ==========================================
  // ESTADOS DO PAINEL DE REFERÊNCIAS
  // ==========================================
  const [showRefsPanel, setShowRefsPanel] = useState(false);
  const [newRefTitle, setNewRefTitle] = useState("");
  const [newRefImage, setNewRefImage] = useState<string | null>(null);
  const [adminRefs, setAdminRefs] = useState([...CLIENT_EVALUATIONS]);
  const [activeEvalIndex, setActiveEvalIndex] = useState(0);

  const handleImageUploadRef = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRefImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddAdminRef = () => {
    if (!newRefTitle || !newRefImage) {
      showToast("Por favor, adicione um título e selecione uma imagem.");
      return;
    }
    showToast("Nova direção visual enviada para o cliente avaliar.");
    setAdminRefs([...adminRefs, { 
      id: Date.now(), 
      title: newRefTitle, 
      img: newRefImage, 
      score: 0,
      answers: { q1: "Aguardando avaliação...", q2: "Aguardando avaliação...", q3: "Aguardando avaliação...", q4: "Aguardando avaliação..." }
    }]);
    setNewRefTitle("");
    setNewRefImage(null);
  };

  const removeAdminRef = (id: number) => {
    setAdminRefs(adminRefs.filter(ref => ref.id !== id));
    showToast("Direção visual removida.");
    setActiveEvalIndex(0); 
  };


  // Ecrã de Loading Geral ou Empty State
  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
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
          CABEÇALHO
          ========================================== */}
      <header className="flex justify-between items-end shrink-0 animate-[fadeInUp_0.5s_ease-out] relative z-20">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-terracota)]/20 shadow-sm flex items-center justify-center text-[var(--color-atelier-terracota)] font-elegant text-3xl overflow-hidden">
             {currentProject.profiles?.avatar_url ? (
               <img src={currentProject.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover opacity-90" />
             ) : (
               currentProject.profiles?.nome?.charAt(0) || "C"
             )}
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-green-500/10 text-green-700 px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold border border-green-500/20">Ativo</span>
              <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">{currentProject.type}</span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsClientMenuOpen(!isClientMenuOpen)}>
              <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none flex items-center gap-2 group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                {currentProject.profiles?.nome || "Cliente"} 
                <ChevronDown size={20} className={`text-[var(--color-atelier-grafite)]/40 transition-transform duration-300 ${isClientMenuOpen ? 'rotate-180' : ''}`} />
                <span className="text-[var(--color-atelier-grafite)]/40 px-2">/</span> <span className="text-[var(--color-atelier-terracota)] italic text-3xl">Mesa de Trabalho</span>
              </h1>
            </div>
            
            <AnimatePresence>
              {isClientMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.2 }}
                  className="absolute top-[110%] left-0 w-[300px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(122,116,112,0.15)] rounded-2xl overflow-hidden z-50 flex flex-col py-2"
                >
                  <div className="px-4 py-2 border-b border-[var(--color-atelier-grafite)]/5 text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Projetos em Forja</div>
                  {dbProjects.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => { 
                        setActiveProjectId(p.id); 
                        setDeadlineDate(p.deadline || "");
                        setIsClientMenuOpen(false); 
                        showToast(`A carregar mesa de ${p.profiles?.nome}...`); 
                      }}
                      className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${p.id === activeProjectId ? 'bg-[var(--color-atelier-terracota)]/5' : 'hover:bg-white'}`}
                    >
                      <div className="w-8 h-8 rounded-full border border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] flex items-center justify-center overflow-hidden text-xs font-bold">
                         {p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : p.profiles?.nome?.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-roboto text-[13px] ${p.id === activeProjectId ? 'font-bold text-[var(--color-atelier-terracota)]' : 'font-medium text-[var(--color-atelier-grafite)]'}`}>{p.profiles?.nome}</span>
                        <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50">{p.type}</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex gap-3 relative z-10">
          <button onClick={() => setShowRefsPanel(true)} className="glass-panel px-5 py-2.5 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:text-white hover:bg-[var(--color-atelier-terracota)] hover:border-transparent transition-all flex items-center gap-2 shadow-sm">
            <Compass size={14} /> Curadoria / Referências
          </button>
          <button onClick={() => showToast("A carregar Briefing Estratégico do cliente...")} className="glass-panel px-5 py-2.5 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] transition-colors flex items-center gap-2">
            <FileText size={14} /> Briefing
          </button>
          <button onClick={() => showToast("A abrir definições avançadas do projeto.")} className="glass-panel px-3 py-2.5 rounded-xl text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] transition-colors">
            <MoreVertical size={16} />
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
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2"><Settings2 size={20} className="text-[var(--color-atelier-terracota)]" /> Engenharia do Cofre</h3>
              <div className="flex items-center gap-2">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Status do Cliente:</span>
                {isCofreUnlocked ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200"><Unlock size={12}/> Desbloqueado</span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-200"><Lock size={12}/> Bloqueado</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex-1 bg-white/50 border border-white p-4 rounded-2xl shadow-sm hover:border-[var(--color-atelier-terracota)]/30 transition-colors group">
                <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 mb-3"><Calendar size={14} className="text-[var(--color-atelier-terracota)]" /> Data Limite (Deadline)</label>
                <div className="flex items-center gap-4">
                  <input type="date" value={deadlineDate} onChange={(e) => handleDeadlineChange(e.target.value)} className="flex-1 bg-transparent text-[14px] text-[var(--color-atelier-grafite)] outline-none cursor-pointer font-medium" />
                </div>
              </div>
              <div className="w-24 h-full flex flex-col items-center justify-center bg-white/60 border border-white rounded-2xl shadow-sm">
                 <span className="font-elegant text-3xl text-[var(--color-atelier-terracota)] leading-none">{deadlineDate ? daysLeft : "-"}</span>
                 <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 mt-1">Dias Úteis</span>
              </div>
              <button onClick={() => { setIsForceUnlocked(true); showToast("Cofre desbloqueado manualmente."); }} disabled={isCofreUnlocked} className="h-[82px] px-6 bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] rounded-2xl font-roboto font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--color-atelier-terracota)] transition-all shadow-[0_10px_20px_rgba(122,116,112,0.15)] disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2">
                <Unlock size={16} /> Forçar<br/>Abertura
              </button>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[2.5rem] bg-white/60 flex-1 flex flex-col min-h-0 border border-white">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2 mb-2"><UploadCloud size={20} className="text-[var(--color-atelier-terracota)]" /> Ativos Finais</h3>
            <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mb-6">Faça o upload dos arquivos que o cliente receberá quando o cofre for aberto.</p>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-2">
              
              {/* NOVIDADE: DROPZONE E UPLOAD PARA STORAGE */}
              <label className="border-2 border-dashed border-[var(--color-atelier-grafite)]/20 bg-white/40 hover:bg-white/80 transition-colors rounded-2xl p-5 flex items-center justify-between group cursor-pointer relative overflow-hidden">
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

              {/* LISTAGEM DOS ARQUIVOS DO BANCO */}
              <AnimatePresence>
                {projectAssets.map(asset => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    key={asset.id} 
                    className="border border-[var(--color-atelier-terracota)]/30 bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm group"
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
                 <div className="text-center p-6 text-[var(--color-atelier-grafite)]/40 font-roboto text-[11px] uppercase tracking-widest font-bold">
                   Nenhum ficheiro no cofre.
                 </div>
              )}

            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: DIÁRIO */}
        <div className="flex-1 glass-panel p-8 rounded-[2.5rem] bg-gradient-to-br from-white/90 to-white/50 flex flex-col h-full border-[var(--color-atelier-terracota)]/10 shadow-[0_15px_40px_rgba(173,111,64,0.05)] border border-white">
          <div className="mb-6 pb-4 border-b border-[var(--color-atelier-grafite)]/10">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2 mb-1"><ImageIcon size={20} className="text-[var(--color-atelier-terracota)]" /> Atualizar Diário</h3>
            <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60">Poste atualizações visuais na timeline do cliente.</p>
          </div>
          <form onSubmit={handlePostDiary} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-5">
              <div onClick={() => showToast("A abrir galeria...")} className="w-full h-48 rounded-[1.5rem] border-2 border-dashed border-[var(--color-atelier-grafite)]/20 bg-white/40 hover:bg-white/80 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[var(--color-atelier-grafite)]/40 group-hover:text-[var(--color-atelier-terracota)] transition-colors"><UploadCloud size={24} /></div>
                <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)]">Arraste a Imagem</span>
              </div>
              <div className="flex flex-col gap-2 group/input">
                <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1">Título da Atualização</label>
                <input type="text" required value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Ex: Construção da Malha Geométrica" className="w-full bg-white/60 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3.5 px-4 text-[14px] outline-none shadow-sm" />
              </div>
              <div className="flex flex-col gap-2 group/input flex-1">
                <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1">Narrativa (Copy)</label>
                <textarea required value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="Explique a decisão de design..." className="w-full h-full min-h-[120px] resize-none bg-white/60 border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3.5 px-4 text-[14px] outline-none shadow-sm custom-scrollbar" />
              </div>
            </div>
            <button type="submit" disabled={isPosting} className="mt-6 w-full bg-[var(--color-atelier-terracota)] text-white h-14 rounded-2xl font-roboto font-bold uppercase tracking-[0.2em] text-[12px] hover:bg-[#8c562e] transition-colors shadow-[0_10px_20px_rgba(173,111,64,0.3)] hover:-translate-y-0.5 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50">
              {isPosting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Gravar no Diário (Database)
            </button>
          </form>
        </div>

      </div>

      {/* ==========================================
          3. PAINEL DESLIZANTE (DRAWER) - REFERÊNCIAS
          ========================================== */}
      <AnimatePresence>
        {showRefsPanel && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRefsPanel(false)} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/20 backdrop-blur-sm cursor-pointer"></motion.div>
            
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-[700px] h-full bg-[var(--color-atelier-creme)] shadow-[-20px_0_50px_rgba(122,116,112,0.2)] flex flex-col border-l border-white overflow-hidden"
            >
              <div className="p-8 border-b border-[var(--color-atelier-grafite)]/10 bg-white/40 flex justify-between items-start shrink-0">
                <div>
                  <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3">Avaliações do Cliente</h2>
                  <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest font-bold mt-2">
                    Projeto: {currentProject?.profiles?.nome} • {adminRefs.length} Direções Enviadas
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowRefsPanel(false)} className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-red-500 transition-all shadow-sm border border-white">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-8 gap-8">
                {/* MOODBOARD MOCKADO */}
                <section className="pb-8 border-b border-[var(--color-atelier-grafite)]/5">
                  <div className="flex items-center gap-2 mb-6 pb-2 border-b border-[var(--color-atelier-grafite)]/5">
                    <ImageIcon size={16} className="text-[var(--color-atelier-terracota)]" />
                    <h3 className="font-roboto text-[13px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Moodboard do Cliente (Mock)</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="aspect-square rounded-2xl overflow-hidden border-4 border-white shadow-sm group relative"><img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Ref Cliente 1" /></div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-6 pb-2 border-b border-[var(--color-atelier-grafite)]/5">
                    <Sparkles size={16} className="text-[var(--color-atelier-terracota)]" />
                    <h3 className="font-roboto text-[13px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Avaliações das Direções Enviadas (Mock)</h3>
                  </div>
                  <div className="flex overflow-x-auto custom-scrollbar gap-3 pb-4 shrink-0">
                    {adminRefs.map((ref, index) => (
                      <button key={ref.id} onClick={() => setActiveEvalIndex(index)} className={`shrink-0 w-32 flex flex-col gap-2 p-2 rounded-xl border transition-all cursor-pointer text-left ${activeEvalIndex === index ? 'bg-white border-[var(--color-atelier-terracota)]/40 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                        <div className="w-full h-16 rounded-lg overflow-hidden border border-white shadow-inner"><img src={ref.img} className="w-full h-full object-cover" alt={ref.title} /></div>
                        <span className={`font-roboto text-[9px] uppercase tracking-widest font-bold truncate w-full ${activeEvalIndex === index ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/50'}`}>{ref.title}</span>
                      </button>
                    ))}
                  </div>

                  {adminRefs[activeEvalIndex] && (
                    <motion.div key={activeEvalIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
                      <div className="flex gap-6 items-start bg-white/40 p-4 rounded-[2rem] border border-white shadow-sm">
                        <div className="w-40 h-40 rounded-2xl overflow-hidden border-4 border-white shadow-sm shrink-0"><img src={adminRefs[activeEvalIndex].img} className="w-full h-full object-cover" alt="" /></div>
                        <div className="flex flex-col pt-2 flex-1 pr-2">
                          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-1">{adminRefs[activeEvalIndex].title}</h3>
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Nota:</span>
                            <span className="bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20 px-3 py-1 rounded-full text-[12px] font-bold font-roboto">{adminRefs[activeEvalIndex].score}/10</span>
                          </div>
                          <button onClick={() => removeAdminRef(adminRefs[activeEvalIndex].id)} className="self-start text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"><X size={12} /> Remover Direção</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </section>

                {/* Formulario de Nova Referência */}
                <div className="mt-4 border-t border-[var(--color-atelier-grafite)]/10 pt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Plus size={16} className="text-[var(--color-atelier-terracota)]" />
                    <h3 className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Enviar Nova Direção ao Cliente</h3>
                  </div>
                  <div className="bg-[var(--color-atelier-terracota)]/5 p-5 rounded-[1.5rem] border border-[var(--color-atelier-terracota)]/20">
                    <div className="flex flex-col gap-4">
                       <label className="w-full h-32 rounded-xl border-2 border-dashed border-[var(--color-atelier-grafite)]/20 hover:border-[var(--color-atelier-terracota)]/40 bg-white/50 cursor-pointer flex flex-col items-center justify-center transition-colors group relative overflow-hidden shadow-sm">
                         <input type="file" accept="image/*" className="hidden" onChange={handleImageUploadRef} />
                         {newRefImage ? (
                           <><img src={newRefImage} alt="Preview" className="w-full h-full object-cover absolute inset-0" /></>
                         ) : (
                           <><UploadCloud size={24} className="text-[var(--color-atelier-grafite)]/40 group-hover:text-[var(--color-atelier-terracota)] mb-2" /><span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)]">Clique para anexar</span></>
                         )}
                       </label>
                       <div className="flex flex-col sm:flex-row gap-3">
                         <input type="text" value={newRefTitle} onChange={(e) => setNewRefTitle(e.target.value)} placeholder="Título da Direção" className="flex-1 bg-white border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 text-[13px] outline-none shadow-sm" />
                         <button onClick={handleAddAdminRef} className="px-6 bg-[var(--color-atelier-grafite)] text-white py-3 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-sm shrink-0">Publicar</button>
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