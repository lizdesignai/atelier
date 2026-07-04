// src/components/layout/AppHeader.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { 
  Bell, CheckCircle2, 
  Circle, Info, AlertTriangle, ShieldCheck 
} from "lucide-react";

interface AppHeaderProps {
  handleLogout: () => void;
}

export default function AppHeader({ handleLogout }: AppHeaderProps) {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Estados do Sistema de Notificações
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fecha o dropdown se clicar fora
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const initHeader = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url, role')
        .eq('id', session.user.id)
        .single();
        
      if (profile) {
        setUserProfile(profile);
        fetchNotifications(profile.id);
        setupRealtimeSubscription(profile.id);
      }
    };

    initHeader();

    // Cleanup da subscrição ao desmontar
    return () => {
      supabase.channel('custom-notification-channel').unsubscribe();
    };
  }, []);

  const fetchNotifications = async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
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

    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  };

  const markAllAsRead = async () => {
    if (!userProfile) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userProfile.id).eq('is_read', false);
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
    // Reduzida a altura do header invisível de h-24 para h-14, com menos padding
    <header className="absolute top-0 left-0 w-full h-14 flex items-start justify-end px-6 z-40 pointer-events-none">
      
      <div className="relative mt-4" ref={dropdownRef}>
        
        {/* O "Pill" Minimalista (Mais compacto: py-1.5, botões menores) */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex items-center gap-3 bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-1.5 px-3 rounded-full pointer-events-auto hover:bg-white/80 transition-colors"
        >
          
          {/* SINO DE NOTIFICAÇÕES */}
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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

          {/* FOTO DE PERFIL */}
          <div 
            onClick={() => router.push('/configuracoes')}
            className="w-8 h-8 rounded-full overflow-hidden shadow-sm border border-white flex items-center justify-center bg-[var(--color-atelier-grafite)] text-white cursor-pointer hover:scale-105 transition-transform"
            title="Configurações"
          >
            {userProfile?.avatar_url ? (
              <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="font-elegant text-sm">{userProfile?.nome?.charAt(0) || "U"}</span>
            )}
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
              className="absolute right-0 top-full w-[320px] bg-white/90 backdrop-blur-2xl border border-white/40 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col z-50 pointer-events-auto"
            >
              <div className="px-5 py-4 border-b border-[var(--color-atelier-grafite)]/5 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-elegant text-lg text-[var(--color-atelier-grafite)] leading-none">Radar</h3>
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

      </div>
    </header>
  );
}