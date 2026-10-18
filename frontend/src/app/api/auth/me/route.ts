// GET /api/auth/me
// Retorna dados do usuário autenticado a partir do cookie JWT.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { getProductTypeFromProject, getProductRedirectUrl, ProductType } from '@/lib/productHelper';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: 'Não autenticado.' },
        { status: 200 }
      );
    }

    // Verificar e decodificar JWT
    let payload;
    try {
      payload = await verifyToken(token);
    } catch {
      return NextResponse.json(
        { authenticated: false, error: 'Sessão expirada ou inválida.' },
        { status: 200 }
      );
    }

    // Rejeitar tokens MFA pendentes (não são sessões completas)
    if (payload.type !== 'session') {
      return NextResponse.json(
        { authenticated: false, error: 'Sessão incompleta.' },
        { status: 200 }
      );
    }

    // Buscar perfil atualizado do banco
    const sql = getDb();
    const users = await sql`
      SELECT id, email, nome, role, avatar_url, empresa, cargo, 
             mfa_enabled, current_status, instagram, skills,
             cover_url, nif, endereco, created_at
      FROM profiles
      WHERE id = ${payload.sub}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { authenticated: false, error: 'Usuário não encontrado.' },
        { status: 200 }
      );
    }

    const user = users[0];

    let redirectUrl = '/';
    let productType: ProductType = 'idv';
    let activeProject = null;

    if (user.role === 'client') {
      const activeProjects = await sql`
        SELECT * FROM projects
        WHERE client_id = ${user.id}
        AND status IN ('active', 'delivered', 'completed')
        ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC
        LIMIT 1
      `;
      activeProject = activeProjects[0] || null;
      productType = getProductTypeFromProject(activeProject);
      redirectUrl = getProductRedirectUrl(productType);
    } else if (user.role === 'contador') {
      redirectUrl = '/admin/financeiro';
    } else {
      redirectUrl = '/admin/jtbd';
    }

    return NextResponse.json({
      authenticated: true,
      redirectUrl,
      productType,
      activeProject,
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
        avatar_url: user.avatar_url,
        empresa: user.empresa,
        cargo: user.cargo,
        mfa_enabled: user.mfa_enabled || false,
        current_status: user.current_status,
        instagram: user.instagram,
        skills: user.skills,
        cover_url: user.cover_url,
        nif: user.nif,
        endereco: user.endereco,
        created_at: user.created_at,
        productType,
        redirectUrl,
      },
    });
  } catch (error: any) {
    console.error('[Auth Me] Erro:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}

