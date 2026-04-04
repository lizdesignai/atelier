// src/components/admin/InstagramWorkspace.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { 
  Camera, CheckCircle2, Clock, Send, UploadCloud, 
  BrainCircuit, LayoutDashboard, Target, MessageSquare, 
  MapPin, Flame, MousePointerClick, Save, Loader2, Activity, Trash2, Download, Info,
  Plus, ImageIcon, X
} from "lucide-react";

interface InstagramWorkspaceProps {
  activeProjectId: string;
  currentProject: any;
}

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function InstagramWorkspace({ activeProjectId, currentProject }: InstagramWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'missoes' | 'oraculo' | 'briefing'>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados de Dados
  const [posts, setPosts] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [pins, setPins] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<any>(null);

  // Estados da Curadoria (Brandbook Vivo)
  const [adminRefs, setAdminRefs] = useState<any[]>([]);
  const [newRefTitle, setNewRefTitle] = useState("");
  const [newRefImageFiles, setNewRefImageFiles] = useState<File[]>([]);
  const [newRefImagePreviews, setNewRefImagePreviews] = useState<string[]>([]);
  const [isSendingRef, setIsSendingRef] = useState(false);
  const [activeEvalIndex, setActiveEvalIndex] = useState(0);

  // Formulários de Posts e Missões
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [newPostCaption, setNewPostCaption] = useState("");
  const [newPostDate, setNewPostDate] = useState("");
  const [newMissionTitle, setNewMissionTitle] = useState("");
  const [newMissionDesc, setNewMissionDesc] = useState("");

  useEffect(() => {
    if (activeProjectId) fetchInstagramData();
  }, [activeProjectId]);

  const fetchInstagramData = async () => {
    setIsLoading(true);
    try {
      // 1. Buscar Posts
      const { data: postsData } = await supabase.from('social_posts').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false });
      if (postsData) setPosts(postsData);

      // 2. Buscar Missões
      const { data: missionsData } = await supabase.from('asset_missions').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false });
      if (missionsData) setMissions(missionsData);

      // 3. Buscar Pinos (Feedback)
      const postIds = postsData?.map(p => p.id) || [];
      if (postIds.length > 0) {
        const { data: pinsData } = await supabase.from('content_feedback_pins').select('*').in('post_id', postIds);
        if (pinsData) setPins(pinsData);
      }

      // 4. Buscar Briefing (Dossiê)
      const { data: briefData } = await supabase.from('instagram_briefings').select('*').eq('project_id', activeProjectId).maybeSingle();
      if (briefData) setBriefing(briefData);

      // 5. Buscar Curadoria Visual (Brandbook Vivo)
      const { data: directionsData } = await supabase.from('design_directions').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: true });
      if (directionsData) {
        setAdminRefs(directionsData);
        if (directionsData.length > 0) setActiveEvalIndex(directionsData.length - 1); 
      } else {
        setAdminRefs([]);
      }

    } catch (error) {
      console.error("Erro ao carregar dados do Instagram:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // MOTORES DE POSTS E MISSÕES (MANTIDOS INTACTOS)
  // ==========================================
  const handleCreatePost = async () => {
    if (!newPostImage || !activeProjectId || !currentProject?.client_id) return;
    setIsProcessing(true);
    try {
      const fileExt = newPostImage.name.split('.').pop();
      const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${currentProject.client_id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('moodboard').upload(filePath, newPostImage);
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('moodboard').getPublicUrl(filePath);
      const { error: dbError } = await supabase.from('social_posts').insert({
        project_id: activeProjectId,
        client_id: currentProject.client_id,
        image_url: publicUrlData.publicUrl,
        caption: newPostCaption,
        publish_date: newPostDate ? new Date(newPostDate).toISOString() : null,
        status: 'pending_approval'
      });
      if (dbError) throw dbError;
      showToast("Post enviado para aprovação do cliente!");
      setNewPostImage(null); setNewPostCaption(""); setNewPostDate("");
      fetchInstagramData();
    } catch (error) {
      showToast("Erro ao criar post.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm("Apagar esta publicação do sistema?")) return;
    try {
      await supabase.from('social_posts').delete().eq('id', id);
      setPosts(posts.filter(p => p.id !== id));
      showToast("Publicação removida.");
    } catch (error) {
      showToast("Erro ao apagar publicação.");
    }
  };

  const handleCreateMission = async () => {
    if (!newMissionTitle || !activeProjectId || !currentProject?.client_id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('asset_missions').insert({
        project_id: activeProjectId,
        client_id: currentProject.client_id,
        title: newMissionTitle,
        description: newMissionDesc,
        status: 'pending'
      });
      if (error) throw error;
      showToast("Missão despachada para o cofre do cliente!");
      setNewMissionTitle(""); setNewMissionDesc("");
      fetchInstagramData();
    } catch (error) {
      showToast("Erro ao criar missão.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadProcessedAsset = async (e: React.ChangeEvent<HTMLInputElement>, missionId: string) => {
    const file = e.target.files?.[0];
    if (!file || !currentProject?.client_id) return;
    setIsProcessing(true);
    showToast("A enviar material lapidado...");
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `processed_${missionId}_${Date.now()}.${fileExt}`;
      const filePath = `${currentProject.client_id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('vault_assets').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('vault_assets').getPublicUrl(filePath);
      const { error: dbError } = await supabase.from('asset_missions').update({
        status: 'processed',
        processed_image_url: publicUrlData.publicUrl
      }).eq('id', missionId);
      if (dbError) throw dbError;
      showToast("Ativo lapidado com sucesso!");
      fetchInstagramData();
    } catch (error) {
      showToast("Erro no upload.");
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleUpdateMetrics = async (postId: string, engagement: number, clicks: number, saves: number) => {
    try {
      const { error } = await supabase.from('social_posts').update({
        engagement_rate: engagement || 0,
        link_clicks: clicks || 0,
        saves: saves || 0
      }).eq('id', postId);
      if (error) throw error;
      showToast("Sensores do Oráculo atualizados!");
      fetchInstagramData();
    } catch (error) {
      console.error(error);
    }
  };

  // ==========================================
  // MOTOR 5: CURADORIA DE ESTÉTICA (BRANDBOOK)
  // ==========================================
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
    showToast("A enviar Direções Visuais para o Brandbook...");

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
    try {
      await supabase.from('design_directions').delete().eq('id', id);
      setAdminRefs(adminRefs.filter(ref => ref.id !== id));
      setActiveEvalIndex(0); 
      showToast("Direção visual removida.");
    } catch (error) {
      showToast("Erro ao remover direção.");
    }
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <div className="flex flex-col gap-6 w-full animate-[fadeInUp_0.5s_ease-out]">
      
      {/* NAVEGAÇÃO DE ABAS INTERNAS */}
      <div className="glass-panel bg-white/70 p-2 rounded-2xl flex gap-2 overflow-x-auto custom-scrollbar shadow-sm">
        {[
          { id: 'posts', label: 'Fluxo de Impacto', icon: <LayoutDashboard size={16} /> },
          { id: 'missoes', label: 'Cofre de Missões', icon: <Camera size={16} /> },
          { id: 'oraculo', label: 'Calibrador do Oráculo', icon: <Activity size={16} /> },
          { id: 'briefing', label: 'DNA da Marca (Brandbook)', icon: <BrainCircuit size={16} /> },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap
              ${activeTab === tab.id ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white hover:text-[var(--color-atelier-terracota)]'}
            `}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* =======================================
            ABA 1: MOTOR DE CURADORIA (POSTS)
            ======================================= */}
        {activeTab === 'posts' && (
          <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col md:flex-row gap-6">
            
            {/* CRIAR NOVO POST */}
            <div className="w-full md:w-1/3 glass-panel bg-white/80 p-6 rounded-[2rem] flex flex-col gap-4 shadow-sm h-fit border border-white">
              <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-2">
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Novo Post</h3>
                <p className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1">Enviar para aprovação do cliente</p>
              </div>
              
              <label className="w-full h-40 bg-[var(--color-atelier-creme)]/50 border-2 border-dashed border-[var(--color-atelier-terracota)]/30 hover:border-[var(--color-atelier-terracota)] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden group">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setNewPostImage(e.target.files?.[0] || null)} />
                {newPostImage ? (
                  <img src={URL.createObjectURL(newPostImage)} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <>
                    <UploadCloud size={24} className="text-[var(--color-atelier-terracota)]/50 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Mockup Visual</span>
                  </>
                )}
              </label>

              <textarea 
                placeholder="Copywriting / Legenda..."
                value={newPostCaption} onChange={(e) => setNewPostCaption(e.target.value)}
                className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] text-[var(--color-atelier-grafite)] resize-none h-32 outline-none focus:border-[var(--color-atelier-terracota)]/50 custom-scrollbar"
              />

              <div className="flex flex-col gap-1">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Data Sugerida (Opcional)</span>
                <input 
                  type="datetime-local" 
                  value={newPostDate} onChange={(e) => setNewPostDate(e.target.value)}
                  className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50"
                />
              </div>

              <button onClick={handleCreatePost} disabled={isProcessing || !newPostImage} className="w-full bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 shadow-md">
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar ao Cliente
              </button>
            </div>

            {/* LISTAGEM E FEEDBACKS */}
            <div className="w-full md:w-2/3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pb-10">
              {posts.filter(p => ['pending_approval', 'needs_revision', 'approved'].includes(p.status)).map(post => {
                const postPins = pins.filter(pin => pin.post_id === post.id);
                return (
                  <div key={post.id} className="glass-panel bg-white/70 p-6 rounded-[2rem] flex flex-col md:flex-row gap-6 border border-[var(--color-atelier-grafite)]/5 relative group shadow-sm">
                    <button onClick={() => handleDeletePost(post.id)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-2 rounded-full shadow-md z-10"><Trash2 size={14}/></button>
                    
                    <div className="w-32 h-40 rounded-xl overflow-hidden shrink-0 border border-white shadow-inner relative">
                      <img src={post.image_url} alt="Post" className="w-full h-full object-cover" />
                      <div className={`absolute top-2 left-2 backdrop-blur-md px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest border
                        ${post.status === 'approved' ? 'bg-green-500/80 border-green-400 text-white' : post.status === 'needs_revision' ? 'bg-orange-500/80 border-orange-400 text-white' : 'bg-black/60 border-white/20 text-white'}
                      `}>
                        {post.status === 'approved' ? 'Aprovado' : post.status === 'needs_revision' ? 'Ajustes' : 'Pendente'}
                      </div>
                    </div>
                    
                    <div className="flex flex-col flex-1">
                      <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/80 line-clamp-3 mb-4 bg-white/50 p-4 rounded-xl border border-white italic">{post.caption || "Sem legenda."}</p>
                      
                      {postPins.length > 0 ? (
                        <div className="bg-[var(--color-atelier-creme)]/50 p-4 rounded-xl border border-[var(--color-atelier-terracota)]/10 mt-auto">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-1 mb-2"><MapPin size={12}/> Pinos do Cliente (Ajustes)</span>
                          <ul className="flex flex-col gap-2">
                            {postPins.map((pin, i) => (
                              <li key={pin.id} className="text-[11px] text-[var(--color-atelier-grafite)] flex gap-2 items-start bg-white p-2 rounded-lg shadow-sm">
                                <span className="font-black text-[var(--color-atelier-terracota)] mt-0.5">{i + 1}.</span> {pin.comment}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 flex items-center gap-1 mt-auto"><Clock size={12}/> Aguardando ação do cliente...</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {posts.filter(p => ['pending_approval', 'needs_revision', 'approved'].includes(p.status)).length === 0 && (
                <div className="glass-panel bg-white/40 border border-white/40 p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                  <CheckCircle2 size={40} className="text-[var(--color-atelier-grafite)]/20 mb-4" />
                  <p className="font-elegant text-3xl text-[var(--color-atelier-grafite)]/50">Mesa Limpa</p>
                  <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/40 mt-2">Nenhum post ativo no fluxo no momento.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* =======================================
            ABA 2: GESTOR DO COFRE (MISSÕES)
            ======================================= */}
        {activeTab === 'missoes' && (
          <motion.div key="missoes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-8 pb-10">
            
            <div className="glass-panel bg-white/80 p-8 rounded-[2rem] border border-white flex flex-col md:flex-row gap-6 items-center shadow-sm">
              <div className="flex-1 w-full flex flex-col gap-4">
                <input type="text" placeholder="Título da Missão (Ex: Bastidores da Produção)" value={newMissionTitle} onChange={(e) => setNewMissionTitle(e.target.value)} className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-terracota)]/50 rounded-xl px-4 py-3 font-elegant text-2xl text-[var(--color-atelier-grafite)] outline-none shadow-sm" />
                <input type="text" placeholder="Instruções claras para o cliente (ângulo, luz, formato)..." value={newMissionDesc} onChange={(e) => setNewMissionDesc(e.target.value)} className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-terracota)]/50 rounded-xl px-4 py-3 font-roboto text-[13px] text-[var(--color-atelier-grafite)] outline-none shadow-sm" />
              </div>
              <button onClick={handleCreateMission} disabled={isProcessing || !newMissionTitle} className="w-full md:w-auto px-10 py-4 h-[110px] bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 shrink-0 shadow-md">
                {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />} <span>Disparar<br/>Missão</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {missions.map(mission => (
                <div key={mission.id} className="glass-panel bg-white/70 p-6 md:p-8 rounded-[2rem] flex flex-col border border-white shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-elegant text-xl text-[var(--color-atelier-grafite)] pr-4">{mission.title}</h4>
                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest shrink-0 border
                      ${mission.status === 'pending' ? 'bg-orange-50 border-orange-200 text-orange-600' : mission.status === 'uploaded' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-green-50 border-green-200 text-green-600'}
                    `}>
                      {mission.status === 'pending' ? 'Aguardando' : mission.status === 'uploaded' ? 'Requer Lapidação' : 'Finalizado'}
                    </span>
                  </div>
                  
                  {mission.status === 'uploaded' && (
                    <div className="mt-auto bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-blue-200 shadow-sm">
                           <img src={mission.raw_image_url} alt="Cru" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-800">Cru Recebido</span>
                      </div>
                      <label className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest cursor-pointer hover:bg-blue-700 transition-all shadow-md flex items-center gap-2">
                        <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleUploadProcessedAsset(e, mission.id)} disabled={isProcessing} />
                        {isProcessing ? <Loader2 size={12} className="animate-spin"/> : <UploadCloud size={12} />} Enviar Arte
                      </label>
                    </div>
                  )}
                  
                  {mission.status === 'processed' && (
                    <div className="mt-auto bg-green-50/50 p-4 rounded-xl border border-green-100 flex items-center justify-between">
                      <div className="flex gap-2">
                         <div className="w-10 h-10 rounded-lg overflow-hidden border border-green-200 opacity-60"><img src={mission.raw_image_url} alt="Cru" className="w-full h-full object-cover" /></div>
                         <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-[var(--color-atelier-terracota)] shadow-md"><img src={mission.processed_image_url} alt="Lapidado" className="w-full h-full object-cover" /></div>
                      </div>
                      <CheckCircle2 size={20} className="text-green-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* =======================================
            ABA 3: CALIBRADOR DO ORÁCULO
            ======================================= */}
        {activeTab === 'oraculo' && (
          <motion.div key="oraculo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10">
             {posts.filter(p => p.status === 'approved' || p.status === 'published').map(post => (
               <div key={post.id} className="glass-panel bg-white/80 p-5 rounded-[2rem] border border-white flex flex-col gap-4 shadow-sm group">
                 <div className="w-full h-32 rounded-xl overflow-hidden border border-[var(--color-atelier-grafite)]/5 shadow-inner relative">
                   <img src={post.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Post" />
                 </div>
                 
                 <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-[var(--color-atelier-creme)]/30 px-3 py-2 rounded-lg">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 flex items-center gap-1.5"><Activity size={12} className="text-orange-400"/> Engaj. (%)</label>
                      <input type="number" defaultValue={post.engagement_rate} onBlur={(e) => handleUpdateMetrics(post.id, parseFloat(e.target.value), post.link_clicks, post.saves)} className="w-16 bg-white border border-[var(--color-atelier-grafite)]/10 focus:border-orange-400 rounded px-2 py-1 text-xs outline-none text-center font-black text-orange-500 shadow-sm" />
                    </div>
                    <div className="flex justify-between items-center bg-[var(--color-atelier-creme)]/30 px-3 py-2 rounded-lg">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 flex items-center gap-1.5"><MousePointerClick size={12} className="text-[var(--color-atelier-terracota)]"/> Cliques</label>
                      <input type="number" defaultValue={post.link_clicks} onBlur={(e) => handleUpdateMetrics(post.id, post.engagement_rate, parseInt(e.target.value), post.saves)} className="w-16 bg-white border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-terracota)] rounded px-2 py-1 text-xs outline-none text-center font-black text-[var(--color-atelier-terracota)] shadow-sm" />
                    </div>
                    <div className="flex justify-between items-center bg-[var(--color-atelier-creme)]/30 px-3 py-2 rounded-lg">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 flex items-center gap-1.5"><Flame size={12} className="text-[var(--color-atelier-grafite)]/50"/> Salvos</label>
                      <input type="number" defaultValue={post.saves} onBlur={(e) => handleUpdateMetrics(post.id, post.engagement_rate, post.link_clicks, parseInt(e.target.value))} className="w-16 bg-white border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-grafite)] rounded px-2 py-1 text-xs outline-none text-center font-black text-[var(--color-atelier-grafite)] shadow-sm" />
                    </div>
                 </div>
               </div>
             ))}
             {posts.filter(p => p.status === 'approved' || p.status === 'published').length === 0 && (
               <div className="col-span-3 text-center p-10 text-[var(--color-atelier-grafite)]/40 font-roboto text-[11px] uppercase font-bold tracking-widest">
                 Ainda não existem publicações aprovadas para alimentar o Oráculo.
               </div>
             )}
          </motion.div>
        )}

        {/* =======================================
            ABA 4: DNA DA MARCA (Brandbook & CMO)
            ======================================= */}
        {activeTab === 'briefing' && (
          <motion.div key="briefing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 pb-10 w-full text-left">
            
            {/* PARTE 1: BRIEFING E IA ESTRATÉGICA */}
            {!briefing ? (
              <div className="glass-panel bg-white/80 p-12 rounded-[2.5rem] border border-orange-200 flex flex-col items-center justify-center text-center shadow-sm w-full">
                <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-6 text-orange-500 border border-orange-100 animate-pulse">
                  <Target size={40} />
                </div>
                <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">Aguardando Dossiê de Mercado</h2>
                <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60 max-w-md mb-8">
                  O cliente ainda não preencheu o formulário inicial estratégico. O Brandbook Vivo está bloqueado até obtermos esses dados.
                </p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-6 w-full">
                {/* Lado Esquerdo: Respostas do Cliente */}
                <div className="flex-1 bg-white/50 p-8 rounded-[2.5rem] border border-white shadow-sm overflow-y-auto max-h-[60vh] custom-scrollbar">
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-6 border-b border-[var(--color-atelier-grafite)]/5 pb-4">Dossiê do Cliente</h3>
                  <div className="flex flex-col gap-6">
                    <InfoBlock label="Produto Âncora" value={briefing.answers.produto_ancora} />
                    <InfoBlock label="Cliente Ideal (20/80)" value={briefing.answers.cliente_ideal} />
                    <InfoBlock label="Gatilho de Compra" value={briefing.answers.gatilho_compra === 'Outro' ? briefing.answers.gatilho_compra_outro : briefing.answers.gatilho_compra} />
                    <InfoBlock label="Inimigo Comum" value={briefing.answers.inimigo_comum} />
                    <InfoBlock label="Padrão de Excelência" value={briefing.answers.padrao_excelencia} />
                    <InfoBlock label="Persona da Marca" value={briefing.answers.persona_marca} />
                    <InfoBlock label="Estado do Arsenal" value={briefing.answers.arsenal_visual} />
                    <InfoBlock label="Ponto de Chegada (Endgame)" value={briefing.answers.ponto_chegada} />
                  </div>
                </div>

                {/* Lado Direito: Ações de Inteligência */}
                <div className="w-full md:w-[400px] flex flex-col gap-4">
                  <button 
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        const res = await fetch('/api/insights/instagram', {
                          method: 'POST',
                          body: JSON.stringify({ briefingData: briefing.answers, clientName: currentProject.profiles.nome })
                        });
                        const data = await res.json();
                        await supabase.from('projects').update({ instagram_ai_insight: data.insight }).eq('id', activeProjectId);
                        fetchInstagramData();
                        showToast("Estratégia CMO Gerada! ✨");
                      } catch (e) { showToast("Erro ao gerar IA."); }
                      finally { setIsProcessing(false); }
                    }}
                    disabled={isProcessing}
                    className="w-full bg-[var(--color-atelier-grafite)] text-white p-5 rounded-[2rem] font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-[var(--color-atelier-terracota)] transition-all shadow-md disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <BrainCircuit size={20} />}
                    Gerar Brandbook IA (CMO)
                  </button>

                  <div className="bg-white/80 p-6 rounded-[2.5rem] border border-[var(--color-atelier-terracota)]/20 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar shadow-inner">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mb-4 flex items-center gap-2 border-b border-[var(--color-atelier-grafite)]/10 pb-2">
                      <Target size={14}/> Estratégia de Conteúdo
                    </span>
                    <div className="text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed whitespace-pre-wrap">
                      {currentProject.instagram_ai_insight || "Aguardando geração do cérebro estratégico..."}
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      showToast("A forjar PDF Vetorial...");
                      const { pdf } = await import('@react-pdf/renderer');
                      const InstagramPDF = (await import('../pdf/InstagramBriefingPDF')).default;
                      const doc = <InstagramPDF data={briefing.answers} clientName={currentProject.profiles.nome} aiInsight={currentProject.instagram_ai_insight} />;
                      const blob = await pdf(doc).toBlob();
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url; link.download = `Brandbook_CMO_${currentProject.profiles.nome}.pdf`;
                      link.click();
                    }}
                    className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] p-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)] transition-all shadow-sm"
                  >
                    <Download size={16} /> Exportar Brandbook PDF
                  </button>
                </div>
              </div>
            )}

            {/* PARTE 2: CURADORIA DE ESTÉTICA (REFERÊNCIAS) */}
            {briefing && (
              <div className="glass-panel bg-white/80 p-8 rounded-[2.5rem] border border-white shadow-sm mt-4 w-full">
                <div className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/5 pb-4 mb-8">
                  <div>
                    <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3">Curadoria Visual do Feed</h3>
                    <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest font-bold mt-2">
                      Envie referências para validação. As avaliações formarão o Brandbook final.
                    </p>
                  </div>
                  <div className="bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] px-4 py-2 rounded-full font-bold uppercase tracking-widest text-[10px]">
                    {adminRefs.length} Enviadas
                  </div>
                </div>

                <div className="flex flex-col gap-8">
                  {/* Seção de Direções Enviadas */}
                  {adminRefs.length === 0 ? (
                    <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/40 italic">Nenhuma direção visual enviada ainda.</p>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {/* Carrossel de Direções */}
                      <div className="flex overflow-x-auto custom-scrollbar gap-3 pb-4 shrink-0">
                        {adminRefs.map((ref, index) => {
                          const coverImage = ref.image_urls && ref.image_urls.length > 0 ? ref.image_urls[0] : ref.image_url;
                          return (
                            <button key={ref.id} onClick={() => setActiveEvalIndex(index)} className={`shrink-0 w-32 flex flex-col gap-2 p-2 rounded-xl border transition-all cursor-pointer text-left ${activeEvalIndex === index ? 'bg-white border-[var(--color-atelier-terracota)]/40 shadow-sm ring-1 ring-[var(--color-atelier-terracota)]/20' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                              <div className="w-full h-16 rounded-lg overflow-hidden border border-white shadow-inner"><img src={coverImage} className="w-full h-full object-cover" alt={ref.title} /></div>
                              <span className={`font-roboto text-[9px] uppercase tracking-widest font-bold truncate w-full ${activeEvalIndex === index ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/50'}`}>{ref.title}</span>
                            </button>
                          )
                        })}
                      </div>

                      {/* Avaliação Selecionada */}
                      {adminRefs[activeEvalIndex] && (
                        <motion.div key={activeEvalIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6 bg-white/50 p-6 rounded-[2rem] border border-white shadow-inner">
                          <div className="flex justify-between w-full items-start">
                            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-1">{adminRefs[activeEvalIndex].title}</h3>
                            <span className={`border px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest font-roboto ${adminRefs[activeEvalIndex].score > 0 ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)]/20' : 'bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)]/40 border-transparent'}`}>
                              {adminRefs[activeEvalIndex].score > 0 ? `Nota do Cliente: ${adminRefs[activeEvalIndex].score}/10` : 'Avaliação Pendente'}
                            </span>
                          </div>

                          {/* Grid de Imagens */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                            {(adminRefs[activeEvalIndex].image_urls && adminRefs[activeEvalIndex].image_urls.length > 0 
                                ? adminRefs[activeEvalIndex].image_urls 
                                : [adminRefs[activeEvalIndex].image_url]
                             ).map((imgUrl: string, idx: number) => (
                              <div key={idx} className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-sm cursor-pointer" onClick={() => window.open(imgUrl, "_blank")}>
                                <img src={imgUrl} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" alt="" />
                              </div>
                            ))}
                          </div>

                          {/* Feedback de Texto */}
                          <div className="flex flex-col gap-3 w-full bg-white p-5 rounded-2xl border border-[var(--color-atelier-grafite)]/5">
                            <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] border-b border-[var(--color-atelier-grafite)]/5 pb-2">Feedback Estratégico</span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                              <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]"><strong>Atmosfera:</strong> {adminRefs[activeEvalIndex].feedback?.q1 || "-"}</p>
                              <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]"><strong>Tipografia:</strong> {adminRefs[activeEvalIndex].feedback?.q2 || "-"}</p>
                              <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]"><strong>Cores:</strong> {adminRefs[activeEvalIndex].feedback?.q3 || "-"}</p>
                              <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]"><strong>Elementos:</strong> {adminRefs[activeEvalIndex].feedback?.q4 || "-"}</p>
                            </div>
                          </div>

                          <button onClick={() => removeAdminRef(adminRefs[activeEvalIndex].id)} className="self-end text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"><X size={12} /> Apagar Direção</button>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Seção de Envio (Upload Multi-imagens) */}
                  <div className="mt-4 border-t border-[var(--color-atelier-grafite)]/10 pt-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Plus size={16} className="text-[var(--color-atelier-terracota)]" />
                      <h3 className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Enviar Nova Direção (Brandbook Vivo)</h3>
                    </div>
                    <div className="bg-white/40 p-6 rounded-[2rem] border border-[var(--color-atelier-terracota)]/20 shadow-inner">
                      <div className="flex flex-col gap-4">
                         <label className="w-full min-h-[120px] rounded-2xl border-2 border-dashed border-[var(--color-atelier-grafite)]/20 hover:border-[var(--color-atelier-terracota)]/40 bg-white/60 cursor-pointer flex flex-col items-center justify-center transition-colors group relative p-4">
                           <input type="file" accept="image/*" multiple className="hidden" onChange={handleMultiImageUploadRef} disabled={isSendingRef} />
                           
                           {newRefImagePreviews.length > 0 ? (
                             <div className="flex flex-wrap gap-3 justify-center w-full relative z-20">
                               {newRefImagePreviews.map((preview, i) => (
                                 <div key={i} className="w-20 h-20 rounded-xl overflow-hidden relative shadow-sm border border-white">
                                   <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                   <button type="button" onClick={(e) => { e.preventDefault(); handleRemoveRefImage(i); }} className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center hover:scale-110"><X size={10}/></button>
                                 </div>
                               ))}
                               <div className="w-20 h-20 rounded-xl border-2 border-dashed border-[var(--color-atelier-grafite)]/20 flex flex-col items-center justify-center text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] bg-white/50 transition-colors">
                                 <Plus size={20}/>
                               </div>
                             </div>
                           ) : (
                             <>
                               <ImageIcon size={28} className="text-[var(--color-atelier-grafite)]/30 group-hover:text-[var(--color-atelier-terracota)] mb-3 transition-colors" />
                               <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)] transition-colors">Selecione Múltiplas Imagens</span>
                             </>
                           )}
                         </label>

                         <div className="flex flex-col sm:flex-row gap-3">
                           <input type="text" value={newRefTitle} onChange={(e) => setNewRefTitle(e.target.value)} disabled={isSendingRef} placeholder="Título da Direção (Ex: Paleta Outono / Tipografia Serifada)" className="flex-1 bg-white border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-4 py-3 text-[13px] outline-none shadow-sm disabled:opacity-50" />
                           <button onClick={handleAddAdminRef} disabled={isSendingRef || newRefImageFiles.length === 0 || !newRefTitle} className="px-8 bg-[var(--color-atelier-grafite)] text-white py-3 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-md shrink-0 disabled:opacity-50 flex items-center justify-center gap-2">
                             {isSendingRef ? <Loader2 size={16} className="animate-spin" /> : <Send size={14}/>} Enviar Referências
                           </button>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// UTILITÁRIO
// ============================================================================
function InfoBlock({ label, value }: { label: string, value: any }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 border-l-2 border-[var(--color-atelier-terracota)]/20 pl-4 py-1">
      <span className="font-roboto text-[10px] uppercase font-black tracking-widest text-[var(--color-atelier-terracota)]">
        {label}
      </span>
      <span className="font-roboto text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed whitespace-pre-wrap">
        {value}
      </span>
    </div>
  );
}