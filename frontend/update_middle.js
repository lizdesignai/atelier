const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

const s = code.indexOf('{/* VOCÊ ESTÁ AQUI */}');
const e = code.indexOf('          <div className="lg:col-span-4 flex flex-col gap-6">');

const newSection = `
        {/* CONTEÚDO PRINCIPAL - VOCÊ ESTÁ AQUI E ATIVIDADES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* AGORA E PRÓXIMO MARCO */}
            <div className="glass-panel p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden bg-gradient-to-br from-white/90 to-white/40 border border-white shadow-sm">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-[var(--color-atelier-terracota)]/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10 flex flex-col gap-8">
                
                {/* Agora */}
                <div>
                  <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 block mb-2">Agora</span>
                  <h2 className="font-elegant text-3xl text-[var(--color-atelier-grafite)] mb-4">{currentMovement.context}</h2>
                </div>

                <div className="h-px bg-gradient-to-r from-[var(--color-atelier-grafite)]/10 to-transparent w-full"></div>

                {/* Próximo Marco */}
                <div>
                  <span className="font-roboto text-[10px] uppercase tracking-widest font-bold text-[var(--color-atelier-grafite)]/50 block mb-2">Próximo marco</span>
                  <p className="font-roboto text-lg text-[var(--color-atelier-grafite)]">
                    {currentStageIndex < IDV_MOVEMENTS.length - 1 ? IDV_MOVEMENTS[currentStageIndex + 1].name : "Entrega Final"}
                  </p>
                </div>

                {/* Ação Necessária */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-white shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-atelier-terracota)]/10 flex items-center justify-center text-[var(--color-atelier-terracota)] shrink-0 mt-1">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="font-roboto font-bold text-sm text-[var(--color-atelier-grafite)] mb-1 uppercase tracking-wider">Ação Necessária</h4>
                    <p className="text-sm text-[var(--color-atelier-grafite)]/70">{currentMovement.action}</p>
                  </div>
                </div>

              </div>
            </div>

            {/* AREA DINÂMICA DE AÇÃO (BRAND SNAPSHOT, ETC) */}
`;

code = code.substring(0, s) + newSection + code.substring(e);
fs.writeFileSync('src/app/page.tsx', code);
