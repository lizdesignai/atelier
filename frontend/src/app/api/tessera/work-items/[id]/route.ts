// src/app/api/tessera/work-items/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireTessera, authError } from '@/lib/tessera/authHelper';
import { assertUuid, readJson, toResponse } from '@/lib/tessera/errors';
import { getDetail, updateItem } from '@/lib/tessera/tesseraItems';
import { listOrgMembers, listOrgProjects } from '@/lib/tessera/itemQueries';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireTessera('team');
    if (!auth.ok) return authError(auth);

    const { id } = await params;
    assertUuid(id);

    const [detail, members, projects] = await Promise.all([
      getDetail(auth.organization.id, id, { id: auth.user.id, isManager: auth.isManager }),
      listOrgMembers(auth.organization.id),
      listOrgProjects(),
    ]);

    return NextResponse.json({ ...detail, members, projects });
  } catch (err) {
    return toResponse(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireTessera('team');
    if (!auth.ok) return authError(auth);

    const { id } = await params;
    assertUuid(id);

    const body = await readJson(request);
    const item = await updateItem(auth.organization.id, id, body, body.version, {
      id: auth.user.id,
      isManager: auth.isManager,
    });

    return NextResponse.json({ item });
  } catch (err) {
    return toResponse(err);
  }
}
