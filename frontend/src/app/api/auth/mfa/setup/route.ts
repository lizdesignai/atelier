// POST /api/auth/mfa/setup
// Gera o secret TOTP e QR code para configurar o Google Authenticator.
// Requer autenticação (apenas admin/gestor).

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import {
  verifyToken,
  generateMfaSecret,
  generateMfaQrCode,
  COOKIE_NAME,
} from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    let payload;
    try {
      payload = await verifyToken(token);
    } catch {
      return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    }

    if (payload.type !== 'session') {
      return NextResponse.json({ error: 'Sessão incompleta.' }, { status: 401 });
    }

    // Verificar se é admin ou gestor (MFA apenas para essas roles)
    if (!['admin', 'gestor'].includes(payload.role)) {
      return NextResponse.json(
        { error: 'MFA está disponível apenas para administradores e gestores.' },
        { status: 403 }
      );
    }

    const sql = getDb();

    // Verificar se MFA já está ativo
    const users = await sql`
      SELECT id, email, mfa_enabled, mfa_secret FROM profiles WHERE id = ${payload.sub} LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const user = users[0];

    if (user.mfa_enabled) {
      return NextResponse.json(
        { error: 'MFA já está ativo na sua conta. Desative primeiro para reconfigurar.' },
        { status: 409 }
      );
    }

    // Gerar novo secret TOTP
    const { secret, uri } = generateMfaSecret(user.email);
    const qrCodeDataUrl = await generateMfaQrCode(uri);

    // Salvar o secret temporariamente (não ativado ainda — será ativado após verify-setup)
    await sql`
      UPDATE profiles
      SET mfa_secret = ${secret}, mfa_enabled = false, mfa_verified = false
      WHERE id = ${payload.sub}
    `;

    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      secret, // Para entrada manual no Google Authenticator
      message: 'Escaneie o QR code no Google Authenticator e insira o código de 6 dígitos para confirmar.',
    });
  } catch (error: any) {
    console.error('[MFA Setup] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}

