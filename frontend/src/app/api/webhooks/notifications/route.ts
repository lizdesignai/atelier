// src/app/api/webhooks/notifications/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'lizbranddesign@gmail.com';
const FROM_EMAIL = 'Atelier Liz Design <sistema@lizdesign.com.br>'; 
const LOGO_URL = 'https://atelier.lizdesign.com.br/images/simbolo-rosa.png';

interface ProfileData { 
  id: string;
  nome: string; 
  email: string; 
  role?: string; 
  avatar_url?: string;
}

// ============================================================================
// 🧠 MOTOR NEURO-SEMÂNTICO (Variações de Copy - iFood / Spotify Style)
// Sorteia uma variação para combater a "Cegueira de Notificação"
// ============================================================================
const getRandomCopy = (options: string[]) => options[Math.floor(Math.random() * options.length)];

// 🎯 PARA CLIENTES: APROVAÇÕES E SOLICITAÇÕES
const copyClientPostReady = (name: string) => getRandomCopy([
  `Sua nova arte está na mesa, ${name}! ✨ Corre no painel para conferir o que a equipe preparou.`,
  `${name}, tem novidade no seu Cockpit! 🚀 Acesse para aprovar a peça criativa mais recente.`,
  `Ficou incrível! 🤩 ${name}, liberamos um novo material para sua avaliação. Dá uma olhada?`,
  `Tudo quase pronto do nosso lado, ${name} 🎯 Só falta o seu "OK" na nova direção visual.`
]);

const copyClientPlanReady = (name: string) => getRandomCopy([
  `O mapa do mês tá traçado, ${name}! 🗺️ O planejamento estratégico aguarda sua aprovação.`,
  `Bora dominar as redes? 📈 A estratégia do mês foi liberada no seu painel, ${name}.`,
  `${name}, nosso time acabou de enviar a rota de conteúdo. Falta só o seu aval! 🎯`,
  `Próximos passos desenhados, ${name}. 🧠 Confira o planejamento no Cockpit e nos dê a luz verde.`
]);

const copyClientNeedBriefing = (name: string) => getRandomCopy([
  `Precisamos mergulhar na sua visão, ${name}! 🤿 O seu Briefing Estratégico está pendente.`,
  `A sua marca está prestes a nascer, ${name} ✨ Para começarmos, preencha o seu Dossiê no painel.`,
  `Oi, ${name}! ☕ Que tal tirar uns minutinhos para preencher as diretrizes do seu projeto?`,
  `Sem bússola não há destino, ${name}. 🧭 Acesse o painel e nos conte mais sobre o seu negócio!`
]);

const copyClientReminder2H = (name: string) => getRandomCopy([
  `Opa, ${name}! 🚦 A sua aprovação está pendente há algumas horas. Que tal darmos andamento?`,
  `Sua marca não pode parar, ${name}! ⚡ O seu projeto aguarda uma validação rápida no painel.`,
  `E aí, ${name}, teve um tempinho para ver o material que enviamos? 👀`,
  `Estamos ansiosos pela sua resposta, ${name}. O seu "OK" é o que falta para seguirmos! 🚀`
]);

// 🛠️ PARA EQUIPE: TAREFAS, ATRASOS, CELEBRAÇÕES E FEEDBACKS
const copyTeamTaskUrgent = (title: string) => getRandomCopy([
  `🔥 Prioridade Máxima! A demanda "${title}" acabou de cair no seu colo. Bora pra cima!`,
  `Alerta Vermelho 🚨 Temos uma missão urgente: "${title}". Acelera!`,
  `Pausa o que tá fazendo! 🛑 Demanda expressa na mesa: "${title}".`,
  `⚡ Foco total! A tarefa "${title}" entrou com urgência. A equipe conta com você.`
]);

const copyTeamTaskNew = (title: string) => getRandomCopy([
  `🎯 Nova missão atribuída a você: "${title}". Quando puder, dá uma conferida.`,
  `Mais um passo para a excelência! ✨ A tarefa "${title}" está na sua fila de produção.`,
  `Tem trabalho novo na mesa: "${title}". 🛠️ Organize seu tempo e vamos nessa.`,
  `A sua próxima etapa chegou: "${title}". A magia do design aguarda! 🎨`
]);

const copyTeamOverdue = (title: string) => getRandomCopy([
  `Ei, notamos que a tarefa "${title}" passou um pouquinho do prazo. Precisa de um help da equipe? 🤝`,
  `Pausa para o café! ☕ A demanda "${title}" está atrasada. Há algum bloqueio que possamos ajudar?`,
  `Alinhamento de Rota 🔄 A entrega de "${title}" expirou. Atualize o status no Kanban, por favor.`,
  `Acontece com os melhores! 😅 A tarefa "${title}" atrasou. Vamos reorganizar as prioridades?`
]);

const copyTeamPraise = (title: string) => getRandomCopy([
  `Voando alto! 🦅 A tarefa "${title}" foi entregue e aprovada com sucesso. Bom trabalho!`,
  `Mais uma pra conta! 🎯 Você destruiu na entrega de "${title}". Continue assim!`,
  `Excelente entrega! ✨ O material de "${title}" foi validado sem ressalvas.`,
  `A consistência cria o mestre. 🏆 Obrigado pelo empenho na conclusão de "${title}".`
]);

const copyTeamReview = (title: string) => getRandomCopy([
  `👀 Bora revisar? A tarefa "${title}" está pronta para o olhar crítico da gestão.`,
  `A bola tá com a revisão! ⚽ Arte de "${title}" aguardando validação interna.`,
  `Hora do pente fino 🕵️‍♂️ Dá uma olhada na entrega de "${title}" no Kanban.`,
  `Quase lá! 🏁 Falta só o aval da gestão em "${title}" para liberar a peça para o cliente.`
]);

const copyTeamRevision = (title: string) => getRandomCopy([
  `Ajuste na rota 🔄 Precisamos de uma pequena refação na peça "${title}". Confere o feedback.`,
  `Opa, temos apontamentos! 📝 Novas instruções de ajuste para "${title}" já estão no card.`,
  `Voltou pra prancheta 🎨 Temos detalhes a lapidar na entrega de "${title}".`,
  `Correção solicitada! 🛠️ Confere as observações que a gestão (ou cliente) deixou em "${title}".`
]);

// 🟢 FIX APLICADO AQUI: Declaração correta da função copyClientFeedback
const copyClientFeedback = (projectName: string) => getRandomCopy([
  `Ajuste na rota 🔄 O cliente do projeto ${projectName} pediu uma alteração na peça.`,
  `Opa, temos um feedback! 📝 Novas instruções do cliente de ${projectName} já estão no card.`,
  `Voltou pra prancheta 🎨 O cliente de ${projectName} solicitou ajustes na aprovação.`,
  `Correção solicitada! 🛠️ Confira as observações que o cliente de ${projectName} deixou.`
]);

// ============================================================================
// TEMPLATE ENGINE (Push Notifications Estilo App Nativo)
// ============================================================================
function buildAppLikeEmail(avatarOrIcon: string, title: string, message: string, buttonText: string, link: string) {
  const renderVisual = avatarOrIcon.startsWith('http') || avatarOrIcon.startsWith('/')
    ? `<img src="${avatarOrIcon}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 18px;" alt="Avatar" />`
    : avatarOrIcon;

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
                    Atelier Liz Design
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
}

// Sub-rotina de Disparo com Auditoria Integrada
async function sendEmailSafely(resend: Resend, to: string, subject: string, html: string, tag: string) {
  try {
    console.log(`[Resend: ${tag}] Enviando pulso para: ${to}`);
    const response = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
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
  console.log("[WEBHOOK AUDIT] Operação recebida pelo Gateway do Supabase.");
  
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    
    // 🟢 Chave Mestra para furar o RLS e acessar emails e metadados ocultos
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || ''; 
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("[Webhook] Chaves do Supabase não encontradas.");
      return NextResponse.json({ error: 'Erro de configuração' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload = await request.json();
    const { table, type, record, old_record, custom_event } = payload;
    
    console.log(`[WEBHOOK AUDIT] Tabela: [${table}] | Evento: [${type}]`);

    const portalUrl = 'https://atelier.lizdesign.com.br';

    // Extratores Dinâmicos
    const getClientProfile = async (projectId: string): Promise<ProfileData | null> => {
      if (!projectId) return null;
      const { data, error } = await supabase.from('projects').select('profiles(id, nome, email)').eq('id', projectId).single();
      if (error) return null;
      const profile = data?.profiles as unknown as ProfileData | ProfileData[];
      return Array.isArray(profile) ? profile[0] : profile;
    };

    const getUserProfile = async (userId: string): Promise<ProfileData | null> => {
      if (!userId) return null;
      const { data } = await supabase.from('profiles').select('id, nome, email, avatar_url, role').eq('id', userId).single();
      return data as ProfileData;
    };

    // =========================================================================
    // 0. GATILHOS DE TEMPO (Via Cron Payload Customizado)
    // Se você configurar um cron job, ele pode bater nesta rota com type: 'CRON_REMINDER'
    // =========================================================================
    if (type === 'CRON_REMINDER') {
      const { entityType, entityId, targetUserId, reminderType, title } = payload;
      const user = await getUserProfile(targetUserId);
      
      if (user?.email) {
        if (reminderType === 'client_2h_approval') {
          await sendEmailSafely(resend, user.email, `Lembrete Rápido: Aprovação Pendente ⏱️`, buildAppLikeEmail(LOGO_URL, "Aguardando Você", copyClientReminder2H(user.nome.split(' ')[0]), "Acessar Painel", portalUrl), "Cron Client 2H");
        } else if (reminderType === 'team_task_overdue') {
          await sendEmailSafely(resend, user.email, `⚠️ Tarefa Atrasada: ${title}`, buildAppLikeEmail("⚠️", "Atenção ao Prazo", copyTeamOverdue(title), "Atualizar Kanban", `${portalUrl}/admin/jtbd`), "Cron Team Overdue");
        }
      }
      return NextResponse.json({ success: true, message: "Lembretes processados." });
    }

    // =========================================================================
    // 1. MENSAGENS DE CHAT (Formato Whatsapp/Slack Direto)
    // =========================================================================
    if (table === 'messages' && type === 'INSERT') {
      const sender = await getUserProfile(record.sender_id);
      if (!sender) return NextResponse.json({ success: true });

      const { data: channel } = await supabase.from('channels').select('project_id, is_private, type, name').eq('id', record.channel_id).single();
      if (!channel) return NextResponse.json({ success: true });

      const senderName = sender.nome.split(' ')[0];
      const msgSnippet = record.text_content && record.text_content.trim() !== "" 
        ? (record.text_content.length > 60 ? `"${record.text_content.substring(0, 60)}..."` : `"${record.text_content}"`)
        : "[Enviou um anexo]";

      const emailSubject = `💬 ${senderName}: ${msgSnippet}`;
      const emailBody = `<strong>${senderName}</strong> enviou uma mensagem:<br><br><span style="font-size: 16px; color: #18181b;">${msgSnippet}</span>`;
      const avatar = sender.avatar_url || LOGO_URL;

      if (channel.type === 'dm') {
        const recipientId = channel.name.replace('dm_', '').split('_').find((id: string) => id !== record.sender_id);
        const recipient = await getUserProfile(recipientId!);
        if (recipient?.email) {
          await sendEmailSafely(resend, recipient.email, emailSubject, buildAppLikeEmail(avatar, "Mensagem Direta", emailBody, "Responder agora", `${portalUrl}/admin/inbox`), "Chat DM");
        }
      } else if (channel.type === 'corporate_global' && sender.role !== 'admin') {
        await sendEmailSafely(resend, ADMIN_EMAIL, emailSubject, buildAppLikeEmail(avatar, "QG Central", emailBody, "Ir para o QG", `${portalUrl}/admin/inbox`), "Chat QG");
      } else if (!channel.is_private) {
        const client = channel.project_id ? await getClientProfile(channel.project_id) : null;
        const isSenderTeam = ['admin', 'gestor', 'colaborador'].includes(sender.role?.toLowerCase() || '');
        
        if (!isSenderTeam) {
          await sendEmailSafely(resend, ADMIN_EMAIL, emailSubject, buildAppLikeEmail(avatar, "Canal do Projeto", emailBody, "Abrir Workspace", `${portalUrl}/admin/inbox`), "Chat Cliente->Agencia");
        } else if (client?.email) {
          await sendEmailSafely(resend, client.email, emailSubject, buildAppLikeEmail(avatar, "Nova Atualização", emailBody, "Acessar Painel", `${portalUrl}/canais`), "Chat Agencia->Cliente");
        }
      }
    }

    // =========================================================================
    // 2. KANBAN & DEMANDAS DIÁRIAS (Tarefas e Roteamento de Equipe)
    // =========================================================================
    if (table === 'tasks') {
      const taskTitle = record.title || "Demanda do Estúdio";
      
      if (type === 'INSERT' && record.assigned_to) {
        const assignee = await getUserProfile(record.assigned_to);
        if (assignee?.email) {
          const copy = record.urgency ? copyTeamTaskUrgent(taskTitle) : copyTeamTaskNew(taskTitle);
          const icon = record.urgency ? "🔥" : LOGO_URL;
          await sendEmailSafely(resend, assignee.email, record.urgency ? `🔥 Prioridade: ${taskTitle}` : `🎯 Nova Tarefa: ${taskTitle}`, buildAppLikeEmail(icon, "Missão Atribuída", copy, "Abrir Kanban", `${portalUrl}/admin/jtbd`), "Task Insert");
        }
      }

      if (type === 'UPDATE' && old_record) {
        // Movida para Revisão Interna
        if (old_record.status !== 'review' && record.status === 'review') {
          await sendEmailSafely(resend, ADMIN_EMAIL, `👀 Aprovação Interna: ${taskTitle}`, buildAppLikeEmail(LOGO_URL, "Revisão Necessária", copyTeamReview(taskTitle), "Revisar Peça", `${portalUrl}/admin/jtbd`), "Task Review");
        }
        
        // Tarefa Concluída / Aprovada (Celebração)
        if (old_record.status !== 'completed' && record.status === 'completed' && record.assigned_to) {
          const assignee = await getUserProfile(record.assigned_to);
          if (assignee?.email) {
            await sendEmailSafely(resend, assignee.email, `🏆 Sucesso: ${taskTitle}`, buildAppLikeEmail("🏆", "Entrega Validada", copyTeamPraise(taskTitle), "Ver Minha Fila", `${portalUrl}/admin/jtbd`), "Task Completed Praise");
          }
        }

        // Admin/Cliente pediu alteração na Tarefa (Feedback)
        if (old_record.admin_feedback !== record.admin_feedback && record.admin_feedback && record.assigned_to) {
          const assignee = await getUserProfile(record.assigned_to);
          if (assignee?.email) {
            await sendEmailSafely(resend, assignee.email, `⚠️ Feedback: ${taskTitle}`, buildAppLikeEmail("⚠️", "Ajuste Necessário", copyTeamRevision(taskTitle) + `<br><br><strong>Instrução:</strong> "${record.admin_feedback}"`, "Ajustar Peça", `${portalUrl}/admin/jtbd`), "Task Feedback");
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
        await sendEmailSafely(resend, client.email, `Sua nova arte está pronta! ✨`, buildAppLikeEmail(LOGO_URL, "Aprovação de Arte", copyClientPostReady(clientName), "Avaliar no Cockpit", portalUrl), "Post Pending");
      }

      if (old_record.status !== 'needs_revision' && record.status === 'needs_revision') {
        const { data: proj } = await supabase.from('projects').select('profiles(nome)').eq('id', record.project_id).single();
        const rawProjProfile = proj?.profiles as unknown as ProfileData | ProfileData[];
        const pName = Array.isArray(rawProjProfile) ? rawProjProfile[0]?.nome : rawProjProfile?.nome;
        
        await sendEmailSafely(resend, ADMIN_EMAIL, `🔄 Ajuste Solicitado: ${pName}`, buildAppLikeEmail("📝", "Ajuste Solicitado", copyClientFeedback(pName || "Cliente"), "Ver Detalhes", `${portalUrl}/admin/jtbd`), "Post Rejected");
      }

      if (old_record.status !== 'approved' && record.status === 'approved') {
        await sendEmailSafely(resend, ADMIN_EMAIL, `✅ Peça Aprovada pelo Cliente!`, buildAppLikeEmail("🎉", "Aprovação Concluída", `O cliente aprovou a peça gráfica no Cockpit. Excelente trabalho da equipe!`, "Ver Gestão", `${portalUrl}/admin/gestao`), "Post Approved");
      }
    }

    // =========================================================================
    // 4. PLANEJAMENTO MENSAL E BRIEFING (Documentos e Diretrizes)
    // =========================================================================
    if (table === 'content_planning' && type === 'UPDATE' && old_record) {
      const client = await getClientProfile(record.project_id);
      const clientName = client?.nome.split(' ')[0] || 'Cliente';

      if (old_record.status !== 'awaiting_approval' && record.status === 'awaiting_approval' && client?.email) {
        await sendEmailSafely(resend, client.email, `Planejamento Estratégico Disponível 🗺️`, buildAppLikeEmail(LOGO_URL, "Plano Mensal", copyClientPlanReady(clientName), "Acessar Cockpit", portalUrl), "Plan Pending");
      }
      if (old_record.status !== 'needs_revision' && record.status === 'needs_revision') {
        await sendEmailSafely(resend, ADMIN_EMAIL, `🔄 Ajuste no Planejamento`, buildAppLikeEmail("📝", "Plano Recusado", `O cliente solicitou revisão no planejamento mensal:<br><br>"${record.feedback}"`, "Ver Ajustes", `${portalUrl}/admin/analytics`), "Plan Rejected");
      }
    }

    if (table === 'client_briefings') {
      const clientName = record.answers?.nome || 'Cliente';
      const clientEmail = record.answers?.email;

      if (type === 'INSERT') {
        await sendEmailSafely(resend, ADMIN_EMAIL, `🔥 Novo Briefing Finalizado: ${clientName}`, buildAppLikeEmail("🎯", "Diagnóstico Concluído", `O cliente <strong>${clientName}</strong> preencheu o Dossiê Estratégico integralmente.`, "Ver Mesa de Trabalho", `${portalUrl}/admin`), "Briefing Admin");
        if (clientEmail) await sendEmailSafely(resend, clientEmail, `Dossiê Recebido - Atelier Liz Design`, buildAppLikeEmail("📝", "Passo Importante!", `Recebemos as suas respostas estratégicas. A nossa equipe de planejamento já foi acionada.`, "Acessar Painel", portalUrl), "Briefing Cliente");
      }

      if (type === 'UPDATE' && old_record && old_record.is_completed !== record.is_completed && record.is_completed === false) {
        const clientProfile = await getClientProfile(record.project_id);
        if (clientProfile?.email) {
          await sendEmailSafely(resend, clientProfile.email, `Precisamos de mais detalhes 🔍`, buildAppLikeEmail(LOGO_URL, "Revisão de Briefing", copyClientNeedBriefing(clientProfile.nome.split(' ')[0]), "Preencher Diretrizes", portalUrl), "Briefing Review Needed");
        }
      }
    }

    // =========================================================================
    // 5. MISSÕES DO COFRE E HUB (Novas Solicitações e Networking)
    // =========================================================================
    if (table === 'asset_missions' && type === 'INSERT') {
      const client = await getClientProfile(record.project_id);
      if (client?.email) {
        await sendEmailSafely(resend, client.email, `Temos uma nova solicitação para o projeto 📸`, buildAppLikeEmail(LOGO_URL, "Material Solicitado", `A equipe precisa de um material para prosseguir: <strong>${record.title}</strong>.`, "Enviar Arquivos", `${portalUrl}/cofre-missoes`), "Asset Mission Client");
      }
    }

    if (table === 'b2b_pitches' && type === 'INSERT') {
      await sendEmailSafely(resend, ADMIN_EMAIL, `🤝 Nova Oportunidade B2B no Hub`, buildAppLikeEmail("🤝", "Networking", `Uma nova oportunidade foi publicada na comunidade. Título: "${record.title}".`, "Moderar / Acessar Hub", `${portalUrl}/comunidade/hub`), "B2B Pitch Admin");
    }

    console.log("[WEBHOOK AUDIT] Disparos Neurais Concluídos.");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('------- ERRO CRÍTICO NO MOTOR DE NOTIFICAÇÕES -------', error);
    return NextResponse.json({ error: 'Erro interno no processamento.' }, { status: 500 });
  }
}