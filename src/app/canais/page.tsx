// src/app/canais/page.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, Hash, Send, Paperclip, Image as ImageIcon, 
  CheckCheck, ShieldCheck, Clock, Info, ArrowRight
} from "lucide-react";

// Função para disparar os Toasts Globais
const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// ==========================================
// MOCKS DE DADOS (Visão do Cliente)
// ==========================================
const MY_CHANNELS = [
  { id: "ch1_1", name: "avisos-gerais", unread: 0, description: "Comunicados oficiais e atualizações do Atelier." },
  { id: "ch1_2", name: "aprovacoes-idv", unread: 1, description: "Apresentação de propostas e validações criativas." },
  { id: "ch1_3", name: "envio-arquivos", unread: 0, description: "Troca de materiais brutos e acessos." },
];

const MY_MESSAGES: Record<string, any[]> = {
  "ch1_2": [
    { id: 1, sender: "Atelier Team", isMe: false, time: "10:32", text: "Olá Igor! Passando para informar que a construção geométrica do símbolo foi finalizada. Pode verificar a proporção na imagem abaixo." },
    { id: 2, sender: "Atelier Team", isMe: false, time: "10:33", text: "Aplicámos a regra de ouro.", attachment: "https://images.unsplash.com/photo-1626785773985-944d18721bf1?q=80&w=2574&auto=format&fit=crop" },
    { id: 3, sender: "Você", isMe: true, time: "10:45", avatar: "https://ui-avatars.com/api/?name=Igor+Castro&background=ad6f40&color=fbf4e4", text: "Ficou absolutamente incrível! O contraste da serifa com o símbolo casou perfeitamente. Aprovado para seguirmos para o 3D." }
  ],
  "ch1_1": [
    { id: 4, sender: "Atelier Team", isMe: false, time: "Ontem", text: "Bem-vindo ao seu portal de marca. Toda a nossa comunicação será centralizada por aqui." }
  ],
  "ch1_3": []
};

export default function CanaisClientePage() {
  const [activeChannelId, setActiveChannelId] = useState(MY_CHANNELS[1].id);
  const [messageText, setMessageText] = useState("");

  const activeChannel = MY_CHANNELS.find(ch => ch.id === activeChannelId) || MY_CHANNELS[0];
  const activeMessages = MY_MESSAGES[activeChannelId] || [];

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim()) return;
    showToast(`Mensagem enviada para o Atelier no canal #${activeChannel.name}`);
    setMessageText("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          1. CABEÇALHO (Visão Cliente)
          ========================================== */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/60 text-[var(--color-atelier-grafite)] px-4 py-1.5 rounded-full flex items-center gap-2 border border-white shadow-sm">
              <MessageSquare size={14} className="text-[var(--color-atelier-terracota)]" />
              <span className="font-roboto text-[10px] uppercase tracking-widest font-bold">Comunicação Oficial</span>
            </span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Canais do <span className="text-[var(--color-atelier-terracota)] italic">Projeto.</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => showToast("A abrir formulário para agendar reunião de alinhamento...")}
            className="bg-white/60 hover:bg-white hover:border-[var(--color-atelier-terracota)]/30 backdrop-blur-md border border-white px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-2 text-[11px] font-roboto uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)] transition-all cursor-pointer"
          >
            Agendar Reunião <ArrowRight size={14} className="text-[var(--color-atelier-terracota)]" />
          </button>
        </div>
      </header>

      {/* ==========================================
          2. A ESTRUTURA DE 2 PAINÉIS (Split Screen)
          ========================================== */}
      <div className="flex gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* PAINEL ESQUERDO: LISTA DE CANAIS (300px) */}
        <div className="w-[300px] flex flex-col gap-6 h-full shrink-0">
          
          <div className="glass-panel rounded-[2.5rem] bg-white/40 border border-white/60 shadow-[0_15px_40px_rgba(122,116,112,0.05)] flex flex-col flex-1 overflow-hidden">
            <div className="p-6 border-b border-[var(--color-atelier-grafite)]/5 bg-white/30 backdrop-blur-md shrink-0">
              <h2 className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-tight">Tópicos</h2>
              <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 mt-1">Organização por assuntos.</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2">
              {MY_CHANNELS.map(channel => (
                <button 
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`
                    w-full text-left px-4 py-3 rounded-2xl font-roboto text-[13px] font-medium flex items-center justify-between transition-all border
                    ${activeChannelId === channel.id 
                      ? 'bg-white border-white text-[var(--color-atelier-terracota)] shadow-sm' 
                      : 'bg-transparent text-[var(--color-atelier-grafite)]/70 hover:bg-white/50 border-transparent hover:border-white/50'
                    }
                  `}
                >
                  <span className="flex items-center gap-2 truncate pr-2">
                    <Hash size={16} className={activeChannelId === channel.id ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/40'} /> 
                    <span className={`truncate ${activeChannelId === channel.id ? 'font-bold' : ''}`}>{channel.name}</span>
                  </span>
                  
                  {channel.unread > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-atelier-terracota)] text-white shadow-sm shrink-0">
                      {channel.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            {/* Box Informativa */}
            <div className="p-4 m-4 mt-0 bg-[var(--color-atelier-terracota)]/5 border border-[var(--color-atelier-terracota)]/20 rounded-2xl shrink-0">
              <div className="flex items-start gap-2 text-[var(--color-atelier-terracota)]">
                <Info size={14} className="shrink-0 mt-0.5" />
                <p className="font-roboto text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                  Separamos as conversas por canais para que não perca nenhum material importante.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* PAINEL DIREITO: O PALCO DE MENSAGENS (Restante da tela) */}
        <div className="flex-1 glass-panel rounded-[2.5rem] bg-white/60 border border-white flex flex-col relative overflow-hidden shadow-[0_20px_50px_rgba(122,116,112,0.08)] h-full">
          
          {/* Cabeçalho do Chat Ativo */}
          <div className="bg-white/80 backdrop-blur-xl border-b border-[var(--color-atelier-grafite)]/5 px-8 py-5 flex justify-between items-center z-20 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20 flex items-center justify-center shadow-sm shrink-0">
                <Hash size={20} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none mb-1">
                  {activeChannel.name}
                </span>
                <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50">
                  {activeChannel.description}
                </p>
              </div>
            </div>
          </div>

          {/* Área de Rolagem das Mensagens */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8 flex flex-col gap-6 bg-gradient-to-b from-transparent to-white/30">
            
            {activeMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <MessageSquare size={40} className="mb-4 text-[var(--color-atelier-terracota)]" />
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Este canal está silencioso.</h3>
                <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 mt-2 max-w-sm">A equipa do Atelier partilhará as atualizações referentes a este tópico aqui.</p>
              </div>
            ) : (
              <div className="flex justify-center mb-2">
                <span className="bg-white border border-[var(--color-atelier-grafite)]/5 px-4 py-1.5 rounded-full font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 shadow-sm">
                  Início da Conversa
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
                  <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden border-2 shadow-sm ${msg.isMe ? 'border-white bg-[var(--color-atelier-grafite)]' : 'border-[var(--color-atelier-terracota)]/20 bg-white'}`}>
                    {msg.avatar ? (
                      <img src={msg.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <img src="/images/simbolo-rosa.png" className="w-6 h-6 object-contain" alt="Atelier" />
                    )}
                  </div>

                  <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <span className={`font-roboto text-[11px] font-bold ${msg.isMe ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>{msg.sender}</span>
                      <span className="font-roboto text-[9px] font-bold text-[var(--color-atelier-grafite)]/40">{msg.time}</span>
                    </div>

                    {msg.attachment && (
                      <div 
                        onClick={() => showToast("A abrir anexo do Atelier...")}
                        className="mb-3 rounded-[1.5rem] overflow-hidden border-[4px] border-white shadow-[0_15px_30px_rgba(122,116,112,0.1)] max-w-sm cursor-pointer hover:scale-[1.02] transition-transform"
                      >
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
                    
                    {msg.isMe && (
                      <div className="flex items-center gap-1 mt-1 pr-1 text-[var(--color-atelier-terracota)] opacity-80">
                        <CheckCheck size={12} />
                        <span className="font-roboto text-[8px] font-bold uppercase tracking-widest">Enviado</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* O Compositor de Mensagens */}
          <form onSubmit={handleSendMessage} className="p-6 bg-white/80 backdrop-blur-xl border-t border-[var(--color-atelier-grafite)]/5 z-20 shrink-0">
            <div className="bg-white border border-[var(--color-atelier-grafite)]/10 p-2 rounded-[2rem] shadow-[0_10px_30px_rgba(122,116,112,0.05)] flex items-center gap-2 focus-within:border-[var(--color-atelier-terracota)]/40 focus-within:shadow-[0_10px_30px_rgba(173,111,64,0.1)] transition-all">
              
              <button type="button" onClick={() => showToast("A abrir galeria para anexar imagens...")} className="w-12 h-12 flex items-center justify-center rounded-full text-[var(--color-atelier-grafite)]/40 hover:bg-[var(--color-atelier-creme)] hover:text-[var(--color-atelier-terracota)] transition-colors shrink-0">
                <ImageIcon size={20} />
              </button>
              <button type="button" onClick={() => showToast("A abrir explorador para anexar documentos...")} className="w-12 h-12 flex items-center justify-center rounded-full text-[var(--color-atelier-grafite)]/40 hover:bg-[var(--color-atelier-creme)] hover:text-[var(--color-atelier-terracota)] transition-colors shrink-0">
                <Paperclip size={20} />
              </button>

              <input 
                type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)}
                placeholder={`Envie uma mensagem em #${activeChannel.name}...`}
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
               <ShieldCheck size={12} /> Toda a comunicação partilhada aqui é encriptada e exclusiva do seu projeto.
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}