// src/app/api/tessera/reviews/[id]/decide/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireTessera, authError } from '@/lib/tessera/authHelper';
import { assertUuid, readJson, toResponse } from '@/lib/tessera/errors';
import { decideReview } from '@/lib/tessera/tesseraReviews';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireTessera('manager');
    if (!auth.ok) return authError(auth);

    const { id } = await params;
    assertUuid(id);

    const body = await readJson(request);
    const result = await decideReview(
      auth.organization.id,
      id,
      {
        decision: body.decision,
        reason_category: body.reason_category,
        comment: body.comment,
      },
      { id: auth.user.id, isManager: auth.isManager },
    );

    return NextResponse.json(result);
  } catch (err) {
    return toResponse(err);
  }
}
