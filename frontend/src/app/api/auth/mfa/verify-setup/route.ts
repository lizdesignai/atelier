// POST /api/auth/mfa/verify-setup
// Confirma o setup do MFA verificando o primeiro código do Google Authenticator.
// Após sucesso, MFA fica permanentemente ativo na conta.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { verifyToken, verifyMfaCode, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: Request) {
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

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Código de verificação é obrigatório.' },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Buscar o secret não-ativado
    const users = await sql`
      SELECT id, mfa_secret, mfa_enabled FROM profiles WHERE id = ${payload.sub} LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const user = users[0];

    if (!user.mfa_secret) {
      return NextResponse.json(
        { error: 'Nenhum setup MFA pendente. Inicie o processo em /api/auth/mfa/setup.' },
        { status: 400 }
      );
    }

    if (user.mfa_enabled) {
      return NextResponse.json(
        { error: 'MFA já está ativo na sua conta.' },
        { status: 409 }
      );
    }

    // Verificar código TOTP
    const cleanCode = code.replace(/\s/g, '');
    const isValid = verifyMfaCode(user.mfa_secret, cleanCode);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Código inválido. Verifique o Google Authenticator e tente novamente.' },
        { status: 401 }
      );
    }

    // Ativar MFA permanentemente
    await sql`
      UPDATE profiles
      SET mfa_enabled = true, mfa_verified = true
      WHERE id = ${payload.sub}
    `;

    return NextResponse.json({
      success: true,
      message: 'MFA ativado com sucesso! A partir de agora, será necessário o código do Google Authenticator para fazer login.',
    });
  } catch (error: any) {
    console.error('[MFA Verify Setup] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/mfa/verify-setup
// Desativa o MFA da conta (requer código válido para confirmar)
export async function DELETE(request: Request) {
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

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Código de verificação é obrigatório para desativar MFA.' },
        { status: 400 }
      );
    }

    const sql = getDb();
    const users = await sql`
      SELECT id, mfa_secret, mfa_enabled FROM profiles WHERE id = ${payload.sub} LIMIT 1
    `;

    if (users.length === 0 || !users[0].mfa_enabled || !users[0].mfa_secret) {
      return NextResponse.json({ error: 'MFA não está ativo.' }, { status: 400 });
    }

    const cleanCode = code.replace(/\s/g, '');
    const isValid = verifyMfaCode(users[0].mfa_secret, cleanCode);

    if (!isValid) {
      return NextResponse.json({ error: 'Código inválido.' }, { status: 401 });
    }

    await sql`
      UPDATE profiles
      SET mfa_enabled = false, mfa_verified = false, mfa_secret = NULL
      WHERE id = ${payload.sub}
    `;

    return NextResponse.json({
      success: true,
      message: 'MFA desativado com sucesso.',
    });
  } catch (error: any) {
    console.error('[MFA Disable] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

