// src/app/admin/analytics/constants.ts

export const TASK_TYPES_IDV = [
  { id: 'setup', label: 'Administrativo & Contratos' },
  { id: 'reuniao', label: 'Reuniões & Apresentações' },
  { id: 'copy', label: 'Pesquisa & Estratégia' },
  { id: 'design', label: 'Design & Direção Visual' },
  { id: 'community', label: 'Diário de Bordo & Comunidade' },
  { id: 'presentation', label: 'Mockups e Apresentação' },
  { id: 'gate', label: 'Stage-Gate / Aprovação' }
];

export const TASK_TYPES_IG = [
  { id: 'setup', label: 'Gestão & Relatórios' },
  { id: 'reuniao', label: 'Reuniões' },
  { id: 'copy', label: 'Copywriting' },
  { id: 'planning', label: 'Planejamento & Aprovação' },
  { id: 'design', label: 'Design Gráfico' },
  { id: 'video', label: 'Edição de Vídeo' },
  { id: 'community', label: 'Moderação da Comunidade' }
];

export const ALL_SKILLS = [
  { id: 'setup', label: 'Gestão & Contratos' },
  { id: 'reuniao', label: 'Reuniões & Calls' },
  { id: 'copy', label: 'Copy & Estratégia' },
  { id: 'planning', label: 'Planejamento' },
  { id: 'design', label: 'Design Gráfico' },
  { id: 'video', label: 'Edição de Vídeo' },
  { id: 'community', label: 'Comunidade & Diário' },
  { id: 'search', label: 'Pesquisa' },
  { id: 'presentation', label: 'Mockups e Apresentação' },
  { id: 'captacao', label: 'Captação (Logística)' },
  { id: 'gate', label: 'Stage-Gate / Aprovação' }
];

export const IDV_FLOW_PIPELINE: Record<string, any[]> = {
  'IDV-CORE': [
    // FASE 1 - DISCOVER (D1-D2)
    { phase: 'discover', type: 'reuniao', title: 'Reunião de Briefing', day: 1, estTime: 60, isGate: false },
    { phase: 'discover', type: 'copy', title: 'Análise de Briefing e Mercado', day: 1, estTime: 120, isGate: false },
    { phase: 'discover', type: 'copy', title: 'Estratégia de Marca', day: 2, estTime: 90, isGate: false },
    
    // FASE 2 - DEFINE (D3-D4)
    { phase: 'define', type: 'design', title: 'Curadoria Visual', day: 3, estTime: 120, isGate: false },
    { phase: 'define', type: 'design', title: 'Direção Criativa', day: 4, estTime: 180, isGate: false },
    
    // FASE 3 - DEVELOP (D5-D8)
    { phase: 'develop', type: 'design', title: 'Exploração Visual', day: 5, estTime: 240, isGate: false },
    { phase: 'develop', type: 'design', title: 'Tipografia e Paleta', day: 6, estTime: 240, isGate: false },
    { phase: 'develop', type: 'design', title: 'Mockups e Aplicações', day: 8, estTime: 240, isGate: false },
    
    // FASE 4 - PRESENT (D9-D10)
    { phase: 'present', type: 'presentation', title: 'Montagem da Apresentação', day: 9, estTime: 180, isGate: false },
    { phase: 'present', type: 'presentation', title: 'Apresentação ao Cliente', day: 10, estTime: 60, isGate: false },
    
    // FASE 5 - REFINE (D11-D12)
    { phase: 'refine', type: 'design', title: 'Ajustes de Projeto', day: 11, estTime: 180, isGate: false },
    
    // FASE 6 - DELIVER (D13)
    { phase: 'deliver', type: 'setup', title: 'Brand Book', day: 13, estTime: 90, isGate: false },
    { phase: 'deliver', type: 'setup', title: 'Exportação de Arquivos Finais e Handover', day: 13, estTime: 60, isGate: false },
  ],
  'IDV-ESS': [
    { phase: 'discover', type: 'reuniao', title: 'Reunião de Briefing Express', day: 1, estTime: 45, isGate: false },
    { phase: 'define', type: 'design', title: 'Direção Criativa e Moodboard', day: 2, estTime: 120, isGate: false },
    { phase: 'develop', type: 'design', title: 'Desenvolvimento do Sistema Visual', day: 4, estTime: 240, isGate: false },
    { phase: 'develop', type: 'design', title: 'Mockups e Aplicações', day: 5, estTime: 120, isGate: false },
    { phase: 'present', type: 'presentation', title: 'Apresentação Essencial', day: 7, estTime: 60, isGate: false },
    { phase: 'deliver', type: 'setup', title: 'Entrega de Arquivos Finais e Handover', day: 8, estTime: 60, isGate: false },
  ],
  'IDV-SYSTEM': [],
  'REBRAND': []
};

export const IG_SETUP = [
  { stage: "Setup", type: "setup", title: "Assinatura & Onboarding", daysOffset: 0, estTime: 30 },
  { stage: "Setup", type: "setup", title: "Coletar Briefing Base", daysOffset: 1, estTime: 20 },
  { stage: "Setup", type: "community", title: "Apresentar Cliente no Diário de Bordo", daysOffset: 1, estTime: 15 },
  { stage: "Estratégia", type: "copy", title: "Criação de Estratégia e Copy (Mês)", daysOffset: 5, estTime: 180 },
  { stage: "Estratégia", type: "planning", title: "Enviar Planejamento para Aprovação", daysOffset: 6, estTime: 30 },
];

export const generateUnitaryIG = (packageName: string) => {
  const units: any[] = [];
  const counts: Record<string, {type: string, qty: number}> = {
    "Pacote 1": { type: "video", qty: 6 },
    "Pacote 2": { type: "design", qty: 4 },
    "Pacote 3": { type: "design", qty: 8 },
    "Pacote 4": { type: "design", qty: 12 }
  };

  const config = counts[packageName] || { type: "design", qty: 1 };
  
  for (let i = 1; i <= config.qty; i++) {
    units.push({
      stage: "Produção Ativa",
      type: config.type,
      title: `${config.type === 'video' ? 'Reels/Vídeo' : 'Post/Card'} Unitário #${i} - ${packageName}`,
      daysOffset: Math.floor(10 + (i * (18 / config.qty))),
      estTime: 60
    });
  }

  if (packageName === "Pacote 4") {
    units.push({ stage: "Produção Diária", type: "copy", title: "Roteirização Diária de Stories", daysOffset: 18, estTime: 300 });
    units.push({ stage: "Gestão Contínua", type: "community", title: "Moderação da Comunidade VIP", daysOffset: 20, estTime: 120 });
  }
  
  return units;
};