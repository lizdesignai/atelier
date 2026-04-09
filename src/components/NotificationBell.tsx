// src/components/NotificationBell.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, X, Info, CheckCircle2, AlertCircle, PlayCircle, Star } from "lucide-react";
import { supabase } from "../lib/supabase";
import { NotificationEngine } from "../lib/NotificationEngine";

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const initNotifications = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      const uid = session.user.id;
      setUserId(uid);

      // 1. Busca Inicial
      const fetchInitial = async () => {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(30);

        if (data) {
          setNotifications(data);
          setUnreadCount(data.filter(n => !n.is_read).length);
        }
      };

      await fetchInitial();

      // 2. Subscrição em Tempo Real (Websockets)
      const sub = supabase.channel(`notifications-${uid}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
          (payload) => {
            const newNotif = payload.new;
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Opcional: Pode disparar um som aqui
            // new Audio('/notification.mp3').play().catch(() => {});
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
          (payload) => {
            const updatedNotif = payload.new;
            setNotifications(prev => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n));
            // Recalcula as não lidas
            setUnreadCount(prev => {
              const wasRead = payload.old.is_read;
              const isReadNow = updatedNotif.is_read;
              if (!wasRead && isReadNow) return Math.max(0, prev - 1);
              return prev;
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(sub);
      };
    };

    initNotifications();
  }, []);

  const handleNotificationClick = async (notif: any) => {
    // 1. Marca como lida
    if (!notif.is_read) {
      await NotificationEngine.markAsRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // 2. Navega para a ação (se existir) e fecha o painel
    if (notif.action_url) {
      setIsOpen(false);
      router.push(notif.action_url);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId || unreadCount === 0) return;
    
    // Atualização Otimista
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    
    await NotificationEngine.markAllAsRead(userId);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMins < 1) return "Agora mesmo";
    if (diffMins < 60) return `Há ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return `Ontem`;
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'warning': return <AlertCircle size={16} className="text-orange-500" />;
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      case 'action': return <PlayCircle size={16} className="text-[var(--color-atelier-terracota)]" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      
      {/* O SINO (Gatilho) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 md:w-11 md:h-11 rounded-[1rem] bg-white/40 backdrop-blur-md border border-white hover:bg-white transition-all shadow-sm flex items-center justify-center text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-terracota)] hover:shadow-md"
      >
        <Bell size={18} className={unreadCount > 0 ? "animate-[wiggle_1s_ease-in-out_infinite]" : ""} />
        
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1.5 bg-red-500 border-2 border-white rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-sm"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* O PAINEL DE NOTIFICAÇÕES (Dropdown) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 10, scale: 0.95 }} 
            transition={{ duration: 0.2 }}
            className="absolute top-[120%] right-0 w-[340px] md:w-[400px] glass-panel bg-white/90 backdrop-blur-2xl border border-white shadow-[0_30px_60px_rgba(0,0,0,0.15)] rounded-[2.5rem] flex flex-col z-[200] overflow-hidden"
          >
            
            <div className="px-6 py-5 border-b border-[var(--color-atelier-grafite)]/5 flex justify-between items-center bg-white/50 shrink-0">
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Notificações</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead}
                  className="text-[9px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] transition-colors flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-[var(--color-atelier-grafite)]/5"
                >
                  <CheckCheck size={12} /> Marcar Lidas
                </button>
              )}
            </div>

            <div className="flex flex-col max-h-[400px] overflow-y-auto custom-scrollbar bg-gray-50/30">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center opacity-60">
                  <Bell size={32} className="text-[var(--color-atelier-grafite)]/20 mb-3" />
                  <p className="font-roboto text-[13px] font-medium text-[var(--color-atelier-grafite)]">Sem notificações de momento.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`
                      w-full text-left p-5 flex items-start gap-4 transition-all border-b border-[var(--color-atelier-grafite)]/5 relative
                      ${!notif.is_read ? 'bg-white hover:bg-gray-50/80' : 'bg-transparent hover:bg-white/50 opacity-70'}
                    `}
                  >
                    {!notif.is_read && <div className="absolute left-0 top-0 h-full w-1 bg-[var(--color-atelier-terracota)]"></div>}
                    
                    <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-grafite)]/5 border border-white flex items-center justify-center shrink-0 shadow-inner mt-0.5">
                      {getIconForType(notif.type)}
                    </div>
                    
                    <div className="flex flex-col flex-1 pr-2">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`font-roboto text-[13px] leading-tight ${!notif.is_read ? 'font-bold text-[var(--color-atelier-grafite)]' : 'font-medium text-[var(--color-atelier-grafite)]/80'}`}>
                          {notif.title}
                        </span>
                        <span className="font-roboto text-[9px] font-bold text-[var(--color-atelier-grafite)]/40 shrink-0 ml-2 mt-0.5">
                          {formatTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-3 bg-white/50 border-t border-white text-center shrink-0">
              <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/30">
                Atelier Intelligence
              </span>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}