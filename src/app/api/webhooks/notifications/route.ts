// src/app/api/webhooks/notifications/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Inicializa o Resend e o Supabase
const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL = 'lizbranddesign@gmail.com';
const FROM_EMAIL = 'Atelier Liz Design <onboarding@resend.dev>'; // Lembre-se de validar o seu domínio no Resend depois

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { table, type, record, old_record } = payload;

    // 🛠️ FUNÇÃO EXTRATORA INTELIGENTE (Resolve o erro do TypeScript)
    const getClientProfile = async (projectId: string) => {
      const { data } = await supabase
        .from('projects')
        .select('profiles(nome, email)')
        .eq('id', projectId)
        .single();
      
      // Contorna a tipagem do TypeScript (Se for Array extrai o [0], se for Objeto pega direto)
      return Array.isArray(data?.profiles) ? data?.profiles[0] : data?.profiles;
    };

    // =========================================================================
    // 1. GATILHO: BRIEFING ESTRATÉGICO
    // =========================================================================
    if (table === 'client_briefings' && type === 'INSERT') {
      const clientName = record.answers?.nome || 'Cliente';
      const clientEmail = record.answers?.email;
      
      // 📧 E-mail para o ADMIN
      await resend.emails.send({
        from: FROM_EMAIL, to: ADMIN_EMAIL,
        subject: `🔥 Novo Briefing: ${clientName}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;">
            <h2 style="color: #8c6e54;">Alerta de Briefing!</h2>
            <p>O cliente <strong>${clientName}</strong> acabou de preencher o briefing estratégico.</p>
            <p>Aceda ao painel do Atelier para rever as respostas e iniciar a fundação da marca.</p>
            <a href="https://atelier.lizdesign.com.br/admin" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8c6e54; color: white; text-decoration: none; border-radius: 8px;">Mesa de Trabalho</a>
          </div>
        `
      });

      // 📧 E-mail para o CLIENTE
      if (clientEmail) {
        await resend.emails.send({
          from: FROM_EMAIL, to: clientEmail,
          subject: `Briefing Recebido - Atelier Liz Design`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;">
              <h2 style="color: #8c6e54;">Tudo certo, ${clientName.split(' ')[0]}!</h2>
              <p>Recebemos as respostas do seu Briefing Estratégico. A nossa equipa já foi notificada e o seu projeto está a ganhar forma.</p>
              <p>Pode acompanhar o progresso em tempo real através do seu Cofre.</p>
            </div>
          `
        });
      }
    }

    // =========================================================================
    // 2. GATILHO: DIREÇÃO VISUAL (Criação e Avaliação)
    // =========================================================================
    if (table === 'design_directions') {
      const client = await getClientProfile(record.project_id);

      // A) Admin publicou nova direção -> Avisa Cliente
      if (type === 'INSERT' && client?.email) {
        await resend.emails.send({
          from: FROM_EMAIL, to: client.email,
          subject: `✨ Nova Direção Visual disponível no seu Cofre`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;">
              <h2 style="color: #8c6e54;">Olá, ${client.nome.split(' ')[0]}!</h2>
              <p>Uma nova direção visual foi adicionada ao seu projeto: <strong>${record.title}</strong>.</p>
              <p>Aceda ao portal para avaliar, dar a sua nota e deixar o seu feedback.</p>
              <a href="https://atelier.lizdesign.com.br" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8c6e54; color: white; text-decoration: none; border-radius: 8px;">Acessar Meu Cofre</a>
            </div>
          `
        });
      }

      // B) Cliente avaliou a direção (Score mudou) -> Avisa Admin
      if (type === 'UPDATE' && record.score && record.score !== old_record?.score) {
        await resend.emails.send({
          from: FROM_EMAIL, to: ADMIN_EMAIL,
          subject: `⭐ Avaliação Recebida: ${client?.nome}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;">
              <h2 style="color: #8c6e54;">Feedback Recebido</h2>
              <p>O cliente <strong>${client?.nome}</strong> avaliou a direção "${record.title}".</p>
              <p><strong>Nota Atribuída:</strong> ${record.score}/10</p>
              <a href="https://atelier.lizdesign.com.br/admin/projetos" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8c6e54; color: white; text-decoration: none; border-radius: 8px;">Ver Feedback Completo</a>
            </div>
          `
        });
      }
    }

    // =========================================================================
    // 3. GATILHO: DIÁRIO DE BORDO E COFRE
    // =========================================================================
    if ((table === 'diary_posts' || table === 'project_assets') && type === 'INSERT') {
      const client = await getClientProfile(record.project_id);
      
      if (client?.email) {
        const isDiary = table === 'diary_posts';
        await resend.emails.send({
          from: FROM_EMAIL, to: client.email,
          subject: isDiary ? `📓 Nova atualização no seu Diário de Bordo` : `📦 Novos Arquivos no seu Cofre!`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;">
              <h2 style="color: #8c6e54;">Olá, ${client.nome.split(' ')[0]}!</h2>
              <p>${isDiary ? 'Acabámos de publicar uma nova atualização sobre o processo da sua marca.' : 'Disponibilizámos novos ficheiros finais no seu Cofre de Identidade.'}</p>
              <a href="https://atelier.lizdesign.com.br" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8c6e54; color: white; text-decoration: none; border-radius: 8px;">Acessar Portal</a>
            </div>
          `
        });
      }
    }

    // =========================================================================
    // 4. GATILHO: COMUNIDADE (Moderação e Aprovação)
    // =========================================================================
    if (table === 'community_posts') {
      // A) Novo post pendente -> Avisa Admin
      if (type === 'INSERT' && record.status === 'pending') {
        await resend.emails.send({
          from: FROM_EMAIL, to: ADMIN_EMAIL,
          subject: `🛡️ Moderação: Novo Post na Comunidade`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;">
              <h2 style="color: #8c6e54;">Post Pendente</h2>
              <p>Um cliente acabou de publicar na comunidade.</p>
              <p><strong>Conteúdo:</strong> "${record.text_content}"</p>
              <a href="https://atelier.lizdesign.com.br/comunidade" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8c6e54; color: white; text-decoration: none; border-radius: 8px;">Moderar Publicação</a>
            </div>
          `
        });
      }

      // B) Post Aprovado -> Avisa Cliente
      if (type === 'UPDATE' && record.status === 'approved' && old_record?.status === 'pending') {
        const { data: author } = await supabase.from('profiles').select('nome, email').eq('id', record.author_id).single();
        if (author?.email) {
          await resend.emails.send({
            from: FROM_EMAIL, to: author.email,
            subject: `🎉 A sua publicação foi aprovada!`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;">
                <h2 style="color: #8c6e54;">Boas notícias, ${author.nome.split(' ')[0]}!</h2>
                <p>A sua publicação foi aprovada pela nossa equipa e já está visível na Comunidade do Atelier.</p>
                <p><strong>Você ganhou +150 EXP!</strong> Continue a inspirar.</p>
              </div>
            `
          });
        }
      }
    }

    // =========================================================================
    // 5. GATILHO: MENSAGENS (CHAT)
    // =========================================================================
    if (table === 'messages' && type === 'INSERT') {
      // Descobre quem enviou
      const { data: senderProfile } = await supabase.from('profiles').select('role, nome').eq('id', record.sender_id).single();
      const isSenderAdmin = senderProfile?.role === 'admin';

      // Busca dados do canal para saber a quem pertence a mensagem
      const { data: channel } = await supabase.from('channels').select('project_id, is_private').eq('id', record.channel_id).single();
      
      if (channel && !channel.is_private) {
        const client = await getClientProfile(channel.project_id);
        
        if (isSenderAdmin && client?.email) {
          // Admin enviou -> Avisa o Cliente
          await resend.emails.send({
            from: FROM_EMAIL, to: client.email,
            subject: `💬 Nova mensagem da equipa Liz Design`,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><h2 style="color: #8c6e54;">Olá!</h2><p>Tem uma nova mensagem na sua Caixa de Comunicação Corporativa.</p><a href="https://atelier.lizdesign.com.br/canais" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8c6e54; color: white; text-decoration: none; border-radius: 8px;">Ler Mensagem</a></div>`
          });
        } else if (!isSenderAdmin) {
          // Cliente enviou -> Avisa o Admin
          await resend.emails.send({
            from: FROM_EMAIL, to: ADMIN_EMAIL,
            subject: `💬 Mensagem de ${senderProfile?.nome}`,
            html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #5c4b3c; background-color: #FEF5E6;"><h2 style="color: #8c6e54;">Caixa de Entrada</h2><p>O cliente <strong>${senderProfile?.nome}</strong> enviou uma mensagem.</p><a href="https://atelier.lizdesign.com.br/admin/inbox" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8c6e54; color: white; text-decoration: none; border-radius: 8px;">Abrir Inbox</a></div>`
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