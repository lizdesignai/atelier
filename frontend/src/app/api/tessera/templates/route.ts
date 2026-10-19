// src/app/api/tessera/templates/route.ts
import { NextResponse } from 'next/server';
import { getTesseraAuth } from '@/lib/tessera/authHelper';
import { getWorkflowTemplates } from '@/lib/tessera/tesseraDb';

export async function GET() {
  try {
    const auth = await getTesseraAuth();
    if (!auth.organization) {
      return NextResponse.json({ error: auth.error || 'Não autorizado.' }, { status: 401 });
    }

    const templates = await getWorkflowTemplates(auth.organization.id);
    return NextResponse.json({ templates });
  } catch (err: any) {
    console.error('Erro no endpoint GET /api/tessera/templates:', err);
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 });
  }
}
