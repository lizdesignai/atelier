// src/app/admin/inbox/views/InboxMobileView.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Users, Briefcase, Hash, Lock, Globe, ArrowLeft, 
  Send, Paperclip, Loader2, MessageSquare, Plus, Check, CheckCheck
} from "lucide-react";

interface ProfileData {
  id: string;
  nome: string;
  avatar_url: string | null;
  role: string;
  current_status?: string;
  last_seen?: string;
  status?: string;
  is_paused?: boolean;
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

interface InboxMobileViewProps {
  currentUser: ProfileData | null;
  clients: ClientData[];
  corporateUsers: ProfileData[];
  channels: ChannelData[];
  messages: MessageData[];
  activeSpace: 'corporate' | 'projects';
  setActiveSpace: (space: 'corporate' | 'projects') => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  activeChannelId: string | null;
  setActiveChannelId: (id: string | null) => void;
  activeDMUserId: string | null;
  setActiveDMUserId: (id: string | null) => void;
  unreadCounts: Record<string, number>;
  channelTypeMap: Record<string, string>;
  channelPreviews: Record<string, string>;
  messageText: string;
  setMessageText: (text: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSending: boolean;
  isUploadingAttachment: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function InboxMobileView({
  currentUser,
  clients = [],
  corporateUsers = [],
  channels = [],
  messages = [],
  activeSpace,
  setActiveSpace,
  activeProjectId,
  setActiveProjectId,
  activeChannelId,
  setActiveChannelId,
  activeDMUserId,
  setActiveDMUserId,
  unreadCounts,
  channelTypeMap,
  channelPreviews,
  messageText,
  setMessageText,
  handleSendMessage,
  handleFileUpload,
  isSending,
  isUploadingAttachment,
  messagesEndRef
}: InboxMobileViewProps) {
  
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileScreen, setMobileScreen] = useState<'conversations' | 'chat'>('conversations');

  // Filtrar usuários pausados preventivamente (robusto)
  const activeCorporateUsers = corporateUsers.filter(u => u.status !== 'paused' && !u.is_paused && u.status !== 'inactive');

  const activeClient = clients.find(c => c.id === activeProjectId);
  const activeChannel = channels.find(c => c.id === activeChannelId);

  // Define o remetente / título da conversa ativa para o header do Chat
  let chatTitle = activeChannel?.name || "Conversa";
  let chatSubtitle = "Mensagens de texto e arquivos";
  let chatAvatarUrl: string | null = null;
  let chatAvatarChar = "C";

  if (activeChannel?.type === 'dm') {
    const dmUser = activeCorporateUsers.find(u => u.id === activeDMUserId);
    chatTitle = dmUser?.nome || "Mensagem Direta";
    chatSubtitle = dmUser?.role ? `${dmUser.role} • Online` : "Mensagem Privada";
    chatAvatarUrl = dmUser?.avatar_url || null;
    chatAvatarChar = dmUser?.nome?.charAt(0) || "U";
  } else if (activeChannel?.type === 'corporate_global') {
    chatTitle = "Equipe LizDesign";
    chatSubtitle = `${activeCorporateUsers.length + 1} membros na equipe`;
    chatAvatarChar = "L";
  } else if (activeChannel) {
    chatTitle = `# ${activeChannel.name}`;
    chatSubtitle = activeClient?.profiles?.nome || "Projeto Compartilhado";
    chatAvatarUrl = activeClient?.profiles?.avatar_url || null;
    chatAvatarChar = activeClient?.profiles?.nome?.charAt(0) || "P";
  }

  const handleOpenConversation = (channelId: string | null, dmUserId: string | null = null) => {
    setActiveChannelId(channelId);
    setActiveDMUserId(dmUserId);
    setMobileScreen('chat');
  };

  const handleBackToConversations = () => {
    setMobileScreen('conversations');
  };

  const searchLower = searchTerm.trim().toLowerCase();

  return (
    <div className="flex lg:hidden flex-col w-full h-[calc(100dvh-70px)] bg-transparent overflow-hidden relative">
      
      <AnimatePresence mode="wait">
        {mobileScreen === 'conversations' ? (
          /* ======================================================================
             TELA DE LISTA DE CONVERSAS (WhatsApp / Telegram Style)
             ====================================================================== */
          <motion.div 
            key="mobile-conversations"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col w-full h-full overflow-hidden bg-transparent"
          >
            {/* HEADER FIXO DO MESSENGER */}
            <div className="shrink-0 p-4 pb-2 bg-transparent flex flex-col gap-3 border-b border-gray-100/20 shadow-2xs">
              <div className="flex items-center justify-between pt-1">
                <h1 className="font-elegant text-3xl font-bold text-[var(--color-atelier-grafite)] tracking-tight">
                  Conversas
                </h1>
                <div className="w-8 h-8 rounded-full bg-[var(--color-atelier-grafite)] text-white flex items-center justify-center overflow-hidden font-elegant font-bold text-sm shadow-xs border border-white">
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    currentUser?.nome?.charAt(0) || "L"
                  )}
                </div>
              </div>

              {/* BARRA DE PESQUISA */}
              <div className="relative w-full">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Pesquisar conversas..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-100/80 border border-transparent focus:border-[var(--color-atelier-terracota)]/30 focus:bg-white rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold text-[var(--color-atelier-grafite)] outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              {/* DUAS PÍLULAS INTERATIVAS: EQUIPE & PROJETOS (SIMPLES E ALINHADAS À ESQUERDA) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSpace('corporate')}
                  className={`px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all relative ${
                    activeSpace === 'corporate' 
                      ? 'bg-[var(--color-atelier-grafite)] text-white shadow-sm' 
                      : 'bg-white/50 text-[var(--color-atelier-grafite)] hover:bg-white border border-white'
                  }`}
                >
                  Equipe
                  {Object.entries(unreadCounts).reduce((acc, [cId, count]) => ((channelTypeMap[cId] === 'dm' || channelTypeMap[cId] === 'corporate_global') ? acc + count : acc), 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-white"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSpace('projects')}
                  className={`px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all relative ${
                    activeSpace === 'projects' 
                      ? 'bg-[var(--color-atelier-terracota)] text-white shadow-sm' 
                      : 'bg-white/50 text-[var(--color-atelier-grafite)] hover:bg-white border border-white'
                  }`}
                >
                  Projetos
                  {Object.entries(unreadCounts).reduce((acc, [cId, count]) => (channelTypeMap[cId] !== 'dm' && channelTypeMap[cId] !== 'corporate_global' ? acc + count : acc), 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse border border-white"></span>
                  )}
                </button>
              </div>
            </div>

            {/* LISTA SOLTA SOLTA EDGE-TO-EDGE */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2">
              {activeSpace === 'corporate' ? (
                /* ================= PÍLULA 1: EQUIPE ================= */
                <div className="flex flex-col gap-3">
                  {/* CANAL GLOBAL DA EQUIPE */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400 px-2">Comunicação Geral</span>
                    {(() => {
                      const globalChannel = channels.find(c => c.type === 'corporate_global');
                      const globalChannelId = globalChannel?.id || null;
                      const unread = globalChannelId ? (unreadCounts[globalChannelId] || 0) : 0;
                      const preview = globalChannelId ? channelPreviews[globalChannelId] : "Canal geral de todos os colaboradores";

                      return (
                        <div 
                          onClick={() => handleOpenConversation(globalChannelId, null)}
                          className="p-3.5 border-b border-gray-100/30 flex items-center gap-3.5 active:opacity-70 transition-colors cursor-pointer"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-[var(--color-atelier-grafite)] text-white flex items-center justify-center shrink-0 shadow-inner">
                            <Globe size={22} />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex justify-between items-center w-full">
                              <span className="font-roboto font-bold text-sm text-[var(--color-atelier-grafite)] truncate">Equipe LizDesign</span>
                              {unread > 0 && (
                                <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs animate-bounce">
                                  {unread}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 truncate mt-0.5">{preview}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* DIRECT MESSAGES DA EQUIPE (EXCLUINDO USUÁRIOS PAUSADOS) */}
                  <div className="flex flex-col gap-1.5 mt-1">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400 px-2">Mensagens Diretas</span>
                    {activeCorporateUsers
                      .filter(user => !searchLower || user.nome.toLowerCase().includes(searchLower))
                      .map(user => {
                        const participants = [currentUser?.id, user.id].sort();
                        const dmHash = `dm_${participants[0]}_${participants[1]}`;
                        const channel = channels.find(c => c.name === dmHash);
                        const unread = channel ? (unreadCounts[channel.id] || 0) : 0;
                        const preview = channel ? channelPreviews[channel.id] : "Iniciar conversa direta";

                        const isOnline = user.last_seen ? (new Date().getTime() - new Date(user.last_seen).getTime() < 3 * 60 * 1000) : false;

                        return (
                          <div 
                            key={user.id}
                            onClick={() => handleOpenConversation(channel?.id || null, user.id)}
                            className="p-3.5 border-b border-gray-100/30 flex items-center gap-3.5 active:opacity-70 transition-colors cursor-pointer"
                          >
                            <div className="relative shrink-0">
                              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden border border-white shadow-xs">
                                {user.avatar_url ? (
                                  <img src={user.avatar_url} className="w-full h-full object-cover" alt={user.nome} />
                                ) : (
                                  <span className="font-elegant font-bold text-lg text-[var(--color-atelier-grafite)]">{user.nome.charAt(0)}</span>
                                )}
                              </div>
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-white rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                            </div>

                            <div className="flex flex-col flex-1 min-w-0">
                              <div className="flex justify-between items-center w-full">
                                <span className="font-roboto font-bold text-sm text-[var(--color-atelier-grafite)] truncate">{user.nome}</span>
                                {unread > 0 && (
                                  <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                    {unread}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-400 truncate mt-0.5">{preview}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                /* ================= PÍLULA 2: PROJETOS ================= */
                <div className="flex flex-col gap-4">
                  {/* SELETOR DE CLIENTES DO PROJETO (CARROSSEL) */}
                  <div className="flex flex-nowrap overflow-x-auto custom-scrollbar gap-3 pb-2 pt-1 px-1 touch-pan-x snap-x snap-mandatory">
                    {clients
                      .filter(c => !searchLower || c.profiles?.nome.toLowerCase().includes(searchLower))
                      .map(client => {
                        const isActive = activeProjectId === client.id;
                        return (
                          <div 
                            key={client.id} 
                            onClick={() => {
                              setActiveProjectId(client.id);
                              setActiveChannelId(null);
                            }}
                            className={`shrink-0 snap-center w-14 h-14 rounded-2xl flex items-center justify-center font-elegant text-xl border transition-all cursor-pointer shadow-xs ${
                              isActive 
                                ? 'bg-[var(--color-atelier-terracota)] text-white border-[var(--color-atelier-terracota)] scale-105 shadow-md' 
                                : 'bg-white border-gray-200/80 text-[var(--color-atelier-grafite)]'
                            }`}
                          >
                            {client.profiles?.avatar_url ? (
                              <img src={client.profiles.avatar_url} className="w-full h-full object-cover rounded-2xl" alt="" />
                            ) : (
                              client.profiles?.nome?.charAt(0)
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* NOME DO PROJETO SELECIONADO */}
                  <div className="flex items-center justify-between px-2 pt-1 border-t border-gray-200/60">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[8px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)]">Projeto Ativo</span>
                      <h3 className="font-elegant text-xl font-bold text-[var(--color-atelier-grafite)] truncate">{activeClient?.profiles?.nome || "Selecione um Projeto"}</h3>
                    </div>
                    <span className="bg-gray-100 text-gray-600 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {activeClient?.type || "Cliente"}
                    </span>
                  </div>

                  {/* CANAIS COMPARTILHADOS E TÁTICOS DO PROJETO */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400 px-2">Canais Compartilhados</span>
                    {channels
                      .filter(c => !c.is_private && !c.is_archived)
                      .map(channel => {
                        const unread = unreadCounts[channel.id] || 0;
                        const preview = channelPreviews[channel.id] || "Conversa compartilhada";
                        return (
                          <div 
                            key={channel.id} 
                            onClick={() => handleOpenConversation(channel.id, null)}
                            className="p-3.5 border-b border-gray-100/30 flex items-center gap-3.5 active:opacity-70 transition-colors cursor-pointer"
                          >
                            <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                              <Hash size={20} />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <div className="flex justify-between items-center w-full">
                                <span className="font-roboto font-bold text-sm text-[var(--color-atelier-grafite)] truncate">#{channel.name}</span>
                                {unread > 0 && (
                                  <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                    {unread}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-400 truncate mt-0.5">{preview}</span>
                            </div>
                          </div>
                        );
                      })}

                    <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400 px-2 mt-2">Canais Táticos (Equipe)</span>
                    {channels
                      .filter(c => c.is_private && !c.is_archived)
                      .map(channel => {
                        const unread = unreadCounts[channel.id] || 0;
                        const preview = channelPreviews[channel.id] || "Canal tático restrito";
                        return (
                          <div 
                            key={channel.id} 
                            onClick={() => handleOpenConversation(channel.id, null)}
                            className="p-3.5 border-b border-gray-100/30 flex items-center gap-3.5 active:opacity-70 transition-colors cursor-pointer"
                          >
                            <div className="w-11 h-11 rounded-2xl bg-[var(--color-atelier-grafite)] text-white flex items-center justify-center shrink-0">
                              <Lock size={18} />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <div className="flex justify-between items-center w-full">
                                <span className="font-roboto font-bold text-sm text-[var(--color-atelier-grafite)] truncate">#{channel.name}</span>
                                {unread > 0 && (
                                  <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                    {unread}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-400 truncate mt-0.5">{preview}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* ======================================================================
             TELA DO CHAT INDIVIDUAL (WhatsApp / Messenger Style Fullscreen)
             ====================================================================== */
          <motion.div 
            key="mobile-chat"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col w-full h-full bg-transparent z-50 overflow-hidden"
          >
            {/* HEADER DO CHAT COM BOTÃO DE VOLTAR */}
            <div className="shrink-0 p-3.5 px-4 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between shadow-xs z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button 
                  onClick={handleBackToConversations} 
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-[var(--color-atelier-grafite)] active:scale-95 transition-transform shrink-0"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="w-10 h-10 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center shrink-0 border border-gray-200/60">
                  {chatAvatarUrl ? (
                    <img src={chatAvatarUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="font-elegant font-bold text-base text-[var(--color-atelier-grafite)]">{chatAvatarChar}</span>
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <h3 className="font-roboto font-bold text-sm text-[var(--color-atelier-grafite)] truncate leading-tight">{chatTitle}</h3>
                  <span className="text-[10px] text-gray-400 truncate">{chatSubtitle}</span>
                </div>
              </div>
            </div>

            {/* MENSAGENS EM ROLAGEM */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3 relative z-0">
              {messages.length === 0 ? (
                <div className="m-auto text-center opacity-40 flex flex-col items-center gap-2">
                  <MessageSquare size={32} className="text-[var(--color-atelier-terracota)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Inicie esta conversa</span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  const senderName = msg.profiles?.nome?.split(" ")[0] || "Usuário";

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${isMe ? 'ml-auto' : 'mr-auto'}`}
                    >
                      {!isMe && (
                        <span className="text-[9px] font-bold text-gray-400 mb-1 ml-1">{senderName}</span>
                      )}
                      
                      <div className={`p-3.5 rounded-3xl shadow-2xs flex flex-col gap-2 ${
                        isMe 
                          ? 'bg-[var(--color-atelier-grafite)] text-white' 
                          : 'bg-white text-gray-800 border border-gray-100'
                      }`}>
                        {msg.attachment_url && (
                          <div className="rounded-xl overflow-hidden max-h-[220px] max-w-full">
                            <img src={msg.attachment_url} alt="Anexo" className="w-full h-full object-cover" />
                          </div>
                        )}
                        {msg.text_content && (
                          <p className="text-xs leading-relaxed font-roboto">{msg.text_content}</p>
                        )}
                        <span className={`text-[8px] font-bold self-end ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* BARRA FIXA DE ENVIO DE MENSAGEM */}
            <form onSubmit={handleSendMessage} className="shrink-0 p-3 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 flex items-center gap-2 z-10 pb-4">
              <label className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer active:scale-95 transition-transform shrink-0">
                <Paperclip size={18} />
                <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,video/*,application/pdf" />
              </label>

              <input 
                type="text" 
                placeholder="Digite sua mensagem..." 
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 bg-gray-100 rounded-full py-2.5 px-4 text-xs font-bold text-gray-800 outline-none placeholder:text-gray-400"
              />

              <button 
                type="submit" 
                disabled={isSending || isUploadingAttachment || !messageText.trim()}
                className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)] text-white flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform shadow-xs shrink-0"
              >
                {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
