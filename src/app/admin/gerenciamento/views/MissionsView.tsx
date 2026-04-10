// src/app/admin/gerenciamento/views/MissionsView.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, Plus, CheckCircle2, Clock, Download, 
  Trash2, FolderUp, FileText, Loader2, Send, Target, Search
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

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function MissionsView({ activeProjectId, currentProject }: MissionsViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Estados do Formulário de Nova Missão
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMissionTitle, setNewMissionTitle] = useState("");
  const [newMissionDesc, setNewMissionDesc] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Busca Missões (Pedidos Direcionados) e Assets (Envios Livres) em paralelo
      const [ { data: missionsData }, { data: assetsData } ] = await Promise.all([
        supabase.from('asset_missions').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false }),
        supabase.from('project_assets').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: false })
      ]);

      setMissions(missionsData || []);
      setAssets(assetsData || []);
    } catch (error) {
      showToast("Erro ao carregar o cofre do cliente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeProjectId) fetchData();
  }, [activeProjectId]);

  // ============================================================================
  // ORQUESTRAÇÃO DE MISSÕES
  // ============================================================================
  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMissionTitle.trim()) return;

    setIsSubmitting(true);
    showToast("A disparar nova missão para o cliente...");

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
        "🎯 Nova Missão de Ativos",
        `O estúdio solicitou um novo material: "${newMissionTitle}". Aceda ao seu Cofre para enviar.`,
        "action",
        "/cockpit"
      );

      // Notificação por E-mail (Opcional, mas recomendado para luxo)
      if (currentProject.profiles?.email) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: currentProject.profiles.email,
            type: 'vault_new_asset', // Pode reutilizar este template ou criar um 'new_mission'
            clientName: currentProject.profiles.nome.split(' ')[0],
            link: "https://seu-dominio.com/cockpit" // Mude para o seu domínio real
          })
        });
      }

      setNewMissionTitle("");
      setNewMissionDesc("");
      showToast("Missão enviada com sucesso!");

    } catch (error) {
      showToast("Erro ao criar missão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveMission = async (missionId: string) => {
    try {
      const { error } = await supabase.from('asset_missions').update({ status: 'approved' }).eq('id', missionId);
      if (error) throw error;

      setMissions(missions.map(m => m.id === missionId ? { ...m, status: 'approved' } : m));
      showToast("Material aprovado e validado para a linha de produção.");

      // 🔔 NOTIFICAÇÃO: Agradecimento ao Cliente
      await NotificationEngine.notifyUser(
        currentProject.client_id,
        "✅ Material Aprovado",
        "A nossa equipa validou o material que enviou. Obrigado pela rapidez!",
        "success",
        "/cockpit"
      );

    } catch (error) {
      showToast("Erro ao aprovar missão.");
    }
  };

  const handleDeleteMission = async (missionId: string) => {
    if (!window.confirm("Deseja cancelar e apagar esta missão definitivamente?")) return;
    try {
      const { error } = await supabase.from('asset_missions').delete().eq('id', missionId);
      if (error) throw error;
      setMissions(missions.filter(m => m.id !== missionId));
      showToast("Missão apagada com sucesso.");
    } catch (error) {
      showToast("Erro ao apagar missão.");
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!window.confirm("Tem certeza que deseja apagar este ficheiro do cofre?")) return;
    try {
      const { error } = await supabase.from('project_assets').delete().eq('id', assetId);
      if (error) throw error;
      setAssets(assets.filter(a => a.id !== assetId));
      showToast("Ficheiro removido do cofre.");
    } catch (error) {
      showToast("Erro ao apagar ficheiro.");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full min-h-[400px]"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full overflow-hidden pb-4">
      
      {/* =========================================================
          COLUNA ESQUERDA: ORQUESTRAÇÃO DE MISSÕES
          ========================================================= */}
      <div className="w-full xl:w-[55%] flex flex-col h-full overflow-hidden">
        <div className="glass-panel bg-white/60 p-8 rounded-[2.5rem] border border-white shadow-sm flex flex-col h-full relative overflow-hidden transition-colors hover:bg-white/80">
          
          <div className="flex flex-wrap justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-6 mb-6 shrink-0 gap-4">
            <div>
              <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
                <Target size={24} className="text-[var(--color-atelier-terracota)]"/> Missões de Captura
              </h2>
              <p className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1.5 font-bold">
                Solicite materiais específicos ao cliente.
              </p>
            </div>
          </div>

          {/* Formulário Criador de Missões */}
          <form onSubmit={handleCreateMission} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm shrink-0 mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">O que o cliente deve fazer?</label>
              <input 
                type="text" 
                required 
                value={newMissionTitle} 
                onChange={(e) => setNewMissionTitle(e.target.value)}
                placeholder="Ex: Gravar um vídeo de 15s a mostrar a fachada..." 
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
                  {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} Disparar
                </button>
              </div>
            </div>
          </form>

          {/* Lista de Missões */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
            {missions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-40 py-10 text-center">
                <Target size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
                <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Nenhuma Missão Ativa</p>
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
          COLUNA DIREITA: INVENTÁRIO GERAL (Cofre Livre)
          ========================================================= */}
      <div className="w-full xl:w-[45%] flex flex-col h-full overflow-hidden">
        <div className="flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-6">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/60 p-6 md:p-8 rounded-[2.5rem] border border-white shadow-sm shrink-0 gap-4 transition-colors hover:bg-white/80">
             <div>
               <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
                 <FolderUp size={24} className="text-[var(--color-atelier-terracota)]"/> Arquivo de Ativos
               </h2>
               <p className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 mt-1.5 uppercase tracking-widest font-bold">
                 Ficheiros enviados espontaneamente pelo cliente.
               </p>
             </div>
          </div>

          {assets.length === 0 ? (
             <div className="glass-panel bg-white/40 border border-white p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center h-[300px] shadow-sm shrink-0 opacity-60">
               <Camera size={48} className="text-[var(--color-atelier-grafite)]/40 mb-4" />
               <p className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Cofre Vazio</p>
               <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60 mt-2 font-medium max-w-xs">O cliente ainda não utilizou a área de Envio Livre.</p>
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