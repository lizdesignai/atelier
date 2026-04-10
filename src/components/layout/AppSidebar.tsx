// src/components/layout/AppSidebar.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, Lock, MessageSquare, ChevronLeft, ChevronRight, 
  Compass, LayoutDashboard, FolderKanban, Users, Inbox, 
  Globe2, CheckCircle2, DollarSign, Sparkles, Briefcase, Crosshair, LogOut
} from "lucide-react";
import { supabase } from "../../lib/supabase"; // Note: Adjust the import path if necessary based on your project structure

interface AppSidebarProps {
  userRole: string;
  handleLogout?: () => void;
  onHideSidebar: (hidden: boolean) => void;
}

export default function AppSidebar({ userRole, handleLogout, onHideSidebar }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [clientServiceType, setClientServiceType] = useState<string>("Identidade Visual");
  const [isProjectArchived, setIsProjectArchived] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  
  // HIERARQUIA DE ACESSO
  const isTeamMember = ['admin', 'gestor', 'colaborador'].includes(userRole);
  const isManagerOrAdmin = ['admin', 'gestor'].includes(userRole);
  const isAdminOnly = userRole === 'admin';

  // LÓGICA CORE INTACTA
  useEffect(() => {
    const fetchSidebarData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (!isTeamMember) {
        const { data: project } = await supabase
          .from('projects')
          .select('status, delivered_at, service_type')
          .eq('client_id', session.user.id)
          .in('status', ['active', 'delivered', 'archived'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        let shouldArchive = false;
        let service = "Identidade Visual";

        if (project) {
          service = project.service_type || "Identidade Visual";
          setClientServiceType(service);

          if (project.status === 'archived') {
            shouldArchive = true;
          } else if (project.status === 'delivered' && project.delivered_at) {
            const deliveredDate = new Date(project.delivered_at);
            const diffDays = Math.ceil(Math.abs(new Date().getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 15) {
              shouldArchive = true;
              supabase.from('projects').update({ status: 'archived' }).eq('client_id', session.user.id).then();
            }
          }
        } else {
          shouldArchive = true;
        }

        setIsProjectArchived(shouldArchive);
        onHideSidebar(shouldArchive);

        const isInstagram = service === "Gestão de Instagram";

        // BLINDAGEM DE ROTAS
        if (shouldArchive) {
          const lockedRoutes = ['/', '/cofre', '/referencias', '/cockpit', '/curadoria', '/cofre-missoes'];
          if (lockedRoutes.includes(pathname)) router.replace('/comunidade');
        } else {
          if (isInstagram && (pathname === '/' || pathname === '/cofre' || pathname === '/referencias')) {
            router.replace('/cockpit');
          } else if (!isInstagram && (pathname === '/cockpit' || pathname === '/curadoria' || pathname === '/cofre-missoes')) {
            router.replace('/');
          }
        }
      }
      
      setIsReady(true);
    };

    fetchSidebarData();
  }, [pathname, isTeamMember, router, onHideSidebar]);

  if (!isTeamMember && (isProjectArchived || !isReady)) return null;

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 88 : 280 }}
      transition={{ type: "spring", stiffness: 350, damping: 35, mass: 1 }}
      className={`
        relative z-50 flex flex-col shrink-0 
        h-[calc(100vh-2rem)] my-4 ml-4 rounded-[2.5rem]
        bg-white/40 backdrop-blur-2xl border border-white/60 
        shadow-[8px_8px_32px_rgba(122,116,112,0.04)]
      `}
    >
      {/* CABEÇALHO DA SIDEBAR: LOGO E BRANDING */}
      <div className={`pt-10 pb-6 px-6 flex items-center h-28 shrink-0 ${isCollapsed ? 'justify-center px-0' : 'justify-start gap-4'}`}>
        <div className="w-10 h-10 shrink-0 relative group cursor-pointer flex items-center justify-center">
          <div className="absolute inset-0 bg-[var(--color-atelier-terracota)]/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700 opacity-0 group-hover:opacity-100"></div>
          <img src="/images/simbolo-rosa.png" alt="Atelier" className="w-8 h-8 object-contain relative z-10 drop-shadow-sm transition-transform duration-500 group-hover:scale-105" />
        </div>
        
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -10, transition: { duration: 0.1 } }}
              className="flex flex-col overflow-hidden whitespace-nowrap"
            >
              <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none mb-0.5 tracking-tight">Atelier</span>
              <span className="font-roboto text-[0.55rem] text-[var(--color-atelier-terracota)] tracking-[0.25em] uppercase font-bold">
                {isTeamMember ? 'Studio HQ' : 'Portal do Cliente'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTÃO DE COLAPSO FLUTUANTE (Design Refinado) */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-14 bg-white/90 backdrop-blur-md border border-[var(--color-atelier-grafite)]/10 shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-[var(--color-atelier-grafite)]/60 rounded-full w-7 h-7 flex items-center justify-center cursor-pointer z-50 hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all duration-300 hover:scale-110 hover:border-transparent"
      >
        {isCollapsed ? <ChevronRight size={14} strokeWidth={2.5} /> : <ChevronLeft size={14} strokeWidth={2.5} />}
      </button>

      {/* ÁREA DE NAVEGAÇÃO LÍMPIDA */}
      {/* 🟢 Adicionado flex e flex-col aqui para que o mt-auto funcione */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2 custom-scrollbar relative flex flex-col">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-[0.6rem] uppercase font-bold text-[var(--color-atelier-grafite)]/30 tracking-[0.2em] mb-4 pl-4 mt-2"
            >
              {isTeamMember ? 'Operacional' : 'Visão Geral'}
            </motion.div>
          )}
        </AnimatePresence>
        
        <nav className="flex flex-col gap-1.5 relative pb-8 flex-1">
          
          {/* MENU PARA CLIENTES */}
          {!isTeamMember && (
            <>
              {clientServiceType === "Gestão de Instagram" ? (
                <>
                  <NavItem href="/cockpit" icon={<LayoutDashboard size={18} strokeWidth={1.5} />} label="Cockpit" collapsed={isCollapsed} active={pathname === '/cockpit'} />
                  <NavItem href="/brandbook" icon={<Sparkles size={18} strokeWidth={1.5} />} label="Brandbook" collapsed={isCollapsed} active={pathname === '/brandbook'} />
                  <NavItem href="/curadoria" icon={<CheckCircle2 size={18} strokeWidth={1.5} />} label="Curadoria" collapsed={isCollapsed} active={pathname === '/curadoria'} />
                </>
              ) : (
                <>
                  <NavItem href="/" icon={<Home size={18} strokeWidth={1.5} />} label="Cockpit" collapsed={isCollapsed} active={pathname === '/'} />
                  <NavItem href="/cofre" icon={<Lock size={18} strokeWidth={1.5} />} label="O Cofre" collapsed={isCollapsed} active={pathname === '/cofre'} />
                  <NavItem href="/referencias" icon={<Compass size={18} strokeWidth={1.5} />} label="Referências" collapsed={isCollapsed} active={pathname === '/referencias'} />
                </>
              )}
              
              <div className="flex items-center justify-center my-3 opacity-20">
                <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-[var(--color-atelier-grafite)] to-transparent"></div>
              </div>
              
              <NavItem href="/canais" icon={<MessageSquare size={18} strokeWidth={1.5} />} label="Canais" collapsed={isCollapsed} active={pathname === '/canais'} />
              <NavItem href="/comunidade" icon={<Globe2 size={18} strokeWidth={1.5} />} label="Comunidade" collapsed={isCollapsed} active={pathname === '/comunidade'} />
            </>
          )}

          {/* MENU PARA EQUIPA DO ESTÚDIO */}
          {isTeamMember && (
            <>
              {/* Visto por todos */}
              <NavItem href="/admin/jtbd" icon={<Crosshair size={18} strokeWidth={1.5} />} label="Focus" collapsed={isCollapsed} active={pathname === '/admin/jtbd'} />
              <NavItem href="/admin" icon={<LayoutDashboard size={18} strokeWidth={1.5} />} label="Gestão" collapsed={isCollapsed} active={pathname === '/admin'} />
              <NavItem href="/admin/projetos" icon={<FolderKanban size={18} strokeWidth={1.5} />} label="Estúdio" collapsed={isCollapsed} active={pathname === '/admin/projetos'} />
              <NavItem href="/admin/inbox" icon={<Inbox size={18} strokeWidth={1.5} />} label="Inbox" collapsed={isCollapsed} active={pathname === '/admin/inbox'} />
              <NavItem href="/comunidade" icon={<Globe2 size={18} strokeWidth={1.5} />} label="Comunidade" collapsed={isCollapsed} active={pathname === '/comunidade'} />
              
              <div className="flex items-center justify-center my-3 opacity-20">
                <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-[var(--color-atelier-grafite)] to-transparent"></div>
              </div>
              
              {/* Visto apenas por Gestor e Admin */}
              {isManagerOrAdmin && (
                <>
                  <NavItem href="/admin/clientes" icon={<Users size={18} strokeWidth={1.5} />} label="Clientes" collapsed={isCollapsed} active={pathname === '/admin/clientes'} />
                  <NavItem href="/admin/analytics" icon={<Briefcase size={18} strokeWidth={1.5} />} label="Analytics" collapsed={isCollapsed} active={pathname === '/admin/analytics'} />
                </>
              )}

              {/* Visto apenas por Admin */}
              {isAdminOnly && (
                <NavItem href="/admin/financeiro" icon={<DollarSign size={18} strokeWidth={1.5} />} label="Financeiro" collapsed={isCollapsed} active={pathname === '/admin/financeiro'} />
              )}
            </>
          )}

          {/* 🟢 BOTÃO DE DESCONECTAR (Ajustado com mt-auto e cores vermelhas) */}
          <button 
            onClick={() => handleLogout && handleLogout()}
            title={isCollapsed ? "Desconectar" : ""} 
            className={`
              mt-auto relative flex items-center ${isCollapsed ? 'justify-center' : 'justify-start pl-4'} gap-4 p-3 rounded-[1.2rem] 
              font-roboto text-[13px] transition-colors duration-300 group outline-none cursor-pointer
              text-red-500/80 font-medium hover:text-red-600
            `}
          >
            <div className="absolute inset-0 bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.2rem] -z-10"></div>
            <div className="relative z-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <LogOut size={18} strokeWidth={1.5} />
            </div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span 
                  initial={{ opacity: 0, x: -5 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -5, transition: { duration: 0.1 } }}
                  className="relative z-10 tracking-wide whitespace-nowrap pt-0.5 font-bold"
                >
                  Desconectar
                </motion.span>
              )}
            </AnimatePresence>
          </button>

        </nav>
      </div>
    </motion.aside>
  );
}

// ==========================================
// COMPONENTE DE ITEM DE NAVEGAÇÃO COM FÍSICA E UX PREMIUM
// ==========================================
function NavItem({ href, icon, label, collapsed, active }: { href: string, icon: React.ReactNode, label: string, collapsed: boolean, active: boolean }) {
  return (
    <Link 
      href={href} 
      title={collapsed ? label : ""} 
      className={`
        relative flex items-center ${collapsed ? 'justify-center' : 'justify-start pl-4'} gap-4 p-3 rounded-[1.2rem] 
        font-roboto text-[13px] transition-colors duration-300 group outline-none
        ${active ? "text-[var(--color-atelier-terracota)] font-bold" : "text-[var(--color-atelier-grafite)]/60 font-medium hover:text-[var(--color-atelier-grafite)]"}
      `}
    >
      {/* PÍLULA MAGNÉTICA (Active State Glassmorphism) */}
      {active && (
        <motion.div
          layoutId="sidebar-active-pill"
          className="absolute inset-0 bg-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-white rounded-[1.2rem] -z-10"
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}
      
      {/* EFEITO HOVER SECUNDÁRIO */}
      {!active && (
        <div className="absolute inset-0 bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.2rem] -z-10"></div>
      )}

      {/* ÍCONE COM MICRO-INTERAÇÃO (Scale e Color Shift) */}
      <div className={`relative z-10 flex items-center justify-center transition-transform duration-300 ${!active && 'group-hover:scale-110 group-hover:text-[var(--color-atelier-terracota)]/80'}`}>
        {icon}
      </div>

      {/* LABEL DO MENU */}
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.span 
            initial={{ opacity: 0, x: -5 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -5, transition: { duration: 0.1 } }}
            className="relative z-10 tracking-wide whitespace-nowrap pt-0.5"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}