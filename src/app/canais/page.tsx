// src/app/canais/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Hash, Search, Paperclip, Send, 
  MoreHorizontal, Image as ImageIcon, CheckCheck
} from "lucide-react";

// Mock de dados para simularmos a vida real da plataforma
const MOCK_CHANNELS = [
  { id: 1, name: "avisos-gerais", unread: 2, active: true },
  { id: 2, name: "alteracoes-logo", unread: 0, active: false },
  { id: 3, name: "envio-de-arquivos", unread: 0, active: false },
];

const MOCK_MESSAGES = [
  { 
    id: 1, 
    sender: "Atelier", 
    isMe: false, 
    time: "10:32", 
    text: "Olá, Igor! Bom dia. Passando para atualizar que a construção geométrica do símbolo foi finalizada.",
    avatar: "/images/Símbolo Rosa.png" 
  },
  { 
    id: 2, 
    sender: "Atelier", 
    isMe: false, 
    time: "10:33", 
    text: "Aplicamos a regra de ouro nas proporções. Dá uma olhada em como a redução se comporta:",
    attachment: "https://images.unsplash.com/photo-1626785773985-944d18721bf1?q=80&w=2574&auto=format&fit=crop",
    avatar: "/images/Símbolo Rosa.png" 
  },
  { 
    id: 3, 
    sender: "Igor", 
    isMe: true, 
    time: "10:45", 
    text: "Ficou absolutamente incrível! O contraste da serifa com o símbolo casou perfeitamente. Podemos seguir para as aplicações 3D?",
  }
];

export default function CanaisPage() {
  const [messageText, setMessageText] = useState("");

  return (
    // Estrutura No-Scroll, ocupando exatamente a tela útil
    <div className="relative z-10 max-w-[1500px] mx-auto h-[calc(100vh-80px)] flex flex-col overflow-hidden pb-6">
      
      {/* CABEÇALHO */}
      <header className="mb-8 flex justify-between items-end animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)] shrink-0">
        <div>
          <h1 className="font-elegant text-5xl md:text-[4rem] text-[var(--color-atelier-grafite)] tracking-tight leading-none mb-2">
            Mesa de <span className="text-[var(--color-atelier-terracota)] italic">Contato.</span>
          </h1>
          <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)]/60 max-w-md">
            Comunicação direta, ágil e focada no refinamento visual da sua marca.
          </p>
        </div>
      </header>

      {/* GRID PRINCIPAL (Divisão 3/9) */}
      <div className="flex gap-6 flex-1 min-h-0">
        
        {/* ==========================================
            COLUNA ESQUERDA (Índice de Canais)
            ========================================== */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}
          className="w-[320px] flex flex-col gap-4 shrink-0"
        >
          {/* Barra de Busca Elegante */}
          <div className="glass-panel p-2.5 rounded-2xl flex items-center gap-3">
            <Search size={16} className="text-[var(--color-atelier-grafite)]/40 ml-2" />
            <input 
              type="text" 
              placeholder="Buscar canal ou assunto..." 
              className="bg-transparent border-none outline-none font-roboto text-[13px] text-[var(--color-atelier-grafite)] w-full placeholder:text-[var(--color-atelier-grafite)]/40"
            />
          </div>

          {/* Lista de Canais */}
          <div className="glass-panel p-4 rounded-[2rem] flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
            <h3 className="font-roboto text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--color-atelier-grafite)]/50 ml-2 mb-2 mt-2">
              Canais do Projeto
            </h3>
            
            {MOCK_CHANNELS.map((channel) => (
              <div 
                key={channel.id} 
                className={`
                  group cursor-pointer p-4 rounded-2xl transition-all duration-300 flex items-center justify-between
                  ${channel.active 
                    ? 'bg-white shadow-[0_10px_20px_rgba(173,111,64,0.08)] border border-white' 
                    : 'bg-transparent border border-transparent hover:bg-white/40 hover:border-white/50'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${channel.active ? 'bg-[var(--color-atelier-creme)] text-[var(--color-atelier-terracota)]' : 'bg-black/5 text-[var(--color-atelier-grafite)]/60 group-hover:bg-white'}`}>
                    <Hash size={16} strokeWidth={2} />
                  </div>
                  <span className={`font-roboto text-[14px] ${channel.active ? 'font-bold text-[var(--color-atelier-grafite)]' : 'font-medium text-[var(--color-atelier-grafite)]/70'}`}>
                    {channel.name}
                  </span>
                </div>
                
                {/* Indicador de Mensagem Não Lida */}
                {channel.unread > 0 && (
                  <div className="bg-[var(--color-atelier-terracota)] text-white font-roboto text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(173,111,64,0.5)] animate-pulse">
                    {channel.unread}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* ==========================================
            COLUNA DIREITA (A Janela de Chat Editorial)
            ========================================== */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 glass-panel rounded-[2.5rem] flex flex-col relative overflow-hidden"
        >
          {/* Cabeçalho do Chat (Fixo no topo) */}
          <div className="bg-white/60 backdrop-blur-xl border-b border-white px-8 py-5 flex justify-between items-center z-20 absolute top-0 w-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] border border-[var(--color-atelier-terracota)]/20 shadow-sm">
                <Hash size={20} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none mb-1">avisos-gerais</span>
                <span className="font-roboto text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)]">
                  Mesa de Aprovação
                </span>
              </div>
            </div>
            <button className="w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center text-[var(--color-atelier-grafite)]/50 transition-colors">
              <MoreHorizontal size={20} />
            </button>
          </div>

          {/* Área de Rolagem das Mensagens */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pt-32 pb-24 flex flex-col gap-6">
            
            {/* Divisor de Data Discreto */}
            <div className="flex justify-center mb-4">
              <span className="bg-white/50 backdrop-blur-md px-4 py-1.5 rounded-full font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 border border-white">
                Hoje
              </span>
            </div>

            {MOCK_MESSAGES.map((msg, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + (index * 0.1) }}
                key={msg.id} 
                className={`flex gap-4 max-w-[80%] ${msg.isMe ? 'self-end flex-row-reverse' : 'self-start'}`}
              >
                {/* Avatar do Remetente */}
                <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden border-2 shadow-sm ${msg.isMe ? 'border-white bg-[var(--color-atelier-grafite)]' : 'border-white/50 bg-white/40'}`}>
                  {msg.avatar ? (
                    <img src={msg.avatar} alt="Avatar" className="w-6 h-6 object-contain" />
                  ) : (
                    <span className="font-elegant text-white text-lg">I</span>
                  )}
                </div>

                <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="font-roboto text-[12px] font-bold text-[var(--color-atelier-grafite)]">{msg.sender}</span>
                    <span className="font-roboto text-[10px] text-[var(--color-atelier-grafite)]/40">{msg.time}</span>
                  </div>

                  {/* Anexo de Imagem (Editorial Style) */}
                  {msg.attachment && (
                    <div className="mb-3 rounded-[1.5rem] overflow-hidden border-[4px] border-white shadow-[0_15px_30px_rgba(122,116,112,0.15)] max-w-sm cursor-pointer hover:scale-[1.02] transition-transform">
                      <img src={msg.attachment} alt="Anexo do Design" className="w-full object-cover" />
                    </div>
                  )}

                  {/* Balão de Texto */}
                  <div className={`
                    px-6 py-4 rounded-[1.5rem] shadow-sm font-roboto text-[14px] leading-relaxed
                    ${msg.isMe 
                      ? 'bg-gradient-to-br from-[var(--color-atelier-terracota)] to-[#8c562e] text-white rounded-tr-sm shadow-[0_10px_25px_rgba(173,111,64,0.3)]' 
                      : 'bg-white border border-white text-[var(--color-atelier-grafite)] rounded-tl-sm'
                    }
                  `}>
                    {msg.text}
                  </div>
                  
                  {/* Status de Leitura (Só aparece para o cliente) */}
                  {msg.isMe && (
                    <div className="flex items-center gap-1 mt-1.5 pr-1 text-[var(--color-atelier-terracota)] opacity-80">
                      <CheckCheck size={14} />
                      <span className="font-roboto text-[10px]">Visto</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* O Compositor de Mensagens (Input Magnético no Rodapé) */}
          <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-[var(--color-atelier-creme)] via-[var(--color-atelier-creme)]/90 to-transparent z-20">
            <div className="bg-white/80 backdrop-blur-xl border border-white p-2 rounded-[2rem] shadow-[0_15px_40px_rgba(122,116,112,0.1)] flex items-center gap-2">
              
              <button className="w-12 h-12 flex items-center justify-center rounded-full text-[var(--color-atelier-grafite)]/40 hover:bg-black/5 hover:text-[var(--color-atelier-terracota)] transition-colors shrink-0">
                <ImageIcon size={20} />
              </button>
              <button className="w-12 h-12 flex items-center justify-center rounded-full text-[var(--color-atelier-grafite)]/40 hover:bg-black/5 hover:text-[var(--color-atelier-terracota)] transition-colors shrink-0">
                <Paperclip size={20} />
              </button>

              <input 
                type="text" 
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Escreva sua mensagem aqui..."
                className="flex-1 bg-transparent border-none outline-none font-roboto text-[14px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 px-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && messageText.trim() !== "") {
                    setMessageText(""); // Limpa o input simulando o envio
                  }
                }}
              />

              <button 
                onClick={() => setMessageText("")}
                className={`
                  w-12 h-12 flex items-center justify-center rounded-full shrink-0 transition-all duration-300 shadow-sm
                  ${messageText.trim() !== "" 
                    ? 'bg-[var(--color-atelier-terracota)] text-white shadow-[0_5px_15px_rgba(173,111,64,0.4)] hover:scale-105' 
                    : 'bg-black/5 text-[var(--color-atelier-grafite)]/30'
                  }
                `}
              >
                <Send size={18} className={messageText.trim() !== "" ? 'ml-1' : ''} />
              </button>
            </div>
          </div>

        </motion.div>

      </div>
    </div>
  );
}