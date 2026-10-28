// src/middleware.ts
// Middleware de autenticação + device detection.
// ⚠️ Roda em Edge Runtime — usar apenas jose (não importar lib/auth.ts que usa bcryptjs).

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'atelier_session';

// Rotas que NÃO requerem autenticação
const PUBLIC_ROUTES = [
  '/login',
  '/api/auth/login',
  '/api/auth/login/mfa',
  '/api/auth/me',
  '/api/auth/reset-password',
  '/api/auth/logout',
  '/api/forms',
  '/api/briefings',
  '/api/consultorias',
  '/api/cron',
  '/api/webhooks',
  '/api/public-onboarding',
  '/api/pesquisas',
  '/api/storage',
  '/api/sync-instagram',
  '/uploads',
];

function getJwtSecretBytes(): Uint8Array {
  const secret = (process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      'Configuração crítica ausente: defina JWT_SECRET (mínimo 16 caracteres) no ambiente.'
    );
  }
  return new TextEncoder().encode(secret);
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

function isStaticOrInternal(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/mobile') ||
    pathname.startsWith('/tablet') ||
    pathname.includes('.')
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ignorar rotas internas, assets e arquivos estáticos
  if (isStaticOrInternal(pathname)) {
    return NextResponse.next();
  }

  // 2. Rotas públicas — permitir acesso direto
  if (isPublicRoute(pathname)) {
    // Se o usuário já está logado e tenta acessar /login, redirecionar
    if (pathname === '/login' || pathname === '/login/') {
      const token = request.cookies.get(COOKIE_NAME)?.value;
      if (token) {
        try {
          const { payload } = await jwtVerify(token, getJwtSecretBytes());
          if (payload.type === 'session') {
            const role = payload.role as string;
            const url = request.nextUrl.clone();
            url.pathname = role === 'client' ? '/' : role === 'contador' ? '/admin/financeiro' : '/admin/jtbd';
            return NextResponse.redirect(url);
          }
        } catch {
          // Token inválido — continuar para a página de login
        }
      }
    }

    return NextResponse.next();
  }

  // 3. Rotas de API — verificar cookie mas não redirecionar (retornar 401)
  if (pathname.startsWith('/api/')) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    try {
      const { payload } = await jwtVerify(token, getJwtSecretBytes());
      if (payload.type !== 'session') {
        return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
      }

      // Proteger rotas financeiras de API server-side
      if (pathname.startsWith('/api/finance')) {
        const isFin = payload.role === 'admin' || payload.role === 'gestor' || payload.role === 'contador';
        if (!isFin) {
          return NextResponse.json({ error: 'Acesso negado ao financeiro.' }, { status: 403 });
        }
      }

      return NextResponse.next();
    } catch {
      return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    }
  }

  // 4. Rotas protegidas — verificar cookie e redirecionar para login
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes());

    if (payload.type !== 'session') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // 5. Proteção de rotas por role
    const role = payload.role as string;

    // Clientes não podem acessar /admin nem /tessera
    if (role === 'client' && (pathname.startsWith('/admin') || pathname.startsWith('/tessera'))) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Apenas financeiro (admin, gestor, contador) pode acessar /admin/financeiro
    if (pathname.startsWith('/admin/financeiro')) {
      const isFin = role === 'admin' || role === 'gestor' || role === 'contador';
      if (!isFin) {
        const url = request.nextUrl.clone();
        url.pathname = role === 'client' ? '/' : '/admin/jtbd';
        return NextResponse.redirect(url);
      }
    }

    // Contador: acesso estritamente delimitado a financeiro, sintonia (fio), comunidade e configuracoes
    if (role === 'contador') {
      if (pathname === '/') {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/financeiro';
        return NextResponse.redirect(url);
      }

      if (pathname.startsWith('/admin') || pathname.startsWith('/tessera')) {
        const isAllowed =
          pathname === '/admin/financeiro' ||
          pathname.startsWith('/admin/financeiro/') ||
          pathname === '/admin/fio' ||
          pathname.startsWith('/admin/fio/');
        if (!isAllowed) {
          const url = request.nextUrl.clone();
          url.pathname = '/admin/financeiro';
          return NextResponse.redirect(url);
        }
      }
    }

    // Admin/Gestor/Colaborador acessando / são redirecionados para /admin/jtbd
    if ((role === 'admin' || role === 'gestor' || role === 'colaborador') && pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/jtbd';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch {
    // Token inválido ou expirado — redirecionar para login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    // Limpar o cookie inválido
    response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
    return response;
  }
}

export const config = {
  matcher: [
    // Roda o middleware em todas as rotas, exceto estáticos e imagens
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export { proxy as middleware, proxy as default };
