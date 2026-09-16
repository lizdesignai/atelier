"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, User, Mail, Shield, Briefcase, DollarSign, Clock, 
  CheckCircle2, Copy, Check, Lock, Phone, 
  Loader2, UserPlus, Info
} from "lucide-react";
import { ALL_SKILLS } from "../../analytics/constants";

interface NovoColaboradorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserRole?: string;
}

const CARGO_SUGGESTIONS = [
  "Designer Gráfico",
  "Diretor(a) de Arte",
  "Motion Designer / Vídeo",
  "Copywriter & Estrategista",
  "Social Media",
  "UI/UX Designer",
  "Gestor(a) de Tráfego",
  "Web Designer",
  "Outro"
];

export default function NovoColaboradorModal({
  isOpen,
  onClose,
  onSuccess,
  currentUserRole = "admin"
}: NovoColaboradorModalProps) {
  // Form States
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"colaborador" | "gestor" | "admin">("colaborador");
  const [cargo, setCargo] = useState("");
  const [customCargo, setCustomCargo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [deadlineBufferDays, setDeadlineBufferDays] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["design"]);
  const [customPassword, setCustomPassword] = useState("");
  const [showAdvancedAuth, setShowAdvancedAuth] = useState(false);

  // Flow & Feedback States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUserData, setCreatedUserData] = useState<{
    nome: string;
    email: string;
    role: string;
    cargo?: string;
    password?: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const isAdmin = currentUserRole === "admin";

  const showToast = (message: string) => {
    window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
  };

  const handleToggleSkill = (skillId: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillId) 
        ? prev.filter(s => s !== skillId) 
        : [...prev, skillId]
    );
  };

  const resetForm = () => {
    setNome("");
    setEmail("");
    setRole("colaborador");
    setCargo("");
    setCustomCargo("");
    setTelefone("");
    setBaseSalary("");
    setDeadlineBufferDays(0);
    setSelectedSkills(["design"]);
    setCustomPassword("");
    setShowAdvancedAuth(false);
    setCreatedUserData(null);
    setIsCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !email.trim()) {
      showToast("Preencha o nome e o e-mail do colaborador.");
      return;
    }

    // Role check
    if (role === "admin" && !isAdmin) {
      showToast("Apenas administradores podem conceder a role de Admin.");
      return;
    }

    setIsSubmitting(true);
    const finalCargo = cargo === "Outro" ? customCargo.trim() : (cargo || customCargo.trim() || "Colaborador");
    const numericSalary = baseSalary ? parseFloat(baseSalary.replace(/\D/g, "")) / 100 : null;

    try {
      const response = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          role,
          cargo: finalCargo,
          telefone: telefone.trim() || null,
          baseSalary: numericSalary,
          deadlineBufferDays: Number(deadlineBufferDays) || 0,
          skills: selectedSkills,
          password: customPassword.trim() || undefined,
          empresa: "Atelier Equipe"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao cadastrar novo colaborador.");
      }

      // Success screen with credentials
      setCreatedUserData({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        role,
        cargo: finalCargo,
        password: data.defaultPassword || "Atelier2026!"
      });

      showToast("Colaborador cadastrado com sucesso!");
    } catch (err: any) {
      console.error("[NovoColaboradorModal] Erro:", err);
      showToast(err.message || "Não foi possível cadastrar o colaborador.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCredentials = () => {
    if (!createdUserData) return;
    const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "https://atelier.lizdesign.com.br/login";
    const text = `🎉 Bem-vindo(a) à equipe do Atelier!\n\nAqui estão seus acessos ao sistema de Produtividade & Gestão:\n• Link de Acesso: ${loginUrl}\n• E-mail: ${createdUserData.email}\n• Senha Provisória: ${createdUserData.password}\n• Função: ${createdUserData.cargo || createdUserData.role}\n\nRecomendamos alterar a sua senha no primeiro acesso nas configurações da conta.`;
    
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    showToast("Credenciais copiadas para a área de transferência!");
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleFinish = () => {
    onSuccess();
    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-2xl bg-white/95 backdrop-blur-2xl border border-white/80 rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col max-h-[92dvh]"
          >
            {/* CABEÇALHO DO MODAL */}
            <div className="shrink-0 flex items-center justify-between p-6 md:px-8 border-b border-gray-100 bg-white/60">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] shadow-sm">
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3 className="font-elegant text-2xl font-bold text-[var(--color-atelier-grafite)] tracking-tight">
                    {createdUserData ? "Colaborador Cadastrado!" : "Novo Colaborador"}
                  </h3>
                  <p className="text-xs text-gray-400 font-roboto mt-0.5">
                    {createdUserData 
                      ? "Envie as credenciais de acesso para o membro da equipe" 
                      : "Adicione um membro à equipe com atribuição de permissões e métricas"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-full bg-gray-100/80 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* CONTEÚDO DO MODAL */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              {createdUserData ? (
                /* TELA DE SUCESSO E CREDENCIAIS */
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="flex flex-col items-center text-center py-4 gap-6"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                    <CheckCircle2 size={36} />
                  </div>

                  <div>
                    <h4 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                      {createdUserData.nome} está a bordo!
                    </h4>
                    <p className="text-sm text-gray-500 font-roboto mt-1 max-w-md">
                      O perfil foi registrado com a role <strong className="uppercase text-[var(--color-atelier-terracota)]">{createdUserData.role}</strong> e já aparece nos gráficos de telemetria.
                    </p>
                  </div>

                  {/* CARTÃO DE CREDENCIAIS PRONTAS PARA COPIAR */}
                  <div className="w-full bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 text-left flex flex-col gap-3.5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-amber-200/50 pb-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800 flex items-center gap-1.5">
                        <Lock size={12} /> Credenciais de Acesso Inicial
                      </span>
                      <span className="text-[10px] bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                        Padrão Atelier
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">E-mail</span>
                        <span className="font-semibold text-gray-800 font-mono select-all">{createdUserData.email}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Senha Inicial</span>
                        <span className="font-semibold text-gray-800 font-mono select-all">{createdUserData.password}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Cargo</span>
                        <span className="font-semibold text-gray-800">{createdUserData.cargo}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Nível (Role)</span>
                        <span className="font-semibold text-[var(--color-atelier-terracota)] uppercase tracking-wider font-mono">{createdUserData.role}</span>
                      </div>
                    </div>
                  </div>

                  {/* BOTÕES DE AÇÃO PÓS-CADASTRO */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
                    <button
                      type="button"
                      onClick={copyCredentials}
                      className="w-full sm:flex-1 bg-white border border-gray-200 hover:border-[var(--color-atelier-terracota)] text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] font-bold text-xs uppercase tracking-wider py-3.5 px-5 rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2"
                    >
                      {isCopied ? (
                        <>
                          <Check size={16} className="text-emerald-600" />
                          <span className="text-emerald-700">Copiado para Área de Transferência!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          <span>Copiar Acesso para Enviar</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleFinish}
                      className="w-full sm:w-auto bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white font-bold text-xs uppercase tracking-wider py-3.5 px-8 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <span>Concluir & Ver Equipe</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* FORMULÁRIO DE CADASTRO */
                <form id="new-collaborator-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
                  
                  {/* SELEÇÃO DE ROLE (COM DESTAQUE VISUAL E DESCRIÇÕES) */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1 flex items-center gap-1.5">
                        <Shield size={12} className="text-[var(--color-atelier-terracota)]" /> Nível de Acesso (Role) *
                      </label>
                      {!isAdmin && (
                        <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                          <Info size={11} /> Admin restrito à alta liderança
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* CARD: COLABORADOR */}
                      <button
                        type="button"
                        onClick={() => setRole("colaborador")}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          role === "colaborador"
                            ? "border-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/5 shadow-sm ring-1 ring-[var(--color-atelier-terracota)]"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs uppercase tracking-wider text-[var(--color-atelier-grafite)]">Colaborador</span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            role === "colaborador" ? "border-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]" : "border-gray-300"
                          }`}>
                            {role === "colaborador" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-tight">
                          Acesso operacional: tarefas, cronômetro de foco e espelho de produtividade.
                        </p>
                      </button>

                      {/* CARD: GESTOR */}
                      <button
                        type="button"
                        onClick={() => setRole("gestor")}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          role === "gestor"
                            ? "border-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/5 shadow-sm ring-1 ring-[var(--color-atelier-terracota)]"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs uppercase tracking-wider text-[var(--color-atelier-grafite)]">Gestor / Líder</span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            role === "gestor" ? "border-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]" : "border-gray-300"
                          }`}>
                            {role === "gestor" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-tight">
                          Gestão de equipe, distribuição de demandas, aprovações e telemetria de RH.
                        </p>
                      </button>

                      {/* CARD: ADMIN */}
                      <button
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => isAdmin && setRole("admin")}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          !isAdmin 
                            ? "opacity-45 bg-gray-50 border-gray-200 cursor-not-allowed" 
                            : role === "admin"
                              ? "border-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/5 shadow-sm ring-1 ring-[var(--color-atelier-terracota)]"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs uppercase tracking-wider text-[var(--color-atelier-grafite)]">Administrador</span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            role === "admin" ? "border-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]" : "border-gray-300"
                          }`}>
                            {role === "admin" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-tight">
                          Controle total: segurança, financeiro global, parametrizações e exclusão.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* IDENTIFICAÇÃO BÁSICA (NOME E EMAIL) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Nome Completo *</label>
                      <div className="relative">
                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          placeholder="Ex: Beatriz Albuquerque"
                          className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-[var(--color-atelier-terracota)] focus:ring-1 focus:ring-[var(--color-atelier-terracota)] transition-all placeholder:text-gray-300"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">E-mail Corporativo *</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="colaborador@lizdesign.com.br"
                          className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-[var(--color-atelier-terracota)] focus:ring-1 focus:ring-[var(--color-atelier-terracota)] transition-all placeholder:text-gray-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* CARGO E TELEFONE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Cargo / Especialidade</label>
                      <div className="relative">
                        <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                          value={cargo}
                          onChange={(e) => setCargo(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-[var(--color-atelier-terracota)] focus:ring-1 focus:ring-[var(--color-atelier-terracota)] transition-all appearance-none"
                        >
                          <option value="">Selecione um cargo sugerido</option>
                          {CARGO_SUGGESTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      {(cargo === "Outro" || !cargo) && (
                        <input
                          type="text"
                          value={customCargo}
                          onChange={(e) => setCustomCargo(e.target.value)}
                          placeholder="Ou digite o cargo personalizado..."
                          className="w-full mt-1.5 bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs outline-none focus:border-[var(--color-atelier-terracota)]"
                        />
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">Telefone / WhatsApp</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          value={telefone}
                          onChange={(e) => setTelefone(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-[var(--color-atelier-terracota)] focus:ring-1 focus:ring-[var(--color-atelier-terracota)] transition-all placeholder:text-gray-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PARÂMETROS DE RH & ECONOMICS (SALÁRIO E BUFFER DE PRAZO) */}
                  <div className="p-4 bg-gray-50/70 border border-gray-200/80 rounded-2xl flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} className="text-[var(--color-atelier-terracota)]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">
                        Telemetria Econômica & SLA
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
                          Remuneração Base Mensal (R$)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">R$</span>
                          <input
                            type="text"
                            value={baseSalary}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              setBaseSalary(val ? (parseInt(val, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "");
                            }}
                            placeholder="3.500,00"
                            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-sm font-semibold outline-none focus:border-[var(--color-atelier-terracota)]"
                          />
                        </div>
                        <span className="text-[9px] text-gray-400">Alimenta o cálculo de custo de hora no Unit Economics.</span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
                          Buffer de Prazo Interno
                        </label>
                        <div className="relative">
                          <Clock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <select
                            value={deadlineBufferDays}
                            onChange={(e) => setDeadlineBufferDays(parseInt(e.target.value, 10))}
                            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-sm font-semibold outline-none focus:border-[var(--color-atelier-terracota)] appearance-none"
                          >
                            <option value={0}>0 dias (Entrega no prazo final do cliente)</option>
                            <option value={1}>1 dia de antecedência (Recomendado)</option>
                            <option value={2}>2 dias de antecedência (Alta segurança)</option>
                            <option value={3}>3 dias de antecedência</option>
                            <option value={5}>5 dias de antecedência</option>
                          </select>
                        </div>
                        <span className="text-[9px] text-gray-400">Garante margem para revisão interna antes do envio formal.</span>
                      </div>
                    </div>
                  </div>

                  {/* COMPETÊNCIAS / SKILLS DA ESTEIRA */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 ml-1">
                      Competências & Habilidades no Estúdio
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-white border border-gray-200 rounded-2xl">
                      {ALL_SKILLS.map(skill => {
                        const isSelected = selectedSkills.includes(skill.id);
                        return (
                          <button
                            key={skill.id}
                            type="button"
                            onClick={() => handleToggleSkill(skill.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-[var(--color-atelier-terracota)] text-white shadow-xs"
                                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                            <span>{skill.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CONFIGURAÇÃO DE ACESSO INICIAL */}
                  <div className="border-t border-gray-100 pt-4 flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedAuth(!showAdvancedAuth)}
                      className="text-[11px] font-bold text-[var(--color-atelier-terracota)] hover:underline flex items-center gap-1 self-start"
                    >
                      <Lock size={12} />
                      <span>{showAdvancedAuth ? "Ocultar personalização de senha" : "Definir senha inicial personalizada (Opcional)"}</span>
                    </button>

                    {showAdvancedAuth ? (
                      <div className="flex flex-col gap-1 max-w-sm mt-1">
                        <label className="text-[9px] uppercase tracking-wider font-bold text-gray-400">Senha Provisória (Mín. 6 caracteres)</label>
                        <input
                          type="text"
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          placeholder="Deixe em branco para usar Atelier2026!"
                          className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:border-[var(--color-atelier-terracota)] font-mono"
                        />
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400">
                        O colaborador receberá a senha padrão provisória <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[var(--color-atelier-grafite)] font-bold">Atelier2026!</code> que poderá ser trocada a qualquer momento.
                      </p>
                    )}
                  </div>

                </form>
              )}
            </div>

            {/* RODAPÉ DO MODAL (QUANDO EM EDIÇÃO) */}
            {!createdUserData && (
              <div className="shrink-0 p-6 md:px-8 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-3 rounded-2xl font-roboto font-bold uppercase tracking-widest text-xs text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="new-collaborator-form"
                  disabled={isSubmitting}
                  className="bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white px-8 py-3.5 rounded-2xl font-roboto font-bold uppercase tracking-widest text-xs transition-all shadow-md flex items-center justify-center gap-2 min-w-[160px] active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Cadastrar Colaborador</span>
                    </>
                  )}
                </button>
              </div>
            )}

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
