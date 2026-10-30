import { Resend } from 'resend';
import { getDb } from './db';
import {
  STUDIO_VERONNA_FROM,
  formatAbsoluteUrl,
  isValidRealEmail,
} from './resend';

let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[ServerNotifications] RESEND_API_KEY não configurada no ambiente.');
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export interface StudioEmailTemplateData {
  clientName?: string;
  collaboratorName?: string;
  projectName?: string;
  taskName?: string;
  link?: string;
  extraInfo?: string;
  deadline?: string;
  daysLeft?: number;
  subject?: string;
  body?: string;
  badgeText?: string;
  buttonText?: string;
}

function stripLeadingEmoji(text: string): { emoji: string | null; cleanText: string } {
  if (!text) return { emoji: null, cleanText: '' };
  const match = text.trim().match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*(.*)$/u);
  if (match) {
    return { emoji: match[1], cleanText: match[2] || text };
  }
  return { emoji: null, cleanText: text };
}

export function getStudioEmailTemplate(
  type: string,
  data: StudioEmailTemplateData = {}
): { subject: string; html: string } {
  const {
    clientName,
    collaboratorName,
    projectName,
    taskName,
    link,
    extraInfo,
    deadline,
    daysLeft,
    subject: customSubject,
    body: customBody,
    badgeText: customBadge,
    buttonText: customButtonText,
  } = data;

  const absoluteLink = formatAbsoluteUrl(link);
  const formattedDeadline = deadline
    ? (() => {
        try {
          return new Date(deadline).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
        } catch {
          return deadline;
        }
      })()
    : 'A definir';

  let subject = customSubject || 'Notificação — Studio Veronna';
  let title = customSubject || 'Atualização no Atelier';
  let message = customBody || 'Existem novas atualizações na sua mesa de trabalho.';
  let buttonText = customButtonText || 'Acessar o Atelier';
  let icon = '🔔';
  let badge = customBadge || 'ATELIER';

  switch (type) {
    // -------------------------------------------------------------
    // 0. SINTONIA & COMUNICAÇÃO CORPORATIVA
    // -------------------------------------------------------------
    case 'sintonia_mention':
      badge = 'SINTONIA';
      subject = `[Sintonia] ${clientName || 'Alguém'} mencionou você`;
      icon = '💬';
      title = 'Você foi Mencionado';
      message =
        customBody ||
        `<strong>${clientName || 'Um membro da equipe'}</strong> mencionou você na Sintonia:<br/><br/><div style="background-color:#faf9f6; border-left:3px solid #a45037; padding:12px 16px; border-radius:8px; font-style:italic; color:#3f3f46;">"${extraInfo || 'Confira a mensagem no painel'}"</div>`;
      buttonText = 'Abrir Sintonia';
      break;

    case 'sintonia_dm':
      badge = 'SINTONIA';
      subject = `[Sintonia] Mensagem Direta de ${clientName || 'Colega'}`;
      icon = '✉️';
      title = 'Nova Mensagem Direta';
      message =
        customBody ||
        `Você recebeu uma mensagem privada de <strong>${clientName || 'um colega'}</strong>:<br/><br/><div style="background-color:#faf9f6; border-left:3px solid #a45037; padding:12px 16px; border-radius:8px; font-style:italic; color:#3f3f46;">"${extraInfo || 'Acesse para responder'}"</div>`;
      buttonText = 'Responder na Sintonia';
      break;

    case 'sintonia_channel':
      badge = 'SINTONIA';
      subject = `[Sintonia] Comunicado em #${projectName || 'operacao-atelier'}`;
      icon = '📢';
      title = `Canal #${projectName || 'operacao-atelier'}`;
      message = customBody || 'Existe uma nova comunicação importante no canal da equipe.';
      buttonText = 'Acessar Canal';
      break;

    case 'chat_activity':
      badge = 'SINTONIA';
      subject = `[Sintonia] Nova mensagem de ${clientName || 'Colaborador'}`;
      icon = '💬';
      title = 'Comunicação na Sintonia';
      message =
        customBody ||
        'Há uma nova mensagem na Sintonia aguardando seu acompanhamento.';
      buttonText = 'Abrir Sintonia';
      break;

    // -------------------------------------------------------------
    // 1. OPERAÇÃO, TAREFAS & TESSERA (COLABORADORES & LIDERANÇA)
    // -------------------------------------------------------------
    case 'task_assigned':
      badge = 'OPERAÇÃO & TAREFAS';
      subject = customSubject || `[Nova Demanda] ${taskName || 'Tarefa Atribuída'} — ${projectName || 'Studio Veronna'}`;
      icon = '🎯';
      title = 'Nova Demanda na sua Mesa';
      message =
        customBody ||
        `Olá${collaboratorName ? `, <strong>${collaboratorName}</strong>` : ''}!<br/><br/>Uma nova demanda foi atribuída a você no projeto <strong>${projectName || 'Interno'}</strong>.<br/><br/>` +
          `<div style="background-color:#faf9f6; border:1px solid #ebe8e2; padding:14px 16px; border-radius:12px; text-align:left;">` +
          `<strong>📌 Tarefa:</strong> ${taskName || 'Nova Demanda'}<br/>` +
          (deadline ? `<strong>📅 Prazo Meta:</strong> ${formattedDeadline}<br/>` : '') +
          (extraInfo ? `<strong>📝 Contexto:</strong> ${extraInfo}` : '') +
          `</div>`;
      buttonText = 'Iniciar Execução';
      break;

    case 'demand_sent':
    case 'new_demand':
      badge = 'GESTÃO DE OPERAÇÕES';
      subject = customSubject || `[Operação] Demanda Despachada: ${taskName || projectName || 'Nova Tarefa'}`;
      icon = '📋';
      title = 'Demanda Registrada na Operação';
      message =
        customBody ||
        `A demanda <strong>${taskName || 'Nova Tarefa'}</strong> (Projeto: <strong>${projectName || 'Studio Veronna'}</strong>) foi atribuída para <strong>${collaboratorName || clientName || 'a equipe'}</strong>.` +
          (deadline ? `<br/><br/><strong>📅 Prazo:</strong> ${formattedDeadline}` : '') +
          (extraInfo ? `<br/><strong>Detalhe:</strong> ${extraInfo}` : '');
      buttonText = 'Acompanhar Operação';
      break;

    case 'task_in_progress':
      badge = 'OPERAÇÃO EM CURSO';
      subject = customSubject || `[Em Execução] ${taskName || 'Tarefa Iniciada'} (${projectName || 'Atelier'})`;
      icon = '▶️';
      title = 'Execução Iniciada';
      message =
        customBody ||
        `<strong>${collaboratorName || clientName || 'O colaborador'}</strong> iniciou o trabalho na entrega <strong>${taskName || 'Tarefa'}</strong> do projeto <strong>${projectName || 'Studio Veronna'}</strong>.`;
      buttonText = 'Ver Andamento';
      break;

    case 'task_paused':
      badge = 'OPERAÇÃO & TAREFAS';
      subject = customSubject || `[Pausada] ${taskName || 'Tarefa'} (${projectName || 'Atelier'})`;
      icon = '⏸️';
      title = 'Execução Pausada';
      message =
        customBody ||
        `A tarefa <strong>${taskName || 'Tarefa'}</strong> (${projectName || 'Studio Veronna'}) foi pausada por <strong>${collaboratorName || clientName || 'colaborador'}</strong>.` +
          (extraInfo ? `<br/><br/><strong>Observação:</strong> ${extraInfo}` : '');
      buttonText = 'Ver Detalhes';
      break;

    case 'internal_review':
      badge = 'CURADORIA & QA';
      subject = customSubject || `[QA Interno] Revisão Pendente: ${taskName || 'Entrega'}`;
      icon = '👁️';
      title = 'Entrega Aguardando Aprovação';
      message =
        customBody ||
        `<strong>${collaboratorName || clientName || 'Um membro da equipe'}</strong> finalizou a execução de <strong>${taskName || 'uma entrega'}</strong> no projeto <strong>${projectName || 'Studio Veronna'}</strong> e enviou para curadoria da liderança.` +
          (extraInfo ? `<br/><br/><div style="background-color:#faf9f6; border-left:3px solid #a45037; padding:10px 14px; border-radius:8px; text-align:left;">${extraInfo}</div>` : '');
      buttonText = 'Avaliar Entrega';
      break;

    case 'review_approved':
      badge = 'CURADORIA & QA';
      subject = customSubject || `[Aprovada] Entrega Validada: ${taskName || 'Tarefa'}`;
      icon = '✅';
      title = 'Entrega Aprovada pela Liderança';
      message =
        customBody ||
        `Excelente trabalho! A sua entrega <strong>${taskName || 'Tarefa'}</strong> do projeto <strong>${projectName || 'Studio Veronna'}</strong> foi aprovada na curadoria interna.` +
          (extraInfo ? `<br/><br/><strong>Comentário:</strong> ${extraInfo}` : '');
      buttonText = 'Ver no Painel';
      break;

    case 'review_changes_requested':
      badge = 'CURADORIA & QA';
      subject = customSubject || `[Ajustes Solicitados] ${taskName || 'Tarefa'} — ${projectName || 'Atelier'}`;
      icon = '🛠️';
      title = 'Ajustes Solicitados na Revisão';
      message =
        customBody ||
        `A liderança revisou a entrega <strong>${taskName || 'Tarefa'}</strong> (${projectName || 'Studio Veronna'}) e solicitou ajustes antes da liberação final.` +
          (extraInfo
            ? `<br/><br/><div style="background-color:#fff7ed; border-left:3px solid #ea580c; padding:12px 16px; border-radius:8px; text-align:left; color:#7c2d12;"><strong>Direcionamento:</strong><br/>${extraInfo}</div>`
            : '');
      buttonText = 'Ver Ajustes Solicitados';
      break;

    case 'task_completed':
      badge = 'OPERAÇÃO & TAREFAS';
      subject = customSubject || `[Concluída] ${taskName || 'Entrega Finalizada'} — ${projectName || 'Studio Veronna'}`;
      icon = '🏆';
      title = 'Entrega Concluída com Sucesso';
      message =
        customBody ||
        `A tarefa <strong>${taskName || 'Entrega'}</strong> do projeto <strong>${projectName || 'Studio Veronna'}</strong> foi oficialmente concluída e validada.`;
      buttonText = 'Ver Histórico';
      break;

    case 'task_blocked':
      badge = 'ALERTA DE OPERAÇÃO';
      subject = customSubject || `[IMPEDIMENTO] Bloqueio em: ${taskName || 'Tarefa'}`;
      icon = '🚧';
      title = 'Impedimento Reportado';
      message =
        customBody ||
        `A demanda <strong>${taskName || 'Tarefa'}</strong> (${projectName || 'Studio Veronna'}) foi sinalizada com bloqueio operacional.` +
          (extraInfo
            ? `<br/><br/><div style="background-color:#fef2f2; border-left:3px solid #dc2626; padding:12px 16px; border-radius:8px; text-align:left; color:#7f1d1d;"><strong>Motivo do Bloqueio:</strong><br/>${extraInfo}</div>`
            : '');
      buttonText = 'Destravar Demanda';
      break;

    case 'task_forced_today':
      badge = 'PRIORIDADE IMEDIATA';
      subject = customSubject || `[PRIORIDADE HOJE] ${taskName || 'Demanda Urgente'}`;
      icon = '⚡';
      title = 'Prioridade Alocada para Hoje';
      message =
        customBody ||
        `A liderança priorizou a entrega <strong>${taskName || 'Tarefa'}</strong> (${projectName || 'Studio Veronna'}) para foco imediato na sua sessão de hoje.` +
          (extraInfo
            ? `<br/><br/><div style="background-color:#faf9f6; border-left:3px solid #a45037; padding:12px 16px; border-radius:8px; text-align:left;"><strong>Justificativa da Gestão:</strong><br/>${extraInfo}</div>`
            : '');
      buttonText = 'Abrir Meu Foco';
      break;

    case 'task_feedback':
      badge = 'OPERAÇÃO & TAREFAS';
      subject = customSubject || `[Novo Feedback] ${taskName || 'Tarefa'}`;
      icon = '💬';
      title = 'Novo Feedback na Demanda';
      message =
        customBody ||
        `Um novo comentário ou direcionamento foi registrado na tarefa <strong>${taskName || 'Tarefa'}</strong> do projeto <strong>${projectName || 'Studio Veronna'}</strong>.` +
          (extraInfo
            ? `<br/><br/><div style="background-color:#faf9f6; border-left:3px solid #a45037; padding:12px 16px; border-radius:8px; text-align:left;">${extraInfo}</div>`
            : '');
      buttonText = 'Ver Comentário';
      break;

    case 'task_overdue':
      badge = 'ALERTA DE PRAZO';
      subject = customSubject || `[ATRASADA] Tarefa: ${taskName || 'Entrega Pendente'}`;
      icon = '⏰';
      title = 'Atenção Crítica ao Prazo';
      message =
        customBody ||
        `A tarefa <strong>${taskName || 'Entrega'}</strong> do projeto <strong>${projectName || 'Studio Veronna'}</strong> está com o prazo expirado ou requer atualização imediata de status.`;
      buttonText = 'Regularizar Tarefa';
      break;

    case 'deadline_24h':
      badge = 'LEMBRETE DE PRAZO';
      subject = customSubject || `[Prazo 24h] Entrega prevista para amanhã: ${taskName}`;
      icon = '⏳';
      title = 'Prazo em 24 Horas';
      message =
        customBody ||
        `Olá${collaboratorName ? `, <strong>${collaboratorName}</strong>` : ''}! A entrega da tarefa <strong>${taskName}</strong> (${projectName || 'Studio Veronna'}) vence em menos de 24 horas (${formattedDeadline}). Organize seu foco para uma entrega impecável.`;
      buttonText = 'Ver Demanda';
      break;

    case 'deadline_12h':
      badge = 'PRAZO CRÍTICO';
      subject = customSubject || `[URGENTE 12h] Prazo final hoje: ${taskName}`;
      icon = '🚨';
      title = 'Alerta Crítico: Menos de 12h';
      message =
        customBody ||
        `Atenção! O prazo para conclusão da demanda <strong>${taskName}</strong> (${projectName || 'Studio Veronna'}) encerra em menos de 12 horas (${formattedDeadline}). Caso haja qualquer impedimento, acione a liderança imediatamente.`;
      buttonText = 'Concluir Entrega';
      break;

    case 'captacao_reminder':
      badge = 'AGENDA EXTERNA';
      subject = customSubject || `[Captação] Lembrete de Gravação: ${taskName || projectName}`;
      icon = '🎥';
      title = 'Captação Audiovisual Agendada';
      message =
        customBody ||
        `Lembrete operacional de captação para o projeto <strong>${projectName || 'Cliente'}</strong>: <strong>${taskName || 'Sessão de Captação'}</strong>.` +
          (deadline ? `<br/><br/><strong>📅 Data:</strong> ${formattedDeadline}` : '') +
          (extraInfo ? `<br/><strong>📍 Detalhes e Local:</strong><br/>${extraInfo}` : '');
      buttonText = 'Ver Roteiro e Detalhes';
      break;

    case 'reuniao_reminder':
      badge = 'AGENDA EXECUTIVA';
      subject = customSubject || `[Reunião] Compromisso Agendado: ${taskName || projectName}`;
      icon = '📅';
      title = 'Lembrete de Reunião';
      message =
        customBody ||
        `Você possui uma reunião agendada referente a <strong>${taskName || projectName || 'Alinhamento'}</strong>.` +
          (deadline ? `<br/><br/><strong>📅 Data:</strong> ${formattedDeadline}` : '') +
          (extraInfo ? `<br/><strong>📝 Pauta / Link:</strong><br/>${extraInfo}` : '');
      buttonText = 'Acessar Agenda';
      break;

    case 'contract_ending':
      badge = 'GESTÃO DE CONTRATOS';
      subject = customSubject || `[Contrato] Renovação Próxima: ${clientName || projectName}`;
      icon = '📑';
      title = 'Aviso de Vencimento Contratual';
      message =
        customBody ||
        `O ciclo contratual do cliente <strong>${clientName || projectName}</strong> encerra em <strong>${daysLeft ?? 15} dias</strong> (${formattedDeadline}). Inicie as tratativas comerciais de renovação.`;
      buttonText = 'Abrir Gestão de Clientes';
      break;

    case 'financial_alert':
      badge = 'FINANCEIRO';
      subject = customSubject || `[Financeiro] Alerta Operacional — Studio Veronna`;
      icon = '💰';
      title = customSubject || 'Alerta Financeiro';
      message =
        customBody ||
        `Um novo alerta financeiro requer acompanhamento da gestão ou contabilidade.${extraInfo ? `<br/><br/>${extraInfo}` : ''}`;
      buttonText = 'Abrir Painel Financeiro';
      break;

    // -------------------------------------------------------------
    // 2. NOTIFICAÇÕES PARA O CLIENTE (PORTAL DO CLIENTE)
    // -------------------------------------------------------------
    case 'briefing_returned':
      badge = 'PORTAL DO CLIENTE';
      subject = 'Ação Necessária: Revisão Estratégica de Briefing';
      icon = '📝';
      title = 'Dossiê em Revisão';
      message =
        customBody ||
        `Nossa equipe analisou o briefing submetido para <strong>${projectName || 'sua marca'}</strong>. Precisamos do seu alinhamento e aprofundamento em alguns pontos para calibrar a direção estratégica com precisão.`;
      buttonText = 'Revisar Briefing';
      break;

    case 'contract_uploaded':
      badge = 'COFRE DIGITAL';
      subject = 'Documento Liberado: Contrato Disponível';
      icon = '📄';
      title = 'Contrato Disponível no Cofre';
      message =
        customBody ||
        `O documento legal referente ao projeto <strong>${projectName || 'Studio Veronna'}</strong> foi processado e já se encontra disponível no seu Cofre Digital.`;
      buttonText = 'Acessar Cofre';
      break;

    case 'new_direction':
      badge = 'CURADORIA VISUAL';
      subject = 'Nova Direção Visual Disponível — Studio Veronna';
      icon = '🎨';
      title = 'Curadoria Visual Disponível';
      message =
        customBody ||
        `A Direção de Arte preparou novas rotas criativas e referências visuais para a sua marca. Acesse o seu espaço para avaliar e guiar os próximos passos.`;
      buttonText = 'Avaliar Direção';
      break;

    case 'planning_approval':
      badge = 'PRESENÇA DIGITAL';
      subject = `Aprovação Pendente: ${taskName || 'Planejamento Estratégico'}`;
      icon = '✍️';
      title = 'Aprovação de Conteúdo';
      message =
        customBody ||
        `A entrega <strong>${taskName || 'do seu planejamento'}</strong> foi preparada pela nossa equipe. Aguardamos sua validação no portal para avançarmos.`;
      buttonText = 'Avaliar e Aprovar';
      break;

    case 'project_delivered':
      badge = 'ENTREGA OFICIAL';
      subject = 'Seu Projeto foi Concluído — Studio Veronna';
      icon = '📦';
      title = 'Ativos Finais Entregues';
      message =
        customBody ||
        `A operação <strong>${projectName || 'da sua marca'}</strong> foi finalizada com sucesso. Seus arquivos finais em alta resolução já estão disponíveis no Cofre Digital.`;
      buttonText = 'Baixar Ativos Finais';
      break;

    case 'vault_new_asset':
      badge = 'COFRE DIGITAL';
      subject = customSubject || 'Atualização no seu Cofre Digital — Studio Veronna';
      icon = '💎';
      title = customSubject ? stripLeadingEmoji(customSubject).cleanText : 'Novo Material no Cofre';
      message =
        customBody ||
        `Um novo arquivo ou solicitação estratégica foi disponibilizado no seu espaço no Studio Veronna. Acesse o portal para visualizar.`;
      buttonText = 'Abrir Meu Espaço';
      break;

    case 'project_archived':
      badge = 'PORTAL DO CLIENTE';
      subject = 'Ciclo Encerrado: Projeto Arquivado — Studio Veronna';
      icon = '🔒';
      title = 'Projeto Arquivado';
      message =
        customBody ||
        `O ciclo operacional foi oficialmente concluído e arquivado em nosso sistema. Agradecemos a confiança depositada no Studio Veronna para construir o legado da sua marca.`;
      buttonText = 'Acessar Portal';
      break;

    case 'project_reactivated':
      badge = 'PORTAL DO CLIENTE';
      subject = 'Operação Reativada — Studio Veronna';
      icon = '🔓';
      title = 'Acesso Total Restaurado';
      message =
        customBody ||
        `O projeto <strong>${projectName || 'da sua marca'}</strong> voltou à nossa esteira ativa. Seu acesso ao Cockpit e canais do Studio Veronna foi integralmente restaurado.`;
      buttonText = 'Entrar no Cockpit';
      break;

    // -------------------------------------------------------------
    // 3. COMUNIDADE VÊNETO & HUB B2B
    // -------------------------------------------------------------
    case 'community_approved_post':
      badge = 'COMUNIDADE VÊNETO';
      subject = 'Publicação Aprovada na Comunidade Vêneto';
      icon = '✅';
      title = 'Publicação Validada';
      message =
        customBody ||
        `Sua publicação foi aprovada pela curadoria do Studio Veronna e já está visível no mural da Comunidade Vêneto.`;
      buttonText = 'Ver na Comunidade';
      break;

    case 'community_interaction':
      badge = 'COMUNIDADE VÊNETO';
      subject = 'Nova Interação na sua Publicação';
      icon = '💬';
      title = 'Networking Ativo';
      message =
        customBody ||
        `Um membro do ecossistema interagiu com a sua publicação recente na Comunidade Vêneto.`;
      buttonText = 'Ver Interação';
      break;

    case 'b2b_interest':
      badge = 'HUB DE NEGÓCIOS';
      subject = 'Novo Interesse de Parceria B2B (Hub)';
      icon = '🤝';
      title = 'Oportunidade de Conexão B2B';
      message =
        customBody ||
        `Foi registrado um novo sinal de interesse no seu Pitch de Negócios. Acesse o Hub para iniciar o contato.`;
      buttonText = 'Ver Oportunidade';
      break;

    // -------------------------------------------------------------
    // 4. ALERTAS DE GESTÃO & LIDERANÇA
    // -------------------------------------------------------------
    case 'admin_alert_briefing':
      badge = 'GESTÃO & LIDERANÇA';
      subject = `[NOVO BRIEFING] ${clientName || projectName || 'Cliente'}`;
      icon = '🎯';
      title = 'Dossiê de Briefing Recebido';
      message =
        customBody ||
        `O cliente <strong>${clientName || projectName}</strong> concluiu e enviou o formulário estratégico de briefing.`;
      buttonText = 'Analisar Dossiê';
      break;

    case 'upsell_accepted':
      badge = 'EXPANSÃO COMERCIAL';
      subject = `[OPORTUNIDADE] Upsell Solicitado: ${clientName || 'Cliente'}`;
      icon = '🔥';
      title = 'Sinal de Expansão Comercial';
      message =
        customBody ||
        `O cliente <strong>${clientName || 'do portfólio'}</strong> demonstrou interesse em expandir o escopo com novos serviços.`;
      buttonText = 'Ver Solicitação';
      break;

    case 'art_approved':
      badge = 'CURADORIA & CLIENTE';
      subject = `[APROVADO PELO CLIENTE] ${clientName || projectName || 'Entrega'}`;
      icon = '🟢';
      title = 'Luz Verde do Cliente';
      message =
        customBody ||
        `O cliente <strong>${clientName || projectName}</strong> aprovou oficialmente a entrega ou direção visual submetida.`;
      buttonText = 'Avançar Projeto';
      break;

    case 'art_rejected':
      badge = 'CURADORIA & CLIENTE';
      subject = `[AJUSTE DO CLIENTE] ${clientName || projectName || 'Entrega'}`;
      icon = '🛑';
      title = 'Cliente Solicitou Ajustes';
      message =
        customBody ||
        `O cliente <strong>${clientName || projectName}</strong> solicitou revisões na peça apresentada. Confira as observações detalhadas no painel.`;
      buttonText = 'Ver Observações';
      break;

    case 'visual_pin_added':
      badge = 'CURADORIA VISUAL';
      subject = `[FEEDBACK VISUAL] Novo apontamento de ${clientName || 'Cliente'}`;
      icon = '📍';
      title = 'Novo Apontamento Visual';
      message =
        customBody ||
        `Um novo comentário foi fixado diretamente sobre a peça criativa por <strong>${clientName || 'cliente'}</strong>.`;
      buttonText = 'Ler Feedback';
      break;

    case 'fever_chart_alert':
      badge = 'RISCO OPERACIONAL';
      subject = `[ALERTA DE BUFFER] ${projectName || 'Projeto'}`;
      icon = '⚠️';
      title = 'Atenção ao Ritmo do Projeto';
      message =
        customBody ||
        `Alerta de consumo de prazo/horas no projeto <strong>${projectName}</strong>.<br/><br/><span style="color:#ea580c; font-size:13px;">${extraInfo || ''}</span>`;
      buttonText = 'Intervir no Projeto';
      break;

    // -------------------------------------------------------------
    // 5. MOTOR DINÂMICO (NotificationEngine / Avisos Gerais)
    // -------------------------------------------------------------
    case 'custom':
    case 'custom_collaborator':
    default: {
      const parsed = stripLeadingEmoji(customSubject || title);
      if (parsed.emoji) {
        icon = parsed.emoji;
        title = parsed.cleanText;
      } else {
        icon = type === 'custom_collaborator' ? '🎯' : '✨';
        title = customSubject || 'Comunicado do Atelier';
      }
      subject = customSubject || 'Notificação — Studio Veronna';
      message =
        customBody ||
        'Existem novas atualizações ou ações pendentes aguardando sua atenção na plataforma.';
      if (!customBadge) {
        if (link?.includes('/tessera') || link?.includes('/jtbd') || link?.includes('/review')) {
          badge = 'OPERAÇÃO & TAREFAS';
        } else if (link?.includes('/fio') || link?.includes('/canais')) {
          badge = 'SINTONIA';
        } else if (link?.includes('/financeiro')) {
          badge = 'FINANCEIRO';
        } else if (link?.includes('/admin')) {
          badge = 'GESTÃO & LIDERANÇA';
        } else {
          badge = 'STUDIO VERONNA';
        }
      }
      buttonText = customButtonText || 'Acessar Plataforma';
      break;
    }
  }

  if (typeof message === 'string') {
    message = message.replace(
      /data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g,
      '[Imagem Ocultada no E-mail]'
    );
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #faf9f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #18181b;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #faf9f6; padding: 48px 20px;">
        <tr>
          <td align="center">
            
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 460px; background-color: #ffffff; border-radius: 28px; box-shadow: 0 16px 40px rgba(0,0,0,0.06); border: 1px solid #ebe8e2; overflow: hidden;">
              
              <!-- Top Branding Bar -->
              <tr>
                <td style="padding: 24px 32px 0; border-bottom: 1px solid #f4f2ee;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="left" style="padding-bottom: 16px;">
                        <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #a45037;">STUDIO VERONNA</span>
                      </td>
                      <td align="right" style="padding-bottom: 16px;">
                        <span style="font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #71717a; background-color: #f4f2ee; padding: 4px 10px; border-radius: 10px;">${badge}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Card Header & Icon -->
              <tr>
                <td align="center" style="padding: 36px 32px 16px;">
                  <div style="display: inline-block; width: 60px; height: 60px; border-radius: 20px; background-color: #fdf5f2; border: 1px solid #f6ded5; font-size: 28px; line-height: 60px; text-align: center; margin-bottom: 18px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                    ${icon}
                  </div>
                  <h1 style="margin: 0; font-size: 21px; color: #18181b; font-weight: 700; letter-spacing: -0.4px; line-height: 1.25;">
                    ${title}
                  </h1>
                </td>
              </tr>

              <!-- Message Body -->
              <tr>
                <td align="center" style="padding: 0 32px 28px;">
                  <div style="margin: 0; font-size: 14.5px; line-height: 1.65; color: #52525b; text-align: center;">
                    ${message}
                  </div>
                </td>
              </tr>
              
              <!-- CTA Button -->
              <tr>
                <td align="center" style="padding: 0 32px 36px;">
                  <a href="${absoluteLink}" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 16px 24px; border-radius: 16px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; text-align: center; box-shadow: 0 4px 14px rgba(0,0,0,0.12);">
                    ${buttonText} &rarr;
                  </a>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 20px 32px; background-color: #fcfbfa; border-top: 1px solid #f4f2ee;">
                  <p style="margin: 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                    Esta é uma comunicação oficial da central de operações Atelier.<br/>
                    <strong style="color: #71717a;">Studio Veronna</strong> &bull; Design Estratégico &amp; Identidade
                  </p>
                </td>
              </tr>

            </table>

            <p style="margin-top: 24px; font-size: 11px; color: #a1a1aa;">
              Acesse o sistema em <a href="https://atelier.lizdesign.com.br" style="color: #71717a; text-decoration: underline;">atelier.lizdesign.com.br</a>
            </p>

          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Busca todos os líderes ativos (admin e gestor) no banco Neon.
 */
export async function getActiveManagers(): Promise<
  Array<{ id: string; email: string; nome: string; role: string }>
> {
  const sql = getDb();
  const rows = (await sql`
    SELECT id, email, nome, role
    FROM profiles
    WHERE role IN ('admin', 'gestor')
      AND COALESCE(contract_status, 'active') != 'inactive'
  `) as Array<{ id: string; email: string; nome: string; role: string }>;
  return rows || [];
}

/**
 * Envia e-mail usando Resend com o template executivo do Studio Veronna.
 */
export async function sendStudioEmail(params: {
  to: string | string[];
  type: string;
  templateData?: StudioEmailTemplateData;
}): Promise<{ success: boolean; sentTo: string[]; data?: any; error?: string }> {
  const rawRecipients = Array.isArray(params.to) ? params.to : [params.to];

  // Substitui e-mail legado 'lizbranddesign@gmail.com' pelos gestores ativos do Studio Veronna
  const expandedRecipients: string[] = [];
  for (const addr of rawRecipients) {
    if (!addr || typeof addr !== 'string') continue;
    const clean = addr.trim().toLowerCase();
    if (clean === 'lizbranddesign@gmail.com' || clean === 'geral@lizdesign.com.br') {
      const managers = await getActiveManagers().catch(() => []);
      for (const m of managers) {
        if (m.email) expandedRecipients.push(m.email.trim());
      }
    } else {
      expandedRecipients.push(addr.trim());
    }
  }

  const validRecipients = Array.from(new Set(expandedRecipients)).filter(isValidRealEmail);
  if (validRecipients.length === 0) {
    return { success: true, sentTo: [] };
  }

  const resend = getResend();
  if (!resend) {
    return {
      success: false,
      sentTo: [],
      error: 'RESEND_API_KEY ausente no servidor.',
    };
  }

  const { subject, html } = getStudioEmailTemplate(params.type, params.templateData || {});

  const { data, error } = await resend.emails.send({
    from: STUDIO_VERONNA_FROM,
    to: validRecipients,
    subject,
    html,
  });

  if (error) {
    console.error('[ServerNotifications] Erro Resend:', error);
    return {
      success: false,
      sentTo: [],
      error: error.message || 'Falha no disparo via Resend',
    };
  }

  console.log(
    `[ServerNotifications] E-mail '${params.type}' enviado para: ${validRecipients.join(', ')}`
  );
  return { success: true, sentTo: validRecipients, data };
}

/**
 * Dispara notificação In-App + E-mail para um usuário específico direto no servidor (Neon + Resend).
 */
export async function notifyUserOnServer(params: {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'action';
  actionUrl?: string;
  emailTemplateType?: string;
  extraData?: StudioEmailTemplateData;
  skipEmail?: boolean;
  skipInApp?: boolean;
}): Promise<{ success: boolean; sentEmail: boolean }> {
  const {
    userId,
    title,
    message,
    type = 'info',
    actionUrl,
    emailTemplateType = 'custom',
    extraData = {},
    skipEmail = false,
    skipInApp = false,
  } = params;

  if (!userId) return { success: false, sentEmail: false };

  try {
    const sql = getDb();
    const userRows = (await sql`
      SELECT id, email, role, nome, COALESCE(contract_status, 'active') AS contract_status
      FROM profiles
      WHERE id = ${userId}
      LIMIT 1
    `) as Array<{
      id: string;
      email: string | null;
      role: string | null;
      nome: string | null;
      contract_status: string;
    }>;

    const targetUser = userRows[0];
    const defaultLink =
      actionUrl ||
      extraData.link ||
      (targetUser?.role === 'client' || targetUser?.role === 'cliente'
        ? '/cockpit'
        : '/admin/fio');

    if (!skipInApp) {
      await sql`
        INSERT INTO notifications (user_id, title, message, type, action_url, is_read)
        VALUES (${userId}, ${title}, ${message}, ${type}, ${defaultLink}, false)
      `;
    }

    if (
      !skipEmail &&
      targetUser &&
      targetUser.contract_status !== 'inactive' &&
      isValidRealEmail(targetUser.email)
    ) {
      const emailRes = await sendStudioEmail({
        to: targetUser.email!,
        type: emailTemplateType,
        templateData: {
          ...extraData,
          collaboratorName: extraData.collaboratorName || targetUser.nome || undefined,
          clientName: extraData.clientName || targetUser.nome || undefined,
          subject: extraData.subject || title,
          body: extraData.body || message,
          link: defaultLink,
        },
      });
      return { success: true, sentEmail: emailRes.sentTo.length > 0 };
    }

    return { success: true, sentEmail: false };
  } catch (err) {
    console.error('[ServerNotifications] Erro em notifyUserOnServer:', err);
    return { success: false, sentEmail: false };
  }
}

/**
 * Dispara notificação In-App + E-mail para todos os líderes ativos (admin e gestor) no servidor.
 */
export async function notifyManagementOnServer(params: {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'action';
  actionUrl?: string;
  emailTemplateType?: string;
  extraData?: StudioEmailTemplateData;
  excludeUserId?: string;
  skipEmail?: boolean;
}): Promise<{ success: boolean; notifiedCount: number; sentEmails: string[] }> {
  const {
    title,
    message,
    type = 'info',
    actionUrl = '/admin/fio',
    emailTemplateType = 'custom',
    extraData = {},
    excludeUserId,
    skipEmail = false,
  } = params;

  try {
    const sql = getDb();
    const managers = await getActiveManagers();
    const filteredManagers = excludeUserId
      ? managers.filter((m) => m.id !== excludeUserId)
      : managers;

    if (filteredManagers.length === 0) {
      return { success: true, notifiedCount: 0, sentEmails: [] };
    }

    const link = extraData.link || actionUrl || '/admin/fio';

    for (const manager of filteredManagers) {
      await sql`
        INSERT INTO notifications (user_id, title, message, type, action_url, is_read)
        VALUES (${manager.id}, ${title}, ${message}, ${type}, ${link}, false)
      `;
    }

    let sentEmails: string[] = [];
    if (!skipEmail) {
      const validEmails = filteredManagers
        .map((m) => m.email)
        .filter(isValidRealEmail);

      if (validEmails.length > 0) {
        const emailRes = await sendStudioEmail({
          to: validEmails,
          type: emailTemplateType,
          templateData: {
            ...extraData,
            subject: extraData.subject || title,
            body: extraData.body || message,
            link,
          },
        });
        sentEmails = emailRes.sentTo;
      }
    }

    return {
      success: true,
      notifiedCount: filteredManagers.length,
      sentEmails,
    };
  } catch (err) {
    console.error('[ServerNotifications] Erro em notifyManagementOnServer:', err);
    return { success: false, notifiedCount: 0, sentEmails: [] };
  }
}
