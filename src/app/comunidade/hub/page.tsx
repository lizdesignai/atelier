// src/app/comunidade/hub/page.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Handshake, Briefcase, Users, Search, Plus, 
  ArrowRight, ExternalLink, MessageSquare, Building2, MapPin, DollarSign
} from "lucide-react";
import Link from "next/link";

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// MOCK DE DADOS B2B (Estrutura pronta para plugar no Supabase na tabela 'b2b_pitches')
const B2B_DATABASE = [
  {
    id: "p1",
    type: "demand", // 'demand' = Procurando | 'offer' = Oferecendo
    title: "Procura-se Gestor de Tráfego Especialista em E-commerce",
    company: "Lumina Brand",
    author: "Sofia Almeida",
    avatar: "https://i.pravatar.cc/150?img=5",
    location: "Remoto / Lisboa",
    budget: "€1.000 - €2.500 / mês",
    description: "Estamos a escalar a nossa operação de e-commerce e precisamos de um parceiro de tráfego pago focado em conversão e ROAS. Preferência por quem já tem experiência com marcas de moda.",
    tags: ["Tráfego Pago", "E-commerce", "Meta Ads"],
    date: "Há 2 horas"
  },
  {
    id: "p2",
    type: "offer",
    title: "Consultoria Jurídica para Agências e Infoprodutores",
    company: "LexTech Law",
    author: "Dr. Tiago Mendes",
    avatar: "https://i.pravatar.cc/150?img=11",
    location: "Remoto",
    budget: "A partir de €500",
    description: "Sou especialista em blindagem jurídica para negócios digitais. Ofereço revisão de contratos de prestação de serviços, termos de uso e políticas de privacidade com 15% de desconto para membros do Atelier.",
    tags: ["Legal", "Contratos", "Consultoria"],
    date: "Ontem"
  },
  {
    id: "p3",
    type: "demand",
    title: "Buscamos Copywriter para Lançamento High-Ticket",
    company: "VRTICE Mastermind",
    author: "Ricardo Gomes",
    avatar: "https://i.pravatar.cc/150?img=33",
    location: "Remoto",
    budget: "A negociar (% + Fixo)",
    description: "Temos um produto formatado no nicho de finanças e precisamos de um copywriter de resposta direta para assumir a página de vendas, VSL e automação de e-mails.",
    tags: ["Copywriting", "Lançamento", "High-Ticket"],
    date: "Há 3 dias"
  },
  {
    id: "p4",
    type: "offer",
    title: "Desenvolvimento de Aplicações Web (SaaS / Portais)",
    company: "CodeCraft Solutions",
    author: "Elena Silva",
    avatar: "https://i.pravatar.cc/150?img=44",
    location: "Remoto / Porto",
    budget: "Projetos a partir de €3.000",
    description: "A nossa software house ajuda marcas a criarem os seus próprios produtos SaaS ou portais de clientes. Se o seu negócio precisa de tecnologia proprietária, nós construímos com arquitetura escalável.",
    tags: ["Desenvolvimento", "SaaS", "Web"],
    date: "Há 1 semana"
  }
];

export default function HubB2BPage() {
  const [activeTab, setActiveTab] = useState<'demand' | 'offer'>('demand');
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPitches = B2B_DATABASE.filter(pitch => 
    pitch.type === activeTab && 
    (pitch.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     pitch.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="flex flex-col gap-6 w-full animate-[fadeInUp_0.8s_ease-out_both]">
      
      {/* HEADER DO HUB */}
      <div className="flex flex-col gap-2 px-2 mt-4 md:mt-0">
        <Link href="/comunidade?grupo=networking" className="inline-flex items-center gap-2 text-[var(--color-atelier-grafite)]/50 hover:text-[var(--color-atelier-terracota)] transition-colors font-roboto text-[11px] uppercase tracking-widest font-bold mb-2">
          ← Voltar ao Networking
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Handshake size={28} className="text-[var(--color-atelier-terracota)]" />
            <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] leading-none">Hub de Negócios</h1>
          </div>
          <button 
            onClick={() => showToast("Em breve: Formulário de Novo Pitch!")}
            className="hidden md:flex bg-[var(--color-atelier-grafite)] text-white px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-[var(--color-atelier-terracota)] transition-all items-center gap-2 shadow-md hover:-translate-y-0.5"
          >
            <Plus size={14} /> Novo Pitch
          </button>
        </div>
        <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/70 max-w-xl mt-1">
          A rede exclusiva para clientes e parceiros do Atelier. Contrate fornecedores de confiança ou ofereça os serviços da sua empresa.
        </p>
      </div>

      {/* SEARCH E TABS */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mt-2">
        <div className="flex gap-2 p-1.5 bg-white/60 border border-white rounded-2xl shadow-sm w-full md:w-fit">
          <button 
            onClick={() => setActiveTab('demand')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'demand' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}
          >
            <Users size={14} className={activeTab === 'demand' ? 'text-[var(--color-atelier-terracota)]' : ''} /> 
            Procurando ({B2B_DATABASE.filter(p => p.type === 'demand').length})
          </button>
          <button 
            onClick={() => setActiveTab('offer')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'offer' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-[var(--color-atelier-grafite)]/50 hover:bg-white/50'}`}
          >
            <Briefcase size={14} className={activeTab === 'offer' ? 'text-[var(--color-atelier-terracota)]' : ''} /> 
            Oferecendo ({B2B_DATABASE.filter(p => p.type === 'offer').length})
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40" />
          <input 
            type="text" 
            placeholder="Filtrar por skill ou nicho..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 border border-white shadow-sm rounded-full py-2.5 pl-10 pr-4 text-[12px] font-roboto outline-none focus:border-[var(--color-atelier-terracota)]/30 transition-all text-[var(--color-atelier-grafite)]"
          />
        </div>
      </div>

      {/* MOBILE CTA */}
      <button 
        onClick={() => showToast("Em breve: Formulário de Novo Pitch!")}
        className="md:hidden w-full bg-[var(--color-atelier-grafite)] text-white px-5 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-md flex items-center justify-center gap-2"
      >
        <Plus size={14} /> Criar Novo Pitch
      </button>

      {/* LISTA DE PITCHES B2B */}
      <div className="flex flex-col gap-6 pb-10">
        <AnimatePresence mode="wait">
          {filteredPitches.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16 glass-panel rounded-[2.5rem] opacity-60">
              <Search size={40} className="mx-auto mb-4 text-[var(--color-atelier-grafite)]/30" />
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Nenhuma oportunidade encontrada.</h3>
              <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60 mt-1">Tente pesquisar por outras palavras-chave ou crie o seu próprio pitch.</p>
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
                <div key={pitch.id} className="glass-panel bg-white/80 p-6 md:p-8 rounded-[2.5rem] border border-white shadow-[0_10px_30px_rgba(122,116,112,0.05)] flex flex-col group hover:border-[var(--color-atelier-terracota)]/20 transition-colors relative overflow-hidden">
                  
                  {/* Tarja de Tipo */}
                  <div className={`absolute top-0 left-0 w-full h-1.5 ${pitch.type === 'demand' ? 'bg-blue-500' : 'bg-[var(--color-atelier-terracota)]'}`}></div>

                  {/* Topo: Autor e Empresa */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--color-atelier-grafite)]/10 shadow-sm">
                        <img src={pitch.avatar} alt={pitch.author} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)]">{pitch.company}</span>
                        <span className="text-[11px] text-[var(--color-atelier-grafite)]/50 font-roboto">{pitch.author} • {pitch.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo do Pitch */}
                  <div className="flex flex-col gap-3">
                    <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-tight">{pitch.title}</h3>
                    
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/60">
                        <MapPin size={12} /> {pitch.location}
                      </div>
                      <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-green-700">
                        <DollarSign size={12} /> {pitch.budget}
                      </div>
                    </div>

                    <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/80 leading-relaxed mb-2">
                      {pitch.description}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {pitch.tags.map(tag => (
                        <span key={tag} className="bg-[var(--color-atelier-terracota)]/5 text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/10 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Call to Action */}
                  <div className="mt-6 pt-5 border-t border-[var(--color-atelier-grafite)]/5 flex justify-end">
                    <button 
                      onClick={() => showToast(`A abrir conversa com ${pitch.author}...`)}
                      className="bg-white border border-[var(--color-atelier-grafite)]/20 px-5 py-2.5 rounded-xl font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] hover:bg-[var(--color-atelier-grafite)] hover:text-white transition-all shadow-sm flex items-center gap-2"
                    >
                      <MessageSquare size={14} /> Falar com {pitch.author.split(' ')[0]}
                    </button>
                  </div>

                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}