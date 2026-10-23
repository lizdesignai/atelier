// src/app/comunidade/perfil/[username]/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, MapPin, Calendar, Edit3, Camera, Heart, MessageCircle,
  Share2, Send, AlertCircle, Crown, X, Trash2, CheckCircle2,
  Briefcase, Handshake, HelpCircle, FlaskConical, Award, ShieldCheck,
  ExternalLink, Globe, UserPlus, UserCheck, Lock, Flag, Ban, Plus,
  Bookmark, Info, Compass, Layers
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import Link from "next/link";
import { normalizeImageUrl, handleAvatarError } from "../../../../lib/imageUtils";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

const RECOGNITION_PILLARS = [
  {
    key: "ajuda_util",
    label: "Ajuda útil",
    description: "Respostas marcadas como úteis ou soluções validadas por quem fez a pergunta.",
    criteria: "Concedido automaticamente ao ter uma resposta marcada como Solução Útil em Trocas ou atribuído por membros ajudados.",
    color: "bg-amber-50 text-amber-800 border-amber-200",
    badgeBg: "bg-amber-500"
  },
  {
    key: "curadoria",
    label: "Curadoria",
    description: "Materiais, referências, aprendizados práticos e resumos relevantes compartilhados.",
    criteria: "Concedido a membros que compartilham aprendizados, referências e análises aplicáveis ao negócio.",
    color: "bg-purple-50 text-purple-800 border-purple-200",
    badgeBg: "bg-purple-600"
  },
  {
    key: "colaboracao",
    label: "Colaboração",
    description: "Conexões profissionais, críticas construtivas no Laboratório e parcerias iniciadas.",
    criteria: "Concedido por feedbacks estruturados no Laboratório de Projetos e parcerias concretizadas na rede.",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    badgeBg: "bg-emerald-600"
  },
  {
    key: "acolhimento",
    label: "Acolhimento",
    description: "Boas-vindas, orientação inicial e apoio genuíno aos novos membros do Vêneto.",
    criteria: "Concedido por recepcionar novos membros e facilitar a integração em discussões e encontros.",
    color: "bg-blue-50 text-blue-800 border-blue-200",
    badgeBg: "bg-blue-600"
  }
];

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = use(params);
  const decodedIdentifier = decodeURIComponent(resolvedParams.username);

  const [isLoading, setIsLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [profile, setProfile] = useState<any>(null);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [recognitions, setRecognitions] = useState<any[]>([]);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // Abas do Perfil Profissional Vêneto
  const [activeTab, setActiveTab] = useState<
    "visao_geral" | "publicacoes" | "trocas" | "laboratorio" | "parcerias" | "reconhecimentos"
  >("visao_geral");

  // Modal de Edição Progressiva (Seção 6)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: "",
    username: "",
    cargo: "",
    empresa: "",
    area_atuacao: "",
    segmento: "",
    localizacao: "",
    bio: "",
    o_que_oferece: "",
    o_que_procura: "",
    skills_str: "",
    interesses_str: "",
    instagram: "",
    site: "",
    linkedin: "",
    portfolio: "",
    open_for_connections: false,
    dm_privacy: "none",
    projeto_1_titulo: "",
    projeto_1_desc: "",
    projeto_1_url: "",
    projeto_2_titulo: "",
    projeto_2_desc: "",
    projeto_2_url: ""
  });

  // Modal de Mensagem Direta
  const [isDmModalOpen, setIsDmModalOpen] = useState(false);
  const [dmText, setDmText] = useState("");
  const [isSendingDm, setIsSendingDm] = useState(false);

  // Modal de Conceder Reconhecimento (Seção 10)
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState("ajuda_util");
  const [recReason, setRecReason] = useState("");
  const [isSendingRec, setIsSendingRec] = useState(false);

  // Modal de Contestação de Reconhecimento (Seção 10)
  const [contestingRec, setContestingRec] = useState<any | null>(null);
  const [contestNote, setContestNote] = useState("");

  // Upload de Imagem
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Estados de Interação nos Posts do Perfil
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [commentsData, setCommentsData] = useState<Record<string, any[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/veneto");
        if (!res.ok) throw new Error("Falha ao carregar dados do Vêneto");
        const data = await res.json();

        const foundCurrent = data.currentUser || null;
        if (foundCurrent) {
          setCurrentUser(foundCurrent);
        }

        const membersList: any[] = data.members || [];
        const cleanSlug = decodedIdentifier.replace(/^@/, "").trim().toLowerCase();

        let targetProfile = membersList.find(
          (p) =>
            p.username?.toLowerCase() === cleanSlug ||
            p.id?.toLowerCase() === cleanSlug ||
            p.nome?.toLowerCase().replace(/\s+/g, "") === cleanSlug
        );

        if (!targetProfile && foundCurrent) {
          const currentSlug = (
            foundCurrent.username ||
            foundCurrent.nome?.toLowerCase().replace(/\s+/g, "") ||
            ""
          ).toLowerCase();
          if (currentSlug === cleanSlug || foundCurrent.id?.toLowerCase() === cleanSlug) {
            targetProfile = foundCurrent;
          }
        }

        if (targetProfile) {
          setProfile(targetProfile);
          const own = Boolean(foundCurrent && foundCurrent.id === targetProfile.id);
          setIsOwnProfile(own);

          const memberPosts = (data.posts || []).filter(
            (p: any) => p.author_id === targetProfile.id
          );
          setAllPosts(memberPosts);

          const memberRecs = (data.recognitions || [])
            .filter((r: any) => (r.to_user_id || r.user_id) === targetProfile.id)
            .map((r: any) => ({
              ...r,
              pillar: r.badge_type || r.pillar || "ajuda_util",
              reason: r.note || r.reason || "",
              awarded_by_nome: r.from_user?.nome || r.awarded_by_nome || "Membro Vêneto",
              contestation_note: r.contest_reason || r.contestation_note || ""
            }));
          setRecognitions(memberRecs);

          setIsConnected(Boolean(targetProfile.is_connected));
          setConnectionsCount(
            membersList.filter((m) => m.is_connected || m.follows_me).length
          );
          setIsBlocked((data.blockedIds || []).includes(targetProfile.id));
        }
      } catch (err) {
        console.error("Erro ao carregar perfil Vêneto:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [decodedIdentifier]);

  const openEditModal = () => {
    if (!profile) return;
    const links = profile.links_profissionais || {};
    const projs = Array.isArray(profile.projetos_destaque) ? profile.projetos_destaque : [];
    const isCurrentlyOpen = Boolean(profile.dm_privacy && profile.dm_privacy !== "none");
    setEditForm({
      nome: profile.nome || "",
      username: profile.username || profile.nome?.toLowerCase().replace(/\s+/g, "") || "",
      cargo: profile.cargo || "",
      empresa: profile.empresa || "",
      area_atuacao: profile.area_atuacao || "",
      segmento: profile.segmento || "",
      localizacao: profile.localizacao || "",
      bio: profile.bio || "",
      o_que_oferece: profile.o_que_oferece || "",
      o_que_procura: profile.o_que_procura || "",
      skills_str: Array.isArray(profile.skills) ? profile.skills.join(", ") : "",
      interesses_str: Array.isArray(profile.interesses) ? profile.interesses.join(", ") : "",
      instagram: links.instagram || "",
      site: links.site || "",
      linkedin: links.linkedin || "",
      portfolio: links.portfolio || "",
      open_for_connections: isCurrentlyOpen,
      dm_privacy: isCurrentlyOpen ? profile.dm_privacy : "everyone",
      projeto_1_titulo: projs[0]?.title || "",
      projeto_1_desc: projs[0]?.description || "",
      projeto_1_url: projs[0]?.url || "",
      projeto_2_titulo: projs[1]?.title || "",
      projeto_2_desc: projs[1]?.description || "",
      projeto_2_url: projs[1]?.url || ""
    });
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSavingEdit(true);
    try {
      const cleanUsername = editForm.username.replace("@", "").trim().toLowerCase();
      const skills = editForm.skills_str
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const interesses = editForm.interesses_str
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const links_profissionais = {
        instagram: editForm.instagram.trim(),
        site: editForm.site.trim(),
        linkedin: editForm.linkedin.trim(),
        portfolio: editForm.portfolio.trim()
      };
      const projetos_destaque = [];
      if (editForm.projeto_1_titulo.trim()) {
        projetos_destaque.push({
          title: editForm.projeto_1_titulo.trim(),
          description: editForm.projeto_1_desc.trim(),
          url: editForm.projeto_1_url.trim()
        });
      }
      if (editForm.projeto_2_titulo.trim()) {
        projetos_destaque.push({
          title: editForm.projeto_2_titulo.trim(),
          description: editForm.projeto_2_desc.trim(),
          url: editForm.projeto_2_url.trim()
        });
      }

      const finalDmPrivacy = editForm.open_for_connections
        ? editForm.dm_privacy === "none"
          ? "everyone"
          : editForm.dm_privacy
        : "none";

      const hasRequiredInfo = Boolean(
        editForm.bio.trim().length > 5 &&
          (editForm.area_atuacao.trim() || editForm.cargo.trim() || editForm.o_que_oferece.trim())
      );

      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          nome: editForm.nome,
          username: cleanUsername,
          cargo: editForm.cargo.trim() || null,
          empresa: editForm.empresa.trim() || null,
          area_atuacao: editForm.area_atuacao.trim() || null,
          segmento: editForm.segmento.trim() || null,
          localizacao: editForm.localizacao.trim() || null,
          bio: editForm.bio.trim() || null,
          o_que_oferece: editForm.o_que_oferece.trim() || null,
          o_que_procura: editForm.o_que_procura.trim() || null,
          skills,
          interesses,
          links_profissionais,
          projetos_destaque,
          dm_privacy: finalDmPrivacy,
          veneto_onboarding_done: Boolean(editForm.open_for_connections && hasRequiredInfo)
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao atualizar perfil");

      setProfile(json.profile);
      setIsEditModalOpen(false);
      window.dispatchEvent(new CustomEvent("venetoUpdated"));
      showToast("Perfil profissional do Vêneto atualizado com sucesso!");
    } catch (error: any) {
      showToast(error.message || "Erro ao atualizar perfil.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleConnection = async () => {
    if (!currentUser || !profile || isOwnProfile) return;
    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_connection",
          target_user_id: profile.id
        })
      });
      const json = await res.json();
      setIsConnected(json.connected);
      setConnectionsCount((prev) => (json.connected ? prev + 1 : Math.max(0, prev - 1)));
      window.dispatchEvent(new CustomEvent("venetoUpdated"));
      showToast(
        json.connected
          ? `Você agora acompanha ${profile.nome} no Vêneto!`
          : `Conexão com ${profile.nome} removida.`
      );
    } catch {
      showToast("Erro ao atualizar conexão.");
    }
  };

  const handleSendDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmText.trim() || !currentUser || !profile) return;
    setIsSendingDm(true);
    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_dm",
          receiver_id: profile.id,
          content: dmText.trim()
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Não foi possível enviar a mensagem.");
      setDmText("");
      setIsDmModalOpen(false);
      showToast(`Mensagem enviada para ${profile.nome}!`);
    } catch (err: any) {
      showToast(err.message || "Erro ao enviar mensagem.");
    } finally {
      setIsSendingDm(false);
    }
  };

  const handleGiveRecognition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recReason.trim() || !currentUser || !profile) return;
    setIsSendingRec(true);
    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "give_recognition",
          to_user_id: profile.id,
          badge_type: selectedPillar,
          note: recReason.trim()
        })
      });
      const json = await res.json();
      if (json.recognition) {
        setRecognitions((prev) => [
          {
            ...json.recognition,
            pillar: json.recognition.badge_type || selectedPillar,
            reason: json.recognition.note || recReason.trim(),
            awarded_by_nome: currentUser.nome
          },
          ...prev
        ]);
        setIsRecModalOpen(false);
        setRecReason("");
        showToast("Reconhecimento registrado com transparência no perfil!");
      }
    } catch {
      showToast("Erro ao conceder reconhecimento.");
    } finally {
      setIsSendingRec(false);
    }
  };

  const handleContestRecognition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contestingRec || !contestNote.trim()) return;
    try {
      await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "contest_recognition",
          recognition_id: contestingRec.id,
          reason: contestNote.trim()
        })
      });
      setRecognitions((prev) =>
        prev.map((r) =>
          r.id === contestingRec.id
            ? { ...r, is_contested: true, contestation_note: contestNote.trim() }
            : r
        )
      );
      setContestingRec(null);
      setContestNote("");
      showToast("Contestação registrada. A curadoria revisará a classificação.");
    } catch {
      showToast("Erro ao registrar contestação.");
    }
  };

  const handleToggleBlock = async () => {
    if (!currentUser || !profile) return;
    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_block",
          blocked_id: profile.id
        })
      });
      const json = await res.json();
      setIsBlocked(json.blocked);
      showToast(
        json.blocked
          ? "Usuário silenciado/bloqueado nas suas interações."
          : "Bloqueio removido."
      );
    } catch {
      showToast("Erro ao alterar bloqueio.");
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwnProfile) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("A imagem deve ter menos de 5MB");
      return;
    }
    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "community_covers");
      const upRes = await fetch("/api/storage/upload", { method: "POST", body: formData });
      let publicUrl = "";
      if (upRes.ok) {
        const upJson = await upRes.json();
        publicUrl = upJson.publicUrl || upJson.url;
      } else {
        const fileExt = file.name.split(".").pop();
        const fileName = `cover_${profile.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("community_covers")
          .upload(fileName, file, { cacheControl: "3600", upsert: true });
        if (uploadError) throw new Error("Erro ao enviar imagem de capa.");
        const { data } = supabase.storage.from("community_covers").getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_profile", cover_url: publicUrl })
      });
      const json = await res.json();
      if (json.profile) setProfile(json.profile);
      else setProfile({ ...profile, cover_url: publicUrl });
      showToast("Capa atualizada com sucesso!");
    } catch (error: any) {
      showToast(error.message || "Erro ao atualizar a capa.");
    } finally {
      setIsUploadingCover(false);
      e.target.value = "";
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwnProfile) return;
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "avatars");
      const upRes = await fetch("/api/storage/upload", { method: "POST", body: formData });
      let publicUrl = "";
      if (upRes.ok) {
        const upJson = await upRes.json();
        publicUrl = upJson.publicUrl || upJson.url;
      } else {
        const fileExt = file.name.split(".").pop();
        const fileName = `avatar_${profile.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_profile", avatar_url: publicUrl })
      });
      const json = await res.json();
      if (json.profile) setProfile(json.profile);
      else setProfile({ ...profile, avatar_url: publicUrl });
      window.dispatchEvent(new CustomEvent("venetoUpdated"));
      showToast("Foto de perfil atualizada com sucesso!");
    } catch {
      showToast("Erro ao atualizar a foto de perfil.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    const res = await fetch("/api/veneto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_like", post_id: postId })
    });
    const json = await res.json();
    setAllPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_liked_by_me: json.liked,
              likes_count: json.liked
                ? (p.likes_count || 0) + 1
                : Math.max(0, (p.likes_count || 0) - 1)
            }
          : p
      )
    );
  };

  const toggleComments = async (postId: string) => {
    if (expandedComments.includes(postId)) {
      setExpandedComments(expandedComments.filter((id) => id !== postId));
    } else {
      setExpandedComments([...expandedComments, postId]);
      if (!commentsData[postId]) {
        const res = await fetch("/api/veneto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_comments", post_id: postId })
        });
        const json = await res.json();
        if (json.comments) setCommentsData((prev) => ({ ...prev, [postId]: json.comments }));
      }
    }
  };

  const handleSendComment = async (postId: string) => {
    const content = commentInputs[postId];
    if (!content?.trim() || !currentUser) return;
    setIsSubmittingComment(postId);
    try {
      const res = await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_comment",
          post_id: postId,
          content: content.trim()
        })
      });
      const json = await res.json();
      if (json.comment) {
        setCommentsData((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), json.comment]
        }));
        setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      }
    } catch {
      showToast("Erro ao enviar comentário.");
    } finally {
      setIsSubmittingComment(null);
    }
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    const idBackup = postToDelete;
    setAllPosts((prev) => prev.filter((p) => p.id !== idBackup));
    setPostToDelete(null);
    try {
      await fetch("/api/veneto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_post", post_id: idBackup })
      });
      showToast("Publicação excluída com sucesso.");
    } catch {
      showToast("Erro ao excluir a publicação.");
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "Recente";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 w-full">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-60 w-full">
        <AlertCircle size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
        <h2 className="font-elegant text-3xl">Perfil não encontrado no Vêneto.</h2>
        <p className="font-roboto text-sm mt-1">
          Este membro pode não existir ou o endereço está incorreto.
        </p>
        <Link
          href="/comunidade"
          className="mt-6 px-6 py-3 rounded-2xl bg-[var(--color-atelier-grafite)] text-white text-xs font-bold uppercase tracking-widest"
        >
          Voltar ao Vêneto
        </Link>
      </div>
    );
  }

  // Cálculo de Completude Progressiva do Perfil (Seção 6)
  const completionChecks = [
    Boolean(profile.nome),
    Boolean(profile.empresa),
    Boolean(profile.area_atuacao),
    Boolean(profile.bio),
    Boolean(profile.o_que_oferece),
    Boolean(profile.o_que_procura),
    Boolean(Array.isArray(profile.skills) && profile.skills.length > 0),
    Boolean(Array.isArray(profile.projetos_destaque) && profile.projetos_destaque.length > 0)
  ];
  const completionPercent = Math.round(
    (completionChecks.filter(Boolean).length / completionChecks.length) * 100
  );

  // Filtro das publicações por aba
  const filteredPosts = allPosts.filter((post) => {
    if (activeTab === "publicacoes") return true;
    if (activeTab === "trocas") return post.post_type === "duvida" || post.group_slug === "trocas";
    if (activeTab === "laboratorio")
      return post.post_type === "feedback" || post.group_slug === "laboratorio" || post.group_slug === "feedback";
    if (activeTab === "parcerias")
      return post.post_type === "parceria" || post.group_slug === "networking";
    return true;
  });

  const links = profile.links_profissionais || {};
  const highlightedProjects = Array.isArray(profile.projetos_destaque)
    ? profile.projetos_destaque
    : [];

  return (
    <>
      {/* ==========================================
          MODAL DE EXCLUSÃO DE POST
          ========================================== */}
      <AnimatePresence>
        {postToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPostToDelete(null)}
              className="absolute inset-0 bg-[var(--color-atelier-grafite)]/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel bg-white/95 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm relative z-10 flex flex-col items-center text-center border border-white"
            >
              <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4 border border-red-100">
                <Trash2 size={24} />
              </div>
              <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">
                Excluir Publicação?
              </h2>
              <p className="font-roboto text-xs text-[var(--color-atelier-grafite)]/70 mb-6 leading-relaxed">
                Esta ação removerá a publicação permanentemente do Vêneto.
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setPostToDelete(null)}
                  className="flex-1 py-3.5 rounded-xl bg-gray-100 font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeletePost}
                  className="flex-1 py-3.5 rounded-xl bg-red-500 text-white font-roboto text-[10px] font-bold uppercase tracking-widest hover:bg-red-600"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MODAL DE EDIÇÃO PROGRESSIVA DO PERFIL (SEÇÃO 6)
          ========================================== */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsEditModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel bg-white/95 backdrop-blur-xl border border-white p-8 md:p-10 rounded-[2.8rem] shadow-2xl w-full max-w-2xl relative z-10 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-atelier-terracota)]">
                    Construção Progressiva · Vêneto
                  </span>
                  <h2 className="font-elegant text-3xl md:text-4xl text-[var(--color-atelier-grafite)] mt-1">
                    Identidade Profissional & Conexões
                  </h2>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={editForm.nome}
                      onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                      className="w-full bg-gray-50/70 px-4 py-3.5 rounded-xl outline-none border border-gray-200 focus:border-[var(--color-atelier-terracota)] text-xs font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                       @username no Vêneto
                    </label>
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="w-full bg-gray-50/70 px-4 py-3.5 rounded-xl outline-none border border-gray-200 focus:border-[var(--color-atelier-terracota)] text-xs font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                      Cargo / Função
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Fundadora, Diretor Criativo..."
                      value={editForm.cargo}
                      onChange={(e) => setEditForm({ ...editForm, cargo: e.target.value })}
                      className="w-full bg-gray-50/70 px-4 py-3.5 rounded-xl outline-none border border-gray-200 focus:border-[var(--color-atelier-terracota)] text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                      Marca / Empresa
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Studio Veronna"
                      value={editForm.empresa}
                      onChange={(e) => setEditForm({ ...editForm, empresa: e.target.value })}
                      className="w-full bg-gray-50/70 px-4 py-3.5 rounded-xl outline-none border border-gray-200 focus:border-[var(--color-atelier-terracota)] text-xs font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                      Área de Atuação
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Direção Criativa & Branding"
                      value={editForm.area_atuacao}
                      onChange={(e) => setEditForm({ ...editForm, area_atuacao: e.target.value })}
                      className="w-full bg-gray-50/70 px-4 py-3.5 rounded-xl outline-none border border-gray-200 focus:border-[var(--color-atelier-terracota)] text-xs font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                      Localização (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: São Paulo, SP"
                      value={editForm.localizacao}
                      onChange={(e) => setEditForm({ ...editForm, localizacao: e.target.value })}
                      className="w-full bg-gray-50/70 px-4 py-3.5 rounded-xl outline-none border border-gray-200 focus:border-[var(--color-atelier-terracota)] text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                    Bio Curta (Quem é você e o que está construindo)
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Apresente sua trajetória, sua marca e seu foco atual..."
                    className="w-full bg-gray-50/70 px-4 py-3.5 rounded-xl outline-none border border-gray-200 focus:border-[var(--color-atelier-terracota)] text-xs font-medium resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#E2ECF3] p-4 rounded-2xl border border-[#142C48]/15">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                      O que você oferece à rede
                    </label>
                    <textarea
                      rows={2}
                      value={editForm.o_que_oferece}
                      onChange={(e) => setEditForm({ ...editForm, o_que_oferece: e.target.value })}
                      placeholder="Ex: Revisão de posicionamento, parcerias em tráfego pago, mentoria comercial..."
                      className="w-full bg-white px-3.5 py-2.5 rounded-xl outline-none border border-gray-200 text-xs font-medium resize-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
                      O que você procura neste momento
                    </label>
                    <textarea
                      rows={2}
                      value={editForm.o_que_procura}
                      onChange={(e) => setEditForm({ ...editForm, o_que_procura: e.target.value })}
                      placeholder="Ex: Parceiros de copywriting, feedback na nova proposta comercial..."
                      className="w-full bg-white px-3.5 py-2.5 rounded-xl outline-none border border-gray-200 text-xs font-medium resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                      Competências (separadas por vírgula)
                    </label>
                    <input
                      type="text"
                      value={editForm.skills_str}
                      onChange={(e) => setEditForm({ ...editForm, skills_str: e.target.value })}
                      placeholder="Ex: Branding, Estratégia, Vendas B2B, Copywriting"
                      className="w-full bg-gray-50/70 px-4 py-3 rounded-xl outline-none border border-gray-200 text-xs font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                      Interesses (separados por vírgula)
                    </label>
                    <input
                      type="text"
                      value={editForm.interesses_str}
                      onChange={(e) => setEditForm({ ...editForm, interesses_str: e.target.value })}
                      placeholder="Ex: Posicionamento Premium, IA Criativa, Retenção"
                      className="w-full bg-gray-50/70 px-4 py-3 rounded-xl outline-none border border-gray-200 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Projetos em Destaque */}
                <div className="border-t border-gray-100 pt-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] block mb-3">
                    Projetos em Destaque (Opcional)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Título do Projeto 1"
                      value={editForm.projeto_1_titulo}
                      onChange={(e) => setEditForm({ ...editForm, projeto_1_titulo: e.target.value })}
                      className="bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Breve descrição / resultado"
                      value={editForm.projeto_1_desc}
                      onChange={(e) => setEditForm({ ...editForm, projeto_1_desc: e.target.value })}
                      className="bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Link (opcional)"
                      value={editForm.projeto_1_url}
                      onChange={(e) => setEditForm({ ...editForm, projeto_1_url: e.target.value })}
                      className="bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs"
                    />
                  </div>
                </div>

                {/* Abertura para Conexões no Vêneto */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                      <Handshake size={15} className="text-emerald-700" />
                      Estar aberto para conexões no Vêneto
                    </div>
                    <p className="text-[11px] text-emerald-900/70 mt-0.5 leading-snug">
                      Ao ativar e preencher sua bio e atuação, seu perfil aparecerá em &ldquo;Abertos para Conexão&rdquo; e no diretório de Pessoas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm({
                        ...editForm,
                        open_for_connections: !editForm.open_for_connections,
                        dm_privacy: !editForm.open_for_connections ? "everyone" : "none"
                      })
                    }
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 ${
                      editForm.open_for_connections
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "bg-white text-[var(--color-atelier-grafite)]/70 border border-gray-200"
                    }`}
                  >
                    {editForm.open_for_connections ? "Aberto para Conexões" : "Ativar Conexões"}
                  </button>
                </div>

                {/* Links e Privacidade de Mensagens (Seção 11) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                      Instagram
                    </label>
                    <input
                      type="text"
                      placeholder="@suamarca"
                      value={editForm.instagram}
                      onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
                      className="bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                      Site / Portfólio
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={editForm.site}
                      onChange={(e) => setEditForm({ ...editForm, site: e.target.value })}
                      className="bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                      Quem pode enviar mensagem direta?
                    </label>
                    <select
                      value={editForm.open_for_connections ? editForm.dm_privacy : "none"}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          dm_privacy: e.target.value,
                          open_for_connections: e.target.value !== "none"
                        })
                      }
                      className="bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium"
                    >
                      <option value="everyone">Todos os membros do Vêneto</option>
                      <option value="connections">Apenas conexões mútuas</option>
                      <option value="none">Ninguém (fechado para conexões)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="mt-2 py-4 rounded-2xl bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-[#234E80] shadow-md transition-all flex items-center justify-center"
                >
                  {isSavingEdit ? <Loader2 size={16} className="animate-spin" /> : "Salvar Perfil Profissional"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MODAL DE MENSAGEM DIRETA
          ========================================== */}
      <AnimatePresence>
        {isDmModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsDmModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 border border-white"
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                    Conversa Individual
                  </span>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                    Mensagem para {profile.nome}
                  </h3>
                </div>
                <button
                  onClick={() => setIsDmModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSendDm} className="flex flex-col gap-4">
                <textarea
                  rows={4}
                  required
                  value={dmText}
                  onChange={(e) => setDmText(e.target.value)}
                  placeholder="Inicie uma conversa genuína sobre projetos, dúvidas ou oportunidades de colaboração..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs font-medium outline-none focus:border-[var(--color-atelier-terracota)] resize-none"
                />
                <button
                  type="submit"
                  disabled={isSendingDm}
                  className="py-3.5 rounded-xl bg-[var(--color-atelier-grafite)] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-colors flex items-center justify-center gap-2"
                >
                  {isSendingDm ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
                  Enviar Mensagem
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MODAL DE CONCEDER RECONHECIMENTO (SEÇÃO 10)
          ========================================== */}
      <AnimatePresence>
        {isRecModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsRecModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-lg relative z-10 border border-white"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                    Reconhecimento Transparente · Sem Gamificação Vazia
                  </span>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                    Reconhecer {profile.nome}
                  </h3>
                </div>
                <button
                  onClick={() => setIsRecModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleGiveRecognition} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {RECOGNITION_PILLARS.map((p) => (
                    <button
                      type="button"
                      key={p.key}
                      onClick={() => setSelectedPillar(p.key)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        selectedPillar === p.key
                          ? "bg-[#E2ECF3] border-[var(--color-atelier-terracota)] shadow-sm"
                          : "bg-white border-gray-100 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="font-bold text-xs text-[var(--color-atelier-grafite)]">
                        {p.label}
                      </div>
                      <div className="text-[11px] text-[var(--color-atelier-grafite)]/60 mt-1 leading-snug">
                        {p.description}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                    Por que você está atribuindo este reconhecimento? (Visível e auditável)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={recReason}
                    onChange={(e) => setRecReason(e.target.value)}
                    placeholder="Descreva concretamente como este membro ajudou, colaborou ou contribuiu..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-xs outline-none focus:border-[var(--color-atelier-terracota)] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingRec}
                  className="py-3.5 rounded-xl bg-[var(--color-atelier-terracota)] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#234E80] transition-colors flex items-center justify-center gap-2"
                >
                  {isSendingRec ? <Loader2 size={15} className="animate-spin" /> : <Award size={15} />}
                  Registrar Reconhecimento
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          MODAL DE CONTESTAÇÃO DE CLASSIFICAÇÃO (SEÇÃO 10)
          ========================================== */}
      <AnimatePresence>
        {contestingRec && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setContestingRec(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 border border-white"
            >
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-2">
                Contestar Classificação / Reconhecimento
              </h3>
              <p className="text-xs text-[var(--color-atelier-grafite)]/70 mb-4 leading-relaxed">
                No Vêneto, todos os critérios de reconhecimento são transparentes e auditáveis. Descreva abaixo o motivo pelo qual considera este registro incorreto.
              </p>
              <form onSubmit={handleContestRecognition} className="flex flex-col gap-3">
                <textarea
                  rows={3}
                  required
                  value={contestNote}
                  onChange={(e) => setContestNote(e.target.value)}
                  placeholder="Explique o motivo da revisão..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setContestingRec(null)}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 text-[10px] font-bold uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[var(--color-atelier-grafite)] text-white text-[10px] font-bold uppercase tracking-widest"
                  >
                    Enviar Contestação
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col w-full items-center animate-[fadeInUp_0.5s_ease-out_both] pb-12">
        {/* ==========================================
            CABEÇALHO DO PERFIL PROFISSIONAL VÊNETO
            ========================================== */}
        <div className="w-full max-w-[1100px] glass-panel rounded-[3rem] bg-white/75 border border-white shadow-[0_15px_40px_rgba(20, 44, 72,0.06)] overflow-hidden relative">
          {/* CAPA */}
          <div className="w-full h-[160px] md:h-[240px] bg-gradient-to-br from-[#0D1D30] via-[#142C48] to-[#142C48]/80 relative group">
            {profile.cover_url ? (
              <img src={normalizeImageUrl(profile.cover_url)} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-between px-10 opacity-30">
                <span className="font-elegant text-4xl md:text-6xl text-white italic">
                  Vêneto · Pessoas que constroem.
                </span>
                <Crown size={36} className="text-white/50" />
              </div>
            )}

            {isOwnProfile && (
              <label className="absolute top-5 right-5 w-11 h-11 rounded-2xl bg-black/30 backdrop-blur-xl flex items-center justify-center text-white cursor-pointer hover:bg-black/50 transition-colors z-30 border border-white/30">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverUpload}
                  disabled={isUploadingCover}
                />
                {isUploadingCover ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              </label>
            )}
          </div>

          {/* CORPO DO CABEÇALHO */}
          <div className="px-6 md:px-10 pb-8 relative">
            <div className="relative flex flex-col md:flex-row md:justify-between items-center md:items-end -mt-16 md:-mt-20 mb-5 gap-4">
              <div className="relative group">
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-[2rem] border-[5px] border-white bg-[var(--color-atelier-creme)] shadow-lg overflow-hidden text-[var(--color-atelier-terracota)] flex items-center justify-center font-elegant text-4xl md:text-5xl">
                  {profile.avatar_url ? (
                    <img
                      src={normalizeImageUrl(profile.avatar_url)}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => handleAvatarError(e, profile.nome)}
                    />
                  ) : (
                    profile.nome?.charAt(0)
                  )}
                </div>
                {isOwnProfile && (
                  <label className="absolute inset-0 rounded-[1.8rem] bg-black/45 backdrop-blur-sm flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-20 m-1">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                    />
                    {isUploadingAvatar ? <Loader2 size={22} className="animate-spin" /> : <Camera size={22} />}
                    <span className="font-roboto text-[9px] font-bold uppercase tracking-widest mt-1">
                      Foto
                    </span>
                  </label>
                )}
              </div>

              {/* AÇÕES DO PERFIL */}
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {isOwnProfile ? (
                  <button
                    onClick={openEditModal}
                    className="px-5 py-3 rounded-2xl bg-[var(--color-atelier-grafite)] text-white font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-all shadow-sm flex items-center gap-2"
                  >
                    <Edit3 size={14} /> Editar Perfil Profissional ({completionPercent}%)
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleToggleConnection}
                      className={`px-5 py-3 rounded-2xl font-roboto text-[11px] font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 ${
                        isConnected
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)]"
                      }`}
                    >
                      {isConnected ? <UserCheck size={14} /> : <UserPlus size={14} />}
                      {isConnected ? "Conectado" : "Conectar"}
                    </button>

                    {profile.dm_privacy !== "none" && (
                      <button
                        onClick={() => setIsDmModalOpen(true)}
                        className="px-4 py-3 rounded-2xl bg-white border border-gray-200 text-[var(--color-atelier-grafite)] font-roboto text-[11px] font-bold uppercase tracking-widest hover:border-[var(--color-atelier-terracota)] transition-all flex items-center gap-2"
                      >
                        <MessageCircle size={14} /> Mensagem
                      </button>
                    )}

                    <button
                      onClick={() => setIsRecModalOpen(true)}
                      className="px-4 py-3 rounded-2xl bg-[#E2ECF3] border border-[#142C48]/30 text-[#142C48] font-roboto text-[11px] font-bold uppercase tracking-widest hover:bg-[#142C48] hover:text-white transition-all flex items-center gap-2"
                    >
                      <Award size={14} /> Reconhecer
                    </button>

                    <button
                      onClick={handleToggleBlock}
                      title={isBlocked ? "Desbloquear usuário" : "Silenciar / Bloquear usuário"}
                      className={`p-3 rounded-2xl border transition-colors ${
                        isBlocked
                          ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-white border-gray-200 text-gray-400 hover:text-red-500"
                      }`}
                    >
                      <Ban size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* IDENTIFICAÇÃO E PAPEL NA REDE */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-none">
                  {profile.nome}
                </h1>
                {(profile.cargo || profile.role === "admin" || profile.role === "gestor") && (
                  <span className="px-3 py-1 rounded-full bg-[#142C48] text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <Crown size={11} />{" "}
                    {profile.cargo ||
                      (profile.role === "admin"
                        ? "Fundadora"
                        : profile.role === "gestor"
                        ? "Gestor de Projetos"
                        : profile.cargo)}
                  </span>
                )}
                {profile.dm_privacy && profile.dm_privacy !== "none" && (
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <Handshake size={11} /> Aberto para Conexões
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-atelier-grafite)]/70 mt-2 font-medium">
                <span className="font-bold text-[var(--color-atelier-terracota)]">
                  @{profile.username || profile.nome?.toLowerCase().replace(/\s/g, "")}
                </span>
                {profile.empresa && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-[var(--color-atelier-grafite)]">
                      {profile.empresa}
                    </span>
                  </>
                )}
                {profile.area_atuacao && (
                  <>
                    <span>•</span>
                    <span>{profile.area_atuacao}</span>
                  </>
                )}
                {profile.segmento && (
                  <>
                    <span>•</span>
                    <span className="text-[var(--color-atelier-grafite)]/50">{profile.segmento}</span>
                  </>
                )}
              </div>

              <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/85 leading-relaxed max-w-3xl mt-4 whitespace-pre-wrap">
                {profile.bio ||
                  (isOwnProfile
                    ? "Complete sua apresentação profissional para que outros membros saibam o que você está construindo, o que oferece e o que procura."
                    : "Membro da comunidade Vêneto.")}
              </p>

              {/* METADADOS E PILARES DE RECONHECIMENTO */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6 pt-5 border-t border-[var(--color-atelier-grafite)]/10 w-full">
                {profile.localizacao && (
                  <div className="flex items-center gap-1.5 text-[var(--color-atelier-grafite)]/70 text-xs bg-white/80 px-3.5 py-2 rounded-xl border border-gray-100">
                    <MapPin size={14} className="text-[var(--color-atelier-terracota)]" />
                    {profile.localizacao}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[var(--color-atelier-grafite)]/70 text-xs bg-white/80 px-3.5 py-2 rounded-xl border border-gray-100">
                  <Calendar size={14} /> No Vêneto desde {formatTime(profile.created_at)}
                </div>
                <div className="flex items-center gap-1.5 text-[var(--color-atelier-grafite)]/70 text-xs bg-white/80 px-3.5 py-2 rounded-xl border border-gray-100">
                  <Handshake size={14} className="text-emerald-600" /> {connectionsCount} conexões
                </div>

                {/* Links Profissionais */}
                {links.instagram && (
                  <a
                    href={
                      links.instagram.startsWith("http")
                        ? links.instagram
                        : `https://instagram.com/${links.instagram.replace("@", "")}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-atelier-terracota)] bg-white px-3.5 py-2 rounded-xl border border-[#142C48]/20 hover:bg-[#E2ECF3]"
                  >
                    <ExternalLink size={12} /> Instagram
                  </a>
                )}
                {links.site && (
                  <a
                    href={links.site.startsWith("http") ? links.site : `https://${links.site}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-atelier-grafite)] bg-white px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50"
                  >
                    <Globe size={12} /> Site
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            NAVEGAÇÃO DO PERFIL PROFISSIONAL
            ========================================== */}
        <div className="w-full max-w-[1100px] mt-6">
          <div className="flex w-full overflow-x-auto custom-scrollbar gap-2 mb-6 bg-white/60 p-2 rounded-2xl border border-white shadow-sm">
            {[
              { id: "visao_geral", label: "Identidade & Trocas", icon: <Compass size={14} /> },
              { id: "publicacoes", label: `Publicações (${allPosts.length})`, icon: <Layers size={14} /> },
              {
                id: "trocas",
                label: "Dúvidas & Soluções",
                icon: <HelpCircle size={14} />
              },
              {
                id: "laboratorio",
                label: "Laboratório de Projetos",
                icon: <FlaskConical size={14} />
              },
              {
                id: "parcerias",
                label: "Parcerias & Oportunidades",
                icon: <Handshake size={14} />
              },
              {
                id: "reconhecimentos",
                label: `Reconhecimentos (${recognitions.length})`,
                icon: <Award size={14} />
              }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-[var(--color-atelier-grafite)] text-white shadow-sm"
                    : "text-[var(--color-atelier-grafite)]/60 hover:bg-white"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ==========================================
              ABA 1: VISÃO GERAL (SEÇÕES 6 & 10)
              ========================================== */}
          {activeTab === "visao_geral" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna Esquerda (2/3): O que oferece / O que procura + Projetos em Destaque */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass-panel bg-white/80 p-6 rounded-3xl border border-emerald-100 shadow-sm">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-widest mb-2">
                      <Briefcase size={15} /> O que oferece à rede
                    </div>
                    <p className="text-sm text-[var(--color-atelier-grafite)]/85 leading-relaxed">
                      {profile.o_que_oferece ||
                        "Ainda não especificado. Membros que descrevem o que oferecem recebem até 3x mais convites de parceria."}
                    </p>
                  </div>

                  <div className="glass-panel bg-white/80 p-6 rounded-3xl border border-amber-100 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-widest mb-2">
                      <HelpCircle size={15} /> O que procura neste momento
                    </div>
                    <p className="text-sm text-[var(--color-atelier-grafite)]/85 leading-relaxed">
                      {profile.o_que_procura ||
                        "Ainda não especificado. Indique que tipo de conexão, fornecedor ou troca você busca no Vêneto."}
                    </p>
                  </div>
                </div>

                {/* Competências e Interesses */}
                <div className="glass-panel bg-white/80 p-6 rounded-3xl border border-white shadow-sm flex flex-col gap-5">
                  <div>
                    <h3 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 mb-3">
                      Competências & Especialidades
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(profile.skills) && profile.skills.length > 0 ? (
                        profile.skills.map((skill: string) => (
                          <span
                            key={skill}
                            className="px-3.5 py-1.5 rounded-xl bg-[#E2ECF3] border border-[#142C48]/20 text-[var(--color-atelier-grafite)] text-xs font-semibold"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Nenhuma competência listada ainda.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 mb-3">
                      Interesses & Tópicos que acompanha
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(profile.interesses) && profile.interesses.length > 0 ? (
                        profile.interesses.map((interesse: string) => (
                          <span
                            key={interesse}
                            className="px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 text-[var(--color-atelier-grafite)]/80 text-xs font-medium"
                          >
                            #{interesse}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Nenhum interesse registrado ainda.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Projetos em Destaque */}
                <div className="glass-panel bg-white/80 p-6 rounded-3xl border border-white shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                        Portfólio & Construção
                      </span>
                      <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                        Projetos em Destaque
                      </h3>
                    </div>
                    {isOwnProfile && (
                      <button
                        onClick={openEditModal}
                        className="text-xs font-bold text-[var(--color-atelier-terracota)] hover:underline flex items-center gap-1"
                      >
                        <Plus size={14} /> Gerenciar
                      </button>
                    )}
                  </div>

                  {highlightedProjects.length === 0 ? (
                    <p className="text-xs text-[var(--color-atelier-grafite)]/60 py-4">
                      Nenhum projeto destacado ainda.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {highlightedProjects.map((proj: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-5 rounded-2xl bg-[#E2ECF3] border border-[#142C48]/15 flex flex-col justify-between gap-3"
                        >
                          <div>
                            <h4 className="font-bold text-sm text-[var(--color-atelier-grafite)]">
                              {proj.title}
                            </h4>
                            <p className="text-xs text-[var(--color-atelier-grafite)]/75 mt-1 leading-relaxed">
                              {proj.description}
                            </p>
                          </div>
                          {proj.url && (
                            <a
                              href={proj.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-atelier-terracota)] hover:underline"
                            >
                              Ver projeto <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna Direita (1/3): Camada de Reconhecimento Transparente (Seção 10) */}
              <div className="flex flex-col gap-6">
                <div className="glass-panel bg-white/85 p-6 rounded-3xl border border-white shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                      Reputação Qualitativa
                    </span>
                    <Award size={18} className="text-[var(--color-atelier-terracota)]" />
                  </div>
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-1">
                    Reconhecimento na Rede
                  </h3>
                  <p className="text-xs text-[var(--color-atelier-grafite)]/65 leading-relaxed mb-4">
                    Substituímos rankings de pontos vazios por reconhecimentos baseados em contribuições reais e auditáveis.
                  </p>

                  <div className="flex flex-col gap-3">
                    {RECOGNITION_PILLARS.map((pillar) => {
                      const count = recognitions.filter((r) => r.pillar === pillar.key && !r.is_contested).length;
                      return (
                        <div
                          key={pillar.key}
                          className="p-3.5 rounded-2xl bg-[#E2ECF3] border border-gray-100 flex items-start justify-between gap-3"
                        >
                          <div>
                            <div className="font-bold text-xs text-[var(--color-atelier-grafite)] flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${pillar.badgeBg}`} />
                              {pillar.label}
                            </div>
                            <p className="text-[11px] text-[var(--color-atelier-grafite)]/60 mt-0.5 leading-snug">
                              {pillar.description}
                            </p>
                          </div>
                          <span className="px-3 py-1 rounded-xl bg-white border border-gray-200 font-bold text-xs text-[var(--color-atelier-grafite)] shrink-0">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setActiveTab("reconhecimentos")}
                    className="w-full mt-4 py-3 rounded-xl bg-white border border-gray-200 text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:border-[var(--color-atelier-terracota)] transition-colors"
                  >
                    Ver histórico e critérios transparentes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              ABA DE RECONHECIMENTOS E TRANSPARÊNCIA (SEÇÃO 10)
              ========================================== */}
          {activeTab === "reconhecimentos" && (
            <div className="flex flex-col gap-6">
              <div className="glass-panel bg-white/80 p-6 md:p-8 rounded-3xl border border-white shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                      Seção 10 · Critérios Claros e Contestáveis
                    </span>
                    <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">
                      Histórico de Reconhecimentos de {profile.nome}
                    </h3>
                  </div>
                  {!isOwnProfile && (
                    <button
                      onClick={() => setIsRecModalOpen(true)}
                      className="px-5 py-3 rounded-xl bg-[var(--color-atelier-terracota)] text-white text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 w-fit"
                    >
                      <Award size={14} /> Atribuir Reconhecimento
                    </button>
                  )}
                </div>

                {/* Explicação Transparente dos 4 Pilares */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                  {RECOGNITION_PILLARS.map((p) => (
                    <div key={p.key} className={`p-4 rounded-2xl border ${p.color}`}>
                      <div className="font-bold text-xs uppercase tracking-wider mb-1">
                        {p.label}
                      </div>
                      <p className="text-[11px] opacity-85 leading-relaxed">{p.criteria}</p>
                    </div>
                  ))}
                </div>

                {recognitions.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-500">
                    Ainda não há registros de reconhecimento para este membro.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {recognitions.map((rec) => {
                      const pillarObj =
                        RECOGNITION_PILLARS.find((p) => p.key === rec.pillar) ||
                        RECOGNITION_PILLARS[0];
                      return (
                        <div
                          key={rec.id}
                          className="p-5 rounded-2xl bg-white border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${pillarObj.color}`}
                              >
                                {pillarObj.label}
                              </span>
                              <span className="text-xs text-gray-400">
                                • {formatTime(rec.created_at)}
                              </span>
                              {rec.awarded_by_nome && (
                                <span className="text-xs text-[var(--color-atelier-grafite)]/70">
                                  por <strong>{rec.awarded_by_nome}</strong>
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[var(--color-atelier-grafite)] font-medium mt-1">
                              “{rec.reason}”
                            </p>
                            {rec.is_contested && (
                              <span className="text-[11px] text-amber-700 bg-amber-50 px-3 py-1 rounded-lg w-fit mt-1">
                                Em revisão de critério: {rec.contestation_note}
                              </span>
                            )}
                          </div>

                          {!rec.is_contested && (
                            <button
                              onClick={() => setContestingRec(rec)}
                              className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[var(--color-atelier-terracota)] shrink-0 flex items-center gap-1"
                            >
                              <Info size={12} /> Contestar classificação
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              ABAS DE PUBLICAÇÕES, TROCAS, LABORATÓRIO E PARCERIAS
              ========================================== */}
          {activeTab !== "visao_geral" && activeTab !== "reconhecimentos" && (
            <div className="flex flex-col gap-6 max-w-[820px] mx-auto">
              {filteredPosts.length === 0 ? (
                <div className="text-center p-14 glass-panel bg-white/60 border border-white rounded-3xl">
                  <Crown size={36} className="mx-auto mb-3 text-[var(--color-atelier-terracota)]" />
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                    Nenhum registro nesta seção ainda.
                  </h3>
                  <p className="font-roboto text-xs text-[var(--color-atelier-grafite)]/60 mt-1">
                    As contribuições de {profile.nome} aparecerão aqui conforme forem publicadas.
                  </p>
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const isMyPost = post.author_id === currentUser?.id;
                  const isAdmin = currentUser?.role === "admin";
                  const isLiked = post.is_liked_by_me;
                  const isCommentsOpen = expandedComments.includes(post.id);

                  return (
                    <div
                      key={post.id}
                      className="glass-panel rounded-3xl flex flex-col shadow-sm overflow-hidden border border-white bg-white/80"
                    >
                      <div className="p-6 pb-4 flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {post.is_resolved && (
                              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                <CheckCircle2 size={11} /> Dúvida Resolvida
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {formatTime(post.created_at)}
                            </span>
                          </div>
                          {post.title && (
                            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mt-1">
                              {post.title}
                            </h3>
                          )}
                        </div>

                        {(isMyPost || isAdmin) && (
                          <button
                            onClick={() => setPostToDelete(post.id)}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      <div className="px-6 pb-5">
                        <p className="font-roboto text-sm leading-relaxed text-[var(--color-atelier-grafite)]/90 whitespace-pre-wrap">
                          {post.text_content}
                        </p>
                      </div>

                      {post.image_url && (
                        <div className="px-6 pb-6">
                          <div className="rounded-2xl overflow-hidden border border-gray-100">
                            <img
                              src={post.image_url}
                              alt="Publicação"
                              className="w-full max-h-[480px] object-cover"
                            />
                          </div>
                        </div>
                      )}

                      <div className="px-6 py-4 flex items-center justify-between bg-white/50 border-t border-gray-100">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`px-4 py-2 rounded-xl flex items-center gap-2 font-roboto text-xs font-bold transition-all border ${
                              isLiked
                                ? "bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)]/20"
                                : "bg-white text-[var(--color-atelier-grafite)]/60 border-gray-100"
                            }`}
                          >
                            <Heart
                              size={15}
                              className={
                                isLiked
                                  ? "fill-[var(--color-atelier-terracota)] text-[var(--color-atelier-terracota)]"
                                  : ""
                              }
                            />
                            {post.likes_count || 0} Apoios
                          </button>
                          <button
                            onClick={() => toggleComments(post.id)}
                            className="px-4 py-2 rounded-xl flex items-center gap-2 font-roboto text-xs font-bold bg-white text-[var(--color-atelier-grafite)]/70 border border-gray-100"
                          >
                            <MessageCircle size={15} /> {post.comments_count || commentsData[post.id]?.length || 0} Respostas
                          </button>
                        </div>
                      </div>

                      {isCommentsOpen && (
                        <div className="bg-[#E2ECF3] border-t border-gray-100 p-6 flex flex-col gap-4">
                          {(commentsData[post.id] || []).map((c: any) => (
                            <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-xs text-[var(--color-atelier-grafite)]">
                                  {c.author_nome || c.profiles?.nome || "Membro"}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {formatTime(c.created_at)}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--color-atelier-grafite)]/85">
                                {c.content}
                              </p>
                            </div>
                          ))}

                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={commentInputs[post.id] || ""}
                              onChange={(e) =>
                                setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                              }
                              placeholder="Contribuir na conversa..."
                              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSendComment(post.id);
                              }}
                            />
                            <button
                              onClick={() => handleSendComment(post.id)}
                              disabled={isSubmittingComment === post.id}
                              className="px-4 py-2.5 rounded-xl bg-[var(--color-atelier-grafite)] text-white text-xs font-bold"
                            >
                              Enviar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}