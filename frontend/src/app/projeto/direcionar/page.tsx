"use client";
import { useState, useEffect } from "react";
import { 
  Loader2, Compass, Bell, CheckCircle2, 
  Palette, Layers, Target, Type, Sparkles,
  ExternalLink, ChevronRight, ChevronLeft, Save
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Territories } from "../../../components/brand/Territories";
import { getTerritoryEvaluationAction, submitTerritoryEvaluationAction } from "../../actions/territory";
import { getClientActiveProjectAction } from "../../actions/clientProject";
import { supabase } from "../../../lib/supabase";
import { NotificationEngine } from "../../../lib/NotificationEngine";
import { normalizeImageUrl } from "../../../lib/imageUtils";

export default function DirecionarPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  
  // Curadoria Visual
  const [directions, setDirections] = useState<any[]>([]);
  const [activeDirectionIndex, setActiveDirectionIndex] = useState(0);
  const [isSavingDirection, setIsSavingDirection] = useState(false);
  const [activeTab, setActiveTab] = useState<'curadoria' | 'territorios'>('curadoria');

  const fetchPageData = async () => {
    setIsLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (authData.authenticated) setProfile(authData.user);
      
      const proj = await getClientActiveProjectAction();
      if (proj) {
        setProject(proj);

        // 1. Territórios Conceituais
        const evalData = await getTerritoryEvaluationAction(proj.id);
        if (evalData && evalData.territories && evalData.territories.length > 0 && evalData.status !== 'draft') {
          setEvaluation(evalData);
        } else {
          setEvaluation(null);
        }

        // 2. Curadoria Visual (design_directions)
        const { data: dirs } = await (supabase
          .from('design_directions') as any)
          .select('*')
          .eq('project_id', proj.id)
          .order('created_at', { ascending: true });

        const safeDirs = (dirs || []).filter(Boolean);
        setDirections(safeDirs);

        // Ajusta aba padrão
        if (safeDirs.length > 0) {
          setActiveTab('curadoria');
        } else if (evalData && evalData.territories && evalData.territories.length > 0 && evalData.status !== 'draft') {
          setActiveTab('territorios');
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

  const handleEvaluateTerritory = async (chosenId: string, feedback: string) => {
    if (!evaluation) return;
    try {
      const updated = await submitTerritoryEvaluationAction(evaluation.id, chosenId, feedback);
      setEvaluation(updated);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Avaliação de território enviada com sucesso!' }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao enviar avaliação.' }));
    }
  };

  const handleFeedbackChange = (key: string, value: string) => {
    const updated = [...directions];
    const current = updated[activeDirectionIndex];
    if (!current) return;
    if (!current.feedback || typeof current.feedback !== 'object') {
      current.feedback = { q1: "", q2: "", q3: "", q4: "" };
    }
    current.feedback[key] = value;
    setDirections(updated);
  };

  const handleScoreChange = (score: number) => {
    const updated = [...directions];
    if (!updated[activeDirectionIndex]) return;
    updated[activeDirectionIndex].score = score;
    setDirections(updated);
  };

  const handleSaveDirectionEvaluation = async () => {
    const currentDir = directions[activeDirectionIndex];
    if (!currentDir) return;

    setIsSavingDirection(true);
    window.dispatchEvent(new CustomEvent('showToast', { detail: 'Enviando avaliação para a equipe...' }));

    try {
      const { error } = await (supabase
        .from('design_directions') as any)
        .update({
          score: currentDir.score || 0,
          feedback: currentDir.feedback,
          status: 'evaluated'
        })
        .eq('id', currentDir.id);

      if (error) throw error;

      await NotificationEngine.notifyManagement(
        "✨ Curadoria Visual Avaliada",
        `O cliente ${profile?.nome?.split(' ')[0] || 'do projeto'} avaliou a Direção "${currentDir.title}" com nota ${currentDir.score || 0}/10.`,
        currentDir.score && currentDir.score >= 8 ? "success" : "info",
        "/admin/projetos"
      );

      window.dispatchEvent(new CustomEvent('showToast', { detail: '✨ Avaliação enviada com sucesso para o Studio Veronna!' }));
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('showToast', { detail: 'Erro ao salvar avaliação.' }));
    } finally {
      setIsSavingDirection(false);
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
  const hasDirections = directions.length > 0;
  const currentDir = directions[activeDirectionIndex];
  const currentDirImages = currentDir 
    ? ((currentDir.image_urls && currentDir.image_urls.length > 0) 
        ? currentDir.image_urls 
        : (currentDir.image_url ? [currentDir.image_url] : []))
    : [];

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

        {/* Status Pill & Abas */}
        <div className="shrink-0 flex items-center gap-2">
          {hasTerritoriesToSend || hasDirections ? (
            <div className="flex items-center gap-2">
              {hasDirections && (
                <button
                  type="button"
                  onClick={() => setActiveTab('curadoria')}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'curadoria'
                      ? 'bg-[var(--color-atelier-terracota)] text-white shadow-sm'
                      : 'bg-white/80 text-[var(--color-atelier-grafite)]/70 hover:bg-white border border-black/[0.06]'
                  }`}
                >
                  <Palette size={12} />
                  Curadoria Visual ({directions.length})
                </button>
              )}

              {hasTerritoriesToSend && (
                <button
                  type="button"
                  onClick={() => setActiveTab('territorios')}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'territorios'
                      ? 'bg-[var(--color-atelier-terracota)] text-white shadow-sm'
                      : 'bg-white/80 text-[var(--color-atelier-grafite)]/70 hover:bg-white border border-black/[0.06]'
                  }`}
                >
                  <Layers size={12} />
                  Territórios Conceituais ({evaluation.territories.length})
                </button>
              )}
            </div>
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-orange-50/80 border border-orange-200/80 text-[var(--color-atelier-terracota)] text-[10px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
              <Palette size={11} className="text-[var(--color-atelier-terracota)]" />
              Fase Liberada • Em Curadoria
            </span>
          )}
        </div>
      </header>

      {/* Conteúdo Principal */}
      {(!hasDirections && !hasTerritoriesToSend) ? (
        /* Card Reassegurador de Espera com Aviso */
        <div className="flex flex-col items-center justify-center my-auto py-8 max-w-3xl mx-auto w-full gap-6">
          <div className="glass-panel p-7 sm:p-10 rounded-[2.5rem] bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_50px_rgba(20,44,72,0.06)] flex flex-col items-center text-center w-full relative overflow-hidden">
            
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#234E80]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-100/70 border border-orange-200/60 flex items-center justify-center text-[var(--color-atelier-terracota)] shadow-sm">
                <Compass size={38} className="text-[var(--color-atelier-terracota)]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs border-2 border-white">
                <CheckCircle2 size={13} strokeWidth={2.8} />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9.5px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={10} /> Fase 01 Descobrir Concluída
              </span>
            </div>

            <h3 className="font-elegant text-2xl sm:text-3xl text-[var(--color-atelier-grafite)] font-bold mb-3">
              Curadoria Visual & Territórios em Preparação
            </h3>

            <p className="font-roboto text-sm sm:text-base text-[var(--color-atelier-grafite)]/75 leading-relaxed max-w-xl mb-6">
              A fase <strong>Descobrir</strong> foi concluída com sucesso e a etapa de <strong>Direcionamento</strong> já está liberada! 
              Nossa equipe criativa do Studio Veronna está agora produzindo a curadoria das referências e os caminhos visuais para a sua marca.
            </p>

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-4 border-t border-[var(--color-atelier-grafite)]/10 text-left">
              <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.04] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[var(--color-atelier-terracota)]">
                  <Palette size={13} />
                  <span className="text-[10px] font-roboto font-bold uppercase tracking-wider">Curadoria Visual</span>
                </div>
                <p className="text-[10.5px] font-roboto text-[var(--color-atelier-grafite)]/65 leading-tight">
                  Referências de arte, tipografia, paletas e elementos gráficos.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.04] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[var(--color-atelier-terracota)]">
                  <Layers size={13} />
                  <span className="text-[10px] font-roboto font-bold uppercase tracking-wider">Territórios</span>
                </div>
                <p className="text-[10.5px] font-roboto text-[var(--color-atelier-grafite)]/65 leading-tight">
                  Rotas conceituais estruturadas para o posicionamento da marca.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/[0.02] border border-black/[0.04] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[var(--color-atelier-terracota)]">
                  <CheckCircle2 size={13} />
                  <span className="text-[10px] font-roboto font-bold uppercase tracking-wider">Sua Avaliação</span>
                </div>
                <p className="text-[10.5px] font-roboto text-[var(--color-atelier-grafite)]/65 leading-tight">
                  Você pontua e orienta as decisões criativas com a equipe.
                </p>
              </div>
            </div>

          </div>
        </div>
      ) : activeTab === 'territorios' && hasTerritoriesToSend ? (
        <Territories
          evaluationId={evaluation.id}
          territories={evaluation.territories}
          status={evaluation.status}
          chosenTerritoryId={evaluation.chosen_territory_id}
          feedback={evaluation.feedback}
          onEvaluate={handleEvaluateTerritory}
          isClient={true}
        />
      ) : (
        /* Vista da Curadoria Visual */
        <div className="flex flex-col gap-6">
          
          {/* Seletor de Direções Visuais */}
          {directions.length > 1 && (
            <div className="flex overflow-x-auto custom-scrollbar gap-3 pb-2 shrink-0">
              {directions.map((dir, idx) => {
                const cover = (dir?.image_urls && dir.image_urls.length > 0) ? dir.image_urls[0] : (dir?.image_url || '');
                const isSelected = activeDirectionIndex === idx;
                const isEvaluated = dir.score && dir.score > 0;

                return (
                  <button
                    key={dir.id || idx}
                    type="button"
                    onClick={() => setActiveDirectionIndex(idx)}
                    className={`shrink-0 flex items-center gap-3 p-2.5 pr-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-white border-[var(--color-atelier-terracota)] shadow-sm ring-1 ring-[var(--color-atelier-terracota)]/20'
                        : 'bg-white/60 border-white hover:bg-white'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-black/[0.06] shrink-0">
                      <img src={normalizeImageUrl(cover)} alt={dir.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-[11px] font-roboto font-bold truncate ${isSelected ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>
                        {dir.title}
                      </span>
                      <span className="text-[9.5px] font-roboto text-[var(--color-atelier-grafite)]/50 uppercase tracking-wider">
                        {isEvaluated ? `Nota ${dir.score}/10 • Avaliado` : 'Pendente de Avaliação'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Área Principal: Galeria & Questionário */}
          {currentDir && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Coluna 1: Galeria de Imagens da Referência */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="glass-panel p-6 sm:p-7 rounded-[2.5rem] bg-white/80 border border-white shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                        Direção Criativa {String(activeDirectionIndex + 1).padStart(2, '0')}
                      </span>
                      <h3 className="font-elegant text-2xl sm:text-3xl text-[var(--color-atelier-grafite)] font-bold mt-0.5">
                        {currentDir.title}
                      </h3>
                      {currentDir.description && (
                        <p className="font-roboto text-xs sm:text-sm text-[var(--color-atelier-grafite)]/70 mt-1">
                          {currentDir.description}
                        </p>
                      )}
                    </div>

                    {currentDir.score > 0 && (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-roboto font-bold uppercase tracking-wider shrink-0">
                        Nota: {currentDir.score}/10
                      </span>
                    )}
                  </div>

                  {/* Grid de Imagens da Direção */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                    {currentDirImages.map((img: string, imgIdx: number) => (
                      <div
                        key={imgIdx}
                        onClick={() => window.open(normalizeImageUrl(img), '_blank')}
                        className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 border border-black/[0.06] cursor-pointer shadow-2xs hover:shadow-md transition-all"
                      >
                        <img
                          src={normalizeImageUrl(img)}
                          alt={`${currentDir.title} - ${imgIdx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[10px] font-roboto font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                            <ExternalLink size={11} /> Ampliar Imagem
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] font-roboto text-[var(--color-atelier-grafite)]/50 italic text-center pt-2">
                    Clique em qualquer imagem para abrir em resolução completa.
                  </p>
                </div>
              </div>

              {/* Coluna 2: Formulário Oficial de Avaliação */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="glass-panel p-6 sm:p-7 rounded-[2.5rem] bg-white/90 border border-white shadow-sm flex flex-col gap-5">
                  <div>
                    <span className="text-[10px] font-roboto font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-1.5">
                      <Sparkles size={12} /> Avaliação Editorial
                    </span>
                    <h4 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] font-bold mt-0.5">
                      Sua Análise da Curadoria
                    </h4>
                    <p className="font-roboto text-xs text-[var(--color-atelier-grafite)]/65 mt-1">
                      Responda às questões abaixo para lapidarmos os elementos centrais da sua marca.
                    </p>
                  </div>

                  {/* Pergunta 1: No geral, o que achou desse projeto? */}
                  <div className="flex flex-col gap-2">
                    <label className="font-roboto text-[11px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/85 flex items-center gap-1.5">
                      <Target size={13} className="text-[var(--color-atelier-terracota)]" /> 1. No geral, o que achou desse projeto?
                    </label>
                    <textarea
                      value={currentDir?.feedback?.q1 || ""}
                      onChange={(e) => handleFeedbackChange("q1", e.target.value)}
                      placeholder="Compartilhe o que achou do projeto no geral..."
                      rows={3}
                      className="w-full bg-[#fcfaf8] border border-black/[0.08] focus:border-[var(--color-atelier-terracota)] rounded-xl p-3.5 text-xs text-[var(--color-atelier-grafite)] outline-none resize-none transition-colors shadow-2xs"
                    />
                  </div>

                  {/* Pergunta 2: O que acha da fonte usada? */}
                  <div className="flex flex-col gap-2">
                    <label className="font-roboto text-[11px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/85 flex items-center gap-1.5">
                      <Type size={13} className="text-[var(--color-atelier-terracota)]" /> 2. O que acha da fonte usada?
                    </label>
                    <textarea
                      value={currentDir?.feedback?.q2 || ""}
                      onChange={(e) => handleFeedbackChange("q2", e.target.value)}
                      placeholder="Compartilhe o que achou da fonte usada..."
                      rows={3}
                      className="w-full bg-[#fcfaf8] border border-black/[0.08] focus:border-[var(--color-atelier-terracota)] rounded-xl p-3.5 text-xs text-[var(--color-atelier-grafite)] outline-none resize-none transition-colors shadow-2xs"
                    />
                  </div>

                  {/* Pergunta 3: O que acha da paleta de cor? */}
                  <div className="flex flex-col gap-2">
                    <label className="font-roboto text-[11px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/85 flex items-center gap-1.5">
                      <Palette size={13} className="text-[var(--color-atelier-terracota)]" /> 3. O que acha da paleta de cor?
                    </label>
                    <textarea
                      value={currentDir?.feedback?.q3 || ""}
                      onChange={(e) => handleFeedbackChange("q3", e.target.value)}
                      placeholder="Compartilhe o que achou da paleta de cores..."
                      rows={3}
                      className="w-full bg-[#fcfaf8] border border-black/[0.08] focus:border-[var(--color-atelier-terracota)] rounded-xl p-3.5 text-xs text-[var(--color-atelier-grafite)] outline-none resize-none transition-colors shadow-2xs"
                    />
                  </div>

                  {/* Pergunta 4: E dos elementos gráficos? */}
                  <div className="flex flex-col gap-2">
                    <label className="font-roboto text-[11px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]/85 flex items-center gap-1.5">
                      <Layers size={13} className="text-[var(--color-atelier-terracota)]" /> 4. E dos elementos gráficos? (Podem ser padrões, ícones, elementos que “enfeitam” o projeto)
                    </label>
                    <textarea
                      value={currentDir?.feedback?.q4 || ""}
                      onChange={(e) => handleFeedbackChange("q4", e.target.value)}
                      placeholder="Compartilhe suas impressões sobre padrões, ícones e elementos visuais..."
                      rows={3}
                      className="w-full bg-[#fcfaf8] border border-black/[0.08] focus:border-[var(--color-atelier-terracota)] rounded-xl p-3.5 text-xs text-[var(--color-atelier-grafite)] outline-none resize-none transition-colors shadow-2xs"
                    />
                  </div>

                  {/* Pergunta 5: De 0 a 10, qual sua nota? */}
                  <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[#fcfaf8] border border-black/[0.06]">
                    <div className="flex justify-between items-center">
                      <label className="font-roboto text-[11px] font-bold uppercase tracking-wider text-[var(--color-atelier-grafite)]">
                        5. De 0 a 10, qual sua nota?
                      </label>
                      <span className="px-3 py-1 rounded-full bg-[var(--color-atelier-terracota)] text-white font-roboto text-xs font-bold shadow-2xs">
                        {currentDir?.score || 0}/10
                      </span>
                    </div>

                    {/* Botões de nota rápida de 0 a 10 */}
                    <div className="grid grid-cols-11 gap-1">
                      {Array.from({ length: 11 }).map((_, n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => handleScoreChange(n)}
                          className={`py-1.5 text-center text-xs font-roboto font-bold rounded-lg transition-all cursor-pointer ${
                            (currentDir?.score || 0) === n
                              ? 'bg-[var(--color-atelier-terracota)] text-white shadow-2xs scale-105'
                              : 'bg-white hover:bg-orange-100/60 text-[var(--color-atelier-grafite)]/70 border border-black/[0.06]'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between text-[9.5px] font-roboto uppercase tracking-wider text-[var(--color-atelier-grafite)]/45">
                      <span>0 - Distante</span>
                      <span>10 - Excelente</span>
                    </div>
                  </div>

                  {/* Botão de Envio */}
                  <button
                    type="button"
                    onClick={handleSaveDirectionEvaluation}
                    disabled={isSavingDirection}
                    className="w-full py-3.5 px-4 rounded-xl bg-[var(--color-atelier-terracota)] hover:bg-[#234E80] text-white text-xs font-roboto font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
                  >
                    {isSavingDirection ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Enviando Avaliação...
                      </>
                    ) : (
                      <>
                        <Save size={15} /> Salvar Avaliação desta Direção
                      </>
                    )}
                  </button>

                </div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}