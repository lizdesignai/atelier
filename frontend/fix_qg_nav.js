const fs = require('fs');

const file = 'src/app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// We need to add the icon imports if they don't exist
const importLine = `  Star, ThumbsUp, TrendingUp, Award, MessageSquareHeart, Activity\n} from "lucide-react";`;
const newImportLine = `  Star, ThumbsUp, TrendingUp, Award, MessageSquareHeart, Activity, LayoutDashboard, Users, FileSignature, FileEdit, Compass\n} from "lucide-react";`;
if (!content.includes('FileSignature')) {
    content = content.replace(importLine, newImportLine);
}

const oldNav = `<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex justify-center w-[95%] md:w-auto">
          <div className="flex flex-wrap items-center bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-1.5 rounded-[2rem] gap-1 z-10 w-full md:w-fit justify-center">
            <button onClick={() => { setActiveTab('geral'); setSelectedItem(null); }} className={\`px-4 md:px-5 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex-1 md:flex-none \${activeTab === 'geral' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}\`}>Visão Geral</button>
            <button onClick={() => { setActiveTab('consultoria'); setSelectedItem(null); }} className={\`px-4 md:px-5 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex-1 md:flex-none \${activeTab === 'consultoria' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}\`}>Consultoria</button>
            <button onClick={() => { setActiveTab('orcamentos'); setSelectedItem(null); }} className={\`px-4 md:px-5 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex-1 md:flex-none \${activeTab === 'orcamentos' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}\`}>
              Orçamentos {formularios.filter(f => !f.lido).length > 0 && <span className="text-white bg-orange-500 px-1.5 py-0.5 rounded ml-1 text-[9px] font-black">{formularios.filter(f => !f.lido).length}</span>}
            </button>
            <button onClick={() => { setActiveTab('briefings'); setSelectedItem(null); }} className={\`px-4 md:px-5 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex-1 md:flex-none \${activeTab === 'briefings' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}\`}>Briefing</button>
            <button onClick={() => { setActiveTab('pesquisas'); setSelectedItem(null); }} className={\`px-4 md:px-5 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex-1 md:flex-none \${activeTab === 'pesquisas' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}\`}>Pesquisas</button>
            <button onClick={() => { setActiveTab('mapa'); setSelectedItem(null); }} className={\`px-4 md:px-5 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex-1 md:flex-none \${activeTab === 'mapa' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}\`}>O Mapa</button>
          </div>
        </div>`;

const newNav = `<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex justify-center w-[95%] md:w-auto">
          <div className="flex flex-wrap items-center bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-1.5 rounded-[2rem] gap-1 z-10 w-full md:w-fit justify-center">
            <button onClick={() => { setActiveTab('geral'); setSelectedItem(null); }} className={\`px-4 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 \${activeTab === 'geral' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}\`}>
              <LayoutDashboard size={16} /> {activeTab === 'geral' && <span>Visão Geral</span>}
            </button>
            <button onClick={() => { setActiveTab('consultoria'); setSelectedItem(null); }} className={\`px-4 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 \${activeTab === 'consultoria' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}\`}>
              <Users size={16} /> {activeTab === 'consultoria' && <span>Consultoria</span>}
            </button>
            <button onClick={() => { setActiveTab('orcamentos'); setSelectedItem(null); }} className={\`px-4 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 \${activeTab === 'orcamentos' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}\`}>
              <FileSignature size={16} /> {activeTab === 'orcamentos' && <span>Orçamentos</span>}
              {formularios.filter(f => !f.lido).length > 0 && <span className={\`text-white bg-orange-500 px-1.5 py-0.5 rounded ml-1 text-[9px] font-black \${activeTab !== 'orcamentos' && 'absolute -top-1 -right-1 rounded-full'}\`}>{activeTab === 'orcamentos' ? formularios.filter(f => !f.lido).length : ''}</span>}
            </button>
            <button onClick={() => { setActiveTab('briefings'); setSelectedItem(null); }} className={\`px-4 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 \${activeTab === 'briefings' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}\`}>
              <Briefcase size={16} /> {activeTab === 'briefings' && <span>Briefing</span>}
            </button>
            <button onClick={() => { setActiveTab('pesquisas'); setSelectedItem(null); }} className={\`px-4 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 \${activeTab === 'pesquisas' ? 'bg-[var(--color-atelier-terracota)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}\`}>
              <Star size={16} /> {activeTab === 'pesquisas' && <span>Pesquisas</span>}
            </button>
            <button onClick={() => { setActiveTab('mapa'); setSelectedItem(null); }} className={\`px-4 py-2.5 rounded-full font-roboto text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 \${activeTab === 'mapa' ? 'bg-[var(--color-atelier-grafite)] text-white shadow-md' : 'text-gray-500 hover:bg-white/50'}\`}>
              <Compass size={16} /> {activeTab === 'mapa' && <span>O Mapa</span>}
            </button>
          </div>
        </div>`;

// Replace ignoring \r
const safeOldNavRegex = /<div className="fixed bottom-6 left-1\/2[\s\S]*?O Mapa<\/button>\s*<\/div>\s*<\/div>/;

if (content.match(safeOldNavRegex)) {
    content = content.replace(safeOldNavRegex, newNav);
    fs.writeFileSync(file, content);
    console.log('Nav replaced successfully');
} else {
    console.log('Nav not found');
}
