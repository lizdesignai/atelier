// src/app/api/tessera/focus/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireTessera, authError } from '@/lib/tessera/authHelper';
import { assertUuid, badRequest, readJson, toResponse } from '@/lib/tessera/errors';
import { startSession, stopSession } from '@/lib/tessera/tesseraSessions';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTessera('team');
    if (!auth.ok) return authError(auth);

    const body = await readJson(request);
    const actor = { id: auth.user.id, isManager: auth.isManager };

    if (body.action === 'start') {
      const itemId = assertUuid(body.work_item_id, 'work_item_id');
      const result = await startSession(auth.organization.id, itemId, actor);
      return NextResponse.json(result);
    }

    if (body.action === 'stop') {
      const result = await stopSession(auth.organization.id, actor);
      return NextResponse.json(result);
    }

    throw badRequest('action deve ser "start" ou "stop".');
  } catch (err) {
    return toResponse(err);
  }
}
