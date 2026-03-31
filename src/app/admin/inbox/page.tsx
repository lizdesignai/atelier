// src/app/admin/inbox/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Inbox, Search, Send, Paperclip, Image as ImageIcon, 
  MoreVertical, CheckCheck, Hash, Lock, Plus, 
  Settings2, Clock, ShieldCheck, ArrowRight, MessageSquare, Loader2, FileText, X
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

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
  const [adminProfile, setAdminProfile] = useState<any>(null); // NOVIDADE: Perfil para Chat Instantâneo
  
  const [clients, setClients] = useState<any[]>([]); // Projetos Ativos
  const [channels, setChannels] = useState<any[]>([]); // Canais do Projeto Selecionado
  const [messages, setMessages] = useState<any[]>([]); // Mensagens do Canal Selecionado
  
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false); 
  
  // NOVIDADE: Estados do Modal de Criação de Canal (Missão 1.2)
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [isNewChannelPrivate, setIsNewChannelPrivate] = useState(false);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Busca Utilizador Atual e Lista de Projetos (Clientes)
  useEffect(() => {
    const initInbox = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        // Busca o perfil do Admin para podermos fazer o chat parecer instantâneo
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setAdminProfile(profile);
      }

      // Busca Projetos Ativos cruzados com os Perfis
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('id, type, profiles(nome, avatar_url)')
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
        if (data.length > 0) setActiveChannelId(data[0].id);
        else setActiveChannelId(null);
      }
    };
    fetchChannels();
  }, [activeProjectId]);

  // Função extraída para poder ser chamada no optimistic UI
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
    if (!activeChannelId) {
      setMessages([]);
      return;
    }

    fetchMessages();

    // Inscreve-se nas mudanças em tempo real (Novas Mensagens)
    const channelSubscription = supabase.channel(`public:messages:channel_id=eq.${activeChannelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeChannelId}` }, 
        (payload) => {
          // Só busca se a mensagem vier de outra pessoa (evita duplicar o Optimistic UI)
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

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // ==========================================
  // LÓGICA DE AÇÕES
  // ==========================================
  const handleClientSelect = (projectId: string) => {
    setActiveProjectId(projectId);
  };

  // NOVIDADE: Lógica do Modal em vez de window.prompt
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

    // NOVIDADE (Missão 1.3): Optimistic Update
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
    
    // Grava no banco
    const { error } = await supabase.from('messages').insert({
      channel_id: activeChannelId,
      sender_id: userId,
      text_content: textToSend
    });

    if (error) {
      showToast("Erro ao enviar mensagem.");
      setMessages(prev => prev.filter(m => m.id !== tempId)); // Remove se falhar
      setMessageText(textToSend); 
    } else {
      fetchMessages(); // Sincroniza IDs reais silenciosamente
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  };

  // Helpers para a UI
  const activeClient = clients.find(c => c.id === activeProjectId);
  const activeChannel = channels.find(ch => ch.id === activeChannelId);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          MODAL DE NOVO CANAL (Missão 1.2 Resolvida)
          ========================================== */}
      <AnimatePresence>
        {isChannelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsChannelModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white/90 backdrop-blur-2xl border border-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10">
              <button onClick={() => setIsChannelModalOpen(false)} className="absolute top-6 right-6 text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)]"><X size={20} /></button>
              
              <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">Novo Tópico</h2>
              <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mb-6">Crie um canal de comunicação organizado.</p>
              
              <form onSubmit={handleCreateChannelSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60">Nome do Canal</label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40" />
                    <input autoFocus type="text" placeholder="ex: aprovacoes-design" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} className="w-full bg-white border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-terracota)] rounded-xl py-3 pl-10 pr-4 text-[14px] text-[var(--color-atelier-grafite)] outline-none shadow-sm" />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60">Privacidade</label>
                  
                  <div className="flex gap-4">
                    <label className={`flex-1 flex flex-col p-4 rounded-2xl border cursor-pointer transition-all ${!isNewChannelPrivate ? 'bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)]/30' : 'bg-white border-[var(--color-atelier-grafite)]/10 hover:border-[var(--color-atelier-grafite)]/30'}`}>
                      <input type="radio" name="privacy" className="hidden" checked={!isNewChannelPrivate} onChange={() => setIsNewChannelPrivate(false)} />
                      <div className="flex items-center gap-2 mb-1"><MessageSquare size={16} className={!isNewChannelPrivate ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/40'} /><span className={`font-roboto text-[12px] font-bold ${!isNewChannelPrivate ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>Cliente</span></div>
                      <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50">Visível para a equipa e para o cliente.</span>
                    </label>

                    <label className={`flex-1 flex flex-col p-4 rounded-2xl border cursor-pointer transition-all ${isNewChannelPrivate ? 'bg-[var(--color-atelier-grafite)] text-white border-transparent' : 'bg-white border-[var(--color-atelier-grafite)]/10 hover:border-[var(--color-atelier-grafite)]/30'}`}>
                      <input type="radio" name="privacy" className="hidden" checked={isNewChannelPrivate} onChange={() => setIsNewChannelPrivate(true)} />
                      <div className="flex items-center gap-2 mb-1"><Lock size={16} className={isNewChannelPrivate ? 'text-white' : 'text-[var(--color-atelier-grafite)]/40'} /><span className={`font-roboto text-[12px] font-bold ${isNewChannelPrivate ? 'text-white' : 'text-[var(--color-atelier-grafite)]'}`}>Privado</span></div>
                      <span className={`font-roboto text-[10px] ${isNewChannelPrivate ? 'text-white/60' : 'text-[var(--color-atelier-grafite)]/50'}`}>Apenas a equipa Atelier tem acesso.</span>
                    </label>
                  </div>
                </div>

                <button type="submit" disabled={!newChannelName.trim() || isCreatingChannel} className="w-full mt-2 bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] py-4 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2">
                  {isCreatingChannel ? <Loader2 size={16} className="animate-spin" /> : "Abrir Canal"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          1. CABEÇALHO DO INBOX
          ========================================== */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] px-3 py-1.5 rounded-full flex items-center gap-2 border border-white shadow-sm">
              <Inbox size={14} className="text-[var(--color-atelier-terracota)]" />
              <span className="font-roboto text-[10px] uppercase tracking-widest font-bold">Comunicação Corporativa</span>
            </span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Caixa de <span className="text-[var(--color-atelier-terracota)] italic">Entrada.</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/60 backdrop-blur-md border border-white px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 text-[11px] font-roboto uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60">
            <Clock size={14} className="text-[var(--color-atelier-terracota)]" /> Live Sync Ativado
          </div>
        </div>
      </header>

      {/* ==========================================
          2. A ESTRUTURA DE 3 PAINÉIS (Slack-Style)
          ========================================== */}
      <div className="flex gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* PAINEL 1: DIRETÓRIO DE CLIENTES (280px) */}
        <div className="w-[300px] glass-panel rounded-[2.5rem] bg-white/40 border border-white/60 shadow-[0_15px_40px_rgba(122,116,112,0.05)] flex flex-col shrink-0 overflow-hidden">
          <div className="p-5 border-b border-[var(--color-atelier-grafite)]/5 bg-white/30 backdrop-blur-md shrink-0">
            <div className="relative group/search">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40 group-focus-within/search:text-[var(--color-atelier-terracota)] transition-colors" />
              <input 
                type="text" placeholder="Procurar projeto..." 
                className="w-full bg-white border border-white focus:border-[var(--color-atelier-terracota)]/30 rounded-xl py-2.5 pl-10 pr-4 text-[12px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2">
            <span className="px-3 pt-2 pb-1 font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Projetos Ativos</span>
            
            {clients.length === 0 && (
              <div className="text-center p-4 text-[11px] font-roboto text-[var(--color-atelier-grafite)]/50">Nenhum projeto ativo encontrado.</div>
            )}

            {clients.map((client) => (
              <div 
                key={client.id}
                onClick={() => handleClientSelect(client.id)}
                className={`
                  p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between border
                  ${activeProjectId === client.id 
                    ? 'bg-white border-white shadow-[0_8px_20px_rgba(173,111,64,0.08)]' 
                    : 'bg-transparent border-transparent hover:bg-white/50 hover:border-white/50'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-terracota)]/10 overflow-hidden shadow-sm shrink-0 flex items-center justify-center font-elegant text-lg text-[var(--color-atelier-terracota)]">
                    {client.profiles?.avatar_url ? (
                      <img src={client.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      client.profiles?.nome?.charAt(0) || "C"
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className={`font-roboto text-[13px] truncate ${activeProjectId === client.id ? 'font-bold text-[var(--color-atelier-terracota)]' : 'font-medium text-[var(--color-atelier-grafite)]'}`}>
                      {client.profiles?.nome}
                    </span>
                    <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 truncate">
                      {client.type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PAINEL 2: CANAIS DO CLIENTE (260px) */}
        <div className="w-[260px] glass-panel rounded-[2.5rem] bg-[var(--color-atelier-grafite)]/5 border border-white shadow-[0_15px_40px_rgba(122,116,112,0.05)] flex flex-col shrink-0 overflow-hidden">
          
          <div className="p-6 border-b border-[var(--color-atelier-grafite)]/5 bg-white/40 shrink-0">
            <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-tight mb-1 truncate">{activeClient?.profiles?.nome || "Selecione..."}</h2>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6">
            
            {/* Secção de Canais Públicos */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-2 mb-1">
                <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">Canais do Projeto</span>
                <button onClick={() => setIsChannelModalOpen(true)} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] transition-colors"><Plus size={14}/></button>
              </div>
              
              {channels.filter(c => !c.is_private).length === 0 && (
                 <div className="px-2 text-[10px] font-roboto text-[var(--color-atelier-grafite)]/40 italic">Nenhum canal criado.</div>
              )}

              {channels.filter(c => !c.is_private).map(channel => (
                <button 
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`
                    w-full text-left px-4 py-2.5 rounded-xl font-roboto text-[13px] font-medium flex items-center justify-between transition-all border
                    ${activeChannelId === channel.id 
                      ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md border-[var(--color-atelier-terracota)]' 
                      : 'bg-transparent text-[var(--color-atelier-grafite)]/70 hover:bg-white border-transparent hover:border-white'
                    }
                  `}
                >
                  <span className="flex items-center gap-2 truncate pr-2">
                    <Hash size={14} className={activeChannelId === channel.id ? 'text-white/70' : 'text-[var(--color-atelier-terracota)]/60'} /> 
                    <span className="truncate">{channel.name}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* Secção de Canais Privados (Só a Equipa Vê) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-2 mb-1">
                <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Área da Equipa</span>
                <Lock size={10} className="text-[var(--color-atelier-grafite)]/40" />
              </div>
              
              {channels.filter(c => c.is_private).map(channel => (
                <button 
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`
                    w-full text-left px-4 py-2.5 rounded-xl font-roboto text-[13px] font-medium flex items-center justify-between transition-all border
                    ${activeChannelId === channel.id 
                      ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md border-[var(--color-atelier-grafite)]' 
                      : 'bg-transparent text-[var(--color-atelier-grafite)]/70 hover:bg-white border-transparent hover:border-white'
                    }
                  `}
                >
                  <span className="flex items-center gap-2 truncate pr-2">
                    <Lock size={12} className={activeChannelId === channel.id ? 'text-white/70' : 'text-[var(--color-atelier-grafite)]/40'} /> 
                    <span className="truncate">{channel.name}</span>
                  </span>
                </button>
              ))}
            </div>
            
          </div>
        </div>

        {/* PAINEL 3: O PALCO DE MENSAGENS (Restante da tela) */}
        <div className="flex-1 glass-panel rounded-[2.5rem] bg-white/60 border border-white flex flex-col relative overflow-hidden shadow-[0_20px_50px_rgba(122,116,112,0.08)] h-full">
          
          <div className="bg-white/80 backdrop-blur-xl border-b border-[var(--color-atelier-grafite)]/5 px-8 py-5 flex justify-between items-center z-20 shrink-0">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm shrink-0 border ${activeChannel?.is_private ? 'bg-[var(--color-atelier-grafite)] text-white border-transparent' : 'bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)]/20'}`}>
                {activeChannel?.is_private ? <Lock size={20} /> : <Hash size={20} strokeWidth={2} />}
              </div>
              <div className="flex flex-col">
                <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none mb-1">
                  {activeChannel ? activeChannel.name : "Nenhum canal selecionado"}
                </span>
                <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50">
                  {activeChannel?.is_private ? 'Canal invisível para o cliente. Apenas a equipa Atelier tem acesso.' : `Comunicação direta com ${activeClient?.profiles?.nome || 'o cliente'}.`}
                </p>
              </div>
            </div>
            <button onClick={() => showToast("A abrir definições do canal...")} className="w-10 h-10 rounded-xl bg-white border border-white hover:border-[var(--color-atelier-grafite)]/20 flex items-center justify-center text-[var(--color-atelier-grafite)]/50 transition-all shadow-sm">
              <Settings2 size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8 flex flex-col gap-6 bg-gradient-to-b from-transparent to-white/30">
            
            {!activeChannel ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                 <MessageSquare size={40} className="mb-4 text-[var(--color-atelier-terracota)]" />
                 <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Sem Conversa Ativa.</h3>
                 <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 max-w-sm">Crie um canal clicando no '+' ao lado para iniciar a comunicação.</p>
               </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <MessageSquare size={40} className="mb-4 text-[var(--color-atelier-terracota)]" />
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Este canal está silencioso.</h3>
                <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 max-w-sm">Inicie a conversa.</p>
              </div>
            ) : (
              <div className="flex justify-center mb-2">
                <span className="bg-white border border-[var(--color-atelier-grafite)]/5 px-4 py-1.5 rounded-full font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 shadow-sm">
                  Início da Conversa
                </span>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {messages.map((msg) => {
                const isMe = msg.sender_id === userId;
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                    key={msg.id} 
                    className={`flex gap-4 max-w-[85%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}
                  >
                    <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden border-2 shadow-sm ${isMe ? 'border-white bg-[var(--color-atelier-grafite)] text-white' : 'border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)]'}`}>
                      {msg.profiles?.avatar_url ? <img src={msg.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span className="font-elegant font-bold">{msg.profiles?.nome?.charAt(0) || "A"}</span>}
                    </div>

                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className={`font-roboto text-[11px] font-bold ${isMe ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>{msg.profiles?.nome}</span>
                        <span className="font-roboto text-[9px] font-bold text-[var(--color-atelier-grafite)]/40">{formatTime(msg.created_at)}</span>
                      </div>

                      {msg.attachment_url && (
                        <div onClick={() => window.open(msg.attachment_url, "_blank")} className="mb-3 rounded-[1.5rem] overflow-hidden border-[4px] border-white shadow-[0_15px_30px_rgba(122,116,112,0.1)] max-w-sm cursor-pointer hover:scale-[1.02] transition-transform">
                          {msg.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                            <img src={msg.attachment_url} alt="Anexo" className="w-full max-h-[300px] object-cover" />
                          ) : (
                            <div className="bg-[var(--color-atelier-creme)] px-8 py-6 flex flex-col items-center justify-center gap-2 text-[var(--color-atelier-terracota)]">
                              <FileText size={32} />
                              <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-center text-[var(--color-atelier-grafite)]">Ver Documento</span>
                            </div>
                          )}
                        </div>
                      )}

                      {msg.text_content && (
                        <div className={`
                          px-6 py-4 rounded-[1.5rem] shadow-sm font-roboto text-[14px] leading-relaxed
                          ${isMe 
                            ? 'bg-[var(--color-atelier-terracota)] text-white rounded-tr-sm shadow-[0_10px_25px_rgba(173,111,64,0.2)]' 
                            : 'bg-white border border-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)] rounded-tl-sm'
                          }
                        `}>
                          {msg.text_content}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-6 bg-white/80 backdrop-blur-xl border-t border-[var(--color-atelier-grafite)]/5 z-20 shrink-0">
            <div className="bg-white border border-[var(--color-atelier-grafite)]/10 p-2 rounded-[2rem] shadow-[0_10px_30px_rgba(122,116,112,0.05)] flex items-center gap-2 focus-within:border-[var(--color-atelier-terracota)]/40 focus-within:shadow-[0_10px_30px_rgba(173,111,64,0.1)] transition-all">
              
              <label className={`w-12 h-12 flex items-center justify-center rounded-full shrink-0 transition-colors ${!activeChannelId || isUploadingAttachment ? 'opacity-50 cursor-not-allowed text-[var(--color-atelier-grafite)]/40' : 'cursor-pointer text-[var(--color-atelier-grafite)]/40 hover:bg-[var(--color-atelier-creme)] hover:text-[var(--color-atelier-terracota)]'}`}>
                <input type="file" accept="image/*" className="hidden" onChange={handleAttachmentUpload} disabled={!activeChannelId || isUploadingAttachment} />
                {isUploadingAttachment ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
              </label>
              
              <label className={`w-12 h-12 flex items-center justify-center rounded-full shrink-0 transition-colors ${!activeChannelId || isUploadingAttachment ? 'opacity-50 cursor-not-allowed text-[var(--color-atelier-grafite)]/40' : 'cursor-pointer text-[var(--color-atelier-grafite)]/40 hover:bg-[var(--color-atelier-creme)] hover:text-[var(--color-atelier-terracota)]'}`}>
                <input type="file" accept=".pdf,.zip,.doc,.docx" className="hidden" onChange={handleAttachmentUpload} disabled={!activeChannelId || isUploadingAttachment} />
                {isUploadingAttachment ? <Loader2 size={20} className="animate-spin hidden" /> : <Paperclip size={20} />}
              </label>

              <input 
                type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)}
                disabled={!activeChannelId || isUploadingAttachment}
                placeholder={activeChannelId ? `Mensagem para #${activeChannel?.name}...` : "Selecione um canal para enviar mensagens."}
                className="flex-1 bg-transparent border-none outline-none font-roboto text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 px-2 disabled:cursor-not-allowed"
              />

              <button 
                type="submit"
                disabled={!activeChannelId || isUploadingAttachment}
                className={`
                  w-12 h-12 flex items-center justify-center rounded-full shrink-0 transition-all duration-300 shadow-sm
                  ${messageText.trim() !== "" 
                    ? 'bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] hover:bg-[var(--color-atelier-terracota)] hover:text-white hover:-translate-y-0.5' 
                    : 'bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)]/30'
                  }
                `}
              >
                <Send size={18} className={messageText.trim() !== "" ? 'ml-0.5' : ''} />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4 text-[9px] font-roboto uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/30">
               <ShieldCheck size={12} /> Comunicação {activeChannel?.is_private ? 'Interna da Equipa' : 'com o Cliente'}
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}