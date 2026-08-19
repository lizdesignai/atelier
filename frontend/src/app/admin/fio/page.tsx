// src/app/admin/fio/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash, Send, Paperclip, Image as ImageIcon,
  MessageCircle, Loader2, X, Search, Heart,
  CornerDownRight, Link as LinkIcon, Smile,
  FileText, ChevronDown, AtSign, Users, Headphones, Music
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import UserAvatar from "../../../components/global/UserAvatar";

// ============================================================================
// TIPOS
// ============================================================================
interface ProfileData {
  id: string;
  nome: string;
  avatar_url: string | null;
  role: string;
  current_mood?: string;
  current_song_id?: string;
}

interface FioChannel {
  id: string;
  name: string;
  type: string;
  project_id: string | null;
  is_private: boolean;
  created_at: string;
}

interface PostData {
  id: string;
  channel_id: string;
  sender_id: string;
  text_content: string | null;
  attachment_url: string | null;
  parent_id: string | null;
  created_at: string;
  profiles?: ProfileData;
}

interface ReactionData {
  emoji: string;
  count: number;
  users: string[];
  reacted: boolean;
}

const EMOJI_OPTIONS = ["🔥", "👏", "❤️", "😂", "🚀", "👀", "💡", "✅"];

const showToast = (msg: string) => window.dispatchEvent(new CustomEvent("showToast", { detail: msg }));

// ============================================================================
// HELPER: Render text with @mentions highlighted
// ============================================================================
function RichText({ text, isMe = false }: { text: string, isMe?: boolean }) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-ZÀ-ÿ0-9_]+)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} className={`font-bold px-1.5 py-0.5 rounded-md text-[12px] ${isMe ? 'bg-white/25 text-white shadow-sm border border-white/20' : 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20'}`}>
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
// COMPONENT: Single Post
// ============================================================================
function FioPost({
  post,
  replies,
  reactions,
  currentUser,
  onReact,
  onReply,
  allProfiles,
}: {
  post: PostData;
  replies: PostData[];
  reactions: Record<string, ReactionData>;
  currentUser: ProfileData | null;
  onReact: (postId: string, emoji: string) => void;
  onReply: (post: PostData) => void;
  allProfiles: ProfileData[];
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const timeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);

  const postReactions = Object.entries(reactions);

  const isMe = currentUser && post.sender_id === currentUser.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group w-full flex mb-6 ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex gap-3 max-w-[90%] sm:max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}>
        {/* Avatar */}
        <UserAvatar profile={post.profiles || null} size="md" className="!w-8 !h-8 !rounded-full shadow-sm border border-gray-100 shrink-0" />
        
        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0`}>
          {/* Header */}
          <div className={`flex items-baseline gap-1.5 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className="font-bold text-[12px] text-[var(--color-atelier-grafite)]/90 truncate">
              {post.profiles?.nome?.split(' ')[0] || "Anônimo"}
            </span>
            <span className="text-[10px] text-[var(--color-atelier-grafite)]/40 lowercase truncate">
              @{post.profiles?.nome?.split(' ')[0].toLowerCase() || "user"}
            </span>
            <span className="text-[9px] text-[var(--color-atelier-grafite)]/30 mx-1 shrink-0">
              {timeAgo(post.created_at)}
            </span>
          </div>

          {/* Bubble Content */}
          <div className={`relative px-4 py-3 shadow-sm text-[13.5px] leading-relaxed break-words
              ${isMe 
                ? 'bg-[var(--color-atelier-terracota)] text-white rounded-[20px] rounded-br-sm' 
                : 'bg-white border border-gray-100/60 text-[var(--color-atelier-grafite)] rounded-[20px] rounded-bl-sm'
              }
            `}>
            <div className={`${isMe ? 'text-white/90' : 'text-[var(--color-atelier-grafite)]/80'} [&_a]:underline`}>
              <RichText text={post.text_content || ""} isMe={isMe} />
            </div>

            {/* Attachment */}
            {post.attachment_url && (
              <div className="mt-3">
                {isImage(post.attachment_url) ? (
                  <img
                    src={post.attachment_url}
                    alt="Anexo"
                    className="max-w-full max-h-[250px] rounded-xl object-cover shadow-sm"
                  />
                ) : (
                  <a
                    href={post.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm ${
                      isMe 
                        ? 'bg-white/20 text-white hover:bg-white/30' 
                        : 'bg-gray-50 border border-gray-100 text-[var(--color-atelier-grafite)] hover:bg-gray-100'
                    }`}
                  >
                    <FileText size={14} className={isMe ? "text-white" : "text-[var(--color-atelier-terracota)]"} />
                    Abrir Anexo
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Actions Row */}
          <div className={`flex items-center gap-1 mt-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} opacity-0 group-hover:opacity-100 transition-opacity`}>
              {/* Reactions display */}
              {postReactions.length > 0 && (
                <div className="flex items-center gap-1 mr-2">
                  {postReactions.map(([emoji, data]) => (
                    <button
                      key={emoji}
                      onClick={() => onReact(post.id, emoji)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition-all ${
                        data.reacted
                          ? "bg-[var(--color-atelier-terracota)]/10 border-[var(--color-atelier-terracota)]/20 text-[var(--color-atelier-terracota)]"
                          : "bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      <span>{emoji}</span>
                      <span className="font-bold text-[10px]">{data.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Add reaction */}
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--color-atelier-terracota)] hover:bg-[var(--color-atelier-terracota)]/5 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Smile size={16} />
                </button>
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute bottom-full left-0 mb-1 bg-white border border-gray-100 rounded-2xl shadow-xl p-2 flex gap-1 z-50"
                    >
                      {EMOJI_OPTIONS.map((em) => (
                        <button
                          key={em}
                          onClick={() => {
                            onReact(post.id, em);
                            setShowEmojiPicker(false);
                          }}
                          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-base transition-colors"
                        >
                          {em}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Reply button */}
              <button
                onClick={() => {
                  if (replies.length > 0) setShowReplies(!showReplies);
                  onReply(post);
                }}
                className="flex items-center gap-1.5 p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100"
              >
                <MessageCircle size={16} />
                {replies.length > 0 && (
                  <span className="text-[10px] font-bold">{replies.length}</span>
                )}
              </button>

            </div>

            {/* Thread Replies */}
            {replies.length > 0 && !showReplies && (
              <button
                onClick={() => setShowReplies(true)}
                className="flex items-center gap-2 mt-3 text-[11px] font-bold text-blue-500 hover:text-blue-600 transition-colors"
              >
                <div className="flex -space-x-1.5">
                  {replies
                    .slice(0, 3)
                    .map((r, i) => (
                      <UserAvatar
                        key={i}
                        profile={r.profiles || null}
                        size="sm"
                        className="!w-5 !h-5 !rounded-md border-2 !border-white"
                      />
                    ))}
                </div>
                {replies.length} {replies.length === 1 ? "resposta" : "respostas"}
                <ChevronDown size={12} />
              </button>
            )}

            <AnimatePresence>
              {showReplies && replies.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pl-4 border-l-2 border-[var(--color-atelier-terracota)]/20 flex flex-col gap-3">
                    {replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3">
                        <UserAvatar
                          profile={reply.profiles || null}
                          size="sm"
                          className="!w-7 !h-7 !rounded-lg mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-xs text-[var(--color-atelier-grafite)]">
                              {reply.profiles?.nome || "Anônimo"}
                            </span>
                            <span className="text-[9px] text-[var(--color-atelier-grafite)]/30">
                              {timeAgo(reply.created_at)}
                            </span>
                          </div>
                          <div className="text-[12px] text-[var(--color-atelier-grafite)]/70 leading-relaxed whitespace-pre-wrap mt-0.5">
                            <RichText text={reply.text_content || ""} />
                          </div>
                          {reply.attachment_url && (
                            <div className="mt-2">
                              {isImage(reply.attachment_url) ? (
                                <img src={reply.attachment_url} alt="Anexo" className="max-w-[200px] max-h-[150px] rounded-xl border border-gray-100 object-cover" />
                              ) : (
                                <a href={reply.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--color-atelier-terracota)] hover:underline">
                                  <FileText size={12} /> Anexo
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
    </motion.div>
  );
}

// ============================================================================
// PAGE: Fio Principal
// ============================================================================
export default function FioPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<ProfileData | null>(null);
  const [allProfiles, setAllProfiles] = useState<ProfileData[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  // Fios (Channels)
  const [fios, setFios] = useState<FioChannel[]>([]);
  const [activeFioId, setActiveFioId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Posts (Messages)
  const [posts, setPosts] = useState<PostData[]>([]);
  const [reactions, setReactions] = useState<Record<string, Record<string, ReactionData>>>({});

  // Composer
  const [composerText, setComposerText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<PostData | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mention Autocomplete
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");

  // Unread
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Spotify
  const [isSpotifyModalOpen, setIsSpotifyModalOpen] = useState(false);
  const [spotifySearchQuery, setSpotifySearchQuery] = useState("");
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState(false);

  // ========================================
  // BOOT
  // ========================================
  useEffect(() => {
    const boot = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        setCurrentUser(profile as ProfileData);

        const { data: profiles } = await supabase.from("profiles").select("id, nome, avatar_url, role, current_mood, current_song_id").in("role", ["admin", "gestor", "colaborador"]).order("nome");
        if (profiles) setAllProfiles(profiles as ProfileData[]);

        try {
          const clientsRes = await fetch("/api/clients");
          if (clientsRes.ok) {
            const { clients } = await clientsRes.json();
            if (clients) setClients(clients);
          }
        } catch (e) {
          console.error("Erro ao carregar clientes", e);
        }

        // Fetch or create Fio channels
        await loadFios();

        // Fetch unread counts
        const { data: unreadData } = await supabase.rpc("get_unread_counts_per_channel");
        if (unreadData) {
          const map: Record<string, number> = {};
          unreadData.forEach((item: any) => { map[item.channel_id] = item.unread_count; });
          setUnreadCounts(map);
        }
      } catch (error) {
        console.error("[Fio] Boot error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    boot();
  }, []);

  const loadFios = async () => {
    // Get existing fio channels
    let { data: fioChannels } = await supabase.from("channels").select("*").in("type", ["fio_geral", "fio_cliente"]).order("created_at", { ascending: true });

    // Ensure the general channel exists
    let generalChannel = fioChannels?.find((c: any) => c.type === "fio_geral");
    if (!generalChannel) {
      const { data: newCh } = await supabase.from("channels").insert({ name: "operacao-atelier", type: "fio_geral", is_private: false }).select().single();
      generalChannel = newCh;
      fioChannels = [generalChannel, ...(fioChannels || [])];
    }

    if (fioChannels) {
      setFios(fioChannels as FioChannel[]);
      if (!activeFioId) setActiveFioId(generalChannel?.id || fioChannels[0]?.id || null);
    }
  };

  // ========================================
  // FETCH POSTS + REACTIONS
  // ========================================
  const fetchPosts = useCallback(async () => {
    if (!activeFioId) { setPosts([]); return; }

    const { data, error } = await supabase
      .from("messages")
      .select("*, profiles(id, nome, avatar_url, role)")
      .eq("channel_id", activeFioId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const formatted = data.map((m: any) => ({
        ...m,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
      })) as PostData[];
      setPosts(formatted);
    }

    // Fetch reactions for these posts
    const { data: rxData } = await supabase
      .from("message_reactions")
      .select("*")
      .in("message_id", data?.map((m: any) => m.id) || []);

    if (rxData && currentUser) {
      const rxMap: Record<string, Record<string, ReactionData>> = {};
      rxData.forEach((rx: any) => {
        if (!rxMap[rx.message_id]) rxMap[rx.message_id] = {};
        if (!rxMap[rx.message_id][rx.emoji]) {
          rxMap[rx.message_id][rx.emoji] = { emoji: rx.emoji, count: 0, users: [], reacted: false };
        }
        rxMap[rx.message_id][rx.emoji].count++;
        rxMap[rx.message_id][rx.emoji].users.push(rx.user_id);
        if (rx.user_id === currentUser.id) rxMap[rx.message_id][rx.emoji].reacted = true;
      });
      setReactions(rxMap);
    }

    // Mark as read
    if (currentUser) {
      await supabase.from("channel_reads").upsert(
        { channel_id: activeFioId, user_id: currentUser.id, last_read_at: new Date().toISOString() },
        { onConflict: "channel_id, user_id" }
      );
      setUnreadCounts((prev) => ({ ...prev, [activeFioId]: 0 }));
    }
  }, [activeFioId, currentUser]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // ========================================
  // REALTIME
  // ========================================
  useEffect(() => {
    if (!activeFioId) return;
    const sub = supabase
      .channel(`fio-${activeFioId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${activeFioId}` }, (payload) => {
        if (payload.new.sender_id !== currentUser?.id) fetchPosts();
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeFioId, currentUser, fetchPosts]);

  // Global unread listener
  useEffect(() => {
    if (!currentUser) return;
    const sub = supabase.channel("fio_unread_global")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload: any) => {
        if (payload.new.sender_id !== currentUser.id && payload.new.channel_id !== activeFioId) {
          setUnreadCounts((prev) => ({
            ...prev,
            [payload.new.channel_id]: (prev[payload.new.channel_id] || 0) + 1,
          }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [currentUser, activeFioId]);

  // ========================================
  // ACTIONS
  // ========================================
  const handleSendPost = async () => {
    if (!composerText.trim() || !activeFioId || !currentUser || isSending) return;
    setIsSending(true);
    const text = composerText;
    setComposerText("");
    const parentId = replyingTo?.id || null;
    setReplyingTo(null);

    // Optimistic insert
    const tempPost: PostData = {
      id: `temp-${Date.now()}`,
      channel_id: activeFioId,
      sender_id: currentUser.id,
      text_content: text,
      attachment_url: null,
      parent_id: parentId,
      created_at: new Date().toISOString(),
      profiles: currentUser,
    };
    setPosts((prev) => [tempPost, ...prev]);

    const { error } = await supabase.from("messages").insert({
      channel_id: activeFioId,
      sender_id: currentUser.id,
      text_content: text,
      parent_id: parentId,
    });

    if (error) {
      setPosts((prev) => prev.filter((p) => p.id !== tempPost.id));
      showToast("Erro ao enviar post.");
    } else {
      fetchPosts();

      // Notify Mentions & General Channel Members
      const mentions = text.match(/(@[a-zA-ZÀ-ÿ0-9_]+)/g);
      const mentionedIds = new Set<string>();
      if (mentions) {
        mentions.forEach(mention => {
          const name = mention.substring(1).trim().toLowerCase();
          const user = allProfiles.find(p => p.nome.split(" ")[0].toLowerCase() === name);
          if (user && user.id !== currentUser.id) {
             mentionedIds.add(user.id);
             import("../../../lib/NotificationEngine").then(({ NotificationEngine }) => {
               NotificationEngine.notifyUserWithEmail(
                 user.id,
                 `Menção na Sintonia`,
                 `${currentUser.nome} mencionou você.`,
                 user.role === 'cliente' ? 'chat_activity' : 'custom_collaborator',
                 { link: user.role === 'cliente' ? '/canais' : '/admin/fio', clientName: currentUser.nome }
               );
             });
          }
        });
      }

      // General Channel Notifications (Fio Cliente)
      const currentFio = fios.find(f => f.id === activeFioId);
      if (currentFio && currentFio.type === "fio_cliente") {
        const clientId = currentFio.project_id;
        
        import("../../../lib/NotificationEngine").then(({ NotificationEngine }) => {
          if (currentUser.id === clientId) {
            // Se o Cliente enviou a mensagem, notifica a Gestão (se a Gestão já não foi mencionada)
            // notifyManagement notifica todos os admins/gestores, então deixamos disparar de forma geral
            NotificationEngine.notifyManagement(
              "Nova mensagem do Cliente",
              `${currentUser.nome} enviou uma mensagem na Sintonia.`,
              "info",
              "/admin/fio"
            );
          } else {
            // Se a Equipe enviou a mensagem, notifica o Cliente (apenas se ele não tiver sido mencionado diretamente)
            if (!mentionedIds.has(clientId)) {
              NotificationEngine.notifyUserWithEmail(
                clientId,
                "Sintonia Atualizada",
                `${currentUser.nome} enviou uma mensagem na sua Sintonia.`,
                "chat_activity",
                { link: "/canais", clientName: currentUser.nome }
              );
            }
          }
        });
      }
    }
    setIsSending(false);
  };

  const handleReact = async (postId: string, emoji: string) => {
    if (!currentUser) return;
    const existing = reactions[postId]?.[emoji];
    if (existing?.reacted) {
      await supabase.from("message_reactions").delete().eq("message_id", postId).eq("user_id", currentUser.id).eq("emoji", emoji);
    } else {
      await supabase.from("message_reactions").insert({ message_id: postId, user_id: currentUser.id, emoji });
    }
    fetchPosts();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeFioId || !currentUser) return;
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${activeFioId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("chat_attachments").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("chat_attachments").getPublicUrl(filePath);

      await supabase.from("messages").insert({
        channel_id: activeFioId,
        sender_id: currentUser.id,
        text_content: composerText.trim() || " ",
        attachment_url: urlData.publicUrl,
        parent_id: replyingTo?.id || null,
      });
      setComposerText("");
      setReplyingTo(null);
      showToast("Anexo compartilhado!");
      fetchPosts();
    } catch {
      showToast("Falha no envio do anexo.");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

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
        if (data.error) showToast(data.error);
      }
    } catch {
      showToast("Erro ao buscar música");
    } finally {
      setIsSearchingSpotify(false);
    }
  };

  const handleSelectSpotifyTrack = async (trackId: string) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase.from('profiles').update({ current_song_id: trackId }).eq('id', currentUser.id);
      if (error) throw error;
      setCurrentUser({ ...currentUser, current_song_id: trackId });
      setAllProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, current_song_id: trackId } : p));
      setIsSpotifyModalOpen(false);
      showToast("Sintonia musical atualizada!");
    } catch {
      showToast("Erro ao salvar música");
    }
  };

  const handleCreateClientFio = async (projectId: string, clientName: string) => {
    const slug = clientName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const exists = fios.find((f) => f.project_id === projectId);
    if (exists) {
      setActiveFioId(exists.id);
      return;
    }
    const { data } = await supabase.from("channels").insert({ name: slug, type: "fio_cliente", project_id: projectId, is_private: true }).select().single();
    if (data) {
      setFios((prev) => [...prev, data as FioChannel]);
      setActiveFioId(data.id);
    }
  };

  // Mention logic
  const handleComposerChange = (value: string) => {
    setComposerText(value);
    const lastAt = value.lastIndexOf("@");
    if (lastAt >= 0 && lastAt === value.length - 1) {
      setShowMentions(true);
      setMentionFilter("");
    } else if (lastAt >= 0) {
      const after = value.slice(lastAt + 1);
      if (!after.includes(" ")) {
        setShowMentions(true);
        setMentionFilter(after.toLowerCase());
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (name: string) => {
    const lastAt = composerText.lastIndexOf("@");
    const before = composerText.slice(0, lastAt);
    setComposerText(`${before}@${name} `);
    setShowMentions(false);
    composerRef.current?.focus();
  };

  // ========================================
  // DATA DERIVATION
  // ========================================
  const activeFio = fios.find((f) => f.id === activeFioId);
  const topLevelPosts = posts.filter((p) => !p.parent_id);
  const getReplies = (postId: string) => posts.filter((p) => p.parent_id === postId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const activeJamMembers = allProfiles.filter(p => (p.current_song_id || p.current_mood));

  const fioGeral = fios.find((f) => f.type === "fio_geral");
  const fiosCliente = fios.filter((f) => f.type === "fio_cliente");

  const filteredClients = clients.filter((c: any) => {
    const clientName = c.nome || "";
    return clientName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getClientNameForFio = (fio: FioChannel) => {
    const client = clients.find((c: any) => c.id === fio.project_id);
    return client ? client.nome : fio.name;
  };

  const getMoodGradient = (mood?: string) => {
    switch (mood?.toLowerCase()) {
      case "focado": return "from-blue-500/30 via-cyan-400/20 to-transparent";
      case "criativo": return "from-purple-500/30 via-pink-400/20 to-transparent";
      case "animado": return "from-orange-500/30 via-yellow-400/20 to-transparent";
      case "zen": return "from-emerald-500/30 via-teal-400/20 to-transparent";
      case "cansado": return "from-gray-500/30 via-gray-400/20 to-transparent";
      case "estressado": return "from-red-500/30 via-rose-400/20 to-transparent";
      default: return "from-[var(--color-atelier-terracota)]/20 via-[var(--color-atelier-grafite)]/10 to-transparent";
    }
  };

  const formatMessageDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Hoje";
    if (d.toDateString() === yesterday.toDateString()) return "Ontem";
    
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  };

  // ========================================
  // RENDER
  // ========================================
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-transparent">
        <Loader2 size={40} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-60px)] w-full p-4 sm:p-6 gap-4 sm:gap-6 bg-transparent overflow-hidden">
      {/* ========== SIDEBAR: Sintonias ========== */}
      <div className="hidden lg:flex flex-col w-[320px] gap-4 shrink-0">
        
        {/* WIDGET COLABORADOR */}
        <aside className="glass-panel border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2rem] flex-col overflow-hidden shrink-0 bg-white/60 backdrop-blur-xl p-6 relative">
          <div className={`absolute inset-0 bg-gradient-to-br ${getMoodGradient(currentUser?.current_mood)} animate-pulse opacity-60 z-0`}></div>
          <div className="relative z-10 flex flex-col gap-4 items-center text-center">
            <UserAvatar profile={currentUser} size="lg" className="!w-20 !h-20 !rounded-3xl shadow-md border-2 border-white" />
            <div className="flex flex-col min-w-0">
               <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)] truncate leading-none">{currentUser?.nome}</span>
            </div>
          </div>
        </aside>

        {/* WIDGET DAILY JAM DA EQUIPE */}
        <aside className="glass-panel border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2rem] flex-col overflow-hidden shrink-0 bg-white/60 backdrop-blur-xl flex max-h-[350px]">
          <div className="p-5 pb-4 border-b border-[var(--color-atelier-grafite)]/5 shrink-0 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-atelier-terracota)] flex items-center justify-center text-white shadow-sm shrink-0">
              <Headphones size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-none truncate">Daily Jam</h2>
              <span className="text-[8px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 truncate block">Vibe da Equipe</span>
            </div>
            <button 
              onClick={() => setIsSpotifyModalOpen(true)}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-400 hover:text-[var(--color-atelier-terracota)] hover:bg-[var(--color-atelier-terracota)]/10 transition-colors shadow-sm border border-gray-100"
              title="Adicionar Música"
            >
              <Music size={14} />
            </button>
          </div>
          
          <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
            {activeJamMembers.length === 0 ? (
              <div className="text-center py-4 opacity-50 flex flex-col items-center justify-center h-full">
                <Music size={20} className="mb-2 text-gray-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Ninguém na pista</span>
              </div>
            ) : (
              activeJamMembers.map(member => (
                member.current_song_id && member.current_song_id !== 'undefined' ? (
                  <div key={member.id} className="relative mt-1">
                    <div className="absolute -left-1 -top-2 z-20 shadow-md rounded-full bg-white">
                      <UserAvatar profile={member} size="sm" className="!w-7 !h-7 border-2 border-white" />
                    </div>
                    <div className="w-full rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100 relative z-10 hover:border-[var(--color-atelier-terracota)]/30 transition-colors" style={{ height: '80px' }}>
                      <iframe src={`https://open.spotify.com/embed/track/${member.current_song_id}?utm_source=generator&theme=0`} width="100%" height="80" frameBorder="0" allowFullScreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style={{ display: 'block', height: '80px' }}></iframe>
                    </div>
                  </div>
                ) : (
                  <div key={member.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/60 border border-gray-100 shadow-sm hover:border-[var(--color-atelier-terracota)]/30 transition-colors relative overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${getMoodGradient(member.current_mood)} opacity-10 pointer-events-none`}></div>
                    <UserAvatar profile={member} size="sm" className="!w-7 !h-7 relative z-10" />
                    <span className="font-bold text-[11px] text-[var(--color-atelier-grafite)] truncate relative z-10 flex-1">{member.nome}</span>
                    {member.current_mood && (
                      <span className="text-[9px] text-[var(--color-atelier-grafite)]/60 uppercase tracking-widest font-bold relative z-10 bg-white/80 px-2 py-1 rounded-md shadow-sm">
                        {member.current_mood}
                      </span>
                    )}
                  </div>
                )
              ))
            )}
          </div>
        </aside>

        {/* LISTA DE SINTONIAS */}
        <aside className="glass-panel border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2rem] flex-col overflow-hidden flex-1 bg-white/60 backdrop-blur-xl flex">
          {/* Header & Search */}
          <div className="p-5 pb-4 border-b border-[var(--color-atelier-grafite)]/5 shrink-0">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-atelier-terracota)] flex items-center justify-center text-white shadow-sm">
                <MessageCircle size={18} />
              </div>
              <div>
                <h2 className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-none">Sintonia</h2>
              <span className="text-[8px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/30">Comunicação Interna</span>
            </div>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filtrar sintonias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/80 border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-2 pl-9 pr-3 text-[11px] font-bold text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-1">
          {/* Fio Geral */}
          {fioGeral && (
            <>
              <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/30 px-2 mb-1">Geral</span>
              <button
                onClick={() => setActiveFioId(fioGeral.id)}
                className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center gap-3 transition-all border ${
                  activeFioId === fioGeral.id
                    ? "bg-[var(--color-atelier-terracota)] text-white border-[var(--color-atelier-terracota)] shadow-md"
                    : "bg-transparent text-[var(--color-atelier-grafite)]/80 border-transparent hover:bg-white/70"
                }`}
              >
                <Hash size={16} className={activeFioId === fioGeral.id ? "text-white/60" : "text-[var(--color-atelier-terracota)]"} />
                <span className="font-bold text-[12px] truncate flex-1">{fioGeral.name}</span>
                {(unreadCounts[fioGeral.id] || 0) > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                    {unreadCounts[fioGeral.id]}
                  </span>
                )}
              </button>
            </>
          )}

          {/* Fios de Clientes */}
          <div className="mt-4">
            <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/30 px-2 mb-2 block">Clientes</span>

            {/* Existing client fios */}
            {fiosCliente.map((fio) => (
              <button
                key={fio.id}
                onClick={() => setActiveFioId(fio.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 transition-all border mb-1 ${
                  activeFioId === fio.id
                    ? "bg-white text-[var(--color-atelier-grafite)] border-[var(--color-atelier-terracota)]/30 shadow-sm"
                    : "bg-transparent text-[var(--color-atelier-grafite)]/70 border-transparent hover:bg-white/60"
                }`}
              >
                <Hash size={14} className="text-gray-400 shrink-0" />
                <span className="font-bold text-[11px] truncate flex-1">{getClientNameForFio(fio)}</span>
                {(unreadCounts[fio.id] || 0) > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                    {unreadCounts[fio.id]}
                  </span>
                )}
              </button>
            ))}

            {/* Botão Criar Novo Canal */}
            <button
              onClick={() => showToast('Ferramenta de criação de canais em desenvolvimento!')}
              className="w-full text-left px-3.5 py-3 rounded-xl flex items-center gap-3 transition-all border border-dashed border-[var(--color-atelier-grafite)]/20 hover:border-[var(--color-atelier-terracota)]/40 hover:bg-[var(--color-atelier-terracota)]/5 text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] mt-3"
            >
              <div className="w-6 h-6 rounded-lg bg-[var(--color-atelier-grafite)]/5 flex items-center justify-center shrink-0">
                <span className="font-bold text-[16px] leading-none mb-0.5">+</span>
              </div>
              <span className="font-bold text-[11px] uppercase tracking-widest truncate flex-1">Criar Novo Canal</span>
            </button>
          </div>
        </div>
        </aside>
      </div>

      {/* ========== MAIN: Feed ========== */}
      <main className="flex-1 glass-panel border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2rem] flex flex-col overflow-hidden bg-white/40 backdrop-blur-2xl">
        {/* Feed Header */}
        <div className="bg-white/50 backdrop-blur-xl border-b border-[var(--color-atelier-grafite)]/10 px-5 sm:px-8 py-4 sm:py-5 flex items-center gap-4 shrink-0">
          <div className="w-11 h-11 rounded-xl bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0">
            <Hash size={22} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="font-elegant text-2xl sm:text-3xl text-[var(--color-atelier-grafite)] leading-none truncate">
              {activeFio?.name || "Sintonia"}
            </h1>
            <span className="text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/30 mt-1">
              {activeFio?.type === "fio_geral" ? "Canal Geral da Operação" : "Sintonia do Cliente"}
            </span>
          </div>

          {/* Mobile fio selector */}
          <div className="lg:hidden ml-auto relative">
            <select
              value={activeFioId || ""}
              onChange={(e) => setActiveFioId(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[var(--color-atelier-grafite)] outline-none"
            >
              {fios.map((f) => (
                <option key={f.id} value={f.id}>
                  # {f.type === "fio_geral" ? f.name : getClientNameForFio(f)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 flex flex-col-reverse custom-scrollbar" id="feed-container">
          {topLevelPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50 p-8">
              <div className="w-20 h-20 bg-[var(--color-atelier-grafite)]/5 rounded-full flex items-center justify-center mb-5 border border-[var(--color-atelier-grafite)]/10">
                <MessageCircle size={36} className="text-[var(--color-atelier-terracota)]" />
              </div>
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Sintonia em Silêncio</h3>
              <p className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 mt-2 max-w-xs">
                Seja o primeiro a compartilhar uma atualização neste canal.
              </p>
            </div>
          ) : (
            topLevelPosts.map((post, index) => {
              const currentPostDate = new Date(post.created_at).toDateString();
              const nextPostInArray = topLevelPosts[index + 1]; // next in array is OLDER because array is newest-first
              const nextPostDate = nextPostInArray ? new Date(nextPostInArray.created_at).toDateString() : null;
              
              const isOldestOfDay = currentPostDate !== nextPostDate;

              return (
                <React.Fragment key={post.id}>
                  <FioPost
                    post={post}
                    replies={getReplies(post.id)}
                    reactions={reactions[post.id] || {}}
                    currentUser={currentUser}
                    onReact={handleReact}
                    onReply={(p) => {
                      setReplyingTo(p);
                      composerRef.current?.focus();
                    }}
                    allProfiles={allProfiles}
                  />
                  {isOldestOfDay && (
                    <div className="w-full flex justify-center my-6 opacity-80">
                      <div className="bg-white/80 backdrop-blur-md border border-[var(--color-atelier-grafite)]/10 text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)] px-4 py-1.5 rounded-full shadow-sm">
                        {formatMessageDate(post.created_at)}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Composer */}
        <div className="px-5 sm:px-8 py-4 border-t border-[var(--color-atelier-grafite)]/5 bg-white/30 shrink-0">
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2 bg-blue-50 border border-blue-100 px-3 py-2 rounded-xl">
              <CornerDownRight size={14} className="text-blue-500 shrink-0" />
              <span className="text-[11px] text-blue-600 font-bold truncate flex-1">
                Respondendo a {replyingTo.profiles?.nome || "post"}
              </span>
              <button onClick={() => setReplyingTo(null)} className="text-blue-400 hover:text-red-500 p-0.5">
                <X size={14} />
              </button>
            </div>
          )}
          <div className="relative">
            <textarea
              ref={composerRef}
              rows={2}
              value={composerText}
              onChange={(e) => handleComposerChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendPost();
                }
              }}
              placeholder={replyingTo ? "Escreva sua resposta..." : "O que está acontecendo na operação?"}
              className="w-full bg-white/80 border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-[1.5rem] py-4 px-5 pr-[110px] text-[14px] text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all resize-none font-roboto placeholder:text-gray-400"
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-[var(--color-atelier-terracota)] hover:bg-[var(--color-atelier-terracota)]/5 transition-all"
              >
                {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
              </button>
              <button
                onClick={handleSendPost}
                disabled={!composerText.trim() || isSending}
                className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)] text-white flex items-center justify-center shadow-md disabled:opacity-30 hover:bg-[var(--color-atelier-terracota)]/80 transition-all hover:scale-105 active:scale-95"
              >
                {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-1" />}
              </button>
            </div>

            {/* Mentions Autocomplete */}
            <AnimatePresence>
              {showMentions && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full left-0 w-full max-w-[280px] mb-1 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-[180px] overflow-y-auto z-50"
                >
                  {allProfiles
                    .filter((p) => p.nome.toLowerCase().includes(mentionFilter))
                    .slice(0, 6)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => insertMention(p.nome.split(" ")[0])}
                        className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <UserAvatar profile={p} size="sm" className="!w-7 !h-7 !rounded-lg" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[var(--color-atelier-grafite)]">{p.nome}</span>
                          <span className="text-[9px] text-gray-400 uppercase tracking-widest">{p.role}</span>
                        </div>
                      </button>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ================= MODAL SPOTIFY ================= */}
      <AnimatePresence>
        {isSpotifyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[var(--color-atelier-grafite)]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/90 backdrop-blur-2xl border border-white rounded-[2rem] shadow-2xl p-6 w-full max-w-md relative"
            >
              <button
                onClick={() => setIsSpotifyModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={18} />
              </button>

              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-1">Música do Dia</h3>
              <p className="text-[11px] text-gray-500 mb-6">Busque uma música no Spotify para ser a trilha sonora da sua sintonia.</p>

              <form onSubmit={handleSearchSpotify} className="relative mb-6">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nome da música ou artista..."
                  value={spotifySearchQuery}
                  onChange={(e) => setSpotifySearchQuery(e.target.value)}
                  className="w-full bg-white/50 border border-gray-200 focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3 pl-11 pr-4 text-[12px] font-bold text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all"
                />
                <button
                  type="submit"
                  disabled={isSearchingSpotify}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[var(--color-atelier-grafite)] text-white rounded-lg hover:bg-[var(--color-atelier-terracota)] transition-colors disabled:opacity-50"
                >
                  {isSearchingSpotify ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </form>

              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {spotifyResults.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => handleSelectSpotifyTrack(track.id)}
                    className="flex items-center gap-3 w-full text-left p-2 rounded-xl hover:bg-white/80 border border-transparent hover:border-gray-100 transition-all group"
                  >
                    {track.albumImageUrl && (
                      <img src={track.albumImageUrl} alt="Album Art" className="w-10 h-10 rounded-md object-cover shadow-sm group-hover:scale-105 transition-transform" />
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[12px] font-bold text-[var(--color-atelier-grafite)] truncate">{track.name}</span>
                      <span className="text-[10px] text-gray-500 truncate">{track.artist}</span>
                    </div>
                  </button>
                ))}
                {spotifyResults.length === 0 && spotifySearchQuery && !isSearchingSpotify && (
                  <div className="text-center py-6 text-gray-400 text-xs">Nenhuma música encontrada.</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
