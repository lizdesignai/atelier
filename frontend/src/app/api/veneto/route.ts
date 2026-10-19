import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('atelier_session')?.value;
  if (!token) return null;
  try {
    const { verifyToken } = await import('@/lib/auth');
    const payload = await verifyToken(token);
    if (payload.type !== 'session') return null;
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const sql = getDb() as any;
    const userId = authUser.id || authUser.sub || authUser.userId;

    // 1. Perfil do usuário logado
    const meRes = await sql.query(`SELECT * FROM profiles WHERE id = $1 LIMIT 1`, [userId]);
    const currentUser = meRes[0] || null;
    const isAdminOrGestor = ['admin', 'gestor'].includes(currentUser?.role || '');

    // 2. Bloqueios do usuário logado
    const blocksRes = await sql.query(
      `SELECT blocked_id FROM veneto_user_blocks WHERE blocker_id = $1`,
      [userId]
    );
    const blockedIds: string[] = (blocksRes || []).map((b: any) => b.blocked_id);

    // 3. Publicações com autor, likes, saves e solução
    const postsRes = await sql.query(
      `SELECT 
        p.*,
        json_build_object(
          'id', pr.id,
          'nome', pr.nome,
          'username', pr.username,
          'avatar_url', pr.avatar_url,
          'role', pr.role,
          'cargo', pr.cargo,
          'empresa', pr.empresa,
          'area_atuacao', pr.area_atuacao,
          'segmento', pr.segmento,
          'localizacao', pr.localizacao,
          'is_founding_member', pr.is_founding_member
        ) AS profiles
      FROM community_posts p
      LEFT JOIN profiles pr ON p.author_id = pr.id
      WHERE ($1::boolean = TRUE OR p.status = 'approved' OR p.author_id = $2::uuid)
      ORDER BY p.is_pinned DESC NULLS LAST, p.created_at DESC
      LIMIT 120`,
      [isAdminOrGestor, userId]
    );

    const myLikesRes = await sql.query(`SELECT post_id FROM post_likes WHERE user_id = $1`, [userId]);
    const myLikedIds = new Set((myLikesRes || []).map((r: any) => r.post_id));

    const mySavesRes = await sql.query(`SELECT post_id FROM veneto_saved_posts WHERE user_id = $1`, [userId]);
    const mySavedIds = new Set((mySavesRes || []).map((r: any) => r.post_id));

    // Contagem real de comentários por post
    const commentCountsRes = await sql.query(
      `SELECT post_id, count(*)::int as cnt FROM post_comments GROUP BY post_id`
    );
    const commentCountMap: Record<string, number> = {};
    for (const row of commentCountsRes || []) {
      commentCountMap[row.post_id] = row.cnt;
    }

    const posts = (postsRes || [])
      .filter((p: any) => !blockedIds.includes(p.author_id))
      .map((p: any) => ({
        ...p,
        comments_count: commentCountMap[p.id] ?? p.comments_count ?? 0,
        is_liked_by_me: myLikedIds.has(p.id),
        is_saved_by_me: mySavedIds.has(p.id),
      }));

    // 4. Diretório de Pessoas (Membros + Reconhecimentos + Conexões)
    const membersRes = await sql.query(
      `SELECT 
        id, nome, username, avatar_url, cover_url, role, cargo, bio, empresa, nicho,
        area_atuacao, segmento, localizacao, skills, interesses,
        o_que_oferece, o_que_procura, links_profissionais, projetos_destaque,
        veneto_objectives, veneto_onboarding_done, dm_privacy, is_founding_member,
        anniversary_date, created_at
      FROM profiles
      WHERE role != 'contador'
      ORDER BY 
        CASE WHEN role = 'admin' THEN 0 WHEN role = 'gestor' THEN 1 ELSE 2 END,
        nome ASC`
    );

    const recognitionsRes = await sql.query(
      `SELECT 
        r.*,
        json_build_object('id', pf.id, 'nome', pf.nome, 'username', pf.username, 'avatar_url', pf.avatar_url, 'role', pf.role) as from_user,
        json_build_object('id', pt.id, 'nome', pt.nome, 'username', pt.username, 'avatar_url', pt.avatar_url, 'role', pt.role) as to_user
      FROM veneto_recognitions r
      LEFT JOIN profiles pf ON r.from_user_id = pf.id
      LEFT JOIN profiles pt ON r.to_user_id = pt.id
      ORDER BY r.created_at DESC`
    );

    const connectionsRes = await sql.query(
      `SELECT * FROM veneto_connections WHERE follower_id = $1 OR following_id = $1`,
      [userId]
    );
    const followingIds = new Set(
      (connectionsRes || []).filter((c: any) => c.follower_id === userId).map((c: any) => c.following_id)
    );
    const followerIds = new Set(
      (connectionsRes || []).filter((c: any) => c.following_id === userId).map((c: any) => c.follower_id)
    );

    // Agrupar reconhecimentos por membro
    const recByUser: Record<string, { ajuda_util: number; curadoria: number; colaboracao: number; acolhimento: number; total: number }> = {};
    for (const r of recognitionsRes || []) {
      if (r.is_contested) continue;
      if (!recByUser[r.to_user_id]) {
        recByUser[r.to_user_id] = { ajuda_util: 0, curadoria: 0, colaboracao: 0, acolhimento: 0, total: 0 };
      }
      const badge = r.badge_type as 'ajuda_util' | 'curadoria' | 'colaboracao' | 'acolhimento';
      if (recByUser[r.to_user_id][badge] !== undefined) {
        recByUser[r.to_user_id][badge]++;
        recByUser[r.to_user_id].total++;
      }
    }

    const members = (membersRes || [])
      .filter((m: any) => !blockedIds.includes(m.id))
      .map((m: any) => ({
        ...m,
        is_connected: followingIds.has(m.id),
        follows_me: followerIds.has(m.id),
        is_mutual: followingIds.has(m.id) && followerIds.has(m.id),
        recognitions: recByUser[m.id] || { ajuda_util: 0, curadoria: 0, colaboracao: 0, acolhimento: 0, total: 0 },
      }));

    // 5. Encontros (Eventos + RSVPs + Mensagens do Chat ao Vivo)
    const eventsRes = await sql.query(`SELECT * FROM veneto_events ORDER BY starts_at ASC`);
    const rsvpsRes = await sql.query(`SELECT * FROM veneto_event_rsvps`);
    const eventMsgsRes = await sql.query(
      `SELECT 
        m.*,
        json_build_object('id', pr.id, 'nome', pr.nome, 'username', pr.username, 'avatar_url', pr.avatar_url, 'role', pr.role) as profiles
      FROM veneto_event_messages m
      LEFT JOIN profiles pr ON m.user_id = pr.id
      ORDER BY m.created_at ASC`
    );

    const events = (eventsRes || []).map((ev: any) => {
      const evRsvps = (rsvpsRes || []).filter((r: any) => r.event_id === ev.id);
      const evMsgs = (eventMsgsRes || []).filter((m: any) => m.event_id === ev.id);
      return {
        ...ev,
        rsvp_count: evRsvps.length,
        is_rsvped: evRsvps.some((r: any) => r.user_id === userId),
        messages: evMsgs,
      };
    });

    // 6. Estúdio — Conteúdos da Liz
    const studioRes = await sql.query(`SELECT * FROM veneto_studio_contents ORDER BY created_at DESC`);

    // 7. Oportunidades B2B (b2b_pitches)
    const pitchesRes = await sql.query(
      `SELECT 
        b.*,
        json_build_object('id', pr.id, 'nome', pr.nome, 'username', pr.username, 'avatar_url', pr.avatar_url, 'empresa', pr.empresa, 'area_atuacao', pr.area_atuacao) as profiles
      FROM b2b_pitches b
      LEFT JOIN profiles pr ON b.author_id = pr.id
      ORDER BY b.created_at DESC`
    );

    // 8. Mensagens Privadas do Usuário
    const dmsRes = await sql.query(
      `SELECT 
        dm.*,
        json_build_object('id', ps.id, 'nome', ps.nome, 'username', ps.username, 'avatar_url', ps.avatar_url, 'area_atuacao', ps.area_atuacao) as sender,
        json_build_object('id', pr.id, 'nome', pr.nome, 'username', pr.username, 'avatar_url', pr.avatar_url, 'area_atuacao', pr.area_atuacao) as receiver
      FROM veneto_direct_messages dm
      LEFT JOIN profiles ps ON dm.sender_id = ps.id
      LEFT JOIN profiles pr ON dm.receiver_id = pr.id
      WHERE dm.sender_id = $1 OR dm.receiver_id = $1
      ORDER BY dm.created_at ASC`,
      [userId]
    );

    // 9. Painel de Saúde da Comunidade & Moderação (Seção 11 & 14)
    let reports: any[] = [];
    if (isAdminOrGestor) {
      reports = await sql.query(
        `SELECT 
          rep.*,
          json_build_object('id', pr.id, 'nome', pr.nome, 'username', pr.username) as reporter
        FROM veneto_reports rep
        LEFT JOIN profiles pr ON rep.reporter_id = pr.id
        ORDER BY rep.created_at DESC`
      );
    }

    const totalQuestions = posts.filter((p: any) => p.post_type === 'duvida').length;
    const resolvedQuestions = posts.filter((p: any) => p.post_type === 'duvida' && p.is_resolved).length;
    const unansweredQuestions = posts.filter((p: any) => p.post_type === 'duvida' && !p.is_resolved && (p.comments_count || 0) === 0).length;
    const totalConnectionsRes = await sql.query(`SELECT count(*)::int as cnt FROM veneto_connections`);
    const totalCommentsRes = await sql.query(`SELECT count(*)::int as cnt FROM post_comments`);
    const activeContributorsSet = new Set([
      ...posts.map((p: any) => p.author_id),
      ...(recognitionsRes || []).map((r: any) => r.from_user_id),
      ...(recognitionsRes || []).map((r: any) => r.to_user_id),
    ]);
    const profilesCompletedCount = members.filter(
      (m: any) => Boolean(m.bio && (m.area_atuacao || m.o_que_oferece))
    ).length;

    const healthMetrics = {
      meaningfulExchangesWeekly:
        (totalCommentsRes[0]?.cnt || 0) +
        (recognitionsRes?.length || 0) +
        (totalConnectionsRes[0]?.cnt || 0) +
        (rsvpsRes?.length || 0),
      activationRate: members.length > 0 ? Math.round((profilesCompletedCount / members.length) * 100) : 0,
      questionsTotal: totalQuestions,
      questionsResolved: resolvedQuestions,
      questionsUnanswered: unansweredQuestions,
      resolutionRate: totalQuestions > 0 ? Math.round((resolvedQuestions / totalQuestions) * 100) : 100,
      contributorsCount: activeContributorsSet.size,
      readersCount: Math.max(0, members.length - activeContributorsSet.size),
      totalMembers: members.length,
      connectionsCount: totalConnectionsRes[0]?.cnt || 0,
      eventsRsvpsCount: rsvpsRes?.length || 0,
      savedMaterialsCount: (studioRes || []).reduce((acc: number, s: any) => acc + (s.saves_count || 0), 0),
      appliedMaterialsCount: (studioRes || []).reduce((acc: number, s: any) => acc + (s.applications_count || 0), 0),
      pendingReportsCount: reports.filter((r: any) => r.status === 'pending').length,
    };

    return NextResponse.json({
      currentUser,
      posts,
      members,
      recognitions: recognitionsRes || [],
      events,
      studioContents: studioRes || [],
      pitches: pitchesRes || [],
      directMessages: dmsRes || [],
      reports,
      healthMetrics,
      blockedIds,
    });
  } catch (error: any) {
    console.error('[api/veneto GET] Error:', error);
    return NextResponse.json({ error: error?.message || 'Erro interno no Vêneto' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const sql = getDb() as any;
    const userId = authUser.id || authUser.sub || authUser.userId;
    const body = await request.json();
    const { action } = body;

    const meRes = await sql.query(`SELECT * FROM profiles WHERE id = $1 LIMIT 1`, [userId]);
    const currentUser = meRes[0] || null;
    const isAdminOrGestor = ['admin', 'gestor'].includes(currentUser?.role || '');

    switch (action) {
      // 1. CRIAR PUBLICAÇÃO ESTRUTURADA (Seção 5)
      case 'publish_post': {
        const {
          post_type = 'discussao',
          title = '',
          text_content = '',
          image_url = null,
          topic_tags = [],
          feedback_aspects = [],
          project_stage = null,
          consent_confirmed = true,
          offer_details = null,
          seek_details = null,
          partnership_mode = null,
          external_link = null,
          ritual_day = null,
          group_slug = 'agora',
        } = body;

        if (!text_content.trim() && !title.trim()) {
          return NextResponse.json({ error: 'Conteúdo obrigatório' }, { status: 400 });
        }

        if (!isAdminOrGestor && (group_slug === 'agora' || group_slug === 'global')) {
          return NextResponse.json(
            { error: 'O Feed é restrito para Admin e Gestor. Utilize a área de Trocas para publicar.' },
            { status: 403 }
          );
        }

        // No Vêneto, membros fundadores e equipe publicam diretamente (com moderação ativa por denúncia e revisão)
        const postStatus = 'approved';

        const inserted = await sql.query(
          `INSERT INTO community_posts (
            author_id, post_type, title, text_content, image_url,
            topic_tags, feedback_aspects, project_stage, consent_confirmed,
            offer_details, seek_details, partnership_mode, external_link,
            ritual_day, group_slug, status, likes_count, comments_count, saves_count
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11, $12, $13,
            $14, $15, $16, 0, 0, 0
          ) RETURNING *`,
          [
            userId,
            post_type,
            title.trim() || null,
            text_content.trim(),
            image_url,
            Array.isArray(topic_tags) ? topic_tags : [],
            Array.isArray(feedback_aspects) ? feedback_aspects : [],
            project_stage,
            Boolean(consent_confirmed),
            offer_details,
            seek_details,
            partnership_mode,
            external_link,
            ritual_day,
            group_slug,
            postStatus,
          ]
        );

        // Se for parceria, espelhar opcionalmente em b2b_pitches para manter o diretório sincronizado
        if (post_type === 'parceria' && title.trim()) {
          await sql.query(
            `INSERT INTO b2b_pitches (author_id, type, title, company, location, budget, description, tags)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              userId,
              partnership_mode === 'oferecendo' ? 'offer' : 'demand',
              title.trim(),
              currentUser?.empresa || currentUser?.nome || '',
              currentUser?.localizacao || 'Remoto',
              'Sob conversa no Vêneto',
              text_content.trim(),
              Array.isArray(topic_tags) ? topic_tags : [],
            ]
          ).catch(() => {});
        }

        const postWithProfile = {
          ...inserted[0],
          profiles: {
            id: currentUser?.id,
            nome: currentUser?.nome,
            username: currentUser?.username,
            avatar_url: currentUser?.avatar_url,
            role: currentUser?.role,
            empresa: currentUser?.empresa,
            area_atuacao: currentUser?.area_atuacao,
            segmento: currentUser?.segmento,
            localizacao: currentUser?.localizacao,
            is_founding_member: currentUser?.is_founding_member,
          },
          is_liked_by_me: false,
          is_saved_by_me: false,
        };

        return NextResponse.json({ post: postWithProfile });
      }

      // 2. BUSCAR COMENTÁRIOS DE UM POST
      case 'get_comments': {
        const { post_id } = body;
        const comments = await sql.query(
          `SELECT 
            c.*,
            json_build_object(
              'id', pr.id,
              'nome', pr.nome,
              'username', pr.username,
              'avatar_url', pr.avatar_url,
              'role', pr.role,
              'area_atuacao', pr.area_atuacao
            ) as profiles
          FROM post_comments c
          LEFT JOIN profiles pr ON c.user_id = pr.id
          WHERE c.post_id = $1
          ORDER BY c.is_solution DESC NULLS LAST, c.created_at ASC`,
          [post_id]
        );
        return NextResponse.json({ comments: comments || [] });
      }

      // 3. ADICIONAR COMENTÁRIO OU RESPOSTA ENCADEADA
      case 'add_comment': {
        const { post_id, content, parent_id = null } = body;
        if (!post_id || !content?.trim()) {
          return NextResponse.json({ error: 'Comentário vazio' }, { status: 400 });
        }

        const inserted = await sql.query(
          `INSERT INTO post_comments (post_id, user_id, parent_id, content, is_solution, helpful_count)
           VALUES ($1, $2, $3, $4, FALSE, 0) RETURNING *`,
          [post_id, userId, parent_id, content.trim()]
        );

        await sql.query(
          `UPDATE community_posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = $1`,
          [post_id]
        );

        const comment = {
          ...inserted[0],
          profiles: {
            id: currentUser?.id,
            nome: currentUser?.nome,
            username: currentUser?.username,
            avatar_url: currentUser?.avatar_url,
            role: currentUser?.role,
            area_atuacao: currentUser?.area_atuacao,
          },
        };

        return NextResponse.json({ comment });
      }

      // 4. MARCAR COMENTÁRIO COMO SOLUÇÃO ÚTIL DE UMA DÚVIDA (Seção 4.2, 5, 8 & 10)
      case 'mark_solution': {
        const { post_id, comment_id } = body;
        const postRes = await sql.query(`SELECT * FROM community_posts WHERE id = $1 LIMIT 1`, [post_id]);
        const post = postRes[0];
        if (!post) return NextResponse.json({ error: 'Publicação não encontrada' }, { status: 404 });

        if (post.author_id !== userId && !isAdminOrGestor) {
          return NextResponse.json({ error: 'Apenas o autor da dúvida ou curadoria pode marcar a solução.' }, { status: 403 });
        }

        const commentRes = await sql.query(`SELECT * FROM post_comments WHERE id = $1 LIMIT 1`, [comment_id]);
        const comment = commentRes[0];
        if (!comment) return NextResponse.json({ error: 'Resposta não encontrada' }, { status: 404 });

        await sql.query(`UPDATE post_comments SET is_solution = FALSE WHERE post_id = $1`, [post_id]);
        await sql.query(`UPDATE post_comments SET is_solution = TRUE, helpful_count = COALESCE(helpful_count, 0) + 1 WHERE id = $1`, [comment_id]);
        await sql.query(
          `UPDATE community_posts SET is_resolved = TRUE, resolved_comment_id = $1 WHERE id = $2`,
          [comment_id, post_id]
        );

        // Conceder automaticamente reconhecimento de "Ajuda útil" se for outro membro
        if (comment.user_id !== userId) {
          await sql.query(
            `INSERT INTO veneto_recognitions (from_user_id, to_user_id, badge_type, post_id, comment_id, note)
             VALUES ($1, $2, 'ajuda_util', $3, $4, $5)`,
            [
              userId,
              comment.user_id,
              post_id,
              comment_id,
              `Resposta marcada como solução útil em: "${post.title || post.text_content.slice(0, 60)}"`,
            ]
          );
        }

        return NextResponse.json({ success: true });
      }

      // 5. TOGGLE LIKE / REAÇÃO
      case 'toggle_like': {
        const { post_id } = body;
        const existing = await sql.query(
          `SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2 LIMIT 1`,
          [post_id, userId]
        );

        if (existing.length > 0) {
          await sql.query(`DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`, [post_id, userId]);
          await sql.query(`UPDATE community_posts SET likes_count = GREATEST(0, COALESCE(likes_count, 1) - 1) WHERE id = $1`, [post_id]);
          return NextResponse.json({ liked: false });
        } else {
          await sql.query(`INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)`, [post_id, userId]);
          await sql.query(`UPDATE community_posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = $1`, [post_id]);
          return NextResponse.json({ liked: true });
        }
      }

      // 6. TOGGLE SALVAR PUBLICAÇÃO (Seção 13 & 14)
      case 'toggle_save': {
        const { post_id } = body;
        const existing = await sql.query(
          `SELECT id FROM veneto_saved_posts WHERE post_id = $1 AND user_id = $2 LIMIT 1`,
          [post_id, userId]
        );

        if (existing.length > 0) {
          await sql.query(`DELETE FROM veneto_saved_posts WHERE post_id = $1 AND user_id = $2`, [post_id, userId]);
          await sql.query(`UPDATE community_posts SET saves_count = GREATEST(0, COALESCE(saves_count, 1) - 1) WHERE id = $1`, [post_id]);
          return NextResponse.json({ saved: false });
        } else {
          await sql.query(`INSERT INTO veneto_saved_posts (post_id, user_id) VALUES ($1, $2)`, [post_id, userId]);
          await sql.query(`UPDATE community_posts SET saves_count = COALESCE(saves_count, 0) + 1 WHERE id = $1`, [post_id]);
          return NextResponse.json({ saved: true });
        }
      }

      // 7. CONEXÃO ENTRE MEMBROS (Seguir / Conectar — Seção 6)
      case 'toggle_connection': {
        const { target_user_id, note = null } = body;
        if (!target_user_id || target_user_id === userId) {
          return NextResponse.json({ error: 'Operação inválida' }, { status: 400 });
        }

        const existing = await sql.query(
          `SELECT id FROM veneto_connections WHERE follower_id = $1 AND following_id = $2 LIMIT 1`,
          [userId, target_user_id]
        );

        if (existing.length > 0) {
          await sql.query(
            `DELETE FROM veneto_connections WHERE follower_id = $1 AND following_id = $2`,
            [userId, target_user_id]
          );
          return NextResponse.json({ connected: false });
        } else {
          await sql.query(
            `INSERT INTO veneto_connections (follower_id, following_id, status, connection_note)
             VALUES ($1, $2, 'connected', $3)`,
            [userId, target_user_id, note]
          );
          return NextResponse.json({ connected: true });
        }
      }

      // 8. CONCEDER RECONHECIMENTO DE CONTRIBUIÇÃO (Seção 10: Ajuda útil, Curadoria, Colaboração, Acolhimento)
      case 'give_recognition': {
        const { to_user_id, badge_type, note = '', post_id = null, comment_id = null } = body;
        if (!to_user_id || to_user_id === userId) {
          return NextResponse.json({ error: 'Selecione outro membro para reconhecer.' }, { status: 400 });
        }
        const validBadges = ['ajuda_util', 'curadoria', 'colaboracao', 'acolhimento'];
        if (!validBadges.includes(badge_type)) {
          return NextResponse.json({ error: 'Tipo de reconhecimento inválido' }, { status: 400 });
        }

        const inserted = await sql.query(
          `INSERT INTO veneto_recognitions (from_user_id, to_user_id, badge_type, post_id, comment_id, note)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [userId, to_user_id, badge_type, post_id, comment_id, note.trim()]
        );

        if (comment_id) {
          await sql.query(
            `UPDATE post_comments SET helpful_count = COALESCE(helpful_count, 0) + 1 WHERE id = $1`,
            [comment_id]
          );
        }

        return NextResponse.json({ recognition: inserted[0] });
      }

      // 9. CONTESTAR CLASSIFICAÇÃO / RECONHECIMENTO EQUIVOCADO (Seção 10)
      case 'contest_recognition': {
        const { recognition_id, reason = '' } = body;
        await sql.query(
          `UPDATE veneto_recognitions SET is_contested = TRUE, contest_reason = $1 WHERE id = $2 AND (to_user_id = $3 OR from_user_id = $3 OR $4::boolean = TRUE)`,
          [reason.trim(), recognition_id, userId, isAdminOrGestor]
        );
        return NextResponse.json({ success: true });
      }

      // 10. ATUALIZAR PERFIL PROFISSIONAL E ONBOARDING PROGRESSIVO (Seção 6)
      case 'update_profile': {
        const {
          nome,
          username,
          cargo,
          bio,
          empresa,
          area_atuacao,
          segmento,
          localizacao,
          skills,
          interesses,
          o_que_oferece,
          o_que_procura,
          links_profissionais,
          projetos_destaque,
          veneto_objectives,
          veneto_onboarding_done,
          dm_privacy,
          anniversary_date,
          avatar_url,
          cover_url,
        } = body;

        const cleanUsername =
          username !== undefined
            ? String(username).replace('@', '').toLowerCase().trim()
            : currentUser?.username;

        const updated = await sql.query(
          `UPDATE profiles SET
            nome = COALESCE($2, nome),
            username = $3,
            cargo = COALESCE($4, cargo),
            bio = $5,
            empresa = $6,
            area_atuacao = $7,
            segmento = $8,
            localizacao = $9,
            skills = COALESCE($10, skills),
            interesses = COALESCE($11, interesses),
            o_que_oferece = $12,
            o_que_procura = $13,
            links_profissionais = COALESCE($14::jsonb, links_profissionais),
            projetos_destaque = COALESCE($15::jsonb, projetos_destaque),
            veneto_objectives = COALESCE($16, veneto_objectives),
            veneto_onboarding_done = COALESCE($17, veneto_onboarding_done),
            dm_privacy = COALESCE($18, dm_privacy),
            anniversary_date = $19,
            avatar_url = COALESCE($20, avatar_url),
            cover_url = COALESCE($21, cover_url)
          WHERE id = $1
          RETURNING *`,
          [
            userId,
            nome !== undefined && String(nome).trim() ? String(nome).trim() : null,
            cleanUsername || null,
            cargo !== undefined ? cargo : null,
            bio !== undefined ? bio : (currentUser?.bio ?? null),
            empresa !== undefined ? empresa : (currentUser?.empresa ?? null),
            area_atuacao !== undefined ? area_atuacao : (currentUser?.area_atuacao ?? null),
            segmento !== undefined ? segmento : (currentUser?.segmento ?? null),
            localizacao !== undefined ? localizacao : (currentUser?.localizacao ?? null),
            Array.isArray(skills) ? skills : null,
            Array.isArray(interesses) ? interesses : null,
            o_que_oferece !== undefined ? o_que_oferece : (currentUser?.o_que_oferece ?? null),
            o_que_procura !== undefined ? o_que_procura : (currentUser?.o_que_procura ?? null),
            links_profissionais ? JSON.stringify(links_profissionais) : null,
            projetos_destaque ? JSON.stringify(projetos_destaque) : null,
            Array.isArray(veneto_objectives) ? veneto_objectives : null,
            veneto_onboarding_done !== undefined ? Boolean(veneto_onboarding_done) : null,
            dm_privacy || null,
            anniversary_date !== undefined ? (anniversary_date || null) : (currentUser?.anniversary_date || null),
            avatar_url !== undefined ? avatar_url : null,
            cover_url !== undefined ? cover_url : null,
          ]
        );

        return NextResponse.json({ profile: updated[0] });
      }

      // 11. ENCONTROS: CONFIRMAR PRESENÇA (RSVP) E CHAT AO VIVO (Seção 4.5 & 13)
      case 'toggle_rsvp': {
        const { event_id } = body;
        const existing = await sql.query(
          `SELECT id FROM veneto_event_rsvps WHERE event_id = $1 AND user_id = $2 LIMIT 1`,
          [event_id, userId]
        );
        if (existing.length > 0) {
          await sql.query(`DELETE FROM veneto_event_rsvps WHERE event_id = $1 AND user_id = $2`, [event_id, userId]);
          return NextResponse.json({ rsvped: false });
        } else {
          await sql.query(`INSERT INTO veneto_event_rsvps (event_id, user_id) VALUES ($1, $2)`, [event_id, userId]);
          return NextResponse.json({ rsvped: true });
        }
      }

      case 'send_event_message': {
        const { event_id, content } = body;
        if (!event_id || !content?.trim()) {
          return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
        }
        const inserted = await sql.query(
          `INSERT INTO veneto_event_messages (event_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
          [event_id, userId, content.trim()]
        );
        return NextResponse.json({
          message: {
            ...inserted[0],
            profiles: {
              id: currentUser?.id,
              nome: currentUser?.nome,
              username: currentUser?.username,
              avatar_url: currentUser?.avatar_url,
              role: currentUser?.role,
            },
          },
        });
      }

      case 'create_event': {
        if (!isAdminOrGestor) {
          return NextResponse.json({ error: 'Apenas a curadoria pode agendar Encontros oficiais.' }, { status: 403 });
        }
        const { title, subtitle, description, event_type, ritual_day, starts_at, duration_minutes, meeting_url, topic_tags } = body;
        const inserted = await sql.query(
          `INSERT INTO veneto_events (title, subtitle, description, event_type, ritual_day, host_id, host_name, starts_at, duration_minutes, meeting_url, topic_tags)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
          [
            title,
            subtitle || '',
            description || '',
            event_type || 'encontro_aberto',
            ritual_day || 'QUI',
            userId,
            currentUser?.nome || 'Studio Veronna',
            starts_at || new Date(Date.now() + 86400000).toISOString(),
            duration_minutes || 60,
            meeting_url || null,
            Array.isArray(topic_tags) ? topic_tags : [],
          ]
        );
        return NextResponse.json({ event: inserted[0] });
      }

      // 12. ESTÚDIO DA LIZ: REGISTRAR APLICAÇÃO OU CRIAR CONTEÚDO (Seção 4.6 & 14)
      case 'record_studio_action': {
        const { content_id, kind } = body; // kind: 'save' | 'apply'
        if (kind === 'apply') {
          await sql.query(
            `UPDATE veneto_studio_contents SET applications_count = COALESCE(applications_count, 0) + 1 WHERE id = $1`,
            [content_id]
          );
        } else {
          await sql.query(
            `UPDATE veneto_studio_contents SET saves_count = COALESCE(saves_count, 0) + 1 WHERE id = $1`,
            [content_id]
          );
        }
        return NextResponse.json({ success: true });
      }

      case 'create_studio_content': {
        if (!isAdminOrGestor) {
          return NextResponse.json({ error: 'Apenas o Studio Veronna pode publicar no Estúdio.' }, { status: 403 });
        }
        const { title, category, summary, principle, practical_example, application_prompt, reading_time_minutes, ecosystem_pillar } = body;
        const inserted = await sql.query(
          `INSERT INTO veneto_studio_contents (title, category, summary, principle, practical_example, application_prompt, reading_time_minutes, ecosystem_pillar)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [
            title,
            category || 'nota_estudio',
            summary,
            principle || '',
            practical_example || '',
            application_prompt || '',
            reading_time_minutes || 4,
            ecosystem_pillar || 'identidade',
          ]
        );
        return NextResponse.json({ studioContent: inserted[0] });
      }

      // 13. MENSAGENS PRIVADAS COM CONTROLE DE PRIVACIDADE (Seção 6 & 11)
      case 'send_dm': {
        const { receiver_id, content, context_label = null } = body;
        if (!receiver_id || !content?.trim()) {
          return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
        }

        // Verificar bloqueios
        const blockCheck = await sql.query(
          `SELECT id FROM veneto_user_blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1) LIMIT 1`,
          [userId, receiver_id]
        );
        if (blockCheck.length > 0) {
          return NextResponse.json({ error: 'Não é possível enviar mensagem para este perfil.' }, { status: 403 });
        }

        // Verificar preferência de privacidade do destinatário
        const targetRes = await sql.query(`SELECT id, nome, dm_privacy, role FROM profiles WHERE id = $1 LIMIT 1`, [receiver_id]);
        const target = targetRes[0];
        if (!target) return NextResponse.json({ error: 'Destinatário não encontrado' }, { status: 404 });

        if (!isAdminOrGestor && target.dm_privacy === 'none') {
          return NextResponse.json({ error: 'Este membro desativou o recebimento de novas mensagens privadas.' }, { status: 403 });
        }

        if (!isAdminOrGestor && target.dm_privacy === 'connections') {
          const connCheck = await sql.query(
            `SELECT id FROM veneto_connections WHERE follower_id = $1 AND following_id = $2 LIMIT 1`,
            [receiver_id, userId]
          );
          if (connCheck.length === 0) {
            return NextResponse.json({
              error: 'Este membro recebe mensagens apenas de conexões que ele acompanha. Conecte-se primeiro ou interaja nas discussões!',
            }, { status: 403 });
          }
        }

        const inserted = await sql.query(
          `INSERT INTO veneto_direct_messages (sender_id, receiver_id, content, context_label, is_read)
           VALUES ($1, $2, $3, $4, FALSE) RETURNING *`,
          [userId, receiver_id, content.trim(), context_label]
        );

        return NextResponse.json({
          dm: {
            ...inserted[0],
            sender: {
              id: currentUser?.id,
              nome: currentUser?.nome,
              username: currentUser?.username,
              avatar_url: currentUser?.avatar_url,
            },
            receiver: {
              id: target.id,
              nome: target.nome,
            },
          },
        });
      }

      // 14. SEGURANÇA, DENÚNCIA E BLOQUEIO (Seção 11)
      case 'report_item': {
        const { target_type, target_id, reason_category, description = '' } = body;
        if (!target_type || !target_id || !reason_category) {
          return NextResponse.json({ error: 'Dados incompletos para denúncia' }, { status: 400 });
        }
        const inserted = await sql.query(
          `INSERT INTO veneto_reports (reporter_id, target_type, target_id, reason_category, description, status)
           VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
          [userId, target_type, target_id, reason_category, description.trim()]
        );
        return NextResponse.json({ report: inserted[0] });
      }

      case 'moderate_report': {
        if (!isAdminOrGestor) {
          return NextResponse.json({ error: 'Sem permissão de moderação' }, { status: 403 });
        }
        const { report_id, status, moderator_notes = '', delete_target = false } = body;
        const repRes = await sql.query(`SELECT * FROM veneto_reports WHERE id = $1 LIMIT 1`, [report_id]);
        const rep = repRes[0];
        if (!rep) return NextResponse.json({ error: 'Denúncia não encontrada' }, { status: 404 });

        if (delete_target && rep.target_type === 'post') {
          await sql.query(`DELETE FROM community_posts WHERE id = $1`, [rep.target_id]);
        } else if (delete_target && rep.target_type === 'comment') {
          await sql.query(`DELETE FROM post_comments WHERE id = $1`, [rep.target_id]);
        }

        await sql.query(
          `UPDATE veneto_reports SET status = $1, moderator_id = $2, moderator_notes = $3, resolved_at = NOW() WHERE id = $4`,
          [status || 'resolved', userId, moderator_notes, report_id]
        );
        return NextResponse.json({ success: true });
      }

      case 'toggle_block': {
        const { blocked_id } = body;
        if (!blocked_id || blocked_id === userId) {
          return NextResponse.json({ error: 'Operação inválida' }, { status: 400 });
        }
        const existing = await sql.query(
          `SELECT id FROM veneto_user_blocks WHERE blocker_id = $1 AND blocked_id = $2 LIMIT 1`,
          [userId, blocked_id]
        );
        if (existing.length > 0) {
          await sql.query(`DELETE FROM veneto_user_blocks WHERE blocker_id = $1 AND blocked_id = $2`, [userId, blocked_id]);
          return NextResponse.json({ blocked: false });
        } else {
          await sql.query(`INSERT INTO veneto_user_blocks (blocker_id, blocked_id) VALUES ($1, $2)`, [userId, blocked_id]);
          return NextResponse.json({ blocked: true });
        }
      }

      case 'delete_post': {
        const { post_id } = body;
        const postRes = await sql.query(`SELECT author_id FROM community_posts WHERE id = $1 LIMIT 1`, [post_id]);
        if (!postRes[0]) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
        if (postRes[0].author_id !== userId && !isAdminOrGestor) {
          return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
        }
        await sql.query(`DELETE FROM post_comments WHERE post_id = $1`, [post_id]);
        await sql.query(`DELETE FROM post_likes WHERE post_id = $1`, [post_id]);
        await sql.query(`DELETE FROM veneto_saved_posts WHERE post_id = $1`, [post_id]);
        await sql.query(`DELETE FROM community_posts WHERE id = $1`, [post_id]);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[api/veneto POST] Error:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao processar ação no Vêneto' }, { status: 500 });
  }
}
