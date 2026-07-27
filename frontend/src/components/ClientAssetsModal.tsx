import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { X, FolderUp, Loader2, File, ExternalLink, Image as ImageIcon, Download, CheckCircle, Trash2, Calendar } from "lucide-react";

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

  useEffect(() => {
    setMounted(true);
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

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('project_assets').select('*').order('created_at', { ascending: false });
      
      if (subclientId) {
        query = query.eq('subclient_id', subclientId);
      } else if (projectId) {
        query = query.eq('project_id', projectId).is('subclient_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
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

      const { error } = await supabase.from('project_assets').insert({
        project_id: projectId || null,
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

      const { error: dbError } = await supabase.from('project_assets').insert({
        project_id: projectId || null,
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
            className="bg-white rounded-[2.5rem] p-8 relative z-10 w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-6 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center">
                  <FolderUp size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-elegant text-gray-800 leading-none">Cofre de Ativos</h2>
                  <p className="text-[11px] font-bold text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest mt-1">
                    Materiais de {clientName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingFile} className="bg-[var(--color-atelier-terracota)] text-white text-[10px] uppercase font-bold tracking-widest px-4 py-2.5 rounded-full hover:bg-[#9b836b] transition-colors flex items-center gap-2 disabled:opacity-50">
                  {isUploadingFile ? <Loader2 size={14} className="animate-spin" /> : <FolderUp size={14} />} Adicionar Material
                </button>
                {subclientDetails?.trello_url && (
                  <a 
                    href={subclientDetails.trello_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="bg-[#0079BF] text-white text-[10px] uppercase font-bold tracking-widest px-4 py-2.5 rounded-full hover:bg-[#026AA7] transition-colors flex items-center gap-2"
                  >
                    <ExternalLink size={14} /> Trello do Subcliente
                  </a>
                )}
                <button onClick={() => setIsAddingLink(!isAddingLink)} className="bg-[var(--color-atelier-grafite)] text-white text-[10px] uppercase font-bold tracking-widest px-4 py-2.5 rounded-full hover:bg-gray-700 transition-colors flex items-center gap-2">
                  <ExternalLink size={14} /> Adicionar Link
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-red-500 bg-gray-50 p-2.5 rounded-full transition-colors">
                  <X size={18} />
                </button>
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
                  {assets.map((asset) => (
                    <div key={asset.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col gap-3 group hover:border-[var(--color-atelier-terracota)]/30 transition-all hover:bg-white shadow-sm">
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
                        <a 
                          href={asset.file_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors"
                          title={asset.file_size === 'Link Externo' ? "Acessar Link" : "Fazer Download / Ver"}
                        >
                          {asset.file_size === 'Link Externo' ? <ExternalLink size={14} /> : <Download size={14} />}
                        </a>
                      </div>
                    </div>
                  ))}
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
