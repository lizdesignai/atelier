// POST /api/presenca/approve
// Motor de aprovação contextual: aprovar, solicitar ajuste ou comentar numa peça.

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensurePresencaSchema } from '@/lib/presenca/schema';
import { NotificationEngine } from '@/lib/NotificationEngine';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('atelier_session')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const payload = await verifyToken(token);
    if (payload.type !== 'session') return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { taskId, action, adjustType, comment, actorId, actorName, actorRole } = body;

    if (!taskId || !action) {
      return NextResponse.json({ error: 'taskId and action are required' }, { status: 400 });
    }

    const sql = getDb();
    await ensurePresencaSchema(sql);

    // Buscar tarefa e dados do projeto
    const [task] = await sql`
      SELECT t.*, p.client_id, p.id as proj_id
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = ${taskId}
    `;
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const now = new Date().toISOString();
    const version = (task.ig_revision_round || 0) + (action === 'request_adjust' ? 1 : 0);

    // Inserir evento de aprovação (rastreabilidade)
    await sql`
      INSERT INTO ig_approval_events (
        task_id, project_id, cycle_id, actor_id, actor_role, actor_name,
        action, adjust_type, comment, version
      ) VALUES (
        ${taskId}, ${task.proj_id}, ${task.cycle_id || null},
        ${actorId || payload.sub}, ${actorRole || 'unknown'}, ${actorName || 'Sistema'},
        ${action}, ${adjustType || null}, ${comment || null}, ${version}
      )
    `;

    switch (action) {
      case 'approve': {
        let currentFeedback: any[] = [];
        try {
          currentFeedback = task.admin_feedback ? JSON.parse(task.admin_feedback) : [];
          if (!Array.isArray(currentFeedback)) currentFeedback = [];
        } catch {
          currentFeedback = [];
        }
        currentFeedback.push({
          id: `msg-${Date.now()}`,
          authorName: actorName || 'Cliente',
          role: 'client',
          content: comment || '✅ Documento aprovado pelo cliente.',
          createdAt: now
        });

        await sql`
          UPDATE tasks SET
            status = 'completed',
            completed_at = ${now},
            ig_publish_status = 'approved',
            ig_approved_at = ${now},
            admin_feedback = ${JSON.stringify(currentFeedback)},
            updated_at = ${now}
          WHERE id = ${taskId}
        `;

        // Se tinha social_post vinculado, aprova também
        await sql`
          UPDATE social_posts SET status = 'approved', updated_at = ${now}
          WHERE task_id = ${taskId} AND status != 'approved'
        `;

        // Notificar equipe com link direto para o Focus (/admin/jtbd)
        try {
          await NotificationEngine.notifyManagement(
            '✅ Documento/Peça Aprovada pelo Cliente',
            `${actorName || 'O cliente'} aprovou "${task.title}".`,
            'success',
            '/admin/jtbd'
          );
        } catch (e) { /* non-blocking */ }
        break;
      }

      case 'request_adjust': {
        let currentFeedback: any[] = [];
        try {
          currentFeedback = task.admin_feedback ? JSON.parse(task.admin_feedback) : [];
          if (!Array.isArray(currentFeedback)) currentFeedback = [];
        } catch {
          currentFeedback = [];
        }
        currentFeedback.push({
          id: `msg-${Date.now()}`,
          authorName: actorName || 'Cliente',
          role: actorRole || 'client',
          content: comment || 'Ajuste solicitado pelo cliente.',
          adjustType: adjustType || 'other',
          createdAt: now
        });

        await sql`
          UPDATE tasks SET
            status = 'review',
            ig_publish_status = 'adjust_requested',
            ig_revision_round = COALESCE(ig_revision_round, 0) + 1,
            admin_feedback = ${JSON.stringify(currentFeedback)},
            updated_at = ${now}
          WHERE id = ${taskId}
        `;

        // Notificar equipe com link direto para o Focus (/admin/jtbd)
        try {
          await NotificationEngine.notifyManagement(
            '🔄 Revisão Solicitada pelo Cliente',
            `${actorName || 'O cliente'} solicitou ajuste em "${task.title}" (${adjustType || 'Geral'}): ${comment || '(sem detalhe)'}`,
            'action',
            '/admin/jtbd'
          );
        } catch (e) { /* non-blocking */ }
        break;
      }

      case 'resolve_adjust': {
        let currentFeedback: any[] = [];
        try {
          currentFeedback = task.admin_feedback ? JSON.parse(task.admin_feedback) : [];
          if (!Array.isArray(currentFeedback)) currentFeedback = [];
        } catch {
          currentFeedback = [];
        }
        if (comment) {
          currentFeedback.push({
            id: `msg-${Date.now()}`,
            authorName: actorName || 'Equipe',
            role: actorRole || 'admin',
            content: comment,
            createdAt: now
          });
        }

        await sql`
          UPDATE tasks SET
            status = 'pending_client_approval',
            ig_publish_status = 'awaiting_approval',
            ig_sent_for_approval_at = ${now},
            admin_feedback = ${JSON.stringify(currentFeedback)},
            updated_at = ${now}
          WHERE id = ${taskId}
        `;

        try {
          await NotificationEngine.notifyManagement(
            '✨ Ajuste Resolvido',
            `${actorName || 'A equipe'} concluiu o ajuste de "${task.title}" e reenviou para aprovação.`,
            'info',
            '/admin/jtbd'
          );
        } catch (e) { /* non-blocking */ }
        break;
      }

      case 'comment': {
        // Registra o comentário diretamente no histórico (admin_feedback) para ser visualizado no Focus
        let currentFeedback: any[] = [];
        try {
          currentFeedback = task.admin_feedback ? JSON.parse(task.admin_feedback) : [];
          if (!Array.isArray(currentFeedback)) currentFeedback = [];
        } catch {
          currentFeedback = [];
        }
        currentFeedback.push({
          id: `msg-${Date.now()}`,
          authorName: actorName || (actorRole === 'cliente' ? 'Cliente' : 'Equipe'),
          role: actorRole || 'client',
          content: comment || '',
          isCommentOnly: true,
          createdAt: now
        });

        await sql`
          UPDATE tasks SET
            admin_feedback = ${JSON.stringify(currentFeedback)},
            updated_at = ${now}
          WHERE id = ${taskId}
        `;

        try {
          if (actorRole === 'cliente' || actorRole === 'client') {
            await NotificationEngine.notifyManagement(
              '💬 Comentário do Cliente no Focus',
              `${actorName || 'O cliente'} comentou em "${task.title}": ${comment || ''}`,
              'info',
              '/admin/jtbd'
            );
          } else if (task.client_id) {
            await NotificationEngine.notifyUser(
              task.client_id,
              '💬 Novo Comentário da Equipe',
              `A equipe comentou em "${task.title}": ${comment || ''}`,
              'info',
              '/cockpit'
            );
          }
        } catch (e) { /* non-blocking */ }
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, action, taskId });
  } catch (error: any) {
    console.error('[api/presenca/approve] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
