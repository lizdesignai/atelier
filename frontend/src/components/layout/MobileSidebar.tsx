// src/components/layout/MobileSidebar.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, Compass, Lock, MessageSquare, Globe2, LogOut, Menu, X, Target, 
  Crosshair, Eye, Crown, TrendingUp, Archive, DollarSign, MessageCircle,
  Activity, Users, FolderKanban, FileText, LayoutDashboard, Briefcase, Grid
} from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import { useProjects } from '../../hooks/useProjects';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileSidebar({ userRole, handleLogout }: { userRole: string, handleLogout?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [clientServiceType, setClientServiceType] = useState("Identidade Visual");
  const [isReady, setIsReady] = useState(false);
  const [isProjectArchived, setIsProjectArchived] = useState(false);
  
  const [globalUnreadCount, setGlobalUnreadCount] = useState<number>(0);

  const { data: session } = useSession();
  const { data: projects } = useProjects();

  const isTeamMember = ['admin', 'gestor', 'colaborador'].includes(userRole);
  const isContador = userRole === 'contador';
  const isManagerOrAdmin = ['admin', 'gestor'].includes(userRole);
  const isClient = !isTeamMember && !isContador;

  useEffect(() => {
    if (!session || !projects) return;

    const fetchSidebarData = async () => {
      if (isClient) {
        const project = projects?.find(p => p.client_id === session?.user?.id) || projects?.[0];
        let shouldArchive = false;

        const rawService = project?.service_type || project?.type || project?.service || "";
        const isInstagram = rawService === "Gestão de Instagram" || rawService.toLowerCase().includes("instagram");
        const isMapa = rawService === "O Mapa" || rawService.toLowerCase() === "o mapa" || rawService.toLowerCase() === "mapa";
        
        let service = "Identidade Visual";
        if (isInstagram) service = "Gestão de Instagram";
        if (isMapa) service = "O Mapa";

        setClientServiceType(service);

        if (project) {
          if (project.status === 'archived') {
            shouldArchive = true;
          } else if (project.status === 'delivered' && project.delivered_at) {
            const deliveredDate = new Date(project.delivered_at);
            const diffDays = Math.ceil(Math.abs(new Date().getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 15) {
              shouldArchive = true;
            }
          }
        }

        setIsProjectArchived(shouldArchive);
      }
      setIsReady(true);
    };

    fetchSidebarData();
  }, [session, projects, isClient]);

  if (isClient && isProjectArchived) return null;
  if (isContador && !isReady) return null;

  const mobileMainItems = isContador ? [
    { href: '/admin/financeiro', icon: <DollarSign size={20} strokeWidth={1.5} />, label: 'Finanças' },
    { href: '/admin/fio', icon: <MessageCircle size={20} strokeWidth={1.5} />, label: 'Sintonia', badge: globalUnreadCount },
    { href: '/comunidade', icon: <Globe2 size={20} strokeWidth={1.5} />, label: 'Comunidade' }
  ] : isTeamMember ? [
    { href: '/admin/analytics', icon: <Activity size={20} strokeWidth={1.5} />, label: 'Analytics' },
    { href: '/admin/jtbd', icon: <Crosshair size={20} strokeWidth={1.5} />, label: 'Focus' },
    { href: '/admin/clientes', icon: <Users size={20} strokeWidth={1.5} />, label: 'Clientes' },
    { href: '/admin/fio', icon: <MessageCircle size={20} strokeWidth={1.5} />, label: 'Sintonia', badge: globalUnreadCount },
    { href: '/comunidade', icon: <Globe2 size={20} strokeWidth={1.5} />, label: 'Comunidade' }
  ] : clientServiceType === "O Mapa" ? [
    { href: '/mapa', icon: <Home size={20} strokeWidth={1.5} />, label: 'Inicial' },
    { href: '/mapa/cofre', icon: <Archive size={20} strokeWidth={1.5} />, label: 'Cofre' },
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

  const mobileDrawerItems = isContador ? [
    { href: '/admin/financeiro', icon: <DollarSign size={20} strokeWidth={1.5} />, label: 'Financeiro' },
    { href: '/admin/fio', icon: <MessageCircle size={20} strokeWidth={1.5} />, label: 'Sintonia', badge: globalUnreadCount },
    { href: '/comunidade', icon: <Globe2 size={20} strokeWidth={1.5} />, label: 'Comunidade' }
  ] : isTeamMember ? [
    { href: '/admin/jtbd', icon: <Crosshair size={20} strokeWidth={1.5} />, label: 'Focus' },
    { href: '/admin/projetos', icon: <FolderKanban size={20} strokeWidth={1.5} />, label: 'Estúdio' },
    { href: '/admin/fio', icon: <MessageCircle size={20} strokeWidth={1.5} />, label: 'Sintonia', badge: globalUnreadCount },
    { href: '/comunidade', icon: <Globe2 size={20} strokeWidth={1.5} />, label: 'Comunidade' },
    ...(isManagerOrAdmin ? [
      { href: '/admin', icon: <FileText size={20} strokeWidth={1.5} />, label: 'QG da Liziane' },
      { href: '/admin/gestao', icon: <LayoutDashboard size={20} strokeWidth={1.5} />, label: 'Produtividade' },
      { href: '/admin/analytics', icon: <Briefcase size={20} strokeWidth={1.5} />, label: 'Analytics' }
    ] : [])
  ] : clientServiceType === "O Mapa" ? [
    { href: '/mapa', icon: <Home size={20} strokeWidth={1.5} />, label: 'Visão Geral' },
    { href: '/mapa/sprint/0', icon: <Target size={20} strokeWidth={1.5} />, label: 'Baseline' },
    { href: '/mapa/sprint/1', icon: <Crosshair size={20} strokeWidth={1.5} />, label: 'Clareza' },
    { href: '/mapa/sprint/2', icon: <Eye size={20} strokeWidth={1.5} />, label: 'Percepção' },
    { href: '/mapa/sprint/3', icon: <Crown size={20} strokeWidth={1.5} />, label: 'Autoridade' },
    { href: '/mapa/sprint/4', icon: <Target size={20} strokeWidth={1.5} />, label: 'Conversão' },
    { href: '/mapa/sprint/5', icon: <TrendingUp size={20} strokeWidth={1.5} />, label: 'Revalidação' },
    { href: '/mapa/cofre', icon: <Archive size={20} strokeWidth={1.5} />, label: 'Cofre de Evidências' },
    { href: '/comunidade', icon: <Globe2 size={20} strokeWidth={1.5} />, label: 'Comunidade' }
  ] : clientServiceType === "Gestão de Instagram" ? [
    { href: '/cockpit', icon: <Home size={20} strokeWidth={1.5} />, label: 'Inicial' },
    { href: '/simulador-feed', icon: <Grid size={20} strokeWidth={1.5} />, label: 'Feed' },
    { href: '/canais', icon: <MessageSquare size={20} strokeWidth={1.5} />, label: 'Canais', badge: globalUnreadCount },
    { href: '/comunidade', icon: <Globe2 size={20} strokeWidth={1.5} />, label: 'Comunidade' }
  ] : [
    { href: '/', icon: <Home size={20} strokeWidth={1.5} />, label: 'Inicial' },
    { href: '/cofre', icon: <Lock size={20} strokeWidth={1.5} />, label: 'O Cofre' },
    { href: '/referencias', icon: <Compass size={20} strokeWidth={1.5} />, label: 'Referências' },
    { href: '/canais', icon: <MessageSquare size={20} strokeWidth={1.5} />, label: 'Canais', badge: globalUnreadCount },
    { href: '/comunidade', icon: <Globe2 size={20} strokeWidth={1.5} />, label: 'Comunidade' }
  ];

  return (
    <>
      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[99999] px-2 py-1.5 bg-white/70 backdrop-blur-3xl border border-white/80 rounded-[2rem] flex items-center justify-around w-[92vw] max-w-[420px] shadow-lg pointer-events-auto">
        {mobileMainItems.map((item) => {
          const isActive = item.href === '/mapa' 
            ? (pathname.startsWith('/mapa') && !pathname.includes('cofre'))
            : item.href === '/mapa/cofre'
            ? pathname.includes('/mapa/cofre')
            : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`flex items-center justify-center gap-1.5 relative transition-all duration-500 rounded-full overflow-hidden ${isActive ? 'bg-[var(--color-atelier-terracota)] text-white px-3.5 py-2' : 'text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-grafite)] hover:bg-gray-50/50 w-10 h-10 shrink-0'}`}
            >
              <div className="relative z-10 flex items-center justify-center shrink-0">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white shadow-sm ${isActive ? 'bg-white' : 'bg-red-500 animate-pulse-slow'}`}></div>
                )}
              </div>
              
              <AnimatePresence>
                {isActive && (
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
          );
        })}
        
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

      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-[100000] bg-black/20 backdrop-blur-sm pointer-events-auto"
              onClick={() => setIsMobileDrawerOpen(false)}
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden fixed bottom-0 left-0 w-full z-[100001] bg-[var(--color-atelier-creme)] rounded-t-[2.5rem] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col max-h-[85vh] pointer-events-auto"
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
              
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2 pb-12 custom-scrollbar">
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
