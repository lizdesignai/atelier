// src/app/cofre-missoes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { 
  Camera, UploadCloud, Sparkles, CheckCircle2, 
  Loader2, Image as ImageIcon, ArrowRight, Clock, Download, AlertCircle
} from "lucide-react";

// Tipagem da tabela que criámos no SQL anterior
interface AssetMission {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'uploaded' | 'processed';
  raw_image_url: string | null;
  processed_image_url: string | null;
  created_at: string;
}

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function CofreMissoesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [missions, setMissions] = useState<AssetMission[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('asset_missions')
        .select('*')
        .eq('client_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMissions(data || []);
    } catch (error) {
      console.error("Erro ao carregar missões:", error);
      showToast("Erro ao carregar o cofre de ativos.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, missionId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(missionId);
    showToast("A enviar material bruto para o estúdio...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      // 1. Upload do arquivo cru para o Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `raw_${missionId}_${Date.now()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('raw_assets') // Certifique-se de ter este bucket criado no Supabase
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('raw_assets').getPublicUrl(filePath);

      // 2. Atualizar o status da Missão no Banco de Dados
      const { error: dbError } = await supabase
        .from('asset_missions')
        .update({ 
          status: 'uploaded',
          raw_image_url: publicUrlData.publicUrl 
        })
        .eq('id', missionId);

      if (dbError) throw dbError;

      // 3. Atualizar Estado Local
      setMissions(prev => prev.map(m => 
        m.id === missionId ? { ...m, status: 'uploaded', raw_image_url: publicUrlData.publicUrl } : m
      ));

      showToast("Material enviado com sucesso! O Diretor de Arte já foi notificado.");
    } catch (error) {
      console.error("Erro no upload da missão:", error);
      showToast("Erro ao enviar o ficheiro. Tente novamente.");
    } finally {
      setUploadingId(null);
      e.target.value = ''; // Reseta o input
    }
  };

  if (isLoading) {
    return <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center"><Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={32} /></div>;
  }

  const pendingMissions = missions.filter(m => m.status === 'pending');
  const uploadedMissions = missions.filter(m => m.status === 'uploaded');
  const processedMissions = missions.filter(m => m.status === 'processed');

  return (
    <div className="flex flex-col max-w-[1000px] mx-auto w-full gap-10 relative z-10 pb-16 px-4 md:px-0">
      
      {/* CABEÇALHO DA TELA */}
      <header className="animate-[fadeInUp_0.5s_ease-out] mt-6">
        <div className="flex items-center gap-2 mb-2">
          <Camera size={16} className="text-[var(--color-atelier-terracota)]" />
          <span className="micro-title text-[var(--color-atelier-grafite)]/60 font-bold tracking-widest text-[10px] uppercase">
            Cofre Colaborativo
          </span>
        </div>
        <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-tight tracking-tight">
          Missões de <span className="text-[var(--color-atelier-terracota)] italic">Captura.</span>
        </h1>
        <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-3 max-w-lg leading-relaxed">
          Para criarmos um design autêntico, precisamos da sua realidade. Cumpra as missões abaixo enviando fotos e vídeos crus da sua empresa. O nosso estúdio fará a magia da Direção de Arte acontecer.
        </p>
      </header>

      <div className="flex flex-col gap-12">
        
        {/* SECÇÃO 1: MISSÕES PENDENTES (O que o cliente precisa fazer) */}
        <section className="animate-[fadeInUp_0.6s_ease-out]">
          <h2 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-4 flex items-center gap-2">
            <AlertCircle size={14} className={pendingMissions.length > 0 ? "text-orange-500" : ""} /> 
            Missões Pendentes ({pendingMissions.length})
          </h2>
          
          {pendingMissions.length === 0 ? (
            <div className="glass-panel bg-white/40 border border-white/40 p-8 rounded-[2rem] flex flex-col items-center justify-center text-center">
              <CheckCircle2 size={32} className="text-green-500 mb-3" />
              <p className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">Todas as missões concluídas!</p>
              <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/50 mt-1">O estúdio tem todo o material necessário no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {pendingMissions.map(mission => (
                  <motion.div 
                    key={mission.id}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-panel bg-white/80 border-2 border-dashed border-[var(--color-atelier-terracota)]/30 hover:border-[var(--color-atelier-terracota)] p-6 rounded-[2rem] transition-colors relative group overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--color-atelier-terracota)]"></div>
                    <div className="mb-4 pl-2">
                      <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-2">{mission.title}</h3>
                      <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 leading-relaxed">
                        {mission.description}
                      </p>
                    </div>
                    
                    <label className="w-full bg-[var(--color-atelier-terracota)]/5 hover:bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] py-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors border border-[var(--color-atelier-terracota)]/10">
                      <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleFileUpload(e, mission.id)} disabled={uploadingId === mission.id} />
                      {uploadingId === mission.id ? (
                        <div className="flex items-center gap-2 font-bold text-[11px] uppercase tracking-widest">
                          <Loader2 size={16} className="animate-spin" /> A Enviar Material...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 font-bold text-[11px] uppercase tracking-widest">
                          <UploadCloud size={16} /> Clique para Fazer Upload
                        </div>
                      )}
                    </label>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* SECÇÃO 2: EM LAPIDAÇÃO (Ansiedade = Zero) */}
        {uploadedMissions.length > 0 && (
          <section className="animate-[fadeInUp_0.7s_ease-out]">
            <h2 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-4 flex items-center gap-2">
              <Clock size={14} /> Em Lapidação pelo Estúdio ({uploadedMissions.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {uploadedMissions.map(mission => (
                <div key={mission.id} className="glass-panel bg-white/60 border border-white p-4 rounded-[1.5rem] flex items-center gap-4 shadow-sm">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white shadow-inner relative">
                    <img src={mission.raw_image_url || ''} alt="Cru" className="w-full h-full object-cover opacity-60 grayscale" />
                    <div className="absolute inset-0 bg-[var(--color-atelier-grafite)]/20 flex items-center justify-center backdrop-blur-[2px]">
                      <Loader2 size={16} className="animate-spin text-white" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-roboto font-bold text-[12px] text-[var(--color-atelier-grafite)] truncate">{mission.title}</span>
                    <span className="font-roboto text-[9px] uppercase tracking-widest text-[var(--color-atelier-terracota)] font-bold mt-1">Direção de Arte em curso</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECÇÃO 3: ATIVOS PRONTOS (O Momento UAU - Cru vs Lapidado) */}
        {processedMissions.length > 0 && (
          <section className="animate-[fadeInUp_0.8s_ease-out]">
            <h2 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-4 flex items-center gap-2">
              <Sparkles size={14} className="text-[var(--color-atelier-terracota)]" /> Ativos Finalizados ({processedMissions.length})
            </h2>
            <div className="grid grid-cols-1 gap-6">
              {processedMissions.map(mission => (
                <div key={mission.id} className="glass-panel bg-white/80 border border-white p-6 md:p-8 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row items-center gap-8">
                  
                  {/* Visão Split (Antes e Depois) */}
                  <div className="flex gap-2 w-full md:w-auto shrink-0 items-center justify-center">
                    <div className="flex flex-col gap-2 items-center">
                      <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Material Cru</span>
                      <div className="w-24 h-32 md:w-32 md:h-40 rounded-2xl overflow-hidden border border-white shadow-inner">
                        <img src={mission.raw_image_url || ''} className="w-full h-full object-cover" alt="Antes" />
                      </div>
                    </div>
                    
                    <ArrowRight size={20} className="text-[var(--color-atelier-terracota)]/50 mt-4" />
                    
                    <div className="flex flex-col gap-2 items-center">
                      <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] flex items-center gap-1"><Sparkles size={10}/> Lapidado</span>
                      <div className="w-32 h-40 md:w-40 md:h-52 rounded-2xl overflow-hidden border-4 border-white shadow-lg relative group">
                        <img src={mission.processed_image_url || ''} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Depois" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                          <button onClick={() => window.open(mission.processed_image_url || '', "_blank")} className="bg-white text-[var(--color-atelier-grafite)] px-4 py-2 rounded-full text-[9px] uppercase font-bold tracking-widest flex items-center gap-1 shadow-md">
                            <Download size={12} /> Guardar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Informação */}
                  <div className="flex flex-col flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-600 font-roboto text-[9px] font-bold uppercase tracking-widest border border-green-100 w-max mb-3 mx-auto md:mx-0">
                      <CheckCircle2 size={12} /> Missão Cumprida
                    </div>
                    <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">{mission.title}</h3>
                    <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 leading-relaxed mb-6 max-w-md">
                      O seu material original foi colorizado, recortado e teve o nosso padrão estético aplicado. Já está disponível no seu Cofre Geral para ser utilizado.
                    </p>
                  </div>

                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}