// src/app/configuracoes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, User, Briefcase, FileText, Camera, 
  ShieldCheck, Save, Calendar, MapPin, Download, Loader2, Link as LinkIcon, KeyRound, CheckCircle2, Lock
} from "lucide-react";
import { supabase } from "../../lib/supabase";

// Função para disparar os Toasts Globais
const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<"perfil" | "empresa" | "contrato" | "seguranca">("perfil");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("client");
  
  // Estado para guardar a URL do contrato vinda do projeto
  const [contractUrl, setContractUrl] = useState<string | null>(null);

  // Estados do Formulário de Perfil
  const [avatar, setAvatar] = useState<string>("https://ui-avatars.com/api/?name=User&background=ad6f40&color=fbf4e4");
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    aniversario: "",
    bio: "",
    empresa: "",
    cargo: "", // Campo para a equipa
    nif: "",
    endereco: ""
  });

  // Estados do Formulário de Senha
  const [passwordData, setPasswordData] = useState({ newPassword: "", confirmPassword: "" });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
              cargo: profile.cargo || "",
              nif: profile.nif || "",
              endereco: profile.endereco || ""
            });
            
            if (profile.avatar_url) {
              setAvatar(profile.avatar_url);
            } else if (profile.nome) {
              setAvatar(`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.nome)}&background=ad6f40&color=fbf4e4`);
            }

            // Se for cliente, busca o link do contrato na tabela projects
            if (profile.role === 'client') {
              const { data: project } = await supabase.from('projects').select('contract_url').eq('client_id', session.user.id).eq('status', 'active').maybeSingle();
              if (project?.contract_url) {
                setContractUrl(project.contract_url);
              }
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    showToast("A enviar nova foto de perfil...");
    
    try {
      const fileExt = file.name.split('.').pop();
      // O nome do arquivo usa a data para forçar a renderização limpa e quebrar o cache, 
      // mas o upsert garante que não há bugs de sobreposição.
      const fileName = `${userId}_avatar_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true }); // UPSERT Sênior: Substitui se houver conflito

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      
      setAvatar(publicUrlData.publicUrl);
      showToast("Foto alterada! Clique em 'Guardar Definições' para aplicar.");
    } catch (error) {
      console.error(error);
      showToast("Erro ao fazer upload da imagem. Certifique-se que o Bucket existe.");
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
      const updateData: any = {
        nome: formData.nome,
        aniversario: formData.aniversario || null,
        bio: formData.bio,
        endereco: formData.endereco,
        avatar_url: avatar
      };

      // Grava o campo correto mediante o cargo
      if (userRole === 'client') {
        updateData.empresa = formData.empresa;
        updateData.nif = formData.nif;
      } else {
        updateData.cargo = formData.cargo;
      }

      const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
      if (error) throw error;

      showToast("✨ Definições guardadas e atualizadas no ecossistema.");
    } catch (error: any) {
      console.error("Erro ao guardar:", error);
      showToast("Erro ao guardar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // REDEFINIÇÃO DE SENHA (GoTrue AUTH)
  // ==========================================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword.length < 6) {
      showToast("Acesso Negado: A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast("Acesso Negado: As senhas não coincidem.");
      return;
    }

    setIsChangingPassword(true);
    showToast("A reconfigurar cofre de segurança...");

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      showToast("✅ Credenciais de segurança atualizadas com sucesso!");
      setPasswordData({ newPassword: "", confirmPassword: "" }); // Limpa o form
    } catch (error: any) {
      showToast(`Falha na segurança: ${error.message}`);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isTeamMember = userRole === 'admin' || userRole === 'gestor' || userRole === 'colaborador';

  // Ecrã de Loading Interno da Tela
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1200px] mx-auto relative z-10 pb-6 gap-6 px-4 md:px-0">
      
      {/* ==========================================
          1. CABEÇALHO
          ========================================== */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 mt-6 animate-[fadeInUp_0.5s_ease-out]">
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
          <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60 max-w-sm text-left md:text-right">
            Faça a gestão dos seus dados pessoais, informações profissionais e consulte a documentação jurídica do seu projeto.
          </p>
        </div>
      </header>

      {/* ==========================================
          2. ESTRUTURA DE NAVEGAÇÃO E FORMULÁRIO
          ========================================== */}
      <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* COLUNA ESQUERDA: MENU E AVATAR (320px) */}
        <div className="w-full md:w-[320px] flex flex-col gap-6 shrink-0 h-full">
          
          {/* Editor de Avatar Magnético */}
          <div className="glass-panel p-8 rounded-[2.5rem] bg-white/40 border border-white/60 shadow-[0_15px_40px_rgba(122,116,112,0.05)] flex flex-col items-center justify-center text-center shrink-0">
            <div className="relative group cursor-pointer mb-4">
              <div className="w-28 h-28 rounded-full border-4 border-white shadow-md overflow-hidden bg-[var(--color-atelier-creme)] relative z-10 flex items-center justify-center font-elegant text-4xl text-[var(--color-atelier-terracota)]">
                {avatar.includes('ui-avatars') && !avatar.includes('http') ? formData.nome.charAt(0) || "U" : <img src={avatar} alt="Perfil" className="w-full h-full object-cover" />}
              </div>
              <label className="absolute inset-0 bg-[var(--color-atelier-grafite)]/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 cursor-pointer backdrop-blur-sm">
                <Camera size={24} className="mb-1" />
                <span className="font-roboto text-[9px] font-bold uppercase tracking-widest">Alterar Foto</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
              {/* Ornamento Traseiro */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-xl group-hover:bg-[var(--color-atelier-terracota)]/20 transition-colors z-0"></div>
            </div>
            <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{formData.nome || "Utilizador"}</h2>
            <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] mt-2">
              {isTeamMember ? (formData.cargo || 'Membro da Equipa') : (formData.empresa || 'Cliente Premium')}
            </span>
          </div>

          {/* Menu Lateral de Definições */}
          <div className="glass-panel p-4 rounded-[2rem] bg-white/60 border border-white shadow-sm flex-1 flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab("perfil")}
              className={`px-5 py-4 rounded-xl flex items-center gap-4 transition-all ${activeTab === "perfil" ? "bg-white shadow-sm text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/10" : "text-[var(--color-atelier-grafite)]/60 hover:bg-white/50 hover:text-[var(--color-atelier-grafite)] border border-transparent"}`}
            >
              <User size={18} />
              <div className="flex flex-col text-left">
                <span className="font-roboto text-[13px] font-bold">Identidade Pessoal</span>
                <span className="font-roboto text-[10px] uppercase tracking-widest opacity-60">Nome, Bio, Aniversário</span>
              </div>
            </button>

            <button 
              onClick={() => setActiveTab("empresa")}
              className={`px-5 py-4 rounded-xl flex items-center gap-4 transition-all ${activeTab === "empresa" ? "bg-white shadow-sm text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/10" : "text-[var(--color-atelier-grafite)]/60 hover:bg-white/50 hover:text-[var(--color-atelier-grafite)] border border-transparent"}`}
            >
              <Briefcase size={18} />
              <div className="flex flex-col text-left">
                <span className="font-roboto text-[13px] font-bold">{isTeamMember ? 'Posição no Atelier' : 'Dados da Empresa'}</span>
                <span className="font-roboto text-[10px] uppercase tracking-widest opacity-60">{isTeamMember ? 'Cargo' : 'NIF, Endereço'}</span>
              </div>
            </button>

            {/* ABA DE SEGURANÇA INJETADA AQUI */}
            <button 
              onClick={() => setActiveTab("seguranca")}
              className={`px-5 py-4 rounded-xl flex items-center gap-4 transition-all ${activeTab === "seguranca" ? "bg-white shadow-sm text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/10" : "text-[var(--color-atelier-grafite)]/60 hover:bg-white/50 hover:text-[var(--color-atelier-grafite)] border border-transparent"}`}
            >
              <KeyRound size={18} />
              <div className="flex flex-col text-left">
                <span className="font-roboto text-[13px] font-bold">Segurança & Acesso</span>
                <span className="font-roboto text-[10px] uppercase tracking-widest opacity-60">Redefinir Senha</span>
              </div>
            </button>

            {!isTeamMember && (
              <button 
                onClick={() => setActiveTab("contrato")}
                className={`px-5 py-4 rounded-xl flex items-center gap-4 transition-all ${activeTab === "contrato" ? "bg-white shadow-sm text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/10" : "text-[var(--color-atelier-grafite)]/60 hover:bg-white/50 hover:text-[var(--color-atelier-grafite)] border border-transparent"}`}
              >
                <FileText size={18} />
                <div className="flex flex-col text-left">
                  <span className="font-roboto text-[13px] font-bold">Contrato & Jurídico</span>
                  <span className="font-roboto text-[10px] uppercase tracking-widest opacity-60">Termos e Condições</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: O FORMULÁRIO DINÂMICO */}
        <div className="flex-1 glass-panel rounded-[2.5rem] bg-white/60 border border-white flex flex-col relative overflow-hidden shadow-[0_20px_50px_rgba(122,116,112,0.08)] h-full">
          
          <AnimatePresence mode="wait">
            
            {/* ==========================================
                ABA: PERFIL & EMPRESA (Agrupadas no mesmo Form)
                ========================================== */}
            {(activeTab === "perfil" || activeTab === "empresa") && (
              <form key="dados-form" onSubmit={handleSave} className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-8">
                    
                    {activeTab === "perfil" ? (
                      <>
                        <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                          <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Informações Pessoais</h2>
                          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/50 mt-1">Como o Atelier se dirige a si e aos seus marcos importantes.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                        <div className="flex flex-col gap-2 group/input w-full md:w-1/2 md:pr-3">
                          <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 flex items-center gap-2">
                            <Calendar size={14}/> Data de Aniversário
                          </label>
                          <input type="date" value={formData.aniversario} onChange={(e) => setFormData({...formData, aniversario: e.target.value})} className="bg-white/80 border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-5 py-3.5 text-[14px] outline-none shadow-sm cursor-pointer" />
                        </div>

                        <div className="flex flex-col gap-2 group/input">
                          <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1">Biografia / Resumo Profissional</label>
                          <textarea value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} className="bg-white/80 border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-5 py-4 text-[14px] min-h-[120px] resize-none outline-none shadow-sm custom-scrollbar" placeholder="Fale-nos um pouco sobre a sua visão de mercado..." />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                          <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">{isTeamMember ? 'Posição no Atelier' : 'Dados Fiscais da Empresa'}</h2>
                          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/50 mt-1">{isTeamMember ? 'Identifique o seu cargo oficial perante os clientes.' : 'Informações essenciais para faturação e emissão de recibos.'}</p>
                        </div>

                        {isTeamMember ? (
                          // VISÃO DO ADMIN: Apenas o Cargo
                          <div className="flex flex-col gap-2 group/input w-full md:w-1/2">
                            <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1">O seu Cargo Oficial</label>
                            <input type="text" value={formData.cargo} onChange={(e) => setFormData({...formData, cargo: e.target.value})} className="bg-white/80 border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-5 py-3.5 text-[14px] outline-none shadow-sm" placeholder="Ex: Lead Designer, Gestora Criativa..." />
                          </div>
                        ) : (
                          // VISÃO DO CLIENTE: Dados da Empresa
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          </>
                        )}
                      </>
                    )}
                  </motion.div>
                </div>
                
                {/* Rodapé de Guardar (Fixo no Fundo para Perfil e Empresa) */}
                <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-[var(--color-atelier-grafite)]/5 shrink-0 flex justify-end">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className={`
                      px-8 h-12 rounded-xl font-roboto font-bold uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2 transition-all shadow-sm w-full md:w-auto
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
              </form>
            )}

            {/* ==========================================
                ABA: SEGURANÇA E SENHA (Formulário Independente)
                ========================================== */}
            {activeTab === "seguranca" && (
              <form key="security-form" onSubmit={handleChangePassword} className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-8">
                    
                    <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                      <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
                        Segurança & Credenciais
                      </h2>
                      <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/50 mt-1">Altere a sua palavra-passe de acesso ao estúdio.</p>
                    </div>

                    <div className="bg-white/40 border border-white p-6 rounded-3xl shadow-sm flex flex-col gap-6 max-w-lg">
                      <div className="flex flex-col gap-2 group/input">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 flex items-center gap-1.5">
                          <Lock size={14}/> Nova Palavra-Passe
                        </label>
                        <input 
                          type="password" 
                          required
                          minLength={6}
                          placeholder="Mínimo de 6 caracteres"
                          value={passwordData.newPassword} 
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} 
                          className="bg-white border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-5 py-3.5 text-[14px] outline-none shadow-sm" 
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2 group/input">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 flex items-center gap-1.5">
                          <CheckCircle2 size={14}/> Confirmar Palavra-Passe
                        </label>
                        <input 
                          type="password" 
                          required
                          minLength={6}
                          placeholder="Repita a senha para confirmar"
                          value={passwordData.confirmPassword} 
                          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} 
                          className="bg-white border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-terracota)]/40 rounded-xl px-5 py-3.5 text-[14px] outline-none shadow-sm" 
                        />
                      </div>
                    </div>
                    
                    <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl flex items-start gap-3 max-w-lg">
                      <ShieldCheck size={16} className="text-orange-500 shrink-0 mt-0.5"/>
                      <p className="text-[11px] text-orange-800 leading-relaxed font-medium">As suas credenciais são encriptadas de ponta a ponta. O Atelier não tem acesso visual à sua palavra-passe, garantindo privacidade absoluta.</p>
                    </div>

                  </motion.div>
                </div>
                
                <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-[var(--color-atelier-grafite)]/5 shrink-0 flex justify-end">
                  <button 
                    type="submit"
                    disabled={isChangingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    className={`
                      px-8 h-12 rounded-xl font-roboto font-bold uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2 transition-all shadow-sm w-full md:w-auto
                      ${isChangingPassword 
                        ? 'bg-transparent border border-[var(--color-atelier-grafite)] text-[var(--color-atelier-grafite)]/50' 
                        : 'bg-[var(--color-atelier-grafite)] text-white hover:bg-black hover:-translate-y-0.5 shadow-[0_10px_20px_rgba(0,0,0,0.1)] disabled:opacity-50 disabled:hover:translate-y-0'
                      }
                    `}
                  >
                    {isChangingPassword ? (
                      <><div className="w-4 h-4 border-2 border-[var(--color-atelier-grafite)]/30 border-t-transparent rounded-full animate-spin"></div> A Atualizar Cofre...</>
                    ) : (
                      <><KeyRound size={16} /> Redefinir Palavra-Passe</>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ==========================================
                ABA: CONTRATO JURÍDICO (APENAS PARA CLIENTES)
                ========================================== */}
            {activeTab === "contrato" && !isTeamMember && (
              <motion.div key="contrato" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-8 h-full p-6 md:p-10">
                <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                  <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Auditoria e Jurídico</h2>
                  <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/50 mt-1">Transparência total. O seu contrato blindado e acessível a qualquer momento.</p>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <div className="bg-white p-8 rounded-[2rem] border border-[var(--color-atelier-grafite)]/10 shadow-[0_20px_50px_rgba(122,116,112,0.08)] max-w-md w-full flex flex-col items-center text-center group hover:border-[var(--color-atelier-terracota)]/30 transition-all">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner ${contractUrl ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-500'}`}>
                      <ShieldCheck size={32} />
                    </div>
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-2">Contrato de Prestação de Serviços</h3>
                    <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/50 mb-6">Assinado digitalmente. Todas as cláusulas de direitos de imagem e autoria estão garantidas.</p>
                    
                    <div className="w-full flex flex-col gap-3">
                      <div className="bg-[var(--color-atelier-grafite)]/5 px-4 py-3 rounded-xl flex justify-between items-center text-[11px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70">
                        <span>Status:</span>
                        {contractUrl ? <span className="text-green-600">Disponível</span> : <span className="text-orange-500">Em preparação</span>}
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          if (contractUrl) window.open(contractUrl, "_blank");
                          else showToast("O seu contrato será disponibilizado em breve pelo Atelier.");
                        }}
                        className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-roboto text-[11px] font-bold uppercase tracking-widest transition-colors shadow-sm duration-300 ${contractUrl ? 'bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] group-hover:-translate-y-1' : 'bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/40 cursor-not-allowed'}`}
                      >
                        {contractUrl ? <><LinkIcon size={16} /> Acessar Documento</> : 'Aguardando Documento'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}