const fs = require('fs');
const file = 'src/app/admin/analytics/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add buttons to the Header
const headerBlock = `<div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center">
                <Activity size={18} strokeWidth={1.5} />
             </div>
             <div>
               <h1 className="font-elegant font-bold text-lg md:text-xl text-[var(--color-atelier-grafite)]">Central de Comando</h1>
               <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 block -mt-1">QG da Liziane • Status em Tempo Real</span>
             </div>
          </div>
          
          <div className="flex items-center gap-2">`;

const newHeaderBlock = `<div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-[var(--color-atelier-terracota)]/10 text-[var(--color-atelier-terracota)] flex items-center justify-center">
                <Activity size={18} strokeWidth={1.5} />
             </div>
             <div>
               <h1 className="font-elegant font-bold text-lg md:text-xl text-[var(--color-atelier-grafite)]">Central de Comando</h1>
               <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/40 block -mt-1">QG da Liziane • Status em Tempo Real</span>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
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
             </button>`;

if (content.includes('QG da Liziane • Status em Tempo Real') && !content.includes('> Reunião')) {
    content = content.replace(headerBlock, newHeaderBlock);
}

// 2. Sync Reunião to QG (prospect_meetings)
const taskMeetingInsert = `const { error } = await supabase.from('tasks').insert({
        project_id: selectedEntityType === 'project' ? selectedEntityId : null,
        agency_id: selectedEntityType === 'agency' ? selectedEntityId : null,
        assigned_to: reuniaoForm.assigneeId,
        title: \`📅 REUNIÃO: \${reuniaoForm.title}\`,
        description: \`📍 Link/Local: \${reuniaoForm.link}\\n📝 Notas: \${reuniaoForm.notes}\`,
        task_type: 'meeting',
        stage: 'Logística Externa',
        deadline: new Date(reuniaoForm.date).toISOString(),
        status: 'pending',
        estimated_time: 60
      });`;

const newMeetingInsert = taskMeetingInsert + `
      
      // SALVA NO QG DA LIZIANE (prospect_meetings) PARA A ABA DE AGENDA
      await supabase.from('prospect_meetings').insert({
          title: \`[REUNIÃO Interna/Time] \${reuniaoForm.title}\`,
          meeting_date: new Date(reuniaoForm.date).toISOString(),
          notes: \`Link: \${reuniaoForm.link}\\n\\n\${reuniaoForm.notes}\`
      });
`;

if (content.includes("task_type: 'meeting'") && !content.includes("SALVA NO QG DA LIZIANE")) {
    content = content.replace(taskMeetingInsert, newMeetingInsert);
}

// 3. Sync Captação to QG
const taskCaptacaoInsert = `const { error } = await supabase.from('tasks').insert({
        project_id: selectedEntityType === 'project' ? selectedEntityId : null,
        agency_id: selectedEntityType === 'agency' ? selectedEntityId : null,
        assigned_to: captacaoForm.assigneeId,
        title: \`🎯 CAPTAÇÃO: \${captacaoForm.title}\`,
        description: \`📍 Local: \${captacaoForm.location}\\n📝 Notas: \${captacaoForm.notes}\`,
        task_type: 'captacao',
        stage: 'Logística Externa',
        deadline: new Date(captacaoForm.date).toISOString(),
        status: 'pending',
        estimated_time: 120
      });`;

const newCaptacaoInsert = taskCaptacaoInsert + `
      
      // SALVA NO QG DA LIZIANE (prospect_meetings) PARA A ABA DE AGENDA
      await supabase.from('prospect_meetings').insert({
          title: \`[CAPTAÇÃO] \${captacaoForm.title}\`,
          meeting_date: new Date(captacaoForm.date).toISOString(),
          notes: \`Local: \${captacaoForm.location}\\n\\n\${captacaoForm.notes}\`
      });
`;

if (content.includes("task_type: 'captacao'") && !content.includes("[CAPTAÇÃO]")) {
    content = content.replace(taskCaptacaoInsert, newCaptacaoInsert);
}

fs.writeFileSync(file, content);
console.log('Analytics buttons & sync injected.');
