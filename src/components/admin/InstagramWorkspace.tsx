// src/components/admin/InstagramWorkspace.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { 
  Camera, CheckCircle2, Clock, Send, UploadCloud, 
  BrainCircuit, LayoutDashboard, Target, MessageSquare, 
  MapPin, Flame, MousePointerClick, Save, Loader2, Activity
} from "lucide-react";

interface InstagramWorkspaceProps {
  activeProjectId: string;
  currentProject: any;
}

export default function InstagramWorkspace({ activeProjectId, currentProject }: InstagramWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'missoes' | 'oraculo' | 'briefing'>('posts');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados de Dados
  const [posts, setPosts] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [pins, setPins] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<any>(null);

  // Formulários
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

      // 3. Buscar Pinos (Feedback) dos posts pendentes/em revisão
      const postIds = postsData?.map(p => p.id) || [];
      if (postIds.length > 0) {
        const { data: pinsData } = await supabase.from('content_feedback_pins').select('*').in('post_id', postIds);
        if (pinsData) setPins(pinsData);
      }

      // 4. Buscar Briefing
      const { data: briefData } = await supabase.from('instagram_briefings').select('*').eq('project_id', activeProjectId).maybeSingle();
      if (briefData) setBriefing(briefData);

    } catch (error) {
      console.error("Erro ao carregar dados do Instagram:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // MOTOR 1: CRIAR NOVO POST (Curadoria)
  // ==========================================
  const handleCreatePost = async () => {
    if (!newPostImage || !activeProjectId || !currentProject?.client_id) return;
    setIsProcessing(true);

    try {
      const fileExt = newPostImage.name.split('.').pop();
      const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${currentProject.client_id}/${fileName}`;

      // Upload Imagem
      const { error: uploadError } = await supabase.storage.from('moodboard').upload(filePath, newPostImage);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('moodboard').getPublicUrl(filePath);

      // Inserir no Banco
      const { error: dbError } = await supabase.from('social_posts').insert({
        project_id: activeProjectId,
        client_id: currentProject.client_id,
        image_url: publicUrlData.publicUrl,
        caption: newPostCaption,
        publish_date: newPostDate ? new Date(newPostDate).toISOString() : null,
        status: 'pending_approval'
      });

      if (dbError) throw dbError;

      window.dispatchEvent(new CustomEvent("showToast", { detail: "Post enviado para aprovação do cliente!" }));
      setNewPostImage(null);
      setNewPostCaption("");
      setNewPostDate("");
      fetchInstagramData();
    } catch (error) {
      console.error(error);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao criar post." }));
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // MOTOR 2: CRIAR MISSÃO (Cofre)
  // ==========================================
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

      window.dispatchEvent(new CustomEvent("showToast", { detail: "Missão despachada para o cofre do cliente!" }));
      setNewMissionTitle("");
      setNewMissionDesc("");
      fetchInstagramData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // MOTOR 3: LAPIDAR ATIVO (Cofre)
  // ==========================================
  const handleUploadProcessedAsset = async (e: React.ChangeEvent<HTMLInputElement>, missionId: string) => {
    const file = e.target.files?.[0];
    if (!file || !currentProject?.client_id) return;
    setIsProcessing(true);

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

      window.dispatchEvent(new CustomEvent("showToast", { detail: "Ativo lapidado com sucesso!" }));
      fetchInstagramData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ==========================================
  // MOTOR 4: ATUALIZAR ORÁCULO (Métricas)
  // ==========================================
  const handleUpdateMetrics = async (postId: string, engagement: number, clicks: number, saves: number) => {
    try {
      const { error } = await supabase.from('social_posts').update({
        engagement_rate: engagement,
        link_clicks: clicks,
        saves: saves
      }).eq('id', postId);

      if (error) throw error;
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Sensores do Oráculo atualizados!" }));
      fetchInstagramData();
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;

  return (
    <div className="flex flex-col gap-6 w-full animate-[fadeInUp_0.5s_ease-out]">
      
      {/* NAVEGAÇÃO DE ABAS INTERNAS */}
      <div className="glass-panel bg-white/70 p-2 rounded-2xl flex gap-2 overflow-x-auto custom-scrollbar">
        {[
          { id: 'posts', label: 'Motor de Curadoria', icon: <LayoutDashboard size={16} /> },
          { id: 'missoes', label: 'Gestor do Cofre', icon: <Camera size={16} /> },
          { id: 'oraculo', label: 'Calibrador do Oráculo', icon: <BrainCircuit size={16} /> },
          { id: 'briefing', label: 'Estratégia & IA', icon: <Target size={16} /> },
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
        
        {/* ABA 1: MOTOR DE CURADORIA (POSTS) */}
        {activeTab === 'posts' && (
          <motion.div key="posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col md:flex-row gap-6">
            
            {/* CRIAR NOVO POST */}
            <div className="w-full md:w-1/3 glass-panel bg-white/80 p-6 rounded-[2rem] flex flex-col gap-4 shadow-sm h-fit border border-white">
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-2">Novo Post</h3>
              
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

              <button onClick={handleCreatePost} disabled={isProcessing || !newPostImage} className="w-full bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar para Aprovação
              </button>
            </div>

            {/* LISTAGEM E FEEDBACKS */}
            <div className="w-full md:w-2/3 flex flex-col gap-4">
              {posts.filter(p => p.status === 'pending_approval' || p.status === 'needs_revision').map(post => {
                const postPins = pins.filter(pin => pin.post_id === post.id);
                return (
                  <div key={post.id} className="glass-panel bg-white/60 p-6 rounded-[2rem] flex flex-col md:flex-row gap-6 border border-[var(--color-atelier-grafite)]/5">
                    <div className="w-32 h-40 rounded-xl overflow-hidden shrink-0 border border-white shadow-sm relative">
                      <img src={post.image_url} alt="Post" className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest text-white">
                        {post.status === 'needs_revision' ? 'Revisão' : 'Pendente'}
                      </div>
                    </div>
                    
                    <div className="flex flex-col flex-1">
                      <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/70 line-clamp-3 mb-4">{post.caption || "Sem legenda."}</p>
                      
                      {postPins.length > 0 ? (
                        <div className="bg-[var(--color-atelier-creme)]/50 p-4 rounded-xl border border-[var(--color-atelier-terracota)]/10">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-1 mb-2"><MapPin size={12}/> Pinos do Cliente</span>
                          <ul className="flex flex-col gap-2">
                            {postPins.map((pin, i) => (
                              <li key={pin.id} className="text-[11px] text-[var(--color-atelier-grafite)] flex gap-2">
                                <span className="font-black text-[var(--color-atelier-terracota)]">{i + 1}.</span> {pin.comment}
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
              {posts.filter(p => p.status === 'pending_approval' || p.status === 'needs_revision').length === 0 && (
                <div className="glass-panel bg-white/40 border border-white/40 p-10 rounded-[2rem] flex flex-col items-center justify-center text-center h-full">
                  <CheckCircle2 size={40} className="text-[var(--color-atelier-grafite)]/20 mb-4" />
                  <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)]/50">Mesa Limpa</p>
                  <p className="font-roboto text-xs text-[var(--color-atelier-grafite)]/40 mt-2">Nenhum post pendente de aprovação ou ajuste.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ABA 2: GESTOR DO COFRE (MISSÕES) */}
        {activeTab === 'missoes' && (
          <motion.div key="missoes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-8">
            
            <div className="glass-panel bg-white/80 p-6 md:p-8 rounded-[2rem] border border-[var(--color-atelier-terracota)]/20 flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 w-full">
                <input type="text" placeholder="Título da Missão (Ex: Grave 3 vídeos da fachada)" value={newMissionTitle} onChange={(e) => setNewMissionTitle(e.target.value)} className="w-full bg-transparent font-elegant text-2xl text-[var(--color-atelier-grafite)] outline-none placeholder:text-[var(--color-atelier-grafite)]/30 mb-2 border-b border-[var(--color-atelier-grafite)]/10 pb-2" />
                <input type="text" placeholder="Instruções claras para o cliente..." value={newMissionDesc} onChange={(e) => setNewMissionDesc(e.target.value)} className="w-full bg-transparent font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 outline-none placeholder:text-[var(--color-atelier-grafite)]/30" />
              </div>
              <button onClick={handleCreateMission} disabled={isProcessing || !newMissionTitle} className="w-full md:w-auto px-8 py-4 bg-[var(--color-atelier-terracota)] hover:bg-[#8c562e] text-white rounded-xl text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shrink-0">
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Disparar Missão
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missions.map(mission => (
                <div key={mission.id} className="glass-panel bg-white/60 p-6 rounded-[2rem] flex flex-col border border-white shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">{mission.title}</h4>
                    <span className={`px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest ${mission.status === 'pending' ? 'bg-orange-100 text-orange-600' : mission.status === 'uploaded' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                      {mission.status === 'pending' ? 'Aguardando Cliente' : mission.status === 'uploaded' ? 'Requer Lapidação' : 'Finalizado'}
                    </span>
                  </div>
                  
                  {mission.status === 'uploaded' && (
                    <div className="mt-auto bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img src={mission.raw_image_url} alt="Cru" className="w-10 h-10 rounded border object-cover" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-800">Material Cru Recebido</span>
                      </div>
                      <label className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest cursor-pointer hover:bg-blue-700 transition-colors shrink-0 flex items-center gap-1">
                        <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleUploadProcessedAsset(e, mission.id)} disabled={isProcessing} />
                        <UploadCloud size={12} /> Enviar Lapidado
                      </label>
                    </div>
                  )}
                  
                  {mission.status === 'processed' && (
                    <div className="mt-auto flex gap-2">
                       <img src={mission.raw_image_url} alt="Cru" className="w-12 h-12 rounded-lg border object-cover opacity-50" />
                       <img src={mission.processed_image_url} alt="Lapidado" className="w-12 h-12 rounded-lg border border-[var(--color-atelier-terracota)] object-cover shadow-md" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ABA 3: CALIBRADOR DO ORÁCULO */}
        {activeTab === 'oraculo' && (
          <motion.div key="oraculo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {posts.filter(p => p.status === 'approved' || p.status === 'published').map(post => (
               <div key={post.id} className="glass-panel bg-white/80 p-5 rounded-[2rem] border border-[var(--color-atelier-grafite)]/5 flex flex-col gap-4 shadow-sm">
                 <div className="w-full h-32 rounded-xl overflow-hidden border border-white">
                   <img src={post.image_url} className="w-full h-full object-cover" alt="Post" />
                 </div>
                 <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-[var(--color-atelier-creme)]/30 px-3 py-2 rounded-lg">
                      <label className="text-[10px] font-bold uppercase text-[var(--color-atelier-grafite)]/60 flex items-center gap-1"><Activity size={12}/> Engaj. (%)</label>
                      <input type="number" defaultValue={post.engagement_rate} onBlur={(e) => handleUpdateMetrics(post.id, parseFloat(e.target.value), post.link_clicks, post.saves)} className="w-16 bg-white border border-[var(--color-atelier-grafite)]/10 rounded px-2 py-1 text-xs outline-none text-right font-bold text-orange-500" />
                    </div>
                    <div className="flex justify-between items-center bg-[var(--color-atelier-creme)]/30 px-3 py-2 rounded-lg">
                      <label className="text-[10px] font-bold uppercase text-[var(--color-atelier-grafite)]/60 flex items-center gap-1"><MousePointerClick size={12}/> Cliques Link</label>
                      <input type="number" defaultValue={post.link_clicks} onBlur={(e) => handleUpdateMetrics(post.id, post.engagement_rate, parseInt(e.target.value), post.saves)} className="w-16 bg-white border border-[var(--color-atelier-grafite)]/10 rounded px-2 py-1 text-xs outline-none text-right font-bold text-[var(--color-atelier-terracota)]" />
                    </div>
                    <div className="flex justify-between items-center bg-[var(--color-atelier-creme)]/30 px-3 py-2 rounded-lg">
                      <label className="text-[10px] font-bold uppercase text-[var(--color-atelier-grafite)]/60 flex items-center gap-1"><Flame size={12}/> Salvos</label>
                      <input type="number" defaultValue={post.saves} onBlur={(e) => handleUpdateMetrics(post.id, post.engagement_rate, post.link_clicks, parseInt(e.target.value))} className="w-16 bg-white border border-[var(--color-atelier-grafite)]/10 rounded px-2 py-1 text-xs outline-none text-right font-bold text-[var(--color-atelier-grafite)]" />
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

        {/* ABA 4: BRIEFING DE INSTAGRAM (ESTRATÉGIA) */}
        {activeTab === 'briefing' && (
          <motion.div key="briefing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-panel bg-white/80 p-8 md:p-12 rounded-[2.5rem] border border-[var(--color-atelier-grafite)]/5 flex flex-col items-center justify-center text-center min-h-[400px]">
            <BrainCircuit size={48} className="text-[var(--color-atelier-grafite)]/20 mb-6" />
            <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">Inteligência Estratégica (CMO)</h2>
            <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60 max-w-md mb-8">
              A arquitetura para a geração da Inteligência Artificial focada em Estratégia de Conteúdo e Copywriting está pronta para ser ativada na próxima fase.
            </p>
            <button disabled className="px-6 py-3 bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/40 rounded-full font-roboto text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 cursor-not-allowed">
              <Loader2 size={14} /> Ativação Pendente
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}