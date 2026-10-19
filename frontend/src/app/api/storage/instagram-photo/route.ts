// src/app/api/storage/instagram-photo/route.ts
import { NextRequest, NextResponse } from 'next/server';

function generateInstagramPlaceholderSvg(title: string = 'Studio Veronna'): string {
  const shortTitle = title.length > 24 ? title.substring(0, 22) + '...' : title;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="igGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FAF7F5"/>
      <stop offset="50%" stop-color="#F3EBE6"/>
      <stop offset="100%" stop-color="#EADBCE"/>
    </linearGradient>
    <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#B66940"/>
      <stop offset="100%" stop-color="#8B4520"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#igGrad)"/>
  <rect x="24" y="24" width="552" height="552" rx="32" fill="none" stroke="#D9C9BF" stroke-width="2" stroke-dasharray="8 8" opacity="0.6"/>
  
  <!-- Subtle brand watermark -->
  <circle cx="300" cy="270" r="70" fill="url(#iconGrad)" opacity="0.08"/>
  
  <!-- Camera icon -->
  <g transform="translate(255, 225) scale(1.5)" fill="none" stroke="#142C48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="7" width="56" height="46" rx="10"/>
    <circle cx="30" cy="30" r="14"/>
    <circle cx="46" cy="16" r="3" fill="#142C48"/>
  </g>
  
  <text x="300" y="380" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="#2E2825" text-anchor="middle" letter-spacing="0.5">${shortTitle}</text>
  <text x="300" y="414" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#142C48" text-anchor="middle" letter-spacing="3">STUDIO VERONNA • ATELIER</text>
  <text x="300" y="442" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="#8C827A" text-anchor="middle">Feed & Gestão de Instagram</text>
</svg>`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  const label = searchParams.get('label') || 'Studio Veronna';

  if (!targetUrl) {
    const svg = generateInstagramPlaceholderSvg(label);
    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  }

  // Tenta buscar no upstream com headers amigáveis (sem Referer para evitar bloqueio da Meta)
  try {
    let cleanTargetUrl = targetUrl.trim();
    if (!cleanTargetUrl.startsWith('http://') && !cleanTargetUrl.startsWith('https://')) {
      cleanTargetUrl = `https://${cleanTargetUrl}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const upstreamRes = await fetch(cleanTargetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      referrerPolicy: 'no-referrer',
    });

    clearTimeout(timeout);

    if (upstreamRes.ok) {
      const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await upstreamRes.arrayBuffer();
      return new NextResponse(Buffer.from(arrayBuffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=604800, immutable',
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
      });
    }
  } catch (err) {
    // Upstream falhou ou expirou (comum com CDN do Instagram / Meta)
  }

  // Fallback elegante
  const svg = generateInstagramPlaceholderSvg(label);
  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  });
}
