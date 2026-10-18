import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { NotificationEngine } from '@/lib/NotificationEngine';

// Helper to sanitize slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '') || 'projeto';
}

// GET: Recupera canal, projeto e mensagens do canal exclusivo do cliente no Sintonia
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('atelier_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (payload.type !== 'session') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const userId = payload.userId;
    const userRole = payload.role || 'client';
    const sql = getDb();

    const { searchParams } = new URL(req.url);
    const requestedProjectId = searchParams.get('projectId');

    // 1. Identificar o projeto ativo
    let project: any = null;
    if (requestedProjectId) {
      const projects = await (sql as any).query(
        `SELECT p.*, pr.nome as client_name, pr.avatar_url as client_avatar, pr.empresa as client_empresa
         FROM projects p
         LEFT JOIN profiles pr ON p.client_id = pr.id
         WHERE p.id = $1 LIMIT 1`,
        [requestedProjectId]
      );
      project = projects[0] || null;
    }

    if (!project) {
      // Se for cliente, buscar o seu projeto ativo
      const projects = await (sql as any).query(
        `SELECT p.*, pr.nome as client_name, pr.avatar_url as client_avatar, pr.empresa as client_empresa
         FROM projects p
         LEFT JOIN profiles pr ON p.client_id = pr.id
         WHERE p.client_id = $1 AND p.status = 'active'
         ORDER BY p.created_at DESC LIMIT 1`,
        [userId]
      );
      project = projects[0] || null;
    }

    // Se ainda não encontrou e for admin/gestor testando, pega o primeiro projeto ativo
    if (!project && (userRole === 'admin' || userRole === 'gestor')) {
      const projects = await (sql as any).query(
        `SELECT p.*, pr.nome as client_name, pr.avatar_url as client_avatar, pr.empresa as client_empresa
         FROM projects p
         LEFT JOIN profiles pr ON p.client_id = pr.id
         WHERE p.status = 'active'
         ORDER BY p.created_at DESC LIMIT 1`
      );
      project = projects[0] || null;
    }

    if (!project) {
      return NextResponse.json({ error: 'Nenhum projeto ativo encontrado' }, { status: 404 });
    }

    // 2. Garantir que o canal exclusivo 'fio_cliente' existe para este projeto
    let channels = await (sql as any).query(
      `SELECT * FROM channels WHERE project_id = $1 AND type = 'fio_cliente' LIMIT 1`,
      [project.id]
    );

    let channel = channels[0];
    if (!channel) {
      const channelSlug = slugify(project.client_name || project.client_empresa || 'projeto');
      const newChannels = await (sql as any).query(
        `INSERT INTO channels (id, name, type, project_id, is_private, created_at)
         VALUES (gen_random_uuid(), $1, 'fio_cliente', $2, true, NOW())
         RETURNING *`,
        [channelSlug, project.id]
      );
      channel = newChannels[0];
    }

    // 3. Buscar mensagens do canal
    const messages = await (sql as any).query(
      `SELECT m.id, m.channel_id, m.sender_id, m.text_content, m.attachment_url, m.parent_id, m.created_at,
              p.nome, p.avatar_url, p.role
       FROM messages m
       LEFT JOIN profiles p ON m.sender_id = p.id
       WHERE m.channel_id = $1
       ORDER BY m.created_at ASC`,
      [channel.id]
    );

    // 4. Calcular mensagens não lidas pelo usuário atual
    const readRecords = await (sql as any).query(
      `SELECT last_read_at FROM channel_reads WHERE channel_id = $1 AND user_id = $2 LIMIT 1`,
      [channel.id, userId]
    );

    const lastReadAt = readRecords[0]?.last_read_at ? new Date(readRecords[0].last_read_at).getTime() : 0;
    const unreadCount = messages.filter(
      (m: any) => m.sender_id !== userId && new Date(m.created_at).getTime() > lastReadAt
    ).length;

    return NextResponse.json({
      success: true,
      channel,
      project: {
        id: project.id,
        service_type: project.service_type,
        type: project.type,
        status: project.status,
        client_name: project.client_name,
        client_empresa: project.client_empresa,
        client_id: project.client_id
      },
      messages: messages.map((m: any) => ({
        id: m.id,
        channel_id: m.channel_id,
        sender_id: m.sender_id,
        text_content: m.text_content,
        attachment_url: m.attachment_url,
        parent_id: m.parent_id,
        created_at: m.created_at,
        profiles: {
          nome: m.nome,
          avatar_url: m.avatar_url,
          role: m.role
        }
      })),
      unreadCount
    });
  } catch (error: any) {
    console.error('[client-channel GET] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Envia mensagem no canal do projeto
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('atelier_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (payload.type !== 'session') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const userId = payload.userId;
    const sql = getDb();

    const body = await req.json();
    const { channelId, text, attachmentUrl } = body;

    if (!channelId || (!text?.trim() && !attachmentUrl)) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    // 1. Obter dados do canal e projeto
    const channels = await (sql as any).query(
      `SELECT c.*, p.client_id, pr.nome as client_name
       FROM channels c
       LEFT JOIN projects p ON c.project_id = p.id
       LEFT JOIN profiles pr ON p.client_id = pr.id
       WHERE c.id = $1 LIMIT 1`,
      [channelId]
    );

    const channel = channels[0];
    if (!channel) {
      return NextResponse.json({ error: 'Canal não encontrado' }, { status: 404 });
    }

    // 2. Inserir a mensagem
    const insertedMessages = await (sql as any).query(
      `INSERT INTO messages (id, channel_id, sender_id, text_content, attachment_url, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
       RETURNING *`,
      [channelId, userId, text?.trim() || null, attachmentUrl || null]
    );

    const newMsg = insertedMessages[0];

    // 3. Atualizar leitura para o próprio remetente
    await (sql as any).query(
      `INSERT INTO channel_reads (id, channel_id, user_id, last_read_at)
       VALUES (gen_random_uuid(), $1, $2, NOW())
       ON CONFLICT (channel_id, user_id)
       DO UPDATE SET last_read_at = NOW()`,
      [channelId, userId]
    );

    // 4. Buscar perfil do remetente
    const senderProfiles = await (sql as any).query(
      `SELECT nome, avatar_url, role FROM profiles WHERE id = $1 LIMIT 1`,
      [userId]
    );
    const sender = senderProfiles[0];

    // 5. Notificações automáticas
    const isClient = sender?.role === 'client';
    if (isClient) {
      // Cliente enviou para a equipe -> Notificar Gestão (Gestor e Admin)
      const senderName = sender?.nome || 'Cliente';
      await NotificationEngine.notifyManagement(
        `💬 Sintonia: Mensagem de ${senderName}`,
        text ? text.slice(0, 100) : 'Enviou um anexo no canal do projeto.',
        'info',
        '/admin/fio'
      );
    } else {
      // Equipe (Gestor ou Admin) enviou para o cliente -> Notificar o cliente
      if (channel.client_id && channel.client_id !== userId) {
        await NotificationEngine.notifyUserWithEmail(
          channel.client_id,
          'Nova mensagem da equipe Studio Veronna',
          text ? text.slice(0, 100) : 'Você recebeu um anexo no canal do seu projeto.',
          'chat_activity',
          { link: '/cockpit', clientName: sender?.nome || 'Studio Veronna' }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: {
        ...newMsg,
        profiles: sender || null
      }
    });
  } catch (error: any) {
    console.error('[client-channel POST] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Marcar mensagens do canal como lidas
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('atelier_session')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const payload = await verifyToken(token);
    const userId = payload.userId;
    const sql = getDb();

    const body = await req.json();
    const { channelId } = body;
    if (!channelId) return NextResponse.json({ error: 'channelId obrigatório' }, { status: 400 });

    await (sql as any).query(
      `INSERT INTO channel_reads (id, channel_id, user_id, last_read_at)
       VALUES (gen_random_uuid(), $1, $2, NOW())
       ON CONFLICT (channel_id, user_id)
       DO UPDATE SET last_read_at = NOW()`,
      [channelId, userId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
