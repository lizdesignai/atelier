import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';
import pathModule from 'path';

export async function POST(req: NextRequest) {
  try {
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
    const buffer = Buffer.from(arrayBuffer);
    const contentType = contentTypeParam || (file as File).type || 'application/octet-stream';
    const safeFileName = pathModule.basename(cleanPath);

    // 1. Gravar no Neon PostgreSQL (tabela storage_objects)
    try {
      const sql = getDb();
      await sql`
        DELETE FROM storage_objects 
        WHERE bucket_name = ${bucket} AND (file_name = ${cleanPath} OR file_name = ${safeFileName})
      `;
      await sql`
        INSERT INTO storage_objects (bucket_name, file_name, file_data, mime_type, size)
        VALUES (${bucket}, ${cleanPath}, ${buffer}, ${contentType}, ${buffer.length})
      `;
    } catch (neonErr: any) {
      console.warn('[StorageUpload] Aviso ao persistir no Neon storage_objects:', neonErr?.message);
    }

    // 2. Gravar em cache local no disco (public/uploads/[bucket])
    try {
      const uploadDir = pathModule.join(process.cwd(), 'public', 'uploads', bucket);
      await fs.promises.mkdir(uploadDir, { recursive: true });
      const filePath = pathModule.join(uploadDir, safeFileName);
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
