// src/app/comunidade/layout.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Globe2, Users, Lightbulb, User, 
  LayoutDashboard, Loader2, Award, Medal, Compass, Sparkles, MapPin
} from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function ComunidadeLayout({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

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
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-atelier-creme)]">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'gestor';
  const exp = userProfile?.exp || 0;
  const currentLevel = Math.floor(exp / 1000) + 1;
  const expInCurrentLevel = exp % 1000;
  const progressPercentage = (expInCurrentLevel / 1000) * 100;
  
  const getRankName = (currentExp: number) => {
    if (isAdmin) return "Mentor VRTICE";
    if (currentExp < 1000) return "Visionário";
    if (currentExp < 3000) return "Vanguardista";
    return "Titã do Legado";
  };

  return (
    <div className="min-h-screen bg-[var(--color-atelier-creme)] flex justify-center w-full font-roboto text-[var(--color-atelier-grafite)] relative">
      
      {/* Background Elements para dar profundidade */}
      <div className="fixed top-[-10%] left-[-5%] w-[500px] h-[500px] bg-[var(--color-atelier-terracota)]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
      
      <div className="max-w-[1200px] w-full flex gap-8 px-4 md:px-8 py-8 relative z-10">
        
        {/* ==========================================
            COLUNA ESQUERDA: PERFIL E NAVEGAÇÃO (25%)
            ========================================== */}
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
              {getRankName(exp)} • Lvl {currentLevel}
            </span>

            <div className="w-full flex flex-col gap-1.5 px-2">
              <div className="w-full h-1.5 bg-[var(--color-atelier-grafite)]/5 rounded-full overflow-hidden shadow-inner">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} transition={{ duration: 1 }} className="h-full bg-[var(--color-atelier-terracota)] rounded-full relative" />
              </div>
              <p className="font-roboto text-[9px] font-bold text-[var(--color-atelier-grafite)]/40 text-right">{expInCurrentLevel} / 1000 XP</p>
            </div>
          </div>

          {/* Menu de Navegação Social */}
          <nav className="flex flex-col gap-2">
            <NavItem href="/comunidade" icon={<Globe2 size={20} strokeWidth={1.5} />} label="Mural Global" active={pathname === '/comunidade'} />
            <NavItem href="/comunidade?grupo=networking" icon={<Users size={20} strokeWidth={1.5} />} label="Networking" active={pathname.includes('networking')} />
            <NavItem href="/comunidade?grupo=feedback" icon={<Lightbulb size={20} strokeWidth={1.5} />} label="Feedback & Ideias" active={pathname.includes('feedback')} />
            <div className="h-px w-full bg-[var(--color-atelier-grafite)]/5 my-2"></div>
            <NavItem href={`/comunidade/perfil/${userProfile?.username || userProfile?.id}`} icon={<User size={20} strokeWidth={1.5} />} label="O Meu Perfil" active={pathname.includes('/perfil')} />
            
            {isAdmin && (
              <div className="mt-4">
                <NavItem href="/admin/projetos" icon={<LayoutDashboard size={20} strokeWidth={1.5} />} label="Voltar ao Estúdio" active={false} isSpecial />
              </div>
            )}
          </nav>
        </aside>

        {/* ==========================================
            COLUNA CENTRAL: O PALCO PRINCIPAL (50%)
            ========================================== */}
        <main className="flex-1 max-w-[600px] flex flex-col min-h-screen pb-32">
          {/* O conteúdo das páginas (Feed, Grupos, Perfil) será injetado aqui dinamicamente */}
          {children}
        </main>

        {/* ==========================================
            COLUNA DIREITA: GAMIFICAÇÃO E STATUS (25%)
            ========================================== */}
        <aside className="hidden lg:flex flex-col w-[300px] shrink-0 sticky top-8 h-[calc(100vh-64px)] custom-scrollbar gap-6" id="right-sidebar-slot">
           
           {/* Bloco 1: A Roda do Legado (Mini-Widget) */}
           <div className="glass-panel p-6 rounded-[2rem] bg-white/60 border border-white shadow-[0_10px_30px_rgba(122,116,112,0.05)] flex flex-col gap-4">
             <div className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-3">
               <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                  <Medal size={18} className="text-[var(--color-atelier-terracota)]" /> Roda do Legado
               </h3>
             </div>
             <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/60 leading-relaxed">
               Complete missões da sua marca e partilhe os resultados no Mural para ganhar XP e subir de Rank.
             </p>
             <button className="w-full py-2.5 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-roboto text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors">
               Ver Missões Disponíveis
             </button>
           </div>

           {/* Bloco 2: Titãs do Atelier (Leaderboard) */}
           <div className="glass-panel p-6 rounded-[2rem] bg-white/60 border border-white shadow-[0_10px_30px_rgba(122,116,112,0.05)] flex flex-col gap-4">
             <div className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/10 pb-3">
               <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                  <Award size={18} className="text-[var(--color-atelier-terracota)]" /> Titãs em Destaque
               </h3>
             </div>
             
             {/* Mockup do Leaderboard (Será dinâmico na próxima fase) */}
             <div className="flex flex-col gap-4 mt-2">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)] text-white flex items-center justify-center font-elegant text-lg shadow-md">1</div>
                 <div className="flex flex-col">
                   <span className="font-roboto text-[13px] font-bold text-[var(--color-atelier-grafite)]">Liz Design</span>
                   <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50">Titã do Mercado • 4500 XP</span>
                 </div>
               </div>
               <div className="flex items-center gap-3 opacity-80">
                 <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-elegant text-lg">2</div>
                 <div className="flex flex-col">
                   <span className="font-roboto text-[13px] font-bold text-[var(--color-atelier-grafite)]">Membro Oculto</span>
                   <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50">Expansão • 2100 XP</span>
                 </div>
               </div>
             </div>
           </div>

        </aside>

      </div>
    </div>
  );
}

// Sub-componente de Navegação Social
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