// src/app/api/tessera/focus/force-today/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireTessera, authError } from '@/lib/tessera/authHelper';
import { assertUuid, readJson, toResponse } from '@/lib/tessera/errors';
import { clearForce, forceToday } from '@/lib/tessera/tesseraSessions';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTessera('manager');
    if (!auth.ok) return authError(auth);

    const body = await readJson(request);
    const itemId = assertUuid(body.work_item_id, 'work_item_id');
    const actor = { id: auth.user.id, isManager: auth.isManager };

    if (body.clear === true) {
      const item = await clearForce(auth.organization.id, itemId, actor);
      return NextResponse.json({ item });
    }

    const result = await forceToday(auth.organization.id, itemId, String(body.reason ?? ''), actor);
    return NextResponse.json(result);
  } catch (err) {
    return toResponse(err);
  }
}
