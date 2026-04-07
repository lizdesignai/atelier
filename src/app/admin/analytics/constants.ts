// src/app/admin/analytics/constants.ts

export const TASK_TYPES_IDV = [
  { id: 'setup', label: 'Administrativo & Contratos' },
  { id: 'reuniao', label: 'Reuniões & Apresentações' },
  { id: 'copy', label: 'Pesquisa & Estratégia' },
  { id: 'design', label: 'Design & Direção Visual' },
  { id: 'community', label: 'Diário de Bordo & Comunidade' },
  { id: 'presentation', label: 'Mockups e Apresentação' } 
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
  { id: 'captacao', label: 'Captação (Logística)' }
];

export const IDV_PIPELINE = [
  { stage: "Kickoff", type: "setup", title: "Formulário de cadastro & Contrato", daysOffset: 0, estTime: 30 },
  { stage: "Kickoff", type: "setup", title: "Pagamento", daysOffset: 1, estTime: 15 },
  { stage: "Kickoff", type: "setup", title: "Coletar Brandbook/Briefing", daysOffset: 1, estTime: 20 },
  { stage: "Kickoff", type: "reuniao", title: "Reunião de briefing", daysOffset: 2, estTime: 60 },
  { stage: "Kickoff", type: "community", title: "Postar Kickoff no Diário de Bordo", daysOffset: 2, estTime: 15 },
  { stage: "Imersão", type: "copy", title: "Moodboard & Semiótica Visual", daysOffset: 5, estTime: 180 },
  { stage: "Design", type: "design", title: "Laboratório de Logotipo", daysOffset: 9, estTime: 240 },
  { stage: "Design", type: "design", title: "Tipografia e Cores", daysOffset: 12, estTime: 180 },
  { stage: "Apresentação", type: "design", title: "Montagem do Brandbook", daysOffset: 16, estTime: 180 },
  { stage: "Apresentação", type: "community", title: "Postar Prévia no Diário de Bordo", daysOffset: 16, estTime: 15 },
  { stage: "Handover", type: "setup", title: "Envio do Drive e Conclusão", daysOffset: 18, estTime: 30 }
];

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