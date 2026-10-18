// src/components/layout/InstagramClientNavPill.tsx
"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Globe2 } from "lucide-react";
import { useSession } from "../../hooks/useSession";
import { useProfile } from "../../hooks/useProfile";
import { useProjects } from "../../hooks/useProjects";
import { getProductTypeFromProject } from "@/lib/productHelper";

interface InstagramClientNavPillProps {
  inline?: boolean;
}

export default function InstagramClientNavPill({ inline = false }: InstagramClientNavPillProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: profile } = useProfile();
  const { data: projects } = useProjects();

  const userRole = session?.user?.role || "client";
  const isTeamMember = ["admin", "gestor", "colaborador"].includes(userRole);
  const isContador = userRole === "contador";
  const isClient = !isTeamMember && !isContador;

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

  // Não renderizar na página de login
  if (pathname === "/login") return null;

  // Primeiro nome do cliente para rotular o botão inicial (ex: "Iuri")
  const rawName = profile?.nome || (profile as any)?.name || project?.client_name || "Projeto";
  const clientFirstName = rawName.trim().split(" ")[0] || "Projeto";

  const isIdv = productType === "idv";
  const homePath = isIdv ? "/" : "/cockpit";
  const isHomeActive = isIdv ? pathname === "/" : pathname === "/cockpit";
  const isComunidadeActive = pathname.startsWith("/comunidade");

  return (
    <div className={inline ? "pointer-events-auto" : "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"}>
      <motion.nav 
        initial={{ y: inline ? 10 : 25, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        className="flex items-center gap-1.5 p-1.5 rounded-full bg-white/85 backdrop-blur-2xl border border-white/80 shadow-[0_16px_36px_rgba(40,30,25,0.14)] ring-1 ring-black/5"
      >
        {/* Botão Página Inicial (Nome do Cliente quando ativo, apenas ícone quando inativo) */}
        <button
          type="button"
          onClick={() => router.push(homePath)}
          className={`relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
            isHomeActive 
              ? "px-4 py-2 bg-gradient-to-r from-[var(--color-atelier-terracota)] to-[#8c562e] text-white shadow-xs" 
              : "p-2.5 text-gray-500 hover:text-[var(--color-atelier-grafite)] hover:bg-black/5"
          }`}
          title={`Ir para ${clientFirstName}`}
        >
          <div className="flex items-center gap-2">
            <Home size={17} strokeWidth={isHomeActive ? 2.2 : 1.8} className={isHomeActive ? "text-amber-100" : ""} />
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

        {/* Separador vertical sutil */}
        <div className="w-[1px] h-4 bg-gray-200/80 my-auto" />

        {/* Botão Comunidade (Apenas ícone quando inativo, ícone + "Comunidade" quando ativo) */}
        <button
          type="button"
          onClick={() => router.push("/comunidade")}
          className={`relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
            isComunidadeActive 
              ? "px-4 py-2 bg-gradient-to-r from-[var(--color-atelier-terracota)] to-[#8c562e] text-white shadow-xs" 
              : "p-2.5 text-gray-500 hover:text-[var(--color-atelier-grafite)] hover:bg-black/5"
          }`}
          title="Ir para Comunidade"
        >
          <div className="flex items-center gap-2">
            <Globe2 size={17} strokeWidth={isComunidadeActive ? 2.2 : 1.8} className={isComunidadeActive ? "text-amber-100" : ""} />
            <AnimatePresence initial={false}>
              {isComunidadeActive && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="font-roboto text-[12px] font-bold tracking-wide whitespace-nowrap overflow-hidden"
                >
                  Comunidade
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </button>
      </motion.nav>
    </div>
  );
}
