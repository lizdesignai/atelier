// src/app/comunidade/page.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Globe2,
  HelpCircle,
  MessageSquare,
  FlaskConical,
  Trophy,
  Handshake,
  Lightbulb,
  BookOpen,
  Calendar,
  Users,
  Search,
  Send,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  X,
  ImageIcon,
  Link2,
  ShieldCheck,
  Award,
  Radio,
  MapPin,
  ArrowRight,
  Flag,
  Lock,
  CornerDownRight,
  SlidersHorizontal,
  Plus,
  Loader2,
  Compass,
  HeartHandshake,
  Eye,
  Activity,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { NotificationEngine } from "../../lib/NotificationEngine";
import { normalizeImageUrl, handleAvatarError } from "../../lib/imageUtils";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ============================================================================
// DEFINIÇÕES ESTRUTURAIS DO VÊNETO (Briefing Seções 4, 5, 6, 7, 9, 10, 11, 14)
// ============================================================================

export type PostTypeKey =
  | "duvida"
  | "discussao"
  | "feedback"
  | "conquista"
  | "parceria"
  | "aprendizado"
  | "nota_estudio";

const POST_TYPES: Array<{
  id: PostTypeKey;
  label: string;
  shortLabel: string;
  subtitle: string;
  icon: any;
  badgeClass: string;
  defaultArea: string;
  adminOnly?: boolean;
}> = [
  {
    id: "duvida",
    label: "Tenho uma dúvida",
    shortLabel: "Dúvida",
    subtitle: "Preciso de ajuda para resolver algo.",
    icon: HelpCircle,
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    defaultArea: "trocas",
  },
  {
    id: "discussao",
    label: "Quero discutir",
    shortLabel: "Discussão",
    subtitle: "Tenho uma ideia ou opinião.",
    icon: MessageSquare,
    badgeClass: "bg-stone-100 text-stone-700 border-stone-200",
    defaultArea: "agora",
  },
  {
    id: "feedback",
    label: "Quero feedback",
    shortLabel: "Feedback",
    subtitle: "Quero uma avaliação sobre meu trabalho.",
    icon: FlaskConical,
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
    defaultArea: "laboratorio",
  },
  {
    id: "conquista",
    label: "Compartilhar conquista",
    shortLabel: "Conquista",
    subtitle: "Quero mostrar algo que consegui realizar.",
    icon: Trophy,
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    defaultArea: "agora",
  },
  {
    id: "parceria",
    label: "Oferecer ou buscar",
    shortLabel: "Parceria",
    subtitle: "Procuro parceiro, fornecedor ou oportunidade.",
    icon: Handshake,
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    defaultArea: "pessoas",
  },
  {
    id: "aprendizado",
    label: "Compartilhar aprendizado",
    shortLabel: "Aprendizado",
    subtitle: "Descobri algo útil para outras pessoas.",
    icon: Lightbulb,
    badgeClass: "bg-orange-50 text-orange-800 border-orange-200",
    defaultArea: "agora",
  },
  {
    id: "nota_estudio",
    label: "Nota",
    shortLabel: "Nota",
    subtitle: "Análise prática, princípio e síntese aplicável.",
    icon: BookOpen,
    badgeClass: "bg-[var(--color-atelier-terracota)]/15 text-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)]/30",
    defaultArea: "estudio",
  },
];

const FEEDBACK_ASPECT_OPTIONS = [
  "Clareza da proposta",
  "Posicionamento & Tom de voz",
  "Identidade visual",
  "Copy & Narrativa",
  "Estrutura comercial / Preço",
  "Presença no Instagram",
];

const TOPIC_TAG_OPTIONS = [
  "Posicionamento",
  "Comercial",
  "Percepção de Valor",
  "Identidade Visual",
  "Presença Digital",
  "Gestão de Instagram",
  "Operação & Processos",
  "Parcerias B2B",
];

const ONBOARDING_OBJECTIVES = [
  "Aprender e trocar experiências",
  "Receber feedback",
  "Conhecer outros empreendedores",
  "Encontrar parceiros",
  "Divulgar meu trabalho",
  "Acompanhar conteúdos da Liz",
];

const RECOGNITION_BADGES: Record<
  "ajuda_util" | "curadoria" | "colaboracao" | "acolhimento",
  { label: string; desc: string; color: string }
> = {
  ajuda_util: {
    label: "Ajuda útil",
    desc: "Respostas marcadas como solução ou que resolveram um problema real.",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  curadoria: {
    label: "Curadoria",
    desc: "Referências, materiais ou sínteses consideradas valiosas pelos membros.",
    color: "bg-amber-50 text-amber-800 border-amber-200",
  },
  colaboracao: {
    label: "Colaboração",
    desc: "Apoio a projetos no Laboratório, revisões ou iniciativas em conjunto.",
    color: "bg-purple-50 text-purple-800 border-purple-200",
  },
  acolhimento: {
    label: "Acolhimento",
    desc: "Contribuição para a integração e participação de novos membros.",
    color: "bg-rose-50 text-rose-800 border-rose-200",
  },
};

const WEEKLY_RITUALS = [
  {
    day: "SEG",
    name: "Pergunta da semana",
    desc: "Um tema que convida os membros a compartilhar desafios, ideias e experiências reais.",
    postType: "discussao" as PostTypeKey,
  },
  {
    day: "TER",
    name: "Clínica Vêneto",
    desc: "Um membro apresenta um problema de marca, conteúdo ou negócio. A comunidade constrói alternativas.",
    postType: "feedback" as PostTypeKey,
  },
  {
    day: "QUA",
    name: "Nota do Estúdio",
    desc: "A Liz publica um insight aplicável, análise ou tutorial e convida a comunidade a discutir.",
    postType: "aprendizado" as PostTypeKey,
  },
  {
    day: "QUI",
    name: "Encontro aberto",
    desc: "Sessão ao vivo, roda de networking ou espaço de perguntas em horários programados.",
    postType: "parceria" as PostTypeKey,
  },
  {
    day: "SEX",
    name: "O que avançou?",
    desc: "Publicação coletiva para compartilhar aprendizados, conquistas, trabalhos concluídos e próximos desafios.",
    postType: "conquista" as PostTypeKey,
  },
];

export default function VenetoComunidadePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Normaliza destino ativo (compatível com links antigos ?grupo=networking ou ?grupo=feedback)
  const rawArea = searchParams?.get("area") || searchParams?.get("grupo") || "agora";
  const activeArea =
    rawArea === "global"
      ? "agora"
      : rawArea === "networking"
      ? "pessoas"
      : rawArea === "feedback"
      ? "laboratorio"
      : rawArea;
  const activeRitualFilter = searchParams?.get("ritual") || null;

  // Estados Globais do Vêneto
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [recognitions, setRecognitions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [studioContents, setStudioContents] = useState<any[]>([]);
  const [directMessages, setDirectMessages] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<any>(null);

  // Modos do Feed (Seção 9: Para você, Recentes, Precisam de atenção)
  const [feedMode, setFeedMode] = useState<"para_voce" | "recentes" | "atencao">("para_voce");
  const [selectedTopicTag, setSelectedTopicTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Sub-filtros de Trocas e Pessoas
  const [trocasFilter, setTrocasFilter] = useState<"all" | "unanswered" | "resolved">("all");
  const [pessoasFilter, setPessoasFilter] = useState<"recommended" | "all" | "connected" | "parcerias">("recommended");

  // Compositor de Publicação Inteligente (Seção 5)
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [selectedPostType, setSelectedPostType] = useState<PostTypeKey>("duvida");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postTopicTags, setPostTopicTags] = useState<string[]>([]);
  const [postFeedbackAspects, setPostFeedbackAspects] = useState<string[]>(["Clareza da proposta"]);
  const [postProjectStage, setPostProjectStage] = useState("Em construção");
  const [postConsentConfirmed, setPostConsentConfirmed] = useState(true);
  const [postPartnershipMode, setPostPartnershipMode] = useState<"buscando" | "oferecendo" | "ambos">("ambos");
  const [postOfferDetails, setPostOfferDetails] = useState("");
  const [postSeekDetails, setPostSeekDetails] = useState("");
  const [postExternalLink, setPostExternalLink] = useState("");
  const [postRitualDay, setPostRitualDay] = useState<string>("");
  const [newPostImagePreview, setNewPostImagePreview] = useState<string | null>(null);
  const [newPostImageFile, setNewPostImageFile] = useState<File | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Comentários encadeados e marcação de solução
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [commentsData, setCommentsData] = useState<Record<string, any[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyingToComment, setReplyingToComment] = useState<Record<string, { id: string; nome: string } | null>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<string | null>(null);

  // Modais (Onboarding Progressivo, Reconhecimento, Denúncia, Exclusão, Mensagem Direta, Novo Encontro, Novo Conteúdo Estúdio)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardingForm, setOnboardingForm] = useState({
    bio: "",
    veneto_objectives: [] as string[],
    area_atuacao: "",
    segmento: "",
    localizacao: "",
    o_que_oferece: "",
    o_que_procura: "",
    interesses: [] as string[],
    dm_privacy: "everyone",
  });
  const [isSavingOnboarding, setIsSavingOnboarding] = useState(false);

  const [recognitionModal, setRecognitionModal] = useState<{
    toUserId: string;
    toUserName: string;
    postId?: string;
    commentId?: string;
  } | null>(null);
  const [recognitionBadge, setRecognitionBadge] = useState<"ajuda_util" | "curadoria" | "colaboracao" | "acolhimento">("ajuda_util");
  const [recognitionNote, setRecognitionNote] = useState("");

  const [reportModal, setReportModal] = useState<{
    targetType: "post" | "comment" | "user";
    targetId: string;
    targetLabel: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState("autopromocao_spam");
  const [reportDesc, setReportDesc] = useState("");

  const [dmTargetUser, setDmTargetUser] = useState<any | null>(null);
  const [dmInput, setDmInput] = useState("");
  const [dmContextLabel, setDmContextLabel] = useState("");
  const [activeDmPartnerId, setActiveDmPartnerId] = useState<string | null>(null);

  const [activeLiveEventId, setActiveLiveEventId] = useState<string | null>(null);
  const [liveChatInput, setLiveChatInput] = useState("");

  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [newEventForm, setNewEventForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    event_type: "clinica_marca",
    ritual_day: "TER",
    starts_at: "",
    duration_minutes: 60,
    meeting_url: "",
  });

  const [isNewStudioModalOpen, setIsNewStudioModalOpen] = useState(false);
  const [newStudioForm, setNewStudioForm] = useState({
    title: "",
    category: "nota_estudio",
    summary: "",
    principle: "",
    practical_example: "",
    application_prompt: "",
    ecosystem_pillar: "identidade",
    reading_time_minutes: 4,
  });

  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isPostTypeMenuOpen, setIsPostTypeMenuOpen] = useState(false);
  const publisherRef = useRef<HTMLTextAreaElement>(null);

  // Carrega todos os dados do Vêneto
  const fetchVenetoData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch("/api/veneto");
      if (!res.ok) throw new Error("Falha ao carregar o Vêneto");
      const data = await res.json();

      setCurrentUser(data.currentUser);
      setPosts(data.posts || []);
      setMembers(data.members || []);
      setRecognitions(data.recognitions || []);
      setEvents(data.events || []);
      setStudioContents(data.studioContents || []);
      setDirectMessages(data.directMessages || []);
      setReports(data.reports || []);
      setHealthMetrics(data.healthMetrics || null);

      if (data.currentUser) {
        setOnboardingForm({
          bio: data.currentUser.bio || "",
          veneto_objectives: data.currentUser.veneto_objectives || [],
          area_atuacao: data.currentUser.area_atuacao || "",
          segmento: data.currentUser.segmento || "",
          localizacao: data.currentUser.localizacao || "",
          o_que_oferece: data.currentUser.o_que_oferece || "",
          o_que_procura: data.currentUser.o_que_procura || "",
          interesses: data.currentUser.interesses || [],
          dm_privacy: data.currentUser.dm_privacy || "everyone",
        });
      }

      if (data.events?.length > 0 && !activeLiveEventId) {
        setActiveLiveEventId(data.events[0].id);
      }
    } catch (err) {
      console.error("Erro ao sincronizar Vêneto:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVenetoData();
  }, []);

  // Ajusta tipo de publicação padrão conforme área selecionada
  useEffect(() => {
    if (activeArea === "trocas") setSelectedPostType("duvida");
    else if (activeArea === "laboratorio") setSelectedPostType("feedback");
    else if (activeArea === "pessoas") setSelectedPostType("parceria");
    else if (activeArea === "estudio") {
      setSelectedPostType("nota_estudio");
    }
  }, [activeArea, currentUser?.role]);

  const isAdminOrGestor = ["admin", "gestor"].includes(currentUser?.role || "");

  // ============================================================================
  // AÇÕES DO VÊNETO
  // ============================================================================

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPostImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewPostImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() && !postTitle.trim()) {
      showToast("Escreva o conteúdo da sua publicação para compartilhar.");
      return;
    }

    setIsPublishing(true);
    try {
      let imageUrl = null;
      if (newPostImageFile) {
        const formData = new FormData();
        formData.append("file", newPostImageFile);
        formData.append("bucket", "community_images");
        const upRes = await fetch("/api/storage/upload", { method: "POST", body: formData });
        if (upRes.ok) {
          const upJson = await upRes.json();
          imageUrl = upJson.publicUrl || upJson.url || null;
        } else {
          const fileExt = newPostImageFile.name.split(".").pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("community_images")
            .upload(fileName, newPostImageFile);

          if (!uploadError) {
            const { data } = supabase.storage.from("community_images").getPublicUrl(fileName);
            imageUrl = data.publicUrl;
          }
        }
      }

      const targetGroupSlug =
        activeArea === "trocas"
          ? "trocas"
          : activeArea === "laboratorio"
          ? "laboratorio"
          : "agora";

      const embeddedPostType: PostTypeKey =
        activeArea === "trocas"
          ? "duvida"
          : activeArea === "laboratorio"
          ? "feedback"
          : "discussao";

      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish_post",
          post_type: embeddedPostType,
          title: postTitle,
          text_content: postContent,
          image_url: imageUrl,
          topic_tags: postTopicTags,
          feedback_aspects: embeddedPostType === "feedback" ? postFeedbackAspects : [],
          project_stage: embeddedPostType === "feedback" ? postProjectStage : null,
          consent_confirmed: postConsentConfirmed,
          offer_details: null,
          seek_details: null,
          partnership_mode: null,
          external_link: postExternalLink || null,
          ritual_day: null,
          group_slug: targetGroupSlug,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao publicar");

      setPosts((prev) => [json.post, ...prev]);
      setPostTitle("");
      setPostContent("");
      setPostTopicTags([]);
      setPostOfferDetails("");
      setPostSeekDetails("");
      setPostExternalLink("");
      setPostRitualDay("");
      setNewPostImagePreview(null);
      setNewPostImageFile(null);
      setIsComposerExpanded(false);

      window.dispatchEvent(new CustomEvent("venetoUpdated"));
      showToast("Publicação compartilhada no Vêneto!");
    } catch (err: any) {
      showToast(err?.message || "Erro ao publicar no Vêneto.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    const target = posts.find((p) => p.id === postId);
    if (!target) return;

    const nextLiked = !target.is_liked_by_me;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_liked_by_me: nextLiked,
              likes_count: nextLiked ? (p.likes_count || 0) + 1 : Math.max(0, (p.likes_count || 1) - 1),
            }
          : p
      )
    );

    try {
      await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_like", post_id: postId }),
      });
    } catch {
      fetchVenetoData(true);
    }
  };

  const handleToggleSave = async (postId: string) => {
    const target = posts.find((p) => p.id === postId);
    if (!target) return;

    const nextSaved = !target.is_saved_by_me;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_saved_by_me: nextSaved,
              saves_count: nextSaved ? (p.saves_count || 0) + 1 : Math.max(0, (p.saves_count || 1) - 1),
            }
          : p
      )
    );

    showToast(nextSaved ? "Salvo no seu acervo do Vêneto!" : "Removido dos salvos.");

    try {
      await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_save", post_id: postId }),
      });
    } catch {
      fetchVenetoData(true);
    }
  };

  const toggleComments = async (postId: string) => {
    if (expandedComments.includes(postId)) {
      setExpandedComments((prev) => prev.filter((id) => id !== postId));
    } else {
      setExpandedComments((prev) => [...prev, postId]);
      if (!commentsData[postId]) {
        const res = await fetch("/api/veneto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_comments", post_id: postId }),
        });
        if (res.ok) {
          const json = await res.json();
          setCommentsData((prev) => ({ ...prev, [postId]: json.comments || [] }));
        }
      }
    }
  };

  const handleSendComment = async (postId: string) => {
    const content = commentInputs[postId];
    if (!content?.trim()) return;

    const parentId = replyingToComment[postId]?.id || null;
    setIsSubmittingComment(postId);

    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_comment",
          post_id: postId,
          content: content.trim(),
          parent_id: parentId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setCommentsData((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), json.comment],
      }));
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      setReplyingToComment((prev) => ({ ...prev, [postId]: null }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p))
      );

      const postObj = posts.find((p) => p.id === postId);
      if (postObj && postObj.author_id !== currentUser?.id) {
        await NotificationEngine.notifyUser(
          postObj.author_id,
          "💬 Nova contribuição na sua conversa",
          `${currentUser?.nome} respondeu à sua publicação no Vêneto.`,
          "info",
          "/comunidade"
        );
      }

      window.dispatchEvent(new CustomEvent("venetoUpdated"));
    } catch {
      showToast("Erro ao enviar resposta.");
    } finally {
      setIsSubmittingComment(null);
    }
  };

  const handleMarkSolution = async (postId: string, commentId: string) => {
    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_solution",
          post_id: postId,
          comment_id: commentId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, is_resolved: true, resolved_comment_id: commentId } : p))
      );
      setCommentsData((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((c) => ({
          ...c,
          is_solution: c.id === commentId,
          helpful_count: c.id === commentId ? (c.helpful_count || 0) + 1 : c.helpful_count,
        })),
      }));

      window.dispatchEvent(new CustomEvent("venetoUpdated"));
      showToast("Solução marcada! O autor recebeu o reconhecimento de Ajuda Útil.");
    } catch (err: any) {
      showToast(err?.message || "Não foi possível marcar a solução.");
    }
  };

  const handleToggleConnection = async (targetUserId: string, targetName: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === targetUserId ? { ...m, is_connected: !m.is_connected } : m))
    );

    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_connection", target_user_id: targetUserId }),
      });
      const json = await res.json();
      if (json.connected) {
        showToast(`Agora você acompanha ${targetName.split(" ")[0]} no Vêneto!`);
        await NotificationEngine.notifyUser(
          targetUserId,
          "🤝 Nova conexão no Vêneto",
          `${currentUser?.nome} conectou-se ao seu perfil profissional no Vêneto.`,
          "info",
          `/comunidade/perfil/${currentUser?.username || currentUser?.id}`
        );
      } else {
        showToast(`Conexão com ${targetName.split(" ")[0]} removida.`);
      }
      window.dispatchEvent(new CustomEvent("venetoUpdated"));
    } catch {
      fetchVenetoData(true);
    }
  };

  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOnboarding(true);
    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          ...onboardingForm,
          veneto_onboarding_done: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setCurrentUser(json.profile);
      setIsOnboardingOpen(false);
      fetchVenetoData(true);
      window.dispatchEvent(new CustomEvent("venetoUpdated"));
      showToast("Preferências e perfil profissional atualizados no Vêneto!");
    } catch {
      showToast("Erro ao atualizar seu perfil profissional.");
    } finally {
      setIsSavingOnboarding(false);
    }
  };

  const handleGiveRecognition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recognitionModal) return;

    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "give_recognition",
          to_user_id: recognitionModal.toUserId,
          badge_type: recognitionBadge,
          note: recognitionNote,
          post_id: recognitionModal.postId || null,
          comment_id: recognitionModal.commentId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      showToast(
        `Reconhecimento de "${RECOGNITION_BADGES[recognitionBadge].label}" registrado para ${recognitionModal.toUserName}!`
      );
      setRecognitionModal(null);
      setRecognitionNote("");
      fetchVenetoData(true);
      window.dispatchEvent(new CustomEvent("venetoUpdated"));
    } catch (err: any) {
      showToast(err?.message || "Erro ao registrar reconhecimento.");
    }
  };

  const handleSendDm = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = dmTargetUser?.id || activeDmPartnerId;
    if (!targetId || !dmInput.trim()) return;

    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_dm",
          receiver_id: targetId,
          content: dmInput.trim(),
          context_label: dmContextLabel || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setDirectMessages((prev) => [...prev, json.dm]);
      setDmInput("");
      setDmContextLabel("");
      if (dmTargetUser) {
        setActiveDmPartnerId(dmTargetUser.id);
        setDmTargetUser(null);
      }
      showToast("Mensagem privada enviada!");
    } catch (err: any) {
      showToast(err?.message || "Não foi possível enviar a mensagem.");
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportModal) return;

    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report_item",
          target_type: reportModal.targetType,
          target_id: reportModal.targetId,
          reason_category: reportReason,
          description: reportDesc,
        }),
      });
      if (!res.ok) throw new Error();
      showToast("Sinalização enviada para a equipe de moderação do Vêneto.");
      setReportModal(null);
      setReportDesc("");
      fetchVenetoData(true);
    } catch {
      showToast("Erro ao enviar sinalização.");
    }
  };

  const handleToggleRsvp = async (eventId: string) => {
    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_rsvp", event_id: eventId }),
      });
      const json = await res.json();
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId
            ? {
                ...ev,
                is_rsvped: json.rsvped,
                rsvp_count: json.rsvped ? (ev.rsvp_count || 0) + 1 : Math.max(0, (ev.rsvp_count || 1) - 1),
              }
            : ev
        )
      );
      showToast(json.rsvped ? "Presença confirmada no Encontro!" : "Inscrição cancelada.");
    } catch {
      showToast("Erro ao atualizar inscrição.");
    }
  };

  const handleSendLiveChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLiveEventId || !liveChatInput.trim()) return;

    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_event_message",
          event_id: activeLiveEventId,
          content: liveChatInput.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.message) {
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === activeLiveEventId
              ? { ...ev, messages: [...(ev.messages || []), json.message] }
              : ev
          )
        );
        setLiveChatInput("");
      }
    } catch {
      showToast("Erro ao enviar mensagem na sala ao vivo.");
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_event", ...newEventForm }),
      });
      if (res.ok) {
        setIsNewEventModalOpen(false);
        fetchVenetoData(true);
        showToast("Encontro agendado no calendário do Vêneto!");
      }
    } catch {
      showToast("Erro ao agendar encontro.");
    }
  };

  const handleCreateStudioContent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_studio_content", ...newStudioForm }),
      });
      if (res.ok) {
        setIsNewStudioModalOpen(false);
        fetchVenetoData(true);
        showToast("Novo conteúdo publicado no Estúdio da Liz!");
      }
    } catch {
      showToast("Erro ao publicar conteúdo no Estúdio.");
    }
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    const idBackup = postToDelete;
    setPosts((prev) => prev.filter((p) => p.id !== idBackup));
    setPostToDelete(null);

    try {
      await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_post", post_id: idBackup }),
      });
      showToast("Publicação removida do Vêneto.");
    } catch {
      fetchVenetoData(true);
    }
  };

  // ============================================================================
  // FILTRAGEM INTELIGENTE DO FEED E DOS 6 DESTINOS (Seções 4 & 9)
  // ============================================================================

  const filteredPosts = useMemo(() => {
    let list = [...posts];

    // Filtro por área / destino
    if (activeArea === "agora") {
      list = list.filter(
        (p) =>
          p.group_slug === "agora" ||
          p.group_slug === "global" ||
          !p.group_slug ||
          ["admin", "gestor"].includes(p.profiles?.role || "")
      );
    } else if (activeArea === "trocas") {
      list = list.filter((p) => p.group_slug === "trocas" || p.post_type === "duvida");
      if (trocasFilter === "unanswered") {
        list = list.filter((p) => !p.is_resolved && (p.comments_count || 0) === 0);
      } else if (trocasFilter === "resolved") {
        list = list.filter((p) => p.is_resolved);
      }
    } else if (activeArea === "laboratorio") {
      list = list.filter((p) => p.post_type === "feedback" || p.group_slug === "laboratorio");
    } else if (activeArea === "salvos") {
      list = list.filter((p) => p.is_saved_by_me);
    }

    // Filtro por ritual da semana
    if (activeRitualFilter) {
      list = list.filter((p) => p.ritual_day === activeRitualFilter);
    }

    // Filtro por tag/assunto
    if (selectedTopicTag) {
      list = list.filter((p) => (p.topic_tags || []).includes(selectedTopicTag));
    }

    // Filtro por busca textual
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.text_content?.toLowerCase().includes(q) ||
          p.profiles?.nome?.toLowerCase().includes(q) ||
          (p.topic_tags || []).some((t: string) => t.toLowerCase().includes(q))
      );
    }

    // Modos de visualização do Feed (Seção 9)
    if (activeArea === "agora") {
      if (feedMode === "atencao") {
        list = list.filter(
          (p) =>
            (p.post_type === "duvida" && !p.is_resolved) ||
            (p.post_type === "feedback" && (p.comments_count || 0) < 2) ||
            (p.comments_count || 0) === 0
        );
      } else if (feedMode === "recentes") {
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else {
        // Modo "Para você": equilibra interesses do membro, dúvidas sem resposta, Notas do Estúdio e conexões
        const myInterests = new Set(currentUser?.interesses || []);
        const connectedSet = new Set(
          members.filter((m) => m.is_connected).map((m) => m.id)
        );
        list.sort((a, b) => {
          const score = (post: any) => {
            let s = 0;
            if (post.is_pinned) s += 30;
            if (post.post_type === "duvida" && !post.is_resolved) s += 20;
            if (post.post_type === "nota_estudio") s += 18;
            if (connectedSet.has(post.author_id)) s += 15;
            if ((post.topic_tags || []).some((t: string) => myInterests.has(t))) s += 15;
            return s;
          };
          const diff = score(b) - score(a);
          if (diff !== 0) return diff;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      }
    }

    return list;
  }, [
    posts,
    activeArea,
    trocasFilter,
    activeRitualFilter,
    selectedTopicTag,
    searchQuery,
    feedMode,
    currentUser?.interesses,
    members,
  ]);

  // Apenas perfis que preencheram as informações necessárias e selecionaram estar abertos a conexões
  const builtOpenMembers = useMemo(() => {
    return members
      .filter((m) => {
        const isOpenForConnections = Boolean(m.dm_privacy && m.dm_privacy !== "none");
        const isOnboarded = Boolean(
          m.veneto_onboarding_done || m.role === "admin" || m.role === "gestor"
        );
        const hasBio = Boolean(m.bio && m.bio.trim().length > 5);
        const hasProfessionalInfo = Boolean(
          (m.area_atuacao && m.area_atuacao.trim().length > 0) ||
            (m.cargo && m.cargo.trim().length > 0) ||
            (m.o_que_oferece && m.o_que_oferece.trim().length > 0)
        );
        return isOpenForConnections && isOnboarded && hasBio && hasProfessionalInfo;
      })
      .sort((a, b) => {
        const aPriority = a.role === "admin" ? 0 : a.role === "gestor" ? 1 : 2;
        const bPriority = b.role === "admin" ? 0 : b.role === "gestor" ? 1 : 2;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return (a.nome || "").localeCompare(b.nome || "");
      });
  }, [members]);

  const filteredMembers = useMemo(() => {
    let list = [...builtOpenMembers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.nome?.toLowerCase().includes(q) ||
          m.username?.toLowerCase().includes(q) ||
          m.cargo?.toLowerCase().includes(q) ||
          m.area_atuacao?.toLowerCase().includes(q) ||
          m.segmento?.toLowerCase().includes(q) ||
          m.o_que_oferece?.toLowerCase().includes(q) ||
          m.o_que_procura?.toLowerCase().includes(q) ||
          (m.skills || []).some((s: string) => s.toLowerCase().includes(q))
      );
    }

    if (pessoasFilter === "connected") {
      list = list.filter((m) => m.is_connected);
    } else if (pessoasFilter === "parcerias") {
      list = list.filter((m) => Boolean(m.o_que_oferece || m.o_que_procura));
    }

    // Manter Liz Oliveira (admin) e Igor Oliveira (gestor) sempre em evidência no topo
    list.sort((a, b) => {
      const aPriority = a.role === "admin" ? 0 : a.role === "gestor" ? 1 : 2;
      const bPriority = b.role === "admin" ? 0 : b.role === "gestor" ? 1 : 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return (a.nome || "").localeCompare(b.nome || "");
    });

    return list;
  }, [builtOpenMembers, searchQuery, pessoasFilter]);

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) return "agora mesmo";
    if (diffMins < 60) return `há ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `há ${diffHours}h`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  // ============================================================================
  // RENDERIZAÇÃO DE UM CARD DE PUBLICAÇÃO INTELIGENTE (Seção 5, 8, 10, 13)
  // ============================================================================
  const renderPostCard = (post: any, index: number) => {
    const isMyPost = post.author_id === currentUser?.id;
    const isCommentsOpen = expandedComments.includes(post.id);
    const postComments = commentsData[post.id] || [];
    const rootComments = postComments.filter((c) => !c.parent_id);
    const getReplies = (parentId: string) => postComments.filter((c) => c.parent_id === parentId);
    const authorCargo =
      post.profiles?.cargo ||
      (post.profiles?.role === "admin"
        ? "Fundadora"
        : post.profiles?.role === "gestor"
        ? "Gestor de Projetos"
        : null);

    return (
      <motion.article
        key={post.id}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.25) }}
        className="glass-panel rounded-[2.4rem] bg-white/75 hover:bg-white/90 border border-white shadow-sm transition-all overflow-hidden flex flex-col"
      >
        {/* TOPO DA PUBLICAÇÃO: AUTOR + CARGO REAL */}
        <div className="p-6 md:p-7 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <Link href={`/comunidade/perfil/${post.profiles?.username || post.author_id}`} className="shrink-0">
              <div className="w-12 h-12 rounded-2xl border border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] font-elegant text-2xl flex items-center justify-center overflow-hidden shadow-xs hover:scale-105 transition-transform">
                {post.profiles?.avatar_url ? (
                  <img
                    src={normalizeImageUrl(post.profiles.avatar_url)}
                    alt={post.profiles?.nome}
                    className="w-full h-full object-cover"
                    onError={(e) => handleAvatarError(e, post.profiles?.nome)}
                  />
                ) : (
                  post.profiles?.nome?.charAt(0) || "M"
                )}
              </div>
            </Link>

            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/comunidade/perfil/${post.profiles?.username || post.author_id}`}
                  className="font-roboto text-[14px] font-bold text-[var(--color-atelier-grafite)] hover:text-[var(--color-atelier-terracota)] transition-colors"
                >
                  {post.profiles?.nome || "Membro"}
                </Link>
                {authorCargo && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-atelier-terracota)] text-white font-roboto text-[9px] font-bold uppercase tracking-wider">
                    {authorCargo}
                  </span>
                )}
                {post.profiles?.area_atuacao && post.profiles.area_atuacao !== authorCargo && (
                  <span className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/55 truncate">
                    · {post.profiles.area_atuacao}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                {/* Status de Dúvida em Trocas: Sem Resposta vs Resolvida */}
                {post.post_type === "duvida" && (
                  post.is_resolved ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-roboto text-[9.5px] font-bold uppercase tracking-wider">
                      <CheckCircle2 size={11} /> Resolvida
                    </span>
                  ) : (post.comments_count || 0) === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-roboto text-[9.5px] font-bold uppercase tracking-wider">
                      <AlertCircle size={11} /> Sem resposta
                    </span>
                  ) : null
                )}

                <span className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/45">
                  {formatTime(post.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Ações Rápidas do Card */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isMyPost && (
              <button
                onClick={() =>
                  setRecognitionModal({
                    toUserId: post.author_id,
                    toUserName: post.profiles?.nome || "Membro",
                    postId: post.id,
                  })
                }
                title="Reconhecer contribuição"
                className="px-2.5 py-1.5 rounded-xl bg-white/80 hover:bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] border border-white font-roboto text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Award size={13} /> Reconhecer
              </button>
            )}
            {!isMyPost && (
              <button
                onClick={() =>
                  setReportModal({
                    targetType: "post",
                    targetId: post.id,
                    targetLabel: post.title || post.text_content?.slice(0, 50),
                  })
                }
                title="Sinalizar à moderação"
                className="w-8 h-8 rounded-full bg-white/70 hover:bg-orange-50 text-[var(--color-atelier-grafite)]/40 hover:text-orange-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Flag size={13} />
              </button>
            )}
            {(isMyPost || isAdminOrGestor) && (
              <button
                onClick={() => setPostToDelete(post.id)}
                title="Excluir publicação"
                className="w-8 h-8 rounded-full bg-white/70 hover:bg-red-50 text-[var(--color-atelier-grafite)]/40 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* CONTEÚDO ESTRUTURADO DA PUBLICAÇÃO */}
        <div className="px-6 md:px-7 pb-5 flex flex-col gap-3">
          {post.title && (
            <h3 className="font-elegant text-2xl md:text-3xl text-[var(--color-atelier-grafite)] leading-snug">
              {post.title}
            </h3>
          )}

          <p className="font-roboto text-[14.5px] text-[var(--color-atelier-grafite)]/85 leading-relaxed whitespace-pre-wrap">
            {post.text_content}
          </p>

          {/* Campos Específicos: LABORATÓRIO / FEEDBACK (Seção 4.4 & 5) */}
          {post.post_type === "feedback" &&
            Array.isArray(post.feedback_aspects) &&
            post.feedback_aspects.length > 0 && (
              <div className="mt-1 p-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-purple-900">
                    Critérios que o autor quer avaliar:
                  </span>
                  {post.project_stage && (
                    <span className="font-roboto text-[10px] font-bold text-purple-700 bg-white px-2.5 py-0.5 rounded-full border border-purple-100">
                      Estágio: {post.project_stage}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {post.feedback_aspects.map((asp: string) => (
                    <span
                      key={asp}
                      className="px-2.5 py-1 rounded-lg bg-white text-purple-900 border border-purple-200/60 font-roboto text-[11px] font-bold"
                    >
                      ✓ {asp}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Campos Específicos: PARCERIA — OFERECER OU BUSCAR (Seção 5 & 6) */}
          {post.post_type === "parceria" && (post.offer_details || post.seek_details) && (
            <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              {post.offer_details && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex flex-col gap-1">
                  <span className="font-roboto text-[9.5px] font-bold uppercase tracking-widest text-emerald-800">
                    O que oferece à rede
                  </span>
                  <p className="font-roboto text-[12.5px] text-[var(--color-atelier-grafite)] font-medium leading-snug">
                    {post.offer_details}
                  </p>
                </div>
              )}
              {post.seek_details && (
                <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 flex flex-col gap-1">
                  <span className="font-roboto text-[9.5px] font-bold uppercase tracking-widest text-blue-800">
                    O que procura na rede
                  </span>
                  <p className="font-roboto text-[12.5px] text-[var(--color-atelier-grafite)] font-medium leading-snug">
                    {post.seek_details}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Link Externo Opcional */}
          {post.external_link && (
            <a
              href={post.external_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/80 hover:bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-terracota)] font-roboto text-[12px] font-bold w-fit transition-all"
            >
              <Link2 size={14} /> Abrir material / referência vinculada ↗
            </a>
          )}

          {/* Tags de Assunto */}
          {Array.isArray(post.topic_tags) && post.topic_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {post.topic_tags.map((tag: string) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTopicTag(selectedTopicTag === tag ? null : tag)}
                  className={`px-2.5 py-1 rounded-lg font-roboto text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    selectedTopicTag === tag
                      ? "bg-[var(--color-atelier-terracota)] text-white"
                      : "bg-[var(--color-atelier-grafite)]/6 text-[var(--color-atelier-grafite)]/70 hover:bg-[var(--color-atelier-terracota)]/10 hover:text-[var(--color-atelier-terracota)]"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* IMAGEM DA PUBLICAÇÃO */}
        {post.image_url && (
          <div className="px-6 md:px-7 pb-5">
            <div className="w-full rounded-[1.8rem] overflow-hidden border-2 border-white shadow-sm bg-black/5">
              <img
                src={normalizeImageUrl(post.image_url)}
                alt="Anexo da publicação"
                className="w-full max-h-[520px] object-cover"
              />
            </div>
          </div>
        )}

        {/* BARRA DE INTERAÇÃO: RESPONDER / CONTRIBUIR, REAGIR, SALVAR, CONECTAR */}
        <div className="px-6 py-4 bg-white/50 border-t border-white/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleComments(post.id)}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 font-roboto text-[12px] font-bold transition-all cursor-pointer border ${
                isCommentsOpen
                  ? "bg-[var(--color-atelier-grafite)] text-white border-[var(--color-atelier-grafite)]"
                  : "bg-white text-[var(--color-atelier-grafite)] hover:border-[var(--color-atelier-terracota)]/40 border-white shadow-2xs"
              }`}
            >
              <MessageCircle size={15} />
              {post.post_type === "duvida"
                ? `Responder (${post.comments_count || 0})`
                : post.post_type === "feedback"
                ? `Avaliar projeto (${post.comments_count || 0})`
                : `Conversar (${post.comments_count || 0})`}
            </button>

            <button
              onClick={() => handleToggleLike(post.id)}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-roboto text-[12px] font-bold transition-all cursor-pointer border ${
                post.is_liked_by_me
                  ? "bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)]/25"
                  : "bg-white/80 text-[var(--color-atelier-grafite)]/70 hover:bg-white border-white"
              }`}
            >
              <Heart
                size={15}
                className={
                  post.is_liked_by_me
                    ? "fill-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)]"
                    : ""
                }
              />
              {post.likes_count || 0}
            </button>

            {post.post_type === "parceria" && !isMyPost && (
              <button
                onClick={() => {
                  setDmTargetUser(post.profiles);
                  setDmContextLabel(`Parceria: ${post.title || "Oportunidade no Vêneto"}`);
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-roboto text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Handshake size={14} /> Iniciar conversa
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleToggleSave(post.id)}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-roboto text-[11.5px] font-bold transition-all cursor-pointer border ${
                post.is_saved_by_me
                  ? "bg-[var(--color-atelier-terracota)] text-white border-[var(--color-atelier-terracota)]"
                  : "bg-white/80 text-[var(--color-atelier-grafite)]/65 hover:text-[var(--color-atelier-terracota)] border-white"
              }`}
            >
              <Bookmark size={14} className={post.is_saved_by_me ? "fill-white" : ""} />
              {post.is_saved_by_me ? "Salvo" : "Salvar"}
            </button>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                showToast("Link da conversa copiado!");
              }}
              className="p-2 rounded-xl bg-white/70 hover:bg-white text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] border border-white transition-colors cursor-pointer"
              title="Compartilhar link"
            >
              <Share2 size={14} />
            </button>
          </div>
        </div>

        {/* COMENTÁRIOS ENCADEADOS & MARCAÇÃO DE SOLUÇÃO ÚTIL (Seção 4.2, 8, 10) */}
        <AnimatePresence>
          {isCommentsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-[var(--color-atelier-grafite)]/10 bg-white/60 flex flex-col"
            >
              <div className="p-6 flex flex-col gap-4 max-h-[420px] overflow-y-auto custom-scrollbar">
                {rootComments.length === 0 ? (
                  <div className="text-center py-6 px-4 rounded-2xl bg-white/70 border border-white">
                    <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 font-medium">
                      Esta conversa ainda não tem respostas. Seja o primeiro a contribuir com uma experiência ou sugestão prática!
                    </p>
                  </div>
                ) : (
                  rootComments.map((comment: any) => {
                    const replies = getReplies(comment.id);
                    const canMarkSolution =
                      post.post_type === "duvida" && (isMyPost || isAdminOrGestor);
                    const commentCargo =
                      comment.profiles?.cargo ||
                      (comment.profiles?.role === "admin"
                        ? "Fundadora"
                        : comment.profiles?.role === "gestor"
                        ? "Gestor de Projetos"
                        : null);

                    return (
                      <div key={comment.id} className="flex flex-col gap-2">
                        <div
                          className={`p-4 rounded-2xl border transition-all flex gap-3.5 ${
                            comment.is_solution
                              ? "bg-emerald-50/70 border-emerald-300 shadow-xs"
                              : "bg-white border-white shadow-2xs"
                          }`}
                        >
                          <Link
                            href={`/comunidade/perfil/${comment.profiles?.username || comment.user_id}`}
                            className="shrink-0"
                          >
                            <div className="w-9 h-9 rounded-xl bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] font-elegant text-lg flex items-center justify-center overflow-hidden border border-white">
                              {comment.profiles?.avatar_url ? (
                                <img
                                  src={normalizeImageUrl(comment.profiles.avatar_url)}
                                  alt={comment.profiles?.nome}
                                  className="w-full h-full object-cover"
                                  onError={(e) => handleAvatarError(e, comment.profiles?.nome)}
                                />
                              ) : (
                                comment.profiles?.nome?.charAt(0) || "M"
                              )}
                            </div>
                          </Link>

                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-roboto text-[12.5px] font-bold text-[var(--color-atelier-grafite)]">
                                  {comment.profiles?.nome || "Membro"}
                                </span>
                                {commentCargo && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)]">
                                    {commentCargo}
                                  </span>
                                )}
                                {comment.is_solution && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-roboto text-[9px] font-bold uppercase tracking-wider">
                                    <CheckCircle2 size={11} /> Solução Útil Marcada
                                  </span>
                                )}
                              </div>
                              <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/45">
                                {formatTime(comment.created_at)}
                              </span>
                            </div>

                            <p className="font-roboto text-[13.5px] text-[var(--color-atelier-grafite)]/90 leading-relaxed mt-1.5 whitespace-pre-wrap">
                              {comment.content}
                            </p>

                            {/* Ações do Comentário */}
                            <div className="flex flex-wrap items-center gap-3 mt-2.5 pt-2 border-t border-[var(--color-atelier-grafite)]/5">
                              <button
                                onClick={() =>
                                  setReplyingToComment((prev) => ({
                                    ...prev,
                                    [post.id]: {
                                      id: comment.id,
                                      nome: comment.profiles?.nome || "Membro",
                                    },
                                  }))
                                }
                                className="font-roboto text-[10.5px] font-bold text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)] flex items-center gap-1 cursor-pointer"
                              >
                                <CornerDownRight size={12} /> Responder
                              </button>

                              {canMarkSolution && !comment.is_solution && (
                                <button
                                  onClick={() => handleMarkSolution(post.id, comment.id)}
                                  className="font-roboto text-[10.5px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 cursor-pointer"
                                >
                                  <CheckCircle2 size={12} /> Marcar como Solução Útil
                                </button>
                              )}

                              {comment.user_id !== currentUser?.id && (
                                <button
                                  onClick={() =>
                                    setRecognitionModal({
                                      toUserId: comment.user_id,
                                      toUserName: comment.profiles?.nome || "Membro",
                                      postId: post.id,
                                      commentId: comment.id,
                                    })
                                  }
                                  className="font-roboto text-[10.5px] font-bold text-[var(--color-atelier-terracota)] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Award size={12} /> Reconhecer resposta
                                  {comment.helpful_count > 0 && ` (${comment.helpful_count})`}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Respostas Encadeadas (Threads) */}
                        {replies.length > 0 && (
                          <div className="pl-8 md:pl-11 flex flex-col gap-2">
                            {replies.map((reply: any) => (
                              <div
                                key={reply.id}
                                className="p-3.5 rounded-2xl bg-white/80 border border-white flex gap-3"
                              >
                                <div className="w-7 h-7 rounded-lg bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] font-elegant text-sm flex items-center justify-center shrink-0 overflow-hidden">
                                  {reply.profiles?.avatar_url ? (
                                    <img
                                      src={normalizeImageUrl(reply.profiles.avatar_url)}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    reply.profiles?.nome?.charAt(0) || "M"
                                  )}
                                </div>
                                <div className="flex flex-col flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-roboto text-[11.5px] font-bold text-[var(--color-atelier-grafite)]">
                                      {reply.profiles?.nome}
                                    </span>
                                    <span className="font-roboto text-[9.5px] text-[var(--color-atelier-grafite)]/40">
                                      {formatTime(reply.created_at)}
                                    </span>
                                  </div>
                                  <p className="font-roboto text-[12.5px] text-[var(--color-atelier-grafite)]/85 mt-1">
                                    {reply.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input de Comentário / Resposta Encadeada */}
              <div className="p-4 md:px-6 bg-white/90 border-t border-[var(--color-atelier-grafite)]/10 flex flex-col gap-2">
                {replyingToComment[post.id] && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] text-[11px] font-roboto font-bold">
                    <span>Respondendo a {replyingToComment[post.id]?.nome}</span>
                    <button
                      onClick={() => setReplyingToComment((prev) => ({ ...prev, [post.id]: null }))}
                      className="hover:underline cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentInputs[post.id] || ""}
                    onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendComment(post.id);
                    }}
                    placeholder={
                      post.post_type === "duvida"
                        ? "Compartilhe uma resposta prática ou solução que funcionou para você..."
                        : post.post_type === "feedback"
                        ? "Deixe um feedback construtivo sobre os critérios solicitados..."
                        : "Adicione sua perspectiva à conversa..."
                    }
                    className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/15 focus:border-[var(--color-atelier-terracota)]/50 rounded-xl px-4 py-3 font-roboto text-[13px] outline-none text-[var(--color-atelier-grafite)]"
                  />
                  <button
                    onClick={() => handleSendComment(post.id)}
                    disabled={isSubmittingComment === post.id || !commentInputs[post.id]?.trim()}
                    className="px-5 py-3 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSubmittingComment === post.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    Enviar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-[fadeInUp_0.6s_ease-out_both]">
      {/* =========================================================================
          BARRA DE PESQUISA SOLTA NO TOPO
          ========================================================================= */}
      <div className="relative w-full">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40 pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar conversas, temas ou pessoas..."
          className="w-full bg-white/85 hover:bg-white focus:bg-white border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-2xl pl-11 pr-4 py-3.5 text-[13px] font-roboto outline-none text-[var(--color-atelier-grafite)] shadow-xs transition-all"
        />
      </div>

      {/* =========================================================================
          GATILHO COMPACTO DE PUBLICAÇÃO (Abre Modal Sofisticado por Aba)
          Restrito a Admin e Gestor no Feed ("agora"), aberto ao público em "trocas" e "laboratorio"
          ========================================================================= */}
      {((activeArea === "agora" && isAdminOrGestor) ||
        activeArea === "trocas" ||
        activeArea === "laboratorio") && (
        <div
          onClick={() => setIsComposerExpanded(true)}
          className="glass-panel px-4 py-3.5 rounded-2xl bg-white/80 hover:bg-white border border-white shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] font-elegant text-lg flex items-center justify-center overflow-hidden border border-white shrink-0">
              {currentUser?.avatar_url ? (
                <img
                  src={normalizeImageUrl(currentUser.avatar_url)}
                  alt={currentUser?.nome}
                  className="w-full h-full object-cover"
                  onError={(e) => handleAvatarError(e, currentUser?.nome)}
                />
              ) : (
                currentUser?.nome?.charAt(0) || "V"
              )}
            </div>
            <span className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/55 group-hover:text-[var(--color-atelier-grafite)]/80 truncate transition-colors">
              {activeArea === "agora"
                ? "Compartilhar uma publicação no Feed..."
                : activeArea === "trocas"
                ? "Iniciar uma troca ou dúvida com a comunidade..."
                : "Apresentar um projeto para avaliação no Laboratório..."}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsComposerExpanded(true);
            }}
            className="px-4 py-2 rounded-xl bg-[var(--color-atelier-grafite)] group-hover:bg-[var(--color-atelier-terracota)] text-white font-roboto text-[10.5px] font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
          >
            Publicar
          </button>
        </div>
      )}

      {/* =========================================================================
          MODAL SOFISTICADO DE POSTAGEM (Embute automaticamente a categoria da aba)
          ========================================================================= */}
      <AnimatePresence>
        {isComposerExpanded && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsComposerExpanded(false)}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              className="glass-panel bg-white p-6 md:p-7 rounded-[2.2rem] shadow-2xl w-full max-w-lg relative z-10 border border-white flex flex-col gap-4 max-h-[88vh] overflow-y-auto custom-scrollbar"
            >
              {/* Cabeçalho do Modal */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--color-atelier-grafite)]/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] font-elegant text-xl flex items-center justify-center overflow-hidden border border-white shrink-0">
                    {currentUser?.avatar_url ? (
                      <img
                        src={normalizeImageUrl(currentUser.avatar_url)}
                        alt={currentUser?.nome}
                        className="w-full h-full object-cover"
                        onError={(e) => handleAvatarError(e, currentUser?.nome)}
                      />
                    ) : (
                      currentUser?.nome?.charAt(0) || "V"
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-roboto text-[13px] font-bold text-[var(--color-atelier-grafite)] truncate">
                      {currentUser?.nome || "Membro Vêneto"}
                    </span>
                    <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                      {activeArea === "trocas"
                        ? "Publicando em Trocas"
                        : activeArea === "laboratorio"
                        ? "Publicando no Laboratório"
                        : "Publicando no Feed"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsComposerExpanded(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[var(--color-atelier-grafite)]/60 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Formulário Limpo e Sofisticado */}
              <form onSubmit={handlePublish} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder={
                    activeArea === "trocas"
                      ? "Título da sua dúvida ou troca (opcional)..."
                      : activeArea === "laboratorio"
                      ? "Nome do projeto em avaliação..."
                      : "Título da publicação (opcional)..."
                  }
                  className="w-full bg-gray-50/70 border border-gray-200/80 focus:border-[var(--color-atelier-terracota)]/50 rounded-xl px-4 py-2.5 font-roboto text-[13.5px] font-bold text-[var(--color-atelier-grafite)] outline-none"
                />

                <textarea
                  ref={publisherRef}
                  rows={4}
                  autoFocus
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder={
                    activeArea === "trocas"
                      ? "Compartilhe sua dúvida, contexto ou experiência com a comunidade..."
                      : activeArea === "laboratorio"
                      ? "Explique o objetivo do projeto e o que gostaria que fosse avaliado..."
                      : "Escreva sua publicação..."
                  }
                  className="w-full bg-gray-50/70 border border-gray-200/80 focus:border-[var(--color-atelier-terracota)]/50 rounded-xl p-4 font-roboto text-[13.5px] text-[var(--color-atelier-grafite)] outline-none resize-none custom-scrollbar"
                />

                {activeArea === "laboratorio" && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {FEEDBACK_ASPECT_OPTIONS.map((aspect) => {
                      const active = postFeedbackAspects.includes(aspect);
                      return (
                        <button
                          key={aspect}
                          type="button"
                          onClick={() =>
                            setPostFeedbackAspects((prev) =>
                              active ? prev.filter((a) => a !== aspect) : [...prev, aspect]
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg font-roboto text-[10.5px] font-bold border transition-all cursor-pointer ${
                            active
                              ? "bg-[var(--color-atelier-grafite)] text-white border-[var(--color-atelier-grafite)]"
                              : "bg-gray-50 text-[var(--color-atelier-grafite)]/70 border-gray-200"
                          }`}
                        >
                          {active ? "✓ " : "+ "}
                          {aspect}
                        </button>
                      );
                    })}
                  </div>
                )}

                {newPostImagePreview && (
                  <div className="relative w-full h-44 rounded-xl overflow-hidden border border-gray-200">
                    <img src={newPostImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setNewPostImagePreview(null);
                        setNewPostImageFile(null);
                      }}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--color-atelier-grafite)]/10">
                  <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200/80 text-[var(--color-atelier-grafite)]/75 hover:text-[var(--color-atelier-terracota)] transition-all cursor-pointer font-roboto text-[11px] font-bold">
                    <ImageIcon size={15} />
                    <span>Anexar imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isPublishing}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isPublishing || (!postContent.trim() && !postTitle.trim())}
                    className="px-6 py-2.5 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isPublishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                    Publicar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          CONTEÚDO PRINCIPAL POR DESTINO DO VÊNETO (Seção 4)
          ========================================================================= */}

      {/* DESTINO 1: FEED (Seção 4.1 & 9) */}
      {activeArea === "agora" && (
        <div className="flex flex-col gap-5">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="glass-panel p-12 rounded-[2.5rem] bg-white/60 border border-white text-center flex flex-col items-center gap-3">
              <Globe2 size={36} className="text-[var(--color-atelier-terracota)]" />
              <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                Nenhuma publicação no Feed ainda
              </h3>
              <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 max-w-md">
                {isAdminOrGestor
                  ? "Clique em Publicar acima para compartilhar uma publicação no Feed."
                  : "Explore a aba Trocas para abrir conversas, tirar dúvidas e compartilhar experiências com a comunidade."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {filteredPosts.map((post, idx) => renderPostCard(post, idx))}
            </div>
          )}
        </div>
      )}

      {/* DESTINO 2: TROCAS — ABERTO AO PÚBLICO (Seção 4.2) */}
      {activeArea === "trocas" && (
        <div className="flex flex-col gap-5">
          {filteredPosts.length === 0 ? (
            <div className="glass-panel p-12 rounded-[2.5rem] bg-white/60 border border-white text-center flex flex-col items-center gap-3">
              <HelpCircle size={34} className="text-[var(--color-atelier-terracota)]" />
              <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                Nenhuma troca publicada ainda
              </h3>
              <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 max-w-md">
                O espaço de Trocas é aberto a todos os membros. Clique no campo acima para iniciar uma conversa ou tirar uma dúvida.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {filteredPosts.map((post, idx) => renderPostCard(post, idx))}
            </div>
          )}
        </div>
      )}

      {/* DESTINO 3: PESSOAS — CONEXÕES E DIRETÓRIO PROFISSIONAL (Seção 4.3 & 6) */}
      {activeArea === "pessoas" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMembers.map((member) => {
              const isMe = member.id === currentUser?.id;
              const memberCargo =
                member.cargo ||
                (member.role === "admin"
                  ? "Fundadora"
                  : member.role === "gestor"
                  ? "Gestor de Projetos"
                  : null);
              return (
                <div
                  key={member.id}
                  className="glass-panel p-6 rounded-[2rem] bg-white/80 hover:bg-white border border-white shadow-xs flex flex-col justify-between gap-4 transition-all"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/comunidade/perfil/${member.username || member.id}`}
                        className="flex items-center gap-3.5 group min-w-0"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] font-elegant text-2xl flex items-center justify-center overflow-hidden border border-white shadow-xs shrink-0">
                          {member.avatar_url ? (
                            <img
                              src={normalizeImageUrl(member.avatar_url)}
                              alt={member.nome}
                              className="w-full h-full object-cover"
                              onError={(e) => handleAvatarError(e, member.nome)}
                            />
                          ) : (
                            member.nome?.charAt(0) || "M"
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate">
                              {member.nome}
                            </span>
                            {memberCargo && (
                              <span className="px-2 py-0.5 rounded-full bg-[var(--color-atelier-terracota)] text-white font-roboto text-[8.5px] font-bold uppercase tracking-wider">
                                {memberCargo}
                              </span>
                            )}
                          </div>
                          <span className="font-roboto text-[11px] font-bold text-[var(--color-atelier-terracota)]">
                            @{member.username || member.nome?.toLowerCase().replace(/\s+/g, "")}
                          </span>
                          <span className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/65 truncate">
                            {member.area_atuacao || member.cargo || member.segmento || member.empresa}
                          </span>
                        </div>
                      </Link>

                      {member.localizacao && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)]/60 font-roboto text-[10px] font-medium shrink-0">
                          <MapPin size={11} /> {member.localizacao}
                        </span>
                      )}
                    </div>

                    {member.bio && (
                      <p className="font-roboto text-[12.5px] text-[var(--color-atelier-grafite)]/80 leading-relaxed line-clamp-2">
                        {member.bio}
                      </p>
                    )}

                    {/* O que oferece & O que procura (Seção 6) */}
                    {(member.o_que_oferece || member.o_que_procura) && (
                      <div className="flex flex-col gap-2 pt-1">
                        {member.o_que_oferece && (
                          <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                            <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-emerald-800 block">
                              Oferece
                            </span>
                            <p className="font-roboto text-[11.5px] text-[var(--color-atelier-grafite)] line-clamp-2">
                              {member.o_que_oferece}
                            </p>
                          </div>
                        )}
                        {member.o_que_procura && (
                          <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                            <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-blue-800 block">
                              Procura
                            </span>
                            <p className="font-roboto text-[11.5px] text-[var(--color-atelier-grafite)] line-clamp-2">
                              {member.o_que_procura}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Competências e Reconhecimentos */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {(member.skills || []).slice(0, 4).map((skill: string) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-md bg-[var(--color-atelier-grafite)]/6 text-[var(--color-atelier-grafite)]/75 font-roboto text-[9.5px] font-bold"
                        >
                          {skill}
                        </span>
                      ))}
                      {member.recognitions?.total > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-roboto text-[9.5px] font-bold">
                          ★ {member.recognitions.total} reconhecimentos
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações de Conexão e Mensagem Privada */}
                  <div className="pt-3 border-t border-[var(--color-atelier-grafite)]/10 flex items-center justify-between gap-2">
                    <Link
                      href={`/comunidade/perfil/${member.username || member.id}`}
                      className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)]/65 hover:text-[var(--color-atelier-terracota)]"
                    >
                      Ver perfil completo →
                    </Link>

                    {!isMe && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDmTargetUser(member)}
                          className="px-3 py-2 rounded-xl bg-white border border-[var(--color-atelier-grafite)]/15 hover:border-[var(--color-atelier-terracota)]/40 text-[var(--color-atelier-grafite)] font-roboto text-[10.5px] font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare size={13} /> Mensagem
                        </button>
                        <button
                          onClick={() => handleToggleConnection(member.id, member.nome)}
                          className={`px-3.5 py-2 rounded-xl font-roboto text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            member.is_connected
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white"
                          }`}
                        >
                          {member.is_connected ? "✓ Conectado" : "+ Conectar"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMembers.length === 0 && (
            <div className="glass-panel p-12 rounded-[2.5rem] bg-white/60 border border-white text-center flex flex-col items-center gap-3">
              <Users size={34} className="text-[var(--color-atelier-terracota)]" />
              <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                Nenhum perfil encontrado
              </h3>
              <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 max-w-md">
                Exibimos apenas perfis que preencheram suas informações e selecionaram estar abertos para conexões.
              </p>
            </div>
          )}
        </div>
      )}

      {/* DESTINO 4: LABORATÓRIO — PROJETOS E FEEDBACK (Seção 4.4) */}
      {activeArea === "laboratorio" && (
        <div className="flex flex-col gap-5">
          <div className="glass-panel p-6 rounded-[2rem] bg-gradient-to-r from-purple-950/90 to-[var(--color-atelier-grafite)] text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-roboto text-[9.5px] uppercase tracking-[0.2em] font-bold text-purple-200">
                Ambiente Seguro de Evolução · Com Consentimento
              </span>
              <h2 className="font-elegant text-3xl leading-none">
                Laboratório — Projetos e Feedback Construtivo
              </h2>
              <p className="font-roboto text-[12.5px] text-white/75 max-w-2xl mt-1">
                Apresente trabalhos em andamento, selecione os aspectos que deseja avaliar e receba leituras estratégicas fundamentadas em objetivo de negócio e posicionamento.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedPostType("feedback");
                setIsComposerExpanded(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="px-5 py-3 rounded-xl bg-white text-[var(--color-atelier-grafite)] font-roboto text-[11px] font-bold uppercase tracking-wider shrink-0 hover:bg-[var(--color-atelier-creme)] transition-colors cursor-pointer"
            >
              + Apresentar Projeto
            </button>
          </div>

          <div className="flex flex-col gap-5">
            {filteredPosts.map((post, idx) => renderPostCard(post, idx))}
          </div>
        </div>
      )}

      {/* DESTINO 5: ENCONTROS — EVENTOS, RITUAIS E CONVERSAS AO VIVO (Seção 4.5 & 7) */}
      {activeArea === "encontros" && (
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 md:p-7 rounded-[2.2rem] bg-white/80 border border-white flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">
                  Encontros & Rituais Semanais
                </h2>
                <p className="font-roboto text-[12.5px] text-[var(--color-atelier-grafite)]/65 mt-1">
                  Clínicas de marca, sessões com a Liz, rodas de networking e chat sincronizado durante os encontros ao vivo.
                </p>
              </div>
              {isAdminOrGestor && (
                <button
                  onClick={() => setIsNewEventModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit cursor-pointer"
                >
                  <Plus size={14} /> Agendar Encontro
                </button>
              )}
            </div>

            {/* Grade da Programação Editorial Recorrente (SEG a SEX — Seção 7) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {WEEKLY_RITUALS.map((r) => (
                <div
                  key={r.day}
                  className="p-4 rounded-2xl bg-[var(--color-atelier-creme)]/55 border border-[var(--color-atelier-terracota)]/15 flex flex-col justify-between gap-2"
                >
                  <div>
                    <span className="px-2 py-0.5 rounded bg-[var(--color-atelier-terracota)] text-white font-roboto text-[9px] font-black uppercase tracking-widest">
                      {r.day}
                    </span>
                    <h4 className="font-elegant text-xl text-[var(--color-atelier-grafite)] mt-2 leading-tight">
                      {r.name}
                    </h4>
                    <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/70 mt-1 leading-snug">
                      {r.desc}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPostType(r.postType);
                      setPostRitualDay(r.day);
                      router.push("/comunidade?area=agora");
                    }}
                    className="font-roboto text-[10px] font-bold uppercase tracking-wider text-[var(--color-atelier-terracota)] hover:underline text-left pt-2 cursor-pointer"
                  >
                    Participar deste ritual →
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de Encontros + Sala de Chat Ao Vivo Sincronizado */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 flex flex-col gap-4">
              {events.map((ev) => {
                const isSelected = activeLiveEventId === ev.id;
                return (
                  <div
                    key={ev.id}
                    onClick={() => setActiveLiveEventId(ev.id)}
                    className={`glass-panel p-6 rounded-[2rem] border transition-all cursor-pointer flex flex-col gap-3 ${
                      isSelected
                        ? "bg-white border-[var(--color-atelier-terracota)]/40 shadow-md"
                        : "bg-white/75 hover:bg-white border-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] font-roboto text-[10px] font-bold uppercase tracking-wider">
                        Ritual {ev.ritual_day || "QUI"} · {ev.duration_minutes} min
                      </span>
                      <span className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)]/60">
                        {new Date(ev.starts_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-snug">
                      {ev.title}
                    </h3>
                    {ev.subtitle && (
                      <p className="font-roboto text-[12px] font-bold text-[var(--color-atelier-terracota)]">
                        {ev.subtitle}
                      </p>
                    )}
                    <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/75 leading-relaxed">
                      {ev.description}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-[var(--color-atelier-grafite)]/10">
                      <span className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/60">
                        Anfitriã: <strong>{ev.host_name}</strong> · {ev.rsvp_count || 0} confirmados
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRsvp(ev.id);
                        }}
                        className={`px-4 py-2 rounded-xl font-roboto text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          ev.is_rsvped
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white"
                        }`}
                      >
                        {ev.is_rsvped ? "✓ Presença Confirmada" : "Confirmar Presença"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Sincronizado da Sessão Ao Vivo (Seção 4.5 & 13) */}
            <div className="lg:col-span-5 glass-panel p-5 rounded-[2rem] bg-white/85 border border-white flex flex-col h-[500px]">
              {(() => {
                const activeEv = events.find((e) => e.id === activeLiveEventId) || events[0];
                const msgs = activeEv?.messages || [];
                return (
                  <>
                    <div className="pb-3 border-b border-[var(--color-atelier-grafite)]/10 flex items-center justify-between">
                      <div>
                        <span className="inline-flex items-center gap-1.5 font-roboto text-[9.5px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                          <Radio size={12} className="animate-pulse" /> Chat da Sessão Ao Vivo
                        </span>
                        <h4 className="font-elegant text-xl text-[var(--color-atelier-grafite)] line-clamp-1">
                          {activeEv?.title || "Encontro Vêneto"}
                        </h4>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar py-4 flex flex-col gap-3">
                      {msgs.length === 0 ? (
                        <div className="m-auto text-center px-4 opacity-60">
                          <MessageSquare size={28} className="mx-auto mb-2 text-[var(--color-atelier-terracota)]" />
                          <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]">
                            Envie perguntas, notas ou apresente seu negócio para os participantes deste Encontro.
                          </p>
                        </div>
                      ) : (
                        msgs.map((m: any) => (
                          <div key={m.id} className="p-3 rounded-2xl bg-white border border-[var(--color-atelier-grafite)]/10 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)]">
                                {m.profiles?.nome || "Membro"}
                              </span>
                              <span className="font-roboto text-[9.5px] text-[var(--color-atelier-grafite)]/45">
                                {formatTime(m.created_at)}
                              </span>
                            </div>
                            <p className="font-roboto text-[12.5px] text-[var(--color-atelier-grafite)]/85">
                              {m.content}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleSendLiveChatMessage} className="pt-3 border-t border-[var(--color-atelier-grafite)]/10 flex gap-2">
                      <input
                        type="text"
                        value={liveChatInput}
                        onChange={(e) => setLiveChatInput(e.target.value)}
                        placeholder="Escrever no chat do encontro..."
                        className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/15 rounded-xl px-3.5 py-2.5 font-roboto text-[12px] outline-none"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold cursor-pointer"
                      >
                        <Send size={14} />
                      </button>
                    </form>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* DESTINO 6: ESTÚDIO — CONTEÚDO DA LIZ & ECOSSISTEMA (Seção 4.6 & 17) */}
      {activeArea === "estudio" && (
        <div className="flex flex-col gap-6">
          {/* O Ecossistema Liz (Seção 17) */}
          <div className="glass-panel p-6 md:p-8 rounded-[2.4rem] bg-white/85 border border-white flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-roboto text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-atelier-terracota)]">
                  Estúdio · Curadoria Studio Veronna
                </span>
                <h2 className="font-elegant text-3xl md:text-4xl text-[var(--color-atelier-grafite)] leading-none mt-1">
                  O Ecossistema Liz & Biblioteca Prática
                </h2>
                <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 mt-1.5 max-w-2xl">
                  Aulas curtas, Notas do Estúdio, análises de presença digital e ferramentas práticas. Cada conteúdo apresenta um princípio, mostra um exemplo e abre espaço para aplicação real no seu negócio.
                </p>
              </div>
              {isAdminOrGestor && (
                <button
                  onClick={() => setIsNewStudioModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus size={14} /> Nova Nota do Estúdio
                </button>
              )}
            </div>

            {/* Os 4 Pilares do Ecossistema Liz (Seção 17) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-terracota)]/15">
                <span className="font-roboto text-[9.5px] font-black uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                  1. O Mapa
                </span>
                <p className="font-roboto text-[12px] font-bold text-[var(--color-atelier-grafite)] mt-1">
                  Descobrir problemas e oportunidades na presença digital.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-terracota)]/15">
                <span className="font-roboto text-[9.5px] font-black uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                  2. Identidade + Gestão
                </span>
                <p className="font-roboto text-[12px] font-bold text-[var(--color-atelier-grafite)] mt-1">
                  Construir o sistema da marca e desenvolver a presença continuamente.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-terracota)]/15">
                <span className="font-roboto text-[9.5px] font-black uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                  3. Atelier
                </span>
                <p className="font-roboto text-[12px] font-bold text-[var(--color-atelier-grafite)] mt-1">
                  Organizar projetos, materiais, entregas e progresso.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--color-atelier-terracota)] text-white">
                <span className="font-roboto text-[9.5px] font-black uppercase tracking-widest text-amber-100">
                  4. Vêneto
                </span>
                <p className="font-roboto text-[12px] font-bold text-white mt-1">
                  Criar relações, compartilhar conhecimento, encontrar parceiros e evoluir juntos.
                </p>
              </div>
            </div>
          </div>

          {/* Cards de Conteúdo do Estúdio da Liz */}
          <div className="grid grid-cols-1 gap-5">
            {studioContents.map((item) => (
              <div
                key={item.id}
                className="glass-panel p-6 md:p-8 rounded-[2.2rem] bg-white/80 border border-white flex flex-col gap-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-[var(--color-atelier-terracota)]/12 text-[var(--color-atelier-terracota)] font-roboto text-[10px] font-bold uppercase tracking-widest">
                    Studio Veronna · Estúdio · {item.reading_time_minutes || 4} min de leitura
                  </span>
                  <span className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)]/55 uppercase tracking-wider">
                    Pilar: {item.ecosystem_pillar || "Presença"}
                  </span>
                </div>

                <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-snug">
                  {item.title}
                </h3>
                <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/80 leading-relaxed">
                  {item.summary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {item.principle && (
                    <div className="p-4 rounded-2xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-terracota)]/15">
                      <span className="font-roboto text-[9.5px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] block mb-1">
                        O Princípio
                      </span>
                      <p className="font-roboto text-[12.5px] text-[var(--color-atelier-grafite)] font-medium leading-relaxed">
                        {item.principle}
                      </p>
                    </div>
                  )}
                  {item.practical_example && (
                    <div className="p-4 rounded-2xl bg-white border border-[var(--color-atelier-grafite)]/10">
                      <span className="font-roboto text-[9.5px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 block mb-1">
                        Exemplo Prático
                      </span>
                      <p className="font-roboto text-[12.5px] text-[var(--color-atelier-grafite)]/85 leading-relaxed">
                        {item.practical_example}
                      </p>
                    </div>
                  )}
                  {item.application_prompt && (
                    <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                      <span className="font-roboto text-[9.5px] font-bold uppercase tracking-widest text-emerald-800 block mb-1">
                        Aplicação no seu Negócio
                      </span>
                      <p className="font-roboto text-[12.5px] text-[var(--color-atelier-grafite)] leading-relaxed">
                        {item.application_prompt}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--color-atelier-grafite)]/10">
                  <span className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/55">
                    {item.saves_count || 0} salvamentos · {item.applications_count || 0} aplicações compartilhadas
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        await fetch("/api/veneto", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "record_studio_action",
                            content_id: item.id,
                            kind: "apply",
                          }),
                        });
                        setSelectedPostType("aprendizado");
                        setPostTitle(`Aplicação prática: ${item.title.slice(0, 48)}...`);
                        setPostTopicTags(["Nota do Estúdio", "Presença Digital"]);
                        router.push("/comunidade?area=agora");
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Discussão aberta / Compartilhar aplicação
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISÃO: SALVOS */}
      {activeArea === "salvos" && (
        <div className="flex flex-col gap-5">
          <div className="glass-panel p-6 rounded-[2rem] bg-white/80 border border-white">
            <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
              Materiais & Conversas Salvas
            </h2>
            <p className="font-roboto text-[12.5px] text-[var(--color-atelier-grafite)]/65 mt-1">
              Suas referências, respostas úteis e Notas do Estúdio guardadas para aplicar no negócio.
            </p>
          </div>
          {filteredPosts.length === 0 ? (
            <div className="glass-panel p-12 rounded-[2rem] bg-white/60 text-center">
              <Bookmark size={32} className="mx-auto mb-2 text-[var(--color-atelier-terracota)]" />
              <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/65">
                Você ainda não salvou publicações. Clique em &ldquo;Salvar&rdquo; em qualquer conversa útil para guardá-la aqui.
              </p>
            </div>
          ) : (
            filteredPosts.map((post, idx) => renderPostCard(post, idx))
          )}
        </div>
      )}

      {/* VISÃO: MENSAGENS PRIVADAS COM CONTROLE DE PRIVACIDADE (Seção 6 & 11) */}
      {activeArea === "mensagens" && (
        <div className="glass-panel p-6 md:p-8 rounded-[2.4rem] bg-white/85 border border-white flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-atelier-grafite)]/10 pb-4">
            <div>
              <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none">
                Mensagens Privadas
              </h2>
              <p className="font-roboto text-[12.5px] text-[var(--color-atelier-grafite)]/65 mt-1">
                Conversas diretas e controladas entre membros do Vêneto.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Lock size={14} className="text-[var(--color-atelier-terracota)]" />
              <span className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)]/70">
                Quem pode iniciar contato:
              </span>
              <select
                value={onboardingForm.dm_privacy}
                onChange={async (e) => {
                  const val = e.target.value;
                  setOnboardingForm((prev) => ({ ...prev, dm_privacy: val }));
                  await fetch("/api/veneto", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "update_profile", dm_privacy: val }),
                  });
                  showToast("Preferência de privacidade de mensagens atualizada!");
                }}
                className="bg-white border border-[var(--color-atelier-grafite)]/15 rounded-xl px-3 py-1.5 font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)] outline-none cursor-pointer"
              >
                <option value="everyone">Todos os membros</option>
                <option value="connections">Apenas conexões que sigo</option>
                <option value="none">Ninguém (Desativado)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[380px]">
            {/* Lista de Contatos */}
            <div className="md:col-span-4 border-r border-[var(--color-atelier-grafite)]/10 pr-2 flex flex-col gap-2">
              <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/45">
                Membros para conversar
              </span>
              {members
                .filter((m) => m.id !== currentUser?.id)
                .slice(0, 8)
                .map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setActiveDmPartnerId(m.id)}
                    className={`p-3 rounded-2xl text-left flex items-center gap-3 transition-all cursor-pointer ${
                      activeDmPartnerId === m.id
                        ? "bg-[var(--color-atelier-grafite)] text-white"
                        : "bg-white/70 hover:bg-white text-[var(--color-atelier-grafite)]"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] font-elegant text-lg flex items-center justify-center shrink-0 overflow-hidden">
                      {m.avatar_url ? (
                        <img src={normalizeImageUrl(m.avatar_url)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        m.nome?.charAt(0)
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-roboto text-[12px] font-bold truncate">{m.nome}</span>
                      <span
                        className={`font-roboto text-[10px] truncate ${
                          activeDmPartnerId === m.id ? "text-white/70" : "text-[var(--color-atelier-grafite)]/55"
                        }`}
                      >
                        {m.area_atuacao || m.empresa || "Membro Vêneto"}
                      </span>
                    </div>
                  </button>
                ))}
            </div>

            {/* Histórico da Conversa Selecionada */}
            <div className="md:col-span-8 flex flex-col justify-between">
              {!activeDmPartnerId ? (
                <div className="m-auto text-center opacity-60 p-8">
                  <MessageSquare size={32} className="mx-auto mb-2 text-[var(--color-atelier-terracota)]" />
                  <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]">
                    Selecione um membro à esquerda para iniciar uma troca direta e respeitosa.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                    {directMessages
                      .filter(
                        (dm) =>
                          (dm.sender_id === currentUser?.id && dm.receiver_id === activeDmPartnerId) ||
                          (dm.sender_id === activeDmPartnerId && dm.receiver_id === currentUser?.id)
                      )
                      .map((dm) => {
                        const mine = dm.sender_id === currentUser?.id;
                        return (
                          <div
                            key={dm.id}
                            className={`p-3.5 rounded-2xl max-w-[80%] ${
                              mine
                                ? "self-end bg-[var(--color-atelier-terracota)] text-white"
                                : "self-start bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]"
                            }`}
                          >
                            {dm.context_label && (
                              <span className="block font-roboto text-[9.5px] font-bold uppercase tracking-wider opacity-75 mb-1">
                                {dm.context_label}
                              </span>
                            )}
                            <p className="font-roboto text-[13px] leading-relaxed">{dm.content}</p>
                          </div>
                        );
                      })}
                  </div>

                  <form onSubmit={handleSendDm} className="flex gap-2 pt-3 border-t border-[var(--color-atelier-grafite)]/10">
                    <input
                      type="text"
                      value={dmInput}
                      onChange={(e) => setDmInput(e.target.value)}
                      placeholder="Escreva uma mensagem privada com contexto..."
                      className="flex-1 bg-white border border-[var(--color-atelier-grafite)]/15 rounded-xl px-4 py-3 font-roboto text-[13px] outline-none"
                    />
                    <button
                      type="submit"
                      className="px-5 py-3 rounded-xl bg-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Enviar
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISÃO: SAÚDE DA COMUNIDADE, SEGURANÇA, MODERAÇÃO E PLANO 90 DIAS (Seções 11, 14, 15) */}
      {activeArea === "moderacao" && (
        <div className="flex flex-col gap-6">
          {/* Métrica Norteadora (Seção 14) */}
          <div className="glass-panel p-6 md:p-8 rounded-[2.4rem] bg-gradient-to-br from-[var(--color-atelier-grafite)] to-[#0D1D30] text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="font-roboto text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">
                Métrica Norteadora do Vêneto (Seção 14)
              </span>
              <h2 className="font-elegant text-3xl md:text-4xl mt-1">
                Membros com troca significativa por semana
              </h2>
              <p className="font-roboto text-[12.5px] text-white/75 mt-1.5 max-w-xl leading-relaxed">
                Um membro conta quando oferece ou recebe uma interação útil — resposta a uma dúvida, feedback aplicado no Laboratório, conexão que gera conversa ou participação num Encontro.
              </p>
            </div>
            <div className="bg-white/10 border border-white/15 rounded-3xl p-6 text-center shrink-0 min-w-[180px]">
              <span className="font-elegant text-5xl text-amber-200 block leading-none">
                {healthMetrics?.meaningfulExchangesWeekly ?? 0}
              </span>
              <span className="font-roboto text-[10px] uppercase tracking-widest text-white/75 font-bold mt-2 block">
                Trocas Significativas
              </span>
            </div>
          </div>

          {/* Painel de Saúde da Comunidade — As 10 Dimensões (Seção 14) */}
          <div className="glass-panel p-6 md:p-8 rounded-[2.4rem] bg-white/85 border border-white flex flex-col gap-4">
            <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
              Painel de Saúde da Comunidade
            </h3>
            <p className="font-roboto text-[12.5px] text-[var(--color-atelier-grafite)]/65">
              Acompanhamos leitores e contribuidores separadamente, priorizando qualidade das relações e problemas resolvidos em vez de tempo de tela.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {[
                {
                  dim: "1. Ativação",
                  metric: "Novos membros com perfil completo e 1ª ação útil",
                  value: `${healthMetrics?.activationRate ?? 0}%`,
                },
                {
                  dim: "2. Integração",
                  metric: "Tempo médio até a 1ª resposta útil ou conexão",
                  value: "< 4h (Fase Fundadores)",
                },
                {
                  dim: "3. Reciprocidade",
                  metric: "Reconhecimentos de ajuda e colaboração registrados",
                  value: `${recognitions.length} reconhecimentos`,
                },
                {
                  dim: "4. Qualidade",
                  metric: "Perguntas respondidas e marcadas como resolvidas",
                  value: `${healthMetrics?.resolutionRate ?? 100}% (${healthMetrics?.questionsResolved ?? 0}/${healthMetrics?.questionsTotal ?? 0})`,
                },
                {
                  dim: "5. Participação",
                  metric: "Contribuidores ativos vs. Leitores (analisados separadamente)",
                  value: `${healthMetrics?.contributorsCount ?? 0} contribuidores · ${healthMetrics?.readersCount ?? 0} leitores`,
                },
                {
                  dim: "6. Retenção",
                  metric: "Coorte de Membros Fundadores ativos na semana",
                  value: `${healthMetrics?.totalMembers ?? 0} membros na base`,
                },
                {
                  dim: "7. Networking",
                  metric: "Conexões profissionais estabelecidas",
                  value: `${healthMetrics?.connectionsCount ?? 0} conexões`,
                },
                {
                  dim: "8. Eventos",
                  metric: "Inscrições confirmadas e conversas em Encontros",
                  value: `${healthMetrics?.eventsRsvpsCount ?? 0} inscrições`,
                },
                {
                  dim: "9. Conteúdo (Estúdio)",
                  metric: "Materiais salvos e aplicados nos negócios",
                  value: `${healthMetrics?.savedMaterialsCount ?? 0} salvos · ${healthMetrics?.appliedMaterialsCount ?? 0} aplicados`,
                },
                {
                  dim: "10. Saúde & Moderação",
                  metric: "Denúncias pendentes de revisão",
                  value: `${healthMetrics?.pendingReportsCount ?? 0} pendentes`,
                },
              ].map((row) => (
                <div
                  key={row.dim}
                  className="p-4 rounded-2xl bg-white border border-[var(--color-atelier-grafite)]/10 flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="font-roboto text-[11px] font-bold uppercase tracking-wider text-[var(--color-atelier-terracota)] block">
                      {row.dim}
                    </span>
                    <span className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/75">
                      {row.metric}
                    </span>
                  </div>
                  <span className="font-roboto text-[12.5px] font-bold text-[var(--color-atelier-grafite)] shrink-0">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Regras Explícitas de Segurança, Privacidade e Consentimento (Seção 11) */}
          <div className="glass-panel p-6 md:p-8 rounded-[2.4rem] bg-white/85 border border-white flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={22} className="text-[var(--color-atelier-terracota)]" />
              <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                Código de Segurança, Consentimento e Moderação (Seção 11)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[var(--color-atelier-creme)]/50 border border-white">
                <h4 className="font-roboto text-[12px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]">
                  Privacidade & Consentimento
                </h4>
                <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/75 mt-1 leading-relaxed">
                  Nenhuma exposição automática de projetos ou estratégias de clientes. Publicar trabalhos no Laboratório requer confirmação explícita de autorização.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--color-atelier-creme)]/50 border border-white">
                <h4 className="font-roboto text-[12px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]">
                  Autopromoção com Contexto
                </h4>
                <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/75 mt-1 leading-relaxed">
                  O Vêneto não é um mural de anúncios. Ofertas e demandas de parceria devem ser publicadas de forma estruturada em &ldquo;Oferecer ou buscar&rdquo;.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--color-atelier-creme)]/50 border border-white">
                <h4 className="font-roboto text-[12px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]">
                  Respeito & Controle Privado
                </h4>
                <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/75 mt-1 leading-relaxed">
                  Cada membro controla quem pode enviar mensagens privadas e dispõe de ferramentas imediatas de denúncia e bloqueio.
                </p>
              </div>
            </div>
          </div>

          {/* Plano de Construção em 90 Dias (Seção 15) */}
          <div className="glass-panel p-6 md:p-8 rounded-[2.4rem] bg-white/85 border border-white flex flex-col gap-4">
            <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
              Plano de Construção em 90 Dias (Seção 15)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col gap-2">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-emerald-800">
                  Fase 1 · Dias 1–30 · Ativa
                </span>
                <h4 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Fundação</h4>
                <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/80 leading-relaxed">
                  Proposta de valor, regras de segurança, onboarding progressivo, identidade do Vêneto, curadoria inicial da Liz e recepção dos membros fundadores.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-terracota)]/25 flex flex-col gap-2">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                  Fase 2 · Dias 31–60 · Implementada
                </span>
                <h4 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">MVP Social</h4>
                <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/80 leading-relaxed">
                  Feed em 3 modos, 6 tipos de publicação estruturada, respostas encadeadas, solução útil, diretório de pessoas, encontros ao vivo e moderação.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-[var(--color-atelier-grafite)]/15 flex flex-col gap-2">
                <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                  Fase 3 · Dias 61–90 · Em Evolução
                </span>
                <h4 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Retenção e Densidade</h4>
                <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/80 leading-relaxed">
                  Rituais semanais (SEG–SEX), camada de reconhecimento por contribuição útil, recomendações de conexões e métricas de saúde da comunidade.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAIS DO VÊNETO (Onboarding, Reconhecimento, DM, Denúncia, Exclusão)
          ========================================================================= */}

      {/* MODAL 1: ONBOARDING PROGRESSIVO — "O QUE VOCÊ VEIO FAZER NO VÊNETO?" (Seção 6) */}
      <AnimatePresence>
        {isOnboardingOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOnboardingOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              className="glass-panel bg-white p-7 md:p-9 rounded-[2.5rem] shadow-2xl w-full max-w-2xl relative z-10 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col gap-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="font-roboto text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-atelier-terracota)]">
                    Onboarding Progressivo · Vêneto
                  </span>
                  <h2 className="font-elegant text-3xl md:text-4xl text-[var(--color-atelier-grafite)] mt-1">
                    O que você veio fazer no Vêneto?
                  </h2>
                  <p className="font-roboto text-[12.5px] text-[var(--color-atelier-grafite)]/65 mt-1">
                    Suas escolhas ajudam a rede a recomendar pessoas, conversas e encontros compatíveis com o momento do seu negócio.
                  </p>
                </div>
                <button
                  onClick={() => setIsOnboardingOpen(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveOnboarding} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ONBOARDING_OBJECTIVES.map((obj) => {
                    const selected = onboardingForm.veneto_objectives.includes(obj);
                    return (
                      <button
                        key={obj}
                        type="button"
                        onClick={() =>
                          setOnboardingForm((prev) => ({
                            ...prev,
                            veneto_objectives: selected
                              ? prev.veneto_objectives.filter((o) => o !== obj)
                              : [...prev.veneto_objectives, obj],
                          }))
                        }
                        className={`p-3 rounded-xl border text-left font-roboto text-[12px] font-bold transition-all cursor-pointer ${
                          selected
                            ? "bg-[var(--color-atelier-terracota)] text-white border-[var(--color-atelier-terracota)]"
                            : "bg-gray-50 hover:bg-white text-[var(--color-atelier-grafite)] border-gray-200"
                        }`}
                      >
                        {selected ? "✓ " : "+ "} {obj}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex flex-col gap-1">
                    <label className="font-roboto text-[10px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/60">
                      Área de atuação
                    </label>
                    <input
                      type="text"
                      value={onboardingForm.area_atuacao}
                      onChange={(e) => setOnboardingForm({ ...onboardingForm, area_atuacao: e.target.value })}
                      placeholder="Ex: Saúde & Estética, Consultoria, Design..."
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-roboto text-[12.5px] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-roboto text-[10px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/60">
                      Segmento / Tipo de negócio
                    </label>
                    <input
                      type="text"
                      value={onboardingForm.segmento}
                      onChange={(e) => setOnboardingForm({ ...onboardingForm, segmento: e.target.value })}
                      placeholder="Ex: Clínica, Estúdio Criativo, Educação..."
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-roboto text-[12.5px] outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-roboto text-[10px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/60">
                    Apresentação profissional (Bio)
                  </label>
                  <textarea
                    rows={2}
                    value={onboardingForm.bio}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, bio: e.target.value })}
                    placeholder="Conte brevemente sobre sua trajetória, marca e momento atual..."
                    className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-roboto text-[12px] outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-roboto text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      O que você oferece para a rede
                    </label>
                    <textarea
                      rows={2}
                      value={onboardingForm.o_que_oferece}
                      onChange={(e) => setOnboardingForm({ ...onboardingForm, o_que_oferece: e.target.value })}
                      placeholder="Competências, serviços ou experiências que pode compartilhar..."
                      className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-roboto text-[12px] outline-none resize-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-roboto text-[10px] font-bold uppercase tracking-wider text-blue-800">
                      O que você procura hoje
                    </label>
                    <textarea
                      rows={2}
                      value={onboardingForm.o_que_procura}
                      onChange={(e) => setOnboardingForm({ ...onboardingForm, o_que_procura: e.target.value })}
                      placeholder="Parceiros, fornecedores, feedbacks ou aprendizados..."
                      className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-roboto text-[12px] outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--color-atelier-creme)]/60 border border-[var(--color-atelier-terracota)]/20 flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="font-roboto text-[11.5px] font-bold text-[var(--color-atelier-grafite)]">
                      Deixar meu perfil aberto para conexões em Pessoas
                    </span>
                    <span className="font-roboto text-[10.5px] text-[var(--color-atelier-grafite)]/60">
                      Apenas perfis preenchidos e abertos para conexão aparecem no diretório Pessoas.
                    </span>
                  </div>
                  <select
                    value={onboardingForm.dm_privacy}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, dm_privacy: e.target.value })}
                    className="bg-white border border-[var(--color-atelier-grafite)]/15 rounded-xl px-3 py-2 font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)] outline-none cursor-pointer"
                  >
                    <option value="everyone">Aberto a todos</option>
                    <option value="connections">Aberto a conexões</option>
                    <option value="none">Fechado (oculto)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsOnboardingOpen(false)}
                    className="px-5 py-2.5 rounded-xl font-roboto text-[11px] font-bold text-gray-500 hover:bg-gray-100 cursor-pointer"
                  >
                    Agora não
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingOnboarding}
                    className="px-6 py-2.5 rounded-xl bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    {isSavingOnboarding ? "Salvando..." : "Salvar e Personalizar Vêneto"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: CAMADA DE RECONHECIMENTO (Seção 10 — 4 Tipos de Contribuição) */}
      <AnimatePresence>
        {recognitionModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRecognitionModal(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel bg-white p-7 rounded-[2.4rem] shadow-2xl w-full max-w-md relative z-10 flex flex-col gap-4"
            >
              <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                Reconhecer {recognitionModal.toUserName}
              </h3>
              <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/65">
                No Vêneto, reconhecemos membros que resolvem problemas, compartilham boas referências, colaboram em projetos e acolhem a comunidade.
              </p>

              <form onSubmit={handleGiveRecognition} className="flex flex-col gap-3">
                {(Object.keys(RECOGNITION_BADGES) as Array<keyof typeof RECOGNITION_BADGES>).map((key) => {
                  const b = RECOGNITION_BADGES[key];
                  const active = recognitionBadge === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRecognitionBadge(key)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        active
                          ? "bg-[var(--color-atelier-grafite)] text-white border-[var(--color-atelier-grafite)]"
                          : "bg-gray-50 hover:bg-white text-[var(--color-atelier-grafite)] border-gray-200"
                      }`}
                    >
                      <span className="font-roboto text-[12px] font-bold block">{b.label}</span>
                      <span className={`font-roboto text-[10.5px] ${active ? "text-white/75" : "text-gray-500"}`}>
                        {b.desc}
                      </span>
                    </button>
                  );
                })}

                <textarea
                  rows={2}
                  value={recognitionNote}
                  onChange={(e) => setRecognitionNote(e.target.value)}
                  placeholder="Deixe uma nota transparente explicando como essa pessoa ajudou você..."
                  className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-roboto text-[12px] outline-none resize-none"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRecognitionModal(null)}
                    className="px-4 py-2 rounded-xl font-roboto text-[11px] font-bold text-gray-500 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Registrar Reconhecimento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: ENVIAR MENSAGEM PRIVADA RÁPIDA */}
      <AnimatePresence>
        {dmTargetUser && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDmTargetUser(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel bg-white p-7 rounded-[2.4rem] shadow-2xl w-full max-w-md relative z-10 flex flex-col gap-4"
            >
              <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                Mensagem para {dmTargetUser.nome}
              </h3>
              <form onSubmit={handleSendDm} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={dmContextLabel}
                  onChange={(e) => setDmContextLabel(e.target.value)}
                  placeholder="Assunto / Motivo do contato (ex: Troca sobre posicionamento)"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-roboto text-[12px] outline-none"
                />
                <textarea
                  rows={4}
                  required
                  value={dmInput}
                  onChange={(e) => setDmInput(e.target.value)}
                  placeholder="Apresente o motivo do contato de forma objetiva e gentil..."
                  className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 font-roboto text-[12.5px] outline-none resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDmTargetUser(null)}
                    className="px-4 py-2 rounded-xl font-roboto text-[11px] font-bold text-gray-500 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Enviar Mensagem
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: DENÚNCIA / MODERAÇÃO (Seção 11) */}
      <AnimatePresence>
        {reportModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReportModal(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel bg-white p-7 rounded-[2.4rem] shadow-2xl w-full max-w-md relative z-10 flex flex-col gap-4"
            >
              <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                Sinalizar para a Moderação
              </h3>
              <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/65">
                Ajude a preservar a confiança e a segurança do Vêneto.
              </p>
              <form onSubmit={handleReportSubmit} className="flex flex-col gap-3">
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-roboto text-[12px] font-bold outline-none"
                >
                  <option value="autopromocao_spam">Autopromoção comercial fora das regras / Spam</option>
                  <option value="sem_consentimento">Exposição de trabalho/projeto sem consentimento</option>
                  <option value="privacidade_cliente">Exposição de dados sensíveis</option>
                  <option value="desrespeito_assedio">Desrespeito ou conduta inadequada</option>
                </select>
                <textarea
                  rows={3}
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Detalhes adicionais para a equipe de moderação..."
                  className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-roboto text-[12px] outline-none resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReportModal(null)}
                    className="px-4 py-2 rounded-xl font-roboto text-[11px] font-bold text-gray-500 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-roboto text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Enviar Denúncia
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: CRIAR ENCONTRO (Admin / Curadoria) */}
      <AnimatePresence>
        {isNewEventModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewEventModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel bg-white p-7 rounded-[2.4rem] shadow-2xl w-full max-w-lg relative z-10 flex flex-col gap-4"
            >
              <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                Agendar Novo Encontro no Vêneto
              </h3>
              <form onSubmit={handleCreateEvent} className="flex flex-col gap-3">
                <input
                  type="text"
                  required
                  placeholder="Título do Encontro (ex: Clínica Vêneto: Revisão de Posicionamento)"
                  value={newEventForm.title}
                  onChange={(e) => setNewEventForm({ ...newEventForm, title: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-roboto text-[12.5px] outline-none"
                />
                <input
                  type="text"
                  placeholder="Subtítulo / formato"
                  value={newEventForm.subtitle}
                  onChange={(e) => setNewEventForm({ ...newEventForm, subtitle: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-roboto text-[12.5px] outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newEventForm.ritual_day}
                    onChange={(e) => setNewEventForm({ ...newEventForm, ritual_day: e.target.value })}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 font-roboto text-[12px] outline-none"
                  >
                    <option value="SEG">SEG · Pergunta da semana</option>
                    <option value="TER">TER · Clínica Vêneto</option>
                    <option value="QUA">QUA · Nota do Estúdio</option>
                    <option value="QUI">QUI · Encontro aberto</option>
                    <option value="SEX">SEX · O que avançou?</option>
                  </select>
                  <input
                    type="datetime-local"
                    value={newEventForm.starts_at}
                    onChange={(e) => setNewEventForm({ ...newEventForm, starts_at: e.target.value })}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 font-roboto text-[12px] outline-none"
                  />
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Descrição e pauta do encontro..."
                  value={newEventForm.description}
                  onChange={(e) => setNewEventForm({ ...newEventForm, description: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-roboto text-[12.5px] outline-none resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewEventModalOpen(false)}
                    className="px-4 py-2 rounded-xl font-roboto text-[11px] font-bold text-gray-500 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Publicar Encontro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: CRIAR CONTEÚDO NO ESTÚDIO DA LIZ */}
      <AnimatePresence>
        {isNewStudioModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewStudioModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel bg-white p-7 rounded-[2.4rem] shadow-2xl w-full max-w-lg relative z-10 flex flex-col gap-3"
            >
              <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                Publicar no Estúdio da Liz
              </h3>
              <form onSubmit={handleCreateStudioContent} className="flex flex-col gap-3">
                <input
                  type="text"
                  required
                  placeholder="Título da Nota ou Aula Curta"
                  value={newStudioForm.title}
                  onChange={(e) => setNewStudioForm({ ...newStudioForm, title: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-roboto text-[12.5px] outline-none"
                />
                <textarea
                  rows={2}
                  required
                  placeholder="Síntese executiva..."
                  value={newStudioForm.summary}
                  onChange={(e) => setNewStudioForm({ ...newStudioForm, summary: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-3 font-roboto text-[12px] outline-none resize-none"
                />
                <input
                  type="text"
                  placeholder="O Princípio central"
                  value={newStudioForm.principle}
                  onChange={(e) => setNewStudioForm({ ...newStudioForm, principle: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-roboto text-[12px] outline-none"
                />
                <input
                  type="text"
                  placeholder="Exemplo prático"
                  value={newStudioForm.practical_example}
                  onChange={(e) => setNewStudioForm({ ...newStudioForm, practical_example: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-roboto text-[12px] outline-none"
                />
                <input
                  type="text"
                  placeholder="Convite de aplicação prática para os membros"
                  value={newStudioForm.application_prompt}
                  onChange={(e) => setNewStudioForm({ ...newStudioForm, application_prompt: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-roboto text-[12px] outline-none"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewStudioModalOpen(false)}
                    className="px-4 py-2 rounded-xl font-roboto text-[11px] font-bold text-gray-500 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Publicar no Estúdio
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 7: CONFIRMAÇÃO DE EXCLUSÃO */}
      <AnimatePresence>
        {postToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPostToDelete(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm relative z-10 flex flex-col items-center text-center"
            >
              <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">
                Excluir Publicação?
              </h2>
              <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 mb-6">
                Esta publicação será removida permanentemente do Vêneto.
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setPostToDelete(null)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 font-roboto text-[11px] font-bold uppercase tracking-wider text-gray-600 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeletePost}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-roboto text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickHomePill({
  label,
  active,
  highlight = false,
  onClick,
}: {
  label: string;
  active: boolean;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full font-roboto text-[11px] font-bold transition-all cursor-pointer border ${
        active
          ? "bg-[var(--color-atelier-grafite)] text-white border-[var(--color-atelier-grafite)] shadow-2xs"
          : highlight
          ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
          : "bg-white/80 text-[var(--color-atelier-grafite)]/70 border-white hover:bg-white hover:text-[var(--color-atelier-grafite)]"
      }`}
    >
      {label}
    </button>
  );
}