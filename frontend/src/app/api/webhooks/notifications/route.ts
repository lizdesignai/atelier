// src/app/api/webhooks/notifications/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getDb } from '@/lib/db';
import { getActiveManagers } from '@/lib/serverNotifications';
import { isValidRealEmail, STUDIO_VERONNA_FROM } from '@/lib/resend';

const ADMIN_EMAIL = 'lizsacramentosa@gmail.com';
const FROM_EMAIL = STUDIO_VERONNA_FROM; 
const LOGO_URL = 'https://atelier.lizdesign.com.br/images/simbolo-rosa.png';

interface ProfileData { 
  id: string;
  nome: string; 
  email: string; 
  role?: string; 
  avatar_url?: string;
}

// ============================================================================
// 🧠 MOTOR DE NOTIFICAÇÕES (Mensagens Diretas, Assertivas e Afetuosas)
// ============================================================================
const getRandomCopy = (options: string[]) => options[Math.floor(Math.random() * options.length)];

// 🎯 PARA CLIENTES: APROVAÇÕES E SOLICITAÇÕES
const copyClientPostReady = (name: string) => getRandomCopy([
  `Oi, ${name}! Sua nova arte está pronta no Cockpit para aprovação. ✨`,
  `${name}, liberamos uma nova peça para sua avaliação no painel. 🎨`,
  `Nova arte disponível, ${name}! Acesse o Cockpit para conferir e aprovar. 🚀`
]);

const copyClientPlanReady = (name: string) => getRandomCopy([
  `Oi, ${name}! O planejamento de conteúdo do mês está pronto para sua aprovação. 🗺️`,
  `${name}, seu calendário estratégico está disponível para revisão no Cockpit. 🎯`
]);

const copyClientNeedBriefing = (name: string) => getRandomCopy([
  `Oi, ${name}! Seu briefing estratégico aguarda preenchimento no painel. 📝`,
  `${name}, precisamos das suas respostas no briefing para iniciar a criação. ✨`
]);

const copyClientReminder2H = (name: string) => getRandomCopy([
  `Lembrete rápido, ${name}: você tem uma aprovação pendente no Cockpit. ⏱️`,
  `Oi, ${name}! Falta só a sua validação no painel para seguirmos com a produção. 🚀`
]);

// 🛠️ PARA EQUIPE: TAREFAS, ATRASOS, CELEBRAÇÕES E FEEDBACKS
const copyTeamTaskUrgent = (title: string) => getRandomCopy([
  `Demanda urgente na sua fila: "${title}". Prioridade máxima no Kanban. 🔥`,
  `Atenção: a tarefa "${title}" entrou com prioridade alta para hoje. ⚡`
]);

const copyTeamTaskNew = (title: string) => getRandomCopy([
  `Nova tarefa atribuída a você: "${title}". Confira no Kanban. 🎯`,
  `Você tem uma nova entrega na esteira: "${title}". 🛠️`
]);

const copyTeamOverdue = (title: string) => getRandomCopy([
  `A tarefa "${title}" ultrapassou o prazo. Atualize o status ou sinalize bloqueios. ⏰`,
  `Prazo expirado em "${title}". Ajuste a previsão de entrega no Kanban. 🔄`
]);

const copyTeamPraise = (title: string) => getRandomCopy([
  `Entrega de "${title}" aprovada e finalizada com sucesso. Parabéns! 🏆`,
  `A entrega de "${title}" foi validada pela liderança. Ótimo trabalho! ✨`
]);

const copyTeamReview = (title: string, assigneeName: string) => getRandomCopy([
  `${assigneeName} enviou a tarefa "${title}" para sua revisão interna. 👁️`,
  `Revisão pendente: "${title}" (${assigneeName}) aguarda seu aval no Kanban. 📋`
]);

const copyTeamRevision = (title: string) => getRandomCopy([
  `Ajuste solicitado em "${title}". Veja as instruções no card. 🛠️`,
  `Há novos apontamentos na entrega de "${title}". Confira no Kanban. 📝`
]);

const copyClientFeedback = (projectName: string) => getRandomCopy([
  `O cliente de ${projectName} solicitou ajustes na peça. Veja os apontamentos no card. 📝`,
  `Novo feedback do cliente em ${projectName}: ajustes solicitados. 🔄`
]);

// ============================================================================
// TEMPLATE ENGINE (Push Notifications Estilo App Nativo)
// ============================================================================
function buildAppLikeEmail(avatarOrIcon: string, title: string, message: string, buttonText: string, link: string) {
  const renderVisual = avatarOrIcon.startsWith('http') || avatarOrIcon.startsWith('/')
    ? `<img src="${avatarOrIcon}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 18px;" alt="Avatar" />`
    : avatarOrIcon;

  // 🟢 PREVENÇÃO: Limpa imagens em Base64 do corpo do e-mail (evita strings de 30kb+ vazando)
  if (typeof message === 'string') {
    message = message.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '[Imagem Ocultada no E-mail]');
  }

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
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
                    ${renderVisual}
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
                  <a href="${link}" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 18px 24px; border-radius: 14px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; text-align: center; transition: background-color 0.2s;">
                    ${buttonText}
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 20px; background-color: #fafafa; border-top: 1px solid #f4f4f5;">
                  <p style="margin: 0; font-size: 10px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                    Studio Veronna </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Sub-rotina de Disparo com Auditoria Integrada
async function sendEmailSafely(resend: Resend, to: string, subject: string, html: string, tag: string) {
  try {
    let recipients: string[] = [to];
    if (to === ADMIN_EMAIL || to === 'lizbranddesign@gmail.com') {
      const managers = await getActiveManagers().catch(() => []);
      if (managers.length > 0) {
        recipients = managers.map((m) => m.email).filter(Boolean);
      }
    }
    const validRecipients = Array.from(new Set(recipients)).filter(isValidRealEmail);
    if (validRecipients.length === 0) return;

    console.log(`[Resend: ${tag}] Enviando pulso para: ${validRecipients.join(', ')}`);
    const response = await resend.emails.send({ from: FROM_EMAIL, to: validRecipients, subject, html });
    if (response.error) {
      console.error(`[Resend: ${tag}] Rejeição da API:`, response.error);
    } else {
      console.log(`[Resend: ${tag}] Sucesso! ID da Operação:`, response.data?.id);
    }
  } catch (error) {
    console.error(`[Resend: ${tag}] Falha Crítica de Runtime:`, error);
  }
}

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================
export async function POST(request: Request) {
  console.log("=======================================================");
  console.log("[WEBHOOK AUDIT] Operação recebida pelo Gateway de Notificações.");
  
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const sql = getDb();

    const payload = await request.json();
    const { table, type, record, old_record, custom_event } = payload;
    
    console.log(`[WEBHOOK AUDIT] Tabela: [${table}] | Evento: [${type}]`);

    const portalUrl = 'https://atelier.lizdesign.com.br';

    // Extratores Dinâmicos
    const getClientProfile = async (projectId: string): Promise<ProfileData | null> => {
      if (!projectId) return null;
      try {
        const result = await (sql as any).query(`
          SELECT pr.id, pr.nome, pr.email
          FROM projects p
          LEFT JOIN profiles pr ON p.client_id = pr.id
          WHERE p.id = $1
          LIMIT 1
        `, [projectId]);
        if (result && result.length > 0) return result[0] as ProfileData;
      } catch (err) {
        console.error('[Webhook] getClientProfile error:', err);
      }
      return null;
    };

    const getUserProfile = async (userId: string): Promise<ProfileData | null> => {
      if (!userId) return null;
      try {
        const result = await (sql as any).query(`
          SELECT id, nome, email, avatar_url, role FROM profiles WHERE id = $1 LIMIT 1
        `, [userId]);
        if (result && result.length > 0) return result[0] as ProfileData;
      } catch (err) {
        console.error('[Webhook] getUserProfile error:', err);
      }
      return null;
    };

    // =========================================================================
    // 0. GATILHOS DE TEMPO (Via Cron Payload Customizado)
    // =========================================================================
    if (type === 'CRON_REMINDER') {
      const { entityType, entityId, targetUserId, reminderType, title } = payload;
      const user = await getUserProfile(targetUserId);
      
      if (user?.email) {
        if (reminderType === 'client_2h_approval') {
          await sendEmailSafely(resend, user.email, `Lembrete: Aprovação Pendente ⏱️`, buildAppLikeEmail(LOGO_URL, "Aprovação Pendente", copyClientReminder2H(user.nome.split(' ')[0]), "Abrir Cockpit", portalUrl), "Cron Client 2H");
        } else if (reminderType === 'team_task_overdue') {
          await sendEmailSafely(resend, user.email, `Prazo Expirado: ${title} ⏰`, buildAppLikeEmail("⏰", "Tarefa em Atraso", copyTeamOverdue(title), "Ver no Kanban", `${portalUrl}/admin/jtbd`), "Cron Team Overdue");
        }
      }
      return NextResponse.json({ success: true, message: "Lembretes processados." });
    }

    // =========================================================================
    // 1. MENSAGENS DE CHAT
    // =========================================================================
    if (table === 'messages' && type === 'INSERT') {
      const sender = await getUserProfile(record.sender_id);
      if (!sender) return NextResponse.json({ success: true });

      const channelResult = await (sql as any).query(
        `SELECT project_id, is_private, type, name FROM channels WHERE id = $1 LIMIT 1`,
        [record.channel_id]
      );
      const channel = channelResult?.[0] || null;
      if (!channel) return NextResponse.json({ success: true });

      const senderName = sender.nome.split(' ')[0];
      const msgSnippet = record.text_content && record.text_content.trim() !== "" 
        ? (record.text_content.length > 60 ? `"${record.text_content.substring(0, 60)}..."` : `"${record.text_content}"`)
        : "[Enviou um anexo]";

      const emailSubject = `💬 ${senderName}: ${msgSnippet}`;
      const emailBody = `<strong>${senderName}</strong>: ${msgSnippet}`;
      const avatar = sender.avatar_url || LOGO_URL;

      if (channel.type === 'dm') {
        const recipientId = channel.name.replace('dm_', '').split('_').find((id: string) => id !== record.sender_id);
        const recipient = await getUserProfile(recipientId!);
        if (recipient?.email) {
          await sendEmailSafely(resend, recipient.email, emailSubject, buildAppLikeEmail(avatar, "Mensagem Direta", emailBody, "Responder", `${portalUrl}/admin/inbox`), "Chat DM");
        }
      } else if (channel.type === 'corporate_global' && sender.role !== 'admin') {
        await sendEmailSafely(resend, ADMIN_EMAIL, emailSubject, buildAppLikeEmail(avatar, "Studio Veronna", emailBody, "Ir para o Chat", `${portalUrl}/admin/inbox`), "Chat");
      } else if (!channel.is_private) {
        const client = channel.project_id ? await getClientProfile(channel.project_id) : null;
        const isSenderTeam = ['admin', 'gestor', 'colaborador'].includes(sender.role?.toLowerCase() || '');
        
        if (!isSenderTeam) {
          await sendEmailSafely(resend, ADMIN_EMAIL, emailSubject, buildAppLikeEmail(avatar, "Canal do Projeto", emailBody, "Abrir Conversa", `${portalUrl}/admin/inbox`), "Chat Cliente->Agencia");
        } else if (client?.email) {
          await sendEmailSafely(resend, client.email, emailSubject, buildAppLikeEmail(avatar, "Nova Atualização", emailBody, "Acessar Painel", `${portalUrl}/canais`), "Chat Agencia->Cliente");
        }
      }
    }

    // =========================================================================
    // 2. KANBAN & DEMANDAS DIÁRIAS (Tarefas e Roteamento de Equipe)
    // =========================================================================
    if (table === 'tasks') {
      const taskTitle = record.title || "Demanda do Studio Veronna";
      
      if (type === 'INSERT' && record.assigned_to) {
        const assignee = await getUserProfile(record.assigned_to);
        if (assignee?.email) {
          const copy = record.urgency ? copyTeamTaskUrgent(taskTitle) : copyTeamTaskNew(taskTitle);
          const icon = record.urgency ? "🔥" : LOGO_URL;
          await sendEmailSafely(resend, assignee.email, record.urgency ? `🔥 Urgente: ${taskTitle}` : `🎯 Nova Demanda: ${taskTitle}`, buildAppLikeEmail(icon, "Demanda Atribuída", copy, "Abrir no Kanban", `${portalUrl}/admin/jtbd`), "Task Insert");
        }
      }

      if (type === 'UPDATE' && old_record) {
        // Movida para Revisão Interna
        if (old_record.status !== 'review' && record.status === 'review') {
          let assigneeName = "O Colaborador";
          if (record.assigned_to) {
            const assigneeProfile = await getUserProfile(record.assigned_to);
            if (assigneeProfile) assigneeName = assigneeProfile.nome.split(' ')[0];
          }

          await sendEmailSafely(
            resend, 
            ADMIN_EMAIL, 
            `👀 Revisão Pendente: ${taskTitle}`, 
            buildAppLikeEmail(LOGO_URL, "Revisão Interna", copyTeamReview(taskTitle, assigneeName), "Revisar no Kanban", `${portalUrl}/admin/jtbd`), 
            "Task Review"
          );
        }
        
        // Tarefa Concluída / Aprovada
        if (old_record.status !== 'completed' && record.status === 'completed') {
          if (record.assigned_to) {
            const assignee = await getUserProfile(record.assigned_to);
            if (assignee?.email && assignee.email !== ADMIN_EMAIL) {
              await sendEmailSafely(resend, assignee.email, `🏆 Concluída: ${taskTitle}`, buildAppLikeEmail("🏆", "Entrega Validada", copyTeamPraise(taskTitle), "Ver Minha Fila", `${portalUrl}/admin/jtbd`), "Task Completed Praise");
            }
          }

          // Confirmação para o Admin
          await sendEmailSafely(
            resend, 
            ADMIN_EMAIL, 
            `✅ Concluída: ${taskTitle}`, 
            buildAppLikeEmail(
              "✅", 
              "Tarefa Finalizada", 
              `A tarefa <strong>"${taskTitle}"</strong> foi aprovada e arquivada como concluída.`, 
              "Acessar Kanban", 
              `${portalUrl}/admin/jtbd`
            ), 
            "Task Completed Admin Confirmation"
          );
        }

        // Admin/Cliente pediu alteração na Tarefa (Feedback)
        if (old_record.admin_feedback !== record.admin_feedback && record.admin_feedback && record.assigned_to) {
          const assignee = await getUserProfile(record.assigned_to);
          if (assignee?.email) {
            await sendEmailSafely(resend, assignee.email, `🛠️ Ajuste Solicitado: ${taskTitle}`, buildAppLikeEmail("🛠️", "Ajuste Necessário", copyTeamRevision(taskTitle) + `<br><br><strong>Instrução:</strong> "${record.admin_feedback}"`, "Ajustar no Kanban", `${portalUrl}/admin/jtbd`), "Task Feedback");
          }
        }
      }
    }

    // =========================================================================
    // 3. SOCIAL POSTS (Aprovações de Arte no Cockpit)
    // =========================================================================
    if (table === 'social_posts' && type === 'UPDATE' && old_record) {
      const client = await getClientProfile(record.project_id);
      const clientName = client?.nome.split(' ')[0] || 'Cliente';

      if (old_record.status !== 'pending_approval' && record.status === 'pending_approval' && client?.email) {
        await sendEmailSafely(resend, client.email, `Nova arte disponível para aprovação ✨`, buildAppLikeEmail(LOGO_URL, "Aprovação de Arte", copyClientPostReady(clientName), "Avaliar no Cockpit", portalUrl), "Post Pending");
      }

      if (old_record.status !== 'needs_revision' && record.status === 'needs_revision') {
        const projResult = await (sql as any).query(
          `SELECT pr.nome FROM projects p LEFT JOIN profiles pr ON p.client_id = pr.id WHERE p.id = $1 LIMIT 1`,
          [record.project_id]
        );
        const pName = projResult?.[0]?.nome || null;
        
        await sendEmailSafely(resend, ADMIN_EMAIL, `🔄 Ajuste Solicitado: ${pName || 'Cliente'}`, buildAppLikeEmail("📝", "Ajuste pelo Cliente", copyClientFeedback(pName || "Cliente"), "Ver Detalhes", `${portalUrl}/admin/jtbd`), "Post Rejected");
      }

      if (old_record.status !== 'approved' && record.status === 'approved') {
        await sendEmailSafely(resend, ADMIN_EMAIL, `✅ Arte aprovada pelo cliente!`, buildAppLikeEmail("🎉", "Peça Aprovada", `O cliente aprovou a arte final no Cockpit.`, "Ver no Kanban", `${portalUrl}/admin/gestao`), "Post Approved");
      }
    }

    // =========================================================================
    // 4. PLANEJAMENTO MENSAL E BRIEFING (Documentos e Diretrizes)
    // =========================================================================
    if (table === 'content_planning' && type === 'UPDATE' && old_record) {
      const client = await getClientProfile(record.project_id);
      const clientName = client?.nome.split(' ')[0] || 'Cliente';

      if (old_record.status !== 'awaiting_approval' && record.status === 'awaiting_approval' && client?.email) {
        await sendEmailSafely(resend, client.email, `Planejamento disponível para aprovação 🗺️`, buildAppLikeEmail(LOGO_URL, "Planejamento Mensal", copyClientPlanReady(clientName), "Revisar no Cockpit", portalUrl), "Plan Pending");
      }
      if (old_record.status !== 'needs_revision' && record.status === 'needs_revision') {
        await sendEmailSafely(resend, ADMIN_EMAIL, `🔄 Ajuste no Planejamento: ${clientName}`, buildAppLikeEmail("📝", "Ajuste no Planejamento", `O cliente solicitou revisão no planejamento mensal:<br><br>"${record.feedback}"`, "Ver Ajustes", `${portalUrl}/admin/analytics`), "Plan Rejected");
      }
    }

    if (table === 'client_briefings') {
      const clientName = record.answers?.nome || 'Cliente';
      const clientEmail = record.answers?.email;

      if (type === 'INSERT') {
        await sendEmailSafely(resend, ADMIN_EMAIL, `🎯 Briefing Preenchido: ${clientName}`, buildAppLikeEmail("🎯", "Briefing Recebido", `O cliente <strong>${clientName}</strong> concluiu o preenchimento do briefing.`, "Ver Briefing", `${portalUrl}/admin`), "Briefing Admin");
        if (clientEmail) await sendEmailSafely(resend, clientEmail, `Briefing Recebido — Studio Veronna`, buildAppLikeEmail("📝", "Briefing Recebido", `Recebemos suas respostas estratégicas. A equipe já iniciou o planejamento do seu projeto.`, "Acessar Painel", portalUrl), "Briefing Cliente");
      }

      if (type === 'UPDATE' && old_record && old_record.is_completed !== record.is_completed && record.is_completed === false) {
        const clientProfile = await getClientProfile(record.project_id);
        if (clientProfile?.email) {
          await sendEmailSafely(resend, clientProfile.email, `Briefing: precisamos de detalhes complementares 🔍`, buildAppLikeEmail(LOGO_URL, "Ajuste no Briefing", copyClientNeedBriefing(clientProfile.nome.split(' ')[0]), "Completar Briefing", portalUrl), "Briefing Review Needed");
        }
      }
    }

    // =========================================================================
    // 5. MISSÕES DO COFRE E HUB (Novas Solicitações e Networking)
    // =========================================================================
    if (table === 'asset_missions' && type === 'INSERT') {
      const client = await getClientProfile(record.project_id);
      if (client?.email) {
        await sendEmailSafely(resend, client.email, `Novo material solicitado para o projeto 📸`, buildAppLikeEmail(LOGO_URL, "Envio de Arquivos", `A equipe precisa de um material para avançar: <strong>${record.title}</strong>.`, "Enviar Arquivos", `${portalUrl}/cofre-missoes`), "Asset Mission Client");
      }
    }

    if (table === 'b2b_pitches' && type === 'INSERT') {
      await sendEmailSafely(resend, ADMIN_EMAIL, `🤝 Nova Oportunidade no Hub B2B`, buildAppLikeEmail("🤝", "Pitch Publicado", `Nova oportunidade publicada na comunidade: "${record.title}".`, "Ver Oportunidade", `${portalUrl}/comunidade/hub`), "B2B Pitch Admin");
    }

    console.log("[WEBHOOK AUDIT] Disparos Concluídos.");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('------- ERRO CRÍTICO NO MOTOR DE NOTIFICAÇÕES -------', error);
    return NextResponse.json({ error: 'Erro interno no processamento.' }, { status: 500 });
  }
}
