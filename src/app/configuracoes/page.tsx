// src/app/configuracoes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, User, Briefcase, FileText, Camera, 
  ShieldCheck, Save, Calendar, MapPin, Download, ArrowRight, Loader2
} from "lucide-react";
import { supabase } from "../../lib/supabase";

// Função para disparar os Toasts Globais
const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<"perfil" | "empresa" | "contrato">("perfil");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("client");

  // Estados do Formulário
  const [avatar, setAvatar] = useState<string>("https://ui-avatars.com/api/?name=User&background=ad6f40&color=fbf4e4");
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    aniversario: "",
    bio: "",
    empresa: "",
    nif: "",
    endereco: ""
  });

  // ==========================================
  // BUSCA INICIAL DOS DADOS NO SUPABASE (READ)
  // ==========================================
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUserId(session.user.id);
          
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) throw error;

          if (profile) {
            setUserRole(profile.role);
            setFormData({
              nome: profile.nome || "",
              email: profile.email || session.user.email || "",
              aniversario: profile.aniversario || "",
              bio: profile.bio || "",
              empresa: profile.empresa || "",
              nif: profile.nif || "",
              endereco: profile.endereco || ""
            });
            
            if (profile.avatar_url) {
              setAvatar(profile.avatar_url);
            } else if (profile.nome) {
              setAvatar(`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.nome)}&background=ad6f40&color=fbf4e4`);
            }
          }
        }
      } catch (error: any) {
        console.error("Erro ao carregar perfil:", error);
        showToast("Falha ao sincronizar dados. Atualize a página.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        showToast("Foto atualizada em cache. Guarde para gravar.");
      };
      reader.readAsDataURL(file);
    }
  };

  // ==========================================
  // ATUALIZAÇÃO DOS DADOS NO SUPABASE (UPDATE)
  // ==========================================
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsSaving(true);
    showToast("A sincronizar dados com o CRM do Atelier...");
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome: formData.nome,
          aniversario: formData.aniversario || null,
          bio: formData.bio,
          empresa: formData.empresa,
          nif: formData.nif,
          endereco: formData.endereco,
          avatar_url: avatar
        })
        .eq('id', userId);

      if (error) throw error;

      showToast("✨ Definições guardadas e atualizadas no ecossistema.");
    } catch (error: any) {
      console.error("Erro ao guardar:", error);
      showToast("Erro ao guardar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Ecrã de Loading Interno da Tela
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1200px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          1. CABEÇALHO
          ========================================== */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/60 text-[var(--color-atelier-grafite)] px-4 py-1.5 rounded-full flex items-center gap-2 border border-white shadow-sm">
              <Settings size={14} className="text-[var(--color-atelier-terracota)]" />
              <span className="font-roboto text-[10px] uppercase tracking-widest font-bold">Painel de Controlo</span>
            </span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Ajustes e <span className="text-[var(--color-atelier-terracota)] italic">Privacidade.</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60 max-w-sm text-right">
            Faça a gestão dos seus dados pessoais, informações de faturação e consulte a documentação jurídica do seu projeto.
          </p>
        </div>
      </header>

      {/* ==========================================
          2. ESTRUTURA DE NAVEGAÇÃO E FORMULÁRIO
          ========================================== */}
      <div className="flex gap-8 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* COLUNA ESQUERDA: MENU E AVATAR (320px) */}
        <div className="w-[320px] flex flex-col gap-6 shrink-0 h-full">
          
          {/* Editor de Avatar Magnético */}
          <div className="glass-panel p-8 rounded-[2.5rem] bg-white/40 border border-white/60 shadow-[0_15px_40px_rgba(122,116,112,0.05)] flex flex-col items-center justify-center text-center shrink-0">
            <div className="relative group cursor-pointer mb-4">
              <div className="w-28 h-28 rounded-full border-4 border-white shadow-md overflow-hidden bg-[var(--color-atelier-creme)] relative z-10">
                <img src={avatar} alt="Perfil" className="w-full h-full object-cover" />
              </div>
              <label className="absolute inset-0 bg-[var(--color-atelier-grafite)]/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 cursor-pointer backdrop-blur-sm">
                <Camera size={24} className="mb-1" />
                <span className="font-roboto text-[9px] font-bold uppercase tracking-widest">Alterar Foto</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
              {/* Ornamento Traseiro */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-xl group-hover:bg-[var(--color-atelier-terracota)]/20 transition-colors z-0"></div>
            </div>
            <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{formData.nome || "Novo Cliente"}</h2>
            <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] mt-2">
              {userRole === 'admin' ? 'Acesso Designer' : userRole === 'gestor' ? 'Acesso Diretor' : 'Cliente Premium'}
            </span>
          </div>

          {/* Menu Lateral de Definições */}
          <div className="glass-panel p-4 rounded-[2rem] bg-white/60 border border-white shadow-sm flex-1 flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab("perfil")}
              className={`px-5 py-4 rounded-xl flex items-center gap-4 transition-all ${activeTab === "perfil" ? "bg-white shadow-sm text-[var(--color-atelier-terracota)]" : "text-[var(--color-atelier-grafite)]/60 hover:bg-white/50 hover:text-[var(--color-atelier-grafite)]"}`}
            >
              <User size={18} />
              <div className="flex flex-col text-left">
                <span className="font-roboto text-[13px] font-bold">Identidade Pessoal</span>
                <span className="font-roboto text-[10px] uppercase tracking-widest opacity-60">Nome, Bio, Aniversário</span>
              </div>
            </button>

            <button 
              onClick={() => setActiveTab("empresa")}
              className={`px-5 py-4 rounded-xl flex items-center gap-4 transition-all ${activeTab === "empresa" ? "bg-white shadow-sm text-[var(--color-atelier-terracota)]" : "text-[var(--color-atelier-grafite)]/60 hover:bg-white/50 hover:text-[var(--color-atelier-grafite)]"}`}
            >
              <Briefcase size={18} />
              <div className="flex flex-col text-left">
                <span className="font-roboto text-[13px] font-bold">Dados Fiscais</span>
                <span className="font-roboto text-[10px] uppercase tracking-widest opacity-60">Empresa, NIF, Endereço</span>
              </div>
            </button>

            <button 
              onClick={() => setActiveTab("contrato")}
              className={`px-5 py-4 rounded-xl flex items-center gap-4 transition-all ${activeTab === "contrato" ? "bg-white shadow-sm text-[var(--color-atelier-terracota)]" : "text-[var(--color-atelier-grafite)]/60 hover:bg-white/50 hover:text-[var(--color-atelier-grafite)]"}`}
            >
              <FileText size={18} />
              <div className="flex flex-col text-left">
                <span className="font-roboto text-[13px] font-bold">Contrato & Jurídico</span>
                <span className="font-roboto text-[10px] uppercase tracking-widest opacity-60">Termos e Condições</span>
              </div>
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA: O FORMULÁRIO DINÂMICO */}
        <div className="flex-1 glass-panel rounded-[2.5rem] bg-white/60 border border-white flex flex-col relative overflow-hidden shadow-[0_20px_50px_rgba(122,116,112,0.08)] h-full">
          
          <form onSubmit={handleSave} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
              <AnimatePresence mode="wait">
                
                {/* ABA: PERFIL */}
                {activeTab === "perfil" && (
                  <motion.div key="perfil" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-8">
                    <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                      <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Informações Pessoais</h2>
                      <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/50 mt-1">Como o Atelier se dirige a si e aos seus marcos importantes.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2 group/input">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1">Nome Completo</label>
                        <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="bg-white/80 border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-5 py-3.5 text-[14px] outline-none shadow-sm" />
                      </div>
                      <div className="flex flex-col gap-2 group/input">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1">Email Principal</label>
                        <input type="email" value={formData.email} disabled className="bg-[var(--color-atelier-grafite)]/5 border border-transparent rounded-xl px-5 py-3.5 text-[14px] outline-none text-[var(--color-atelier-grafite)]/50 cursor-not-allowed" />
                        <span className="text-[10px] pl-2 text-[var(--color-atelier-grafite)]/40 font-bold">O e-mail de acesso não pode ser alterado.</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 group/input w-1/2 pr-3">
                      <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 flex items-center gap-2">
                        <Calendar size={14}/> Data de Aniversário
                      </label>
                      <input type="date" value={formData.aniversario} onChange={(e) => setFormData({...formData, aniversario: e.target.value})} className="bg-white/80 border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-5 py-3.5 text-[14px] outline-none shadow-sm cursor-pointer" />
                    </div>

                    <div className="flex flex-col gap-2 group/input">
                      <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1">Biografia / Resumo Profissional</label>
                      <textarea value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} className="bg-white/80 border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-5 py-4 text-[14px] min-h-[120px] resize-none outline-none shadow-sm custom-scrollbar" placeholder="Fale-nos um pouco sobre a sua visão de mercado..." />
                    </div>
                  </motion.div>
                )}

                {/* ABA: EMPRESA E FATURAÇÃO */}
                {activeTab === "empresa" && (
                  <motion.div key="empresa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-8">
                    <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                      <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Dados Fiscais</h2>
                      <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/50 mt-1">Informações essenciais para faturação e emissão de recibos.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2 group/input">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1">Nome da Empresa</label>
                        <input type="text" value={formData.empresa} onChange={(e) => setFormData({...formData, empresa: e.target.value})} className="bg-white/80 border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-5 py-3.5 text-[14px] outline-none shadow-sm" placeholder="A sua Holding ou Empresa Lda." />
                      </div>
                      <div className="flex flex-col gap-2 group/input">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1">NIF / CNPJ</label>
                        <input type="text" value={formData.nif} onChange={(e) => setFormData({...formData, nif: e.target.value})} className="bg-white/80 border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-5 py-3.5 text-[14px] outline-none shadow-sm font-mono" placeholder="000.000.000" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 group/input">
                      <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 flex items-center gap-2">
                        <MapPin size={14} /> Endereço Fiscal Completo
                      </label>
                      <input type="text" value={formData.endereco} onChange={(e) => setFormData({...formData, endereco: e.target.value})} className="bg-white/80 border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-5 py-3.5 text-[14px] outline-none shadow-sm" placeholder="Rua, Número, Código Postal, País" />
                    </div>
                  </motion.div>
                )}

                {/* ABA: CONTRATO JURÍDICO */}
                {activeTab === "contrato" && (
                  <motion.div key="contrato" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-8 h-full">
                    <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                      <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Auditoria e Jurídico</h2>
                      <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/50 mt-1">Transparência total. O seu contrato blindado e acessível a qualquer momento.</p>
                    </div>

                    <div className="flex-1 flex items-center justify-center">
                      <div className="bg-white p-8 rounded-[2rem] border border-[var(--color-atelier-grafite)]/10 shadow-[0_20px_50px_rgba(122,116,112,0.08)] max-w-md w-full flex flex-col items-center text-center group hover:border-[var(--color-atelier-terracota)]/30 transition-all">
                        <div className="w-20 h-20 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-6 shadow-inner">
                          <ShieldCheck size={32} />
                        </div>
                        <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-2">Contrato de Prestação de Serviços</h3>
                        <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/50 mb-6">Assinado digitalmente. Todas as cláusulas de direitos de imagem e autoria estão garantidas.</p>
                        
                        <div className="w-full flex flex-col gap-3">
                          <div className="bg-[var(--color-atelier-grafite)]/5 px-4 py-3 rounded-xl flex justify-between items-center text-[11px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70">
                            <span>Status:</span>
                            <span className="text-green-600">Assinado</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => showToast("O motor de PDF será ativado na Fase 2...")}
                            className="w-full bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl flex items-center justify-center gap-2 font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-sm group-hover:-translate-y-1 duration-300"
                          >
                            <Download size={16} /> Transferir Cópia PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Rodapé de Guardar (Fixo no Fundo) */}
            {activeTab !== "contrato" && (
              <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-[var(--color-atelier-grafite)]/5 shrink-0 flex justify-end">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className={`
                    px-8 h-12 rounded-xl font-roboto font-bold uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2 transition-all shadow-sm
                    ${isSaving 
                      ? 'bg-transparent border border-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)]' 
                      : 'bg-[var(--color-atelier-terracota)] text-white hover:bg-[#8c562e] hover:-translate-y-0.5 shadow-[0_10px_20px_rgba(173,111,64,0.3)]'
                    }
                  `}
                >
                  {isSaving ? (
                    <><div className="w-4 h-4 border-2 border-[var(--color-atelier-terracota)] border-t-transparent rounded-full animate-spin"></div> A Sincronizar...</>
                  ) : (
                    <><Save size={16} /> Guardar Definições</>
                  )}
                </button>
              </div>
            )}
          </form>

        </div>

      </div>
    </div>
  );
}