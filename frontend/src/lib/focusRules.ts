// src/lib/focusRules.ts
// Regras de triagem operacional para a Mesa de Trabalho / Focus (JTBD).
// O Focus é estritamente OPERACIONAL (produção de peças, design, vídeo, copy, revisões criativas).
// Demandas de governança, aprovação de conteúdos, agendamentos e relatórios de desempenho
// pertencem aos módulos estratégicos (Presença / Gerenciamento, Cockpit, Relatórios) e NÃO devem subir para o Focus.

export interface FocusTaskLike {
  id?: string;
  title?: string | null;
  stage?: string | null;
  task_type?: string | null;
  type?: string | null;
  status?: string | null;
  [key: string]: any;
}

/**
 * Normaliza string removendo acentos e convertendo para minúsculas.
 */
function normalize(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Avalia se uma tarefa deve ser EXCLUÍDA do Focus.
 * Exclui:
 * 1. Relatórios de Desempenho (e relatórios mensais/gerenciais)
 * 2. Aprovação de Conteúdos (governança, validação interna ou do cliente)
 * 3. Agendamentos (publicação e agendamento de posts)
 */
export function isExcludedFromFocus(task: FocusTaskLike): boolean {
  if (!task) return false;

  const title = normalize(task.title);
  const stage = normalize(task.stage);
  const taskType = normalize(task.task_type || task.type);

  // -------------------------------------------------------------
  // 1. RELATÓRIO DE DESEMPENHO & RELATÓRIOS ANALÍTICOS
  // -------------------------------------------------------------
  const isReportStageOrType =
    stage === 'relatorio' ||
    stage.includes('relatorio') ||
    taskType === 'relatorio' ||
    taskType === 'report';

  const isReportTitle =
    title.startsWith('relatorio') ||
    title.includes('relatorio de desempenho') ||
    title.includes('relatorio & inteligencia') ||
    title.includes('relatorio e inteligencia') ||
    title.includes('relatorio mensal') ||
    title.includes('geracao de relatorio');

  if (isReportStageOrType || isReportTitle) {
    // Exceção de segurança: Se for comprovadamente uma peça criativa (design/vídeo)
    // cujo título apenas cita a palavra "relatório" como assunto (ex: "Post: 5 erros no seu relatório"),
    // mantém como operacional.
    const isCreativePiece =
      (taskType === 'design' || taskType === 'video' || taskType === 'carrossel' || taskType === 'post') &&
      stage !== 'relatorio' &&
      !title.startsWith('relatorio') &&
      !title.includes('relatorio de desempenho') &&
      !title.includes('relatorio & inteligencia');

    if (!isCreativePiece) {
      return true;
    }
  }

  // -------------------------------------------------------------
  // 2. APROVAÇÃO DE CONTEÚDOS & GOVERNANÇA DE CLIENTE
  // -------------------------------------------------------------
  const isApprovalStageOrType =
    stage === 'aprovacao' ||
    stage.includes('aprovacao') ||
    taskType === 'aprovacao' ||
    taskType === 'approval';

  const isApprovalTitle =
    title.startsWith('aprovacao') ||
    title.includes('aprovacao de conteudo') ||
    title.includes('aprovacao de conteudos') ||
    title.includes('aprovacao do cliente') ||
    title.includes('enviar planejamento para aprovacao');

  if (isApprovalStageOrType || isApprovalTitle) {
    // Exceção: Se for peça de design cujo título contém a palavra sem ser etapa de governança
    const isCreativePiece =
      (taskType === 'design' || taskType === 'video' || taskType === 'carrossel' || taskType === 'post') &&
      stage !== 'aprovacao' &&
      !title.startsWith('aprovacao') &&
      !title.includes('aprovacao de conteudo') &&
      !title.includes('aprovacao do cliente');

    if (!isCreativePiece) {
      return true;
    }
  }

  // -------------------------------------------------------------
  // 3. AGENDAMENTOS (Agendamento sistêmico, postagem em redes)
  // -------------------------------------------------------------
  const isSchedulingStageOrType =
    stage === 'agendamento' ||
    stage.includes('agendamento') ||
    taskType === 'agendamento' ||
    taskType === 'scheduling';

  const isSchedulingTitle =
    title.startsWith('agendamento') ||
    title.includes('agendamento sistemico') ||
    title.includes('& agendamento') ||
    title.includes('e agendamento') ||
    title.startsWith('agendar');

  if (isSchedulingStageOrType || isSchedulingTitle) {
    return true;
  }

  return false;
}

/**
 * Retorna true se a tarefa for operacional e elegível para a Mesa de Trabalho (Focus).
 */
export function isFocusOperationalTask(task: FocusTaskLike): boolean {
  return !isExcludedFromFocus(task);
}

/**
 * Fragmento SQL compatível com Postgres/Neon para filtrar diretamente no banco de dados.
 */
export const FOCUS_OPERATIONAL_SQL_FILTER = `
  AND NOT (
    t.stage ILIKE '%relat%'
    OR t.stage ILIKE '%aprov%'
    OR t.stage ILIKE '%agend%'
    OR t.task_type ILIKE '%agend%'
    OR t.task_type IN ('relatorio', 'report', 'aprovacao', 'approval')
    OR t.title ILIKE 'Relatório de Desempenho%'
    OR t.title ILIKE 'Relatorio de Desempenho%'
    OR t.title ILIKE '%Relatório & Inteligência%'
    OR t.title ILIKE '%Relatorio & Inteligencia%'
    OR t.title ILIKE 'Geração de Relatório%'
    OR t.title ILIKE 'Geracao de Relatorio%'
    OR t.title ILIKE 'Relatório Mensal%'
    OR t.title ILIKE 'Relatorio Mensal%'
    OR t.title ILIKE 'Aprovação de Conteúdo%'
    OR t.title ILIKE 'Aprovacao de Conteudo%'
    OR t.title ILIKE 'Aprovação do Cliente%'
    OR t.title ILIKE 'Aprovacao do Cliente%'
    OR t.title ILIKE '%& Agendamento%'
    OR t.title ILIKE 'Agendamento Sistêmico%'
    OR t.title ILIKE 'Agendamento Sistemico%'
    OR t.title ILIKE 'Enviar Planejamento para Aprovação%'
  )
`;
