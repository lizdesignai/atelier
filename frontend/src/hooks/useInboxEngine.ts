// src/app/admin/inbox/hooks/useInboxEngine.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from './useSession';

// 🛠️ CORREÇÃO DE ROTAS: A depender de onde você salvou o ficheiro, 
// o caminho é 4 níveis (../../../../) ou 3 níveis (../../../).
import { supabase } from '../lib/supabase';
import { NotificationEngine } from '../lib/NotificationEngine';

// Tipagens de Alta Precisão
export type ActiveSpace = 'projects' | 'corporate';
export type ChannelType = 'general' | 'approval' | 'announcement' | 'dm' | 'corporate_global';

export function useInboxEngine() {
  // 1. Estados de Sessão e Controle de Acesso
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('colaborador');

  // 2. Estados de Navegação e Hierarquia
  const [activeSpace, setActiveSpace] = useState<ActiveSpace>('corporate'); // Equipe por padrão
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDMUserId, setActiveDMUserId] = useState<string | null>(null);

  // 3. Estados de Dados (Memória Ram do Chat)
  const [clients, setClients] = useState<any[]>([]);
  const [corporateUsers, setCorporateUsers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  // 4. Estados de UI do Motor
  const [isDrawerOpen, setIsDrawerOpen] = useState(true); 
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // STARTUP DO MOTOR (BOOT SEQUENCE)
  // ============================================================================
  const { data: session } = useSession();

  // ============================================================================
  // STARTUP DO MOTOR (BOOT SEQUENCE)
  // ============================================================================
  useEffect(() => {
    if (!session) return;
    bootEngine(session);

    // Ping de Atividade (last_seen)
    const pingActivity = async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://atelier-zwlt.onrender.com';
      fetch(`${backendUrl}/api/v1/chat/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id })
      }).catch(() => {});
    };
    
    pingActivity();
    const interval = setInterval(pingActivity, 60000); // Ping a cada 1 min
    return () => clearInterval(interval);
  }, [session]);

  const bootEngine = async (currentSession: any) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).single();
      setCurrentUser(profile);
      setUserRole(profile?.role || 'colaborador');

      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, type, client_id, profiles(nome, avatar_url)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (projectsData) {
        setClients(projectsData);
        if (projectsData.length > 0) setActiveProjectId(projectsData[0].id);
      }

      const { data: corpUsers } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url, role, current_status, last_seen')
        .in('role', ['admin', 'gestor', 'colaborador'])
        .neq('id', currentSession.user.id) 
        .order('role', { ascending: true }); 

      if (corpUsers) {
        // 🔒 RBAC: Filtro Psicológico/Hierárquico
        if (profile?.role === 'colaborador') {
          setCorporateUsers(corpUsers.filter(u => u.role === 'admin' || u.role === 'gestor'));
        } else {
          setCorporateUsers(corpUsers); 
        }
      }
    } catch (error) {
      console.error("[InboxEngine] Falha no arranque do motor:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectChannels = useCallback(async (projectId: string) => {
    const { data } = await supabase
      .from('channels')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (data) {
      setChannels(data);
      const activeChs = data.filter(c => !c.is_archived);
      if (activeChs.length > 0) setActiveChannelId(activeChs[0].id);
      else setActiveChannelId(null);
    }
  }, []);

  const setupGlobalCorporateChannel = useCallback(async () => {
    const globalName = 'QG Central';
    let { data } = await supabase.from('channels').select('*').eq('type', 'corporate_global').single();
    
    if (!data) {
      const { data: newCh } = await supabase.from('channels').insert({
        name: globalName,
        type: 'corporate_global',
        is_private: true
      }).select().single();
      data = newCh;
    }
    
    setChannels([data]);
    setActiveChannelId(data?.id || null);
  }, []);

  const setupDMChannel = useCallback(async (targetUserId: string) => {
    if (!currentUser) return;
    
    const participants = [currentUser.id, targetUserId].sort();
    const dmHash = `dm_${participants[0]}_${participants[1]}`;

    let { data } = await supabase.from('channels').select('*').eq('name', dmHash).single();

    if (!data) {
      const { data: newCh } = await supabase.from('channels').insert({
        name: dmHash,
        type: 'dm',
        is_private: true
      }).select().single();
      data = newCh;
    }

    setChannels([data]);
    setActiveChannelId(data?.id || null);
  }, [currentUser]);

  // ============================================================================
  // REATIVIDADE DE CANAIS (Alternância de Contexto)
  // ============================================================================
  useEffect(() => {
    if (activeSpace === 'projects' && activeProjectId) {
      fetchProjectChannels(activeProjectId);
    } else if (activeSpace === 'corporate') {
      if (activeDMUserId) {
        setupDMChannel(activeDMUserId);
      } else {
        setupGlobalCorporateChannel();
      }
    }
  }, [activeSpace, activeProjectId, activeDMUserId, fetchProjectChannels, setupDMChannel, setupGlobalCorporateChannel]);

  // ============================================================================
  // MOTOR DE MENSAGENS & WEB-SOCKETS
  // ============================================================================
  const fetchMessages = useCallback(async () => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }

    try {
      let { data, error } = await supabase
        .from('messages')
        .select('*, profiles(id, nome, avatar_url, role), parent:messages!parent_id(id, text_content, sender_id)')
        .eq('channel_id', activeChannelId)
        .order('created_at', { ascending: true });

      if (error) {
        const fallbackRes = await supabase
          .from('messages')
          .select('*')
          .eq('channel_id', activeChannelId)
          .order('created_at', { ascending: true });

        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (!error && data) {
        const formattedMessages = data.map(m => ({
          ...m,
          profiles: Array.isArray(m.profiles) ? m.profiles[0] : (m.profiles || null)
        }));
        setMessages(formattedMessages);
        scrollToBottom();
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error("Erro no chat history:", e);
      setMessages([]);
    }
  }, [activeChannelId]);

  useEffect(() => {
    fetchMessages();

    if (!activeChannelId) return;

    const channelSubscription = supabase.channel(`public:messages:channel_id=eq.${activeChannelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeChannelId}` }, 
        (payload) => {
          if (payload.new.sender_id !== currentUser?.id) {
            fetchMessages(); 
          }
        }
      ).subscribe();

    return () => {
      supabase.removeChannel(channelSubscription);
    };
  }, [activeChannelId, fetchMessages, currentUser]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        const scrollContainer = messagesEndRef.current.closest('.overflow-y-auto');
        if (scrollContainer) {
          scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: "smooth" });
        }
      }
    }, 150);
  };

  // ============================================================================
  // AÇÕES DE TRANSMISSÃO
  // ============================================================================
  const sendMessage = async (text: string, attachmentUrl: string | null = null, parentId: string | null = null) => {
    if ((!text.trim() && !attachmentUrl) || !activeChannelId || !currentUser) return false;

    setIsSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      channel_id: activeChannelId,
      sender_id: currentUser.id,
      text_content: text.trim() ? text : null,
      attachment_url: attachmentUrl,
      created_at: new Date().toISOString(),
      profiles: currentUser,
      parent_id: parentId,
      parent: replyingTo
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    const { error } = await supabase.from('messages').insert({
      channel_id: activeChannelId,
      sender_id: currentUser.id,
      text_content: text.trim() ? text : null,
      attachment_url: attachmentUrl,
      parent_id: parentId
    });

    setIsSending(false);
    setReplyingTo(null);

    if (error) {
      console.error("[InboxEngine] Falha ao enviar pacote:", error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      return false;
    }

    // 🔔 INTEGRAÇÃO RESOLVIDA: Notifica o cliente se for um canal de projeto e não for privado
    if (activeSpace === 'projects' && activeProjectId) {
      const activeClient = clients.find(c => c.id === activeProjectId);
      const activeChannel = channels.find(c => c.id === activeChannelId);

      if (activeClient?.client_id && activeChannel && !activeChannel.is_private) {
        NotificationEngine.notifyUser(
          activeClient.client_id,
          `Nova mensagem no canal #${activeChannel.name}`,
          "A equipe do Atelier enviou uma nova mensagem. Acesse o portal para visualizar.",
          "info",
          "/meu-espaco/canais"
        );
      }
    }

    fetchMessages(); 
    return true;
  };

  return {
    isLoading,
    currentUser,
    userRole,
    clients,
    corporateUsers,
    channels,
    messages,
    activeSpace,
    activeProjectId,
    activeChannelId,
    activeDMUserId,
    isDrawerOpen,
    isSending,
    replyingTo,
    messagesEndRef,
    setActiveSpace,
    setActiveProjectId,
    setActiveChannelId,
    setActiveDMUserId,
    setIsDrawerOpen,
    setReplyingTo,
    sendMessage,
  };
}