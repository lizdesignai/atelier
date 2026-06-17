// src/app/admin/inbox/hooks/useInboxEngine.ts
import { useState, useEffect, useCallback, useRef } from 'react';

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
  const [activeSpace, setActiveSpace] = useState<ActiveSpace>('projects');
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // STARTUP DO MOTOR (BOOT SEQUENCE)
  // ============================================================================
  useEffect(() => {
    bootEngine();
  }, []);

  const bootEngine = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
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
        .select('id, nome, avatar_url, role, current_status')
        .in('role', ['admin', 'gestor', 'colaborador'])
        .neq('id', session.user.id) 
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
  }, [activeSpace, activeProjectId, activeDMUserId]);

  const fetchProjectChannels = async (projectId: string) => {
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
  };

  const setupGlobalCorporateChannel = async () => {
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
  };

  const setupDMChannel = async (targetUserId: string) => {
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
  };

  // ============================================================================
  // MOTOR DE MENSAGENS & WEB-SOCKETS
  // ============================================================================
  const fetchMessages = useCallback(async () => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }

    const { data } = await supabase
      .from('messages')
      .select('*, profiles(nome, avatar_url, role)')
      .eq('channel_id', activeChannelId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      scrollToBottom();
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
  const sendMessage = async (text: string, attachmentUrl: string | null = null) => {
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
      profiles: currentUser
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    const { error } = await supabase.from('messages').insert({
      channel_id: activeChannelId,
      sender_id: currentUser.id,
      text_content: text.trim() ? text : null,
      attachment_url: attachmentUrl
    });

    setIsSending(false);

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
    messagesEndRef,
    setActiveSpace,
    setActiveProjectId,
    setActiveChannelId,
    setActiveDMUserId,
    setIsDrawerOpen,
    sendMessage,
  };
}