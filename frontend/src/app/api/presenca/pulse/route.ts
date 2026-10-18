// POST /api/presenca/pulse - Salvar respostas do pulso mensal
// GET  /api/presenca/pulse?projectId=xxx - Verificar se o pulso precisa ser respondido

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { CycleEngine } from '@/lib/presenca/CycleEngine';
import { PULSE_QUESTIONS } from '@/lib/presenca/constants';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('atelier_session')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const payload = await verifyToken(token);
    if (payload.type !== 'session') return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });

    const cycle = await CycleEngine.ensureCurrentCycle(projectId);

    const needed = !cycle.pulse_answered_at;
    const daysRemaining = Math.max(0, Math.ceil(
      (new Date(cycle.period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ));

    return NextResponse.json({
      needed,
      urgent: needed && daysRemaining <= 7,
      cycleId: cycle.id,
      cycleNumber: cycle.cycle_number,
      periodEnd: cycle.period_end,
      daysRemaining,
      questions: PULSE_QUESTIONS,
      existingAnswers: cycle.pulse_answers || {},
    });
  } catch (error: any) {
    console.error('[api/presenca/pulse] GET Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('atelier_session')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const payload = await verifyToken(token);
    if (payload.type !== 'session') return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { cycleId, answers } = body;

    if (!cycleId || !answers) {
      return NextResponse.json({ error: 'cycleId and answers are required' }, { status: 400 });
    }

    const cycle = await CycleEngine.savePulseAnswers(cycleId, answers);
    return NextResponse.json({ success: true, cycle });
  } catch (error: any) {
    console.error('[api/presenca/pulse] POST Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
