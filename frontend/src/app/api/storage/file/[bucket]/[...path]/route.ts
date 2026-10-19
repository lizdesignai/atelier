// src/app/api/storage/file/[bucket]/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';
import pathModule from 'path';

function getMimeType(filePath: string): string {
  const ext = pathModule.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.pdf':
      return 'application/pdf';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    default:
      return 'application/octet-stream';
  }
}

function getInitialsFromName(name: string): string {
  if (!name) return 'SV';
  const clean = name.trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function generateAvatarSvg(initials: string): string {
  const safeInitials = (initials || 'SV').substring(0, 2).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#B66940"/>
      <stop offset="100%" stop-color="#8B4520"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" fill="url(#avatarGrad)" rx="64"/>
  <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="700" fill="#ffffff" dominant-baseline="middle" text-anchor="middle" letter-spacing="1">${safeInitials}</text>
</svg>`;
}

function generatePlaceholderSvg(fileName: string, bucket: string): string {
  const cleanName = pathModule.basename(fileName || 'Arquivo');
  const shortName = cleanName.length > 28 ? cleanName.substring(0, 25) + '...' : cleanName;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
  <rect width="400" height="260" fill="#f8f7f5"/>
  <rect x="16" y="16" width="368" height="228" rx="16" fill="#eeebe6" stroke="#dedbd5" stroke-width="1.5" stroke-dasharray="6 6"/>
  <circle cx="200" cy="95" r="32" fill="#142C48" opacity="0.12"/>
  <path d="M188 106 L196 94 L204 102 L212 90 L220 106 Z" fill="#142C48" opacity="0.8"/>
  <circle cx="193" cy="92" r="3.5" fill="#142C48" opacity="0.8"/>
  <text x="200" y="152" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#3a3633" text-anchor="middle">${shortName}</text>
  <text x="200" y="174" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="600" fill="#8a8580" text-anchor="middle" letter-spacing="1">STUDIO VERONNA ATELIER (${bucket.toUpperCase()})</text>
  <text x="200" y="196" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="500" fill="#142C48" text-anchor="middle">Objeto Registrado no Banco Neon</text>
</svg>`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bucket: string; path: string[] }> }
) {
  try {
    const { bucket, path } = await params;
    if (!bucket || !path || path.length === 0) {
      return new NextResponse('Arquivo não especificado', { status: 400 });
    }

    const relativePath = path.join('/');
    const safeFileName = path[path.length - 1];

    // 1. Tentar buscar no Neon PostgreSQL (tabela storage_objects)
    try {
      const sql = getDb();
      const rows = await sql`
        SELECT file_data, mime_type, file_name 
        FROM storage_objects 
        WHERE bucket_name = ${bucket} AND (file_name = ${relativePath} OR file_name = ${safeFileName}) 
        LIMIT 1
      `;

      if (rows && rows.length > 0 && rows[0].file_data) {
        const fileBuffer = Buffer.from(rows[0].file_data);
        const mimeType = rows[0].mime_type || getMimeType(relativePath);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': String(fileBuffer.length),
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    } catch (dbErr) {
      console.warn('[StorageFile] Erro ao consultar Neon storage_objects:', dbErr);
    }

    // 2. Tentar buscar no disco local (public/uploads/[bucket]/[...])
    try {
      const localDiskPath = pathModule.join(process.cwd(), 'public', 'uploads', bucket, safeFileName);
      if (fs.existsSync(localDiskPath)) {
        const buffer = await fs.promises.readFile(localDiskPath);
        const mimeType = getMimeType(safeFileName);
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': String(buffer.length),
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    } catch (fsErr) {
      console.warn('[StorageFile] Erro ao ler do disco local:', fsErr);
    }

    // 3. Fallback inteligente para Avatares
    if (bucket === 'avatars') {
      let initials = 'SV';
      try {
        const uuidMatch = (relativePath + '/' + safeFileName).match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (uuidMatch) {
          const profileId = uuidMatch[1];
          const sql = getDb();
          const pRows = await sql`
            SELECT nome FROM profiles WHERE id = ${profileId} LIMIT 1
          `;
          if (pRows && pRows.length > 0 && pRows[0].nome) {
            initials = getInitialsFromName(pRows[0].nome);
          }
        }
      } catch (err) {
        console.warn('[StorageFile] Erro ao buscar nome para avatar:', err);
      }

      const svg = generateAvatarSvg(initials);
      return new NextResponse(svg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // 4. Fallback para outros tipos de arquivo
    const svgPlaceholder = generatePlaceholderSvg(safeFileName, bucket);
    return new NextResponse(svgPlaceholder, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });

  } catch (error: any) {
    console.error('[StorageFile] Erro inesperado:', error);
    return new NextResponse('Erro interno', { status: 500 });
  }
}
