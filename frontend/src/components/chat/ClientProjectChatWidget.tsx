// src/components/chat/ClientProjectChatWidget.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, X, Send, Paperclip, Loader2, CheckCheck, 
  Sparkles, ShieldCheck, ChevronDown, Image as ImageIcon, FileText, ExternalLink
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import UserAvatar from "@/components/global/UserAvatar";
import { useProfile } from "@/hooks/useProfile";

interface MessageItem {
  id: string;
  channel_id: string;
  sender_id: string;
  text_content: string | null;
  attachment_url: string | null;
  parent_id?: string | null;
  created_at: string;
  profiles?: {
    nome: string;
    avatar_url: string | null;
    role: string;
  } | null;
}

export default function ClientProjectChatWidget() {
  const pathname = usePathname();
  const { data: userProfile } = useProfile();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [channelData, setChannelData] = useState<any>(null);
  const [projectData, setProjectData] = useState<any>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [inputText, setInputText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Não renderizar em tela de login ou dentro do painel restrito de admin
  const isExcludedRoute = pathname === "/login" || pathname.startsWith("/admin");

  // 1. Carregar canal do projeto e histórico inicial
  const loadChannelAndMessages = async (showLoadingState = false) => {
    if (showLoadingState) setIsLoading(true);
    try {
      const res = await fetch("/api/sintonia/client-channel");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setChannelData(data.channel);
        setProjectData(data.project);
        setMessages(data.messages || []);
        if (!isOpen) {
          setUnreadCount(data.unreadCount || 0);
        } else {
          setUnreadCount(0);
          markChannelAsRead(data.channel.id);
        }
      }
    } catch (err) {
      console.error("[ClientProjectChatWidget] Erro ao carregar canal:", err);
    } finally {
      if (showLoadingState) setIsLoading(false);
    }
  };

  const markChannelAsRead = async (channelId: string) => {
    try {
      await fetch("/api/sintonia/client-channel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId })
      });
      setUnreadCount(0);
    } catch (_) {}
  };

  // Carrega na montagem da tela
  useEffect(() => {
    if (isExcludedRoute) return;
    loadChannelAndMessages(true);
  }, [pathname, isExcludedRoute]);

  // Polling regular a cada 5 segundos para sincronização perfeita de mensagens
  useEffect(() => {
    if (isExcludedRoute) return;
    const interval = setInterval(() => {
      loadChannelAndMessages(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [pathname, isExcludedRoute, isOpen]);

  // Realtime subscription via Supabase websockets
  useEffect(() => {
    if (isExcludedRoute || !channelData?.id) return;

    const sub = supabase
      .channel(`client-fio-${channelData.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelData.id}`
        },
        () => {
          loadChannelAndMessages(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [channelData?.id, isExcludedRoute, isOpen]);

  // Scroll automático para a última mensagem
  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (channelData?.id) {
        markChannelAsRead(channelData.id);
      }
    }
  }, [isOpen, messages.length]);

  // Enviar mensagem de texto
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !channelData?.id || isSending) return;

    const text = inputText.trim();
    setInputText("");
    setIsSending(true);

    // Adiciona temporariamente mensagem otimista
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      channel_id: channelData.id,
      sender_id: userProfile?.id || "me",
      text_content: text,
      attachment_url: null,
      created_at: new Date().toISOString(),
      profiles: {
        nome: userProfile?.nome || "Você",
        avatar_url: userProfile?.avatar_url || null,
        role: "client"
      }
    };

    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const res = await fetch("/api/sintonia/client-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channelData.id,
          text
        })
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Erro ao enviar mensagem");
      }

      // Substitui mensagem otimista pela oficial
      setMessages(prev => prev.map(m => m.id === tempId ? json.message : m));
    } catch (err) {
      console.error("[ClientProjectChatWidget] Erro no envio:", err);
      // Reverter se falhou
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(text);
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  // Enviar anexo (arquivo / imagem)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !channelData?.id || isUploading) return;

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${channelData.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("chat_attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chat_attachments")
        .getPublicUrl(filePath);

      const res = await fetch("/api/sintonia/client-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channelData.id,
          text: inputText.trim() || null,
          attachmentUrl: urlData.publicUrl
        })
      });

      const json = await res.json();
      if (json.success && json.message) {
        setMessages(prev => [...prev, json.message]);
        setInputText("");
        scrollToBottom();
      }
    } catch (err) {
      console.error("[ClientProjectChatWidget] Erro no upload:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isImageAttachment = (url: string | null) => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  if (isExcludedRoute) return null;

  return (
    <>
      {/* ======================================================== */}
      {/* BOTÃO FLUTUANTE NO CANTO DIREITO INFERIOR                */}
      {/* ======================================================== */}
      <div className="fixed bottom-6 right-6 z-50 pointer-events-auto">
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            setIsOpen(prev => !prev);
            if (!isOpen && channelData?.id) {
              markChannelAsRead(channelData.id);
            }
          }}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-full shadow-[0_12px_30px_rgba(20, 44, 72,0.3)] transition-all cursor-pointer backdrop-blur-xl border ${
            isOpen
              ? "bg-[var(--color-atelier-grafite)] text-white border-white/20"
              : "bg-gradient-to-r from-[var(--color-atelier-terracota)] to-[#83421d] text-white border-white/30 hover:shadow-[0_16px_36px_rgba(20, 44, 72,0.4)]"
          }`}
          title="Falar com a equipe do Studio Veronna"
        >
          <div className="relative flex items-center justify-center">
            {isOpen ? (
              <X size={17} className="text-white" />
            ) : (
              <MessageCircle size={18} className="text-white animate-[pulse_3s_ease-in-out_infinite]" />
            )}

            {!isOpen && unreadCount > 0 && (
              <span className="absolute -top-2.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9.5px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>

          <span className="font-roboto text-[11.5px] font-bold tracking-wide">
            {isOpen ? "Fechar Conversa" : "Falar com a equipe"}
          </span>
        </motion.button>
      </div>

      {/* ======================================================== */}
      {/* MODAL / PAINEL DE CHAT NO CANTO DIREITO INFERIOR         */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed bottom-20 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[540px] max-h-[calc(100vh-6.5rem)] bg-white/95 backdrop-blur-2xl border border-white/80 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden pointer-events-auto"
          >
            {/* CABEÇALHO DO CHAT */}
            <div className="px-5 py-4 bg-gradient-to-r from-stone-50/90 via-white/80 to-amber-50/40 border-b border-[var(--color-atelier-grafite)]/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0 border border-[var(--color-atelier-terracota)]/20 shadow-xs">
                  <ShieldCheck size={20} />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-elegant text-base font-bold text-[var(--color-atelier-grafite)] truncate">
                      Canal do Projeto
                    </span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <span className="text-[9.5px] uppercase tracking-wider font-bold text-[var(--color-atelier-terracota)] truncate">
                    {projectData?.client_name || userProfile?.nome || "Studio Veronna"} • Gestor & Admin
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={15} />
              </button>
            </div>

            {/* MENSAGEM INFORMATIVA DE SEGURANÇA E ACESSO EXCLUSIVO */}
            <div className="px-4 py-2 bg-[var(--color-atelier-terracota)]/5 border-b border-[var(--color-atelier-terracota)]/10 flex items-center gap-2 shrink-0">
              <Sparkles size={12} className="text-[var(--color-atelier-terracota)] shrink-0" />
              <p className="text-[10px] text-[var(--color-atelier-grafite)]/70 font-medium leading-tight">
                Canal exclusivo direto com a gestão e direção criativa do seu projeto.
              </p>
            </div>

            {/* ÁREA DE MENSAGENS COM SCROLL */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3.5 bg-gradient-to-b from-transparent to-stone-50/50">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center opacity-60 gap-2">
                  <Loader2 size={24} className="animate-spin text-[var(--color-atelier-terracota)]" />
                  <span className="text-[11px] font-bold text-gray-400">Carregando conversa...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
                  <div className="w-14 h-14 rounded-full bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center mb-3 text-[var(--color-atelier-terracota)]">
                    <MessageCircle size={26} />
                  </div>
                  <h4 className="font-elegant text-base font-bold text-[var(--color-atelier-grafite)]">
                    Inicie o Alinhamento
                  </h4>
                  <p className="text-[11px] text-[var(--color-atelier-grafite)]/60 mt-1 max-w-[240px]">
                    Envie dúvidas, pedidos ou considerações para o gestor e admin do seu projeto.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === userProfile?.id || msg.profiles?.role === "client";
                  const senderName = isMe ? "Você" : (msg.profiles?.nome || "Equipe Studio");
                  const isManagement = msg.profiles?.role === "admin" || msg.profiles?.role === "gestor";

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      {/* Nome do remetente e papel */}
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)]/70">
                          {senderName}
                        </span>
                        {!isMe && isManagement && (
                          <span className="text-[8.5px] uppercase tracking-wider font-extrabold text-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/10 px-1.5 py-0.2 rounded-md">
                            {msg.profiles?.role === "admin" ? "Diretora" : "Gestor"}
                          </span>
                        )}
                        <span className="text-[8.5px] text-[var(--color-atelier-grafite)]/40 ml-1">
                          {formatMessageTime(msg.created_at)}
                        </span>
                      </div>

                      {/* Balão da Mensagem */}
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[12.5px] leading-relaxed shadow-xs break-words ${
                          isMe
                            ? "bg-[var(--color-atelier-terracota)] text-white rounded-br-xs"
                            : "bg-white border border-gray-100 text-[var(--color-atelier-grafite)] rounded-bl-xs"
                        }`}
                      >
                        {msg.text_content && (
                          <p className="whitespace-pre-wrap">{msg.text_content}</p>
                        )}

                        {/* Anexo de Imagem */}
                        {msg.attachment_url && isImageAttachment(msg.attachment_url) && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-black/10">
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={msg.attachment_url}
                                alt="Anexo"
                                className="max-h-[180px] w-full object-cover hover:scale-105 transition-transform duration-300"
                              />
                            </a>
                          </div>
                        )}

                        {/* Anexo de Arquivo / Documento */}
                        {msg.attachment_url && !isImageAttachment(msg.attachment_url) && (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-2 flex items-center gap-2 p-2 rounded-xl border text-[11px] font-bold transition-all ${
                              isMe
                                ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                                : "bg-stone-50 border-gray-200 text-[var(--color-atelier-terracota)] hover:bg-orange-50/50"
                            }`}
                          >
                            <FileText size={15} className="shrink-0" />
                            <span className="truncate flex-1">Abrir Documento Anexo</span>
                            <ExternalLink size={12} className="shrink-0 opacity-70" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* COMPOSER / ÁREA DE DIGITAÇÃO */}
            <div className="p-3 bg-white/95 border-t border-[var(--color-atelier-grafite)]/10 shrink-0">
              <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
                <div className="relative flex items-center bg-gray-50/90 border border-gray-200 focus-within:border-[var(--color-atelier-terracota)]/50 focus-within:bg-white rounded-2xl p-1.5 px-3 transition-all">
                  <textarea
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escreva sua mensagem para a equipe..."
                    className="w-full bg-transparent text-[12px] text-[var(--color-atelier-grafite)] placeholder-gray-400 outline-none resize-none max-h-24 py-1 leading-snug"
                  />

                  {/* Input invisível para anexo */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-[var(--color-atelier-terracota)] hover:bg-[var(--color-atelier-terracota)]/10 transition-colors disabled:opacity-40 cursor-pointer"
                      title="Anexar arquivo ou imagem"
                    >
                      {isUploading ? <Loader2 size={16} className="animate-spin text-[var(--color-atelier-terracota)]" /> : <Paperclip size={16} />}
                    </button>

                    <button
                      type="submit"
                      disabled={!inputText.trim() || isSending}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                        inputText.trim() && !isSending
                          ? "bg-[var(--color-atelier-terracota)] text-white shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                      title="Enviar mensagem (Enter)"
                    >
                      {isSending ? (
                        <Loader2 size={14} className="animate-spin text-white" />
                      ) : (
                        <Send size={14} className="ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2">
                  <span className="text-[9px] text-gray-400 font-medium">
                    Pressione <strong className="font-bold">Enter</strong> para enviar
                  </span>
                  <span className="text-[9px] text-[var(--color-atelier-terracota)] font-bold">
                    Studio Veronna
                  </span>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
