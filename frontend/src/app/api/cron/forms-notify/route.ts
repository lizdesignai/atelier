import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Resend } from 'resend';
import { sendEmailSafely, buildAppLikeEmail } from '@/lib/resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = 'lizsacramentosa@gmail.com'; 
const portalUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://atelier-zwlt.onrender.com';

export async function GET(request: Request) {
  // Verificação de segurança (Vercel Cron Header)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sql = getDb();
    
    // Buscar itens não notificados em cada tabela
    const instas = await sql`
      SELECT id, dados_completos 
      FROM orcamentos_gerenciamento_instagram 
      WHERE notificado = false
    `;
    
    const idvs = await sql`
      SELECT id, dados_completos, "Nome"
      FROM orcamentos_identidade_visual 
      WHERE notificado = false
    `;
    
    const consultorias = await sql`
      SELECT id, dados_completos, "Nome"
      FROM consultorias_posicionamento 
      WHERE notificado = false
    `;

    const briefingsIdv = await sql`
      SELECT id, dados_completos, "Nome_Cliente", "Email", "WhatsApp"
      FROM briefings_identidade_visual 
      WHERE notificado = false
    `;

    const hasNewForms = instas.length > 0 || idvs.length > 0 || consultorias.length > 0 || briefingsIdv.length > 0;

    if (!hasNewForms) {
      return NextResponse.json({ success: true, message: 'Nenhum formulário novo para notificar.' });
    }

    // --- LÓGICA DE CRIAÇÃO DE LEADS AUTOMÁTICA ---
    const createLeadIfNotExists = async (nome: string, email: string, telefone: string, nicho: string) => {
      if (!email || email.trim() === '') return;
      try {
        const existing = await sql`SELECT id FROM leads WHERE email = ${email}`;
        if (existing.length === 0) {
          await sql`
            INSERT INTO leads (nome, email, telefone, status, nicho)
            VALUES (${nome || 'Cliente Sem Nome'}, ${email}, ${telefone || ''}, 'prospect', ${nicho || 'Indefinido'})
          `;
        }
      } catch (e) {
        console.error('Erro ao criar lead automaticamente:', e);
      }
    };

    // Montar o corpo do email e criar leads
    let emailContent = `<p>Você tem novos formulários recebidos aguardando análise:</p><ul>`;
    
    for (const form of instas) {
      const nome = form.dados_completos?.Nome || 'Cliente Não Identificado';
      const email = form.dados_completos?.Email;
      const zap = form.dados_completos?.WhatsApp;
      emailContent += `<li><strong>Gerenciamento de Instagram:</strong> ${nome}</li>`;
      await createLeadIfNotExists(nome, email, zap, 'Instagram');
    }
    
    for (const form of idvs) {
      const nome = form.dados_completos?.Nome || form.Nome || 'Cliente Não Identificado';
      const email = form.dados_completos?.Email;
      const zap = form.dados_completos?.WhatsApp;
      emailContent += `<li><strong>Orçamento Identidade Visual:</strong> ${nome}</li>`;
      await createLeadIfNotExists(nome, email, zap, 'Identidade Visual');
    }
    
    for (const form of consultorias) {
      const nome = form.dados_completos?.Nome || form.Nome || 'Cliente Não Identificado';
      const email = form.dados_completos?.Email;
      const zap = form.dados_completos?.WhatsApp;
      emailContent += `<li><strong>Consultoria de Posicionamento:</strong> ${nome}</li>`;
      await createLeadIfNotExists(nome, email, zap, 'Consultoria');
    }

    for (const form of briefingsIdv) {
      const d = form.dados_completos || {};
      const nome = form.Nome_Cliente || d.Nome_Cliente || d.nome || 'Cliente Não Identificado';
      const email = form.Email || d.Email || d.email;
      const zap = form.WhatsApp || d.WhatsApp || d.whatsapp;
      emailContent += `<li><strong>Briefing Identidade Visual:</strong> ${nome}</li>`;
      await createLeadIfNotExists(nome, email, zap, 'Identidade Visual');
    }
    
    emailContent += `</ul>`;

    // Disparar o Email
    await sendEmailSafely(
      resend,
      ADMIN_EMAIL,
      `🔔 Novos Formulários e Briefings Recebidos!`,
      buildAppLikeEmail(
        "🔔",
        "Novos Formulários / Briefings",
        emailContent,
        "Acessar Painel de Captação",
        `${portalUrl}/admin`
      ),
      "Form Notifications Cron"
    );

    // Marcar como notificado
    if (instas.length > 0) {
      const instaIds = instas.map((i: any) => i.id);
      await sql`UPDATE orcamentos_gerenciamento_instagram SET notificado = true WHERE id = ANY(${instaIds})`;
    }
    
    if (idvs.length > 0) {
      const idvIds = idvs.map((i: any) => i.id);
      await sql`UPDATE orcamentos_identidade_visual SET notificado = true WHERE id = ANY(${idvIds})`;
    }
    
    if (consultorias.length > 0) {
      const consIds = consultorias.map((i: any) => i.id);
      await sql`UPDATE consultorias_posicionamento SET notificado = true WHERE id = ANY(${consIds})`;
    }

    if (briefingsIdv.length > 0) {
      const briefIds = briefingsIdv.map((i: any) => i.id);
      await sql`UPDATE briefings_identidade_visual SET notificado = true WHERE id = ANY(${briefIds})`;
    }

    return NextResponse.json({ success: true, message: 'Notificações enviadas e Leads gerados.' });
  } catch (error: any) {
    console.error('[Cron Form Notify] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
