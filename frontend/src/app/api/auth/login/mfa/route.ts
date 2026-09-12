// POST /api/auth/login/mfa
// Segunda etapa do login: verifica código TOTP de 6 dígitos do Google Authenticator.

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  verifyToken,
  verifyMfaCode,
  generateToken,
  COOKIE_NAME,
  getSessionCookieOptions,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mfaToken, code } = body;

    if (!mfaToken || !code) {
      return NextResponse.json(
        { error: 'Token MFA e código são obrigatórios.' },
        { status: 400 }
      );
    }

    // Validar o token temporário de MFA
    let payload;
    try {
      payload = await verifyToken(mfaToken);
    } catch {
      return NextResponse.json(
        { error: 'Token MFA expirado ou inválido. Faça login novamente.' },
        { status: 401 }
      );
    }

    if (payload.type !== 'mfa_pending') {
      return NextResponse.json(
        { error: 'Token inválido para verificação MFA.' },
        { status: 401 }
      );
    }

    // Buscar o secret MFA do usuário
    const sql = getDb();
    const users = await sql`
      SELECT id, email, nome, role, mfa_secret, mfa_enabled, avatar_url, empresa, cargo
      FROM profiles
      WHERE id = ${payload.sub}
      LIMIT 1
    `;

    if (users.length === 0 || !users[0].mfa_secret || !users[0].mfa_enabled) {
      return NextResponse.json(
        { error: 'MFA não configurado para esta conta.' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Verificar código TOTP
    const cleanCode = code.replace(/\s/g, '');
    const isValidCode = verifyMfaCode(user.mfa_secret, cleanCode);

    if (!isValidCode) {
      return NextResponse.json(
        { error: 'Código inválido. Verifique o Google Authenticator e tente novamente.' },
        { status: 401 }
      );
    }

    // Código válido — gerar sessão completa
    const sessionToken = await generateToken(
      { sub: user.id, email: user.email, role: user.role },
      'session'
    );

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
        avatar_url: user.avatar_url,
        empresa: user.empresa,
        cargo: user.cargo,
        mfa_enabled: true,
      },
    });

    response.cookies.set(COOKIE_NAME, sessionToken, getSessionCookieOptions());

    return response;
  } catch (error: any) {
    console.error('[Auth MFA Verify] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}

