// src/app/api/notify/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// TEMPLATE FACTORY: Orquestrador de Mensagens (App-Like Push Notifications)
// ============================================================================
function getEmailTemplate(type: string, data: any) {
  const { clientName, projectName, taskName, link, extraInfo, subject: customSubject, body: customBody } = data;
  
  // Variáveis padrão da interface do Card
  let subject = "Notificação do Sistema";
  let title = "Atualização";
  let message = "Existem novas informações na sua mesa de trabalho.";
  let buttonText = "Acessar o Sistema";
  let icon = "🔔"; // Ícone principal do Card

  switch (type) {
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

    case 'chat_activity':
      subject = `[Sintonia] Mensagem de ${clientName || "Colaborador"}`;
      icon = "💬";
      title = "Nova Mensagem";
      message = `Há uma nova comunicação na Sintonia aguardando sua resposta.`;
      buttonText = "Abrir Sintonia";
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

  // 🟢 PREVENÇÃO: Limpa imagens em Base64 do corpo do e-mail (evita strings de 30kb+ vazando)
  if (typeof message === 'string') {
    message = message.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '[Imagem Ocultada no E-mail]');
  }

  // 🟢 TEMPLATE HTML "APP-LIKE" (Estilo Notificação Push do iOS/macOS)
  const html = `
    <!DOCTYPE html>
    <html lang="pt-PT">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 420px; background-color: #ffffff; border-radius: 24px; box-shadow: 0 12px 32px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; overflow: hidden;">
              
              <tr>
                <td align="center" style="padding: 40px 30px 16px;">
                  <div style="display: inline-block; width: 56px; height: 56px; border-radius: 18px; background-color: #fcf4ef; border: 1px solid #f8e5d7; font-size: 26px; line-height: 56px; text-align: center; margin-bottom: 20px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                    ${icon}
                  </div>
                  <h1 style="margin: 0; font-size: 22px; color: #18181b; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2;">
                    ${title}
                  </h1>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 0 30px 32px;">
                  <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #52525b;">
                    ${message}
                  </p>
                </td>
              </tr>
              
              <tr>
                <td align="center" style="padding: 0 30px 40px;">
                  <a href="${link || 'https://atelier.lizdesign.com.br'}" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 18px 24px; border-radius: 14px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; text-align: center; transition: background-color 0.2s;">
                    ${buttonText}
                  </a>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 20px; background-color: #fafafa; border-top: 1px solid #f4f4f5;">
                  <p style="margin: 0; font-size: 10px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                    Liz Design &nbsp;&bull;&nbsp;
                  </p>
                </td>
              </tr>

            </table>
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
    const fromEmail = 'LizDesign <sistema@lizdesign.com.br>'; 

    // Obtém o template (App-Like)
    const { subject, html } = getEmailTemplate(type, { clientName, projectName, taskName, link, extraInfo, subject: customSubject, body: customBody });

    // 🟢 Correção de Arquitetura: Transforma sempre em Array para o disparo em lote
    const recipients = Array.isArray(to) ? to : [to];

    const data = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      subject: subject,
      html: html,
    });

    console.log(`[Notify API] E-mail do tipo '${type}' disparado com sucesso para ${recipients.length} destinatário(s).`);
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("[Notify API] Falha Crítica ao enviar e-mail:", error);
    return NextResponse.json({ error: 'Erro de processamento interno ao enviar e-mail.' }, { status: 500 });
  }
}