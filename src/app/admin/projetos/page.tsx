// src/app/admin/projetos/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  UploadCloud, Clock, Lock, Unlock, 
  Image as ImageIcon, Send, FileText, CheckCircle2,
  MoreVertical, Settings2, Plus, ChevronRight
} from "lucide-react";

export default function WorkspaceDesigner() {
  const [daysLeft, setDaysLeft] = useState(12);
  const [isCofreUnlocked, setIsCofreUnlocked] = useState(false);
  
  // Estado para simular o form do Diário
  const [postTitle, setPostTitle] = useState("");
  const [postText, setPostText] = useState("");

  const handlePostDiary = (e: React.FormEvent) => {
    e.preventDefault();
    // Aqui entraria a lógica de salvar no banco (Supabase/Firebase)
    alert("Postagem enviada com sucesso para o cliente!");
    setPostTitle("");
    setPostText("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          1. CABEÇALHO DO ESTÚDIO (Seletor de Cliente)
          ========================================== */}
      <header className="flex justify-between items-end shrink-0 animate-[fadeInUp_0.5s_ease-out]">
        <div className="flex items-center gap-6">
          {/* Avatar do Cliente Sendo Editado */}
          <div className="w-16 h-16 rounded-[1.5rem] bg-white border border-white shadow-sm flex items-center justify-center text-[var(--color-atelier-terracota)] font-elegant text-3xl overflow-hidden">
             <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop" alt="Igor" className="w-full h-full object-cover opacity-80" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-green-500/10 text-green-700 px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-bold border border-green-500/20">
                Ativo
              </span>
              <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">
                IDV Premium
              </span>
            </div>
            <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none flex items-center gap-2">
              Igor Santos <ChevronRight size={20} className="text-[var(--color-atelier-terracota)]" /> <span className="text-[var(--color-atelier-terracota)] italic text-3xl">Mesa de Trabalho</span>
            </h1>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="glass-panel px-5 py-2.5 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] transition-colors flex items-center gap-2">
            <FileText size={14} /> Ver Briefing
          </button>
          <button className="glass-panel px-3 py-2.5 rounded-xl text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] transition-colors">
            <MoreVertical size={16} />
          </button>
        </div>
      </header>

      {/* ==========================================
          2. ÁREAS DE TRABALHO (Split Screen)
          ========================================== */}
      <div className="flex gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* COLUNA ESQUERDA: ENGENHARIA DO COFRE (7 Colunas) */}
        <div className="w-[55%] flex flex-col gap-6 h-full">
          
          {/* Módulo 1: Motor do Tempo */}
          <div className="glass-panel p-8 rounded-[2.5rem] bg-white/60 shrink-0">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                <Settings2 size={20} className="text-[var(--color-atelier-terracota)]" /> Engenharia do Cofre
              </h3>
              <div className="flex items-center gap-2">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Status do Cliente:</span>
                {isCofreUnlocked ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md"><Unlock size={12}/> Desbloqueado</span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md"><Lock size={12}/> Bloqueado</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex-1 bg-white/50 border border-white p-5 rounded-2xl shadow-sm">
                <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 block mb-4">
                  Dias para Revelação
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" min="0" max="30" value={daysLeft}
                    onChange={(e) => {
                      setDaysLeft(Number(e.target.value));
                      if (Number(e.target.value) === 0) setIsCofreUnlocked(true);
                      else setIsCofreUnlocked(false);
                    }}
                    className="flex-1 accent-[var(--color-atelier-terracota)] h-1.5 bg-[var(--color-atelier-grafite)]/10 rounded-full appearance-none cursor-ew-resize"
                  />
                  <div className="w-16 h-10 bg-white rounded-xl border border-[var(--color-atelier-terracota)]/20 flex items-center justify-center font-elegant text-2xl text-[var(--color-atelier-terracota)] shadow-inner">
                    {daysLeft}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => { setDaysLeft(0); setIsCofreUnlocked(true); }}
                disabled={isCofreUnlocked}
                className="h-[84px] px-8 bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] rounded-2xl font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-[var(--color-atelier-terracota)] transition-all shadow-[0_10px_20px_rgba(122,116,112,0.15)] disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-2"
              >
                <Unlock size={18} />
                Forçar Abertura
              </button>
            </div>
          </div>

          {/* Módulo 2: Upload de Entregáveis */}
          <div className="glass-panel p-8 rounded-[2.5rem] bg-white/60 flex-1 flex flex-col min-h-0">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2 mb-2">
              <UploadCloud size={20} className="text-[var(--color-atelier-terracota)]" /> Ativos Finais
            </h3>
            <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mb-6">
              Faça o upload dos arquivos que o cliente receberá quando o cofre for aberto.
            </p>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-2">
              
              {/* Item de Upload 1 */}
              <div className="border-2 border-dashed border-[var(--color-atelier-grafite)]/20 bg-white/40 hover:bg-white/80 transition-colors rounded-2xl p-5 flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[var(--color-atelier-terracota)]">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="block font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">Brandbook Oficial (PDF)</span>
                    <span className="block font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 mt-0.5">Nenhum arquivo selecionado</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={18} />
                </div>
              </div>

              {/* Item de Upload 2 (Estado Preenchido) */}
              <div className="border border-[var(--color-atelier-terracota)]/30 bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)]">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <span className="block font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">Logos e Vetores (.ZIP)</span>
                    <span className="block font-roboto text-[11px] text-green-600 font-bold mt-0.5">logos_igorcastro_v1.zip (24MB)</span>
                  </div>
                </div>
                <button className="text-[11px] font-bold uppercase tracking-widest text-red-500/70 hover:text-red-600 transition-colors">
                  Remover
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* COLUNA DIREITA: PUBLICADOR DO DIÁRIO (45%) */}
        <div className="flex-1 glass-panel p-8 rounded-[2.5rem] bg-gradient-to-br from-white/90 to-white/50 flex flex-col h-full border-[var(--color-atelier-terracota)]/10 shadow-[0_15px_40px_rgba(173,111,64,0.05)]">
          
          <div className="mb-6 pb-4 border-b border-[var(--color-atelier-grafite)]/10">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2 mb-1">
              <ImageIcon size={20} className="text-[var(--color-atelier-terracota)]" /> Atualizar Diário
            </h3>
            <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60">
              Poste atualizações visuais na timeline do cliente para gerar valor.
            </p>
          </div>

          <form onSubmit={handlePostDiary} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-5">
              
              {/* Upload de Imagem do Post */}
              <div className="w-full h-48 rounded-[1.5rem] border-2 border-dashed border-[var(--color-atelier-grafite)]/20 bg-white/40 hover:bg-white/80 hover:border-[var(--color-atelier-terracota)]/40 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[var(--color-atelier-grafite)]/40 group-hover:text-[var(--color-atelier-terracota)] transition-colors">
                  <UploadCloud size={24} />
                </div>
                <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)]">
                  Arraste a Imagem do Estudo
                </span>
              </div>

              {/* Título do Post */}
              <div className="flex flex-col gap-2 group/input">
                <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors pl-1">
                  Título da Atualização
                </label>
                <input 
                  type="text" required value={postTitle} onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Ex: Estudo de Tipografia..."
                  className="w-full bg-white/60 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3.5 px-4 text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/30 outline-none transition-all shadow-sm"
                />
              </div>

              {/* Texto do Post */}
              <div className="flex flex-col gap-2 group/input flex-1">
                <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors pl-1">
                  Narrativa (Copy)
                </label>
                <textarea 
                  required value={postText} onChange={(e) => setPostText(e.target.value)}
                  placeholder="Explique a decisão de design de forma elegante..."
                  className="w-full h-full min-h-[120px] resize-none bg-white/60 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3.5 px-4 text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/30 outline-none transition-all shadow-sm custom-scrollbar"
                />
              </div>

            </div>

            {/* Botão de Publicar */}
            <button 
              type="submit" 
              className="mt-6 w-full bg-[var(--color-atelier-terracota)] text-white h-14 rounded-2xl font-roboto font-bold uppercase tracking-[0.2em] text-[12px] hover:bg-[#8c562e] transition-colors shadow-[0_10px_20px_rgba(173,111,64,0.3)] hover:-translate-y-0.5 flex items-center justify-center gap-2 shrink-0"
            >
              <Send size={16} /> Publicar no Diário
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}