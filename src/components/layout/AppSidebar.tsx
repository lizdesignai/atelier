// src/components/layout/AppSidebar.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { 
  Home, Lock, MessageSquare, Settings, 
  ChevronLeft, ChevronRight, LogOut, Compass,
  LayoutDashboard, FolderKanban, Users, Inbox, BarChart3, Shield,
  Globe2, Camera, CheckCircle2, DollarSign, BrainCircuit, Sparkles, Briefcase
} from "lucide-react";

interface AppSidebarProps {
  userRole: string;
  handleLogout: () => void;
  onHideSidebar: (hidden: boolean) => void;
}

export default function AppSidebar({ userRole, handleLogout, onHideSidebar }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [clientServiceType, setClientServiceType] = useState<string>("Identidade Visual");
  const [isProjectArchived, setIsProjectArchived] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  
  // HIERARQUIA DE ACESSO (Alteração Cirúrgica)
  const isTeamMember = ['admin', 'gestor', 'colaborador'].includes(userRole);
  const isManagerOrAdmin = ['admin', 'gestor'].includes(userRole);
  const isAdminOnly = userRole === 'admin';

  useEffect(() => {
    const fetchSidebarData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.from('profiles').select('nome, avatar_url, empresa, cargo').eq('id', session.user.id).single();
      if (profile) setUserProfile(profile);

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

        // BLINDAGEM DE ROTAS (Routing de Segurança)
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
      animate={{ width: isCollapsed ? 100 : 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`
        relative z-50 flex flex-col shrink-0
        bg-white/40 backdrop-blur-3xl border-r border-white/60 
        shadow-[4px_0_24px_rgba(122,116,112,0.05)]
      `}
    >
      {/* CABEÇALHO DA SIDEBAR */}
      <div className={`p-8 flex items-center h-32 shrink-0 ${isCollapsed ? 'justify-center' : 'justify-start gap-4'}`}>
        <div className="w-12 h-12 shrink-0 relative group cursor-pointer">
          <div className="absolute inset-0 bg-[var(--color-atelier-terracota)]/30 rounded-full blur-lg group-hover:scale-150 transition-transform duration-700 opacity-0 group-hover:opacity-100"></div>
          <img src="/images/simbolo-rosa.png" alt="Atelier" className="w-full h-full object-contain relative z-10 drop-shadow-md" />
        </div>
        
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -10, transition: { duration: 0.1 } }}
              className="flex flex-col overflow-hidden whitespace-nowrap"
            >
              <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none mb-1">Atelier</span>
              <span className="font-roboto text-[0.6rem] text-[var(--color-atelier-terracota)] tracking-[0.2em] uppercase font-bold">
                {isTeamMember ? 'Studio HQ' : 'Portal do Cliente'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTÃO DE COLAPSO */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-14 bg-white border border-[var(--color-atelier-grafite)]/10 shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-[var(--color-atelier-grafite)] rounded-full w-7 h-7 flex items-center justify-center cursor-pointer z-50 hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors duration-300 hover:border-transparent"
      >
        {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
      </button>

      {/* ÁREA DE NAVEGAÇÃO */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 custom-scrollbar relative">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-[0.65rem] uppercase font-bold text-[var(--color-atelier-grafite)]/40 tracking-[0.15em] mb-4 pl-4"
            >
              {isTeamMember ? 'Operacional' : 'Visão Geral'}
            </motion.div>
          )}
        </AnimatePresence>
        
        <nav className="flex flex-col gap-1.5 relative">
          {/* MENU PARA CLIENTES */}
          {!isTeamMember && (
            <>
              {clientServiceType === "Gestão de Instagram" ? (
                <>
                  <NavItem href="/cockpit" icon={<LayoutDashboard size={20} strokeWidth={1.75} />} label="Cockpit" collapsed={isCollapsed} active={pathname === '/cockpit'} />
                  <NavItem href="/brandbook" icon={<Sparkles size={20} strokeWidth={1.75} />} label="Sua Marca" collapsed={isCollapsed} active={pathname === '/brandbook'} />
                  <NavItem href="/curadoria" icon={<CheckCircle2 size={20} strokeWidth={1.75} />} label="Curadoria" collapsed={isCollapsed} active={pathname === '/curadoria'} />
                </>
              ) : (
                <>
                  <NavItem href="/" icon={<Home size={20} strokeWidth={1.75} />} label="Mesa de Trabalho" collapsed={isCollapsed} active={pathname === '/'} />
                  <NavItem href="/cofre" icon={<Lock size={20} strokeWidth={1.75} />} label="O Cofre" collapsed={isCollapsed} active={pathname === '/cofre'} />
                  <NavItem href="/referencias" icon={<Compass size={20} strokeWidth={1.75} />} label="Referências" collapsed={isCollapsed} active={pathname === '/referencias'} />
                </>
              )}
              <div className="h-px bg-[var(--color-atelier-grafite)]/5 my-2 w-full"></div>
              <NavItem href="/canais" icon={<MessageSquare size={20} strokeWidth={1.75} />} label="Canais" collapsed={isCollapsed} active={pathname === '/canais'} />
              <NavItem href="/comunidade" icon={<Globe2 size={20} strokeWidth={1.75} />} label="Comunidade" collapsed={isCollapsed} active={pathname === '/comunidade'} />
            </>
          )}

          {/* MENU PARA EQUIPA (Modificado Cirurgicamente) */}
          {isTeamMember && (
            <>
              {/* Visto por todos (Admin, Gestor, Colaborador) */}
              <NavItem href="/admin" icon={<LayoutDashboard size={20} strokeWidth={1.75} />} label="Comando" collapsed={isCollapsed} active={pathname === '/admin'} />
              <NavItem href="/admin/projetos" icon={<FolderKanban size={20} strokeWidth={1.75} />} label="Estúdio" collapsed={isCollapsed} active={pathname === '/admin/projetos'} />
              <NavItem href="/admin/gerenciamento" icon={<LayoutDashboard size={20} strokeWidth={1.75} />} label="Gerenciamento" collapsed={isCollapsed} active={pathname === '/admin/gerenciamento'} />
              <NavItem href="/admin/inbox" icon={<Inbox size={20} strokeWidth={1.75} />} label="Caixa de Entrada" collapsed={isCollapsed} active={pathname === '/admin/inbox'} />
              <NavItem href="/comunidade" icon={<Globe2 size={20} strokeWidth={1.75} />} label="Comunidade" collapsed={isCollapsed} active={pathname === '/comunidade'} />
              
              <div className="h-px bg-[var(--color-atelier-grafite)]/5 my-2 w-full"></div>
              
              {/* Visto apenas por Gestor e Admin */}
              {isManagerOrAdmin && (
                <>
                  <NavItem href="/admin/clientes" icon={<Users size={20} strokeWidth={1.75} />} label="Base de Clientes" collapsed={isCollapsed} active={pathname === '/admin/clientes'} />
                  <NavItem href="/admin/equipa" icon={<Briefcase size={20} strokeWidth={1.75} />} label="Gestão de Equipa" collapsed={isCollapsed} active={pathname === '/admin/equipa'} />
                  <NavItem href="/admin/metricas" icon={<BarChart3 size={20} strokeWidth={1.75} />} label="Métricas & Saúde" collapsed={isCollapsed} active={pathname === '/admin/metricas'} />
                </>
              )}

              {/* Visto apenas por Admin (O Dono) */}
              {isAdminOnly && (
                <NavItem href="/admin/financeiro" icon={<DollarSign size={20} strokeWidth={1.75} />} label="Financeiro" collapsed={isCollapsed} active={pathname === '/admin/financeiro'} />
              )}
            </>
          )}
        </nav>
      </div>

      {/* RODAPÉ DO PERFIL */}
      <div className="p-6 border-t border-[var(--color-atelier-grafite)]/10 flex flex-col gap-2 shrink-0 bg-white/30">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              className="flex items-center gap-3 mb-2 p-2.5 rounded-2xl bg-white/60 border border-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer hover:bg-white hover:shadow-md transition-all group"
              onClick={() => router.push('/configuracoes')}
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-inner shrink-0 border border-[var(--color-atelier-grafite)]/5 flex items-center justify-center bg-[var(--color-atelier-grafite)] text-white group-hover:scale-105 transition-transform">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  isTeamMember ? <Shield size={18} /> : <span className="font-elegant text-xl">{userProfile?.nome?.charAt(0) || "U"}</span>
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-roboto text-[13px] font-bold text-[var(--color-atelier-grafite)] truncate">
                  {userProfile?.nome || (isTeamMember ? 'Atelier Team' : 'Cliente')}
                </span>
                <span className="font-roboto text-[9px] text-[var(--color-atelier-terracota)] font-bold uppercase tracking-widest truncate">
                  {/* Etiqueta dinâmica de cargo adaptada para a nova hierarquia */}
                  {userRole === 'admin' ? 'Administrador' : userRole === 'gestor' ? 'Gestor de Conta' : userRole === 'colaborador' ? 'Membro da Equipa' : 'Cliente Premium'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-1">
          <NavItem href="/configuracoes" icon={<Settings size={20} strokeWidth={1.75} />} label="Ajustes" collapsed={isCollapsed} active={pathname === '/configuracoes'} />
          <button 
            onClick={handleLogout} 
            className={`relative flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-4 p-3 rounded-2xl text-[var(--color-atelier-grafite)]/60 hover:text-red-500 transition-colors duration-300 group w-full overflow-hidden`}
          >
            <div className="absolute inset-0 bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl -z-10"></div>
            <div className="relative z-10 group-hover:-translate-x-1 transition-transform">
              <LogOut size={20} strokeWidth={1.75} />
            </div>
            {!isCollapsed && <span className="relative z-10 font-bold text-[13px] tracking-wide whitespace-nowrap">Desconectar</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

// ==========================================
// COMPONENTE DE ITEM DE NAVEGAÇÃO COM FÍSICA
// ==========================================
function NavItem({ href, icon, label, collapsed, active }: { href: string, icon: React.ReactNode, label: string, collapsed: boolean, active: boolean }) {
  return (
    <Link 
      href={href} 
      title={collapsed ? label : ""} 
      className={`
        relative flex items-center ${collapsed ? 'justify-center' : 'justify-start'} gap-4 p-3 rounded-2xl 
        font-roboto text-[14px] font-bold transition-colors duration-300 group overflow-hidden outline-none
        ${active ? "text-[var(--color-atelier-terracota)]" : "text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-grafite)]"}
      `}
    >
      {/* PÍLULA MAGNÉTICA (A Máxima Sofisticação Visual) */}
      {active && (
        <motion.div
          layoutId="sidebar-active-pill"
          className="absolute inset-0 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-white rounded-2xl -z-10"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      
      {/* EFEITO HOVER SECUNDÁRIO */}
      {!active && (
        <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl -z-10"></div>
      )}

      {/* ÍCONE COM MICRO-INTERAÇÃO */}
      <div className={`relative z-10 flex items-center justify-center transition-transform duration-300 ${!active && 'group-hover:scale-110'}`}>
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