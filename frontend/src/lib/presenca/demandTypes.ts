// src/lib/presenca/demandTypes.ts
// Tipagem e categorização precisa das demandas do ecossistema de conteúdo Studio Veronna.
// Diferencia marcos de alinhamento, entregáveis documentais via PDF (estudo de marca, alinhamento visual, roteirização, calendário)
// e peças de publicação (feed, reels, carrossel, stories).

export type DemandCategory =
  | 'briefing'             // Reunião de Briefing / Alinhamento Inicial (Exclusivo Ciclo 1)
  | 'estudo_marca'         // Estudo de Marca, Persona e Tom de Voz (Exclusivo Ciclo 1 via PDF)
  | 'alinhamento_visual'   // Alinhamento Visual (Estilo do Feed via PDF)
  | 'calendario_editorial' // Calendário Editorial de Conteúdos (via PDF)
  | 'roteiro'              // Roteirização de Conteúdos / Vídeos (via PDF)
  | 'conteudo_reels'       // Reels / Vídeo
  | 'conteudo_carrossel'   // Carrossel
  | 'conteudo_story'       // Stories
  | 'conteudo_feed';       // Post Feed

export interface DemandMeta {
  category: DemandCategory;
  isFoundational: boolean;        // Se é etapa estratégica fundacional (pré-requisito dos posts)
  requiresClientApproval: boolean;// Se exige decisão explícita do cliente (aprovação ou revisão)
  isDocumentDeliverable: boolean; // Se é entregável documental via PDF avaliado pelo cliente
  cycleRestriction?: number;      // Ciclo exclusivo (ex: 1 para briefing e estudo_marca; indefinido para ciclos contínuos)
  typeLabel: string;              // "Reunião de Briefing", "Estudo de Marca", "Estilo do Feed", etc.
  dateLabel: string;              // "Data da Reunião", "Prazo de Aprovação", "Data de Publicação"
  stageSubtitle: string;          // Subtítulo do Studio Veronna
  actionText: string;             // Texto do botão de micro-interação
  iconType: 'briefing' | 'brand' | 'visual' | 'calendar' | 'script' | 'reels' | 'carousel' | 'story' | 'feed';
  badgeStyle: {
    bg: string;
    text: string;
    border: string;
  };
}

/**
 * Converte qualquer formato de data do banco para objeto Date local seguro ao meio-dia,
 * impedindo que desvios de fuso horário (ex: UTC vs UTC-3 Brasília) subtraiam um dia.
 */
export function parseSafeLocalDate(dateInput: string | Date | null | undefined): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;

  const dateStr = String(dateInput).trim();
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day, 12, 0, 0);
  }
  return new Date(dateStr);
}

/**
 * Verifica se uma categoria de demanda é permitida no ciclo especificado.
 * REUNIÃO DE BRIEFING E ESTUDO DE MARCA são estritamente restritos ao primeiro ciclo (ciclo 1).
 */
export function isDemandPermittedInCycle(category: DemandCategory, cycleNumber: number = 1): boolean {
  if (cycleNumber > 1) {
    if (category === 'briefing' || category === 'estudo_marca') {
      return false;
    }
  }
  return true;
}

/**
 * Filtro rigoroso de tarefas para a visão do Cliente no Cockpit.
 * O cliente deve ver tão somente:
 * 1. Produção de vídeo, design e produção (peças de conteúdo: posts, carrosséis, reels, vídeos, stories).
 * 2. E especificamente estes 3 entregáveis fundamentais:
 *    - Reunião de briefing (estritamente restrita ao Ciclo 1)
 *    - Calendário Editorial de Conteúdos
 *    - Alinhamento Visual (Estilo do Feed)
 * Demandas pontuais, tarefas internas da agência ou ruído operacional NUNCA vazam para o cliente.
 */
export function isClientVisibleTask(task: any, hasPost: boolean = false, cycleNumber: number = 1): boolean {
  if (!task) return false;
  if (task.status === 'archived') return false;
  if (task.is_adhoc === true) return false;

  const title = (task.title || '').toLowerCase().trim();
  const stage = (task.stage || '').toLowerCase().trim();
  const taskType = (task.task_type || '').toLowerCase().trim();

  // 1. Bloquear expressamente ruído operacional e tarefas internas da agência (demandas pontuais)
  const internalNoise = [
    'alinhamento & pulso',
    'alinhamento e pulso',
    'pulso mensal',
    'relatório mensal',
    'relatorio mensal',
    'relatório de desempenho',
    'relatorio de desempenho',
    'rodada de validação',
    'rodada de validacao',
    'setup',
    'onboarding',
    'mitigação',
    'mitigacao',
    'risco',
    'gestão contínua',
    'gestao continua',
    'interno',
    'gargalo',
    'admin',
    'test update',
    'assinatura do contrato',
    'tráfego',
    'trafego',
    'subir contrato',
    'checklist',
    'gate',
    'prospect',
    'financeiro'
  ];
  if (internalNoise.some(term => title.includes(term) || stage.includes(term) || taskType.includes(term))) {
    return false;
  }

  // 2. Os 3 entregáveis estratégicos fundamentais permitidos:
  // - Reunião de briefing (estritamente restrita ao Ciclo 1)
  if (/reuni[aã]o de briefing|briefing inicial|imers[aã]o/i.test(title) || (taskType === 'reuniao' && /briefing/i.test(title))) {
    return cycleNumber <= 1;
  }

  // - Calendário Editorial de Conteúdos
  if (
    /calend[aá]rio editorial|planejamento editorial|planejamento de conte[uú]dos|calend[aá]rio de conte[uú]dos/i.test(title) ||
    taskType === 'calendario_editorial'
  ) {
    return true;
  }

  // - Alinhamento Visual (Estilo do Feed)
  if (
    /alinhamento visual|estilo do feed|estilo de feed/i.test(title) ||
    taskType === 'alinhamento_visual'
  ) {
    return true;
  }

  // Estudo de marca também exclusivo do ciclo 1 se existir
  if (/estudo de marca|persona|tom de voz/i.test(title) || taskType === 'estudo_marca') {
    return cycleNumber <= 1;
  }

  // 3. Tarefas de Conteúdo e Produção:
  // Produção de vídeo, design e produção (posts, carrosséis, reels, stories)
  if (task.ig_is_piece === true) return true;
  if (hasPost) return true;

  if (
    taskType === 'video' ||
    taskType === 'design' ||
    taskType === 'post' ||
    taskType === 'carrossel' ||
    taskType === 'reels'
  ) {
    return true;
  }

  const piecePatterns = [
    /\bpost\b/i,
    /\breels\b/i,
    /\bcarrossel\b/i,
    /\bvideo\b/i,
    /\bv[ií]deo\b/i,
    /\bedi[cç][aã]o de v[ií]deo\b/i,
    /\bdesign\s*&\s*copy\b/i,
    /\bstor(y|ies)\b/i,
    /\bfeed\b/i,
    /\barte\b/i
  ];

  if (piecePatterns.some(regex => regex.test(title))) {
    return true;
  }

  // Qualquer outra tarefa (demanda pontual, etc.) é bloqueada
  return false;
}

/**
 * Categoriza uma demanda com base em metadados, título, tipo de tarefa e etapa.
 */
export function classifyDemand(task: any): DemandMeta {
  const title = (task?.title || '').toLowerCase().trim();
  const taskType = (task?.task_type || '').toLowerCase().trim();
  const stage = (task?.stage || '').toLowerCase().trim();

  // 1. Reunião de Briefing & Alinhamento (Exclusivo Ciclo 1)
  if (
    /reuni[aã]o de briefing|briefing inicial|imers[aã]o inicial/i.test(title) ||
    (taskType === 'reuniao' && /briefing/i.test(title)) ||
    (/briefing/i.test(stage) && !/alinhamento & pulso/i.test(title))
  ) {
    return {
      category: 'briefing',
      isFoundational: true,
      requiresClientApproval: false,
      isDocumentDeliverable: false,
      cycleRestriction: 1,
      typeLabel: 'Reunião de Briefing',
      dateLabel: 'Data da Reunião',
      stageSubtitle: 'Marco Estratégico Inicial • Studio Veronna',
      actionText: 'Ver Pauta da Reunião',
      iconType: 'briefing',
      badgeStyle: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
      },
    };
  }

  // 2. Estudo de Marca, Persona e Tom de Voz (Exclusivo Ciclo 1 via PDF)
  if (
    /estudo de marca|persona|tom de voz|brand strategy|posicionamento|diretriz de marca/i.test(title)
  ) {
    return {
      category: 'estudo_marca',
      isFoundational: true,
      requiresClientApproval: true,
      isDocumentDeliverable: true,
      cycleRestriction: 1,
      typeLabel: 'Estudo de Marca & Persona',
      dateLabel: 'Prazo de Aprovação',
      stageSubtitle: 'Diretriz Estratégica Fundacional • Studio Veronna',
      actionText: task?.status === 'completed' || task?.status === 'approved' ? 'Visualizar Estudo' : 'Avaliar & Aprovar PDF',
      iconType: 'brand',
      badgeStyle: {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
      },
    };
  }

  // 3. Alinhamento Visual (Estilo do Feed via PDF)
  if (
    /alinhamento visual|estilo do feed|estilo de feed|identidade visual|grade do feed|moodboard/i.test(title)
  ) {
    return {
      category: 'alinhamento_visual',
      isFoundational: true,
      requiresClientApproval: true,
      isDocumentDeliverable: true,
      typeLabel: 'Alinhamento Visual (Estilo do Feed)',
      dateLabel: 'Prazo de Aprovação',
      stageSubtitle: 'Diretriz Visual do Ciclo • Studio Veronna',
      actionText: task?.status === 'completed' || task?.status === 'approved' ? 'Visualizar Estilo' : 'Avaliar & Aprovar PDF',
      iconType: 'visual',
      badgeStyle: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-800',
        border: 'border-indigo-200',
      },
    };
  }

  // 4. Calendário Editorial de Conteúdos (via PDF)
  if (
    /calend[aá]rio editorial|planejamento editorial|planejamento de conte[uú]dos|calend[aá]rio de conte[uú]dos/i.test(title)
  ) {
    return {
      category: 'calendario_editorial',
      isFoundational: true,
      requiresClientApproval: true,
      isDocumentDeliverable: true,
      typeLabel: 'Calendário Editorial de Conteúdos',
      dateLabel: 'Prazo de Aprovação',
      stageSubtitle: 'Planejamento do Ciclo • Studio Veronna',
      actionText: task?.status === 'completed' || task?.status === 'approved' ? 'Visualizar Calendário' : 'Avaliar & Aprovar PDF',
      iconType: 'calendar',
      badgeStyle: {
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-200',
      },
    };
  }

  // 5. Roteirização de Conteúdos / Vídeos (via PDF)
  if (
    /roteiro|roteiriza[cç][aã]o|script|copywriting/i.test(title) ||
    taskType === 'copy' ||
    /copywriting/i.test(stage)
  ) {
    return {
      category: 'roteiro',
      isFoundational: true,
      requiresClientApproval: true,
      isDocumentDeliverable: true,
      typeLabel: 'Roteirização de Conteúdos',
      dateLabel: 'Prazo de Aprovação',
      stageSubtitle: 'Copywriting Estratégico • Studio Veronna',
      actionText: task?.status === 'completed' || task?.status === 'approved' ? 'Visualizar Roteiros' : 'Avaliar & Aprovar PDF',
      iconType: 'script',
      badgeStyle: {
        bg: 'bg-violet-50',
        text: 'text-violet-800',
        border: 'border-violet-200',
      },
    };
  }

  // 6. Peças Audiovisuais (Reels / Vídeos)
  if (taskType === 'video' || /reels|v[ií]deo|edi[cç][aã]o de v[ií]deo/i.test(title)) {
    return {
      category: 'conteudo_reels',
      isFoundational: false,
      requiresClientApproval: true,
      isDocumentDeliverable: false,
      typeLabel: 'Reels',
      dateLabel: 'Data de Publicação',
      stageSubtitle: 'Produção Audiovisual • Studio Veronna',
      actionText: task?.status === 'pending_client_approval' ? 'Avaliar & Aprovar' : 'Visualizar Peça',
      iconType: 'reels',
      badgeStyle: {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
      },
    };
  }

  // 7. Carrosséis
  if (/carrossel/i.test(title)) {
    return {
      category: 'conteudo_carrossel',
      isFoundational: false,
      requiresClientApproval: true,
      isDocumentDeliverable: false,
      typeLabel: 'Carrossel',
      dateLabel: 'Data de Publicação',
      stageSubtitle: 'Design Editorial • Studio Veronna',
      actionText: task?.status === 'pending_client_approval' ? 'Avaliar & Aprovar' : 'Visualizar Peça',
      iconType: 'carousel',
      badgeStyle: {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
      },
    };
  }

  // 8. Stories
  if (/stor(y|ies)/i.test(title)) {
    return {
      category: 'conteudo_story',
      isFoundational: false,
      requiresClientApproval: true,
      isDocumentDeliverable: false,
      typeLabel: 'Story',
      dateLabel: 'Data de Publicação',
      stageSubtitle: 'Conteúdo Efêmero • Studio Veronna',
      actionText: task?.status === 'pending_client_approval' ? 'Avaliar & Aprovar' : 'Visualizar Peça',
      iconType: 'story',
      badgeStyle: {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
      },
    };
  }

  // 9. Post Feed (padrão de peça gráfica)
  return {
    category: 'conteudo_feed',
    isFoundational: false,
    requiresClientApproval: true,
    isDocumentDeliverable: false,
    typeLabel: 'Post Feed',
    dateLabel: 'Data de Publicação',
    stageSubtitle: 'Design Gráfico • Studio Veronna',
    actionText: task?.status === 'pending_client_approval' ? 'Avaliar & Aprovar' : 'Visualizar Peça',
    iconType: 'feed',
    badgeStyle: {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
    },
  };
}

/**
 * Retorna a data autoritativa do cliente para uma tarefa.
 * Nunca expõe prazos internos da equipe.
 */
export function getClientTaskDate(task: any, post?: any): Date {
  const dateStr = task?.ig_scheduled_for || post?.scheduled_for || task?.deadline;
  return parseSafeLocalDate(dateStr);
}
