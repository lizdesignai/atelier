// src/components/layout/AppHeader.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { 
  Bell, CheckCircle2, 
  Circle, Info, AlertTriangle, ShieldCheck, Music, Settings, LogOut,
  LayoutDashboard, BrainCircuit, Activity, Users, DollarSign, Target, Crown, Calendar, LayoutGrid, List, Compass,
  PanelLeft, PanelBottom, Film, Sun, Moon
} from "lucide-react";
import { useProfile } from "../../hooks/useProfile";
import { useGlobalStore } from "../../contexts/GlobalStore";
import DailyJamDropdown from "./DailyJamDropdown";
import UserAvatar from "../global/UserAvatar";
import { getSafeAvatarUrl, handleAvatarError } from "../../lib/imageUtils";
import VeronnaSymbol from "../brand/VeronnaSymbol";

interface AppHeaderProps {
  handleLogout: () => void;
  userRole?: string | null;
}

export default function AppHeader({ handleLogout, userRole }: AppHeaderProps) {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { navMode, setNavMode, theme, setTheme } = useGlobalStore();
  const userProfile = profile;
  const effectiveRole = userProfile?.role || userRole;
  const isTeamMember = ["admin", "gestor", "colaborador"].includes(effectiveRole || "");
  const isManagerOrAdmin = ["admin", "gestor"].includes(effectiveRole || "");
  
  // Estados do Sistema de Notificações
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isJamOpen, setIsJamOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [appsViewMode, setAppsViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const saved = localStorage.getItem('atelier_apps_view_mode');
    if (saved === 'list' || saved === 'grid') {
      setAppsViewMode(saved);
    }
  }, []);

  const changeAppsViewMode = (mode: 'grid' | 'list') => {
    setAppsViewMode(mode);
    localStorage.setItem('atelier_apps_view_mode', mode);
  };
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fecha o dropdown se clicar fora
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setIsJamOpen(false);
        setIsProfileDropdownOpen(false);
        setIsNavMenuOpen(false);
      }
      if (mobileProfileRef.current && !mobileProfileRef.current.contains(event.target as Node)) {
        setIsMobileProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;

    fetchNotifications(profile.id);
    setupRealtimeSubscription(profile.id);

    // Cleanup da subscrição ao desmontar
    return () => {
      supabase.channel('custom-notification-channel').unsubscribe();
    };
  }, [profile?.id]);

  const fetchNotifications = async (userId: string) => {
    const { data } = await (supabase
      .from('notifications') as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  };

  const setupRealtimeSubscription = (userId: string) => {
    supabase.channel('custom-notification-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newNotification = payload.new;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          window.dispatchEvent(new CustomEvent("showToast", { detail: "Nova notificação recebida!" }));
        }
      )
      .subscribe();
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    await (supabase.from('notifications') as any).update({ is_read: true }).eq('id', notificationId);
  };

  const markAllAsRead = async () => {
    if (!userProfile) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await (supabase.from('notifications') as any).update({ is_read: true }).eq('user_id', userProfile.id).eq('is_read', false);
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) markAsRead(notification.id);
    if (notification.link) {
      router.push(notification.link);
      setIsDropdownOpen(false);
    }
  };

  const getIconForType = (type: string) => {
    switch(type) {
      case 'success': return <CheckCircle2 size={14} className="text-green-500" />;
      case 'warning': return <AlertTriangle size={14} className="text-orange-500" />;
      case 'action': return <ShieldCheck size={14} className="text-[var(--color-atelier-terracota)]" />;
      default: return <Info size={14} className="text-blue-500" />;
    }
  };

  return (
    <>
      {/* HEADER FIXO MOBILE (Em todas as abas): Apenas a foto de perfil direcionando para /configuracoes */}
      <div className="md:hidden fixed top-3 right-4 z-[99999] pointer-events-auto" ref={mobileProfileRef}>
        <button 
          type="button"
          onClick={() => setIsMobileProfileOpen(!isMobileProfileOpen)}
          className="w-10 h-10 rounded-full overflow-hidden shadow-lg border-2 border-white/80 bg-white/60 backdrop-blur-xl flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          title="Meu Perfil"
        >
          {userProfile?.avatar_url ? (
            <img src={getSafeAvatarUrl(userProfile.avatar_url, userProfile.nome)} alt="Perfil" className="w-full h-full object-cover" onError={(e) => handleAvatarError(e, userProfile?.nome)} />
          ) : (
            <span className="font-elegant text-base font-bold text-[var(--color-atelier-grafite)]">
              {userProfile?.nome?.charAt(0) || "U"}
            </span>
          )}
        </button>

        <AnimatePresence>
          {isMobileProfileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 8, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute right-0 top-full mt-2 w-[235px] bg-white/95 backdrop-blur-2xl border border-white/60 rounded-2xl shadow-[0_20px_45px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col z-50 pointer-events-auto"
            >
              <div className="px-4 py-3 border-b border-[var(--color-atelier-grafite)]/5 bg-gray-50/60">
                <p className="text-[12px] font-bold text-[var(--color-atelier-grafite)] truncate">
                  {userProfile?.nome || "Utilizador"}
                </p>
                <p className="text-[9.5px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-wider font-semibold truncate mt-0.5">
                  {userProfile?.empresa || (userProfile?.role === 'admin' ? 'Administrador' : userProfile?.role === 'gestor' ? 'Gestor' : userProfile?.role === 'colaborador' ? 'Colaborador' : 'Cliente')}
                </p>
              </div>

              <button 
                type="button"
                onClick={() => {
                  setIsMobileProfileOpen(false);
                  router.push('/configuracoes');
                }}
                className="w-full text-left px-4 py-3 text-[12px] font-bold text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)]/5 hover:text-[var(--color-atelier-terracota)] transition-colors flex items-center gap-2.5 border-b border-[var(--color-atelier-grafite)]/5 cursor-pointer"
              >
                <Settings size={15} className="opacity-70" /> Configurações
              </button>

              {/* SELETOR DE TEMAS STUDIO VERONNA: Claro | Escuro | Veronna */}
              <div className="px-4 py-2.5 border-b border-[var(--color-atelier-grafite)]/5 flex flex-col gap-1.5 bg-gray-50/40">
                <div className="flex items-center justify-between">
                  <span className="text-[8.5px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">
                    Tema Visual
                  </span>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--color-atelier-terracota)]/70">
                    {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Veronna'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-black/[0.04] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('light');
                      window.dispatchEvent(new CustomEvent("showToast", { detail: "Tema: Claro ativado." }));
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-white shadow-xs text-[var(--color-atelier-terracota)]'
                        : 'text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-grafite)]'
                    }`}
                    title="Modo Claro"
                  >
                    <Sun size={12} className={theme === 'light' ? 'text-amber-500' : ''} /> Claro
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('dark');
                      window.dispatchEvent(new CustomEvent("showToast", { detail: "Tema: Escuro ativado." }));
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-white shadow-xs text-[var(--color-atelier-terracota)]'
                        : 'text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-grafite)]'
                    }`}
                    title="Modo Escuro"
                  >
                    <Moon size={12} className={theme === 'dark' ? 'text-blue-500' : ''} /> Escuro
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('veronna');
                      window.dispatchEvent(new CustomEvent("showToast", { detail: "Tema: Veronna Signature ativado." }));
                    }}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      theme === 'veronna'
                        ? 'bg-[var(--color-veronna-bordo)] text-white shadow-xs'
                        : 'text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-grafite)]'
                    }`}
                    title="Modo Especial Veronna"
                  >
                    <Crown size={12} className={theme === 'veronna' ? 'text-amber-200' : ''} /> Veronna
                  </button>
                </div>
              </div>



              <button 
                type="button"
                onClick={() => {
                  setIsMobileProfileOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-4 py-3 text-[12px] font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <LogOut size={15} className="text-red-500" /> Desconectar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* HEADER DESKTOP */}
      <header className="hidden md:flex absolute top-0 left-0 w-full h-14 items-start justify-end px-6 z-40 pointer-events-none">
        
        <div className="relative mt-4" ref={dropdownRef}>
          
          {/* O "Pill" Minimalista (Mais compacto: py-1.5, botões menores) */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-3 bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-1.5 px-3 rounded-full pointer-events-auto hover:bg-white/80 transition-colors"
          >
            {/* MENU DE TELAS (APPS) — EXCLUSIVO PARA EQUIPE INTERNA (OCULTO PARA CLIENTES) */}
            {isTeamMember && (
              <>
                <div className="relative">
              <button 
                onClick={() => { setIsNavMenuOpen(!isNavMenuOpen); setIsDropdownOpen(false); setIsProfileDropdownOpen(false); setIsJamOpen(false); }}
                className="relative w-8 h-8 rounded-full bg-white border border-[var(--color-atelier-grafite)]/5 flex items-center justify-center text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] hover:shadow-sm transition-all"
                title="Menu de Telas"
              >
                <LayoutDashboard size={14} />
              </button>
              
              <AnimatePresence>
                {isNavMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.98 }} 
                    animate={{ opacity: 1, y: 8, scale: 1 }} 
                    exit={{ opacity: 0, y: -5, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute right-0 top-full mt-2 w-[320px] bg-white/95 backdrop-blur-2xl border border-white/60 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.12)] p-4 flex flex-col z-50 pointer-events-auto"
                  >
                    {/* CABEÇALHO DO MENU COM SELETOR DE VISUALIZAÇÃO */}
                    <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--color-atelier-grafite)]/5 px-1">
                      <div>
                        <span className="font-elegant text-base text-[var(--color-atelier-grafite)] font-bold">Aplicativos</span>
                        <span className="block text-[8.5px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 font-bold">Studio Suite</span>
                      </div>
                      <div className="flex items-center gap-1 bg-black/[0.04] p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => changeAppsViewMode('grid')}
                          className={`p-1.5 rounded-lg transition-all ${appsViewMode === 'grid' ? 'bg-white shadow-xs text-[var(--color-atelier-terracota)]' : 'text-gray-400 hover:text-gray-700'}`}
                          title="Visualização em Grade"
                        >
                          <LayoutGrid size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => changeAppsViewMode('list')}
                          className={`p-1.5 rounded-lg transition-all ${appsViewMode === 'list' ? 'bg-white shadow-xs text-[var(--color-atelier-terracota)]' : 'text-gray-400 hover:text-gray-700'}`}
                          title="Visualização em Lista"
                        >
                          <List size={13} />
                        </button>
                      </div>
                    </div>

                    {/* CONTEÚDO DOS APPS: GRADE OU LISTA */}
                    {appsViewMode === 'grid' ? (
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {isManagerOrAdmin && (
                          <button
                            type="button"
                            onClick={() => { setIsNavMenuOpen(false); router.push('/tessera'); }}
                            title="Tessera — Sistema Operacional do Studio Veronna"
                            className="flex flex-col items-center justify-center p-2.5 rounded-2xl hover:bg-[var(--color-veronna-bordo)]/[0.06] transition-all group cursor-pointer active:scale-95"
                          >
                            <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#2B0912] via-[#4A1220] to-[#1A050A] text-[#F2ECE1] ring-1 ring-[#C5A059]/40 group-hover:ring-[#C5A059] group-hover:shadow-[0_8px_20px_rgba(74,18,32,0.35)] transition-all shadow-xs overflow-hidden">
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(197,160,89,0.28),transparent_65%)] pointer-events-none" />
                              <VeronnaSymbol size={22} fillColor="#E5C98B" className="relative z-10 group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
                            </div>
                            <span className="text-[10px] font-bold tracking-wide text-[var(--color-atelier-grafite)] text-center leading-tight mt-1.5 w-full truncate">
                              Tessera
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => { setIsNavMenuOpen(false); router.push('/admin/analytics'); }}
                          className="flex flex-col items-center justify-center p-2.5 rounded-2xl hover:bg-black/[0.03] transition-all group cursor-pointer active:scale-95"
                        >
                          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] group-hover:bg-[var(--color-atelier-terracota)] group-hover:text-white transition-all shadow-xs">
                            <BrainCircuit size={18} />
                          </div>
                          <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)] text-center leading-tight mt-1.5 w-full truncate">
                            Analytics
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setIsNavMenuOpen(false); router.push('/admin/agenda'); }}
                          className="flex flex-col items-center justify-center p-2.5 rounded-2xl hover:bg-black/[0.03] transition-all group cursor-pointer active:scale-95"
                        >
                          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-orange-100 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-xs">
                            <Calendar size={18} />
                          </div>
                          <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)] text-center leading-tight mt-1.5 w-full truncate">
                            Agenda
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setIsNavMenuOpen(false); router.push('/admin/clientes'); }}
                          className="flex flex-col items-center justify-center p-2.5 rounded-2xl hover:bg-black/[0.03] transition-all group cursor-pointer active:scale-95"
                        >
                          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                            <Users size={18} />
                          </div>
                          <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)] text-center leading-tight mt-1.5 w-full truncate">
                            Clientes
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setIsNavMenuOpen(false); router.push('/admin/gerenciamento'); }}
                          className="flex flex-col items-center justify-center p-2.5 rounded-2xl hover:bg-black/[0.03] transition-all group cursor-pointer active:scale-95"
                        >
                          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-xs">
                            <Compass size={18} />
                          </div>
                          <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)] text-center leading-tight mt-1.5 w-full truncate">
                            Presença 2.0
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setIsNavMenuOpen(false); router.push('/admin/motion-studio'); }}
                          title="Veronna Motion Studio"
                          className="flex flex-col items-center justify-center p-2.5 rounded-2xl hover:bg-black/[0.03] transition-all group cursor-pointer active:scale-95"
                        >
                          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] group-hover:bg-[var(--color-atelier-terracota)] group-hover:text-white transition-all shadow-xs">
                            <Film size={18} />
                          </div>
                          <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)] text-center leading-tight mt-1.5 w-full truncate">
                            Veronna Motion Studio
                          </span>
                        </button>

                        {(effectiveRole === 'admin' || effectiveRole === 'gestor') && (
                          <button
                            type="button"
                            onClick={() => { setIsNavMenuOpen(false); router.push('/admin'); }}
                            className="flex flex-col items-center justify-center p-2.5 rounded-2xl hover:bg-black/[0.03] transition-all group cursor-pointer active:scale-95"
                          >
                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
                              <Crown size={18} />
                            </div>
                            <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)] text-center leading-tight mt-1.5 w-full truncate">
                              QG da Liziane
                            </span>
                          </button>
                        )}

                        {(effectiveRole === 'admin' || effectiveRole === 'gestor' || effectiveRole === 'contador') && (
                          <button
                            type="button"
                            onClick={() => { setIsNavMenuOpen(false); router.push('/admin/financeiro'); }}
                            title="Bills & Payments (B&P) — Gestão Financeira & Contábil"
                            className="flex flex-col items-center justify-center p-2.5 rounded-2xl hover:bg-black/[0.03] transition-all group cursor-pointer active:scale-95"
                          >
                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                              <DollarSign size={18} />
                            </div>
                            <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)] text-center leading-tight mt-1.5 w-full truncate">
                              Bills & Payments
                            </span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 pt-1">
                        {isManagerOrAdmin && (
                          <button
                            type="button"
                            onClick={() => { setIsNavMenuOpen(false); router.push('/tessera'); }}
                            className="flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--color-atelier-grafite)] hover:bg-[#4A1220]/[0.06] hover:text-[#4A1220] rounded-xl transition-colors text-left group"
                          >
                            <div className="relative w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#2B0912] via-[#4A1220] to-[#1A050A] text-[#E5C98B] ring-1 ring-[#C5A059]/40 shrink-0 overflow-hidden shadow-xs">
                              <VeronnaSymbol size={16} fillColor="#E5C98B" className="relative z-10" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="truncate">Tessera</span>
                              <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 font-normal truncate">Arquitetura & Comando do Studio</span>
                            </div>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => { setIsNavMenuOpen(false); router.push('/admin/analytics'); }}
                          className="flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)]/5 hover:text-[var(--color-atelier-terracota)] rounded-xl transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] shrink-0">
                            <BrainCircuit size={14} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">Analytics</span>
                            <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 font-normal truncate">Métricas & Estratégia</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setIsNavMenuOpen(false); router.push('/admin/agenda'); }}
                          className="flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)]/5 hover:text-[var(--color-atelier-terracota)] rounded-xl transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600 shrink-0">
                            <Calendar size={14} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">Agenda</span>
                            <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 font-normal truncate">Reuniões & Compromissos</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setIsNavMenuOpen(false); router.push('/admin/clientes'); }}
                          className="flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)]/5 hover:text-[var(--color-atelier-terracota)] rounded-xl transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 shrink-0">
                            <Users size={14} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">Clientes</span>
                            <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 font-normal truncate">Gestão & Carteira</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setIsNavMenuOpen(false); router.push('/admin/gerenciamento'); }}
                          className="flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)]/5 hover:text-[var(--color-atelier-terracota)] rounded-xl transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-100 text-amber-700 shrink-0">
                            <Compass size={14} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">Presença 2.0</span>
                            <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 font-normal truncate">Gestão de Ciclos & Conteúdo</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setIsNavMenuOpen(false); router.push('/admin/motion-studio'); }}
                          className="flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)]/5 hover:text-[var(--color-atelier-terracota)] rounded-xl transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] shrink-0">
                            <Film size={14} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">Veronna Motion Studio</span>
                            <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 font-normal truncate">Composição SVG & Motion 5s</span>
                          </div>
                        </button>

                        {(effectiveRole === 'admin' || effectiveRole === 'gestor') && (
                          <button
                            type="button"
                            onClick={() => { setIsNavMenuOpen(false); router.push('/admin'); }}
                            className="flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)]/5 hover:text-[var(--color-atelier-terracota)] rounded-xl transition-colors text-left"
                          >
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600 shrink-0">
                              <Crown size={14} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="truncate">QG da Liziane</span>
                              <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 font-normal truncate">Painel de Comando</span>
                            </div>
                          </button>
                        )}

                        {(effectiveRole === 'admin' || effectiveRole === 'gestor' || effectiveRole === 'contador') && (
                          <button
                            type="button"
                            onClick={() => { setIsNavMenuOpen(false); router.push('/admin/financeiro'); }}
                            className="flex items-center gap-3 px-3 py-2 text-[11px] font-bold text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)]/5 hover:text-[var(--color-atelier-terracota)] rounded-xl transition-colors text-left"
                          >
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-700 shrink-0">
                              <DollarSign size={14} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="truncate">Bills & Payments (B&P)</span>
                              <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 font-normal truncate">Controle, Caixa & DRE</span>
                            </div>
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
                </div>
                
                <div className="w-px h-4 bg-[var(--color-atelier-grafite)]/10"></div>
              </>
            )}
            
            {/* SINO DE NOTIFICAÇÕES */}
            <button 
              onClick={() => { setIsDropdownOpen(!isDropdownOpen); setIsJamOpen(false); }}
              className="relative w-8 h-8 rounded-full bg-white border border-[var(--color-atelier-grafite)]/5 flex items-center justify-center text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] hover:shadow-sm transition-all"
            >
              <Bell size={16} className={unreadCount > 0 ? "animate-[wiggle_1.5s_ease-in-out_infinite]" : ""} />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold flex items-center justify-center rounded-full shadow-sm border-2 border-white"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <div className="w-px h-4 bg-[var(--color-atelier-grafite)]/10"></div>

            {/* FOTO DE PERFIL COM DROPDOWN */}
            <div className="relative">
              <div 
                onClick={() => {
                  setIsProfileDropdownOpen(!isProfileDropdownOpen);
                  setIsDropdownOpen(false);
                  setIsJamOpen(false);
                  setIsNavMenuOpen(false);
                }}
                className="cursor-pointer hover:scale-105 transition-transform"
                title="Meu Perfil"
              >
                <UserAvatar profile={userProfile} size="sm" className="!w-8 !h-8 border border-white shadow-sm" />
              </div>

              {/* DROPDOWN DO PERFIL */}
              <AnimatePresence>
                {isProfileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.98 }} 
                    animate={{ opacity: 1, y: 8, scale: 1 }} 
                    exit={{ opacity: 0, y: -5, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute right-0 top-full w-[235px] bg-white/95 backdrop-blur-2xl border border-white/60 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col z-50 pointer-events-auto"
                  >
                    <div className="px-4 py-3 border-b border-[var(--color-atelier-grafite)]/5 bg-gray-50/60">
                      <p className="text-[11.5px] font-bold text-[var(--color-atelier-grafite)] truncate">
                        {userProfile?.nome || "Utilizador"}
                      </p>
                      <p className="text-[9px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-wider font-semibold truncate mt-0.5">
                        {userProfile?.empresa || (effectiveRole === 'admin' ? 'Administrador' : effectiveRole === 'gestor' ? 'Gestor' : effectiveRole === 'colaborador' ? 'Colaborador' : 'Cliente')}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        router.push('/configuracoes');
                      }}
                      className="w-full text-left px-4 py-3 text-[11px] font-bold text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)]/5 hover:text-[var(--color-atelier-terracota)] transition-colors flex items-center gap-2 border-b border-[var(--color-atelier-grafite)]/5 cursor-pointer"
                    >
                      <Settings size={14} /> Configurações
                    </button>

                    {/* SELETOR DE TEMAS STUDIO VERONNA: Claro | Escuro | Veronna */}
                    <div className="px-4 py-2.5 border-b border-[var(--color-atelier-grafite)]/5 flex flex-col gap-1.5 bg-gray-50/40">
                      <div className="flex items-center justify-between">
                        <span className="text-[8.5px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">
                          Tema Visual
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--color-atelier-terracota)]/70">
                          {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Veronna'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 bg-black/[0.04] p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setTheme('light');
                            window.dispatchEvent(new CustomEvent("showToast", { detail: "Tema: Claro ativado." }));
                          }}
                          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            theme === 'light'
                              ? 'bg-white shadow-xs text-[var(--color-atelier-terracota)]'
                              : 'text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-grafite)]'
                          }`}
                          title="Modo Claro"
                        >
                          <Sun size={12} className={theme === 'light' ? 'text-amber-500' : ''} /> Claro
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTheme('dark');
                            window.dispatchEvent(new CustomEvent("showToast", { detail: "Tema: Escuro ativado." }));
                          }}
                          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-white shadow-xs text-[var(--color-atelier-terracota)]'
                              : 'text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-grafite)]'
                          }`}
                          title="Modo Escuro"
                        >
                          <Moon size={12} className={theme === 'dark' ? 'text-blue-500' : ''} /> Escuro
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTheme('veronna');
                            window.dispatchEvent(new CustomEvent("showToast", { detail: "Tema: Veronna Signature ativado." }));
                          }}
                          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            theme === 'veronna'
                              ? 'bg-[var(--color-veronna-bordo)] text-white shadow-xs'
                              : 'text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-grafite)]'
                          }`}
                          title="Modo Especial Veronna"
                        >
                          <Crown size={12} className={theme === 'veronna' ? 'text-amber-200' : ''} /> Veronna
                        </button>
                      </div>
                    </div>



                    <button 
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        setIsJamOpen(true);
                      }}
                      className="w-full text-left px-4 py-3 text-[11px] font-bold text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)]/5 hover:text-[var(--color-atelier-terracota)] transition-colors flex items-center gap-2 border-b border-[var(--color-atelier-grafite)]/5 cursor-pointer"
                    >
                      <Music size={14} /> Trilha & Humor
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-3 text-[11px] font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut size={14} className="text-red-500" /> Desconectar
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* DROPDOWN DE NOTIFICAÇÕES - Animação Refinada (Spring) */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10, scale: 0.98 }} 
                animate={{ opacity: 1, y: 8, scale: 1 }} 
                exit={{ opacity: 0, y: -5, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute right-0 top-full w-[calc(100vw-2rem)] max-w-[320px] md:w-[320px] bg-white/90 backdrop-blur-2xl border border-white/40 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col z-50 pointer-events-auto"
              >
                <div className="px-5 py-4 border-b border-[var(--color-atelier-grafite)]/5 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-elegant text-lg text-[var(--color-atelier-grafite)] leading-none">Notificações</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)] hover:text-orange-700 transition-colors">
                      Limpar
                    </button>
                  )}
                </div>
                
                <div className="max-h-[350px] overflow-y-auto custom-scrollbar flex flex-col">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center opacity-40">
                      <Bell size={24} className="mb-2 text-[var(--color-atelier-grafite)]" />
                      <p className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Teto Limpo</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <motion.div 
                        key={notif.id}
                        whileHover={{ backgroundColor: "rgba(249, 250, 251, 1)" }}
                        onClick={() => handleNotificationClick(notif)}
                        className={`px-5 py-4 border-b border-[var(--color-atelier-grafite)]/5 cursor-pointer flex gap-3 ${!notif.is_read ? 'bg-[var(--color-atelier-terracota)]/5' : ''}`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {!notif.is_read ? <Circle size={8} className="text-[var(--color-atelier-terracota)] fill-[var(--color-atelier-terracota)] mt-1" /> : getIconForType(notif.type)}
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className={`font-roboto text-[12px] leading-snug ${!notif.is_read ? 'font-bold text-[var(--color-atelier-grafite)]' : 'font-medium text-[var(--color-atelier-grafite)]/70'}`}>
                            {notif.title}
                          </span>
                          <span className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/60 leading-snug mt-1">
                            {notif.message}
                          </span>
                          <span className="font-roboto text-[8px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mt-2">
                            {new Date(notif.created_at).toLocaleDateString('pt-PT', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DROPDOWN DAILY JAM */}
          <AnimatePresence>
            {isJamOpen && (
              <DailyJamDropdown 
                userProfile={userProfile}
                onClose={() => setIsJamOpen(false)}
              />
            )}
          </AnimatePresence>

        </div>
      </header>
    </>
  );
}