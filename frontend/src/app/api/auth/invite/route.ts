// POST /api/auth/invite
// Admin/Gestor cria um novo usuário via convite.
// Senha padrão: Atelier2026! (o usuário poderá alterar depois)

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { verifyToken, hashPassword, COOKIE_NAME } from '@/lib/auth';

const DEFAULT_PASSWORD = 'Atelier2026!';

export async function POST(request: Request) {
  try {
    // Verificar autenticação
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

    // Verificar se é admin ou gestor
    if (!['admin', 'gestor'].includes(payload.role)) {
      return NextResponse.json(
        { error: 'Apenas administradores e gestores podem convidar usuários.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, nome, role, empresa, instagram } = body;

    if (!email || !nome) {
      return NextResponse.json(
        { error: 'E-mail e nome são obrigatórios.' },
        { status: 400 }
      );
    }

    // Validar role
    const validRoles = ['client', 'colaborador', 'gestor', 'admin', 'contador'];
    const userRole = role || 'client';
    if (!validRoles.includes(userRole)) {
      return NextResponse.json(
        { error: `Role inválida. Válidas: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Apenas admin pode criar outros admin
    if (userRole === 'admin' && payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas administradores podem criar contas admin.' },
        { status: 403 }
      );
    }

    const sql = getDb();
    const cleanEmail = email.trim().toLowerCase();

    // Verificar se email já existe
    const existing = await sql`
      SELECT id FROM profiles WHERE LOWER(email) = ${cleanEmail} LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Este e-mail já está registado no sistema.' },
        { status: 409 }
      );
    }

    // Gerar ID e hash da senha padrão
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(DEFAULT_PASSWORD);

    // Tratar o instagram
    let cleanInstagram = (instagram || '').trim();
    if (cleanInstagram && !cleanInstagram.startsWith('@') && !cleanInstagram.includes('instagram.com/')) {
      cleanInstagram = `@${cleanInstagram}`;
    }

    // Inserir no banco
    await sql`
      INSERT INTO profiles (id, email, nome, role, empresa, instagram, password_hash, created_at)
      VALUES (${userId}, ${cleanEmail}, ${nome.trim()}, ${userRole}, ${empresa || null}, ${cleanInstagram || null}, ${passwordHash}, NOW())
    `;

    // Se for client, criar projeto inicial
    if (userRole === 'client' && empresa && !body.skipProjectCreation) {
      const projectId = crypto.randomUUID();
      await sql`
        INSERT INTO projects (id, client_id, name, status, created_at)
        VALUES (${projectId}, ${userId}, ${`Projeto ${empresa.trim()}`}, 'active', NOW())
      `;
    }

    return NextResponse.json(
      {
        user: {
          id: userId,
          email: cleanEmail,
          nome: nome.trim(),
          role: userRole,
          empresa: empresa || null,
          instagram: cleanInstagram || null,
        },
        defaultPassword: DEFAULT_PASSWORD,
        message: `Usuário criado com sucesso. Senha padrão: ${DEFAULT_PASSWORD}`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Auth Invite] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}

