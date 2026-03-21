// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Fingerprint, ShieldCheck, Mail, KeyRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);


  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsAuthenticating(true);
    
    setTimeout(() => {
      // MACETE DEV: Simula níveis de acesso baseados no e-mail digitado
      let role = 'client';
      if (email.includes('admin')) role = 'admin';
      if (email.includes('gestor')) role = 'gestor';

      // Salva o token genérico e o papel do usuário
      localStorage.setItem("atelier_token", "token_autenticado");
      localStorage.setItem("atelier_role", role);
      
      // Redireciona de acordo com o cargo
      router.push(role === 'client' ? "/" : "/admin");
    }, 1500);
  };

  return (
    // O Container Master (Ocupa 100% da tela, sem rolagem)
    <div className="relative w-full h-screen overflow-hidden bg-[var(--color-atelier-creme)] flex items-center justify-center font-roboto selection:bg-[var(--color-atelier-terracota)] selection:text-white">
      
      {/* ==========================================
          1. LUZES VOLUMÉTRICAS (Os Orbs Flutuantes)
          ========================================== */}
      {/* Orb Terracota (Lado Esquerdo Superior) */}
      <motion.div 
        animate={{ 
          x: [0, 50, -20, 0], 
          y: [0, -30, 40, 0],
          scale: [1, 1.1, 0.9, 1]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-[var(--color-atelier-terracota)]/15 rounded-full blur-[120px] pointer-events-none"
      />
      
      {/* Orb Rose (Lado Direito Inferior) */}
      <motion.div 
        animate={{ 
          x: [0, -60, 30, 0], 
          y: [0, 50, -20, 0],
          scale: [1, 1.2, 0.8, 1]
        }}
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
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-10 md:p-12 rounded-[3rem] shadow-[0_30px_60px_rgba(122,116,112,0.12)] flex flex-col items-center relative overflow-hidden group">
          
          {/* Reflexo de luz na borda superior do vidro */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80"></div>

          {/* O Logo Animado */}
          <div className="relative w-14 h-14 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-[var(--color-atelier-terracota)] blur-xl opacity-20 animate-pulse"></div>
            <img 
              src="/images/Símbolo Rosa.png" 
              alt="Atelier Logo" 
              className="w-full h-full object-contain relative z-10 animate-[pulse_3s_ease-in-out_infinite]"
            />
          </div>

          <div className="text-center mb-10 w-full">
            <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-2 tracking-tight">
              Acesso <span className="text-[var(--color-atelier-terracota)] italic">Restrito.</span>
            </h1>
            <p className="text-[13px] text-[var(--color-atelier-grafite)]/60 leading-relaxed font-medium">
              Insira suas credenciais exclusivas para adentrar o ecossistema da sua marca.
            </p>
          </div>

          {/* ==========================================
              3. O FORMULÁRIO MAGNÉTICO
              ========================================== */}
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-5">
            
            {/* Input de Email */}
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors">
                <Mail size={18} strokeWidth={1.5} />
              </div>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail de Acesso" 
                className="w-full bg-white/60 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-full py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 outline-none transition-all shadow-sm focus:shadow-[0_10px_20px_rgba(173,111,64,0.08)]"
              />
            </div>

            {/* Input de Senha */}
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors">
                <KeyRound size={18} strokeWidth={1.5} />
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              
              <button type="button" className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-grafite)] transition-colors">
                Perdeu a chave?
              </button>
            </div>

            {/* Botão de Submissão Cinético */}
            <button 
              type="submit" 
              disabled={isAuthenticating}
              className={`
                w-full relative overflow-hidden rounded-full font-roboto font-bold uppercase tracking-[0.2em] text-[12px] h-14 flex items-center justify-center gap-3 transition-all duration-500
                ${isAuthenticating 
                  ? 'bg-transparent border border-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)]' 
                  : 'bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] hover:bg-[var(--color-atelier-terracota)] hover:text-white hover:shadow-[0_15px_30px_rgba(173,111,64,0.3)] hover:-translate-y-1'
                }
              `}
            >
              {isAuthenticating ? (
                <>
                  <Fingerprint size={18} className="animate-pulse" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <Lock size={16} /> Entrar no Cofre
                </>
              )}
            </button>
          </form>

        </div>

        {/* Rodapé de Segurança e Credibilidade */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 1 }}
          className="mt-8 flex justify-center items-center gap-2 text-[10px] font-roboto uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40"
        >
          <ShieldCheck size={14} /> Ambiente Criptografado
        </motion.div>

      </motion.div>

    </div>
  );
}