import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Ignorar rotas internas, API, assets e a própria pasta mobile/tablet
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/mobile') ||
    pathname.startsWith('/tablet') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Identificar o dispositivo pelo cabeçalho
  const userAgent = request.headers.get('user-agent') || '';
  
  // Regras de detecção simples (podem ser aprimoradas posteriormente com next/server userAgent)
  const isMobile = /mobile/i.test(userAgent) && !/ipad|tablet|playbook|silk/i.test(userAgent);
  const isTablet = /ipad|tablet|playbook|silk/i.test(userAgent);

  // Reescrever para Smartphone
  if (isMobile) {
    const url = request.nextUrl.clone();
    url.pathname = `/mobile${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  // Reescrever para Tablet
  if (isTablet) {
    const url = request.nextUrl.clone();
    url.pathname = `/tablet${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  // Desktop passa direto sem intervenção
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Roda o middleware em todas as rotas, exceto estáticos e imagens
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
