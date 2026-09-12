// POST /api/auth/login
// Autentica com email + senha. Se MFA habilitado, retorna mfaToken para segunda etapa.

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  verifyPassword,
  generateToken,
  COOKIE_NAME,
  getSessionCookieOptions,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const sql = getDb();
    const cleanEmail = email.trim().toLowerCase();

    // Buscar usuário no banco
    const users = await sql`
      SELECT id, email, nome, role, password_hash, mfa_enabled, mfa_secret, avatar_url, empresa, cargo
      FROM profiles
      WHERE LOWER(email) = ${cleanEmail}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Credenciais inválidas. Tente novamente.' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Verificar se o usuário tem senha configurada
    if (!user.password_hash) {
      return NextResponse.json(
        { error: 'Senha não configurada. Contacte o administrador.' },
        { status: 401 }
      );
    }

    // Verificar senha
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas. Tente novamente.' },
        { status: 401 }
      );
    }

    // Se MFA está habilitado, retornar token temporário
    if (user.mfa_enabled && user.mfa_secret) {
      const mfaToken = await generateToken(
        { sub: user.id, email: user.email, role: user.role },
        'mfa_pending'
      );

      return NextResponse.json({
        mfaRequired: true,
        mfaToken,
      });
    }

    // Sem MFA: gerar sessão completa
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
        mfa_enabled: user.mfa_enabled || false,
      },
    });

    // Setar cookie HttpOnly
    response.cookies.set(COOKIE_NAME, sessionToken, getSessionCookieOptions());

    return response;
  } catch (error: any) {
    console.error('[Auth Login] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}

