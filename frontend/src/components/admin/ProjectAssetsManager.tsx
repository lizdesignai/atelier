"use client";
import React, { useState, useEffect } from "react";
import { Plus, X, Link as LinkIcon, Trash2, ExternalLink, Loader2, PackageOpen } from "lucide-react";
import { supabase } from "../../lib/supabase";

export function ProjectAssetsManager({ projectId }: { projectId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen]);

  const fetchAssets = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('project_assets').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
    setAssets(data || []);
    setIsLoading(false);
  };

  const handleAddLink = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setIsAdding(true);
    
    // Auto-fix URL scheme
    let finalUrl = newUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    const { data, error } = await supabase.from('project_assets').insert({
      project_id: projectId,
      file_name: newName.trim(),
      file_url: finalUrl,
      file_size: 'Link Externo'
    }).select().single();

    if (!error && data) {
      setAssets([data, ...assets]);
      setNewName("");
      setNewUrl("");
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Link adicionado com sucesso!' }));
    }
    setIsAdding(false);
  };

  const handleRemove = async (id: string) => {
    const confirm = window.confirm("Remover este link?");
    if (!confirm) return;
    await supabase.from('project_assets').delete().eq('id', id);
    setAssets(assets.filter(a => a.id !== id));
    window.dispatchEvent(new CustomEvent('showToast', { detail: 'Link removido.' }));
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="glass-panel p-6 rounded-[2rem] bg-white/40 flex flex-col items-center justify-center text-center gap-4 border border-white shadow-sm hover:shadow-md hover:bg-white/80 transition-all group"
      >
        <div className="w-16 h-16 rounded-full bg-[var(--color-atelier-rose)] flex items-center justify-center text-[var(--color-atelier-terracota)] group-hover:scale-110 transition-transform">
          <PackageOpen size={24} />
        </div>
        <div>
          <h4 className="font-elegant text-xl text-[var(--color-atelier-grafite)]">Materiais Finais</h4>
          <p className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest font-bold mt-1">Gerenciar Links de Entrega</p>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" onClick={() => setIsOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-[#F0EBE1] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white">
            
            <div className="p-8 border-b border-[var(--color-atelier-grafite)]/10 bg-white/60 flex justify-between items-start">
              <div>
                <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
                  <PackageOpen className="text-[var(--color-atelier-terracota)]" /> Materiais Finais
                </h3>
                <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest font-bold mt-2">
                  Links disponibilizados para o cliente
                </p>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-red-500 shadow-sm transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 flex flex-col gap-6">
              
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 mb-2 block">Nome do Link</label>
                  <input type="text" placeholder="Ex: Apresentação Final (PDF)" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-transparent focus:border-[var(--color-atelier-terracota)]/30 text-[13px] outline-none shadow-sm" />
                </div>
                <div className="flex-1">
                  <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 mb-2 block">URL de Destino</label>
                  <input type="url" placeholder="https://" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-transparent focus:border-[var(--color-atelier-terracota)]/30 text-[13px] outline-none shadow-sm" />
                </div>
                <button onClick={handleAddLink} disabled={isAdding || !newName || !newUrl} className="h-[46px] px-6 bg-[var(--color-atelier-grafite)] text-white font-bold text-[11px] uppercase tracking-widest rounded-xl hover:bg-[var(--color-atelier-terracota)] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shrink-0">
                  {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Adicionar
                </button>
              </div>

              <div className="w-full h-px bg-gradient-to-r from-transparent via-[var(--color-atelier-grafite)]/10 to-transparent my-2"></div>

              <div className="flex flex-col gap-3 min-h-[200px] max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center opacity-50"><Loader2 className="animate-spin" /></div>
                ) : assets.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-30 text-[var(--color-atelier-grafite)] font-roboto text-[11px] font-bold uppercase tracking-widest">
                    <LinkIcon size={32} /> Nenhum link cadastrado
                  </div>
                ) : (
                  assets.map(asset => (
                    <div key={asset.id} className="bg-white/60 p-4 rounded-2xl flex items-center justify-between border border-white shadow-sm hover:bg-white transition-colors group">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0">
                          <LinkIcon size={16} />
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] truncate">{asset.file_name}</span>
                          <a href={asset.file_url} target="_blank" rel="noreferrer" className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] flex items-center gap-1 truncate mt-0.5 transition-colors">
                            Acessar Link <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                      <button onClick={() => handleRemove(asset.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-atelier-grafite)]/30 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
