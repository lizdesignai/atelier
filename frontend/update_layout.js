const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// 1. Fixing Header (Greeting + Logo shadow + Banner)
const startHeader = code.indexOf('<header');
const endHeader = code.indexOf('</header>') + '</header>'.length;

const newHeader = `<header className="pt-4 flex flex-col gap-6 shrink-0 animate-[fadeInUp_0.8s_ease-out]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 bg-[var(--color-atelier-terracota)] blur-xl opacity-40 animate-pulse rounded-full"></div>
              <img src="/images/simbolo-rosa.png" alt="Atelier Logo" className="w-6 h-6 object-contain relative z-10 animate-[pulse_3s_ease-in-out_infinite]" />
            </div>
            <span className="micro-title text-[var(--color-atelier-terracota)] tracking-[0.3em]">
              Projeto de Identidade
            </span>
          </div>
          <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)]">
            Sinta-se em casa, {clientProfile?.nome?.split(' ')[0] || "Cliente"}!
          </h1>
        </div>
        
        {/* WIDGET/BANNER ANIMADO DE PROGRESSO */}
        <div className="relative overflow-hidden rounded-[2rem] border border-white/50 shadow-sm p-8 min-h-[160px] flex flex-col justify-center">
          {/* Fundo dinâmico baseado no tempo (simulado aqui com gradiente CSS que dança) */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#F0EBE1] via-[var(--color-atelier-terracota)]/10 to-[#F0EBE1] bg-[length:200%_200%] animate-[gradient_8s_ease_infinite] opacity-80 mix-blend-multiply"></div>
          
          {/* Efeito de cores ganhando contraste - simulado por divs com blur */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[var(--color-atelier-terracota)]/20 rounded-full blur-[80px] animate-[pulse_6s_ease-in-out_infinite]"></div>
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#C1A89D]/20 rounded-full blur-[80px] animate-[pulse_8s_ease-in-out_infinite_1s]"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60 block mb-1">Marca</span>
              <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">{clientProfile?.nome || "Cliente"}</span>
            </div>
            <div className="text-center">
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60 block mb-1">Status Atual</span>
              <div className="bg-white/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 inline-block">
                <span className="font-elegant text-xl text-[var(--color-atelier-terracota)]">{currentMovement?.name || "Descobrir"}</span>
              </div>
            </div>
            <div className="text-center md:text-right">
              <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/60 block mb-1">Revelação Prevista</span>
              <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
                {activeProject?.data_limite ? new Date(activeProject.data_limite).toLocaleDateString('pt-BR') : 'A definir'}
              </span>
            </div>
          </div>
        </div>
      </header>`;

code = code.substring(0, startHeader) + newHeader + code.substring(endHeader);

// 2. No-Scroll fix
// The parent has "overflow-y-auto custom-scrollbar". Remove those so it's no-scroll.
code = code.replace(/h-\[calc\(100vh-60px\)\] max-w-\[1400px\] mx-auto relative z-10 pb-6 gap-8 overflow-y-auto custom-scrollbar/g, 
  'h-[calc(100vh-80px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-8 overflow-hidden flex flex-col'
);

// We need to make the section containing the components flex-1 and scrollable if needed internally, but the user said "Essa tela inciial deve ser no-scroll também".
// I'll make the section overflow-hidden.
code = code.replace(/<section className="flex flex-col gap-8 animate-\[fadeInUp_1s_ease-out_0\.2s_both\]">/,
  '<section className="flex-1 flex flex-col gap-6 animate-[fadeInUp_1s_ease-out_0.2s_both] min-h-0">'
);

// 3. Fix the Timeline Design
const startTimeline = code.indexOf('{/* TIMELINE LINEAR DO PROJETO */}');
const endTimeline = code.indexOf('{/* CONTEÚDO PRINCIPAL - ETAPA CORRENTE */}');

const newTimeline = `{/* TIMELINE LINEAR DO PROJETO - REFORMULADA */}
        <div className="w-full relative shrink-0">
          <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-[var(--color-atelier-grafite)]/10 -translate-y-1/2 z-0 hidden md:block"></div>
          
          <div className="flex justify-between items-center relative z-10 w-full px-2">
            {IDV_MOVEMENTS.map((movement, index) => {
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;

              return (
                <div key={movement.id} className="flex flex-col items-center gap-2 relative">
                  <div className={\`w-6 h-6 rounded-full flex items-center justify-center relative z-10 transition-all duration-700 \${
                    isCompleted ? 'bg-[var(--color-atelier-terracota)] scale-90' : 
                    isCurrent ? 'bg-white border-[3px] border-[var(--color-atelier-terracota)] shadow-[0_0_20px_rgba(182,128,104,0.4)] scale-110' : 
                    'bg-[#F0EBE1] border border-[var(--color-atelier-grafite)]/20 scale-75'
                  }\`}>
                    {isCompleted && <div className="w-2 h-2 rounded-full bg-white"></div>}
                    {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-atelier-terracota)]"></div>}
                  </div>
                  <span className={\`font-roboto text-[9px] uppercase tracking-widest font-bold whitespace-nowrap transition-colors duration-500 \${
                    isCompleted || isCurrent ? 'text-[var(--color-atelier-grafite)]' : 'text-[var(--color-atelier-grafite)]/30'
                  }\`}>
                    {movement.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

`;

code = code.substring(0, startTimeline) + newTimeline + code.substring(endTimeline);

// Fix grid container for components
code = code.replace(/<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2">/g, '<div className="flex-1 w-full mt-2 relative min-h-0 flex flex-col">');
code = code.replace(/<div className="lg:col-span-8 flex flex-col gap-8">/g, '<div className="flex-1 flex flex-col gap-8 w-full max-w-5xl mx-auto h-full overflow-y-auto custom-scrollbar pr-2 pb-10">');

fs.writeFileSync('src/app/page.tsx', code);
