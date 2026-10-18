const fs = require('fs');
const file = 'src/app/admin/analytics/page.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\\r\\n/g, '\\n');

// Sync Reunião to QG
const targetReuniao = "task_type: 'meeting',";
const replacementReuniao = \`task_type: 'meeting',\`;

if (!content.includes("SALVA NO QG DA LIZIANE")) {
    content = content.replace(
        /const \{ error \} = await supabase\.from\('tasks'\)\.insert\(\{[\s\S]*?task_type: 'meeting',[\s\S]*?\}\);/,
        \`$&
        
      // SALVA NO QG DA LIZIANE (prospect_meetings) PARA A ABA DE AGENDA
      await supabase.from('prospect_meetings').insert({
          title: \\\`[REUNIÃO Interna/Time] \${reuniaoForm.title}\\\`,
          meeting_date: new Date(reuniaoForm.date).toISOString(),
          notes: \\\`Link: \${reuniaoForm.link}\\n\\n\${reuniaoForm.notes}\\\`
      });\`
    );

    content = content.replace(
        /const \{ error \} = await supabase\.from\('tasks'\)\.insert\(\{[\s\S]*?task_type: 'captacao',[\s\S]*?\}\);/,
        \`$&
        
      // SALVA NO QG DA LIZIANE (prospect_meetings) PARA A ABA DE AGENDA
      await supabase.from('prospect_meetings').insert({
          title: \\\`[CAPTAÇÃO] \${captacaoForm.title}\\\`,
          meeting_date: new Date(captacaoForm.date).toISOString(),
          notes: \\\`Local: \${captacaoForm.location}\\n\\n\${captacaoForm.notes}\\\`
      });\`
    );

    const oldHeader = \`<div className="flex items-center gap-2">
             <button onClick={() => {}} className="p-2\`;

    const newHeader = \`<div className="flex items-center gap-2">
             <button 
                onClick={() => setIsReuniaoModalOpen(true)}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)] active:scale-95 transition-transform"
             >
                <Plus size={14} className="text-[var(--color-atelier-terracota)]" /> Reunião
             </button>
             <button 
                onClick={() => setIsCaptacaoModalOpen(true)}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)] active:scale-95 transition-transform"
             >
                <Target size={14} className="text-[var(--color-atelier-terracota)]" /> Captação
             </button>
             <button onClick={() => {}} className="p-2\`;

    content = content.replace(oldHeader, newHeader);

    fs.writeFileSync(file, content);
    console.log('Analytics synced successfully!');
} else {
    console.log('Already synced');
}
