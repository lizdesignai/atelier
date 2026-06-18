// src/app/api/webhooks/notifications/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'lizbranddesign@gmail.com';
const FROM_EMAIL = 'Atelier Liz Design <sistema@lizdesign.com.br>'; 

interface ProfileData { 
  nome: string; 
  email: string; 
  role?: string; 
}

// ============================================================================
// TEMPLATE ENGINE (Push Notifications Estilo App)
// ============================================================================
function buildAppLikeEmail(icon: string, title: string, message: string, buttonText: string, link: string) {
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
                  <a href="${link}" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 18px 24px; border-radius: 14px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; text-align: center; transition: background-color 0.2s;">
                    ${buttonText}
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 20px; background-color: #fafafa; border-top: 1px solid #f4f4f5;">
                  <p style="margin: 0; font-size: 10px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                    Atelier Liz Design &bull; OS 2.0
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
    console.log(`[Resend: ${tag}] Iniciando transmissão para: ${to}`);
    const response = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    if (response.error) {
      console.error(`[Resend: ${tag}] Rejeição da API:`, response.error);
    } else {
      console.log(`[Resend: ${tag}] Sucesso! ID da Operação:`, response.data?.id);
    }
  } catch (error) {
    console.error(`[Resend: ${tag}] Falha de Runtime no disparo:`, error);
  }
}

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================
export async function POST(request: Request) {
  console.log("=======================================================");
  console.log("[WEBHOOK AUDIT] Conexão recebida pelo Supabase.");
  
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
    const { table, type, record, old_record } = payload;
    
    console.log(`[WEBHOOK AUDIT] Operação Detectada -> Tabela: [${table}] | Evento: [${type}]`);

    const portalUrl = 'https://atelier.lizdesign.com.br';

    // Extrator blindado
    const getClientProfile = async (projectId: string): Promise<ProfileData | null> => {
      if (!projectId) return null;
      const { data, error } = await supabase.from('projects').select('profiles(nome, email)').eq('id', projectId).single();
      if (error) console.error(`[Webhook] Erro ao extrair perfil do cliente:`, error);
      if (!data?.profiles) return null;
      
      const profileRaw = data.profiles as unknown as ProfileData | ProfileData[];
      return Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    };

    // =========================================================================
    // 1. GATILHO: MENSAGENS NO CHAT INBOX (ROTEADOR TÁTICO)
    // =========================================================================
    if (table === 'messages' && type === 'INSERT') {
      console.log(`[Webhook Chat] Processando mensagem do ID: ${record.sender_id}`);

      // Identifica o Remetente
      const { data: senderData } = await supabase.from('profiles').select('role, nome, email').eq('id', record.sender_id).single();
      const senderProfile = (Array.isArray(senderData) ? senderData[0] : senderData) as ProfileData;
      const isSenderTeam = ['admin', 'gestor', 'colaborador'].includes(senderProfile?.role?.toLowerCase() || '');

      // Identifica o Canal
      const { data: channel, error: channelError } = await supabase.from('channels').select('project_id, is_private, type, name').eq('id', record.channel_id).single();
      
      if (channelError || !channel) {
        console.error(`[Webhook Chat] Falha ao ler metadados do canal. Abortando.`, channelError);
        return NextResponse.json({ success: true, message: "Canal inválido." });
      }

      const chType = channel.type || 'general';

      // ----------------------------------------------------------------------
      // ROTA 1: MENSAGEM DIRETA (DM)
      // ----------------------------------------------------------------------
      if (chType === 'dm') {
        // O nome do canal é 'dm_ID1_ID2'. Precisamos achar o ID que NÃO é o do remetente.
        const participants = channel.name.replace('dm_', '').split('_');
        const recipientId = participants.find((id: string) => id !== record.sender_id);

        if (recipientId) {
          const { data: recipientData } = await supabase.from('profiles').select('nome, email').eq('id', recipientId).single();
          const recipientProfile = (Array.isArray(recipientData) ? recipientData[0] : recipientData) as ProfileData;

          if (recipientProfile?.email) {
            await sendEmailSafely(
              resend, 
              recipientProfile.email, 
              `💬 Mensagem Direta de ${senderProfile?.nome}`, 
              buildAppLikeEmail("📨", "Mensagem Direta", `<strong>${senderProfile?.nome}</strong> enviou uma mensagem privada para você.`, "Abrir Workspace", `${portalUrl}/admin/inbox`), 
              "Chat DM"
            );
          }
        }
        return NextResponse.json({ success: true, message: "DM Processada." });
      }

      // ----------------------------------------------------------------------
      // ROTA 2: QG CENTRAL (Comunicação Global da Equipe)
      // ----------------------------------------------------------------------
      if (chType === 'corporate_global') {
        // Alerta o Admin sobre atividade no QG (a menos que ele mesmo tenha enviado)
        if (senderProfile?.role !== 'admin') {
          await sendEmailSafely(
            resend, 
            ADMIN_EMAIL, 
            `🌐 QG Central: Atualização de ${senderProfile?.nome}`, 
            buildAppLikeEmail("🏢", "QG Central", `<strong>${senderProfile?.nome}</strong> publicou uma nova mensagem no canal geral da equipe.`, "Acessar QG", `${portalUrl}/admin/inbox`), 
            "Chat QG Central"
          );
        }
        return NextResponse.json({ success: true, message: "QG Central Processado." });
      }

      // ----------------------------------------------------------------------
      // ROTA 3: CANAIS DE PROJETOS (Aprovações, Avisos, Geral)
      // ----------------------------------------------------------------------
      const client = channel.project_id ? await getClientProfile(channel.project_id) : null;
      const clientName = client?.nome || 'Cliente';
      const clientEmail = client?.email;

      if (channel.is_private) {
        // Canal Tático (Interno da Equipe no projeto). Silenciado para o Cliente.
        console.log(`[Webhook Chat] Ação em Canal Tático de Projeto. Silenciado para ${clientName}.`);
        
        // Notifica a gestão se um colaborador postar algo no projeto internamente
        if (senderProfile?.role === 'colaborador') {
          await sendEmailSafely(resend, ADMIN_EMAIL, `🔒 Canal Tático: Movimentação de ${senderProfile?.nome}`, buildAppLikeEmail("🔒", "Comunicação Interna", `<strong>${senderProfile?.nome}</strong> postou uma atualização num canal tático do projeto.`, "Avaliar Workspace", `${portalUrl}/admin/inbox`), "Chat Tático Interno");
        }
      } else {
        // Canal Compartilhado (Público com o Cliente)
        if (!isSenderTeam) {
          // O Cliente falou: Notifica a Agência (Admin)
          await sendEmailSafely(resend, ADMIN_EMAIL, `💬 Mensagem de ${clientName}`, buildAppLikeEmail("📨", "Caixa de Entrada", `O cliente <strong>${senderProfile?.nome || clientName}</strong> enviou uma nova instrução/dúvida no projeto.`, "Abrir Workspace", `${portalUrl}/admin/inbox`), "Chat de Cliente para Agência");
        } else {
          // A Equipe falou: Notifica o Cliente
          if (clientEmail) {
            await sendEmailSafely(resend, clientEmail, `Nova mensagem corporativa de Atelier Liz Design`, buildAppLikeEmail("📨", "Comunicação Recebida", `A equipe da <strong>Liz Design</strong> compartilhou uma nova atualização na sua linha direta.`, "Acessar Painel", `${portalUrl}/canais`), "Chat de Agência para Cliente");
          }
        }
      }
    }

    // =========================================================================
    // DEMAIS GATILHOS (Briefing, Direção Visual, Comunidade, Cofre)
    // =========================================================================
    
    // (O restante do código de Briefings, Direções e Comunidade permanece com a mesma estrutura testada anterior)
    if (table === 'client_briefings' && type === 'INSERT') {
      const clientName = record.answers?.nome || 'Cliente';
      const clientEmail = record.answers?.email;
      await sendEmailSafely(resend, ADMIN_EMAIL, `🔥 Novo Briefing: ${clientName}`, buildAppLikeEmail("🎯", "Diagnóstico Pronto", `O cliente <strong>${clientName}</strong> concluiu o Dossiê Estratégico.`, "Acessar Mesa de Trabalho", `${portalUrl}/admin`), "Briefing Admin");
      if (clientEmail) await sendEmailSafely(resend, clientEmail, `Dossiê Recebido - Atelier Liz Design`, buildAppLikeEmail("📝", "Dossiê Recebido", `As respostas do seu Briefing Estratégico foram processadas. A nossa equipe já foi notificada para iniciar a estruturação do projeto.`, "Acessar Painel", portalUrl), "Briefing Cliente");
    }

    if (table === 'design_directions') {
      const client = await getClientProfile(record.project_id);
      const clientName = client?.nome || 'Cliente';

      if (type === 'INSERT') {
        await sendEmailSafely(resend, ADMIN_EMAIL, `[Sistema] Direção Visual Enviada: ${clientName}`, buildAppLikeEmail("🎨", "Curadoria Compartilhada", `A direção visual "${record.title}" foi enviada com sucesso para o cofre do cliente.`, "Acompanhar Projeto", `${portalUrl}/admin/projetos`), "Direção Admin");
        if (client?.email) await sendEmailSafely(resend, client.email, `Nova Direção Visual disponível`, buildAppLikeEmail("✨", "Curadoria Visual", `Uma nova direção visual foi adicionada ao seu projeto: <strong>${record.title}</strong>.<br><br>Acesse o portal para avaliar e guiar os próximos passos.`, "Avaliar Direção", portalUrl), "Direção Cliente");
      }

      if (type === 'UPDATE' && record.score !== undefined && record.score !== old_record?.score) {
        await sendEmailSafely(resend, ADMIN_EMAIL, `⭐ Avaliação Recebida: ${clientName}`, buildAppLikeEmail("⭐", "Avaliação Tática", `O cliente <strong>${clientName}</strong> avaliou a direção "${record.title}".<br><br><strong>Nota Atribuída:</strong> ${record.score}/10`, "Ver Feedback Completo", `${portalUrl}/admin/projetos`), "Avaliação Admin");
        if (client?.email) await sendEmailSafely(resend, client.email, `Feedback Registrado - Atelier Liz Design`, buildAppLikeEmail("✅", "Feedback Registrado", `A sua avaliação (${record.score}/10) foi sincronizada com a nossa equipe operacional.`, "Acessar Portal", portalUrl), "Avaliação Cliente");
      }
    }

    if ((table === 'diary_posts' || table === 'project_assets') && type === 'INSERT') {
      const client = await getClientProfile(record.project_id);
      const isDiary = table === 'diary_posts';
      const clientName = client?.nome || 'Cliente';
      
      await sendEmailSafely(resend, ADMIN_EMAIL, `[Sistema] ${isDiary ? 'Diário' : 'Cofre'} Atualizado: ${clientName}`, buildAppLikeEmail("📓", "Registro Atualizado", `O perfil de ${clientName} foi atualizado com novos conteúdos operacionais.`, "Acompanhar", `${portalUrl}/admin`), "Assets/Diary Admin");
      if (client?.email) await sendEmailSafely(resend, client.email, isDiary ? `Nova atualização no Diário de Bordo` : `Novo Ativo no Cofre`, buildAppLikeEmail("💎", "Nova Atualização", `Existem novas informações ou ativos finalizados disponíveis no seu espaço de trabalho.`, "Acessar Portal", portalUrl), "Assets/Diary Cliente");
    }

    if (table === 'community_posts') {
      const getAuthor = async (authorId: string) => {
        if (!authorId) return null;
        const { data } = await supabase.from('profiles').select('nome, email').eq('id', authorId).single();
        if (!data) return null;
        const author = data as unknown as ProfileData | ProfileData[];
        return Array.isArray(author) ? author[0] : author;
      };

      if (type === 'INSERT' && record.status === 'pending') {
        const author = await getAuthor(record.author_id);
        await sendEmailSafely(resend, ADMIN_EMAIL, `🛡️ Moderação: Novo Post na Comunidade`, buildAppLikeEmail("🛡️", "Ação de Moderação", `O cliente <strong>${author?.nome || 'Desconhecido'}</strong> publicou na comunidade e aguarda aprovação.<br><br>"${record.text_content}"`, "Moderar Publicação", `${portalUrl}/admin/comunidade`), "Comunidade Pending Admin");
        if (author?.email) await sendEmailSafely(resend, author.email, `Sua publicação está em análise`, buildAppLikeEmail("⏳", "Post em Análise", `Sua publicação foi submetida e encontra-se em fase de moderação pela nossa curadoria.`, "Ver Comunidade", `${portalUrl}/comunidade`), "Comunidade Pending Cliente");
      }

      if (type === 'UPDATE' && record.status === 'approved' && old_record?.status === 'pending') {
        const author = await getAuthor(record.author_id);
        await sendEmailSafely(resend, ADMIN_EMAIL, `✅ Post Aprovado na Comunidade: ${author?.nome || 'Desconhecido'}`, buildAppLikeEmail("✅", "Publicação Visível", `A publicação do cliente foi aprovada e encontra-se pública no Mural da Comunidade.`, "Ver Mural", `${portalUrl}/comunidade`), "Comunidade Approved Admin");
        if (author?.email) await sendEmailSafely(resend, author.email, `Sua publicação foi aprovada!`, buildAppLikeEmail("🎉", "Compartilhamento Aprovado", `A sua publicação foi aprovada e já se encontra visível na Comunidade. Foram creditados +150 EXP na sua conta.`, "Ver Publicação", `${portalUrl}/comunidade`), "Comunidade Approved Cliente");
      }
    }

    console.log("[WEBHOOK AUDIT] Operação concluída com sucesso.");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('------- ERRO CRÍTICO DE RUNTIME NO WEBHOOK -------', error);
    return NextResponse.json({ error: 'Erro interno no processamento' }, { status: 500 });
  }
}