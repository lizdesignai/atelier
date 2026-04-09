// src/app/admin/inbox/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Inbox, Search, Send, Paperclip, Image as ImageIcon, 
  MoreVertical, CheckCheck, Hash, Lock, Plus, 
  Settings2, Clock, ShieldCheck, ArrowRight, MessageSquare, Loader2, FileText, X, Trash2, Archive
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { NotificationEngine } from "../../../lib/NotificationEngine"; // 🔔 INJEÇÃO DO MOTOR DE NOTIFICAÇÕES

// Função para disparar os Toasts Globais
const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function AdminInboxPage() {
  // ==========================================
  // ESTADOS DO SUPABASE E DADOS
  // ==========================================
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<any>(null); 
  
  const [clients, setClients] = useState<any[]>([]); 
  const [channels, setChannels] = useState<any[]>([]); 
  const [messages, setMessages] = useState<any[]>([]); 
  
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false); 
  
  // Estados do Modal de Criação de Canal
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [isNewChannelPrivate, setIsNewChannelPrivate] = useState(false);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  // NOVIDADE: Estado do Menu de Configurações do Canal
  const [isChannelSettingsOpen, setIsChannelSettingsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Busca Utilizador Atual e Lista de Projetos (Clientes)
  useEffect(() => {
    const initInbox = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setAdminProfile(profile);
      }

      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('id, type, client_id, profiles(nome, avatar_url)') // Added client_id for notifications
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!error && projectsData && projectsData.length > 0) {
        setClients(projectsData);
        setActiveProjectId(projectsData[0].id);
      }
      setIsLoading(false);
    };
    initInbox();
  }, []);

  // 2. Busca Canais quando o Projeto muda
  useEffect(() => {
    if (!activeProjectId) return;
    const fetchChannels = async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setChannels(data);
        // Seleciona o primeiro canal NÃO arquivado por padrão
        const activeChs = data.filter(c => !c.is_archived);
        if (activeChs.length > 0) setActiveChannelId(activeChs[0].id);
        else setActiveChannelId(null);
      }
    };
    fetchChannels();
  }, [activeProjectId]);

  const fetchMessages = async () => {
    if (!activeChannelId) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*, profiles(nome, avatar_url, role)')
      .eq('channel_id', activeChannelId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
      scrollToBottom();
    }
  };

  // 3. Busca Mensagens quando o Canal muda e ativa o Realtime
  useEffect(() => {
    setIsChannelSettingsOpen(false); // Fecha o menu ao trocar de canal
    if (!activeChannelId) {
      setMessages([]);
      return;
    }

    fetchMessages();

    const channelSubscription = supabase.channel(`public:messages:channel_id=eq.${activeChannelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeChannelId}` }, 
        (payload) => {
          if (payload.new.sender_id !== userId) {
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSubscription);
    };
  }, [activeChannelId]);

  // 🛠️ CORREÇÃO CRÍTICA: Rolar a página sem destruir a tela (Forçando o Scroll apenas no Container)
  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        const scrollContainer = messagesEndRef.current.closest('.overflow-y-auto');
        if (scrollContainer) {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: "smooth"
          });
        }
      }
    }, 150);
  };

  // Helpers para a UI
  const activeClient = clients.find(c => c.id === activeProjectId);
  const activeChannel = channels.find(ch => ch.id === activeChannelId);

  // ==========================================
  // LÓGICA DE AÇÕES
  // ==========================================
  const handleClientSelect = (projectId: string) => {
    setActiveProjectId(projectId);
  };

  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId || !newChannelName.trim()) return;

    setIsCreatingChannel(true);
    const formattedName = newChannelName.toLowerCase().replace(/\s+/g, '-');
    
    const { data, error } = await supabase.from('channels').insert({ 
      project_id: activeProjectId, 
      name: formattedName, 
      is_private: isNewChannelPrivate 
    }).select();

    if (!error && data) {
      setChannels([...channels, data[0]]);
      setActiveChannelId(data[0].id);
      showToast(`Canal #${formattedName} ativado.`);
      setIsChannelModalOpen(false);
      setNewChannelName("");
      setIsNewChannelPrivate(false);
    } else {
      showToast("Erro ao criar canal.");
    }
    setIsCreatingChannel(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() || !activeChannelId || !userId) return;

    const textToSend = messageText;
    setMessageText(""); 

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      channel_id: activeChannelId,
      sender_id: userId,
      text_content: textToSend,
      created_at: new Date().toISOString(),
      profiles: adminProfile || { nome: "Você", avatar_url: null }
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();
    
    const { error } = await supabase.from('messages').insert({
      channel_id: activeChannelId,
      sender_id: userId,
      text_content: textToSend
    });

    if (error) {
      showToast("Erro ao enviar mensagem.");
      setMessages(prev => prev.filter(m => m.id !== tempId)); 
      setMessageText(textToSend); 
    } else {
      // 🔔 NOTIFICAÇÃO: Se for canal público, notifica o cliente
      if (activeClient && activeClient.client_id && activeChannel && !activeChannel.is_private) {
        await NotificationEngine.notifyUser(
          activeClient.client_id,
          `Nova mensagem em #${activeChannel.name}`,
          "A equipa do Atelier enviou-lhe uma nova mensagem. Consulte o seu Inbox.",
          "info",
          "/canais" // Assumindo que a rota do cliente é /canais
        );
      }
      fetchMessages(); 
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChannelId || !userId) return;

    setIsUploadingAttachment(true);
    showToast("A enviar anexo para o chat...");

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${activeChannelId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('chat_attachments').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('chat_attachments').getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('messages').insert({
        channel_id: activeChannelId,
        sender_id: userId,
        text_content: messageText.trim() !== "" ? messageText : null,
        attachment_url: publicUrlData.publicUrl
      });
      if (dbError) throw dbError;

      // 🔔 NOTIFICAÇÃO: Se for canal público, notifica o cliente
      if (activeClient && activeClient.client_id && activeChannel && !activeChannel.is_private) {
        await NotificationEngine.notifyUser(
          activeClient.client_id,
          `Anexo partilhado em #${activeChannel.name}`,
          "A equipa do Atelier partilhou um novo ficheiro/documento no canal.",
          "info",
          "/canais"
        );
      }

      setMessageText("");
      showToast("Anexo enviado com sucesso!");
      fetchMessages();
      scrollToBottom();
    } catch (error) {
      console.error(error);
      showToast("Erro ao enviar o anexo.");
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = ''; 
    }
  };

  // NOVIDADE: Gestão de Canais
  const handleArchiveChannel = async () => {
    if (!activeChannelId) return;
    setIsChannelSettingsOpen(false);

    const { error } = await supabase.from('channels').update({ is_archived: true }).eq('id', activeChannelId);
    
    if (error) {
      showToast("Erro ao arquivar. Verifique se criou a coluna no SQL.");
    } else {
      showToast("Canal arquivado com sucesso.");
      setChannels(channels.map(c => c.id === activeChannelId ? { ...c, is_archived: true } : c));
      setActiveChannelId(null);
    }
  };

  const handleDeleteChannel = async () => {
    if (!activeChannelId) return;
    
    if (!window.confirm("Tem a certeza? Todas as mensagens deste canal serão apagadas permanentemente.")) return;

    setIsChannelSettingsOpen(false);
    const { error } = await supabase.from('channels').delete().eq('id', activeChannelId);

    if (error) {
      showToast("Erro ao apagar o canal.");
    } else {
      showToast("Canal apagado permanentemente.");
      setChannels(channels.filter(c => c.id !== activeChannelId));
      setActiveChannelId(null);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  };


  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* MODAL DE NOVO CANAL */}
      <AnimatePresence>
        {isChannelModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsChannelModalOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[var(--color-atelier-creme)] border border-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(122,116,112,0.2)] w-full max-w-md relative z-10">
              <button onClick={() => setIsChannelModalOpen(false)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors shadow-sm border border-white/50"><X size={18} /></button>
              
              <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-1 flex items-center gap-2"><Hash size={24} className="text-[var(--color-atelier-terracota)]"/> Novo Tópico</h2>
              <p className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mb-6">Crie um canal de comunicação organizado</p>
              
              <form onSubmit={handleCreateChannelSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60">Nome do Canal</label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40" />
                    <input autoFocus type="text" placeholder="ex: aprovacoes-design" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-terracota)] rounded-[1.2rem] py-3.5 pl-10 pr-4 text-[13px] font-bold text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-colors" />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60">Privacidade</label>
                  
                  <div className="flex gap-4">
                    <label className={`flex-1 flex flex-col p-4 rounded-2xl border cursor-pointer transition-all shadow-sm ${!isNewChannelPrivate ? 'bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)]/30' : 'bg-white border-white hover:border-[var(--color-atelier-terracota)]/20 hover:bg-[var(--color-atelier-terracota)]/5'}`}>
                      <input type="radio" name="privacy" className="hidden" checked={!isNewChannelPrivate} onChange={() => setIsNewChannelPrivate(false)} />
                      <div className="flex items-center gap-2 mb-1"><MessageSquare size={16} className={!isNewChannelPrivate ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/40'} /><span className={`font-roboto text-[12px] font-bold ${!isNewChannelPrivate ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>Cliente</span></div>
                      <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50">Visível para a equipa e para o cliente.</span>
                    </label>

                    <label className={`flex-1 flex flex-col p-4 rounded-2xl border cursor-pointer transition-all shadow-sm ${isNewChannelPrivate ? 'bg-[var(--color-atelier-grafite)] text-white border-transparent' : 'bg-white border-white hover:border-[var(--color-atelier-grafite)]/20 hover:bg-[var(--color-atelier-grafite)]/5'}`}>
                      <input type="radio" name="privacy" className="hidden" checked={isNewChannelPrivate} onChange={() => setIsNewChannelPrivate(true)} />
                      <div className="flex items-center gap-2 mb-1"><Lock size={16} className={isNewChannelPrivate ? 'text-white' : 'text-[var(--color-atelier-grafite)]/40'} /><span className={`font-roboto text-[12px] font-bold ${isNewChannelPrivate ? 'text-white' : 'text-[var(--color-atelier-grafite)]'}`}>Privado</span></div>
                      <span className={`font-roboto text-[10px] ${isNewChannelPrivate ? 'text-white/60' : 'text-[var(--color-atelier-grafite)]/50'}`}>Apenas a equipa Atelier tem acesso.</span>
                    </label>
                  </div>
                </div>

                <button type="submit" disabled={!newChannelName.trim() || isCreatingChannel} className="w-full mt-2 bg-[var(--color-atelier-grafite)] text-white py-4 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50 disabled:hover:translate-y-0 flex justify-center items-center gap-2">
                  {isCreatingChannel ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16}/>} Abrir Canal
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CABEÇALHO DO INBOX */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] w-8 h-8 rounded-xl flex items-center justify-center shadow-inner">
              <Inbox size={14} className="text-[var(--color-atelier-terracota)]" />
            </span>
            <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60">Comunicação Corporativa</span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Caixa de <span className="text-[var(--color-atelier-terracota)] italic">Entrada.</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass-panel px-4 py-2.5 rounded-[1.2rem] flex items-center gap-2 text-[11px] font-roboto uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60 shadow-sm border border-white">
            <Clock size={14} className="text-[var(--color-atelier-terracota)]" /> Live Sync Ativado
          </div>
        </div>
      </header>

      {/* ESTRUTURA DE 3 PAINÉIS (Slack-Style) */}
      <div className="flex gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* PAINEL 1: DIRETÓRIO DE CLIENTES (300px) */}
        <div className="w-[300px] glass-panel rounded-[2.5rem] bg-white/40 border border-white shadow-sm flex flex-col shrink-0 overflow-hidden">
          <div className="p-6 border-b border-[var(--color-atelier-grafite)]/5 bg-white/40 backdrop-blur-md shrink-0 transition-colors hover:bg-white/60">
            <div className="relative group/search">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40 group-focus-within/search:text-[var(--color-atelier-terracota)] transition-colors" />
              <input 
                type="text" placeholder="Procurar projeto..." 
                className="w-full bg-white/60 border border-transparent focus:border-[var(--color-atelier-terracota)]/30 focus:bg-white rounded-xl py-3 pl-10 pr-4 text-[12px] font-bold text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2">
            <span className="px-3 pt-2 pb-1 font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Projetos Ativos</span>
            
            {clients.length === 0 && (
              <div className="text-center p-4 text-[11px] font-roboto text-[var(--color-atelier-grafite)]/50">Nenhum projeto ativo encontrado.</div>
            )}

            {clients.map((client) => (
              <div 
                key={client.id}
                onClick={() => handleClientSelect(client.id)}
                className={`
                  p-3.5 rounded-[1.2rem] cursor-pointer transition-all flex items-center justify-between border shadow-sm
                  ${activeProjectId === client.id 
                    ? 'bg-white border-[var(--color-atelier-terracota)]/20 scale-[1.02]' 
                    : 'bg-white/60 border-transparent hover:bg-white hover:border-[var(--color-atelier-grafite)]/5'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl overflow-hidden shadow-inner shrink-0 flex items-center justify-center font-elegant text-lg ${activeProjectId === client.id ? 'bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20' : 'bg-gray-50 border border-gray-100 text-[var(--color-atelier-grafite)]/50'}`}>
                    {client.profiles?.avatar_url ? (
                      <img src={client.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      client.profiles?.nome?.charAt(0) || "C"
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className={`font-roboto text-[13px] truncate transition-colors ${activeProjectId === client.id ? 'font-bold text-[var(--color-atelier-grafite)]' : 'font-medium text-[var(--color-atelier-grafite)]/80'}`}>
                      {client.profiles?.nome}
                    </span>
                    <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 truncate mt-0.5">
                      {client.type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PAINEL 2: CANAIS DO CLIENTE (260px) */}
        <div className="w-[260px] glass-panel rounded-[2.5rem] bg-[var(--color-atelier-grafite)] border border-white shadow-sm flex flex-col shrink-0 overflow-hidden relative">
          <div className="absolute top-[-10%] right-[-20%] w-32 h-32 bg-[var(--color-atelier-terracota)]/20 rounded-full blur-[40px] pointer-events-none"></div>
          
          <div className="p-6 border-b border-white/10 bg-black/20 shrink-0 relative z-10">
            <h2 className="font-elegant text-2xl text-white leading-tight mb-1 truncate">{activeClient?.profiles?.nome || "Selecione..."}</h2>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6 relative z-10">
            
            {/* Secção de Canais Públicos */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-2 mb-1">
                <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-white/50">Canais do Projeto</span>
                <button onClick={() => setIsChannelModalOpen(true)} className="text-white/40 hover:text-[var(--color-atelier-terracota)] transition-colors bg-white/5 p-1 rounded-lg hover:bg-white/10"><Plus size={14}/></button>
              </div>
              
              {channels.filter(c => !c.is_private && !c.is_archived).length === 0 && (
                 <div className="px-2 text-[10px] font-roboto text-white/30 italic">Nenhum canal ativo.</div>
              )}

              {channels.filter(c => !c.is_private && !c.is_archived).map(channel => (
                <button 
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`
                    w-full text-left px-4 py-3 rounded-[1rem] font-roboto text-[13px] font-medium flex items-center justify-between transition-all border
                    ${activeChannelId === channel.id 
                      ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md border-transparent scale-[1.02]' 
                      : 'bg-white/5 text-white/70 hover:bg-white/10 border-transparent hover:text-white'
                    }
                  `}
                >
                  <span className="flex items-center gap-2 truncate pr-2">
                    <Hash size={14} className={activeChannelId === channel.id ? 'text-white/70' : 'text-[var(--color-atelier-terracota)]/80'} /> 
                    <span className="truncate">{channel.name}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* Secção de Canais Privados (Só a Equipa Vê) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-2 mb-1">
                <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-white/50">Área da Equipa</span>
                <Lock size={10} className="text-white/30" />
              </div>
              
              {channels.filter(c => c.is_private && !c.is_archived).map(channel => (
                <button 
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`
                    w-full text-left px-4 py-3 rounded-[1rem] font-roboto text-[13px] font-medium flex items-center justify-between transition-all border
                    ${activeChannelId === channel.id 
                      ? 'bg-white/20 text-white shadow-inner border-white/20 scale-[1.02]' 
                      : 'bg-white/5 text-white/70 hover:bg-white/10 border-transparent hover:text-white'
                    }
                  `}
                >
                  <span className="flex items-center gap-2 truncate pr-2">
                    <Lock size={12} className={activeChannelId === channel.id ? 'text-white/70' : 'text-white/40'} /> 
                    <span className="truncate">{channel.name}</span>
                  </span>
                </button>
              ))}
            </div>
            
          </div>
        </div>

        {/* PAINEL 3: O PALCO DE MENSAGENS (Restante da tela) */}
        <div className="flex-1 min-h-0 min-w-0 glass-panel rounded-[2.5rem] bg-white/60 border border-white flex flex-col relative overflow-hidden shadow-sm h-full">
          
          <div className="bg-white/60 backdrop-blur-xl border-b border-[var(--color-atelier-grafite)]/10 px-8 py-5 flex justify-between items-center z-20 shrink-0">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shadow-inner shrink-0 border border-white/50 ${activeChannel?.is_private ? 'bg-[var(--color-atelier-grafite)] text-white' : 'bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)]'}`}>
                {activeChannel?.is_private ? <Lock size={20} /> : <Hash size={20} strokeWidth={2} />}
              </div>
              <div className="flex flex-col">
                <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none mb-1.5">
                  {activeChannel ? activeChannel.name : "Nenhum canal selecionado"}
                </span>
                <p className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">
                  {activeChannel?.is_private ? 'Canal invisível para o cliente. Acesso Interno.' : `Comunicação direta com ${activeClient?.profiles?.nome || 'o cliente'}.`}
                </p>
              </div>
            </div>
            
            {activeChannel && (
              <div className="relative">
                <button 
                  onClick={() => setIsChannelSettingsOpen(!isChannelSettingsOpen)} 
                  className="w-10 h-10 rounded-xl bg-white border border-transparent hover:border-[var(--color-atelier-grafite)]/20 flex items-center justify-center text-[var(--color-atelier-grafite)]/50 transition-all shadow-sm hover:shadow-md"
                >
                  <Settings2 size={16} />
                </button>

                <AnimatePresence>
                  {isChannelSettingsOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.95 }} 
                      className="absolute right-0 top-12 w-48 bg-white/90 backdrop-blur-xl border border-white rounded-[1.2rem] shadow-[0_15px_30px_rgba(122,116,112,0.15)] z-50 flex flex-col py-2 overflow-hidden"
                    >
                      <button onClick={handleArchiveChannel} className="w-full text-left px-4 py-2.5 flex items-center gap-2 font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)]/10 hover:text-[var(--color-atelier-terracota)] transition-colors">
                        <Archive size={14}/> Arquivar Canal
                      </button>
                      <div className="h-px bg-[var(--color-atelier-grafite)]/5 my-1 mx-2"></div>
                      <button onClick={handleDeleteChannel} className="w-full text-left px-4 py-2.5 flex items-center gap-2 font-roboto text-[11px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={14}/> Apagar Canal
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8 flex flex-col gap-6 bg-gradient-to-b from-transparent to-white/40">
            
            {!activeChannel ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 h-full shrink-0">
                 <MessageSquare size={40} className="mb-4 text-[var(--color-atelier-terracota)]" />
                 <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Sem Conversa Ativa.</h3>
                 <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 max-w-sm font-medium">Crie um canal clicando no '+' ao lado para iniciar a comunicação.</p>
               </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 h-full shrink-0">
                <MessageSquare size={40} className="mb-4 text-[var(--color-atelier-terracota)]" />
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Este canal está silencioso.</h3>
                <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 max-w-sm font-medium">Inicie a conversa.</p>
              </div>
            ) : (
              <div className="flex justify-center mb-2 shrink-0">
                <span className="bg-white/80 border border-white px-4 py-1.5 rounded-full font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 shadow-sm">
                  Início da Conversa
                </span>
              </div>
            )}

            {messages.map((msg, index) => {
              const isMe = msg.sender_id === userId;
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}
                  key={msg.id} 
                  className={`flex gap-4 max-w-[85%] shrink-0 ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}
                >
                  <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center overflow-hidden border shadow-inner ${isMe ? 'border-white bg-[var(--color-atelier-grafite)] text-white' : 'border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)]'}`}>
                    {msg.profiles?.avatar_url ? <img src={msg.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span className="font-elegant font-bold text-lg">{msg.profiles?.nome?.charAt(0) || "A"}</span>}
                  </div>

                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <span className={`font-roboto text-[11px] font-bold ${isMe ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>{msg.profiles?.nome}</span>
                      <span className="font-roboto text-[9px] font-bold text-[var(--color-atelier-grafite)]/40">{formatTime(msg.created_at)}</span>
                    </div>

                    {msg.attachment_url && (
                      <div onClick={() => window.open(msg.attachment_url, "_blank")} className="mb-3 rounded-[1.5rem] overflow-hidden border-[4px] border-white shadow-sm max-w-sm cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all">
                        {msg.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                          <img src={msg.attachment_url} alt="Anexo" className="w-full max-h-[300px] object-cover" />
                        ) : (
                          <div className="bg-white/80 px-8 py-6 flex flex-col items-center justify-center gap-2 text-[var(--color-atelier-terracota)]">
                            <FileText size={32} />
                            <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-center text-[var(--color-atelier-grafite)]">Ver Documento</span>
                          </div>
                        )}
                      </div>
                    )}

                    {msg.text_content && (
                      <div className={`
                        px-5 py-4 rounded-[1.5rem] shadow-sm font-roboto text-[13px] leading-relaxed font-medium border
                        ${isMe 
                          ? 'bg-[var(--color-atelier-terracota)] text-white rounded-tr-sm border-[var(--color-atelier-terracota)]' 
                          : 'bg-white border-white text-[var(--color-atelier-grafite)] rounded-tl-sm'
                        }
                      `}>
                        {msg.text_content}
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
            <div ref={messagesEndRef} className="shrink-0 h-4 w-full" />
          </div>

          <form onSubmit={handleSendMessage} className="p-6 bg-white/60 backdrop-blur-xl border-t border-[var(--color-atelier-grafite)]/10 z-20 shrink-0">
            <div className="bg-white border border-[var(--color-atelier-grafite)]/10 p-1.5 rounded-[2rem] shadow-sm flex items-center gap-2 focus-within:border-[var(--color-atelier-terracota)]/40 focus-within:shadow-md transition-all">
              
              <label className={`w-12 h-12 flex items-center justify-center rounded-full shrink-0 transition-colors ${!activeChannelId || isUploadingAttachment ? 'opacity-50 cursor-not-allowed text-[var(--color-atelier-grafite)]/40' : 'cursor-pointer text-[var(--color-atelier-grafite)]/40 hover:bg-gray-50 hover:text-[var(--color-atelier-terracota)]'}`}>
                <input type="file" accept="image/*" className="hidden" onChange={handleAttachmentUpload} disabled={!activeChannelId || isUploadingAttachment} />
                {isUploadingAttachment ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
              </label>
              
              <label className={`w-12 h-12 flex items-center justify-center rounded-full shrink-0 transition-colors ${!activeChannelId || isUploadingAttachment ? 'opacity-50 cursor-not-allowed text-[var(--color-atelier-grafite)]/40' : 'cursor-pointer text-[var(--color-atelier-grafite)]/40 hover:bg-gray-50 hover:text-[var(--color-atelier-terracota)]'}`}>
                <input type="file" accept=".pdf,.zip,.doc,.docx" className="hidden" onChange={handleAttachmentUpload} disabled={!activeChannelId || isUploadingAttachment} />
                {isUploadingAttachment ? <Loader2 size={18} className="animate-spin hidden" /> : <Paperclip size={18} />}
              </label>

              <input 
                type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)}
                disabled={!activeChannelId || isUploadingAttachment}
                placeholder={activeChannelId ? `Escreva a sua mensagem para #${activeChannel?.name}...` : "Selecione um canal para enviar mensagens."}
                className="flex-1 bg-transparent border-none outline-none font-roboto text-[13px] font-medium text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 px-2 disabled:cursor-not-allowed"
              />

              <button 
                type="submit"
                disabled={!activeChannelId || isUploadingAttachment || messageText.trim() === ""}
                className={`
                  w-12 h-12 flex items-center justify-center rounded-full shrink-0 transition-all duration-300 shadow-sm
                  ${messageText.trim() !== "" 
                    ? 'bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] hover:-translate-y-0.5' 
                    : 'bg-gray-100 text-gray-400'
                  }
                `}
              >
                <Send size={18} className={messageText.trim() !== "" ? 'ml-0.5' : ''} />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4 text-[9px] font-roboto uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">
               <ShieldCheck size={12} /> Comunicação Encriptada: {activeChannel?.is_private ? 'Apenas Equipa' : 'Visível para o Cliente'}
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}