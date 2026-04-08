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
  handleLogout: () => void; // Mantido na interface para não quebrar o layout.tsx
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
          
          // Opcional: Disparar um som suave ou toast extra aqui
          window.dispatchEvent(new CustomEvent("showToast", { detail: "Nova notificação recebida!" }));
        }
      )
      .subscribe();
  };

  const markAsRead = async (notificationId: string) => {
    // Atualização otimista
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
      case 'success': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-orange-500" />;
      case 'action': return <ShieldCheck size={16} className="text-[var(--color-atelier-terracota)]" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  return (
    <header className="absolute top-0 left-0 w-full h-24 flex items-start justify-end px-8 z-30 pointer-events-none">
      
      {/* Contêiner minimalista flutuante - Apenas pointer-events-auto nesta área */}
      <div className="flex items-center gap-4 bg-white/40 backdrop-blur-xl border border-white shadow-sm p-2 px-4 rounded-3xl pointer-events-auto mt-6" ref={dropdownRef}>
        
        {/* SINO DE NOTIFICAÇÕES */}
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-10 h-10 rounded-full bg-white border border-[var(--color-atelier-grafite)]/5 flex items-center justify-center text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] transition-all shadow-sm"
          >
            <Bell size={18} className={unreadCount > 0 ? "animate-[wiggle_1s_ease-in-out_infinite]" : ""} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-md border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* DROPDOWN DE NOTIFICAÇÕES */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-14 w-[360px] bg-white border border-[var(--color-atelier-grafite)]/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col z-50"
              >
                <div className="p-5 border-b border-[var(--color-atelier-grafite)]/5 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">Notificações</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-terracota)] hover:underline">
                      Marcar tudo como lido
                    </button>
                  )}
                </div>
                
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar flex flex-col">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center opacity-50">
                      <Bell size={32} className="mb-2 text-[var(--color-atelier-grafite)]" />
                      <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]">Tudo tranquilo por aqui.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-4 border-b border-[var(--color-atelier-grafite)]/5 cursor-pointer transition-colors hover:bg-gray-50 flex gap-3 ${!notif.is_read ? 'bg-[var(--color-atelier-terracota)]/5' : ''}`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {!notif.is_read ? <Circle size={10} className="text-[var(--color-atelier-terracota)] fill-[var(--color-atelier-terracota)] mt-1" /> : getIconForType(notif.type)}
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className={`font-roboto text-[13px] ${!notif.is_read ? 'font-bold text-[var(--color-atelier-grafite)]' : 'font-medium text-[var(--color-atelier-grafite)]/80'}`}>
                            {notif.title}
                          </span>
                          <span className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60 leading-snug mt-0.5">
                            {notif.message}
                          </span>
                          <span className="font-roboto text-[9px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 mt-2">
                            {new Date(notif.created_at).toLocaleDateString('pt-PT', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Rodapé do Dropdown */}
                <div className="p-3 bg-gray-50 border-t border-[var(--color-atelier-grafite)]/5 text-center">
                  <span className="font-roboto text-[9px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/30 font-bold">Atelier Realtime OS</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-px h-6 bg-[var(--color-atelier-grafite)]/10"></div>

        {/* FOTO DE PERFIL */}
        <div 
          onClick={() => router.push('/configuracoes')}
          className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-white flex items-center justify-center bg-[var(--color-atelier-grafite)] text-white cursor-pointer hover:scale-105 transition-transform"
          title="Configurações"
        >
          {userProfile?.avatar_url ? (
            <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="font-elegant text-xl">{userProfile?.nome?.charAt(0) || "U"}</span>
          )}
        </div>

      </div>
    </header>
  );
}