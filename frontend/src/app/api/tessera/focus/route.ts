// src/app/api/tessera/focus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireTessera, authError } from '@/lib/tessera/authHelper';
import { assertUuid, forbidden, toResponse } from '@/lib/tessera/errors';
import { getFocusBoard } from '@/lib/tessera/tesseraSessions';
import { listOrgMembers } from '@/lib/tessera/itemQueries';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTessera('team');
    if (!auth.ok) return authError(auth);

    const { searchParams } = new URL(request.url);
    const requestedOwner = searchParams.get('owner_id');
    let targetOwnerId = auth.user.id;

    if (requestedOwner && requestedOwner !== auth.user.id) {
      if (!auth.isManager) {
        throw forbidden('Apenas gestores podem inspecionar a fila Focus de outros colaboradores.');
      }
      targetOwnerId = assertUuid(requestedOwner, 'owner_id');
    }

    const [board, members] = await Promise.all([
      getFocusBoard(auth.organization.id, targetOwnerId),
      listOrgMembers(auth.organization.id),
    ]);

    return NextResponse.json({
      ...board,
      target_owner_id: targetOwnerId,
      viewer: { id: auth.user.id, name: auth.user.nome, role: auth.user.role, isManager: auth.isManager },
      members,
    });
  } catch (err) {
    return toResponse(err);
  }
}
