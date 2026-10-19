// src/app/comunidade/layout.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  LayoutGrid,
  HelpCircle,
  Users,
  FlaskConical,
  BookOpen,
  User,
} from "lucide-react";
import LeftSidebar from "../../components/comunidade/LeftSidebar";
import RightSidebar from "../../components/comunidade/RightSidebar";

function ComunidadeContent({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [unreadDmCount, setUnreadDmCount] = useState(0);
  const [recognitionsSummary, setRecognitionsSummary] = useState({
    ajuda_util: 0,
    curadoria: 0,
    colaboracao: 0,
    acolhimento: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentArea = searchParams?.get("area") || searchParams?.get("grupo") || "agora";

  const fetchLayoutContext = async () => {
    try {
      const res = await fetch("/api/veneto");
      if (res.ok) {
        const data = await res.json();
        if (data.currentUser) {
          setUserProfile(data.currentUser);
          const myMember = (data.members || []).find((m: any) => m.id === data.currentUser.id);
          if (myMember?.recognitions) {
            setRecognitionsSummary(myMember.recognitions);
          }
          const unread = (data.directMessages || []).filter(
            (dm: any) => dm.receiver_id === data.currentUser.id && !dm.is_read
          ).length;
          setUnreadDmCount(unread);
        }
        setUnansweredCount(data.healthMetrics?.questionsUnanswered || 0);
      }
    } catch (e) {
      console.error("Erro ao carregar layout do Vêneto:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLayoutContext();
    const handleRefresh = () => fetchLayoutContext();
    window.addEventListener("venetoUpdated", handleRefresh);
    return () => window.removeEventListener("venetoUpdated", handleRefresh);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  const isProfilePage = pathname.startsWith("/comunidade/perfil/");

  if (isProfilePage) {
    return (
      <div className="w-full font-roboto text-[var(--color-atelier-grafite)] relative flex flex-col items-center pb-20">
        <div className="w-full max-w-[1260px] px-4 md:px-8 py-4 flex items-center justify-between relative z-20">
          <Link
            href="/comunidade"
            className="inline-flex items-center gap-2 text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] transition-colors font-roboto text-[11px] uppercase tracking-widest font-bold bg-white/70 px-4 py-2 rounded-full border border-white shadow-xs"
          >
            ← Voltar para o Vêneto
          </Link>
          <span className="font-roboto text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--color-atelier-terracota)]">
            Vêneto · Perfil Profissional
          </span>
        </div>
        <div className="w-full">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex justify-center w-full font-roboto text-[var(--color-atelier-grafite)] relative min-h-[calc(100vh-80px)]">
      <div className="fixed top-[-10%] left-[-5%] w-[500px] h-[500px] bg-[var(--color-atelier-terracota)]/5 blur-[120px] rounded-full pointer-events-none z-0" />

      <div className="max-w-[1380px] w-full flex gap-6 lg:gap-7 px-2 md:px-4 py-4 relative z-10">
        {/* COLUNA ESQUERDA: PERFIL E ARQUITETURA DO VÊNETO */}
        <LeftSidebar
          userProfile={userProfile}
          unansweredCount={unansweredCount}
          unreadDmCount={unreadDmCount}
          recognitionsSummary={recognitionsSummary}
        />

        {/* COLUNA CENTRAL: PALCO PRINCIPAL DO VÊNETO */}
        <main className="flex-1 min-w-0 flex flex-col pb-28 md:pb-32">{children}</main>

        {/* COLUNA DIREITA: SUA REDE & ESPAÇO + CONEXÕES ABERTAS */}
        <RightSidebar
          currentGroup={currentArea}
          userProfile={userProfile}
          unreadDmCount={unreadDmCount}
        />
      </div>

      {/* BARRA MOBILE CONTEXTUAL DO VÊNETO (Sem Encontros) */}
      <div className="md:hidden fixed bottom-16 left-1/2 -translate-x-1/2 w-[92vw] max-w-[400px] bg-white/90 backdrop-blur-xl border border-white rounded-2xl z-40 px-2 py-1.5 flex justify-between items-center shadow-lg">
        <MobileNavItem
          href="/comunidade?area=agora"
          icon={<LayoutGrid size={16} />}
          label="Feed"
          active={pathname === "/comunidade" && (currentArea === "agora" || currentArea === "global")}
        />
        <MobileNavItem
          href="/comunidade?area=trocas"
          icon={<HelpCircle size={16} />}
          label="Trocas"
          active={currentArea === "trocas"}
        />
        <MobileNavItem
          href="/comunidade?area=pessoas"
          icon={<Users size={16} />}
          label="Pessoas"
          active={currentArea === "pessoas" || currentArea === "networking"}
        />
        <MobileNavItem
          href="/comunidade?area=laboratorio"
          icon={<FlaskConical size={16} />}
          label="Lab"
          active={currentArea === "laboratorio" || currentArea === "feedback"}
        />
        <MobileNavItem
          href="/comunidade?area=estudio"
          icon={<BookOpen size={16} />}
          label="Estúdio"
          active={currentArea === "estudio"}
        />
        <MobileNavItem
          href={`/comunidade/perfil/${userProfile?.username || userProfile?.id}`}
          icon={<User size={16} />}
          label="Perfil"
          active={false}
        />
      </div>
    </div>
  );
}

function MobileNavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-xl transition-all ${
        active
          ? "bg-[var(--color-atelier-terracota)]/15 text-[var(--color-atelier-terracota)] font-bold"
          : "text-[var(--color-atelier-grafite)]/55 hover:text-[var(--color-atelier-grafite)]"
      }`}
    >
      {icon}
      <span className="text-[8.5px] font-roboto mt-0.5">{label}</span>
    </Link>
  );
}

export default function ComunidadeLayoutWithSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
        </div>
      }
    >
      <ComunidadeContent>{children}</ComunidadeContent>
    </Suspense>
  );
}