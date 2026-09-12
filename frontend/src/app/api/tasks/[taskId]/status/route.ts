import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const { requestedStatus, collaboratorName } = body;

    if (!taskId || !requestedStatus) {
      return NextResponse.json({ error: 'Missing taskId or requestedStatus' }, { status: 400 });
    }

    const sql = getDb();
    
    // Determine timestamp updates based on status
    let updateQuery = `
      UPDATE tasks 
      SET 
        status = $1,
        updated_at = NOW()
    `;
    const queryParams: any[] = [requestedStatus];
    let paramIndex = 2;

    if (requestedStatus === 'in_progress') {
      updateQuery += `, started_at = COALESCE(started_at, NOW())`;
    } else if (requestedStatus === 'completed' || requestedStatus === 'pending_client_approval') {
      updateQuery += `, completed_at = NOW()`;
    }

    updateQuery += ` WHERE id = $${paramIndex} RETURNING *`;
    queryParams.push(taskId);

    const result = await (sql as any).query(updateQuery, queryParams);

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result[0] });

  } catch (error: any) {
    console.error('Error updating task status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
