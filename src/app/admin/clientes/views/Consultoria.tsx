// src/app/admin/clientes/views/Consultoria.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Sparkles, FileSearch, Instagram, User, Mail, 
  Phone, Target, Loader2, CheckCircle2, Download, 
  ChevronRight, BrainCircuit, LineChart, Edit3, Send, Bot
} from "lucide-react";

import { pdf } from '@react-pdf/renderer';
import ConsultoriaPDF from '@/components/pdf/ConsultoriaPDF';
import { supabase } from "@/lib/supabase"; 

interface ConsultoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConsultoriaResult {
  brand_archetype: string;
  visual_diagnosis: string;
  tone_of_voice: string;
  stories_strategy: string;
  content_pillars: string[];
}

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function ConsultoriaModal({ isOpen, onClose }: ConsultoriaModalProps) {
  // ==========================================
  // ESTADOS DO FORMULÁRIO E FLUXO
  // ==========================================
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    nome: "", email: "", telefone: "", instagram: "", nicho: ""
  });

  const [loadingText, setLoadingText] = useState("Inicializando o Motor de IA...");
  const [result, setResult] = useState<ConsultoriaResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // ==========================================
  // ESTADOS DO COPILOTO (CHAT IA)
  // ==========================================
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'ai' | 'user', text: string}[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll do chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatting]);

  const handleClose = () => {
    if (step === 2) {
      const confirm = window.confirm("A IA está a processar a auditoria. Tem a certeza que deseja cancelar?");
      if (!confirm) return;
    }
    setTimeout(() => { 
      setStep(1); 
      setResult(null); 
      setFormData({nome:"", email:"", telefone:"", instagram:"", nicho:""});
      setChatMessages([]);
    }, 300);
    onClose();
  };

  // ==========================================
  // MOTOR DE GERAÇÃO INICIAL
  // ==========================================
  const handleRunConsulting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.instagram || !formData.nicho) {
      showToast("Instagram e Nicho são obrigatórios."); return;
    }

    setStep(2);
    
    const loadingPhases = [
      "A extrair métricas e conteúdos do perfil @",
      "Aplicando frameworks de Marketing de Resposta Direta...",
      "Analisando semiótica, paleta de cores e design...",
      "Construindo diagnóstico de Autoridade e Tom de Voz...",
      "A redigir o Plano Estratégico Final..."
    ];

    let currentPhase = 0;
    const interval = setInterval(() => {
      currentPhase++;
      if (currentPhase < loadingPhases.length) {
        setLoadingText(loadingPhases[currentPhase].replace("@", `@${formData.instagram.replace('@', '')}`));
      } else {
        clearInterval(interval);
      }
    }, 2500);

    try {
      // 🟢 AQUI BATEREMOS NA NOSSA API REAL:
      /*
      const res = await fetch('/api/consultoria/generate', { method: 'POST', body: JSON.stringify(formData) });
      const data = await res.json();
      setResult(data.insight);
      */

      // SIMULAÇÃO:
      await new Promise(resolve => setTimeout(resolve, 12000));
      clearInterval(interval);
      
      setResult({
        brand_archetype: "O Governante / O Criador",
        visual_diagnosis: "Atualmente, o perfil carece de intencionalidade visual. O uso excessivo de templates genéricos enfraquece a perceção de valor. É necessário adotar uma estética mais editorial, utilizando respiros (negative space) e uma paleta de cores restrita que transmita sofisticação e urgência.",
        tone_of_voice: "Sofisticado, Direto e Imperativo. A comunicação deve abandonar a passividade e assumir a postura de um especialista que 'prescreve' a solução, e não de alguém que 'pede' atenção. Menos jargões técnicos, mais foco na transformação final do cliente.",
        content_pillars: [
          "Desconstrução de Mitos (Quebra de Padrão do Nicho)",
          "Bastidores do Processo (Autoridade Silenciosa)",
          "Estudos de Caso Dissecados (Prova Social Técnica)"
        ],
        stories_strategy: "Transição do modelo 'panfleto' para o modelo 'documentário'. Iniciar o dia com um hook (gancho) contextual da rotina, seguido de uma lição técnica curta (micro-learning) e finalizar com um CTA suave (Direct Message)."
      });

      // Gravação no CRM (Simulada)
      // await supabase.from('leads').insert({...});

      // Inicializa o Chat
      setChatMessages([{ role: 'ai', text: `Olá! Forjei a primeira versão do Dossiê de ${formData.nome}. Como Diretor de Estratégia, estou à disposição para refinar qualquer texto. O que deseja ajustar?` }]);
      
      setStep(3);
      showToast("Auditoria Estratégica concluída com sucesso!");

    } catch (error: any) {
      clearInterval(interval);
      showToast(`Erro na análise: ${error.message}`);
      setStep(1);
    }
  };

  // ==========================================
  // MOTOR DE REFINAMENTO (CHAT COPILOTO)
  // ==========================================
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !result) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput("");
    setIsChatting(true);

    try {
      // 🟢 AQUI BATEREMOS NA API DE EDIÇÃO DO GEMINI
      // Enviamos o `result` atual + a `userMessage` e a IA devolve o JSON modificado
      /*
      const res = await fetch('/api/consultoria/refine', {
        method: 'POST',
        body: JSON.stringify({ currentData: result, prompt: userMessage })
      });
      const data = await res.json();
      setResult(data.updatedInsight);
      setChatMessages(prev => [...prev, { role: 'ai', text: data.aiResponse }]);
      */

      // SIMULAÇÃO DO REFINAMENTO:
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simula a IA a alterar o texto
      setResult(prev => prev ? {
        ...prev,
        tone_of_voice: prev.tone_of_voice + "\n\n(Ajustado: Inserir tons mais imponentes e misteriosos conforme solicitado)."
      } : null);

      setChatMessages(prev => [...prev, { role: 'ai', text: "Feito! Refinei o Tom de Voz para refletir a nova diretriz de luxo e mistério. O editor já foi atualizado à esquerda." }]);

    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'ai', text: "Ocorreu um erro de comunicação com os servidores. Tente novamente." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!result) return;
    setIsExporting(true);
    showToast("A forjar Documento Oficial da Consultoria...");
    
    try {
      const doc = <ConsultoriaPDF 
        clientName={formData.nome} 
        instagram={formData.instagram} 
        nicho={formData.nicho} 
        result={result} 
      />;

      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Auditoria_${formData.nome.replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      showToast("PDF Exportado com sucesso!");
    } catch (error) {
      showToast("Erro ao exportar PDF vetorial.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[var(--color-atelier-grafite)]/60 backdrop-blur-md"
            onClick={step !== 2 ? handleClose : undefined} 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            // 🟢 AUMENTO DE LARGURA PARA ACOMODAR O SPLIT-SCREEN DO PASSO 3
            className={`relative w-full ${step === 3 ? 'max-w-[1300px]' : 'max-w-[850px]'} h-[90vh] bg-[var(--color-atelier-creme)] rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.3)] border border-white flex flex-col overflow-hidden transition-all duration-500`}
          >
            {/* HEADER DO MODAL */}
            <div className="p-6 md:p-8 border-b border-[var(--color-atelier-grafite)]/10 bg-white/60 backdrop-blur-xl flex justify-between items-start shrink-0 z-20">
              <div>
                <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
                  <FileSearch size={28} className="text-[var(--color-atelier-terracota)]" /> 
                  Consultoria de Alto Valor
                </h2>
                <p className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-2 flex items-center gap-2">
                  <BrainCircuit size={12}/> Auditoria Autônoma de Autoridade (IA)
                </p>
              </div>
              <button onClick={handleClose} disabled={step === 2} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors shadow-sm border border-white/50 disabled:opacity-30">
                <X size={18} />
              </button>
            </div>

            {/* CORPO DO MODAL */}
            <div className="flex-1 overflow-hidden bg-gradient-to-b from-transparent to-white/40 relative flex flex-col">
              <AnimatePresence mode="wait">
                
                {/* ESTADO 1: FORMULÁRIO DE ENTRADA */}
                {step === 1 && (
                  <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 md:p-10 overflow-y-auto custom-scrollbar h-full">
                    <form id="consultoria-form" onSubmit={handleRunConsulting} className="flex flex-col gap-8 max-w-4xl mx-auto">
                      
                      <div className="bg-white/80 p-8 rounded-[2rem] border border-white shadow-sm flex flex-col md:flex-row gap-8 items-center">
                        <div className="w-24 h-24 rounded-full bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center shrink-0 border-4 border-white shadow-inner">
                          <Instagram size={36} className="text-[var(--color-atelier-terracota)]" />
                        </div>
                        <div>
                          <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-2">Preparação do Oráculo</h3>
                          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 font-medium leading-relaxed">
                            Insira os dados do potencial cliente. O nosso motor irá varrer o Instagram dele e aplicar frameworks avançados de Copywriting e Branding para gerar um relatório de intervenção focado na criação de percepção de valor.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="flex flex-col gap-2">
                          <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Nome Completo</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/30"><User size={16}/></span>
                            <input type="text" required value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full bg-white border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3.5 pl-11 pr-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" placeholder="Ex: Maria Eduarda" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Instagram (@)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/30"><Instagram size={16}/></span>
                            <input type="text" required value={formData.instagram} onChange={(e) => setFormData({...formData, instagram: e.target.value})} className="w-full bg-white border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3.5 pl-11 pr-4 text-[13px] font-bold text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" placeholder="@usuario" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Nicho de Atuação</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/30"><Target size={16}/></span>
                            <input type="text" required value={formData.nicho} onChange={(e) => setFormData({...formData, nicho: e.target.value})} className="w-full bg-white border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3.5 pl-11 pr-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" placeholder="Ex: Estética Avançada / Arquitetura" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Telefone (Opcional)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/30"><Phone size={16}/></span>
                            <input type="text" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} className="w-full bg-white border border-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3.5 pl-11 pr-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" placeholder="+351..." />
                          </div>
                        </div>
                      </div>

                    </form>
                  </motion.div>
                )}

                {/* ESTADO 2: PROCESSAMENTO (IA) */}
                {step === 2 && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-center px-6">
                    <div className="relative w-32 h-32 mb-8">
                      <div className="absolute inset-0 border-4 border-[var(--color-atelier-terracota)]/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-[var(--color-atelier-terracota)] border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles size={32} className="text-[var(--color-atelier-terracota)] animate-pulse" />
                      </div>
                    </div>
                    <h2 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mb-4">Aglomerando Dados...</h2>
                    <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/60 font-medium max-w-md h-6 transition-all duration-300">
                      {loadingText}
                    </p>
                  </motion.div>
                )}

                {/* 🟢 ESTADO 3: SPLIT-SCREEN (EDITOR + CHAT COPILOTO) */}
                {step === 3 && result && (
                  <motion.div key="result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col lg:flex-row h-full w-full gap-6 p-6 md:p-8">
                    
                    {/* COLUNA ESQUERDA: EDITOR DO DOSSIÊ */}
                    <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 pb-10">
                      
                      <div className="bg-[var(--color-atelier-terracota)] p-8 rounded-[2rem] shadow-md text-white relative overflow-hidden shrink-0">
                        <div className="absolute -right-10 -top-10 text-white/10"><LineChart size={180} strokeWidth={1} /></div>
                        <div className="relative z-10">
                          <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-white/60 mb-2 block flex items-center gap-2"><Edit3 size={12}/> Modo Edição Ativo</span>
                          <h3 className="font-elegant text-4xl leading-tight mb-2">Auditoria: {formData.nome}</h3>
                          <p className="font-roboto text-[13px] font-bold text-white/80 flex items-center gap-2"><Instagram size={14}/> {formData.instagram} • {formData.nicho}</p>
                        </div>
                      </div>

                      {/* CAMPOS EDITÁVEIS DO RELATÓRIO */}
                      <div className="flex flex-col gap-5">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex flex-col gap-3 group/edit">
                          <div className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/5 pb-2">
                            <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-2"><Target size={14}/> Diagnóstico Visual e Estético</label>
                            <Edit3 size={12} className="text-[var(--color-atelier-grafite)]/20 group-focus-within/edit:text-[var(--color-atelier-terracota)] transition-colors"/>
                          </div>
                          <textarea 
                            value={result.visual_diagnosis}
                            onChange={(e) => setResult({...result, visual_diagnosis: e.target.value})}
                            className="w-full bg-transparent text-[13px] leading-relaxed text-[var(--color-atelier-grafite)] font-medium outline-none resize-none h-28 custom-scrollbar"
                          />
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex flex-col gap-3 group/edit">
                          <div className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/5 pb-2">
                            <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-2"><User size={14}/> Tom de Voz & Arquétipo</label>
                            <Edit3 size={12} className="text-[var(--color-atelier-grafite)]/20 group-focus-within/edit:text-[var(--color-atelier-terracota)] transition-colors"/>
                          </div>
                          <input 
                            value={result.brand_archetype}
                            onChange={(e) => setResult({...result, brand_archetype: e.target.value})}
                            className="w-full bg-gray-50 p-3 rounded-xl text-[12px] font-bold text-[var(--color-atelier-grafite)] outline-none border border-transparent focus:border-[var(--color-atelier-terracota)]/30 text-center mb-1"
                          />
                          <textarea 
                            value={result.tone_of_voice}
                            onChange={(e) => setResult({...result, tone_of_voice: e.target.value})}
                            className="w-full bg-transparent text-[13px] leading-relaxed text-[var(--color-atelier-grafite)] font-medium outline-none resize-none h-24 custom-scrollbar"
                          />
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex flex-col gap-3 group/edit">
                          <div className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/5 pb-2">
                            <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-2"><CheckCircle2 size={14}/> Pilares de Conteúdo (1 por linha)</label>
                            <Edit3 size={12} className="text-[var(--color-atelier-grafite)]/20 group-focus-within/edit:text-[var(--color-atelier-terracota)] transition-colors"/>
                          </div>
                          <textarea 
                            value={result.content_pillars.join('\n')}
                            onChange={(e) => setResult({...result, content_pillars: e.target.value.split('\n')})}
                            className="w-full bg-transparent text-[13px] leading-loose text-[var(--color-atelier-grafite)] font-bold outline-none resize-none h-24 custom-scrollbar"
                          />
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex flex-col gap-3 group/edit">
                          <div className="flex items-center justify-between border-b border-[var(--color-atelier-grafite)]/5 pb-2">
                            <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] flex items-center gap-2"><Instagram size={14}/> Dinâmica de Stories</label>
                            <Edit3 size={12} className="text-[var(--color-atelier-grafite)]/20 group-focus-within/edit:text-[var(--color-atelier-terracota)] transition-colors"/>
                          </div>
                          <textarea 
                            value={result.stories_strategy}
                            onChange={(e) => setResult({...result, stories_strategy: e.target.value})}
                            className="w-full bg-transparent text-[13px] leading-relaxed text-[var(--color-atelier-grafite)] font-medium outline-none resize-none h-24 custom-scrollbar"
                          />
                        </div>
                      </div>
                    </div>

                    {/* COLUNA DIREITA: CHAT COPILOTO IA */}
                    <div className="w-full lg:w-[380px] shrink-0 h-full max-h-[800px] bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white shadow-sm flex flex-col overflow-hidden relative">
                      <div className="p-5 border-b border-[var(--color-atelier-grafite)]/5 bg-white/40 flex items-center gap-3 shrink-0">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shadow-inner">
                          <Bot size={18} />
                        </div>
                        <div>
                          <h4 className="font-elegant text-xl text-[var(--color-atelier-grafite)] leading-none">Copiloto Estratégico</h4>
                          <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-green-500 flex items-center gap-1 mt-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online</span>
                        </div>
                      </div>

                      {/* Lista de Mensagens */}
                      <div ref={chatScrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-4">
                        {chatMessages.map((msg, idx) => (
                          <div key={idx} className={`flex w-full ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-[12px] font-medium leading-relaxed shadow-sm
                              ${msg.role === 'ai' 
                                ? 'bg-white text-[var(--color-atelier-grafite)] border border-gray-50 rounded-tl-sm' 
                                : 'bg-[var(--color-atelier-grafite)] text-white rounded-tr-sm'}
                            `}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        {isChatting && (
                          <div className="flex w-full justify-start">
                            <div className="bg-white p-4 rounded-2xl rounded-tl-sm border border-gray-50 shadow-sm flex items-center gap-2">
                               <div className="w-1.5 h-1.5 bg-[var(--color-atelier-grafite)]/40 rounded-full animate-bounce"></div>
                               <div className="w-1.5 h-1.5 bg-[var(--color-atelier-grafite)]/40 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                               <div className="w-1.5 h-1.5 bg-[var(--color-atelier-grafite)]/40 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input do Chat */}
                      <div className="p-4 bg-white/80 border-t border-white shrink-0">
                        <form onSubmit={handleChatSubmit} className="relative flex items-center">
                          <input 
                            type="text" 
                            placeholder="Peça à IA para refinar o texto..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            disabled={isChatting}
                            className="w-full bg-gray-50/50 border border-gray-100 focus:border-[var(--color-atelier-terracota)]/40 focus:bg-white rounded-[1.2rem] py-3.5 pl-4 pr-12 text-[12px] text-[var(--color-atelier-grafite)] outline-none transition-colors shadow-inner"
                          />
                          <button 
                            type="submit" 
                            disabled={!chatInput.trim() || isChatting}
                            className="absolute right-2 w-9 h-9 bg-[var(--color-atelier-terracota)] text-white rounded-xl flex items-center justify-center hover:bg-[#8c562e] transition-colors disabled:opacity-50 disabled:bg-gray-300 shadow-sm"
                          >
                            <Send size={14} className="ml-0.5" />
                          </button>
                        </form>
                      </div>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FOOTER DE AÇÕES GLOBAIS */}
            <div className="p-6 md:p-8 border-t border-[var(--color-atelier-grafite)]/10 bg-white/80 backdrop-blur-md shrink-0 flex justify-end gap-4 z-20 relative">
              {step === 1 && (
                <button 
                  type="submit" 
                  form="consultoria-form"
                  className="w-full md:w-auto px-10 bg-[var(--color-atelier-grafite)] text-white py-4 rounded-[1.2rem] font-roboto font-bold uppercase tracking-[0.2em] text-[12px] hover:bg-[var(--color-atelier-terracota)] hover:-translate-y-0.5 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <BrainCircuit size={16} /> Executar Auditoria AI
                </button>
              )}
              {step === 3 && (
                <>
                  <button onClick={handleClose} className="px-6 py-4 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:bg-gray-100 transition-colors">
                    Fechar
                  </button>
                  <button 
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="flex-1 md:flex-none px-10 bg-[var(--color-atelier-terracota)] text-white py-4 rounded-[1.2rem] font-roboto font-bold uppercase tracking-[0.1em] text-[12px] hover:bg-[#8c562e] hover:-translate-y-0.5 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    Exportar PDF Executivo
                  </button>
                </>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}