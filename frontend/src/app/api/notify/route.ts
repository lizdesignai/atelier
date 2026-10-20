// src/app/api/notify/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function formatAbsoluteUrl(link?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'https://atelier.lizdesign.com.br';
  if (!link) return baseUrl;
  if (link.startsWith('http://') || link.startsWith('https://')) return link;
  return `${baseUrl.replace(/\/$/, '')}/${link.replace(/^\//, '')}`;
}

// ============================================================================
// TEMPLATE FACTORY: Orquestrador de Mensagens (App-Like Push Notifications)
// ============================================================================
function getEmailTemplate(type: string, data: any) {
  const { clientName, projectName, taskName, link, extraInfo, subject: customSubject, body: customBody } = data;
  const absoluteLink = formatAbsoluteUrl(link);
  
  // Variáveis padrão da interface do Card
  let subject = "Notificação do Sistema";
  let title = "Atualização";
  let message = "Existem novas informações na sua mesa de trabalho.";
  let buttonText = "Acessar o Sistema";
  let icon = "🔔"; // Ícone principal do Card

  switch (type) {
    // -------------------------------------------------------------
    // 0. SINTONIA & COMUNICAÇÃO CORPORATIVA
    // -------------------------------------------------------------
    case 'sintonia_mention':
      subject = `[Sintonia] ${clientName || 'Alguém'} mencionou você`;
      icon = "💬";
      title = "Você foi Mencionado";
      message = customBody || `<strong>${clientName || 'Um colaborador'}</strong> mencionou você na Sintonia: <em>"${extraInfo || 'Confira a mensagem no painel'}"</em>`;
      buttonText = "Abrir Sintonia";
      break;

    case 'sintonia_dm':
      subject = `[Sintonia] Mensagem Direta de ${clientName || 'Colega'}`;
      icon = "✉️";
      title = "Nova Mensagem Privada";
      message = customBody || `Você recebeu uma nova mensagem direta de <strong>${clientName || 'um colaborador'}</strong>: <em>"${extraInfo || 'Acesse para responder'}"</em>`;
      buttonText = "Responder na Sintonia";
      break;

    case 'sintonia_channel':
      subject = `[Sintonia] Mensagem em #${projectName || 'operacao-atelier'}`;
      icon = "📢";
      title = `Canal #${projectName || 'operacao-atelier'}`;
      message = customBody || `Existe uma nova mensagem prioritária no canal da equipe.`;
      buttonText = "Acessar Canal";
      break;

    case 'chat_activity':
      subject = `[Sintonia] Nova mensagem de ${clientName || "Colaborador"}`;
      icon = "💬";
      title = "Comunicação na Sintonia";
      message = customBody || `Há uma nova comunicação na Sintonia aguardando seu acompanhamento.`;
      buttonText = "Abrir Sintonia";
      break;

    // -------------------------------------------------------------
    // 1. NOTIFICAÇÕES PARA O CLIENTE
    // -------------------------------------------------------------
    case 'briefing_returned':
      subject = "Ação Necessária: Revisão Estratégica";
      icon = "📝";
      title = "Dossiê em Revisão";
      message = `A nossa equipe analisou o briefing submetido para <strong>${projectName}</strong>. Necessitamos do seu alinhamento em alguns pontos para calibrar o projeto com precisão.`;
      buttonText = "Rever Briefing";
      break;

    case 'contract_uploaded':
      subject = "Documento Liberado: Contrato";
      icon = "📄";
      title = "Contrato Disponível";
      message = `O documento legal referente ao projeto <strong>${projectName}</strong> foi processado e já se encontra trancado no seu Cofre Digital.`;
      buttonText = "Acessar Cofre";
      break;

    case 'new_direction':
      subject = "Nova Direção Visual Disponível";
      icon = "🎨";
      title = "Curadoria Visual";
      message = `A Direção de Arte definiu novas rotas criativas para a sua marca. Aceda ao portal para avaliar, pontuar e guiar os próximos passos.`;
      buttonText = "Avaliar Direção";
      break;

    case 'planning_approval':
      subject = "Aprovação Pendente: Planejamento";
      icon = "✍️";
      title = "Aprovação de Conteúdo";
      message = `A estratégia da entrega <strong>${taskName}</strong> foi forjada. Aguardamos a sua luz verde para movermos a peça para a esteira de design.`;
      buttonText = "Aprovar Planejamento";
      break;

    case 'project_delivered':
      subject = "O seu Projeto foi Concluído";
      icon = "📦";
      title = "Ativos Entregues";
      message = `A operação <strong>${projectName}</strong> foi finalizada com sucesso. Os ficheiros de alta resolução encontram-se disponíveis no seu cofre.`;
      buttonText = "Baixar Ativos Finais";
      break;

    case 'vault_new_asset':
      subject = "Novo Ativo no Cofre";
      icon = "💎";
      title = "Ficheiro Adicionado";
      message = `Um novo ativo visual foi guardado no seu Cofre de Identidade. Aceda para visualização ou download.`;
      buttonText = "Abrir Cofre";
      break;

    case 'project_archived':
      subject = "Acesso Encerrado: Projeto Arquivado";
      icon = "🔒";
      title = "Projeto Arquivado";
      message = `A operação foi oficialmente encerrada no nosso sistema. Agradecemos a confiança depositada no Atelier para forjar a sua marca.`;
      buttonText = "Ver o meu Legado";
      break;

    case 'project_reactivated':
      subject = "Operação Reativada";
      icon = "🔓";
      title = "Acesso Restaurado";
      message = `O projeto <strong>${projectName}</strong> voltou à nossa esteira. O seu acesso total ao Cockpit e mesa de trabalho foi reativado.`;
      buttonText = "Entrar no Cockpit";
      break;

    case 'community_approved_post':
      subject = "Publicação Aprovada na Comunidade";
      icon = "✅";
      title = "Partilha Pública";
      message = `A sua publicação foi validada pela nossa curadoria e encontra-se visível no mural do ecossistema.`;
      buttonText = "Ver na Comunidade";
      break;

    case 'community_interaction':
      subject = "Nova Interação no seu Post";
      icon = "💬";
      title = "Networking Ativo";
      message = `Alguém do ecossistema interagiu com a sua partilha recente. Mantenha as conexões ativas.`;
      buttonText = "Ver Interação";
      break;

    case 'b2b_interest':
      subject = "Interesse de Parceria B2B (Hub)";
      icon = "🤝";
      title = "Oportunidade B2B";
      message = `Foi detetado um novo sinal de interesse no seu Pitch de Negócios. Aceda ao Hub para iniciar as negociações.`;
      buttonText = "Ver Oportunidade";
      break;

    // -------------------------------------------------------------
    // 2. NOTIFICAÇÕES INTERNAS (ADMIN / GESTOR / EQUIPA)
    // -------------------------------------------------------------
    case 'admin_alert_briefing':
      subject = `[NOVO] Briefing: ${clientName}`;
      icon = "🎯";
      title = "Briefing Recebido";
      message = `O cliente <strong>${clientName}</strong> enviou o briefing.`;
      buttonText = "Analisar Dossiê";
      break;

    case 'upsell_accepted':
      subject = `[VENDA] Upsell: ${clientName}`;
      icon = "🔥";
      title = "Oportunidade";
      message = `O cliente <strong>${clientName}</strong> demonstrou interesse em novos serviços.`;
      buttonText = "Ver no CRM";
      break;

    case 'art_approved':
      subject = `[APROVADO] Arte: ${clientName}`;
      icon = "🟢";
      title = "Luz Verde";
      message = `O cliente <strong>${clientName}</strong> aprovou a direção visual.`;
      buttonText = "Avançar Projeto";
      break;

    case 'art_rejected':
      subject = `[RECUSADO] Arte: ${clientName}`;
      icon = "🛑";
      title = "Ajuste Necessário";
      message = `A entrega foi recusada. Verifique as anotações do cliente.`;
      buttonText = "Revisar Peça";
      break;

    case 'visual_pin_added':
      subject = `[FEEDBACK] Figma: ${clientName}`;
      icon = "📍";
      title = "Novo Pino Visual";
      message = `Um novo comentário foi adicionado diretamente na peça criativa.`;
      buttonText = "Ler Feedback";
      break;

    case 'fever_chart_alert':
      subject = `[RISCO] Alerta: ${projectName}`;
      icon = "⚠️";
      title = "Buffer Crítico";
      message = `Atenção ao consumo de horas em <strong>${projectName}</strong>.<br><br><span style="color:#f97316; font-size: 13px;">Detalhe: ${extraInfo}</span>`;
      buttonText = "Intervir";
      break;

    case 'task_feedback':
      subject = `[NOVO FEEDBACK] ${taskName}`;
      icon = "💬";
      title = "Feedback Adicionado";
      message = `A gestão ou o cliente adicionou um novo feedback na tarefa <strong>${taskName}</strong> do projeto <strong>${projectName || 'Projeto'}</strong>.`;
      buttonText = "Ver Tarefa";
      break;
      
    case 'task_overdue':
      subject = `[ATRASADA] Tarefa: ${taskName}`;
      icon = "⏰";
      title = "Atenção ao Prazo";
      message = `A tarefa <strong>${taskName}</strong> do projeto <strong>${projectName || 'Projeto'}</strong> está com o prazo expirado ou necessita de atualização imediata.`;
      buttonText = "Acessar Tarefa";
      break;

    // -------------------------------------------------------------
    // 3. MOTOR DINÂMICO (Para os alertas do NotificationEngine)
    // -------------------------------------------------------------
    case 'custom':
    case 'custom_collaborator':
      subject = customSubject || "Aviso do Sistema";
      icon = "⚡";
      title = customSubject || "Notificação";
      message = customBody || "Existem novas métricas ou alertas a necessitar da sua atenção.";
      buttonText = "Acessar Sistema";
      break;

    default:
      break;
  }

  // Prevenção: Limpa imagens em Base64 do corpo do e-mail
  if (typeof message === 'string') {
    message = message.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '[Imagem Ocultada no E-mail]');
  }

  // TEMPLATE HTML REFINADO (Design Executivo Studio Veronna)
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
            
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 440px; background-color: #ffffff; border-radius: 28px; box-shadow: 0 16px 40px rgba(0,0,0,0.06); border: 1px solid #ebe8e2; overflow: hidden;">
              
              <!-- Top Branding Bar -->
              <tr>
                <td style="padding: 24px 32px 0; border-bottom: 1px solid #f4f2ee;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="left" style="padding-bottom: 16px;">
                        <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #a45037;">STUDIO VERONNA</span>
                      </td>
                      <td align="right" style="padding-bottom: 16px;">
                        <span style="font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #a1a1aa; background-color: #f4f2ee; padding: 4px 10px; border-radius: 10px;">SINTONIA</span>
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
                  <p style="margin: 0; font-size: 14.5px; line-height: 1.6; color: #52525b;">
                    ${message}
                  </p>
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
                    Esta é uma notificação automática da central de operações Atelier.<br/>
                    <strong style="color: #71717a;">Studio Veronna</strong> &bull; Design Estratégico & Identidade
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

// ============================================================================
// MAIN HANDLER
// ============================================================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, type, clientName, projectName, taskName, link, extraInfo, subject: customSubject, body: customBody } = body;

    if (!to || !type) {
      return NextResponse.json({ error: 'Parâmetros "to" e "type" são obrigatórios.' }, { status: 400 });
    }

    // Remetente validado e oficial
    const fromEmail = 'Studio Veronna <sistema@lizdesign.com.br>'; 

    // Obtém o template (App-Like)
    const { subject, html } = getEmailTemplate(type, { 
      clientName, 
      projectName, 
      taskName, 
      link, 
      extraInfo, 
      subject: customSubject, 
      body: customBody 
    });

    const recipients = Array.isArray(to) ? to : [to];

    const { data, error: resendError } = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      subject: subject,
      html: html,
    });

    if (resendError) {
      console.error("[Notify API] Falha Resend:", resendError);
      return NextResponse.json({ error: resendError.message, details: resendError }, { status: 500 });
    }

    console.log(`[Notify API] E-mail do tipo '${type}' disparado com sucesso para ${recipients.length} destinatário(s): ${recipients.join(', ')}`);
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("[Notify API] Falha Crítica ao enviar e-mail:", error);
    return NextResponse.json({ error: error?.message || 'Erro de processamento interno ao enviar e-mail.' }, { status: 500 });
  }
}
