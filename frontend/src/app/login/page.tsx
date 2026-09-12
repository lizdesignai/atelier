// src/app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, ShieldCheck, Mail, KeyRound, 
  Loader2, ArrowLeft, RefreshCw, Smartphone
} from "lucide-react";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ==========================================
// COMPONENTE: MATRIZ VIVA 7x7 (BACKGROUND)
// ==========================================
const BASE_LOGOS = Array.from({ length: 20 }, (_, i) => `${i + 1}`);
const DUP_LOGOS = BASE_LOGOS.map(l => `${l}_dup`); 
const EMPTY_SLOTS = Array.from({ length: 9 }, (_, i) => `empty_${i}`); 
const ALL_ITEMS = [...BASE_LOGOS, ...DUP_LOGOS, ...EMPTY_SLOTS];

function shuffleArray(array: any[]) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function LogoMosaic({ isSuccess }: { isSuccess: boolean }) {
  const [grid, setGrid] = useState<string[]>([]);
  const [depths, setDepths] = useState<Record<string, { scale: number, blur: number, opacity: number }>>({});

  useEffect(() => {
    setGrid(shuffleArray(ALL_ITEMS));

    const depthMap: Record<string, any> = {};
    ALL_ITEMS.forEach(item => {
      if (!item.startsWith('empty')) {
        const layer = Math.random();
        if (layer < 0.33) depthMap[item] = { scale: 0.45, blur: 6, opacity: 0.1 }; 
        else if (layer < 0.66) depthMap[item] = { scale: 0.7, blur: 3, opacity: 0.2 }; 
        else depthMap[item] = { scale: 1.0, blur: 1, opacity: 0.35 }; 
      }
    });
    setDepths(depthMap);

    const interval = setInterval(() => {
      setGrid(prevGrid => {
        const newGrid = [...prevGrid];
        const filledIds: number[] = [];
        const emptyIds: number[] = [];
        
        newGrid.forEach((val, i) => {
          if (val.startsWith('empty')) emptyIds.push(i);
          else filledIds.push(i);
        });

        for(let k = 0; k < 6; k++) {
          if(filledIds.length === 0 || emptyIds.length === 0) break;
          const fIdx = Math.floor(Math.random() * filledIds.length);
          const eIdx = Math.floor(Math.random() * emptyIds.length);
          
          const gridFIdx = filledIds[fIdx];
          const gridEIdx = emptyIds[eIdx];

          const temp = newGrid[gridFIdx];
          newGrid[gridFIdx] = newGrid[gridEIdx];
          newGrid[gridEIdx] = temp;

          filledIds.splice(fIdx, 1);
          emptyIds.splice(eIdx, 1);
        }
        return newGrid;
      });
    }, 2000); 

    return () => clearInterval(interval);
  }, []);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const currentSrc = e.currentTarget.src;
    if (currentSrc.includes('.png')) {
      e.currentTarget.src = currentSrc.replace('.png', '.svg');
    } else {
      e.currentTarget.style.display = 'none'; 
    }
  };

  return (
    <div className="absolute inset-0 z-0 bg-[var(--color-atelier-creme)] overflow-hidden">
      
      {/* Grade Suave */}
      <div className="absolute inset-0 grid grid-cols-7 grid-rows-7 pointer-events-none opacity-20">
        {Array.from({length: 49}).map((_, i) => (
          <div key={i} className="border-r border-b border-[var(--color-atelier-grafite)]/10" />
        ))}
      </div>

      <div className="absolute inset-0 grid grid-cols-7 grid-rows-7 p-2 md:p-6 lg:p-12 items-center justify-items-center">
        {grid.map((item, index) => (
          <div key={index} className="flex items-center justify-center relative w-full h-full">
            <AnimatePresence mode="wait">
              {item && !item.startsWith('empty') && (
                <motion.img
                  layout
                  key={item}
                  src={`/images/login/${item.replace('_dup', '')}.svg`}
                  onError={handleImageError}
                  initial={{ opacity: 0, filter: 'blur(20px) grayscale(100%)', scale: 0.2, y: 20 }}
                  animate={{ 
                    opacity: isSuccess ? 1 : depths[item]?.opacity, 
                    filter: isSuccess ? 'blur(0px) grayscale(0%)' : `blur(${depths[item]?.blur}px) grayscale(100%)`, 
                    scale: isSuccess ? depths[item]?.scale * 1.3 : depths[item]?.scale,
                    y: 0
                  }}
                  exit={{ opacity: 0, filter: 'blur(20px) grayscale(100%)', scale: 0.2, y: 20 }}
                  transition={{ 
                    layout: { type: "spring", stiffness: 60, damping: 20 },
                    opacity: { duration: 1.5 },
                    filter: { duration: 1.5 },
                    y: { duration: 1.5, ease: "easeOut" }
                  }}
                  className="absolute max-w-[60%] max-h-[60%] object-contain"
                  alt=""
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [authMode, setAuthMode] = useState<'login' | 'forgot_password' | 'reset_confirm'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // MFA
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  
  // Reset password
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSuccessState, setIsSuccessState] = useState(false);

  // Verificar se veio com token de reset na URL
  useEffect(() => {
    const token = searchParams.get('reset');
    if (token) {
      setResetToken(token);
      setAuthMode('reset_confirm');
    }
  }, [searchParams]);

  // ==========================================
  // HANDLER: LOGIN COM EMAIL/SENHA
  // ==========================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsAuthenticating(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          email: email.trim(), 
          password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao fazer login.");
      }

      // Se MFA é necessário, mostrar campo de código
      if (data.mfaRequired) {
        setMfaToken(data.mfaToken);
        setMfaStep(true);
        setIsAuthenticating(false);
        return;
      }

      // Login bem-sucedido (sem MFA)
      const role = data.user?.role || 'client';
      
      setIsSuccessState(true);
      setTimeout(() => {
        const hasSeenOnboarding = localStorage.getItem("has_seen_onboarding");
        if (!hasSeenOnboarding) {
          router.push("/onboarding");
        } else {
          router.push(role === 'client' ? "/" : role === 'contador' ? "/admin/financeiro" : "/admin/fio");
        }
      }, 1800);

    } catch (error: any) {
      showToast(error.message);
    } finally {
      if (!isSuccessState) setIsAuthenticating(false);
    }
  };

  // ==========================================
  // HANDLER: VERIFICAÇÃO MFA
  // ==========================================
  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length < 6) {
      showToast("Insira o código de 6 dígitos do Google Authenticator.");
      return;
    }
    
    setIsAuthenticating(true);

    try {
      const response = await fetch("/api/auth/login/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mfaToken, code: mfaCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Código inválido.");
      }

      const role = data.user?.role || 'client';
      
      setIsSuccessState(true);
      setTimeout(() => {
        const hasSeenOnboarding = localStorage.getItem("has_seen_onboarding");
        if (!hasSeenOnboarding) {
          router.push("/onboarding");
        } else {
          router.push(role === 'client' ? "/" : role === 'contador' ? "/admin/financeiro" : "/admin/fio");
        }
      }, 1800);

    } catch (error: any) {
      showToast(error.message);
    } finally {
      if (!isSuccessState) setIsAuthenticating(false);
    }
  };

  // ==========================================
  // HANDLER: SOLICITAR RESET DE SENHA
  // ==========================================
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast("Insira o seu e-mail para receber o link.");
      return;
    }
    setIsAuthenticating(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao solicitar recuperação.");
      }

      showToast("Link enviado para seu e-mail de forma segura.");
      setAuthMode('login');
    } catch (error: any) {
      showToast("Erro ao tentar recuperar a senha: " + error.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // ==========================================
  // HANDLER: CONFIRMAR NOVA SENHA (VIA TOKEN)
  // ==========================================
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      showToast("Preencha todos os campos.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      showToast("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsAuthenticating(true);
    try {
      const response = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao redefinir senha.");
      }

      showToast("Senha redefinida com sucesso! Faça login.");
      setAuthMode('login');
      setResetToken("");
    } catch (error: any) {
      showToast(error.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  const getFormHandler = (): ((e: React.FormEvent) => void) => {
    if (mfaStep) return handleMfaVerify;
    if (authMode === 'forgot_password') return handleResetPassword;
    if (authMode === 'reset_confirm') return handleConfirmReset;
    return handleLogin;
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[var(--color-atelier-creme)] flex items-center justify-center font-roboto">
      
      <LogoMosaic isSuccess={isSuccessState} />

      <AnimatePresence>
        {!isSuccessState && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95, filter: "blur(15px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[460px] px-6"
          >
            <div className="bg-white/60 backdrop-blur-3xl border border-white/60 p-10 rounded-[3.5rem] shadow-[0_30px_80px_rgba(122,116,112,0.15)] flex flex-col items-center">
              
              <div className="relative w-14 h-14 mb-8">
                <div className="absolute inset-0 bg-[var(--color-atelier-terracota)] blur-xl opacity-20 animate-pulse"></div>
                <img src="/images/simbolo-rosa.png" alt="Logo" className="w-full h-full object-contain relative z-10 animate-[pulse_3s_ease-in-out_infinite]" />
              </div>

              <div className="text-center mb-8 w-full">
                <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-2 tracking-tight">
                  {authMode === 'login' && !mfaStep && <>Acesso ao <span className="text-[var(--color-atelier-terracota)] italic">Estúdio.</span></>}
                  {authMode === 'login' && mfaStep && <>Verificação <span className="text-[var(--color-atelier-terracota)] italic">MFA.</span></>}
                  {authMode === 'forgot_password' && <>Recuperar <span className="text-[var(--color-atelier-terracota)] italic">Acesso.</span></>}
                  {authMode === 'reset_confirm' && <>Nova <span className="text-[var(--color-atelier-terracota)] italic">Senha.</span></>}
                </h1>
                <p className="text-[13px] text-[var(--color-atelier-grafite)]/60 leading-relaxed font-medium">
                  {authMode === 'login' && !mfaStep && "Insira suas credenciais para acessar o espaço da sua marca."}
                  {authMode === 'login' && mfaStep && "Insira o código de 6 dígitos do Google Authenticator."}
                  {authMode === 'forgot_password' && "Enviaremos um protocolo seguro para o seu e-mail."}
                  {authMode === 'reset_confirm' && "Defina a sua nova senha de acesso."}
                </p>
              </div>

              <form onSubmit={getFormHandler()} className="w-full flex flex-col gap-4">
                
                <AnimatePresence mode="popLayout">
                  {/* ===== STEP MFA: CÓDIGO DE 6 DÍGITOS ===== */}
                  {mfaStep && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-4 w-full">
                      <div className="flex justify-center mb-2">
                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-[var(--color-atelier-terracota)] shadow-inner">
                          <Smartphone size={32} strokeWidth={1.5} />
                        </div>
                      </div>
                      
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10"><KeyRound size={18} strokeWidth={1.5} /></div>
                        <input 
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          required
                          autoFocus
                          value={mfaCode} 
                          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))} 
                          placeholder="000 000" 
                          className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[20px] text-center tracking-[0.5em] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm font-mono font-bold" 
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* ===== LOGIN: EMAIL + SENHA ===== */}
                  {authMode === 'login' && !mfaStep && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-4 w-full">
                      
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10"><Mail size={18} strokeWidth={1.5} /></div>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail de Acesso" className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm" />
                      </div>
                      
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10"><KeyRound size={18} strokeWidth={1.5} /></div>
                        <input 
                          type="password" required value={password} onChange={(e) => setPassword(e.target.value)} 
                          placeholder="Senha de Acesso" 
                          className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm" 
                        />
                      </div>

                    </motion.div>
                  )}

                  {/* ===== FORGOT PASSWORD: APENAS EMAIL ===== */}
                  {authMode === 'forgot_password' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-4 w-full">
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10"><Mail size={18} strokeWidth={1.5} /></div>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail de Acesso" className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm" />
                      </div>
                    </motion.div>
                  )}

                  {/* ===== RESET CONFIRM: NOVA SENHA ===== */}
                  {authMode === 'reset_confirm' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-4 w-full">
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10"><KeyRound size={18} strokeWidth={1.5} /></div>
                        <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova Senha" className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm" />
                      </div>
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10"><KeyRound size={18} strokeWidth={1.5} /></div>
                        <input type="password" required value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Confirmar Nova Senha" className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ===== LINKS DE NAVEGAÇÃO ===== */}
                <div className="flex justify-between items-center px-2 mt-1 mb-2">
                  {authMode === 'login' && !mfaStep ? (
                    <button type="button" onClick={() => setAuthMode('forgot_password')} className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors m-auto">Esqueci a senha</button>
                  ) : (
                    <button type="button" onClick={() => { setAuthMode('login'); setMfaStep(false); setMfaCode(""); setMfaToken(""); }} className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] transition-colors flex items-center gap-1.5 m-auto bg-white/40 px-4 py-2 rounded-full border border-white shadow-sm"><ArrowLeft size={14} /> Voltar para o Login</button>
                  )}
                </div>

                {/* ===== BOTÃO DE SUBMIT ===== */}
                <motion.button 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  type="submit" 
                  disabled={isAuthenticating} 
                  className={`w-full relative overflow-hidden rounded-[1.5rem] font-roboto font-bold uppercase tracking-[0.2em] text-[12px] h-14 flex items-center justify-center gap-3 transition-all duration-500 shadow-md mt-2 ${isAuthenticating ? 'bg-white border border-[var(--color-atelier-terracota)]/40 text-[var(--color-atelier-terracota)] shadow-none' : 'bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] hover:shadow-[0_15px_30px_rgba(173,111,64,0.3)] hover:-translate-y-1'}`}
                >
                  {isAuthenticating ? (
                    <><Loader2 size={18} className="animate-spin" /><span>Processando...</span></>
                  ) : mfaStep ? (
                    <><ShieldCheck size={16} /> Verificar Código</>
                  ) : authMode === 'login' ? (
                    <><Lock size={16} /> Acessar Plataforma</>
                  ) : authMode === 'reset_confirm' ? (
                    <><KeyRound size={16} /> Redefinir Senha</>
                  ) : (
                    <><RefreshCw size={16} /> Enviar Protocolo</>
                  )}
                </motion.button>
              </form>

            </div>

            <div className="mt-8 flex justify-center items-center gap-2 text-[10px] font-roboto uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">
              <ShieldCheck size={14} /> Ambiente Criptografado Ponta a Ponta
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}