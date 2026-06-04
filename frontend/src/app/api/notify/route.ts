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
      message = `A Direção de Arte do Atelier acabou de disponibilizar novas rotas criativas para a sua marca. Aceda à sua mesa de trabalho para avaliar e pontuar.`;
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

    case 'vault_new_asset':
      subject = "📦 Novo Ativo no Cofre";
      title = `Olá, ${clientName}`;
      message = `O Atelier adicionou um novo ficheiro de alta resolução ao seu Cofre de Ativos. Acesse para efetuar o download.`;
      buttonText = "Abrir Cofre";
      break;

    case 'project_archived':
      subject = "🔒 Acesso Fechado: Projeto Arquivado";
      title = `Olá, ${clientName}`;
      message = `O seu projeto foi oficialmente arquivado no nosso sistema e o seu acesso ao estúdio foi revogado. Agradecemos por confiar a sua marca ao Atelier.`;
      buttonText = "Ver o meu Legado";
      break;

    case 'project_reactivated':
      subject = "🔓 Operação Reativada";
      title = `Bem-vindo de volta, ${clientName}`;
      message = `O seu projeto voltou a ficar ativo nas nossas mesas. O seu acesso total ao Cockpit foi restaurado.`;
      buttonText = "Aceder ao Cockpit";
      break;

    case 'community_approved_post':
      subject = "✅ A sua Partilha foi Aprovada!";
      title = `Olá, ${clientName}`;
      message = `A sua publicação foi validada pela nossa equipa e já está visível no mural da Comunidade.`;
      buttonText = "Ver na Comunidade";
      break;

    case 'community_interaction':
      subject = "🔔 Nova Interação na sua Publicação";
      title = `Olá, ${clientName}`;
      message = `Alguém reagiu ou comentou na sua partilha recente na Comunidade do Atelier. Acesse para manter o networking ativo.`;
      buttonText = "Ver Interações";
      break;

    case 'b2b_interest':
      subject = "🤝 Novo Interesse de Parceria B2B!";
      title = `Olá, ${clientName}`;
      message = `Um membro da nossa comunidade manifestou interesse no seu Pitch no Hub de Negócios. Aceda ao portal para entrar em contacto.`;
      buttonText = "Ver Oportunidade";
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

    case 'upsell_accepted':
      subject = `🔥 [BOILING LEAD] Upsell Solicitado: ${clientName}`;
      title = "Novo Sinal de Escala";
      message = `O cliente <strong>${clientName}</strong> avaliou a entrega positivamente no T-NPS e clicou para delegar/escalar os serviços (Gestão de Instagram). Entre em contacto IMEDIATO.`;
      buttonText = "Abrir CRM / Cliente";
      break;

    case 'art_approved':
      subject = `✅ [CURADORIA] Arte Aprovada: ${clientName}`;
      title = "Luz Verde";
      message = `O cliente <strong>${clientName}</strong> efetuou um Double Tap e aprovou a peça visual no Fluxo de Impacto. A arte está pronta para agendamento.`;
      buttonText = "Avançar Operação";
      break;

    case 'art_rejected':
      subject = `❌ [CURADORIA] Arte Recusada: ${clientName}`;
      title = "Atenção da Direção de Arte";
      message = `O cliente <strong>${clientName}</strong> recusou uma peça criativa. É necessário rever as diretrizes e alinhar um novo conceito.`;
      buttonText = "Ver Peça Devolvida";
      break;

    case 'visual_pin_added':
      subject = `📍 [MODO FIGMA] Novo Apontamento Visual: ${clientName}`;
      title = "Revisão Solicitada";
      message = `O cliente <strong>${clientName}</strong> adicionou um pino (apontamento) na arte gráfica solicitando uma alteração específica.`;
      buttonText = "Ler Feedback Visual";
      break;

    case 'direction_evaluated':
      subject = `📝 [BRANDBOOK] Direção Avaliada: ${clientName}`;
      title = "Calibragem Estética";
      message = `O cliente <strong>${clientName}</strong> submeteu a sua pontuação e feedback sobre uma Direção Visual.`;
      buttonText = "Ver Pontuação";
      break;

    case 'moodboard_reference_added':
      subject = `📸 [BRANDBOOK] Nova Referência Adicionada`;
      title = "Atualização de Moodboard";
      message = `O cliente <strong>${clientName}</strong> carregou uma nova imagem inspiracional para o seu Cofre de Sinapses.`;
      buttonText = "Analisar Referência";
      break;

    case 'client_profile_updated':
      subject = `📝 [CRM] Dados Atualizados: ${clientName}`;
      title = "Atualização de Cadastro";
      message = `O cliente <strong>${clientName}</strong> atualizou os seus dados fiscais, de contacto ou de perfil (Instagram) nas Configurações.`;
      buttonText = "Abrir Perfil";
      break;

    case 'chat_activity':
      subject = `💬 [CANAIS] Nova Mensagem / Anexo de ${clientName}`;
      title = "Comunicação Ativa";
      message = `O cliente enviou uma nova mensagem ou ficheiro nos canais de comunicação do projeto.`;
      buttonText = "Responder ao Cliente";
      break;

    case 'community_pending_post':
      subject = `📝 [COMUNIDADE] Moderação Necessária`;
      title = "Nova Publicação Submetida";
      message = `Um cliente enviou uma publicação para o mural da comunidade e aguarda a sua aprovação para ficar pública.`;
      buttonText = "Moderar Publicação";
      break;

    case 'b2b_new_pitch':
      subject = `🤝 [HUB B2B] Novo Pitch Adicionado`;
      title = "Networking Ativo";
      message = `Um membro do ecossistema publicou uma nova oferta ou procura no Hub de Negócios. Acompanhe a movimentação da rede.`;
      buttonText = "Ver Hub B2B";
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
              
              <tr>
                <td align="center" style="padding: 40px 20px 20px; border-bottom: 1px solid rgba(92, 75, 60, 0.1);">
                  <h1 style="margin: 0; color: #5c4b3c; font-size: 24px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase;">Atelier OS</h1>
                </td>
              </tr>

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