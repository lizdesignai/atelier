"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { X, FolderUp, Loader2, File, ExternalLink, Image as ImageIcon, Download, CheckCircle, Trash2, Calendar, Pencil } from "lucide-react";

interface ClientAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  subclientId?: string | null;
  clientName: string;
}

export default function ClientAssetsModal({ isOpen, onClose, projectId, subclientId, clientName }: ClientAssetsModalProps) {
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [subclientDetails, setSubclientDetails] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const isAdminOrManager = userRole === 'admin' || userRole === 'gestor';

  // Edit / Delete states
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setUserRole(localStorage.getItem("atelier_role"));
    }
  }, []);

  useEffect(() => {
    if (isOpen && (projectId || subclientId)) {
      fetchAssets();
      if (subclientId) {
        supabase.from('agency_subclients').select('*').eq('id', subclientId).maybeSingle()
          .then(({ data }) => setSubclientDetails(data));
      } else {
        setSubclientDetails(null);
      }
    }
  }, [isOpen, projectId, subclientId]);

  const resolveProjectId = async (projId: string | null): Promise<string | null> => {
    if (!projId) return null;
    try {
      const { data: directProject } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projId)
        .maybeSingle();

      if (directProject?.id) return directProject.id;

      const { data: clientProject } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', projId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (clientProject?.id) return clientProject.id;
    } catch (err) {
      console.warn("Erro ao validar project_id:", err);
    }
    return null;
  };

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const searchParams = new URLSearchParams();
      if (projectId) searchParams.append('projectId', projectId);
      if (subclientId) searchParams.append('subclientId', subclientId);
      
      if (projectId && !subclientId) {
        const validProjId = await resolveProjectId(projectId);
        if (validProjId) searchParams.append('validProjId', validProjId);
      }

      const res = await fetch(`/api/assets?${searchParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Erro ao buscar assets: ${res.statusText}`);
      }
      
      const data = await res.json();
      setAssets(data || []);
    } catch (err) {
      console.error("Erro ao buscar assets do cliente:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (fileName: string, type?: string) => {
    if (type === 'link') return <ExternalLink size={20} className="text-orange-500" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon size={20} className="text-blue-500" />;
    return <File size={20} className="text-gray-500" />;
  };

  const handleAddLink = async () => {
    if (!newLinkName || !newLinkUrl) return;
    setIsSavingLink(true);
    try {
      let finalUrl = newLinkUrl.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
      }

      const validProjId = await resolveProjectId(projectId);

      const { error } = await supabase.from('project_assets').insert({
        project_id: validProjId,
        subclient_id: subclientId || null,
        file_name: newLinkName,
        file_url: finalUrl,
        file_size: 'Link Externo'
      });

      if (error) throw error;
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Link adicionado ao cofre!" }));
      setNewLinkName("");
      setNewLinkUrl("");
      setIsAddingLink(false);
      fetchAssets();
    } catch (error: any) {
      console.error("❌ ERRO AO INSERIR LINK NO COFRE:", error);
      window.dispatchEvent(new CustomEvent("showToast", { detail: `Erro ao adicionar link: ${error.message || 'Falha no banco de dados'}` }));
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('vault_assets').upload(fileName, file);
      
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('vault_assets').getPublicUrl(fileName);

      const validProjId = await resolveProjectId(projectId);

      const { error: dbError } = await supabase.from('project_assets').insert({
        project_id: validProjId,
        subclient_id: subclientId || null,
        file_name: file.name,
        file_url: data.publicUrl,
        file_size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
      });

      if (dbError) throw dbError;
      
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Arquivo enviado com sucesso!" }));
      fetchAssets();
    } catch (error) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao enviar arquivo." }));
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Tem certeza que deseja remover este material do cofre?")) return;
    setDeletingAssetId(assetId);
    try {
      const { error } = await supabase.from('project_assets').delete().eq('id', assetId);
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Material removido com sucesso." }));
      fetchAssets();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: `Erro ao remover: ${err.message || 'Falha no banco'}` }));
    } finally {
      setDeletingAssetId(null);
    }
  };

  const handleStartEdit = (asset: any) => {
    setEditingAssetId(asset.id);
    setEditName(asset.file_name || "");
    setEditUrl(asset.file_url || "");
  };

  const handleSaveEdit = async () => {
    if (!editingAssetId || !editName || !editUrl) return;
    setIsSavingEdit(true);
    try {
      let finalUrl = editUrl.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
      }
      const { error } = await supabase
        .from('project_assets')
        .update({ file_name: editName, file_url: finalUrl })
        .eq('id', editingAssetId);

      if (error) throw error;
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Material atualizado!" }));
      setEditingAssetId(null);
      fetchAssets();
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: `Erro ao salvar: ${err.message || 'Falha no banco'}` }));
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }} 
            className="bg-white rounded-none md:rounded-[2.5rem] p-4 md:p-8 relative z-10 w-full h-full md:max-w-4xl md:h-auto md:max-h-[85vh] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-6 border-b border-gray-100 pb-6 shrink-0 relative">
              <div className="flex items-center gap-4 pr-10">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0">
                  <FolderUp size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-elegant text-gray-800 leading-none">Cofre de Ativos</h2>
                  <p className="text-[11px] font-bold text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest mt-1">
                    Materiais de {clientName}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="absolute right-0 top-0 text-gray-400 hover:text-red-500 bg-gray-50 p-2.5 rounded-full transition-colors w-10 h-10 md:w-9 md:h-9 flex items-center justify-center">
                  <X size={18} />
              </button>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                {isAdminOrManager && (
                  <>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                    <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingFile} className="flex-1 md:flex-none justify-center bg-[var(--color-atelier-terracota)] text-white text-[10px] uppercase font-bold tracking-widest px-4 py-3 md:py-2.5 rounded-full hover:bg-[#9b836b] transition-colors flex items-center gap-2 disabled:opacity-50">
                      {isUploadingFile ? <Loader2 size={14} className="animate-spin" /> : <FolderUp size={14} />} Add Material
                    </button>
                  </>
                )}
                {subclientDetails?.trello_url && (
                  <a 
                    href={subclientDetails.trello_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex-1 md:flex-none justify-center bg-[#0079BF] text-white text-[10px] uppercase font-bold tracking-widest px-4 py-3 md:py-2.5 rounded-full hover:bg-[#026AA7] transition-colors flex items-center gap-2"
                  >
                    <ExternalLink size={14} /> Trello
                  </a>
                )}
                {isAdminOrManager && (
                  <button onClick={() => setIsAddingLink(!isAddingLink)} className="flex-1 md:flex-none justify-center bg-[var(--color-atelier-grafite)] text-white text-[10px] uppercase font-bold tracking-widest px-4 py-3 md:py-2.5 rounded-full hover:bg-gray-700 transition-colors flex items-center gap-2">
                    <ExternalLink size={14} /> Add Link
                  </button>
                )}
              </div>
            </div>

            {/* Link Form */}
            <AnimatePresence>
              {isAddingLink && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6 shrink-0">
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col sm:flex-row items-end gap-4 shadow-sm">
                    <div className="flex-1 w-full">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 block mb-1">Título do Link</label>
                      <input type="text" placeholder="Ex: Pasta Drive, Figma, Docs" value={newLinkName} onChange={(e) => setNewLinkName(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50" />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 block mb-1">URL (Endereço)</label>
                      <input type="text" placeholder="https://..." value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-[13px] outline-none focus:border-[var(--color-atelier-terracota)]/50" />
                    </div>
                    <button onClick={handleAddLink} disabled={isSavingLink || !newLinkName || !newLinkUrl} className="w-full sm:w-auto h-11 px-6 bg-[var(--color-atelier-terracota)] text-white font-bold text-[11px] uppercase tracking-widest rounded-xl hover:bg-[#9b836b] transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center">
                      {isSavingLink ? <Loader2 size={16} className="animate-spin"/> : "Salvar Link"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col relative">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                  <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" />
                </div>
              ) : assets.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-40 py-10">
                  <FolderUp size={48} className="mb-4 text-[var(--color-atelier-terracota)]" />
                  <p className="font-elegant text-3xl">Cofre Vazio</p>
                  <p className="font-roboto text-sm mt-2">Nenhum arquivo enviado para este cliente ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                  {assets.map((asset) => {
                    const isEditing = editingAssetId === asset.id;

                    if (isEditing) {
                      return (
                        <div key={asset.id} className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200 flex flex-col gap-3 shadow-md col-span-1 md:col-span-2">
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] uppercase font-bold text-amber-800">Editar Título</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="bg-white border border-amber-200 rounded-xl p-2 text-xs font-bold text-gray-800"
                            />
                            <label className="text-[10px] uppercase font-bold text-amber-800 mt-1">Editar URL</label>
                            <input
                              type="text"
                              value={editUrl}
                              onChange={(e) => setEditUrl(e.target.value)}
                              className="bg-white border border-amber-200 rounded-xl p-2 text-xs text-gray-700"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2 mt-2">
                            <button
                              onClick={() => setEditingAssetId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-200/60"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              disabled={isSavingEdit || !editName || !editUrl}
                              className="px-4 py-1.5 rounded-lg bg-[var(--color-atelier-terracota)] text-white text-xs font-bold hover:bg-[#9b836b] disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {isSavingEdit ? <Loader2 size={12} className="animate-spin" /> : null} Salvar
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={asset.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col gap-3 group hover:border-[var(--color-atelier-terracota)]/30 transition-all hover:bg-white shadow-sm relative">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                            {getFileIcon(asset.file_name, asset.file_size === 'Link Externo' ? 'link' : 'file')}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-roboto font-bold text-[13px] text-gray-800 truncate" title={asset.file_name}>
                              {asset.file_name}
                            </span>
                            <span className="text-[10px] text-gray-400 mt-0.5">{asset.file_size === 'Link Externo' ? 'Link Externo' : (asset.file_size || 'Tamanho desconhecido')}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                          <span className="text-[9px] uppercase font-bold text-gray-400 flex items-center gap-1">
                            <Calendar size={10} /> {new Date(asset.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isAdminOrManager && (
                              <>
                                <button
                                  onClick={() => handleStartEdit(asset)}
                                  className="w-10 h-10 md:w-7 md:h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-colors"
                                  title="Editar link/material"
                                >
                                  <Pencil size={12} className="md:w-3 md:h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAsset(asset.id)}
                                  disabled={deletingAssetId === asset.id}
                                  className="w-10 h-10 md:w-7 md:h-7 rounded-full bg-gray-100 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                                  title="Apagar material"
                                >
                                  {deletingAssetId === asset.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} className="md:w-3 md:h-3" />}
                                </button>
                              </>
                            )}
                            <a 
                              href={asset.file_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="w-10 h-10 md:w-7 md:h-7 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors"
                              title={asset.file_size === 'Link Externo' ? "Acessar Link" : "Fazer Download / Ver"}
                            >
                              {asset.file_size === 'Link Externo' ? <ExternalLink size={12} className="md:w-3 md:h-3" /> : <Download size={12} className="md:w-3 md:h-3" />}
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
