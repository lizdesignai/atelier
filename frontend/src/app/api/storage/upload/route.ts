import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';
import pathModule from 'path';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;
export const runtime = 'nodejs';

interface ParsedUpload {
  bucket: string;
  path: string;
  buffer: Buffer;
  contentType: string;
  safeFileName: string;
}

/**
 * Faz o parsing de multipart/form-data via stream com busboy empacotado pelo Next.js.
 * Suporta arquivos grandes (até 150MB) contornando a limitação de 10MB do req.formData() no Node/Undici.
 */
async function parseMultipartStream(req: NextRequest): Promise<ParsedUpload> {
  const busboyModule = require('next/dist/compiled/busboy');
  const contentTypeHeader = req.headers.get('content-type') || '';

  return new Promise((resolve, reject) => {
    const bb = busboyModule({
      headers: { 'content-type': contentTypeHeader },
      limits: {
        fileSize: 150 * 1024 * 1024, // 150 MB
        fieldSize: 10 * 1024 * 1024,
      },
    });

    const fields: Record<string, string> = {};
    let fileBuffer: Buffer | null = null;
    let fileInfo: any = null;

    bb.on('field', (name: string, val: string) => {
      fields[name] = val;
    });

    bb.on('file', (name: string, fileStream: any, info: any) => {
      fileInfo = info;
      const chunks: Buffer[] = [];
      fileStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      fileStream.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
      fileStream.on('error', (err: any) => reject(err));
    });

    bb.on('finish', () => {
      if (!fields.bucket || !fields.path || !fileBuffer) {
        return reject(new Error('Campos obrigatórios ausentes (bucket, path ou file).'));
      }

      const cleanPath = fields.path.replace(/^\/+/, '');
      const safeName = fileInfo?.filename || pathModule.basename(cleanPath);
      const mime = fields.contentType || fileInfo?.mimeType || 'application/octet-stream';

      resolve({
        bucket: fields.bucket,
        path: cleanPath,
        buffer: fileBuffer,
        contentType: mime,
        safeFileName: safeName,
      });
    });

    bb.on('error', (err: any) => reject(err));

    const webStream = req.body;
    if (!webStream) {
      return reject(new Error('Corpo da requisição vazio.'));
    }

    const nodeStream = Readable.fromWeb(webStream as any);
    nodeStream.pipe(bb);
  });
}

export async function POST(req: NextRequest) {
  try {
    let parsed: ParsedUpload;

    const contentTypeHeader = req.headers.get('content-type') || '';
    if (contentTypeHeader.includes('multipart/form-data') && req.body) {
      try {
        parsed = await parseMultipartStream(req);
      } catch (streamErr: any) {
        console.warn('[StorageUpload] Erro no parsing streaming busboy:', streamErr?.message);
        // Fallback para req.formData caso busboy encontre formato não-padrão
        const formData = await req.formData();
        const bucket = formData.get('bucket') as string;
        const path = formData.get('path') as string;
        const file = formData.get('file') as File | Blob | null;
        const contentTypeParam = formData.get('contentType') as string | null;

        if (!bucket || !path || !file) {
          return NextResponse.json(
            { error: { message: 'Campos obrigatórios ausentes (bucket, path ou file).' } },
            { status: 400 }
          );
        }

        const cleanPath = path.replace(/^\/+/, '');
        const arrayBuffer = await file.arrayBuffer();
        parsed = {
          bucket,
          path: cleanPath,
          buffer: Buffer.from(arrayBuffer),
          contentType: contentTypeParam || (file as File).type || 'application/octet-stream',
          safeFileName: (file as File).name || pathModule.basename(cleanPath),
        };
      }
    } else {
      const formData = await req.formData();
      const bucket = formData.get('bucket') as string;
      const path = formData.get('path') as string;
      const file = formData.get('file') as File | Blob | null;
      const contentTypeParam = formData.get('contentType') as string | null;

      if (!bucket || !path || !file) {
        return NextResponse.json(
          { error: { message: 'Campos obrigatórios ausentes (bucket, path ou file).' } },
          { status: 400 }
        );
      }

      const cleanPath = path.replace(/^\/+/, '');
      const arrayBuffer = await file.arrayBuffer();
      parsed = {
        bucket,
        path: cleanPath,
        buffer: Buffer.from(arrayBuffer),
        contentType: contentTypeParam || (file as File).type || 'application/octet-stream',
        safeFileName: (file as File).name || pathModule.basename(cleanPath),
      };
    }

    const { bucket, path: cleanPath, buffer, contentType, safeFileName } = parsed;
    const fileBaseName = pathModule.basename(cleanPath) || safeFileName;

    // 1. Gravar no Neon PostgreSQL (tabela storage_objects)
    try {
      const sql = getDb();
      await sql`
        DELETE FROM storage_objects 
        WHERE bucket_name = ${bucket} AND (file_name = ${cleanPath} OR file_name = ${fileBaseName})
      `;
      await sql`
        INSERT INTO storage_objects (bucket_name, file_name, file_data, mime_type, size)
        VALUES (${bucket}, ${cleanPath}, ${buffer}, ${contentType}, ${buffer.length})
      `;
    } catch (neonErr: any) {
      console.warn('[StorageUpload] Aviso ao persistir no Neon storage_objects (armazenamento persistirá via disco):', neonErr?.message);
    }

    // 2. Gravar em cache local no disco (public/uploads/[bucket])
    try {
      const uploadDir = pathModule.join(process.cwd(), 'public', 'uploads', bucket);
      await fs.promises.mkdir(uploadDir, { recursive: true });
      const filePath = pathModule.join(uploadDir, fileBaseName);
      await fs.promises.writeFile(filePath, buffer);
    } catch (diskErr: any) {
      console.warn('[StorageUpload] Aviso ao salvar no disco local:', diskErr?.message);
    }

    const publicUrl = `/api/storage/file/${bucket}/${cleanPath}`;

    return NextResponse.json({
      data: {
        path: cleanPath,
        fullPath: `${bucket}/${cleanPath}`,
        publicUrl,
      },
      error: null,
    });
  } catch (err: any) {
    console.error('[StorageUpload] Erro inesperado:', err);
    return NextResponse.json(
      { error: { message: err?.message || 'Erro interno ao processar upload' } },
      { status: 500 }
    );
  }
}
