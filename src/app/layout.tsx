// src/app/layout.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Roboto } from "next/font/google";
import { 
  Home, Lock, MessageSquare, Settings, 
  ChevronLeft, ChevronRight, LogOut, Compass,
  LayoutDashboard, FolderKanban, Users, Inbox, BarChart3, Shield,
  Globe2 
} from "lucide-react";
import "./globals.css";
import { supabase } from "../lib/supabase"; 

const roboto = Roboto({ 
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
});

// ==========================================
// COMPONENTE GLOBAL DE NOTIFICAÇÃO (TOAST)
// ==========================================
export const triggerToast = (message: string) => {
  const event = new CustomEvent("showToast", { detail: message });
  window.dispatchEvent(event);
};

function GlobalToast() {
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      setToast({ message: customEvent.detail, visible: true });
      setTimeout(() => setToast({ message: "", visible: false }), 3000);
    };
    window.addEventListener("showToast", handleToast);
    return () => window.removeEventListener("showToast", handleToast);
  }, []);

  if (!toast.visible) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[9999] bg-white/90 backdrop-blur-xl border border-[var(--color-atelier-terracota)]/30 text-[var(--color-atelier-grafite)] px-6 py-4 rounded-2xl shadow-[0_20px_40px_rgba(173,111,64,0.15)] animate-[fadeInUp_0.3s_ease-out] flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-[var(--color-atelier-terracota)] animate-pulse"></div>
      <span className="font-roboto text-[13px] font-bold tracking-wide">{toast.message}</span>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const [userProfile, setUserProfile] = useState<{ nome: string, avatar_url: string | null, empresa: string | null, cargo: string | null } | null>(null);
  
  // NOVIDADE: Estado para controlar a Fechadura do Projeto (Efeito VRTICE)
  const [isProjectArchived, setIsProjectArchived] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/login';

  // ==========================================
  // BLINDAGEM DE ROTA E LÓGICA DE ARQUIVAMENTO
  // ==========================================
  useEffect(() => {
    const checkAuthAndProfile = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem("atelier_token") : null;
      const role = typeof window !== 'undefined' ? localStorage.getItem("atelier_role") : null;
      document.title = "Atelier";

      if ((!token || !role) && !isLoginPage) {
        localStorage.removeItem("atelier_token");
        localStorage.removeItem("atelier_role");
        router.replace('/login');
        return;
      }

      if (token && role) {
        setUserRole(role);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
           const { data: profile } = await supabase.from('profiles').select('nome, avatar_url, empresa, cargo').eq('id', session.user.id).single();
           if (profile) setUserProfile(profile);

           // LÓGICA DO ARQUIVAMENTO PARA O CLIENTE
           if (role === 'client') {
             const { data: project } = await supabase
               .from('projects')
               .select('status, delivered_at')
               .eq('client_id', session.user.id)
               .in('status', ['active', 'delivered', 'archived'])
               .order('created_at', { ascending: false })
               .limit(1)
               .single();

             let shouldArchive = false;

             if (project) {
               if (project.status === 'archived') {
                 shouldArchive = true;
               } else if (project.status === 'delivered' && project.delivered_at) {
                 // Calcula se já passaram 15 dias
                 const deliveredDate = new Date(project.delivered_at);
                 const today = new Date();
                 const diffTime = Math.abs(today.getTime() - deliveredDate.getTime());
                 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                 
                 if (diffDays >= 15) {
                   shouldArchive = true;
                   // (Opcional) Auto-arquivar no banco para manter sincronizado
                   supabase.from('projects').update({ status: 'archived' }).eq('client_id', session.user.id).then();
                 }
               }
             }

             setIsProjectArchived(shouldArchive);

             // Redireciona o cliente se tentar aceder a rotas trancadas
             const lockedRoutes = ['/', '/cofre', '/referencias'];
             if (shouldArchive && lockedRoutes.includes(pathname)) {
               router.replace('/comunidade');
               return; 
             }
           }
        }

        if (isLoginPage) {
           router.replace(role === 'client' ? (isProjectArchived ? '/comunidade' : '/') : '/admin');
        } else if (role === 'client' && pathname.startsWith('/admin')) {
           router.replace(isProjectArchived ? '/comunidade' : '/');
        } else if ((role === 'admin' || role === 'gestor') && pathname === '/') {
           router.replace('/admin');
        } else {
           const timer = setTimeout(() => setIsInitializing(false), 800);
           return () => clearTimeout(timer);
        }
      } else {
        setIsInitializing(false);
      }
    };

    checkAuthAndProfile();
  }, [pathname, router, isLoginPage, isProjectArchived]);

  const handleLogout = () => {
    triggerToast("A encerrar sessão com segurança...");
    setTimeout(() => {
      localStorage.removeItem("atelier_token");
      localStorage.removeItem("atelier_role");
      supabase.auth.signOut(); 
      router.replace('/login');
    }, 1000);
  };

  const isTeamMember = userRole === 'admin' || userRole === 'gestor';
  
  // A CHAVE DA METAMORFOSE: Se for cliente e estiver arquivado, esconde a Sidebar
  const shouldHideSidebar = !isTeamMember && isProjectArchived;

  if (isInitializing && !isLoginPage) {
    return (
      <html lang="pt-BR" className={roboto.variable}>
        <body className="bg-[var(--color-atelier-creme)] min-h-screen flex flex-col items-center justify-center overflow-hidden relative">
          <div className="absolute w-[600px] h-[600px] bg-[var(--color-atelier-rose)]/10 blur-[120px] rounded-full animate-pulse"></div>
          <div className="relative z-10 flex flex-col items-center">
             <div id="preloader" className="mb-4">
                <svg id="preloader-logo" width="120" height="120" viewBox="0 0 457 461" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-[pulse_3s_ease-in-out_infinite]">
                    <path d="M99.3527 460.899C93.9446 438.243 91.9158 414.912 93.3322 391.663C94.5186 373.958 97.5451 356.424 102.363 339.345C108.669 316.384 117.271 294.116 128.04 272.879C136.8 255.329 144.386 243.679 158.143 222.487C167.354 208.309 176.565 195.395 188.637 179.892C184.611 173.206 180.209 166.754 175.452 160.567C166.304 148.657 155.932 137.74 144.506 127.996C128.518 113.753 111.404 100.827 93.3322 89.3441C80.1404 80.9073 67.4647 71.6896 55.3729 61.7402C39.9877 48.8563 25.7463 34.6653 12.8081 19.3258C9.77201 32.6358 8.56682 46.298 9.22588 59.934C10.2498 76.9881 13.9684 93.7725 20.2434 109.663C34.6152 144.665 55.749 176.488 82.4351 203.312C98.6904 219.537 112.959 228.628 124.849 230.254L123.615 239.284C109.527 237.358 93.9643 227.695 76.0533 209.784C48.2983 182.098 26.4272 149.087 11.7545 112.734C5.15857 95.9946 1.25707 78.3159 0.195136 60.3554C-0.673275 42.8132 1.36092 25.2479 6.21563 8.36848L8.68403 0L14.1627 6.77305C28.2232 24.3366 43.983 40.4695 61.2128 54.937C73.0459 64.7111 85.4608 73.7584 98.3894 82.0292C116.794 93.6821 134.229 106.799 150.527 121.253C162.409 131.438 173.203 142.827 182.736 155.238C186.048 159.724 190.292 165.383 194.597 172.337C203.026 161.53 212.839 149.248 224.699 134.257C238.667 116.767 251.792 100.211 272.231 96.8396C282.381 95.2394 292.774 96.3826 302.334 100.151C307.295 102.383 311.844 105.436 315.789 109.182L317.294 110.506C326.777 118.694 339.691 124.293 355.675 127.213L456.368 120.41L457 129.441L355.224 136.424H354.682C336.831 133.233 322.261 126.912 311.424 117.55L309.799 116.135C306.598 112.935 302.872 110.308 298.781 108.369C290.813 105.334 282.193 104.421 273.766 105.72C256.819 108.519 244.687 123.781 231.834 139.856C218.98 155.931 208.354 169.296 199.473 180.735C205.075 191.188 209.314 202.317 212.086 213.848C214.645 224.564 220.666 249.67 212.086 278.899C203.507 308.129 184.994 326.16 167.143 343.65C159.393 351.379 150.994 358.429 142.038 364.721C135.944 368.653 130.551 373.578 126.084 379.291C111.273 398.346 105.313 425.348 108.383 459.604L99.3527 460.899ZM193.363 188.682C182.646 202.71 174.157 214.54 165.759 227.484C151.159 249.85 144.506 260.597 136.168 276.943C125.7 297.642 117.32 319.332 111.153 341.693C106.461 358.207 103.515 375.167 102.363 392.295C102.002 398.316 101.871 404.336 101.972 410.357C104.876 397.068 110.65 384.575 118.889 373.752C123.888 367.35 129.909 361.817 136.71 357.376C145.305 351.385 153.363 344.657 160.792 337.268C177.83 320.561 195.44 303.312 203.387 276.431C211.334 249.549 205.735 226.039 203.387 216.015C201.111 206.548 197.747 197.376 193.363 188.682Z" fill="#905631"/>
                    <path d="M171.087 335.733L170.334 326.702C183.977 325.602 197.354 322.309 209.949 316.949C251.671 299.158 271.237 263.637 278.613 250.272C289.259 230.854 296.057 209.563 298.631 187.569C300.079 178.545 303.215 169.875 307.872 162.012C321.147 139.736 342.671 130.855 354.32 127.544L356.789 136.214C339.724 140.786 325.022 151.648 315.639 166.617C311.573 173.459 308.836 181.006 307.571 188.863C304.844 211.939 297.689 234.272 286.499 254.637C278.733 268.755 258.083 306.232 213.501 325.287C200.016 331.025 185.694 334.552 171.087 335.733Z" fill="#905631"/>
                </svg>
             </div>

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

  return (
    <html lang="pt-BR" className={roboto.variable}>
      <body className="bg-[var(--color-atelier-creme)] text-[var(--color-atelier-grafite)] font-roboto h-screen w-screen overflow-hidden flex relative selection:bg-[var(--color-atelier-terracota)] selection:text-white">
        
        <GlobalToast />

        {!isLoginPage && (
          <>
            <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-[var(--color-atelier-terracota)]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
            <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-[var(--color-atelier-rose)]/10 blur-[150px] rounded-full pointer-events-none z-0"></div>
          </>
        )}

        {/* SIDEBAR SÓ APARECE SE NÃO FOR LOGIN E NÃO DEVER SER OCULTADA */}
        {!isLoginPage && userRole && !shouldHideSidebar && (
          <aside 
            className={`
              relative z-50 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
              ${isTeamMember ? 'bg-white/80 border-r border-white shadow-[20px_0_40px_rgba(122,116,112,0.08)]' : 'bg-white/40 backdrop-blur-2xl border-r border-white/60 shadow-[20px_0_40px_rgba(122,116,112,0.05)]'}
              ${isCollapsed ? 'w-[100px] items-center' : 'w-[280px]'}
            `}
          >
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
                {!isTeamMember && (
                  <>
                    <NavItem href="/" icon={<Home size={22} strokeWidth={1.5} />} label="Início" collapsed={isCollapsed} active={pathname === '/'} />
                    <NavItem href="/cofre" icon={<Lock size={22} strokeWidth={1.5} />} label="O Cofre" collapsed={isCollapsed} active={pathname === '/cofre'} />
                    <NavItem href="/referencias" icon={<Compass size={22} strokeWidth={1.5} />} label="Referências" collapsed={isCollapsed} active={pathname === '/referencias'} />
                    <NavItem href="/canais" icon={<MessageSquare size={22} strokeWidth={1.5} />} label="Canais" collapsed={isCollapsed} active={pathname === '/canais'} />
                    <NavItem href="/comunidade" icon={<Globe2 size={22} strokeWidth={1.5} />} label="Comunidade" collapsed={isCollapsed} active={pathname === '/comunidade'} />
                  </>
                )}

                {isTeamMember && (
                  <>
                    <NavItem href="/admin" icon={<LayoutDashboard size={22} strokeWidth={1.5} />} label="Comando" collapsed={isCollapsed} active={pathname === '/admin'} />
                    <NavItem href="/admin/projetos" icon={<FolderKanban size={22} strokeWidth={1.5} />} label="Estúdio" collapsed={isCollapsed} active={pathname === '/admin/projetos'} />
                    <NavItem href="/admin/clientes" icon={<Users size={22} strokeWidth={1.5} />} label="Base de Clientes" collapsed={isCollapsed} active={pathname === '/admin/clientes'} />
                    <NavItem href="/admin/inbox" icon={<Inbox size={22} strokeWidth={1.5} />} label="Caixa de Entrada" collapsed={isCollapsed} active={pathname === '/admin/inbox'} />
                    <NavItem href="/comunidade" icon={<Globe2 size={22} strokeWidth={1.5} />} label="Comunidade" collapsed={isCollapsed} active={pathname === '/comunidade'} />
                    
                    {userRole === 'gestor' && (
                      <NavItem href="/admin/metricas" icon={<BarChart3 size={22} strokeWidth={1.5} />} label="Métricas & Saúde" collapsed={isCollapsed} active={pathname === '/admin/metricas'} />
                    )}
                  </>
                )}
              </nav>
            </div>

            <div className="p-6 border-t border-[var(--color-atelier-grafite)]/10 flex flex-col gap-3 shrink-0">
              {!isCollapsed && (
                <div 
                  className="flex items-center gap-3 mb-2 p-2 rounded-2xl bg-white/50 border border-white shadow-sm cursor-pointer hover:bg-white transition-colors"
                  onClick={() => router.push('/configuracoes')}
                >
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
        )}

        <main className={`flex-1 relative z-10 overflow-hidden flex flex-col ${isLoginPage || shouldHideSidebar ? 'p-0' : 'px-6 md:px-12 py-8'}`}>
          <div className={isLoginPage || shouldHideSidebar ? "w-full h-full" : "flex-1 overflow-y-auto custom-scrollbar"}>
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