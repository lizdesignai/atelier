// src/app/api/notify/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// TEMPLATE FACTORY: Orquestrador de Mensagens
// ============================================================================
function getEmailTemplate(type: string, data: any) {
  const { clientName, projectName, taskName, link, extraInfo } = data;
  let subject = "Notificação do Atelier";
  let title = "Olá!";
  let message = "Você tem uma nova atualização no sistema.";
  let buttonText = "Aceder ao Portal";

  switch (type) {
    // -------------------------------------------------------------
    // 1. NOTIFICAÇÕES PARA O CLIENTE
    // -------------------------------------------------------------
    case 'briefing_returned':
      subject = "Ação Necessária: Revisão do seu Dossiê Estratégico";
      title = `Olá, ${clientName}`;
      message = `A nossa equipa analisou o briefing enviado para o projeto <strong>${projectName}</strong> e precisamos que faça algumas revisões ou complemente informações para garantirmos a excelência do resultado.`;
      buttonText = "Rever Briefing";
      break;

    case 'contract_uploaded':
      subject = "Documento Disponível: Contrato do Projeto";
      title = `Olá, ${clientName}`;
      message = `O contrato oficial do projeto <strong>${projectName}</strong> já está disponível de forma segura no seu Cofre Digital.`;
      buttonText = "Ver Contrato";
      break;

    case 'new_direction':
      subject = "Nova Direção Visual Disponível para Avaliação";
      title = `Olá, ${clientName}`;
      message = `A Direção de Arte do Atelier acabou de disponibilizar novas rotas visuais para o projeto <strong>${projectName}</strong>. Aceda à sua mesa de trabalho para avaliar e pontuar.`;
      buttonText = "Avaliar Direção Visual";
      break;

    case 'planning_approval':
      subject = "Aprovação Pendente: Planeamento de Conteúdo";
      title = `Olá, ${clientName}`;
      message = `A estratégia e o copy da sua nova campanha/post (<strong>${taskName}</strong>) foram forjados e aguardam a sua aprovação final para seguirem para a esteira de design.`;
      buttonText = "Aprovar Conteúdo";
      break;

    case 'project_delivered':
      subject = "✨ O seu Projeto foi Entregue!";
      title = `Parabéns, ${clientName}!`;
      message = `O projeto <strong>${projectName}</strong> foi marcado como entregue. Todos os ativos finais estão no seu cofre. Terá acesso à sua Mesa de Trabalho por mais 15 dias antes de o projeto ser movido para o Arquivo de Legado.`;
      buttonText = "Aceder aos Ativos Finais";
      break;

    // -------------------------------------------------------------
    // 2. NOTIFICAÇÕES INTERNAS (ADMIN / GESTOR / EQUIPA)
    // -------------------------------------------------------------
    case 'admin_alert_briefing':
      subject = `[SISTEMA] Briefing Submetido: ${clientName}`;
      title = "Atualização de Projeto";
      message = `O cliente <strong>${clientName}</strong> concluiu o preenchimento do Briefing Oficial. A IA do CBO já está pronta para gerar o diagnóstico.`;
      buttonText = "Analisar Dossiê";
      break;

    case 'diary_mention':
      subject = `[COMUNIDADE] Nova atividade no Diário de Bordo`;
      title = "Atualização Diária";
      message = `Houve uma nova movimentação ou reporte no Diário de Bordo do projeto <strong>${projectName}</strong>. Acompanhe a comunicação e evolução da entrega.`;
      buttonText = "Ler Diário de Bordo";
      break;

    case 'fever_chart_alert':
      subject = `🔴 [RISCO CRÍTICO] Fever Chart: ${projectName}`;
      title = "Alerta de Operação";
      message = `O sistema detetou um consumo crítico do Buffer de Segurança no projeto <strong>${projectName}</strong>. <br><br><em>Anotação do Motor: ${extraInfo}</em>`;
      buttonText = "Intervir no Projeto";
      break;

    case 'evm_alert':
      subject = `⚙️ [CALIBRAÇÃO] Desvio de Unidade Económica`;
      title = "Auditoria de EVM";
      message = `O motor Lean detetou um desvio de performance estrutural na esteira de produção para a tarefa <strong>${taskName}</strong>. <br><br><em>Relatório: ${extraInfo}</em>`;
      buttonText = "Verificar Analytics";
      break;

    default:
      break;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9f9f9; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #FEF5E6; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); max-width: 600px; width: 100%;">
              
              <!-- HEADER -->
              <tr>
                <td align="center" style="padding: 40px 20px 20px; border-bottom: 1px solid rgba(92, 75, 60, 0.1);">
                  <h1 style="margin: 0; color: #5c4b3c; font-size: 24px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase;">Atelier OS</h1>
                </td>
              </tr>

              <!-- BODY -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px; color: #8c6e54; font-size: 20px;">${title}</h2>
                  <p style="margin: 0 0 30px; color: #5c4b3c; font-size: 15px; line-height: 1.6; opacity: 0.9;">
                    ${message}
                  </p>
                  
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center">
                        <a href="${link || 'https://lizdesign.com.br'}" style="display: inline-block; background-color: #5c4b3c; color: #FEF5E6; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 1.5px;">
                          ${buttonText}
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td align="center" style="padding: 20px; background-color: rgba(92, 75, 60, 0.03); border-top: 1px solid rgba(92, 75, 60, 0.1);">
                  <p style="margin: 0; color: #5c4b3c; font-size: 11px; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px;">
                    Mensagem automática gerada pelo Motor de Operações do Atelier.
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
    const { to, type, clientName, projectName, taskName, link, extraInfo } = body;

    if (!to || !type) {
      return NextResponse.json({ error: 'Parâmetros "to" e "type" são obrigatórios.' }, { status: 400 });
    }

    // Domínio oficial já validado no Registro.br
    const fromEmail = 'Atelier LizDesign <sistema@lizdesign.com.br>'; 

    // Obtém o template compilado com a lógica de negócio
    const { subject, html } = getEmailTemplate(type, { clientName, projectName, taskName, link, extraInfo });

    const data = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: html,
    });

    console.log(`[Notify API] E-mail do tipo '${type}' disparado com sucesso para ${to}.`);
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("[Notify API] Falha Crítica ao enviar e-mail:", error);
    return NextResponse.json({ error: 'Erro de processamento interno ao enviar e-mail.' }, { status: 500 });
  }
}