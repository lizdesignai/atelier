import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export class NotificationService {
  
  static getEmailTemplate(type: string, data: any) {
    const { clientName, projectName, taskName, link, extraInfo, subject: customSubject, body: customBody, taskId, collaboratorName, mediaUrl } = data;
    
    // Variáveis padrão da interface do Card
    let subject = "Notificação do Sistema";
    let title = "Atualização";
    let message = "Existem novas informações na sua mesa de trabalho.";
    let buttonText = "Acessar o Sistema";
    let icon = "🔔"; 
    let extraHtml = "";

    switch (type) {
      case 'internal_review':
        subject = `[REVISÃO] ${projectName} - ${taskName} por ${collaboratorName || 'Colaborador'}`;
        icon = "👀";
        title = "Revisão Interna";
        message = `O colaborador(a) <strong>${collaboratorName || 'Desconhecido'}</strong> finalizou a tarefa <strong>${taskName}</strong> do projeto/cliente <strong>${projectName}</strong> e enviou para revisão interna.`;
        buttonText = "Avaliar Tarefa no Cockpit";
        
        const backendUrl = process.env.BACKEND_URL || 'https://atelier-zwlt.onrender.com';
        const frontendUrl = process.env.FRONTEND_URL || 'https://atelier.lizdesign.com.br';
        
        extraHtml = `
          ${mediaUrl && !mediaUrl.includes('.pdf') ? `
          <div style="margin: 20px 0; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7;">
            <img src="${mediaUrl}" alt="Mídia Anexada" style="width: 100%; height: auto; display: block;" />
          </div>` : ''}
          <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 12px;">
            <a href="${backendUrl}/api/v1/tasks/${taskId}/email-action?action=approve" style="display: block; width: 100%; box-sizing: border-box; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 16px; border-radius: 12px; font-size: 14px; font-weight: bold; text-align: center;">
              ✅ APROVAR IMEDIATAMENTE
            </a>
            <a href="${frontendUrl}/admin/review/${taskId}" style="display: block; width: 100%; box-sizing: border-box; background-color: #fef2f2; color: #ef4444; border: 1px solid #fca5a5; text-decoration: none; padding: 16px; border-radius: 12px; font-size: 14px; font-weight: bold; text-align: center;">
              👀 REVISAR / SOLICITAR AJUSTE NA TAREFA
            </a>
          </div>
        `;
        break;

      case 'task_in_progress':
        subject = `[WORK] Tarefa Iniciada: ${taskName}`;
        icon = "▶️";
        title = "Trabalho Iniciado";
        message = `A tarefa <strong>${taskName}</strong> do projeto <strong>${projectName}</strong> acabou de entrar em progresso.`;
        buttonText = "Ver Tarefa";
        break;

      case 'task_paused':
        subject = `[WORK] Tarefa Pausada: ${taskName}`;
        icon = "⏸️";
        title = "Trabalho Pausado";
        message = `A tarefa <strong>${taskName}</strong> do projeto <strong>${projectName}</strong> foi pausada temporariamente.`;
        buttonText = "Ver Tarefa";
        break;

      case 'custom':
        subject = customSubject || "Aviso do Sistema";
        icon = "⚡";
        title = customSubject || "Notificação";
        message = customBody || "Existem novas métricas ou alertas a necessitar da sua atenção.";
        buttonText = "Acessar Dashboard";
        break;

      default:
        break;
    }

    if (typeof message === 'string') {
      message = message.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '[Imagem Ocultada no E-mail]');
    }

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
                    ${extraHtml}
                  </td>
                </tr>
                ${type !== 'internal_review' ? `
                <tr>
                  <td align="center" style="padding: 0 30px 40px;">
                    <a href="${link || 'https://atelier.lizdesign.com.br'}" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 18px 24px; border-radius: 14px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; text-align: center; transition: background-color 0.2s;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
                ` : ''}
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

  static async sendNotification(params: {
    to: string | string[],
    type: string,
    clientName?: string,
    projectName?: string,
    taskName?: string,
    link?: string,
    extraInfo?: string,
    subject?: string,
    body?: string,
    taskId?: string,
    collaboratorName?: string,
    mediaUrl?: string
  }) {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.log('[NotificationService] Simulação de envio (RESEND_API_KEY não definida)', params.type);
        return { success: true, simulated: true };
      }

      const { subject, html } = this.getEmailTemplate(params.type, params);
      const recipients = Array.isArray(params.to) ? params.to : [params.to];
      const fromEmail = 'LizDesign <sistema@lizdesign.com.br>'; 

      const data = await resend.emails.send({
        from: fromEmail,
        to: recipients,
        subject: subject,
        html: html,
      });

      console.log(`[NotificationService] E-mail do tipo '${params.type}' disparado com sucesso para ${recipients.length} destinatário(s).`);
      return { success: true, data };
    } catch (error: any) {
      console.error("[NotificationService] Falha Crítica ao enviar e-mail:", error.message);
      return { success: false, error: error.message };
    }
  }
}
