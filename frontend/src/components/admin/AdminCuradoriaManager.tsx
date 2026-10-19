"use client";
import React, { useState, useEffect } from "react";
import { 
  Sparkles, UploadCloud, Plus, X, Loader2, Eye, Trash2, 
  CheckCircle2, Send, Star, Image as ImageIcon, ShieldCheck, ChevronDown, ChevronUp
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { NotificationEngine } from "../../lib/NotificationEngine";
import { normalizeImageUrl } from "../../lib/imageUtils";

interface AdminCuradoriaManagerProps {
  projectId: string;
  taskId?: string;
  currentUser?: any;
  onTaskUpdate?: () => void;
}

export function AdminCuradoriaManager({ projectId, taskId, currentUser, onTaskUpdate }: AdminCuradoriaManagerProps) {
  const [directions, setDirections] = useState<any[]>([]);
  const [clientMoodboard, setClientMoodboard] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingToClient, setIsSendingToClient] = useState(false);
  const [projectClientId, setProjectClientId] = useState<string | null>(null);
  const [showClientMoodboard, setShowClientMoodboard] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const fetchCuradoriaData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      // 1. Fetch directions, client moodboard and project client_id
      const [directionsRes, strategicRes, projectRes] = await Promise.all([
        supabase
          .from("design_directions")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: true }),
        supabase
          .from("strategic_answers")
          .select("moodboard_urls")
          .eq("project_id", projectId)
          .maybeSingle(),
        supabase
          .from("projects")
          .select("client_id")
          .eq("id", projectId)
          .maybeSingle()
      ]);

      if (directionsRes.data) setDirections(directionsRes.data);
      if (strategicRes.data?.moodboard_urls) {
        setClientMoodboard(strategicRes.data.moodboard_urls);
      }
      if (projectRes.data?.client_id) {
        setProjectClientId(projectRes.data.client_id);
      }
    } catch (e) {
      console.error("[AdminCuradoriaManager] Erro ao carregar curadoria:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCuradoriaData();
  }, [projectId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newPreviews = selectedFiles.map(f => URL.createObjectURL(f));
      setFiles(prev => [...prev, ...selectedFiles]);
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFileToStorage = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = `${projectId}/${fileName}`;
    
    // Try 'moodboard' bucket first, fallback to 'references'
    let { data, error } = await supabase.storage.from('moodboard').upload(filePath, file);
    if (error) {
      const fallback = await supabase.storage.from('references').upload(filePath, file);
      if (fallback.error) throw fallback.error;
      const { data: pubData } = supabase.storage.from('references').getPublicUrl(filePath);
      return pubData.publicUrl;
    }
    const { data: pubData } = supabase.storage.from('moodboard').getPublicUrl(filePath);
    return pubData.publicUrl;
  };

  const handleCreateDirection = async () => {
    if (!title.trim() || files.length === 0) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Preencha o título e selecione pelo menos uma imagem.' }));
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadPromises = files.map(uploadFileToStorage);
      const uploadedUrls = await Promise.all(uploadPromises);

      const payload = {
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        image_url: uploadedUrls[0],
        image_urls: uploadedUrls,
        status: 'draft',
        score: 0,
        feedback: ''
      };

      const { data, error } = await supabase.from('design_directions').insert(payload).select().single();
      if (error) throw error;

      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Direção visual adicionada com sucesso!' }));
      setTitle("");
      setDescription("");
      setFiles([]);
      setPreviews([]);
      setIsCreating(false);
      fetchCuradoriaData();
    } catch (e: any) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao salvar direção visual: ' + (e?.message || '') }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDirection = async (id: string) => {
    if (!window.confirm("Deseja remover esta direção de curadoria?")) return;
    try {
      await supabase.from('design_directions').delete().eq('id', id);
      setDirections(prev => prev.filter(d => d.id !== id));
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Direção removida.' }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao remover direção.' }));
    }
  };

  const handleApproveAndSendToClient = async () => {
    if (directions.length === 0) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Adicione pelo menos uma direção de curadoria antes de enviar.' }));
      return;
    }

    setIsSendingToClient(true);
    try {
      // 1. Atualizar status de todas as direções para pending_client
      await supabase
        .from('design_directions')
        .update({ status: 'pending_client' })
        .eq('project_id', projectId);

      // 2. Se houver taskId, avança a tarefa para pending_client_approval
      if (taskId) {
        await supabase
          .from('tasks')
          .update({ 
            status: 'pending_client_approval',
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId);
      }

      // 3. Notificar o cliente
      if (projectClientId) {
        await NotificationEngine.notifyUser(
          projectClientId,
          "🎨 Curadoria Visual Disponível",
          "A equipe do Studio Veronna finalizou a Curadoria Visual da sua marca. Acesse para visualizar e avaliar as referências!",
          "action",
          "/referencias"
        );
      }

      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Curadoria aprovada internamente e enviada ao cliente com sucesso!' }));
      onTaskUpdate?.();
      fetchCuradoriaData();
    } catch (e: any) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao enviar para o cliente.' }));
    } finally {
      setIsSendingToClient(false);
    }
  };

  const isPendingClient = directions.some(d => d.status === 'pending_client');
  const isEvaluated = directions.some(d => (d.score && d.score > 0) || (d.feedback && d.feedback.trim()));

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* HEADER DA CURADORIA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
        <div>
          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
            <Sparkles size={20} className="text-[var(--color-atelier-terracota)]" /> Curadoria Visual da Marca
          </h3>
          <p className="font-roboto text-[11px] text-gray-500 uppercase tracking-widest mt-0.5">
            Etapa de Alinhamento Estético e Referências Criativas
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isEvaluated ? (
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-emerald-200">
              <CheckCircle2 size={12} /> Avaliada pelo Cliente
            </span>
          ) : isPendingClient ? (
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-amber-200 animate-pulse">
              <Eye size={12} /> Aguardando Cliente
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-gray-200">
              <ShieldCheck size={12} /> Rascunho Interno
            </span>
          )}

          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-3 py-1.5 bg-[var(--color-atelier-terracota)] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#234E80] transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={13} /> Nova Direção
            </button>
          )}
        </div>
      </div>

      {/* ACCORDION: MOODBOARD INICIAL DO CLIENTE (SE HOUVER) */}
      {clientMoodboard.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-[#faf9f8] overflow-hidden">
          <button
            onClick={() => setShowClientMoodboard(!showClientMoodboard)}
            className="w-full p-4 flex justify-between items-center text-left hover:bg-gray-100/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ImageIcon size={16} className="text-gray-400" />
              <span className="font-roboto text-xs font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]">
                Referências Iniciais Enviadas pelo Cliente ({clientMoodboard.length})
              </span>
            </div>
            {showClientMoodboard ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>
          {showClientMoodboard && (
            <div className="p-4 pt-0 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {clientMoodboard.map((url, i) => (
                <a
                  key={i}
                  href={normalizeImageUrl(url)}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 relative group"
                >
                  <img src={normalizeImageUrl(url)} alt={`Referência ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Eye size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FORMULÁRIO DE NOVA DIREÇÃO VISUAL */}
      {isCreating && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[var(--color-atelier-terracota)]/30 shadow-md flex flex-col gap-4 animate-[fadeInUp_0.2s_ease-out]">
          <div className="flex justify-between items-center">
            <h4 className="font-roboto text-xs font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-2">
              <Sparkles size={14} /> Adicionar Nova Direção Criativa
            </h4>
            <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Título da Direção (Ex: Caminho 1 - Minimalismo Orgânico)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="p-3 text-sm rounded-xl border border-gray-200 outline-none focus:border-[var(--color-atelier-terracota)]"
            />
            <textarea
              placeholder="Conceito e notas estéticas para a curadoria..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="p-3 text-sm rounded-xl border border-gray-200 outline-none focus:border-[var(--color-atelier-terracota)] h-20 resize-none"
            />

            {/* Upload Zone */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Imagens da Direção:</span>
              <div className="flex flex-wrap gap-2">
                {previews.map((preview, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <img src={preview} alt="Prévia" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--color-atelier-terracota)] transition-colors text-gray-400 hover:text-[var(--color-atelier-terracota)]">
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <UploadCloud size={18} />
                  <span className="text-[9px] font-bold uppercase mt-1">Anexar</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateDirection}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Salvar Direção
            </button>
          </div>
        </div>
      )}

      {/* LISTAGEM DAS DIREÇÕES VISUAIS EXISTENTES */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin text-[var(--color-atelier-terracota)]" />
        </div>
      ) : directions.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center gap-3">
          <ImageIcon size={36} className="text-gray-300" />
          <div>
            <h4 className="font-elegant text-lg text-[var(--color-atelier-grafite)]">Nenhuma direção visual cadastrada</h4>
            <p className="text-xs text-gray-400 mt-1">Crie as referências visuais que serão enviadas para a aprovação do cliente.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {directions.map((dir, idx) => {
            const hasScore = dir.score && dir.score > 0;
            const hasFeedback = dir.feedback && dir.feedback.trim();
            const imageUrls = dir.image_urls || [dir.image_url];

            return (
              <div key={dir.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col group">
                <div className="relative aspect-video w-full bg-gray-100 overflow-hidden">
                  <img
                    src={normalizeImageUrl(dir.image_url || imageUrls[0])}
                    alt={dir.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteDirection(dir.id)}
                      className="p-1.5 bg-red-500 text-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Excluir Direção"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {imageUrls.length > 1 && (
                    <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[9px] font-bold">
                      +{imageUrls.length - 1} imagem(ns)
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h5 className="font-elegant text-lg text-[var(--color-atelier-grafite)] font-bold">{dir.title}</h5>
                    {dir.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{dir.description}</p>
                    )}
                  </div>

                  {/* Feedback / Score do Cliente */}
                  {(hasScore || hasFeedback) ? (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800">Avaliação do Cliente:</span>
                        {hasScore && (
                          <div className="flex items-center gap-1 text-amber-500">
                            {Array.from({ length: 5 }).map((_, s) => (
                              <Star
                                key={s}
                                size={12}
                                className={s < dir.score ? "fill-amber-400 text-amber-400" : "text-gray-300"}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      {hasFeedback && (
                        <p className="text-xs italic text-emerald-950 mt-1">"{dir.feedback}"</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                      {dir.status === 'pending_client' ? 'Enviado ao cliente' : 'Rascunho Interno'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BARRA DE APROVAÇÃO INTERNA E ENVIO AO CLIENTE */}
      {directions.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)] text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h5 className="font-roboto text-xs font-bold uppercase tracking-widest text-orange-950">
                Aprovação Interna & Liberação
              </h5>
              <p className="text-xs text-orange-800/80 mt-0.5">
                Ao aprovar internamente, a curadoria fica disponível para o cliente avaliar em Meu Espaço.
              </p>
            </div>
          </div>

          <button
            onClick={handleApproveAndSendToClient}
            disabled={isSendingToClient}
            className="w-full sm:w-auto px-6 py-3 bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSendingToClient ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {isPendingClient ? 'Reenviar ao Cliente' : 'Aprovar & Enviar ao Cliente'}
          </button>
        </div>
      )}
    </div>
  );
}
