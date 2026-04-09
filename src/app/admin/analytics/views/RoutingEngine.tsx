// src/app/admin/analytics/views/RoutingEngine.tsx
import { motion } from "framer-motion";
import { 
  GitMerge, Loader2, ChevronRight, 
  UserCircle2, Trash2, CheckSquare, Square 
} from "lucide-react";

interface RoutingEngineProps {
  routeConfig: { projectId: string; taskType: string; assigneeId: string };
  setRouteConfig: (config: any) => void;
  isProcessing: boolean;
  activeProjectsList: any[];
  currentTaskTypes: any[];
  team: any[];
  handleSaveRule: () => void;
  routingRules: any[];
  validProjects: any[];
  isIdvService: (project: any) => boolean;
  isBulkMode: boolean;
  selectedRuleIds: string[];
  toggleRuleSelection: (id: string) => void;
  handleDeleteRule: (ruleId: string) => void;
}

export default function RoutingEngine({
  routeConfig,
  setRouteConfig,
  isProcessing,
  activeProjectsList,
  currentTaskTypes,
  team,
  handleSaveRule,
  routingRules,
  validProjects,
  isIdvService,
  isBulkMode,
  selectedRuleIds,
  toggleRuleSelection,
  handleDeleteRule
}: RoutingEngineProps) {
  
  return (
    <motion.div key="routing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
      
      {/* FORMULÁRIO DE NOVA REGRA */}
      <div className="w-full lg:w-1/3 glass-panel bg-[var(--color-atelier-grafite)] text-white p-8 rounded-[2.5rem] flex flex-col gap-6 shadow-lg h-fit relative overflow-hidden shrink-0">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-[var(--color-atelier-terracota)]/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 border-b border-white/10 pb-4">
          <h3 className="font-elegant text-3xl mb-1">Distribuição de Regras</h3>
          <p className="font-roboto text-[11px] text-white/50 uppercase tracking-widest">Delegar Fases Automáticas</p>
        </div>
        
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex flex-col gap-1.5">
            <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-white/60 ml-1">1. Qual Projeto?</span>
            <select value={routeConfig.projectId} onChange={(e) => setRouteConfig({...routeConfig, projectId: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-[1.2rem] p-4 text-[13px] text-white outline-none cursor-pointer focus:border-[var(--color-atelier-terracota)]/50 transition-colors">
              <option value="" disabled className="text-black">Selecionar Cliente...</option>
              {activeProjectsList.map(p => <option key={p.id} value={p.id} className="text-black">{p.profiles?.nome}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-white/60 ml-1">2. Que Fase ou Tarefa?</span>
            <select value={routeConfig.taskType} onChange={(e) => setRouteConfig({...routeConfig, taskType: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-[1.2rem] p-4 text-[13px] text-white outline-none cursor-pointer focus:border-[var(--color-atelier-terracota)]/50 transition-colors">
              <option value="" disabled className="text-black">Fase da Operação...</option>
              {routeConfig.projectId 
                ? currentTaskTypes?.map(type => <option key={type.id} value={type.id} className="text-black">{type.label}</option>)
                : <option disabled className="text-black">Selecione o Cliente Acima ↑</option>
              }
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-roboto text-[9px] font-bold uppercase tracking-widest text-white/60 ml-1">3. A quem vai pertencer?</span>
            <select value={routeConfig.assigneeId} onChange={(e) => setRouteConfig({...routeConfig, assigneeId: e.target.value})} className="w-full bg-white/10 border border-white/20 rounded-[1.2rem] p-4 text-[13px] text-white outline-none cursor-pointer focus:border-[var(--color-atelier-terracota)]/50 transition-colors">
              <option value="" disabled className="text-black">Responsável Direto...</option>
              {team.map(t => {
                const isRecommended = routeConfig.taskType && t.skills?.includes(routeConfig.taskType);
                return <option key={t.id} value={t.id} className="text-black">{t.nome} {isRecommended ? '⭐' : ''}</option>
              })}
            </select>
          </div>
          
          <button onClick={handleSaveRule} disabled={isProcessing || !routeConfig.projectId || !routeConfig.taskType || !routeConfig.assigneeId} className="w-full mt-2 bg-[var(--color-atelier-terracota)] text-white py-4 rounded-[1.2rem] font-bold uppercase tracking-widest text-[11px] shadow-sm hover:bg-white hover:text-[var(--color-atelier-grafite)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-[var(--color-atelier-terracota)] disabled:hover:text-white hover:-translate-y-0.5 disabled:hover:translate-y-0">
            {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <GitMerge size={16}/>} Estabelecer Regra
          </button>
        </div>
      </div>

      {/* MATRIZ DE REGRAS ATIVAS */}
      <div className="flex-1 glass-panel p-8 rounded-[2.5rem] overflow-hidden flex flex-col h-full min-h-0">
        <div className="border-b border-[var(--color-atelier-grafite)]/10 pb-6 mb-6 shrink-0 flex justify-between items-center">
          <div>
            <h3 className="font-elegant text-3xl text-[var(--color-atelier-grafite)]">Matriz Ativa</h3>
            <p className="font-roboto text-[12px] text-[var(--color-atelier-grafite)]/60 mt-1">Conexões mapeadas para atribuição automática.</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
          {routingRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-40 text-center">
              <GitMerge size={48} className="mb-4 text-[var(--color-atelier-grafite)]" />
              <p className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">Sem Automação</p>
            </div>
          ) : (
            routingRules.map(rule => {
              const proj = validProjects.find(p => p.id === rule.project_id);
              const member = team.find(t => t.id === rule.assignee_id);
              
              const taskTypeLabel = rule.task_type;
              const isSelected = selectedRuleIds.includes(rule.id);

              return (
                <div 
                  key={rule.id} 
                  onClick={() => isBulkMode ? toggleRuleSelection(rule.id) : null}
                  className={`p-5 rounded-[1.2rem] border flex items-center justify-between group transition-all shadow-sm ${isBulkMode ? 'cursor-pointer hover:scale-[1.01]' : ''} ${isSelected ? 'bg-[var(--color-atelier-terracota)]/5 border-[var(--color-atelier-terracota)]' : 'bg-white/80 border-[var(--color-atelier-grafite)]/5 hover:border-[var(--color-atelier-terracota)]/30 hover:bg-white'}`}
                >
                  <div className="flex items-center gap-6 w-full">
                    {isBulkMode && (
                      <div className="shrink-0 text-[var(--color-atelier-terracota)]">
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-300"/>}
                      </div>
                    )}

                    <div className="flex flex-col w-1/3">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">Cliente</span>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shadow-inner shrink-0">
                          {proj?.profiles?.avatar_url ? <img src={proj.profiles.avatar_url} className="w-full h-full object-cover" /> : <span className="font-elegant text-sm text-[var(--color-atelier-terracota)]">{proj?.profiles?.nome?.charAt(0) || "W"}</span>}
                        </div>
                        <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-grafite)] truncate">{proj?.profiles?.nome || "Excluído"}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col w-1/4">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">Atribuição</span>
                      <span className="font-roboto font-bold text-[12px] text-[var(--color-atelier-grafite)]/80 truncate bg-[var(--color-atelier-grafite)]/5 px-3 py-1.5 rounded-lg w-fit">{taskTypeLabel}</span>
                    </div>
                    
                    <ChevronRight size={14} className="text-[var(--color-atelier-grafite)]/20 shrink-0"/>
                    
                    <div className="flex flex-col flex-1 pl-4">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 mb-1">Vai para</span>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shadow-inner shrink-0">
                          {member?.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" /> : <UserCircle2 size={14} className="text-gray-300"/>}
                        </div>
                        <span className="font-roboto font-bold text-[14px] text-[var(--color-atelier-terracota)] truncate">{member?.nome || "Desconhecido"}</span>
                      </div>
                    </div>
                  </div>

                  {!isBulkMode && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule.id); }} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2.5 rounded-xl transition-all opacity-0 group-hover:opacity-100 ml-4 shrink-0 shadow-sm border border-transparent hover:border-red-100" title="Remover Regra">
                      <Trash2 size={16}/>
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}