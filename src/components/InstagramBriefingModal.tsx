// src/components/InstagramBriefingModal.tsx
"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, X, CheckCircle2, Loader2, Send } from "lucide-react";
import { supabase } from "../lib/supabase";

interface InstagramBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  clientId: string;
  onSuccess: () => void;
}

export default function InstagramBriefingModal({ isOpen, onClose, projectId, clientId, onSuccess }: InstagramBriefingModalProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    nome: '', whatsapp: '', email: '',
    produto_ancora: '', 
    cliente_ideal: '', 
    gatilho_compra: '', gatilho_compra_outro: '',
    inimigo_comum: '', 
    padrao_excelencia: '',
    persona_marca: '', 
    arsenal_visual: '',
    ponto_chegada: ''
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const validateStep = () => {
    const reqByStep = [
      ['nome', 'whatsapp', 'email'], // Step 0: Contato
      ['produto_ancora', 'cliente_ideal', 'gatilho_compra'], // Step 1: O Núcleo
      ['inimigo_comum', 'padrao_excelencia'], // Step 2: A Dinâmica de Guerra
      ['persona_marca', 'arsenal_visual'], // Step 3: O Arsenal e a Voz
      ['ponto_chegada'] // Step 4: O Endgame
    ];

    const missing = reqByStep[step].filter((field) => {
      const val = (formData as any)[field];
      return !val || (typeof val === 'string' && val.trim() === "");
    });

    if (missing.length > 0) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Por favor, preencha todos os campos obrigatórios (*)." }));
      return false;
    }

    // Validação extra para a opção 'Outro'
    if (step === 1 && formData.gatilho_compra === 'Outro' && !formData.gatilho_compra_outro.trim()) {
      window.dispatchEvent(new CustomEvent("showToast", { detail: "Por favor, especifique o gatilho de compra." }));
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(s => Math.min(s + 1, 4));
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
      // Salva na tabela dedicada de Instagram que criámos anteriormente
      const { error } = await supabase.from('instagram_briefings').upsert({
        project_id: projectId,
        client_id: clientId,
        answers: formData
      }, { onConflict: 'project_id' });

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 3000);

    } catch (error) {
      console.error("Erro no briefing de Instagram:", error);
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
              <span className="font-roboto text-[12px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]">Dossiê de Mercado (Instagram)</span>
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
                <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-4">Dossiê Recebido!</h2>
                <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/80 leading-relaxed mb-8">
                  As suas informações estratégicas foram arquivadas no nosso cofre de inteligência.<br/><br/>
                  O Atelier foi notificado e o nosso Chief Marketing Officer (CMO) irá processar estes dados para construir o seu funil de conteúdo.
                </p>
                <button onClick={onClose} className="bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] px-8 py-4 rounded-xl font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-[var(--color-atelier-terracota)] transition-colors shadow-md">
                  Voltar ao Painel
                </button>
              </motion.div>
            ) : (
              <div className="max-w-2xl mx-auto flex flex-col gap-8 pb-10">
                
                {/* PROGRESSO E TÍTULO */}
                <div className="text-center mb-6">
                   <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] mb-6">O Dossiê de Mercado</h1>
                   <div className="w-full h-2 bg-[var(--color-atelier-terracota)]/10 rounded-full overflow-hidden">
                     <div className="h-full bg-[var(--color-atelier-terracota)] transition-all duration-500" style={{ width: `${((step + 1) / 5) * 100}%` }}></div>
                   </div>
                </div>

                {/* STEP 0: Boas-vindas e Contato */}
                {step === 0 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                    <div className="bg-[var(--color-atelier-terracota)]/5 p-6 md:p-8 rounded-[2rem] border border-[var(--color-atelier-terracota)]/10 mb-2 shadow-sm">
                      <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/80 mb-4 leading-relaxed font-medium">
                        O nosso trabalho não é apenas criar posts bonitos; é construir um ativo digital que consolide o seu legado e impulsione as suas vendas.
                      </p>
                      <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/80 mb-4 leading-relaxed">
                        Para assumirmos o controle da sua narrativa no Instagram, precisamos entender o núcleo do seu negócio. Seja direto. Nós cuidamos do resto.
                      </p>
                      <p className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] mt-6">
                        Confidencialidade Absoluta.
                      </p>
                    </div>
                    
                    <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] border-b border-[var(--color-atelier-grafite)]/10 pb-2 mt-4">Dados de Ligação</h2>
                    
                    <InputGroup label="Seu Nome *" name="nome" value={formData.nome} onChange={handleInput} />
                    <InputGroup label="Seu WhatsApp (com DDD) *" name="whatsapp" value={formData.whatsapp} onChange={handleInput} type="tel" />
                    <InputGroup label="Seu melhor E-mail *" name="email" value={formData.email} onChange={handleInput} type="email" />
                  </motion.div>
                )}

                {/* STEP 1: O Núcleo de Conversão */}
                {step === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                    <div>
                      <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-1">Estágio 1: O Núcleo de Conversão</h2>
                      <p className="font-roboto text-xs text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-4">Business Core</p>
                      <p className="text-[13px] text-[var(--color-atelier-grafite)]/70 mb-4">O objetivo aqui é entender o que realmente coloca dinheiro no caixa da empresa, mapeando o topo e o fundo do funil.</p>
                    </div>
                    
                    <InputGroup label="1. O Produto Âncora *" name="produto_ancora" value={formData.produto_ancora} onChange={handleInput} helper="Se você só pudesse vender um único produto ou serviço pelos próximos 12 meses, qual seria?" />
                    
                    <TextareaGroup label="2. A Regra de Pareto (O Cliente Ideal) *" name="cliente_ideal" value={formData.cliente_ideal} onChange={handleInput} helper="Quem é o cliente que representa os seus 20% de esforço que geram 80% do seu faturamento? Descreva-o não por idade, mas pelo problema que ele precisa resolver urgentemente." />
                    
                    <SelectGroup 
                      label="3. O Gatilho de Compra *" 
                      name="gatilho_compra" 
                      value={formData.gatilho_compra} 
                      onChange={handleInput} 
                      helper="Quando um cliente decide fechar negócio com você, qual é o principal motivo que ele alega?"
                      options={['Velocidade', 'Status', 'Exclusividade', 'Preço', 'Confiança Técnica', 'Outro']} 
                    />
                    
                    {formData.gatilho_compra === 'Outro' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <InputGroup label="Qual é o gatilho? *" name="gatilho_compra_outro" value={formData.gatilho_compra_outro} onChange={handleInput} />
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* STEP 2: A Dinâmica de Guerra */}
                {step === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                    <div>
                      <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-1">Estágio 2: A Dinâmica de Guerra</h2>
                      <p className="font-roboto text-xs text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-4">Posicionamento</p>
                      <p className="text-[13px] text-[var(--color-atelier-grafite)]/70 mb-4">Nesta seção, definimos as fronteiras da marca. Para saber o que somos, precisamos saber contra o que estamos lutando.</p>
                    </div>
                    
                    <TextareaGroup label="4. O Inimigo Comum *" name="inimigo_comum" value={formData.inimigo_comum} onChange={handleInput} helper="No seu mercado, qual é a prática padrão ou o concorrente que você mais abomina? O que a sua marca absolutamente não faz?" />
                    
                    <TextareaGroup label="5. O Padrão de Excelência *" name="padrao_excelencia" value={formData.padrao_excelencia} onChange={handleInput} helper="Cite de 1 a 3 marcas (podem ser de fora do seu nicho) cuja comunicação, nível de serviço e presença digital você admira e consome." />
                  </motion.div>
                )}

                {/* STEP 3: O Arsenal e a Voz */}
                {step === 3 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                    <div>
                      <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-1">Estágio 3: O Arsenal e a Voz</h2>
                      <p className="font-roboto text-xs text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-4">Brand Assets & Tone</p>
                      <p className="text-[13px] text-[var(--color-atelier-grafite)]/70 mb-4">Aqui estabelecemos a matéria-prima e a personalidade da sua comunicação.</p>
                    </div>
                    
                    <RadioGroup 
                      label="6. A Persona da Marca *" 
                      name="persona_marca" 
                      value={formData.persona_marca} 
                      onChange={handleInput} 
                      helper="Se a sua empresa entrasse numa sala de reuniões agora, como ela se comportaria?"
                      options={[
                        "Implacável, direta e analítica (Foco absoluto em dados e poder).",
                        "Acolhedora, educadora e paciente (Foco em comunidade e instrução).",
                        "Sofisticada, silenciosa e exclusiva (Foco em status e escassez).",
                        "Disruptiva, enérgica e provocadora (Foco em inovação e quebra de regras)."
                      ]} 
                    />
                    
                    <RadioGroup 
                      label="7. O Estado do Arsenal Visual *" 
                      name="arsenal_visual" 
                      value={formData.arsenal_visual} 
                      onChange={handleInput} 
                      helper="O nosso padrão exige imagens autênticas para gerar conexão visceral, fugindo de bancos de imagens plásticos. Como estamos de material bruto hoje?"
                      options={[
                        "Tenho um vasto acervo de fotos e vídeos reais e de alta qualidade da minha operação/equipe.",
                        "Tenho material, mas precisa de curadoria e edição profissional.",
                        "Não tenho material. Precisaremos agendar uma missão de captura."
                      ]} 
                    />
                  </motion.div>
                )}

                {/* STEP 4: O Endgame */}
                {step === 4 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
                    <div>
                      <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-1">Estágio 4: O "Endgame"</h2>
                      <p className="font-roboto text-xs text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-4">Métricas de Sucesso</p>
                      <p className="text-[13px] text-[var(--color-atelier-grafite)]/70 mb-4">Alinhamento de expectativas. O que define a vitória para o seu negócio?</p>
                    </div>
                    
                    <RadioGroup 
                      label="8. O Ponto de Chegada *" 
                      name="ponto_chegada" 
                      value={formData.ponto_chegada} 
                      onChange={handleInput} 
                      helper="Daqui a 6 meses, ao olharmos para trás, que métrica fará você dizer com convicção: 'Entregar o Instagram ao Atelier foi a melhor decisão estratégica do ano'?"
                      options={[
                        "Crescimento de autoridade percebida (Qualidade dos seguidores e convites para negócios/parcerias).",
                        "Volume de Leads (Aumento no número de orçamentos e mensagens diretas).",
                        "Conversão Direta (Cliques no link da bio e vendas de produtos/serviços de ticket menor).",
                        "Recrutamento (Atração de talentos de alto nível para trabalhar na minha empresa)."
                      ]} 
                    />
                  </motion.div>
                )}

                {/* NAVEGAÇÃO E BOTOES */}
                <div className="flex justify-between items-center pt-8 mt-4 border-t border-[var(--color-atelier-grafite)]/10">
                  {step > 0 ? (
                    <button onClick={handlePrev} className="px-6 py-3 rounded-xl border border-[var(--color-atelier-grafite)]/20 text-[var(--color-atelier-grafite)] font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-white transition-colors">
                      Anterior
                    </button>
                  ) : <div></div>}
                  
                  {step < 4 ? (
                    <button onClick={handleNext} className="px-8 py-3 rounded-xl bg-[var(--color-atelier-terracota)] text-white font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-[#8c562e] shadow-md transition-all hover:-translate-y-0.5">
                      Próximo Passo
                    </button>
                  ) : (
                    <button onClick={submitBriefing} disabled={isSubmitting} className="px-8 py-3 rounded-xl bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] font-roboto font-bold uppercase tracking-widest text-[11px] hover:bg-[var(--color-atelier-terracota)] shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2">
                      {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Send size={14} />} 
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

// ============================================================================
// SUB-COMPONENTES UI (PADRONIZAÇÃO ATELIER)
// ============================================================================

function InputGroup({ label, name, value, onChange, type = "text", helper }: any) {
  return (
    <div className="flex flex-col gap-1 group/input">
      <label className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)] group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors">{label}</label>
      {helper && <p className="text-[10px] text-[var(--color-atelier-grafite)]/50 leading-snug mb-1">{helper}</p>}
      <input type={type} name={name} value={value} onChange={onChange} className="w-full bg-white/50 border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-terracota)]/50 rounded-xl px-4 py-3 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-colors shadow-sm" />
    </div>
  );
}

function TextareaGroup({ label, name, value, onChange, helper }: any) {
  return (
    <div className="flex flex-col gap-1 group/input">
      <label className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)] group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors">{label}</label>
      {helper && <p className="text-[10px] text-[var(--color-atelier-grafite)]/50 leading-snug mb-1">{helper}</p>}
      <textarea name={name} value={value} onChange={onChange} rows={3} className="w-full bg-white/50 border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-terracota)]/50 rounded-xl px-4 py-3 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-colors shadow-sm custom-scrollbar resize-none" />
    </div>
  );
}

function SelectGroup({ label, name, value, onChange, options, helper }: any) {
  return (
    <div className="flex flex-col gap-1 group/input">
      <label className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)] group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors">{label}</label>
      {helper && <p className="text-[10px] text-[var(--color-atelier-grafite)]/50 leading-snug mb-1">{helper}</p>}
      <select name={name} value={value} onChange={onChange} className="w-full bg-white/50 border border-[var(--color-atelier-grafite)]/10 focus:border-[var(--color-atelier-terracota)]/50 rounded-xl px-4 py-3 text-[14px] text-[var(--color-atelier-grafite)] outline-none transition-colors shadow-sm cursor-pointer">
        <option value="">Selecione...</option>
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function RadioGroup({ label, name, value, onChange, options, helper }: any) {
  return (
    <div className="flex flex-col gap-3 group/input mt-2">
      <div>
        <label className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)] group-focus-within/input:text-[var(--color-atelier-terracota)] transition-colors">{label}</label>
        {helper && <p className="text-[10px] text-[var(--color-atelier-grafite)]/50 leading-snug mt-1">{helper}</p>}
      </div>
      <div className="flex flex-col gap-2">
        {options.map((opt: string, idx: number) => (
          <label key={idx} className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all shadow-sm border ${value === opt ? 'bg-white border-[var(--color-atelier-terracota)]/40 ring-1 ring-[var(--color-atelier-terracota)]/20' : 'bg-white/40 border-[var(--color-atelier-grafite)]/10 hover:border-[var(--color-atelier-terracota)]/30 hover:bg-white/80'}`}>
            <input 
              type="radio" 
              name={name} 
              value={opt} 
              checked={value === opt} 
              onChange={onChange} 
              className="mt-1 accent-[var(--color-atelier-terracota)] cursor-pointer w-4 h-4 shrink-0" 
            />
            <span className="text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed font-medium">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}