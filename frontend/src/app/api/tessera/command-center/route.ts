// src/app/api/tessera/command-center/route.ts
import { NextResponse } from 'next/server';
import { getTesseraAuth } from '@/lib/tessera/authHelper';
import { getCommandCenterData } from '@/lib/tessera/tesseraDb';

export async function GET() {
  try {
    const auth = await getTesseraAuth();
    if (!auth.organization) {
      return NextResponse.json({ error: auth.error || 'Não autorizado.' }, { status: 401 });
    }

    const data = await getCommandCenterData(auth.organization.id);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Erro no endpoint /api/tessera/command-center:', err);
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 });
  }
}
