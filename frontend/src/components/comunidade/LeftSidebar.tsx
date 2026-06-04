// src/components/comunidade/LeftSidebar.tsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Globe2, Users, Lightbulb, User, LayoutDashboard } from "lucide-react";

interface LeftSidebarProps {
  userProfile: any;
}

export default function LeftSidebar({ userProfile }: LeftSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentGroup = searchParams?.get('grupo') || 'global';

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'gestor';
  const exp = userProfile?.exp || 0;
  const currentLevel = Math.floor(exp / 1000) + 1;
  const expInCurrentLevel = exp % 1000;
  const progressPercentage = (expInCurrentLevel / 1000) * 100;
  
  const getRankName = (currentExp: number, role?: string) => {
    if (role === 'admin' || role === 'gestor') return "Fundadora";
    if (!currentExp) return "Visionário";
    if (currentExp < 1000) return "Visionário";
    if (currentExp < 3000) return "Vanguardista";
    return "Titã do Legado";
  };

  return (
    <aside className="hidden md:flex flex-col w-[260px] shrink-0 sticky top-8 h-[calc(100vh-64px)] custom-scrollbar gap-6">
      
      {/* Cartão de Perfil Compacto (O Espelho) */}
      <div className="glass-panel p-6 rounded-[2rem] bg-white/80 border border-white shadow-[0_10px_30px_rgba(122,116,112,0.05)] flex flex-col items-center text-center relative overflow-hidden group">
        <div className="w-20 h-20 rounded-full border-[3px] border-[var(--color-atelier-creme)] shadow-md relative mb-3 bg-[var(--color-atelier-grafite)] text-white flex items-center justify-center font-elegant text-3xl z-10 overflow-hidden">
          {userProfile?.avatar_url ? (
            <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          ) : (
            userProfile?.nome?.charAt(0) || "U"
          )}
        </div>
        
        <h2 className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-tight">{userProfile?.nome}</h2>
        <p className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 mb-3">@{userProfile?.username || userProfile?.nome?.toLowerCase().replace(/\s/g, '')}</p>
        
        <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/10 px-3 py-1 rounded-full border border-[var(--color-atelier-terracota)]/20 mb-4">
          {getRankName(exp, userProfile?.role)} • Lvl {currentLevel}
        </span>

        <div className="w-full flex flex-col gap-1.5 px-2">
          <div className="w-full h-1.5 bg-[var(--color-atelier-grafite)]/5 rounded-full overflow-hidden shadow-inner">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} transition={{ duration: 1 }} className="h-full bg-[var(--color-atelier-terracota)] rounded-full relative" />
          </div>
          <p className="font-roboto text-[9px] font-bold text-[var(--color-atelier-grafite)]/40 text-right">{expInCurrentLevel} / 1000 XP</p>
        </div>
      </div>

      {/* Menu de Navegação Social (Contextual) */}
      <nav className="flex flex-col gap-2">
        <NavItem href="/comunidade" icon={<Globe2 size={20} strokeWidth={1.5} />} label="Mural Global" active={pathname === '/comunidade' && currentGroup === 'global'} />
        <NavItem href="/comunidade?grupo=networking" icon={<Users size={20} strokeWidth={1.5} />} label="Networking" active={currentGroup === 'networking'} />
        <NavItem href="/comunidade?grupo=feedback" icon={<Lightbulb size={20} strokeWidth={1.5} />} label="Feedback & Ideias" active={currentGroup === 'feedback'} />
        <div className="h-px w-full bg-[var(--color-atelier-grafite)]/5 my-2"></div>
        <NavItem href={`/comunidade/perfil/${userProfile?.username || userProfile?.id}`} icon={<User size={20} strokeWidth={1.5} />} label="O Meu Perfil" active={false} />
        
        {isAdmin && (
          <div className="mt-4">
            <NavItem href="/admin/projetos" icon={<LayoutDashboard size={20} strokeWidth={1.5} />} label="Voltar ao Estúdio" active={false} isSpecial />
          </div>
        )}
      </nav>
    </aside>
  );
}

// Sub-componente de Navegação Social Modularizado
function NavItem({ href, icon, label, active, isSpecial = false }: { href: string, icon: React.ReactNode, label: string, active: boolean, isSpecial?: boolean }) {
  return (
    <Link href={href} className={`
      relative flex items-center gap-4 p-3.5 rounded-2xl font-roboto text-[14px] font-bold transition-all duration-300 group overflow-hidden
      ${active ? "bg-white text-[var(--color-atelier-terracota)] shadow-sm border border-white" : "text-[var(--color-atelier-grafite)]/70 hover:bg-white/60 hover:text-[var(--color-atelier-grafite)] border border-transparent"}
      ${isSpecial ? "bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] hover:bg-[var(--color-atelier-terracota)] hover:text-white" : ""}
    `}>
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-md bg-[var(--color-atelier-terracota)]"></div>}
      <div className={`relative z-10 ${active ? 'ml-1' : 'group-hover:scale-110 transition-transform'}`}>
        {icon}
      </div>
      <span className="relative z-10 tracking-wide">{label}</span>
    </Link>
  );
}