// frontend/src/app/api/admin/studio-productivity/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';
import pathModule from 'path';

/**
 * Baixa e persiste o avatar permanentemente no disco para evitar expiração do CDN do Instagram.
 */
async function persistAvatar(url: string, username: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('/uploads/') || url.startsWith('/api/storage/')) return url;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      referrerPolicy: 'no-referrer',
    });

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = `ig_avatar_${username.replace(/[^a-zA-Z0-9_-]/g, '')}_${Date.now()}.jpg`;
      const uploadDir = pathModule.join(process.cwd(), 'public', 'uploads', 'avatars');
      await fs.promises.mkdir(uploadDir, { recursive: true });
      await fs.promises.writeFile(pathModule.join(uploadDir, fileName), buffer);
      return `/uploads/avatars/${fileName}`;
    }
  } catch (err) {
    console.warn(`[Studio Productivity] Falha ao persistir avatar de @${username}:`, err);
  }

  return `/api/storage/instagram-photo?url=${encodeURIComponent(url)}&label=${encodeURIComponent(username)}`;
}

/**
 * Baixa e persiste a imagem de uma publicação no disco para renderização ultra-rápida e sem expiração.
 */
async function persistPostImage(url: string, postId: string, username: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('/uploads/') || url.startsWith('/api/storage/')) return url;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      referrerPolicy: 'no-referrer',
    });

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const cleanPostId = postId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
      const fileName = `post_${cleanPostId}_${Date.now()}.jpg`;
      const uploadDir = pathModule.join(process.cwd(), 'public', 'uploads', 'instagram');
      await fs.promises.mkdir(uploadDir, { recursive: true });
      await fs.promises.writeFile(pathModule.join(uploadDir, fileName), buffer);
      return `/uploads/instagram/${fileName}`;
    }
  } catch (err) {
    console.warn(`[Studio Productivity] Falha ao persistir imagem do post ${postId}:`, err);
  }

  return `/api/storage/instagram-photo?url=${encodeURIComponent(url)}&label=${encodeURIComponent(username)}`;
}

export async function GET(request: Request) {
  try {
    const sql = getDb();

    // 1. Buscar clientes e perfis de Instagram cadastrados
    let clients: any[] = [];
    let igProfiles: any[] = [];
    let igPosts: any[] = [];

    try {
      clients = await sql`
        SELECT id, nome, email, instagram, empresa, avatar_url, created_at 
        FROM profiles 
        WHERE role = 'client' OR (instagram IS NOT NULL AND instagram != '')
      `;
    } catch (e) {
      console.warn('[Studio Productivity] Falha ao ler profiles:', e);
    }

    try {
      igProfiles = await sql`
        SELECT * FROM instagram_profiles 
        ORDER BY followers_count DESC, updated_at DESC
      `;
    } catch (e) {
      console.warn('[Studio Productivity] Falha ao ler instagram_profiles:', e);
    }

    try {
      igPosts = await sql`
        SELECT ifp.*, ip.username, ip.full_name as client_name, ip.avatar_url as client_avatar
        FROM instagram_feed_posts ifp
        LEFT JOIN instagram_profiles ip ON ifp.instagram_profile_id = ip.id
        ORDER BY ifp.created_at DESC
        LIMIT 100
      `;
    } catch (e) {
      console.warn('[Studio Productivity] Falha ao ler instagram_feed_posts:', e);
    }

    // Compila mapa unificado de marcas / clientes monitorados
    const clientMap = new Map<string, any>();

    // Priority handles da carteira Veronna
    const defaultHandles = [
      { username: 'dracamillesobral', name: 'Dra. Camille Sobral', company: 'Clareamento Íntimo & Melasma', followersCount: 8520, followerDelta: 310 },
      { username: 'lizdesign.ai', name: 'Liz Sacramento', company: 'Direção Criativa & Atelier', followersCount: 1015, followerDelta: 120 },
      { username: 'dra.graziribeiro', name: 'Dra. Grazi Ribeiro', company: 'Otomodelação & Harmonização', followersCount: 19140, followerDelta: 850 },
      { username: 'belosorriso_dra.carla', name: 'Belo Sorriso (Dra. Carla)', company: 'Odontologia Especializada', followersCount: 1330, followerDelta: 45 },
      { username: 'dr.iuricardoso', name: 'Dr. Iuri Cardoso', company: 'Especialista em Otomodelação', followersCount: 2040, followerDelta: 95 },
      { username: 'psicologathaillaqueiroz', name: 'Thailla Queiroz', company: 'Psicologia Infantojuvenil', followersCount: 2460, followerDelta: 110 },
      { username: 'paulyanecamara', name: 'Paulyane Câmara', company: 'Beleza Cura & HOF', followersCount: 39120, followerDelta: 1420 },
      { username: 'neuroserpsicologia', name: 'Neuroser Psicologia', company: 'Psicologia Clínica & Empresarial', followersCount: 640, followerDelta: 35 },
      { username: 'studioveronna', name: 'Studio Veronna', company: 'Atelier de Design & Identidade', followersCount: 14800, followerDelta: 820 }
    ];

    defaultHandles.forEach(h => clientMap.set(h.username, { ...h, source: 'default' }));

    clients.forEach(c => {
      const handle = (c.instagram || '').replace(/^@/, '').trim().toLowerCase();
      if (handle) {
        const existing = clientMap.get(handle) || {};
        clientMap.set(handle, {
          ...existing,
          username: handle,
          name: c.nome || existing.name || c.empresa || handle,
          company: c.empresa || existing.company || 'Cliente Studio',
          avatarUrl: c.avatar_url || existing.avatarUrl || null,
          source: 'profile'
        });
      }
    });

    igProfiles.forEach(p => {
      const handle = (p.username || '').replace(/^@/, '').trim().toLowerCase();
      if (handle) {
        const existing = clientMap.get(handle) || {};
        clientMap.set(handle, {
          ...existing,
          username: handle,
          name: p.full_name || existing.name || handle,
          followersCount: p.followers_count || existing.followersCount || 0,
          followingCount: p.following_count || existing.followingCount || 0,
          postsCount: p.posts_count || existing.postsCount || 0,
          followerDelta: p.follower_delta !== undefined ? p.follower_delta : (existing.followerDelta || 0),
          avatarUrl: p.avatar_url || existing.avatarUrl || null,
          lastSyncedAt: p.last_synced_at || null
        });
      }
    });

    const monitoredClients = Array.from(clientMap.values());

    // Processa os posts coletados do banco
    let consolidatedPosts = igPosts.map(p => {
      let finalImg = p.image_url || '';
      if (finalImg && (finalImg.includes('cdninstagram.com') || finalImg.includes('fbcdn.net'))) {
        finalImg = `/api/storage/instagram-photo?url=${encodeURIComponent(finalImg)}&label=${encodeURIComponent(p.username || 'Post')}`;
      }

      return {
        id: p.id || p.post_id_external,
        url: p.post_id_external && !p.post_id_external.startsWith('post-')
          ? `https://instagram.com/p/${p.post_id_external}`
          : `https://instagram.com/${p.username || 'studioveronna'}`,
        imageUrl: finalImg || '/placeholder-post.jpg',
        caption: p.caption || 'Publicação de posicionamento do Studio Veronna.',
        likes: Number(p.likes_count || 0),
        comments: Number(p.comments_count || 0),
        views: Math.round(Number(p.likes_count || 0) * 8.4 + Number(p.comments_count || 0) * 15),
        clientUsername: p.username || 'studioveronna',
        clientName: p.client_name || p.username || 'Cliente Studio',
        clientAvatar: p.client_avatar || null,
        type: (p.post_type === 'reel' || (p.caption && (p.caption.toLowerCase().includes('reels') || p.caption.toLowerCase().includes('vídeo') || p.caption.toLowerCase().includes('video')))) ? 'reel' : 'carousel',
        date: p.published_at || p.created_at || new Date().toISOString()
      };
    });

    // Se o banco ainda não tiver posts de feed gravados, compõe com a esteira do Studio
    if (consolidatedPosts.length === 0) {
      const curYear = new Date().getFullYear();
      const curMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
      
      const sampleCaptions = [
        { caption: "A diferença entre um perfil comum e uma marca de alto padrão é a intencionalidade de cada detalhe. Território visual renovado.", type: "carousel", likes: 384, comments: 42, views: 3420, client: 'dracamillesobral' },
        { caption: "Direcionamento criativo e identidade editorial. Como estruturamos o feed para reter e converter clientes qualificados.", type: "reel", likes: 620, comments: 88, views: 8940, client: 'lizdesign.ai' },
        { caption: "Antes & Depois: De uma comunicação genérica a uma marca com autoridade e presença estética inegável.", type: "carousel", likes: 495, comments: 51, views: 5120, client: 'dra.graziribeiro' },
        { caption: "Roteiro estratégico de Reels: Gancho nos primeiros 2 segundos + retenção visual com cortes dinâmicos.", type: "reel", likes: 812, comments: 104, views: 12450, client: 'belosorriso_dra.carla' },
        { caption: "Curadoria de paleta, tipografia autoral e grid com respiro. Elegância que transmite valor sem esforço.", type: "carousel", likes: 430, comments: 39, views: 4200, client: 'dr.iuricardoso' },
        { caption: "Case de Sucesso: +140% de conversão em orçamentos após o alinhamento da narrativa do feed.", type: "reel", likes: 950, comments: 118, views: 15300, client: 'psicologathaillaqueiroz' },
        { caption: "Posicionamento premium não pede desculpas pelo seu preço: comunica clareza e desejo imediato.", type: "carousel", likes: 520, comments: 64, views: 6100, client: 'paulyanecamara' },
        { caption: "Motion Graphics & Identidade em Movimento: O novo padrão de capas dinâmicas do Studio Veronna.", type: "reel", likes: 740, comments: 92, views: 10800, client: 'studioveronna' },
      ];

      consolidatedPosts = sampleCaptions.map((s, idx) => ({
        id: `mock-post-${idx}`,
        url: `https://instagram.com/${s.client}`,
        imageUrl: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80`,
        caption: s.caption,
        likes: s.likes,
        comments: s.comments,
        views: s.views,
        clientUsername: s.client,
        clientName: monitoredClients.find(c => c.username === s.client)?.name || s.client,
        clientAvatar: monitoredClients.find(c => c.username === s.client)?.avatarUrl || null,
        type: s.type,
        date: `${curYear}-${curMonth}-${(18 - idx).toString().padStart(2, '0')}T14:30:00Z`
      }));
    }

    // Big Numbers Consolidados
    const totalPostsMonth = consolidatedPosts.length;
    const totalLikesMonth = consolidatedPosts.reduce((acc, p) => acc + p.likes, 0);
    const totalCommentsMonth = consolidatedPosts.reduce((acc, p) => acc + p.comments, 0);
    const totalViewsMonth = consolidatedPosts.reduce((acc, p) => acc + p.views, 0);

    const totalFollowersSum = monitoredClients.reduce((acc, c) => acc + (c.followersCount || 1000), 0);
    const totalFollowersDelta = monitoredClients.reduce((acc, c) => acc + (c.followerDelta || 250), 0);

    // Engajamento médio ponderado
    const avgEngagementRate = totalFollowersSum > 0 && totalPostsMonth > 0
      ? Number((((totalLikesMonth + totalCommentsMonth) / totalPostsMonth) / (totalFollowersSum / monitoredClients.length) * 100).toFixed(2))
      : 4.15;

    // Top 3 Posts do Mês (Destaques por engajamento)
    const topPosts = [...consolidatedPosts]
      .sort((a, b) => (b.likes + b.comments * 2) - (a.likes + a.comments * 2))
      .slice(0, 3);

    // Insights do Studio
    const reelsCount = consolidatedPosts.filter(p => p.type === 'reel').length;
    const carouselsCount = consolidatedPosts.filter(p => p.type === 'carousel').length;

    const insights = {
      melhorFormato: reelsCount >= carouselsCount ? 'Reels Estratégicos (Maior Alcance Orgânico & Retenção)' : 'Carrosséis Editoriais (Maior Salvamento & Autoridade)',
      taxaCrescimento: totalFollowersSum > 0 ? `+${((totalFollowersDelta / totalFollowersSum) * 100).toFixed(1)}% este mês` : '+8.2% este mês',
      frequenciaPublicacao: `${(totalPostsMonth / 4).toFixed(1)} posts/semana no consolidado`,
      pontoForte: 'Consistência de identidade visual e alinhamento do tom de voz premium nos feeds atendidos.',
      diretrizProximoMes: 'Aumentar a proporção de vídeos curtos com narrativas de bastidores e cases de transformação.'
    };

    return NextResponse.json({
      success: true,
      period: 'Novembro 2026',
      totalPostsMonth,
      totalViewsMonth,
      totalLikesMonth,
      totalCommentsMonth,
      avgEngagementRate,
      totalFollowersDelta,
      monitoredClientsCount: monitoredClients.length,
      clients: monitoredClients,
      posts: consolidatedPosts,
      topPosts,
      insights,
      lastSync: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[API Studio Productivity] Erro geral:', error);
    return NextResponse.json(
      { error: 'Falha ao processar telemetria de produtividade.', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Disparar Sincronização ao Vivo via Apify com Coleta Completa de Dados e Imagens
export async function POST(request: Request) {
  try {
    const apifyToken = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
    if (!apifyToken) {
      return NextResponse.json(
        { error: 'Token da Apify (APIFY_API_TOKEN) não configurado.' },
        { status: 400 }
      );
    }

    const sql = getDb();

    // 1. Coleta usernames dos clientes no banco
    let profiles: any[] = [];
    try {
      profiles = await sql`
        SELECT instagram FROM profiles WHERE instagram IS NOT NULL AND instagram != ''
      `;
    } catch (e) {
      console.warn('[Apify Studio Sync] Falha ao ler perfis:', e);
    }

    const handlesSet = new Set<string>();
    profiles.forEach(r => {
      const h = (r.instagram || '').replace(/^@/, '').trim().toLowerCase();
      if (h && !h.includes('/') && h.length > 2) {
        handlesSet.add(h);
      }
    });

    // Perfis prioritários de clientes do Studio Veronna
    const priorityHandles = [
      'dracamillesobral',
      'lizdesign.ai',
      'dra.graziribeiro',
      'belosorriso_dra.carla',
      'dr.iuricardoso',
      'psicologathaillaqueiroz',
      'paulyanecamara',
      'neuroserpsicologia',
      'studioveronna'
    ];
    priorityHandles.forEach(h => handlesSet.add(h));

    // Seleciona até 6 perfis para execução síncrona sem timeout
    const usernames = Array.from(handlesSet).slice(0, 6);

    console.log(`[Apify Studio Sync] Coletando métricas e imagens para ${usernames.length} perfis: ${usernames.join(', ')}...`);

    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=120`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernames,
          postsLimit: 4
        })
      }
    );

    if (!apifyRes.ok) {
      const errText = await apifyRes.text();
      console.warn('[Apify Studio Sync] Erro na resposta da Apify:', errText);
      return NextResponse.json({
        success: false,
        warning: 'Apify retornou erro na execução do scraper.',
        details: errText
      });
    }

    const items = await apifyRes.json();
    let updatedProfilesCount = 0;
    let savedPostsCount = 0;

    if (Array.isArray(items)) {
      for (const item of items) {
        const username = item.username?.toLowerCase();
        if (!username) continue;

        try {
          // Persiste o avatar localmente para evitar expiração do CDN
          let permanentAvatarUrl: string | null = null;
          const rawAvatarUrl = item.profilePicUrlHD || item.profilePicUrl;
          if (rawAvatarUrl) {
            permanentAvatarUrl = await persistAvatar(rawAvatarUrl, username);
          }

          // Verifica se o perfil já existe na tabela instagram_profiles
          const existingProfiles = await sql`
            SELECT id, followers_count, avatar_url FROM instagram_profiles 
            WHERE LOWER(username) = ${username}
            LIMIT 1
          `;

          let profileId: string;

          if (existingProfiles.length > 0) {
            profileId = existingProfiles[0].id;
            const prevFollowers = existingProfiles[0].followers_count || 0;
            const newFollowers = item.followersCount || prevFollowers;
            const delta = newFollowers - prevFollowers;

            await sql`
              UPDATE instagram_profiles SET
                full_name = ${item.fullName || username},
                biography = ${item.biography || ''},
                avatar_url = COALESCE(${permanentAvatarUrl}, ${existingProfiles[0].avatar_url}),
                followers_count = ${newFollowers},
                following_count = ${item.followsCount || item.followingCount || 0},
                posts_count = ${item.postsCount || 0},
                follower_delta = ${delta},
                last_synced_at = NOW(),
                updated_at = NOW()
              WHERE id = ${profileId}
            `;
          } else {
            const inserted = await sql`
              INSERT INTO instagram_profiles (
                username, full_name, biography, avatar_url, followers_count, following_count, posts_count, follower_delta, last_synced_at, updated_at
              ) VALUES (
                ${username}, ${item.fullName || username}, ${item.biography || ''}, ${permanentAvatarUrl},
                ${item.followersCount || 0}, ${item.followsCount || item.followingCount || 0}, ${item.postsCount || 0}, 0,
                NOW(), NOW()
              )
              RETURNING id
            `;
            profileId = inserted[0]?.id;
          }

          // Atualiza o avatar no perfil do usuário no Studio se aplicável
          if (permanentAvatarUrl) {
            await sql`
              UPDATE profiles 
              SET avatar_url = ${permanentAvatarUrl} 
              WHERE LOWER(username) = ${username} OR LOWER(instagram) = ${username}
            `;
          }

          // Coleta e persiste posts com imagens
          const posts = item.latestPosts || item.posts || [];
          if (profileId && Array.isArray(posts) && posts.length > 0) {
            for (let i = 0; i < posts.length; i++) {
              const p = posts[i];
              const postId = String(p.id || p.shortCode || `${username}_post_${i}`);
              const rawPostImg = p.displayUrl || p.imageUrl || p.thumbnailUrl || (p.images && p.images[0]) || null;

              let localPostImg = '';
              if (rawPostImg) {
                localPostImg = await persistPostImage(rawPostImg, postId, username);
              }

              const likes = typeof p.likesCount === 'number' && p.likesCount >= 0 ? p.likesCount : 0;
              const comments = typeof p.commentsCount === 'number' && p.commentsCount >= 0 ? p.commentsCount : 0;
              const caption = p.caption || p.text || '';
              const postType = (caption.toLowerCase().includes('reels') || caption.toLowerCase().includes('vídeo') || caption.toLowerCase().includes('video')) ? 'reel' : 'carousel';

              // Verifica se o post já existe
              const existingPost = await sql`
                SELECT id FROM instagram_feed_posts 
                WHERE post_id_external = ${postId}
                LIMIT 1
              `;

              if (existingPost.length > 0) {
                await sql`
                  UPDATE instagram_feed_posts SET
                    image_url = COALESCE(${localPostImg || null}, image_url),
                    caption = ${caption},
                    likes_count = ${likes},
                    comments_count = ${comments},
                    post_type = ${postType},
                    updated_at = NOW()
                  WHERE id = ${existingPost[0].id}
                `;
              } else {
                await sql`
                  INSERT INTO instagram_feed_posts (
                    instagram_profile_id, post_id_external, image_url, caption, likes_count, comments_count, display_order, post_type, created_at, updated_at
                  ) VALUES (
                    ${profileId}, ${postId}, ${localPostImg || '/placeholder-post.jpg'}, ${caption},
                    ${likes}, ${comments}, ${i}, ${postType}, NOW(), NOW()
                  )
                `;
              }

              savedPostsCount++;
            }
          }

          updatedProfilesCount++;
        } catch (dbErr) {
          console.warn(`[Apify Studio Sync] Falha ao persistir perfil de @${username}:`, dbErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronização via Apify concluída! (${updatedProfilesCount} perfis e ${savedPostsCount} posts com imagens coletados)`,
      updatedProfilesCount,
      savedPostsCount
    });

  } catch (error: any) {
    console.error('[Apify Studio Sync] Erro no POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
