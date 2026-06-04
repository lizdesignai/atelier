// src/app/comunidade/layout.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Globe2, Users, Lightbulb, User } from "lucide-react";
import { supabase } from "../../lib/supabase";
import LeftSidebar from "../../components/comunidade/LeftSidebar";
import RightSidebar from "../../components/comunidade/RightSidebar"; // NOVO: Importação do módulo direito

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

function ComunidadeContent({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Deteta em que grupo estamos para alterar a UI dinamicamente
  const currentGroup = searchParams?.get('grupo') || 'global';

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setUserProfile(data);
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  // ==========================================
  // LÓGICA DE TELA CHEIA ABSOLUTA PARA O PERFIL
  // ==========================================
  const isProfilePage = pathname.startsWith('/comunidade/perfil/');

  if (isProfilePage) {
    return (
      <div className="w-full font-roboto text-[var(--color-atelier-grafite)] relative flex flex-col items-center pb-20">
        <div className="w-full max-w-[1200px] px-4 md:px-8 py-4 flex justify-start relative z-20">
          <Link href="/comunidade" className="inline-flex items-center gap-2 text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors font-roboto text-[11px] uppercase tracking-widest font-bold">
            ← Voltar para a Comunidade
          </Link>
        </div>
        <div className="w-full">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center w-full font-roboto text-[var(--color-atelier-grafite)] relative min-h-[calc(100vh-80px)]">
      
      {/* Background Elements para dar profundidade (Mantidos para charme) */}
      <div className="fixed top-[-10%] left-[-5%] w-[500px] h-[500px] bg-[var(--color-atelier-terracota)]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
      
      <div className="max-w-[1200px] w-full flex gap-8 px-4 md:px-8 py-8 relative z-10">
        
        {/* ==========================================
            COLUNA ESQUERDA: PERFIL E NAVEGAÇÃO MODULAR
            ========================================== */}
        <LeftSidebar userProfile={userProfile} />

        {/* ==========================================
            COLUNA CENTRAL: O PALCO PRINCIPAL (50%)
            ========================================== */}
        <main className="flex-1 max-w-[600px] flex flex-col pb-24 md:pb-32">
          {children}
        </main>

        {/* ==========================================
            COLUNA DIREITA: GAMIFICAÇÃO E STATUS (25%)
            ========================================== */}
        <RightSidebar currentGroup={currentGroup} />

      </div>

      {/* ==========================================
          MOBILE BOTTOM NAVIGATION (Exclusivo para Telemóveis)
          ========================================== */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-[var(--color-atelier-grafite)]/10 z-50 px-6 py-3 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe">
        <MobileNavItem href="/comunidade" icon={<Globe2 size={24} />} active={pathname === '/comunidade' && currentGroup === 'global'} />
        <MobileNavItem href="/comunidade?grupo=networking" icon={<Users size={24} />} active={currentGroup === 'networking'} />
        <MobileNavItem href="/comunidade?grupo=feedback" icon={<Lightbulb size={24} />} active={currentGroup === 'feedback'} />
        <MobileNavItem href={`/comunidade/perfil/${userProfile?.username || userProfile?.id}`} icon={<User size={24} />} active={false} />
      </div>
    </div>
  );
}

// Sub-componente da Navegação Mobile
function MobileNavItem({ href, icon, active }: { href: string, icon: React.ReactNode, active: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${active ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] scale-110' : 'text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-grafite)]/80'}`}>
      {icon}
    </Link>
  );
}

// O ENVOLVÓCRIO DE SUSPENSE OBRIGATÓRIO NO NEXT.JS PARA useSearchParams()
export default function ComunidadeLayoutWithSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>}>
      <ComunidadeContent>{children}</ComunidadeContent>
    </Suspense>
  );
}