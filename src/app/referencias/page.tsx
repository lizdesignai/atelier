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
import { NotificationEngine } from "../../lib/NotificationEngine"; // 🔔 INJEÇÃO DO MOTOR DE NOTIFICAÇÕES

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function ReferenciasPage() {
  // ==========================================
  // ESTADOS DO SUPABASE E DADOS
  // ==========================================
  const [isLoading, setIsLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null); // Para usar nas notificações
  
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

      // 1. Busca perfil do cliente logado (para contexto na notificação)
      const { data: profile } = await supabase.from('profiles').select('nome').eq('id', session.user.id).single();
      if (profile) setClientProfile(profile);

      // 2. Busca o Projeto do Cliente
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', session.user.id)
        .in('status', ['active', 'delivered'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!project) {
        setIsLoading(false);
        return;
      }
      setProjectId(project.id);

      // 3. Busca o Moodboard (strategic_answers)
      const { data: strategicData } = await supabase
        .from('strategic_answers')
        .select('moodboard_urls')
        .eq('project_id', project.id)
        .single();
      
      if (strategicData && strategicData.moodboard_urls) {
        setClientMoodboard(strategicData.moodboard_urls);
      }

      // 4. Busca as Direções de Design enviadas pelo Admin
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
    showToast("A enviar referência visual para o Atelier...");

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

      // 🔔 NOTIFICAÇÃO: Gestão (Avisa que o cliente injetou uma nova referência no seu Brandbook)
      await NotificationEngine.notifyManagement(
        "📸 Nova Referência no Moodboard",
        `O cliente ${clientProfile?.nome?.split(' ')[0]} adicionou uma nova imagem inspiracional ao seu Mural de Referências.`,
        "info",
        "/admin/projetos" 
      );

      setClientMoodboard(newUrls);
      showToast("Imagem adicionada ao seu Moodboard!");
    } catch (error) {
      console.error(error);
      showToast("Erro ao guardar a imagem. Tente novamente.");
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
    showToast("A enviar matriz de avaliação para a equipa...");

    try {
      const { error } = await supabase
        .from('design_directions')
        .update({ 
          score: currentDir.score || 0, 
          feedback: currentDir.feedback 
        })
        .eq('id', currentDir.id);

      if (error) throw error;

      // 🔔 NOTIFICAÇÃO: Gestão (Avisa que o cliente preencheu a matriz de feedback)
      await NotificationEngine.notifyManagement(
        "📝 Direção Avaliada",
        `O cliente ${clientProfile?.nome?.split(' ')[0]} gravou o feedback e deu nota ${currentDir.score || 0} à Direção: "${currentDir.title}".`,
        currentDir.score && currentDir.score >= 8 ? "success" : "warning", // Sucesso se nota alta, warning se nota baixa
        "/admin/projetos" 
      );

      showToast("✨ Avaliação gravada! O Diretor de Arte foi notificado.");
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
    <div className="relative z-10 max-w-[1500px] mx-auto h-[calc(100vh-80px)] flex flex-col overflow-hidden pb-6 px-4 md:px-0">
      
      {/* CABEÇALHO */}
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-0 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)] shrink-0 mt-6 md:mt-0">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/60 border border-white text-[var(--color-atelier-grafite)] px-4 py-1.5 rounded-full mb-3 shadow-sm">
            <Fingerprint size={14} className="text-[var(--color-atelier-terracota)]" />
            <span className="font-roboto text-[10px] uppercase tracking-[0.2em] font-bold">Alinhamento Estético</span>
          </div>
          <h1 className="font-elegant text-4xl md:text-[4rem] text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Curadoria <span className="text-[var(--color-atelier-terracota)] italic">Visual.</span>
          </h1>
        </div>
        
        {/* Alternador de Abas */}
        <div className="flex bg-white/60 backdrop-blur-xl p-1.5 rounded-[1.5rem] shadow-sm border border-white w-full md:w-auto">
          <button onClick={() => setActiveTab("direcoes")} className={`flex-1 md:flex-none px-6 py-3 rounded-[1.2rem] font-roboto text-[10px] md:text-[11px] uppercase tracking-widest font-bold transition-all ${activeTab === "direcoes" ? "bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] shadow-md" : "text-[var(--color-atelier-grafite)]/60 hover:bg-white hover:text-[var(--color-atelier-terracota)]"}`}>
            Propostas do Atelier
          </button>
          <button onClick={() => setActiveTab("moodboard")} className={`flex-1 md:flex-none px-6 py-3 rounded-[1.2rem] font-roboto text-[10px] md:text-[11px] uppercase tracking-widest font-bold transition-all ${activeTab === "moodboard" ? "bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] shadow-md" : "text-[var(--color-atelier-grafite)]/60 hover:bg-white hover:text-[var(--color-atelier-terracota)]"}`}>
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
            className="w-full glass-panel rounded-[3rem] flex flex-col shrink-0 overflow-hidden bg-white/40 border border-white shadow-sm"
          >
            <div className="p-8 border-b border-white/60 bg-white/40 backdrop-blur-xl shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
              <div>
                <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-2 mb-1">
                  Suas Inspirações <Sparkles size={18} className="text-[var(--color-atelier-terracota)]" />
                </h3>
                <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/60 uppercase tracking-widest font-bold">
                  Anexe as texturas, cores e marcas que guiam a sua visão.
                </p>
              </div>
              <label className={`bg-white text-[var(--color-atelier-grafite)] px-6 py-4 rounded-[1.2rem] font-roboto font-bold uppercase tracking-widest text-[11px] hover:text-[var(--color-atelier-terracota)] border border-white transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer w-full md:w-auto ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}>
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                Adicionar Imagem
                <input type="file" accept="image/*" className="hidden" onChange={handleMoodboardUpload} disabled={isUploading} />
              </label>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              {clientMoodboard.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-40 bg-white/30 rounded-[2rem] border border-white p-10">
                  <ImageIcon size={48} className="mb-4 text-[var(--color-atelier-terracota)]" />
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">O seu moodboard está vazio.</h3>
                  <p className="font-roboto text-[13px] font-medium mt-2 text-center">Mostre-nos o que os seus olhos consideram belo e eficaz.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  <AnimatePresence>
                    {clientMoodboard.map((img, i) => (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} key={i} className="aspect-square rounded-2xl border-[4px] border-white shadow-sm overflow-hidden group relative cursor-pointer">
                        <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Moodboard" onClick={() => window.open(img, "_blank")} />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                           <ImageIcon size={24} className="text-white drop-shadow-md" />
                        </div>
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
            className="flex-1 glass-panel rounded-[3rem] flex flex-col relative overflow-hidden bg-white/40 border border-white shadow-sm"
          >
            {directions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-50 bg-white/20">
                <Target size={48} className="mb-4 text-[var(--color-atelier-terracota)]" />
                <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Aguarde pela Equipa.</h3>
                <p className="font-roboto mt-2 text-[14px] font-medium text-center px-6">O Diretor de Arte ainda não partilhou rotas criativas para avaliação.</p>
              </div>
            ) : (
              <>
                {/* Barra de Navegação do Carrossel (Fixo no Topo) */}
                <div className="px-8 py-6 border-b border-white flex flex-col md:flex-row md:justify-between md:items-center gap-4 md:gap-0 bg-white/60 backdrop-blur-xl shrink-0 z-20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1rem] bg-white border border-[var(--color-atelier-terracota)]/10 shadow-inner text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0">
                      <ImageIcon size={20} />
                    </div>
                    <div>
                      <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-none mb-1">{currentRef?.title}</h2>
                      <p className="font-roboto text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-atelier-terracota)]">
                        Direção {activeIndex + 1} de {directions.length}
                      </p>
                    </div>
                  </div>

                  {/* Controles de Navegação Elegantes */}
                  <div className="flex items-center gap-2 bg-white border border-white p-2 rounded-full shadow-sm w-fit self-end md:self-auto">
                    <button 
                      onClick={prevRef} disabled={activeIndex === 0}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--color-atelier-grafite)] transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="w-px h-6 bg-[var(--color-atelier-grafite)]/10"></div>
                    <button 
                      onClick={nextRef} disabled={activeIndex === directions.length - 1}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--color-atelier-grafite)] transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

                {/* O Palco Dividido (Imagem GIGANTE Esquerda / Questionário Direita) */}
                <div className="flex-1 flex flex-col md:flex-row min-h-0">
                  
                  {/* A ARTE (Imagem da Referência) */}
                  <div className="md:flex-[1.5] p-6 md:p-8 relative group overflow-hidden h-[40vh] md:h-auto shrink-0 md:shrink-1">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeIndex}
                        initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full h-full rounded-[2.5rem] overflow-hidden border-[6px] border-white shadow-[0_20px_50px_rgba(122,116,112,0.1)] relative bg-gray-50"
                      >
                        <img 
                          src={currentRef?.image_url} 
                          alt={currentRef?.title} 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-[2s]" 
                          onClick={() => window.open(currentRef?.image_url, "_blank")}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* O QUESTIONÁRIO DE CURADORIA (Rolagem Interna) */}
                  <div className="flex-1 border-t md:border-t-0 md:border-l border-white/60 bg-white/40 flex flex-col min-h-0">
                    <div className="p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8 h-full">
                      
                      <div className="mb-2">
                        <h3 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-3">Análise Técnica</h3>
                        <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 leading-relaxed font-medium bg-white/60 p-4 rounded-2xl border border-white shadow-sm">
                          Mergulhe nesta direção visual. Seja sincero e detalhista, pois cada palavra esculpe o próximo passo.
                        </p>
                      </div>

                      {/* Pergunta 1 */}
                      <div className="flex flex-col gap-3 group">
                        <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors pl-1">
                          <Target size={14} /> 1. Atmosfera e Percepção Geral
                        </label>
                        <textarea 
                          value={currentRef?.feedback?.q1 || ""} onChange={(e) => handleFeedbackChange("q1", e.target.value)}
                          placeholder="Qual é a sua percepção geral sobre a atmosfera desta direção?"
                          className="w-full bg-white border border-transparent hover:border-[var(--color-atelier-terracota)]/20 focus:border-[var(--color-atelier-terracota)]/50 rounded-[1.2rem] p-5 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none resize-none h-24 transition-all shadow-sm focus:shadow-md custom-scrollbar"
                        ></textarea>
                      </div>

                      {/* Pergunta 2 */}
                      <div className="flex flex-col gap-3 group">
                        <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors pl-1">
                          <Type size={14} /> 2. Escolha Tipográfica
                        </label>
                        <textarea 
                          value={currentRef?.feedback?.q2 || ""} onChange={(e) => handleFeedbackChange("q2", e.target.value)}
                          placeholder="Como avalia as fontes em termos de sofisticação e clareza?"
                          className="w-full bg-white border border-transparent hover:border-[var(--color-atelier-terracota)]/20 focus:border-[var(--color-atelier-terracota)]/50 rounded-[1.2rem] p-5 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none resize-none h-24 transition-all shadow-sm focus:shadow-md custom-scrollbar"
                        ></textarea>
                      </div>

                      {/* Pergunta 3 */}
                      <div className="flex flex-col gap-3 group">
                        <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors pl-1">
                          <Palette size={14} /> 3. Paleta Cromática
                        </label>
                        <textarea 
                          value={currentRef?.feedback?.q3 || ""} onChange={(e) => handleFeedbackChange("q3", e.target.value)}
                          placeholder="A paleta de cores desperta a sensação correta para o seu mercado?"
                          className="w-full bg-white border border-transparent hover:border-[var(--color-atelier-terracota)]/20 focus:border-[var(--color-atelier-terracota)]/50 rounded-[1.2rem] p-5 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none resize-none h-24 transition-all shadow-sm focus:shadow-md custom-scrollbar"
                        ></textarea>
                      </div>

                      {/* Pergunta 4 */}
                      <div className="flex flex-col gap-3 group">
                        <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 flex items-center gap-2 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors pl-1">
                          <Sparkles size={14} /> 4. Elementos Gráficos
                        </label>
                        <textarea 
                          value={currentRef?.feedback?.q4 || ""} onChange={(e) => handleFeedbackChange("q4", e.target.value)}
                          placeholder="Os elementos (símbolos, texturas) agregam valor ou parecem excessivos?"
                          className="w-full bg-white border border-transparent hover:border-[var(--color-atelier-terracota)]/20 focus:border-[var(--color-atelier-terracota)]/50 rounded-[1.2rem] p-5 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none resize-none h-24 transition-all shadow-sm focus:shadow-md custom-scrollbar"
                        ></textarea>
                      </div>

                      {/* Pergunta 5: Escala de Alinhamento */}
                      <div className="flex flex-col gap-5 group bg-white/70 p-8 rounded-[2rem] border border-white shadow-sm mt-2">
                        <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] flex items-center justify-between w-full">
                          <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[var(--color-atelier-terracota)]"/> 5. Nível de Alinhamento Global</span>
                          <span className="text-white bg-[var(--color-atelier-terracota)] px-4 py-1.5 rounded-full text-[14px] font-black shadow-inner">{currentRef?.score || 0}/10</span>
                        </label>
                        
                        <div className="relative pt-2">
                          <input 
                            type="range" min="0" max="10" step="1" 
                            value={currentRef?.score || 0} onChange={(e) => handleScoreChange(Number(e.target.value))}
                            className="w-full accent-[var(--color-atelier-terracota)] cursor-pointer h-2 bg-black/10 rounded-full appearance-none"
                          />
                        </div>
                        
                        <div className="flex justify-between w-full font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 mt-1">
                          <span>Totalmente Distante</span>
                          <span>Exatamente Isso</span>
                        </div>
                      </div>

                      <button 
                        onClick={saveEvaluation} disabled={isSavingFeedback}
                        className="w-full mt-4 bg-[var(--color-atelier-grafite)] text-white px-6 py-5 rounded-[1.5rem] font-roboto font-bold uppercase tracking-[0.2em] text-[12px] hover:bg-[var(--color-atelier-terracota)] transition-all shadow-md hover:shadow-lg hover:-translate-y-1 duration-300 flex items-center justify-center gap-3 shrink-0 disabled:opacity-50 disabled:hover:translate-y-0"
                      >
                        {isSavingFeedback ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
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