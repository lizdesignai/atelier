// src/components/BriefingModal.tsx
"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, X, CheckCircle2, Loader2, UploadCloud, Send, Image as ImageIcon } from "lucide-react";
import { supabase } from "../lib/supabase";

const ADJETIVOS_LIST = [
  "Elegante", "Acessível", "Confiável", "Amigável", "Criativa", "Divertida", "Formal", 
  "Aventureira", "Aconchegante", "Jovem", "Alto Padrão", "Exclusiva", "Sustentável", 
  "Luxuosa", "Moderna", "Clássica", "Tradicional"
];

interface BriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  clientId: string;
  onSuccess: () => void;
}

export default function BriefingModal({ isOpen, onClose, projectId, clientId, onSuccess }: BriefingModalProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    nome: '', whatsapp: '', email: '',
    nome_logo: '', significado_nome: '', tagline: '', slogan: '', produtos_servicos: '',
    motivo_abertura: '', proposito: '', tempo_mercado: '', emoji: '', musica: '', sentimento: '', visao_5_anos: '', 
    genero: '', genero_outro: '', classe: '', classe_outro: '', idade: '', idade_outro: '', resumo_publico: '',
    concorrentes_links: '', nao_fazer: '', diferencial: '', referencias: '',
    sentimento_marca: '', sentimento_consumidor: '', missao: '', 
    adjetivos_positivos: [] as string[], adjetivos_positivos_outro: '', top_3_adjetivos: '', 
    adjetivos_negativos: [] as string[], adjetivos_negativos_outro: '',
    simbolo: '', cor_desejada: '', cor_nao_desejada: '', onde_verao: '', logo_atual: '', logo_atual_url: '',
    motivo_escolha: '', ideias_livres: ''
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (category: 'adjetivos_positivos' | 'adjetivos_negativos', value: string) => {
    setFormData(prev => {
      const list = prev[category];
      if (list.includes(value)) return { ...prev, [category]: list.filter(i => i !== value) };
      return { ...prev, [category]: [...list, value] };
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const validateStep = () => {
    const reqByStep = [
      ['nome', 'whatsapp', 'email'],
      ['nome_logo', 'significado_nome', 'tagline', 'produtos_servicos'],
      ['motivo_abertura', 'proposito', 'tempo_mercado', 'emoji', 'musica', 'sentimento', 'visao_5_anos', 'genero', 'classe', 'idade', 'resumo_publico'],
      ['concorrentes_links', 'referencias'],
      ['sentimento_marca', 'sentimento_consumidor', 'missao', 'top_3_adjetivos'],
      ['simbolo', 'cor_desejada', 'cor_nao_desejada', 'onde_verao'],
      [] 
    ];

    const missing = reqByStep[step].filter((field) => {
      const val = (formData as any)[field];
      return !val || (Array.isArray(val) && val.length === 0) || (typeof val === 'string' && val.trim() === "");
    });

    if (missing.length > 0) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Por favor, preencha todos os campos obrigatórios (*)." }));
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(s => Math.min(s + 1, 6));
      scrollToTop();
    }
  };

  const handlePrev = () => {
    setStep(s => Math.max(s - 1, 0));
    scrollToTop();
  };

  const submitBriefing = async () => {
    if (!validateStep()) return;
    setIsSubmitting(true);

    try {
      let finalLogoUrl = "";
      
      // Upload do Logo Se existir
      if (logoFile) {
        setIsUploadingLogo(true);
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${projectId}_logo_antigo_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('briefing_assets').upload(fileName, logoFile);
        
        if (!uploadError) {
          const { data } = supabase.storage.from('briefing_assets').getPublicUrl(fileName);
          finalLogoUrl = data.publicUrl;
        }
        setIsUploadingLogo(false);
      }

      const finalData = { ...formData, logo_atual_url: finalLogoUrl };

      const { error } = await supabase.from('client_briefings').upsert({
        project_id: projectId,
        client_id: clientId,
        answers: finalData,
        is_completed: true
      }, { onConflict: 'project_id' });

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 3000);

    } catch (error) {
      console.error(error);
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Erro ao enviar briefing. Tente novamente." }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 md:p-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        
        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[#FEF5E6] w-full h-full max-w-3xl rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden border border-white">
          
          {/* HEADER DO MODAL */}
          <div className="p-5 border-b border-[var(--color-atelier-grafite)]/10 flex justify-between items-center bg-white/50 shrink-0">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-[var(--color-atelier-terracota)]" />
              <span className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Briefing Estratégico</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 relative">
            {isSuccess ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto py-10">
                <div className="w-24 h-24 rounded-full bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center mb-6 border border-[var(--color-atelier-terracota)]/20">
                  <CheckCircle2 size={48} className="text-[var(--color-atelier-terracota)]" />
                </div>
                <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-4">Tudo certo!</h2>
                <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/80 leading-relaxed mb-8">
                  Suas respostas foram enviadas com sucesso e salvas diretamente no cofre do seu projeto.<br/><br/>
                  Fique de olho, o Atelier foi notificado e iniciaremos a análise estratégica em breve!
                </p>
                <button onClick={onClose} className="bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] px-8 py-4 rounded-xl font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-md">
                  Voltar à Mesa de Trabalho
                </button>
              </motion.div>
            ) : (
              <div className="max-w-2xl mx-auto flex flex-col gap-8 pb-10">
                
                {/* PROGRESSO E TÍTULO */}
                <div className="text-center mb-6">
                   <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] mb-6">Formulário de Briefing</h1>
                   <div className="w-full h-2 bg-[var(--color-atelier-terracota)]/10 rounded-full overflow-hidden">
                     <div className="h-full bg-[var(--color-atelier-terracota)] transition-all duration-500" style={{ width: `${((step + 1) / 7) * 100}%` }}></div>
                   </div>
                </div>

                {/* STEP 0: Boas-vindas e Contato */}
                {step === 0 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                    <div className="bg-[var(--color-atelier-terracota)]/5 p-6 rounded-2xl border border-[var(--color-atelier-terracota)]/10 mb-2">
                      <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)] mb-3"><strong>Oii, seja bem-vindo!</strong></p>
                      <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/80 mb-2 leading-relaxed">Esse formulário é o ponto de partida do nosso projeto e vai guiar todo o processo. Quanto mais eu entender sua empresa, seus objetivos e sua marca, melhor será o resultado.</p>
                      <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/80 mb-2 leading-relaxed">Por isso, peço que responda com calma e sinceridade. Respostas genéricas geram resultados genéricos, e sua marca merece ser única!</p>
                      <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/80 mb-2 leading-relaxed">Por favor, <strong>não use inteligência artificial para responder</strong>. Quero a sua visão, sua história e seu jeito de falar.</p>
                    </div>
                    
                    <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] border-b border-[var(--color-atelier-grafite)]/10 pb-2">Dados de Contato</h2>
                    
                    <InputGroup label="Seu Nome *" name="nome" value={formData.nome} onChange={handleInput} />
                    <InputGroup label="Seu WhatsApp (com DDD) *" name="whatsapp" value={formData.whatsapp} onChange={handleInput} type="tel" />
                    <InputGroup label="Seu melhor E-mail *" name="email" value={formData.email} onChange={handleInput} type="email" />
                  </motion.div>
                )}

                {/* STEP 1 */}
                {step === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                    <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] border-b border-[var(--color-atelier-grafite)]/10 pb-2">Seção 1 de 6</h2>
                    
                    <InputGroup label="Qual nome usaremos no logotipo? *" name="nome_logo" value={formData.nome_logo} onChange={handleInput} />
                    <TextareaGroup label="Qual é o significado do nome? Qual o motivo da escolha dele? *" name="significado_nome" value={formData.significado_nome} onChange={handleInput} />
                    <InputGroup label="Gostaria de usar uma tagline? *" name="tagline" value={formData.tagline} onChange={handleInput} helper="Tagline é uma frase que acompanha o logo, ajudando a comunicar o nicho. Ex: NUTRICIONISTA, ENGENHARIA" />
                    <InputGroup label="A empresa possui um slogan?" name="slogan" value={formData.slogan} onChange={handleInput} helper="Ex: Tim: Você sem fronteiras / Itaú: Feito para você" />
                    <TextareaGroup label="Explique brevemente os seus produtos/serviços *" name="produtos_servicos" value={formData.produtos_servicos} onChange={handleInput} />
                  </motion.div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                    <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] border-b border-[var(--color-atelier-grafite)]/10 pb-2">Seção 2 de 6: História e Público</h2>
                    
                    <TextareaGroup label="Por qual motivo você resolveu abrir a empresa? Por quê escolheu essa área? *" name="motivo_abertura" value={formData.motivo_abertura} onChange={handleInput} helper="Toda marca nasce de um sonho. Me conta sobre o seu." />
                    <TextareaGroup label="Qual é o propósito por trás do que você faz, além de vender? *" name="proposito" value={formData.proposito} onChange={handleInput} />
                    <InputGroup label="Há quanto tempo a marca está no mercado? *" name="tempo_mercado" value={formData.tempo_mercado} onChange={handleInput} />
                    <InputGroup label="Se a sua empresa fosse um emoji, qual ela seria? *" name="emoji" value={formData.emoji} onChange={handleInput} helper="Pode escolher mais de um" />
                    <InputGroup label="Se sua empresa fosse uma música, qual ela seria? *" name="musica" value={formData.musica} onChange={handleInput} helper="Pode escolher mais de uma" />
                    <InputGroup label="Se a sua empresa não vendesse um produto/serviço, mas sim um sentimento, qual seria? *" name="sentimento" value={formData.sentimento} onChange={handleInput} helper="Ex: Confiança, segurança. autoestima..." />
                    <TextareaGroup label="Como você vê a empresa em 5 anos? *" name="visao_5_anos" value={formData.visao_5_anos} onChange={handleInput} />

                    <SelectGroup label="Qual é o gênero do seu público alvo? *" name="genero" value={formData.genero} onChange={handleInput} options={['Predominantemente feminino', 'Predominantemente masculino', '100% feminino', '100% masculino', 'Ambos os gêneros', 'Outro']} />
                    {formData.genero === 'Outro' && <InputGroup label="Qual?" name="genero_outro" value={formData.genero_outro} onChange={handleInput} />}

                    <SelectGroup label="Qual é a classe social do seu público? *" name="classe" value={formData.classe} onChange={handleInput} options={['A', 'B', 'C', 'D', 'Outro']} />
                    {formData.classe === 'Outro' && <InputGroup label="Qual?" name="classe_outro" value={formData.classe_outro} onChange={handleInput} />}

                    <SelectGroup label="Qual é a média de idade do seu público alvo? *" name="idade" value={formData.idade} onChange={handleInput} options={['Crianças', 'Adolescentes', 'Jovens adultos', 'Adultos', 'Idosos', 'Outro']} />
                    {formData.idade === 'Outro' && <InputGroup label="Qual?" name="idade_outro" value={formData.idade_outro} onChange={handleInput} />}

                    <TextareaGroup label="Brevemente, fale sobre o seu público alvo *" name="resumo_publico" value={formData.resumo_publico} onChange={handleInput} helper="Ex: Mulheres entre 25 e 40 anos, que trabalham o dia todo..." />
                  </motion.div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                    <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] border-b border-[var(--color-atelier-grafite)]/10 pb-2">Seção 3 de 6: Concorrentes e Referências</h2>
                    
                    <TextareaGroup label="Me envie o link dos perfis ou sites dos seus principais concorrentes *" name="concorrentes_links" value={formData.concorrentes_links} onChange={handleInput} helper="Empresas que vendem serviços semelhantes para um público semelhante" />
                    <TextareaGroup label="Tem algo que você vê nos seus concorrentes e que NÃO quer fazer?" name="nao_fazer" value={formData.nao_fazer} onChange={handleInput} />
                    <TextareaGroup label="A sua empresa tem um diferencial?" name="diferencial" value={formData.diferencial} onChange={handleInput} helper="Respostas como 'qualidade' não são diferenciais. Se não conseguir pensar num, pode pular!" />
                    <TextareaGroup label="Me envie o link de perfis ou projetos que você tem como referência *" name="referencias" value={formData.referencias} onChange={handleInput} helper="Caso prefira, me envia as imagens no WhatsApp" />
                  </motion.div>
                )}

                {/* STEP 4 */}
                {step === 4 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                    <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] border-b border-[var(--color-atelier-grafite)]/10 pb-2">Seção 4 de 6: Sentimentos e Adjetivos</h2>
                    
                    <InputGroup label="Qual sentimento que você deseja que as pessoas atribuam à sua marca? *" name="sentimento_marca" value={formData.sentimento_marca} onChange={handleInput} />
                    <TextareaGroup label="O que as pessoas costumam dizer ou sentir quando consomem seu produto/serviço? *" name="sentimento_consumidor" value={formData.sentimento_consumidor} onChange={handleInput} />
                    <TextareaGroup label="Qual é a missão da marca? *" name="missao" value={formData.missao} onChange={handleInput} helper="Ex: Oferecer refeições saudáveis e acessíveis para quem busca praticidade." />

                    <div className="flex flex-col gap-3 bg-white/40 p-6 rounded-2xl border border-white">
                      <label className="font-roboto text-[12px] font-bold text-[var(--color-atelier-grafite)]">Selecione os adjetivos que se adequam à sua marca *</label>
                      <p className="text-[11px] text-[var(--color-atelier-grafite)]/50 mb-2">Não marque adjetivos opostos (ex: moderna e clássica).</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {ADJETIVOS_LIST.map(adj => (
                          <label key={`pos_${adj}`} className="flex items-center gap-2 text-[13px] text-[var(--color-atelier-grafite)] cursor-pointer hover:opacity-80 transition-opacity">
                            <input type="checkbox" checked={formData.adjetivos_positivos.includes(adj)} onChange={() => handleCheckbox('adjetivos_positivos', adj)} className="accent-[var(--color-atelier-terracota)] w-4 h-4 cursor-pointer" />
                            {adj}
                          </label>
                        ))}
                      </div>
                      <div className="mt-3">
                        <InputGroup label="Outro:" name="adjetivos_positivos_outro" value={formData.adjetivos_positivos_outro} onChange={handleInput} />
                      </div>
                    </div>

                    <InputGroup label="Das opções selecionadas, quais são as 3 mais relevantes? *" name="top_3_adjetivos" value={formData.top_3_adjetivos} onChange={handleInput} helper="Ex: Elegante, Moderna, Exclusiva" />

                    <div className="flex flex-col gap-3 bg-red-50/50 p-6 rounded-2xl border border-red-100">
                      <label className="font-roboto text-[12px] font-bold text-red-800">Escolha 3 adjetivos que definitivamente NÃO representam sua marca *</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {ADJETIVOS_LIST.map(adj => (
                          <label key={`neg_${adj}`} className="flex items-center gap-2 text-[13px] text-[var(--color-atelier-grafite)] cursor-pointer hover:opacity-80 transition-opacity">
                            <input type="checkbox" checked={formData.adjetivos_negativos.includes(adj)} onChange={() => handleCheckbox('adjetivos_negativos', adj)} className="accent-red-500 w-4 h-4 cursor-pointer" />
                            {adj}
                          </label>
                        ))}
                      </div>
                      <div className="mt-3">
                        <InputGroup label="Outro:" name="adjetivos_negativos_outro" value={formData.adjetivos_negativos_outro} onChange={handleInput} />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 5 */}
                {step === 5 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                    <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] border-b border-[var(--color-atelier-grafite)]/10 pb-2">Seção 5 de 6: Preferências Visuais</h2>
                    
                    <InputGroup label="Você quer um símbolo em específico? *" name="simbolo" value={formData.simbolo} onChange={handleInput} />
                    <InputGroup label="Você quer uma cor em específico? *" name="cor_desejada" value={formData.cor_desejada} onChange={handleInput} helper="Vou encarar isso como uma sugestão e analisar se faz sentido para a mensagem da marca." />
                    <InputGroup label="Existe alguma cor que você NÃO quer? *" name="cor_nao_desejada" value={formData.cor_nao_desejada} onChange={handleInput} />
                    <TextareaGroup label="Onde o público verá sua identidade? *" name="onde_verao" value={formData.onde_verao} onChange={handleInput} helper="Ex: Instagram, Fachada, Embalagem" />
                    <TextareaGroup label="O que você gosta e o que não gosta no logo atual?" name="logo_atual" value={formData.logo_atual} onChange={handleInput} helper="Caso não tenha logo, pode pular essa pergunta" />

                    {/* UPLOAD DO LOGO ATUAL (A SEU PEDIDO) */}
                    <div className="flex flex-col gap-3 mt-2">
                      <label className="font-roboto text-[12px] font-bold text-[var(--color-atelier-grafite)]">Anexe o seu logotipo atual (se tiver)</label>
                      <label className="border-2 border-dashed border-[var(--color-atelier-grafite)]/20 bg-white/40 hover:bg-white/80 transition-colors rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer group">
                        <input type="file" accept="image/*,.pdf,.ai,.eps" className="hidden" onChange={handleLogoUpload} />
                        <div className="w-12 h-12 rounded-full bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] group-hover:scale-110 transition-transform">
                          <UploadCloud size={24} />
                        </div>
                        <div className="text-center">
                          <span className="block font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)]">
                            {logoFile ? logoFile.name : "Clique para anexar arquivo"}
                          </span>
                          <span className="block font-roboto text-[10px] text-[var(--color-atelier-grafite)]/50 mt-1">Imagens ou ficheiros vetoriais</span>
                        </div>
                      </label>
                    </div>

                  </motion.div>
                )}

                {/* STEP 6 */}
                {step === 6 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                    <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] border-b border-[var(--color-atelier-grafite)]/10 pb-2">Seção 6 de 6: Finalização</h2>
                    
                    <TextareaGroup label="Por qual motivo você resolveu me escolher para participar dessa etapa tão importante?" name="motivo_escolha" value={formData.motivo_escolha} onChange={handleInput} />
                    <TextareaGroup label="Considerações Finais (Opcional)" name="ideias_livres" value={formData.ideias_livres} onChange={handleInput} helper="Aqui, você não precisa ter vergonha! Nenhuma ideia é boba demais. Compartilhe ideias que você já teve, mas nunca tirou do papel." />
                  </motion.div>
                )}

                {/* NAVEGAÇÃO */}
                <div className="flex justify-between items-center pt-8 mt-4 border-t border-[var(--color-atelier-grafite)]/10">
                  {step > 0 ? (
                    <button onClick={handlePrev} className="px-6 py-3 rounded-xl border border-[var(--color-atelier-grafite)]/20 text-[var(--color-atelier-grafite)] font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-white transition-colors">
                      Anterior
                    </button>
                  ) : <div></div>}
                  
                  {step < 6 ? (
                    <button onClick={handleNext} className="px-8 py-3 rounded-xl bg-[var(--color-atelier-terracota)] text-white font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-[#8c562e] shadow-md transition-all hover:-translate-y-0.5">
                      Próximo Passo
                    </button>
                  ) : (
                    <button onClick={submitBriefing} disabled={isSubmitting} className="px-8 py-3 rounded-xl bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-[var(--color-atelier-terracota)] shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2">
                      {isSubmitting || isUploadingLogo ? <Loader2 size={14} className="animate-spin"/> : <Send size={14} />} 
                      Finalizar e Enviar
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Sub-componentes UI para padronizar os inputs
function InputGroup({ label, name, value, onChange, type = "text", helper }: any) {
  return (
    <div className="flex flex-col gap-1 group/input">
      <label className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)] group-focus-within/input:text-[var(--color-atelier-terracota)]">{label}</label>
      {helper && <p className="text-[10px] text-[var(--color-atelier-grafite)]/50 leading-snug mb-1">{helper}</p>}
      <input type={type} name={name} value={value} onChange={onChange} className="w-full bg-white/50 border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-terracota)]/50 rounded-xl px-4 py-3 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-colors shadow-sm" />
    </div>
  );
}

function TextareaGroup({ label, name, value, onChange, helper }: any) {
  return (
    <div className="flex flex-col gap-1 group/input">
      <label className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)] group-focus-within/input:text-[var(--color-atelier-terracota)]">{label}</label>
      {helper && <p className="text-[10px] text-[var(--color-atelier-grafite)]/50 leading-snug mb-1">{helper}</p>}
      <textarea name={name} value={value} onChange={onChange} rows={3} className="w-full bg-white/50 border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-terracota)]/50 rounded-xl px-4 py-3 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-colors shadow-sm custom-scrollbar resize-none" />
    </div>
  );
}

function SelectGroup({ label, name, value, onChange, options }: any) {
  return (
    <div className="flex flex-col gap-1 group/input">
      <label className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)] group-focus-within/input:text-[var(--color-atelier-terracota)]">{label}</label>
      <select name={name} value={value} onChange={onChange} className="w-full bg-white/50 border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-terracota)]/50 rounded-xl px-4 py-3 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-colors shadow-sm cursor-pointer">
        <option value="">Selecione...</option>
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}