const fs = require('fs'); 
let code = fs.readFileSync('src/app/admin/projetos/page.tsx', 'utf-8'); 
code = code.replace(
  '{/* Botões de Ação Rápida */}', 
  `{/* Botões de Ação Rápida */}
                <button onClick={handleGenerateIDVTasks} disabled={isGeneratingIDVTasks} className="w-full bg-[var(--color-atelier-rose)] text-[var(--color-atelier-terracota)] rounded-[1.2rem] py-3 font-bold uppercase tracking-[0.1em] text-[9px] hover:bg-[var(--color-atelier-terracota)] hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm mb-2 border border-[var(--color-atelier-terracota)]/20">
                  {isGeneratingIDVTasks ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} 
                  Gerar Trilha da Marca (AIDV)
                </button>`
); 
fs.writeFileSync('src/app/admin/projetos/page.tsx', code);
