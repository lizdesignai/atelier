import dotenv from 'dotenv';
dotenv.config({ path: 'frontend/.env.local' });
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import pathModule from 'path';

const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);
const apifyToken = process.env.APIFY_API_TOKEN;

async function persistAvatar(url, username) {
  if (!url) return '';
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
      const uploadDir = pathModule.join(process.cwd(), 'frontend', 'public', 'uploads', 'avatars');
      await fs.promises.mkdir(uploadDir, { recursive: true });
      await fs.promises.writeFile(pathModule.join(uploadDir, fileName), buffer);
      console.log(`✓ Avatar de @${username} salvo: /uploads/avatars/${fileName}`);
      return `/uploads/avatars/${fileName}`;
    }
  } catch (err) {
    console.warn(`Falha ao persistir avatar de @${username}:`, err.message);
  }
  return `/api/storage/instagram-photo?url=${encodeURIComponent(url)}&label=${encodeURIComponent(username)}`;
}

async function persistPostImage(url, postId, username) {
  if (!url) return '';
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
      const uploadDir = pathModule.join(process.cwd(), 'frontend', 'public', 'uploads', 'instagram');
      await fs.promises.mkdir(uploadDir, { recursive: true });
      await fs.promises.writeFile(pathModule.join(uploadDir, fileName), buffer);
      console.log(`✓ Imagem do post ${postId} de @${username} salva: /uploads/instagram/${fileName}`);
      return `/uploads/instagram/${fileName}`;
    }
  } catch (err) {
    console.warn(`Falha ao persistir imagem do post ${postId}:`, err.message);
  }
  return `/api/storage/instagram-photo?url=${encodeURIComponent(url)}&label=${encodeURIComponent(username)}`;
}

async function runSync() {
  console.log("Iniciando coleta ao vivo Apify...");

  // Seleciona as marcas ativas dos clientes Veronna
  const usernames = [
    'dracamillesobral',
    'lizdesign.ai',
    'dra.graziribeiro',
    'belosorriso_dra.carla'
  ];

  console.log("Usernames a serem consultados:", usernames);

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
    console.error("Apify error:", apifyRes.status, await apifyRes.text());
    return;
  }

  const items = await apifyRes.json();
  console.log(`Apify retornou ${items.length} perfis! Processando e baixando imagens...`);

  for (const item of items) {
    const username = item.username?.toLowerCase();
    if (!username) continue;

    console.log(`\nProcessando perfil @${username}...`);
    const rawAvatarUrl = item.profilePicUrlHD || item.profilePicUrl;
    let localAvatar = '';
    if (rawAvatarUrl) {
      localAvatar = await persistAvatar(rawAvatarUrl, username);
    }

    const existingProfiles = await sql`
      SELECT id, followers_count FROM instagram_profiles 
      WHERE LOWER(username) = ${username}
      LIMIT 1
    `;

    let profileId;
    if (existingProfiles.length > 0) {
      profileId = existingProfiles[0].id;
      const prevFollowers = existingProfiles[0].followers_count || 0;
      const newFollowers = item.followersCount || prevFollowers;
      const delta = newFollowers - prevFollowers;

      await sql`
        UPDATE instagram_profiles SET
          full_name = ${item.fullName || username},
          biography = ${item.biography || ''},
          avatar_url = COALESCE(${localAvatar || null}, avatar_url),
          followers_count = ${newFollowers},
          following_count = ${item.followsCount || item.followingCount || 0},
          posts_count = ${item.postsCount || 0},
          follower_delta = ${delta},
          last_synced_at = NOW(),
          updated_at = NOW()
        WHERE id = ${profileId}
      `;
    } else {
      const ins = await sql`
        INSERT INTO instagram_profiles (
          username, full_name, biography, avatar_url, followers_count, following_count, posts_count, follower_delta, last_synced_at, updated_at
        ) VALUES (
          ${username}, ${item.fullName || username}, ${item.biography || ''}, ${localAvatar || null},
          ${item.followersCount || 0}, ${item.followsCount || item.followingCount || 0}, ${item.postsCount || 0}, 0,
          NOW(), NOW()
        )
        RETURNING id
      `;
      profileId = ins[0]?.id;
    }

    if (localAvatar) {
      await sql`
        UPDATE profiles SET avatar_url = ${localAvatar}
        WHERE LOWER(username) = ${username} OR LOWER(instagram) = ${username}
      `;
    }

    const posts = item.latestPosts || item.posts || [];
    console.log(`@${username} tem ${posts.length} posts para processar.`);

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
    }
  }

  console.log("\n✓ Sincronização concluída com sucesso!");
}

runSync();
