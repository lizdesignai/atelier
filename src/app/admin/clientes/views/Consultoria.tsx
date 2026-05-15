// src/app/admin/clientes/views/Consultoria.tsx
"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, FileSearch, Instagram, User, Mail, 
  Phone, Target, Loader2, CheckCircle2, Download, 
  Save, Edit3, Layers, FileText, ChevronRight, ChevronLeft, Sparkles
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
  content_pillars: string; // Controlado via textarea com 1 pilar por linha
  strategic_justification: string;
  market_positioning: string;
}

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function ConsultoriaModal({ isOpen, onClose }: ConsultoriaModalProps) {
  // ==========================================
  // ESTADOS DE OPERAÇÃO E BLUEPRINT
  // ==========================================
  const [step, setStep] = useState<1 | 2>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    instagram: "",
    nicho: ""
  });

  const [strategicBlueprint, setStrategicBlueprint] = useState<ConsultoriaResult>({
    brand_archetype: "",
    visual_diagnosis: "",
    tone_of_voice: "",
    stories_strategy: "",
    content_pillars: "",
    strategic_justification: "",
    market_positioning: ""
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClose = () => {
    if (isSaving || isExporting) return;
    setStep(1);
    setFormData({ nome: "", email: "", telefone: "", instagram: "", nicho: "" });
    setStrategicBlueprint({
      brand_archetype: "",
      visual_diagnosis: "",
      tone_of_voice: "",
      stories_strategy: "",
      content_pillars: "",
      strategic_justification: "",
      market_positioning: ""
    });
    onClose();
  };

  // ==========================================
  // VALIDAÇÕES TÁTICAS DE ETAPAS
  // ==========================================
  const validateStep1 = () => {
    if (!formData.nome.trim() || !formData.instagram.trim() || !formData.nicho.trim()) {
      showToast("Nome, Instagram e Nicho de Atuação são obrigatórios para a fundação.");
      return false;
    }
    return true;
  };

  const handleAdvance = () => {
    if (validateStep1()) {
      setStep(2);
      scrollToTop();
    }
  };

  const handleBack = () => {
    setStep(1);
    scrollToTop();
  };

  // ==========================================
  // COFRE DE DADOS: PERSISTÊNCIA DIRETA (CRM)
  // ==========================================
  const handleSaveConsulting = async () => {
    if (!validateStep1()) return;
    setIsSaving(true);
    showToast("A selar Dossiê Estratégico no cofre do CRM...");

    try {
      // Tratamento Lean dos Pilares: Quebra a string por quebras de linha e remove buffers vazios
      const pillarsArray = strategicBlueprint.content_pillars
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const targetEmail = formData.email.trim() || `${formData.instagram.replace('@', '').trim()}@lead.temp`;

      const leadPayload = {
        nome: formData.nome.trim(),
        email: targetEmail,
        telefone: formData.telefone.trim(),
        instagram: formData.instagram.trim(),
        nicho: formData.nicho.trim(),
        status: 'prospect', // Status padrão de entrada no pipeline do Atelier OS
        ai_brand_archetype: strategicBlueprint.brand_archetype,
        ai_visual_diagnosis: strategicBlueprint.visual_diagnosis,
        ai_tone_of_voice: strategicBlueprint.tone_of_voice,
        ai_stories_strategy: strategicBlueprint.stories_strategy,
        ai_content_pillars: pillarsArray,
        strategic_justification: strategicBlueprint.strategic_justification,
        market_positioning: strategicBlueprint.market_positioning,
        updated_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('leads')
        .upsert(leadPayload, { onConflict: 'email' });

      if (dbError) throw dbError;

      showToast("✨ Dossiê consolidado com sucesso na base de dados!");
    } catch (error: any) {
      console.error("Erro ao salvar Dossiê:", error);
      showToast(`Falha operacional: ${error.message || "Verifique as permissões da BD."}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // EMISSÃO VETORIAL: EXPORTAÇÃO DO PDF
  // ==========================================
  const handleExportPDF = async () => {
    setIsExporting(true);
    showToast("Compilando Dossiê Executivo de Alta Resolução...");

    try {
      const pillarsArray = strategicBlueprint.content_pillars
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      // Mapeamento do resultado para injeção no motor de PDF do Atelier
      const formattedResult = {
        brand_archetype: strategicBlueprint.brand_archetype,
        visual_diagnosis: strategicBlueprint.visual_diagnosis,
        tone_of_voice: strategicBlueprint.tone_of_voice,
        stories_strategy: strategicBlueprint.stories_strategy,
        content_pillars: pillarsArray,
        strategic_justification: strategicBlueprint.strategic_justification,
        market_positioning: strategicBlueprint.market_positioning
      };

      const doc = (
        <ConsultoriaPDF 
          clientName={formData.nome.trim()} 
          instagram={formData.instagram.trim()} 
          nicho={formData.nicho.trim()} 
          result={formattedResult as any} 
        />
      );

      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Auditoria_${formData.nome.trim().replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      showToast("PDF Estratégico exportado com sucesso!");
    } catch (error: any) {
      console.error("Erro na compilação do PDF:", error);
      showToast("Erro crítico na geração vetorial do documento.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
          {/* Overlay do Background */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[var(--color-atelier-grafite)]/60 backdrop-blur-md"
            onClick={handleClose} 
          />
          
          {/* Corpo Estrutural do Painel */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative w-full ${step === 2 ? 'max-w-[1300px]' : 'max-w-[850px]'} h-[90vh] bg-[var(--color-atelier-creme)] rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.3)] border border-white flex flex-col overflow-hidden transition-all duration-500`}
          >
            {/* HEADER EXECUTIVO CENTRALIZADO */}
            <div className="p-6 md:p-8 border-b border-[var(--color-atelier-grafite)]/10 bg-white/60 backdrop-blur-xl flex justify-between items-start shrink-0 z-20">
              <div>
                <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] flex items-center gap-3">
                  <FileSearch size={28} className="text-[var(--color-atelier-terracota)]" /> 
                  Mesa de Auditoria de Alto Valor
                </h2>
                <p className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 mt-2 flex items-center gap-2">
                  <Layers size={12}/> {step === 1 ? "Etapa 1: Triagem e Dossiê Cadastral" : "Etapa 2: Conselho de Direção e Matriz de Posicionamento"}
                </p>
              </div>
              <button 
                onClick={handleClose} 
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors shadow-sm border border-white/50"
              >
                <X size={18} />
              </button>
            </div>

            {/* CONTEÚDO DINÂMICO DOS WORKSPACES */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 bg-gradient-to-b from-transparent to-white/40">
              <AnimatePresence mode="wait">
                
                {/* WORKSPACE 1: IDENTIFICAÇÃO DO PROSPECT */}
                {step === 1 && (
                  <motion.div 
                    key="step1" 
                    initial={{ opacity: 0, x: -25 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: 25 }} 
                    className="flex flex-col gap-8 max-w-4xl mx-auto w-full"
                  >
                    <div className="bg-white/80 p-8 rounded-[2rem] border border-white shadow-sm flex flex-col md:flex-row gap-8 items-center">
                      <div className="w-24 h-24 rounded-[1.5rem] bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center shrink-0 border border-[var(--color-atelier-terracota)]/20 shadow-inner">
                        <Instagram size={36} className="text-[var(--color-atelier-terracota)]" />
                      </div>
                      <div>
                        <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] mb-2">Fundação da Consultoria</h3>
                        <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 font-medium leading-relaxed">
                          Insira as coordenadas cadastrais do prospect abaixo. A engenharia do Atelier OS isolará este perfil no banco de dados para que possa forjar e estruturar manualmente o Dossiê de Intervenção focado em percepção de valor e posicionamento de elite.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col gap-6">
                      <h4 className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] border-b border-gray-50 pb-3">Dados de Comunicação</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-500 pl-1">Nome Completo *</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"><User size={16}/></span>
                            <input type="text" required value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full bg-gray-50/50 border border-transparent focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3.5 pl-11 pr-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" placeholder="Ex: Rodrigo Santos" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-500 pl-1">Instagram (@) *</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"><Instagram size={16}/></span>
                            <input type="text" required value={formData.instagram} onChange={(e) => setFormData({...formData, instagram: e.target.value})} className="w-full bg-gray-50/50 border border-transparent focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3.5 pl-11 pr-4 text-[13px] font-bold text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" placeholder="@usuario" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-500 pl-1">Nicho de Atuação *</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"><Target size={16}/></span>
                            <input type="text" required value={formData.nicho} onChange={(e) => setFormData({...formData, nicho: e.target.value})} className="w-full bg-gray-50/50 border border-transparent focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3.5 pl-11 pr-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" placeholder="Ex: Advocacia Corporativa" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-500 pl-1">E-mail de Contato</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"><Mail size={16}/></span>
                            <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-gray-50/50 border border-transparent focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3.5 pl-11 pr-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" placeholder="nome@empresa.com" />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 md:col-span-2">
                          <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-gray-500 pl-1">Telefone / WhatsApp</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"><Phone size={16}/></span>
                            <input type="text" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} className="w-full bg-gray-50/50 border border-transparent focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl py-3.5 pl-11 pr-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none shadow-sm transition-all" placeholder="+351 912 345 678" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* WORKSPACE 2: CONSELHO DE DIREÇÃO (TABULEIRO CRIATIVO COMPLETO) */}
                {step === 2 && (
                  <motion.div 
                    key="step2" 
                    initial={{ opacity: 0, x: 25 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -25 }} 
                    className="flex flex-col gap-6 w-full"
                  >
                    {/* Linha 1: Metadados da Intervenção */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-3">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] pl-1">Arquétipo de Marca Sugerido</label>
                        <input 
                          type="text" 
                          value={strategicBlueprint.brand_archetype} 
                          onChange={(e) => setStrategicBlueprint({...strategicBlueprint, brand_archetype: e.target.value})} 
                          placeholder="Ex: O Soberano / O Mago" 
                          className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl p-3.5 text-[13px] font-bold text-[var(--color-atelier-grafite)] outline-none shadow-inner" 
                        />
                      </div>

                      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-3">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] pl-1">Pilares de Conteúdo (Um por linha)</label>
                        <textarea 
                          value={strategicBlueprint.content_pillars} 
                          onChange={(e) => setStrategicBlueprint({...strategicBlueprint, content_pillars: e.target.value})} 
                          placeholder="Pilar 1: Descrição&#10;Pilar 2: Descrição&#10;Pilar 3: Descrição" 
                          className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-[var(--color-atelier-terracota)]/40 rounded-xl p-3.5 text-[13px] font-bold text-[var(--color-atelier-grafite)] outline-none shadow-inner h-[46px] resize-none h-14 custom-scrollbar" 
                        />
                      </div>
                    </div>

                    {/* Linha 2: Redação de Diagnósticos e Justificativas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col gap-4 group/edit transition-colors hover:border-[var(--color-atelier-terracota)]/20">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] border-b border-gray-50 pb-3 flex items-center justify-between">
                          <span>Justificativa Estratégica (Oceano Azul)</span>
                          <Edit3 size={12} className="text-gray-300"/>
                        </label>
                        <textarea 
                          value={strategicBlueprint.strategic_justification} 
                          onChange={(e) => setStrategicBlueprint({...strategicBlueprint, strategic_justification: e.target.value})} 
                          rows={6} 
                          placeholder="Fundamente cientificamente o porquê destas mudanças estruturais baseadas no posicionamento do cliente..."
                          className="w-full bg-transparent text-[13px] leading-relaxed text-[var(--color-atelier-grafite)] font-medium outline-none resize-none custom-scrollbar" 
                        />
                      </div>

                      <div className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col gap-4 group/edit transition-colors hover:border-[var(--color-atelier-terracota)]/20">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] border-b border-gray-50 pb-3 flex items-center justify-between">
                          <span>Posicionamento de Mercado</span>
                          <Edit3 size={12} className="text-gray-300"/>
                        </label>
                        <textarea 
                          value={strategicBlueprint.market_positioning} 
                          onChange={(e) => setStrategicBlueprint({...strategicBlueprint, market_positioning: e.target.value})} 
                          rows={6} 
                          placeholder="Defina a proposta única de valor (UVP) de elite que o cliente deve assumir no mercado digital..."
                          className="w-full bg-transparent text-[13px] leading-relaxed text-[var(--color-atelier-grafite)] font-medium outline-none resize-none custom-scrollbar" 
                        />
                      </div>
                    </div>

                    {/* Linha 3: Diagnósticos Visuais e de Conduta */}
                    <div className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col gap-4 group/edit transition-colors hover:border-[var(--color-atelier-terracota)]/20">
                      <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] border-b border-gray-50 pb-3 flex items-center justify-between">
                        <span>Diagnóstico Visual e Estético (Semiótica)</span>
                        <Edit3 size={12} className="text-gray-300"/>
                      </label>
                      <textarea 
                        value={strategicBlueprint.visual_diagnosis} 
                        onChange={(e) => setStrategicBlueprint({...strategicBlueprint, visual_diagnosis: e.target.value})} 
                        rows={4} 
                        placeholder="Prescreva paletas cromáticas, tipografia e diretrizes de composição editorial..."
                        className="w-full bg-transparent text-[13px] leading-relaxed text-[var(--color-atelier-grafite)] font-medium outline-none resize-none custom-scrollbar" 
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col gap-4 group/edit transition-colors hover:border-[var(--color-atelier-terracota)]/20">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] border-b border-gray-50 pb-3 flex items-center justify-between">
                          <span>Tom de Voz (Brand Persona)</span>
                          <Edit3 size={12} className="text-gray-300"/>
                        </label>
                        <textarea 
                          value={strategicBlueprint.tone_of_voice} 
                          onChange={(e) => setStrategicBlueprint({...strategicBlueprint, tone_of_voice: e.target.value})} 
                          rows={4} 
                          placeholder="Como a marca deve comunicar de forma prescritiva e soberana no nicho?"
                          className="w-full bg-transparent text-[13px] leading-relaxed text-[var(--color-atelier-grafite)] font-medium outline-none resize-none custom-scrollbar" 
                        />
                      </div>

                      <div className="bg-white p-8 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col gap-4 group/edit transition-colors hover:border-[var(--color-atelier-terracota)]/20">
                        <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] border-b border-gray-50 pb-3 flex items-center justify-between">
                          <span>Dinâmica de Stories (Conversão Direct)</span>
                          <Edit3 size={12} className="text-gray-300"/>
                        </label>
                        <textarea 
                          value={strategicBlueprint.stories_strategy} 
                          onChange={(e) => setStrategicBlueprint({...strategicBlueprint, stories_strategy: e.target.value})} 
                          rows={4} 
                          placeholder="Mapeie o protocolo de roteirização diária (Manhã/Tarde/Noite) focado em atração de leads..."
                          className="w-full bg-transparent text-[13px] leading-relaxed text-[var(--color-atelier-grafite)] font-medium outline-none resize-none custom-scrollbar" 
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* ACTION FOOTER BAR (BOTÕES DE OPERAÇÃO) */}
            <div className="p-6 md:p-8 border-t border-[var(--color-atelier-grafite)]/10 bg-white/80 backdrop-blur-md shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4 z-20">
              <div>
                {step === 2 && (
                  <button 
                    onClick={handleBack}
                    className="px-6 py-3 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors flex items-center gap-2"
                  >
                    <ChevronLeft size={14}/> Voltar ao Cadastro
                  </button>
                )}
              </div>

              <div className="flex gap-3 w-full sm:w-auto justify-end">
                {step === 1 ? (
                  <button 
                    onClick={handleAdvance}
                    className="w-full sm:w-auto px-8 bg-[var(--color-atelier-grafite)] text-white py-4 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest shadow-md hover:bg-[var(--color-atelier-terracota)] transition-colors flex items-center justify-center gap-2 group"
                  >
                    Avançar para Estratégia <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform"/>
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={handleSaveConsulting}
                      disabled={isSaving || isExporting}
                      className="flex-1 sm:flex-none px-8 bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] py-4 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest shadow-sm hover:border-[var(--color-atelier-terracota)]/40 hover:text-[var(--color-atelier-terracota)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} 
                      Gravar no CRM
                    </button>

                    <button 
                      onClick={handleExportPDF}
                      disabled={isSaving || isExporting}
                      className="flex-1 sm:flex-none px-8 bg-[var(--color-atelier-terracota)] text-white py-4 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest shadow-lg hover:bg-[#8c562e] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                    >
                      {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      Exportar PDF Oficial
                    </button>
                  </>
                )}
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}