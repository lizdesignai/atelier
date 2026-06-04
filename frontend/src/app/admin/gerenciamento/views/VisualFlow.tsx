// src/app/admin/gerenciamento/views/VisualFlow.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../lib/supabase";
import { 
  UploadCloud, Loader2, Send, Trash2, MapPin, 
  Clock, CheckCircle2, Figma, Maximize2, ExternalLink, X, ImageIcon, LayoutDashboard, AlertCircle
} from "lucide-react";
import { NotificationEngine } from "../../../../lib/NotificationEngine";

interface VisualFlowProps {
  activeProjectId: string;
  currentProject: any;
}

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function VisualFlow({ activeProjectId, currentProject }: VisualFlowProps) {
  // ==========================================
  // ESTADOS GERAIS
  // ==========================================
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Dados do Banco de Dados
  const [posts, setPosts] = useState<any[]>([]);
  const [pins, setPins] = useState<any[]>([]);
  const [approvedPlans, setApprovedPlans] = useState<any[]>([]);

  // Integração Figma
  const [isFigmaOpen, setIsFigmaOpen] = useState(false);
  const [isFigmaPromptOpen, setIsFigmaPromptOpen] = useState(false); // Modal para pedir o link
  const [figmaUrl, setFigmaUrl] = useState(currentProject?.figma_url || "");
  const [tempFigmaUrl, setTempFigmaUrl] = useState("");

  // Formulário de Nova Arte
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(""); 
  const [newPostCaption, setNewPostCaption] = useState("");

  // ==========================================
  // 1. CARREGAMENTO DE DADOS
  // ==========================================
  useEffect(() => {
    fetchVisualData();
    // Atualiza o estado do Figma caso troque de projeto
    if (currentProject) {
      setFigmaUrl(currentProject.figma_url || "");
    }
  }, [activeProjectId, currentProject]);

  // Autopreenchimento da legenda com base no planejamento aprovado
  useEffect(() => {
    if (selectedPlanId) {
      const selectedPlan = approvedPlans.find(p => p.id === selectedPlanId);
      if (selectedPlan) {
        setNewPostCaption(`**${selectedPlan.hook}**\n\n${selectedPlan.briefing}`);
      }
    } else {
      setNewPostCaption("");
    }
  }, [selectedPlanId, approvedPlans]);

  const fetchVisualData = async () => {
    setIsLoading(true);
    try {
      if (!activeProjectId) return;

      // 1. Busca as Artes Enviadas
      const { data: postsData, error: postsError } = await supabase
        .from('social_posts')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false });
        
      if (postsError) throw postsError;
      if (postsData) setPosts(postsData);

      // 2. Busca os Apontamentos de Feedback (Pinos do Cliente)
      const postIds = postsData?.map(p => p.id) || [];
      if (postIds.length > 0) {
        const { data: pinsData } = await supabase
          .from('content_feedback_pins')
          .select('*')
          .in('post_id', postIds);
        if (pinsData) setPins(pinsData);
      }

      // 3. Busca os Planejamentos Aprovados (para vincular à arte)
      const { data: plans } = await supabase
        .from('content_planning')
        .select('*')
        .eq('project_id', activeProjectId)
        .eq('status', 'approved');
      
      if (plans) setApprovedPlans(plans);

    } catch (error) {
      console.error("Erro ao carregar Fluxo Visual:", error);
      showToast("Erro ao carregar as artes gráficas.");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 2. GESTÃO DO QUADRO FIGMA
  // ==========================================
  const handleSaveFigmaUrl = async () => {
    if (!tempFigmaUrl.includes("figma.com")) {
      showToast("Insira uma URL válida de compartilhamento do Figma.");
      return false;
    }
    try {
      const { error } = await supabase
        .from('projects')
        .update({ figma_url: tempFigmaUrl })
        .eq('id', activeProjectId);

      if (error) throw error;
      setFigmaUrl(tempFigmaUrl);
      showToast("Ambiente do Figma vinculado com sucesso!");
      return true;
    } catch (e) {
      showToast("Erro ao vincular a URL no banco de dados.");
      return false;
    }
  };

  const handleFigmaAction = () => {
    if (figmaUrl) {
      // Abre diretamente o Figma em uma nova aba para edição total
      window.open(figmaUrl, "_blank");
      showToast("Abrindo o editor do Figma...");
    } else {
      setIsFigmaPromptOpen(true);
    }
  };

  // ==========================================
  // 3. LÓGICA DE SUBMISSÃO DE ARTE
  // ==========================================
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPostImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreatePost = async () => {
    if (!newPostImage || !activeProjectId || !currentProject) {
      showToast("Selecione uma imagem e certifique-se de que há um cliente ativo.");
      return;
    }
    setIsProcessing(true);
    showToast("Enviando arte para o cliente...");

    try {
      // 1. Upload para o Storage (community_images)
      const fileExt = newPostImage.name.split('.').pop();
      const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${currentProject.client_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('community_images').upload(filePath, newPostImage, { upsert: true });
      if (uploadError) throw uploadError;

      // 2. Resgata a URL pública
      const { data: publicUrlData } = supabase.storage.from('community_images').getPublicUrl(filePath);

      // 3. Cria o registro na tabela social_posts
      const { data: insertedPost, error: dbError } = await supabase.from('social_posts').insert({
        project_id: activeProjectId,
        client_id: currentProject.client_id,
        image_url: publicUrlData.publicUrl,
        caption: newPostCaption,
        status: 'pending_approval' // Fila de aprovação do cliente
      }).select().single();

      if (dbError) throw dbError;

      // 4. Vincula e conclui a ideia de planejamento (Opcional)
      if (selectedPlanId) {
        await supabase.from('content_planning').update({ status: 'completed' }).eq('id', selectedPlanId);
      }

      // 5. Atualiza a UI otimista
      setPosts([insertedPost, ...posts]);
      setNewPostImage(null); 
      setImagePreview(null);
      setNewPostCaption(""); 
      setSelectedPlanId("");

      // 🔔 NOTIFICAÇÃO: Disparo para o Cliente
      await NotificationEngine.notifyUser(
        currentProject.client_id,
        "🎨 Nova Arte para Aprovação",
        "A equipe enviou uma nova peça gráfica para o seu painel. Analise e aprove no Meu Espaço.",
        "action",
        "/meu-espaco"
      );

      showToast("Arte gráfica enviada para aprovação do cliente! ✨");
    } catch (error) {
      console.error(error);
      showToast("Erro ao criar a peça visual.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // 4. LÓGICA DE EXCLUSÃO
  // ==========================================
  const handleDeletePost = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta arte do fluxo?")) return;
    try {
      await supabase.from('social_posts').delete().eq('id', id);
      setPosts(posts.filter(p => p.id !== id));
      showToast("Arte excluída com sucesso.");
    } catch (error) {
      console.error(error);
      showToast("Erro ao excluir a arte.");
    }
  };

  // Filtramos para mostrar apenas os posts que estão em fluxo ativo
  const visiblePosts = posts.filter(p => ['pending', 'pending_approval', 'needs_revision', 'approved'].includes(p.status));

  // Renderização de Loading Modular
  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center glass-panel bg-white/40 rounded-[3rem] border border-white">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 relative">
      
      {/* ==========================================
          BOTÃO FLUTUANTE DO FIGMA (FAB)
          ========================================== */}
      <button 
        onClick={handleFigmaAction}
        className="absolute bottom-6 right-6 z-40 w-16 h-16 bg-black text-white rounded-full flex items-center justify-center shadow-[0_15px_30px_rgba(0,0,0,0.3)] hover:scale-110 hover:bg-[#F24E1E] transition-all duration-300 group"
        title={figmaUrl ? "Abrir Editor Figma" : "Vincular Figma"}
      >
        <Figma size={26} className="group-hover:animate-pulse" />
      </button>

      {/* ==========================================
          SEÇÃO CENTRAL: FORMULÁRIO & GALERIA
          ========================================== */}
      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 flex-1">
        
        {/* COLUNA ESQUERDA: FORMULÁRIO DE ENVIO */}
        <div className="w-full lg:w-[400px] glass-panel bg-white/60 p-8 rounded-[3rem] flex flex-col gap-6 shadow-sm shrink-0 border border-white overflow-y-auto custom-scrollbar transition-colors hover:bg-white/80">
          <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4 shrink-0">
            <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
              <UploadCloud size={24} className="text-[var(--color-atelier-terracota)]"/> Enviar Arte
            </h3>
            <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/50 font-medium mt-2">Exporte a peça do Figma e anexe para aprovação.</p>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0 mt-2">
            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Estratégia Aprovada (Opcional)</span>
            <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-2xl p-4 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm text-[var(--color-atelier-grafite)] font-medium cursor-pointer transition-colors">
              <option value="" className="text-gray-400">Enviar arte avulsa...</option>
              {approvedPlans.map(plan => (
                <option key={plan.id} value={plan.id}>"{plan.hook}" - {plan.pillar}</option>
              ))}
            </select>
          </div>
          
          <label className="w-full aspect-square bg-white/80 border-2 border-dashed border-[var(--color-atelier-grafite)]/20 hover:border-[var(--color-atelier-terracota)]/50 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden group shadow-inner shrink-0">
            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleImageSelect} />
            {imagePreview ? (
              <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm border border-gray-100">
                  <ImageIcon size={28} className="text-[var(--color-atelier-grafite)]/30 group-hover:text-[var(--color-atelier-terracota)] transition-colors" />
                </div>
                <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)] transition-colors">Anexar Arte Exportada</span>
              </>
            )}
          </label>

          <div className="flex flex-col gap-1.5 shrink-0 w-full">
            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Legenda da Publicação</span>
            <textarea 
              placeholder="Escreva o texto que acompanhará esta arte..." 
              value={newPostCaption} 
              onChange={(e) => setNewPostCaption(e.target.value)} 
              className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-[1.5rem] p-5 text-[13px] resize-none min-h-[140px] outline-none focus:border-[var(--color-atelier-terracota)]/50 custom-scrollbar shadow-sm transition-colors text-[var(--color-atelier-grafite)] font-medium" 
            />
          </div>

          <button 
            onClick={handleCreatePost} 
            disabled={isProcessing || !newPostImage} 
            className="w-full bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white py-5 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 shadow-md shrink-0 hover:-translate-y-0.5 disabled:hover:translate-y-0"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar para o Cliente
          </button>
        </div>

        {/* COLUNA DIREITA: GALERIA DE FLUXO */}
        <div className="flex-1 glass-panel bg-white/40 p-8 rounded-[3rem] border border-white shadow-sm flex flex-col min-h-[400px] overflow-hidden">
          <div className="flex items-center gap-3 mb-8 border-b border-[var(--color-atelier-grafite)]/10 pb-4 shrink-0">
            <LayoutDashboard size={24} className="text-[var(--color-atelier-terracota)]" />
            <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Status das Aprovações</h3>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">
            {visiblePosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-40 bg-white/30 rounded-[2rem] border border-white p-10 text-center">
                <CheckCircle2 size={48} className="mb-4 text-[var(--color-atelier-terracota)]" />
                <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Fluxo Limpo</h3>
                <p className="font-roboto text-[13px] font-medium mt-2">Nenhuma arte gráfica aguardando análise deste cliente.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence>
                  {visiblePosts.map(post => {
                    const postPins = pins.filter(pin => pin.post_id === post.id);
                    
                    return (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        key={post.id} 
                        className="bg-white rounded-[2rem] flex flex-col border border-gray-100 shadow-sm relative group overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* Botão de Excluir */}
                        <button onClick={() => handleDeletePost(post.id)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-md p-2 rounded-full shadow-md z-10 border border-red-50 hover:scale-110">
                          <Trash2 size={14}/>
                        </button>
                        
                        {/* Imagem e Status */}
                        <div className="w-full aspect-square overflow-hidden shrink-0 relative bg-gray-50 border-b border-gray-100">
                          <img src={post.image_url} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          <div className={`absolute top-4 left-4 backdrop-blur-xl px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border shadow-sm
                            ${post.status === 'approved' ? 'bg-green-500/90 border-green-400 text-white' : post.status === 'needs_revision' ? 'bg-orange-500/90 border-orange-400 text-white' : 'bg-black/70 border-white/20 text-white'}
                          `}>
                            {post.status === 'approved' ? 'Aprovado' : post.status === 'needs_revision' ? 'Ajustes' : 'Em Análise'}
                          </div>
                        </div>
                        
                        {/* Informações e Feedback */}
                        <div className="p-5 flex flex-col flex-1 bg-white">
                          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/80 leading-relaxed mb-4 line-clamp-2 font-medium">
                            {post.caption || <span className="italic opacity-50">Arte visual enviada sem legenda...</span>}
                          </p>
                          
                          {postPins.length > 0 ? (
                            <div className="bg-[var(--color-atelier-creme)]/50 p-4 rounded-2xl border border-[var(--color-atelier-terracota)]/20 shadow-inner mt-auto">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-1.5 mb-2">
                                <MapPin size={12}/> Apontamentos do Cliente
                              </span>
                              <ul className="flex flex-col gap-2 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                                {postPins.map((pin, i) => (
                                  <li key={pin.id} className="text-[11px] text-[var(--color-atelier-grafite)] flex gap-2 items-start bg-white p-2.5 rounded-xl shadow-sm border border-transparent font-medium">
                                    <span className="font-black text-[var(--color-atelier-terracota)] mt-0.5">{i + 1}.</span> {pin.comment}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <div className="mt-auto flex items-center gap-2 justify-center opacity-60 bg-gray-50 py-3 rounded-xl border border-gray-100">
                              {post.status === 'approved' ? (
                                <><CheckCircle2 size={14} className="text-green-600"/><span className="text-[10px] font-bold uppercase tracking-widest text-green-700">Aprovado sem ajustes</span></>
                              ) : (
                                <><Clock size={14} className="text-[var(--color-atelier-grafite)]/50"/><span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">Aguardando Avaliação</span></>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL: INSERIR LINK DO FIGMA
          ========================================== */}
      <AnimatePresence>
        {isFigmaPromptOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-lg relative flex flex-col gap-4 border border-gray-100"
            >
              <button onClick={() => setIsFigmaPromptOpen(false)} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <X size={18} />
              </button>
              
              <div className="w-14 h-14 rounded-2xl bg-[#F24E1E]/10 flex items-center justify-center text-[#F24E1E] mb-2 shadow-inner border border-[#F24E1E]/20">
                <Figma size={28} />
              </div>
              
              <div>
                <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">Vincular Ambiente Figma</h3>
                <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60 font-medium leading-relaxed">
                  Insira o link de edição deste cliente. Ao clicar no botão flutuante, a plataforma abrirá este arquivo diretamente no Figma para você projetar com máxima performance.
                </p>
              </div>
              
              <input
                type="text"
                placeholder="https://www.figma.com/design/..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-[13px] outline-none focus:border-[#F24E1E]/50 transition-colors mt-2 font-medium text-[var(--color-atelier-grafite)]"
                value={tempFigmaUrl}
                onChange={(e) => setTempFigmaUrl(e.target.value)}
              />
              
              <button
                onClick={async () => {
                  const success = await handleSaveFigmaUrl();
                  if (success) {
                    setIsFigmaPromptOpen(false);
                    window.open(tempFigmaUrl, "_blank"); // Abre o editor logo após salvar
                  }
                }}
                className="w-full bg-black text-white py-4 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-[#F24E1E] transition-all shadow-md mt-2 hover:-translate-y-0.5"
              >
                Salvar e Abrir Figma
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}