// src/app/api/sintonia/route.ts
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
    .replace(/[^a-z0-9-]/g, '') || 'canal';
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('atelier_session')?.value;
  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    if (payload.type !== 'session') return null;
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    };
  } catch {
    return null;
  }
}

// ============================================================================
// GET: Buscar Canais, Mensagens, Membros da Equipe e Não Lidas
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const sql = getDb();
    const userId = authUser.id;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'channels';
    const channelId = searchParams.get('channelId');

    // -------------------------------------------------------------
    // 1. CARREGAR MENSAGENS DE UM CANAL
    // -------------------------------------------------------------
    if (action === 'messages' && channelId) {
      // Mensagens com autor
      const messages = await (sql as any).query(
        `SELECT m.id, m.channel_id, m.sender_id, m.text_content, m.attachment_url, m.parent_id, m.created_at,
                p.nome, p.avatar_url, p.role
         FROM messages m
         LEFT JOIN profiles p ON m.sender_id = p.id
         WHERE m.channel_id = $1
         ORDER BY m.created_at ASC`,
        [channelId]
      );

      // Reações
      const msgIds = messages.map((m: any) => m.id);
      let reactions: any[] = [];
      if (msgIds.length > 0) {
        reactions = await (sql as any).query(
          `SELECT r.id, r.message_id, r.user_id, r.emoji
           FROM message_reactions r
           WHERE r.message_id = ANY($1::uuid[])`,
          [msgIds]
        );
      }

      // Marcar como lido para o usuário
      await (sql as any).query(
        `INSERT INTO channel_reads (id, channel_id, user_id, last_read_at)
         VALUES (gen_random_uuid(), $1, $2, NOW())
         ON CONFLICT (channel_id, user_id)
         DO UPDATE SET last_read_at = NOW()`,
        [channelId, userId]
      );

      // Agrupa reações por message_id
      const reactionsMap: Record<string, Record<string, { emoji: string; count: number; users: string[]; reacted: boolean }>> = {};
      reactions.forEach((r: any) => {
        if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = {};
        if (!reactionsMap[r.message_id][r.emoji]) {
          reactionsMap[r.message_id][r.emoji] = {
            emoji: r.emoji,
            count: 0,
            users: [],
            reacted: false
          };
        }
        reactionsMap[r.message_id][r.emoji].count++;
        reactionsMap[r.message_id][r.emoji].users.push(r.user_id);
        if (r.user_id === userId) {
          reactionsMap[r.message_id][r.emoji].reacted = true;
        }
      });

      return NextResponse.json({
        success: true,
        messages: messages.map((m: any) => ({
          id: m.id,
          channel_id: m.channel_id,
          sender_id: m.sender_id,
          text_content: m.text_content,
          attachment_url: m.attachment_url,
          parent_id: m.parent_id,
          created_at: m.created_at,
          profiles: {
            id: m.sender_id,
            nome: m.nome,
            avatar_url: m.avatar_url,
            role: m.role
          }
        })),
        reactions: reactionsMap
      });
    }

    // -------------------------------------------------------------
    // 2. CARREGAR CANAIS, DMs, DAILY JAM E CONTADORES
    // -------------------------------------------------------------
    // Garante que o canal geral exista
    let generalChannel = await (sql as any).query(
      `SELECT * FROM channels WHERE type = 'fio_geral' OR name = 'operacao-atelier' LIMIT 1`
    );
    if (!generalChannel || generalChannel.length === 0) {
      await (sql as any).query(
        `INSERT INTO channels (id, name, type, is_private, created_at)
         VALUES (gen_random_uuid(), 'operacao-atelier', 'fio_geral', false, NOW())`
      );
    }

    // Canais corporativos / gerais
    const corporateChannelsRaw = await (sql as any).query(
      `SELECT id, name, type, description, is_private, created_at, project_id
       FROM channels
       WHERE type IN ('fio_geral', 'general', 'corporate_global')
       ORDER BY 
         CASE 
           WHEN name = 'operacao-atelier' THEN 0 
           WHEN type = 'fio_geral' THEN 1 
           ELSE 2 
         END, 
         created_at ASC`
    );

    // Deduplica canais corporativos por nome
    const seenNames = new Set<string>();
    const corporateChannels = corporateChannelsRaw.filter((c: any) => {
      const normalizedName = c.name.trim().toLowerCase();
      if (seenNames.has(normalizedName)) return false;
      seenNames.add(normalizedName);
      return true;
    });

    // Canais de Clientes
    const clientChannels = await (sql as any).query(
      `SELECT c.id, c.name, c.type, c.description, c.is_private, c.created_at, c.project_id,
              p.client_id, pr.nome as client_name, pr.avatar_url as client_avatar, p.service_type, p.status as project_status
       FROM channels c
       LEFT JOIN projects p ON c.project_id = p.id
       LEFT JOIN profiles pr ON p.client_id = pr.id
       WHERE c.type = 'fio_cliente'
       ORDER BY c.created_at DESC`
    );

    // Encontra todos os membros da equipe (admin, gestor, colaborador)
    const teamProfiles = await (sql as any).query(
      `SELECT id, nome, email, role, avatar_url, current_mood, current_song_id
       FROM profiles
       WHERE role IN ('admin', 'gestor', 'colaborador')
       ORDER BY nome ASC`
    );

    const teamProfilesMap: Record<string, any> = {};
    teamProfiles.forEach((p: any) => { teamProfilesMap[p.id] = p; });

    // Perfil do usuário atual
    const currentUserProfile = teamProfilesMap[userId] || (await (sql as any).query(
      `SELECT id, nome, email, role, avatar_url, current_mood, current_song_id FROM profiles WHERE id = $1 LIMIT 1`,
      [userId]
    ))[0] || { id: userId, nome: 'Você', role: 'colaborador' };

    // 1. Canal do próprio usuário ("Você" / Agenda Pessoal)
    const selfDmName = `dm_${userId}_${userId}`;
    let selfChannelRows = await (sql as any).query(
      `SELECT id, name, type, created_at FROM channels WHERE type = 'dm' AND name = $1 LIMIT 1`,
      [selfDmName]
    );
    let selfChannel = selfChannelRows[0];
    if (!selfChannel) {
      const insertedSelf = await (sql as any).query(
        `INSERT INTO channels (id, name, type, is_private, created_at)
         VALUES (gen_random_uuid(), $1, 'dm', true, NOW())
         RETURNING id, name, type, created_at`,
        [selfDmName]
      );
      selfChannel = insertedSelf[0];
    }

    const youChannel = {
      id: selfChannel.id,
      name: 'Você',
      type: 'dm',
      is_self: true,
      partner_id: userId,
      partner_profile: {
        id: userId,
        nome: 'Você',
        email: currentUserProfile.email,
        role: currentUserProfile.role,
        avatar_url: currentUserProfile.avatar_url,
        is_self: true
      },
      created_at: selfChannel.created_at
    };

    // 2. DMs com os colaboradores reais da equipe (sem placeholders nem "Colega")
    const existingDms = await (sql as any).query(
      `SELECT id, name, type, created_at
       FROM channels
       WHERE type = 'dm' AND name LIKE '%' || $1 || '%'`,
      [userId]
    );
    const existingDmsMap = new Map<string, any>();
    for (const d of existingDms) {
      existingDmsMap.set(d.name, d);
    }

    const collaboratorDms = [];
    for (const colab of teamProfiles) {
      if (colab.id === userId) continue;

      const participants = [userId, colab.id].sort();
      const colabDmName = `dm_${participants[0]}_${participants[1]}`;

      let ch = existingDmsMap.get(colabDmName);
      if (!ch) {
        const newCh = await (sql as any).query(
          `INSERT INTO channels (id, name, type, is_private, created_at)
           VALUES (gen_random_uuid(), $1, 'dm', true, NOW())
           RETURNING id, name, type, created_at`,
          [colabDmName]
        );
        ch = newCh[0];
        existingDmsMap.set(colabDmName, ch);
      }

      collaboratorDms.push({
        id: ch.id,
        name: colab.nome,
        type: 'dm',
        is_self: false,
        partner_id: colab.id,
        partner_profile: colab,
        created_at: ch.created_at
      });
    }

    // Lista final de DMs: "Você" em 1º lugar, depois os colaboradores reais
    const dmChannels = [youChannel, ...collaboratorDms];

    // Contadores de mensagens não lidas
    const reads = await (sql as any).query(
      `SELECT channel_id, last_read_at FROM channel_reads WHERE user_id = $1`,
      [userId]
    );
    const readsMap: Record<string, number> = {};
    reads.forEach((r: any) => {
      readsMap[r.channel_id] = new Date(r.last_read_at).getTime();
    });

    const unreadStats = await (sql as any).query(
      `SELECT channel_id, count(*)::int as unread_count, max(created_at) as last_message_at
       FROM messages
       WHERE sender_id != $1
       GROUP BY channel_id`,
      [userId]
    );

    const unreadCounts: Record<string, number> = {};
    for (const stat of unreadStats) {
      const lastRead = readsMap[stat.channel_id] || 0;
      // Busca contagem real após last_read_at
      const unreadForCh = await (sql as any).query(
        `SELECT count(*)::int as count FROM messages
         WHERE channel_id = $1 AND sender_id != $2 AND created_at > $3`,
        [stat.channel_id, userId, new Date(lastRead).toISOString()]
      );
      unreadCounts[stat.channel_id] = unreadForCh[0]?.count || 0;
    }

    const defaultChannelId = corporateChannels.find((c: any) => c.name === 'operacao-atelier')?.id
      || corporateChannels[0]?.id
      || youChannel.id;

    return NextResponse.json({
      success: true,
      currentUser: currentUserProfile,
      corporateChannels,
      clientChannels,
      dmChannels,
      defaultChannelId,
      teamMembers: teamProfiles,
      unreadCounts
    });

  } catch (error: any) {
    console.error('[Sintonia API GET] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST: Envio de Mensagens, Reações, DMs e Daily Jam
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const sql = getDb();
    const userId = authUser.id;
    const body = await req.json();
    const { action } = body;

    // -------------------------------------------------------------
    // ACTION: CRIAR OU ACESSAR DM COM UM COLEGA
    // -------------------------------------------------------------
    if (action === 'create_or_get_dm') {
      const { targetUserId } = body;
      if (!targetUserId) return NextResponse.json({ error: 'targetUserId obrigatório' }, { status: 400 });

      const participants = [userId, targetUserId].sort();
      const dmName = `dm_${participants[0]}_${participants[1]}`;

      let channel = await (sql as any).query(
        `SELECT * FROM channels WHERE type = 'dm' AND name = $1 LIMIT 1`,
        [dmName]
      );

      if (!channel || channel.length === 0) {
        const newCh = await (sql as any).query(
          `INSERT INTO channels (id, name, type, is_private, created_at)
           VALUES (gen_random_uuid(), $1, 'dm', true, NOW())
           RETURNING *`,
          [dmName]
        );
        channel = newCh;
      }

      return NextResponse.json({
        success: true,
        channel: channel[0]
      });
    }

    // -------------------------------------------------------------
    // ACTION: ATUALIZAR DAILY JAM (VIBE & MÚSICA DO SPOTIFY)
    // -------------------------------------------------------------
    if (action === 'update_jam') {
      const { mood, songId } = body;
      await (sql as any).query(
        `UPDATE profiles SET current_mood = $1, current_song_id = $2 WHERE id = $3`,
        [mood || null, songId || null, userId]
      );
      return NextResponse.json({ success: true, mood, songId });
    }

    // -------------------------------------------------------------
    // ACTION: REAGIR A UMA MENSAGEM
    // -------------------------------------------------------------
    if (action === 'react') {
      const { messageId, emoji } = body;
      if (!messageId || !emoji) return NextResponse.json({ error: 'Parâmetros incompletos' }, { status: 400 });

      const existing = await (sql as any).query(
        `SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3 LIMIT 1`,
        [messageId, userId, emoji]
      );

      if (existing && existing.length > 0) {
        await (sql as any).query(
          `DELETE FROM message_reactions WHERE id = $1`,
          [existing[0].id]
        );
        return NextResponse.json({ success: true, removed: true });
      } else {
        await (sql as any).query(
          `INSERT INTO message_reactions (id, message_id, user_id, emoji, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
          [messageId, userId, emoji]
        );
        return NextResponse.json({ success: true, added: true });
      }
    }

    // -------------------------------------------------------------
    // ACTION: ENVIAR MENSAGEM
    // -------------------------------------------------------------
    if (action === 'send_message') {
      const { channelId, textContent, attachmentUrl, parentId } = body;
      if (!channelId || (!textContent?.trim() && !attachmentUrl)) {
        return NextResponse.json({ error: 'Conteúdo ou anexo é obrigatório' }, { status: 400 });
      }

      // 1. Inserir a mensagem
      const inserted = await (sql as any).query(
        `INSERT INTO messages (id, channel_id, sender_id, text_content, attachment_url, parent_id, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [channelId, userId, textContent?.trim() || null, attachmentUrl || null, parentId || null]
      );

      const msg = inserted[0];

      // 2. Marcar como lido para quem enviou
      await (sql as any).query(
        `INSERT INTO channel_reads (id, channel_id, user_id, last_read_at)
         VALUES (gen_random_uuid(), $1, $2, NOW())
         ON CONFLICT (channel_id, user_id)
         DO UPDATE SET last_read_at = NOW()`,
        [channelId, userId]
      );

      // 3. Buscar perfil do remetente
      const senderProfiles = await (sql as any).query(
        `SELECT id, nome, avatar_url, role, email FROM profiles WHERE id = $1 LIMIT 1`,
        [userId]
      );
      const sender = senderProfiles[0];

      // 4. Buscar canal para contexto de notificação
      const channels = await (sql as any).query(
        `SELECT c.*, p.client_id, pr.nome as client_name
         FROM channels c
         LEFT JOIN projects p ON c.project_id = p.id
         LEFT JOIN profiles pr ON p.client_id = pr.id
         WHERE c.id = $1 LIMIT 1`,
        [channelId]
      );
      const channel = channels[0];

      // 5. PROCESSAMENTO DE NOTIFICAÇÕES (ASSÍNCRONO)
      const text = textContent || '';
      const snippet = text.length > 90 ? text.slice(0, 90) + '...' : (text || 'Compartilhou um anexo');
      const senderName = sender?.nome || 'Colaborador';

      // (a) Notificar Menções (@Nome)
      const mentions = text.match(/(@[a-zA-Z0-9_\u00C0-\u00FF]+)/g);
      const mentionedIds = new Set<string>();

      if (mentions) {
        const teamProfiles = await (sql as any).query(
          `SELECT id, nome, email, role FROM profiles`
        );
        for (const mention of mentions) {
          const mentionClean = mention.substring(1).trim().toLowerCase();
          const target = teamProfiles.find((p: any) => 
            p.nome?.split(' ')?.[0]?.toLowerCase() === mentionClean ||
            p.nome?.toLowerCase() === mentionClean
          );
          if (target && target.id !== userId) {
            mentionedIds.add(target.id);
            const isClient = target.role === 'client' || target.role === 'cliente';
            NotificationEngine.notifySintoniaMention(
              target.id,
              senderName,
              channel?.name || 'sintonia',
              snippet,
              channelId,
              isClient
            ).catch(err => console.error('[Sintonia] Erro ao notificar menção:', err));
          }
        }
      }

      // (b) Notificar DM (se canal for dm_...)
      if (channel && channel.type === 'dm') {
        const parts = channel.name.replace(/^dm_/, '').split('_');
        const recipientId = parts.find((id: string) => id !== userId);
        if (recipientId && !mentionedIds.has(recipientId)) {
          NotificationEngine.notifySintoniaDM(
            recipientId,
            senderName,
            snippet,
            channelId
          ).catch(err => console.error('[Sintonia] Erro ao notificar DM:', err));
        }
      }

      // (c) Notificar Canal do Cliente (fio_cliente)
      if (channel && channel.type === 'fio_cliente') {
        const isClient = sender?.role === 'client' || sender?.role === 'cliente';
        if (isClient) {
          NotificationEngine.notifyManagement(
            `💬 Sintonia: Mensagem de ${senderName}`,
            `Mensagem em #${channel.name}: "${snippet}"`,
            'info',
            `/admin/fio?channel=${channelId}`
          ).catch(err => console.error('[Sintonia] Erro ao notificar gestão:', err));
        } else if (channel.client_id && channel.client_id !== userId && !mentionedIds.has(channel.client_id)) {
          NotificationEngine.notifyUserWithEmail(
            channel.client_id,
            'Nova mensagem da equipe Studio Veronna',
            `A equipe enviou uma mensagem na sua Sintonia: "${snippet}"`,
            'chat_activity',
            { link: '/cockpit', clientName: senderName }
          ).catch(err => console.error('[Sintonia] Erro ao notificar cliente:', err));
        }
      }

      return NextResponse.json({
        success: true,
        message: {
          ...msg,
          profiles: sender || null
        }
      });
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });

  } catch (error: any) {
    console.error('[Sintonia API POST] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
