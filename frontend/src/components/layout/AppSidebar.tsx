// src/components/layout/AppSidebar.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, Lock, MessageSquare, ChevronLeft, ChevronRight, 
  Compass, LayoutDashboard, FolderKanban, Users, MessageCircle, 
  Globe2, CheckCircle2, DollarSign, Sparkles, Briefcase, 
  Crosshair, LogOut, Activity, Crown, Grid, Menu, X
} from "lucide-react";
import { supabase } from "../../lib/supabase"; 
import { useDynamicTitle } from "../../hooks/useDynamicTitle"; 
import { usePresenceTracker } from "../../hooks/usePresenceTracker";
import { useSession } from "../../hooks/useSession";
import { useProfile } from "../../hooks/useProfile";
import { useProjects } from "../../hooks/useProjects";

interface AppSidebarProps {
  userRole: string;
  handleLogout?: () => void;
  onHideSidebar: (hidden: boolean) => void;
}

// Dicionário de Rotas para os Títulos das Abas do Navegador
const ROUTE_NAMES: Record<string, string> = {
  '/admin': 'Tela da Dona',
  '/cockpit': 'Inicial',
  '/brandbook': 'Brandbook',
  '/curadoria': 'Curadoria',
  '/': 'Inicial',
  '/cofre': 'O Cofre',
  '/referencias': 'Referências',
  '/canais': 'Canais',
  '/comunidade': 'Comunidade',
  '/admin/jtbd': 'Focus',
  '/admin/gestao': 'Produtividade',
  '/admin/projetos': 'Estúdio',
  '/admin/fio': 'Sintonia',
  '/admin/clientes': 'Clientes',
  '/admin/analytics': 'Analytics',
  '/admin/financeiro': 'Financeiro'
};

export default function AppSidebar({ userRole, handleLogout, onHideSidebar }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [clientServiceType, setClientServiceType] = useState<string>("Identidade Visual");
  const [isProjectArchived, setIsProjectArchived] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  
  // Estado para capturar o nome do cliente logado
  const [clientName, setClientName] = useState<string>("");
  
  // 🟢 NOVA LÓGICA: Contagem global de mensagens não lidas
  const [globalUnreadCount, setGlobalUnreadCount] = useState<number>(0);

  const pathname = usePathname();
  const router = useRouter();
  
  // HIERARQUIA DE ACESSO
  const isTeamMember = ['admin', 'gestor', 'colaborador'].includes(userRole);
  const isContador = userRole === 'contador';
  const isClient = !isTeamMember && !isContador;
  const isManagerOrAdmin = ['admin', 'gestor'].includes(userRole);
  const isAdminOnly = userRole === 'admin';

  // ==========================================
  // ATIVAÇÃO DO TÍTULO DINÂMICO
  // ==========================================
  useDynamicTitle({
    projectName: (isTeamMember || isContador) ? "Liz Design" : (clientName || "Atelier"), 
    tabName: ROUTE_NAMES[pathname] || "Portal"
  });

  // 🟢 INJEÇÃO DO MOTOR DE PRESENÇA USANDO REACT QUERY
  const { data: session } = useSession();
  const { data: profile } = useProfile();
  const { data: projects } = useProjects();
  const sessionUserId = session?.user?.id;

  const presenceStatus = usePresenceTracker((isTeamMember || isContador) ? sessionUserId : null);

  useEffect(() => {
    if (profile) {
      setClientName(profile.nome || "");
    }
  }, [profile]);

  // LÓGICA CORE REATIVA
  useEffect(() => {
    if (!session || !projects) return;

    const fetchSidebarData = async () => {
      if (isClient) {
        // Obter o projeto correspondente ao cliente (por client_id ou primeiro projeto)
        const project = projects?.find(p => p.client_id === session?.user?.id) || projects?.[0];
        let shouldArchive = false;

        const rawService = project?.service_type || project?.type || project?.service || "";
        const isInstagram = rawService === "Gestão de Instagram" || rawService.toLowerCase().includes("instagram");
        const service = isInstagram ? "Gestão de Instagram" : "Identidade Visual";
        setClientServiceType(service);

        if (project) {
          if (project.status === 'archived') {
            shouldArchive = true;
          } else if (project.status === 'delivered' && project.delivered_at) {
            const deliveredDate = new Date(project.delivered_at);
            const diffDays = Math.ceil(Math.abs(new Date().getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 15) {
              shouldArchive = true;
              await supabase.from('projects').update({ status: 'archived' }).eq('id', project.id);
            }
          }
        } else {
          shouldArchive = false;
        }

        setIsProjectArchived(shouldArchive);
        onHideSidebar(shouldArchive);

        // BLINDAGEM DE ROTAS PARA CLIENTES
        if (shouldArchive) {
          const lockedRoutes = ['/', '/cofre', '/referencias', '/cockpit', '/curadoria', '/cofre-missoes', '/brandbook'];
          if (lockedRoutes.includes(pathname)) router.replace('/comunidade');
        } else {
          if (pathname === '/brandbook') {
            router.replace(isInstagram ? '/cockpit' : '/');
          } else if (isInstagram && (pathname === '/' || pathname === '/cofre' || pathname === '/referencias')) {
            router.replace('/cockpit');
          } else if (!isInstagram && (pathname === '/cockpit' || pathname === '/curadoria' || pathname === '/cofre-missoes')) {
            router.replace('/');
          }
        }
      } else if (isContador) {
        // 🟢 BLINDAGEM DE ROTAS PARA O CONTADOR
        const allowedContadorRoutes = ['/admin/fio', '/comunidade', '/admin/financeiro'];
        if (!allowedContadorRoutes.includes(pathname)) {
          router.replace('/admin/financeiro');
        }
      } else {
        // 🟢 BLINDAGEM DE ROTAS PARA A EQUIPA
        if (pathname === '/admin' && !isAdminOnly) {
          router.replace('/admin/jtbd');
        }
      }
      
      setIsReady(true);
    };

    fetchSidebarData();
  }, [pathname, isClient, isContador, isTeamMember, isManagerOrAdmin, isAdminOnly, session, projects, router, onHideSidebar]);

  // Contagem de unread messages reativa via sub
  useEffect(() => {
    if (!sessionUserId) return;

    const fetchGlobalUnread = async () => {
      const { data, error } = await supabase.rpc('get_unread_message_count');
      if (!error && typeof data === 'number') {
        setGlobalUnreadCount(data);
      }
    };

    fetchGlobalUnread();

    const channelSub = supabase
      .channel('global-messages-sidebar')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          fetchGlobalUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSub);
    };
  }, [sessionUserId]);

  if (isClient && isProjectArchived) return null;
  if (isContador && !isReady) return null;

  // 🟢 Definição inteligente da rota Home (Logo) com base na patente
  const homeRoute = isContador 
    ? '/admin/financeiro' 
    : isTeamMember 
      ? (isAdminOnly ? '/admin/analytics' : '/admin/jtbd') 
      : (clientServiceType === "Gestão de Instagram" ? '/cockpit' : '/');

  // ====================================================
  // 🟢 MOBILE BOTTOM NAVIGATION CONFIGURATION
  // ====================================================

  const mobileMainItems: Array<{ href: string; icon: React.ReactNode; label: string; badge?: number }> = isContador ? [
    { href: '/admin/financeiro', icon: <DollarSign size={20} strokeWidth={1.5} />, label: 'Finanças' },
    { href: '/admin/fio', icon: <MessageCircle size={20} strokeWidth={1.5} />, label: 'Sintonia', badge: globalUnreadCount },
    { href: '/comunidade', icon: <Globe2 size={20} strokeWidth={1.5} />, label: 'Comunidade' }
  ] : isTeamMember ? [
    { href: '/admin/analytics', icon: <Activity size={20} strokeWidth={1.5} />, label: 'Analytics' },
    { href: '/admin/jtbd', icon: <Crosshair size={20} strokeWidth={1.5} />, label: 'Focus' },
    { href: '/admin/clientes', icon: <Users size={20} strokeWidth={1.5} />, label: 'Clientes' },
    { href: '/admin/fio', icon: <MessageCircle size={20} strokeWidth={1.5} />, label: 'Sintonia', badge: globalUnreadCount },
    { href: '/comunidade', icon: <Globe2 size={20} strokeWidth={1.5} />, label: 'Comunidade' }
  ] : clientServiceType === "Gestão de Instagram" ? [
    { href: '/cockpit', icon: <Home size={20} strokeWidth={1.5} />, label: 'Inicial' },
    { href: '/simulador-feed', icon: <Grid size={20} strokeWidth={1.5} />, label: 'Feed' },
    { href: '/canais', icon: <MessageSquare size={20} strokeWidth={1.5} />, label: 'Canais', badge: globalUnreadCount },
    { href: '/comunidade', icon: <Globe2 size={20} strokeWidth={1.5} />, label: 'Comunidade' }
  ] : [
    { href: '/', icon: <Home size={20} strokeWidth={1.5} />, label: 'Inicial' },
    { href: '/cofre', icon: <Lock size={20} strokeWidth={1.5} />, label: 'Cofre' },
    { href: '/referencias', icon: <Compass size={20} strokeWidth={1.5} />, label: 'Inspiração' },
    { href: '/canais', icon: <MessageSquare size={20} strokeWidth={1.5} />, label: 'Canais', badge: globalUnreadCount },
    { href: '/comunidade', icon: <Globe2 size={20} strokeWidth={1.5} />, label: 'Comunidade' }
  ];

  const mobileDrawerItems: Array<{ href: string; icon: React.ReactNode; label: string; badge?: number }> = [];

  return (
    <>
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 88 : 280 }}
      transition={{ type: "spring", stiffness: 350, damping: 35, mass: 1 }}
      className={`
        hidden md:flex relative z-50 flex-col shrink-0 
        h-[calc(100vh-2rem)] my-4 ml-4 rounded-[2.5rem]
        bg-white/40 backdrop-blur-2xl border border-white/60 
        shadow-[8px_8px_32px_rgba(122,116,112,0.04)]
      `}
    >
      {/* CABEÇALHO DA SIDEBAR: LOGO E BRANDING */}
      <div className={`pt-10 pb-6 px-6 flex items-center h-28 shrink-0 ${isCollapsed ? 'justify-center px-0' : 'justify-start gap-4'}`}>
        
        {/* LOGO AGORA É UM BOTÃO HOME ESTRATÉGICO */}
        <Link href={homeRoute} className="w-10 h-10 shrink-0 relative group cursor-pointer flex items-center justify-center">
          <div className="absolute inset-0 bg-[var(--color-atelier-terracota)]/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700 opacity-0 group-hover:opacity-100"></div>
          <img src="/images/simbolo-rosa.png" alt="Atelier" className="w-8 h-8 object-contain relative z-10 drop-shadow-sm transition-transform duration-500 group-hover:scale-105" />
        </Link>
        
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -10, transition: { duration: 0.1 } }}
              className="flex flex-col overflow-hidden whitespace-nowrap"
            >
              <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none mb-0.5 tracking-tight">Atelier</span>
              <span className="font-roboto text-[0.55rem] text-[var(--color-atelier-terracota)] tracking-[0.25em] uppercase font-bold truncate max-w-[140px]">
                {isContador ? 'Financeiro' : isTeamMember ? 'LizDesign' : (clientName || 'Portal do Cliente')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTÃO DE COLAPSO FLUTUANTE */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-14 bg-white/90 backdrop-blur-md border border-[var(--color-atelier-grafite)]/10 shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-[var(--color-atelier-grafite)]/60 rounded-full w-7 h-7 flex items-center justify-center cursor-pointer z-50 hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all duration-300 hover:scale-110 hover:border-transparent"
      >
        {isCollapsed ? <ChevronRight size={14} strokeWidth={2.5} /> : <ChevronLeft size={14} strokeWidth={2.5} />}
      </button>

      {/* ÁREA DE NAVEGAÇÃO LÍMPIDA */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2 custom-scrollbar relative flex flex-col">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-[0.6rem] uppercase font-bold text-[var(--color-atelier-grafite)]/30 tracking-[0.2em] mb-4 pl-4 mt-2"
            >
              {isContador ? 'Auditoria' : isTeamMember ? 'Operacional' : 'Visão Geral'}
            </motion.div>
          )}
        </AnimatePresence>
        
        <nav className="flex flex-col gap-1.5 relative pb-8 flex-1">
          
          {/* MENU PARA CLIENTES */}
          {isClient && (
            <>
              {clientServiceType === "Gestão de Instagram" ? (
                <>
                  <NavItem href="/cockpit" icon={<Home size={18} strokeWidth={1.5} />} label="Inicial" collapsed={isCollapsed} active={pathname === '/cockpit'} />
                  <NavItem href="/simulador-feed" icon={<Grid size={18} strokeWidth={1.5} />} label="Feed" collapsed={isCollapsed} active={pathname === '/simulador-feed'} />
                </>
              ) : (
                <>
                  <NavItem href="/" icon={<Home size={18} strokeWidth={1.5} />} label="Inicial" collapsed={isCollapsed} active={pathname === '/'} />
                  <NavItem href="/cofre" icon={<Lock size={18} strokeWidth={1.5} />} label="O Cofre" collapsed={isCollapsed} active={pathname === '/cofre'} />
                  <NavItem href="/referencias" icon={<Compass size={18} strokeWidth={1.5} />} label="Referências" collapsed={isCollapsed} active={pathname === '/referencias'} />
                </>
              )}
              
              <div className="flex items-center justify-center my-3 opacity-20">
                <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-[var(--color-atelier-grafite)] to-transparent"></div>
              </div>
              
              <NavItem href="/canais" icon={<MessageSquare size={18} strokeWidth={1.5} />} label="Canais" collapsed={isCollapsed} active={pathname === '/canais'} badge={globalUnreadCount} />
              <NavItem href="/comunidade" icon={<Globe2 size={18} strokeWidth={1.5} />} label="Comunidade" collapsed={isCollapsed} active={pathname === '/comunidade'} />
            </>
          )}

          {/* MENU PARA CONTADOR */}
          {isContador && (
            <>
              <NavItem href="/admin/financeiro" icon={<DollarSign size={18} strokeWidth={1.5} />} label="Financeiro" collapsed={isCollapsed} active={pathname === '/admin/financeiro'} />
              <NavItem href="/admin/fio" icon={<MessageCircle size={18} strokeWidth={1.5} />} label="Sintonia" collapsed={isCollapsed} active={pathname === '/admin/fio'} badge={globalUnreadCount} />
              
              <div className="flex items-center justify-center my-3 opacity-20">
                <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-[var(--color-atelier-grafite)] to-transparent"></div>
              </div>

              <NavItem href="/comunidade" icon={<Globe2 size={18} strokeWidth={1.5} />} label="Comunidade" collapsed={isCollapsed} active={pathname === '/comunidade'} />
            </>
          )}

          {/* MENU PARA EQUIPA DO ESTÚDIO */}
          {isTeamMember && (
            <>


              {/* Visto por todos */}
              <NavItem href="/admin/jtbd" icon={<Crosshair size={18} strokeWidth={1.5} />} label="Focus" collapsed={isCollapsed} active={pathname === '/admin/jtbd'} />
              
              <div className="flex items-center justify-center my-3 opacity-20">
                <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-[var(--color-atelier-grafite)] to-transparent"></div>
              </div>

              <NavItem href="/admin/projetos" icon={<FolderKanban size={18} strokeWidth={1.5} />} label="Estúdio" collapsed={isCollapsed} active={pathname === '/admin/projetos'} />
              <NavItem href="/admin/fio" icon={<MessageCircle size={18} strokeWidth={1.5} />} label="Sintonia" collapsed={isCollapsed} active={pathname === '/admin/fio'} badge={globalUnreadCount} />
              <NavItem href="/comunidade" icon={<Globe2 size={18} strokeWidth={1.5} />} label="Comunidade" collapsed={isCollapsed} active={pathname === '/comunidade'} />
              
              <div className="flex items-center justify-center my-3 opacity-20">
                <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-[var(--color-atelier-grafite)] to-transparent"></div>
              </div>
              
              {/* Visto apenas por Gestor e Admin */}
              {isManagerOrAdmin && (
                <NavItem href="/admin/analytics" icon={<Briefcase size={18} strokeWidth={1.5} />} label="Analytics" collapsed={isCollapsed} active={pathname === '/admin/analytics'} />
              )}


            </>
          )}

          {/* BOTÃO DE DESCONECTAR */}
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

    {/* ==================================================== */}
    {/* MOBILE BOTTOM NAVIGATION BAR (FLOATING PILL) */}
    {/* ==================================================== */}
    <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[99999] px-2 py-1.5 bg-white/70 backdrop-blur-3xl border border-white/80 rounded-[2rem] flex items-center justify-around w-[92vw] max-w-[420px] shadow-lg">
      {mobileMainItems.map((item) => (
         <Link 
            key={item.href} 
            href={item.href} 
            className={`flex items-center justify-center gap-1.5 relative transition-all duration-500 rounded-full overflow-hidden ${pathname === item.href ? 'bg-[var(--color-atelier-terracota)] text-white px-3.5 py-2' : 'text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-grafite)] hover:bg-gray-50/50 w-10 h-10 shrink-0'}`}
         >
            <div className="relative z-10 flex items-center justify-center shrink-0">
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white shadow-sm ${pathname === item.href ? 'bg-white' : 'bg-red-500 animate-pulse-slow'}`}></div>
              )}
            </div>
            
            <AnimatePresence>
              {pathname === item.href && (
                <motion.span 
                  initial={{ width: 0, opacity: 0 }} 
                  animate={{ width: "auto", opacity: 1 }} 
                  exit={{ width: 0, opacity: 0 }} 
                  className="text-[10px] font-bold tracking-wide whitespace-nowrap origin-left"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
         </Link>
      ))}
      
      {/* BOTÃO MAIS (DRAWER) */}
      {mobileDrawerItems.length > 0 && (
        <button 
           onClick={() => setIsMobileDrawerOpen(true)} 
           className="flex items-center justify-center relative transition-all duration-300 rounded-full text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-grafite)] hover:bg-gray-50/50 w-10 h-10 shrink-0 outline-none"
        >
          <div className="relative z-10 flex items-center justify-center scale-90">
            <Menu size={20} strokeWidth={1.5} />
          </div>
        </button>
      )}
    </div>

    {/* ==================================================== */}
    {/* MOBILE DRAWER */}
    {/* ==================================================== */}
    <AnimatePresence>
      {isMobileDrawerOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-[101] bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <motion.div 
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="md:hidden fixed bottom-0 left-0 w-full z-[102] bg-[var(--color-atelier-creme)] rounded-t-[2.5rem] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="flex items-center justify-between p-6 pb-2">
              <div className="flex items-center gap-3">
                <img src="/images/simbolo-rosa.png" alt="Atelier" className="w-8 h-8 object-contain" />
                <span className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-none tracking-tight">Menu</span>
              </div>
              <button onClick={() => setIsMobileDrawerOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/50 rounded-full text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)]">
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2 pb-32">
              {mobileDrawerItems.map((item) => (
                <Link 
                  key={item.href} href={item.href} onClick={() => setIsMobileDrawerOpen(false)}
                  className={`flex items-center gap-4 p-4 rounded-[1.5rem] bg-white/60 shadow-sm border border-white/60 ${pathname === item.href ? 'border-[var(--color-atelier-terracota)]/30 bg-white' : ''}`}
                >
                  <div className={`${pathname === item.href ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/60'}`}>
                    {item.icon}
                  </div>
                  <span className={`font-roboto text-sm flex-1 font-bold ${pathname === item.href ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/80'}`}>
                    {item.label}
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse-slow">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              ))}

              <div className="w-full h-px bg-[var(--color-atelier-grafite)]/10 my-2"></div>

              <button 
                onClick={() => { setIsMobileDrawerOpen(false); handleLogout && handleLogout(); }}
                className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-red-50/50 text-red-500/80 hover:text-red-600 font-bold text-sm"
              >
                <LogOut size={18} strokeWidth={1.5} />
                Desconectar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}

// ==========================================
// COMPONENTE DE ITEM DE NAVEGAÇÃO COM FÍSICA E UX PREMIUM
// ==========================================
function NavItem({ href, icon, label, collapsed, active, badge }: { href: string, icon: React.ReactNode, label: string, collapsed: boolean, active: boolean, badge?: number }) {
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
            className="relative z-10 tracking-wide whitespace-nowrap pt-0.5 flex-1 flex items-center justify-between pr-2"
          >
            <span>{label}</span>
            {badge !== undefined && badge > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse-slow">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>

      {/* BADGE PARA MODO COLAPSADO (Flutuante no Ícone) */}
      {collapsed && badge !== undefined && badge > 0 && (
         <div className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm animate-pulse-slow"></div>
      )}
    </Link>
  );
}