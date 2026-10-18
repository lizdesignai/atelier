const fs = require('fs');
const file = 'src/app/admin/analytics/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Reunião
let meetRegex = /task_type: 'meeting',[\s\S]*?estimated_time: 60\n\s*\}\);\n\s*if \(error\) throw error;/;
let meetReplace = "task_type: 'meeting', stage: 'Logística Externa', deadline: new Date(reuniaoForm.date).toISOString(), status: 'pending', estimated_time: 60 });\nawait supabase.from('prospect_meetings').insert({ title: '[REUNIÃO] ' + reuniaoForm.title, meeting_date: new Date(reuniaoForm.date).toISOString(), notes: 'Link: ' + reuniaoForm.link + '\\n\\n' + reuniaoForm.notes });\nif (error) throw error;";

content = content.replace(meetRegex, meetReplace);

// 2. Captação
let capRegex = /task_type: 'captacao',[\s\S]*?estimated_time: 120\n\s*\}\);\n\s*if \(error\) throw error;/;
let capReplace = "task_type: 'captacao', stage: 'Logística Externa', deadline: new Date(captacaoForm.date).toISOString(), status: 'pending', estimated_time: 120 });\nawait supabase.from('prospect_meetings').insert({ title: '[CAPTAÇÃO] ' + captacaoForm.title, meeting_date: new Date(captacaoForm.date).toISOString(), notes: 'Local: ' + captacaoForm.location + '\\n\\n' + captacaoForm.notes });\nif (error) throw error;";

content = content.replace(capRegex, capReplace);

// 3. Header Buttons
let headerOld = '<div className="flex items-center gap-2">\n           <button onClick={() => {}} className="p-2';
let headerNew = '<div className="flex items-center gap-2">\n           <button onClick={() => setIsReuniaoModalOpen(true)} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)] active:scale-95 transition-transform"><Plus size={14} className="text-[var(--color-atelier-terracota)]" /> Reunião</button>\n           <button onClick={() => setIsCaptacaoModalOpen(true)} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)] active:scale-95 transition-transform"><Target size={14} className="text-[var(--color-atelier-terracota)]" /> Captação</button>\n           <button onClick={() => {}} className="p-2';

content = content.replace(headerOld, headerNew);

fs.writeFileSync(file, content);
console.log('Script executed');
