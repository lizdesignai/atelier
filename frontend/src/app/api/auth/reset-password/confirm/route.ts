// POST /api/auth/reset-password/confirm
// Confirma o reset de senha usando o token recebido por email.

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token e nova senha são obrigatórios.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Buscar usuário pelo token
    const users = await sql`
      SELECT id, email, password_reset_token, password_reset_expires
      FROM profiles
      WHERE password_reset_token = ${token}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Token inválido ou já utilizado.' },
        { status: 400 }
      );
    }

    const user = users[0];

    // Verificar expiração
    if (user.password_reset_expires && new Date(user.password_reset_expires) < new Date()) {
      // Limpar token expirado
      await sql`
        UPDATE profiles
        SET password_reset_token = NULL, password_reset_expires = NULL
        WHERE id = ${user.id}
      `;

      return NextResponse.json(
        { error: 'Token expirado. Solicite uma nova recuperação de senha.' },
        { status: 400 }
      );
    }

    // Hash da nova senha
    const passwordHash = await hashPassword(newPassword);

    // Atualizar senha e limpar token
    await sql`
      UPDATE profiles
      SET password_hash = ${passwordHash},
          password_reset_token = NULL,
          password_reset_expires = NULL
      WHERE id = ${user.id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso. Faça login com a nova senha.',
    });
  } catch (error: any) {
    console.error('[Reset Password Confirm] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}

