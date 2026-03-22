// src/app/admin/inbox/page.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Inbox, Search, Send, Paperclip, Image as ImageIcon, 
  MoreVertical, CheckCheck, Hash, Lock, Plus, 
  Settings2, Clock, ShieldCheck, ArrowRight, MessageSquare
} from "lucide-react";

// Função para disparar os Toasts Globais
const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ==========================================
// MOCKS DE DADOS (Relacionais)
// ==========================================
const CLIENTS = [
  { id: "c1", name: "Igor Castro", project: "IDV Premium", avatar: "https://ui-avatars.com/api/?name=Igor+Castro&background=ad6f40&color=fbf4e4", unread: 2 },
  { id: "c2", name: "Mariana Silva", project: "Rebranding", avatar: "https://ui-avatars.com/api/?name=Mariana+Silva&background=4a4643&color=fbf4e4", unread: 0 },
  { id: "c3", name: "Carlos Nogueira", project: "Identidade + Web", avatar: "https://ui-avatars.com/api/?name=Carlos+Nogueira&background=e8e2d7&color=4a4643", unread: 0 },
];

// Canais vinculados a cada cliente
const CHANNELS: Record<string, { id: string, name: string, isPrivate: boolean, unread: number }[]> = {
  "c1": [
    { id: "ch1_1", name: "avisos-gerais", isPrivate: false, unread: 0 },
    { id: "ch1_2", name: "aprovacoes-idv", isPrivate: false, unread: 2 },
    { id: "ch1_3", name: "envio-arquivos", isPrivate: false, unread: 0 },
    { id: "ch1_4", name: "notas-internas", isPrivate: true, unread: 0 }, // Canal só para a equipa
  ],
  "c2": [
    { id: "ch2_1", name: "avisos-gerais", isPrivate: false, unread: 0 },
    { id: "ch2_2", name: "moodboard-ref", isPrivate: false, unread: 0 },
  ],
  "c3": [
    { id: "ch3_1", name: "avisos-gerais", isPrivate: false, unread: 0 },
    { id: "ch3_2", name: "desenvolvimento-web", isPrivate: false, unread: 0 },
  ]
};

// Mensagens vinculadas a cada canal
const MESSAGES: Record<string, any[]> = {
  "ch1_2": [
    { id: 1, sender: "Atelier Team", isMe: true, time: "10:32", text: "Olá Igor! Passando para informar que a construção geométrica do símbolo foi finalizada. Pode verificar a proporção na imagem abaixo." },
    { id: 2, sender: "Atelier Team", isMe: true, time: "10:33", text: "Aplicámos a regra de ouro.", attachment: "https://images.unsplash.com/photo-1626785773985-944d18721bf1?q=80&w=2574&auto=format&fit=crop" },
    { id: 3, sender: "Igor Castro", isMe: false, time: "10:45", avatar: "https://ui-avatars.com/api/?name=Igor+Castro&background=ad6f40&color=fbf4e4", text: "Ficou absolutamente incrível! O contraste da serifa com o símbolo casou perfeitamente. Aprovado para seguirmos para o 3D." }
  ],
  "ch1_1": [
    { id: 4, sender: "Atelier Team", isMe: true, time: "Ontem", text: "Bem-vindo ao seu portal de marca. Toda a nossa comunicação será centralizada por aqui." }
  ]
};

export default function AdminInboxPage() {
  const [activeClientId, setActiveClientId] = useState(CLIENTS[0].id);
  const [activeChannelId, setActiveChannelId] = useState(CHANNELS[CLIENTS[0].id][1].id);
  const [messageText, setMessageText] = useState("");

  const activeClient = CLIENTS.find(c => c.id === activeClientId)!;
  const clientChannels = CHANNELS[activeClientId] || [];
  const activeChannel = clientChannels.find(ch => ch.id === activeChannelId) || clientChannels[0];
  const activeMessages = MESSAGES[activeChannelId] || [];

  // Mudar de Cliente e auto-selecionar o primeiro canal
  const handleClientSelect = (clientId: string) => {
    setActiveClientId(clientId);
    setActiveChannelId(CHANNELS[clientId][0].id);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim()) return;
    showToast(`Mensagem enviada no canal #${activeChannel.name}`);
    setMessageText("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          1. CABEÇALHO DO INBOX
          ========================================== */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] px-3 py-1.5 rounded-full flex items-center gap-2 border border-white shadow-sm">
              <Inbox size={14} className="text-[var(--color-atelier-terracota)]" />
              <span className="font-roboto text-[10px] uppercase tracking-widest font-bold">Comunicação Corporativa</span>
            </span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Caixa de <span className="text-[var(--color-atelier-terracota)] italic">Entrada.</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/60 backdrop-blur-md border border-white px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 text-[11px] font-roboto uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60">
            <Clock size={14} className="text-[var(--color-atelier-terracota)]" /> Tempo de Resposta: 14m
          </div>
        </div>
      </header>

      {/* ==========================================
          2. A ESTRUTURA DE 3 PAINÉIS (Slack-Style)
          ========================================== */}
      <div className="flex gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* PAINEL 1: DIRETÓRIO DE CLIENTES (280px) */}
        <div className="w-[300px] glass-panel rounded-[2.5rem] bg-white/40 border border-white/60 shadow-[0_15px_40px_rgba(122,116,112,0.05)] flex flex-col shrink-0 overflow-hidden">
          <div className="p-5 border-b border-[var(--color-atelier-grafite)]/5 bg-white/30 backdrop-blur-md shrink-0">
            <div className="relative group/search">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40 group-focus-within/search:text-[var(--color-atelier-terracota)] transition-colors" />
              <input 
                type="text" placeholder="Procurar cliente..." 
                className="w-full bg-white border border-white focus:border-[var(--color-atelier-terracota)]/30 rounded-xl py-2.5 pl-10 pr-4 text-[12px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2">
            <span className="px-3 pt-2 pb-1 font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Projetos Ativos</span>
            
            {CLIENTS.map((client) => (
              <div 
                key={client.id}
                onClick={() => handleClientSelect(client.id)}
                className={`
                  p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between border
                  ${activeClientId === client.id 
                    ? 'bg-white border-white shadow-[0_8px_20px_rgba(173,111,64,0.08)]' 
                    : 'bg-transparent border-transparent hover:bg-white/50 hover:border-white/50'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-creme)] border border-[var(--color-atelier-terracota)]/10 overflow-hidden shadow-sm shrink-0">
                    <img src={client.avatar} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-roboto text-[13px] ${activeClientId === client.id ? 'font-bold text-[var(--color-atelier-terracota)]' : 'font-medium text-[var(--color-atelier-grafite)]'}`}>
                      {client.name}
                    </span>
                    <span className="font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">
                      {client.project}
                    </span>
                  </div>
                </div>
                {client.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-[var(--color-atelier-terracota)] flex items-center justify-center text-white font-roboto text-[10px] font-bold shadow-sm">
                    {client.unread}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* PAINEL 2: CANAIS DO CLIENTE (260px) */}
        <div className="w-[260px] glass-panel rounded-[2.5rem] bg-[var(--color-atelier-grafite)]/5 border border-white shadow-[0_15px_40px_rgba(122,116,112,0.05)] flex flex-col shrink-0 overflow-hidden">
          
          {/* Info do Cliente Ativo no Topo dos Canais */}
          <div className="p-6 border-b border-[var(--color-atelier-grafite)]/5 bg-white/40 shrink-0">
            <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-tight mb-1">{activeClient.name}</h2>
            <button 
              onClick={() => showToast("A redirecionar para a Mesa de Trabalho do cliente...")}
              className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-grafite)] transition-colors flex items-center gap-1"
            >
              Ver Mesa de Trabalho <ArrowRight size={12} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6">
            
            {/* Secção de Canais Partilhados */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-2 mb-1">
                <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">Canais do Projeto</span>
                <button onClick={() => showToast("Criar novo canal de comunicação.")} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)] transition-colors"><Plus size={14}/></button>
              </div>
              
              {clientChannels.filter(c => !c.isPrivate).map(channel => (
                <button 
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`
                    w-full text-left px-4 py-2.5 rounded-xl font-roboto text-[13px] font-medium flex items-center justify-between transition-all
                    ${activeChannelId === channel.id 
                      ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' 
                      : 'text-[var(--color-atelier-grafite)]/70 hover:bg-white border border-transparent hover:border-white'
                    }
                  `}
                >
                  <span className="flex items-center gap-2">
                    <Hash size={14} className={activeChannelId === channel.id ? 'text-white/70' : 'text-[var(--color-atelier-terracota)]/60'} /> 
                    {channel.name}
                  </span>
                  {channel.unread > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeChannelId === channel.id ? 'bg-white/20 text-white' : 'bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)]'}`}>
                      {channel.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Secção de Canais Privados (Só a Equipa Vê) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-2 mb-1">
                <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">Área da Equipa</span>
                <Lock size={10} className="text-[var(--color-atelier-grafite)]/40" />
              </div>
              
              {clientChannels.filter(c => c.isPrivate).map(channel => (
                <button 
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`
                    w-full text-left px-4 py-2.5 rounded-xl font-roboto text-[13px] font-medium flex items-center justify-between transition-all
                    ${activeChannelId === channel.id 
                      ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' 
                      : 'text-[var(--color-atelier-grafite)]/70 hover:bg-white border border-transparent hover:border-white'
                    }
                  `}
                >
                  <span className="flex items-center gap-2">
                    <Lock size={12} className={activeChannelId === channel.id ? 'text-white/70' : 'text-[var(--color-atelier-grafite)]/40'} /> 
                    {channel.name}
                  </span>
                </button>
              ))}
            </div>
            
          </div>
        </div>

        {/* PAINEL 3: O PALCO DE MENSAGENS (Restante da tela) */}
        <div className="flex-1 glass-panel rounded-[2.5rem] bg-white/60 border border-white flex flex-col relative overflow-hidden shadow-[0_20px_50px_rgba(122,116,112,0.08)] h-full">
          
          {/* Cabeçalho do Chat Ativo */}
          <div className="bg-white/80 backdrop-blur-xl border-b border-[var(--color-atelier-grafite)]/5 px-8 py-5 flex justify-between items-center z-20 shrink-0">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm shrink-0 border ${activeChannel?.isPrivate ? 'bg-[var(--color-atelier-grafite)] text-white border-transparent' : 'bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] border-[var(--color-atelier-terracota)]/20'}`}>
                {activeChannel?.isPrivate ? <Lock size={20} /> : <Hash size={20} strokeWidth={2} />}
              </div>
              <div className="flex flex-col">
                <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none mb-1">
                  {activeChannel?.name || "Selecione um canal"}
                </span>
                <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50">
                  {activeChannel?.isPrivate ? 'Canal invisível para o cliente. Apenas a equipa Atelier tem acesso.' : `Comunicação direta com ${activeClient.name}.`}
                </p>
              </div>
            </div>
            <button onClick={() => showToast("A abrir definições do canal...")} className="w-10 h-10 rounded-xl bg-white border border-white hover:border-[var(--color-atelier-grafite)]/20 flex items-center justify-center text-[var(--color-atelier-grafite)]/50 transition-all shadow-sm">
              <Settings2 size={16} />
            </button>
          </div>

          {/* Área de Rolagem das Mensagens */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8 flex flex-col gap-6 bg-gradient-to-b from-transparent to-white/30">
            
            {activeMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <MessageSquare size={40} className="mb-4 text-[var(--color-atelier-terracota)]" />
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Este canal está silencioso.</h3>
                <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 max-w-sm">Inicie a conversa ou partilhe ficheiros relacionados com este tópico.</p>
              </div>
            ) : (
              <div className="flex justify-center mb-2">
                <span className="bg-white border border-[var(--color-atelier-grafite)]/5 px-4 py-1.5 rounded-full font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 shadow-sm">
                  Histórico Recente
                </span>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {activeMessages.map((msg, index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * index }}
                  key={msg.id} 
                  className={`flex gap-4 max-w-[85%] ${msg.isMe ? 'self-end flex-row-reverse' : 'self-start'}`}
                >
                  <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden border-2 shadow-sm ${msg.isMe ? 'border-white bg-[var(--color-atelier-grafite)]' : 'border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)]'}`}>
                    {msg.avatar ? <img src={msg.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <span className="font-elegant text-white text-lg">A</span>}
                  </div>

                  <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <span className={`font-roboto text-[11px] font-bold ${msg.isMe ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>{msg.sender}</span>
                      <span className="font-roboto text-[9px] font-bold text-[var(--color-atelier-grafite)]/40">{msg.time}</span>
                    </div>

                    {msg.attachment && (
                      <div className="mb-3 rounded-[1.5rem] overflow-hidden border-[4px] border-white shadow-[0_15px_30px_rgba(122,116,112,0.1)] max-w-sm cursor-pointer hover:scale-[1.02] transition-transform">
                        <img src={msg.attachment} alt="Anexo do Design" className="w-full object-cover" />
                      </div>
                    )}

                    <div className={`
                      px-6 py-4 rounded-[1.5rem] shadow-sm font-roboto text-[14px] leading-relaxed
                      ${msg.isMe 
                        ? 'bg-[var(--color-atelier-terracota)] text-white rounded-tr-sm shadow-[0_10px_25px_rgba(173,111,64,0.2)]' 
                        : 'bg-white border border-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)] rounded-tl-sm'
                      }
                    `}>
                      {msg.text}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* O Compositor de Mensagens */}
          <form onSubmit={handleSendMessage} className="p-6 bg-white/80 backdrop-blur-xl border-t border-[var(--color-atelier-grafite)]/5 z-20 shrink-0">
            <div className="bg-white border border-[var(--color-atelier-grafite)]/10 p-2 rounded-[2rem] shadow-[0_10px_30px_rgba(122,116,112,0.05)] flex items-center gap-2 focus-within:border-[var(--color-atelier-terracota)]/40 focus-within:shadow-[0_10px_30px_rgba(173,111,64,0.1)] transition-all">
              
              <button type="button" onClick={() => showToast("Abrir galeria de imagens...")} className="w-12 h-12 flex items-center justify-center rounded-full text-[var(--color-atelier-grafite)]/40 hover:bg-[var(--color-atelier-creme)] hover:text-[var(--color-atelier-terracota)] transition-colors shrink-0">
                <ImageIcon size={20} />
              </button>
              <button type="button" onClick={() => showToast("Anexar ficheiro de design...")} className="w-12 h-12 flex items-center justify-center rounded-full text-[var(--color-atelier-grafite)]/40 hover:bg-[var(--color-atelier-creme)] hover:text-[var(--color-atelier-terracota)] transition-colors shrink-0">
                <Paperclip size={20} />
              </button>

              <input 
                type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)}
                placeholder={`Mensagem para #${activeChannel?.name}...`}
                className="flex-1 bg-transparent border-none outline-none font-roboto text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 px-2"
              />

              <button 
                type="submit"
                className={`
                  w-12 h-12 flex items-center justify-center rounded-full shrink-0 transition-all duration-300 shadow-sm
                  ${messageText.trim() !== "" 
                    ? 'bg-[var(--color-atelier-grafite)] text-[var(--color-atelier-creme)] hover:bg-[var(--color-atelier-terracota)] hover:text-white hover:-translate-y-0.5' 
                    : 'bg-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)]/30'
                  }
                `}
              >
                <Send size={18} className={messageText.trim() !== "" ? 'ml-0.5' : ''} />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4 text-[9px] font-roboto uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/30">
               <ShieldCheck size={12} /> Comunicação {activeChannel?.isPrivate ? 'Interna da Equipa' : 'com o Cliente'}
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}