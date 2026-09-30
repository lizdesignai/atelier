const fs = require('fs');

let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// Ensure import for BrandDNACuradoria
if (!code.includes('import { BrandDNACuradoria }')) {
  code = code.replace(
    'import { CuradoriaStage } from "../components/brand/CuradoriaStage";',
    'import { CuradoriaStage } from "../components/brand/CuradoriaStage";\nimport { BrandDNACuradoria } from "../components/brand/BrandDNACuradoria";'
  );
}

// 1. Restore the Greeting
const headerReplace = `<header className="pt-4 flex flex-col gap-6 shrink-0 animate-[fadeInUp_0.8s_ease-out]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="relative w-6 h-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-[var(--color-atelier-terracota)] blur-md opacity-30 animate-pulse"></div>
              <img src="/images/simbolo-rosa.png" alt="Atelier Logo" className="w-full h-full object-contain relative z-10 animate-[pulse_3s_ease-in-out_infinite]" />
            </div>
            <span className="micro-title text-[var(--color-atelier-terracota)] tracking-[0.3em]">
              Projeto de Identidade
            </span>
          </div>
          <h1 className="font-elegant text-4xl text-[var(--color-atelier-grafite)] mt-2">
            Bem-vindo(a), {clientProfile?.nome?.split(' ')[0] || "Cliente"}!
          </h1>
          <p className="text-[var(--color-atelier-grafite)]/60">Acompanhe a construção da sua marca etapa por etapa.</p>
        </div>`;

code = code.replace(/<header className="pt-4 flex flex-col gap-6 shrink-0 animate-\[fadeInUp_0.8s_ease-out\]">[\s\S]*?<span className="micro-title text-\[var\(--color-atelier-terracota\)\] tracking-\[0.3em\]">\s*Projeto de Identidade\s*<\/span>\s*<\/div>/, headerReplace);

// 2. Fix the Timeline + Remove Agora / Próximo Marco box
const startTimeline = code.indexOf('{/* TIMELINE DE MOVIMENTOS - SUA JORNADA */}');
const endAgora = code.indexOf('{/* AREA DINAMICA DE ACÃO */}');

const newMiddle = `{/* TIMELINE LINEAR DO PROJETO */}
        <div className="w-full relative py-6 mb-4">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[var(--color-atelier-grafite)]/10 -translate-y-1/2 z-0 hidden md:block"></div>
          
          <div className="flex justify-between items-center relative z-10 w-full overflow-x-auto pb-4 md:pb-0 custom-scrollbar">
            {IDV_MOVEMENTS.map((movement, index) => {
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;

              return (
                <div key={movement.id} className="flex flex-col items-center gap-3 relative min-w-[80px]">
                  <div className={\`w-4 h-4 rounded-full flex items-center justify-center relative z-10 transition-colors duration-500 \${
                    isCompleted ? 'bg-[var(--color-atelier-terracota)]' : 
                    isCurrent ? 'bg-white border-2 border-[var(--color-atelier-terracota)] shadow-[0_0_15px_var(--color-atelier-terracota)] shadow-opacity-30' : 
                    'bg-white border-2 border-[var(--color-atelier-grafite)]/20'
                  }\`}>
                    {isCompleted && <div className="w-2 h-2 rounded-full bg-white"></div>}
                    {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-atelier-terracota)] animate-ping absolute"></div>}
                    {isCurrent && <div className="w-2 h-2 rounded-full bg-[var(--color-atelier-terracota)]"></div>}
                  </div>
                  <span className={\`font-roboto text-[10px] uppercase tracking-widest font-bold whitespace-nowrap transition-colors duration-500 \${
                    isCompleted || isCurrent ? 'text-[var(--color-atelier-grafite)]' : 'text-[var(--color-atelier-grafite)]/30'
                  }\`}>
                    {movement.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL - ETAPA CORRENTE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2">
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* AREA DINAMICA DE ACÃO */}
`;

code = code.substring(0, startTimeline) + newMiddle + code.substring(endAgora + '{/* AREA DINAMICA DE ACÃO */}'.length);

// 3. Render BrandDNACuradoria in currentStageIndex === 1
code = code.replace(
  /\{currentStageIndex === 2 && \(/,
  `{currentStageIndex === 1 && (
              <div className="flex flex-col gap-8">
                <BrandDNACuradoria projectId={activeProject?.id} clientProfile={clientProfile} />
              </div>
            )}

            {currentStageIndex === 2 && (`
);

fs.writeFileSync('src/app/page.tsx', code);
