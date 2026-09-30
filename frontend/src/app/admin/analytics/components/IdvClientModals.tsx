import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Image as ImageIcon, X, UploadCloud, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function IdvBriefingModal({ isOpen, onClose, project }: { isOpen: boolean; onClose: () => void; project: any }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && project?.id) {
      setLoading(true);
      fetch(`/api/admin/export-briefing?projectId=${project.id}`)
        .then(res => res.json())
        .then(d => {
           if (d.error) setError(d.error);
           else setData(d.data);
           setLoading(false);
        })
        .catch(e => {
           setError('Erro ao carregar o briefing');
           setLoading(false);
        });
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 md:p-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-[2rem] shadow-2xl relative z-10 w-full max-w-4xl h-full max-h-[90vh] flex flex-col overflow-hidden border border-[var(--color-atelier-grafite)]/10">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#faf9f8]">
          <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
            <FileText size={24} className="text-[var(--color-atelier-terracota)]" /> Respostas do Briefing
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-200/50 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 w-full bg-white relative p-6 overflow-y-auto custom-scrollbar">
           {loading ? (
             <div className="flex flex-col items-center justify-center h-full text-gray-400">
               <Loader2 size={32} className="animate-spin mb-2 text-[var(--color-atelier-terracota)]" />
               <p className="font-bold uppercase tracking-widest text-[11px]">Buscando respostas...</p>
             </div>
           ) : error ? (
             <div className="flex flex-col items-center justify-center h-full text-gray-400">
               <AlertCircle size={40} className="mb-2 opacity-50" />
               <p className="font-bold uppercase tracking-widest text-[12px]">{error}</p>
             </div>
           ) : data ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(data).map(([key, value]) => {
                   if (key === 'id' || key === 'created_at' || key === 'updated_at' || key === 'dados_completos' || key === 'lido' || key === 'notificado') return null;
                   return (
                     <div key={key} className="flex flex-col gap-1.5 p-4 rounded-xl bg-[#faf9f8] border border-gray-100 hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
                       <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{key.replace(/_/g, ' ')}</span>
                       <span className="text-[13px] text-[var(--color-atelier-grafite)] font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                     </div>
                   );
                })}
             </div>
           ) : null}
        </div>
      </motion.div>
    </div>
  );
}

export function IdvCuradoriaModal({ isOpen, onClose, project }: { isOpen: boolean; onClose: () => void; project: any }) {
  const [data, setData] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (isOpen && project?.id) {
      setLoading(true);
      fetch(`/api/admin/export-curadoria?projectId=${project.id}`)
        .then(res => res.json())
        .then(d => {
           setData(d.data || []);
           setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen, project]);
  
  const handleFileUpload = async () => {
    if (!files.length) return;
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `curadoria/${project.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(filePath, file);
          
        if (!uploadError) {
          const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
          uploadedUrls.push(data.publicUrl);
        }
      }
      
      // Inserir em design_directions para o cliente ver
      const { error: dbError } = await supabase.from('design_directions').insert({
        project_id: project.id,
        media_assets: uploadedUrls,
        status: 'pending_client'
      });
      
      if (dbError) throw dbError;
      
      // Concluir a tarefa de Curadoria (se existir)
      const { data: tasks } = await supabase.from('tasks').select('id, title').eq('project_id', project.id).eq('status', 'in_progress');
      if (tasks) {
        const curadoriaTask = tasks.find((t: any) => t.title.toLowerCase().includes('moodboard') || t.title.toLowerCase().includes('curadoria'));
        if (curadoriaTask) {
           await supabase.from('tasks').update({ status: 'completed' }).eq('id', curadoriaTask.id);
        }
      }
      
      alert('Referências enviadas ao cliente com sucesso! A tarefa de curadoria foi concluída.');
      setFiles([]);
      onClose();
      
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar imagens.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 md:p-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-[2rem] shadow-2xl relative z-10 w-full max-w-4xl h-full max-h-[90vh] flex flex-col overflow-hidden border border-[var(--color-atelier-grafite)]/10">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#faf9f8]">
          <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
            <ImageIcon size={24} className="text-[var(--color-atelier-terracota)]" /> Referências Visuais
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-200/50 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 w-full bg-white relative p-6 overflow-y-auto custom-scrollbar">
           {loading ? (
             <div className="flex flex-col items-center justify-center h-full text-gray-400">
               <Loader2 size={32} className="animate-spin mb-2 text-[var(--color-atelier-terracota)]" />
               <p className="font-bold uppercase tracking-widest text-[11px]">Carregando referências...</p>
             </div>
           ) : data.length > 0 ? (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.map((url, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-200 relative group">
                     <img src={url} alt="Referência" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ))}
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center gap-6">
               <div className="w-20 h-20 rounded-full bg-[#faf9f8] border border-gray-200 flex items-center justify-center text-gray-400">
                 <ImageIcon size={32} />
               </div>
               <div>
                 <h3 className="font-elegant text-xl text-[var(--color-atelier-grafite)] mb-2">O cliente ainda não selecionou as referências.</h3>
                 <p className="text-gray-500 text-sm">Você pode enviar opções de moodboards e referências diretamente para ele avaliar na plataforma.</p>
               </div>
               
               <div className="w-full bg-[#faf9f8] p-6 rounded-2xl border border-dashed border-gray-300 flex flex-col items-center gap-4">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    id="curadoria-upload" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files) {
                        setFiles(Array.from(e.target.files));
                      }
                    }} 
                  />
                  <label htmlFor="curadoria-upload" className="cursor-pointer flex flex-col items-center gap-2 text-gray-400 hover:text-[var(--color-atelier-terracota)] transition-colors">
                     <UploadCloud size={32} />
                     <span className="font-bold text-[11px] uppercase tracking-widest">Selecionar Imagens</span>
                  </label>
                  {files.length > 0 && (
                    <div className="flex flex-col items-center gap-3 w-full mt-2">
                       <span className="text-[12px] font-bold text-[var(--color-atelier-terracota)]">{files.length} arquivos selecionados</span>
                       <button 
                         onClick={handleFileUpload} 
                         disabled={isUploading}
                         className="w-full h-10 rounded-full bg-[var(--color-atelier-terracota)] text-white font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-[var(--color-atelier-terracota)]/20 disabled:opacity-50"
                       >
                         {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                         Enviar para o Cliente
                       </button>
                    </div>
                  )}
               </div>
             </div>
           )}
        </div>
      </motion.div>
    </div>
  );
}
