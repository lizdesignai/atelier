// src/app/referencias/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, Plus, Image as ImageIcon, 
  Sparkles, Fingerprint, Type, Palette, Target, CheckCircle2,
  UploadCloud, Loader2, Compass, Save
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function ReferenciasPage() {
  // ==========================================
  // ESTADOS DO SUPABASE E DADOS
  // ==========================================
  const [isLoading, setIsLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<"direcoes" | "moodboard">("direcoes");
  
  // Estados do Moodboard
  const [clientMoodboard, setClientMoodboard] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Estados das Direções do Designer (Carrossel)
  const [directions, setDirections] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  // ==========================================
  // BUSCA DE DADOS AO CARREGAR
  // ==========================================
  useEffect(() => {
    const fetchReferencesData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Busca o Projeto do Cliente
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', session.user.id)
        .eq('status', 'active')
        .single();

      if (!project) {
        setIsLoading(false);
        return;
      }
      setProjectId(project.id);

      // 2. Busca o Moodboard (strategic_answers)
      const { data: strategicData } = await supabase
        .from('strategic_answers')
        .select('moodboard_urls')
        .eq('project_id', project.id)
        .single();
      
      if (strategicData && strategicData.moodboard_urls) {
        setClientMoodboard(strategicData.moodboard_urls);
      }

      // 3. Busca as Direções de Design enviadas pelo Admin
      const { data: directionsData } = await supabase
        .from('design_directions')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true });

      if (directionsData) {
        setDirections(directionsData);
      }

      setIsLoading(false);
    };

    fetchReferencesData();
  }, []);

  // ==========================================
  // AÇÕES: MOODBOARD
  // ==========================================
  const handleMoodboardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    setIsUploading(true);
    showToast("A enviar referência para o Atelier...");

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('moodboard').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('moodboard').getPublicUrl(filePath);
      const newUrls = [...clientMoodboard, publicUrlData.publicUrl];

      // Atualiza ou insere as URLs na tabela
      const { error: dbError } = await supabase
        .from('strategic_answers')
        .upsert({ project_id: projectId, moodboard_urls: newUrls }, { onConflict: 'project_id' });

      if (dbError) throw dbError;

      setClientMoodboard(newUrls);
      showToast("Imagem adicionada ao seu Moodboard!");
    } catch (error) {
      console.error(error);
      showToast("Erro ao guardar a imagem.");
    } finally {
      setIsUploading(false);
      e.target.value = ''; // Reset
    }
  };

  // ==========================================
  // AÇÕES: DIREÇÕES E AVALIAÇÃO
  // ==========================================
  const nextRef = () => setActiveIndex((prev) => (prev < directions.length - 1 ? prev + 1 : prev));
  const prevRef = () => setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));

  const handleFeedbackChange = (key: string, value: string) => {
    const updatedDirections = [...directions];
    const currentDir = updatedDirections[activeIndex];
    
    // Garante que o feedback é um objeto se ainda for nulo
    if (!currentDir.feedback) currentDir.feedback = { q1: "", q2: "", q3: "", q4: "" };
    currentDir.feedback[key] = value;
    
    setDirections(updatedDirections);
  };

  const handleScoreChange = (score: number) => {
    const updatedDirections = [...directions];
    updatedDirections[activeIndex].score = score;
    setDirections(updatedDirections);
  };

  const saveEvaluation = async () => {
    const currentDir = directions[activeIndex];
    if (!currentDir) return;

    setIsSavingFeedback(true);
    showToast("A enviar avaliação para a equipa...");

    try {
      const { error } = await supabase
        .from('design_directions')
        .update({ 
          score: currentDir.score || 0, 
          feedback: currentDir.feedback 
        })
        .eq('id', currentDir.id);

      if (error) throw error;
      showToast("✨ Avaliação gravada! O Atelier foi notificado.");
    } catch (error) {
      showToast("Erro ao gravar avaliação.");
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const currentRef = directions[activeIndex];

  // Ecrãs de Espera / Vazio
  if (isLoading) {
    return <div className="flex h-[calc(100vh-80px)] items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-4 opacity-50">
        <Compass size={48} className="text-[var(--color-atelier-grafite)]" />
        <h2 className="font-elegant text-3xl">Sem projeto ativo.</h2>
      </div>
    );
  }

  return (
    <div className="relative z-10 max-w-[1500px] mx-auto h-[calc(100vh-80px)] flex flex-col overflow-hidden pb-6">
      
      {/* CABEÇALHO */}
      <header className="mb-6 flex justify-between items-end animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)] shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/60 border border-white text-[var(--color-atelier-grafite)] px-4 py-1.5 rounded-full mb-4 shadow-sm">
            <Fingerprint size={14} className="text-[var(--color-atelier-terracota)]" />
            <span className="font-roboto text-[10px] uppercase tracking-[0.2em] font-bold">Alinhamento Estético</span>
          </div>
          <h1 className="font-elegant text-5xl md:text-[4rem] text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Curadoria <span className="text-[var(--color-atelier-terracota)] italic">Visual.</span>
          </h1>
        </div>
        
        {/* NOVIDADE: Alternador de Abas */}
        <div className="flex bg-white/60 backdrop-blur-md p-1 rounded-2xl shadow-sm border border-white">
          <button onClick={() => setActiveTab("direcoes")} className={`px-6 py-2.5 rounded-xl font-roboto text-[11px] uppercase tracking-widest font-bold transition-all ${activeTab === "direcoes" ? "bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] shadow-md" : "text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)]"}`}>
            Propostas do Atelier
          </button>
          <button onClick={() => setActiveTab("moodboard")} className={`px-6 py-2.5 rounded-xl font-roboto text-[11px] uppercase tracking-widest font-bold transition-all ${activeTab === "moodboard" ? "bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] shadow-md" : "text-[var(--color-atelier-grafite)]/60 hover:text-[var(--color-atelier-terracota)]"}`}>
            O Meu Moodboard
          </button>
        </div>
      </header>

      {/* GRID PRINCIPAL NO-SCROLL (Divisão 3/9) */}
      <div className="flex gap-6 flex-1 min-h-0">
        
        {/* ==========================================
            COLUNA ESQUERDA: MOODBOARD DO CLIENTE
            ========================================== */}
        {activeTab === "moodboard" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
            className="w-full glass-panel rounded-[2.5rem] flex flex-col shrink-0 overflow-hidden bg-white/40"
          >
            <div className="p-6 border-b border-white/40 bg-white/30 backdrop-blur-md shrink-0 flex justify-between items-center">
              <div>
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                  Suas Inspirações <Sparkles size={16} className="text-[var(--color-atelier-terracota)]" />
                </h3>
                <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 mt-1 uppercase tracking-widest font-bold">
                  Anexe as texturas, cores e marcas que guiam a sua visão.
                </p>
              </div>
              <label className={`bg-white text-[var(--color-atelier-grafite)] px-6 py-3 rounded-xl font-roboto font-bold uppercase tracking-widest text-[11px] hover:text-[var(--color-atelier-terracota)] border border-white transition-colors shadow-sm flex items-center gap-2 cursor-pointer ${isUploading ? 'opacity-50' : ''}`}>
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                Adicionar Imagem
                <input type="file" accept="image/*" className="hidden" onChange={handleMoodboardUpload} disabled={isUploading} />
              </label>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {clientMoodboard.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-40">
                  <ImageIcon size={48} className="mb-4 text-[var(--color-atelier-terracota)]" />
                  <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">O seu moodboard está vazio.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <AnimatePresence>
                    {clientMoodboard.map((img, i) => (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} key={i} className="aspect-square rounded-2xl border-[3px] border-white shadow-sm overflow-hidden group relative cursor-pointer">
                        <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Moodboard" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ==========================================
            COLUNA DIREITA: DIREÇÕES DO DESIGNER (Palco Principal)
            ========================================== */}
        {activeTab === "direcoes" && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="flex-1 glass-panel rounded-[2.5rem] flex flex-col relative overflow-hidden bg-white/40"
          >
            {directions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-50">
                <Target size={48} className="mb-4 text-[var(--color-atelier-terracota)]" />
                <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Aguarde pela Equipa.</h3>
                <p className="font-roboto mt-2 text-[14px]">O Atelier ainda não partilhou propostas para avaliação.</p>
              </div>
            ) : (
              <>
                {/* Barra de Navegação do Carrossel (Fixo no Topo) */}
                <div className="px-8 py-5 border-b border-white flex justify-between items-center bg-white/50 backdrop-blur-xl shrink-0 z-20">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center">
                      <ImageIcon size={18} />
                    </div>
                    <div>
                      <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{currentRef?.title}</h2>
                      <p className="font-roboto text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-atelier-terracota)] mt-1">
                        Direção {activeIndex + 1} de {directions.length}
                      </p>
                    </div>
                  </div>

                  {/* Controles de Navegação Elegantes */}
                  <div className="flex items-center gap-3 bg-white border border-white/60 p-1.5 rounded-full shadow-[0_5px_15px_rgba(122,116,112,0.08)]">
                    <button 
                      onClick={prevRef} disabled={activeIndex === 0}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--color-atelier-grafite)] transition-all"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="w-px h-6 bg-[var(--color-atelier-grafite)]/10"></div>
                    <button 
                      onClick={nextRef} disabled={activeIndex === directions.length - 1}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--color-atelier-grafite)] transition-all"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

                {/* O Palco Dividido (Imagem GIGANTE Esquerda / Questionário Direita) */}
                <div className="flex-1 flex min-h-0">
                  
                  {/* A ARTE (Imagem da Referência) */}
                  <div className="flex-[1.5] p-6 relative group overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeIndex}
                        initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full h-full rounded-[2rem] overflow-hidden border-[4px] border-white shadow-[0_20px_50px_rgba(122,116,112,0.15)] relative"
                      >
                        <img src={currentRef?.image_url} alt={currentRef?.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* O QUESTIONÁRIO DE CURADORIA (Rolagem Interna) */}
                  <div className="flex-1 border-l border-white/60 bg-white/20 flex flex-col min-h-0">
                    <div className="p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8">
                      
                      <div className="mb-2">
                        <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-2">Análise Técnica</h3>
                        <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 leading-relaxed">
                          Mergulhe nesta direção visual. Seja sincero e detalhista, pois cada palavra esculpe o próximo passo.
                        </p>
                      </div>

                      {/* Pergunta 1 */}
                      <div className="flex flex-col gap-3 group">
                        <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors">
                          <Target size={14} /> 1. Atmosfera e Percepção Geral
                        </label>
                        <textarea 
                          value={currentRef?.feedback?.q1 || ""} onChange={(e) => handleFeedbackChange("q1", e.target.value)}
                          placeholder="Qual é a sua percepção geral sobre a atmosfera desta direção?"
                          className="w-full bg-white/60 border border-white hover:border-[var(--color-atelier-terracota)]/40 focus:border-[var(--color-atelier-terracota)] focus:bg-white rounded-[1.2rem] p-4 text-[14px] text-[var(--color-atelier-grafite)] outline-none resize-none h-24 transition-all shadow-sm focus:shadow-[0_5px_20px_rgba(173,111,64,0.1)]"
                        ></textarea>
                      </div>

                      {/* Pergunta 2 */}
                      <div className="flex flex-col gap-3 group">
                        <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors">
                          <Type size={14} /> 2. Escolha Tipográfica
                        </label>
                        <textarea 
                          value={currentRef?.feedback?.q2 || ""} onChange={(e) => handleFeedbackChange("q2", e.target.value)}
                          placeholder="Como você avalia as fontes em termos de sofisticação e clareza?"
                          className="w-full bg-white/60 border border-white hover:border-[var(--color-atelier-terracota)]/40 focus:border-[var(--color-atelier-terracota)] focus:bg-white rounded-[1.2rem] p-4 text-[14px] text-[var(--color-atelier-grafite)] outline-none resize-none h-24 transition-all shadow-sm focus:shadow-[0_5px_20px_rgba(173,111,64,0.1)]"
                        ></textarea>
                      </div>

                      {/* Pergunta 3 */}
                      <div className="flex flex-col gap-3 group">
                        <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors">
                          <Palette size={14} /> 3. Paleta Cromática
                        </label>
                        <textarea 
                          value={currentRef?.feedback?.q3 || ""} onChange={(e) => handleFeedbackChange("q3", e.target.value)}
                          placeholder="A paleta de cores desperta a sensação correta para o seu mercado?"
                          className="w-full bg-white/60 border border-white hover:border-[var(--color-atelier-terracota)]/40 focus:border-[var(--color-atelier-terracota)] focus:bg-white rounded-[1.2rem] p-4 text-[14px] text-[var(--color-atelier-grafite)] outline-none resize-none h-24 transition-all shadow-sm focus:shadow-[0_5px_20px_rgba(173,111,64,0.1)]"
                        ></textarea>
                      </div>

                      {/* Pergunta 4 */}
                      <div className="flex flex-col gap-3 group">
                        <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors">
                          <Sparkles size={14} /> 4. Elementos Gráficos
                        </label>
                        <textarea 
                          value={currentRef?.feedback?.q4 || ""} onChange={(e) => handleFeedbackChange("q4", e.target.value)}
                          placeholder="Os elementos (símbolos, texturas) agregam valor ou parecem excessivos?"
                          className="w-full bg-white/60 border border-white hover:border-[var(--color-atelier-terracota)]/40 focus:border-[var(--color-atelier-terracota)] focus:bg-white rounded-[1.2rem] p-4 text-[14px] text-[var(--color-atelier-grafite)] outline-none resize-none h-24 transition-all shadow-sm focus:shadow-[0_5px_20px_rgba(173,111,64,0.1)]"
                        ></textarea>
                      </div>

                      {/* Pergunta 5: Escala de Alinhamento */}
                      <div className="flex flex-col gap-4 group bg-white/40 p-6 rounded-[1.5rem] border border-white shadow-sm">
                        <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] flex items-center justify-between w-full">
                          <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[var(--color-atelier-terracota)]"/> 5. Nível de Alinhamento Global</span>
                          <span className="text-[var(--color-atelier-terracota)] text-[14px] font-bold">{currentRef?.score || 0}/10</span>
                        </label>
                        <input 
                          type="range" min="0" max="10" step="1" 
                          value={currentRef?.score || 0} onChange={(e) => handleScoreChange(Number(e.target.value))}
                          className="w-full accent-[var(--color-atelier-terracota)] cursor-pointer h-1.5 bg-black/10 rounded-full appearance-none mt-2"
                        />
                        <div className="flex justify-between w-full font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 mt-1">
                          <span>Totalmente Distante</span>
                          <span>Exatamente Isso</span>
                        </div>
                      </div>

                      <button 
                        onClick={saveEvaluation} disabled={isSavingFeedback}
                        className="w-full mt-4 bg-[var(--color-atelier-grafite)] text-white px-6 py-4 rounded-[1.2rem] font-roboto font-bold uppercase tracking-[0.2em] text-[12px] hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-[0_10px_20px_rgba(122,116,112,0.2)] hover:shadow-[0_15px_30px_rgba(173,111,64,0.3)] hover:-translate-y-1 duration-300 flex items-center justify-center gap-2"
                      >
                        {isSavingFeedback ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Salvar Avaliação desta Direção
                      </button>

                    </div>
                  </div>

                </div>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}