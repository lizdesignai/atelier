// src/app/admin/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Activity, AlertCircle, Search, 
  Filter, CheckCircle2, Clock,
  ArrowRight, ArrowUpRight
} from "lucide-react";

// Função para disparar os Toasts Globais
const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent("showToast", { detail: message }));
};

// Mock de Dados: A visão real do seu banco de dados de clientes
const ACTIVE_CLIENTS = [
  { id: 1, name: "Igor Castro", project: "Identidade Visual", phase: "Briefing Pendente", status: "waiting_client", daysLeft: 12, lastActive: "Há 2 horas" },
  { id: 2, name: "Mariana Silva", project: "Rebranding Pleno", phase: "Aprovação de Moodboard", status: "action_required", daysLeft: 5, lastActive: "Há 10 min" },
  { id: 3, name: "Carlos Nogueira", project: "Naming + IDV", phase: "Manufatura Final", status: "on_track", daysLeft: 2, lastActive: "Ontem" },
];

const URGENT_TASKS = [
  { id: 1, client: "Mariana Silva", type: "feedback", title: "Respostas do Questionário de Referências enviadas. Necessário análise.", time: "10:45" },
  { id: 2, client: "Carlos Nogueira", type: "system", title: "Cofre abre em 2 dias. Necessário upload dos ficheiros finais (Brandbook).", time: "09:00" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    // Estrutura No-Scroll perfeita: Ocupa apenas o espaço exato da janela
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6">
      
      {/* ==========================================
          1. HEADER DO COMANDO
          ========================================== */}
      <header className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="inline-flex items-center gap-2 bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] px-3 py-1.5 rounded-full mb-3 shadow-sm border border-white">
            <Activity size={14} className="text-[var(--color-atelier-terracota)]" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Central de Comando</span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight leading-none">
            Visão Geral da <span className="text-[var(--color-atelier-terracota)] italic">Operação.</span>
          </h1>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="flex gap-4 shrink-0">
          <div className="bg-white/60 backdrop-blur-md border border-white p-4 rounded-2xl flex flex-col min-w-[140px] shadow-sm cursor-pointer hover:border-[var(--color-atelier-terracota)]/30 transition-colors">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 mb-1">Projetos Ativos</span>
            <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">14</span>
          </div>
          <div className="bg-[var(--color-atelier-terracota)]/10 border border-[var(--color-atelier-terracota)]/20 p-4 rounded-2xl flex flex-col min-w-[140px] shadow-sm cursor-pointer hover:bg-[var(--color-atelier-terracota)]/15 transition-colors">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] mb-1">Requer Ação</span>
            <span className="font-elegant text-3xl text-[var(--color-atelier-terracota)] flex items-center gap-2">
              <AlertCircle size={20} /> 03
            </span>
          </div>
        </div>
      </header>

      {/* ==========================================
          2. O PAINEL DIVIDIDO (Split Screen)
          ========================================== */}
      <div className="flex gap-6 flex-1 min-h-0 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
        
        {/* COLUNA ESQUERDA: LISTA DE CLIENTES (CRM Rápido) - 65% */}
        <div className="w-[65%] glass-panel rounded-[2.5rem] bg-white/40 border border-white/60 flex flex-col overflow-hidden shadow-[0_15px_40px_rgba(122,116,112,0.05)] h-full">
          
          <div className="p-6 shrink-0 border-b border-[var(--color-atelier-grafite)]/5 bg-white/30 backdrop-blur-md">
            <div className="flex justify-between items-center gap-4">
              <div className="relative flex-1 group/search">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40 group-focus-within/search:text-[var(--color-atelier-terracota)] transition-colors" />
                <input 
                  type="text" placeholder="Buscar cliente ativo na forja..." 
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/60 border border-white focus:bg-white focus:border-[var(--color-atelier-terracota)]/30 rounded-xl py-3 pl-12 pr-4 text-[13px] text-[var(--color-atelier-grafite)] outline-none transition-all shadow-sm"
                />
              </div>
              <button 
                onClick={() => showToast("A abrir filtros de estado...")}
                className="px-5 py-3 bg-white hover:bg-[var(--color-atelier-grafite)]/5 border border-white rounded-xl text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/70 hover:text-[var(--color-atelier-terracota)] transition-all shadow-sm flex items-center gap-2 shrink-0"
              >
                <Filter size={14} /> Filtros
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col">
            {/* Cabeçalho Falso para Alinhamento */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40">
              <div className="col-span-4">Cliente / Projeto</div>
              <div className="col-span-3">Fase Atual</div>
              <div className="col-span-3">Prazo (Cofre)</div>
              <div className="col-span-2 text-right">Ação</div>
            </div>

            {/* Linhas da Tabela */}
            {ACTIVE_CLIENTS.map((client) => (
              <div key={client.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center bg-white/50 hover:bg-white border border-transparent hover:border-white rounded-2xl transition-all group shadow-sm mb-2 mx-2">
                
                <div className="col-span-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-creme)] flex items-center justify-center text-[var(--color-atelier-terracota)] font-elegant text-xl border border-[var(--color-atelier-terracota)]/20 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                    {client.name.charAt(0)}
                  </div>
                  <div className="flex flex-col truncate pr-2">
                    <span className="font-bold text-[13px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate">{client.name}</span>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/40 truncate mt-0.5">{client.project}</span>
                  </div>
                </div>

                <div className="col-span-3 flex items-center">
                  <span className={`
                    px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 border truncate
                    ${client.status === 'waiting_client' ? 'bg-orange-500/10 text-orange-700 border-orange-500/20' : ''}
                    ${client.status === 'action_required' ? 'bg-red-500/10 text-red-700 border-red-500/20' : ''}
                    ${client.status === 'on_track' ? 'bg-green-500/10 text-green-700 border-green-500/20' : ''}
                  `}>
                    {client.status === 'waiting_client' && <Clock size={12} />}
                    {client.status === 'action_required' && <AlertCircle size={12} />}
                    {client.status === 'on_track' && <CheckCircle2 size={12} />}
                    <span className="truncate">{client.phase}</span>
                  </span>
                </div>

                <div className="col-span-3 flex flex-col justify-center">
                  <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)]">{client.daysLeft} Dias Úteis</span>
                  <span className="text-[9px] text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest font-bold mt-0.5">Ativo {client.lastActive}</span>
                </div>

                <div className="col-span-2 flex justify-end items-center">
                  {/* BOTÃO GERENCIAR FUNCIONAL: Redireciona para o Estúdio e aciona o Toast */}
                  <button 
                    onClick={() => {
                      showToast(`A aceder à Mesa de Trabalho de ${client.name}...`);
                      router.push("/admin/projetos");
                    }}
                    className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] bg-white border border-[var(--color-atelier-terracota)]/20 px-4 py-2 rounded-xl hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all shadow-sm flex items-center gap-1.5 group-hover:border-transparent"
                  >
                    Gerir <ArrowUpRight size={14} />
                  </button>
                </div>

              </div>
            ))}
          </div>

        </div>

        {/* COLUNA DIREITA: ALERTAS E AÇÕES URGENTES (O Radar) - 35% */}
        <div className="flex-1 glass-panel rounded-[2.5rem] bg-gradient-to-br from-white/90 to-white/50 border border-white shadow-[0_15px_40px_rgba(173,111,64,0.05)] flex flex-col overflow-hidden h-full">
          
          <div className="p-6 shrink-0 border-b border-[var(--color-atelier-grafite)]/5 bg-white/40">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
                <AlertCircle size={14} strokeWidth={2.5} />
              </div>
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Radar de Urgência</h3>
            </div>
            <p className="font-roboto text-[11px] text-[var(--color-atelier-grafite)]/50 mt-2 uppercase tracking-widest font-bold">
              Prioridades da operação hoje
            </p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-4">
            {URGENT_TASKS.map(task => (
              <div key={task.id} className="bg-white border border-[var(--color-atelier-terracota)]/10 hover:border-[var(--color-atelier-terracota)]/40 p-5 rounded-2xl shadow-[0_5px_15px_rgba(122,116,112,0.05)] transition-all group cursor-pointer relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-atelier-terracota)] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex justify-between items-start mb-3">
                  <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)]">{task.client}</span>
                  <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)]/30 flex items-center gap-1"><Clock size={10}/> {task.time}</span>
                </div>
                <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed mb-4">
                  {task.title}
                </p>
                
                {/* BOTÃO RESOLVER FUNCIONAL */}
                <button 
                  onClick={() => {
                    showToast(`A abrir protocolo de resolução para: ${task.client}`)
                    router.push("/admin/projetos");
                }}
                  className="w-full py-2.5 bg-[var(--color-atelier-creme)] group-hover:bg-[var(--color-atelier-terracota)] text-[var(--color-atelier-grafite)]/60 group-hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  Resolver Agora <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
          
          <div className="p-4 shrink-0 bg-white/40 border-t border-white">
            {/* BOTÃO HISTÓRICO FUNCIONAL */}
            <button 
              onClick={() => showToast("A carregar histórico completo de auditoria do sistema...")}
              className="w-full py-3 bg-[var(--color-atelier-grafite)]/5 hover:bg-[var(--color-atelier-grafite)]/10 border border-transparent hover:border-white rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--color-atelier-grafite)] transition-all shadow-sm"
            >
              Ver Histórico Completo
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}