// src/app/admin/fio/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash, Send, Paperclip, Image as ImageIcon,
  MessageCircle, Loader2, X, Search, Heart,
  CornerDownRight, Link as LinkIcon, Smile,
  FileText, ChevronDown, AtSign, Users, Headphones, Music,
  Plus, Radio, Volume2, Sparkles, MessageSquare, ExternalLink,
  CheckCircle2, Clock, ShieldCheck, ChevronRight, Bookmark
} from "lucide-react";
import UserAvatar from "../../../components/global/UserAvatar";

// ============================================================================
// TIPOS E CONSTANTES
// ============================================================================
interface ProfileData {
  id: string;
  nome: string;
  avatar_url: string | null;
  role: string;
  email?: string;
  current_mood?: string;
  current_song_id?: string;
  is_self?: boolean;
}

interface ChannelItem {
  id: string;
  name: string;
  type: string;
  description?: string;
  project_id?: string | null;
  client_name?: string | null;
  client_avatar?: string | null;
  partner_id?: string;
  partner_profile?: ProfileData;
  is_self?: boolean;
  is_private?: boolean;
  created_at?: string;
}

interface PostData {
  id: string;
  channel_id: string;
  sender_id: string;
  text_content: string | null;
  attachment_url: string | null;
  parent_id: string | null;
  created_at: string;
  profiles?: ProfileData | null;
}

interface ReactionData {
  emoji: string;
  count: number;
  users: string[];
  reacted: boolean;
}

const EMOJI_QUICK = ["🔥", "❤️", "👏", "🚀", "😂", "✅", "💡", "👀"];

const MOOD_OPTIONS = [
  { id: 'focado', icon: '🚀', label: 'Modo Foguete (Focado)' },
  { id: 'criativo', icon: '💡', label: 'Cérebro Criativo (Ideias)' },
  { id: 'cansado', icon: '☕', label: 'Movido a Café (Intenso)' },
  { id: 'animado', icon: '🎉', label: 'Sextou / Animado' },
  { id: 'zen', icon: '🧘', label: 'Paz Interior (Zen)' },
  { id: 'caotico', icon: '🌪️', label: 'Na Correria (Caótico)' },
];

const showToast = (msg: string) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("showToast", { detail: msg }));
  }
};

// ============================================================================
// COMPONENTE: RichText com renderização de @menções
// ============================================================================
function RichText({ text, isMe = false }: { text: string; isMe?: boolean }) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_\u00C0-\u00FF]+)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span
            key={i}
            className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[12px] font-bold mx-0.5 ${
              isMe
                ? "bg-white/20 text-white border border-white/30"
                : "bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20"
            }`}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// ============================================================================
// PÁGINA PRINCIPAL: SINTONIA CORPORATIVA
// ============================================================================
export default function SintoniaPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<ProfileData | null>(null);
  const [teamMembers, setTeamMembers] = useState<ProfileData[]>([]);

  // Canais
  const [corporateChannels, setCorporateChannels] = useState<ChannelItem[]>([]);
  const [dmChannels, setDmChannels] = useState<ChannelItem[]>([]);
  const [clientChannels, setClientChannels] = useState<ChannelItem[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Mensagens do Canal Ativo
  const [messages, setMessages] = useState<PostData[]>([]);
  const [reactions, setReactions] = useState<Record<string, Record<string, ReactionData>>>({});
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);

  // Composer
  const [composerText, setComposerText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<PostData | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; name: string } | null>(null);

  // Thread Lateral
  const [activeThreadPost, setActiveThreadPost] = useState<PostData | null>(null);
  const [threadComposerText, setThreadComposerText] = useState("");
  const [isSendingThread, setIsSendingThread] = useState(false);

  // Filtros & Busca
  const [searchSidebar, setSearchSidebar] = useState("");
  const [filterInChat, setFilterInChat] = useState("");
  const [showInChatSearch, setShowInChatSearch] = useState(false);

  // Mentions Autocomplete
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");

  // Modais
  const [isDailyJamModalOpen, setIsDailyJamModalOpen] = useState(false);
  const [isNewDMModalOpen, setIsNewDMModalOpen] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [selectedVibeMember, setSelectedVibeMember] = useState<ProfileData | null>(null);

  // Spotify Search dentro do modal Daily Jam
  const [selectedMood, setSelectedMood] = useState("");
  const [spotifySearchQuery, setSpotifySearchQuery] = useState("");
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);
  const [selectedSong, setSelectedSong] = useState<{ id: string; name: string; artist: string } | null>(null);

  // Refs
  const feedEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // CARREGAR DADOS GERAIS (CANAIS, MEMBROS, NÃO LIDAS)
  // ============================================================================
  const loadSintoniaData = useCallback(async (selectDefaultChannel = false) => {
    try {
      const res = await fetch("/api/sintonia?action=channels");
      if (!res.ok) throw new Error("Falha ao carregar canais do Sintonia");
      const data = await res.json();

      if (data.success) {
        if (data.currentUser) setCurrentUser(data.currentUser);
        if (data.teamMembers) setTeamMembers(data.teamMembers);
        if (data.corporateChannels) setCorporateChannels(data.corporateChannels);
        if (data.dmChannels) setDmChannels(data.dmChannels);
        if (data.clientChannels) setClientChannels(data.clientChannels);
        if (data.unreadCounts) setUnreadCounts(data.unreadCounts);

        if (selectDefaultChannel && !activeChannelId) {
          const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
          const urlChannel = params?.get("channel");
          const all = [
            ...(data.corporateChannels || []),
            ...(data.dmChannels || []),
            ...(data.clientChannels || [])
          ];

          if (urlChannel && all.some((c: any) => c.id === urlChannel)) {
            setActiveChannelId(urlChannel);
          } else if (data.defaultChannelId) {
            setActiveChannelId(data.defaultChannelId);
          } else {
            const defaultCh = data.corporateChannels?.find((c: any) => c.name === "operacao-atelier")
              || data.corporateChannels?.[0]
              || data.dmChannels?.[0];
            if (defaultCh) setActiveChannelId(defaultCh.id);
          }
        }
      }
    } catch (err) {
      console.error("[Sintonia] Erro ao carregar dados:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeChannelId]);

  // Boot inicial
  useEffect(() => {
    loadSintoniaData(true);
  }, [loadSintoniaData]);

  // ============================================================================
  // CARREGAR MENSAGENS DO CANAL ATIVO
  // ============================================================================
  const fetchChannelMessages = useCallback(async (channelId: string, isBackground = false) => {
    if (!channelId) return;
    if (!isBackground) setIsFetchingMessages(true);

    try {
      const res = await fetch(`/api/sintonia?action=messages&channelId=${channelId}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.success && data.messages) {
        setMessages(data.messages);
        if (data.reactions) setReactions(data.reactions);

        // Zera contador de não lidas localmente para este canal
        setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
      }
    } catch (err) {
      console.error("[Sintonia] Erro ao buscar mensagens:", err);
    } finally {
      if (!isBackground) setIsFetchingMessages(false);
    }
  }, []);

  // Troca de canal
  useEffect(() => {
    if (activeChannelId) {
      fetchChannelMessages(activeChannelId);
      setReplyingTo(null);
      setActiveThreadPost(null);
    }
  }, [activeChannelId, fetchChannelMessages]);

  // Rolar para o fim quando mensagens mudam
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    feedEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!isFetchingMessages) {
      scrollToBottom("auto");
    }
  }, [messages.length, isFetchingMessages]);

  // ============================================================================
  // POLLING REATIVO INTELIGENTE (3s quando ativo, pausa quando invisível)
  // ============================================================================
  useEffect(() => {
    if (!activeChannelId) return;

    let isDocumentVisible = true;
    const handleVisibilityChange = () => {
      isDocumentVisible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = setInterval(() => {
      if (isDocumentVisible && activeChannelId) {
        fetchChannelMessages(activeChannelId, true);
        loadSintoniaData(false);
      }
    }, 3500);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeChannelId, fetchChannelMessages, loadSintoniaData]);

  // ============================================================================
  // ENVIAR MENSAGEM NO CANAL PRINCIPAL
  // ============================================================================
  const handleSendMessage = async () => {
    if ((!composerText.trim() && !pendingAttachment) || !activeChannelId || !currentUser || isSending) return;

    const textToSend = composerText.trim();
    const attachmentToSend = pendingAttachment?.url || null;
    const parentIdToSend = replyingTo?.id || null;

    setIsSending(true);
    setComposerText("");
    setPendingAttachment(null);
    setReplyingTo(null);

    // Otimista local
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: PostData = {
      id: tempId,
      channel_id: activeChannelId,
      sender_id: currentUser.id,
      text_content: textToSend,
      attachment_url: attachmentToSend,
      parent_id: parentIdToSend,
      created_at: new Date().toISOString(),
      profiles: currentUser
    };

    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const res = await fetch("/api/sintonia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_message",
          channelId: activeChannelId,
          textContent: textToSend,
          attachmentUrl: attachmentToSend,
          parentId: parentIdToSend
        })
      });

      if (!res.ok) throw new Error("Erro na API ao enviar");
      const data = await res.json();

      if (data.success && data.message) {
        // Substitui o otimista pelo real
        setMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      showToast("Não foi possível enviar a mensagem. Tente novamente.");
    } finally {
      setIsSending(false);
      composerRef.current?.focus();
    }
  };

  // ============================================================================
  // ENVIAR RESPOSTA NA THREAD LATERAL
  // ============================================================================
  const handleSendThreadReply = async () => {
    if (!threadComposerText.trim() || !activeThreadPost || !activeChannelId || !currentUser || isSendingThread) return;

    const textToSend = threadComposerText.trim();
    setIsSendingThread(true);
    setThreadComposerText("");

    try {
      const res = await fetch("/api/sintonia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_message",
          channelId: activeChannelId,
          textContent: textToSend,
          parentId: activeThreadPost.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.message) {
          setMessages(prev => [...prev, data.message]);
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Erro ao responder na thread.");
    } finally {
      setIsSendingThread(false);
    }
  };

  // ============================================================================
  // REAÇÕES (EMOJIS)
  // ============================================================================
  const handleReact = async (messageId: string, emoji: string) => {
    if (!currentUser) return;

    // Atualização otimista
    setReactions(prev => {
      const msgReactions = { ...(prev[messageId] || {}) };
      const currentEmojiData = msgReactions[emoji] || { emoji, count: 0, users: [], reacted: false };

      if (currentEmojiData.reacted) {
        // Remove
        const newCount = Math.max(0, currentEmojiData.count - 1);
        if (newCount === 0) {
          delete msgReactions[emoji];
        } else {
          msgReactions[emoji] = {
            emoji,
            count: newCount,
            users: currentEmojiData.users.filter(u => u !== currentUser.id),
            reacted: false
          };
        }
      } else {
        // Adiciona
        msgReactions[emoji] = {
          emoji,
          count: currentEmojiData.count + 1,
          users: [...currentEmojiData.users, currentUser.id],
          reacted: true
        };
      }

      return { ...prev, [messageId]: msgReactions };
    });

    try {
      await fetch("/api/sintonia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "react",
          messageId,
          emoji
        })
      });
    } catch (err) {
      console.error("Erro ao registrar reação:", err);
    }
  };

  // ============================================================================
  // UPLOAD DE ANEXO
  // ============================================================================
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChannelId) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("bucket", "chat_attachments");
      formData.append("path", `${activeChannelId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`);
      formData.append("file", file);

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Erro no upload");
      const json = await res.json();
      const publicUrl = json.data?.publicUrl || `/api/storage/file/chat_attachments/${json.data?.path}`;

      setPendingAttachment({
        url: publicUrl,
        name: file.name
      });
      showToast("Arquivo anexado! Clique em enviar.");
    } catch (err) {
      console.error(err);
      showToast("Falha no upload do arquivo.");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  // ============================================================================
  // MENTIONS AUTOCOMPLETE (@)
  // ============================================================================
  const handleComposerChange = (val: string) => {
    setComposerText(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0) {
      const after = val.slice(lastAt + 1);
      if (!after.includes(" ")) {
        setShowMentions(true);
        setMentionFilter(after.toLowerCase());
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (name: string) => {
    const lastAt = composerText.lastIndexOf("@");
    const before = composerText.slice(0, lastAt);
    setComposerText(`${before}@${name} `);
    setShowMentions(false);
    composerRef.current?.focus();
  };

  // ============================================================================
  // INICIAR OU ABRIR DM COM COLEGA
  // ============================================================================
  const handleOpenDM = async (targetUserId: string) => {
    try {
      const res = await fetch("/api/sintonia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_or_get_dm",
          targetUserId
        })
      });
      const data = await res.json();
      if (data.success && data.channel) {
        await loadSintoniaData(false);
        setActiveChannelId(data.channel.id);
        setIsNewDMModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      showToast("Não foi possível abrir o chat direto.");
    }
  };

  // ============================================================================
  // SALVAR VIBE / DAILY JAM (SPOTIFY & HUMOR)
  // ============================================================================
  const handleSearchSpotify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!spotifySearchQuery.trim()) return;

    setIsSearchingSpotify(true);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(spotifySearchQuery)}`);
      const data = await res.json();
      if (data.tracks) {
        setSpotifyResults(data.tracks);
      } else {
        setSpotifyResults([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingSpotify(false);
    }
  };

  const handleSaveVibe = async () => {
    try {
      const songIdToSave = selectedSong?.id || currentUser?.current_song_id || null;
      const moodToSave = selectedMood || currentUser?.current_mood || null;

      const res = await fetch("/api/sintonia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_jam",
          mood: moodToSave,
          songId: songIdToSave
        })
      });

      if (res.ok) {
        showToast("Vibe atualizada com sucesso!");
        setIsDailyJamModalOpen(false);
        setSpotifySearchQuery("");
        setSpotifyResults([]);
        loadSintoniaData(false);
      }
    } catch (err) {
      console.error(err);
      showToast("Erro ao atualizar vibe.");
    }
  };

  // ============================================================================
  // DERIVAÇÃO DE DADOS
  // ============================================================================
  const allChannelsList = [...corporateChannels, ...dmChannels, ...clientChannels];
  const activeChannel = allChannelsList.find(c => c.id === activeChannelId);

  // Filtragem de mensagens no chat
  const topLevelMessages = messages.filter(m => !m.parent_id);
  const filteredMessages = filterInChat.trim()
    ? topLevelMessages.filter(m =>
        m.text_content?.toLowerCase().includes(filterInChat.toLowerCase()) ||
        m.profiles?.nome?.toLowerCase().includes(filterInChat.toLowerCase())
      )
    : topLevelMessages;

  // Respostas da thread ativa
  const activeThreadReplies = activeThreadPost
    ? messages.filter(m => m.parent_id === activeThreadPost.id)
    : [];

  // Filtragem da sidebar
  const filteredCorporate = corporateChannels.filter(c =>
    c.name.toLowerCase().includes(searchSidebar.toLowerCase())
  );
  const filteredDMs = dmChannels.filter(c =>
    c.name.toLowerCase().includes(searchSidebar.toLowerCase()) ||
    c.partner_profile?.nome.toLowerCase().includes(searchSidebar.toLowerCase())
  );
  const filteredClients = clientChannels.filter(c =>
    c.name.toLowerCase().includes(searchSidebar.toLowerCase()) ||
    c.client_name?.toLowerCase().includes(searchSidebar.toLowerCase())
  );

  const getRepliesForPost = (postId: string) => messages.filter(m => m.parent_id === postId);

  // Utilitário de data
  const formatMsgDate = (dStr: string) => {
    const d = new Date(dStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Hoje";
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return "Ontem";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const isImageFile = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-65px)] w-full items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="animate-spin text-[var(--color-atelier-terracota)]" />
          <span className="text-xs uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">
            Conectando Sintonia...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-65px)] w-full gap-3 sm:gap-4 p-2 sm:p-4 bg-transparent overflow-hidden font-roboto">

      {/* ====================================================================== */}
      {/* 1. SIDEBAR DE NAVEGAÇÃO REFORMULADA (Estilo Slack / Linear Corporativo) */}
      {/* ====================================================================== */}
      <aside className="w-[280px] sm:w-[300px] shrink-0 bg-white/75 backdrop-blur-2xl border border-white/60 shadow-[0_15px_40px_rgba(0,0,0,0.04)] rounded-[1.75rem] flex flex-col overflow-hidden">
        
        {/* Workspace Brand Header */}
        <div className="p-4 pb-3 border-b border-[var(--color-atelier-grafite)]/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-atelier-terracota)] to-[#833824] flex items-center justify-center text-white shadow-sm">
              <MessageSquare size={16} />
            </div>
            <div className="flex flex-col">
              <span className="font-elegant text-lg text-[var(--color-atelier-grafite)] leading-none">
                Sintonia
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--color-atelier-grafite)]/40">
                  Operação Online
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsNewDMModalOpen(true)}
            className="w-7 h-7 rounded-lg bg-[var(--color-atelier-terracota)]/10 hover:bg-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)] hover:text-white flex items-center justify-center transition-all shadow-xs"
            title="Nova Conversa Direta"
          >
            <Plus size={15} />
          </button>
        </div>

        {/* Quick Search Input */}
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchSidebar}
              onChange={e => setSearchSidebar(e.target.value)}
              placeholder="Buscar canais ou colegas..."
              className="w-full bg-gray-50/70 border border-gray-200/60 focus:border-[var(--color-atelier-terracota)]/50 focus:bg-white rounded-xl py-1.5 pl-8 pr-2 text-[11px] font-medium text-[var(--color-atelier-grafite)] outline-none transition-all placeholder:text-gray-400"
            />
            {searchSidebar && (
              <button onClick={() => setSearchSidebar("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Channel Tree */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 flex flex-col gap-4">

          {/* SEÇÃO: CANAIS DA OPERAÇÃO */}
          <div>
            <div className="px-2.5 mb-1 flex items-center justify-between text-[9px] font-bold tracking-widest uppercase text-[var(--color-atelier-grafite)]/40">
              <span>Canais da Operação</span>
              <span className="text-[9px] font-mono text-[var(--color-atelier-grafite)]/30">{filteredCorporate.length}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {filteredCorporate.map(ch => {
                const isActive = activeChannelId === ch.id;
                const unread = unreadCounts[ch.id] || 0;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannelId(ch.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all ${
                      isActive
                        ? "bg-[var(--color-atelier-terracota)] text-white shadow-sm font-bold"
                        : "text-[var(--color-atelier-grafite)]/75 hover:bg-black/[0.04] font-medium"
                    }`}
                  >
                    <Hash size={14} className={isActive ? "text-white/70" : "text-[var(--color-atelier-terracota)]"} />
                    <span className="text-[12px] truncate flex-1">{ch.name}</span>
                    {unread > 0 && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white text-[var(--color-atelier-terracota)]' : 'bg-red-500 text-white'}`}>
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SEÇÃO: MENSAGENS DIRETAS (DMs) */}
          <div>
            <div className="px-2.5 mb-1 flex items-center justify-between text-[9px] font-bold tracking-widest uppercase text-[var(--color-atelier-grafite)]/40">
              <span>Mensagens Diretas</span>
              <button
                onClick={() => setIsNewDMModalOpen(true)}
                className="hover:text-[var(--color-atelier-terracota)] transition-colors"
                title="Iniciar conversa"
              >
                <Plus size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-0.5">
              {filteredDMs.length === 0 ? (
                <button
                  onClick={() => setIsNewDMModalOpen(true)}
                  className="px-2.5 py-2 text-[11px] text-[var(--color-atelier-grafite)]/40 italic hover:text-[var(--color-atelier-terracota)] text-left flex items-center gap-1.5"
                >
                  <Plus size={11} /> Iniciar conversa privada
                </button>
              ) : (
                filteredDMs.map(dm => {
                  const isActive = activeChannelId === dm.id;
                  const isSelf = dm.is_self || dm.partner_id === currentUser?.id;
                  const partner = dm.partner_profile;
                  const unread = unreadCounts[dm.id] || 0;

                  if (isSelf) {
                    return (
                      <button
                        key={dm.id}
                        onClick={() => setActiveChannelId(dm.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all ${
                          isActive
                            ? "bg-[var(--color-atelier-terracota)] text-white shadow-sm font-bold"
                            : "text-[var(--color-atelier-grafite)]/85 hover:bg-black/[0.04] font-medium"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-amber-100/90 text-amber-800"
                        }`}>
                          <Bookmark size={12} className={isActive ? "text-white" : "text-amber-800"} />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] truncate leading-tight font-bold">
                              Você
                            </span>
                            <span className={`text-[8px] font-bold px-1 py-0.2 rounded ${
                              isActive ? "bg-white/20 text-white" : "bg-amber-500/10 text-amber-800 border border-amber-500/20"
                            }`}>
                              Eu
                            </span>
                          </div>
                          <span className={`text-[8.5px] uppercase tracking-wider truncate ${isActive ? 'text-white/70' : 'text-gray-400 font-semibold'}`}>
                            Agenda pessoal & notas
                          </span>
                        </div>
                        {unread > 0 && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white text-[var(--color-atelier-terracota)]' : 'bg-red-500 text-white'}`}>
                            {unread}
                          </span>
                        )}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={dm.id}
                      onClick={() => setActiveChannelId(dm.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all ${
                        isActive
                          ? "bg-[var(--color-atelier-terracota)] text-white shadow-sm font-bold"
                          : "text-[var(--color-atelier-grafite)]/75 hover:bg-black/[0.04] font-medium"
                      }`}
                    >
                      <UserAvatar
                        profile={partner || null}
                        size="sm"
                        className="!w-6 !h-6 !text-[10px] shrink-0"
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[12px] truncate leading-tight">
                          {partner?.nome || dm.name}
                        </span>
                        <span className={`text-[8.5px] uppercase tracking-wider truncate ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                          {partner?.role || 'colaborador'}
                        </span>
                      </div>
                      {unread > 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white text-[var(--color-atelier-terracota)]' : 'bg-red-500 text-white'}`}>
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* SEÇÃO: CLIENTES & PROJETOS (Admin & Gestor) */}
          {(currentUser?.role === 'admin' || currentUser?.role === 'gestor') && (
            <div>
              <div className="px-2.5 mb-1 flex items-center justify-between text-[9px] font-bold tracking-widest uppercase text-[var(--color-atelier-grafite)]/40">
                <span>Canais de Clientes</span>
                <span className="text-[9px] font-mono text-[var(--color-atelier-grafite)]/30">{filteredClients.length}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {filteredClients.map(ch => {
                  const isActive = activeChannelId === ch.id;
                  const unread = unreadCounts[ch.id] || 0;
                  const displayName = ch.client_name || ch.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChannelId(ch.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all ${
                        isActive
                          ? "bg-[var(--color-atelier-terracota)] text-white shadow-sm font-bold"
                          : "text-[var(--color-atelier-grafite)]/75 hover:bg-black/[0.04] font-medium"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                        {displayName.charAt(0)}
                      </div>
                      <span className="text-[11.5px] truncate flex-1">{displayName}</span>
                      {unread > 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white text-[var(--color-atelier-terracota)]' : 'bg-red-500 text-white'}`}>
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Compact User Status Bar (Slack Style) */}
        <div className="p-3 border-t border-[var(--color-atelier-grafite)]/5 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <UserAvatar profile={currentUser} size="sm" className="!w-8 !h-8 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[12px] text-[var(--color-atelier-grafite)] truncate leading-tight">
                {currentUser?.nome?.split(' ')?.[0] || 'Usuário'}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[var(--color-atelier-grafite)]/40 font-semibold truncate">
                {currentUser?.role || 'Equipe'}
              </span>
            </div>
          </div>

          {/* Botão de Humor / Vibe Rápida */}
          <button
            onClick={() => {
              setSelectedMood(currentUser?.current_mood || "");
              setIsDailyJamModalOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-gray-200/70 hover:border-[var(--color-atelier-terracota)]/40 text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-terracota)] transition-all shadow-2xs"
            title="Configurar Daily Jam & Vibe"
          >
            <span className="text-sm leading-none">
              {MOOD_OPTIONS.find(m => m.id === currentUser?.current_mood)?.icon || "🎧"}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">Vibe</span>
          </button>
        </div>

      </aside>

      {/* ====================================================================== */}
      {/* 2. FEED CENTRAL: DAILY JAM REFORMULADO + CHAT FEED + COMPOSER         */}
      {/* ====================================================================== */}
      <main className="flex-1 bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_15px_40px_rgba(0,0,0,0.04)] rounded-[1.75rem] flex flex-col overflow-hidden min-w-0 relative">
        
        {/* ============================================================ */}
        {/* REFORMULAÇÃO DO DAILY JAM: AMBIENT VIBE REEL (TOP BAR ELEGANTE) */}
        {/* Ocupa apenas 48px e não polui a navegação dos canais!        */}
        {/* ============================================================ */}
        <div className="px-4 py-2 bg-gradient-to-r from-amber-500/[0.04] via-orange-500/[0.04] to-transparent border-b border-[var(--color-atelier-grafite)]/5 flex items-center justify-between gap-3 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-lg bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center">
              <Headphones size={13} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 hidden md:inline">
              Daily Jam
            </span>
          </div>

          {/* Carrossel Horizontal de Vibes da Equipe */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5 flex-1 max-w-full">
            {teamMembers.map(member => {
              const hasSong = Boolean(member.current_song_id && member.current_song_id !== "undefined");
              const mood = MOOD_OPTIONS.find(m => m.id === member.current_mood);

              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedVibeMember(member)}
                  className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-left transition-all shrink-0 border ${
                    hasSong
                      ? "bg-white border-[var(--color-atelier-terracota)]/25 shadow-2xs hover:border-[var(--color-atelier-terracota)]"
                      : "bg-white/60 border-gray-100 hover:bg-white"
                  }`}
                  title={`${member.nome}: ${mood?.label || 'Sem humor'} ${hasSong ? '(Com música)' : ''}`}
                >
                  <div className="relative">
                    <UserAvatar profile={member} size="sm" className="!w-5 !h-5 !text-[9px]" />
                    {hasSong && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-atelier-terracota)] animate-ping" />
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-[var(--color-atelier-grafite)] truncate max-w-[80px]">
                    {member.nome.split(" ")[0]}
                  </span>
                  {mood?.icon && (
                    <span className="text-xs leading-none">{mood.icon}</span>
                  )}
                  {hasSong && (
                    <Music size={11} className="text-[var(--color-atelier-terracota)] animate-bounce" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Botão para Definir Minha Vibe */}
          <button
            onClick={() => setIsDailyJamModalOpen(true)}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20 hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider shadow-2xs"
          >
            <Plus size={11} />
            <span className="hidden sm:inline">Minha Vibe</span>
          </button>
        </div>

        {/* Feed Header */}
        <div className="px-5 py-3 border-b border-[var(--color-atelier-grafite)]/5 bg-white/40 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              activeChannel?.is_self
                ? "bg-amber-100 text-amber-800"
                : "bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)]"
            }`}>
              {activeChannel?.is_self ? (
                <Bookmark size={18} />
              ) : activeChannel?.type === 'dm' ? (
                <MessageCircle size={18} />
              ) : (
                <Hash size={18} />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-elegant text-xl sm:text-2xl text-[var(--color-atelier-grafite)] leading-none truncate">
                  {activeChannel?.is_self
                    ? "Você (Agenda Pessoal)"
                    : activeChannel?.type === 'dm'
                    ? (activeChannel.partner_profile?.nome || activeChannel.name)
                    : (activeChannel?.name || "Sintonia")}
                </h1>
                {activeChannel?.is_self && (
                  <span className="bg-amber-100/90 text-amber-900 border border-amber-300/50 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    Privado
                  </span>
                )}
              </div>
              <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 truncate mt-0.5">
                {activeChannel?.is_self
                  ? "Seu espaço pessoal para anotações, rascunhos e lembretes • Visível apenas por você"
                  : activeChannel?.type === 'dm'
                  ? `Conversa Direta • ${activeChannel.partner_profile?.role || 'Colaborador'}`
                  : (activeChannel?.type === 'fio_cliente' ? 'Sintonia do Cliente' : 'Canal Geral da Operação')}
              </span>
            </div>
          </div>

          {/* Ações no Topo do Chat */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInChatSearch(!showInChatSearch)}
              className={`p-2 rounded-xl transition-all ${
                showInChatSearch || filterInChat
                  ? 'bg-[var(--color-atelier-terracota)] text-white shadow-xs'
                  : 'text-gray-400 hover:text-[var(--color-atelier-grafite)] hover:bg-black/5'
              }`}
              title="Filtrar mensagens neste canal"
            >
              <Search size={16} />
            </button>
          </div>
        </div>

        {/* In-Chat Search Bar (Condicional) */}
        <AnimatePresence>
          {showInChatSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-5 py-2 bg-amber-500/[0.06] border-b border-amber-500/10 flex items-center gap-2 shrink-0"
            >
              <Search size={14} className="text-amber-700" />
              <input
                type="text"
                value={filterInChat}
                onChange={e => setFilterInChat(e.target.value)}
                placeholder="Filtrar conversa por palavras-chave ou autor..."
                className="flex-1 bg-transparent text-xs font-medium text-[var(--color-atelier-grafite)] outline-none placeholder:text-gray-400"
              />
              {filterInChat && (
                <button onClick={() => setFilterInChat("")} className="text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* FEED DE MENSAGENS (Chronological: topo -> fim) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-4 custom-scrollbar">
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 opacity-80">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                activeChannel?.is_self
                  ? "bg-amber-100 text-amber-800 shadow-xs"
                  : "bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)]"
              }`}>
                {activeChannel?.is_self ? (
                  <Bookmark size={26} />
                ) : (
                  <MessageCircle size={26} />
                )}
              </div>
              <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">
                {filterInChat 
                  ? "Nenhum resultado encontrado" 
                  : activeChannel?.is_self
                  ? "Sua Agenda Pessoal"
                  : "Nenhuma mensagem por aqui"}
              </h3>
              <p className="text-[11px] font-medium text-[var(--color-atelier-grafite)]/60 mt-1 max-w-sm">
                {filterInChat 
                  ? "Tente buscar por outro termo." 
                  : activeChannel?.is_self
                  ? "Use este espaço para anotar ideias rápidas, listas de tarefas, links e rascunhos. Suas anotações aqui são 100% privadas e acessíveis apenas por você."
                  : "Dê o primeiro passo e inicie o diálogo na operação."}
              </p>
            </div>
          ) : (
            filteredMessages.map((post, index) => {
              const postDateStr = new Date(post.created_at).toDateString();
              const prevPost = filteredMessages[index - 1];
              const prevDateStr = prevPost ? new Date(prevPost.created_at).toDateString() : null;
              const isNewDay = postDateStr !== prevDateStr;

              const isMe = currentUser && post.sender_id === currentUser.id;
              const postReplies = getRepliesForPost(post.id);
              const postReactions = Object.entries(reactions[post.id] || {});
              const timeString = new Date(post.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

              return (
                <React.Fragment key={post.id}>
                  {/* Divisor de Data */}
                  {isNewDay && (
                    <div className="w-full flex justify-center my-2">
                      <span className="bg-gray-100 text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60 px-3 py-1 rounded-full shadow-2xs">
                        {formatMsgDate(post.created_at)}
                      </span>
                    </div>
                  )}

                  {/* Card de Mensagem */}
                  <div className={`group flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-start`}>
                    <UserAvatar
                      profile={post.profiles || null}
                      size="md"
                      className="!w-9 !h-9 !rounded-xl shrink-0 shadow-2xs mt-0.5"
                    />

                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                      
                      {/* Autor + Timestamp */}
                      <div className={`flex items-center gap-1.5 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="font-bold text-[12px] text-[var(--color-atelier-grafite)] leading-none">
                          {post.profiles?.nome?.split(' ')?.[0] || 'Colaborador'}
                        </span>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--color-atelier-grafite)]/40 bg-black/[0.04] px-1.5 py-0.5 rounded">
                          {post.profiles?.role || 'Equipe'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono ml-1">
                          {timeString}
                        </span>
                      </div>

                      {/* Bubble Text */}
                      <div
                        className={`relative px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed break-words shadow-2xs ${
                          isMe
                            ? "bg-[var(--color-atelier-terracota)] text-white rounded-tr-xs"
                            : "bg-white border border-gray-200/60 text-[var(--color-atelier-grafite)] rounded-tl-xs"
                        }`}
                      >
                        <RichText text={post.text_content || ""} isMe={isMe} />

                        {/* Anexo */}
                        {post.attachment_url && (
                          <div className="mt-2.5">
                            {isImageFile(post.attachment_url) ? (
                              <img
                                src={post.attachment_url}
                                alt="Anexo"
                                onClick={() => setLightboxImageUrl(post.attachment_url)}
                                className="max-w-full max-h-[220px] rounded-xl object-cover cursor-pointer hover:opacity-95 shadow-sm transition-opacity"
                              />
                            ) : (
                              <a
                                href={post.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                                  isMe
                                    ? "bg-white/20 text-white hover:bg-white/30"
                                    : "bg-gray-100 text-[var(--color-atelier-grafite)] hover:bg-gray-200"
                                }`}
                              >
                                <FileText size={14} />
                                <span>Baixar Documento</span>
                                <ExternalLink size={12} className="opacity-60" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Ações Rápidas (Toolbar no Hover estilo Slack) */}
                      <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Quick Reactions */}
                        <div className="flex items-center gap-0.5 bg-white border border-gray-200/80 rounded-lg p-0.5 shadow-xs">
                          {EMOJI_QUICK.slice(0, 5).map(em => (
                            <button
                              key={em}
                              onClick={() => handleReact(post.id, em)}
                              className="w-6 h-6 hover:bg-gray-100 rounded flex items-center justify-center text-xs transition-colors"
                            >
                              {em}
                            </button>
                          ))}
                        </div>

                        {/* Botão Responder na Thread */}
                        <button
                          onClick={() => setActiveThreadPost(post)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-gray-200/80 hover:bg-gray-50 text-[11px] font-bold text-gray-500 hover:text-[var(--color-atelier-terracota)] shadow-xs transition-colors"
                          title="Abrir Thread"
                        >
                          <MessageCircle size={12} />
                          <span>{postReplies.length > 0 ? `${postReplies.length} respostas` : "Responder"}</span>
                        </button>
                      </div>

                      {/* Reações Exibidas */}
                      {postReactions.length > 0 && (
                        <div className={`flex items-center flex-wrap gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {postReactions.map(([emoji, rData]) => (
                            <button
                              key={emoji}
                              onClick={() => handleReact(post.id, emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-all ${
                                rData.reacted
                                  ? "bg-[var(--color-atelier-terracota)]/10 border-[var(--color-atelier-terracota)]/40 text-[var(--color-atelier-terracota)]"
                                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px]">{rData.count}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Botão de Respostas da Thread (Se houver) */}
                      {postReplies.length > 0 && (
                        <button
                          onClick={() => setActiveThreadPost(post)}
                          className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-[var(--color-atelier-terracota)] hover:underline"
                        >
                          <CornerDownRight size={12} />
                          <span>{postReplies.length} {postReplies.length === 1 ? 'resposta' : 'respostas'} na conversa</span>
                        </button>
                      )}

                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={feedEndRef} />
        </div>

        {/* ============================================================ */}
        {/* COMPOSER ELEGANTE (Multi-line, Envio com Enter, Mentions)   */}
        {/* ============================================================ */}
        <div className="p-3 sm:p-4 border-t border-[var(--color-atelier-grafite)]/5 bg-white/60 shrink-0">
          
          {/* Banner Respondendo */}
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl text-xs text-amber-800">
              <div className="flex items-center gap-1.5 truncate">
                <CornerDownRight size={13} className="text-amber-600 shrink-0" />
                <span className="font-bold truncate">Respondendo a {replyingTo.profiles?.nome || 'post'}:</span>
                <span className="truncate italic text-amber-900/70">{replyingTo.text_content?.slice(0, 50)}</span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-amber-600 hover:text-red-500 ml-2">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Banner Anexo Pendente */}
          {pendingAttachment && (
            <div className="mb-2 flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs text-emerald-800">
              <div className="flex items-center gap-1.5 truncate">
                <FileText size={13} className="text-emerald-600 shrink-0" />
                <span className="font-bold truncate">Anexo pronto: {pendingAttachment.name}</span>
              </div>
              <button onClick={() => setPendingAttachment(null)} className="text-emerald-600 hover:text-red-500 ml-2">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="relative bg-white border border-gray-200/90 focus-within:border-[var(--color-atelier-terracota)]/60 rounded-2xl shadow-xs transition-all">
            
            {/* Campo Textarea */}
            <textarea
              ref={composerRef}
              rows={2}
              value={composerText}
              onChange={e => handleComposerChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                activeChannel?.is_self
                  ? "Escreva uma anotação, tarefa ou lembrete particular... (Enter para salvar)"
                  : `Escreva em #${activeChannel?.name || 'conversa'}... (Enter para enviar)`
              }
              className="w-full bg-transparent px-4 py-3 text-[13px] text-[var(--color-atelier-grafite)] outline-none resize-none placeholder:text-gray-400"
            />

            {/* Barra de Ferramentas Inferior */}
            <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadFile}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--color-atelier-terracota)] hover:bg-black/5 transition-colors disabled:opacity-50"
                  title="Anexar imagem ou arquivo"
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => handleComposerChange(composerText + "@")}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--color-atelier-terracota)] hover:bg-black/5 transition-colors"
                  title="Mencionar colega"
                >
                  <AtSign size={16} />
                </button>
              </div>

              {/* Botão Enviar */}
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={(!composerText.trim() && !pendingAttachment) || isSending}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--color-atelier-terracota)] text-white text-xs font-bold tracking-wide shadow-xs hover:bg-[var(--color-atelier-terracota)]/90 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Enviar</span>
              </button>
            </div>

            {/* Autocomplete de @Menções */}
            <AnimatePresence>
              {showMentions && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full left-2 mb-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto custom-scrollbar"
                >
                  <div className="p-2 border-b border-gray-100 text-[10px] uppercase font-bold tracking-widest text-gray-400">
                    Mencionar na equipe
                  </div>
                  {teamMembers
                    .filter(m => m.nome.toLowerCase().includes(mentionFilter))
                    .slice(0, 5)
                    .map(m => (
                      <button
                        key={m.id}
                        onClick={() => insertMention(m.nome.split(" ")[0])}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <UserAvatar profile={m} size="sm" className="!w-6 !h-6" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-xs text-[var(--color-atelier-grafite)] truncate">
                            {m.nome}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider text-gray-400">
                            {m.role}
                          </span>
                        </div>
                      </button>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

      </main>

      {/* ====================================================================== */}
      {/* 3. THREAD DRAWER LATERAL (Painel Deslizante de Respostas)               */}
      {/* ====================================================================== */}
      <AnimatePresence>
        {activeThreadPost && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden xl:flex shrink-0 bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_15px_40px_rgba(0,0,0,0.04)] rounded-[1.75rem] flex-col overflow-hidden"
          >
            {/* Header da Thread */}
            <div className="p-4 border-b border-[var(--color-atelier-grafite)]/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-[var(--color-atelier-terracota)]" />
                <h3 className="font-elegant text-lg text-[var(--color-atelier-grafite)] leading-none">
                  Thread da Conversa
                </h3>
              </div>
              <button
                onClick={() => setActiveThreadPost(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Mensagem Raiz (Parent) */}
            <div className="p-4 bg-amber-500/[0.04] border-b border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <UserAvatar profile={activeThreadPost.profiles || null} size="sm" className="!w-6 !h-6" />
                <span className="font-bold text-xs text-[var(--color-atelier-grafite)]">
                  {activeThreadPost.profiles?.nome || "Colaborador"}
                </span>
                <span className="text-[9px] text-gray-400 font-mono">
                  {new Date(activeThreadPost.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-xs text-[var(--color-atelier-grafite)]/80 leading-relaxed">
                {activeThreadPost.text_content}
              </p>
            </div>

            {/* Lista de Respostas */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
              {activeThreadReplies.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  Nenhuma resposta ainda. Seja o primeiro a responder!
                </div>
              ) : (
                activeThreadReplies.map(reply => (
                  <div key={reply.id} className="flex gap-2.5 items-start">
                    <UserAvatar profile={reply.profiles || null} size="sm" className="!w-6 !h-6 mt-0.5" />
                    <div className="flex flex-col flex-1 min-w-0 bg-white border border-gray-100 rounded-xl p-2.5 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[var(--color-atelier-grafite)]">
                          {reply.profiles?.nome?.split(' ')?.[0] || 'Equipe'}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">
                          {new Date(reply.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-atelier-grafite)]/85 leading-relaxed">
                        {reply.text_content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Composer da Thread */}
            <div className="p-3 border-t border-gray-100 bg-white/70">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={threadComposerText}
                  onChange={e => setThreadComposerText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendThreadReply();
                    }
                  }}
                  placeholder="Responder na thread..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]"
                />
                <button
                  onClick={handleSendThreadReply}
                  disabled={!threadComposerText.trim() || isSendingThread}
                  className="p-2 bg-[var(--color-atelier-terracota)] text-white rounded-xl shadow-xs disabled:opacity-40"
                >
                  {isSendingThread ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ====================================================================== */}
      {/* 4. MODAL DAILY JAM: DEFINIR VIBE & BUSCA SPOTIFY                       */}
      {/* ====================================================================== */}
      <AnimatePresence>
        {isDailyJamModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/95 backdrop-blur-2xl border border-white rounded-[2rem] shadow-2xl p-6 w-full max-w-md relative"
            >
              <button
                onClick={() => setIsDailyJamModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-atelier-terracota)] text-white flex items-center justify-center">
                  <Headphones size={16} />
                </div>
                <div>
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">
                    Minha Vibe Hoje
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
                    Daily Jam · Studio Veronna
                  </span>
                </div>
              </div>

              {/* Escolha de Humor */}
              <div className="mb-5">
                <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-wider">
                  Como está seu humor hoje?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MOOD_OPTIONS.map(mood => (
                    <button
                      key={mood.id}
                      onClick={() => setSelectedMood(mood.id)}
                      className={`text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 border transition-all ${
                        selectedMood === mood.id
                          ? "border-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-bold shadow-2xs"
                          : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                      }`}
                    >
                      <span className="text-base">{mood.icon}</span>
                      <span className="truncate">{mood.label.split(' (')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Busca de Música no Spotify */}
              <div className="mb-5">
                <label className="text-xs font-bold text-gray-700 mb-2 block uppercase tracking-wider">
                  Trilha Sonora do Dia (Spotify)
                </label>
                
                {selectedSong ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <Music size={16} className="text-emerald-600 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-emerald-900 truncate">{selectedSong.name}</span>
                        <span className="text-[10px] text-emerald-700 truncate">{selectedSong.artist}</span>
                      </div>
                    </div>
                    <button onClick={() => setSelectedSong(null)} className="text-emerald-700 hover:text-red-500 p-1">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <form onSubmit={handleSearchSpotify} className="relative mb-2">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={spotifySearchQuery}
                        onChange={e => setSpotifySearchQuery(e.target.value)}
                        placeholder="Buscar música ou artista no Spotify..."
                        className="w-full bg-gray-50 border border-gray-200 focus:border-[var(--color-atelier-terracota)] rounded-xl py-2 pl-9 pr-16 text-xs text-[var(--color-atelier-grafite)] outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isSearchingSpotify}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[var(--color-atelier-grafite)] text-white text-[10px] font-bold rounded-lg hover:bg-[var(--color-atelier-terracota)] transition-colors"
                      >
                        {isSearchingSpotify ? <Loader2 size={12} className="animate-spin" /> : "Buscar"}
                      </button>
                    </form>

                    {/* Resultados da busca */}
                    {spotifyResults.length > 0 && (
                      <div className="border border-gray-100 rounded-xl overflow-hidden max-h-36 overflow-y-auto custom-scrollbar">
                        {spotifyResults.map(t => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setSelectedSong({ id: t.id, name: t.name, artist: t.artist });
                              setSpotifyResults([]);
                            }}
                            className="w-full flex items-center gap-2.5 p-2 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                          >
                            {t.albumArt && (
                              <img src={t.albumArt} alt="Capa" className="w-7 h-7 rounded object-cover shadow-2xs" />
                            )}
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs font-bold text-[var(--color-atelier-grafite)] truncate">{t.name}</span>
                              <span className="text-[10px] text-gray-500 truncate">{t.artist}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botões do Modal */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsDailyJamModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveVibe}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--color-atelier-terracota)] text-white text-xs font-bold tracking-wider uppercase hover:bg-[var(--color-atelier-terracota)]/90 transition-all shadow-xs"
                >
                  Salvar Vibe
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================== */}
      {/* 5. POPOVER PLAYER SPOTIFY DA EQUIPE (Ao clicar no chip do Daily Jam)   */}
      {/* ====================================================================== */}
      <AnimatePresence>
        {selectedVibeMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-xs z-[90] flex items-center justify-center p-4"
            onClick={() => setSelectedVibeMember(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-5 w-full max-w-sm relative"
            >
              <button
                onClick={() => setSelectedVibeMember(null)}
                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                <X size={15} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <UserAvatar profile={selectedVibeMember} size="md" className="!w-10 !h-10" />
                <div className="flex flex-col min-w-0">
                  <h4 className="font-bold text-sm text-[var(--color-atelier-grafite)] truncate">
                    {selectedVibeMember.nome}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span>{MOOD_OPTIONS.find(m => m.id === selectedVibeMember.current_mood)?.icon || '🎧'}</span>
                    <span className="truncate">{MOOD_OPTIONS.find(m => m.id === selectedVibeMember.current_mood)?.label || 'Sem vibe definida'}</span>
                  </div>
                </div>
              </div>

              {selectedVibeMember.current_song_id && selectedVibeMember.current_song_id !== "undefined" ? (
                <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  <iframe
                    src={`https://open.spotify.com/embed/track/${selectedVibeMember.current_song_id}?utm_source=generator&theme=0`}
                    width="100%"
                    height="80"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  Nenhuma faixa do Spotify compartilhada hoje.
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================== */}
      {/* 6. MODAL NOVA MENSAGEM DIRETA (DM)                                     */}
      {/* ====================================================================== */}
      <AnimatePresence>
        {isNewDMModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-white p-6 w-full max-w-sm relative"
            >
              <button
                onClick={() => setIsNewDMModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                <X size={16} />
              </button>

              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-1">
                Nova Mensagem Direta
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Selecione um membro da equipe para conversar em particular.
              </p>

              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                {teamMembers
                  .filter(m => m.id !== currentUser?.id)
                  .map(member => (
                    <button
                      key={member.id}
                      onClick={() => handleOpenDM(member.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-100"
                    >
                      <UserAvatar profile={member} size="sm" className="!w-8 !h-8" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-bold text-xs text-[var(--color-atelier-grafite)] truncate">
                          {member.nome}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                          {member.role}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-gray-300" />
                    </button>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================================== */}
      {/* 7. LIGHTBOX DE IMAGENS ANEXADAS                                        */}
      {/* ====================================================================== */}
      <AnimatePresence>
        {lightboxImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImageUrl(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 cursor-pointer"
          >
            <button
              onClick={() => setLightboxImageUrl(null)}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <img
              src={lightboxImageUrl}
              alt="Visualização"
              className="max-w-[90vw] max-h-[85vh] rounded-2xl shadow-2xl object-contain"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
