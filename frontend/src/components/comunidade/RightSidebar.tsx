// src/components/comunidade/RightSidebar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  ShieldCheck,
  HeartHandshake,
  MessageSquare,
  Bookmark,
  User,
} from "lucide-react";
import { normalizeImageUrl, handleAvatarError } from "../../lib/imageUtils";

interface RightSidebarProps {
  currentGroup?: string;
  userProfile?: any;
  unreadDmCount?: number;
}

export default function RightSidebar({
  currentGroup,
  userProfile,
  unreadDmCount = 0,
}: RightSidebarProps) {
  const pathname = usePathname();
  const [recommendedMembers, setRecommendedMembers] = useState<any[]>([]);

  const isAdminOrGestor = ["admin", "gestor"].includes(userProfile?.role || "");
  const currentArea = currentGroup || "agora";

  useEffect(() => {
    const loadSidebarContext = async () => {
      try {
        const res = await fetch("/api/veneto");
        if (!res.ok) return;
        const data = await res.json();

        // Abertos para conexão: apenas usuários que preencheram as informações necessárias
        // e selecionaram que estão abertos a conexões, com Liz Oliveira e Igor Oliveira em evidência
        const recs = (data.members || [])
          .filter((m: any) => {
            const isOpen = Boolean(m.dm_privacy && m.dm_privacy !== "none");
            const hasCompleted = Boolean(m.veneto_onboarding_done || m.role === "admin" || m.role === "gestor");
            const hasBio = Boolean(m.bio && String(m.bio).trim().length > 5);
            const hasInfo = Boolean(
              (m.area_atuacao && String(m.area_atuacao).trim()) ||
                (m.cargo && String(m.cargo).trim()) ||
                (m.o_que_oferece && String(m.o_que_oferece).trim())
            );
            return isOpen && hasCompleted && hasBio && hasInfo;
          })
          .sort((a: any, b: any) => {
            const rank = (m: any) => {
              if (m.role === "admin") return 0; // Liz Oliveira em evidência
              if (m.role === "gestor") return 1; // Igor Oliveira em evidência
              return 2;
            };
            return rank(a) - rank(b);
          })
          .slice(0, 6);

        setRecommendedMembers(recs);
      } catch (e) {
        console.error("Erro ao carregar contexto lateral do Vêneto:", e);
      }
    };

    loadSidebarContext();

    const handleRefresh = () => loadSidebarContext();
    window.addEventListener("venetoUpdated", handleRefresh);
    return () => window.removeEventListener("venetoUpdated", handleRefresh);
  }, [currentGroup]);

  const profileSlug = userProfile?.username || userProfile?.id || "";

  return (
    <aside className="hidden xl:flex flex-col w-[285px] shrink-0 sticky top-4 h-[calc(100vh-48px)] overflow-y-auto custom-scrollbar gap-5 pb-10">
      {/* 1. SUA REDE & ESPAÇO */}
      <div className="glass-panel p-5 rounded-[2.2rem] bg-white/85 border border-white shadow-[0_12px_35px_rgba(20, 44, 72,0.05)] flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-2.5 px-1">
          <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-none">
            Sua Rede & Espaço
          </h3>
        </div>

        <nav className="flex flex-col gap-1.5">
          <SpaceNavItem
            href="/comunidade?area=mensagens"
            icon={<MessageSquare size={16} strokeWidth={1.7} />}
            label="Mensagens Privadas"
            badge={unreadDmCount > 0 ? String(unreadDmCount) : undefined}
            active={pathname === "/comunidade" && currentArea === "mensagens"}
          />
          <SpaceNavItem
            href="/comunidade?area=salvos"
            icon={<Bookmark size={16} strokeWidth={1.7} />}
            label="Materiais Salvos"
            active={pathname === "/comunidade" && currentArea === "salvos"}
          />
          <SpaceNavItem
            href="/comunidade/missoes"
            icon={<HeartHandshake size={16} strokeWidth={1.7} />}
            label="Ciclo de Valor"
            subtitle="Reconhecimentos da rede"
            active={pathname === "/comunidade/missoes"}
          />
          <SpaceNavItem
            href={`/comunidade/perfil/${profileSlug}`}
            icon={<User size={16} strokeWidth={1.7} />}
            label="Meu Perfil Profissional"
            active={pathname.startsWith("/comunidade/perfil/")}
          />
          <SpaceNavItem
            href="/comunidade?area=moderacao"
            icon={<ShieldCheck size={16} strokeWidth={1.7} />}
            label={isAdminOrGestor ? "Saúde & Moderação" : "Segurança & Regras"}
            subtitle={isAdminOrGestor ? "Métricas de valor e curadoria" : "Privacidade e consentimento"}
            active={pathname === "/comunidade" && currentArea === "moderacao"}
          />
        </nav>
      </div>

      {/* 2. ABERTOS PARA CONEXÃO (Perfis em evidência: Liz Oliveira e Igor Oliveira + quem preencher e abrir) */}
      {recommendedMembers.length > 0 && (
        <div className="glass-panel p-5 rounded-[2.2rem] bg-white/85 border border-white shadow-[0_12px_35px_rgba(20, 44, 72,0.05)] flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-2.5 px-1">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-[var(--color-atelier-terracota)]" />
              <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-none">
                Abertos para Conexão
              </h3>
            </div>
            <Link
              href="/comunidade?area=pessoas"
              className="font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] hover:underline"
            >
              Ver todos
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {recommendedMembers.map((member) => {
              const roleTag =
                member.cargo ||
                (member.role === "admin"
                  ? "Fundadora"
                  : member.role === "gestor"
                  ? "Gestor de Projetos"
                  : null);

              return (
                <Link
                  key={member.id}
                  href={`/comunidade/perfil/${member.username || member.id}`}
                  className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/70 hover:bg-white border border-transparent hover:border-[var(--color-atelier-terracota)]/20 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] flex items-center justify-center font-elegant text-lg shrink-0 border border-white shadow-xs">
                    {member.avatar_url ? (
                      <img
                        src={normalizeImageUrl(member.avatar_url)}
                        alt={member.nome}
                        className="w-full h-full object-cover"
                        onError={(e) => handleAvatarError(e, member.nome)}
                      />
                    ) : (
                      member.nome?.charAt(0) || "M"
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-roboto text-[12px] font-bold text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate">
                        {member.nome}
                      </span>
                      {roleTag && (
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] shrink-0">
                          {roleTag}
                        </span>
                      )}
                    </div>
                    <span className="font-roboto text-[10px] text-[var(--color-atelier-terracota)] font-bold truncate">
                      @{member.username || member.nome?.toLowerCase().replace(/\s+/g, "")}
                    </span>
                    <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/60 truncate">
                      {member.area_atuacao || member.cargo || member.empresa}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}

function SpaceNavItem({
  href,
  icon,
  label,
  subtitle,
  badge,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  badge?: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        relative flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-roboto transition-all duration-300 group overflow-hidden
        ${
          active
            ? "bg-[var(--color-atelier-creme)]/85 text-[var(--color-atelier-terracota)] shadow-2xs border border-[var(--color-atelier-terracota)]/20"
            : "text-[var(--color-atelier-grafite)]/75 hover:bg-white hover:text-[var(--color-atelier-grafite)] border border-transparent"
        }
      `}
    >
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-md bg-[var(--color-atelier-terracota)]" />
      )}
      <div
        className={`relative z-10 shrink-0 ${
          active ? "ml-0.5 text-[var(--color-atelier-terracota)]" : "group-hover:scale-105 transition-transform"
        }`}
      >
        {icon}
      </div>
      <div className="relative z-10 flex flex-col min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[12.5px] font-bold tracking-wide truncate">{label}</span>
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--color-atelier-terracota)]/12 text-[var(--color-atelier-terracota)] font-roboto text-[9px] font-bold uppercase tracking-wider shrink-0">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <span className="text-[10px] leading-tight truncate text-[var(--color-atelier-grafite)]/50">
            {subtitle}
          </span>
        )}
      </div>
    </Link>
  );
}