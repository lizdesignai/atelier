// src/app/admin/gerenciamento/views/MissionsView.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, Plus, CheckCircle2, Clock, Download, 
  Trash2, FolderUp, FileText, Loader2, Send, Target, 
  Link as LinkIcon, PenTool, Sparkles, ExternalLink, X
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { NotificationEngine } from "@/lib/NotificationEngine";

interface MissionsViewProps {
  activeProjectId: string;
  currentProject: any;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'approved';
  file_url: string | null;
  created_at: string;
}

interface Asset {
  id: string;
  file_name: string;
  file_url: string;
  file_size: string;
  created_at: string;
}

// 🟢 Nova interface para os Links Rápidos
interface QuickLink {
  id: string;
  title: string;
  url: string;
  type: string;
  created_at: string;
}

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function MissionsView({ activeProjectId, currentProject }: MissionsViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]); // 🟢 Estado dos links

  // Estados do Formulário de Nova Missão
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMissionTitle, setNewMissionTitle] = useState("");
  const [newMissionDesc, setNewMissionDesc] = useState("");

  // 🟢 Estados do Formulário de Novo Link
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);
  const [linkForm, setLinkForm] = useState({ title: "", url: "", type: "design" });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 🟢 Busca Solicitações, Assets e Links Rápidos em paralelo
      const [ { data: missionsData }, { data: assetsData }, { data: linksData } ] = await Promise.all([
        supabase.from('asset_missions').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false }),
        supabase.from('project_assets').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false }),
        supabase.from('project_quick_links').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false })
      ]);

      setMissions(missionsData || []);
      setAssets(assetsData || []);
      setQuickLinks(linksData || []);
    } catch (error) {
      showToast("Erro ao carregar os dados desta área.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeProjectId) fetchData();
  }, [activeProjectId]);

  // ============================================================================
  // GESTÃO DE LINKS RÁPIDOS DA EQUIPE (NOVO MÓDULO)
  // ============================================================================
  const handleCreateQuickLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkForm.title.trim() || !linkForm.url.trim()) return;

    setIsSubmittingLink(true);
    try {
      const { data, error } = await supabase.from('project_quick_links').insert({
        project_id: activeProjectId,
        title: linkForm.title,
        url: linkForm.url,
        type: linkForm.type
      }).select();

      if (error) throw error;
      if (data) setQuickLinks([data[0], ...quickLinks]);

      setLinkForm({ title: "", url: "", type: "design" });
      setIsAddingLink(false);
      showToast("Link rápido adicionado à base do projeto!");
    } catch (error) {
      showToast("Erro ao adicionar o link.");
    } finally {
      setIsSubmittingLink(false);
    }
  };

  const handleDeleteQuickLink = async (linkId: string) => {
    if (!window.confirm("Deseja apagar este atalho da equipe?")) return;
    try {
      await supabase.from('project_quick_links').delete().eq('id', linkId);
      setQuickLinks(quickLinks.filter(l => l.id !== linkId));
      showToast("Atalho removido com sucesso.");
    } catch (error) {
      showToast("Erro ao apagar atalho.");
    }
  };

  const getLinkIconAndColor = (type: string) => {
    switch(type) {
      case 'drive_idv': return { icon: <FolderUp size={16} />, colorClass: 'bg-blue-100 text-blue-600 border-blue-200' };
      case 'drive_fotos': return { icon: <Camera size={16} />, colorClass: 'bg-purple-100 text-purple-600 border-purple-200' };
      case 'design': return { icon: <PenTool size={16} />, colorClass: 'bg-pink-100 text-pink-600 border-pink-200' };
      case 'direcionamento': return { icon: <Target size={16} />, colorClass: 'bg-green-100 text-green-600 border-green-200' };
      case 'referencia': return { icon: <Sparkles size={16} />, colorClass: 'bg-orange-100 text-orange-600 border-orange-200' };
      default: return { icon: <LinkIcon size={16} />, colorClass: 'bg-gray-100 text-gray-600 border-gray-200' };
    }
  };


  // ============================================================================
  // ORQUESTRAÇÃO DE SOLICITAÇÕES
  // ============================================================================
  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMissionTitle.trim()) return;

    setIsSubmitting(true);
    showToast("Enviando nova solicitação para o cliente...");

    try {
      const { data, error } = await supabase.from('asset_missions').insert({
        project_id: activeProjectId,
        client_id: currentProject.client_id,
        title: newMissionTitle,
        description: newMissionDesc,
        status: 'pending'
      }).select();

      if (error) throw error;

      if (data) setMissions([data[0], ...missions]);

      // 🔔 NOTIFICAÇÃO: Sino do Cliente
      await NotificationEngine.notifyUser(
        currentProject.client_id,
        "🎯 Nova Solicitação de Material",
        `A equipe solicitou um novo material: "${newMissionTitle}". Acesse o Meu Espaço para enviar.`,
        "action",
        "/meu-espaco"
      );

      // Notificação por E-mail (Preservado)
      if (currentProject.profiles?.email) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: currentProject.profiles.email,
            type: 'vault_new_asset', 
            clientName: currentProject.profiles.nome.split(' ')[0],
            link: "https://seu-dominio.com/meu-espaco" 
          })
        });
      }

      setNewMissionTitle("");
      setNewMissionDesc("");
      showToast("Solicitação enviada com sucesso!");

    } catch (error) {
      showToast("Erro ao criar solicitação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveMission = async (missionId: string) => {
    try {
      const { error } = await supabase.from('asset_missions').update({ status: 'approved' }).eq('id', missionId);
      if (error) throw error;

      setMissions(missions.map(m => m.id === missionId ? { ...m, status: 'approved' } : m));
      showToast("Material aprovado e validado para produção.");

      // 🔔 NOTIFICAÇÃO: Agradecimento ao Cliente
      await NotificationEngine.notifyUser(
        currentProject.client_id,
        "✅ Material Aprovado",
        "A nossa equipe validou o material que enviou. Obrigado pela rapidez!",
        "success",
        "/meu-espaco"
      );

    } catch (error) {
      showToast("Erro ao aprovar material.");
    }
  };

  const handleDeleteMission = async (missionId: string) => {
    if (!window.confirm("Deseja cancelar e apagar esta solicitação definitivamente?")) return;
    try {
      const { error } = await supabase.from('asset_missions').delete().eq('id', missionId);
      if (error) throw error;
      setMissions(missions.filter(m => m.id !== missionId));
      showToast("Solicitação apagada com sucesso.");
    } catch (error) {
      showToast("Erro ao apagar solicitação.");
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!window.confirm("Tem certeza que deseja apagar este arquivo do sistema?")) return;
    try {
      const { error } = await supabase.from('project_assets').delete().eq('id', assetId);
      if (error) throw error;
      setAssets(assets.filter(a => a.id !== assetId));
      showToast("Arquivo removido do sistema.");
    } catch (error) {
      showToast("Erro ao apagar arquivo.");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full min-h-[400px]"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full overflow-hidden pb-4">
      
      {/* =========================================================
          COLUNA ESQUERDA: ORQUESTRAÇÃO DE SOLICITAÇÕES
          ========================================================= */}
      <div className="w-full xl:w-[55%] flex flex-col h-full overflow-hidden">
        <div className="glass-panel bg-white/60 p-8 rounded-[2.5rem] border border-white shadow-sm flex flex-col h-full relative overflow-hidden transition-colors hover:bg-white/80">
          
          <div className="flex flex-wrap justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-6 mb-6 shrink-0 gap-4">
            <div>
              <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
                <Target size={24} className="text-[var(--color-atelier-terracota)]"/> Solicitações de Material
              </h2>
              <p className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1.5 font-bold">
                Solicite materiais específicos ao cliente.
              </p>
            </div>
          </div>

          {/* Formulário Criador de Solicitações */}
          <form onSubmit={handleCreateMission} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm shrink-0 mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">O que o cliente deve fazer ou enviar?</label>
              <input 
                type="text" 
                required 
                value={newMissionTitle} 
                onChange={(e) => setNewMissionTitle(e.target.value)}
                placeholder="Ex: Gravar um vídeo de 15s mostrando a fachada..." 
                className="w-full bg-gray-50 border border-transparent focus:border-[var(--color-atelier-terracota)]/40 focus:bg-white rounded-xl py-3 px-4 text-[13px] font-bold text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Instruções Opcionais</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  value={newMissionDesc} 
                  onChange={(e) => setNewMissionDesc(e.target.value)}
                  placeholder="Ex: Tente gravar com a luz do sol de frente para o seu rosto..." 
                  className="w-full bg-gray-50 border border-transparent focus:border-[var(--color-atelier-terracota)]/40 focus:bg-white rounded-xl py-3 px-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" 
                />
                <button 
                  type="submit" 
                  disabled={isSubmitting || !newMissionTitle.trim()}
                  className="bg-[var(--color-atelier-grafite)] text-white px-6 py-3 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-all shadow-md shrink-0 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} Enviar Solicitação
                </button>
              </div>
            </div>
          </form>

          {/* Lista de Solicitações */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
            {missions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-40 py-10 text-center">
                <Target size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
                <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Nenhuma Solicitação Ativa</p>
                <p className="font-roboto text-[12px] mt-2 font-medium max-w-xs">Use o formulário acima para solicitar fotos, vídeos ou documentos ao cliente.</p>
              </div>
            ) : (
              <AnimatePresence>
                {missions.map(mission => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={mission.id} className="bg-white/80 p-6 rounded-[1.5rem] border border-[var(--color-atelier-grafite)]/5 shadow-sm transition-all hover:shadow-md flex flex-col gap-4 group">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-roboto text-[14px] font-bold text-[var(--color-atelier-grafite)] leading-tight mb-1">{mission.title}</h4>
                        {mission.description && <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60 font-medium leading-relaxed">{mission.description}</p>}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {mission.status === 'pending' && <span className="bg-orange-100 text-orange-600 px-2.5 py-1 rounded-md font-roboto text-[9px] uppercase tracking-widest font-bold flex items-center gap-1"><Clock size={10}/> Pendente</span>}
                        {mission.status === 'completed' && <span className="bg-blue-100 text-blue-600 px-2.5 py-1 rounded-md font-roboto text-[9px] uppercase tracking-widest font-bold flex items-center gap-1"><CheckCircle2 size={10}/> Recebido</span>}
                        {mission.status === 'approved' && <span className="bg-green-100 text-green-600 px-2.5 py-1 rounded-md font-roboto text-[9px] uppercase tracking-widest font-bold flex items-center gap-1"><CheckCircle2 size={10}/> Aprovado</span>}
                        
                        <button onClick={() => handleDeleteMission(mission.id)} className="w-6 h-6 flex items-center justify-center text-[var(--color-atelier-grafite)]/20 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </div>

                    {mission.status !== 'pending' && mission.file_url && (
                      <div className="flex items-center gap-3 pt-4 border-t border-[var(--color-atelier-grafite)]/5">
                        <button onClick={() => window.open(mission.file_url!, '_blank')} className="flex-1 bg-gray-50 border border-gray-100 text-[var(--color-atelier-grafite)] py-3 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)] hover:bg-white transition-all shadow-sm flex items-center justify-center gap-2">
                          <Download size={14}/> Ver Material
                        </button>
                        {mission.status === 'completed' && (
                          <button onClick={() => handleApproveMission(mission.id)} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest hover:bg-green-600 transition-all shadow-sm flex items-center justify-center gap-2">
                            <CheckCircle2 size={14}/> Aprovar Material
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================
          COLUNA DIREITA: INVENTÁRIO GERAL & LINKS RÁPIDOS DA EQUIPE
          ========================================================= */}
      <div className="w-full xl:w-[45%] flex flex-col h-full overflow-hidden">
        <div className="flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-6">
          
          {/* 🟢 NOVO MÓDULO: COFRE DE RECURSOS (LINKS RÁPIDOS) */}
          <div className="flex flex-col bg-white/60 p-6 md:p-8 rounded-[2.5rem] border border-white shadow-sm shrink-0 transition-colors hover:bg-white/80">
            <div className="flex justify-between items-start mb-6 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
               <div>
                 <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                   <LinkIcon size={20} className="text-[var(--color-atelier-terracota)]"/> Cofre de Recursos
                 </h2>
                 <p className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 mt-1.5 uppercase tracking-widest font-bold">
                   Links rápidos essenciais para a equipe de design.
                 </p>
               </div>
               <button 
                 onClick={() => setIsAddingLink(!isAddingLink)} 
                 className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isAddingLink ? 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-500' : 'bg-[var(--color-atelier-terracota)] text-white shadow-sm hover:scale-110'}`}
               >
                 {isAddingLink ? <X size={14}/> : <Plus size={16}/>}
               </button>
            </div>

            <AnimatePresence>
              {isAddingLink && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateQuickLink} className="flex flex-col gap-3 mb-6 bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 pl-1">Nome do Link</label>
                      <input type="text" placeholder="Ex: Drive - Identidade Visual" value={linkForm.title} onChange={e => setLinkForm({...linkForm, title: e.target.value})} required className="w-full bg-gray-50 border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-2.5 px-3 text-[12px] font-bold outline-none" />
                    </div>
                    <div className="w-full sm:w-[140px] flex flex-col gap-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 pl-1">Categoria</label>
                      <select value={linkForm.type} onChange={e => setLinkForm({...linkForm, type: e.target.value})} className="w-full bg-gray-50 border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-2.5 px-3 text-[12px] font-bold outline-none cursor-pointer">
                        <option value="design">Figma/Design</option>
                        <option value="drive_idv">Drive (IDV)</option>
                        <option value="drive_fotos">Drive (Fotos)</option>
                        <option value="direcionamento">Direcionamento</option>
                        <option value="referencia">Referências</option>
                        <option value="other">Outro Link</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 pl-1">URL (Link Completo)</label>
                    <input type="url" placeholder="https://..." value={linkForm.url} onChange={e => setLinkForm({...linkForm, url: e.target.value})} required className="w-full bg-gray-50 border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-2.5 px-3 text-[12px] font-medium outline-none" />
                  </div>
                  <button type="submit" disabled={isSubmittingLink || !linkForm.title || !linkForm.url} className="mt-2 w-full bg-[var(--color-atelier-grafite)] text-white py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--color-atelier-terracota)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSubmittingLink ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>} Salvar Link
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickLinks.length === 0 ? (
                <div className="col-span-1 sm:col-span-2 text-center py-6 text-[10px] uppercase font-bold text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-white/40">
                  Nenhum link adicionado.
                </div>
              ) : (
                quickLinks.map(link => {
                  const { icon, colorClass } = getLinkIconAndColor(link.type);
                  return (
                    <div key={link.id} className="bg-white border border-gray-100 p-3.5 rounded-[1.2rem] flex items-center justify-between shadow-sm hover:shadow-md hover:border-[var(--color-atelier-terracota)]/30 transition-all group">
                      <div className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer pr-2" onClick={() => window.open(link.url, '_blank')}>
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${colorClass}`}>
                          {icon}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-[12px] font-bold text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate">{link.title}</span>
                          <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400 mt-0.5 flex items-center gap-1">Acessar <ExternalLink size={8}/></span>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteQuickLink(link.id); }} className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0">
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* ARQUIVOS DO CLIENTE (Envios Livres) */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/60 p-6 md:p-8 rounded-[2.5rem] border border-white shadow-sm shrink-0 gap-4 transition-colors hover:bg-white/80">
             <div>
               <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
                 <FolderUp size={24} className="text-[var(--color-atelier-terracota)]"/> Arquivos do Cliente
               </h2>
               <p className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 mt-1.5 uppercase tracking-widest font-bold">
                 Arquivos enviados espontaneamente pelo cliente.
               </p>
             </div>
          </div>

          {assets.length === 0 ? (
             <div className="glass-panel bg-white/40 border border-white p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center h-[200px] shadow-sm shrink-0 opacity-60">
               <Camera size={32} className="text-[var(--color-atelier-grafite)]/40 mb-4" />
               <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Nenhum Arquivo</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <AnimatePresence>
                {assets.map(asset => (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={asset.id} className="bg-white/80 border border-white p-4 rounded-[1.5rem] flex items-center justify-between shadow-sm hover:shadow-md transition-all group shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden w-full">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0 shadow-inner"><FileText size={16} /></div>
                      <div className="flex flex-col overflow-hidden">
                        <a href={asset.file_url} target="_blank" rel="noreferrer" className="block font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] transition-colors truncate leading-tight pr-2">{asset.file_name}</a>
                        <span className="font-roboto text-[9px] text-[var(--color-atelier-grafite)]/40 font-bold uppercase tracking-widest mt-1">{asset.file_size} • {new Date(asset.created_at).toLocaleDateString('pt-PT')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-2">
                      <button onClick={() => window.open(asset.file_url, '_blank')} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] hover:bg-white transition-colors border border-transparent hover:border-[var(--color-atelier-terracota)]/20 shadow-sm"><Download size={14}/></button>
                      <button onClick={() => handleDeleteAsset(asset.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-[var(--color-atelier-grafite)]/30 hover:text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100 shadow-sm"><Trash2 size={14}/></button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}