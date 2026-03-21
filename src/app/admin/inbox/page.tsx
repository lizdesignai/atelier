// src/app/admin/inbox/page.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Inbox, Search, Send, Paperclip, Image as ImageIcon, 
  MoreVertical, CheckCheck, Hash, ArrowUpRight, 
  Clock, ShieldCheck
} from "lucide-react";

// Mock de Conversas (Ficheiro de Comunicação) - CORRIGIDO: clientName unificado
const CHATS = [
  { id: 1, clientName: "Igor Castro", project: "IDV Premium", lastMessage: "Ficou absolutamente incrível! O contraste...", time: "10:45", unread: 2, active: true },
  { id: 2, clientName: "Mariana Silva", project: "Rebranding Pleno", lastMessage: "Podemos rever a paleta de cores amanhã?", time: "Ontem", unread: 0, active: false },
  { id: 3, clientName: "Carlos Nogueira", project: "Identidade + Web", lastMessage: "Ficheiros recebidos e aprovados. Obrigado!", time: "Segunda", unread: 0, active: false },
];

// Mock das Mensagens da Conversa Ativa (Visão do Admin)
const ACTIVE_MESSAGES = [
  { 
    id: 1, sender: "Você (Atelier)", isMe: true, time: "10:32", 
    text: "Olá, Igor! Bom dia. Passando para atualizar que a construção geométrica do símbolo foi finalizada." 
  },
  { 
    id: 2, sender: "Você (Atelier)", isMe: true, time: "10:33", 
    text: "Aplicamos a regra de ouro nas proporções. Dá uma olhada em como a redução se comporta:",
    attachment: "https://images.unsplash.com/photo-1626785773985-944d18721bf1?q=80&w=2574&auto=format&fit=crop"
  },
  { 
    id: 3, sender: "Igor Castro", isMe: false, time: "10:45", avatar: "https://ui-avatars.com/api/?name=Igor+Castro&background=ad6f40&color=fbf4e4",
    text: "Ficou absolutamente incrível! O contraste da serifa com o símbolo casou perfeitamente. Podemos seguir para as aplicações 3D?" 
  }
];

export default function AdminInboxPage() {
  const [messageText, setMessageText] = useState("");

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1500px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          1. CABEÇALHO DO INBOX
          ========================================== */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] w-8 h-8 rounded-xl flex items-center justify-center">
              <Inbox size={16} className="text-[var(--color-atelier-terracota)]" />
            </span>
            <span className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60">
              Centro de Mensagens
            </span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Caixa de <span className="text-[var(--color-atelier-terracota)] italic">Entrada.</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/60 backdrop-blur-md border border-white px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 text-[11px] font-roboto uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/60">
            <Clock size={14} className="text-[var(--color-atelier-terracota)]" /> Tempo Médio de Resposta: 14m
          </div>
        </div>
      </header>

      {/* ==========================================
          2. A ESTRUTURA SPLIT-SCREEN (No Scroll)
          ========================================== */}
      <div className="flex gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* COLUNA ESQUERDA: LISTA DE CHATS (35%) */}
        <div className="w-[380px] flex flex-col gap-4 shrink-0 h-full">
          
          {/* Busca Magnética */}
          <div className="glass-panel p-2 rounded-2xl flex items-center gap-3 bg-white/50 border border-white shadow-sm shrink-0 group/search">
            <Search size={16} className="text-[var(--color-atelier-grafite)]/40 ml-3 group-focus-within/search:text-[var(--color-atelier-terracota)] transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar cliente ou conversa..." 
              className="bg-transparent border-none outline-none font-roboto text-[13px] text-[var(--color-atelier-grafite)] w-full py-1.5 placeholder:text-[var(--color-atelier-grafite)]/40"
            />
          </div>

          {/* Lista Rolável de Clientes */}
          <div className="glass-panel flex-1 rounded-[2rem] bg-white/40 border border-white/60 p-3 overflow-y-auto custom-scrollbar flex flex-col gap-2 shadow-[0_10px_30px_rgba(122,116,112,0.05)]">
            
            {/* Filtros Rápidos */}
            <div className="flex items-center gap-2 mb-3 px-2 pt-2 shrink-0">
              <button className="px-4 py-1.5 rounded-full bg-[var(--color-atelier-grafite)] text-white font-roboto text-[10px] uppercase tracking-widest font-bold shadow-sm">Todos</button>
              <button className="px-4 py-1.5 rounded-full bg-transparent hover:bg-white text-[var(--color-atelier-grafite)]/60 font-roboto text-[10px] uppercase tracking-widest font-bold transition-colors">Não Lidos</button>
            </div>

            {CHATS.map((chat) => (
              <div 
                key={chat.id} 
                className={`
                  group cursor-pointer p-4 rounded-2xl transition-all duration-300 flex flex-col gap-2 relative overflow-hidden
                  ${chat.active 
                    ? 'bg-white shadow-[0_8px_20px_rgba(173,111,64,0.08)] border border-white' 
                    : 'bg-transparent border border-transparent hover:bg-white/50 hover:border-white/50'
                  }
                `}
              >
                {chat.active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-atelier-terracota)] rounded-r-md"></div>}
                
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-creme)] flex items-center justify-center text-[var(--color-atelier-terracota)] font-elegant text-xl shadow-inner border border-[var(--color-atelier-terracota)]/10 shrink-0">
                      {chat.clientName ? chat.clientName.charAt(0) : "C"}
                    </div>
                    <div className="flex flex-col">
                      <span className={`font-roboto text-[14px] ${chat.active ? 'font-bold text-[var(--color-atelier-grafite)]' : 'font-medium text-[var(--color-atelier-grafite)]/80'}`}>
                        {chat.clientName}
                      </span>
                      <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">
                        {chat.project}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-roboto text-[10px] font-bold ${chat.unread > 0 ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/40'}`}>
                      {chat.time}
                    </span>
                    {chat.unread > 0 && (
                      <div className="bg-[var(--color-atelier-terracota)] text-white font-roboto text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(173,111,64,0.4)] animate-pulse">
                        {chat.unread}
                      </div>
                    )}
                  </div>
                </div>
                <p className={`font-roboto text-[12px] line-clamp-1 pl-13 pr-4 ${chat.unread > 0 ? 'text-[var(--color-atelier-grafite)] font-medium' : 'text-[var(--color-atelier-grafite)]/50'}`}>
                  {chat.lastMessage}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA DIREITA: O PALCO DE RESPOSTA (65%) */}
        <div className="flex-1 glass-panel rounded-[2.5rem] bg-white/60 border border-white/80 flex flex-col relative overflow-hidden shadow-[0_20px_50px_rgba(122,116,112,0.08)] h-full">
          
          {/* Cabeçalho do Chat */}
          <div className="bg-white/80 backdrop-blur-xl border-b border-[var(--color-atelier-grafite)]/5 px-8 py-5 flex justify-between items-center z-20 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-atelier-creme)] flex items-center justify-center text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20 shadow-sm shrink-0">
                <Hash size={20} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none mb-1">Igor Castro</span>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50">Online no Portal</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white border border-white hover:border-[var(--color-atelier-terracota)]/30 rounded-xl font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-terracota)] transition-all shadow-sm flex items-center gap-2">
                Mesa de Trabalho <ArrowUpRight size={14} />
              </button>
              <button className="w-10 h-10 rounded-xl bg-white border border-white hover:border-[var(--color-atelier-grafite)]/20 flex items-center justify-center text-[var(--color-atelier-grafite)]/50 transition-all shadow-sm">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>

          {/* Área de Rolagem das Mensagens */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8 flex flex-col gap-6 bg-gradient-to-b from-transparent to-white/30">
            
            <div className="flex justify-center mb-2">
              <span className="bg-white border border-[var(--color-atelier-grafite)]/5 px-4 py-1.5 rounded-full font-roboto text-[9px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 shadow-sm">
                Hoje
              </span>
            </div>

            {ACTIVE_MESSAGES.map((msg, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + (index * 0.1) }}
                key={msg.id} 
                className={`flex gap-4 max-w-[75%] ${msg.isMe ? 'self-end flex-row-reverse' : 'self-start'}`}
              >
                {/* Avatar do Remetente */}
                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden border-2 shadow-sm ${msg.isMe ? 'border-white bg-[var(--color-atelier-grafite)]' : 'border-[var(--color-atelier-terracota)]/20 bg-[var(--color-atelier-creme)]'}`}>
                  {msg.avatar ? (
                    <img src={msg.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-elegant text-white text-lg">A</span>
                  )}
                </div>

                <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className={`font-roboto text-[11px] font-bold ${msg.isMe ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]'}`}>{msg.sender}</span>
                    <span className="font-roboto text-[9px] font-bold text-[var(--color-atelier-grafite)]/40">{msg.time}</span>
                  </div>

                  {/* Anexo de Imagem (Estética de Agência) */}
                  {msg.attachment && (
                    <div className="mb-3 rounded-[1.5rem] overflow-hidden border-[4px] border-white shadow-[0_15px_30px_rgba(122,116,112,0.1)] max-w-sm cursor-pointer hover:scale-[1.02] transition-transform">
                      <img src={msg.attachment} alt="Anexo do Design" className="w-full object-cover" />
                    </div>
                  )}

                  {/* Balão de Texto */}
                  <div className={`
                    px-6 py-4 rounded-[1.5rem] shadow-sm font-roboto text-[14px] leading-relaxed
                    ${msg.isMe 
                      ? 'bg-[var(--color-atelier-terracota)] text-white rounded-tr-sm shadow-[0_10px_25px_rgba(173,111,64,0.2)]' 
                      : 'bg-white border border-[var(--color-atelier-grafite)]/5 text-[var(--color-atelier-grafite)] rounded-tl-sm'
                    }
                  `}>
                    {msg.text}
                  </div>
                  
                  {/* Status de Leitura (Visto pelo Admin) */}
                  {msg.isMe && (
                    <div className="flex items-center gap-1 mt-1.5 pr-1 text-[var(--color-atelier-terracota)] opacity-80">
                      <CheckCheck size={14} />
                      <span className="font-roboto text-[9px] font-bold uppercase tracking-widest">Lido</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* O Compositor de Mensagens (Rodapé Fixo) */}
          <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-[var(--color-atelier-grafite)]/5 z-20 shrink-0">
            <div className="bg-white border border-[var(--color-atelier-grafite)]/10 p-2 rounded-[2rem] shadow-[0_10px_30px_rgba(122,116,112,0.05)] flex items-center gap-2 focus-within:border-[var(--color-atelier-terracota)]/40 focus-within:shadow-[0_10px_30px_rgba(173,111,64,0.1)] transition-all">
              
              <button className="w-12 h-12 flex items-center justify-center rounded-full text-[var(--color-atelier-grafite)]/40 hover:bg-[var(--color-atelier-creme)] hover:text-[var(--color-atelier-terracota)] transition-colors shrink-0">
                <ImageIcon size={20} />
              </button>
              <button className="w-12 h-12 flex items-center justify-center rounded-full text-[var(--color-atelier-grafite)]/40 hover:bg-[var(--color-atelier-creme)] hover:text-[var(--color-atelier-terracota)] transition-colors shrink-0">
                <Paperclip size={20} />
              </button>

              <input 
                type="text" 
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Responda ao cliente Igor..."
                className="flex-1 bg-transparent border-none outline-none font-roboto text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 px-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && messageText.trim() !== "") {
                    setMessageText(""); 
                  }
                }}
              />

              <button 
                onClick={() => setMessageText("")}
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
               <ShieldCheck size={12} /> A comunicação nesta plataforma é auditada e encriptada.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}