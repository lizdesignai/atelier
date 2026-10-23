"use client";
// src/app/admin/gerenciamento/views/PresencaDashboard.tsx
// Central de Comando do ciclo de Presença — visão admin/gestor.

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, ChevronRight, Clock, CheckCircle2, AlertTriangle, Send,
  Eye, Lightbulb, FileText, Calendar, Loader2, Pencil, Check, X,
  ArrowRight, Package, Image as ImageIcon, Video, MessageSquare, PauseCircle, Download, UploadCloud, ExternalLink, RefreshCw
} from "lucide-react";
import { pdf } from '@react-pdf/renderer';
import DirecionamentoEstrategicoPDF from "@/components/pdf/DirecionamentoEstrategicoPDF";
import {
  MOVEMENTS, PILLARS, PIECE_STATUS, OBJECTIVE_KINDS, ADJUST_TYPES,
  PULSE_QUESTIONS, isPieceTask, deriveStatus,
  type PieceStatus, type PillarId
} from "../../../../lib/presenca/constants";

const showToast = (msg: string) => window.dispatchEvent(new CustomEvent("showToast", { detail: msg }));
const glass = "bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-[2rem]";
const label = "font-roboto text-[10px] font-bold uppercase tracking-widest";
const sectionTitle = "font-elegant text-xl text-[var(--color-atelier-grafite)]";

const statusColors: Record<string, string> = {
  neutral: "bg-gray-100 text-gray-600 border-gray-200",
  warn: "bg-orange-50 text-orange-700 border-orange-200",
  alert: "bg-red-50 text-red-700 border-red-200",
  good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

interface Props { activeProjectId: string; currentProject: any; }

export default function PresencaDashboard({ activeProjectId, currentProject }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [editingStrategy, setEditingStrategy] = useState(false);
  const [strategyForm, setStrategyForm] = useState({ objective: "", objective_kind: "", editorial_strategy: "" });
  const [expandedPiece, setExpandedPiece] = useState<string | null>(null);
  const [adjustNote, setAdjustNote] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [renewLearnings, setRenewLearnings] = useState("");
  const [renewNextDecision, setRenewNextDecision] = useState("");

  const handleUploadAsset = async (taskId: string, file: File) => {
    if (!file) return;
    setUploadingTaskId(taskId);
    showToast("Enviando anexo para o Atelier...");
    try {
      const isVideo = file.type.startsWith('video/');
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const bucket = isVideo ? 'community_videos' : 'community_images';
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(2)}_${cleanName}`;
      const clientId = data?.project?.client_id || currentProject?.client_id || currentProject?.profiles?.id || 'unassigned';
      const path = `${clientId}/${fileName}`;

      const formData = new FormData();
      formData.append('bucket', bucket);
      formData.append('path', path);
      formData.append('file', file);
      formData.append('contentType', file.type || (isPdf ? 'application/pdf' : 'application/octet-stream'));

      const uploadRes = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || uploadJson.error) {
        throw new Error(uploadJson.error?.message || 'Falha no upload do arquivo');
      }

      const publicUrl = uploadJson.data?.publicUrl;
      const mediaAssets = [{ type: isPdf ? 'pdf' : isVideo ? 'video' : 'image', url: publicUrl, name: file.name }];

      await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'tasks',
          operation: 'update',
          data: {
            attachment_url: publicUrl,
            media_assets: mediaAssets,
            status: 'pending_client_approval',
            ig_publish_status: 'awaiting_approval',
            ig_sent_for_approval_at: new Date().toISOString(),
          },
          filters: [{ type: 'eq', column: 'id', value: taskId }],
        }),
      });

      try {
        await fetch('/api/db/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'social_posts',
            operation: 'update',
            data: {
              image_url: publicUrl,
              media_assets: mediaAssets,
              status: 'internal_review',
            },
            filters: [{ type: 'eq', column: 'task_id', value: taskId }],
          }),
        });
      } catch (_) {}

      showToast("Material anexado e enviado para validação com sucesso! 🚀");
      fetchData();
    } catch (e: any) {
      console.error(e);
      showToast("Erro ao anexar arquivo: " + e.message);
    } finally {
      setUploadingTaskId(null);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/presenca?projectId=${activeProjectId}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      if (json.cycle) {
        setStrategyForm({
          objective: json.cycle.objective || "",
          objective_kind: json.cycle.objective_kind || "",
          editorial_strategy: json.cycle.editorial_strategy || "",
        });
      }
      if (json.pieces) {
        const withAdjust = json.pieces.find((p: any) => deriveStatus(p) === 'adjust_requested' || p.status === 'review');
        if (withAdjust) {
          setExpandedPiece(prev => prev || withAdjust.id);
        }
      }
    } catch (e: any) {
      showToast("Erro ao carregar dados do ciclo: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  const handleRenewCycle = async () => {
    setIsRenewing(true);
    try {
      const res = await fetch('/api/presenca/cycle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId,
          action: 'advance',
          learnings: renewLearnings.trim() || undefined,
          nextDecision: renewNextDecision.trim() || undefined,
        })
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Erro ao renovar ciclo');
      showToast(`✨ Ciclo ${json.cycle?.cycle_number || ''} iniciado com sucesso! Demandas geradas.`);
      setIsRenewModalOpen(false);
      setRenewLearnings("");
      setRenewNextDecision("");
      await fetchData();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Erro ao renovar ciclo');
    } finally {
      setIsRenewing(false);
    }
  };

  const resolveAdjustment = async (taskId: string) => {
    setSaving(true);
    try {
      const note = adjustNote[taskId] || '';
      const res = await fetch('/api/presenca/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          action: 'resolve_adjust',
          comment: note || 'Ajuste concluído pela equipe.',
          actorName: 'Equipe Liz',
          actorRole: 'admin',
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      showToast('Ajuste marcado como resolvido e reenviado.');
      setAdjustNote(prev => ({ ...prev, [taskId]: '' }));
      fetchData();
    } catch (e: any) {
      showToast('Erro ao resolver ajuste: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const handleDownloadDirecionamentoPDF = async () => {
    if (!data?.cycle) return;
    setIsDownloadingPDF(true);
    showToast("Gerando PDF do Direcionamento...");
    try {
      const cName = data?.project?.client_name || currentProject?.profiles?.nome || "Cliente";
      const doc = (
        <DirecionamentoEstrategicoPDF
          clientName={cName}
          cycleNumber={data.cycle.cycle_number || 1}
          periodStart={data.cycle.period_start}
          periodEnd={data.cycle.period_end}
          answeredAt={data.cycle.pulse_answered_at}
          answers={data.cycle.pulse_answers || {}}
          objective={data.cycle.objective}
          editorialStrategy={data.cycle.editorial_strategy}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Direcionamento_Estrategico_Ciclo_${data.cycle.cycle_number || 1}_${cName.replace(/\s+/g, '_')}.pdf`;
      link.click();
      showToast("PDF gerado e baixado com sucesso! ✨");
    } catch (e: any) {
      showToast("Erro ao gerar PDF: " + e.message);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const saveStrategy = async () => {
    if (!data?.cycle?.id) return;
    setSaving(true);
    try {
      await fetch("/api/presenca/cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId: data.cycle.id, ...strategyForm }),
      });
      setEditingStrategy(false);
      showToast("Estratégia atualizada.");
      fetchData();
    } catch { showToast("Erro ao salvar."); }
    finally { setSaving(false); }
  };

  const sendForApproval = async (taskId: string) => {
    setSaving(true);
    try {
      // Atualiza status da task via db/query (já no whitelist)
      await fetch("/api/db/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "tasks",
          operation: "update",
          data: {
            status: "pending_client_approval",
            ig_publish_status: "awaiting_approval",
            ig_sent_for_approval_at: new Date().toISOString(),
          },
          filters: [{ type: "eq", column: "id", value: taskId }],
        }),
      });
      showToast("Peça enviada para aprovação do cliente.");
      fetchData();
    } catch { showToast("Erro ao enviar."); }
    finally { setSaving(false); }
  };

  const markPublished = async (taskId: string) => {
    setSaving(true);
    try {
      await fetch("/api/db/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "tasks",
          operation: "update",
          data: {
            ig_publish_status: "published",
            ig_published_at: new Date().toISOString(),
          },
          filters: [{ type: "eq", column: "id", value: taskId }],
        }),
      });
      showToast("Peça marcada como publicada.");
      fetchData();
    } catch { showToast("Erro ao atualizar."); }
    finally { setSaving(false); }
  };

  const batchSendForApproval = async () => {
    const inProd = (data?.pieces || []).filter((t: any) => deriveStatus(t) === "in_production" && t.attachment_url);
    if (inProd.length === 0) { showToast("Nenhuma peça pronta para envio."); return; }
    setSaving(true);
    for (const t of inProd) {
      await sendForApproval(t.id);
    }
    setSaving(false);
    fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="animate-spin text-[var(--color-atelier-terracota)]" size={28} /></div>;
  if (!data?.cycle) return <div className="flex flex-col items-center justify-center h-[60vh] gap-3 opacity-40"><Compass size={40} /><p className="font-elegant text-xl">Nenhum ciclo ativo.</p></div>;

  const { cycle, metrics, currentMovement, nextSteps, pieces, approvalEvents } = data;
  const pillarWeights: Record<string, number> = cycle.pillars || {};

  const clientName = data?.project?.client_name || currentProject?.profiles?.nome || currentProject?.profiles?.empresa || "Cliente";
  const clientInstagram = data?.project?.client_instagram || currentProject?.profiles?.instagram || data?.igProfile?.username;
  const rawClientAvatar = data?.project?.client_avatar || currentProject?.profiles?.avatar_url || data?.igProfile?.avatar_url;
  const safeClientAvatar = rawClientAvatar && (rawClientAvatar.includes('cdninstagram.com') || rawClientAvatar.includes('fbcdn.net') || rawClientAvatar.includes('instagram.f'))
    ? `/api/storage/instagram-photo?url=${encodeURIComponent(rawClientAvatar)}`
    : rawClientAvatar;
  const clientInitial = (clientName.trim().charAt(0) || "C").toUpperCase();

  return (
    <div className="flex flex-col gap-6 pb-8 animate-[fadeInUp_0.4s_ease-out]">

      {/* BANNER DE CONTRATO PAUSADO */}
      {currentProject?.status === 'paused' && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 p-4 px-6 rounded-2xl flex items-center justify-between gap-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-3">
            <PauseCircle size={22} className="text-amber-600 shrink-0" />
            <div className="flex flex-col">
              <span className="font-roboto text-[11px] font-bold uppercase tracking-wider text-amber-900">
                Contrato Pausado por Sazonalidade
              </span>
              <span className="text-xs text-amber-700 font-roboto">
                Este projeto de Instagram está temporariamente pausado. Ele não conta como projeto ativo nas métricas da agência e o ciclo está em espera.
              </span>
            </div>
          </div>
          <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shrink-0 shadow-2xs">
            Pausado
          </span>
        </div>
      )}

      {/* ========== HEADER: CICLO + MOVIMENTOS ========== */}
      <div className={`${glass} p-6`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-2xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-terracota)]/20 shadow-sm flex items-center justify-center text-[var(--color-atelier-terracota)] font-elegant text-2xl overflow-hidden shrink-0">
              {safeClientAvatar ? (
                <img 
                  src={safeClientAvatar} 
                  alt={clientName} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="font-bold">{clientInitial}</span>
              )}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-atelier-grafite)] text-white flex items-center justify-center shadow-xs">
                <Compass size={11} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className={`${label} text-[var(--color-atelier-terracota)]`}>Ciclo {cycle.cycle_number}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${cycle.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {cycle.status === 'open' ? 'Em Andamento' : 'Encerrado'}
                </span>
                {clientInstagram && (
                  <span className="text-[10.5px] font-roboto font-semibold text-[var(--color-atelier-grafite)]/60 bg-black/5 px-2 py-0.5 rounded-md">
                    @{clientInstagram.replace('@', '')}
                  </span>
                )}
              </div>
              <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60">
                {new Date(cycle.period_start).toLocaleDateString('pt-BR')} — {new Date(cycle.period_end).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">{metrics.daysRemaining}</p>
              <p className={`${label} text-[var(--color-atelier-grafite)]/40`}>dias restantes</p>
            </div>
            <button
              onClick={() => setIsRenewModalOpen(true)}
              disabled={isRenewing}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-atelier-terracota)] to-[#83421d] hover:brightness-110 text-white font-roboto text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
              title="Encerrar ciclo atual e iniciar novo ciclo com geração automática de demandas"
            >
              <RefreshCw size={13} className={isRenewing ? "animate-spin" : ""} />
              <span>Renovar Ciclo</span>
            </button>
          </div>
        </div>

        {/* Barra dos 6 movimentos */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {MOVEMENTS.map((m, i) => {
            const isActive = currentMovement === m.id;
            const isPast = MOVEMENTS.findIndex(x => x.id === currentMovement) > i;
            return (
              <div key={m.id} className="flex items-center gap-1 shrink-0">
                <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-300 ${
                  isActive ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md scale-[1.02]'
                  : isPast ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-gray-50 text-gray-400'
                }`}>
                  <span className="text-[9px] font-bold">{m.n}</span>
                  <span className="text-[11px] font-bold whitespace-nowrap">{m.label}</span>
                </div>
                {i < MOVEMENTS.length - 1 && <ChevronRight size={14} className="text-gray-300 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========== CORPO: PEÇAS + PAINEL ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* COLUNA ESQUERDA: PEÇAS DO CICLO & ENTREGÁVEIS */}
        <div className="lg:col-span-3 flex flex-col gap-6">

          {/* SEÇÃO: ENTREGÁVEIS DOCUMENTAIS & ESTRATÉGICOS (ALINHAMENTO VISUAL, CALENDÁRIO, BRIEFING) */}
          {(() => {
            const foundationalTasks = (data?.tasks || []).filter((t: any) => {
              const title = (t.title || '').toLowerCase();
              const type = (t.task_type || '').toLowerCase();
              return (
                /calend[áa]rio editorial|planejamento editorial/i.test(title) ||
                type === 'calendario_editorial' ||
                /alinhamento visual|estilo do feed/i.test(title) ||
                type === 'alinhamento_visual' ||
                /reuni[ãa]o de briefing|briefing inicial/i.test(title) ||
                (type === 'reuniao' && /briefing/i.test(title)) ||
                /estudo de marca/i.test(title) ||
                type === 'estudo_marca'
              );
            });

            if (foundationalTasks.length === 0) return null;

            return (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={sectionTitle}>Entregáveis Estratégicos & Documentais</h3>
                    <p className="text-[11px] text-gray-500 font-roboto mt-0.5">Validações fundamentais enviadas via PDF para aprovação do cliente no Cockpit</p>
                  </div>
                  <span className={`${label} text-[var(--color-atelier-terracota)]`}>
                    Entregáveis PDF
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {foundationalTasks.map((ft: any) => {
                    const isFtPdf = ft.attachment_url?.toLowerCase().includes('.pdf') || ft.media_assets?.[0]?.type === 'pdf';
                    const isFtApproved = ft.status === 'completed' || ft.status === 'approved' || ft.ig_publish_status === 'approved';
                    const isFtPendingApproval = ft.status === 'pending_client_approval' || ft.ig_publish_status === 'awaiting_approval';
                    const isFtAdjust = ft.status === 'review' || ft.ig_publish_status === 'adjust_requested';

                    return (
                      <div key={ft.id} className={`${glass} p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-white/80 hover:shadow-md transition-all`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                            isFtPdf ? 'bg-red-50 text-red-600 border border-red-200/80' : 'bg-indigo-50 text-indigo-600 border border-indigo-200/80'
                          }`}>
                            {isFtPdf ? <FileText size={20} /> : <Compass size={20} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] truncate">
                                {ft.title}
                              </h4>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                                isFtApproved ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : isFtAdjust ? 'bg-red-100 text-red-800 border-red-200'
                                : isFtPendingApproval ? 'bg-orange-100 text-orange-800 border-orange-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                              }`}>
                                {isFtApproved ? 'Aprovado pelo Cliente'
                                 : isFtAdjust ? 'Revisão Solicitada'
                                 : isFtPendingApproval ? 'Aguardando Aprovação'
                                 : 'Em Preparação'}
                              </span>
                            </div>
                            {ft.attachment_url ? (
                              <p className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                  <Check size={12} /> Documento Anexado
                                </span>
                                <a href={ft.attachment_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold">
                                  <ExternalLink size={10} /> Visualizar PDF
                                </a>
                              </p>
                            ) : (
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                Nenhum PDF anexado ainda para este entregável.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {/* Botão de Upload */}
                          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-roboto text-[11px] font-bold cursor-pointer transition shadow-2xs">
                            {uploadingTaskId === ft.id ? <Loader2 size={13} className="animate-spin text-[var(--color-atelier-terracota)]" /> : <UploadCloud size={13} />}
                            <span>{ft.attachment_url ? 'Substituir PDF' : 'Anexar PDF'}</span>
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              className="hidden"
                              disabled={uploadingTaskId === ft.id}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadAsset(ft.id, f);
                              }}
                            />
                          </label>

                          {/* Botão de Envio para aprovação */}
                          {ft.attachment_url && !isFtApproved && !isFtPendingApproval && (
                            <button
                              onClick={() => sendForApproval(ft.id)}
                              disabled={saving}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-atelier-terracota)] text-white hover:bg-[#234E80] font-roboto text-[11px] font-bold transition shadow-xs cursor-pointer"
                            >
                              <Send size={12} /> Enviar p/ Cliente
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <h3 className={sectionTitle}>Peças do Ciclo</h3>
            <div className="flex items-center gap-2">
              <span className={`${label} text-[var(--color-atelier-grafite)]/40`}>
                {metrics.published}/{metrics.totalPieces} publicadas
              </span>
              <button onClick={batchSendForApproval} disabled={saving}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all text-[11px] font-bold">
                <Send size={13} /> Enviar Lote
              </button>
            </div>
          </div>

          {/* ALERTA DE AJUSTES SOLICITADOS */}
          {(() => {
            const piecesWithAdjustment = (pieces || []).filter((p: any) =>
              deriveStatus(p) === 'adjust_requested' || p.status === 'review'
            );
            if (piecesWithAdjustment.length === 0) return null;
            return (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-gradient-to-r from-red-500/15 via-amber-500/10 to-red-500/5 border border-red-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-md animate-pulse">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="font-roboto font-bold text-[13px] text-red-950 flex items-center gap-2">
                      {piecesWithAdjustment.length} {piecesWithAdjustment.length === 1 ? 'Peça com Ajuste Solicitado' : 'Peças com Ajustes Solicitados'}
                    </h4>
                    <p className="font-roboto text-[11px] text-red-800/80">
                      O cliente solicitou alterações nesta peça. Clique para visualizar o feedback completo e reenviar.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedPiece(piecesWithAdjustment[0].id)}
                  className="px-3.5 py-2 rounded-xl bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 transition shadow-sm shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye size={13} /> Visualizar Ajuste
                </button>
              </motion.div>
            );
          })()}

          {pieces.length === 0 ? (
            <div className={`${glass} p-8 flex flex-col items-center justify-center gap-3 opacity-40`}>
              <Package size={32} />
              <p className="font-roboto text-sm">Nenhuma peça vinculada a este ciclo ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pieces.map((piece: any) => {
                const status = deriveStatus(piece);
                const statusInfo = PIECE_STATUS[status];
                const isExpanded = expandedPiece === piece.id;
                const pillar = PILLARS.find(p => p.id === piece.ig_pillar);
                const pieceEvents = (approvalEvents || []).filter((e: any) => e.task_id === piece.id);

                const feedbackMessages: any[] = (() => {
                  if (!piece.admin_feedback) return [];
                  try {
                    const parsed = typeof piece.admin_feedback === 'string' ? JSON.parse(piece.admin_feedback) : piece.admin_feedback;
                    return Array.isArray(parsed) ? parsed : [];
                  } catch {
                    return [{ content: String(piece.admin_feedback), authorName: 'Cliente', role: 'client', createdAt: piece.updated_at }];
                  }
                })();

                const isAdjustRequested = status === 'adjust_requested' || piece.status === 'review';
                const latestFeedback = feedbackMessages.length > 0 ? feedbackMessages[feedbackMessages.length - 1] : null;

                return (
                  <motion.div key={piece.id} layout
                    className={`${glass} p-4 cursor-pointer transition-all hover:shadow-lg ${isExpanded ? 'sm:col-span-2 ring-2 ring-[var(--color-atelier-terracota)]/30' : ''} ${isAdjustRequested ? 'border-red-300 bg-red-50/20' : ''}`}
                    onClick={() => setExpandedPiece(isExpanded ? null : piece.id)}>

                    {/* Chip de alerta quando há ajuste solicitado de fato */}
                    {isAdjustRequested && latestFeedback && (
                      <div className="mb-2 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 text-[10px] font-bold flex items-center justify-between gap-1.5">
                        <span className="flex items-center gap-1.5 truncate">
                          <AlertTriangle size={12} className="text-red-600 shrink-0" />
                          <span className="truncate">Ajuste Solicitado: {latestFeedback.content || latestFeedback.text}</span>
                        </span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-red-200 text-red-800 shrink-0">
                          {latestFeedback.authorName || 'Cliente'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                        {piece.attachment_url ? (
                          piece.attachment_url.toLowerCase().includes('.pdf') ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-600 gap-0.5">
                              <FileText size={18} />
                              <span className="text-[8px] font-bold uppercase">PDF</span>
                            </div>
                          ) : (
                            <img src={piece.attachment_url} alt="" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            {piece.task_type === 'video' ? <Video size={20} /> : <ImageIcon size={20} />}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-roboto text-[13px] font-semibold text-[var(--color-atelier-grafite)] truncate">{piece.title}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${statusColors[statusInfo.tone]}`}>
                            {statusInfo.label}
                          </span>
                          {piece.ig_format && (
                            <span className="text-[9px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100 font-bold uppercase">
                              {piece.ig_format}
                            </span>
                          )}
                          {pillar && (
                            <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase" style={{ backgroundColor: pillar.color + '15', color: pillar.color, border: `1px solid ${pillar.color}30` }}>
                              {pillar.label}
                            </span>
                          )}
                          {isAdjustRequested && (
                            <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                              <AlertTriangle size={10} /> Ajuste Solicitado
                            </span>
                          )}
                        </div>
                        {piece.deadline && (
                          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                            <Calendar size={10} /> {new Date(piece.deadline).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Expansão: detalhes, ajuste e ações */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="mt-4 pt-4 border-t border-gray-100 space-y-3" onClick={e => e.stopPropagation()}>

                          {/* BOX DE FEEDBACK: SEPARAÇÃO ENTRE AJUSTE E ORIENTAÇÃO DA GESTÃO */}
                          {feedbackMessages.length > 0 && (
                            isAdjustRequested ? (
                              <div className="bg-red-50/80 border border-red-200/90 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-red-900 font-bold text-[12px]">
                                    <AlertTriangle size={16} className="text-red-600" />
                                    <span>Alterações Solicitadas</span>
                                    {piece.ig_revision_round > 0 && (
                                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-200 text-red-900 font-bold">
                                        Rodada #{piece.ig_revision_round}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Thread de mensagens de ajuste */}
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                  {feedbackMessages.map((msg: any, idx: number) => {
                                    const author = msg.authorName || msg.by || 'Cliente';
                                    const role = msg.role || 'client';
                                    const content = msg.content || msg.text || '';
                                    const date = msg.createdAt || msg.date;
                                    const isClient = role === 'client' || author.toLowerCase().includes('cliente');

                                    return (
                                      <div
                                        key={msg.id || idx}
                                        className={`p-3 rounded-xl border text-[12px] ${
                                          isClient
                                            ? 'bg-white border-red-200 shadow-xs text-gray-800'
                                            : 'bg-amber-50/90 border-amber-200/80 text-amber-950'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between mb-1 gap-2">
                                          <div className="flex items-center gap-1.5 font-bold text-[11px]">
                                            <span className={`w-2 h-2 rounded-full ${isClient ? 'bg-red-500' : 'bg-blue-500'}`} />
                                            <span className="text-[var(--color-atelier-grafite)]">{author}</span>
                                            <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-medium">
                                              {isClient ? 'Solicitante' : 'Equipe'}
                                            </span>
                                          </div>
                                          {date && (
                                            <span className="text-[10px] text-gray-400">
                                              {new Date(date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                          )}
                                        </div>
                                        <p className="whitespace-pre-wrap leading-relaxed text-[12px]">{content}</p>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Ação rápida para resolver ajuste */}
                                <div className="pt-2 border-t border-red-200/60 flex flex-col gap-2">
                                  <input
                                    type="text"
                                    placeholder="Escreva uma resposta ou nota da alteração..."
                                    value={adjustNote[piece.id] || ''}
                                    onChange={(e) => setAdjustNote(prev => ({ ...prev, [piece.id]: e.target.value }))}
                                    className="w-full text-[11px] px-3 py-2 rounded-xl bg-white border border-red-200 focus:outline-none focus:ring-1 focus:ring-red-400 font-roboto"
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => resolveAdjustment(piece.id)}
                                      disabled={saving}
                                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-sm cursor-pointer"
                                    >
                                      <CheckCircle2 size={13} />
                                      Marcar Ajuste Resolvido & Reenviar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Quando NÃO é ajuste (ex: envio de pauta, orientações da equipe, validação pendente) */
                              <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-amber-950 font-bold text-[12px]">
                                    <FileText size={15} className="text-[var(--color-atelier-terracota)]" />
                                    <span>Orientações & Envio da Gestão</span>
                                  </div>
                                  <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-900 font-bold border border-amber-200/50">
                                    Informativo
                                  </span>
                                </div>

                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                  {feedbackMessages.map((msg: any, idx: number) => {
                                    const author = msg.authorName || msg.by || 'Gestão Studio Veronna';
                                    const content = msg.content || msg.text || '';
                                    const date = msg.createdAt || msg.date;

                                    return (
                                      <div
                                        key={msg.id || idx}
                                        className="p-3 rounded-xl bg-white border border-amber-200/70 shadow-2xs text-gray-800 text-[12px]"
                                      >
                                        <div className="flex items-center justify-between mb-1 gap-2">
                                          <div className="flex items-center gap-1.5 font-bold text-[11px]">
                                            <span className="w-2 h-2 rounded-full bg-[var(--color-atelier-terracota)]" />
                                            <span className="text-[var(--color-atelier-grafite)]">{author}</span>
                                            <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-medium">
                                              Equipe
                                            </span>
                                          </div>
                                          {date && (
                                            <span className="text-[10px] text-gray-400">
                                              {new Date(date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                          )}
                                        </div>
                                        <p className="whitespace-pre-wrap leading-relaxed text-[12px] text-gray-700">{content}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )
                          )}

                          {piece.caption && (
                            <div>
                              <p className={`${label} text-gray-400 mb-1`}>Legenda</p>
                              <p className="text-[12px] text-[var(--color-atelier-grafite)]/80 whitespace-pre-wrap line-clamp-4">{piece.caption}</p>
                            </div>
                          )}
                          {piece.ig_cta && (
                            <div>
                              <p className={`${label} text-gray-400 mb-1`}>CTA</p>
                              <p className="text-[12px] text-[var(--color-atelier-grafite)]/70">{piece.ig_cta}</p>
                            </div>
                          )}
                          {piece.ig_hypothesis && (
                            <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-3">
                              <p className={`${label} text-amber-600 mb-1 flex items-center gap-1`}><Lightbulb size={10} /> O que estamos testando</p>
                              <p className="text-[12px] text-amber-800/80">{piece.ig_hypothesis}</p>
                            </div>
                          )}

                          {/* Histórico de aprovação */}
                          {pieceEvents.length > 0 && (
                            <div>
                              <p className={`${label} text-gray-400 mb-1.5`}>Histórico de Eventos</p>
                              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {pieceEvents.map((ev: any) => (
                                  <div key={ev.id} className="flex items-center gap-2 text-[11px]">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.action === 'approve' ? 'bg-emerald-500' : ev.action === 'request_adjust' ? 'bg-red-400' : 'bg-blue-400'}`} />
                                    <span className="text-gray-500">{new Date(ev.created_at).toLocaleDateString('pt-BR')}</span>
                                    <span className="font-medium text-[var(--color-atelier-grafite)]">
                                      {ev.actor_name}: {ev.action === 'approve' ? 'Aprovou' : ev.action === 'request_adjust' ? 'Solicitou ajuste' : 'Comentou'}
                                    </span>
                                    {ev.comment && <span className="text-gray-400 truncate">— {ev.comment}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Ações rápidas */}
                          <div className="flex items-center gap-2 pt-2 flex-wrap">
                            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200/60 font-roboto text-[11px] font-bold cursor-pointer transition shadow-2xs">
                              {uploadingTaskId === piece.id ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                              <span>{piece.attachment_url ? 'Substituir Mídia/PDF' : 'Anexar Mídia/PDF'}</span>
                              <input
                                type="file"
                                accept="image/*,video/*,application/pdf"
                                className="hidden"
                                disabled={uploadingTaskId === piece.id}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleUploadAsset(piece.id, f);
                                }}
                              />
                            </label>
                            {status === 'in_production' && piece.attachment_url && (
                              <button onClick={() => sendForApproval(piece.id)} disabled={saving}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 text-white text-[11px] font-bold hover:bg-orange-600 transition-colors">
                                <Send size={12} /> Enviar para Aprovação
                              </button>
                            )}
                            {(status === 'approved' || status === 'scheduled') && (
                              <button onClick={() => markPublished(piece.id)} disabled={saving}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-[11px] font-bold hover:bg-emerald-600 transition-colors">
                                <CheckCircle2 size={12} /> Marcar Publicado
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: PAINEL DE CONTROLE */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Métricas rápidas */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Aprovadas", value: metrics.approved, icon: <CheckCircle2 size={14} />, tone: "text-emerald-600" },
              { label: "Aguardando", value: metrics.awaitingApproval, icon: <Clock size={14} />, tone: "text-orange-500" },
              { label: "Ajuste", value: metrics.adjustRequested, icon: <AlertTriangle size={14} />, tone: "text-red-500" },
              { label: "Produção", value: metrics.inProduction, icon: <Pencil size={14} />, tone: "text-blue-500" },
            ].map(m => (
              <div key={m.label} className={`${glass} p-4 flex items-center gap-3`}>
                <div className={`${m.tone}`}>{m.icon}</div>
                <div>
                  <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">{m.value}</p>
                  <p className={`${label} text-[var(--color-atelier-grafite)]/40`}>{m.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Estratégia do ciclo */}
          <div className={`${glass} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className={sectionTitle}>Estratégia</h4>
              <button onClick={() => editingStrategy ? saveStrategy() : setEditingStrategy(true)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  editingStrategy ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                {editingStrategy ? <><Check size={10} /> Salvar</> : <><Pencil size={10} /> Editar</>}
              </button>
            </div>

            {editingStrategy ? (
              <div className="space-y-3">
                <div>
                  <label className={`${label} text-gray-400 mb-1 block`}>Objetivo do Ciclo</label>
                  <input value={strategyForm.objective} onChange={e => setStrategyForm({...strategyForm, objective: e.target.value})}
                    className="w-full text-[13px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:border-[var(--color-atelier-terracota)] outline-none"
                    placeholder="Ex: Aumentar procura qualificada..." />
                </div>
                <div>
                  <label className={`${label} text-gray-400 mb-1 block`}>Foco Principal</label>
                  <select value={strategyForm.objective_kind} onChange={e => setStrategyForm({...strategyForm, objective_kind: e.target.value})}
                    className="w-full text-[13px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:border-[var(--color-atelier-terracota)] outline-none">
                    <option value="">Selecione...</option>
                    {Object.entries(OBJECTIVE_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`${label} text-gray-400 mb-1 block`}>Estratégia Editorial</label>
                  <textarea value={strategyForm.editorial_strategy} onChange={e => setStrategyForm({...strategyForm, editorial_strategy: e.target.value})}
                    rows={3}
                    className="w-full text-[12px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:border-[var(--color-atelier-terracota)] outline-none resize-none"
                    placeholder="Demonstrar competência, responder dúvidas..." />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {cycle.objective ? (
                  <p className="text-[13px] text-[var(--color-atelier-grafite)]">{cycle.objective}</p>
                ) : (
                  <p className="text-[12px] text-gray-400 italic">Nenhum objetivo definido para este ciclo.</p>
                )}
                {cycle.objective_kind && OBJECTIVE_KINDS[cycle.objective_kind] && (
                  <span className={`inline-block text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)]`}>
                    Foco: {OBJECTIVE_KINDS[cycle.objective_kind].label}
                  </span>
                )}
              </div>
            )}

            {/* Pilares */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className={`${label} text-gray-400 mb-2`}>Pilares Editoriais</p>
              <div className="flex rounded-xl overflow-hidden h-3 bg-gray-100">
                {PILLARS.map(p => {
                  const w = pillarWeights[p.id] || 0;
                  return w > 0 ? (
                    <div key={p.id} style={{ width: `${w}%`, backgroundColor: p.color }} className="transition-all duration-500"
                      title={`${p.label}: ${w}%`} />
                  ) : null;
                })}
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {PILLARS.map(p => (
                  <span key={p.id} className="flex items-center gap-1 text-[10px] text-gray-500">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.label} {pillarWeights[p.id] || 0}%
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Direcionamento Estratégico do Ciclo */}
          <div className={`${glass} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className={sectionTitle}>Direcionamento Estratégico</h4>
                <p className="text-[10px] text-gray-400 font-roboto mt-0.5">Alinhamento executivo e prioridades do ciclo</p>
              </div>
              {cycle.pulse_answered_at && (
                <button
                  type="button"
                  onClick={handleDownloadDirecionamentoPDF}
                  disabled={isDownloadingPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white text-[10px] font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  title="Baixar PDF das respostas do cliente"
                >
                  {isDownloadingPDF ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  <span>Baixar PDF</span>
                </button>
              )}
            </div>

            {cycle.pulse_answered_at ? (
              <div className="space-y-2">
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold mb-2">
                  <CheckCircle2 size={12} /> Respondido em {new Date(cycle.pulse_answered_at).toLocaleDateString('pt-BR')}
                </span>
                {PULSE_QUESTIONS.map(q => {
                  const answer = cycle.pulse_answers?.[q.id];
                  return answer ? (
                    <div key={q.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className={`${label} text-gray-400 mb-0.5`}>{q.q}</p>
                      <p className="text-[12px] text-[var(--color-atelier-grafite)] leading-relaxed">{answer}</p>
                    </div>
                  ) : null;
                })}
              </div>
            ) : (
              <p className="mt-3 text-[12px] text-gray-400 italic flex items-center gap-1.5">
                <Clock size={13} /> Aguardando respostas do cliente
              </p>
            )}
          </div>

          {/* Próximos Passos */}
          {nextSteps.length > 0 && (
            <div className={`${glass} p-5 border-[var(--color-atelier-terracota)]/20`}>
              <h4 className={sectionTitle}>Próximo Passo</h4>
              <div className="mt-3 space-y-2">
                {nextSteps.map((step: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] text-[var(--color-atelier-grafite)]">
                    <ArrowRight size={12} className="text-[var(--color-atelier-terracota)] shrink-0" />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    
      {/* MODAL DE RENOVAÇÃO DE CICLO */}
      <AnimatePresence>
        {isRenewModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-white/80 relative flex flex-col gap-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[var(--color-atelier-terracota)]">
                    <RefreshCw size={22} className={isRenewing ? "animate-spin" : ""} />
                  </div>
                  <div>
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] font-bold">
                      Renovar Ciclo de Instagram
                    </h3>
                    <p className="font-roboto text-xs text-gray-500 mt-0.5">
                      Transição do Ciclo {cycle.cycle_number} para o Ciclo {cycle.cycle_number + 1}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRenewModalOpen(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--color-atelier-creme)]/40 border border-[var(--color-atelier-terracota)]/15 text-xs text-gray-600 space-y-2">
                <p>
                  • O <strong>Ciclo {cycle.cycle_number}</strong> será arquivado como histórico oficial.
                </p>
                <p>
                  • Um novo <strong>Ciclo {cycle.cycle_number + 1}</strong> será criado com período de 30 dias.
                </p>
                <p>
                  • A data de faturamento do projeto será avançada para o novo período.
                </p>
                <p>
                  • As peças de conteúdo e demandas contratuais do novo ciclo serão geradas automaticamente na esteira de produção.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-roboto font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Aprendizados do Ciclo {cycle.cycle_number} (Opcional)
                  </label>
                  <textarea
                    value={renewLearnings}
                    onChange={(e) => setRenewLearnings(e.target.value)}
                    placeholder="Quais formatos, ganchos ou pilares performaram melhor neste ciclo?"
                    rows={2}
                    className="w-full p-3 rounded-xl border border-gray-200 text-xs font-roboto focus:outline-none focus:ring-2 focus:ring-[var(--color-atelier-terracota)]/30 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-roboto font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Direcionamento para o Ciclo {cycle.cycle_number + 1} (Opcional)
                  </label>
                  <textarea
                    value={renewNextDecision}
                    onChange={(e) => setRenewNextDecision(e.target.value)}
                    placeholder="Foco prioritário do novo ciclo (ex: conversão no direct, autoridade em Reels)..."
                    rows={2}
                    className="w-full p-3 rounded-xl border border-gray-200 text-xs font-roboto focus:outline-none focus:ring-2 focus:ring-[var(--color-atelier-terracota)]/30 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRenewModalOpen(false)}
                  disabled={isRenewing}
                  className="px-4 py-2 rounded-xl text-xs font-roboto font-bold uppercase text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRenewCycle}
                  disabled={isRenewing}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-atelier-terracota)] to-[#83421d] hover:brightness-110 text-white font-roboto text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isRenewing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Renovando Ciclo...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      <span>Confirmar & Iniciar Ciclo {cycle.cycle_number + 1}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
</div>
  );
}
