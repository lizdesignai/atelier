// src/app/api/webhooks/notifications/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'lizbranddesign@gmail.com';
const FROM_EMAIL = 'Atelier Liz Design <onboarding@resend.dev>'; // Substitua quando o seu domínio estiver verificado no Resend

// Tipagem rigorosa para calar os erros do TypeScript
type ProfileData = { nome: string; email: string; role?: string };

export async function POST(request: Request) {
  try {
    // 🛠️ Proteção de Build do Vercel (Utilizando a variável correta)
    const resend = new Resend(process.env.RESEND_API_KEY);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || ''; 
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Chaves do Supabase não encontradas.");
      return NextResponse.json({ error: 'Erro de configuração' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload = await request.json();
    const { table, type, record, old_record } = payload;

    // 🛠️ FUNÇÃO EXTRATORA BLINDADA (Resolve o erro Property 'email' does not exist)
    const getClientProfile = async (projectId: string): Promise<ProfileData | null> => {
      const { data } = await supabase.from('projects').select('profiles(nome, email)').eq('id', projectId).single();
      if (!data?.profiles) return null;
      
      // Força o TypeScript a entender que pode ser Objeto ou Array
      const profileRaw = data.profiles as unknown as ProfileData | ProfileData[];
      return Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    };

    // =========================================================================
    // 1. GATILHO: BRIEFING ESTRATÉGICO
    // =========================================================================
    if (table === 'client_briefings' && type === 'INSERT') {
      const clientName = record.answers?.nome || 'Cliente';
      const clientEmail = record.answers?.email;
      
      // 📧 Notifica ADMIN
      await resend.emails.send({
        from: FROM_EMAIL, to: ADMIN_EMAIL,
        subject: `🔥 Novo Briefing: ${clientName}`,
        html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><h2 style="color: #8c6e54;">Alerta de Briefing!</h2><p>O cliente <strong>${clientName}</strong> acabou de preencher o briefing estratégico.</p><a href="https://atelier.lizdesign.com.br/admin" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8c6e54; color: white; text-decoration: none; border-radius: 8px;">Mesa de Trabalho</a></div>`
      });

      // 📧 Notifica CLIENTE
      if (clientEmail) {
        await resend.emails.send({
          from: FROM_EMAIL, to: clientEmail,
          subject: `Briefing Recebido - Atelier Liz Design`,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><h2 style="color: #8c6e54;">Tudo certo, ${clientName.split(' ')[0]}!</h2><p>Recebemos as respostas do seu Briefing Estratégico. A nossa equipa já foi notificada e o seu projeto está a ganhar forma.</p></div>`
        });
      }
    }

    // =========================================================================
    // 2. GATILHO: DIREÇÃO VISUAL
    // =========================================================================
    if (table === 'design_directions') {
      const client = await getClientProfile(record.project_id);
      const clientName = client?.nome || 'Cliente';

      if (type === 'INSERT') {
        // 📧 Notifica ADMIN (Auditoria)
        await resend.emails.send({
          from: FROM_EMAIL, to: ADMIN_EMAIL,
          subject: `[Sistema] Direção Visual Enviada: ${clientName}`,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><h2 style="color: #8c6e54;">Direção Partilhada</h2><p>A direção visual "${record.title}" foi enviada com sucesso para o cofre do cliente.</p></div>`
        });

        // 📧 Notifica CLIENTE
        if (client?.email) {
          await resend.emails.send({
            from: FROM_EMAIL, to: client.email,
            subject: `✨ Nova Direção Visual disponível no seu Cofre`,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><h2 style="color: #8c6e54;">Olá, ${clientName.split(' ')[0]}!</h2><p>Uma nova direção visual foi adicionada ao seu projeto: <strong>${record.title}</strong>.</p><p>Aceda ao portal para avaliar, dar a sua nota e deixar o seu feedback.</p><a href="https://atelier.lizdesign.com.br" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8c6e54; color: white; text-decoration: none; border-radius: 8px;">Acessar Meu Cofre</a></div>`
          });
        }
      }

      if (type === 'UPDATE' && record.score !== undefined && record.score !== old_record?.score) {
        // 📧 Notifica ADMIN
        await resend.emails.send({
          from: FROM_EMAIL, to: ADMIN_EMAIL,
          subject: `⭐ Avaliação Recebida: ${clientName}`,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><h2 style="color: #8c6e54;">Feedback Recebido</h2><p>O cliente <strong>${clientName}</strong> avaliou a direção "${record.title}".</p><p><strong>Nota Atribuída:</strong> ${record.score}/10</p><a href="https://atelier.lizdesign.com.br/admin/projetos" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8c6e54; color: white; text-decoration: none; border-radius: 8px;">Ver Feedback Completo</a></div>`
        });

        // 📧 Notifica CLIENTE
        if (client?.email) {
          await resend.emails.send({
            from: FROM_EMAIL, to: client.email,
            subject: `Avaliação Registada - Atelier Liz Design`,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><h2 style="color: #8c6e54;">Obrigado pelo seu feedback!</h2><p>A sua nota (${record.score}/10) foi registada e enviada para a nossa equipa.</p></div>`
          });
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
      
      // 📧 Notifica ADMIN (Auditoria)
      await resend.emails.send({
        from: FROM_EMAIL, to: ADMIN_EMAIL,
        subject: `[Sistema] ${isDiary ? 'Diário' : 'Cofre'} Atualizado: ${clientName}`,
        html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><h2 style="color: #8c6e54;">Ação Confirmada</h2><p>O perfil de ${clientName} foi atualizado com novos conteúdos de projeto.</p></div>`
      });

      // 📧 Notifica CLIENTE
      if (client?.email) {
        await resend.emails.send({
          from: FROM_EMAIL, to: client.email,
          subject: isDiary ? `📓 Nova atualização no seu Diário de Bordo` : `📦 Novos Arquivos no seu Cofre!`,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><h2 style="color: #8c6e54;">Olá, ${clientName.split(' ')[0]}!</h2><p>${isDiary ? 'Acabámos de publicar uma nova atualização sobre o processo da sua marca.' : 'Disponibilizámos novos ficheiros finais no seu Cofre de Identidade.'}</p><a href="https://atelier.lizdesign.com.br" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8c6e54; color: white; text-decoration: none; border-radius: 8px;">Acessar Portal</a></div>`
        });
      }
    }

    // =========================================================================
    // 4. GATILHO: COMUNIDADE (Moderação e Aprovação)
    // =========================================================================
    if (table === 'community_posts') {
      const getAuthor = async (authorId: string) => {
        const { data } = await supabase.from('profiles').select('nome, email').eq('id', authorId).single();
        const author = data as unknown as ProfileData | ProfileData[];
        return Array.isArray(author) ? author[0] : author;
      };

      // A) Novo post pendente
      if (type === 'INSERT' && record.status === 'pending') {
        const author = await getAuthor(record.author_id);
        
        // 📧 Notifica ADMIN
        await resend.emails.send({
          from: FROM_EMAIL, to: ADMIN_EMAIL,
          subject: `🛡️ Moderação: Novo Post na Comunidade`,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><h2 style="color: #8c6e54;">Post Pendente</h2><p>O cliente <strong>${author?.nome}</strong> acabou de publicar na comunidade.</p><p><strong>Conteúdo:</strong> "${record.text_content}"</p><a href="https://atelier.lizdesign.com.br/comunidade" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8c6e54; color: white; text-decoration: none; border-radius: 8px;">Moderar Publicação</a></div>`
        });

        // 📧 Notifica CLIENTE
        if (author?.email) {
          await resend.emails.send({
            from: FROM_EMAIL, to: author.email,
            subject: `A sua publicação está em análise`,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><h2 style="color: #8c6e54;">Recebemos a sua partilha!</h2><p>A sua publicação foi enviada para o Atelier e será aprovada em breve.</p></div>`
          });
        }
      }

      // B) Post Aprovado
      if (type === 'UPDATE' && record.status === 'approved' && old_record?.status === 'pending') {
        const author = await getAuthor(record.author_id);
        
        // 📧 Notifica ADMIN (Auditoria)
        await resend.emails.send({
          from: FROM_EMAIL, to: ADMIN_EMAIL,
          subject: `✅ Post Aprovado na Comunidade: ${author?.nome}`,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><p>A publicação do cliente foi aprovada e já está pública no Mural.</p></div>`
        });

        // 📧 Notifica CLIENTE
        if (author?.email) {
          await resend.emails.send({
            from: FROM_EMAIL, to: author.email,
            subject: `🎉 A sua publicação foi aprovada!`,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><h2 style="color: #8c6e54;">Boas notícias, ${author.nome.split(' ')[0]}!</h2><p>A sua publicação foi aprovada e já está visível na Comunidade. Você ganhou +150 EXP!</p></div>`
          });
        }
      }
    }

    // =========================================================================
    // 5. GATILHO: MENSAGENS NO CHAT INBOX
    // =========================================================================
    if (table === 'messages' && type === 'INSERT') {
      const { data: senderData } = await supabase.from('profiles').select('role, nome').eq('id', record.sender_id).single();
      const senderProfile = (Array.isArray(senderData) ? senderData[0] : senderData) as ProfileData;
      const isSenderAdmin = senderProfile?.role === 'admin';

      const { data: channel } = await supabase.from('channels').select('project_id, is_private').eq('id', record.channel_id).single();
      
      if (channel && !channel.is_private) {
        const client = await getClientProfile(channel.project_id);
        const clientName = client?.nome || 'Cliente';
        
        // 📧 SEMPRE Notifica o ADMIN
        await resend.emails.send({
          from: FROM_EMAIL, to: ADMIN_EMAIL,
          subject: isSenderAdmin ? `[Sistema] Mensagem enviada para ${clientName}` : `💬 Nova Mensagem de ${senderProfile?.nome}`,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><h2 style="color: #8c6e54;">Caixa de Entrada</h2><p>${isSenderAdmin ? `Você enviou uma mensagem para ${clientName}` : `O cliente <strong>${senderProfile?.nome}</strong> enviou uma mensagem.`}</p><a href="https://atelier.lizdesign.com.br/admin/inbox" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8c6e54; color: white; text-decoration: none; border-radius: 8px;">Abrir Inbox</a></div>`
        });

        // 📧 Notifica CLIENTE
        if (isSenderAdmin && client?.email) {
          await resend.emails.send({
            from: FROM_EMAIL, to: client.email,
            subject: `💬 Nova mensagem da equipa Liz Design`,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><h2 style="color: #8c6e54;">Olá!</h2><p>Tem uma nova mensagem na sua Caixa de Comunicação Corporativa.</p><a href="https://atelier.lizdesign.com.br/canais" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8c6e54; color: white; text-decoration: none; border-radius: 8px;">Ler Mensagem</a></div>`
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro Crítico no Webhook:', error);
    return NextResponse.json({ error: 'Erro interno no webhook' }, { status: 500 });
  }
}