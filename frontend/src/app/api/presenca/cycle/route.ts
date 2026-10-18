// POST /api/presenca/cycle - Atualizar estratégia do ciclo
// PUT  /api/presenca/cycle - Fechar ou avançar ciclo

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { CycleEngine } from '@/lib/presenca/CycleEngine';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('atelier_session')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const payload = await verifyToken(token);
    if (payload.type !== 'session') return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { cycleId, ...updates } = body;

    if (!cycleId) {
      return NextResponse.json({ error: 'cycleId is required' }, { status: 400 });
    }

    const cycle = await CycleEngine.updateCycleStrategy(cycleId, updates);
    return NextResponse.json({ success: true, cycle });
  } catch (error: any) {
    console.error('[api/presenca/cycle] POST Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('atelier_session')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const payload = await verifyToken(token);
    if (payload.type !== 'session') return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { projectId, action, learnings, nextDecision } = body;

    if (!projectId || !action) {
      return NextResponse.json({ error: 'projectId and action are required' }, { status: 400 });
    }

    let cycle: any;
    switch (action) {
      case 'close': {
        const [current] = await (await import('@/lib/db')).getDb()`
          SELECT id FROM ig_cycles WHERE project_id = ${projectId} AND status = 'open' LIMIT 1
        `;
        if (!current) return NextResponse.json({ error: 'No open cycle found' }, { status: 404 });
        cycle = await CycleEngine.closeCycle(current.id, learnings, nextDecision);
        break;
      }
      case 'advance': {
        cycle = await CycleEngine.advanceCycle(projectId, learnings, nextDecision);
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, cycle });
  } catch (error: any) {
    console.error('[api/presenca/cycle] PUT Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
