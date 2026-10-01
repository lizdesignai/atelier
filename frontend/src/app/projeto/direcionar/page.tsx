"use client";
import { useState, useEffect } from "react";
import { Loader2, Compass } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { Territories } from "../../../components/brand/Territories";
import { getTerritoryEvaluationAction, submitTerritoryEvaluationAction } from "../../actions/territory";

export default function DirecionarPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);

  const fetch = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (prof) setProfile(prof);
    const { data: proj } = await supabase.from('projects').select('*').eq('client_id', session.user.id).in('status', ['active','delivered','completed']).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (proj) {
      setProject(proj);
      try {
        const evalData = await getTerritoryEvaluationAction(proj.id);
        setEvaluation(evalData);
      } catch (err) {
        console.error(err);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleEvaluate = async (chosenId: string, feedback: string) => {
    if (!evaluation) return;
    try {
      const updated = await submitTerritoryEvaluationAction(evaluation.id, chosenId, feedback);
      setEvaluation(updated);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Avaliação enviada com sucesso!' }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao enviar avaliação.' }));
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-[calc(100vh-80px)]"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)] opacity-50" /></div>;

  if (!project) return <div className="p-8 text-[var(--color-atelier-grafite)]">Nenhum projeto ativo encontrado.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full px-6 lg:px-12 relative z-10 pb-6 gap-6 overflow-y-auto custom-scrollbar">
      <header className="pt-6 flex flex-col gap-2 shrink-0 animate-[fadeInUp_0.8s_ease-out]">
        <div className="flex items-center gap-3">
          <Compass size={24} className="text-[var(--color-atelier-terracota)]" />
          <span className="micro-title text-[var(--color-atelier-terracota)] tracking-[0.3em]">DIRECIONAR</span>
        </div>
        <p className="font-roboto text-sm text-[var(--color-atelier-grafite)]/60">Caminhos visuais e conceituais</p>
      </header>
      
      {evaluation ? (
        <Territories
          evaluationId={evaluation.id}
          territories={evaluation.territories}
          status={evaluation.status}
          chosenTerritoryId={evaluation.chosen_territory_id}
          feedback={evaluation.feedback}
          onEvaluate={handleEvaluate}
          isClient={true}
        />
      ) : (
        <div className="p-8 glass-panel rounded-[2rem] text-[var(--color-atelier-grafite)] text-center flex flex-col items-center justify-center min-h-[400px]">
          <Compass size={48} className="mb-4 text-[var(--color-atelier-terracota)] opacity-50" />
          <h3 className="font-elegant text-2xl mb-2">Aguardando Direcionamento</h3>
          <p className="font-roboto text-[13px]">A equipe do Studio Veronna está preparando as rotas criativas para você.</p>
        </div>
      )}
    </div>
  );
}
