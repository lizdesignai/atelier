// src/app/admin/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, Activity, AlertCircle, Search, 
  Filter, FileText, CheckCircle2, Clock,
  ArrowRight, MoreVertical
} from "lucide-react";

// Mock de Dados: A visão real do seu banco de dados de clientes
const ACTIVE_CLIENTS = [
  { id: 1, name: "Igor Castro", project: "Identidade Visual", phase: "Briefing Pendente", status: "waiting_client", daysLeft: 12, lastActive: "Há 2 horas" },
  { id: 2, name: "Mariana Silva", project: "Rebranding Pleno", phase: "Aprovação de Moodboard", status: "action_required", daysLeft: 5, lastActive: "Há 10 min" },
  { id: 3, name: "Carlos & Co.", project: "Naming + IDV", phase: "Manufatura Final", status: "on_track", daysLeft: 2, lastActive: "Ontem" },
];

const URGENT_TASKS = [
  { id: 1, client: "Mariana Silva", type: "feedback", title: "Respostas do Questionário de Referências enviadas.", time: "10:45" },
  { id: 2, client: "Carlos & Co.", type: "system", title: "Cofre abre em 2 dias. Necessário upload dos arquivos finais.", time: "09:00" },
];

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-[var(--color-atelier-creme)] text-[var(--color-atelier-grafite)] font-roboto selection:bg-[var(--color-atelier-terracota)] selection:text-white p-6 md:p-10">
      
      {/* ==========================================
          1. HEADER DO COMANDO
          ========================================== */}
      <header className="max-w-[1400px] mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-[fadeInUp_0.5s_ease-out]">
        <div>
          <div className="inline-flex items-center gap-2 bg-[var(--color-atelier-grafite)]/10 text-[var(--color-atelier-grafite)] px-3 py-1 rounded-full mb-4">
            <Activity size={14} className="text-[var(--color-atelier-terracota)]" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Central de Comando</span>
          </div>
          <h1 className="font-elegant text-4xl md:text-5xl text-[var(--color-atelier-grafite)] tracking-tight">
            Visão Geral da <span className="text-[var(--color-atelier-terracota)] italic">Operação.</span>
          </h1>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="flex gap-4 shrink-0">
          <div className="bg-white/60 backdrop-blur-md border border-white p-4 rounded-2xl flex flex-col min-w-[140px] shadow-sm">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 mb-1">Projetos Ativos</span>
            <span className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">14</span>
          </div>
          <div className="bg-[var(--color-atelier-terracota)]/10 border border-[var(--color-atelier-terracota)]/20 p-4 rounded-2xl flex flex-col min-w-[140px] shadow-sm">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)] mb-1">Requer Ação</span>
            <span className="font-elegant text-3xl text-[var(--color-atelier-terracota)] flex items-center gap-2">
              <AlertCircle size={20} /> 03
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ==========================================
            COLUNA ESQUERDA: LISTA DE CLIENTES (CRM)
            ========================================== */}
        <div className="lg:col-span-8 flex flex-col gap-6 animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
          
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/40 backdrop-blur-md border border-white p-2 rounded-2xl shadow-sm">
            <div className="relative w-full sm:w-auto min-w-[300px]">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40" />
              <input 
                type="text" placeholder="Buscar cliente ou projeto..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/60 border-none outline-none rounded-xl py-2.5 pl-12 pr-4 text-[13px] text-[var(--color-atelier-grafite)] placeholder:text-[var(--color-atelier-grafite)]/40 focus:ring-2 focus:ring-[var(--color-atelier-terracota)]/30 transition-all"
              />
            </div>
            <button className="w-full sm:w-auto px-4 py-2.5 bg-white/60 hover:bg-white rounded-xl text-[12px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border border-white">
              <Filter size={14} /> Filtrar Status
            </button>
          </div>

          {/* Tabela de Clientes Dinâmica */}
          <div className="bg-white/50 backdrop-blur-xl border border-white rounded-[2rem] overflow-hidden shadow-[0_15px_40px_rgba(122,116,112,0.05)] flex flex-col">
            
            {/* Cabeçalho da Tabela */}
            <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-[var(--color-atelier-grafite)]/5 bg-white/40">
              <div className="col-span-4 text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">Cliente / Projeto</div>
              <div className="col-span-3 text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">Fase Atual</div>
              <div className="col-span-3 text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50">Prazo (Cofre)</div>
              <div className="col-span-2 text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 text-right">Ação</div>
            </div>

            {/* Linhas da Tabela */}
            <div className="flex flex-col divide-y divide-[var(--color-atelier-grafite)]/5">
              {ACTIVE_CLIENTS.map((client) => (
                <div key={client.id} className="grid grid-cols-12 gap-4 px-8 py-5 items-center hover:bg-white/60 transition-colors group cursor-pointer">
                  
                  {/* Cliente */}
                  <div className="col-span-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-grafite)]/5 flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0 font-elegant text-xl border border-white shadow-sm">
                      {client.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[14px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors">{client.name}</span>
                      <span className="text-[11px] text-[var(--color-atelier-grafite)]/60">{client.project}</span>
                    </div>
                  </div>

                  {/* Status / Fase */}
                  <div className="col-span-3 flex items-center">
                    <span className={`
                      px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border
                      ${client.status === 'waiting_client' ? 'bg-orange-500/10 text-orange-700 border-orange-500/20' : ''}
                      ${client.status === 'action_required' ? 'bg-red-500/10 text-red-700 border-red-500/20' : ''}
                      ${client.status === 'on_track' ? 'bg-green-500/10 text-green-700 border-green-500/20' : ''}
                    `}>
                      {client.status === 'waiting_client' && <Clock size={12} />}
                      {client.status === 'action_required' && <AlertCircle size={12} />}
                      {client.status === 'on_track' && <CheckCircle2 size={12} />}
                      {client.phase}
                    </span>
                  </div>

                  {/* Prazo */}
                  <div className="col-span-3 flex flex-col">
                    <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)]">{client.daysLeft} Dias</span>
                    <span className="text-[10px] text-[var(--color-atelier-grafite)]/40 uppercase tracking-widest">Últ. acesso: {client.lastActive}</span>
                  </div>

                  {/* Ação */}
                  <div className="col-span-2 flex justify-end items-center gap-2">
                    <button className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-terracota)] hover:text-[var(--color-atelier-grafite)] transition-colors flex items-center gap-1">
                      Gerenciar <ArrowRight size={14} />
                    </button>
                  </div>

                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ==========================================
            COLUNA DIREITA: ALERTAS E AÇÕES URGENTES
            ========================================== */}
        <div className="lg:col-span-4 flex flex-col gap-6 animate-[fadeInUp_0.8s_ease-out_0.4s_both]">
          
          <div className="glass-panel p-6 rounded-[2rem] flex flex-col bg-gradient-to-br from-white/90 to-white/40 shadow-[0_15px_40px_rgba(173,111,64,0.05)]">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--color-atelier-grafite)]/10">
              <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                <AlertCircle size={16} />
              </div>
              <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Radar de Urgência</h3>
            </div>

            <div className="flex flex-col gap-4">
              {URGENT_TASKS.map(task => (
                <div key={task.id} className="bg-white border border-white hover:border-[var(--color-atelier-terracota)]/30 p-4 rounded-2xl shadow-sm transition-all group cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-terracota)]">{task.client}</span>
                    <span className="text-[10px] text-[var(--color-atelier-grafite)]/40">{task.time}</span>
                  </div>
                  <p className="font-roboto text-[13px] text-[var(--color-atelier-grafite)] leading-relaxed mb-3">
                    {task.title}
                  </p>
                  <button className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)]/50 group-hover:text-[var(--color-atelier-terracota)] transition-colors flex items-center gap-1">
                    Resolver Agora <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
            
            <button className="mt-6 w-full py-3 bg-[var(--color-atelier-grafite)]/5 hover:bg-[var(--color-atelier-grafite)]/10 rounded-xl text-[11px] font-bold uppercase tracking-widest text-[var(--color-atelier-grafite)] transition-colors">
              Ver Histórico Completo
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}