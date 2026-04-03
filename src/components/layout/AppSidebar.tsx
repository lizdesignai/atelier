// src/components/layout/AppSidebar.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { 
  Home, Lock, MessageSquare, Settings, 
  ChevronLeft, ChevronRight, LogOut, Compass,
  LayoutDashboard, FolderKanban, Users, Inbox, BarChart3, Shield,
  Globe2, Camera, CheckCircle2, DollarSign
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
  const isTeamMember = userRole === 'admin' || userRole === 'gestor';

  useEffect(() => {
    const fetchSidebarData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Puxa os dados do Perfil
      const { data: profile } = await supabase.from('profiles').select('nome, avatar_url, empresa, cargo').eq('id', session.user.id).single();
      if (profile) setUserProfile(profile);

      // 2. Se for Cliente, puxa o serviço e status do Projeto
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
          shouldArchive = true; // Sem projeto = sem acesso
        }

        setIsProjectArchived(shouldArchive);
        onHideSidebar(shouldArchive); // Informa o Layout principal para remover o padding

        const isInstagram = service === "Gestão de Instagram";

        // 3. Roteamento Dinâmico Inteligente
        if (shouldArchive) {
          const lockedRoutes = ['/', '/cofre', '/referencias', '/conteudo', '/aprovacoes'];
          if (lockedRoutes.includes(pathname)) router.replace('/comunidade');
        } else {
          if (isInstagram && (pathname === '/' || pathname === '/cofre' || pathname === '/referencias')) {
            router.replace('/conteudo');
          } else if (!isInstagram && (pathname === '/conteudo' || pathname === '/aprovacoes')) {
            router.replace('/');
          }
        }
      }
      
      setIsReady(true);
    };

    fetchSidebarData();
  }, [pathname, isTeamMember, router, onHideSidebar]);

  // Se for cliente sem acesso ativo, a sidebar oculta-se
  if (!isTeamMember && (isProjectArchived || !isReady)) return null;

  return (
    <aside className={`
      relative z-50 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
      ${isTeamMember ? 'bg-white/80 border-r border-white shadow-[20px_0_40px_rgba(122,116,112,0.08)]' : 'bg-white/40 backdrop-blur-2xl border-r border-white/60 shadow-[20px_0_40px_rgba(122,116,112,0.05)]'}
      ${isCollapsed ? 'w-[100px] items-center' : 'w-[280px]'}
    `}>
      <div className={`p-8 flex items-center h-32 shrink-0 ${isCollapsed ? 'justify-center' : 'justify-start gap-4'}`}>
        <div className="w-12 h-12 shrink-0 drop-shadow-xl relative group cursor-pointer">
          <div className="absolute inset-0 bg-[var(--color-atelier-terracota)]/20 rounded-full blur-md group-hover:scale-150 transition-transform duration-500 opacity-0 group-hover:opacity-100"></div>
          <img src="/images/simbolo-rosa.png" alt="Atelier" className="w-full h-full object-contain relative z-10" />
        </div>
        
        {!isCollapsed && (
          <div className="flex flex-col overflow-hidden whitespace-nowrap fade-in-up">
            <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none mb-1">Atelier</span>
            <span className="font-roboto text-[0.6rem] text-[var(--color-atelier-terracota)] tracking-[0.2em] uppercase font-bold">
              {isTeamMember ? 'Studio HQ' : 'Portal do Cliente'}
            </span>
          </div>
        )}
      </div>

      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-14 bg-white/90 backdrop-blur-md border border-white shadow-sm text-[var(--color-atelier-grafite)] rounded-full w-8 h-8 flex items-center justify-center cursor-pointer z-50 hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all duration-300 hover:scale-110"
      >
        {isCollapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
      </button>

      <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
        {!isCollapsed && (
          <div className="text-[0.65rem] uppercase font-bold text-[var(--color-atelier-grafite)]/50 tracking-[0.15em] mb-4 pl-4">
            {isTeamMember ? 'Operacional' : 'Visão Geral'}
          </div>
        )}
        
        <nav className="flex flex-col gap-2">
          
          {/* MENU PARA CLIENTES */}
          {!isTeamMember && (
            <>
              {clientServiceType === "Gestão de Instagram" ? (
                <>
                  <NavItem href="/conteudo" icon={<Camera size={22} strokeWidth={1.5} />} label="Conteúdo" collapsed={isCollapsed} active={pathname === '/conteudo'} />
                  <NavItem href="/aprovacoes" icon={<CheckCircle2 size={22} strokeWidth={1.5} />} label="Aprovações" collapsed={isCollapsed} active={pathname === '/aprovacoes'} />
                </>
              ) : (
                <>
                  <NavItem href="/" icon={<Home size={22} strokeWidth={1.5} />} label="Mesa de Trabalho" collapsed={isCollapsed} active={pathname === '/'} />
                  <NavItem href="/cofre" icon={<Lock size={22} strokeWidth={1.5} />} label="O Cofre" collapsed={isCollapsed} active={pathname === '/cofre'} />
                  <NavItem href="/referencias" icon={<Compass size={22} strokeWidth={1.5} />} label="Referências" collapsed={isCollapsed} active={pathname === '/referencias'} />
                </>
              )}
              <NavItem href="/canais" icon={<MessageSquare size={22} strokeWidth={1.5} />} label="Canais" collapsed={isCollapsed} active={pathname === '/canais'} />
              <NavItem href="/comunidade" icon={<Globe2 size={22} strokeWidth={1.5} />} label="Comunidade" collapsed={isCollapsed} active={pathname === '/comunidade'} />
            </>
          )}

          {/* MENU PARA ADMINS */}
          {isTeamMember && (
            <>
              <NavItem href="/admin" icon={<LayoutDashboard size={22} strokeWidth={1.5} />} label="Comando" collapsed={isCollapsed} active={pathname === '/admin'} />
              <NavItem href="/admin/projetos" icon={<FolderKanban size={22} strokeWidth={1.5} />} label="Estúdio" collapsed={isCollapsed} active={pathname === '/admin/projetos'} />
              <NavItem href="/admin/clientes" icon={<Users size={22} strokeWidth={1.5} />} label="Base de Clientes" collapsed={isCollapsed} active={pathname === '/admin/clientes'} />
              <NavItem href="/admin/inbox" icon={<Inbox size={22} strokeWidth={1.5} />} label="Caixa de Entrada" collapsed={isCollapsed} active={pathname === '/admin/inbox'} />
              <NavItem href="/comunidade" icon={<Globe2 size={22} strokeWidth={1.5} />} label="Comunidade" collapsed={isCollapsed} active={pathname === '/comunidade'} />
              <NavItem href="/admin/financeiro" icon={<DollarSign size={22} strokeWidth={1.5} />} label="Financeiro" collapsed={isCollapsed} active={pathname === '/admin/financeiro'} />
              <NavItem href="/admin/analytics" icon={<BarChart3 size={22} strokeWidth={1.5} />} label="Analytics" collapsed={isCollapsed} active={pathname === '/admin/analytics'} />
              
              {userRole === 'gestor' && (
                <NavItem href="/admin/metricas" icon={<BarChart3 size={22} strokeWidth={1.5} />} label="Métricas & Saúde" collapsed={isCollapsed} active={pathname === '/admin/metricas'} />
              )}
            </>
          )}
        </nav>
      </div>

      <div className="p-6 border-t border-[var(--color-atelier-grafite)]/10 flex flex-col gap-3 shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-3 mb-2 p-2 rounded-2xl bg-white/50 border border-white shadow-sm cursor-pointer hover:bg-white transition-colors" onClick={() => router.push('/configuracoes')}>
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm shrink-0 border border-white/50 flex items-center justify-center bg-[var(--color-atelier-grafite)] text-white">
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
                {isTeamMember ? (userProfile?.cargo || 'Membro da Equipa') : (userProfile?.empresa || 'Cliente Premium')}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <NavItem href="/configuracoes" icon={<Settings size={22} strokeWidth={1.5} />} label="Ajustes" collapsed={isCollapsed} active={pathname === '/configuracoes'} />
          <button onClick={handleLogout} className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-4 p-3 rounded-2xl text-[var(--color-atelier-grafite)]/70 hover:bg-red-50 hover:text-red-500 transition-all duration-300 group`}>
            <LogOut size={22} strokeWidth={1.5} className="group-hover:-translate-x-1 transition-transform" />
            {!isCollapsed && <span className="font-bold text-[13px]">Desconectar</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ href, icon, label, collapsed, active }: { href: string, icon: React.ReactNode, label: string, collapsed: boolean, active: boolean }) {
  return (
    <Link href={href} title={collapsed ? label : ""} className={`relative flex items-center ${collapsed ? 'justify-center' : 'justify-start'} gap-4 p-3 rounded-2xl font-roboto text-[14px] font-bold transition-all duration-300 group overflow-hidden ${active ? "bg-white text-[var(--color-atelier-terracota)] shadow-sm border border-white" : "text-[var(--color-atelier-grafite)]/70 hover:bg-white/50 hover:text-[var(--color-atelier-grafite)] border border-transparent"}`}>
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-md bg-[var(--color-atelier-terracota)]"></div>}
      <div className={`relative z-10 ${active ? 'ml-1' : 'group-hover:scale-110 transition-transform'}`}>{icon}</div>
      {!collapsed && <span className="relative z-10 tracking-wide whitespace-nowrap">{label}</span>}
    </Link>
  );
}