import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { notifyManagementOnServer } from '@/lib/serverNotifications';

const portalUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://atelier.lizdesign.com.br';

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
      const safeEmail = email && email.trim() !== '' ? email.trim() : null;
      const safeTelefone = telefone && telefone.trim() !== '' ? telefone.trim() : null;
      if (!safeEmail && !safeTelefone) return;
      try {
        let existing = [];
        if (safeEmail) {
          existing = await sql`SELECT id FROM leads WHERE email = ${safeEmail}`;
        } else if (safeTelefone) {
          existing = await sql`SELECT id FROM leads WHERE telefone = ${safeTelefone}`;
        }
        if (existing.length === 0) {
          await sql`
            INSERT INTO leads (nome, email, telefone, status, nicho)
            VALUES (${nome || 'Cliente Sem Nome'}, ${safeEmail || ''}, ${safeTelefone || ''}, 'prospect', ${nicho || 'Indefinido'})
          `;
        }
      } catch (e) {
        console.error('Erro ao criar lead automaticamente:', e);
      }
    };

    // Montar o corpo do email e criar leads
    let emailContent = `<p>Você tem novos formulários recebidos aguardando análise:</p><ul>`;
    
    for (const form of instas) {
      const d = form.dados_completos || {};
      const nome = d.Nome || form.nome || 'Cliente Não Identificado';
      const email = d.Email || form.email || '';
      const zap = d.WhatsApp || form.whatsapp || '';
      const nicho = d.Nicho || form.nicho || 'Instagram';
      const posts = d.Quantidade_Posts || form.quantidade_posts || '';
      const invest = d.Investimento || form.investimento || '';
      emailContent += `<li><strong>Gerenciamento de Instagram:</strong> ${nome} (${nicho}${posts ? ' • ' + posts + ' posts' : ''}${invest ? ' • ' + invest : ''})</li>`;
      await createLeadIfNotExists(nome, email, zap, `Instagram - ${nicho}`);
    }
    
    for (const form of idvs) {
      const d = form.dados_completos || {};
      const nome = d.Nome || form.Nome || 'Cliente Não Identificado';
      const email = d.Email || form.Email || '';
      const zap = d.WhatsApp || form.WhatsApp || '';
      const invest = d.Investimento || form.Investimento || '';
      const area = d.Nome_Marca_Area || form.Nome_Marca_Area || '';
      emailContent += `<li><strong>Orçamento Identidade Visual:</strong> ${nome} ${area ? '(' + area + ')' : ''} ${invest ? ' • ' + invest : ''}</li>`;
      await createLeadIfNotExists(nome, email, zap, area || 'Identidade Visual');
    }
    
    for (const form of consultorias) {
      const d = form.dados_completos || {};
      const nome = d.Nome || form.Nome || 'Cliente Não Identificado';
      const email = d.Email || form.Email || '';
      const zap = d.WhatsApp || form.WhatsApp || '';
      const area = d.Nome_Marca_Area || form.Nome_Marca_Area || '';
      emailContent += `<li><strong>Consultoria de Posicionamento:</strong> ${nome} ${area ? '(' + area + ')' : ''}</li>`;
      await createLeadIfNotExists(nome, email, zap, area || 'Consultoria');
    }

    for (const form of briefingsIdv) {
      const d = form.dados_completos || {};
      const nome = form.Nome_Cliente || d.Nome_Cliente || d.nome || 'Cliente Não Identificado';
      const email = form.Email || d.Email || d.email;
      const zap = form.WhatsApp || d.WhatsApp || d.whatsapp;
      const marca = d.Nome_Marca || form.Nome_Marca || d.Nome_Logotipo || form.Nome_Logotipo || '';
      emailContent += `<li><strong>Briefing Identidade Visual:</strong> ${nome} ${marca ? '• ' + marca : ''}</li>`;
      await createLeadIfNotExists(nome, email, zap, marca || 'Identidade Visual');
    }
    
    emailContent += `</ul>`;

    // Disparar Notificação (In-App + E-mail para toda a Liderança ativa)
    await notifyManagementOnServer({
      title: '🎯 Novos Formulários e Briefings Recebidos!',
      message: emailContent,
      type: 'action',
      actionUrl: `${portalUrl}/admin/crm`,
      emailTemplateType: 'admin_alert_briefing',
      extraData: {
        subject: '🔔 Novos Formulários e Briefings Recebidos — Studio Veronna',
        body: emailContent,
        link: `${portalUrl}/admin/crm`,
        buttonText: 'Acessar Painel de Captação',
        badgeText: 'CAPTAÇÃO & CRM',
      },
    });

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
