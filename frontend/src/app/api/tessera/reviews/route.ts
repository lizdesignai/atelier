// src/app/api/tessera/reviews/route.ts
import { NextResponse } from 'next/server';
import { requireTessera, authError } from '@/lib/tessera/authHelper';
import { toResponse } from '@/lib/tessera/errors';
import { getReviewInbox } from '@/lib/tessera/tesseraReviews';

export async function GET() {
  try {
    const auth = await requireTessera('team');
    if (!auth.ok) return authError(auth);

    const items = await getReviewInbox(auth.organization.id);
    const now = Date.now();
    const counts = {
      total: items.length,
      eligible: items.filter(i => i.eligibility.eligible).length,
      ineligible: items.filter(i => !i.eligibility.eligible).length,
      overdue: items.filter(i => i.internal_due_at && new Date(i.internal_due_at).getTime() < now).length,
    };

    return NextResponse.json({
      items,
      counts,
      viewer: { id: auth.user.id, name: auth.user.nome, role: auth.user.role, isManager: auth.isManager },
    });
  } catch (err) {
    return toResponse(err);
  }
}
