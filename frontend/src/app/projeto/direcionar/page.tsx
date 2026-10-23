"use client";
import { useState, useEffect } from "react";
import { 
  Loader2, Compass, Bell, CheckCircle2, 
  Palette, Layers
} from "lucide-react";
import { Territories } from "../../../components/brand/Territories";
import { getTerritoryEvaluationAction, submitTerritoryEvaluationAction } from "../../actions/territory";
import { getClientActiveProjectAction } from "../../actions/clientProject";

export default function DirecionarPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);

  const fetchPageData = async () => {
    setIsLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (authData.authenticated) setProfile(authData.user);
      
      const proj = await getClientActiveProjectAction();
      if (proj) {
        setProject(proj);
        const evalData = await getTerritoryEvaluationAction(proj.id);
        // Só considera liberado para avaliação se houver territórios cadastrados e status ativo para cliente
        if (evalData && evalData.territories && evalData.territories.length > 0 && evalData.status !== 'draft') {
          setEvaluation(evalData);
        } else {
          setEvaluation(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPageData();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)] opacity-50" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 md:p-8 text-[var(--color-atelier-grafite)] text-center">
        Nenhum projeto ativo encontrado.
      </div>
    );
  }

  const hasTerritoriesToSend = evaluation && evaluation.territories && evaluation.territories.length > 0;

  return (
    <div className="flex flex-col h-full w-full max-w-[1300px] mx-auto px-4 md:px-8 lg:px-12 relative z-10 pb-12 gap-6 overflow-y-auto custom-scrollbar">
      
      {/* Header Editorial da Fase */}
      <header className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 border-b border-[var(--color-atelier-grafite)]/10 pb-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-orange-100/70 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0">
              <Compass size={18} />
            </span>
            <span className="text-[10px] font-roboto font-bold uppercase tracking-[0.25em] text-[var(--color-atelier-terracota)]">
              Fase 02 • Direcionar
            </span>
          </div>
          <h2 className="font-elegant text-2xl md:text-3xl text-[var(--color-atelier-grafite)] font-bold mt-1">
            Curadoria Visual & Territórios Conceituais
          </h2>
          <p className="font-roboto text-xs md:text-sm text-[var(--color-atelier-grafite)]/65 max-w-2xl">
            Caminhos visuais, moodboards estéticos e paletas cromáticas para definir a identidade do seu negócio.
          </p>
        </div>

        {/* Status Pill */}
        <div className="shrink-0 flex items-center gap-2">
          {hasTerritoriesToSend ? (
            <span className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Pronto para Escolha
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-orange-50/80 border border-orange-200/80 text-[var(--color-atelier-terracota)] text-[10px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
              <Palette size={11} className="text-[var(--color-atelier-terracota)]" />
              Fase Liberada • Em Curadoria
            </span>
          )}
        </div>
      </header>

      {/* Conteúdo Principal */}
      {hasTerritoriesToSend ? (
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
        /* Card Reassegurador de Espera com Aviso */
        <div className="flex flex-col items-center justify-center my-auto py-8 max-w-3xl mx-auto w-full gap-6">
          <div className="glass-panel p-7 sm:p-10 rounded-[2.5rem] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(20,44,72,0.06)] flex flex-col items-center text-center w-full relative overflow-hidden">
            
            {/* Efeito sutil de background */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#234E80]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Ícone com indicação de etapa concluída */}
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-100/70 border border-orange-200/60 flex items-center justify-center text-[var(--color-atelier-terracota)] shadow-sm">
                <Compass size={38} className="text-[var(--color-atelier-terracota)]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs border-2 border-white">
                <CheckCircle2 size={13} strokeWidth={2.8} />
              </div>
            </div>

            {/* Título e Fase Concluída */}
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9.5px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={10} /> Fase 01 Descobrir Concluída
              </span>
            </div>

            <h3 className="font-elegant text-2xl sm:text-3xl text-[var(--color-atelier-grafite)] font-bold mb-3">
              Curadoria Visual & Territórios em Preparação
            </h3>

            {/* Aviso pedindo para aguardar e informando notificação futura */}
            <p className="font-roboto text-sm sm:text-base text-[var(--color-atelier-grafite)]/75 leading-relaxed max-w-xl mb-6">
              A fase <strong>Descobrir</strong> foi concluída com sucesso e a etapa de <strong>Direcionamento</strong> já está liberada! 
              Nossa equipe criativa do Studio Veronna está agora produzindo a curadoria das referências e os caminhos visuais para a sua marca.
            </p>

            {/* Box de Notificação em Destaque */}
            <div className="w-full bg-gradient-to-r from-orange-50/70 via-amber-50/60 to-orange-50/70 border border-[var(--color-atelier-terracota)]/25 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center gap-3.5 text-left mb-6 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <Bell size={18} className="animate-bounce" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-roboto font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]">
                  Aviso Importante: Aguarde o Envio
                </span>
                <p className="text-[12px] font-roboto text-[var(--color-atelier-grafite)]/70 leading-normal">
                  Como ainda não enviamos os arquivos para a curadoria visual e escolha do território, por favor aguarde. <strong>Assim que os arquivos estiverem disponíveis, você será notificado para realizar a sua escolha.</strong>
                </p>
              </div>
            </div>

            {/* Micro-cards explicativos do que vem nesta fase */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-4 border-t border-[var(--color-atelier-grafite)]/10 text-left">
              <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.04] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[var(--color-atelier-terracota)]">
                  <Palette size={13} />
                  <span className="text-[10px] font-roboto font-bold uppercase tracking-wider">3 Territórios</span>
                </div>
                <p className="text-[10.5px] font-roboto text-[var(--color-atelier-grafite)]/65 leading-tight">
                  Rotas conceituais distintas baseadas no DNA mapeado.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.04] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[var(--color-atelier-terracota)]">
                  <Layers size={13} />
                  <span className="text-[10px] font-roboto font-bold uppercase tracking-wider">Moodboards</span>
                </div>
                <p className="text-[10.5px] font-roboto text-[var(--color-atelier-grafite)]/65 leading-tight">
                  Curadoria estética, texturas, tipografia e atmosferas.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.04] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[var(--color-atelier-terracota)]">
                  <CheckCircle2 size={13} />
                  <span className="text-[10px] font-roboto font-bold uppercase tracking-wider">Sua Decisão</span>
                </div>
                <p className="text-[10.5px] font-roboto text-[var(--color-atelier-grafite)]/65 leading-tight">
                  Você escolhe a rota oficial para a construção do símbolo.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
