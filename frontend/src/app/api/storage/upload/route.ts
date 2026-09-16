import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: { message: 'Configuração de armazenamento (Supabase URL / Service Key) ausente no servidor.' } },
        { status: 500 }
      );
    }

    const supabaseServer = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const formData = await req.formData();
    const bucket = formData.get('bucket') as string;
    const path = formData.get('path') as string;
    const file = formData.get('file') as File | Blob | null;
    const upsertParam = formData.get('upsert');
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
    const isUpsert = String(upsertParam) === 'true';

    const { data, error } = await supabaseServer.storage
      .from(bucket)
      .upload(cleanPath, buffer, {
        contentType,
        upsert: isUpsert,
      });

    if (error) {
      console.error(`[StorageUpload] Erro ao enviar para bucket "${bucket}":`, error.message);
      return NextResponse.json({ error: { message: error.message } }, { status: 400 });
    }

    const { data: urlData } = supabaseServer.storage.from(bucket).getPublicUrl(cleanPath);

    return NextResponse.json({
      data: {
        path: cleanPath,
        fullPath: `${bucket}/${cleanPath}`,
        publicUrl: urlData.publicUrl,
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
