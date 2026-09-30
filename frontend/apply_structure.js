const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// 1. Rename Brand Lab
code = code.replace(/name: "Brand Lab"/g, 'name: "Brand DNA"');

// 2. Replace Header
const headerStart = code.indexOf('<header');
const headerEnd = code.indexOf('</header>') + '</header>'.length;

const newHeader = `
      <header className="pt-4 flex flex-col gap-6 shrink-0 animate-[fadeInUp_0.8s_ease-out]">
        <div className="flex items-center gap-3">
          <div className="relative w-6 h-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-[var(--color-atelier-terracota)] blur-md opacity-30 animate-pulse"></div>
            <img src="/images/simbolo-rosa.png" alt="Atelier Logo" className="w-full h-full object-contain relative z-10 animate-[pulse_3s_ease-in-out_infinite]" />
          </div>
          <span className="micro-title text-[var(--color-atelier-terracota)] tracking-[0.3em]">
            Projeto de Identidade
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/60 p-6 md:p-8 rounded-[2rem] border border-white shadow-sm">
          <div>
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 block mb-1">Marca</span>
            <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">{clientProfile?.nome?.split(' ')[0] || "Cliente"}</span>
          </div>
          <div>
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 block mb-1">Status</span>
            <span className="font-elegant text-2xl text-[var(--color-atelier-terracota)]">{currentMovement?.name || "Descobrir"}</span>
          </div>
          <div>
            <span className="font-roboto text-[10px] uppercase font-bold tracking-widest text-[var(--color-atelier-grafite)]/50 block mb-1">Entrega prevista</span>
            <span className="font-elegant text-2xl text-[var(--color-atelier-grafite)]">
              {activeProject?.data_limite ? new Date(activeProject.data_limite).toLocaleDateString('pt-BR') : 'A definir'}
            </span>
          </div>
        </div>
      </header>
`;

code = code.substring(0, headerStart) + newHeader + code.substring(headerEnd);

// 3. Replace Timeline and Você está aqui block
const sectionStart = code.indexOf('{/* TIMELINE DE MOVIMENTOS */}');
const tasksEnd = code.indexOf('          <div className="lg:col-span-4 flex flex-col gap-6">');

const newMainContent = `
        {/* TIMELINE DE MOVIMENTOS - SUA JORNADA */}
        <div className="glass-panel p-6 md:p-8 rounded-[2.5rem] w-full relative overflow-hidden flex flex-col gap-6">
          <h3 className="font-roboto text-[11px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 text-center mb-2">Sua Jornada</h3>
          
          <div className="flex justify-between items-center relative z-10 max-w-4xl mx-auto w-full px-4">
            {IDV_MOVEMENTS.map((movement, index) => {
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex && hasBriefing;
              const isPending = index > currentStageIndex || (!hasBriefing && index > 0);

              return (
                <div key={movement.id} className="flex items-center gap-2 relative z-10">
                  <span className={\`font-roboto text-[12px] font-bold \${isCompleted || isCurrent ? 'text-[var(--color-atelier-terracota)]' : 'text-[var(--color-atelier-grafite)]/30'}\`}>
                    {isCompleted ? '✓' : isCurrent ? '→' : '○'}
                  </span>
                  <span className={\`font-roboto text-[11px] uppercase tracking-widest font-bold transition-colors duration-500 hidden md:block \${isCompleted || isCurrent ? 'text-[var(--color-atelier-grafite)]' : 'text-[var(--color-atelier-grafite)]/40'}\`}>
                    {movement.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL - VOCÊ ESTÁ AQUI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2">
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* AGORA E PRÓXIMO MARCO */}
            <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden bg-gradient-to-br from-white/90 to-white/40 border border-white shadow-sm">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10 flex flex-col gap-8">
                
                {/* Agora */}
                <div>
                  <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 block mb-3">Agora</span>
                  <h2 className="font-elegant text-3xl md:text-4xl leading-tight text-[var(--color-atelier-grafite)] mb-2">{currentMovement?.context || "Aguardando informações"}</h2>
                </div>

                <div className="h-px bg-gradient-to-r from-[var(--color-atelier-grafite)]/10 to-transparent w-full my-2"></div>

                {/* Próximo Marco */}
                <div>
                  <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 block mb-2">Próximo marco</span>
                  <p className="font-roboto text-xl text-[var(--color-atelier-grafite)] font-medium">
                    {currentStageIndex < IDV_MOVEMENTS.length - 1 ? IDV_MOVEMENTS[currentStageIndex + 1].name : "Entrega Final"}
                  </p>
                </div>

                {/* Ação Necessária */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-white shadow-sm flex items-start gap-4 mt-2">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0 mt-1">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="font-roboto font-bold text-sm text-[var(--color-atelier-grafite)] mb-1 uppercase tracking-wider">Ação Necessária</h4>
                    <p className="text-sm text-[var(--color-atelier-grafite)]/70 leading-relaxed">{currentMovement?.action || "Aguarde os próximos passos."}</p>
                  </div>
                </div>

              </div>
            </div>
            
            {/* COMPONENTES DINÂMICOS DE AÇÃO ABAIXO */}
`;

code = code.substring(0, sectionStart) + newMainContent + '\n' + code.substring(tasksEnd);
fs.writeFileSync('src/app/page.tsx', code);
