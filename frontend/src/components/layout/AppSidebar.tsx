// src/components/layout/AppSidebar.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, Lock, MessageSquare, ChevronLeft, ChevronRight, 
  Compass, LayoutDashboard, FolderKanban, Users, Inbox, 
  Globe2, CheckCircle2, DollarSign, Sparkles, Briefcase, 
  Crosshair, LogOut, Activity, Crown, Grid, Menu, X
} from "lucide-react";
import { supabase } from "../../lib/supabase"; 
import { useDynamicTitle } from "../../hooks/useDynamicTitle"; 
import { usePresenceTracker } from "../../hooks/usePresenceTracker";

interface AppSidebarProps {
  userRole: string;
  handleLogout?: () => void;
  onHideSidebar: (hidden: boolean) => void;
}

// Dicionário de Rotas para os Títulos das Abas do Navegador
const ROUTE_NAMES: Record<string, string> = {
  '/admin': 'Tela da Dona',
  '/cockpit': 'Cockpit',
  '/brandbook': 'Brandbook',
  '/curadoria': 'Curadoria',
  '/': 'Cockpit',
  '/cofre': 'O Cofre',
  '/referencias': 'Referências',
  '/canais': 'Canais',
  '/comunidade': 'Comunidade',
  '/admin/jtbd': 'Focus',
  '/admin/gestao': 'Produtividade',
  '/admin/projetos': 'Estúdio',
  '/admin/inbox': 'Inbox',
  '/admin/clientes': 'Clientes',
  '/admin/analytics': 'Analytics',
  '/admin/financeiro': 'Financeiro'
};

export default function AppSidebar({ userRole, handleLogout, onHideSidebar }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [clientServiceType, setClientServiceType] = useState<string>("Identidade Visual");
  const [isProjectArchived, setIsProjectArchived] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // Estado para capturar o nome do cliente logado
  const [clientName, setClientName] = useState<string>("");
  
  // 🟢 NOVA LÓGICA: Contagem global de mensagens não lidas
  const [globalUnreadCount, setGlobalUnreadCount] = useState<number>(0);

  const pathname = usePathname();
  const router = useRouter();
  
  // HIERARQUIA DE ACESSO
  const isTeamMember = ['admin', 'gestor', 'colaborador'].includes(userRole);
  const isManagerOrAdmin = ['admin', 'gestor'].includes(userRole);
  const isAdminOnly = userRole === 'admin';

  // ==========================================
  // ATIVAÇÃO DO TÍTULO DINÂMICO
  // ==========================================
  useDynamicTitle({
    projectName: isTeamMember ? "Liz Design" : (clientName || "Atelier"), 
    tabName: ROUTE_NAMES[pathname] || "Portal"
  });

  // 🟢 INJEÇÃO DO MOTOR DE PRESENÇA
  // Só ativamos o rastreamento se o utilizador for da Equipa (Admin/Gestor/Colaborador)
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionUserId(session.user.id);
    });
  }, []);

  const presenceStatus = usePresenceTracker(isTeamMember ? sessionUserId : null);

  // LÓGICA CORE INTACTA
  useEffect(() => {
    const fetchSidebarData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (!isTeamMember) {
        // Busca o nome do cliente para o Sidebar e o Título
        const { data: profile } = await supabase.from('profiles').select('nome').eq('id', session.user.id).single();
        if (profile) setClientName(profile.nome);

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

        // BLINDAGEM DE ROTAS PARA CLIENTES
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
      } else {
        // 🟢 BLINDAGEM DE ROTAS PARA A EQUIPA
        // Retiramos a intercepção da rota `/admin` para o Admin!
        if (pathname === '/admin' && !isAdminOnly) {
          router.replace(isManagerOrAdmin ? '/admin/gestao' : '/admin/jtbd');
        }
      }
      
      setIsReady(true);
    };

    const fetchGlobalUnread = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase.rpc('get_unread_message_count');
      if (!error && data !== null) {
        setGlobalUnreadCount(data);
      }
    };

    fetchSidebarData();
    fetchGlobalUnread();

    // 🟢 Escutar novas mensagens para atualizar badge instantaneamente (Opcional mas Premium)
    const sub = supabase.channel('sidebar_unread_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // Quando rolar nova mensagem, re-busca a contagem se a mensagem não for nossa
        supabase.auth.getSession().then(({ data: { session } }) => {
           if (session && payload.new.sender_id !== session.user.id) {
             fetchGlobalUnread();
           }
        });
      }).subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [pathname, isTeamMember, isManagerOrAdmin, isAdminOnly, router, onHideSidebar]);

  if (!isTeamMember && (isProjectArchived || !isReady)) return null;

  // 🟢 Definição inteligente da rota Home (Logo) com base na patente
  const homeRoute = isTeamMember 
    ? (isAdminOnly ? '/admin' : (isManagerOrAdmin ? '/admin/gestao' : '/admin/jtbd')) 
    : (clientServiceType === "Gestão de Instagram" ? '/cockpit' : '/');

  // ==========================================
  // LÓGICA DO BOTTOM NAV (MOBILE)
  // ==========================================
  const allTeamItems = [
    { href: "/admin/jtbd", icon: <CheckCircle2 size={20} strokeWidth={1.5} />, label: "Focus" },
    ...(isManagerOrAdmin ? [{ href: "/admin/gestao", icon: <Activity size={20} strokeWidth={1.5} />, label: "Pulse" }] : []),
    { href: "/admin/projetos", icon: <Grid size={20} strokeWidth={1.5} />, label: "Estúdio" },
    { href: "/admin/inbox", icon: <MessageSquare size={20} strokeWidth={1.5} />, label: "Inbox", badge: globalUnreadCount },
    ...(isManagerOrAdmin ? [{ href: "/admin/clientes", icon: <Users size={20} strokeWidth={1.5} />, label: "Clientes" }] : []),
    ...(isAdminOnly ? [{ href: "/admin/financeiro", icon: <DollarSign size={20} strokeWidth={1.5} />, label: "Cofre" }] : []),
    ...(isAdminOnly ? [{ href: "/admin/analytics", icon: <LayoutDashboard size={20} strokeWidth={1.5} />, label: "Radar" }] : [])
  ];

  const allClientItems = clientServiceType === "Gestão de Instagram" 
    ? [
        { href: "/cockpit", icon: <Compass size={20} strokeWidth={1.5} />, label: "Cockpit" },
        { href: "/comunidade", icon: <Globe2 size={20} strokeWidth={1.5} />, label: "Comunidade" }
      ]
    : [
        { href: "/", icon: <Home size={20} strokeWidth={1.5} />, label: "Início" },
        { href: "/cofre", icon: <Lock size={20} strokeWidth={1.5} />, label: "Cofre" },
        { href: "/referencias", icon: <Sparkles size={20} strokeWidth={1.5} />, label: "Curadoria" },
        { href: "/comunidade", icon: <Globe2 size={20} strokeWidth={1.5} />, label: "Comunidade" }
      ];

  const currentItems = isTeamMember ? allTeamItems : allClientItems;
  const mobileMainItems = currentItems.slice(0, 4);
  const mobileDrawerItems = currentItems.slice(4);

  return (
    <>
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 88 : 280 }}
      transition={{ type: "spring", stiffness: 350, damping: 35, mass: 1 }}
      className={`
        relative z-50 flex flex-col shrink-0 
        h-[calc(100vh-2rem)] my-4 ml-4 rounded-[2.5rem]
        bg-white/40 backdrop-blur-2xl border border-white/60 
        shadow-[8px_8px_32px_rgba(122,116,112,0.04)]
        hidden md:flex
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
                {isTeamMember ? 'LizDesign' : (clientName || 'Portal do Cliente')}
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
                  <NavItem href="/simulador-feed" icon={<Grid size={18} strokeWidth={1.5} />} label="Feed" collapsed={isCollapsed} active={pathname === '/simulador-feed'} />
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
              
              <NavItem href="/canais" icon={<MessageSquare size={18} strokeWidth={1.5} />} label="Canais" collapsed={isCollapsed} active={pathname === '/canais'} badge={globalUnreadCount} />
              <NavItem href="/comunidade" icon={<Globe2 size={18} strokeWidth={1.5} />} label="Comunidade" collapsed={isCollapsed} active={pathname === '/comunidade'} />
            </>
          )}

          {/* MENU PARA EQUIPA DO ESTÚDIO */}
          {isTeamMember && (
            <>
              {/* Visto apenas por Admin */}
              {isAdminOnly && (
                <NavItem href="/admin" icon={<Crown size={18} strokeWidth={1.5} className={pathname === '/admin' ? "text-[var(--color-atelier-terracota)]" : ""} />} label="Tela da Dona" collapsed={isCollapsed} active={pathname === '/admin'} />
              )}

              {/* Visto por todos */}
              <NavItem href="/admin/jtbd" icon={<Crosshair size={18} strokeWidth={1.5} />} label="Focus" collapsed={isCollapsed} active={pathname === '/admin/jtbd'} />
              <NavItem href="/admin/gestao" icon={<Activity size={18} strokeWidth={1.5} />} label="Produtividade" collapsed={isCollapsed} active={pathname === '/admin/gestao'} />
              
              <div className="flex items-center justify-center my-3 opacity-20">
                <div className="w-1/2 h-px bg-gradient-to-r from-transparent via-[var(--color-atelier-grafite)] to-transparent"></div>
              </div>

              <NavItem href="/admin/projetos" icon={<FolderKanban size={18} strokeWidth={1.5} />} label="Estúdio" collapsed={isCollapsed} active={pathname === '/admin/projetos'} />
              <NavItem href="/admin/inbox" icon={<Inbox size={18} strokeWidth={1.5} />} label="Inbox" collapsed={isCollapsed} active={pathname === '/admin/inbox'} badge={globalUnreadCount} />
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
    {/* MOBILE BOTTOM NAVIGATION BAR */}
    {/* ==================================================== */}
    <div className="md:hidden fixed bottom-0 left-0 w-full z-[100] px-6 pb-6 pt-3 bg-white/80 backdrop-blur-xl border-t border-[var(--color-atelier-grafite)]/5 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
      {mobileMainItems.map((item) => (
         <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 group relative">
            <div className={`relative z-10 flex items-center justify-center transition-all duration-300 ${pathname === item.href ? 'text-[var(--color-atelier-terracota)] scale-110' : 'text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-grafite)]/80'}`}>
              {item.icon}
              {(item as any).badge !== undefined && (item as any).badge > 0 && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm animate-pulse-slow"></div>
              )}
            </div>
            <span className={`text-[9px] font-bold tracking-wide transition-colors duration-300 ${pathname === item.href ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/40'}`}>
              {item.label}
            </span>
            {pathname === item.href && (
              <motion.div layoutId="mobile-nav-indicator" className="absolute -bottom-2 w-1 h-1 bg-[var(--color-atelier-terracota)] rounded-full" />
            )}
         </Link>
      ))}
      
      {/* BOTÃO MAIS (DRAWER) */}
      {(mobileDrawerItems.length > 0 || handleLogout) && (
        <button onClick={() => setIsMobileDrawerOpen(true)} className="flex flex-col items-center gap-1 group relative outline-none">
          <div className="relative z-10 flex items-center justify-center transition-all duration-300 text-[var(--color-atelier-grafite)]/40 group-hover:text-[var(--color-atelier-grafite)]/80">
            <Menu size={20} strokeWidth={1.5} />
          </div>
          <span className="text-[9px] font-bold tracking-wide text-[var(--color-atelier-grafite)]/40 group-hover:text-[var(--color-atelier-grafite)]/80 transition-colors duration-300">
            Mais
          </span>
        </button>
      )}
    </div>

    {/* ==================================================== */}
    {/* DRAWER MOBILE (OVERLAY) */}
    {/* ==================================================== */}
    <AnimatePresence>
      {isMobileDrawerOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            onClick={() => setIsMobileDrawerOpen(false)}
            className="md:hidden fixed inset-0 bg-[var(--color-atelier-grafite)]/20 backdrop-blur-sm z-[110]"
          />
          <motion.div 
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="md:hidden fixed bottom-0 left-0 w-full bg-white rounded-t-[2.5rem] z-[120] shadow-2xl p-8 flex flex-col gap-6 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Menu Principal</span>
              <button onClick={() => setIsMobileDrawerOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-grafite)]">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              {mobileDrawerItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setIsMobileDrawerOpen(false)} className={`flex items-center gap-4 p-4 rounded-2xl transition-colors ${pathname === item.href ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)]' : 'hover:bg-gray-50 text-[var(--color-atelier-grafite)]/70'}`}>
                  {item.icon}
                  <span className="font-bold text-[13px] uppercase tracking-widest">{item.label}</span>
                  {(item as any).badge !== undefined && (item as any).badge > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{(item as any).badge}</span>
                  )}
                </Link>
              ))}
              
              {handleLogout && (
                <button onClick={() => { setIsMobileDrawerOpen(false); handleLogout(); }} className="flex items-center gap-4 p-4 rounded-2xl transition-colors mt-4 text-red-500 hover:bg-red-50">
                  <LogOut size={20} strokeWidth={1.5} />
                  <span className="font-bold text-[13px] uppercase tracking-widest">Desconectar</span>
                </button>
              )}
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