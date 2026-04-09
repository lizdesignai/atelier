// src/app/comunidade/hub/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Handshake, Briefcase, Users, Search, Plus, 
  ArrowRight, ExternalLink, MessageSquare, Building2, MapPin, DollarSign, X, Loader2, Send
} from "lucide-react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { NotificationEngine } from "../../../lib/NotificationEngine"; // 🔔 INJEÇÃO DO MOTOR DE NOTIFICAÇÕES

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// Formata a data para leitura humana (ex: "Há 2 horas")
function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Agora mesmo";
  if (diffMins < 60) return `Há ${diffMins} min`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Há ${diffHours} horas`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return `Ontem`;
  return `Há ${diffDays} dias`;
}

export default function HubB2BPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [pitches, setPitches] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'demand' | 'offer'>('demand');
  const [searchQuery, setSearchQuery] = useState("");

  // Estados do Modal de Novo Pitch
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'demand' as 'demand' | 'offer',
    title: '',
    company: '',
    location: '',
    budget: '',
    description: '',
    tags: ''
  });

  // 1. Busca os Dados Iniciais
  useEffect(() => {
    const fetchHubData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profileData) setUserProfile(profileData);

        // Tabela esperada: 'b2b_pitches'
        const { data: pitchesData, error } = await supabase
          .from('b2b_pitches')
          .select('*, profiles(nome, avatar_url, username)')
          .order('created_at', { ascending: false });

        if (!error && pitchesData) {
          setPitches(pitchesData);
        }
      } catch (error) {
        console.error("Erro ao carregar o Hub B2B:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHubData();
  }, []);

  // 2. Criação Funcional do Pitch
  const handleCreatePitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !userProfile) {
      showToast("Preencha o título e a descrição para publicar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t !== '');
      
      const { data: insertedPitch, error } = await supabase
        .from('b2b_pitches')
        .insert({
          author_id: userProfile.id,
          type: formData.type,
          title: formData.title,
          company: formData.company || userProfile.empresa || "",
          location: formData.location,
          budget: formData.budget,
          description: formData.description,
          tags: tagsArray
        })
        .select('*, profiles(nome, avatar_url, username)')
        .single();

      if (error) throw error;

      // Atualização Otimista
      setPitches([insertedPitch, ...pitches]);
      setIsModalOpen(false);
      setFormData({ type: 'demand', title: '', company: '', location: '', budget: '', description: '', tags: '' });
      showToast("Oportunidade publicada com sucesso no Hub!");

      // 🔔 NOTIFICAÇÃO: Gestão (Avisa que um negócio pode estar a nascer no Hub)
      await NotificationEngine.notifyManagement(
        "🤝 Novo Pitch B2B",
        `${userProfile.nome} publicou uma nova ${formData.type === 'demand' ? 'Procura' : 'Oferta'} no Hub de Negócios.`,
        "info",
        "/comunidade/hub"
      );

    } catch (error) {
      showToast("Erro ao publicar o seu Pitch. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Ação de Networking Real (Disparo de Interesse)
  const handleConnect = async (pitch: any) => {
    if (!userProfile) return;
    
    if (pitch.author_id === userProfile.id) {
      showToast("Este é o seu próprio pitch.");
      return;
    }

    showToast(`A enviar sinal de interesse para ${pitch.profiles?.nome?.split(' ')[0]}...`);
    
    try {
      // 🔔 NOTIFICAÇÃO DIRETA: O autor do pitch recebe o alerta que alguém quer fazer negócio
      await NotificationEngine.notifyUser(
        pitch.author_id,
        "🤝 Novo Interesse de Parceria!",
        `${userProfile.nome} manifestou interesse no seu pitch: "${pitch.title}". Entre em contacto na Comunidade!`,
        "success",
        "/comunidade" // Rota onde eles se podem procurar
      );
      
      showToast("Interesse enviado! O autor foi notificado no Cockpit dele.");
    } catch (error) {
      showToast("Erro ao processar o contacto.");
    }
  };

  // Lógica de Pesquisa Local
  const filteredPitches = pitches.filter(pitch => 
    pitch.type === activeTab && 
    (pitch.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     pitch.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     pitch.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto animate-[fadeInUp_0.8s_ease-out_both] pb-10 px-4 md:px-0">
      
      {/* HEADER DO HUB */}
      <div className="flex flex-col gap-3 mt-6">
        <Link href="/comunidade?grupo=networking" className="inline-flex items-center gap-2 text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors font-roboto text-[10px] uppercase tracking-widest font-bold mb-2 bg-white/60 w-fit px-4 py-2 rounded-full border border-white shadow-sm">
          ← Voltar ao Networking
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Handshake size={32} className="text-[var(--color-atelier-terracota)]" />
            <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] leading-none tracking-tight">Hub de <span className="italic text-[var(--color-atelier-terracota)]">Negócios.</span></h1>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="hidden md:flex bg-[var(--color-atelier-grafite)] text-white px-6 py-3.5 rounded-[1.2rem] text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-all items-center gap-2 shadow-md hover:-translate-y-0.5"
          >
            <Plus size={16} /> Novo Pitch
          </button>
        </div>
        <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/70 max-w-xl mt-1 font-medium leading-relaxed">
          A rede exclusiva para clientes e parceiros do Atelier. Contrate fornecedores de confiança ou escale os serviços da sua empresa no nosso ecossistema.
        </p>
      </div>

      {/* SEARCH E TABS */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mt-2">
        <div className="flex gap-2 p-1.5 bg-white/60 border border-white/80 rounded-[1.5rem] shadow-sm w-full md:w-fit">
          <button 
            onClick={() => setActiveTab('demand')}
            className={`flex-1 md:flex-none px-8 py-3.5 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'demand' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white hover:text-[var(--color-atelier-grafite)]'}`}
          >
            <Users size={14} className={activeTab === 'demand' ? 'text-[var(--color-atelier-terracota)]' : ''} /> 
            Procurando ({pitches.filter(p => p.type === 'demand').length})
          </button>
          <button 
            onClick={() => setActiveTab('offer')}
            className={`flex-1 md:flex-none px-8 py-3.5 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'offer' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white hover:text-[var(--color-atelier-grafite)]'}`}
          >
            <Briefcase size={14} className={activeTab === 'offer' ? 'text-[var(--color-atelier-terracota)]' : ''} /> 
            Oferecendo ({pitches.filter(p => p.type === 'offer').length})
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40" />
          <input 
            type="text" 
            placeholder="Filtrar por skill ou nicho..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 border border-white shadow-sm rounded-[1.5rem] py-4 pl-12 pr-5 text-[13px] font-roboto font-medium outline-none focus:bg-white focus:border-[var(--color-atelier-terracota)]/30 transition-all text-[var(--color-atelier-grafite)]"
          />
        </div>
      </div>

      {/* MOBILE CTA */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="md:hidden w-full bg-[var(--color-atelier-grafite)] text-white px-5 py-4 rounded-[1.2rem] text-[11px] font-bold uppercase tracking-widest shadow-md flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform"
      >
        <Plus size={16} /> Criar Novo Pitch
      </button>

      {/* =========================================================================
          LISTA DE PITCHES B2B
          ========================================================================= */}
      <div className="flex flex-col gap-6 pb-10 mt-2">
        {isLoading ? (
          <div className="flex justify-center p-16"><Loader2 size={32} className="animate-spin text-[var(--color-atelier-terracota)]" /></div>
        ) : (
          <AnimatePresence mode="wait">
            {filteredPitches.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20 glass-panel border border-white rounded-[3rem] opacity-70">
                <Search size={48} className="mx-auto mb-4 text-[var(--color-atelier-grafite)]/30" />
                <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Nenhuma oportunidade encontrada.</h3>
                <p className="font-roboto text-[14px] font-medium text-[var(--color-atelier-grafite)]/60 mt-2">Tente pesquisar por outras palavras-chave ou crie o seu próprio pitch.</p>
              </motion.div>
            ) : (
              <motion.div 
                key={activeTab} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }} 
                className="grid grid-cols-1 gap-6"
              >
                {filteredPitches.map((pitch) => (
                  <div key={pitch.id} className="glass-panel bg-white/70 p-6 md:p-8 rounded-[2.5rem] border border-white shadow-sm flex flex-col group hover:shadow-md hover:bg-white hover:border-[var(--color-atelier-terracota)]/20 transition-all relative overflow-hidden">
                    
                    {/* Tarja de Tipo Lateral */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${pitch.type === 'demand' ? 'bg-blue-500' : 'bg-[var(--color-atelier-terracota)]'}`}></div>

                    {/* Topo: Autor e Empresa */}
                    <div className="flex justify-between items-start mb-5 pl-2">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white shadow-sm shrink-0 flex items-center justify-center bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] font-elegant text-xl">
                          {pitch.profiles?.avatar_url ? (
                            <img src={pitch.profiles.avatar_url} alt={pitch.profiles.nome} className="w-full h-full object-cover" />
                          ) : (
                            pitch.profiles?.nome?.charAt(0) || "A"
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-roboto font-bold text-[15px] text-[var(--color-atelier-grafite)]">{pitch.company || pitch.profiles?.nome}</span>
                          <span className="text-[11px] text-[var(--color-atelier-grafite)]/50 font-roboto font-medium mt-0.5">{pitch.profiles?.nome} • {timeAgo(pitch.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Conteúdo do Pitch */}
                    <div className="flex flex-col gap-4 pl-2">
                      <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] leading-tight">{pitch.title}</h3>
                      
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        {pitch.location && (
                          <div className="flex items-center gap-1.5 bg-white border border-[var(--color-atelier-grafite)]/10 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 shadow-sm">
                            <MapPin size={12} /> {pitch.location}
                          </div>
                        )}
                        {pitch.budget && (
                          <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-green-700 shadow-sm">
                            <DollarSign size={12} /> {pitch.budget}
                          </div>
                        )}
                      </div>

                      <p className="font-roboto text-[14px] font-medium text-[var(--color-atelier-grafite)]/80 leading-relaxed mb-2 bg-white/40 p-5 rounded-2xl border border-white">
                        {pitch.description}
                      </p>

                      {pitch.tags && pitch.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {pitch.tags.map((tag: string) => (
                            <span key={tag} className="bg-[var(--color-atelier-terracota)]/5 text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/10 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Call to Action (Networking Real) */}
                    <div className="mt-6 pt-5 border-t border-[var(--color-atelier-grafite)]/5 flex justify-end pl-2">
                      <button 
                        onClick={() => handleConnect(pitch)}
                        className="bg-white border border-[var(--color-atelier-grafite)]/10 px-6 py-3.5 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-grafite)] hover:text-white transition-all shadow-sm flex items-center gap-2 hover:-translate-y-0.5"
                      >
                        <MessageSquare size={16} /> Falar com {pitch.profiles?.nome?.split(' ')[0] || "Membro"}
                      </button>
                    </div>

                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* =========================================================================
          MODAL DE CRIAÇÃO DO PITCH (Glassmorphism Luxuoso)
          ========================================================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-[var(--color-atelier-grafite)]/60 backdrop-blur-md cursor-pointer" />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="glass-panel bg-white p-8 md:p-10 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.15)] relative z-10 w-full max-w-2xl border border-white flex flex-col gap-6 overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 w-10 h-10 bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center text-[var(--color-atelier-grafite)]/50 transition-colors shadow-sm">
                <X size={18} />
              </button>

              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-[1rem] bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center border border-[var(--color-atelier-terracota)]/20 shadow-inner">
                  <Handshake size={24} />
                </div>
                <div>
                  <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Elaborar Pitch B2B</h3>
                  <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest font-bold mt-1">Conecte-se ao ecossistema Atelier</p>
                </div>
              </div>

              <form onSubmit={handleCreatePitch} className="flex flex-col gap-5 mt-2">
                
                {/* Tipo de Pitch */}
                <div className="flex gap-4">
                  <label className={`flex-1 p-4 rounded-2xl border cursor-pointer transition-all shadow-sm flex items-center gap-3 ${formData.type === 'demand' ? 'bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)]/30' : 'bg-gray-50/50 border-gray-100 hover:border-[var(--color-atelier-grafite)]/20'}`}>
                    <input type="radio" name="pitchType" className="hidden" checked={formData.type === 'demand'} onChange={() => setFormData({...formData, type: 'demand'})} />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.type === 'demand' ? 'border-[var(--color-atelier-terracota)]' : 'border-[var(--color-atelier-grafite)]/20'}`}>
                      {formData.type === 'demand' && <div className="w-2.5 h-2.5 bg-[var(--color-atelier-terracota)] rounded-full"></div>}
                    </div>
                    <div className="flex flex-col">
                      <span className={`font-roboto text-[13px] font-bold ${formData.type === 'demand' ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/60'}`}>Procurando</span>
                      <span className="text-[10px] text-[var(--color-atelier-grafite)]/40 font-medium">Preciso contratar</span>
                    </div>
                  </label>

                  <label className={`flex-1 p-4 rounded-2xl border cursor-pointer transition-all shadow-sm flex items-center gap-3 ${formData.type === 'offer' ? 'bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)]/30' : 'bg-gray-50/50 border-gray-100 hover:border-[var(--color-atelier-grafite)]/20'}`}>
                    <input type="radio" name="pitchType" className="hidden" checked={formData.type === 'offer'} onChange={() => setFormData({...formData, type: 'offer'})} />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.type === 'offer' ? 'border-[var(--color-atelier-terracota)]' : 'border-[var(--color-atelier-grafite)]/20'}`}>
                      {formData.type === 'offer' && <div className="w-2.5 h-2.5 bg-[var(--color-atelier-terracota)] rounded-full"></div>}
                    </div>
                    <div className="flex flex-col">
                      <span className={`font-roboto text-[13px] font-bold ${formData.type === 'offer' ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/60'}`}>Oferecendo</span>
                      <span className="text-[10px] text-[var(--color-atelier-grafite)]/40 font-medium">Presto serviço</span>
                    </div>
                  </label>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Título do Pitch</label>
                  <input type="text" required placeholder="Ex: Preciso de Gestor de Tráfego Sênior" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-50/50 border border-gray-200 focus:border-[var(--color-atelier-terracota)]/40 rounded-2xl px-5 py-4 text-[13px] font-medium outline-none transition-colors" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Empresa / Marca</label>
                    <input type="text" placeholder="Nome do seu negócio" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="w-full bg-gray-50/50 border border-gray-200 focus:border-[var(--color-atelier-terracota)]/40 rounded-2xl px-5 py-4 text-[13px] font-medium outline-none transition-colors" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Localização</label>
                    <input type="text" placeholder="Ex: Remoto / Lisboa" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full bg-gray-50/50 border border-gray-200 focus:border-[var(--color-atelier-terracota)]/40 rounded-2xl px-5 py-4 text-[13px] font-medium outline-none transition-colors" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Orçamento / Budget</label>
                  <input type="text" placeholder="Ex: A partir de €1.000 ou Negociável" value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} className="w-full bg-gray-50/50 border border-gray-200 focus:border-[var(--color-atelier-terracota)]/40 rounded-2xl px-5 py-4 text-[13px] font-medium outline-none transition-colors" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Descrição Detalhada</label>
                  <textarea required rows={4} placeholder="Explique os requisitos, o desafio e o tipo de parceria que procura..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-50/50 border border-gray-200 focus:border-[var(--color-atelier-terracota)]/40 rounded-2xl px-5 py-4 text-[13px] font-medium outline-none transition-colors resize-none custom-scrollbar" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60 pl-1">Tags (Separadas por vírgula)</label>
                  <input type="text" placeholder="Ex: Meta Ads, Consultoria, Legal" value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} className="w-full bg-gray-50/50 border border-gray-200 focus:border-[var(--color-atelier-terracota)]/40 rounded-2xl px-5 py-4 text-[13px] font-medium outline-none transition-colors" />
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-6 border-t border-[var(--color-atelier-grafite)]/5">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-4 rounded-[1.2rem] font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 hover:bg-gray-100 hover:text-[var(--color-atelier-grafite)] transition-colors">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="px-8 py-4 rounded-[1.2rem] bg-[var(--color-atelier-terracota)] text-white font-roboto text-[11px] font-bold uppercase tracking-[0.1em] shadow-md hover:bg-[#8c562e] transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 
                    Publicar Oportunidade
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}