// src/app/admin/inbox/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Send, Paperclip, Image as ImageIcon, 
  Hash, Plus, Settings2, ShieldCheck, 
  MessageSquare, Loader2, FileText, X, Trash2, Archive, 
  Users, Briefcase, Globe, Lock
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { NotificationEngine } from "../../../lib/NotificationEngine";
import InboxMobileView from "./views/InboxMobileView";

// ============================================================================
// TIPAGEM ESTRITA (Arquitetura Zero 'any')
// ============================================================================
type ActiveSpace = 'projects' | 'corporate';

interface ProfileData {
  id: string;
  nome: string;
  avatar_url: string | null;
  role: string;
  current_status?: string;
  last_seen?: string;
}

interface ClientData {
  id: string;
  type: string;
  client_id: string;
  profiles: ProfileData;
}

interface ChannelData {
  id: string;
  project_id?: string;
  name: string;
  type: 'general' | 'approval' | 'announcement' | 'dm' | 'corporate_global';
  is_private: boolean;
  is_archived: boolean;
  created_at: string;
}

interface MessageData {
  id: string;
  channel_id: string;
  sender_id: string;
  text_content: string | null;
  attachment_url: string | null;
  created_at: string;
  profiles?: ProfileData;
}

// ============================================================================
// COMPONENTES AUXILIARES (UI)
// ============================================================================
const LizDesignLogo = () => (
  <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm border border-gray-100">
    <img 
      src="/public/images/simbolo-rosa.png" 
      alt="Liz Design" 
      className="w-full h-full object-cover"
      onError={(e) => {
        // Fallback elegante caso a imagem /logo.png não exista no repositório
        e.currentTarget.style.display = 'none';
        e.currentTarget.parentElement!.innerHTML = '<span class="font-elegant text-[var(--color-atelier-terracota)] font-bold text-sm">L</span>';
      }} 
    />
  </div>
);

// ============================================================================
// O ORQUESTRADOR MASTER (Smart Monolith)
// ============================================================================
export default function AdminInboxPage() {
  // 1. Estados de Sessão e Hierarquia
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<ProfileData | null>(null);

  // 2. Estados de Navegação
  const [activeSpace, setActiveSpace] = useState<ActiveSpace>('projects');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDMUserId, setActiveDMUserId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'channels' | 'chat'>('channels');

  // 3. Estados de Dados (Memória)
  const [clients, setClients] = useState<ClientData[]>([]);
  const [corporateUsers, setCorporateUsers] = useState<ProfileData[]>([]);
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [messages, setMessages] = useState<MessageData[]>([]);

  // 4. Estados de UI
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // 🟢 NOVO: Estados para Notificações de Chat
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [channelTypeMap, setChannelTypeMap] = useState<Record<string, string>>({});
  const [channelPreviews, setChannelPreviews] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Estados do Modal de Criação
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [isNewChannelPrivate, setIsNewChannelPrivate] = useState(false);
  const [newChannelType, setNewChannelType] = useState<'general' | 'approval' | 'announcement'>('general');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  // ============================================================================
  // BOOT DA OPERAÇÃO (Engine Startup)
  // ============================================================================
  useEffect(() => {
    const bootEngine = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Identifica o Operador
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setCurrentUser(profile);

        // Carrega Dossiês de Clientes
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, type, client_id, profiles(id, nome, avatar_url, role)')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (projectsData) {
          // Flatten profiles
          const formattedClients = projectsData.map(p => ({
            ...p,
            profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
          })) as ClientData[];

          setClients(formattedClients);
          if (formattedClients.length > 0) setActiveProjectId(formattedClients[0].id);
        }

        if (session) {
          const uData = session.user;
          const { data: pData } = await supabase.from('profiles').select('*').eq('id', uData.id).single();
          setCurrentUser(pData as ProfileData);

          // Puxar lista de clientes
          const { data: clientsData } = await supabase.from('projects').select('*, profiles(*)').in('status', ['active', 'delivered']);
          if (clientsData) setClients(clientsData as ClientData[]);

          // Puxar Equipa (Filtrando usuários pausados)
          const { data: corpUsers } = await supabase.from('profiles').select('*').in('role', ['admin', 'gestor', 'colaborador']).order('nome');
          if (corpUsers) {
            const activeCorpUsers = corpUsers.filter((u: any) => u.status !== 'paused' && !u.is_paused);
            if (pData?.role === 'colaborador') {
              setCorporateUsers(activeCorpUsers.filter((u: any) => u.role === 'admin' || u.role === 'gestor') as ProfileData[]);
            } else {
              setCorporateUsers(activeCorpUsers as ProfileData[]);
            }
          }
          
          // 🟢 NOVO: Puxar mapeamento de canais (para agregar badges nas abas)
          const { data: allChannels } = await supabase.from('channels').select('id, type');
          if (allChannels) {
            const map: Record<string, string> = {};
            allChannels.forEach(c => map[c.id] = c.type);
            setChannelTypeMap(map);
          }

          // 🟢 NOVO: Buscar contagem inicial de não lidas
          fetchUnreadCounts();
        }
      } catch (error) {
        console.error("[Workspace] Falha no arranque:", error);
      } finally {
        setIsLoading(false);
      }
    };
    bootEngine();
  }, []);

  // 🟢 NOVO: Função para buscar não lidas e ouvir novos inserts
  const fetchUnreadCounts = async () => {
    const { data, error } = await supabase.rpc('get_unread_counts_per_channel');
    if (!error && data) {
      const countsMap: Record<string, number> = {};
      const previewsMap: Record<string, string> = {};
      data.forEach((item: any) => {
        countsMap[item.channel_id] = item.unread_count;
        if (item.last_message_text) {
          previewsMap[item.channel_id] = item.last_message_text;
        }
      });
      setUnreadCounts(countsMap);
      setChannelPreviews(previewsMap);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    const unreadSub = supabase.channel('inbox_unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.sender_id !== currentUser.id) {
           fetchUnreadCounts();
        }
      }).subscribe();
    return () => { supabase.removeChannel(unreadSub); };
  }, [currentUser]);

  // ============================================================================
  // ORQUESTRAÇÃO DE CANAIS
  // ============================================================================
  useEffect(() => {
    setIsSettingsOpen(false);

    const setupChannels = async () => {
      if (activeSpace === 'projects' && activeProjectId) {
        const { data } = await supabase.from('channels').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: true });
        if (data) {
          setChannels(data as ChannelData[]);
          const activeChs = data.filter(c => !c.is_archived);
          setActiveChannelId(activeChs.length > 0 ? activeChs[0].id : null);
        }
      } else if (activeSpace === 'corporate') {
        if (activeDMUserId && currentUser) {
          // Lógica de DM
          const participants = [currentUser.id, activeDMUserId].sort();
          const dmHash = `dm_${participants[0]}_${participants[1]}`;
          let { data } = await supabase.from('channels').select('*').eq('name', dmHash).single();
          
          if (!data) {
            const { data: newCh } = await supabase.from('channels').insert({ name: dmHash, type: 'dm', is_private: true }).select().single();
            data = newCh;
          }
          setChannels([data as ChannelData]);
          setActiveChannelId(data?.id || null);
        } else {
          // Lógica QG Central
          let { data } = await supabase.from('channels').select('*').eq('type', 'corporate_global').single();
          if (!data) {
            const { data: newCh } = await supabase.from('channels').insert({ name: 'Equipe LizDesign', type: 'corporate_global', is_private: true }).select().single();
            data = newCh;
          }
          setChannels([data as ChannelData]);
          setActiveChannelId(data?.id || null);
        }
      }
    };

    setupChannels();
  }, [activeSpace, activeProjectId, activeDMUserId, currentUser]);

  // ============================================================================
  // SINCRONIZAÇÃO DE MENSAGENS (Realtime)
  // ============================================================================
  const fetchMessages = useCallback(async () => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(id, nome, avatar_url, role)')
      .eq('channel_id', activeChannelId)
      .order('created_at', { ascending: true });

    if (data) {
      // Normaliza o retorno dos profiles
      const formattedMessages = data.map(m => ({
        ...m,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      })) as MessageData[];
      
      setMessages(formattedMessages);
      scrollToBottom();
      
      // 🟢 NOVO: Marcar como lido ao abrir o canal
      if (currentUser) {
        supabase.from('channel_reads').upsert(
          { channel_id: activeChannelId, user_id: currentUser.id, last_read_at: new Date().toISOString() },
          { onConflict: 'channel_id, user_id' }
        ).then(() => {
          setUnreadCounts(prev => ({ ...prev, [activeChannelId]: 0 }));
        });
      }
    }
  }, [activeChannelId, currentUser]);

  useEffect(() => {
    fetchMessages();
    if (!activeChannelId) return;

    const channelSub = supabase.channel(`public:messages:channel_id=eq.${activeChannelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeChannelId}` }, 
        (payload) => {
          if (payload.new.sender_id !== currentUser?.id) fetchMessages();
        }
      ).subscribe();

    return () => { supabase.removeChannel(channelSub); };
  }, [activeChannelId, fetchMessages, currentUser]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        const scrollContainer = messagesEndRef.current.closest('.overflow-y-auto');
        if (scrollContainer) scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: "smooth" });
      }
    }, 150);
  };

  // ============================================================================
  // MOTOR DE AÇÕES TÁTICAS
  // ============================================================================
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId || !newChannelName.trim()) return;

    setIsCreatingChannel(true);
    const formattedName = newChannelName.toLowerCase().replace(/\s+/g, '-');
    
    const { data, error } = await supabase.from('channels').insert({ 
      project_id: activeProjectId, 
      name: formattedName, 
      is_private: isNewChannelPrivate,
      type: newChannelType
    }).select();

    if (!error && data) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: `Canal #${formattedName} ativado.` }));
      setChannels([...channels, data[0] as ChannelData]);
      setActiveChannelId(data[0].id);
      setIsChannelModalOpen(false);
      setNewChannelName("");
      setIsNewChannelPrivate(false);
      setNewChannelType('general');
    }
    setIsCreatingChannel(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() || !activeChannelId || !currentUser || isSending) return;

    const textToPush = messageText;
    setMessageText(""); 
    setIsSending(true);

    // Mutação Otimista
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: MessageData = {
      id: tempId, channel_id: activeChannelId, sender_id: currentUser.id,
      text_content: textToPush, attachment_url: null, created_at: new Date().toISOString(),
      profiles: currentUser
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    const { error } = await supabase.from('messages').insert({
      channel_id: activeChannelId, sender_id: currentUser.id, text_content: textToPush
    });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Falha na transmissão." }));
    } else {
      // Disparo de Email via NotificationEngine se for canal com o cliente
      const activeClient = clients.find(c => c.id === activeProjectId);
      const activeChannel = channels.find(c => c.id === activeChannelId);
      
      if (activeSpace === 'projects' && activeClient?.client_id && activeChannel && !activeChannel.is_private) {
        NotificationEngine.notifyUser(
          activeClient.client_id,
          `Nova mensagem em #${activeChannel.name}`,
          "A equipe do Atelier enviou uma nova instrução. Acesse o portal para visualizar.",
          "info",
          "/meu-espaco/canais"
        );
      }
      fetchMessages();
    }
    setIsSending(false);
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChannelId || !currentUser) return;

    setIsUploadingAttachment(true);
    window.dispatchEvent(new CustomEvent("showToast", { detail: "Criptografando e enviando anexo..." }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${activeChannelId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('chat_attachments').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('chat_attachments').getPublicUrl(filePath);

      await supabase.from('messages').insert({
        channel_id: activeChannelId, sender_id: currentUser.id, 
        text_content: messageText.trim() !== "" ? messageText : " ", 
        attachment_url: publicUrlData.publicUrl
      });
      
      setMessageText("");
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Anexo compartilhado!" }));
      fetchMessages();
    } catch (error) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Falha no envio do anexo." }));
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = ''; 
    }
  };

  const handleArchiveChannel = async () => {
    if (!activeChannelId) return;
    setIsSettingsOpen(false);
    const { error } = await supabase.from('channels').update({ is_archived: true }).eq('id', activeChannelId);
    if (!error) {
      setChannels(channels.map(c => c.id === activeChannelId ? { ...c, is_archived: true } : c));
      setActiveChannelId(null);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Canal arquivado." }));
    }
  };

  const handleDeleteChannel = async () => {
    if (!activeChannelId) return;
    if (!window.confirm("Ação Destrutiva: Excluir permanentemente este canal?")) return;
    setIsSettingsOpen(false);
    const { error } = await supabase.from('channels').delete().eq('id', activeChannelId);
    if (!error) {
      setChannels(channels.filter(c => c.id !== activeChannelId));
      setActiveChannelId(null);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Canal excluído." }));
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // ============================================================================
  // RENDER (UI)
  // ============================================================================
  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center bg-transparent"><Loader2 size={40} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  const activeChannel = channels.find(c => c.id === activeChannelId);
  const activeClient = clients.find(c => c.id === activeProjectId);
  const isReadOnly = activeChannel?.type === 'announcement' && currentUser?.role === 'colaborador';
  const isComposerDisabled = !activeChannelId || isUploadingAttachment || isSending || isReadOnly;

  // Lógica inteligente para definir o Avatar e o Título do Header do Chat
  let HeaderIcon = <Hash size={22} strokeWidth={2.5} className="text-gray-400" />;
  let headerTitle = activeChannel?.name || "Canal";
  let headerSubtitle: React.ReactNode = "";
  let placeholderText = `Mensagem para #${headerTitle}...`;

  if (activeChannel) {
    if (activeChannel.type === 'dm') {
      const dmUser = corporateUsers.find(u => u.id === activeDMUserId);
      headerTitle = dmUser?.nome || "Mensagem Direta";
      placeholderText = `Mensagem para ${headerTitle}...`;
      headerSubtitle = dmUser?.role ? `Comunicação Criptografada • ${dmUser.role}` : "Comunicação Criptografada (End-to-End)";
      
      HeaderIcon = dmUser?.avatar_url ? (
        <img src={dmUser.avatar_url} alt={dmUser.nome} className="w-full h-full object-cover" />
      ) : (
        <span className="font-elegant font-bold text-lg text-[var(--color-atelier-grafite)]">{dmUser?.nome?.charAt(0) || "U"}</span>
      );
    } else if (activeChannel.type === 'corporate_global') {
      headerTitle = "Equipe LizDesign";
      placeholderText = `Mensagem para a Equipe LizDesign...`;
      HeaderIcon = <LizDesignLogo />;
      
      // Empilhamento visual de avatares da equipe
      const allTeam = [currentUser, ...corporateUsers].filter(Boolean) as ProfileData[];
      headerSubtitle = (
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex -space-x-2">
            {allTeam.slice(0, 5).map((u, i) => (
              <div key={i} className="w-5 h-5 rounded-full border border-white bg-gray-100 flex items-center justify-center overflow-hidden shadow-sm">
                {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <span className="text-[8px] font-bold text-gray-500">{u.nome.charAt(0)}</span>}
              </div>
            ))}
            {allTeam.length > 5 && (
              <div className="w-5 h-5 rounded-full border border-white bg-gray-50 flex items-center justify-center text-[8px] font-bold text-gray-500 shadow-sm">
                +{allTeam.length - 5}
              </div>
            )}
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Equipe Operacional</span>
        </div>
      );
    } else {
      // Canais de Projeto
      HeaderIcon = activeChannel.is_private ? <LizDesignLogo /> : <Hash size={22} strokeWidth={2.5} className="text-[var(--color-atelier-terracota)]" />;
      headerSubtitle = activeChannel.is_private ? 'Canal Tático (Apenas Equipe)' : `Canal compartilhado com: ${activeClient?.profiles?.nome || 'o cliente'}`;
    }
  }

  return (
    <>
      {/* MOBILE INBOX (LG:HIDDEN) - MENSAGEIRO ULTRA FLUIDO */}
      <InboxMobileView 
        currentUser={currentUser}
        clients={clients}
        corporateUsers={corporateUsers}
        channels={channels}
        messages={messages}
        activeSpace={activeSpace}
        setActiveSpace={setActiveSpace}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
        activeChannelId={activeChannelId}
        setActiveChannelId={setActiveChannelId}
        activeDMUserId={activeDMUserId}
        setActiveDMUserId={setActiveDMUserId}
        unreadCounts={unreadCounts}
        channelTypeMap={channelTypeMap}
        channelPreviews={channelPreviews}
        messageText={messageText}
        setMessageText={setMessageText}
        handleSendMessage={handleSendMessage}
        handleFileUpload={handleAttachmentUpload}
        isSending={isSending}
        isUploadingAttachment={isUploadingAttachment}
        messagesEndRef={messagesEndRef}
      />

      {/* DESKTOP INBOX (HIDDEN LG:FLEX - 100% INTOCADO) */}
      <div className="hidden lg:flex relative h-[calc(100vh-60px)] w-full p-6 gap-6 bg-transparent overflow-hidden">
        
        {/* BACKGROUND (Marca D'Água) */}
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
           <MessageSquare size={500} />
        </div>

      {/* ======================================================================
          COLUNA ESQUERDA (Navegação & Diretórios)
          ====================================================================== */}
      <aside className={`w-full md:w-[340px] glass-panel border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2.5rem] flex-col overflow-hidden shrink-0 z-10 bg-white/60 backdrop-blur-xl ${mobileView === 'channels' ? 'flex' : 'hidden md:flex'}`}>
        
        {/* SEGMENTED CONTROL COMPACTO */}
        <div className="shrink-0 p-5 pb-3 border-b border-[var(--color-atelier-grafite)]/5 bg-white/30">
          <div className="flex bg-white/80 p-1.5 rounded-2xl border border-white shadow-sm relative gap-1">
            <button 
              onClick={() => setActiveSpace('corporate')} 
              className={`flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300 relative z-10 py-3 ${activeSpace === 'corporate' ? 'flex-1 text-white' : 'w-12 text-gray-400 hover:text-gray-600'}`}>
              <Users size={16}/>
              <AnimatePresence>
                {activeSpace === 'corporate' && (
                  <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} className="truncate">Equipe</motion.span>
                )}
              </AnimatePresence>
              {Object.entries(unreadCounts).reduce((acc, [cId, count]) => ((channelTypeMap[cId] === 'dm' || channelTypeMap[cId] === 'corporate_global') ? acc + count : acc), 0) > 0 && (
                 <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse-slow"></span>
              )}
            </button>

            <button 
              onClick={() => setActiveSpace('projects')} 
              className={`flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300 relative z-10 py-3 ${activeSpace === 'projects' ? 'flex-1 text-[var(--color-atelier-grafite)]' : 'w-12 text-gray-400 hover:text-gray-600'}`}>
              <Briefcase size={16}/>
              <AnimatePresence>
                {activeSpace === 'projects' && (
                  <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} className="truncate">Projetos</motion.span>
                )}
              </AnimatePresence>
              {Object.entries(unreadCounts).reduce((acc, [cId, count]) => (channelTypeMap[cId] !== 'dm' && channelTypeMap[cId] !== 'corporate_global' ? acc + count : acc), 0) > 0 && (
                 <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse-slow"></span>
              )}
            </button>

            <motion.div className={`absolute top-1.5 bottom-1.5 rounded-xl shadow-md ${activeSpace === 'corporate' ? 'bg-[var(--color-atelier-grafite)] left-1.5 right-[56px]' : 'bg-white left-[56px] right-1.5'}`} layout transition={{ type: "spring", stiffness: 300, damping: 30 }} />
          </div>
        </div>

        {/* LISTAS DINÂMICAS */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeSpace === 'projects' ? (
            <AnimatePresence mode="wait">
              <motion.div key="projects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
                
                {/* Carrossel de Clientes (Corrigido Scroll Horizontal) */}
                <div className="shrink-0 p-5 border-b border-[var(--color-atelier-grafite)]/5 bg-white/20">
                  <div className="relative group/search mb-4">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/search:text-[var(--color-atelier-terracota)] transition-colors" />
                    <input type="text" placeholder="Localizar projeto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white/80 border border-white focus:border-[var(--color-atelier-terracota)]/40 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 text-[12px] font-bold text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" />
                  </div>
                  
                  {/* Container Force-Scroll Horizontal */}
                  <div className="flex flex-nowrap overflow-x-auto overflow-y-hidden custom-scrollbar gap-3 pb-3 pt-1 px-1 touch-pan-x scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {clients.filter(c => c.profiles?.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(client => {
                      const isActive = activeProjectId === client.id;
                      return (
                        <button key={client.id} onClick={() => { setActiveProjectId(client.id); setActiveChannelId(null); }} className={`relative shrink-0 w-12 h-12 rounded-[1rem] flex items-center justify-center font-elegant text-lg shadow-sm border transition-all duration-300 ${isActive ? 'bg-[var(--color-atelier-terracota)] text-white border-[var(--color-atelier-terracota)] scale-110 z-10' : 'bg-white border-white text-[var(--color-atelier-grafite)] hover:scale-105'}`} title={client.profiles?.nome}>
                          {client.profiles?.avatar_url ? <img src={client.profiles.avatar_url} className="w-full h-full object-cover rounded-[1rem]" alt="" /> : client.profiles?.nome?.charAt(0)}
                          {isActive && <motion.div layoutId="active-client-ring" className="absolute inset-0 rounded-[1rem] ring-2 ring-[var(--color-atelier-terracota)]/30 ring-offset-2"></motion.div>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lista de Canais */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-6">
                  <div className="shrink-0">
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none truncate mb-1.5">{activeClient?.profiles?.nome || "Projeto"}</h3>
                    <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/10 px-2 py-1 rounded-md">{activeClient?.type || "Estúdio"}</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center px-2 mb-1.5">
                      <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-gray-400">Canais Compartilhados</span>
                      <button onClick={() => setIsChannelModalOpen(true)} className="text-gray-400 hover:text-[var(--color-atelier-terracota)] transition-colors p-1 bg-white/50 rounded-lg hover:bg-white shadow-sm"><Plus size={14}/></button>
                    </div>
                    {channels.filter(c => !c.is_private && !c.is_archived).map(channel => {
                      const unread = unreadCounts[channel.id] || 0;
                      return (
                      <button key={channel.id} onClick={() => { setActiveChannelId(channel.id); setMobileView('chat'); }} className={`w-full text-left px-4 py-3 rounded-[1rem] font-roboto flex items-center justify-between transition-all border ${activeChannelId === channel.id ? 'bg-white text-[var(--color-atelier-terracota)] shadow-sm border-white scale-[1.02] z-10' : 'bg-transparent text-[var(--color-atelier-grafite)]/80 border-transparent hover:bg-white/60'}`}>
                        <div className="flex items-center gap-2.5 truncate pr-2 w-full">
                           <Hash size={16} className={`shrink-0 ${activeChannelId === channel.id ? 'text-[var(--color-atelier-terracota)]' : 'text-gray-400'}`} /> 
                           <div className="flex flex-col truncate flex-1">
                             <span className="font-bold text-[13px] truncate">{channel.name}</span>
                             {channelPreviews[channel.id] && (
                               <span className="text-[10px] text-gray-400 truncate mt-0.5">{channelPreviews[channel.id]}</span>
                             )}
                           </div>
                           {unread > 0 && (
                             <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse-slow shrink-0">{unread > 99 ? '99+' : unread}</span>
                           )}
                        </div>
                      </button>
                    )})}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 px-2 mb-1.5 mt-2">
                      <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-gray-400">Canais Internos</span>
                      <LizDesignLogo />
                    </div>
                    {channels.filter(c => c.is_private && !c.is_archived).map(channel => {
                      const unread = unreadCounts[channel.id] || 0;
                      return (
                      <button key={channel.id} onClick={() => { setActiveChannelId(channel.id); setMobileView('chat'); }} className={`w-full text-left px-4 py-3 rounded-[1rem] font-roboto flex items-center justify-between transition-all border ${activeChannelId === channel.id ? 'bg-[var(--color-atelier-grafite)] text-white shadow-lg border-[var(--color-atelier-grafite)] scale-[1.02] z-10' : 'bg-transparent text-[var(--color-atelier-grafite)]/80 border-transparent hover:bg-white/60'}`}>
                        <div className="flex items-center gap-2.5 truncate pr-2 w-full">
                           <Lock size={14} className={`shrink-0 ${activeChannelId === channel.id ? 'text-white/60' : 'text-gray-400'}`} /> 
                           <div className="flex flex-col truncate flex-1">
                             <span className="font-bold text-[13px] truncate">{channel.name}</span>
                             {channelPreviews[channel.id] && (
                               <span className={`text-[10px] truncate mt-0.5 ${activeChannelId === channel.id ? 'text-white/60' : 'text-gray-400'}`}>{channelPreviews[channel.id]}</span>
                             )}
                           </div>
                           {unread > 0 && (
                             <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse-slow shrink-0">{unread > 99 ? '99+' : unread}</span>
                           )}
                        </div>
                      </button>
                    )})}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key="corporate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
                <div className="shrink-0 p-6 border-b border-[var(--color-atelier-grafite)]/5 bg-white/20">
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none mb-2 flex items-center gap-2.5"><Users size={22} className="text-[var(--color-atelier-terracota)]"/> Workspace</h3>
                  <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-gray-500">Canal de Comunicação</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <span className="px-2 font-roboto text-[10px] uppercase tracking-widest font-bold text-gray-400">Global</span>
                    <button onClick={() => { setActiveDMUserId(null); setMobileView('chat'); }} className={`w-full text-left p-3.5 rounded-[1.2rem] flex items-center gap-3.5 transition-all border ${!activeDMUserId ? 'bg-[var(--color-atelier-grafite)] text-white shadow-lg border-[var(--color-atelier-grafite)] scale-[1.02]' : 'bg-white/60 border-white hover:bg-white text-[var(--color-atelier-grafite)] shadow-sm'}`}>
                      <div className={`w-11 h-11 rounded-[0.8rem] flex items-center justify-center shrink-0 shadow-inner ${!activeDMUserId ? 'bg-white/10 text-white' : 'bg-gray-50 border border-gray-100 text-[var(--color-atelier-terracota)]'}`}><Globe size={20} /></div>
                      <div className="flex flex-col flex-1 overflow-hidden">
                         <div className="flex justify-between items-center w-full">
                           <span className="font-bold text-[14px] leading-tight">Equipe LizDesign</span>
                           {/* Como Corporate Global tem um canal fixo, podemos achar o unread dele pegando o channelTypeMap */}
                           {(() => {
                             const globalChannelId = Object.keys(channelTypeMap).find(id => channelTypeMap[id] === 'corporate_global');
                             const unread = globalChannelId ? (unreadCounts[globalChannelId] || 0) : 0;
                             if (unread > 0) {
                               return <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse-slow">{unread > 99 ? '99+' : unread}</span>
                             }
                             return null;
                           })()}
                         </div>
                         {(() => {
                             const globalChannelId = Object.keys(channelTypeMap).find(id => channelTypeMap[id] === 'corporate_global');
                             const preview = globalChannelId ? channelPreviews[globalChannelId] : null;
                             if (preview) {
                               return <span className={`text-[10px] truncate mt-1 ${!activeDMUserId ? 'text-white/60' : 'text-gray-400'}`}>{preview}</span>
                             }
                             return <span className={`text-[9px] uppercase tracking-widest font-bold mt-1 ${!activeDMUserId ? 'text-white/60' : 'text-gray-400'}`}>Toda a Equipe</span>
                         })()}
                      </div>
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="px-2 font-roboto text-[10px] uppercase tracking-widest font-bold text-gray-400">Direct Messages</span>
                    {corporateUsers.map(user => {
                      const isActive = activeDMUserId === user.id;
                      const participants = [currentUser?.id, user.id].sort();
                      const dmHash = `dm_${participants[0]}_${participants[1]}`;
                      const channel = channels.find(c => c.name === dmHash);
                      const unread = channel ? (unreadCounts[channel.id] || 0) : 0;
                      const preview = channel ? channelPreviews[channel.id] : null;

                      // Lógica de Presença Real
                      const isOnline = user.last_seen ? (new Date().getTime() - new Date(user.last_seen).getTime() < 3 * 60 * 1000) : false;
                      const statusText = isOnline ? 'Online' : (user.last_seen ? `Visto às ${new Date(user.last_seen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Inativo');

                      return (
                        <button key={user.id} onClick={() => { setActiveDMUserId(user.id); setMobileView('chat'); }} className={`w-full text-left p-3 rounded-[1.2rem] flex items-center gap-3 transition-all border ${isActive ? 'bg-white border-[var(--color-atelier-terracota)]/30 shadow-md scale-[1.02]' : 'bg-transparent border-transparent hover:bg-white/70'}`}>
                          <div className="relative shrink-0">
                            <div className="w-11 h-11 rounded-[0.8rem] bg-gray-50 flex items-center justify-center overflow-hidden border border-white shadow-sm">{user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover"/> : <span className="font-elegant text-base font-bold text-[var(--color-atelier-grafite)]">{user.nome.charAt(0)}</span>}</div>
                            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full flex items-center justify-center ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}>{isOnline && <div className="absolute w-full h-full bg-green-500 rounded-full animate-ping opacity-60"></div>}</div>
                          </div>
                          <div className="flex flex-col overflow-hidden flex-1">
                            <div className="flex justify-between items-center w-full">
                               <span className={`font-bold text-[14px] truncate leading-tight ${isActive ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>{user.nome}</span>
                               {unread > 0 && (
                                 <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse-slow ml-2 shrink-0">{unread > 99 ? '99+' : unread}</span>
                               )}
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              {preview ? (
                                <span className="text-[10px] text-gray-400 truncate flex-1 pr-2">{preview}</span>
                              ) : (
                                <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-gray-400 truncate flex-1 pr-2">{user.role}</span>
                              )}
                              <span className={`font-roboto text-[8px] uppercase tracking-widest font-bold shrink-0 ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>{statusText}</span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </aside>

      {/* ======================================================================
          COLUNA DIREITA (Palco de Chat / Feed Central)
          ====================================================================== */}
      <main className={`flex-1 glass-panel border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2.5rem] flex-col overflow-hidden z-10 bg-white/70 backdrop-blur-2xl ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}>
        {!activeChannelId || !activeChannel ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
            <div className="w-24 h-24 bg-[var(--color-atelier-grafite)]/5 rounded-full flex items-center justify-center mb-6 border border-[var(--color-atelier-grafite)]/10"><MessageSquare size={40} className="text-[var(--color-atelier-terracota)]" /></div>
            <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Frequência Silenciosa</h3>
            <p className="font-roboto text-[12px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 mt-3 max-w-sm">Selecione um canal na barra lateral para iniciar a transmissão.</p>
          </div>
        ) : (
          <>
            {/* CHAT HEADER (Inteligência Visual Embutida) */}
            <div className="bg-white/90 backdrop-blur-xl border-b border-[var(--color-atelier-grafite)]/10 px-4 md:px-8 py-4 md:py-5 flex justify-between items-center z-20 shrink-0">
              <div className="flex items-center gap-3 md:gap-5">
                <button onClick={() => setMobileView('channels')} className="md:hidden w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl text-gray-500 hover:text-[var(--color-atelier-terracota)] transition-colors shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <div className={`hidden md:flex w-14 h-14 rounded-[1.2rem] items-center justify-center shadow-sm border ${activeChannel.type === 'dm' || activeChannel.type === 'corporate_global' ? 'border-transparent bg-transparent' : activeChannel.is_private ? 'bg-[var(--color-atelier-grafite)] text-white border-transparent' : 'bg-white text-[var(--color-atelier-terracota)] border-gray-100'}`}>
                  {HeaderIcon}
                </div>
                <div className="flex flex-col">
                  <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none mb-1.5 flex items-center gap-3">
                    {headerTitle}
                    {activeChannel.type === 'approval' && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest font-roboto">Aprovações</span>}
                    {activeChannel.type === 'announcement' && <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest font-roboto">Avisos</span>}
                  </span>
                  <div className="font-roboto text-[11px] font-bold uppercase tracking-widest text-gray-500">
                    {headerSubtitle}
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="w-12 h-12 rounded-xl bg-white border border-gray-100 hover:border-[var(--color-atelier-terracota)]/40 flex items-center justify-center text-gray-500 hover:text-[var(--color-atelier-terracota)] transition-all shadow-sm hover:shadow-md"><Settings2 size={18} /></button>
                <AnimatePresence>
                  {isSettingsOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 top-14 w-56 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-[1.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.08)] z-50 flex flex-col py-2 overflow-hidden">
                      <button onClick={handleArchiveChannel} className="w-full text-left px-5 py-3 flex items-center gap-3 font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:bg-gray-50 transition-colors"><Archive size={16} className="text-gray-400"/> Arquivar Canal</button>
                      <div className="h-px bg-gray-100 my-1 mx-3"></div>
                      <button onClick={handleDeleteChannel} className="w-full text-left px-5 py-3 flex items-center gap-3 font-roboto text-[11px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={16}/> Excluir Canal</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* CHAT MESSAGES */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-10 py-8 flex flex-col gap-6 bg-gradient-to-b from-transparent to-white/40">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4"><MessageSquare size={24} className="text-gray-400"/></div>
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Canal Estabelecido.</h3>
                  <p className="font-roboto text-[12px] text-gray-500 mt-2 font-bold uppercase tracking-widest">Aguardando transmissão.</p>
                </div>
              ) : (
                <div className="flex justify-center mb-4 shrink-0"><span className="bg-white/90 border border-gray-100 px-5 py-2 rounded-full font-roboto text-[9px] uppercase tracking-widest font-bold text-gray-400 shadow-sm">Início da Conversa</span></div>
              )}

              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUser?.id;
                return (
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex gap-4 max-w-[85%] shrink-0 ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}>
                    <div className={`w-10 h-10 rounded-[0.8rem] shrink-0 flex items-center justify-center overflow-hidden border shadow-sm mt-1 ${isMe ? 'border-white bg-[var(--color-atelier-grafite)] text-white' : 'border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)]'}`}>
                      {msg.profiles?.avatar_url ? <img src={msg.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span className="font-elegant font-bold text-lg">{msg.profiles?.nome?.charAt(0) || "U"}</span>}
                    </div>
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className={`font-roboto text-[11px] font-bold ${isMe ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>{msg.profiles?.nome}</span>
                        {msg.profiles?.role === 'admin' && <span className="text-[8px] uppercase font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Admin</span>}
                        <span className="font-roboto text-[9px] font-bold text-gray-400">{formatTime(msg.created_at)}</span>
                      </div>
                      {msg.attachment_url && (
                        <div onClick={() => window.open(msg.attachment_url!, "_blank")} className={`mb-3 rounded-[1.5rem] overflow-hidden border-4 shadow-md max-w-sm cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all ${isMe ? 'border-[var(--color-atelier-terracota)]' : 'border-white'}`}>
                          {msg.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? <img src={msg.attachment_url} className="w-full max-h-[300px] object-cover" /> : <div className="bg-white px-8 py-6 flex flex-col items-center justify-center gap-3 text-[var(--color-atelier-terracota)] min-w-[200px]"><FileText size={36} strokeWidth={1.5} /><span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-center text-[var(--color-atelier-grafite)]">Baixar Documento</span></div>}
                        </div>
                      )}
                      {msg.text_content && msg.text_content !== " " && (
                        <div className={`px-6 py-4 rounded-[1.5rem] shadow-sm font-roboto text-[14px] leading-relaxed font-medium border ${isMe ? 'bg-[var(--color-atelier-terracota)] text-white rounded-tr-sm border-[var(--color-atelier-terracota)]' : 'bg-white border-gray-100 text-[var(--color-atelier-grafite)] rounded-tl-sm'}`}>
                          {msg.text_content}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
              <div ref={messagesEndRef} className="shrink-0 h-4 w-full" />
            </div>

            {/* CHAT COMPOSER (Input) */}
            <form onSubmit={handleSendMessage} className="p-6 bg-white/90 backdrop-blur-2xl border-t border-gray-100 z-20 shrink-0">
              <div className={`bg-white border border-gray-200 p-2 rounded-[2rem] shadow-sm flex items-end gap-3 transition-all ${isComposerDisabled ? 'opacity-80' : 'focus-within:border-[var(--color-atelier-terracota)]/50 focus-within:shadow-md'}`}>
                <div className="flex items-center gap-1 pb-1 pl-2">
                  <label className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 transition-colors ${isComposerDisabled ? 'opacity-50 cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-400 hover:bg-gray-100 hover:text-[var(--color-atelier-terracota)]'}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAttachmentUpload} disabled={isComposerDisabled} />
                    {isUploadingAttachment ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                  </label>
                  <label className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 transition-colors ${isComposerDisabled ? 'opacity-50 cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-400 hover:bg-gray-100 hover:text-[var(--color-atelier-terracota)]'}`}>
                    <input type="file" accept=".pdf,.zip,.doc,.docx" className="hidden" onChange={handleAttachmentUpload} disabled={isComposerDisabled} />
                    {isUploadingAttachment ? <Loader2 size={18} className="animate-spin hidden" /> : <Paperclip size={18} />}
                  </label>
                </div>
                <div className="flex-1 py-3 px-2">
                  <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)} disabled={isComposerDisabled} placeholder={isReadOnly ? "Este canal é apenas leitura." : placeholderText} className="w-full bg-transparent border-none outline-none font-roboto text-[14px] font-medium text-[var(--color-atelier-grafite)] placeholder:text-gray-400 disabled:cursor-not-allowed disabled:bg-transparent" autoComplete="off" />
                </div>
                <button type="submit" disabled={isComposerDisabled || messageText.trim() === ""} className={`w-12 h-12 flex items-center justify-center rounded-full shrink-0 transition-all duration-300 shadow-sm mb-0.5 mr-0.5 ${messageText.trim() !== "" && !isComposerDisabled ? 'bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] hover:scale-105' : 'bg-gray-100 text-gray-400'}`}>
                  {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={messageText.trim() !== "" ? 'ml-1' : ''} />}
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 mt-4 text-[9px] font-roboto uppercase tracking-widest font-bold text-gray-400">
                 <ShieldCheck size={12} className={activeChannel.is_private ? 'text-[var(--color-atelier-grafite)]' : 'text-[var(--color-atelier-terracota)]'} /> 
                 {activeChannel.type === 'dm' ? 'Comunicação Criptografada (End-to-End)' : activeChannel.is_private ? 'Apenas Equipe do Atelier' : 'Ambiente Compartilhado com o Cliente'}
              </div>
            </form>
          </>
        )}
      </main>

      {/* ======================================================================
          MODAL DE CRIAÇÃO DE CANAL
          ====================================================================== */}
      <AnimatePresence>
        {isChannelModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsChannelModalOpen(false)} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.15)] w-full max-w-md relative z-10">
              <button onClick={() => setIsChannelModalOpen(false)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all shadow-sm"><X size={18} /></button>
              
              <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-1 flex items-center gap-3"><Hash size={24} className="text-[var(--color-atelier-terracota)]"/> Novo Canal</h2>
              <p className="font-roboto text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-8">Estruture a comunicação tática do projeto</p>
              
              <form onSubmit={handleCreateChannel} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]">Nome Operacional</label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input autoFocus type="text" placeholder="ex: design-aprovacoes" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 focus:border-[var(--color-atelier-terracota)] focus:bg-white focus:ring-4 focus:ring-[var(--color-atelier-terracota)]/10 rounded-[1.2rem] py-4 pl-11 pr-4 text-[14px] font-bold text-[var(--color-atelier-grafite)] outline-none transition-all" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]">Tipologia do Canal</label>
                  <select value={newChannelType} onChange={(e) => setNewChannelType(e.target.value as any)} className="w-full bg-gray-50 border border-gray-200 focus:border-[var(--color-atelier-terracota)] focus:bg-white rounded-[1.2rem] py-3.5 px-4 text-[13px] font-bold text-[var(--color-atelier-grafite)] outline-none">
                    <option value="general">Geral (Conversação Livre)</option>
                    <option value="approval">Aprovações (Foco em Decisões)</option>
                    <option value="announcement">Avisos (Apenas Leitura p/ Colaboradores)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]">Camada de Privacidade</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex flex-col p-4 rounded-[1.2rem] border-2 cursor-pointer transition-all shadow-sm ${!isNewChannelPrivate ? 'bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)]/40' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                      <input type="radio" name="privacy" className="hidden" checked={!isNewChannelPrivate} onChange={() => setIsNewChannelPrivate(false)} />
                      <div className="flex items-center gap-2.5 mb-1.5"><MessageSquare size={16} className={!isNewChannelPrivate ? 'text-[var(--color-atelier-terracota)]' : 'text-gray-400'} /><span className={`font-roboto text-[13px] font-bold ${!isNewChannelPrivate ? 'text-[var(--color-atelier-terracota)]' : 'text-gray-500'}`}>Compartilhado</span></div>
                      <span className="font-roboto text-[10px] text-gray-400 leading-tight font-medium">Visível ao cliente.</span>
                    </label>
                    <label className={`flex-1 flex flex-col p-4 rounded-[1.2rem] border-2 cursor-pointer transition-all shadow-sm ${isNewChannelPrivate ? 'bg-[var(--color-atelier-grafite)] text-white border-[var(--color-atelier-grafite)]' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                      <input type="radio" name="privacy" className="hidden" checked={isNewChannelPrivate} onChange={() => setIsNewChannelPrivate(true)} />
                      <div className="flex items-center gap-2.5 mb-1.5"><Lock size={16} className={isNewChannelPrivate ? 'text-white' : 'text-gray-400'} /><span className={`font-roboto text-[13px] font-bold ${isNewChannelPrivate ? 'text-white' : 'text-gray-500'}`}>Tático (Interno)</span></div>
                      <span className={`font-roboto text-[10px] font-medium leading-tight ${isNewChannelPrivate ? 'text-white/60' : 'text-gray-400'}`}>Silo fechado p/ equipe.</span>
                    </label>
                  </div>
                </div>

                <button type="submit" disabled={!newChannelName.trim() || isCreatingChannel} className="w-full mt-4 bg-[var(--color-atelier-grafite)] text-white py-4 rounded-[1.2rem] font-roboto text-[12px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] hover:shadow-xl hover:-translate-y-1 transition-all shadow-md disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md flex justify-center items-center gap-2">
                  {isCreatingChannel ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={2.5} />} Estabelecer Canal
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}