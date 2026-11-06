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
      subject = `Psst! ${clientName || 'Alguém'} chamou você na Sintonia 👀`;
      icon = '💬';
      title = `${clientName || 'Alguém'} chamou você!`;
      message =
        customBody ||
        `<strong>${clientName || 'Alguém da equipe'}</strong> te marcou no papo:<br/><br/><div style="background-color:#faf9f6; border-left:3px solid #a45037; padding:12px 16px; border-radius:8px; font-style:italic; color:#3f3f46;">"${extraInfo || 'Dá uma espiada no painel!'}"</div>`;
      buttonText = 'Bora responder';
      break;

    case 'sintonia_dm':
      badge = 'SINTONIA';
      subject = `Mensagem nova de ${clientName || 'alguém'} na área ✉️`;
      icon = '✉️';
      title = 'Chegou DM pra você!';
      message =
        customBody ||
        `<strong>${clientName || 'Um colega'}</strong> mandou uma DM:<br/><br/><div style="background-color:#faf9f6; border-left:3px solid #a45037; padding:12px 16px; border-radius:8px; font-style:italic; color:#3f3f46;">"${extraInfo || 'Entra lá pra conferir'}"</div>`;
      buttonText = 'Abrir conversa';
      break;

    case 'sintonia_channel':
      badge = 'SINTONIA';
      subject = `Movimentação quente em #${projectName || 'operacao-atelier'} 📢`;
      icon = '📢';
      title = `Canal #${projectName || 'operacao-atelier'}`;
      message = customBody || 'Tem novidade fresquinha no canal da galera. Não fica de fora!';
      buttonText = 'Espiar o canal';
      break;

    case 'chat_activity':
      badge = 'SINTONIA';
      subject = `Opa! ${clientName || 'A equipe'} mandou mensagem 💬`;
      icon = '💬';
      title = 'Papo rolando na Sintonia';
      message =
        customBody ||
        'Tem mensagem nova te esperando na Sintonia. Vem conferir!';
      buttonText = 'Ver mensagem';
      break;

    // -------------------------------------------------------------
    // 1. OPERAÇÃO, TAREFAS & TESSERA (COLABORADORES & LIDERANÇA)
    // -------------------------------------------------------------
    case 'task_assigned':
      badge = 'OPERAÇÃO & TAREFAS';
      subject = customSubject || `Demanda nova na sua mesa: ${taskName || 'Bora produzir'}! 🎯`;
      icon = '🎯';
      title = 'Chegou missão pra você!';
      message =
        customBody ||
        `Fala${collaboratorName ? `, <strong>${collaboratorName}</strong>` : ''}! Uma nova missão acabou de aterrissar na sua mesa no projeto <strong>${projectName || 'Studio Veronna'}</strong>.<br/><br/>` +
          `<div style="background-color:#faf9f6; border:1px solid #ebe8e2; padding:14px 16px; border-radius:12px; text-align:left;">` +
          `<strong>📌 O que é:</strong> ${taskName || 'Nova Demanda'}<br/>` +
          (deadline ? `<strong>📅 Até quando:</strong> ${formattedDeadline}<br/>` : '') +
          (extraInfo ? `<strong>📝 Contexto:</strong> ${extraInfo}` : '') +
          `</div><br/>Bora fazer acontecer com aquela qualidade Veronna? ✨`;
      buttonText = 'Pegar pra fazer';
      break;

    case 'demand_sent':
    case 'new_demand':
      badge = 'GESTÃO DE OPERAÇÕES';
      subject = customSubject || `Mais uma na esteira: ${taskName || projectName || 'Nova Demanda'} 📋`;
      icon = '📋';
      title = 'Missão na esteira!';
      message =
        customBody ||
        `A demanda <strong>${taskName || 'Nova Tarefa'}</strong> (${projectName || 'Studio Veronna'}) já tá sob os cuidados de <strong>${collaboratorName || clientName || 'alguém da equipe'}</strong>.` +
          (deadline ? `<br/><br/><strong>📅 Prazo combinado:</strong> ${formattedDeadline}` : '') +
          (extraInfo ? `<br/><strong>Contexto rápido:</strong> ${extraInfo}` : '');
      buttonText = 'Ver como tá indo';
      break;

    case 'task_in_progress':
      badge = 'OPERAÇÃO EM CURSO';
      subject = customSubject || `Mão na massa! ${taskName || 'Tarefa'} entrou em ação ▶️`;
      icon = '▶️';
      title = 'Foco ativado!';
      message =
        customBody ||
        `<strong>${collaboratorName || clientName || 'O colaborador'}</strong> ligou os motores e começou a produzir <strong>${taskName || 'a tarefa'}</strong> (${projectName || 'Studio Veronna'}).`;
      buttonText = 'Acompanhar produção';
      break;

    case 'task_paused':
      badge = 'OPERAÇÃO & TAREFAS';
      subject = customSubject || `Hora do respiro: ${taskName || 'Tarefa'} pausada ⏸️`;
      icon = '⏸️';
      title = 'Pausinha rápida';
      message =
        customBody ||
        `A demanda <strong>${taskName || 'Tarefa'}</strong> (${projectName || 'Studio Veronna'}) deu uma respirada por conta de <strong>${collaboratorName || clientName || 'um colaborador'}</strong>.` +
          (extraInfo ? `<br/><br/><strong>Motivo:</strong> ${extraInfo}` : '');
      buttonText = 'Ver detalhes';
      break;

    case 'internal_review':
      badge = 'CURADORIA & QA';
      subject = customSubject || `Obra de arte pronta pra curadoria: ${taskName || 'Entrega'} 👁️`;
      icon = '👁️';
      title = 'Olhar afiado da liderança!';
      message =
        customBody ||
        `<strong>${collaboratorName || clientName || 'A equipe'}</strong> finalizou o trampo em <strong>${taskName || 'uma entrega'}</strong> (${projectName || 'Studio Veronna'}) e mandou praquele crivo fino da liderança.` +
          (extraInfo ? `<br/><br/><div style="background-color:#faf9f6; border-left:3px solid #a45037; padding:10px 14px; border-radius:8px; text-align:left;">${extraInfo}</div>` : '');
      buttonText = 'Dar aquela olhada';
      break;

    case 'review_approved':
      badge = 'CURADORIA & QA';
      subject = customSubject || `Mandou bem demais! ${taskName || 'Entrega'} aprovada ✅`;
      icon = '🎉';
      title = 'Aprovadíssimo!';
      message =
        customBody ||
        `Coisa linda! A liderança deu luz verde total pra <strong>${taskName || 'sua entrega'}</strong> no projeto <strong>${projectName || 'Studio Veronna'}</strong>. Qualidade no teto! ✨` +
          (extraInfo ? `<br/><br/><strong>Nota da liderança:</strong> ${extraInfo}` : '');
      buttonText = 'Comemorar no painel';
      break;

    case 'review_changes_requested':
      badge = 'CURADORIA & QA';
      subject = customSubject || `Ajuste fino na rota: ${taskName || 'Tarefa'} 🛠️`;
      icon = '🛠️';
      title = 'Quase lá! Só mais um toque';
      message =
        customBody ||
        `A liderança curtiu, mas pediu um polimento a mais em <strong>${taskName || 'sua entrega'}</strong> (${projectName || 'Studio Veronna'}) pra ficar nível arte.` +
          (extraInfo
            ? `<br/><br/><div style="background-color:#fff7ed; border-left:3px solid #ea580c; padding:12px 16px; border-radius:8px; text-align:left; color:#7c2d12;"><strong>O que precisa afinar:</strong><br/>${extraInfo}</div>`
            : '');
      buttonText = 'Ver os toques';
      break;

    case 'task_completed':
      badge = 'OPERAÇÃO & TAREFAS';
      subject = customSubject || `Check! Mais uma entrega no cofre: ${taskName || 'Finalizada'} 🏆`;
      icon = '🏆';
      title = 'Tá feito e entregue!';
      message =
        customBody ||
        `Pode riscar da lista! <strong>${taskName || 'A entrega'}</strong> do projeto <strong>${projectName || 'Studio Veronna'}</strong> foi concluída com louvor.`;
      buttonText = 'Ver como ficou';
      break;

    case 'task_blocked':
      badge = 'ALERTA DE OPERAÇÃO';
      subject = customSubject || `Ops, travou ali: ${taskName || 'Demanda'} tá bloqueada 🚧`;
      icon = '🚧';
      title = 'Alguém dá uma forcinha?';
      message =
        customBody ||
        `A demanda <strong>${taskName || 'Tarefa'}</strong> (${projectName || 'Studio Veronna'}) bateu num obstáculo e precisa de um empurrãozinho pra destravar.` +
          (extraInfo
            ? `<br/><br/><div style="background-color:#fef2f2; border-left:3px solid #dc2626; padding:12px 16px; border-radius:8px; text-align:left; color:#7f1d1d;"><strong>O que tá pegando:</strong><br/>${extraInfo}</div>`
            : '');
      buttonText = 'Destravar agora';
      break;

    case 'task_forced_today':
      badge = 'PRIORIDADE IMEDIATA';
      subject = customSubject || `Radar quente: ${taskName || 'Essa é pra hoje'}! ⚡`;
      icon = '⚡';
      title = 'Prioridade máxima hoje!';
      message =
        customBody ||
        `A liderança colocou um holofote em <strong>${taskName || 'essa entrega'}</strong> (${projectName || 'Studio Veronna'}). Foco nela que o dia é dela!` +
          (extraInfo
            ? `<br/><br/><div style="background-color:#faf9f6; border-left:3px solid #a45037; padding:12px 16px; border-radius:8px; text-align:left;"><strong>Recado da chefia:</strong><br/>${extraInfo}</div>`
            : '');
      buttonText = 'Entrar em foco';
      break;

    case 'task_feedback':
      badge = 'OPERAÇÃO & TAREFAS';
      subject = customSubject || `Novo pitaco construtivo em ${taskName || 'sua tarefa'} 💬`;
      icon = '💬';
      title = 'Comentário fresco na mesa!';
      message =
        customBody ||
        `Alguém deixou um apontamento carinhoso na tarefa <strong>${taskName || 'Tarefa'}</strong> (${projectName || 'Studio Veronna'}):` +
          (extraInfo
            ? `<br/><br/><div style="background-color:#faf9f6; border-left:3px solid #a45037; padding:12px 16px; border-radius:8px; text-align:left;">${extraInfo}</div>`
            : '');
      buttonText = 'Ver apontamento';
      break;

    case 'task_overdue':
      badge = 'ALERTA DE PRAZO';
      subject = customSubject || `Eita! O relógio correu em ${taskName || 'uma tarefa'} ⏰`;
      icon = '⏰';
      title = 'Passou do ponto!';
      message =
        customBody ||
        `A entrega <strong>${taskName || 'Entrega'}</strong> (${projectName || 'Studio Veronna'}) passou da data meta. Dá uma olhada pra gente recalcular a rota!`;
      buttonText = 'Ajustar agora';
      break;

    case 'deadline_24h':
      badge = 'LEMBRETE DE PRAZO';
      subject = customSubject || `Últimas 24h! ${taskName} vence amanhã ⏳`;
      icon = '⏳';
      title = 'Amanhã é o dia!';
      message =
        customBody ||
        `Fala${collaboratorName ? `, <strong>${collaboratorName}</strong>` : ''}! O relógio tá contando menos de 24h pra entregar <strong>${taskName}</strong> (${projectName || 'Studio Veronna'}). Força na reta final!`;
      buttonText = 'Revisar entrega';
      break;

    case 'deadline_12h':
      badge = 'PRAZO CRÍTICO';
      subject = customSubject || `Corre que tá no fim: menos de 12h pra ${taskName} 🚨`;
      icon = '🚨';
      title = 'Reta finalíssima!';
      message =
        customBody ||
        `Segura o leme! Falta menos de 12h pro prazo de <strong>${taskName}</strong> (${projectName || 'Studio Veronna'}). Se precisar de ajuda, solta o grito na Sintonia!`;
      buttonText = 'Finalizar logo';
      break;

    case 'captacao_reminder':
      badge = 'AGENDA EXTERNA';
      subject = customSubject || `Câmeras a postos! Amanhã tem captação de ${projectName} 🎥`;
      icon = '🎥';
      title = 'Luz, câmera e ação!';
      message =
        customBody ||
        `Bateria carregada e lente limpa? Temos gravação marcada pra <strong>${taskName || 'Sessão de Captação'}</strong> no projeto <strong>${projectName || 'Cliente'}</strong>.` +
          (deadline ? `<br/><br/><strong>📅 Quando:</strong> ${formattedDeadline}` : '') +
          (extraInfo ? `<br/><strong>📍 Onde / Roteiro:</strong><br/>${extraInfo}` : '');
      buttonText = 'Ver roteiro completo';
      break;

    case 'reuniao_reminder':
      badge = 'AGENDA EXECUTIVA';
      subject = customSubject || `Café e alinhamento: temos papo marcado sobre ${taskName || projectName} ☕`;
      icon = '📅';
      title = 'Papo bom vindo aí!';
      message =
        customBody ||
        `Passando pra te lembrar daquele papo sobre <strong>${taskName || projectName || 'Alinhamento'}</strong>.` +
          (deadline ? `<br/><br/><strong>📅 Horário:</strong> ${formattedDeadline}` : '') +
          (extraInfo ? `<br/><strong>📝 Pauta / Link da sala:</strong><br/>${extraInfo}` : '');
      buttonText = 'Entrar na reunião';
      break;

    case 'contract_ending':
      badge = 'GESTÃO DE CONTRATOS';
      subject = customSubject || `Hora de renovar o amor: contrato de ${clientName || projectName} tá vencendo 📑`;
      icon = '📑';
      title = 'Ciclo terminando, renovação chamando!';
      message =
        customBody ||
        `O ciclo com <strong>${clientName || projectName}</strong> encerra em <strong>${daysLeft ?? 15} dias</strong> (${formattedDeadline}). Bora garantir a continuidade dessa parceria linda?`;
      buttonText = 'Bater um papo comercial';
      break;

    case 'financial_alert':
      badge = 'FINANCEIRO';
      subject = customSubject || `Alerta no radar do dindin — Studio Veronna 💰`;
      icon = '💰';
      title = customSubject || 'Radar financeiro apitou!';
      message =
        customBody ||
        `Temos um ponto de atenção nas contas pra liderança ou contabilidade dar uma espiada.${extraInfo ? `<br/><br/>${extraInfo}` : ''}`;
      buttonText = 'Conferir números';
      break;

    // -------------------------------------------------------------
    // 2. NOTIFICAÇÕES PARA O CLIENTE (PORTAL DO CLIENTE)
    // -------------------------------------------------------------
    case 'briefing_returned':
      badge = 'PORTAL DO CLIENTE';
      subject = 'Precisamos do seu brilho: dá uma olhadinha no briefing? 📝';
      icon = '📝';
      title = 'Seu briefing precisa de mais tempero!';
      message =
        customBody ||
        `Nossa equipe adorou o começo do seu briefing pra <strong>${projectName || 'sua marca'}</strong>! Mas pra gente acertar na mosca na identidade, precisamos que você aprofunde uns detalhezinhos mágicos com a gente. Bora?`;
      buttonText = 'Dar aquele brilho no briefing';
      break;

    case 'contract_uploaded':
      badge = 'COFRE DIGITAL';
      subject = 'Oficialíssimo! Seu contrato tá no cofre 📄✨';
      icon = '📄';
      title = 'Contrato seguro e assinado!';
      message =
        customBody ||
        `Tudo nos conformes e pronto pra brilhar! O documento do projeto <strong>${projectName || 'Studio Veronna'}</strong> já tá trancadinho no seu Cofre Digital.`;
      buttonText = 'Espiar meu contrato';
      break;

    case 'new_direction':
      badge = 'CURADORIA VISUAL';
      subject = 'Tem rota visual nova saindo do forno! Vem ver 🎨';
      icon = '🎨';
      title = 'Caminhos visuais fresquinhos!';
      message =
        customBody ||
        `Nossa Direção de Arte preparou opções incríveis pro futuro da sua marca. Entra lá no seu espaço, escolhe a sua favorita e conta pra gente o que achou!`;
      buttonText = 'Ver e opinar';
      break;

    case 'planning_approval':
      badge = 'PRESENÇA DIGITAL';
      subject = `O mapa tá traçado! Dá o seu OK no planejamento de ${taskName || 'conteúdo'} ✍️`;
      icon = '✍️';
      title = 'Seu OK pra voarmos!';
      message =
        customBody ||
        `A estratégia de <strong>${taskName || 'conteúdo'}</strong> tá pronta, linda e alinhada. Dá aquele check esperto pra nossa esteira de design começar a produzir!`;
      buttonText = 'Dar a luz verde';
      break;

    case 'project_delivered':
      badge = 'ENTREGA OFICIAL';
      subject = 'É seu! Projeto prontíssimo e no capricho 📦🎉';
      icon = '📦';
      title = 'O grande momento chegou!';
      message =
        customBody ||
        `Que orgulho desse projeto! A identidade de <strong>${projectName || 'sua marca'}</strong> tá 100% finalizada e todos os arquivos em alta resolução já estão prontos pra você brilhar no mundo.`;
      buttonText = 'Baixar meus arquivos';
      break;

    case 'vault_new_asset':
      badge = 'COFRE DIGITAL';
      subject = customSubject || 'Presente novo no seu Cofre Digital! 💎';
      icon = '💎';
      title = customSubject ? stripLeadingEmoji(customSubject).cleanText : 'Arquivo novinho liberado!';
      message =
        customBody ||
        `Subimos um material fresquinho no seu cofre no Studio Veronna. Entra lá pra dar uma espiada e usar à vontade!`;
      buttonText = 'Abrir meu cofre';
      break;

    case 'project_archived':
      badge = 'PORTAL DO CLIENTE';
      subject = 'Missão cumprida com amor! Projeto arquivado 🔒';
      icon = '🔒';
      title = 'Obrigado por confiar na gente!';
      message =
        customBody ||
        `Nosso ciclo operacional oficial foi concluído, mas o legado de <strong>${projectName || 'sua marca'}</strong> tá só começando. Foi uma delícia construir isso com você!`;
      buttonText = 'Visitar meu espaço';
      break;

    case 'project_reactivated':
      badge = 'PORTAL DO CLIENTE';
      subject = 'Estamos de volta! Operação reativada a todo vapor 🔓🚀';
      icon = '🔓';
      title = 'Que bom te ter de volta!';
      message =
        customBody ||
        `A esteira do projeto <strong>${projectName || 'sua marca'}</strong> voltou a rodar a mil por hora. Teu acesso tá 100% livre pra gente criar mais coisas lindas juntos!`;
      buttonText = 'Entrar no Cockpit';
      break;

    // -------------------------------------------------------------
    // 3. COMUNIDADE VÊNETO & HUB B2B
    // -------------------------------------------------------------
    case 'community_approved_post':
      badge = 'COMUNIDADE VÊNETO';
      subject = 'Tá na vitrine! Seu post foi aprovado na Vêneto ✅';
      icon = '🎉';
      title = 'Seu conteúdo tá no ar!';
      message =
        customBody ||
        `A curadoria amou a sua partilha! Ela já tá brilhando no feed da Comunidade Vêneto pra todo mundo ver e trocar ideia.`;
      buttonText = 'Ver na comunidade';
      break;

    case 'community_interaction':
      badge = 'COMUNIDADE VÊNETO';
      subject = 'Tem gente falando com você na Vêneto! 💬';
      icon = '💬';
      title = 'Networking esquentou!';
      message =
        customBody ||
        `Alguém da comunidade acabou de reagir ou comentar na sua publicação. Vai lá bater um papo!`;
      buttonText = 'Ver interação';
      break;

    case 'b2b_interest':
      badge = 'HUB DE NEGÓCIOS';
      subject = 'Opa! Chegou interesse no seu Pitch B2B 🤝';
      icon = '🤝';
      title = 'Parceria na mira!';
      message =
        customBody ||
        `Seu pitch de negócios chamou atenção no Hub! Alguém quer trocar uma ideia sobre parceria. Não perde o timing!`;
      buttonText = 'Conhecer a oportunidade';
      break;

    // -------------------------------------------------------------
    // 4. ALERTAS DE GESTÃO & LIDERANÇA
    // -------------------------------------------------------------
    case 'admin_alert_briefing':
      badge = 'GESTÃO & LIDERANÇA';
      subject = `Briefing quentinho na mesa: ${clientName || projectName || 'Cliente'} 🎯`;
      icon = '🎯';
      title = 'Dossiê preenchido na área!';
      message =
        customBody ||
        `O cliente <strong>${clientName || projectName}</strong> acabou de entregar o briefing todo bonitinho. Bora desvendar essa marca?`;
      buttonText = 'Ver briefing';
      break;

    case 'upsell_accepted':
      badge = 'EXPANSÃO COMERCIAL';
      subject = `Cheirinho de expansão: ${clientName || 'Cliente'} quer mais! 🔥`;
      icon = '🔥';
      title = 'Cliente querendo crescer!';
      message =
        customBody ||
        `<strong>${clientName || 'O cliente'}</strong> demonstrou interesse em contratar novos serviços. Bora aproveitar o momento!`;
      buttonText = 'Ver proposta';
      break;

    case 'art_approved':
      badge = 'CURADORIA & CLIENTE';
      subject = `Luz verde do cliente! ${clientName || projectName || 'Arte aprovada'} 🟢🎉`;
      icon = '🟢';
      title = 'Cliente adorou e aprovou!';
      message =
        customBody ||
        `Pode comemorar! <strong>${clientName || projectName}</strong> bateu o martelo e deu o aval na peça criativa. Rumo ao próximo passo!`;
      buttonText = 'Seguir produção';
      break;

    case 'art_rejected':
      badge = 'CURADORIA & CLIENTE';
      subject = `Cliente pediu um ajuste em ${clientName || projectName || 'uma entrega'} 🛑`;
      icon = '🛑';
      title = 'Ajustezinho pedido pelo cliente!';
      message =
        customBody ||
        `<strong>${clientName || projectName}</strong> viu a arte e pediu alguns ajustes específicos. Entra pra ver o que ele comentou!`;
      buttonText = 'Ver pedidos do cliente';
      break;

    case 'visual_pin_added':
      badge = 'CURADORIA VISUAL';
      subject = `Novo pino de feedback de ${clientName || 'Cliente'} na peça 📍`;
      icon = '📍';
      title = 'Comentário direto na arte!';
      message =
        customBody ||
        `<strong>${clientName || 'O cliente'}</strong> colocou um pin com feedback em cima da peça. Corre pra conferir!`;
      buttonText = 'Espiar o pin';
      break;

    case 'fever_chart_alert':
      badge = 'RISCO OPERACIONAL';
      subject = `Olho no relógio: buffer apertado em ${projectName || 'Projeto'} ⚠️`;
      icon = '⚠️';
      title = 'Atenção ao ritmo da esteira!';
      message =
        customBody ||
        `O tempo de produção de <strong>${projectName}</strong> tá chegando perto da margem de segurança.<br/><br/><span style="color:#ea580c; font-size:13px;">${extraInfo || ''}</span>`;
      buttonText = 'Intervir no fluxo';
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
