"use client";
import React, { useState, useEffect } from "react";
import { Loader2, Plus, X, UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";
import { getAdminTerritoryEvaluationsAction, createTerritoryEvaluationAction, approveTerritoryEvaluationAction } from "../../app/actions/territory";
import { supabase } from "../../lib/supabase";

export function AdminTerritoriesManager({ projectId, taskId, currentUser }: { projectId: string, taskId?: string, currentUser?: any }) {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState(currentUser?.role || 'admin');

  // Form state
  const [territoryA, setTerritoryA] = useState({ name: "", concept: "", description: "", files: [] as File[], previews: [] as string[] });
  const [territoryB, setTerritoryB] = useState({ name: "", concept: "", description: "", files: [] as File[], previews: [] as string[] });

  useEffect(() => {
    if (!currentUser) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          supabase.from('profiles').select('role').eq('id', data.user.id).single().then(res => {
            if (res.data) setUserRole(res.data.role);
          });
        }
      });
    }
  }, [currentUser]);

  const fetchEvaluations = async () => {
    setIsLoading(true);
    try {
      const data = await getAdminTerritoryEvaluationsAction(projectId);
      setEvaluations(data || []);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (projectId) fetchEvaluations();
  }, [projectId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isA: boolean) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const previews = files.map(f => URL.createObjectURL(f));
      if (isA) {
        setTerritoryA(prev => ({ ...prev, files: [...prev.files, ...files], previews: [...prev.previews, ...previews] }));
      } else {
        setTerritoryB(prev => ({ ...prev, files: [...prev.files, ...files], previews: [...prev.previews, ...previews] }));
      }
    }
  };

  const removeImage = (index: number, isA: boolean) => {
    if (isA) {
      const newFiles = [...territoryA.files];
      newFiles.splice(index, 1);
      const newPreviews = [...territoryA.previews];
      newPreviews.splice(index, 1);
      setTerritoryA(prev => ({ ...prev, files: newFiles, previews: newPreviews }));
    } else {
      const newFiles = [...territoryB.files];
      newFiles.splice(index, 1);
      const newPreviews = [...territoryB.previews];
      newPreviews.splice(index, 1);
      setTerritoryB(prev => ({ ...prev, files: newFiles, previews: newPreviews }));
    }
  };

  const uploadToSupabase = async (file: File) => {
    const ext = file.name.split('.').pop();
    const fileName = `${Math.random()}.${ext}`;
    const filePath = `${projectId}/${fileName}`;
    const { data, error } = await supabase.storage.from('references').upload(filePath, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('references').getPublicUrl(filePath);
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!territoryA.name || !territoryB.name) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Preencha os nomes dos territórios.' }));
      return;
    }
    setIsSubmitting(true);
    try {
      // Upload images for A
      const imagesA = [];
      for (const file of territoryA.files) {
        const url = await uploadToSupabase(file);
        imagesA.push(url);
      }

      // Upload images for B
      const imagesB = [];
      for (const file of territoryB.files) {
        const url = await uploadToSupabase(file);
        imagesB.push(url);
      }

      const territoriesPayload = [
        { id: "t1", name: territoryA.name, concept: territoryA.concept, description: territoryA.description, images: imagesA },
        { id: "t2", name: territoryB.name, concept: territoryB.concept, description: territoryB.description, images: imagesB }
      ];

      await createTerritoryEvaluationAction(projectId, territoriesPayload, taskId);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Territórios enviados com sucesso!' }));
      setIsCreating(false);
      setTerritoryA({ name: "", concept: "", description: "", files: [], previews: [] });
      setTerritoryB({ name: "", concept: "", description: "", files: [], previews: [] });
      fetchEvaluations();
    } catch (e) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao criar territórios.' }));
    }
    setIsSubmitting(false);
  };

  const handleApprove = async (evalId: string) => {
    try {
      await approveTerritoryEvaluationAction(evalId);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Aprovado! Visível para o cliente.' }));
      fetchEvaluations();
    } catch (e) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao aprovar.' }));
    }
  };

  const renderTerritoryForm = (t: any, setT: any, isA: boolean, letter: string) => (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-2xl border border-[var(--color-atelier-grafite)]/10 shadow-sm">
      <h4 className="font-elegant text-xl text-[var(--color-atelier-terracota)]">Caminho {letter}</h4>
      <input type="text" placeholder={`Ex: Caminho ${letter}: Elegância Atemporal`} value={t.name} onChange={e => setT({...t, name: e.target.value})} className="p-3 text-sm rounded-xl border outline-none focus:border-[var(--color-atelier-terracota)]/50" />
      <input type="text" placeholder="Conceito breve" value={t.concept} onChange={e => setT({...t, concept: e.target.value})} className="p-3 text-sm rounded-xl border outline-none focus:border-[var(--color-atelier-terracota)]/50" />
      <textarea placeholder="Atmosfera e descrição" value={t.description} onChange={e => setT({...t, description: e.target.value})} className="p-3 text-sm rounded-xl border outline-none focus:border-[var(--color-atelier-terracota)]/50 h-24 resize-none" />
      
      <div className="flex flex-wrap gap-2">
        {t.previews.map((preview: string, i: number) => (
          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border">
            <img src={preview} className="w-full h-full object-cover" />
            <button onClick={() => removeImage(i, isA)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X size={12} /></button>
          </div>
        ))}
        <label className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-[var(--color-atelier-terracota)]/50 transition-colors">
          <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, isA)} />
          <Plus size={20} className="text-[var(--color-atelier-grafite)]/30" />
        </label>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Territórios Visuais (Direcionar)</h3>
        {!isCreating && (
          <button onClick={() => setIsCreating(true)} className="px-4 py-2 bg-[var(--color-atelier-terracota)] text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#8C5934] transition-colors flex items-center gap-2">
            <Plus size={14} /> Novo Envio
          </button>
        )}
      </div>

      {isCreating && (
        <div className="glass-panel p-6 rounded-3xl bg-white/50 border border-white flex flex-col gap-6 animate-[fadeInUp_0.3s_ease-out]">
          <div className="flex justify-between items-center">
            <h4 className="font-roboto text-sm font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Criar Novos Caminhos</h4>
            <button onClick={() => setIsCreating(false)} className="text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-grafite)]"><X size={20} /></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderTerritoryForm(territoryA, setTerritoryA, true, 'A')}
            {renderTerritoryForm(territoryB, setTerritoryB, false, 'B')}
          </div>

          <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-4 bg-[var(--color-atelier-grafite)] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[var(--color-atelier-terracota)] transition-colors flex justify-center gap-2">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            Enviar Territórios
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--color-atelier-terracota)]/50" /></div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-atelier-grafite)]/50 text-sm">Nenhum território enviado para este projeto ainda.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {evaluations.map((ev, idx) => {
            const isEvaluated = ev.status === 'evaluated' || ev.status === 'approved';
            const chosen = isEvaluated ? ev.territories.find((t: any) => t.id === ev.chosen_territory_id) : null;

            return (
              <div key={ev.id} className="glass-panel bg-white p-6 rounded-2xl border border-[var(--color-atelier-grafite)]/10 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50 tracking-widest">Enviado em {new Date(ev.created_at).toLocaleDateString('pt-BR')}</span>
                    {ev.task_id && <span className="ml-2 text-[10px] uppercase font-bold text-blue-400 tracking-widest">Originado via Focus</span>}
                  </div>
                  {ev.status === 'draft' ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold uppercase tracking-widest">Aguardando Aprovação Interna</span>
                      {(currentUser?.role === 'admin' || currentUser?.role === 'gestor') && (
                        <button onClick={() => handleApprove(ev.id)} className="px-3 py-1 bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-green-600 transition-colors">Aprovar e Liberar</button>
                      )}
                    </div>
                  ) : ev.status === 'pending' ? (
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-widest">Aguardando Cliente</span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12}/> Respondido</span>
                  )}
                </div>

                {isEvaluated && chosen && (
                  <div className="mt-4 p-4 bg-[#F0EBE1]/50 rounded-xl border border-[#F0EBE1]">
                    <h5 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mb-2">Caminho Escolhido:</h5>
                    <p className="font-elegant text-xl text-[var(--color-atelier-grafite)] mb-4">{chosen.name}</p>
                    <h5 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mb-1">Feedback do Cliente:</h5>
                    <p className="text-sm italic text-[var(--color-atelier-grafite)]/80">"{ev.feedback}"</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
