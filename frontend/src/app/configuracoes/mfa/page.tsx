// src/app/configuracoes/mfa/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, Smartphone, KeyRound, 
  Loader2, ArrowLeft, CheckCircle2, XCircle, AlertTriangle 
} from "lucide-react";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

type MfaState = 'idle' | 'loading' | 'setup' | 'verify' | 'active' | 'disabling';

export default function MfaSetupPage() {
  const router = useRouter();
  const [state, setState] = useState<MfaState>('idle');
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [disableCode, setDisableCode] = useState("");

  // Verificar status atual do MFA
  const checkMfaStatus = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (res.ok && data.authenticated !== false) {
        setMfaEnabled(data.user?.mfa_enabled || false);
        if (data.user?.mfa_enabled) {
          setState('active');
        }
        // Verificar se é admin/gestor
        if (!['admin', 'gestor'].includes(data.user?.role)) {
          showToast("MFA está disponível apenas para administradores e gestores.");
          router.push("/configuracoes");
          return;
        }
      }
    } catch {}
  };

  // Inicializar ao montar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { checkMfaStatus(); }, []);

  // Iniciar setup do MFA
  const handleStartSetup = async () => {
    setState('loading');
    setIsProcessing(true);

    try {
      const res = await fetch("/api/auth/mfa/setup", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao iniciar setup MFA.");
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setState('setup');
    } catch (error: any) {
      showToast(error.message);
      setState('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  // Verificar código e ativar MFA
  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 6) {
      showToast("Insira o código de 6 dígitos.");
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch("/api/auth/mfa/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Código inválido.");
      }

      setMfaEnabled(true);
      setState('active');
      showToast("MFA ativado com sucesso! 🔐");
    } catch (error: any) {
      showToast(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Desativar MFA
  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableCode || disableCode.length < 6) {
      showToast("Insira o código de 6 dígitos para confirmar.");
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch("/api/auth/mfa/verify-setup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: disableCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Código inválido.");
      }

      setMfaEnabled(false);
      setState('idle');
      setDisableCode("");
      showToast("MFA desativado com sucesso.");
    } catch (error: any) {
      showToast(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-xl mx-auto py-8 px-4">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.push("/configuracoes")}
            className="w-10 h-10 rounded-full bg-white/60 border border-white flex items-center justify-center text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] hover:bg-white transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
              Autenticação <span className="text-[var(--color-atelier-terracota)] italic">MFA</span>
            </h1>
            <p className="text-[12px] text-[var(--color-atelier-grafite)]/50 font-medium mt-0.5">
              Google Authenticator • Verificação em duas etapas
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ===== ESTADO: IDLE (MFA não ativo) ===== */}
          {(state === 'idle' || state === 'loading') && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-sm"
            >
              <div className="flex flex-col items-center text-center gap-6">
                <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center">
                  <ShieldCheck size={36} className="text-[var(--color-atelier-terracota)]" strokeWidth={1.5} />
                </div>

                <div>
                  <h2 className="font-roboto font-bold text-lg text-[var(--color-atelier-grafite)] mb-2">
                    Proteja a sua conta
                  </h2>
                  <p className="text-[13px] text-[var(--color-atelier-grafite)]/60 leading-relaxed max-w-sm">
                    Ative a autenticação de dois fatores (MFA) para adicionar uma camada extra de segurança. 
                    Cada login exigirá um código do Google Authenticator.
                  </p>
                </div>

                <button
                  onClick={handleStartSetup}
                  disabled={isProcessing}
                  className="w-full max-w-xs bg-[var(--color-atelier-grafite)] text-white font-roboto font-bold uppercase tracking-[0.15em] text-[12px] py-4 rounded-2xl hover:bg-[var(--color-atelier-terracota)] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <><Loader2 size={16} className="animate-spin" /> Preparando...</>
                  ) : (
                    <><Smartphone size={16} /> Ativar MFA</>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ===== ESTADO: SETUP (QR Code) ===== */}
          {state === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-sm"
            >
              <div className="flex flex-col items-center text-center gap-6">
                <h2 className="font-roboto font-bold text-lg text-[var(--color-atelier-grafite)]">
                  Escaneie o QR Code
                </h2>
                <p className="text-[13px] text-[var(--color-atelier-grafite)]/60 max-w-sm">
                  Abra o <strong>Google Authenticator</strong> no seu telemóvel e escaneie o código abaixo.
                </p>

                {/* QR Code */}
                {qrCode && (
                  <div className="bg-white p-4 rounded-2xl shadow-inner border border-gray-100">
                    <img src={qrCode} alt="QR Code MFA" className="w-56 h-56" />
                  </div>
                )}

                {/* Secret manual */}
                <div className="w-full max-w-sm">
                  <p className="text-[11px] text-[var(--color-atelier-grafite)]/40 uppercase tracking-wider font-bold mb-2">
                    Ou insira este código manualmente:
                  </p>
                  <div className="bg-gray-50 rounded-xl px-4 py-3 font-mono text-[13px] text-[var(--color-atelier-grafite)] tracking-wider break-all select-all border border-gray-100">
                    {secret}
                  </div>
                </div>

                {/* Verificação */}
                <form onSubmit={handleVerifySetup} className="w-full max-w-sm flex flex-col gap-4 mt-2">
                  <p className="text-[13px] text-[var(--color-atelier-grafite)]/60">
                    Insira o código de 6 dígitos exibido no app para confirmar:
                  </p>
                  
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--color-atelier-grafite)]/40 group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors">
                      <KeyRound size={18} strokeWidth={1.5} />
                    </div>
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      autoFocus
                      value={code} 
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} 
                      placeholder="000000" 
                      className="w-full bg-white border border-gray-200 focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3 pl-12 pr-4 text-[18px] text-center tracking-[0.4em] text-[var(--color-atelier-grafite)] outline-none transition-all font-mono font-bold" 
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing || code.length < 6}
                    className="w-full bg-[var(--color-atelier-grafite)] text-white font-roboto font-bold uppercase tracking-[0.15em] text-[12px] py-4 rounded-2xl hover:bg-[var(--color-atelier-terracota)] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {isProcessing ? (
                      <><Loader2 size={16} className="animate-spin" /> Verificando...</>
                    ) : (
                      <><CheckCircle2 size={16} /> Confirmar e Ativar MFA</>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ===== ESTADO: ACTIVE (MFA ativado) ===== */}
          {state === 'active' && (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Status card */}
              <div className="bg-emerald-50/80 backdrop-blur-xl border border-emerald-200/40 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={28} className="text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="font-roboto font-bold text-lg text-[var(--color-atelier-grafite)]">
                      MFA Ativo
                    </h2>
                    <p className="text-[13px] text-[var(--color-atelier-grafite)]/60">
                      A sua conta está protegida com autenticação de dois fatores via Google Authenticator.
                    </p>
                  </div>
                </div>
              </div>

              {/* Desativar */}
              <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-sm">
                <div className="flex items-start gap-3 mb-6">
                  <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">
                      Desativar MFA
                    </h3>
                    <p className="text-[12px] text-[var(--color-atelier-grafite)]/50 mt-1">
                      Remover a proteção MFA torna a sua conta mais vulnerável. Para confirmar, insira o código atual do Google Authenticator.
                    </p>
                  </div>
                </div>

                {state === 'active' && (
                  <form onSubmit={handleDisableMfa} className="flex gap-3">
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={disableCode} 
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))} 
                      placeholder="Código" 
                      className="flex-1 bg-white border border-gray-200 focus:border-red-300 rounded-xl py-3 px-4 text-[14px] text-center tracking-[0.3em] text-[var(--color-atelier-grafite)] outline-none transition-all font-mono font-bold" 
                    />
                    <button
                      type="submit"
                      disabled={isProcessing || disableCode.length < 6}
                      className="bg-red-50 text-red-600 border border-red-200 font-roboto font-bold uppercase tracking-wider text-[11px] px-6 rounded-xl hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                      Desativar
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
