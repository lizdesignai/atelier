// src/components/global/CommandPalette.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Sparkles, ArrowRight, X, Loader2, 
  LayoutDashboard, Wallet, Users, FolderKanban, 
  Settings, Bot, FileText, CheckCircle2, AlertCircle
} from "lucide-react";

// Função para disparar Toasts globais (se necessário)
const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

export default function CommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  // ==========================================
  // LISTENER GLOBAL DO ATALHO (CTRL + K / CMD + K)
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Foca no input automaticamente ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setQuery("");
    setAiResponse(null);
    setIsProcessing(false);
  };

  // ==========================================
  // SUGESTÕES RÁPIDAS (Ações de 1 Clique)
  // ==========================================
  const quickActions = [
    { icon: LayoutDashboard, label: "Visão Geral do Oráculo", path: "/admin/analytics" },
    { icon: Wallet, label: "Analisar CFO Engine", path: "/admin/financeiro" },
    { icon: Users, label: "Gerir Base de Clientes", path: "/admin/clientes" },
    { icon: FolderKanban, label: "Mesa de Trabalho (JTBD)", path: "/admin/projetos" },
    { icon: Settings, label: "Privacidade & Ajustes", path: "/admin/configuracoes" },
  ];

  const handleQuickAction = (path: string) => {
    handleClose();
    showToast("A navegar à velocidade da luz...");
    router.push(path);
  };

  // ==========================================
  // MOTOR DE EXECUÇÃO & INTELIGÊNCIA ARTIFICIAL
  // ==========================================
  const executeCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsProcessing(true);
    setAiResponse(null);
    const q = query.toLowerCase();

    // 1. INTENT PARSER LOCAL (Navegação Rápida Preditiva)
    if (q.includes("ir para") || q.includes("abrir") || q.includes("mostrar")) {
      let targetPath = null;
      if (q.includes("financeiro") || q.includes("caixa") || q.includes("dinheiro")) targetPath = "/admin/financeiro";
      else if (q.includes("cliente") || q.includes("crm")) targetPath = "/admin/clientes";
      else if (q.includes("projeto") || q.includes("tarefa") || q.includes("jtbd")) targetPath = "/admin/projetos";
      else if (q.includes("analytics") || q.includes("oráculo") || q.includes("dados")) targetPath = "/admin/analytics";
      else if (q.includes("configuração") || q.includes("perfil") || q.includes("ajuste")) targetPath = "/admin/configuracoes";

      if (targetPath) {
        setTimeout(() => {
          handleClose();
          router.push(targetPath);
        }, 500);
        return;
      }
    }

    // 2. INTEGRAÇÃO COM A I.A. DO ATELIER (Comportamento de Assistente)
    try {
      // 💡 AQUI VOCÊ CONECTA O SEU ENDPOINT REAL DE IA (OpenAI, Anthropic, ou Edge Function do Supabase)
      // Exemplo de como seria a chamada real:
      // const res = await fetch('/api/ai/command', { method: 'POST', body: JSON.stringify({ prompt: query }) });
      // const data = await res.json();
      
      // Simulação de tempo de processamento da IA para demonstração:
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock de respostas inteligentes para demonstração de poder
      if (q.includes("resumo") || q.includes("faturamento")) {
        setAiResponse("Atualmente, o faturamento (MRR) projetado está em R$ 45.000, com uma margem de EBITDA de 72%. Nenhuma anomalia financeira detetada nos últimos 7 dias.");
      } else if (q.includes("tarefa") || q.includes("urgente")) {
        setAiResponse("Existem 3 tarefas marcadas como 'Granada' (Urgentes) no seu JTBD. Deseja que eu as redirecione para um membro com menos carga horária?");
      } else {
        setAiResponse(`Comando recebido: "${query}". Como IA do sistema, ainda estou a ser treinada para executar ações complexas. Em breve poderei automatizar isso por si.`);
      }

    } catch (error) {
      setAiResponse("Erro de comunicação com o núcleo da IA. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay de Fundo */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-[var(--color-atelier-grafite)]/40 backdrop-blur-md z-[9998]"
          />

          {/* O Command Palette (O Modal) */}
          <div className="fixed inset-0 flex items-start justify-center pt-[15vh] px-4 pointer-events-none z-[9999]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }} transition={{ duration: 0.2 }}
              className="w-full max-w-2xl bg-white/90 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col pointer-events-auto"
            >
              
              {/* O INPUT DE PESQUISA / COMANDO */}
              <div className="p-2 border-b border-[var(--color-atelier-grafite)]/10">
                <form onSubmit={executeCommand} className="flex items-center gap-3 bg-[var(--color-atelier-grafite)]/5 rounded-2xl px-4 py-2">
                  {isProcessing ? (
                    <Loader2 size={24} className="text-[var(--color-atelier-terracota)] animate-spin shrink-0" />
                  ) : (
                    <Sparkles size={24} className="text-[var(--color-atelier-terracota)] shrink-0" />
                  )}
                  <input 
                    ref={inputRef}
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Pergunte à IA ou digite um comando..." 
                    className="flex-1 bg-transparent border-none outline-none font-elegant text-2xl text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/30 h-14"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery("")} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-grafite)] transition-colors"><X size={18}/></button>
                  )}
                  <div className="flex items-center gap-1 bg-white border border-[var(--color-atelier-grafite)]/10 rounded-lg px-2 py-1 text-[10px] font-bold text-[var(--color-atelier-grafite)]/40 ml-2 shadow-sm">
                    <span>↵</span> <span className="uppercase tracking-widest">Enter</span>
                  </div>
                </form>
              </div>

              {/* CORPO DO PALETTE (RESPOSTA OU SUGESTÕES) */}
              <div className="flex flex-col max-h-[40vh] overflow-y-auto custom-scrollbar p-2">
                
                <AnimatePresence mode="wait">
                  {/* ESTADO 1: RESPOSTA DA IA */}
                  {aiResponse ? (
                    <motion.div key="ai-response" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-6 flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-atelier-rose)] to-[var(--color-atelier-terracota)] text-white flex items-center justify-center shrink-0 shadow-md">
                        <Bot size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] mb-1">Resposta do Sistema</span>
                        <p className="font-roboto text-[14px] text-[var(--color-atelier-grafite)]/80 leading-relaxed">
                          {aiResponse}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    /* ESTADO 2: MENU DE ACESSO RÁPIDO */
                    <motion.div key="quick-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-1 p-2">
                      <span className="font-roboto text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/40 px-3 pb-2 pt-1">Ações Rápidas</span>
                      
                      {quickActions.map((action, i) => (
                        <button 
                          key={i}
                          onClick={() => handleQuickAction(action.path)}
                          className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-[var(--color-atelier-grafite)]/5 text-left group transition-colors focus:outline-none focus:bg-[var(--color-atelier-terracota)]/10"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)]/60 group-hover:text-[var(--color-atelier-terracota)] group-hover:border-[var(--color-atelier-terracota)]/30 flex items-center justify-center transition-colors shadow-sm">
                              <action.icon size={16} />
                            </div>
                            <span className="font-roboto text-[13px] font-bold text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors">{action.label}</span>
                          </div>
                          <ArrowRight size={14} className="text-[var(--color-atelier-grafite)]/20 group-hover:text-[var(--color-atelier-terracota)] group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* FOOTER INFORMATIVO */}
              <div className="bg-[var(--color-atelier-grafite)]/5 px-6 py-3 border-t border-[var(--color-atelier-grafite)]/10 flex items-center justify-between">
                <div className="flex items-center gap-4 text-[10px] font-bold text-[var(--color-atelier-grafite)]/40">
                  <span className="flex items-center gap-1">Navegação <ArrowRight size={10}/></span>
                  <span className="flex items-center gap-1">Esc para Sair <X size={10}/></span>
                </div>
                <span className="font-elegant text-sm text-[var(--color-atelier-grafite)]/30">Atelier OS</span>
              </div>

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}