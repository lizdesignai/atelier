// PUT /api/auth/change-password
// Altera a senha do usuário autenticado (requer senha atual).

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { verifyToken, verifyPassword, hashPassword, COOKIE_NAME } from '@/lib/auth';

export async function PUT(request: Request) {
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
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Senha atual e nova senha são obrigatórios.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Buscar senha atual
    const users = await sql`
      SELECT id, password_hash FROM profiles WHERE id = ${payload.sub} LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const user = users[0];

    if (!user.password_hash) {
      return NextResponse.json(
        { error: 'Senha não configurada. Contacte o administrador.' },
        { status: 400 }
      );
    }

    // Verificar senha atual
    const isCurrentValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: 'Senha atual incorreta.' },
        { status: 401 }
      );
    }

    // Hash da nova senha
    const newHash = await hashPassword(newPassword);

    await sql`
      UPDATE profiles SET password_hash = ${newHash} WHERE id = ${payload.sub}
    `;

    return NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso.',
    });
  } catch (error: any) {
    console.error('[Change Password] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}

