// src/app/admin/gerenciamento/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { 
  Camera, CheckCircle2, Clock, Send, UploadCloud, 
  BrainCircuit, LayoutDashboard, Target, MapPin, 
  Flame, MousePointerClick, Loader2, Activity, Trash2,
  ChevronDown, Smartphone, ChevronRight, ChevronLeft,
  X, Download
} from "lucide-react";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ============================================================================
// COMPONENTE INTERNO: O WORKSPACE DE INSTAGRAM
// ============================================================================
function InstagramWorkspace({ activeProjectId, currentProject }: { activeProjectId: string, currentProject: any }) {
  const [activeTab, setActiveTab] = useState<'posts' | 'missoes' | 'oraculo' | 'briefing'>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [posts, setPosts] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [pins, setPins] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<any>(null);

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
      const { data: postsData } = await supabase.from('social_posts').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false });
      if (postsData) setPosts(postsData);

      const { data: missionsData } = await supabase.from('asset_missions').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false });
      if (missionsData) setMissions(missionsData);

      const postIds = postsData?.map(p => p.id) || [];
      if (postIds.length > 0) {
        const { data: pinsData } = await supabase.from('content_feedback_pins').select('*').in('post_id', postIds);
        if (pinsData) setPins(pinsData);
      }

      const { data: briefData } = await supabase.from('instagram_briefings').select('*').eq('project_id', activeProjectId).maybeSingle();
      if (briefData) setBriefing(briefData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

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

      showToast("Post enviado para a mesa do cliente!");
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
      showToast("Missão enviada ao cliente!");
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

      await supabase.from('asset_missions').update({
        status: 'processed',
        processed_image_url: publicUrlData.publicUrl
      }).eq('id', missionId);

      showToast("Ativo finalizado com sucesso!");
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
      showToast("Oráculo Calibrado.");
      fetchInstagramData();
    } catch (error) {
      showToast("Erro ao calibrar métricas.");
    }
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <div className="flex flex-col gap-6 w-full animate-[fadeInUp_0.5s_ease-out] flex-1">
      
      {/* NAVEGAÇÃO INTERNA */}
      <div className="glass-panel bg-white/70 p-2 rounded-2xl flex gap-2 overflow-x-auto custom-scrollbar shrink-0 border border-white shadow-sm">
        {[
          { id: 'posts', label: 'Curadoria de Posts', icon: <LayoutDashboard size={16} /> },
          { id: 'missoes', label: 'Cofre de Missões', icon: <Camera size={16} /> },
          { id: 'oraculo', label: 'Calibrador do Oráculo', icon: <BrainCircuit size={16} /> },
          { id: 'briefing', label: 'Estratégia (CMO)', icon: <Target size={16} /> },
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
        
        {/* ABA 1: MOTOR DE CURADORIA */}
        {activeTab === 'posts' && (
          <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col md:flex-row gap-6 h-full">
            <div className="w-full md:w-1/3 glass-panel bg-white/80 p-8 rounded-[2rem] flex flex-col gap-5 shadow-sm h-fit border border-white shrink-0">
              <div className="border-b border-[var(--color-atelier-grafite)]/5 pb-4 mb-2">
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Novo Post</h3>
                <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1">Enviar para aprovação</p>
              </div>
              
              <label className="w-full h-48 bg-white border-2 border-dashed border-[var(--color-atelier-grafite)]/20 hover:border-[var(--color-atelier-terracota)]/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden group shadow-inner">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setNewPostImage(e.target.files?.[0] || null)} />
                {newPostImage ? (
                  <img src={URL.createObjectURL(newPostImage)} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <>
                    <UploadCloud size={24} className="text-[var(--color-atelier-grafite)]/30 mb-2 group-hover:scale-110 group-hover:text-[var(--color-atelier-terracota)] transition-all" />
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)]">Fazer Upload da Imagem</span>
                  </>
                )}
              </label>

              <textarea 
                placeholder="Copywriting / Legenda..."
                value={newPostCaption} onChange={(e) => setNewPostCaption(e.target.value)}
                className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] text-[var(--color-atelier-grafite)] resize-none h-32 outline-none focus:border-[var(--color-atelier-terracota)]/50 custom-scrollbar shadow-sm"
              />

              <div className="flex flex-col gap-1">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1">Data Sugerida</span>
                <input 
                  type="datetime-local" 
                  value={newPostDate} onChange={(e) => setNewPostDate(e.target.value)}
                  className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]/50 shadow-sm"
                />
              </div>

              <button onClick={handleCreatePost} disabled={isProcessing || !newPostImage} className="w-full bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 shadow-md hover:shadow-lg">
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar ao Cliente
              </button>
            </div>

            <div className="w-full md:w-2/3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pb-10">
              {posts.filter(p => ['pending_approval', 'needs_revision', 'approved'].includes(p.status)).map(post => {
                const postPins = pins.filter(pin => pin.post_id === post.id);
                return (
                  <div key={post.id} className="glass-panel bg-white/70 p-6 rounded-[2rem] flex flex-col md:flex-row gap-6 border border-white shadow-sm relative group">
                    <button onClick={() => handleDeletePost(post.id)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-2 rounded-full shadow-md z-10"><Trash2 size={14}/></button>
                    
                    <div className="w-32 h-40 rounded-2xl overflow-hidden shrink-0 border border-[var(--color-atelier-grafite)]/5 shadow-inner relative">
                      <img src={post.image_url} alt="Post" className="w-full h-full object-cover" />
                      <div className={`absolute top-2 left-2 backdrop-blur-md px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest border
                        ${post.status === 'approved' ? 'bg-green-500/80 border-green-400 text-white' : post.status === 'needs_revision' ? 'bg-orange-500/80 border-orange-400 text-white' : 'bg-black/60 border-white/20 text-white'}
                      `}>
                        {post.status === 'approved' ? 'Aprovado' : post.status === 'needs_revision' ? 'Ajustes' : 'Pendente'}
                      </div>
                    </div>
                    
                    <div className="flex flex-col flex-1">
                      <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/80 line-clamp-3 mb-4 bg-white/50 p-4 rounded-xl border border-white shadow-sm italic">{post.caption || "Sem legenda."}</p>
                      
                      {postPins.length > 0 && (
                        <div className="bg-[var(--color-atelier-creme)]/80 p-4 rounded-xl border border-[var(--color-atelier-terracota)]/20 mt-auto">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-1.5 mb-3"><MapPin size={12}/> Pinos do Cliente (Ajustes)</span>
                          <ul className="flex flex-col gap-2">
                            {postPins.map((pin, i) => (
                              <li key={pin.id} className="text-[11px] text-[var(--color-atelier-grafite)] flex gap-2 items-start bg-white p-2 rounded-lg shadow-sm">
                                <span className="font-black text-[var(--color-atelier-terracota)] mt-0.5">{i + 1}.</span> {pin.comment}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {posts.filter(p => ['pending_approval', 'needs_revision', 'approved'].includes(p.status)).length === 0 && (
                <div className="glass-panel bg-white/40 border border-white p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center h-full min-h-[300px] shadow-sm">
                  <CheckCircle2 size={48} className="text-[var(--color-atelier-terracota)]/30 mb-4" />
                  <p className="font-elegant text-3xl text-[var(--color-atelier-grafite)]/50">Mesa Limpa</p>
                  <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/40 mt-2">Nenhum post ativo na curadoria no momento.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ABA 2: GESTOR DO COFRE */}
        {activeTab === 'missoes' && (
          <motion.div key="missoes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-8 pb-10">
            <div className="glass-panel bg-white/80 p-8 rounded-[2.5rem] border border-white shadow-[0_15px_40px_rgba(173,111,64,0.05)] flex flex-col md:flex-row gap-6 items-center">
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
                <div key={mission.id} className="glass-panel bg-white/70 p-6 md:p-8 rounded-[2.5rem] flex flex-col border border-white shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] pr-4">{mission.title}</h4>
                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest shrink-0 border
                      ${mission.status === 'pending' ? 'bg-orange-50 border-orange-200 text-orange-600' : mission.status === 'uploaded' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-green-50 border-green-200 text-green-600'}
                    `}>
                      {mission.status === 'pending' ? 'Aguardando' : mission.status === 'uploaded' ? 'Requer Lapidação' : 'Finalizado'}
                    </span>
                  </div>
                  
                  {mission.status === 'uploaded' && (
                    <div className="mt-auto bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-blue-200 shadow-sm">
                          <img src={mission.raw_image_url} alt="Cru" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-800">Cru Recebido</span>
                      </div>
                      <label className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-blue-700 transition-all shadow-md flex items-center gap-2">
                        <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleUploadProcessedAsset(e, mission.id)} disabled={isProcessing} />
                        {isProcessing ? <Loader2 size={14} className="animate-spin"/> : <UploadCloud size={14} />} Enviar Arte
                      </label>
                    </div>
                  )}
                  
                  {mission.status === 'processed' && (
                    <div className="mt-auto bg-green-50/50 p-5 rounded-2xl border border-green-100 flex items-center justify-between">
                      <div className="flex gap-2">
                         <div className="w-12 h-12 rounded-xl overflow-hidden border border-green-200 opacity-60"><img src={mission.raw_image_url} alt="Cru" className="w-full h-full object-cover" /></div>
                         <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[var(--color-atelier-terracota)] shadow-md"><img src={mission.processed_image_url} alt="Lapidado" className="w-full h-full object-cover" /></div>
                      </div>
                      <CheckCircle2 size={24} className="text-green-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* =======================================
            ABA 3: ORÁCULO
            ======================================= */}
        {activeTab === 'oraculo' && (
          <motion.div key="oraculo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10">
             {posts.filter(p => p.status === 'approved' || p.status === 'published').map(post => (
               <div key={post.id} className="glass-panel bg-white/80 p-6 rounded-[2.5rem] border border-white flex flex-col gap-5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] group">
                 <div className="w-full aspect-square rounded-2xl overflow-hidden border border-[var(--color-atelier-grafite)]/5 shadow-inner relative">
                   <img src={post.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Post" />
                   <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-[var(--color-atelier-grafite)] shadow-sm">
                     Métricas Atuais
                   </div>
                 </div>
                 
                 <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/5 px-4 py-2.5 rounded-xl">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 flex items-center gap-1.5"><Activity size={14} className="text-orange-400"/> Engaj. (%)</label>
                      <input type="number" defaultValue={post.engagement_rate} onBlur={(e) => handleUpdateMetrics(post.id, parseFloat(e.target.value), post.link_clicks, post.saves)} className="w-16 bg-white border border-[var(--color-atelier-grafite)]/10 focus:border-orange-400 rounded-lg px-2 py-1.5 text-xs outline-none text-center font-black text-orange-500 shadow-sm transition-colors" />
                    </div>
                    <div className="flex justify-between items-center bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/5 px-4 py-2.5 rounded-xl">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 flex items-center gap-1.5"><MousePointerClick size={14} className="text-[var(--color-atelier-terracota)]"/> Cliques</label>
                      <input type="number" defaultValue={post.link_clicks} onBlur={(e) => handleUpdateMetrics(post.id, post.engagement_rate, parseInt(e.target.value), post.saves)} className="w-16 bg-white border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-terracota)] rounded-lg px-2 py-1.5 text-xs outline-none text-center font-black text-[var(--color-atelier-terracota)] shadow-sm transition-colors" />
                    </div>
                    <div className="flex justify-between items-center bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/5 px-4 py-2.5 rounded-xl">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 flex items-center gap-1.5"><Flame size={14} className="text-[var(--color-atelier-grafite)]/50"/> Salvos</label>
                      <input type="number" defaultValue={post.saves} onBlur={(e) => handleUpdateMetrics(post.id, post.engagement_rate, post.link_clicks, parseInt(e.target.value))} className="w-16 bg-white border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-grafite)] rounded-lg px-2 py-1.5 text-xs outline-none text-center font-black text-[var(--color-atelier-grafite)] shadow-sm transition-colors" />
                    </div>
                 </div>
               </div>
             ))}
          </motion.div>
        )}

        {/* =======================================
            ABA 4: BRIEFING (CMO)
            ======================================= */}
        // Dentro do componente InstagramWorkspace, na parte da renderização da Aba 4:

{activeTab === 'briefing' && (
  <motion.div key="briefing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-6">
    
    {!briefing ? (
      <div className="glass-panel bg-white/80 p-12 rounded-[2.5rem] border border-orange-200 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-6 text-orange-500 border border-orange-100 animate-pulse">
          <Target size={40} />
        </div>
        <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">Missão Nativa Pendente</h2>
        <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60 max-w-md">
          O cliente ainda não preencheu o **Dossiê de Mercado**. Esta é a tarefa inicial e obrigatória para desbloquear o oráculo e a estratégia de conteúdo.
        </p>
      </div>
    ) : (
      <div className="flex flex-col md:flex-row gap-6">
        {/* Lado Esquerdo: Respostas do Cliente */}
        <div className="flex-1 glass-panel bg-white/80 p-8 rounded-[2.5rem] border border-white shadow-sm overflow-y-auto max-h-[70vh] custom-scrollbar">
          <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-6 border-b border-[var(--color-atelier-grafite)]/5 pb-4">Respostas do Dossiê</h3>
          
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
            className="w-full bg-[var(--color-atelier-grafite)] text-white p-6 rounded-[2rem] font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-[var(--color-atelier-terracota)] transition-all shadow-md disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : <BrainCircuit size={20} />}
            Gerar Estratégia IA (CMO)
          </button>

          {/* Card de Visualização da IA */}
          <div className="glass-panel bg-[var(--color-atelier-creme)]/50 p-6 rounded-[2rem] border border-[var(--color-atelier-terracota)]/20 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mb-4 block">Insight do Estrategista</span>
            <div className="text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed whitespace-pre-wrap">
              {currentProject.instagram_ai_insight || "Aguardando geração da estratégia..."}
            </div>
          </div>

          <button 
            onClick={async () => {
              const { pdf } = await import('@react-pdf/renderer');
              const InstagramPDF = (await import('../../../components/pdf/InstagramBriefingPDF')).default;
              const doc = <InstagramPDF data={briefing.answers} clientName={currentProject.profiles.nome} aiInsight={currentProject.instagram_ai_insight} />;
              const blob = await pdf(doc).toBlob();
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url; link.download = `Dossie_Instagram_${currentProject.profiles.nome}.pdf`;
              link.click();
            }}
            className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] p-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:border-[var(--color-atelier-terracota)] transition-all shadow-sm"
          >
            <Download size={16} /> Exportar Dossiê PDF
          </button>
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
// COMPONENTE PRINCIPAL (O HOST DA ROTA)
// ============================================================================
function GerenciamentoInstagram() {
  const [isLoading, setIsLoading] = useState(true);
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);

  useEffect(() => {
    const fetchInstagramProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*, profiles(nome, avatar_url, empresa)')
          .eq('type', 'Gestão de Instagram') // Filtra APENAS Social Media
          .in('status', ['active', 'delivered', 'archived'])
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data && data.length > 0) {
          setDbProjects(data);
          setActiveProjectId(data[0].id);
        }
      } catch (error) {
        console.error("Erro ao buscar projetos de Instagram:", error);
        showToast("Erro ao carregar os clientes.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInstagramProjects();
  }, []);

  const currentProject = dbProjects.find(p => p.id === activeProjectId);

  if (isLoading) {
    return <div className="flex h-[calc(100vh-80px)] items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-4 opacity-50">
        <Smartphone size={48} className="text-[var(--color-atelier-grafite)]" />
        <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Nenhum Cliente Ativo.</h2>
        <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/70">A sua carteira de Gestão de Instagram aparecerá aqui.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          CABEÇALHO ISOLADO DO INSTAGRAM OS
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
                {currentProject.status === 'archived' ? 'Arquivado' : currentProject.status === 'delivered' ? 'Entregue' : 'Ativo'}
              </span>
              <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] flex items-center gap-1">
                <Smartphone size={12}/> Gestão de Instagram
              </span>
            </div>
            
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsClientMenuOpen(!isClientMenuOpen)}>
              <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none flex items-center gap-2 group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate max-w-[300px] md:max-w-md">
                {currentProject.profiles?.nome || "Cliente"} 
                <ChevronDown size={20} className={`text-[var(--color-atelier-grafite)]/40 transition-transform duration-300 shrink-0 ${isClientMenuOpen ? 'rotate-180' : ''}`} />
              </h1>
            </div>
            
            <AnimatePresence>
              {isClientMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.2 }}
                  className="absolute top-[110%] left-0 w-[300px] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(122,116,112,0.15)] rounded-2xl overflow-hidden z-50 flex flex-col py-2"
                >
                  <div className="px-4 py-2 border-b border-[var(--color-atelier-grafite)]/5 text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Clientes de Instagram</div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {dbProjects.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => { 
                          setActiveProjectId(p.id); 
                          setIsClientMenuOpen(false); 
                          showToast(`A aceder à conta de ${p.profiles?.nome}...`); 
                        }}
                        className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${p.id === activeProjectId ? 'bg-[var(--color-atelier-terracota)]/5' : 'hover:bg-white'}`}
                      >
                        <div className="w-8 h-8 rounded-full border border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] flex items-center justify-center overflow-hidden text-xs font-bold shrink-0">
                          {p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : p.profiles?.nome?.charAt(0)}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className={`font-roboto text-[13px] truncate ${p.id === activeProjectId ? 'font-bold text-[var(--color-atelier-terracota)]' : 'font-medium text-[var(--color-atelier-grafite)]'}`}>{p.profiles?.nome}</span>
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

      {/* ==========================================
          INJEÇÃO DO WORKSPACE MODULAR
          ========================================== */}
      <InstagramWorkspace activeProjectId={activeProjectId as string} currentProject={currentProject} />
      
    </div>
  );
}

export default function GerenciamentoPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-roboto text-[10px] uppercase tracking-widest opacity-50">A Carregar Instagram OS...</div>}>
      <GerenciamentoInstagram />
    </Suspense>
  );
}

// ============================================================================
// UTILITÁRIO DE RENDERIZAÇÃO: INFOBLOCK (PADRÃO ATELIER)
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