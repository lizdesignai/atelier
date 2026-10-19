// src/app/api/tessera/reviews/bulk-approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireTessera, authError } from '@/lib/tessera/authHelper';
import { readJson, toResponse } from '@/lib/tessera/errors';
import { bulkApprove } from '@/lib/tessera/tesseraReviews';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTessera('manager');
    if (!auth.ok) return authError(auth);

    const body = await readJson(request);
    const result = await bulkApprove(auth.organization.id, body.ids, {
      id: auth.user.id,
      isManager: auth.isManager,
    });

    return NextResponse.json(result);
  } catch (err) {
    return toResponse(err);
  }
}
