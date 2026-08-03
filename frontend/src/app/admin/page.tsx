// src/app/admin/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase"; 
import { 
  Loader2, Sparkles, BrainCircuit, FileText, Calendar, 
  Save, Plus, X, Phone, Mail, Instagram, Briefcase, 
  Clock, CheckCircle, AlertCircle, FileSearch, Trash2, ArrowRight
} from "lucide-react";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'consultoria' | 'briefings' | 'reunioes'>('consultoria');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados de Dados
  const [consultorias, setConsultorias] = useState<any[]>([]);
  const [briefings, setBriefings] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Bloco de Notas Diário
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  // 🟢 CORREÇÃO: Padronização da nomenclatura da função modificadora de estado
  const [noteContent, setNoteContent] = useState<string>("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Agendador de Reunião
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ leadId: "", title: "", date: "", notes: "" });

  // Carregar dados iniciais do ecossistema
  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [resLeads, resBriefings, resMeetings, resNotes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('client_briefings').select('*, profiles(nome, empresa, email)').order('created_at', { ascending: false }),
        supabase.from('prospect_meetings').select('*, leads(nome, instagram, telefone)').order('meeting_date', { ascending: true }),
        supabase.from('admin_daily_notes').select('content').eq('date_log', selectedDate).maybeSingle()
      ]);

      if (resLeads.data) setConsultorias(resLeads.data);
      if (resBriefings.data) setBriefings(resBriefings.data);
      if (resMeetings.data) setMeetings(resMeetings.data);
      setNoteContent(resNotes.data?.content || "");
    } catch (e) {
      showToast("Erro ao sincronizar QG Estratégico.");
    } finally {
      setIsLoading(false);
    }
  };

  // Salvar nota diária
  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      const { error } = await supabase.from('admin_daily_notes').upsert({
        date_log: selectedDate,
        content: noteContent,
        updated_at: new Date().toISOString()
      }, { onConflict: 'date_log' });

      if (error) throw error;
      showToast("📝 Nota diária preservada no banco!");
    } catch (e) {
      showToast("Erro ao salvar nota.");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Agendar Reunião com Prospect
  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.leadId || !meetingForm.title || !meetingForm.date) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase.from('prospect_meetings').insert({
        lead_id: meetingForm.leadId,
        title: meetingForm.title,
        meeting_date: new Date(meetingForm.date).toISOString(),
        notes: meetingForm.notes
      });

      if (error) throw error;
      showToast("🗓️ Reunião de Prospecção agendada!");
      setIsMeetingModalOpen(false);
      setMeetingForm({ leadId: "", title: "", date: "", notes: "" });
      fetchDashboardData();
    } catch (e) {
      showToast("Erro ao agendar reunião.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-auto min-h-[calc(100dvh-60px)] md:h-[calc(100vh-60px)] max-w-[1500px] mx-auto pb-4 gap-6 overflow-y-auto md:overflow-hidden mt-4 px-4 lg:px-0 animate-[fadeInUp_0.6s_ease-out_both]">
      
      {/* SEÇÃO ESQUERDA (80%): PAINEL OPERACIONAL DE CAPTAÇÃO */}
      <div className="flex-1 flex flex-col glass-panel bg-white/60 rounded-[2.5rem] border border-white shadow-sm p-6 lg:p-8 overflow-hidden h-auto md:h-full">
        
        {/* HEADER EXECUTIVO */}
        <header className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4 shrink-0 mb-6 border-b border-gray-100 pb-4">

          <div className="flex bg-gray-100/80 p-1.5 rounded-2xl shadow-inner w-full md:w-auto">
            <button onClick={() => { setActiveTab('consultoria'); setSelectedItem(null); }} className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'consultoria' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-gray-400'}`}>Consultorias ({consultorias.length})</button>
            <button onClick={() => { setActiveTab('briefings'); setSelectedItem(null); }} className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'briefings' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-gray-400'}`}>Briefings ({briefings.length})</button>
            <button onClick={() => { setActiveTab('reunioes'); setSelectedItem(null); }} className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'reunioes' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-400'}`}>Agenda Comercial</button>
          </div>
        </header>

        {/* LISTAGENS OPERACIONAIS */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-3">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 size={24} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>
          ) : (
            <AnimatePresence mode="wait">
              
              {/* LISTA CONSULTORIAS IA */}
              {activeTab === 'consultoria' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
                  {consultorias.map(lead => (
                    <div key={lead.id} onClick={() => setSelectedItem({ type: 'consultoria', data: lead })} className="p-4 rounded-xl border border-gray-100 bg-white/80 hover:border-[var(--color-atelier-terracota)]/40 hover:bg-white flex justify-between items-center transition-all cursor-pointer group shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center font-elegant text-xl text-purple-600">{lead.nome?.charAt(0)}</div>
                        <div>
                          <h4 className="font-bold text-[14px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors">{lead.nome}</h4>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{lead.nicho || 'Nicho Não Informado'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[11px] font-mono text-gray-400">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
                        <ArrowRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* LISTA BRIEFINGS SUBMETIDOS */}
              {activeTab === 'briefings' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
                  {briefings.map(brief => (
                    <div key={brief.id} onClick={() => setSelectedItem({ type: 'briefing', data: brief })} className="p-4 rounded-xl border border-gray-100 bg-white/80 hover:border-[var(--color-atelier-terracota)]/40 hover:bg-white flex justify-between items-center transition-all cursor-pointer group shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center font-elegant text-xl text-blue-600">{(brief.profiles?.nome || "C").charAt(0)}</div>
                        <div>
                          <h4 className="font-bold text-[14px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors">{brief.profiles?.nome || "Cliente"}</h4>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{brief.profiles?.empresa || 'Estúdio'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${brief.is_completed ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>{brief.is_completed ? 'Completo' : 'Em Análise'}</span>
                        <ArrowRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* LISTA REUNIÕES AGENDADAS */}
              {activeTab === 'reunioes' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2 relative">
                  <button onClick={() => setIsMeetingModalOpen(true)} className="mb-2 bg-[var(--color-atelier-terracota)] text-white px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest self-end hover:bg-[#8c562e] transition-colors shadow-sm flex items-center gap-2"><Plus size={14}/> Nova Reunião Comercial</button>
                  {meetings.map(meet => (
                    <div key={meet.id} className="p-4 rounded-xl border border-gray-50 bg-white shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center shrink-0"><Calendar size={18}/></div>
                        <div>
                          <h4 className="font-bold text-[14px] text-[var(--color-atelier-grafite)]">{meet.title}</h4>
                          <div className="flex gap-4 text-[11px] text-gray-400 font-medium mt-1">
                            <span>👤 {meet.leads?.nome}</span>
                            {meet.leads?.instagram && <span className="text-blue-500">🔗 {meet.leads.instagram}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] font-bold text-[var(--color-atelier-terracota)] bg-[var(--color-atelier-terracota)]/5 border border-[var(--color-atelier-terracota)]/10 px-3 py-1 rounded-lg">{new Date(meet.meeting_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

            </AnimatePresence>
          )}
        </div>
      </div>

      {/* SEÇÃO DIREITA (20%): BLOCO DE NOTAS DIÁRIO PERSISTENTE */}
      <div className="w-full lg:w-[360px] flex flex-col gap-4 shrink-0 h-auto lg:h-full">
        <div className="glass-panel bg-white/80 p-5 rounded-[2.5rem] border border-white shadow-sm flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Mural de Notas</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-[11px] font-bold outline-none border border-gray-100 p-1.5 rounded-lg text-[var(--color-atelier-grafite)] cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors" />
          </div>
          
          <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Escreva aqui insights, lembretes de prospecção ou observações para o dia de hoje..." className="flex-1 bg-[var(--color-atelier-creme)]/20 border border-gray-100 rounded-2xl p-4 text-[13px] font-medium text-[var(--color-atelier-grafite)] placeholder:text-gray-400 outline-none resize-none custom-scrollbar shadow-inner leading-relaxed" />
          
          <button onClick={handleSaveNote} disabled={isSavingNote} className="w-full mt-3 bg-[var(--color-atelier-grafite)] text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md hover:bg-[var(--color-atelier-terracota)] transition-all flex items-center justify-center gap-2">
            {isSavingNote ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Preservar Nota
          </button>
        </div>
      </div>

      {/* DETALHAMENTO DE FORMULÁRIOS SELECIONADOS (Drawer Lateral Modal) */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[600] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedItem(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-full md:max-w-2xl h-full bg-white relative z-10 shadow-2xl border-l border-gray-100 flex flex-col overflow-hidden">
              <header className="p-6 border-b bg-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">{selectedItem.type === 'consultoria' ? 'Ficha de Consultoria' : 'Ficha de Briefing'}</h3>
                  <span className="text-[11px] font-bold text-[var(--color-atelier-terracota)] uppercase tracking-widest block mt-0.5">{selectedItem.data.nome || selectedItem.data.answers?.Nome_Cliente || 'Formulário Submetido'}</span>
                </div>
                <button onClick={() => setSelectedItem(null)} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"><X size={16}/></button>
              </header>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6 bg-[#FAFAFA]">
                {selectedItem.type === 'consultoria' ? (
                  // MAPEAR CONSULTORIA DO PAINEL MAKE/REST
                  <div className="flex flex-col gap-4">
                     <DataField label="Nome do Prospect" value={selectedItem.data.nome} />
                     <DataField label="Melhor E-mail" value={selectedItem.data.email} />
                     <DataField label="WhatsApp" value={selectedItem.data.telefone} />
                     <DataField label="Instagram Informado" value={selectedItem.data.instagram} />
                     <DataField label="Nicho Corporativo" value={selectedItem.data.nicho} />
                     <div className="h-px bg-gray-200 my-2"></div>
                     <DataField label="Objetivos da Marca (Próximos 6 meses)" value={selectedItem.data.market_positioning} />
                     <DataField label="Diferencial de Mercado" value={selectedItem.data.strategic_justification} />
                     <DataField label="Personalidade da Marca (Se fosse uma pessoa)" value={selectedItem.data.ai_stories_strategy} />
                     <DataField label="Marcas / Referências Inspiracionais" value={selectedItem.data.ai_tone_of_voice} />
                     <DataField label="Como a Consultoria pode Ajudar?" value={selectedItem.data.ai_visual_diagnosis} />
                     <DataField label="Considerações Finais" value={selectedItem.data.ai_brand_archetype} />
                  </div>
                ) : (
                  // MAPEAR BRIEFING DE IDENTIDADE VISUAL
                  <div className="flex flex-col gap-4">
                     <DataField label="Nome do Cliente" value={selectedItem.data.answers?.Nome_Cliente} />
                     <DataField label="WhatsApp" value={selectedItem.data.answers?.WhatsApp} />
                     <DataField label="E-mail" value={selectedItem.data.answers?.Email} />
                     <div className="h-px bg-gray-200 my-2"></div>
                     <DataField label="Nome no Logotipo" value={selectedItem.data.answers?.Nome_Logotipo} />
                     <DataField label="Significado do Nome" value={selectedItem.data.answers?.Significado_Nome} />
                     <DataField label="Tagline Desejada" value={selectedItem.data.answers?.Tagline} />
                     <DataField label="Slogan Corporativo" value={selectedItem.data.answers?.Slogan} />
                     <DataField label="Produtos e Serviços" value={selectedItem.data.answers?.Produtos_Servicos} />
                     <DataField label="Motivo de Abertura / História" value={selectedItem.data.answers?.Motivo_Abertura} />
                     <DataField label="Propósito da Marca" value={selectedItem.data.answers?.Proposito} />
                     <DataField label="Emoji da Marca" value={selectedItem.data.answers?.Emoji_Empresa} />
                     <DataField label="Música da Marca" value={selectedItem.data.answers?.Musica_Empresa} />
                     <DataField label="Sentimento Core" value={selectedItem.data.answers?.Sentimento_Empresa} />
                     <DataField label="Visão em 5 Anos" value={selectedItem.data.answers?.Visao_5_Anos} />
                     <DataField label="Gênero do Público" value={selectedItem.data.answers?.Genero_Publico} />
                     <DataField label="Classe Social" value={selectedItem.data.answers?.Classe_Social} />
                     <DataField label="Idade do Público" value={selectedItem.data.answers?.Idade_Publico} />
                     <DataField label="Resumo do Público" value={selectedItem.data.answers?.Resumo_Publico} />
                     <DataField label="Links dos Concorrentes" value={selectedItem.data.answers?.Links_Concorrentes} />
                     <DataField label="O Que NÃO Fazer" value={selectedItem.data.answers?.O_Que_Nao_Fazer} />
                     <DataField label="Diferenciais" value={selectedItem.data.answers?.Diferencial} />
                     <DataField label="Referências Visuais" value={selectedItem.data.answers?.Referencias_Inspiracoes} />
                     <DataField label="Sentimento da Marca" value={selectedItem.data.answers?.Sentimento_Marca} />
                     <DataField label="Sentimento do Consumidor" value={selectedItem.data.answers?.Sentimento_Consumidor} />
                     <DataField label="Missão de Negócio" value={selectedItem.data.answers?.Missao} />
                     <DataField label="Adjetivos Selecionados" value={selectedItem.data.answers?.Top_3_Adjetivos} />
                     <DataField label="Considerações Finais" value={selectedItem.data.answers?.Ideias_Livres_Extras} />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EXPRESS MEETING SCHEDULER */}
      <AnimatePresence>
        {isMeetingModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMeetingModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95 }} className="bg-white p-6 md:p-8 rounded-none md:rounded-[2rem] shadow-2xl relative z-10 w-full h-full md:h-auto md:max-w-md border border-gray-100 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Agendar Reunião</h3>
                <button onClick={() => setIsMeetingModalOpen(false)} className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-gray-100 md:bg-transparent hover:bg-gray-200 transition-colors"><X size={18} className="md:w-4 md:h-4"/></button>
              </div>
              <form onSubmit={handleScheduleMeeting} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Prospect / Lead *</label>
                  <select required value={meetingForm.leadId} onChange={(e) => setMeetingForm({...meetingForm, leadId: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-[13px] font-medium text-[var(--color-atelier-grafite)] outline-none focus:border-[var(--color-atelier-terracota)]">
                    <option value="" disabled>Selecionar Pessoa da Triagem...</option>
                    {consultorias.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.instagram || c.email})</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Título / Objetivo *</label>
                  <input type="text" required placeholder="Ex: Alinhamento Comercial e Diagnóstico" value={meetingForm.title} onChange={(e) => setMeetingForm({...meetingForm, title: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-[13px] font-medium outline-none focus:border-[var(--color-atelier-terracota)]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Data e Hora *</label>
                  <input type="datetime-local" required value={meetingForm.date} onChange={(e) => setMeetingForm({...meetingForm, date: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-[13px] font-medium outline-none focus:border-[var(--color-atelier-terracota)]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Notas / Link</label>
                  <textarea placeholder="Link do Google Meet ou observações..." value={meetingForm.notes} onChange={(e) => setMeetingForm({...meetingForm, notes: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-[13px] font-medium outline-none focus:border-[var(--color-atelier-terracota)] h-20 resize-none" />
                </div>
                <button type="submit" disabled={isProcessing} className="w-full bg-[var(--color-atelier-terracota)] text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-md flex items-center justify-center gap-2 mt-2">
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />} Confirmar Agendamento
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Subcomponente de amostragem de dados profundos
function DataField({ label, value }: { label: string, value: any }) {
  if (!value) return null;
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1.5 transition-colors hover:border-[var(--color-atelier-terracota)]/10">
      <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">{label}</span>
      <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)] font-medium leading-relaxed whitespace-pre-wrap">{value.toString()}</p>
    </div>
  );
}