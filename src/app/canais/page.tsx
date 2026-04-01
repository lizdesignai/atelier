// src/app/canais/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, Hash, Send, Paperclip, Image as ImageIcon, 
  CheckCheck, ShieldCheck, Clock, Info, ArrowRight, Loader2, FileText
} from "lucide-react";
import { supabase } from "../../lib/supabase";

// Função para disparar os Toasts Globais
const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function CanaisClientePage() {
  // ==========================================
  // ESTADOS DO SUPABASE E DADOS
  // ==========================================
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false); 
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Busca Inicial (Sessão -> Projeto -> Canais)
  useEffect(() => {
    const initClientChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      setUserId(session.user.id);

      // Busca o projeto ativo DESTE cliente
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle(); 

      if (projectError || !projectData) {
        setIsLoading(false);
        return; // Cliente sem projeto ativo
      }

      setProjectId(projectData.id);

      // Busca os canais públicos deste projeto
      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('*')
        .eq('project_id', projectData.id)
        .eq('is_private', false)
        .order('created_at', { ascending: true });

      if (!channelsError && channelsData) {
        setChannels(channelsData);
        if (channelsData.length > 0) setActiveChannelId(channelsData[0].id);
      }
      
      setIsLoading(false);
    };

    initClientChat();
  }, []);

  // 2. Busca Mensagens do Canal Ativo & Ativa o Realtime
  useEffect(() => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
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

    fetchMessages();

    // Inscrição em tempo real (Websockets)
    const channelSubscription = supabase.channel(`public:messages:channel_id=eq.${activeChannelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeChannelId}` }, 
        (payload) => {
          fetchMessages(); // Atualiza a lista quando chega nova mensagem
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
        // Encontra a caixa de mensagens exata e rola O INTERIOR dela, evitando que a janela toda suba
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

  // ==========================================
  // AÇÕES
  // ==========================================
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() || !activeChannelId || !userId) return;

    const textToSend = messageText;
    setMessageText("");
    
    const { error } = await supabase.from('messages').insert({
      channel_id: activeChannelId,
      sender_id: userId,
      text_content: textToSend
    });

    if (error) {
      showToast("Erro ao enviar mensagem.");
      setMessageText(textToSend);
    } else {
      scrollToBottom();
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChannelId || !userId) return;

    setIsUploadingAttachment(true);
    showToast("A enviar anexo para a equipa...");

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
        text_content: messageText.trim() !== "" ? messageText : null, // Envia o texto junto se houver
        attachment_url: publicUrlData.publicUrl
      });
      if (dbError) throw dbError;

      setMessageText("");
      showToast("Anexo partilhado com sucesso!");
      scrollToBottom();
    } catch (error) {
      console.error(error);
      showToast("Erro ao partilhar o anexo.");
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = ''; // Reset do input
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  };

  const activeChannel = channels.find(ch => ch.id === activeChannelId);

  // Link real para agendar reunião
  const SCHEDULE_LINK = "https://calendly.com/"; 

  // Ecrã de Loading Geral
  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  // Ecrã de Sem Projeto
  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
        <MessageSquare size={48} className="text-[var(--color-atelier-grafite)]" />
        <h2 className="font-elegant text-3xl">Sem projetos ativos.</h2>
        <p className="font-roboto text-sm">O Atelier ainda não ativou a sua Mesa de Trabalho.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          1. CABEÇALHO (Visão Cliente)
          ========================================== */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/60 text-[var(--color-atelier-grafite)] px-4 py-1.5 rounded-full flex items-center gap-2 border border-white shadow-sm">
              <MessageSquare size={14} className="text-[var(--color-atelier-terracota)]" />
              <span className="font-roboto text-[10px] uppercase tracking-widest font-bold">Comunicação Oficial</span>
            </span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Canais do <span className="text-[var(--color-atelier-terracota)] italic">Projeto.</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.open(SCHEDULE_LINK, "_blank")}
            className="bg-white/60 hover:bg-white hover:border-[var(--color-atelier-terracota)]/30 backdrop-blur-md border border-white px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-2 text-[11px] font-roboto uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)] transition-all cursor-pointer group"
          >
            Agendar Reunião <ArrowRight size={14} className="text-[var(--color-atelier-terracota)] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </header>

      {/* ==========================================
          2. A ESTRUTURA DE 2 PAINÉIS (Split Screen)
          ========================================== */}
      <div className="flex gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* PAINEL ESQUERDO: LISTA DE CANAIS (300px) */}
        <div className="w-[300px] flex flex-col gap-6 h-full shrink-0">
          
          <div className="glass-panel rounded-[2.5rem] bg-white/40 border border-white/60 shadow-[0_15px_40px_rgba(122,116,112,0.05)] flex flex-col flex-1 overflow-hidden">
            <div className="p-6 border-b border-[var(--color-atelier-grafite)]/5 bg-white/30 backdrop-blur-md shrink-0">
              <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-tight">Tópicos</h2>
              <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 mt-1">Organização por assuntos.</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2">
              {channels.length === 0 && (
                 <div className="px-2 text-[10px] font-roboto text-[var(--color-atelier-grafite)]/40 italic text-center mt-4">Nenhum canal criado ainda.</div>
              )}
              
              {channels.map(channel => (
                <button 
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`
                    w-full text-left px-4 py-3 rounded-2xl font-roboto text-[13px] font-medium flex items-center justify-between transition-all border
                    ${activeChannelId === channel.id 
                      ? 'bg-white border-white text-[var(--color-atelier-terracota)] shadow-sm' 
                      : 'bg-transparent text-[var(--color-atelier-grafite)]/70 hover:bg-white/50 border-transparent hover:border-white/50'
                    }
                  `}
                >
                  <span className="flex items-center gap-2 truncate pr-2">
                    <Hash size={16} className={activeChannelId === channel.id ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/40'} /> 
                    <span className={`truncate ${activeChannelId === channel.id ? 'font-bold' : ''}`}>{channel.name}</span>
                  </span>
                </button>
              ))}
            </div>
            
            {/* Box Informativa */}
            <div className="p-4 m-4 mt-0 bg-[var(--color-atelier-terracota)]/5 border border-[var(--color-atelier-terracota)]/20 rounded-2xl shrink-0">
              <div className="flex items-start gap-2 text-[var(--color-atelier-terracota)]">
                <Info size={14} className="shrink-0 mt-0.5" />
                <p className="font-roboto text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                  Separamos as conversas por canais para que não perca nenhum material importante.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* PAINEL DIREITO: O PALCO DE MENSAGENS (Restante da tela) */}
        {/* 🛠️ CORREÇÃO CRÍTICA: Adicionado `min-h-0` e `min-w-0` para obrigar o flexbox a respeitar o limite de altura da tela */}
        <div className="flex-1 min-h-0 min-w-0 glass-panel rounded-[2.5rem] bg-white/60 border border-white flex flex-col relative overflow-hidden shadow-[0_20px_50px_rgba(122,116,112,0.08)] h-full">
          
          {/* Cabeçalho do Chat Ativo */}
          <div className="bg-white/80 backdrop-blur-xl border-b border-[var(--color-atelier-grafite)]/5 px-8 py-5 flex justify-between items-center z-20 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20 flex items-center justify-center shadow-sm shrink-0">
                <Hash size={20} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none mb-1">
                  {activeChannel?.name || "Aguardando canais"}
                </span>
                <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50">
                  Comunicação direta com a equipa Atelier.
                </p>
              </div>
            </div>
          </div>

          {/* Área de Rolagem das Mensagens */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8 flex flex-col gap-6 bg-gradient-to-b from-transparent to-white/30">
            
            {!activeChannel ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 h-full">
                 <MessageSquare size={40} className="mb-4 text-[var(--color-atelier-terracota)]" />
                 <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Aguardando Início.</h3>
                 <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 max-w-sm">O Atelier abrirá canais de comunicação conforme a evolução do projeto.</p>
               </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 h-full">
                <MessageSquare size={40} className="mb-4 text-[var(--color-atelier-terracota)]" />
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Este canal está silencioso.</h3>
                <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 max-w-sm">A equipa do Atelier partilhará as atualizações referentes a este tópico aqui.</p>
              </div>
            ) : (
              <div className="flex justify-center mb-2 shrink-0">
                <span className="bg-white border border-[var(--color-atelier-grafite)]/5 px-4 py-1.5 rounded-full font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 shadow-sm">
                  Início da Conversa
                </span>
              </div>
            )}

            {/* 🛠️ CORREÇÃO CRÍTICA: Removido `mode="popLayout"` que quebrava o DOM na animação de chat */}
            <AnimatePresence>
              {messages.map((msg, index) => {
                const isMe = msg.sender_id === userId;
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * index }}
                    key={msg.id} 
                    className={`flex gap-4 max-w-[85%] shrink-0 ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}
                  >
                    <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden border-2 shadow-sm ${isMe ? 'border-white bg-[var(--color-atelier-grafite)] text-white' : 'border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)]'}`}>
                      {msg.profiles?.avatar_url ? (
                        <img src={msg.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-elegant font-bold text-xl">{msg.profiles?.nome?.charAt(0) || "A"}</span>
                      )}
                    </div>

                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className={`font-roboto text-[11px] font-bold ${isMe ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>{isMe ? "Você" : msg.profiles?.nome}</span>
                        <span className="font-roboto text-[9px] font-bold text-[var(--color-atelier-grafite)]/40">{formatTime(msg.created_at)}</span>
                      </div>

                      {msg.attachment_url && (
                        <div 
                          onClick={() => window.open(msg.attachment_url, "_blank")}
                          className="mb-3 rounded-[1.5rem] overflow-hidden border-[4px] border-white shadow-[0_15px_30px_rgba(122,116,112,0.1)] max-w-sm cursor-pointer hover:scale-[1.02] transition-transform"
                        >
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
                      
                      {isMe && (
                        <div className="flex items-center gap-1 mt-1 pr-1 text-[var(--color-atelier-terracota)] opacity-80">
                          <CheckCheck size={12} />
                          <span className="font-roboto text-[8px] font-bold uppercase tracking-widest">Enviado</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            {/* 🛠️ CORREÇÃO CRÍTICA: A div âncora agora tem altura para evitar que o navegador se perca na rolagem */}
            <div ref={messagesEndRef} className="shrink-0 h-4 w-full" />
          </div>

          {/* O Compositor de Mensagens */}
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
                placeholder={activeChannelId ? `Envie uma mensagem em #${activeChannel?.name}...` : "Aguarde um canal."}
                className="flex-1 bg-transparent border-none outline-none font-roboto text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 px-2 disabled:cursor-not-allowed"
              />

              <button 
                type="submit"
                disabled={!activeChannelId || isUploadingAttachment || messageText.trim() === ""}
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
               <ShieldCheck size={12} /> Toda a comunicação partilhada aqui é encriptada e exclusiva do seu projeto.
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}