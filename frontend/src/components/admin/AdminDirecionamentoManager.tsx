"use client";
import React, { useState, useEffect } from "react";
import { 
  Compass, FileText, UploadCloud, Plus, X, Loader2, 
  CheckCircle2, Send, AlertCircle, ExternalLink, MessageSquare, Download, Clock
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { NotificationEngine } from "../../lib/NotificationEngine";

interface AdminDirecionamentoManagerProps {
  projectId: string;
  taskId?: string;
  currentUser?: any;
  onTaskUpdate?: () => void;
}

export function AdminDirecionamentoManager({ 
  projectId, 
  taskId, 
  currentUser, 
  onTaskUpdate 
}: AdminDirecionamentoManagerProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [taskData, setTaskData] = useState<any>(null);
  const [projectClientId, setProjectClientId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSendingToClient, setIsSendingToClient] = useState(false);

  // Form State
  const [docTitle, setDocTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const [plansRes, projectRes, taskRes] = await Promise.all([
        (supabase
          .from("content_planning") as any)
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        (supabase
          .from("projects") as any)
          .select("client_id, profiles(nome)")
          .eq("id", projectId)
          .maybeSingle(),
        taskId
          ? (supabase.from("tasks") as any).select("*").eq("id", taskId).maybeSingle()
          : (supabase.from("tasks") as any)
              .select("*")
              .eq("project_id", projectId)
              .ilike("title", "%direcionamento%")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
      ]);

      if (plansRes.data) {
        // Filtra por itens de direcionamento ou mostra os mais recentes
        const dirPlans = plansRes.data.filter((p: any) => 
          p.pillar === 'Direcionamento Criativo' || 
          p.hook?.toLowerCase().includes('direcionamento') ||
          p.hook?.toLowerCase().includes('direção')
        );
        setPlans(dirPlans.length > 0 ? dirPlans : plansRes.data);
      }
      if ((projectRes.data as any)?.client_id) {
        setProjectClientId((projectRes.data as any).client_id);
      }
      if ((projectRes.data as any)?.profiles?.nome) {
        setProjectName((projectRes.data as any).profiles.nome);
      }
      if (taskRes.data) {
        setTaskData(taskRes.data);
      }
    } catch (e) {
      console.error("[AdminDirecionamentoManager] Erro ao carregar dados:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId, taskId]);

  const handleFileUpload = async () => {
    if (!selectedFile) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Selecione um arquivo PDF de direcionamento.' }));
      return;
    }

    setIsUploading(true);
    try {
      const ext = selectedFile.name.split('.').pop() || 'pdf';
      const fileName = `direcionamento_${Date.now()}.${ext}`;
      const filePath = `direcionamentos/${projectId}/${fileName}`;

      // Upload para storage bucket 'references'
      let publicUrl = '';
      const { error: uploadError } = await supabase.storage.from('references').upload(filePath, selectedFile);
      if (uploadError) {
        // Fallback para 'moodboard'
        const { error: fbError } = await supabase.storage.from('moodboard').upload(filePath, selectedFile);
        if (fbError) throw fbError;
        const { data: pubData } = supabase.storage.from('moodboard').getPublicUrl(filePath);
        publicUrl = pubData.publicUrl;
      } else {
        const { data: pubData } = supabase.storage.from('references').getPublicUrl(filePath);
        publicUrl = pubData.publicUrl;
      }

      const title = docTitle.trim() || `Direcionamento Criativo - ${projectName || 'Identidade Visual'}`;

      // Salva em content_planning (mesma rota usada pelo planejamento editorial)
      const payload = {
        project_id: projectId,
        client_id: projectClientId,
        hook: title,
        pillar: 'Direcionamento Criativo',
        briefing: notes.trim() || null,
        planning_file_url: publicUrl,
        status: 'pending',
        month_year: 'Fase 02',
        is_avulso: false
      };

      const { data: inserted, error: insertError } = await (supabase.from('content_planning') as any).insert(payload).select().single();
      if (insertError) throw insertError;

      // Se houver taskId, anexa o PDF na tarefa
      const targetTaskId = taskId || taskData?.id;
      if (targetTaskId) {
        await (supabase.from('tasks') as any).update({
          attachment_url: publicUrl
        }).eq('id', targetTaskId);
      }

      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Documento de direcionamento anexado com sucesso!' }));
      setSelectedFile(null);
      setDocTitle("");
      setNotes("");
      setIsAdding(false);
      fetchData();
    } catch (e: any) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao anexar arquivo: ' + (e?.message || '') }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleApproveAndSendToClient = async (planId?: string) => {
    setIsSendingToClient(true);
    try {
      const targetPlanId = planId || plans[0]?.id;
      if (!targetPlanId && plans.length === 0) {
        window.dispatchEvent(new CustomEvent('showToast', { detail: 'Anexe primeiro o arquivo de Direcionamento Criativo.' }));
        setIsSendingToClient(false);
        return;
      }

      // 1. Atualizar content_planning para awaiting_approval
      if (targetPlanId) {
        await (supabase
          .from('content_planning') as any)
          .update({ status: 'awaiting_approval' })
          .eq('id', targetPlanId);
      } else {
        await (supabase
          .from('content_planning') as any)
          .update({ status: 'awaiting_approval' })
          .eq('project_id', projectId);
      }

      // 2. Atualizar status da tarefa para pending_client_approval
      const targetTaskId = taskId || taskData?.id;
      if (targetTaskId) {
        await (supabase
          .from('tasks') as any)
          .update({ 
            status: 'pending_client_approval',
            updated_at: new Date().toISOString()
          })
          .eq('id', targetTaskId);
      }

      // 3. Notificar o cliente
      if (projectClientId) {
        await NotificationEngine.notifyUser(
          projectClientId,
          "🎨 Direcionamento Criativo Pronto",
          "O Direcionamento Criativo da sua marca foi finalizado pela equipe do Studio Veronna e aguarda sua validação na Fase 02.",
          "action",
          "/projeto/direcionar"
        );
      }

      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Direcionamento Criativo liberado e enviado ao cliente!' }));
      onTaskUpdate?.();
      fetchData();
    } catch (e: any) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao enviar direcionamento ao cliente.' }));
    } finally {
      setIsSendingToClient(false);
    }
  };

  const latestPlan = plans[0];
  const isAwaitingClient = latestPlan?.status === 'awaiting_approval' || taskData?.status === 'pending_client_approval';
  const isApproved = latestPlan?.status === 'approved' || taskData?.status === 'completed';
  const isNeedsRevision = latestPlan?.status === 'needs_revision' || taskData?.status === 'review';

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* HEADER DO DIRECIONAMENTO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100/80 text-[var(--color-atelier-terracota)] text-[9.5px] font-roboto font-bold uppercase tracking-widest">
              Etapa 003 • Direcionar
            </span>
          </div>
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
            <Compass size={22} className="text-[var(--color-atelier-terracota)]" /> 
            Direcionamento Criativo da Marca
          </h3>
          <p className="font-roboto text-[11px] text-gray-500 uppercase tracking-widest mt-0.5">
            Lançamento do Documento Oficial em PDF para Avaliação do Cliente
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isApproved ? (
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-emerald-200">
              <CheckCircle2 size={12} /> Aprovado pelo Cliente
            </span>
          ) : isNeedsRevision ? (
            <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-rose-200">
              <AlertCircle size={12} /> Ajustes Solicitados
            </span>
          ) : isAwaitingClient ? (
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-amber-200 animate-pulse">
              <Clock size={12} /> Aguardando Cliente
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-gray-200">
              Rascunho Interno
            </span>
          )}

          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-3.5 py-1.5 bg-[var(--color-atelier-grafite)] text-white hover:bg-[var(--color-atelier-terracota)] rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} /> Novo Documento PDF
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK DO CLIENTE SE HOUVER AJUSTES */}
      {isNeedsRevision && latestPlan?.feedback && (
        <div className="bg-rose-50 border border-rose-200/80 p-5 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-700 font-bold font-roboto text-[11px] uppercase tracking-wider">
            <MessageSquare size={14} />
            Parecer do Cliente / Solicitação de Ajuste
          </div>
          <p className="text-[13px] text-rose-900 bg-white/70 p-3.5 rounded-xl border border-rose-100 font-medium whitespace-pre-wrap leading-relaxed">
            {latestPlan.feedback}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600/80 mt-1">
            Faça as alterações necessárias no documento e anexe a nova versão abaixo para reenvio.
          </p>
        </div>
      )}

      {/* FORM DE UPLOAD */}
      {isAdding && (
        <div className="bg-white p-6 rounded-2xl border border-[var(--color-atelier-terracota)]/20 shadow-sm flex flex-col gap-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h4 className="font-roboto font-bold text-[12px] uppercase tracking-wider text-[var(--color-atelier-grafite)] flex items-center gap-2">
              <UploadCloud size={16} className="text-[var(--color-atelier-terracota)]" /> Anexar Direcionamento Criativo (PDF)
            </h4>
            <button 
              onClick={() => { setIsAdding(false); setSelectedFile(null); }} 
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                Título do Documento
              </label>
              <input
                type="text"
                placeholder="Ex: Direcionamento Criativo Oficial - Identidade Visual"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full bg-[#faf9f8] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-800 focus:outline-none focus:border-[var(--color-atelier-terracota)]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                Contexto Estratégico & Orientações para o Cliente
              </label>
              <textarea
                placeholder="Descreva a lógica criativa, decisões de design e orientações para o cliente avaliar o PDF..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-[#faf9f8] border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-800 focus:outline-none focus:border-[var(--color-atelier-terracota)] resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                Arquivo PDF
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:uppercase file:tracking-wider file:bg-gray-100 file:text-[var(--color-atelier-grafite)] hover:file:bg-[var(--color-atelier-terracota)] hover:file:text-white file:transition-colors file:cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => { setIsAdding(false); setSelectedFile(null); }}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleFileUpload}
              disabled={isUploading || !selectedFile}
              className="px-6 py-2.5 bg-[var(--color-atelier-terracota)] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:brightness-110 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              {isUploading ? "Enviando..." : "Salvar Documento"}
            </button>
          </div>
        </div>
      )}

      {/* LISTA DE DOCUMENTOS */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-gray-400">
          <Loader2 size={24} className="animate-spin text-[var(--color-atelier-terracota)]" />
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-center gap-3">
          <FileText size={32} className="text-gray-300" />
          <div>
            <h4 className="font-roboto font-bold text-xs uppercase tracking-wider text-gray-600">
              Nenhum Direcionamento Criativo Anexado
            </h4>
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              Anexe o PDF com o direcionamento criativo aprovado internamente para submeter à validação oficial do cliente.
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="mt-2 px-4 py-2 bg-white border border-gray-200 text-[var(--color-atelier-grafite)] rounded-xl text-xs font-bold uppercase tracking-wider hover:border-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-terracota)] transition-colors shadow-2xs"
          >
            Anexar Primeiro PDF
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {plans.map((plan: any) => {
            const fileUrl = plan.planning_file_url || (plan.media_assets && plan.media_assets[0]?.url);
            const isItemApproved = plan.status === 'approved';
            const isItemAwaiting = plan.status === 'awaiting_approval';
            const isItemRevision = plan.status === 'needs_revision';

            return (
              <div 
                key={plan.id}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0 mt-0.5">
                    <FileText size={20} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-roboto font-bold text-[13px] text-gray-800 truncate">
                        {plan.hook || "Direcionamento Criativo"}
                      </h4>
                      {isItemApproved && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider">
                          Aprovado
                        </span>
                      )}
                      {isItemAwaiting && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wider">
                          Aguardando Cliente
                        </span>
                      )}
                      {isItemRevision && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[9px] font-bold uppercase tracking-wider">
                          Ajustes Solicitados
                        </span>
                      )}
                    </div>

                    {plan.briefing && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {plan.briefing}
                      </p>
                    )}

                    <span className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1.5">
                      <Clock size={10} /> Criado em {new Date(plan.created_at).toLocaleDateString('pt-BR')} às {new Date(plan.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-gray-50 border border-gray-200 text-gray-700 hover:text-[var(--color-atelier-terracota)] hover:border-[var(--color-atelier-terracota)] rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                    >
                      <Download size={13} /> Visualizar PDF
                    </a>
                  )}

                  {!isItemApproved && !isItemAwaiting && (
                    <button
                      onClick={() => handleApproveAndSendToClient(plan.id)}
                      disabled={isSendingToClient}
                      className="px-4 py-2 bg-[var(--color-atelier-terracota)] text-white hover:brightness-110 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {isSendingToClient ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Enviar ao Cliente
                    </button>
                  )}

                  {isItemRevision && (
                    <button
                      onClick={() => handleApproveAndSendToClient(plan.id)}
                      disabled={isSendingToClient}
                      className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {isSendingToClient ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      Reenviar ao Cliente
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
