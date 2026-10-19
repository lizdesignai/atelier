// src/app/api/tessera/work-items/[id]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireTessera, authError } from '@/lib/tessera/authHelper';
import { assertUuid, readJson, toResponse } from '@/lib/tessera/errors';
import { addComment } from '@/lib/tessera/tesseraItems';

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
    const comment = await addComment(auth.organization.id, id, body.body, {
      id: auth.user.id,
      isManager: auth.isManager,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
