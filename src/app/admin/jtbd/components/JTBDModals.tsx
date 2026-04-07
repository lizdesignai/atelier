// src/app/admin/jtbd/components/JTBDModals.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Flame, X, Loader2, Award } from "lucide-react";

interface JTBDModalsProps {
  isAdHocModalOpen: boolean;
  setIsAdHocModalOpen: (isOpen: boolean) => void;
  adHocForm: { title: string; projectId: string; assigneeId: string; estTime: number; deadline: string; description: string };
  setAdHocForm: (form: any) => void;
  projects: any[];
  team: any[];
  handleFireGrenade: () => void;
  adHocProcessing: boolean;
  earnedExpToast: { show: boolean; amount: number; msg: string };
}

export default function JTBDModals({
  isAdHocModalOpen,
  setIsAdHocModalOpen,
  adHocForm,
  setAdHocForm,
  projects,
  team,
  handleFireGrenade,
  adHocProcessing,
  earnedExpToast
}: JTBDModalsProps) {

  return (
    <>
      {/* =========================================================================
          MODAL: INJETAR GRANADA (ADMIN/GESTOR)
          ========================================================================= */}
      <AnimatePresence>
        {isAdHocModalOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsAdHocModalOpen(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-md border border-orange-500/20 flex flex-col gap-5"
            >
              <div className="flex justify-between items-start border-b border-[var(--color-atelier-grafite)]/10 pb-4">
                <div>
                  <h3 className="font-elegant text-3xl text-orange-600 flex items-center gap-2">
                    <Flame size={24}/> Granada Ad-Hoc
                  </h3>
                  <p className="font-roboto text-[11px] font-bold text-[var(--color-atelier-grafite)]/50 uppercase tracking-widest mt-1">
                    Injeção direta no JTBD de um membro
                  </p>
                </div>
                <button onClick={() => setIsAdHocModalOpen(false)} className="text-[var(--color-atelier-grafite)]/40 hover:text-[var(--color-atelier-terracota)]">
                  <X size={20}/>
                </button>
              </div>
              
              <div className="flex flex-col gap-4">
                <input 
                  type="text" 
                  placeholder="Título da Missão Urgente..." 
                  value={adHocForm.title} 
                  onChange={(e) => setAdHocForm({...adHocForm, title: e.target.value})} 
                  className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[14px] font-bold text-[var(--color-atelier-grafite)] outline-none focus:border-orange-500 shadow-sm" 
                />
                
                <select 
                  value={adHocForm.projectId} 
                  onChange={(e) => setAdHocForm({...adHocForm, projectId: e.target.value})} 
                  className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-orange-500 shadow-sm"
                >
                  <option value="" disabled>Selecione o Projeto do Cliente...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.profiles?.nome}</option>)}
                </select>

                <select 
                  value={adHocForm.assigneeId} 
                  onChange={(e) => setAdHocForm({...adHocForm, assigneeId: e.target.value})} 
                  className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] outline-none focus:border-orange-500 shadow-sm"
                >
                  <option value="" disabled>Quem deve executar AGORA?</option>
                  {team.map(t => <option key={t.id} value={t.id}>{t.nome} ({t.role})</option>)}
                </select>

                <div className="flex gap-4">
                  <div className="flex flex-col gap-1.5 w-1/2">
                    <span className="font-roboto text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50 ml-1">Deadline Crucial</span>
                    <input 
                      type="datetime-local" 
                      value={adHocForm.deadline} 
                      onChange={(e) => setAdHocForm({...adHocForm, deadline: e.target.value})} 
                      className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[12px] outline-none focus:border-orange-500 shadow-sm" 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 w-1/2">
                    <span className="font-roboto text-[10px] uppercase font-bold text-[var(--color-atelier-grafite)]/50 ml-1">Tempo Est. (Min)</span>
                    <input 
                      type="number" 
                      value={adHocForm.estTime} 
                      onChange={(e) => setAdHocForm({...adHocForm, estTime: parseInt(e.target.value)})} 
                      className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-3 text-[13px] outline-none focus:border-orange-500 shadow-sm" 
                    />
                  </div>
                </div>

                <textarea 
                  placeholder="Briefing e Links rápidos..." 
                  value={adHocForm.description} 
                  onChange={(e) => setAdHocForm({...adHocForm, description: e.target.value})} 
                  className="w-full bg-[var(--color-atelier-creme)]/50 border border-[var(--color-atelier-grafite)]/10 rounded-xl p-4 text-[13px] resize-none h-24 outline-none focus:border-orange-500 custom-scrollbar shadow-sm" 
                />
              </div>

              <button 
                onClick={handleFireGrenade} 
                disabled={adHocProcessing || !adHocForm.title || !adHocForm.projectId || !adHocForm.assigneeId || !adHocForm.deadline} 
                className="w-full mt-2 bg-orange-500 text-white py-4 rounded-xl text-[12px] font-bold uppercase tracking-widest shadow-[0_10px_20px_rgba(249,115,22,0.3)] hover:bg-orange-600 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {adHocProcessing ? <Loader2 size={16} className="animate-spin"/> : "Disparar Granada"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          FEEDBACK GAMIFICAÇÃO NA TELA (EXP TOAST)
          ========================================================================= */}
      <AnimatePresence>
        {earnedExpToast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-10 right-10 z-[500] bg-[var(--color-atelier-grafite)] text-white p-6 rounded-3xl shadow-2xl flex items-center gap-5 border border-white/10"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${earnedExpToast.amount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              <Award size={28} />
            </div>
            <div className="flex flex-col">
              <span className={`font-elegant text-3xl leading-none ${earnedExpToast.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {earnedExpToast.amount > 0 ? '+' : ''}{earnedExpToast.amount} EXP
              </span>
              <span className="font-roboto text-[11px] uppercase tracking-widest text-white/50 mt-1">{earnedExpToast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}