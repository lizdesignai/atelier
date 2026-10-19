// src/components/comunidade/LeftSidebar.tsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid,
  HelpCircle,
  Users,
  FlaskConical,
  BookOpen,
  Compass,
  ArrowLeft,
} from "lucide-react";
import { normalizeImageUrl, handleAvatarError } from "../../lib/imageUtils";

interface LeftSidebarProps {
  userProfile: any;
  unansweredCount?: number;
  unreadDmCount?: number;
  recognitionsSummary?: {
    ajuda_util: number;
    curadoria: number;
    colaboracao: number;
    acolhimento: number;
    total: number;
  };
}

export default function LeftSidebar({
  userProfile,
  unansweredCount = 0,
  recognitionsSummary,
}: LeftSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentArea = searchParams?.get("area") || searchParams?.get("grupo") || "agora";

  const isTeamMember = ["admin", "gestor", "colaborador"].includes(userProfile?.role || "");

  const getRoleBadge = (profile?: any) => {
    if (profile?.cargo && String(profile.cargo).trim()) return profile.cargo;
    if (profile?.role === "admin") return "Fundadora";
    if (profile?.role === "gestor") return "Gestor de Projetos";
    if (profile?.role === "colaborador") return "Designer";
    return profile?.area_atuacao || "Membro · Vêneto";
  };

  // Cálculo de completude do perfil profissional
  const profileSteps = [
    Boolean(userProfile?.bio && String(userProfile.bio).trim()),
    Boolean(userProfile?.area_atuacao || userProfile?.cargo),
    Boolean(userProfile?.o_que_oferece && String(userProfile.o_que_oferece).trim()),
    Boolean(userProfile?.o_que_procura && String(userProfile.o_que_procura).trim()),
    Boolean(userProfile?.dm_privacy && userProfile.dm_privacy !== "none"),
  ];
  const completedSteps = profileSteps.filter(Boolean).length;
  const profileCompletionPct = Math.round((completedSteps / profileSteps.length) * 100);

  const profileSlug = userProfile?.username || userProfile?.id || "";

  return (
    <aside className="hidden md:flex flex-col justify-between w-[265px] shrink-0 sticky top-4 h-[calc(100vh-48px)] overflow-y-auto custom-scrollbar gap-5 pb-4">
      <div className="flex flex-col gap-5">
        {/* CARTÃO DE PERFIL PROFISSIONAL */}
        <div className="glass-panel p-5 rounded-[2.2rem] bg-white/85 border border-white shadow-[0_12px_35px_rgba(20, 44, 72,0.05)] flex flex-col relative overflow-hidden group">
          <div className="flex items-center gap-3.5">
            <Link
              href={`/comunidade/perfil/${profileSlug}`}
              className="w-14 h-14 rounded-2xl border-2 border-[var(--color-atelier-creme)] shadow-sm relative bg-[var(--color-atelier-grafite)] text-white flex items-center justify-center font-elegant text-2xl shrink-0 overflow-hidden"
            >
              {userProfile?.avatar_url ? (
                <img
                  src={normalizeImageUrl(userProfile.avatar_url)}
                  alt={userProfile?.nome || "Avatar"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => handleAvatarError(e, userProfile?.nome)}
                />
              ) : (
                userProfile?.nome?.charAt(0) || "M"
              )}
            </Link>

            <div className="flex flex-col min-w-0">
              <Link
                href={`/comunidade/perfil/${profileSlug}`}
                className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-tight truncate hover:text-[var(--color-atelier-terracota)] transition-colors"
              >
                {userProfile?.nome || "Membro"}
              </Link>
              <p className="font-roboto text-[11px] text-[var(--color-atelier-terracota)] font-bold truncate">
                @{userProfile?.username || userProfile?.nome?.toLowerCase().replace(/\s+/g, "") || "membro"}
              </p>
              <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/60 truncate mt-0.5">
                {userProfile?.cargo || userProfile?.area_atuacao || userProfile?.empresa || "Membro Vêneto"}
              </span>
            </div>
          </div>

          <div className="mt-3.5 pt-3.5 border-t border-[var(--color-atelier-grafite)]/10 flex flex-col gap-2">
            <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/10 px-2.5 py-1 rounded-lg border border-[var(--color-atelier-terracota)]/15 w-fit">
              {getRoleBadge(userProfile)}
            </span>

            {/* Camada de Reconhecimento por Contribuição Útil */}
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              <div className="bg-white/75 border border-white rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/70 font-medium">Ajuda útil</span>
                <span className="font-roboto text-[11px] font-bold text-[var(--color-atelier-terracota)]">
                  {recognitionsSummary?.ajuda_util ?? 0}
                </span>
              </div>
              <div className="bg-white/75 border border-white rounded-xl px-2.5 py-1.5 flex items-center justify-between">
                <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/70 font-medium">Colaboração</span>
                <span className="font-roboto text-[11px] font-bold text-[var(--color-atelier-terracota)]">
                  {recognitionsSummary?.colaboracao ?? 0}
                </span>
              </div>
            </div>

            {profileCompletionPct < 100 && (
              <Link
                href={`/comunidade/perfil/${profileSlug}`}
                className="mt-1 p-2.5 rounded-xl bg-[var(--color-atelier-creme)]/70 hover:bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-terracota)]/15 transition-colors flex flex-col gap-1"
              >
                <div className="flex items-center justify-between text-[10px] font-roboto font-bold text-[var(--color-atelier-grafite)]">
                  <span>Configurar Perfil</span>
                  <span className="text-[var(--color-atelier-terracota)]">{profileCompletionPct}%</span>
                </div>
                <p className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/65 leading-tight">
                  Preencha seu perfil e ative conexões para aparecer em Pessoas.
                </p>
              </Link>
            )}
          </div>
        </div>

        {/* WIDGET: ARQUITETURA DO VÊNETO (Sem enumeração e sem Encontros) */}
        <div className="glass-panel p-5 rounded-[2.2rem] bg-white/85 border border-white shadow-[0_12px_35px_rgba(20, 44, 72,0.05)] flex flex-col gap-3">
          <div className="flex items-center justify-between px-1 pb-2.5 border-b border-[var(--color-atelier-grafite)]/10">
            <div className="flex items-center gap-2">
              <Compass size={15} className="text-[var(--color-atelier-terracota)]" />
              <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-none">
                Arquitetura do Vêneto
              </h3>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5">
            <NavItem
              href="/comunidade?area=agora"
              icon={<LayoutGrid size={17} strokeWidth={1.7} />}
              label="Feed"
              subtitle="Publicações e direção"
              active={pathname === "/comunidade" && (currentArea === "agora" || currentArea === "global")}
            />
            <NavItem
              href="/comunidade?area=trocas"
              icon={<HelpCircle size={17} strokeWidth={1.7} />}
              label="Trocas"
              subtitle="Perguntas e conversas abertas"
              badge={unansweredCount > 0 ? `${unansweredCount}` : undefined}
              active={pathname === "/comunidade" && currentArea === "trocas"}
            />
            <NavItem
              href="/comunidade?area=pessoas"
              icon={<Users size={17} strokeWidth={1.7} />}
              label="Pessoas"
              subtitle="Perfis abertos para conexões"
              active={
                (pathname === "/comunidade" && (currentArea === "pessoas" || currentArea === "networking")) ||
                pathname === "/comunidade/hub"
              }
            />
            <NavItem
              href="/comunidade?area=laboratorio"
              icon={<FlaskConical size={17} strokeWidth={1.7} />}
              label="Laboratório"
              subtitle="Projetos e feedback"
              active={pathname === "/comunidade" && (currentArea === "laboratorio" || currentArea === "feedback")}
            />
            <NavItem
              href="/comunidade?area=estudio"
              icon={<BookOpen size={17} strokeWidth={1.7} />}
              label="Estúdio"
              subtitle="Conteúdo do Studio Veronna"
              active={pathname === "/comunidade" && currentArea === "estudio"}
            />
          </nav>
        </div>
      </div>

      {/* BOTÃO ISOLADO NO CANTO INFERIOR ESQUERDO: VOLTAR À OPERAÇÃO */}
      {isTeamMember && (
        <div className="pt-2 mt-auto">
          <Link
            href="/admin/projetos"
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-[var(--color-atelier-creme)] hover:text-white font-roboto text-[12px] font-bold tracking-wide transition-all shadow-sm group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform shrink-0" />
            <span>Voltar à Operação</span>
          </Link>
        </div>
      )}
    </aside>
  );
}

function NavItem({
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