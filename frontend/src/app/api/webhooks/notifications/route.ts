// src/app/api/webhooks/notifications/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'lizbranddesign@gmail.com';
const FROM_EMAIL = 'Atelier Liz Design <sistema@lizdesign.com.br>'; 

type ProfileData = { nome: string; email: string; role?: string };

// ============================================================================
// TEMPLATE ENGINE (App-Like Push Notifications)
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

// Helper para encapsular e auditar disparos do Resend
async function sendEmailSafely(resend: Resend, to: string, subject: string, html: string, tag: string) {
  try {
    console.log(`[Resend: ${tag}] Tentando enviar e-mail para: ${to}`);
    const response = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    if (response.error) {
      console.error(`[Resend: ${tag}] Rejeição da API do Resend:`, response.error);
    } else {
      console.log(`[Resend: ${tag}] Sucesso! ID:`, response.data?.id);
    }
  } catch (error) {
    console.error(`[Resend: ${tag}] Falha de Runtime ao executar o disparo:`, error);
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
    
    // 🟢 FIX CRÍTICO: Usa a Chave de Serviço para furar o RLS e ler e-mails de clientes
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || ''; 
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("[Webhook] Chaves do Supabase não encontradas nas Variáveis de Ambiente.");
      return NextResponse.json({ error: 'Erro de configuração' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload = await request.json();
    const { table, type, record, old_record } = payload;
    
    console.log(`[WEBHOOK AUDIT] Operação Detectada -> Tabela: [${table}] | Evento: [${type}]`);

    const portalUrl = 'https://atelier.lizdesign.com.br';

    // Função extratora blindada
    const getClientProfile = async (projectId: string): Promise<ProfileData | null> => {
      if (!projectId) return null;
      const { data, error } = await supabase.from('projects').select('profiles(nome, email)').eq('id', projectId).single();
      if (error) console.error(`[Webhook Extrator] Erro ao buscar perfil do cliente para o projeto ${projectId}:`, error);
      if (!data?.profiles) return null;
      
      const profileRaw = data.profiles as unknown as ProfileData | ProfileData[];
      return Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    };

    // =========================================================================
    // 1. GATILHO: BRIEFING ESTRATÉGICO
    // =========================================================================
    if (table === 'client_briefings' && type === 'INSERT') {
      const clientName = record.answers?.nome || 'Cliente';
      const clientEmail = record.answers?.email;
      
      await sendEmailSafely(resend, ADMIN_EMAIL, `🔥 Novo Briefing: ${clientName}`, buildAppLikeEmail("🎯", "Diagnóstico Pronto", `O cliente <strong>${clientName}</strong> concluiu o Dossiê Estratégico. A operação está pronta para ser iniciada.`, "Acessar Mesa de Trabalho", `${portalUrl}/admin`), "Briefing Admin");

      if (clientEmail) {
        await sendEmailSafely(resend, clientEmail, `Dossiê Recebido - Atelier Liz Design`, buildAppLikeEmail("📝", "Dossiê Recebido", `As respostas do seu Briefing Estratégico foram processadas. A nossa equipe já foi notificada para iniciar a estruturação do projeto.`, "Acessar Painel", portalUrl), "Briefing Cliente");
      }
    }

    // =========================================================================
    // 2. GATILHO: DIREÇÃO VISUAL E AVALIAÇÕES
    // =========================================================================
    if (table === 'design_directions') {
      const client = await getClientProfile(record.project_id);
      const clientName = client?.nome || 'Cliente';

      if (type === 'INSERT') {
        await sendEmailSafely(resend, ADMIN_EMAIL, `[Sistema] Direção Visual Enviada: ${clientName}`, buildAppLikeEmail("🎨", "Curadoria Compartilhada", `A direção visual "${record.title}" foi enviada com sucesso para o cofre do cliente.`, "Acompanhar Projeto", `${portalUrl}/admin/projetos`), "Direção Admin");

        if (client?.email) {
          await sendEmailSafely(resend, client.email, `Nova Direção Visual disponível`, buildAppLikeEmail("✨", "Curadoria Visual", `Uma nova direção visual foi adicionada ao seu projeto: <strong>${record.title}</strong>.<br><br>Acesse o portal para avaliar e guiar os próximos passos.`, "Avaliar Direção", portalUrl), "Direção Cliente");
        }
      }

      if (type === 'UPDATE' && record.score !== undefined && record.score !== old_record?.score) {
        await sendEmailSafely(resend, ADMIN_EMAIL, `⭐ Avaliação Recebida: ${clientName}`, buildAppLikeEmail("⭐", "Avaliação Tática", `O cliente <strong>${clientName}</strong> avaliou a direção "${record.title}".<br><br><strong>Nota Atribuída:</strong> ${record.score}/10`, "Ver Feedback Completo", `${portalUrl}/admin/projetos`), "Avaliação Admin");

        if (client?.email) {
          await sendEmailSafely(resend, client.email, `Feedback Registrado - Atelier Liz Design`, buildAppLikeEmail("✅", "Feedback Registrado", `A sua avaliação (${record.score}/10) foi sincronizada com a nossa equipe operacional.`, "Acessar Portal", portalUrl), "Avaliação Cliente");
        }
      }
    }

    // =========================================================================
    // 3. GATILHO: DIÁRIO DE BORDO E COFRE
    // =========================================================================
    if ((table === 'diary_posts' || table === 'project_assets') && type === 'INSERT') {
      const client = await getClientProfile(record.project_id);
      const isDiary = table === 'diary_posts';
      const clientName = client?.nome || 'Cliente';
      
      await sendEmailSafely(resend, ADMIN_EMAIL, `[Sistema] ${isDiary ? 'Diário' : 'Cofre'} Atualizado: ${clientName}`, buildAppLikeEmail("📓", "Registro Atualizado", `O perfil de ${clientName} foi atualizado com novos conteúdos operacionais.`, "Acompanhar", `${portalUrl}/admin`), "Assets/Diary Admin");

      if (client?.email) {
        await sendEmailSafely(resend, client.email, isDiary ? `Nova atualização no Diário de Bordo` : `Novo Ativo no Cofre`, buildAppLikeEmail("💎", "Nova Atualização", `Existem novas informações ou ativos finalizados disponíveis no seu espaço de trabalho.`, "Acessar Portal", portalUrl), "Assets/Diary Cliente");
      }
    }

    // =========================================================================
    // 4. GATILHO: COMUNIDADE (Moderação e Aprovação)
    // =========================================================================
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

        if (author?.email) {
          await sendEmailSafely(resend, author.email, `Sua publicação está em análise`, buildAppLikeEmail("⏳", "Post em Análise", `Sua publicação foi submetida e encontra-se em fase de moderação pela nossa curadoria.`, "Ver Comunidade", `${portalUrl}/comunidade`), "Comunidade Pending Cliente");
        }
      }

      if (type === 'UPDATE' && record.status === 'approved' && old_record?.status === 'pending') {
        const author = await getAuthor(record.author_id);
        
        await sendEmailSafely(resend, ADMIN_EMAIL, `✅ Post Aprovado na Comunidade: ${author?.nome || 'Desconhecido'}`, buildAppLikeEmail("✅", "Publicação Visível", `A publicação do cliente foi aprovada e encontra-se pública no Mural da Comunidade.`, "Ver Mural", `${portalUrl}/comunidade`), "Comunidade Approved Admin");

        if (author?.email) {
          await sendEmailSafely(resend, author.email, `Sua publicação foi aprovada!`, buildAppLikeEmail("🎉", "Compartilhamento Aprovado", `A sua publicação foi aprovada e já se encontra visível na Comunidade. Foram creditados +150 EXP na sua conta.`, "Ver Publicação", `${portalUrl}/comunidade`), "Comunidade Approved Cliente");
        }
      }
    }

    // =========================================================================
    // 5. GATILHO: MENSAGENS NO CHAT INBOX
    // =========================================================================
    if (table === 'messages' && type === 'INSERT') {
      const { data: senderData } = await supabase.from('profiles').select('role, nome').eq('id', record.sender_id).single();
      const senderProfile = (Array.isArray(senderData) ? senderData[0] : senderData) as ProfileData;
      
      // Ampliei a verificação para considerar qualquer membro do estúdio como remetente interno
      const isSenderInternal = ['admin', 'gestor', 'colaborador'].includes(senderProfile?.role || '');

      const { data: channel, error: channelError } = await supabase.from('channels').select('project_id, is_private').eq('id', record.channel_id).single();
      if (channelError) console.log(`[Webhook Chat] Erro ao buscar canal:`, channelError);
      
      // Regra Tática: Se o canal for PRIVADO e for do projeto (tático interno), o cliente não recebe. 
      // A administração recebe se alguém enviou mensagem num canal público ou DMs.
      if (!channel || !channel.is_private) {
        let clientEmail = null;
        let clientName = 'Cliente';

        if (channel && channel.project_id) {
            const client = await getClientProfile(channel.project_id);
            clientEmail = client?.email;
            clientName = client?.nome || 'Cliente';
        }
        
        // Notifica o Admin (somente se não foi o próprio estúdio quem mandou, para evitar flood na caixa do admin)
        if (!isSenderInternal) {
          await sendEmailSafely(resend, ADMIN_EMAIL, `💬 Nova Mensagem de ${senderProfile?.nome}`, buildAppLikeEmail("📨", "Caixa de Entrada", `O cliente <strong>${senderProfile?.nome}</strong> enviou uma nova comunicação.`, "Abrir Inbox", `${portalUrl}/admin/inbox`), "Chat Admin (From Client)");
        }

        // Notifica o Cliente (somente se o estúdio enviou, e se o cliente tem email)
        if (isSenderInternal && clientEmail) {
          await sendEmailSafely(resend, clientEmail, `Nova mensagem corporativa`, buildAppLikeEmail("📨", "Comunicação Recebida", `A equipe do Atelier compartilhou uma nova mensagem na sua linha direta.`, "Ler Mensagem", `${portalUrl}/canais`), "Chat Cliente (From Studio)");
        }
      } else {
        console.log(`[Webhook Chat] Ação ignorada. O canal (${record.channel_id}) é privado e silenciado externamente.`);
      }
    }

    console.log("[WEBHOOK AUDIT] Operação concluída com sucesso.");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('------- ERRO CRÍTICO DE RUNTIME NO WEBHOOK -------', error);
    return NextResponse.json({ error: 'Erro interno no processamento' }, { status: 500 });
  }
}