// src/app/api/notify/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, type, clientName, link } = body;

    // Configuração do Remetente (O e-mail que vai aparecer para a pessoa)
    // Nota: O Resend exige que você verifique o seu domínio no painel deles para usar um e-mail personalizado (ex: oi@lizdesign.com.br).
    // Até verificar o domínio, o Resend só permite enviar e-mails de teste para o SEU PRÓPRIO e-mail cadastrado na conta deles usando 'onboarding@resend.dev'.
    const fromEmail = 'Atelier Liz Design <onboarding@resend.dev>'; 

    // O HTML do e-mail (Podemos deixar muito mais bonito depois usando React Email)
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #5c4b3c; background-color: #FEF5E6; border-radius: 10px;">
        <h2 style="color: #8c6e54;">Olá, ${clientName}!</h2>
        <p style="font-size: 16px; line-height: 1.5;">${
          type === 'briefing_sent' ? 'O seu briefing estratégico foi recebido com sucesso pelo Atelier! Nossa equipa já foi notificada e iniciaremos a análise em breve.' :
          type === 'new_direction' ? 'O Atelier acabou de enviar uma nova <strong>Direção Visual</strong> para o seu projeto. Aceda ao seu cofre para avaliar.' :
          type === 'admin_alert_briefing' ? `ALERTA DE SISTEMA: O cliente <strong>${clientName}</strong> acabou de responder ao Briefing Oficial. Aceda à mesa de trabalho.` :
          'Você tem uma nova notificação no seu Atelier Digital.'
        }</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${link || 'https://atelier.lizdesign.com.br'}" style="background-color: #8c6e54; color: white; padding: 12px 24px; text-decoration: none; border-radius: 30px; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 2px;">
            Aceder ao Portal
          </a>
        </div>
      </div>
    `;

    const data = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao enviar e-mail' }, { status: 500 });
  }
}