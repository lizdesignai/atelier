// src/app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, Fingerprint, ShieldCheck, Mail, KeyRound, 
  UserPlus, User, Building2, Package, Instagram, 
  Loader2, ArrowLeft, RefreshCw
} from "lucide-react";
import { supabase } from "../../lib/supabase"; 

// Função para disparar os Toasts Globais
const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ==========================================
// COMPONENTE: MOSAICO COREOGRAFADO (BACKGROUND)
// ==========================================
// Gera o array inicial de 1 ao 20
const INITIAL_LOGOS = Array.from({ length: 20 }, (_, i) => `${i + 1}`);

function LogoMosaic({ isSuccess }: { isSuccess: boolean }) {
  const [logoOrder, setLogoOrder] = useState<string[]>(INITIAL_LOGOS);

  useEffect(() => {
    // Algoritmo que embaralha organicamente 4 logos de lugar a cada 6 segundos
    const interval = setInterval(() => {
      setLogoOrder(prev => {
        const newArr = [...prev];
        for (let i = 0; i < 2; i++) {
          const idx1 = Math.floor(Math.random() * newArr.length);
          const idx2 = Math.floor(Math.random() * newArr.length);
          [newArr[idx1], newArr[idx2]] = [newArr[idx2], newArr[idx1]];
        }
        return newArr;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Inteligência de Fallback: Tenta carregar PNG, se falhar, tenta SVG.
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const currentSrc = e.currentTarget.src;
    if (currentSrc.includes('.png')) {
      e.currentTarget.src = currentSrc.replace('.png', '.svg');
    } else {
      e.currentTarget.style.display = 'none'; // Se ambos falharem, oculta o slot silenciosamente
    }
  };

  return (
    <div className={`absolute inset-0 z-0 grid grid-cols-4 md:grid-cols-5 lg:grid-cols-5 gap-4 md:gap-8 p-4 md:p-12 items-center justify-items-center transition-all duration-1000 ${isSuccess ? 'scale-105' : 'scale-100'}`}>
      {logoOrder.map((logoId) => (
        <motion.img
          layout
          key={logoId} // O key garante que o layout animation rastreie quem trocou de lugar
          src={`/images/login/${logoId}.png`}
          onError={handleImageError}
          transition={{ type: "spring", stiffness: 30, damping: 25 }} // Movimento suave e majestoso
          className={`
            w-12 h-12 md:w-20 md:h-20 lg:w-28 lg:h-28 object-contain transition-all duration-1000
            ${isSuccess 
              ? 'grayscale-0 opacity-100 drop-shadow-xl scale-110' 
              : 'grayscale opacity-15 hover:opacity-40 hover:grayscale-0 hover:scale-105'
            }
          `}
          alt={`Logo Atelier ${logoId}`}
        />
      ))}
    </div>
  );
}


export default function LoginPage() {
  const router = useRouter();
  
  // Estados do Formulário
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [servico, setServico] = useState("");
  const [instagram, setInstagram] = useState(""); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSuccessState, setIsSuccessState] = useState(false); // Gatilho da transição cinematográfica

  // ==========================================
  // LÓGICA DE AUTENTICAÇÃO E CRIAÇÃO
  // ==========================================
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsAuthenticating(true);
    const cleanEmail = email.trim();
    
    // Formatar o Instagram
    let cleanInstagram = instagram.trim();
    if (cleanInstagram && !cleanInstagram.startsWith('@') && !cleanInstagram.includes('instagram.com/')) {
      cleanInstagram = `@${cleanInstagram}`;
    } else if (cleanInstagram.includes('instagram.com/')) {
      cleanInstagram = `@${cleanInstagram.split('instagram.com/')[1].split('/')[0]}`;
    }
    
    try {
      // Limpeza preventiva de sessão fantasma
      try { await supabase.auth.signOut(); } catch (e) {}

      if (authMode === 'login') {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (authError) throw authError;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw profileError;

        const role = profile?.role || 'client';

        localStorage.setItem("atelier_token", authData.session.access_token);
        localStorage.setItem("atelier_role", role);
        
        showToast("Acesso autorizado. Preparando o seu espaço...");
        
        // Ativa a animação cinematográfica de sucesso
        setIsSuccessState(true);
        
        // Aguarda 1.5s visualizando as logos coloridas antes de fazer o redirecionamento
        setTimeout(() => {
          router.push(role === 'client' ? "/" : "/admin");
        }, 1500);

      } else if (authMode === 'register') {
        if (!nome || !empresa || !servico || !password) {
          showToast("Preencha todos os campos obrigatórios.");
          setIsAuthenticating(false);
          return;
        }

        let newRole = 'client';
        if (cleanEmail.includes('admin')) newRole = 'admin';
        if (cleanEmail.includes('gestor')) newRole = 'gestor';
        if (cleanEmail.includes('colab')) newRole = 'colaborador';

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              nome: nome,
              empresa: empresa, 
              role: newRole,
              instagram: cleanInstagram
            }
          }
        });

        if (authError) throw authError;

        if (newRole === 'client' && authData.user) {
          const { error: projectError } = await supabase.from('projects').insert({
            client_id: authData.user.id,
            name: `Projeto ${empresa}`,
            type: servico,
            status: 'active',
            brand_health_score: 100,
            current_focus: 'Diagnóstico Estratégico Iniciado'
          });
          if (projectError) console.error("Erro ao gerar projeto automático:", projectError);
        }

        showToast("Conta criada com sucesso! Você já pode acessar.");
        setAuthMode('login');
      }

    } catch (error: any) {
      console.error(error);
      showToast(error.message === "Invalid login credentials" ? "Credenciais inválidas. Tente novamente." : error.message);
    } finally {
      if (!isSuccessState) setIsAuthenticating(false); // Só remove o loading se não estivermos na transição de sucesso
    }
  };

  // ==========================================
  // LÓGICA DE RECUPERAÇÃO DE SENHA
  // ==========================================
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast("Insira o seu e-mail para receber o link de recuperação.");
      return;
    }
    
    setIsAuthenticating(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/update-password`, // Adapte a rota de redefinição se necessário
      });
      if (error) throw error;
      
      showToast("Enviamos um link seguro de recuperação para o seu e-mail.");
      setAuthMode('login');
    } catch (error: any) {
      showToast("Erro ao tentar recuperar a senha: " + error.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#faf7f2] flex items-center justify-center font-roboto selection:bg-[var(--color-atelier-terracota)] selection:text-white">
      
      {/* BACKGROUND DINÂMICO: MOSAICO DE LOGOS */}
      <LogoMosaic isSuccess={isSuccessState} />

      {/* ==========================================
          O PAINEL DE ACESSO (O Cofre de Vidro)
          ========================================== */}
      <AnimatePresence>
        {!isSuccessState && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95, filter: "blur(10px)" }} // Saída suave revelando o fundo
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[460px] px-6"
          >
            <div className="bg-white/60 backdrop-blur-2xl border border-white p-10 md:p-12 rounded-[3.5rem] shadow-[0_30px_80px_rgba(122,116,112,0.2)] flex flex-col items-center relative overflow-hidden group transition-all duration-500">
              
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-100"></div>

              {/* O Logo Animado */}
              <div className="relative w-14 h-14 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 bg-[var(--color-atelier-terracota)] blur-xl opacity-20 animate-pulse"></div>
                <img src="/images/simbolo-rosa.png" alt="Atelier Logo" className="w-full h-full object-contain relative z-10 animate-[pulse_3s_ease-in-out_infinite]" />
              </div>

              <div className="text-center mb-8 w-full">
                <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-2 tracking-tight">
                  {authMode === 'login' && <>Acesso ao <span className="text-[var(--color-atelier-terracota)] italic">Estúdio.</span></>}
                  {authMode === 'register' && <>Nova <span className="text-[var(--color-atelier-terracota)] italic">Conta.</span></>}
                  {authMode === 'forgot_password' && <>Recuperar <span className="text-[var(--color-atelier-terracota)] italic">Acesso.</span></>}
                </h1>
                <p className="text-[13px] text-[var(--color-atelier-grafite)]/60 leading-relaxed font-medium">
                  {authMode === 'login' && "Insira suas credenciais para acessar o espaço da sua marca."}
                  {authMode === 'register' && "Crie um novo acesso para ingressar no ecossistema da Liz Design."}
                  {authMode === 'forgot_password' && "Enviaremos um protocolo seguro para o seu e-mail."}
                </p>
              </div>

              {/* ==========================================
                  O FORMULÁRIO MAGNÉTICO INTEGRADO
                  ========================================== */}
              <form onSubmit={authMode === 'forgot_password' ? handleResetPassword : handleAuth} className="w-full flex flex-col gap-4">
                
                {/* CAMPOS DE CADASTRO */}
                <AnimatePresence mode="popLayout">
                  {authMode === 'register' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, filter: "blur(4px)" }} 
                      animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }} 
                      exit={{ opacity: 0, height: 0, filter: "blur(4px)" }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col gap-4"
                    >
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10">
                          <User size={18} strokeWidth={1.5} />
                        </div>
                        <input 
                          type="text" required={authMode === 'register'} value={nome} onChange={(e) => setNome(e.target.value)}
                          placeholder="O seu Nome" 
                          className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 outline-none transition-all shadow-sm focus:shadow-[0_10px_30px_rgba(173,111,64,0.08)]"
                        />
                      </div>

                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10">
                          <Building2 size={18} strokeWidth={1.5} />
                        </div>
                        <input 
                          type="text" required={authMode === 'register'} value={empresa} onChange={(e) => setEmpresa(e.target.value)}
                          placeholder="Nome da Marca/Empresa" 
                          className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 outline-none transition-all shadow-sm focus:shadow-[0_10px_30px_rgba(173,111,64,0.08)]"
                        />
                      </div>

                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10">
                          <Instagram size={18} strokeWidth={1.5} />
                        </div>
                        <input 
                          type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)}
                          placeholder="Instagram (Ex: @suamarca)" 
                          className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 outline-none transition-all shadow-sm focus:shadow-[0_10px_30px_rgba(173,111,64,0.08)]"
                        />
                      </div>

                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10">
                          <Package size={18} strokeWidth={1.5} />
                        </div>
                        <select 
                          required={authMode === 'register'} value={servico} onChange={(e) => setServico(e.target.value)}
                          className={`w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] outline-none transition-all shadow-sm focus:shadow-[0_10px_30px_rgba(173,111,64,0.08)] appearance-none cursor-pointer ${servico ? 'text-[var(--color-atelier-grafite)] font-medium' : 'text-[var(--color-atelier-grafite)]/40'}`}
                        >
                          <option value="" disabled>Qual serviço foi contratado?</option>
                          <option value="Identidade Visual">Identidade Visual</option>
                          <option value="Gestão de Instagram">Gestão de Instagram</option>
                        </select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CAMPO DE EMAIL (Comum a todos os modos) */}
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10">
                    <Mail size={18} strokeWidth={1.5} />
                  </div>
                  <input 
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-mail de Acesso" 
                    className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 outline-none transition-all shadow-sm focus:shadow-[0_10px_30px_rgba(173,111,64,0.08)]"
                  />
                </div>

                {/* CAMPO DE SENHA (Oculto na recuperação) */}
                <AnimatePresence mode="popLayout">
                  {authMode !== 'forgot_password' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: "auto" }} 
                      exit={{ opacity: 0, height: 0 }} 
                      className="relative group/input"
                    >
                      <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10">
                        <KeyRound size={18} strokeWidth={1.5} />
                      </div>
                      <input 
                        type="password" required={authMode !== 'forgot_password'} value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Senha de Acesso" 
                        className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 outline-none transition-all shadow-sm focus:shadow-[0_10px_30px_rgba(173,111,64,0.08)]"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CONTROLES INFERIORES: Lembrar e Trocas de Modo */}
                <div className="flex justify-between items-center px-2 mt-1 mb-2">
                  {authMode === 'login' ? (
                    <>
                      <button 
                        type="button" 
                        onClick={() => setAuthMode('forgot_password')}
                        className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors"
                      >
                        Esqueci a senha
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setAuthMode('register'); setNome(""); setEmpresa(""); setServico(""); setInstagram(""); }}
                        className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-grafite)] transition-colors bg-white/40 px-3 py-1.5 rounded-full border border-white shadow-sm"
                      >
                        Criar Conta
                      </button>
                    </>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => setAuthMode('login')}
                      className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] transition-colors flex items-center gap-1.5 m-auto bg-white/40 px-4 py-2 rounded-full border border-white shadow-sm"
                    >
                      <ArrowLeft size={14} /> Voltar para o Login
                    </button>
                  )}
                </div>

                {/* BOTÃO DE SUBMISSÃO CINÉTICO */}
                <button 
                  type="submit" disabled={isAuthenticating}
                  className={`
                    w-full relative overflow-hidden rounded-[1.5rem] font-roboto font-bold uppercase tracking-[0.2em] text-[12px] h-14 flex items-center justify-center gap-3 transition-all duration-500 shadow-md mt-2
                    ${isAuthenticating 
                      ? 'bg-white border border-[var(--color-atelier-terracota)]/40 text-[var(--color-atelier-terracota)] shadow-none' 
                      : 'bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] hover:shadow-[0_15px_30px_rgba(173,111,64,0.3)] hover:-translate-y-1'
                    }
                  `}
                >
                  {isAuthenticating ? (
                    <><Loader2 size={18} className="animate-spin" /><span>Processando...</span></>
                  ) : authMode === 'login' ? (
                    <><Lock size={16} /> Acessar Plataforma</>
                  ) : authMode === 'register' ? (
                    <><UserPlus size={16} /> Criar Conta</>
                  ) : (
                    <><RefreshCw size={16} /> Enviar Protocolo</>
                  )}
                </button>
              </form>

            </div>

            {/* Rodapé de Segurança */}
            <div className="mt-8 flex justify-center items-center gap-2 text-[10px] font-roboto uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">
              <ShieldCheck size={14} /> Ambiente Criptografado Ponta a Ponta
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}