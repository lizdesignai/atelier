// src/app/api/tessera/work-items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireTessera, authError } from '@/lib/tessera/authHelper';
import { toResponse, readJson } from '@/lib/tessera/errors';
import { createItem, getBoard, listItems } from '@/lib/tessera/tesseraItems';
import { listOrgMembers, listOrgProjects } from '@/lib/tessera/itemQueries';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTessera('team');
    if (!auth.ok) return authError(auth);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const owner_id = searchParams.get('owner_id') || undefined;
    const project_id = searchParams.get('project_id') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const q = searchParams.get('q') || undefined;
    const include_closed = searchParams.get('include_closed') === 'true';
    const rawBlocked = searchParams.get('blocked') ?? searchParams.get('is_blocked');
    const blocked = rawBlocked === 'true' ? true : rawBlocked === 'false' ? false : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const view = searchParams.get('view');

    const filters = { status, owner_id, project_id, priority, blocked, q, include_closed, limit };

    if (view === 'board') {
      const [board, members, projects] = await Promise.all([
        getBoard(auth.organization.id, filters),
        listOrgMembers(auth.organization.id),
        listOrgProjects(),
      ]);
      return NextResponse.json({
        items: board.items,
        wip_limits: board.wip_limits,
        members,
        projects,
        viewer: { id: auth.user.id, name: auth.user.nome, role: auth.user.role, isManager: auth.isManager },
      });
    }

    const items = await listItems(auth.organization.id, filters);
    return NextResponse.json({ items });
  } catch (err) {
    return toResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTessera('team');
    if (!auth.ok) return authError(auth);

    const body = await readJson(request);
    const item = await createItem(auth.organization.id, body as any, {
      id: auth.user.id,
      isManager: auth.isManager,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return toResponse(err);
  }
}
