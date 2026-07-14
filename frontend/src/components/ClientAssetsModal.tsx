import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && (projectId || subclientId)) {
      fetchAssets();
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

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon size={20} className="text-blue-500" />;
    return <File size={20} className="text-gray-500" />;
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
              <button onClick={onClose} className="text-gray-400 hover:text-red-500 bg-gray-50 p-2.5 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

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
                          {getFileIcon(asset.file_name)}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-roboto font-bold text-[13px] text-gray-800 truncate" title={asset.file_name}>
                            {asset.file_name}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5">{asset.file_size || 'Tamanho desconhecido'}</span>
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
                          title="Fazer Download / Ver"
                        >
                          <Download size={14} />
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
