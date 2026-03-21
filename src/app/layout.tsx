// src/app/layout.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Roboto } from "next/font/google";
import { 
  Home, Lock, MessageSquare, Gamepad2, Settings, 
  ChevronLeft, ChevronRight, LogOut, Compass,
  LayoutDashboard, FolderKanban, Users, Inbox, BarChart3, Shield
} from "lucide-react";
import "./globals.css";

const roboto = Roboto({ 
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/login';

  // ==========================================
  // BLINDAGEM DE ROTA (ANTI-CACHE CORROMPIDO)
  // ==========================================
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("atelier_token") : null;
    const role = typeof window !== 'undefined' ? localStorage.getItem("atelier_role") : null;
    document.title = "Atelier"

    // 1. O Exterminador de Cache: Tem token mas não tem papel? Sessão corrompida! Destrói e joga pro login.
    if (token && !role) {
      localStorage.removeItem("atelier_token");
      localStorage.removeItem("atelier_role");
      router.replace('/login');
      return;
    }

    // 2. Não está logado e tenta acessar área interna
    if (!token && !isLoginPage) {
      router.replace('/login');
      return;
    } 
    
    // 3. Está logado e tenta acessar o Login
    if (token && isLoginPage && role) {
      router.replace(role === 'client' ? '/' : '/admin');
      return;
    } 
    
    // 4. Fluxo Normal e Autorizado
    if (token && role) {
      setUserRole(role);
      
      if (role === 'client' && pathname.startsWith('/admin')) {
        router.replace('/');
      } else if ((role === 'admin' || role === 'gestor') && pathname === '/') {
        router.replace('/admin');
      } else {
        const timer = setTimeout(() => setIsInitializing(false), 800);
        return () => clearTimeout(timer);
      }
    } else {
      setIsInitializing(false);
    }
  }, [pathname, router, isLoginPage]);

  // Função de Desconectar
  const handleLogout = () => {
    localStorage.removeItem("atelier_token");
    localStorage.removeItem("atelier_role");
    router.replace('/login');
  };

  // Ecrã de Carregamento Imersivo
  if (isInitializing && !isLoginPage) {
    return (
      <html lang="pt-BR" className={roboto.variable}>
        <body className="bg-[var(--color-atelier-creme)] min-h-screen flex flex-col items-center justify-center overflow-hidden relative">
          <div className="absolute w-[600px] h-[600px] bg-[var(--color-atelier-rose)]/10 blur-[120px] rounded-full animate-pulse"></div>
          <div className="relative z-10 flex flex-col items-center">
             <img src="/images/Símbolo Rosa.png" alt="Atelier Logo" className="w-16 h-16 object-contain drop-shadow-lg mb-6 animate-bounce" style={{ animationDuration: '2s' }} />
             <div className="w-32 h-[2px] bg-black/5 rounded-full overflow-hidden">
               <div className="w-full h-full bg-[var(--color-atelier-terracota)] animate-[slideRight_1.2s_ease-in-out_infinite]" style={{ transformOrigin: 'left' }}></div>
             </div>
             <p className="mt-6 font-roboto text-[0.65rem] text-[var(--color-atelier-grafite)] tracking-[0.4em] uppercase font-bold">
               Sincronizando Acesso...
             </p>
          </div>
        </body>
      </html>
    );
  }

  const isTeamMember = userRole === 'admin' || userRole === 'gestor';

  return (
    <html lang="pt-BR" className={roboto.variable}>
      <body className="bg-[var(--color-atelier-creme)] text-[var(--color-atelier-grafite)] font-roboto h-screen w-screen overflow-hidden flex relative selection:bg-[var(--color-atelier-terracota)] selection:text-white">
        
        {/* Luzes de Fundo da Dashboard */}
        {!isLoginPage && (
          <>
            <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-[var(--color-atelier-terracota)]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
            <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-[var(--color-atelier-rose)]/10 blur-[150px] rounded-full pointer-events-none z-0"></div>
          </>
        )}

        {/* SIDEBAR INTELIGENTE (Só renderiza se o userRole estiver pronto) */}
        {!isLoginPage && userRole && (
          <aside 
            className={`
              relative z-50 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
              ${isTeamMember ? 'bg-white/80 border-r border-white shadow-[20px_0_40px_rgba(122,116,112,0.08)]' : 'bg-white/40 backdrop-blur-2xl border-r border-white/60 shadow-[20px_0_40px_rgba(122,116,112,0.05)]'}
              ${isCollapsed ? 'w-[100px] items-center' : 'w-[280px]'}
            `}
          >
            {/* BRAND AREA */}
            <div className={`p-8 flex items-center h-32 shrink-0 ${isCollapsed ? 'justify-center' : 'justify-start gap-4'}`}>
              <div className="w-12 h-12 shrink-0 drop-shadow-xl relative group cursor-pointer">
                <div className="absolute inset-0 bg-[var(--color-atelier-terracota)]/20 rounded-full blur-md group-hover:scale-150 transition-transform duration-500 opacity-0 group-hover:opacity-100"></div>
                <img src="/images/Símbolo Rosa.png" alt="Atelier" className="w-full h-full object-contain relative z-10" />
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

            {/* NAVEGAÇÃO DINÂMICA */}
            <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
              {!isCollapsed && (
                <div className="text-[0.65rem] uppercase font-bold text-[var(--color-atelier-grafite)]/50 tracking-[0.15em] mb-4 pl-4">
                  {isTeamMember ? 'Operacional' : 'Visão Geral'}
                </div>
              )}
              
              <nav className="flex flex-col gap-2">
                {/* MENU DO CLIENTE */}
                {!isTeamMember && (
                  <>
                    <NavItem href="/" icon={<Home size={22} strokeWidth={1.5} />} label="Início" collapsed={isCollapsed} active={pathname === '/'} />
                    <NavItem href="/cofre" icon={<Lock size={22} strokeWidth={1.5} />} label="O Cofre" collapsed={isCollapsed} active={pathname === '/cofre'} />
                    <NavItem href="/referencias" icon={<Compass size={22} strokeWidth={1.5} />} label="Referências" collapsed={isCollapsed} active={pathname === '/referencias'} />
                    <NavItem href="/gamificacao" icon={<Gamepad2 size={22} strokeWidth={1.5} />} label="Conquistas" collapsed={isCollapsed} active={pathname === '/gamificacao'} />
                  </>
                )}

                {/* MENU DA EQUIPA */}
                {isTeamMember && (
                  <>
                    <NavItem href="/admin" icon={<LayoutDashboard size={22} strokeWidth={1.5} />} label="Comando" collapsed={isCollapsed} active={pathname === '/admin'} />
                    <NavItem href="/admin/projetos" icon={<FolderKanban size={22} strokeWidth={1.5} />} label="Estúdio (Projetos)" collapsed={isCollapsed} active={pathname === '/admin/projetos'} />
                    <NavItem href="/admin/clientes" icon={<Users size={22} strokeWidth={1.5} />} label="Base de Clientes" collapsed={isCollapsed} active={pathname === '/admin/clientes'} />
                    <NavItem href="/admin/inbox" icon={<Inbox size={22} strokeWidth={1.5} />} label="Caixa de Entrada" collapsed={isCollapsed} active={pathname === '/admin/inbox'} />
                    
                    {userRole === 'gestor' && (
                      <NavItem href="/admin/metricas" icon={<BarChart3 size={22} strokeWidth={1.5} />} label="Métricas & Saúde" collapsed={isCollapsed} active={pathname === '/admin/metricas'} />
                    )}
                  </>
                )}
              </nav>
            </div>

            {/* PERFIL */}
            <div className="p-6 border-t border-[var(--color-atelier-grafite)]/10 flex flex-col gap-3 shrink-0">
              {!isCollapsed && (
                <div className="flex items-center gap-3 mb-2 p-2 rounded-2xl bg-white/50 border border-white shadow-sm cursor-pointer hover:bg-white transition-colors">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm shrink-0 border border-white/50 flex items-center justify-center bg-[var(--color-atelier-grafite)] text-white">
                    {isTeamMember ? <Shield size={18} /> : <img src="https://ui-avatars.com/api/?name=Cliente&background=ad6f40&color=fbf4e4" alt="Avatar" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-roboto text-[13px] font-bold text-[var(--color-atelier-grafite)] truncate">
                      {isTeamMember ? 'Atelier Team' : 'Igor Castro'}
                    </span>
                    <span className="font-roboto text-[9px] text-[var(--color-atelier-terracota)] font-bold uppercase tracking-widest truncate">
                      {userRole === 'gestor' ? 'Acesso Diretor' : userRole === 'admin' ? 'Acesso Designer' : 'Acesso Premium'}
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
        )}

        {/* PALCO PRINCIPAL */}
        <main className={`flex-1 relative z-10 overflow-hidden flex flex-col ${isLoginPage ? 'p-0' : 'px-6 md:px-12 py-8'}`}>
          <div className={isLoginPage ? "w-full h-full" : "flex-1 overflow-y-auto custom-scrollbar"}>
            {!isInitializing ? children : null}
          </div>
        </main>

      </body>
    </html>
  );
}

function NavItem({ href, icon, label, collapsed, active }: { href: string, icon: React.ReactNode, label: string, collapsed: boolean, active: boolean }) {
  return (
    <Link 
      href={href} 
      title={collapsed ? label : ""}
      className={`
        relative flex items-center ${collapsed ? 'justify-center' : 'justify-start'} gap-4 p-3 rounded-2xl font-roboto text-[14px] font-bold transition-all duration-300 group overflow-hidden
        ${active 
          ? "bg-white text-[var(--color-atelier-terracota)] shadow-sm border border-white" 
          : "text-[var(--color-atelier-grafite)]/70 hover:bg-white/50 hover:text-[var(--color-atelier-grafite)] border border-transparent"
        }
      `}
    >
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-md bg-[var(--color-atelier-terracota)]"></div>}
      <div className={`relative z-10 ${active ? 'ml-1' : 'group-hover:scale-110 transition-transform'}`}>
        {icon}
      </div>
      {!collapsed && (
        <span className="relative z-10 tracking-wide whitespace-nowrap">
          {label}
        </span>
      )}
    </Link>
  );
}