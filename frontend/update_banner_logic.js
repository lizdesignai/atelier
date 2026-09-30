const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// Ensure we have a progress variable
const progressLogic = `
  const currentStageIndex = activeProject ? IDV_MOVEMENTS.findIndex(s => s.dbValue === activeProject.idv_phase) : 0;
  const currentMovement = IDV_MOVEMENTS[currentStageIndex !== -1 ? currentStageIndex : 0];

  // Cálculo de progresso de tempo para o banner dinâmico
  const now = new Date();
  const start = activeProject?.created_at ? new Date(activeProject.created_at) : now;
  const end = activeProject?.data_limite ? new Date(activeProject.data_limite) : now;
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  let timeProgress = totalDuration > 0 ? Math.min(Math.max(elapsed / totalDuration, 0.1), 1) : 0.1; // mínimo de 10%
  if (currentStageIndex === IDV_MOVEMENTS.length - 1) timeProgress = 1; // Se chegou no fim, 100%
`;

// Replace existing variables declaration
code = code.replace(
  /const currentStageIndex = activeProject \? IDV_MOVEMENTS\.findIndex\(s => s\.dbValue === activeProject\.idv_phase\) : 0;\s*const currentMovement = IDV_MOVEMENTS\[currentStageIndex !== -1 \? currentStageIndex : 0\];/,
  progressLogic
);

// Update banner styling to use \`timeProgress\`
code = code.replace(
  /className="absolute inset-0 bg-gradient-to-r from-\[#F0EBE1\] via-\[var\(--color-atelier-terracota\)\]\/10 to-\[#F0EBE1\] bg-\[length:200%_200%\] animate-\[gradient_8s_ease_infinite\] opacity-80 mix-blend-multiply"/g,
  `className="absolute inset-0 bg-gradient-to-r from-[#F0EBE1] via-[var(--color-atelier-terracota)] to-[#F0EBE1] bg-[length:200%_200%] animate-[gradient_8s_ease_infinite] mix-blend-multiply transition-opacity duration-1000" style={{ opacity: 0.1 + (timeProgress * 0.9) }}`
);

// Update contrast blurs
code = code.replace(
  /className="absolute -bottom-20 -right-20 w-64 h-64 bg-\[var\(--color-atelier-terracota\)\]\/20 rounded-full blur-\[80px\] animate-\[pulse_6s_ease-in-out_infinite\]"/g,
  `className="absolute -bottom-20 -right-20 w-64 h-64 bg-[var(--color-atelier-terracota)] rounded-full blur-[80px] animate-[pulse_6s_ease-in-out_infinite]" style={{ opacity: timeProgress }}`
);

code = code.replace(
  /className="absolute -top-20 -left-20 w-64 h-64 bg-\[#C1A89D\]\/20 rounded-full blur-\[80px\] animate-\[pulse_8s_ease-in-out_infinite_1s\]"/g,
  `className="absolute -top-20 -left-20 w-64 h-64 bg-[#C1A89D] rounded-full blur-[80px] animate-[pulse_8s_ease-in-out_infinite_1s]" style={{ opacity: timeProgress * 0.8 }}`
);

fs.writeFileSync('src/app/page.tsx', code);
