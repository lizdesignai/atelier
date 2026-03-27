// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Fingerprint, ShieldCheck, Mail, KeyRound, UserPlus, User } from "lucide-react";
import { supabase } from "../../lib/supabase"; // Conexão com o Supabase

// Função para disparar os Toasts Globais
const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function LoginPage() {
  const router = useRouter();
  
  // Estados do Formulário
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsAuthenticating(true);
    
    try {
      if (isLoginMode) {
        // ==========================================
        // FLUXO DE LOGIN (SIGN IN)
        // ==========================================
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        // Busca o Perfil para saber se é Admin ou Client
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw profileError;

        const role = profile?.role || 'client';

        // Mantém a compatibilidade com a blindagem do layout.tsx
        localStorage.setItem("atelier_token", authData.session.access_token);
        localStorage.setItem("atelier_role", role);
        
        showToast("Acesso autorizado. A abrir o cofre...");
        router.push(role === 'client' ? "/" : "/admin");

      } else {
        // ==========================================
        // FLUXO DE CRIAÇÃO DE CONTA (SIGN UP)
        // ==========================================
        if (!nome) {
          showToast("O nome é obrigatório para o registo.");
          setIsAuthenticating(false);
          return;
        }

        // Macete Dev: Se o email tiver 'admin' ou 'gestor', ganha o cargo. Senão, 'client'.
        let newRole = 'client';
        if (email.includes('admin')) newRole = 'admin';
        if (email.includes('gestor')) newRole = 'gestor';

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome: nome,
              role: newRole
            }
          }
        });

        if (authError) throw authError;

        showToast("Chave forjada com sucesso! Faça login para entrar.");
        setIsLoginMode(true); // Volta para a tela de login
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message === "Invalid login credentials" ? "Credenciais inválidas. Tente novamente." : error.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    // O Container Master (Ocupa 100% da tela, sem rolagem)
    <div className="relative w-full h-screen overflow-hidden bg-[var(--color-atelier-creme)] flex items-center justify-center font-roboto selection:bg-[var(--color-atelier-terracota)] selection:text-white">
      
      {/* ==========================================
          1. LUZES VOLUMÉTRICAS (Os Orbs Flutuantes)
          ========================================== */}
      <motion.div 
        animate={{ x: [0, 50, -20, 0], y: [0, -30, 40, 0], scale: [1, 1.1, 0.9, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-[var(--color-atelier-terracota)]/15 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div 
        animate={{ x: [0, -60, 30, 0], y: [0, 50, -20, 0], scale: [1, 1.2, 0.8, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[700px] bg-[var(--color-atelier-rose)]/15 rounded-full blur-[150px] pointer-events-none"
      />

      {/* ==========================================
          2. O PAINEL DE ACESSO (O Cofre de Vidro)
          ========================================== */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[440px] px-6"
      >
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-10 md:p-12 rounded-[3rem] shadow-[0_30px_60px_rgba(122,116,112,0.12)] flex flex-col items-center relative overflow-hidden group transition-all duration-500">
          
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80"></div>

          {/* O Logo Animado */}
          <div className="relative w-14 h-14 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-[var(--color-atelier-terracota)] blur-xl opacity-20 animate-pulse"></div>
            <img src="/images/Simbolo Rosa.png" alt="Atelier Logo" className="w-full h-full object-contain relative z-10 animate-[pulse_3s_ease-in-out_infinite]" />
          </div>

          <div className="text-center mb-10 w-full">
            <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-2 tracking-tight">
              {isLoginMode ? (
                <>Acesso <span className="text-[var(--color-atelier-terracota)] italic">Restrito.</span></>
              ) : (
                <>Nova <span className="text-[var(--color-atelier-terracota)] italic">Chave.</span></>
              )}
            </h1>
            <p className="text-[13px] text-[var(--color-atelier-grafite)]/60 leading-relaxed font-medium">
              {isLoginMode 
                ? "Insira suas credenciais exclusivas para adentrar o ecossistema da sua marca."
                : "Forje um novo acesso para entrar no ecossistema do Atelier."}
            </p>
          </div>

          {/* ==========================================
              3. O FORMULÁRIO MAGNÉTICO INTEGRADO
              ========================================== */}
          <form onSubmit={handleAuth} className="w-full flex flex-col gap-5">
            
            <AnimatePresence mode="popLayout">
              {!isLoginMode && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="relative group/input"
                >
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors">
                    <User size={18} strokeWidth={1.5} />
                  </div>
                  <input 
                    type="text" required={!isLoginMode} value={nome} onChange={(e) => setNome(e.target.value)}
                    placeholder="O seu Nome" 
                    className="w-full bg-white/60 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-full py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 outline-none transition-all shadow-sm focus:shadow-[0_10px_20px_rgba(173,111,64,0.08)]"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group/input">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors">
                <Mail size={18} strokeWidth={1.5} />
              </div>
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail de Acesso" 
                className="w-full bg-white/60 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-full py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 outline-none transition-all shadow-sm focus:shadow-[0_10px_20px_rgba(173,111,64,0.08)]"
              />
            </div>

            <div className="relative group/input">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors">
                <KeyRound size={18} strokeWidth={1.5} />
              </div>
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Chave de Segurança" 
                className="w-full bg-white/60 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-full py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 outline-none transition-all shadow-sm focus:shadow-[0_10px_20px_rgba(173,111,64,0.08)]"
              />
            </div>

            <div className="flex justify-between items-center px-2 mt-1 mb-2">
              <label className="flex items-center gap-2 cursor-pointer group/check">
                <div className="w-4 h-4 rounded border border-[var(--color-atelier-grafite)]/30 group-hover/check:border-[var(--color-atelier-terracota)] flex items-center justify-center transition-colors">
                  <div className="w-2 h-2 rounded-sm bg-transparent group-hover/check:bg-[var(--color-atelier-terracota)]/50 transition-colors"></div>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 group-hover/check:text-[var(--color-atelier-grafite)] transition-colors">Lembrar acesso</span>
              </label>
              
              <button 
                type="button" 
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-grafite)] transition-colors"
              >
                {isLoginMode ? "Criar Conta?" : "Já tem chave?"}
              </button>
            </div>

            {/* Botão de Submissão Cinético */}
            <button 
              type="submit" disabled={isAuthenticating}
              className={`
                w-full relative overflow-hidden rounded-full font-roboto font-bold uppercase tracking-[0.2em] text-[12px] h-14 flex items-center justify-center gap-3 transition-all duration-500
                ${isAuthenticating 
                  ? 'bg-transparent border border-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)]' 
                  : 'bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] hover:bg-[var(--color-atelier-terracota)] hover:text-white hover:shadow-[0_15px_30px_rgba(173,111,64,0.3)] hover:-translate-y-1'
                }
              `}
            >
              {isAuthenticating ? (
                <><Fingerprint size={18} className="animate-pulse" /><span>Sincronizando...</span></>
              ) : isLoginMode ? (
                <><Lock size={16} /> Entrar no Cofre</>
              ) : (
                <><UserPlus size={16} /> Forjar Chave</>
              )}
            </button>
          </form>

        </div>

        {/* Rodapé de Segurança e Credibilidade */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 1 }}
          className="mt-8 flex justify-center items-center gap-2 text-[10px] font-roboto uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40"
        >
          <ShieldCheck size={14} /> Ambiente Criptografado Ponta a Ponta
        </motion.div>

      </motion.div>

    </div>
  );
}