// POST /api/auth/reset-password
// Solicita reset de senha — gera token e envia email via Resend.

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Resend } from 'resend';
import { buildAppLikeEmail, sendEmailSafely } from '@/lib/resend';

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
      const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
      const resetUrl = `${origin}/login?reset=${resetToken}`;

      try {
        const htmlContent = buildAppLikeEmail(
          '🔐',
          'Recuperação de Senha',
          `<p>Olá, <strong>${user.nome || 'Utilizador'}</strong>.</p><p>Recebemos uma solicitação para redefinir a sua senha de acesso ao Atelier (Studio Veronna).</p><p style="font-size:12px; color:#71717a;">Este link expira em 1 hora. Caso não tenha solicitado esta alteração, ignore este e-mail com segurança.</p>`,
          'Redefinir Minha Senha',
          resetUrl,
          'SEGURANÇA'
        );
        await sendEmailSafely(
          resend,
          user.email,
          'Recuperação de Senha — Studio Veronna',
          htmlContent,
          'Auth Reset Password'
        );
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

