// src/app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, ShieldCheck, Mail, KeyRound, 
  UserPlus, User, Building2, Package, Instagram, 
  Loader2, ArrowLeft, RefreshCw
} from "lucide-react";
import { supabase } from "../../lib/supabase"; 

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
                  src={`/images/login/${item.replace('_dup', '')}.png`}
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
  
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [servico, setServico] = useState("");
  const [instagram, setInstagram] = useState(""); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSuccessState, setIsSuccessState] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsAuthenticating(true);
    const cleanEmail = email.trim();
    
    let cleanInstagram = instagram.trim();
    if (cleanInstagram && !cleanInstagram.startsWith('@') && !cleanInstagram.includes('instagram.com/')) {
      cleanInstagram = `@${cleanInstagram}`;
    }
    
    try {
      try { await supabase.auth.signOut(); } catch (e) {}

      if (authMode === 'login') {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (authError) throw authError;

        const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', authData.user.id).single();
        if (profileError) throw profileError;

        const role = profile?.role || 'client';
        localStorage.setItem("atelier_token", authData.session.access_token);
        localStorage.setItem("atelier_role", role);
        
        setIsSuccessState(true);
        setTimeout(() => {
          const hasSeenOnboarding = localStorage.getItem("has_seen_onboarding");
          if (!hasSeenOnboarding) {
            router.push("/onboarding");
          } else {
            router.push(role === 'client' ? "/" : "/admin");
          }
        }, 1800);

      } else if (authMode === 'register') {
        if (!nome || !empresa || !servico || !password) {
          showToast("Preencha todos os campos obrigatórios.");
          setIsAuthenticating(false);
          return;
        }

        const newRole = cleanEmail.includes('admin') ? 'admin' : cleanEmail.includes('gestor') ? 'gestor' : 'client';
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail, password,
          options: { data: { nome, empresa, role: newRole, instagram: cleanInstagram } }
        });

        if (authError) throw authError;
        if (newRole === 'client' && authData.user) {
          await supabase.from('projects').insert({ client_id: authData.user.id, name: `Projeto ${empresa}`, type: servico, status: 'active' });
        }
        showToast("Conta criada com sucesso! Você já pode acessar.");
        setAuthMode('login');
      }
    } catch (error: any) {
      showToast(error.message === "Invalid login credentials" ? "Credenciais inválidas. Tente novamente." : error.message);
    } finally {
      if (!isSuccessState) setIsAuthenticating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast("Insira o seu e-mail para receber o link.");
      return;
    }
    setIsAuthenticating(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/update-password` });
      if (error) throw error;
      showToast("Link enviado para seu e-mail de forma segura.");
      setAuthMode('login');
    } catch (error: any) {
      showToast("Erro ao tentar recuperar a senha: " + error.message);
    } finally {
      setIsAuthenticating(false);
    }
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

              <form onSubmit={authMode === 'forgot_password' ? handleResetPassword : handleAuth} className="w-full flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {authMode === 'register' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-4">
                      
                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10"><User size={18} strokeWidth={1.5} /></div>
                        <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="O seu Nome" className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm" />
                      </div>

                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10"><Building2 size={18} strokeWidth={1.5} /></div>
                        <input type="text" required value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Nome da Marca" className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm" />
                      </div>

                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10"><Instagram size={18} strokeWidth={1.5} /></div>
                        <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="Instagram" className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm" />
                      </div>

                      <div className="relative group/input">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10"><Package size={18} strokeWidth={1.5} /></div>
                        <select required value={servico} onChange={(e) => setServico(e.target.value)} className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm appearance-none">
                          <option value="" disabled>Qual serviço foi contratado?</option>
                          <option value="Identidade Visual">Identidade Visual</option>
                          <option value="Gestão de Instagram">Gestão de Instagram</option>
                        </select>
                      </div>

                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10"><Mail size={18} strokeWidth={1.5} /></div>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail de Acesso" className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm" />
                </div>
                
                <AnimatePresence mode="popLayout">
                  {authMode !== 'forgot_password' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="relative group/input">
                      <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors z-10"><KeyRound size={18} strokeWidth={1.5} /></div>
                      <input 
                        type="password" required value={password} onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Senha de Acesso" 
                        className="w-full bg-white/70 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 pl-14 pr-6 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm" 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-between items-center px-2 mt-1 mb-2">
                  {authMode === 'login' ? (
                    <>
                      <button type="button" onClick={() => setAuthMode('forgot_password')} className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors">Esqueci a senha</button>
                      <button type="button" onClick={() => { setAuthMode('register'); setNome(""); setEmpresa(""); setServico(""); setInstagram(""); }} className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-grafite)] transition-colors bg-white/40 px-3 py-1.5 rounded-full border border-white shadow-sm">Criar Conta</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setAuthMode('login')} className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] transition-colors flex items-center gap-1.5 m-auto bg-white/40 px-4 py-2 rounded-full border border-white shadow-sm"><ArrowLeft size={14} /> Voltar para o Login</button>
                  )}
                </div>

                <button type="submit" disabled={isAuthenticating} className={`w-full relative overflow-hidden rounded-[1.5rem] font-roboto font-bold uppercase tracking-[0.2em] text-[12px] h-14 flex items-center justify-center gap-3 transition-all duration-500 shadow-md mt-2 ${isAuthenticating ? 'bg-white border border-[var(--color-atelier-terracota)]/40 text-[var(--color-atelier-terracota)] shadow-none' : 'bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] hover:shadow-[0_15px_30px_rgba(173,111,64,0.3)] hover:-translate-y-1'}`}>
                  {isAuthenticating ? <><Loader2 size={18} className="animate-spin" /><span>Processando...</span></> : authMode === 'login' ? <><Lock size={16} /> Acessar Plataforma</> : authMode === 'register' ? <><UserPlus size={16} /> Criar Conta</> : <><RefreshCw size={16} /> Enviar Protocolo</>}
                </button>
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