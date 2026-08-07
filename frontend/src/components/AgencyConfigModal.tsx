import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trello, Search, Loader2, Save, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AgencyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: any;
  onSave?: () => void;
}

export default function AgencyConfigModal({ isOpen, onClose, agency, onSave }: AgencyConfigModalProps) {
  const [trelloUrl, setTrelloUrl] = useState('');
  const [syncListIds, setSyncListIds] = useState<string[]>([]);
  const [trelloLists, setTrelloLists] = useState<any[]>([]);
  const [isLoadingTrelloLists, setIsLoadingTrelloLists] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (agency && isOpen) {
      const url = agency.trello_url || '';
      setTrelloUrl(url);
      setSyncListIds(agency.trello_sync_list_ids || []);
      setTrelloLists([]);
      if (url) {
        fetchTrelloLists(url);
      }
    }
  }, [agency, isOpen]);

  const handleSave = async () => {
    if (!agency) return;
    setIsSubmitting(true);
    try {
      // 1. Save the Trello URL to the agency
      const { error: agencyError } = await supabase.from('agencies').update({
        trello_url: trelloUrl || null
      }).eq('id', agency.id);
      if (agencyError) throw agencyError;

      // 2. Update the subclients for this agency to listen to the selected lists.
      const { error: subError } = await supabase.from('agency_subclients').update({
        trello_sync_list_ids: syncListIds
      }).eq('agency_id', agency.id);

      if (subError) throw subError;

      // Register Trello webhook
      if (trelloUrl && syncListIds.length > 0) {
        try {
          const match = trelloUrl.match(/trello\.com\/b\/([a-zA-Z0-9]+)/);
          const boardId = match ? match[1] : null;
          if (boardId) {
            const callbackUrl = `${window.location.origin}/api/trello-webhook`;
            await fetch(`https://api.trello.com/1/webhooks/?key=${process.env.NEXT_PUBLIC_TRELLO_API_KEY}&token=${process.env.NEXT_PUBLIC_TRELLO_TOKEN}&callbackURL=${encodeURIComponent(callbackUrl)}&idModel=${boardId}`, {
              method: 'POST'
            }).catch(e => console.log('Trello webhook sync warning:', e));
          }
        } catch (e) {
          console.log("Erro ao registrar webhook no Trello", e);
        }
      }

      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Configuração salva com sucesso!' }));
      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error(error);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao salvar configuração.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchTrelloLists = async (urlToFetch?: string) => {
    const url = urlToFetch || trelloUrl;
    if (!url) return;
    setIsLoadingTrelloLists(true);
    try {
      const match = url.match(/trello\.com\/b\/([a-zA-Z0-9]+)/);
      const boardId = match ? match[1] : null;
      if (!boardId) throw new Error("URL inválida");
      const res = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${process.env.NEXT_PUBLIC_TRELLO_API_KEY}&token=${process.env.NEXT_PUBLIC_TRELLO_TOKEN}`);
      if (!res.ok) throw new Error("Erro na API Trello");
      const lists = await res.json();
      setTrelloLists(lists);
    } catch (err) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Falha ao buscar listas. Verifique o URL.' }));
    } finally {
      setIsLoadingTrelloLists(false);
    }
  };

  if (!isOpen || !agency) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        
        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
          
          <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-blue-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[1rem] bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                <Trello size={24} />
              </div>
              <div>
                <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none mb-1">Configuração.</h2>
                <span className="font-roboto font-bold text-[9px] uppercase tracking-[0.2em] text-[var(--color-atelier-grafite)]/50">{agency.name}</span>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-[var(--color-atelier-terracota)] transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 ml-1 flex items-center gap-1.5">
                <Trello size={12}/> Link do Quadro Trello (Agência)
              </span>
              <div className="flex gap-2 w-full">
                <input 
                  type="url" 
                  placeholder="https://trello.com/b/..." 
                  value={trelloUrl} 
                  onChange={(e) => setTrelloUrl(e.target.value)} 
                  className="flex-1 bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-[#0079BF] focus:bg-[#0079BF]/5 text-[#0079BF] font-medium transition-colors placeholder:text-gray-400" 
                />
                {trelloUrl && (
                  <button onClick={() => window.open(trelloUrl, '_blank')} className="px-4 bg-blue-50 text-blue-600 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-blue-100 transition-colors shrink-0 flex items-center justify-center">
                    Ver Quadro
                  </button>
                )}
              </div>
            </div>

            {trelloUrl && (
              <div className="flex flex-col gap-3 mt-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="font-roboto text-[10px] font-bold text-[var(--color-atelier-grafite)] uppercase tracking-widest">Listas Monitoradas</span>
                  <button 
                    onClick={() => fetchTrelloLists()}
                    className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-white shadow-sm border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-50 flex items-center gap-2"
                    type="button"
                  >
                    {isLoadingTrelloLists ? <Loader2 size={12} className="animate-spin"/> : <Search size={12}/>}
                    Buscar Listas
                  </button>
                </div>

                {trelloLists.length > 0 && (
                  <div className="flex flex-col gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2 mt-2">
                    {trelloLists.map((list: any) => {
                      const isSelected = syncListIds.includes(list.id);
                      return (
                        <label key={list.id} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isSelected}
                            onChange={(e) => {
                              const updated = e.target.checked 
                                ? [...syncListIds, list.id]
                                : syncListIds.filter(id => id !== list.id);
                              setSyncListIds(updated);
                            }}
                          />
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 border border-gray-300'}`}>
                            {isSelected && <Check size={12} />}
                          </div>
                          <span className={`text-[12px] font-medium truncate ${isSelected ? 'text-blue-900 font-bold' : 'text-gray-700'}`}>{list.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 flex justify-end">
             <button 
               onClick={handleSave}
               disabled={isSubmitting}
               className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold text-[11px] uppercase tracking-widest rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50 hover:-translate-y-0.5"
             >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar Configurações
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
