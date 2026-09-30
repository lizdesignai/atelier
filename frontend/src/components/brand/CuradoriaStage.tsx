"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, CheckCircle2, Loader2, UploadCloud, Send, ImageIcon, Image as LucideImage, Sparkles, Map, MousePointerClick } from "lucide-react";
import { supabase } from "../../lib/supabase";

const ADJETIVOS_LIST = [
  "Elegante", "Acessível", "Confiável", "Amigável", "Criativa", "Divertida", "Formal", 
  "Aventureira", "Aconchegante", "Jovem", "Alto Padrão", "Exclusiva", "Sustentável", 
  "Luxuosa", "Moderna", "Clássica", "Tradicional"
];

interface CuradoriaStageProps {
  projectId: string;
  clientId: string;
  projectData: any;
  briefingData: any; // Briefing from QG
  onComplete: () => void;
}

export function CuradoriaStage({ projectId, clientId, projectData, briefingData, onComplete }: CuradoriaStageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    cor_desejada: briefingData?.answers?.cor_desejada || '',
    cor_nao_desejada: briefingData?.answers?.cor_nao_desejada || '',
    referencias: briefingData?.answers?.referencias || '',
    adjetivos_positivos: briefingData?.answers?.adjetivos_positivos || ([] as string[]),
    logo_atual_url: briefingData?.answers?.logo_atual_url || '',
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (value: string) => {
    setFormData(prev => {
      const list = prev.adjetivos_positivos;
      if (list.includes(value)) return { ...prev, adjetivos_positivos: list.filter((i: string) => i !== value) };
      if (list.length >= 5) return prev; // max 5
      return { ...prev, adjetivos_positivos: [...list, value] };
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    // Preview would be nice here, but for now we'll just show the file name
  };

  const submitCuradoria = async () => {
    setIsSubmitting(true);

    try {
      let finalLogoUrl = formData.logo_atual_url;
      
      // Upload do Logo Se existir
      if (logoFile) {
        setIsUploadingLogo(true);
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${projectId}_logo_antigo_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('briefing_assets').upload(fileName, logoFile);
        
        if (!uploadError) {
          const { data } = supabase.storage.from('briefing_assets').getPublicUrl(fileName);
          finalLogoUrl = data.publicUrl;
        }
        setIsUploadingLogo(false);
      }

      const finalData = { 
        ...briefingData?.answers, // Keep QG data
        ...formData, 
        logo_atual_url: finalLogoUrl 
      };

      const { error } = await supabase.from('client_briefings').upsert({
        project_id: projectId,
        client_id: clientId,
        answers: finalData,
        is_completed: true // Marca como concluído a curadoria
      }, { onConflict: 'project_id' });

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (error) {
      console.error(error);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao enviar curadoria. Tente novamente." }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleted = briefingData?.is_completed;

  if (isCompleted && !isSuccess) {
    return (
      <div className="glass-panel p-10 md:p-14 rounded-[2.5rem] flex flex-col gap-8 border border-white shadow-sm bg-white/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles size={120} />
        </div>
        
        <div className="relative z-10 flex flex-col gap-2">
          <div className="bg-white/80 px-4 py-2 rounded-full inline-flex items-center gap-2 w-max shadow-sm border border-white mb-2">
            <CheckCircle2 size={16} className="text-[var(--color-atelier-terracota)]" />
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]">Curadoria Concluída</span>
          </div>
          <h2 className="font-elegant text-3xl md:text-4xl text-[var(--color-atelier-grafite)]">Base Estratégica Estabelecida</h2>
          <p className="text-[var(--color-atelier-grafite)]/60 max-w-2xl text-sm leading-relaxed">
            Unimos as informações coletadas na imersão com suas preferências visuais. O Studio Veronna já está trabalhando na síntese do Brand DNA com base nesta curadoria.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div className="bg-white/50 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <Map size={20} className="text-[var(--color-atelier-terracota)]" />
              <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">Resumo do Negócio</h3>
            </div>
            <div>
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 block mb-1">Pilar Central</span>
              <p className="text-sm text-[var(--color-atelier-grafite)]">{briefingData?.answers?.proposito || "Coletado no QG"}</p>
            </div>
            <div>
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 block mb-1">Diferencial</span>
              <p className="text-sm text-[var(--color-atelier-grafite)]">{briefingData?.answers?.diferencial || "Analisado pela equipe"}</p>
            </div>
          </div>

          <div className="bg-white/50 p-6 rounded-[2rem] border border-white shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <MousePointerClick size={20} className="text-[var(--color-atelier-terracota)]" />
              <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">Sua Curadoria</h3>
            </div>
            <div>
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 block mb-2">Atributos Visuais</span>
              <div className="flex flex-wrap gap-2">
                {formData.adjetivos_positivos?.map((adj: string) => (
                  <span key={adj} className="bg-[var(--color-atelier-terracota)] text-white px-3 py-1 rounded-full text-xs font-roboto">
                    {adj}
                  </span>
                ))}
              </div>
            </div>
            {formData.logo_atual_url && (
              <div>
                <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 block mb-1">Identidade Anterior</span>
                <a href={formData.logo_atual_url} target="_blank" rel="noreferrer" className="text-sm text-[var(--color-atelier-terracota)] underline">Visualizar anexo enviado</a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 1. O que sabemos sobre você (QG) */}
      <div className="glass-panel p-8 md:p-10 rounded-[2.5rem] flex flex-col gap-6 border border-white shadow-sm bg-gradient-to-br from-[#F5F2EC] to-white relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-5">
          <Map size={200} />
        </div>
        <div className="relative z-10">
          <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">Ponto de Partida</h2>
          <p className="text-[var(--color-atelier-grafite)]/60 text-sm max-w-xl">
            Através da nossa imersão estratégica no QG, mapeamos a essência do seu negócio. Estas são as fundações que guiarão nosso processo criativo.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          <div className="bg-white/80 p-5 rounded-2xl shadow-sm border border-white">
             <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 block mb-1">Modelo de Negócio</span>
             <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/80 leading-relaxed">
               {briefingData?.answers?.produtos_servicos || "Alinhado com a equipe estratégica."}
             </p>
          </div>
          <div className="bg-white/80 p-5 rounded-2xl shadow-sm border border-white">
             <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 block mb-1">Proposta de Valor</span>
             <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/80 leading-relaxed">
               {briefingData?.answers?.proposito || "Definido no QG de Imersão."}
             </p>
          </div>
          <div className="bg-white/80 p-5 rounded-2xl shadow-sm border border-white">
             <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 block mb-1">Público-Alvo</span>
             <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/80 leading-relaxed">
               {briefingData?.answers?.resumo_publico || "Mapeado e documentado pelo Studio Veronna."}
             </p>
          </div>
        </div>
      </div>

      {/* 2. Curadoria Visual (Ação Necessária) */}
      <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] flex flex-col gap-10 border border-white shadow-sm bg-white/60 relative">
        {isSuccess ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center py-20 gap-4"
          >
            <div className="w-20 h-20 bg-[var(--color-atelier-terracota)] rounded-full flex items-center justify-center text-white mb-4">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Curadoria Recebida</h3>
            <p className="text-[var(--color-atelier-grafite)]/60 max-w-md">Seus inputs visuais foram integrados ao nosso laboratório estratégico. Estamos prontos para iniciar a criação do DNA da sua marca.</p>
          </motion.div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <div className="bg-[var(--color-atelier-terracota)]/10 px-4 py-2 rounded-full inline-flex items-center gap-2 w-max mb-2">
                <Sparkles size={16} className="text-[var(--color-atelier-terracota)]" />
                <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)]">Ação Necessária</span>
              </div>
              <h2 className="font-elegant text-3xl md:text-4xl text-[var(--color-atelier-grafite)]">Sua Curadoria Visual</h2>
              <p className="text-[var(--color-atelier-grafite)]/60 text-sm max-w-2xl">
                Agora precisamos do seu input estético. Como você enxerga a marca visualmente? Compartilhe suas preferências e histórico para alinharmos as expectativas antes de desenhar os territórios.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Logo Atual */}
              <div className="flex flex-col gap-4">
                <div>
                  <label className="font-roboto text-[11px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/70 block mb-1">1. Material Existente</label>
                  <p className="text-xs text-[var(--color-atelier-grafite)]/50 mb-4">Se você já possui um logotipo ou paleta atual, anexe aqui.</p>
                </div>
                
                <label className="border-2 border-dashed border-[var(--color-atelier-grafite)]/20 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--color-atelier-grafite)]/5 transition-colors group h-40">
                  {logoFile ? (
                    <div className="flex flex-col items-center gap-2 text-[var(--color-atelier-terracota)]">
                      <LucideImage size={32} />
                      <span className="font-roboto text-sm font-medium">{logoFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-[var(--color-atelier-grafite)]/40 group-hover:text-[var(--color-atelier-grafite)]/60">
                      <UploadCloud size={32} />
                      <span className="font-roboto text-xs uppercase tracking-widest font-bold">Upload do Arquivo</span>
                    </div>
                  )}
                  <input type="file" accept="image/*,.pdf,.ai,.eps" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>

              {/* Cores */}
              <div className="flex flex-col gap-6">
                <div>
                  <label className="font-roboto text-[11px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/70 block mb-1">2. Direcionamento Cromático</label>
                  <p className="text-xs text-[var(--color-atelier-grafite)]/50 mb-3">Existem cores que você faz questão ou que rejeita totalmente?</p>
                </div>
                
                <div className="flex flex-col gap-2">
                  <input 
                    type="text" 
                    name="cor_desejada"
                    value={formData.cor_desejada}
                    onChange={handleInput}
                    placeholder="Ex: Gostaria de tons quentes, terrosos, verde escuro..." 
                    className="w-full bg-white/50 border border-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/30"
                  />
                  <input 
                    type="text" 
                    name="cor_nao_desejada"
                    value={formData.cor_nao_desejada}
                    onChange={handleInput}
                    placeholder="Ex: Não gosto de vermelho vivo, neon, rosa..." 
                    className="w-full bg-white/50 border border-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/30"
                  />
                </div>
              </div>
              
              {/* Adjetivos */}
              <div className="md:col-span-2 flex flex-col gap-4 mt-4">
                <div>
                  <label className="font-roboto text-[11px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/70 block mb-1">3. Personalidade da Marca</label>
                  <p className="text-xs text-[var(--color-atelier-grafite)]/50 mb-4">Selecione até 5 adjetivos que melhor representam a estética que você busca.</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {ADJETIVOS_LIST.map((adj) => {
                    const isSelected = formData.adjetivos_positivos.includes(adj);
                    return (
                      <button
                        key={adj}
                        type="button"
                        onClick={() => handleCheckbox(adj)}
                        className={`px-4 py-2 rounded-full text-xs font-roboto transition-all ${
                          isSelected 
                            ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' 
                            : 'bg-white/50 text-[var(--color-atelier-grafite)] hover:bg-white border border-white'
                        }`}
                      >
                        {adj}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Referencias */}
              <div className="md:col-span-2 flex flex-col gap-4 mt-4">
                <div>
                  <label className="font-roboto text-[11px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/70 block mb-1">4. Painel de Referências</label>
                  <p className="text-xs text-[var(--color-atelier-grafite)]/50 mb-3">Cole links de marcas, Pinterest, Instagram ou sites que você admira visualmente.</p>
                </div>
                <textarea 
                  name="referencias"
                  value={formData.referencias}
                  onChange={handleInput}
                  placeholder="Cole seus links aqui..." 
                  className="w-full h-24 bg-white/50 border border-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/30 resize-none custom-scrollbar"
                />
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-[var(--color-atelier-grafite)]/10 flex justify-end">
              <button 
                onClick={submitCuradoria}
                disabled={isSubmitting || (logoFile && isUploadingLogo)}
                className="btn-primary px-10 py-4 text-sm flex items-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:transform-none"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Enviar Curadoria
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
