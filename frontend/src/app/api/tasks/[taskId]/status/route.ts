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
    
    // Begin transaction-like execution
    let result;

    if (requestedStatus === 'in_progress') {
      // Starting the task
      const updateQuery = `
        UPDATE tasks 
        SET status = $1, updated_at = NOW(), started_at = COALESCE(started_at, NOW())
        WHERE id = $2 RETURNING *
      `;
      result = await (sql as any).query(updateQuery, [requestedStatus, taskId]);

      if (body.userId) {
        // Insert new open work_session
        await (sql as any).query(`
          INSERT INTO work_sessions (task_id, user_id, start_time)
          VALUES ($1, $2, NOW())
        `, [taskId, body.userId]);
      }

    } else if (['pending', 'review', 'completed', 'pending_client_approval'].includes(requestedStatus)) {
      // Stopping the task
      let updateQuery = `
        UPDATE tasks 
        SET status = $1, updated_at = NOW()
      `;
      if (requestedStatus === 'completed' || requestedStatus === 'pending_client_approval') {
        updateQuery += `, completed_at = NOW()`;
      }
      updateQuery += ` WHERE id = $2 RETURNING *`;
      result = await (sql as any).query(updateQuery, [requestedStatus, taskId]);

      if (body.userId) {
        // Find open session and close it
        const openSessionRes = await (sql as any).query(`
          SELECT id, start_time FROM work_sessions 
          WHERE task_id = $1 AND user_id = $2 AND end_time IS NULL
          ORDER BY start_time DESC LIMIT 1
        `, [taskId, body.userId]);

        if (openSessionRes && openSessionRes.length > 0) {
          const openSession = openSessionRes[0];
          await (sql as any).query(`
            UPDATE work_sessions 
            SET end_time = NOW(),
                duration_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - start_time)) / 60))
            WHERE id = $1
          `, [openSession.id]);
        }
      }
    } else {
      // Other status updates (fallback)
      const updateQuery = `
        UPDATE tasks 
        SET status = $1, updated_at = NOW()
        WHERE id = $2 RETURNING *
      `;
      result = await (sql as any).query(updateQuery, [requestedStatus, taskId]);
    }

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result[0] });

  } catch (error: any) {
    console.error('Error updating task status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
