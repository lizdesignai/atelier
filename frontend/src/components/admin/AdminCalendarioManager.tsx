"use client";
import React, { useState, useEffect } from "react";
import { 
  CalendarDays, UploadCloud, FileText, CheckCircle2, 
  Send, Loader2, Download, Eye, ShieldCheck, Plus, X 
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { NotificationEngine } from "../../lib/NotificationEngine";

interface AdminCalendarioManagerProps {
  projectId: string;
  taskId?: string;
  currentUser?: any;
  onTaskUpdate?: () => void;
}

export function AdminCalendarioManager({ projectId, taskId, currentUser, onTaskUpdate }: AdminCalendarioManagerProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [taskData, setTaskData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSendingToClient, setIsSendingToClient] = useState(false);
  const [projectClientId, setProjectClientId] = useState<string | null>(null);

  // New Deliverable Form
  const [isAdding, setIsAdding] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [notes, setNotes] = useState("");

  const fetchCalendarData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const [plansRes, projectRes, taskRes] = await Promise.all([
        supabase
          .from("content_planning")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        supabase
          .from("projects")
          .select("client_id")
          .eq("id", projectId)
          .maybeSingle(),
        taskId
          ? supabase.from("tasks").select("*").eq("id", taskId).maybeSingle()
          : Promise.resolve({ data: null })
      ]);

      if (plansRes.data) setPlans(plansRes.data);
      if (projectRes.data?.client_id) setProjectClientId(projectRes.data.client_id);
      if (taskRes.data) setTaskData(taskRes.data);
    } catch (e) {
      console.error("[AdminCalendarioManager] Erro ao carregar calendário:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [projectId, taskId]);

  const handleFileUpload = async () => {
    if (!selectedFile) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Selecione um arquivo de calendário.' }));
      return;
    }

    setIsUploading(true);
    try {
      const ext = selectedFile.name.split('.').pop() || 'pdf';
      const fileName = `calendario_${Date.now()}.${ext}`;
      const filePath = `calendarios/${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('references').upload(filePath, selectedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('references').getPublicUrl(filePath);

      // Save to content_planning
      const payload = {
        project_id: projectId,
        strategic_hook: docTitle || `Calendário Editorial - ${new Date().toLocaleDateString('pt-BR')}`,
        caption_draft: notes || null,
        status: 'pending',
        media_assets: [{ url: publicUrl, type: ext === 'pdf' ? 'pdf' : 'image', name: selectedFile.name }]
      };

      await supabase.from('content_planning').insert(payload);

      // Also attach to task if taskId exists
      if (taskId && taskData) {
        const existingAssets = taskData.media_assets || [];
        await supabase.from('tasks').update({
          media_assets: [...existingAssets, { url: publicUrl, type: ext === 'pdf' ? 'pdf' : 'image', name: selectedFile.name }]
        }).eq('id', taskId);
      }

      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Entregável de calendário anexado com sucesso!' }));
      setSelectedFile(null);
      setDocTitle("");
      setNotes("");
      setIsAdding(false);
      fetchCalendarData();
    } catch (e: any) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao anexar arquivo: ' + (e?.message || '') }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleApproveAndSendToClient = async () => {
    setIsSendingToClient(true);
    try {
      // 1. Atualizar content_planning para awaiting_approval
      await supabase
        .from('content_planning')
        .update({ status: 'awaiting_approval' })
        .eq('project_id', projectId);

      // 2. Atualizar status da tarefa para pending_client_approval
      if (taskId) {
        await supabase
          .from('tasks')
          .update({ 
            status: 'pending_client_approval',
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId);
      }

      // 3. Notificar cliente
      if (projectClientId) {
        await NotificationEngine.notifyUser(
          projectClientId,
          "📅 Calendário Editorial Pronto",
          "O Calendário Editorial de Conteúdos foi aprovado internamente e aguarda sua validação no Cockpit.",
          "action",
          "/cockpit"
        );
      }

      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Calendário aprovado internamente e enviado para o cliente!' }));
      onTaskUpdate?.();
      fetchCalendarData();
    } catch (e: any) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao enviar calendário ao cliente.' }));
    } finally {
      setIsSendingToClient(false);
    }
  };

  const latestPlan = plans[0];
  const isAwaitingClient = latestPlan?.status === 'awaiting_approval' || taskData?.status === 'pending_client_approval';
  const isApproved = latestPlan?.status === 'approved' || taskData?.status === 'completed';

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* HEADER DO CALENDÁRIO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
        <div>
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
            <CalendarDays size={20} className="text-[var(--color-atelier-terracota)]" /> Calendário Editorial de Conteúdos
          </h3>
          <p className="font-roboto text-[11px] text-gray-500 uppercase tracking-widest mt-0.5">
            Gestão Estratégica de Pautas, Cronogramas e Publicações
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isApproved ? (
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-emerald-200">
              <CheckCircle2 size={12} /> Aprovado pelo Cliente
            </span>
          ) : isAwaitingClient ? (
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-amber-200 animate-pulse">
              <Eye size={12} /> Aguardando Cliente
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-gray-200">
              <ShieldCheck size={12} /> Rascunho Interno
            </span>
          )}

          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-3 py-1.5 bg-[var(--color-atelier-terracota)] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#234E80] transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={13} /> Anexar Calendário
            </button>
          )}
        </div>
      </div>

      {/* FORMULÁRIO DE ANEXO DE CALENDÁRIO */}
      {isAdding && (
        <div className="p-5 rounded-2xl bg-white border border-[var(--color-atelier-terracota)]/30 shadow-md flex flex-col gap-4 animate-[fadeInUp_0.2s_ease-out]">
          <div className="flex justify-between items-center">
            <h4 className="font-roboto text-xs font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-2">
              <CalendarDays size={14} /> Novo Entregável de Calendário Editorial
            </h4>
            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Título do Calendário (Ex: Calendário Editorial Ciclo 1 - Março)"
              value={docTitle}
              onChange={e => setDocTitle(e.target.value)}
              className="p-3 text-sm rounded-xl border border-gray-200 outline-none focus:border-[var(--color-atelier-terracota)]"
            />
            <textarea
              placeholder="Diretrizes e notas para o cliente avaliar..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="p-3 text-sm rounded-xl border border-gray-200 outline-none focus:border-[var(--color-atelier-terracota)] h-20 resize-none"
            />

            <div className="p-4 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 bg-gray-50 text-gray-500">
              {selectedFile ? (
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-atelier-grafite)]">
                  <FileText size={20} className="text-[var(--color-atelier-terracota)]" />
                  <span>{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  <button onClick={() => setSelectedFile(null)} className="text-red-500 ml-2 hover:underline text-xs">Trocar</button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-1.5 hover:text-[var(--color-atelier-terracota)] transition-colors">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
                    }}
                  />
                  <UploadCloud size={24} />
                  <span className="text-xs font-bold uppercase tracking-wider">Selecionar Documento PDF ou Imagem</span>
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleFileUpload}
              disabled={isUploading || !selectedFile}
              className="px-5 py-2 rounded-xl bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              Salvar Entregável
            </button>
          </div>
        </div>
      )}

      {/* LISTA DE ENTREGÁVEIS / DOCUMENTOS DE CALENDÁRIO */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin text-[var(--color-atelier-terracota)]" />
        </div>
      ) : plans.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center gap-3">
          <CalendarDays size={36} className="text-gray-300" />
          <div>
            <h4 className="font-elegant text-lg text-[var(--color-atelier-grafite)]">Nenhum calendário anexado</h4>
            <p className="text-xs text-gray-400 mt-1">Anexe o PDF ou documento de cronograma editorial para revisão interna e aprovação do cliente.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan, i) => {
            const assets = plan.media_assets || [];
            return (
              <div key={plan.id || i} className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h5 className="font-elegant text-base text-[var(--color-atelier-grafite)] font-bold">
                      {plan.strategic_hook || "Calendário Editorial"}
                    </h5>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                      {new Date(plan.created_at).toLocaleDateString('pt-BR')} • {plan.status === 'awaiting_approval' ? 'Enviado ao Cliente' : plan.status === 'approved' ? 'Aprovado' : 'Rascunho Interno'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {assets[0]?.url && (
                    <a
                      href={assets[0].url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                    >
                      <Eye size={13} /> Visualizar
                    </a>
                  )}
                  {assets[0]?.url && (
                    <a
                      href={assets[0].url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-gray-200 flex items-center gap-1.5 transition-colors"
                    >
                      <Download size={13} /> Baixar
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BARRA DE APROVAÇÃO INTERNA E ENVIO AO CLIENTE */}
      {plans.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)] text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h5 className="font-roboto text-xs font-bold uppercase tracking-widest text-orange-950">
                Aprovação Interna & Envio ao Cliente
              </h5>
              <p className="text-xs text-orange-800/80 mt-0.5">
                Ao aprovar o calendário, ele é liberado para o cliente revisar e validar no Cockpit.
              </p>
            </div>
          </div>

          <button
            onClick={handleApproveAndSendToClient}
            disabled={isSendingToClient}
            className="w-full sm:w-auto px-6 py-3 bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSendingToClient ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {isAwaitingClient ? 'Reenviar Calendário' : 'Aprovar & Enviar Calendário'}
          </button>
        </div>
      )}
    </div>
  );
}
