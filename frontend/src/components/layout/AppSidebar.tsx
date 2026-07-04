// src/components/layout/AppSidebar.tsx
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
  const [clientServiceType, setClientServiceType] = useState<string>("Identidade Visual");
  const [isProjectArchived, setIsProjectArchived] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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

  return (
    <>
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 88 : 280 }}
        transition={{ type: "spring", stiffness: 350, damping: 35, mass: 1 }}
        className={`
          hidden md:flex
          relative z-50 flex-col shrink-0 
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

    {/* ========================================== */}
    {/* NAVEGAÇÃO MOBILE (BOTTOM BAR + DRAWER)       */}
    {/* ========================================== */}
    <div className="md:hidden fixed bottom-0 left-0 w-full z-50">
      {/* DRAWER MENU */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[51]"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-[70px] left-2 right-2 max-h-[70vh] bg-white/90 backdrop-blur-xl border border-white rounded-[2rem] shadow-2xl z-[52] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-atelier-grafite)]/10">
                <span className="font-elegant text-xl text-[var(--color-atelier-grafite)]">Menu Atelier</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-[var(--color-atelier-grafite)]/5 rounded-full text-[var(--color-atelier-grafite)]/60">
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto px-4 py-2 flex flex-col gap-1 pb-6 custom-scrollbar">
                {/* Repetir Links Secundários aqui */}
                {!isTeamMember ? (
                   <>
                     <MobileNavItem href="/brandbook" icon={<Sparkles size={20} />} label="Brandbook" active={pathname === '/brandbook'} onClick={() => setIsMobileMenuOpen(false)} />
                     <MobileNavItem href="/simulador-feed" icon={<Grid size={20} />} label="Feed" active={pathname === '/simulador-feed'} onClick={() => setIsMobileMenuOpen(false)} />
                     <MobileNavItem href="/referencias" icon={<Compass size={20} />} label="Referências" active={pathname === '/referencias'} onClick={() => setIsMobileMenuOpen(false)} />
                     <MobileNavItem href="/comunidade" icon={<Globe2 size={20} />} label="Comunidade" active={pathname === '/comunidade'} onClick={() => setIsMobileMenuOpen(false)} />
                   </>
                ) : (
                   <>
                     {isAdminOnly && <MobileNavItem href="/admin" icon={<Crown size={20} />} label="Tela da Dona" active={pathname === '/admin'} onClick={() => setIsMobileMenuOpen(false)} />}
                     <MobileNavItem href="/admin/gestao" icon={<Activity size={20} />} label="Produtividade" active={pathname === '/admin/gestao'} onClick={() => setIsMobileMenuOpen(false)} />
                     <MobileNavItem href="/admin/inbox" icon={<Inbox size={20} />} label="Inbox" badge={globalUnreadCount} active={pathname === '/admin/inbox'} onClick={() => setIsMobileMenuOpen(false)} />
                     <MobileNavItem href="/comunidade" icon={<Globe2 size={20} />} label="Comunidade" active={pathname === '/comunidade'} onClick={() => setIsMobileMenuOpen(false)} />
                     
                     {isManagerOrAdmin && (
                       <>
                         <div className="my-2 h-px bg-[var(--color-atelier-grafite)]/10" />
                         <MobileNavItem href="/admin/clientes" icon={<Users size={20} />} label="Clientes" active={pathname === '/admin/clientes'} onClick={() => setIsMobileMenuOpen(false)} />
                         <MobileNavItem href="/admin/analytics" icon={<Briefcase size={20} />} label="Analytics" active={pathname === '/admin/analytics'} onClick={() => setIsMobileMenuOpen(false)} />
                       </>
                     )}
                     
                     {isAdminOnly && (
                       <MobileNavItem href="/admin/financeiro" icon={<DollarSign size={20} />} label="Financeiro" active={pathname === '/admin/financeiro'} onClick={() => setIsMobileMenuOpen(false)} />
                     )}
                   </>
                )}
                
                <div className="my-2 h-px bg-[var(--color-atelier-grafite)]/10" />
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout && handleLogout(); }}
                  className="flex items-center gap-4 p-3 rounded-2xl text-red-500/80 font-medium font-roboto text-[14px]"
                >
                  <LogOut size={20} /> Desconectar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* BOTTOM BAR (Os 4 Principais + Botão Mais) */}
      <div className="bg-white/80 backdrop-blur-2xl border-t border-[var(--color-atelier-grafite)]/5 pb-[env(safe-area-inset-bottom,16px)] pt-2 px-2 flex justify-around items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)] h-20">
        
        {/* HOME (Cockpit / Admin / Focus) */}
        <BottomBarItem href={homeRoute} icon={<Home size={22} />} label="Início" active={pathname === homeRoute || pathname === '/cockpit'} />

        {!isTeamMember ? (
          <>
            {clientServiceType === "Gestão de Instagram" ? (
               <BottomBarItem href="/brandbook" icon={<Sparkles size={22} />} label="Brandbook" active={pathname === '/brandbook'} />
            ) : (
               <BottomBarItem href="/cofre" icon={<Lock size={22} />} label="Cofre" active={pathname === '/cofre'} />
            )}
            <BottomBarItem href="/canais" icon={<MessageSquare size={22} />} label="Canais" active={pathname === '/canais'} badge={globalUnreadCount} />
          </>
        ) : (
          <>
            <BottomBarItem href="/admin/jtbd" icon={<Crosshair size={22} />} label="Focus" active={pathname === '/admin/jtbd'} />
            <BottomBarItem href="/admin/projetos" icon={<FolderKanban size={22} />} label="Estúdio" active={pathname === '/admin/projetos'} />
          </>
        )}

        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-2xl transition-all ${isMobileMenuOpen ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/50'}`}
        >
          <Menu size={22} className={isMobileMenuOpen ? 'scale-110' : ''} />
          <span className="text-[10px] font-roboto font-medium tracking-wide">Menu</span>
        </button>
      </div>
    </div>
  </>
  );
}

// Sub-componentes para o Drawer e Bottom Bar
function MobileNavItem({ href, icon, label, active, onClick, badge }: any) {
  return (
    <Link href={href} onClick={onClick} className={`flex items-center gap-4 p-3 rounded-2xl font-roboto text-[14px] transition-colors ${active ? 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-bold' : 'text-[var(--color-atelier-grafite)]/70 hover:bg-gray-50'}`}>
      {icon}
      <span className="flex-1">{label}</span>
      {badge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge > 99 ? '99+' : badge}</span>}
    </Link>
  );
}

function BottomBarItem({ href, icon, label, active, badge }: any) {
  return (
    <Link href={href} className={`relative flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-2xl transition-all ${active ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-gray-50'}`}>
      {active && <motion.div layoutId="bottom-nav-indicator" className="absolute inset-0 bg-[var(--color-atelier-terracota)]/10 rounded-2xl -z-10" />}
      <div className="relative">
        {icon}
        {badge > 0 && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></div>}
      </div>
      <span className={`text-[10px] font-roboto tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </Link>
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