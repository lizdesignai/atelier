// POST /api/auth/reset-password
// Solicita reset de senha — gera token e envia email via Resend.

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'E-mail é obrigatório.' },
        { status: 400 }
      );
    }

    const sql = getDb();
    const cleanEmail = email.trim().toLowerCase();

    // Buscar usuário
    const users = await sql`
      SELECT id, email, nome FROM profiles WHERE LOWER(email) = ${cleanEmail} LIMIT 1
    `;

    // Sempre retorna sucesso para não revelar se o email existe
    if (users.length === 0) {
      return NextResponse.json({
        message: 'Se o e-mail existir no sistema, enviaremos um link de recuperação.',
      });
    }

    const user = users[0];

    // Gerar token de reset (64 chars hex)
    const resetToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Token expira em 1 hora
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Salvar token no banco
    await sql`
      UPDATE profiles
      SET password_reset_token = ${resetToken}, password_reset_expires = ${expiresAt}
      WHERE id = ${user.id}
    `;

    // Enviar email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const origin = request.headers.get('origin') || 'http://localhost:3000';
      const resetUrl = `${origin}/login?reset=${resetToken}`;

      try {
        await resend.emails.send({
          from: 'Atelier <noreply@lizdesign.com.br>',
          to: user.email,
          subject: 'Recuperação de Senha — Atelier',
          html: `
            <div style="font-family: 'Roboto', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
              <h2 style="color: #4A3728; margin-bottom: 8px;">Olá, ${user.nome || 'Utilizador'}.</h2>
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Recebemos uma solicitação para redefinir a sua senha no Atelier.
              </p>
              <a href="${resetUrl}" 
                 style="display: inline-block; background: #4A3728; color: white; text-decoration: none; 
                        padding: 14px 32px; border-radius: 24px; font-size: 13px; font-weight: 700; 
                        letter-spacing: 0.1em; text-transform: uppercase; margin: 24px 0;">
                Redefinir Senha
              </a>
              <p style="color: #999; font-size: 12px; margin-top: 24px;">
                Este link expira em 1 hora. Se não solicitou esta alteração, ignore este e-mail.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('[Reset Password] Erro ao enviar email:', emailError);
        // Não falhar — o token foi salvo no banco
      }
    }

    return NextResponse.json({
      message: 'Se o e-mail existir no sistema, enviaremos um link de recuperação.',
    });
  } catch (error: any) {
    console.error('[Reset Password] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}

