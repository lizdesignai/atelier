// src/app/api/presenca/sync/route.ts
// Endpoint para sincronizar ciclos e gerar demandas de clientes de Instagram.
// Chamado via cron, webhook de faturamento ou manual pelo admin.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { CycleEngine } from '@/lib/presenca/CycleEngine';

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'atelier_cron_internal';
    
    // Permitir autorização via Bearer token (cron/backend) OU cookie de sessão (admin)
    let isAuthorized = false;
    if (authHeader && authHeader.replace('Bearer ', '') === cronSecret) {
      isAuthorized = true;
    } else {
      const cookieStore = await cookies();
      const token = cookieStore.get('atelier_session')?.value;
      if (token) {
        const payload = await verifyToken(token);
        if (payload.type === 'session') {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (projectId) {
      const cycle = await CycleEngine.ensureCurrentCycle(projectId);
      return NextResponse.json({ success: true, cycle });
    }

    const synced = await CycleEngine.syncAllCycles();
    return NextResponse.json({ success: true, total: synced.length, synced });
  } catch (error: any) {
    console.error('[api/presenca/sync] Erro ao sincronizar ciclos:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
