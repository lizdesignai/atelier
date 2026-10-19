// src/app/api/tessera/work-items/[id]/checklist/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireTessera, authError } from '@/lib/tessera/authHelper';
import { assertUuid, readJson, toResponse } from '@/lib/tessera/errors';
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from '@/lib/tessera/tesseraItems';

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
    const item = await addChecklistItem(auth.organization.id, id, body.title, {
      id: auth.user.id,
      isManager: auth.isManager,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireTessera('team');
    if (!auth.ok) return authError(auth);

    const body = await readJson(request);
    const checklistId = assertUuid(body.checklist_id, 'checklist_id');
    const item = await toggleChecklistItem(auth.organization.id, checklistId, body.is_completed, {
      id: auth.user.id,
      isManager: auth.isManager,
    });

    return NextResponse.json({ item });
  } catch (err) {
    return toResponse(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireTessera('team');
    if (!auth.ok) return authError(auth);

    const { searchParams } = new URL(request.url);
    const checklistId = assertUuid(searchParams.get('checklist_id'), 'checklist_id');
    await deleteChecklistItem(auth.organization.id, checklistId, {
      id: auth.user.id,
      isManager: auth.isManager,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toResponse(err);
  }
}
