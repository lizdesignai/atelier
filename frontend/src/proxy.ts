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
];

function getJwtSecretBytes(): Uint8Array {
  const secret = process.env.JWT_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    || 'atelier-jwt-secret-production-fallback-2026';
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
            url.pathname = role === 'client' ? '/' : role === 'contador' ? '/admin/financeiro' : '/admin/fio';
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
      await jwtVerify(token, getJwtSecretBytes());
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

    // Clientes não podem acessar /admin
    if (role === 'client' && pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Admin/Gestor acessando / são redirecionados para /admin/fio
    if ((role === 'admin' || role === 'gestor') && pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/fio';
      return NextResponse.redirect(url);
    }

    // Contador acessando / redireciona para financeiro
    if (role === 'contador' && pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/financeiro';
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
