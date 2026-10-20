// src/app/ClientShell.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import dynamic from "next/dynamic";

import AppSidebar from "../components/layout/AppSidebar";
import MobileSidebar from "../components/layout/MobileSidebar";
import AppHeader from "../components/layout/AppHeader"; 
import InstagramClientNavPill from "../components/layout/InstagramClientNavPill";
import VeronnaAmbientBackground from "../components/layout/VeronnaAmbientBackground";
import VeronnaFullLogo from "../components/brand/VeronnaFullLogo";
import { GlobalStoreProvider } from "../contexts/GlobalStore";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";

// Carregamento dinâmico do CommandPalette para diminuir o bundle inicial
const CommandPalette = dynamic(() => import("../components/global/CommandPalette"), { ssr: false });
const ClientProjectChatWidget = dynamic(() => import("../components/chat/ClientProjectChatWidget"), { ssr: false });

export const triggerToast = (message: string) => {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("showToast", { detail: message });
    window.dispatchEvent(event);
  }
};

function GlobalToast() {
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      setToast({ message: customEvent.detail, visible: true });
      setTimeout(() => setToast({ message: "", visible: false }), 3000);
    };
    window.addEventListener("showToast", handleToast);
    return () => window.removeEventListener("showToast", handleToast);
  }, []);

  if (!toast.visible) return null;

  return (
    <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[9999] bg-white/90 backdrop-blur-xl border border-[var(--color-atelier-terracota)]/30 text-[var(--color-atelier-grafite)] px-5 py-3 md:px-6 md:py-4 rounded-2xl shadow-[0_20px_40px_rgba(20,44,72,0.15)] animate-[fadeInUp_0.3s_ease-out] flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-[var(--color-veronna-bordo)] animate-pulse"></div>
      <span className="font-roboto text-[13px] font-bold tracking-wide">{toast.message}</span>
    </div>
  );
}

function AtelierPreloader() {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(12px)" }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[99999] bg-[var(--color-atelier-creme)] flex flex-col items-center justify-center overflow-hidden"
    >
      <motion.div 
        animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.45, 0.25] }} 
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[600px] h-[600px] bg-[var(--color-atelier-rose)]/30 blur-[130px] rounded-full pointer-events-none"
      />
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.35, 0.15] }} 
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[var(--color-veronna-bordo)]/15 blur-[120px] rounded-full pointer-events-none"
      />

      <div className="relative z-10 flex flex-col items-center px-4">
        <VeronnaFullLogo 
          width={320} 
          fillColor="var(--color-atelier-terracota)"
          animated={true}
          className="drop-shadow-2xl mb-8 max-w-[85vw]"
        />

        {/* Linha de Progresso Editorial com Acento Bordô Veronna */}
        <div className="w-44 h-[2px] bg-[var(--color-atelier-grafite)]/10 rounded-full overflow-hidden relative">
          <motion.div 
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-[var(--color-veronna-bordo)] to-transparent"
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const checkAuth = async () => {
      if (typeof document !== "undefined") {
        document.title = "Atelier";
      }

      // Verificar sessão via API (cookie HttpOnly JWT)
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        const data = await response.json();
        
        if (!response.ok || data.authenticated === false || !data.user) {
          // Não autenticado
          queryClient.setQueryData(["session"], null);
          if (!isLoginPage) {
            window.location.href = "/login";
          }
          setIsInitializing(false);
          return;
        }

        const { user } = data;
        const role = user?.role || 'client';
        setUserRole(role);

        // Sincronizar autoritativamente o cache de sessão do React Query
        queryClient.setQueryData(["session"], data);

        if (isLoginPage) {
          const destination = data.redirectUrl || data.user?.redirectUrl || (role === "client" ? "/" : role === "contador" ? "/admin/financeiro" : "/admin/jtbd");
          window.location.href = destination;
          return;
        }

        timer = setTimeout(() => setIsInitializing(false), 200);
      } catch {
        // Erro de rede — se não está na página de login, redirecionar
        if (!isLoginPage) {
          window.location.href = "/login";
        }
        setIsInitializing(false);
      }
    };

    checkAuth();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pathname, router, isLoginPage]);

  const handleLogout = async () => {
    triggerToast("A encerrar sessão com segurança...");
    queryClient.setQueryData(["session"], null);
    queryClient.clear();
    setTimeout(async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch {}
      window.location.href = "/login";
    }, 800);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalStoreProvider>
        <GlobalToast />
        
        {!isLoginPage && !isInitializing && userRole && <InstagramClientNavPill />}
        {!isLoginPage && !isInitializing && userRole && <ClientProjectChatWidget />}

        <div className="flex flex-1 w-full h-full relative">
          <VeronnaAmbientBackground />

          {!isLoginPage && userRole && (
            <>
              <AppSidebar 
                userRole={userRole} 
                handleLogout={handleLogout} 
                onHideSidebar={(hidden) => setIsSidebarHidden(hidden)} 
              />
              <MobileSidebar 
                userRole={userRole} 
                handleLogout={handleLogout} 
              />
            </>
          )}

          <motion.div 
            initial={!isLoginPage ? { scale: 1.02, opacity: 0 } : false}
            animate={isInitializing && !isLoginPage ? { scale: 1.02, opacity: 0 } : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 w-full"
          >
            {!isLoginPage && userRole && !isSidebarHidden && (
              <AppHeader handleLogout={handleLogout} userRole={userRole} />
            )}

            <main className={`flex-1 overflow-hidden flex flex-col ${isLoginPage || isSidebarHidden ? "p-0" : "px-4 md:px-12 pt-14 md:pt-4 pb-24 md:py-8"}`}>
              <div className={isLoginPage || isSidebarHidden ? "w-full h-full overflow-y-auto" : "flex-1 overflow-y-auto custom-scrollbar"}>
                {children}
              </div>
            </main>
          </motion.div>
        </div>
      </GlobalStoreProvider>
    </QueryClientProvider>
  );
}
