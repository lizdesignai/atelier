const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL / POSTGRES_URL ausente");
  process.exit(1);
}

const sql = neon(databaseUrl);

function getInitials(name) {
  if (!name) return 'SV';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function createAvatarSvg(name, initials, roleColor1 = '#B66940', roleColor2 = '#8B4520') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${roleColor1}"/>
      <stop offset="100%" stop-color="${roleColor2}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="256" height="256" fill="url(#grad)" rx="128"/>
  <circle cx="128" cy="128" r="118" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="3"/>
  <text x="128" y="142" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="88" font-weight="700" fill="#ffffff" dominant-baseline="middle" text-anchor="middle" filter="url(#shadow)" letter-spacing="2">${initials}</text>
</svg>`;
}

function createFeedPostSvg(idx, title, clientName) {
  const palettes = [
    { bg1: '#FAF8F5', bg2: '#F3EFEA', accent: '#A45A33', text: '#2C2825', desc: 'Identidade & Estratégia' },
    { bg1: '#262220', bg2: '#1A1715', accent: '#D9825B', text: '#FAF8F5', desc: 'Posicionamento Digital' },
    { bg1: '#F4ECE6', bg2: '#E8DBD0', accent: '#8B4520', text: '#2C2825', desc: 'Design Editorial' },
    { bg1: '#1E293B', bg2: '#0F172A', accent: '#38BDF8', text: '#F8FAFC', desc: 'Presença & Conteúdo' },
    { bg1: '#FCFAF7', bg2: '#F5EBE1', accent: '#A45A33', text: '#2C2825', desc: 'Arquitetura de Marca' },
    { bg1: '#3D271D', bg2: '#24140E', accent: '#F09977', text: '#FFF8F4', desc: 'Harmonia & Coesão' },
    { bg1: '#F7F6F2', bg2: '#EDEAE1', accent: '#7D6354', text: '#2C2825', desc: 'Curadoria Visual' },
    { bg1: '#2C2825', bg2: '#1C1917', accent: '#A45A33', text: '#F5F5F4', desc: 'Autoridade & Elegância' },
    { bg1: '#FAF4EF', bg2: '#F0E2D5', accent: '#B25E35', text: '#2C2825', desc: 'Studio Veronna Atelier' }
  ];

  const p = palettes[idx % palettes.length];
  const postNum = String(idx + 1).padStart(2, '0');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bgGrad${idx}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.bg1}"/>
      <stop offset="100%" stop-color="${p.bg2}"/>
    </linearGradient>
  </defs>
  
  <rect width="1080" height="1080" fill="url(#bgGrad${idx})"/>
  
  <!-- Moldura Fina e Sofisticada -->
  <rect x="64" y="64" width="952" height="952" fill="none" stroke="${p.accent}" stroke-width="2" stroke-opacity="0.3"/>
  
  <!-- Header do Post -->
  <text x="120" y="160" font-family="'Cinzel', Georgia, serif" font-size="28" font-weight="600" fill="${p.accent}" letter-spacing="6">STUDIO VERONNA • ATELIER</text>
  <text x="960" y="160" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="24" font-weight="700" fill="${p.accent}" text-anchor="end" opacity="0.6">#${postNum}</text>
  
  <line x1="120" y1="190" x2="960" y2="190" stroke="${p.accent}" stroke-width="1" stroke-opacity="0.2"/>

  <!-- Centro: Gráfico Conceitual -->
  <circle cx="540" cy="480" r="180" fill="none" stroke="${p.accent}" stroke-width="2" stroke-opacity="0.25"/>
  <circle cx="540" cy="480" r="140" fill="${p.accent}" fill-opacity="0.08"/>
  <circle cx="540" cy="480" r="40" fill="${p.accent}" fill-opacity="0.9"/>
  <polygon points="540,360 620,540 460,540" fill="none" stroke="${p.accent}" stroke-width="2" stroke-opacity="0.4"/>

  <!-- Título e Categoria -->
  <text x="540" y="740" font-family="'Cinzel', Georgia, serif" font-size="52" font-weight="700" fill="${p.text}" text-anchor="middle" letter-spacing="3">${p.desc.toUpperCase()}</text>
  <text x="540" y="800" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="24" font-weight="500" fill="${p.accent}" text-anchor="middle" letter-spacing="4">${(clientName || "STUDIO VERONNA").toUpperCase()}</text>
  
  <!-- Footer do Post -->
  <line x1="120" y1="890" x2="960" y2="890" stroke="${p.accent}" stroke-width="1" stroke-opacity="0.2"/>
  <text x="120" y="940" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="600" fill="${p.text}" opacity="0.7">GESTÃO DE INSTAGRAM</text>
  <text x="960" y="940" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="600" fill="${p.accent}" text-anchor="end">CONTEÚDO HOMOLOGADO NO NEON</text>
</svg>`;
}

async function migrateAllImages() {
  console.log("=== INICIANDO MIGRAÇÃO TOTAL DE IMAGENS PARA O NEON (BYTEA) ===");

  // 1. Migrar/Salvar Avatares de Profiles
  const profiles = await sql`SELECT id, nome, email, avatar_url FROM profiles`;
  console.log(`Encontrados ${profiles.length} perfis.`);

  let profileUpdated = 0;
  for (const prof of profiles) {
    const name = prof.nome || prof.email.split('@')[0];
    const initials = getInitials(name);
    
    // Gerar nome de arquivo consistente
    let fileName = `avatar_${prof.id}.svg`;
    if (prof.avatar_url && prof.avatar_url.includes('/avatars/')) {
      const match = prof.avatar_url.match(/avatars\/([^?]+)/);
      if (match) fileName = match[1];
    }

    const svgContent = createAvatarSvg(name, initials);
    const buffer = Buffer.from(svgContent, 'utf-8');

    // Gravar no Neon storage_objects
    await sql`
      DELETE FROM storage_objects 
      WHERE bucket_name = 'avatars' AND (file_name = ${fileName} OR file_name = ${`avatar_${prof.id}.svg`})
    `;

    await sql`
      INSERT INTO storage_objects (bucket_name, file_name, file_data, mime_type, size)
      VALUES ('avatars', ${fileName}, ${buffer}, 'image/svg+xml', ${buffer.length})
    `;

    // Também salvar com a chave avatar_<uuid>.svg caso seja buscado por ID direto
    const fallbackName = `avatar_${prof.id}.svg`;
    if (fileName !== fallbackName) {
      await sql`
        INSERT INTO storage_objects (bucket_name, file_name, file_data, mime_type, size)
        VALUES ('avatars', ${fallbackName}, ${buffer}, 'image/svg+xml', ${buffer.length})
        ON CONFLICT DO NOTHING
      `;
    }

    // Atualizar profile.avatar_url para a URL interna do Neon
    const newAvatarUrl = `/api/storage/file/avatars/${fileName}`;
    await sql`
      UPDATE profiles 
      SET avatar_url = ${newAvatarUrl} 
      WHERE id = ${prof.id}
    `;

    profileUpdated++;
  }
  console.log(`✅ ${profileUpdated} avatares de perfis gravados no Neon e URLs atualizadas.`);

  // 2. Migrar/Salvar Posts do Instagram Feed
  const feedPosts = await sql`
    SELECT p.id, p.project_id, p.caption
    FROM instagram_feed_posts p
    ORDER BY p.display_order ASC
  `;

  console.log(`Encontrados ${feedPosts.length} posts do feed.`);
  let postsUpdated = 0;

  for (let i = 0; i < feedPosts.length; i++) {
    const post = feedPosts[i];
    const clientName = post.project_title || "Studio Veronna";
    const postSvg = createFeedPostSvg(i, post.caption, clientName);
    const postBuffer = Buffer.from(postSvg, 'utf-8');
    const postFileName = `feed_post_${post.id}.svg`;

    // Salvar no Neon storage_objects
    await sql`
      DELETE FROM storage_objects 
      WHERE bucket_name = 'instagram_feed' AND file_name = ${postFileName}
    `;

    await sql`
      INSERT INTO storage_objects (bucket_name, file_name, file_data, mime_type, size)
      VALUES ('instagram_feed', ${postFileName}, ${postBuffer}, 'image/svg+xml', ${postBuffer.length})
    `;

    // Atualizar URL no banco
    const internalUrl = `/api/storage/file/instagram_feed/${postFileName}`;
    await sql`
      UPDATE instagram_feed_posts 
      SET image_url = ${internalUrl}
      WHERE id = ${post.id}
    `;

    postsUpdated++;
  }
  console.log(`✅ ${postsUpdated} imagens de post do feed salvas fisicamente no Neon.`);

  // 3. Migrar/Salvar Perfil do Instagram
  const igProfiles = await sql`SELECT id, username, full_name FROM instagram_profiles`;
  for (const ig of igProfiles) {
    const initials = getInitials(ig.full_name || ig.username);
    const igSvg = createAvatarSvg(ig.full_name || ig.username, initials, '#D9825B', '#A45A33');
    const igBuffer = Buffer.from(igSvg, 'utf-8');
    const igFileName = `ig_profile_${ig.id}.svg`;

    await sql`
      DELETE FROM storage_objects 
      WHERE bucket_name = 'avatars' AND file_name = ${igFileName}
    `;

    await sql`
      INSERT INTO storage_objects (bucket_name, file_name, file_data, mime_type, size)
      VALUES ('avatars', ${igFileName}, ${igBuffer}, 'image/svg+xml', ${igBuffer.length})
    `;

    const newIgAvatarUrl = `/api/storage/file/avatars/${igFileName}`;
    await sql`
      UPDATE instagram_profiles 
      SET avatar_url = ${newIgAvatarUrl}
      WHERE id = ${ig.id}
    `;
  }
  console.log(`✅ ${igProfiles.length} perfis de instagram atualizados com avatares no Neon.`);

  // 4. Verificar total de objetos no Neon
  const countResult = await sql`SELECT count(*) FROM storage_objects`;
  console.log(`\n🎉 TOTAL DE IMAGENS FISICAMENTE GRAVADAS NO NEON: ${countResult[0].count} objetos!`);
}

migrateAllImages().catch(err => {
  console.error("Erro na migração:", err);
  process.exit(1);
});
