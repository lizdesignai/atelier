// src/app/admin/analytics/views/OverviewDashboard.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { 
  FolderKanban, Target, Users, Search, 
  CheckSquare, Square, Flame, UserCircle2, 
  Edit3, Check, Activity, AlertTriangle 
} from "lucide-react";

interface OverviewDashboardProps {
  metrics: { activeProjects: number; pendingTasks: number; totalTeam: number };
  activeTasksForQueue: any[];
  validProjects: any[];
  tasks: any[];
  team: any[];
  isBulkMode: boolean;
  selectedTaskIds: string[];
  toggleTaskSelection: (id: string) => void;
  setEditingTask: (task: any) => void;
  handleCompleteTask: (taskId: string) => void;
  setSelectedProjectId: (id: string) => void;
  setActiveView: (view: 'overview' | 'projects' | 'routing') => void;
  setSelectedCollab: (member: any) => void;
  isIdvService: (project: any) => boolean;
}

export default function OverviewDashboard({
  metrics,
  activeTasksForQueue,
  validProjects,
  tasks,
  team,
  isBulkMode,
  selectedTaskIds,
  toggleTaskSelection,
  setEditingTask,
  handleCompleteTask,
  setSelectedProjectId,
  setActiveView,
  setSelectedCollab,
  isIdvService
}: OverviewDashboardProps) {
  
  // Estados locais isolados apenas para esta view
  const [taskSearch, setTaskSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");

  return (
    <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 h-full min-h-0">
      
      {/* 1. TOP METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-white/60 p-4 rounded-2xl border border-white flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0"><FolderKanban size={18} /></div>
          <div className="flex flex-col">
            <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{metrics.activeProjects}</span>
            <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mt-0.5">Projetos Ativos</span>
          </div>
        </div>
        <div className="bg-white/60 p-4 rounded-2xl border border-white flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center shrink-0"><Target size={18} /></div>
          <div className="flex flex-col">
            <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{metrics.pendingTasks}</span>
            <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mt-0.5">Missões Pendentes</span>
          </div>
        </div>
        <div className="bg-white/60 p-4 rounded-2xl border border-white flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center shrink-0"><Users size={18} /></div>
          <div className="flex flex-col">
            <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)] leading-none">{metrics.totalTeam}</span>
            <span className="font-roboto text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mt-0.5">Força de Equipa</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* COLUNA 1: FILA GERAL COM BUSCA INTELIGENTE */}
        <div className="w-full lg:w-1/3 glass-panel bg-white/40 p-6 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-full min-h-0">
          <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-4 shrink-0 flex flex-col gap-3">
            <div className="flex justify-between items-center mb-1">
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Fila de Missões</h3>
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest">{activeTasksForQueue.length} Pendentes</span>
            </div>
            <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors" />
                <input 
                   type="text" 
                   placeholder="Filtrar missão ou cliente..." 
                   value={taskSearch} 
                   onChange={(e)=>setTaskSearch(e.target.value)} 
                   className="w-full bg-white/60 border border-white/50 rounded-xl py-2 pl-9 pr-4 text-[11px] outline-none focus:border-[var(--color-atelier-terracota)]/30 focus:bg-white shadow-sm transition-all text-[var(--color-atelier-grafite)] font-bold" 
                />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
            {activeTasksForQueue
              .filter(t => t.title.toLowerCase().includes(taskSearch.toLowerCase()) || t.projects?.profiles?.nome?.toLowerCase().includes(taskSearch.toLowerCase()))
              .map(task => {
                const isDelayed = task.status !== 'completed' && new Date(task.deadline) < new Date();
                const isSelected = selectedTaskIds.includes(task.id);
                
                return (
                  <div 
                    key={task.id} 
                    onClick={() => isBulkMode ? toggleTaskSelection(task.id) : null}
                    className={`p-4 rounded-2xl border flex flex-col group transition-all shadow-sm ${isBulkMode ? 'cursor-pointer' : ''} ${isSelected ? 'bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)]' : 'bg-white/80 border-[var(--color-atelier-grafite)]/5 hover:border-[var(--color-atelier-terracota)]/30'}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      
                      {isBulkMode && (
                        <div className="shrink-0 text-[var(--color-atelier-terracota)]">
                          {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-300"/>}
                        </div>
                      )}

                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-gray-50 flex items-center justify-center shadow-inner">
                        {task.projects?.profiles?.avatar_url ? <img src={task.projects.profiles.avatar_url} className="w-full h-full object-cover" /> : <span className="font-elegant text-lg text-[var(--color-atelier-terracota)]">{task.projects?.profiles?.nome?.charAt(0) || "W"}</span>}
                      </div>
                      <div className="flex flex-col cursor-pointer flex-1" onClick={(e) => { if (isBulkMode) return; setEditingTask(task); }}>
                        <div className="flex justify-between items-start">
                          <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors leading-tight pr-2">{task.title}</span>
                          {task.urgency && <Flame size={12} className="text-orange-500 shrink-0 mt-0.5"/>}
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mt-1 truncate">
                          {task.projects?.profiles?.nome || "White-Label"} • {new Date(task.deadline).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-atelier-grafite)]/5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-white shadow-sm bg-gray-100 flex items-center justify-center shrink-0">
                          {task.profiles?.avatar_url ? <img src={task.profiles.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 size={12} className="text-gray-300"/>}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] uppercase font-bold text-[var(--color-atelier-grafite)]/30">Executor</span>
                          <span className="text-[10px] font-bold text-[var(--color-atelier-grafite)]/80 leading-none">{task.profiles?.nome?.split(" ")[0] || "Livre"}</span>
                        </div>
                      </div>
                      
                      {!isBulkMode && (
                        <button onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }} className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all shadow-sm border border-green-200" title="Finalizar Tarefa">
                          <Check size={14} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* COLUNA 2: ANDAMENTO REAL DOS PROJETOS COM BUSCA INTELIGENTE */}
        <div className="w-full lg:w-1/3 glass-panel bg-white/60 p-6 flex flex-col rounded-[2.5rem] border border-white shadow-sm overflow-hidden h-full min-h-0">
          <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-4 shrink-0 flex flex-col gap-3">
            <div className="flex justify-between items-center mb-1">
                <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Progressão Real</h3>
                <Activity size={18} className="text-[var(--color-atelier-terracota)]"/>
            </div>
            <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-atelier-grafite)]/40 group-focus-within:text-[var(--color-atelier-terracota)] transition-colors" />
                <input 
                   type="text" 
                   placeholder="Localizar cliente ou operação..." 
                   value={projectSearch} 
                   onChange={(e)=>setProjectSearch(e.target.value)} 
                   className="w-full bg-white/60 border border-white/50 rounded-xl py-2 pl-9 pr-4 text-[11px] outline-none focus:border-[var(--color-atelier-terracota)]/30 focus:bg-white shadow-sm transition-all text-[var(--color-atelier-grafite)] font-bold" 
                />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
            {validProjects
              .filter(p => p.profiles?.nome?.toLowerCase().includes(projectSearch.toLowerCase()) || p.service_type?.toLowerCase().includes(projectSearch.toLowerCase()))
              .map(proj => {
                const projTasks = tasks.filter(t => t.project_id === proj.id);
                const total = projTasks.length;
                const done = projTasks.filter(t => t.status === 'completed').length;
                const progress = total === 0 ? 0 : Math.round((done / total) * 100);
                const isDelayed = projTasks.some(t => t.status !== 'completed' && new Date(t.deadline) < new Date());

                return (
                  <div key={proj.id} onClick={() => { setSelectedProjectId(proj.id); setActiveView('projects'); }} className="bg-white p-4 rounded-xl border border-[var(--color-atelier-grafite)]/5 shadow-sm flex flex-col gap-3 cursor-pointer hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
                          {proj.profiles?.avatar_url ? <img src={proj.profiles.avatar_url} className="w-full h-full object-cover"/> : <span className="font-elegant text-sm text-[var(--color-atelier-terracota)]">{proj.profiles?.nome?.charAt(0) || "W"}</span>}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] truncate max-w-[150px]">{proj.profiles?.nome || "White-Label"}</span>
                          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40">{isIdvService(proj) ? 'IDV' : 'Instagram'}</span>
                        </div>
                      </div>
                      {total === 0 ? <AlertTriangle size={14} className="text-orange-500" /> : isDelayed && <AlertTriangle size={14} className="text-red-500" />}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-[var(--color-atelier-grafite)]/50">{total === 0 ? 'Sem Pipeline' : 'Avanço do JTBD'}</span>
                        <span className="text-[var(--color-atelier-terracota)]">{total > 0 && `${done}/${total}`}</span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--color-atelier-grafite)]/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className={`h-full rounded-full ${isDelayed ? 'bg-red-500' : 'bg-gradient-to-r from-[var(--color-atelier-rose)] to-[var(--color-atelier-terracota)]'}`}></motion.div>
                      </div>
                    </div>
                  </div>
                )
            })}
          </div>
        </div>

        {/* COLUNA 3: CARGA DA EQUIPA E XP */}
        <div className="w-full lg:w-1/3 glass-panel bg-[var(--color-atelier-creme)]/50 p-6 flex flex-col rounded-[2.5rem] border border-[var(--color-atelier-terracota)]/20 shadow-sm overflow-hidden h-full min-h-0">
          <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-4 mb-4 shrink-0 flex justify-between items-center">
            <h3 className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Alocação de Esforço</h3>
            <Users size={18} className="text-[var(--color-atelier-terracota)]"/>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
            {team.map(member => {
              const memberTasks = activeTasksForQueue.filter(t => t.assigned_to === member.id);
              const estHours = (memberTasks.reduce((acc, t) => acc + (t.estimated_time || 0), 0) / 60).toFixed(1);
              return (
                <div key={member.id} onClick={() => setSelectedCollab(member)} className="bg-white p-4 rounded-xl border border-white shadow-sm flex items-center justify-between cursor-pointer hover:border-[var(--color-atelier-terracota)]/40 transition-all group">
                  <div className="flex items-center gap-3 w-3/4">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--color-atelier-terracota)]/20 shadow-inner shrink-0 bg-white flex items-center justify-center">
                      {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover"/> : <UserCircle2 className="text-gray-200" />}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-roboto font-bold text-[13px] text-[var(--color-atelier-grafite)] group-hover:text-[var(--color-atelier-terracota)] transition-colors truncate">{member.nome}</span>
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mt-0.5">{memberTasks.length} Ativas</span>
                    </div>
                  </div>
                  <div className="text-right pl-2 border-l border-[var(--color-atelier-grafite)]/5 shrink-0">
                    <span className="text-[10px] font-bold text-orange-500">~{estHours}h</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}