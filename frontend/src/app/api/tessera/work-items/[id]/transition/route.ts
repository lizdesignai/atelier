// src/app/api/tessera/work-items/[id]/transition/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireTessera, authError } from '@/lib/tessera/authHelper';
import { assertUuid, readJson, toResponse } from '@/lib/tessera/errors';
import { transitionItem } from '@/lib/tessera/tesseraItems';

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
    const item = await transitionItem(
      auth.organization.id,
      id,
      body.to_status ?? body.to,
      { id: auth.user.id, isManager: auth.isManager },
      body.reason,
    );

    return NextResponse.json({ item });
  } catch (err) {
    return toResponse(err);
  }
}
