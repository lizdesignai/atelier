// src/app/api/tessera/work-items/[id]/block/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireTessera, authError } from '@/lib/tessera/authHelper';
import { assertUuid, readJson, toResponse } from '@/lib/tessera/errors';
import { setBlocked } from '@/lib/tessera/tesseraItems';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireTessera('team');
    if (!auth.ok) return authError(auth);

    const { id } = await params;
    assertUuid(id);

    const body = await readJson(request);
    const blocked = Boolean(body.is_blocked ?? body.blocked);
    const item = await setBlocked(
      auth.organization.id,
      id,
      blocked,
      body.reason,
      body.blocker_owner_id,
      { id: auth.user.id, isManager: auth.isManager },
    );

    return NextResponse.json({ item });
  } catch (err) {
    return toResponse(err);
  }
}
