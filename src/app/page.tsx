// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  Lock, Clock, Hash, ChevronRight, ArrowUpRight,
  Eye, FileText, ArrowRight, CheckCircle2, X, Loader2, Target
} from "lucide-react";
import { supabase } from "../lib/supabase"; 
import { motion, AnimatePresence } from "framer-motion";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

const PROJECT_STAGES = [
  { id: 1, name: "Reunião de Alinhamento", dbValue: "reuniao" },
  { id: 2, name: "Estudo e Pesquisa", dbValue: "pesquisa" },
  { id: 3, name: "Direcionamento Criativo", dbValue: "direcionamento" },
  { id: 4, name: "Processo Criativo IDV", dbValue: "processo" },
  { id: 5, name: "Apresentação Oficial", dbValue: "apresentacao" },
];

const ADJETIVOS_LIST = [
  "Elegante", "Acessível", "Confiável", "Amigável", "Criativa", "Divertida", "Formal", 
  "Aventureira", "Aconchegante", "Jovem", "Alto Padrão", "Exclusiva", "Sustentável", 
  "Luxuosa", "Moderna", "Clássica", "Tradicional"
];

export default function Home() {
  // ==========================================
  // ESTADOS DO SUPABASE E LÓGICA DO MOTOR
  // ==========================================
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [diaryPosts, setDiaryPosts] = useState<any[]>([]);
  
  // Status do Briefing
  const [hasBriefing, setHasBriefing] = useState(false);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);

  // ==========================================
  // ESTADOS DO FORMULÁRIO DE BRIEFING NATIVO
  // ==========================================
  const [briefingStep, setBriefingStep] = useState(0);
  const [isSubmittingBriefing, setIsSubmittingBriefing] = useState(false);
  const [briefingSuccess, setBriefingSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '', whatsapp: '', email: '',
    nome_logo: '', significado_nome: '', tagline: '', slogan: '', produtos_servicos: '',
    motivo_abertura: '', proposito: '', tempo_mercado: '', emoji: '', musica: '', sentimento: '', visao_5_anos: '', genero: '', genero_outro: '', classe: '', classe_outro: '', idade: '', idade_outro: '', resumo_publico: '',
    concorrentes_links: '', nao_fazer: '', diferencial: '', referencias: '',
    sentimento_marca: '', sentimento_consumidor: '', missao: '', adjetivos_positivos: [] as string[], adjetivos_positivos_outro: '', top_3_adjetivos: '', adjetivos_negativos: [] as string[], adjetivos_negativos_outro: '',
    simbolo: '', cor_desejada: '', cor_nao_desejada: '', onde_verao: '', logo_atual: '',
    motivo_escolha: '', ideias_livres: ''
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      // 1. Puxa o Perfil (Nome e Foto)
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile) setClientProfile(profile);

     // 2. Puxa o Projeto Ativo e a sua Fase Atual
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle(); 
      
      if (project) {
        setActiveProject(project);
        
        // Verifica se o briefing já foi preenchido
        const { data: briefing } = await supabase
          .from('client_briefings')
          .select('is_completed')
          .eq('project_id', project.id)
          .maybeSingle(); 

        if (briefing && briefing.is_completed) setHasBriefing(true);

        // 3. Puxa o Diário de Bordo Oficial deste projeto COM OS DADOS DO AUTOR
        const { data: diaryData } = await supabase
          .from('diary_posts')
          .select('*, profiles(nome, avatar_url, role)')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false });
          
        if (diaryData) setDiaryPosts(diaryData);
      }
      
      setIsLoading(false);
    };

    fetchDashboardData();
  }, []);

  // Lógica de Renderização do Cofre (Progresso e Desfoque)
  const currentStageIndex = activeProject?.fase ? PROJECT_STAGES.findIndex(s => s.dbValue === activeProject.fase) : 0;
  
  const progressPercent = hasBriefing ? ((currentStageIndex + 1) / PROJECT_STAGES.length) * 100 : 0;
  
  const currentGrayscale = 100 - progressPercent; 
  const currentBlur = hasBriefing ? 30 - (progressPercent * 0.3) : 30; // Vai de 30px até 0px
  const glowOpacity = (progressPercent / 100) * 0.8;

  // Calcula dias restantes
  const calculateDaysLeft = (deadline: string) => {
    if (!deadline) return '--';
    const diffTime = Math.abs(new Date(deadline).getTime() - new Date().getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysLeft = activeProject ? calculateDaysLeft(activeProject.data_limite) : '--';

  // ==========================================
  // FUNÇÕES DO BRIEFING NATIVO
  // ==========================================
  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (category: 'adjetivos_positivos' | 'adjetivos_negativos', value: string) => {
    setFormData(prev => {
      const currentList = prev[category];
      if (currentList.includes(value)) {
        return { ...prev, [category]: currentList.filter(item => item !== value) };
      } else {
        return { ...prev, [category]: [...currentList, value] };
      }
    });
  };

  const validateStep = () => {
    const reqByStep = [
      ['nome', 'whatsapp', 'email'],
      ['nome_logo', 'significado_nome', 'tagline', 'produtos_servicos'],
      ['motivo_abertura', 'proposito', 'tempo_mercado', 'emoji', 'musica', 'sentimento', 'visao_5_anos', 'genero', 'classe', 'idade', 'resumo_publico'],
      ['concorrentes_links', 'referencias'],
      ['sentimento_marca', 'sentimento_consumidor', 'missao', 'top_3_adjetivos'],
      ['simbolo', 'cor_desejada', 'cor_nao_desejada', 'onde_verao'],
      [] // Step 6 opcional
    ];

    const missing = reqByStep[briefingStep].filter((field) => !(formData as any)[field] || (formData as any)[field].trim() === "");
    if (missing.length > 0) {
      showToast("Por favor, preencha todos os campos obrigatórios (*).");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep()) {
      setBriefingStep(s => Math.min(s + 1, 6));
      document.getElementById('briefing-modal-top')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setBriefingStep(s => Math.max(s - 1, 0));
    document.getElementById('briefing-modal-top')?.scrollIntoView({ behavior: 'smooth' });
  };

  const submitBriefing = async () => {
    if (!activeProject || !userId) return;
    setIsSubmittingBriefing(true);

    try {
      const { error } = await supabase.from('client_briefings').upsert({
        project_id: activeProject.id,
        client_id: userId,
        answers: formData,
        is_completed: true
      }, { onConflict: 'project_id' });

      if (error) throw error;

      setBriefingSuccess(true);
      setHasBriefing(true);
    } catch (error) {
      console.error(error);
      showToast("Erro ao enviar briefing. Tente novamente.");
    } finally {
      setIsSubmittingBriefing(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-8">
      
      {/* ==========================================
          MODAL DO BRIEFING NATIVO
          ========================================== */}
      <AnimatePresence>
        {isBriefingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsBriefingModalOpen(false)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[#FEF5E6] w-full h-full max-w-3xl rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden border border-white">
              
              <div id="briefing-modal-top" className="p-4 border-b border-[#5c4b3c]/10 flex justify-between items-center bg-white/50 shrink-0">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-[#8c6e54]" />
                  <span className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[#5c4b3c]">Briefing Estratégico</span>
                </div>
                <button onClick={() => setIsBriefingModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#5c4b3c]/5 text-[#5c4b3c] hover:bg-[#8c6e54] hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 relative">
                
                {briefingSuccess ? (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                    <div className="w-20 h-20 rounded-full bg-[#8c6e54]/10 flex items-center justify-center mb-6">
                      <CheckCircle2 size={40} className="text-[#8c6e54]" />
                    </div>
                    <h2 className="font-elegant text-4xl text-[#8c6e54] mb-4">Tudo certo!</h2>
                    <p className="font-roboto text-[14px] text-[#5c4b3c]/80 leading-relaxed mb-8">
                      Suas respostas foram enviadas com sucesso e salvas diretamente no cofre do seu projeto.<br/><br/>
                      Fique de olho, o Atelier foi notificado e iniciaremos a análise estratégica em breve!
                    </p>
                    <button onClick={() => setIsBriefingModalOpen(false)} className="bg-[#8c6e54] text-white px-8 py-3 rounded-full font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-[#7a5f49] transition-colors shadow-md">
                      Voltar ao Cofre
                    </button>
                  </motion.div>
                ) : (
                  <div className="max-w-2xl mx-auto flex flex-col gap-8">
                    
                    {/* Cabeçalho do Form */}
                    <div className="text-center mb-6">
                       <h1 className="font-elegant text-4xl md:text-5xl text-[#5c4b3c] mb-6">Formulário de Briefing</h1>
                       <div className="w-full h-2 bg-[#8c6e54]/10 rounded-full overflow-hidden">
                         <div className="h-full bg-[#8c6e54] transition-all duration-500" style={{ width: `${((briefingStep + 1) / 7) * 100}%` }}></div>
                       </div>
                    </div>

                    {/* STEP 0: Contato */}
                    {briefingStep === 0 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                        <div className="bg-[#8c6e54]/5 p-6 rounded-2xl border border-[#8c6e54]/10 mb-2">
                          <p className="font-roboto text-[14px] text-[#5c4b3c] mb-3"><strong>Oii, seja bem-vindo!</strong></p>
                          <p className="font-roboto text-[13px] text-[#5c4b3c]/80 mb-2 leading-relaxed">Esse formulário é o ponto de partida do nosso projeto. Quanto mais eu entender sua empresa, seus objetivos e sua marca, melhor será o resultado.</p>
                          <p className="font-roboto text-[13px] text-[#5c4b3c]/80 mb-2 leading-relaxed">Por isso, peço que responda com calma. <strong>Não use inteligência artificial para responder</strong>. Quero a sua visão e seu jeito de falar.</p>
                        </div>
                        
                        <h2 className="font-elegant text-2xl text-[#8c6e54] border-b border-[#8c6e54]/20 pb-2">Dados de Contato</h2>
                        
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Seu Nome *</label>
                          <input type="text" name="nome" value={formData.nome} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">WhatsApp (com DDD) *</label>
                          <input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">E-mail *</label>
                          <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 1: Seção 1 */}
                    {briefingStep === 1 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                        <h2 className="font-elegant text-2xl text-[#8c6e54] border-b border-[#8c6e54]/20 pb-2">Seção 1 de 6</h2>
                        
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Nome no logotipo *</label>
                          <input type="text" name="nome_logo" value={formData.nome_logo} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Significado do nome *</label>
                          <textarea name="significado_nome" value={formData.significado_nome} onChange={handleInputChange} className="w-full h-20 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Usar tagline? *</label>
                          <p className="text-[10px] text-[#5c4b3c]/60">Ex: Nutricionista, Engenharia...</p>
                          <input type="text" name="tagline" value={formData.tagline} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Slogan (Opcional)</label>
                          <p className="text-[10px] text-[#5c4b3c]/60">Ex: Feito para você</p>
                          <input type="text" name="slogan" value={formData.slogan} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Seus produtos/serviços *</label>
                          <textarea name="produtos_servicos" value={formData.produtos_servicos} onChange={handleInputChange} className="w-full h-20 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 2: Seção 2 */}
                    {briefingStep === 2 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                        <h2 className="font-elegant text-2xl text-[#8c6e54] border-b border-[#8c6e54]/20 pb-2">Seção 2 de 6: História e Público</h2>
                        
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Motivo de abertura *</label>
                          <textarea name="motivo_abertura" value={formData.motivo_abertura} onChange={handleInputChange} className="w-full h-20 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Propósito além de vender *</label>
                          <textarea name="proposito" value={formData.proposito} onChange={handleInputChange} className="w-full h-20 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Tempo de mercado *</label>
                          <input type="text" name="tempo_mercado" value={formData.tempo_mercado} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Emoji da Empresa *</label>
                          <input type="text" name="emoji" value={formData.emoji} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Música da Empresa *</label>
                          <input type="text" name="musica" value={formData.musica} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Qual sentimento vende? *</label>
                          <input type="text" name="sentimento" value={formData.sentimento} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Empresa em 5 anos *</label>
                          <textarea name="visao_5_anos" value={formData.visao_5_anos} onChange={handleInputChange} className="w-full h-20 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Gênero do Público *</label>
                          <select name="genero" value={formData.genero} onChange={handleInputChange} className="w-full bg-white/50 border border-[#5c4b3c]/10 rounded-lg p-3 outline-none focus:border-[#8c6e54]">
                            <option value="">Selecione...</option>
                            <option value="Predominantemente feminino">Predominantemente feminino</option>
                            <option value="Predominantemente masculino">Predominantemente masculino</option>
                            <option value="Ambos">Ambos os gêneros</option>
                            <option value="Outro">Outro...</option>
                          </select>
                          {formData.genero === 'Outro' && <input type="text" name="genero_outro" value={formData.genero_outro} onChange={handleInputChange} placeholder="Qual?" className="w-full bg-transparent border-b border-[#5c4b3c]/30 py-2 text-[14px] mt-1" />}
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Classe Social *</label>
                          <select name="classe" value={formData.classe} onChange={handleInputChange} className="w-full bg-white/50 border border-[#5c4b3c]/10 rounded-lg p-3 outline-none focus:border-[#8c6e54]">
                            <option value="">Selecione...</option>
                            <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="Outro">Outro...</option>
                          </select>
                          {formData.classe === 'Outro' && <input type="text" name="classe_outro" value={formData.classe_outro} onChange={handleInputChange} placeholder="Qual?" className="w-full bg-transparent border-b border-[#5c4b3c]/30 py-2 text-[14px] mt-1" />}
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Idade do Público *</label>
                          <select name="idade" value={formData.idade} onChange={handleInputChange} className="w-full bg-white/50 border border-[#5c4b3c]/10 rounded-lg p-3 outline-none focus:border-[#8c6e54]">
                            <option value="">Selecione...</option>
                            <option value="Crianças">Crianças</option><option value="Adolescentes">Adolescentes</option><option value="Jovens">Jovens Adultos</option><option value="Adultos">Adultos</option><option value="Idosos">Idosos</option><option value="Outro">Outro...</option>
                          </select>
                          {formData.idade === 'Outro' && <input type="text" name="idade_outro" value={formData.idade_outro} onChange={handleInputChange} placeholder="Qual?" className="w-full bg-transparent border-b border-[#5c4b3c]/30 py-2 text-[14px] mt-1" />}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Resumo do Público *</label>
                          <textarea name="resumo_publico" value={formData.resumo_publico} onChange={handleInputChange} className="w-full h-20 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 3: Seção 3 */}
                    {briefingStep === 3 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                        <h2 className="font-elegant text-2xl text-[#8c6e54] border-b border-[#8c6e54]/20 pb-2">Seção 3 de 6: Concorrentes e Referências</h2>
                        
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Links dos Concorrentes *</label>
                          <textarea name="concorrentes_links" value={formData.concorrentes_links} onChange={handleInputChange} className="w-full h-20 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">O que NÃO fazer (Opcional)</label>
                          <textarea name="nao_fazer" value={formData.nao_fazer} onChange={handleInputChange} className="w-full h-20 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Diferencial (Opcional)</label>
                          <textarea name="diferencial" value={formData.diferencial} onChange={handleInputChange} className="w-full h-20 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Links de Referências/Inspirações *</label>
                          <textarea name="referencias" value={formData.referencias} onChange={handleInputChange} className="w-full h-20 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 4: Seção 4 (Sentimentos e Adjetivos) */}
                    {briefingStep === 4 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                        <h2 className="font-elegant text-2xl text-[#8c6e54] border-b border-[#8c6e54]/20 pb-2">Seção 4 de 6: Sentimentos</h2>
                        
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Sentimento da Marca *</label>
                          <input type="text" name="sentimento_marca" value={formData.sentimento_marca} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Sentimento do Consumidor *</label>
                          <textarea name="sentimento_consumidor" value={formData.sentimento_consumidor} onChange={handleInputChange} className="w-full h-20 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Missão da Marca *</label>
                          <textarea name="missao" value={formData.missao} onChange={handleInputChange} className="w-full h-20 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>

                        {/* Checkboxes Positivos */}
                        <div className="flex flex-col gap-3">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Adjetivos que adequam à marca *</label>
                          <div className="grid grid-cols-2 gap-2">
                            {ADJETIVOS_LIST.map(adj => (
                              <label key={`pos_${adj}`} className="flex items-center gap-2 text-[13px] text-[#5c4b3c] cursor-pointer">
                                <input type="checkbox" checked={formData.adjetivos_positivos.includes(adj)} onChange={() => handleCheckboxChange('adjetivos_positivos', adj)} className="accent-[#8c6e54] w-4 h-4" />
                                {adj}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 mt-2">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Top 3 Adjetivos *</label>
                          <input type="text" name="top_3_adjetivos" value={formData.top_3_adjetivos} onChange={handleInputChange} placeholder="Ex: Elegante, Moderna, Exclusiva" className="w-full bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>

                        {/* Checkboxes Negativos */}
                        <div className="flex flex-col gap-3 mt-4">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Adjetivos que NÃO representam a marca * (Escolha 3)</label>
                          <div className="grid grid-cols-2 gap-2">
                            {ADJETIVOS_LIST.map(adj => (
                              <label key={`neg_${adj}`} className="flex items-center gap-2 text-[13px] text-[#5c4b3c] cursor-pointer">
                                <input type="checkbox" checked={formData.adjetivos_negativos.includes(adj)} onChange={() => handleCheckboxChange('adjetivos_negativos', adj)} className="accent-[#8c6e54] w-4 h-4" />
                                {adj}
                              </label>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 5: Seção 5 */}
                    {briefingStep === 5 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                        <h2 className="font-elegant text-2xl text-[#8c6e54] border-b border-[#8c6e54]/20 pb-2">Seção 5 de 6: Preferências Visuais</h2>
                        
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Quer um símbolo específico? *</label>
                          <input type="text" name="simbolo" value={formData.simbolo} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Quer uma cor em específico? *</label>
                          <input type="text" name="cor_desejada" value={formData.cor_desejada} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Existe cor que NÃO quer? *</label>
                          <input type="text" name="cor_nao_desejada" value={formData.cor_nao_desejada} onChange={handleInputChange} className="w-full bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Onde o público verá sua IDV? *</label>
                          <textarea name="onde_verao" value={formData.onde_verao} onChange={handleInputChange} className="w-full h-20 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">O que gosta/não gosta no logo atual (Opcional)</label>
                          <textarea name="logo_atual" value={formData.logo_atual} onChange={handleInputChange} className="w-full h-20 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 6: Seção 6 */}
                    {briefingStep === 6 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                        <h2 className="font-elegant text-2xl text-[#8c6e54] border-b border-[#8c6e54]/20 pb-2">Seção 6 de 6: Finalização</h2>
                        
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Por que me escolheu para essa etapa? (Opcional)</label>
                          <textarea name="motivo_escolha" value={formData.motivo_escolha} onChange={handleInputChange} className="w-full h-20 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[#8c6e54]">Considerações Finais (Opcional)</label>
                          <p className="text-[11px] text-[#5c4b3c]/70 leading-relaxed mb-2">Aqui, você não precisa ter vergonha! Nenhuma ideia é boba demais. Compartilhe ideias que você já teve, mas nunca tirou do papel.</p>
                          <textarea name="ideias_livres" value={formData.ideias_livres} onChange={handleInputChange} className="w-full h-32 resize-none bg-transparent border-b border-[#5c4b3c]/30 focus:border-[#8c6e54] py-2 text-[15px] text-[#5c4b3c] outline-none transition-colors" />
                        </div>
                      </motion.div>
                    )}

                    {/* Navegação Inferior */}
                    <div className="flex justify-between items-center pt-8 mt-4 border-t border-[#8c6e54]/10">
                      {briefingStep > 0 ? (
                        <button onClick={handlePrevStep} className="px-6 py-2.5 rounded-full border border-[#8c6e54] text-[#8c6e54] font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-[#8c6e54]/5 transition-colors">
                          Anterior
                        </button>
                      ) : <div></div>}
                      
                      {briefingStep < 6 ? (
                        <button onClick={handleNextStep} className="px-8 py-3 rounded-full bg-[#8c6e54] text-white font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-[#7a5f49] shadow-md transition-all hover:-translate-y-0.5">
                          Próximo Passo
                        </button>
                      ) : (
                        <button onClick={submitBriefing} disabled={isSubmittingBriefing} className="px-8 py-3 rounded-full bg-[#8c6e54] text-white font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-[#7a5f49] shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2">
                          {isSubmittingBriefing && <Loader2 size={14} className="animate-spin"/>} Enviar Briefing
                        </button>
                      )}
                    </div>

                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          1. CABEÇALHO CONCIERGE & CONTROLES
          ========================================== */}
      <header className="pt-4 flex justify-between items-end shrink-0 animate-[fadeInUp_0.8s_ease-out]">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="relative w-6 h-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-[var(--color-atelier-terracota)] blur-md opacity-30 animate-pulse"></div>
              <img src="/images/Símbolo Rosa.png" alt="Atelier Logo" className="w-full h-full object-contain relative z-10 animate-[pulse_3s_ease-in-out_infinite]" />
            </div>
            <span className="micro-title text-[var(--color-atelier-terracota)] tracking-[0.3em]">
              Fase Atual: {PROJECT_STAGES[currentStageIndex]?.name || 'Aguardando Fundação'}
            </span>
          </div>
          
          <h1 className="font-elegant text-6xl md:text-7xl text-[var(--color-atelier-grafite)] tracking-wide leading-[1.1]">
            Bem-vindo de volta,<br />
            <span className="text-[var(--color-atelier-terracota)] italic pr-4">{clientProfile?.nome?.split(' ')[0] || "Cliente"}</span>.
          </h1>
        </div>
      </header>

      {/* ==========================================
          2. O GRID PRINCIPAL (Cofre + Lateral)
          ========================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0 animate-[fadeInUp_1s_ease-out_0.2s_both]">
        
        {/* COLUNA ESQUERDA (O COFRE E A LINHA DO TEMPO) */}
        <div className="lg:col-span-8 flex flex-col h-full">
          <div className="relative w-full h-full rounded-[3rem] overflow-hidden shadow-[0_30px_60px_rgba(122,116,112,0.15)] group cursor-default border border-white/60">
            
            <div className="absolute inset-0 bg-cover bg-center scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')", filter: `grayscale(${currentGrayscale}%) blur(${currentBlur}px)`, transition: "filter 1.5s ease-out" }}></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-atelier-creme)]/95 via-[var(--color-atelier-creme)]/60 to-transparent backdrop-blur-sm"></div>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--color-atelier-terracota)] rounded-full blur-[120px] mix-blend-overlay transition-opacity duration-[2s]" style={{ opacity: glowOpacity }}></div>

            <div className="absolute inset-0 p-10 md:p-14 flex flex-col justify-between z-10">
              
              <div className="flex justify-between items-start">
                <div className="bg-white/80 backdrop-blur-xl border border-white px-5 py-3 rounded-full flex items-center gap-3 shadow-sm">
                  <Lock size={16} className="text-[var(--color-atelier-terracota)]" />
                  <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">O Cofre de Identidade</span>
                </div>
                
                <div className="text-right">
                  <p className="micro-title text-[var(--color-atelier-grafite)]/70 mb-1">Revelação em</p>
                  <p className="font-elegant text-[2.5rem] flex items-center justify-end gap-2 drop-shadow-sm text-[var(--color-atelier-terracota)]">
                    <Clock size={20} className="opacity-40" /> {daysLeft} Dias
                  </p>
                </div>
              </div>

              <div className="max-w-3xl">
                <h2 className="font-elegant text-5xl md:text-6xl text-[var(--color-atelier-grafite)] mb-10 leading-[1.1]">
                  A sua marca está ganhando forma e alma.
                </h2>
                
                <div className="w-full mt-4">
                  <div className="flex justify-between items-center relative z-10 px-2">
                    {PROJECT_STAGES.map((stage, index) => {
                      const isCompleted = index < currentStageIndex;
                      const isCurrent = index === currentStageIndex && hasBriefing; 
                      const isPending = index > currentStageIndex || !hasBriefing;

                      return (
                        <div key={stage.id} className="flex flex-col items-center gap-3 relative z-10 group w-32">
                          <div className={`
                            w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-500 z-10
                            ${isCompleted ? 'bg-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)] text-white scale-110' : ''}
                            ${isCurrent ? 'bg-white border-[var(--color-atelier-terracota)] shadow-[0_0_20px_rgba(173,111,64,0.6)] scale-125' : ''}
                            ${isPending ? 'bg-white/40 border-white/80' : ''}
                          `}>
                            {isCurrent && <div className="w-2 h-2 bg-[var(--color-atelier-terracota)] rounded-full animate-pulse"></div>}
                            {isCompleted && <CheckCircle2 size={12} strokeWidth={3} />}
                          </div>
                          
                          <span className={`
                            font-roboto text-[10px] uppercase tracking-widest font-bold text-center transition-colors duration-500
                            ${isCurrent ? 'text-[var(--color-atelier-terracota)] drop-shadow-sm' : 'text-[var(--color-atelier-grafite)]/50'}
                            ${isCompleted ? 'text-[var(--color-atelier-grafite)]' : ''}
                          `}>
                            {stage.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  
                  <div className="relative h-1 w-[calc(100%-8rem)] mx-auto -mt-10 bg-white/40 rounded-full z-0 overflow-hidden shadow-inner">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-[var(--color-atelier-rose)] to-[var(--color-atelier-terracota)] transition-all duration-1000 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (Briefing e Diário) */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full min-h-0">
          
          {/* MÓDULO DE AÇÃO: BOTÃO DE BRIEFING */}
          {!hasBriefing ? (
             <div className="glass-panel px-5 py-4 rounded-[1.5rem] flex items-center justify-between gap-4 shrink-0 bg-gradient-to-r from-white/90 to-white/50 border border-white shadow-[0_8px_20px_rgba(173,111,64,0.05)]">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0">
                   <FileText size={16} strokeWidth={2} />
                 </div>
                 <div className="flex flex-col">
                   <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] leading-none mb-1">Briefing Oficial</span>
                   <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/60 leading-tight">O guia da sua marca.</span>
                 </div>
               </div>
               <button onClick={() => setIsBriefingModalOpen(true)} className="bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] px-5 py-2.5 rounded-full font-roboto font-bold uppercase tracking-widest text-[10px] hover:bg-[var(--color-atelier-terracota)] transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 shrink-0 flex items-center gap-2">
                 Responder <ArrowUpRight size={12}/>
               </button>
             </div>
          ) : (
            <div className="px-5 py-3 rounded-[1.5rem] flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-700 shrink-0">
               <CheckCircle2 size={16} />
               <span className="font-roboto text-[10px] font-bold uppercase tracking-[0.2em]">Fundação Estabelecida.</span>
            </div>
          )}

          {/* DIÁRIO DO ATELIER */}
          <div className="glass-panel flex-1 rounded-[2.5rem] flex flex-col overflow-hidden relative min-h-0">
             <div className="px-6 py-5 border-b border-[var(--color-atelier-grafite)]/10 bg-white/30 backdrop-blur-md z-10 flex justify-between items-center shrink-0">
               <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] flex items-center gap-2">
                 <Eye size={18} className="text-[var(--color-atelier-terracota)]" /> Diário de Bordo
               </h3>
               <ArrowUpRight size={16} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] cursor-pointer" />
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-8">
               {diaryPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-40 text-center">
                    <Eye size={32} className="mb-2 text-[var(--color-atelier-terracota)]" />
                    <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]">O diário de bordo está em branco.<br/>O Atelier publicará as atualizações aqui.</p>
                  </div>
               ) : (
                 diaryPosts.map((post) => (
                    <div key={post.id} className="group cursor-pointer border-b border-[var(--color-atelier-grafite)]/10 pb-6 last:border-none">
                      {post.image_url && (
                        <div className="w-full h-[220px] rounded-[1.5rem] overflow-hidden mb-4 relative shadow-sm group-hover:shadow-md transition-all">
                          <img src={post.image_url} alt="Estudo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out" />
                          <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-atelier-terracota)]"></span>
                            <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">
                              Atualização
                            </span>
                          </div>
                        </div>
                      )}
                      <h4 className="font-elegant text-[22px] text-[var(--color-atelier-grafite)] mb-2 leading-tight group-hover:text-[var(--color-atelier-terracota)] transition-colors">{post.title}</h4>
                      <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                      
                      {/* ASSINATURA DA POSTAGEM (AUTOR E HORA EXATA) */}
                      <div className="mt-4 flex items-center justify-between border-t border-[var(--color-atelier-grafite)]/5 pt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[var(--color-atelier-terracota)]/10 overflow-hidden flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0 border border-[var(--color-atelier-terracota)]/20">
                            {post.profiles?.avatar_url ? (
                              <img src={post.profiles.avatar_url} alt={post.profiles.nome} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-elegant text-xs">{post.profiles?.nome?.charAt(0) || "A"}</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-roboto text-[10px] font-bold text-[var(--color-atelier-grafite)] leading-none">{post.profiles?.nome || "Equipa Atelier"}</span>
                            <span className="font-roboto text-[8px] uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-0.5">{post.profiles?.role === 'admin' ? 'Designer' : 'Diretor(a)'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[var(--color-atelier-grafite)]/40">
                          <Clock size={12} />
                          <span className="font-roboto text-[9px] uppercase tracking-widest font-bold">
                            {new Date(post.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} às {new Date(post.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                    </div>
                 ))
               )}
             </div>
          </div>

        </div>
      </section>
    </div>
  );
}