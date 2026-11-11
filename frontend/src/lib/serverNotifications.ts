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
      subject = `${clientName || 'Colega'} mencionou você na Sintonia 💬`;
      icon = '💬';
      title = `${clientName || 'Colega'} mencionou você`;
      message =
        customBody ||
        `<strong>${clientName || 'Um membro da equipe'}</strong> mencionou você na Sintonia${extraInfo ? `: "${extraInfo}"` : '.'}`;
      buttonText = 'Responder na Sintonia';
      break;

    case 'sintonia_dm':
      badge = 'SINTONIA';
      subject = `Mensagem de ${clientName || 'Colega'} ✉️`;
      icon = '✉️';
      title = 'Nova Mensagem Direta';
      message =
        customBody ||
        `<strong>${clientName || 'Colega'}</strong> te enviou uma mensagem direta${extraInfo ? `: "${extraInfo}"` : '.'}`;
      buttonText = 'Abrir Conversa';
      break;

    case 'sintonia_channel':
      badge = 'SINTONIA';
      subject = `Nova mensagem em #${projectName || 'geral'} 📢`;
      icon = '📢';
      title = `Canal #${projectName || 'geral'}`;
      message =
        customBody ||
        `Nova atualização no canal <strong>#${projectName || 'geral'}</strong>${extraInfo ? `: "${extraInfo}"` : '.'}`;
      buttonText = 'Ver no Canal';
      break;

    case 'chat_activity':
      badge = 'SINTONIA';
      subject = `Nova mensagem de ${clientName || 'equipe'} 💬`;
      icon = '💬';
      title = 'Nova Mensagem';
      message =
        customBody ||
        `<strong>${clientName || 'A equipe'}</strong> enviou nova mensagem na conversa${extraInfo ? `: "${extraInfo}"` : '.'}`;
      buttonText = 'Ver Mensagem';
      break;

    // -------------------------------------------------------------
    // 1. OPERAÇÃO, TAREFAS & TESSERA (COLABORADORES & LIDERANÇA)
    // -------------------------------------------------------------
    case 'task_assigned':
      badge = 'OPERAÇÃO & TAREFAS';
      subject = customSubject || `Nova demanda: ${taskName || 'Tarefa'} (${projectName || 'Studio Veronna'}) 🎯`;
      icon = '🎯';
      title = 'Nova Demanda Atribuída';
      message =
        customBody ||
        `${collaboratorName ? `<strong>${collaboratorName}</strong>: ` : ''}você assumiu <strong>${taskName || 'Nova Demanda'}</strong> em <strong>${projectName || 'Studio Veronna'}</strong>${deadline ? ` até <strong>${formattedDeadline}</strong>` : ''}${extraInfo ? ` &bull; ${extraInfo}` : '.'}`;
      buttonText = 'Abrir no Kanban';
      break;

    case 'demand_sent':
    case 'new_demand':
      badge = 'GESTÃO DE OPERAÇÕES';
      subject = customSubject || `Demanda na esteira: ${taskName || projectName || 'Nova Demanda'} 📋`;
      icon = '📋';
      title = 'Demanda em Produção';
      message =
        customBody ||
        `<strong>${collaboratorName || clientName || 'Equipe'}</strong> assumiu <strong>${taskName || 'Demanda'}</strong> (${projectName || 'Studio Veronna'})${deadline ? ` até <strong>${formattedDeadline}</strong>` : '.'}`;
      buttonText = 'Acompanhar Entrega';
      break;

    case 'task_in_progress':
      badge = 'OPERAÇÃO EM CURSO';
      subject = customSubject || `Em produção: ${taskName || 'Tarefa'} iniciada ▶️`;
      icon = '▶️';
      title = 'Produção Iniciada';
      message =
        customBody ||
        `<strong>${collaboratorName || clientName || 'Colaborador'}</strong> iniciou a execução de <strong>${taskName || 'tarefa'}</strong> em <strong>${projectName || 'Studio Veronna'}</strong>.`;
      buttonText = 'Ver no Kanban';
      break;

    case 'task_paused':
      badge = 'OPERAÇÃO & TAREFAS';
      subject = customSubject || `Pausada: ${taskName || 'Tarefa'} ⏸️`;
      icon = '⏸️';
      title = 'Demanda Pausada';
      message =
        customBody ||
        `<strong>${collaboratorName || clientName || 'Colaborador'}</strong> pausou <strong>${taskName || 'tarefa'}</strong> (${projectName || 'Studio Veronna'})${extraInfo ? `: ${extraInfo}` : '.'}`;
      buttonText = 'Ver Detalhes';
      break;

    case 'internal_review':
      badge = 'CURADORIA & QA';
      subject = customSubject || `Revisão interna: ${taskName || 'Entrega'} aguarda aprovação 👁️`;
      icon = '👁️';
      title = 'Revisão Pendente';
      message =
        customBody ||
        `<strong>${collaboratorName || clientName || 'A equipe'}</strong> concluiu <strong>${taskName || 'uma entrega'}</strong> (${projectName || 'Studio Veronna'}) e aguarda sua curadoria${extraInfo ? `: ${extraInfo}` : '.'}`;
      buttonText = 'Revisar no Kanban';
      break;

    case 'review_approved':
      badge = 'CURADORIA & QA';
      subject = customSubject || `Aprovado no QA: ${taskName || 'Entrega'} ✅`;
      icon = '🎉';
      title = 'Entrega Aprovada';
      message =
        customBody ||
        `Sua entrega em <strong>${taskName || 'tarefa'}</strong> (${projectName || 'Studio Veronna'}) foi aprovada pela liderança${extraInfo ? `: "${extraInfo}"` : '.'}`;
      buttonText = 'Ver no Kanban';
      break;

    case 'review_changes_requested':
      badge = 'CURADORIA & QA';
      subject = customSubject || `Ajuste solicitado: ${taskName || 'Tarefa'} 🛠️`;
      icon = '🛠️';
      title = 'Ajuste Necessário';
      message =
        customBody ||
        `Foram solicitados ajustes em <strong>${taskName || 'sua entrega'}</strong> (${projectName || 'Studio Veronna'})${extraInfo ? `: <strong>${extraInfo}</strong>` : '.'}`;
      buttonText = 'Ver Apontamentos';
      break;

    case 'task_completed':
      badge = 'OPERAÇÃO & TAREFAS';
      subject = customSubject || `Concluída: ${taskName || 'Entrega'} finalizada 🏆`;
      icon = '🏆';
      title = 'Demanda Concluída';
      message =
        customBody ||
        `A entrega <strong>${taskName || 'A entrega'}</strong> (${projectName || 'Studio Veronna'}) foi aprovada e arquivada como concluída.`;
      buttonText = 'Ver Entrega';
      break;

    case 'task_blocked':
      badge = 'ALERTA DE OPERAÇÃO';
      subject = customSubject || `Bloqueio sinalizado: ${taskName || 'Demanda'} 🚧`;
      icon = '🚧';
      title = 'Impedimento Operacional';
      message =
        customBody ||
        `A entrega <strong>${taskName || 'Tarefa'}</strong> (${projectName || 'Studio Veronna'}) está bloqueada${extraInfo ? `: <strong>${extraInfo}</strong>` : '.'}`;
      buttonText = 'Destravar no Kanban';
      break;

    case 'task_forced_today':
      badge = 'PRIORIDADE IMEDIATA';
      subject = customSubject || `Prioridade do dia: ${taskName || 'Foco imediato'} ⚡`;
      icon = '⚡';
      title = 'Foco Imediato';
      message =
        customBody ||
        `A liderança priorizou a entrega <strong>${taskName || 'esta entrega'}</strong> (${projectName || 'Studio Veronna'}) para hoje${extraInfo ? `: ${extraInfo}` : '.'}`;
      buttonText = 'Abrir no Kanban';
      break;

    case 'task_feedback':
      badge = 'OPERAÇÃO & TAREFAS';
      subject = customSubject || `Novo apontamento: ${taskName || 'Tarefa'} 💬`;
      icon = '💬';
      title = 'Novo Feedback';
      message =
        customBody ||
        `Novo apontamento em <strong>${taskName || 'Tarefa'}</strong> (${projectName || 'Studio Veronna'})${extraInfo ? `: "${extraInfo}"` : '.'}`;
      buttonText = 'Ver no Kanban';
      break;

    case 'task_overdue':
      badge = 'ALERTA DE PRAZO';
      subject = customSubject || `Prazo expirado: ${taskName || 'Entrega'} ⏰`;
      icon = '⏰';
      title = 'Tarefa em Atraso';
      message =
        customBody ||
        `A entrega <strong>${taskName || 'Entrega'}</strong> (${projectName || 'Studio Veronna'}) ultrapassou o prazo planejado.`;
      buttonText = 'Ajustar no Kanban';
      break;

    case 'deadline_24h':
      badge = 'LEMBRETE DE PRAZO';
      subject = customSubject || `Prazo em 24h: ${taskName} ⏳`;
      icon = '⏳';
      title = 'Entrega em 24 Horas';
      message =
        customBody ||
        `${collaboratorName ? `<strong>${collaboratorName}</strong>: ` : ''}Faltam 24h para o prazo de entrega de <strong>${taskName}</strong> (${projectName || 'Studio Veronna'}).`;
      buttonText = 'Ver no Kanban';
      break;

    case 'deadline_12h':
      badge = 'PRAZO CRÍTICO';
      subject = customSubject || `Prazo crítico em 12h: ${taskName} 🚨`;
      icon = '🚨';
      title = 'Entrega em 12 Horas';
      message =
        customBody ||
        `${collaboratorName ? `<strong>${collaboratorName}</strong>: ` : ''}Faltam menos de 12h para finalizar <strong>${taskName}</strong> (${projectName || 'Studio Veronna'}).`;
      buttonText = 'Finalizar Entrega';
      break;

    case 'captacao_reminder':
      badge = 'AGENDA EXTERNA';
      subject = customSubject || `Captação agendada: ${taskName || 'Gravação'} (${projectName}) 🎥`;
      icon = '🎥';
      title = 'Captação de Conteúdo';
      message =
        customBody ||
        `Captação de <strong>${taskName || 'Conteúdo'}</strong> (${projectName || 'Cliente'})${deadline ? ` agendada para <strong>${formattedDeadline}</strong>` : ''}${extraInfo ? ` &bull; ${extraInfo}` : '.'}`;
      buttonText = 'Ver Roteiro';
      break;

    case 'reuniao_reminder':
      badge = 'AGENDA EXECUTIVA';
      subject = customSubject || `Reunião agendada: ${taskName || projectName || 'Alinhamento'} 📅`;
      icon = '📅';
      title = 'Reunião Agendada';
      message =
        customBody ||
        `Reunião de <strong>${taskName || projectName || 'Alinhamento'}</strong>${deadline ? ` confirmada para <strong>${formattedDeadline}</strong>` : ''}${extraInfo ? ` &bull; ${extraInfo}` : '.'}`;
      buttonText = 'Acessar Reunião';
      break;

    case 'contract_ending':
      badge = 'GESTÃO DE CONTRATOS';
      subject = customSubject || `Renovação de contrato: ${clientName || projectName} em ${daysLeft ?? 15} dias 📑`;
      icon = '📑';
      title = 'Vencimento de Contrato';
      message =
        customBody ||
        `O contrato de <strong>${clientName || projectName}</strong> vence em <strong>${daysLeft ?? 15} dias</strong> (${formattedDeadline}). Inicie o alinhamento de renovação.`;
      buttonText = 'Ver Contrato';
      break;

    case 'financial_alert':
      badge = 'FINANCEIRO';
      subject = customSubject || `Alerta financeiro: ${extraInfo || 'Pendência operacional'} 💰`;
      icon = '💰';
      title = 'Atenção Financeira';
      message =
        customBody ||
        `Pendência identificada em <strong>${projectName || 'Studio Veronna'}</strong>${extraInfo ? `: ${extraInfo}` : '.'}`;
      buttonText = 'Ver Financeiro';
      break;

    // -------------------------------------------------------------
    // 2. NOTIFICAÇÕES PARA O CLIENTE (PORTAL DO CLIENTE)
    // -------------------------------------------------------------
    case 'briefing_returned':
      badge = 'PORTAL DO CLIENTE';
      subject = `Briefing de ${projectName || 'sua marca'}: ajustes necessários 📝`;
      icon = '📝';
      title = 'Ajuste no Briefing';
      message =
        customBody ||
        `Precisamos de informações complementares no briefing de <strong>${projectName || 'sua marca'}</strong> para prosseguir.`;
      buttonText = 'Completar Briefing';
      break;

    case 'contract_uploaded':
      badge = 'COFRE DIGITAL';
      subject = 'Contrato disponível no Cofre Digital 📄✨';
      icon = '📄';
      title = 'Contrato Disponível';
      message =
        customBody ||
        `O contrato do projeto <strong>${projectName || 'Studio Veronna'}</strong> está assinado e arquivado no seu Cofre Digital.`;
      buttonText = 'Acessar Cofre';
      break;

    case 'new_direction':
      badge = 'CURADORIA VISUAL';
      subject = `Direção Criativa: rotas visuais de ${projectName || 'sua marca'} 🎨`;
      icon = '🎨';
      title = 'Rotas Visuais Disponíveis';
      message =
        customBody ||
        `As rotas conceituais de <strong>${projectName || 'sua marca'}</strong> estão prontas para sua avaliação no Cockpit.`;
      buttonText = 'Avaliar Rotas';
      break;

    case 'planning_approval':
      badge = 'PRESENÇA DIGITAL';
      subject = `Planejamento de conteúdo pronto para aprovação ✍️`;
      icon = '✍️';
      title = 'Planejamento de Conteúdo';
      message =
        customBody ||
        `O planejamento de <strong>${taskName || 'conteúdo'}</strong> (${projectName || 'sua marca'}) aguarda sua aprovação no Cockpit.`;
      buttonText = 'Aprovar no Cockpit';
      break;

    case 'project_delivered':
      badge = 'ENTREGA OFICIAL';
      subject = `Entrega final: seu projeto de marca está pronto! 📦🎉`;
      icon = '📦';
      title = 'Identidade Visual Entregue';
      message =
        customBody ||
        `A identidade de <strong>${projectName || 'sua marca'}</strong> foi concluída e todos os arquivos estão disponíveis para download.`;
      buttonText = 'Baixar Arquivos';
      break;

    case 'vault_new_asset':
      badge = 'COFRE DIGITAL';
      subject = customSubject || 'Novo ativo liberado no seu Cofre Digital 💎';
      icon = '💎';
      title = customSubject ? stripLeadingEmoji(customSubject).cleanText : 'Novo Ativo no Cofre';
      message =
        customBody ||
        `Novo arquivo adicionado ao Cofre Digital de <strong>${projectName || 'seu projeto'}</strong>${extraInfo ? `: ${extraInfo}` : ' para download'}.`;
      buttonText = 'Abrir Cofre';
      break;

    case 'project_archived':
      badge = 'PORTAL DO CLIENTE';
      subject = `Projeto ${projectName || 'sua marca'} concluído e arquivado 🔒`;
      icon = '🔒';
      title = 'Projeto Arquivado';
      message =
        customBody ||
        `O projeto <strong>${projectName || 'sua marca'}</strong> foi concluído com sucesso e seus arquivos seguem disponíveis no Cofre.`;
      buttonText = 'Acessar Cofre';
      break;

    case 'project_reactivated':
      badge = 'PORTAL DO CLIENTE';
      subject = `Projeto ${projectName || 'sua marca'} reativado 🔓🚀`;
      icon = '🔓';
      title = 'Projeto Reativado';
      message =
        customBody ||
        `A esteira do projeto <strong>${projectName || 'sua marca'}</strong> foi reativada com acesso operacional liberado.`;
      buttonText = 'Acessar Cockpit';
      break;

    // -------------------------------------------------------------
    // 3. COMUNIDADE VÊNETO & HUB B2B
    // -------------------------------------------------------------
    case 'community_approved_post':
      badge = 'COMUNIDADE VÊNETO';
      subject = 'Publicação aprovada na Comunidade Vêneto ✅';
      icon = '🎉';
      title = 'Publicação Aprovada';
      message =
        customBody ||
        `Sua publicação foi aprovada e já está visível na <strong>Comunidade Vêneto</strong>.`;
      buttonText = 'Ver na Comunidade';
      break;

    case 'community_interaction':
      badge = 'COMUNIDADE VÊNETO';
      subject = 'Nova interação na sua publicação na Vêneto 💬';
      icon = '💬';
      title = 'Nova Interação';
      message =
        customBody ||
        `<strong>${clientName || 'Um membro'}</strong> interagiu com a sua publicação na <strong>Comunidade Vêneto</strong>.`;
      buttonText = 'Ver Interação';
      break;

    case 'b2b_interest':
      badge = 'HUB DE NEGÓCIOS';
      subject = 'Novo interesse comercial no seu pitch B2B 🤝';
      icon = '🤝';
      title = 'Interesse Comercial';
      message =
        customBody ||
        `Um parceiro demonstrou interesse no seu pitch no <strong>Hub B2B</strong>${extraInfo ? `: ${extraInfo}` : '.'}`;
      buttonText = 'Ver Oportunidade';
      break;

    // -------------------------------------------------------------
    // 4. ALERTAS DE GESTÃO & LIDERANÇA
    // -------------------------------------------------------------
    case 'admin_alert_briefing':
      badge = 'GESTÃO & LIDERANÇA';
      subject = `Briefing preenchido: ${clientName || projectName || 'Cliente'} 🎯`;
      icon = '🎯';
      title = 'Briefing Recebido';
      message =
        customBody ||
        `<strong>${clientName || projectName}</strong> concluiu o preenchimento do briefing${extraInfo ? ` (${extraInfo})` : ''}. Pronto para triagem.`;
      buttonText = 'Ver Briefing';
      break;

    case 'upsell_accepted':
      badge = 'EXPANSÃO COMERCIAL';
      subject = `Expansão comercial: ${clientName || 'Cliente'} aceitou proposta 🔥`;
      icon = '🔥';
      title = 'Proposta Aceita';
      message =
        customBody ||
        `<strong>${clientName || 'O cliente'}</strong> aceitou a expansão de escopo${extraInfo ? `: ${extraInfo}` : '.'}`;
      buttonText = 'Ver Proposta';
      break;

    case 'art_approved':
      badge = 'CURADORIA & CLIENTE';
      subject = `Arte aprovada pelo cliente: ${clientName || projectName || 'Projeto'} 🟢`;
      icon = '🟢';
      title = 'Arte Aprovada';
      message =
        customBody ||
        `<strong>${clientName || projectName}</strong> aprovou a arte final${extraInfo ? `: "${extraInfo}"` : '.'}`;
      buttonText = 'Ver no Kanban';
      break;

    case 'art_rejected':
      badge = 'CURADORIA & CLIENTE';
      subject = `Ajuste solicitado pelo cliente em ${clientName || projectName || 'arte'} 🛑`;
      icon = '🛑';
      title = 'Ajuste Solicitado';
      message =
        customBody ||
        `<strong>${clientName || projectName}</strong> solicitou alterações na arte${extraInfo ? `: <strong>${extraInfo}</strong>` : '.'}`;
      buttonText = 'Ver Solicitação';
      break;

    case 'visual_pin_added':
      badge = 'CURADORIA VISUAL';
      subject = `Feedback visual adicionado por ${clientName || 'Cliente'} 📍`;
      icon = '📍';
      title = 'Pin Visual Adicionado';
      message =
        customBody ||
        `<strong>${clientName || 'Cliente'}</strong> adicionou um pin com feedback na peça${extraInfo ? `: "${extraInfo}"` : '.'}`;
      buttonText = 'Ver Feedback';
      break;

    case 'fever_chart_alert':
      badge = 'RISCO OPERACIONAL';
      subject = `Alerta de prazo: ${projectName || 'Projeto'} em risco operacional ⚠️`;
      icon = '⚠️';
      title = 'Risco de Prazo';
      message =
        customBody ||
        `O projeto <strong>${projectName || 'Projeto'}</strong> atingiu margem crítica de buffer na esteira${extraInfo ? `: <strong>${extraInfo}</strong>` : '.'}`;
      buttonText = 'Ver no Kanban';
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
        'Você tem novas atualizações na sua mesa de trabalho no Atelier.';
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
