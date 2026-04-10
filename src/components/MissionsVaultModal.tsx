// src/components/MissionsVaultModal.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Camera, UploadCloud, CheckCircle2, 
  Loader2, FileText, Sparkles, FolderUp, Target 
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { NotificationEngine } from "../lib/NotificationEngine";

interface MissionsVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  clientId: string;
  clientName: string;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'approved';
  file_url: string | null;
}

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function MissionsVaultModal({ isOpen, onClose, projectId, clientId, clientName }: MissionsVaultModalProps) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null); // Guarda o ID da missão a fazer upload, ou 'general'
  const [activeTab, setActiveTab] = useState<'missions' | 'general'>('missions');

  // Carrega as missões sempre que o modal abre
  useEffect(() => {
    if (!isOpen || !projectId) return;

    const fetchMissions = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('asset_missions')
          .select('*')
          .eq('project_id', projectId)
          .order('status', { ascending: false }) // 'pending' aparece primeiro no alfabeto que 'completed'
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMissions(data || []);
      } catch (error) {
        console.error("Erro ao carregar missões:", error);
        showToast("Falha ao carregar as missões do cofre.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMissions();
  }, [isOpen, projectId]);

  // Função principal de Upload (Serve tanto para Missões Específicas como para o Cofre Geral)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, missionId?: string) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    const isGeneral = !missionId;
    setUploadingId(isGeneral ? 'general' : missionId);
    showToast(`A enviar ficheiro para o Cofre de Alta Segurança...`);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload para o Storage (Usando o bucket 'vault_assets' definido na arquitetura)
      const { error: uploadError } = await supabase.storage.from('vault_assets').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('vault_assets').getPublicUrl(fileName);

      if (isGeneral) {
        // Envio Livre (Guarda na tabela de assets gerais do projeto)
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const { error: dbError } = await supabase.from('project_assets').insert({
          project_id: projectId,
          file_name: file.name,
          file_url: publicUrl,
          file_size: `${fileSizeMB} MB`
        });
        if (dbError) throw dbError;

        await NotificationEngine.notifyManagement(
          "📦 Novo Material Recebido (Cofre Livre)",
          `O cliente ${clientName} fez upload de um novo ficheiro genérico (${file.name}) para o cofre.`,
          "info",
          "/admin/projetos"
        );
        showToast("Ficheiro guardado no cofre da agência!");

      } else {
        // Envio Direcionado (Cumpre uma Missão Específica)
        const { error: dbError } = await supabase.from('asset_missions').update({
          status: 'completed',
          file_url: publicUrl
        }).eq('id', missionId);
        
        if (dbError) throw dbError;

        // Atualiza a UI otimisticamente
        setMissions(missions.map(m => m.id === missionId ? { ...m, status: 'completed', file_url: publicUrl } : m));

        const missionTitle = missions.find(m => m.id === missionId)?.title;
        await NotificationEngine.notifyManagement(
          "✅ Missão de Ativos Cumprida!",
          `O cliente ${clientName} enviou o material solicitado para a missão: "${missionTitle}".`,
          "success",
          "/admin/projetos"
        );
        showToast("Missão cumprida com sucesso!");
      }

    } catch (error) {
      console.error("Erro no upload:", error);
      showToast("Erro ao processar o ficheiro. Tente novamente.");
    } finally {
      setUploadingId(null);
      e.target.value = ''; // Limpa o input
    }
  };

  const pendingMissionsCount = missions.filter(m => m.status === 'pending').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[var(--color-atelier-grafite)]/60 backdrop-blur-sm cursor-pointer"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[850px] max-h-[90vh] overflow-hidden bg-[var(--color-atelier-creme)] rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.3)] border border-white flex flex-col"
          >
            {/* ==========================================
                HEADER DO MODAL
                ========================================== */}
            <div className="p-6 md:p-8 border-b border-[var(--color-atelier-grafite)]/10 bg-white/60 backdrop-blur-xl shrink-0 z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
                  <Camera size={28} className="text-[var(--color-atelier-terracota)]" /> 
                  O Cofre de Materiais
                </h2>
                <p className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-2 flex items-center gap-2">
                  <FolderUp size={14}/> Partilha Segura de Ativos
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex bg-white/50 p-1 rounded-2xl border border-white shadow-sm">
                  <button 
                    onClick={() => setActiveTab('missions')}
                    className={`px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'missions' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white'}`}
                  >
                    Missões Ativas
                    {pendingMissionsCount > 0 && (
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${activeTab === 'missions' ? 'bg-[var(--color-atelier-terracota)] text-white' : 'bg-red-100 text-red-600'}`}>{pendingMissionsCount}</span>
                    )}
                  </button>
                  <button 
                    onClick={() => setActiveTab('general')}
                    className={`px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'general' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white'}`}
                  >
                    Envio Livre
                  </button>
                </div>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors shadow-sm border border-white/50">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ==========================================
                CORPO DO MODAL (CONTEÚDO ROLÁVEL)
                ========================================== */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-transparent to-white/40 relative">
              
              {isLoading ? (
                <div className="flex h-[400px] items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  
                  {/* ABA: MISSÕES (O que a agência precisa) */}
                  {activeTab === 'missions' && (
                    <motion.div key="missions" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 md:p-8 flex flex-col gap-6">
                      
                      <div className="bg-orange-50/80 border border-orange-100 p-6 rounded-[2rem] flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                          <Target size={20} />
                        </div>
                        <div>
                          <h3 className="font-roboto text-[12px] font-bold uppercase tracking-widest text-orange-800 mb-1">Porquê as Missões?</h3>
                          <p className="font-roboto text-[13px] text-orange-800/70 font-medium leading-relaxed">
                            A nossa equipa listou abaixo exatamente os materiais (fotos ou vídeos) que precisamos de si para produzir o seu próximo lote de conteúdos de alta conversão.
                          </p>
                        </div>
                      </div>

                      {missions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 opacity-40">
                          <CheckCircle2 size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
                          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Cofre Limpo</h3>
                          <p className="font-roboto text-[13px] mt-2 font-medium">A agência não tem pedidos pendentes neste momento.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {missions.map((mission) => (
                            <div key={mission.id} className={`p-6 rounded-[2rem] border transition-all ${mission.status === 'pending' ? 'bg-white shadow-sm border-white' : 'bg-white/40 border-transparent opacity-70'}`}>
                              
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-tight pr-4">{mission.title}</h4>
                                {mission.status === 'pending' ? (
                                  <span className="shrink-0 bg-orange-100 text-orange-600 px-2.5 py-1 rounded-md font-roboto text-[9px] uppercase tracking-widest font-bold">Pendente</span>
                                ) : (
                                  <span className="shrink-0 bg-green-100 text-green-600 px-2.5 py-1 rounded-md font-roboto text-[9px] uppercase tracking-widest font-bold">Enviado</span>
                                )}
                              </div>
                              
                              <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 font-medium leading-relaxed mb-6">
                                {mission.description || "Por favor, anexe o material solicitado."}
                              </p>
                              
                              <div className="mt-auto">
                                {mission.status === 'pending' ? (
                                  <label className={`w-full bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] py-3.5 rounded-xl font-roboto font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--color-atelier-terracota)] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${uploadingId === mission.id ? 'opacity-70 pointer-events-none' : ''}`}>
                                    <input type="file" onChange={(e) => handleUpload(e, mission.id)} disabled={uploadingId !== null} className="hidden" />
                                    {uploadingId === mission.id ? <><Loader2 size={16} className="animate-spin" /> A transferir...</> : <><UploadCloud size={16} /> Enviar Ficheiro</>}
                                  </label>
                                ) : (
                                  <button disabled className="w-full bg-green-50 border border-green-100 text-green-600 py-3.5 rounded-xl font-roboto font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                                    <CheckCircle2 size={16} /> Ficheiro Recebido
                                  </button>
                                )}
                              </div>

                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ABA: COFRE GERAL (Envio Espontâneo) */}
                  {activeTab === 'general' && (
                    <motion.div key="general" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="p-6 md:p-12 flex flex-col items-center justify-center h-full text-center">
                      
                      <div className="w-24 h-24 rounded-full bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center mb-6 border border-white shadow-inner">
                        <Sparkles size={36} className="text-[var(--color-atelier-terracota)]" />
                      </div>
                      
                      <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-3">Envio de Material Livre</h3>
                      <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/60 font-medium leading-relaxed max-w-md mb-10">
                        Tem fotos novas da sua equipa? Um vídeo que gravou hoje? Faça o upload aqui. Os seus ficheiros ficam arquivados na sua mesa de trabalho para uso da agência.
                      </p>

                      <label className={`w-full max-w-sm bg-white border-2 border-dashed border-[var(--color-atelier-grafite)]/20 hover:border-[var(--color-atelier-terracota)] hover:bg-white/80 rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer transition-all shadow-sm group ${uploadingId === 'general' ? 'opacity-70 pointer-events-none' : ''}`}>
                        <input type="file" multiple onChange={(e) => handleUpload(e)} disabled={uploadingId !== null} className="hidden" />
                        
                        {uploadingId === 'general' ? (
                          <>
                            <Loader2 size={36} className="animate-spin text-[var(--color-atelier-terracota)] mb-4" />
                            <span className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">A processar transferência...</span>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 rounded-full bg-[var(--color-atelier-grafite)]/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-[var(--color-atelier-terracota)] group-hover:text-white text-[var(--color-atelier-grafite)]/40 shadow-inner">
                              <UploadCloud size={24} />
                            </div>
                            <span className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors">Clique para enviar ficheiros</span>
                            <span className="font-roboto text-[10px] font-medium text-[var(--color-atelier-grafite)]/40 mt-2">Fotos, vídeos ou documentos PDF</span>
                          </>
                        )}
                      </label>

                    </motion.div>
                  )}

                </AnimatePresence>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}