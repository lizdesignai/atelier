// src/components/layout/InstagramClientNavPill.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Globe2, Crosshair, FolderKanban, MessageCircle, Briefcase, Compass, Landmark } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../hooks/useSession";
import { useProfile } from "../../hooks/useProfile";
import { useProjects } from "../../hooks/useProjects";
import { useGlobalStore } from "../../contexts/GlobalStore";
import { getProductTypeFromProject } from "@/lib/productHelper";

export default function InstagramClientNavPill() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: profile } = useProfile();
  const { data: projects } = useProjects();
  const { navMode } = useGlobalStore();

  const [mounted, setMounted] = useState(false);
  const [globalUnreadCount, setGlobalUnreadCount] = useState<number>(0);

  const [isEngaged, setIsEngaged] = useState(false);
  const engageTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const wakeBar = () => {
    setIsEngaged(true);
    if (engageTimeoutRef.current) clearTimeout(engageTimeoutRef.current);
    engageTimeoutRef.current = setTimeout(() => {
      setIsEngaged(false);
    }, 2800);
  };

  useEffect(() => {
    return () => {
      if (engageTimeoutRef.current) clearTimeout(engageTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userRole = profile?.role || session?.user?.role || null;
  const isTeamMember = userRole ? ["admin", "gestor", "colaborador"].includes(userRole) : false;
  const isContador = userRole === "contador";
  const isClient = userRole === "client";
  const sessionUserId = session?.user?.id || profile?.id;

  useEffect(() => {
    if (!sessionUserId || !isTeamMember || navMode !== "horizontal") return;

    const fetchGlobalUnread = async () => {
      const { data, error } = await supabase.rpc("get_unread_message_count");
      if (!error && typeof data === "number") {
        setGlobalUnreadCount(data);
      }
    };

    fetchGlobalUnread();

    const channelSub = supabase
      .channel("global-messages-pill")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          fetchGlobalUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSub);
    };
  }, [sessionUserId, isTeamMember, navMode]);

  // Não renderizar na página de login, antes do mount no cliente ou sem papel definido
  if (pathname === "/login" || !mounted || typeof document === "undefined" || !userRole) return null;

  // ==========================================
  // 1. CASO CONTADOR (EXCLUSIVAMENTE B&P + VÊNETO)
  // ==========================================
  if (isContador) {
    const contadorNavItems = [
      {
        href: "/admin/financeiro",
        label: "Bills & Payments",
        icon: Landmark,
        active: pathname === "/admin/financeiro" || pathname.startsWith("/admin/financeiro/"),
      },
      {
        href: "/comunidade",
        label: "Vêneto",
        icon: Globe2,
        active: pathname === "/comunidade" || pathname.startsWith("/comunidade/"),
      },
    ];

    return createPortal(
      <div
        className="fixed bottom-2 inset-x-0 z-[100] flex justify-center pointer-events-none"
        style={{
          position: "fixed",
          bottom: "8px",
          left: 0,
          right: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
          zIndex: 100,
        }}
      >
        <motion.nav
          initial={{ y: 25, opacity: 0, scale: 0.95 }}
          animate={{
            y: isEngaged ? 0 : 5,
            opacity: isEngaged ? 1 : 0.40,
            scale: isEngaged ? 1 : 0.88,
          }}
          whileHover={{ opacity: 1, scale: 1, y: 0 }}
          whileTap={{ opacity: 1, scale: 0.98, y: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          onMouseEnter={() => setIsEngaged(true)}
          onMouseLeave={() => setIsEngaged(false)}
          onTouchStart={wakeBar}
          className="pointer-events-auto relative flex items-center p-1.5 rounded-full bg-white/70 backdrop-blur-2xl border border-black/5 shadow-xs hover:shadow-[0_16px_36px_rgba(13,29,48,0.14)] ring-1 ring-black/5 overflow-hidden transition-shadow"
        >
          {/* Fundo decorativo suave com Ativo 14.svg em opacidade 10 */}
          <div
            className="absolute inset-0 pointer-events-none rounded-full opacity-10 bg-center bg-repeat"
            style={{
              backgroundImage: "url('/images/Ativo%2014.svg')",
              backgroundSize: "160px auto",
            }}
          />

          <div className="relative z-10 flex items-center gap-1.5">
            {contadorNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={`relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
                    item.active
                      ? "px-4 py-2 bg-gradient-to-r from-[var(--color-veronna-navy)] to-[var(--color-veronna-royal)] text-white shadow-xs"
                      : "p-2.5 text-gray-500 hover:text-[var(--color-atelier-grafite)] hover:bg-black/5"
                  }`}
                  title={`Ir para ${item.label}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center">
                      <Icon size={17} strokeWidth={item.active ? 2.2 : 1.8} className={item.active ? "text-[#B9D1E3]" : ""} />
                    </div>
                    <AnimatePresence initial={false}>
                      {item.active && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="font-roboto text-[12px] font-bold tracking-wide whitespace-nowrap overflow-hidden flex items-center gap-1.5"
                        >
                          <span>{item.label}</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.nav>
      </div>,
      document.body
    );
  }

  // ==========================================
  // 2. CASO MEMBRO DA EQUIPE (GESTOR, ADMIN, COLABORADOR)
  // ==========================================
  if (isTeamMember) {
    const isGerenciamentoActive = pathname === "/admin/gerenciamento" || pathname.startsWith("/admin/gerenciamento") || pathname === "/cockpit";
    const isManagerOrAdmin = ["admin", "gestor"].includes(userRole || "");

    const teamNavItems = [
      {
        href: "/admin/jtbd",
        label: "Focus",
        icon: Crosshair,
        active: pathname === "/admin/jtbd" || pathname.startsWith("/admin/jtbd/"),
      },
      {
        href: "/admin/gerenciamento",
        label: "Presença",
        icon: Compass,
        active: isGerenciamentoActive,
      },
      {
        href: "/admin/projetos",
        label: "Studio Veronna",
        icon: FolderKanban,
        active: pathname === "/admin/projetos" || pathname.startsWith("/admin/projetos/"),
      },
      {
        href: "/admin/fio",
        label: "Sintonia",
        icon: MessageCircle,
        active: pathname === "/admin/fio" || pathname.startsWith("/admin/fio/"),
        badge: globalUnreadCount,
      },
      {
        href: "/comunidade",
        label: "Vêneto",
        icon: Globe2,
        active: pathname === "/comunidade" || pathname.startsWith("/comunidade/"),
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: Briefcase,
        active: pathname === "/admin/analytics",
      },
      ...(isManagerOrAdmin ? [{
        href: "/admin/financeiro",
        label: "B&P",
        icon: Landmark,
        active: pathname === "/admin/financeiro" || pathname.startsWith("/admin/financeiro/"),
      }] : []),
    ];

    return createPortal(
      <div
        className="fixed bottom-2 inset-x-0 z-[100] flex justify-center pointer-events-none"
        style={{
          position: "fixed",
          bottom: "8px",
          left: 0,
          right: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
          zIndex: 100,
        }}
      >
        <motion.nav
          initial={{ y: 25, opacity: 0, scale: 0.95 }}
          animate={{
            y: isEngaged ? 0 : 5,
            opacity: isEngaged ? 1 : 0.40,
            scale: isEngaged ? 1 : 0.88,
          }}
          whileHover={{ opacity: 1, scale: 1, y: 0 }}
          whileTap={{ opacity: 1, scale: 0.98, y: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          onMouseEnter={() => setIsEngaged(true)}
          onMouseLeave={() => setIsEngaged(false)}
          onTouchStart={wakeBar}
          className="pointer-events-auto relative flex items-center p-1.5 rounded-full bg-white/70 backdrop-blur-2xl border border-black/5 shadow-xs hover:shadow-[0_16px_36px_rgba(13,29,48,0.14)] ring-1 ring-black/5 overflow-hidden transition-shadow"
        >
          {/* Fundo decorativo suave com Ativo 14.svg em opacidade 10 */}
          <div
            className="absolute inset-0 pointer-events-none rounded-full opacity-10 bg-center bg-repeat"
            style={{
              backgroundImage: "url('/images/Ativo%2014.svg')",
              backgroundSize: "160px auto",
            }}
          />

          <div className="relative z-10 flex items-center gap-1.5">
            {teamNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={`relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
                    item.active
                      ? "px-4 py-2 bg-gradient-to-r from-[var(--color-veronna-navy)] to-[var(--color-veronna-royal)] text-white shadow-xs"
                      : "p-2.5 text-gray-500 hover:text-[var(--color-atelier-grafite)] hover:bg-black/5"
                  }`}
                  title={`Ir para ${item.label}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center">
                      <Icon size={17} strokeWidth={item.active ? 2.2 : 1.8} className={item.active ? "text-[#B9D1E3]" : ""} />
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white shadow-xs ${
                            item.active ? "bg-[#B9D1E3]" : "bg-[#AE0A0A] animate-pulse"
                          }`}
                        />
                      )}
                    </div>
                    <AnimatePresence initial={false}>
                      {item.active && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="font-roboto text-[12px] font-bold tracking-wide whitespace-nowrap overflow-hidden flex items-center gap-1.5"
                        >
                          <span>{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.nav>
      </div>,
      document.body
    );
  }

  // Encontrar o projeto do cliente
  const project = projects?.find((p: any) => p.client_id === session?.user?.id && p.status === "active")
               || projects?.find((p: any) => p.client_id === session?.user?.id)
               || projects?.[0];

  const productType = getProductTypeFromProject(project);
  const isInstagram = productType === "instagram";

  // Não renderizar caso não seja cliente
  if (!isClient) {
    return null;
  }

  // Primeiro nome do cliente para rotular o botão inicial (ex: "Iuri")
  const rawName = profile?.nome || (profile as any)?.name || project?.client_name || "Projeto";
  const clientFirstName = rawName.trim().split(" ")[0] || "Projeto";

  const isIdv = productType === "idv";
  const homePath = isIdv ? "/" : "/cockpit";
  const isHomeActive = isIdv ? pathname === "/" : pathname === "/cockpit";
  const isVênetoActive = pathname.startsWith("/comunidade");

  return createPortal(
    <div
      className="fixed bottom-2 inset-x-0 z-[100] flex justify-center pointer-events-none"
      style={{
        position: "fixed",
        bottom: "8px",
        left: 0,
        right: 0,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      <motion.nav 
        initial={{ y: 25, opacity: 0, scale: 0.95 }}
        animate={{
          y: isEngaged ? 0 : 5,
          opacity: isEngaged ? 1 : 0.40,
          scale: isEngaged ? 1 : 0.88,
        }}
        whileHover={{ opacity: 1, scale: 1, y: 0 }}
        whileTap={{ opacity: 1, scale: 0.98, y: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        onMouseEnter={() => setIsEngaged(true)}
        onMouseLeave={() => setIsEngaged(false)}
        onTouchStart={wakeBar}
        className="pointer-events-auto relative flex items-center p-1.5 rounded-full bg-white/70 backdrop-blur-2xl border border-black/5 shadow-xs hover:shadow-[0_16px_36px_rgba(13,29,48,0.14)] ring-1 ring-black/5 overflow-hidden transition-shadow"
      >
        {/* Fundo decorativo suave com Ativo 14.svg em opacidade 10 */}
        <div
          className="absolute inset-0 pointer-events-none rounded-full opacity-10 bg-center bg-repeat"
          style={{
            backgroundImage: "url('/images/Ativo%2014.svg')",
            backgroundSize: "160px auto",
          }}
        />

        <div className="relative z-10 flex items-center gap-1.5">
          {/* Botão Página Inicial (Nome do Cliente quando ativo, apenas ícone quando inativo) */}
          <button
            type="button"
            onClick={() => router.push(homePath)}
            className={`relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
              isHomeActive 
                ? "px-4 py-2 bg-gradient-to-r from-[var(--color-veronna-navy)] to-[var(--color-veronna-royal)] text-white shadow-xs" 
                : "p-2.5 text-gray-500 hover:text-[var(--color-atelier-grafite)] hover:bg-black/5"
            }`}
            title={`Ir para ${clientFirstName}`}
          >
            <div className="flex items-center gap-2">
              <Home size={17} strokeWidth={isHomeActive ? 2.2 : 1.8} className={isHomeActive ? "text-[#B9D1E3]" : ""} />
              <AnimatePresence initial={false}>
                {isHomeActive && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="font-roboto text-[12px] font-bold tracking-wide whitespace-nowrap overflow-hidden"
                  >
                    {clientFirstName}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </button>

          {/* Botão Vêneto (Apenas ícone quando inativo, ícone + "Vêneto" quando ativo) */}
          <button
            type="button"
            onClick={() => router.push("/comunidade")}
            className={`relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
              isVênetoActive 
                ? "px-4 py-2 bg-gradient-to-r from-[var(--color-veronna-navy)] to-[var(--color-veronna-royal)] text-white shadow-xs" 
                : "p-2.5 text-gray-500 hover:text-[var(--color-atelier-grafite)] hover:bg-black/5"
            }`}
            title="Ir para Vêneto"
          >
            <div className="flex items-center gap-2">
              <Globe2 size={17} strokeWidth={isVênetoActive ? 2.2 : 1.8} className={isVênetoActive ? "text-[#B9D1E3]" : ""} />
              <AnimatePresence initial={false}>
                {isVênetoActive && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="font-roboto text-[12px] font-bold tracking-wide whitespace-nowrap overflow-hidden"
                  >
                    Vêneto
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </button>
        </div>
      </motion.nav>
    </div>,
    document.body
  );
}
