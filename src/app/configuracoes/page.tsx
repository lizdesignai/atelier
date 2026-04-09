// src/app/configuracoes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, User, Briefcase, FileText, Camera, 
  ShieldCheck, Save, Calendar, MapPin, Download, Loader2, Link as LinkIcon, KeyRound, CheckCircle2, Lock, Instagram, Clock
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { NotificationEngine } from "../../lib/NotificationEngine"; // 🔔 INJEÇÃO DO MOTOR DE NOTIFICAÇÕES

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
    endereco: "",
    instagram: "" // NOVO: Campo de Instagram
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
              endereco: profile.endereco || "",
              instagram: profile.instagram || "" // Carrega o Instagram do DB
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
    showToast("A sincronizar dados com o ecossistema...");
    
    try {
      // Formata o @ do instagram caso o cliente esqueça ou coloque a url inteira
      let cleanInstagram = formData.instagram.trim();
      if (cleanInstagram.includes('instagram.com/')) {
        cleanInstagram = cleanInstagram.split('instagram.com/')[1].split('/')[0];
      }
      if (cleanInstagram && !cleanInstagram.startsWith('@')) {
        cleanInstagram = `@${cleanInstagram}`;
      }

      const updateData: any = {
        nome: formData.nome,
        aniversario: formData.aniversario || null,
        bio: formData.bio,
        endereco: formData.endereco,
        avatar_url: avatar,
        instagram: cleanInstagram
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

      // 🔔 NOTIFICAÇÃO: Se for cliente, avisa a gestão da atualização de dados (CRM)
      if (userRole === 'client') {
        await NotificationEngine.notifyManagement(
          "📝 CRM: Perfil Atualizado",
          `O cliente ${formData.nome} atualizou as suas informações de perfil/empresa.`,
          "info",
          "/admin/clientes"
        );
      }

      setFormData(prev => ({ ...prev, instagram: cleanInstagram }));
      showToast("✨ Definições guardadas e atualizadas no sistema.");
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
      <div className="flex items-center justify-center h-[calc(100vh-100px)] w-full">
        <Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1300px] mx-auto relative z-10 pb-6 gap-8 px-4 md:px-0">
      
      {/* ==========================================
          1. CABEÇALHO
          ========================================== */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 mt-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-[1rem] bg-white border border-white flex items-center justify-center shadow-sm">
              <Settings size={18} className="text-[var(--color-atelier-terracota)]" />
            </div>
            <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60">Painel de Controlo</span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none mt-2">
            Ajustes e <span className="text-[var(--color-atelier-terracota)] italic">Privacidade.</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 max-w-md text-left md:text-right font-medium leading-relaxed bg-white/40 p-4 rounded-2xl border border-white shadow-sm">
            Faça a gestão dos seus dados pessoais, informações profissionais e consulte a documentação jurídica do seu projeto.
          </p>
        </div>
      </header>

      {/* ==========================================
          2. ESTRUTURA DE NAVEGAÇÃO E FORMULÁRIO
          ========================================== */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* COLUNA ESQUERDA: MENU E AVATAR */}
        <div className="w-full lg:w-[340px] flex flex-col gap-6 shrink-0 h-full overflow-y-auto custom-scrollbar pr-2 pb-6">
          
          {/* Editor de Avatar Magnético */}
          <div className="glass-panel p-8 rounded-[3rem] bg-white/40 border border-white shadow-sm flex flex-col items-center justify-center text-center shrink-0 transition-colors hover:bg-white/60">
            <div className="relative group cursor-pointer mb-6">
              <div className="w-32 h-32 rounded-[1.5rem] border-4 border-white shadow-md overflow-hidden bg-[var(--color-atelier-creme)] relative z-10 flex items-center justify-center font-elegant text-5xl text-[var(--color-atelier-terracota)] group-hover:scale-105 transition-transform duration-500">
                {avatar.includes('ui-avatars') && !avatar.includes('http') ? formData.nome.charAt(0) || "U" : <img src={avatar} alt="Perfil" className="w-full h-full object-cover" />}
              </div>
              <label className="absolute inset-0 bg-[var(--color-atelier-grafite)]/40 rounded-[1.5rem] flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 cursor-pointer backdrop-blur-sm m-1">
                <Camera size={24} className="mb-1.5" />
                <span className="font-roboto text-[9px] font-bold uppercase tracking-widest">Alterar Foto</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
              {/* Ornamento Traseiro */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-2xl group-hover:bg-[var(--color-atelier-terracota)]/20 transition-colors z-0"></div>
            </div>
            <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">{formData.nome || "Utilizador"}</h2>
            <span className="inline-block mt-3 px-3 py-1.5 rounded-md bg-[var(--color-atelier-terracota)]/10 border border-[var(--color-atelier-terracota)]/20 font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)]">
              {isTeamMember ? (formData.cargo || 'Membro da Equipa') : (formData.empresa || 'Cliente Premium')}
            </span>
          </div>

          {/* Menu Lateral de Definições */}
          <div className="glass-panel p-4 rounded-[2.5rem] bg-white/40 border border-white shadow-sm flex flex-col gap-2 shrink-0">
            <button 
              onClick={() => setActiveTab("perfil")}
              className={`px-5 py-4 rounded-[1.5rem] flex items-center gap-4 transition-all ${activeTab === "perfil" ? "bg-white shadow-md text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/10 scale-[1.02]" : "text-[var(--color-atelier-grafite)]/60 hover:bg-white hover:text-[var(--color-atelier-grafite)] border border-transparent"}`}
            >
              <User size={20} />
              <div className="flex flex-col text-left">
                <span className="font-roboto text-[13px] font-bold">Identidade Pessoal</span>
                <span className="font-roboto text-[10px] uppercase tracking-widest opacity-60 mt-0.5">Nome, Bio, Social</span>
              </div>
            </button>

            <button 
              onClick={() => setActiveTab("empresa")}
              className={`px-5 py-4 rounded-[1.5rem] flex items-center gap-4 transition-all ${activeTab === "empresa" ? "bg-white shadow-md text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/10 scale-[1.02]" : "text-[var(--color-atelier-grafite)]/60 hover:bg-white hover:text-[var(--color-atelier-grafite)] border border-transparent"}`}
            >
              <Briefcase size={20} />
              <div className="flex flex-col text-left">
                <span className="font-roboto text-[13px] font-bold">{isTeamMember ? 'Posição no Atelier' : 'Dados da Empresa'}</span>
                <span className="font-roboto text-[10px] uppercase tracking-widest opacity-60 mt-0.5">{isTeamMember ? 'Cargo' : 'NIF, Endereço'}</span>
              </div>
            </button>

            {/* ABA DE SEGURANÇA */}
            <button 
              onClick={() => setActiveTab("seguranca")}
              className={`px-5 py-4 rounded-[1.5rem] flex items-center gap-4 transition-all ${activeTab === "seguranca" ? "bg-white shadow-md text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/10 scale-[1.02]" : "text-[var(--color-atelier-grafite)]/60 hover:bg-white hover:text-[var(--color-atelier-grafite)] border border-transparent"}`}
            >
              <KeyRound size={20} />
              <div className="flex flex-col text-left">
                <span className="font-roboto text-[13px] font-bold">Segurança & Acesso</span>
                <span className="font-roboto text-[10px] uppercase tracking-widest opacity-60 mt-0.5">Redefinir Senha</span>
              </div>
            </button>

            {!isTeamMember && (
              <button 
                onClick={() => setActiveTab("contrato")}
                className={`px-5 py-4 rounded-[1.5rem] flex items-center gap-4 transition-all ${activeTab === "contrato" ? "bg-white shadow-md text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/10 scale-[1.02]" : "text-[var(--color-atelier-grafite)]/60 hover:bg-white hover:text-[var(--color-atelier-grafite)] border border-transparent"}`}
              >
                <FileText size={20} />
                <div className="flex flex-col text-left">
                  <span className="font-roboto text-[13px] font-bold">Contrato & Jurídico</span>
                  <span className="font-roboto text-[10px] uppercase tracking-widest opacity-60 mt-0.5">Termos e Condições</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: O FORMULÁRIO DINÂMICO */}
        <div className="flex-1 glass-panel rounded-[3rem] bg-white/60 border border-white flex flex-col relative overflow-hidden shadow-sm h-full">
          
          <AnimatePresence mode="wait">
            
            {/* ==========================================
                ABA: PERFIL & EMPRESA (Agrupadas no mesmo Form)
                ========================================== */}
            {(activeTab === "perfil" || activeTab === "empresa") && (
              <motion.form key="dados-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleSave} className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 flex flex-col gap-10">
                    
                    {activeTab === "perfil" ? (
                      <>
                        <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-6">
                          <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">Informações Pessoais</h2>
                          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 font-medium">Como o Atelier se dirige a si, e os links da sua rede.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="flex flex-col gap-2 group/input">
                            <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 transition-colors">Nome Completo</label>
                            <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.2rem] px-5 py-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" />
                          </div>
                          <div className="flex flex-col gap-2 group/input">
                            <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 transition-colors">Email Principal</label>
                            <input type="email" value={formData.email} disabled className="bg-white/40 border border-transparent rounded-[1.2rem] px-5 py-4 text-[13px] font-medium outline-none text-[var(--color-atelier-grafite)]/40 cursor-not-allowed shadow-inner" />
                            <span className="text-[9px] pl-2 text-[var(--color-atelier-grafite)]/40 font-bold uppercase tracking-widest">E-mail de acesso não mutável.</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* NOVO CAMPO: Instagram */}
                          <div className="flex flex-col gap-2 group/input">
                            <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 flex items-center gap-1.5 transition-colors">
                              <Instagram size={14}/> Instagram da Marca
                            </label>
                            <input type="text" value={formData.instagram} onChange={(e) => setFormData({...formData, instagram: e.target.value})} className="bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.2rem] px-5 py-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" placeholder="@suamarca" />
                          </div>
                          
                          <div className="flex flex-col gap-2 group/input">
                            <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 flex items-center gap-1.5 transition-colors">
                              <Calendar size={14}/> Data de Aniversário
                            </label>
                            <input type="date" value={formData.aniversario} onChange={(e) => setFormData({...formData, aniversario: e.target.value})} className="bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.2rem] px-5 py-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm cursor-pointer transition-all" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 group/input">
                          <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 transition-colors">Biografia / Resumo Profissional</label>
                          <textarea value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} className="bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] px-6 py-5 text-[13px] font-medium text-[var(--color-atelier-grafite)] min-h-[140px] resize-none outline-none shadow-sm custom-scrollbar transition-all" placeholder="Fale-nos um pouco sobre a sua visão e sobre si..." />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-6">
                          <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">{isTeamMember ? 'Posição no Atelier' : 'Dados Fiscais da Empresa'}</h2>
                          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 font-medium">{isTeamMember ? 'Identifique o seu cargo oficial perante os clientes.' : 'Informações essenciais para faturação e emissão de recibos.'}</p>
                        </div>

                        {isTeamMember ? (
                          // VISÃO DO ADMIN: Apenas o Cargo
                          <div className="flex flex-col gap-2 group/input w-full md:w-1/2">
                            <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 transition-colors">O seu Cargo Oficial</label>
                            <input type="text" value={formData.cargo} onChange={(e) => setFormData({...formData, cargo: e.target.value})} className="bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.2rem] px-5 py-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" placeholder="Ex: Lead Designer, Gestora Criativa..." />
                          </div>
                        ) : (
                          // VISÃO DO CLIENTE: Dados da Empresa
                          <div className="flex flex-col gap-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="flex flex-col gap-2 group/input">
                                <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 transition-colors">Nome da Empresa</label>
                                <input type="text" value={formData.empresa} onChange={(e) => setFormData({...formData, empresa: e.target.value})} className="bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.2rem] px-5 py-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" placeholder="A sua Holding ou Empresa Lda." />
                              </div>
                              <div className="flex flex-col gap-2 group/input">
                                <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 transition-colors">NIF / CNPJ</label>
                                <input type="text" value={formData.nif} onChange={(e) => setFormData({...formData, nif: e.target.value})} className="bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.2rem] px-5 py-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm font-mono transition-all" placeholder="000.000.000" />
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 group/input">
                              <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 flex items-center gap-2 transition-colors">
                                <MapPin size={14} /> Endereço Fiscal Completo
                              </label>
                              <input type="text" value={formData.endereco} onChange={(e) => setFormData({...formData, endereco: e.target.value})} className="bg-white border border-transparent focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.2rem] px-5 py-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" placeholder="Rua, Número, Código Postal, País" />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                </div>
                
                {/* Rodapé de Guardar (Fixo no Fundo para Perfil e Empresa) */}
                <div className="p-8 bg-white/60 backdrop-blur-xl border-t border-[var(--color-atelier-grafite)]/5 shrink-0 flex justify-end">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className={`
                      px-10 h-14 rounded-[1.5rem] font-roboto font-bold uppercase tracking-[0.1em] text-[11px] flex items-center justify-center gap-3 transition-all shadow-md w-full md:w-auto
                      ${isSaving 
                        ? 'bg-transparent border border-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)] shadow-none' 
                        : 'bg-[var(--color-atelier-terracota)] text-white hover:bg-[#8c562e] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0'
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
              </motion.form>
            )}

            {/* ==========================================
                ABA: SEGURANÇA E SENHA (Formulário Independente)
                ========================================== */}
            {activeTab === "seguranca" && (
              <motion.form key="security-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleChangePassword} className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 flex flex-col gap-8">
                  
                  <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-6">
                    <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
                      Segurança & Credenciais
                    </h2>
                    <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 font-medium">Altere a sua palavra-passe de acesso ao estúdio.</p>
                  </div>

                  <div className="bg-white border border-white p-8 rounded-[2.5rem] shadow-sm flex flex-col gap-6 max-w-xl">
                    <div className="flex flex-col gap-2 group/input">
                      <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 flex items-center gap-1.5 transition-colors">
                        <Lock size={14}/> Nova Palavra-Passe
                      </label>
                      <input 
                        type="password" 
                        required
                        minLength={6}
                        placeholder="Mínimo de 6 caracteres"
                        value={passwordData.newPassword} 
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} 
                        className="bg-gray-50/50 border border-gray-100 focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.2rem] px-5 py-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-inner transition-all" 
                      />
                    </div>
                    
                    <div className="flex flex-col gap-2 group/input">
                      <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 group-focus-within/input:text-[var(--color-atelier-terracota)] pl-1 flex items-center gap-1.5 transition-colors">
                        <CheckCircle2 size={14}/> Confirmar Palavra-Passe
                      </label>
                      <input 
                        type="password" 
                        required
                        minLength={6}
                        placeholder="Repita a senha para confirmar"
                        value={passwordData.confirmPassword} 
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} 
                        className="bg-gray-50/50 border border-gray-100 focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.2rem] px-5 py-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-inner transition-all" 
                      />
                    </div>
                  </div>
                  
                  <div className="bg-orange-50/80 border border-orange-100 p-5 rounded-[1.5rem] flex items-start gap-4 max-w-xl shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 shrink-0"><ShieldCheck size={18} /></div>
                    <p className="text-[12px] text-orange-900 leading-relaxed font-medium mt-0.5">As suas credenciais são encriptadas de ponta a ponta. O Atelier não tem acesso visual à sua palavra-passe, garantindo privacidade absoluta na base de dados.</p>
                  </div>

                </div>
                
                <div className="p-8 bg-white/60 backdrop-blur-xl border-t border-[var(--color-atelier-grafite)]/5 shrink-0 flex justify-end">
                  <button 
                    type="submit"
                    disabled={isChangingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    className={`
                      px-10 h-14 rounded-[1.5rem] font-roboto font-bold uppercase tracking-[0.1em] text-[11px] flex items-center justify-center gap-3 transition-all shadow-md w-full md:w-auto
                      ${isChangingPassword 
                        ? 'bg-transparent border border-[var(--color-atelier-grafite)] text-[var(--color-atelier-grafite)]/50 shadow-none' 
                        : 'bg-[var(--color-atelier-grafite)] text-white hover:bg-black hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0'
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
              </motion.form>
            )}

            {/* ==========================================
                ABA: CONTRATO JURÍDICO (APENAS PARA CLIENTES)
                ========================================== */}
            {activeTab === "contrato" && !isTeamMember && (
              <motion.div key="contrato" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-8 h-full p-8 md:p-12">
                <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-6">
                  <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">Auditoria e Jurídico</h2>
                  <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 font-medium">Transparência total. O seu contrato blindado e acessível a qualquer momento.</p>
                </div>

                <div className="flex-1 flex items-center justify-center pb-10">
                  <div className="bg-white p-10 rounded-[3rem] border border-white shadow-sm max-w-lg w-full flex flex-col items-center text-center group hover:shadow-md hover:border-[var(--color-atelier-terracota)]/20 transition-all">
                    <div className={`w-24 h-24 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-inner border ${contractUrl ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-500 border-orange-100'}`}>
                      <ShieldCheck size={36} />
                    </div>
                    <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-3 leading-tight">Contrato de Prestação de Serviços</h3>
                    <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mb-8 font-medium leading-relaxed px-4">Assinado digitalmente. Todas as cláusulas de direitos de imagem, autoria e entregáveis estão garantidas.</p>
                    
                    <div className="w-full flex flex-col gap-4">
                      <div className="bg-gray-50 px-5 py-4 rounded-[1.2rem] flex justify-between items-center text-[11px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 border border-gray-100">
                        <span>Status de Validação:</span>
                        {contractUrl ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={14}/> Disponível</span> : <span className="text-orange-500 flex items-center gap-1"><Clock size={14}/> Em preparação</span>}
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          if (contractUrl) window.open(contractUrl, "_blank");
                          else showToast("O seu contrato será disponibilizado em breve pelo Atelier.");
                        }}
                        className={`w-full py-4 rounded-[1.2rem] flex items-center justify-center gap-3 font-roboto text-[11px] font-bold uppercase tracking-[0.1em] transition-all shadow-sm duration-300 ${contractUrl ? 'bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] hover:-translate-y-0.5' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}
                      >
                        {contractUrl ? <><LinkIcon size={16} /> Acessar Documento</> : 'Aguardando Arquivo'}
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