import dotenv from 'dotenv';
dotenv.config({ path: 'frontend/.env.local' });
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);
const apifyToken = process.env.APIFY_API_TOKEN;

const clients = [
  { nome: 'Belo Sorriso', username: 'belosorriso_dra.carla', projectId: '7ef5e662-6540-40f7-94c9-7aee456bebd9', profileId: 'b32f930c-f166-4788-b106-6a88daa560eb' },
  { nome: 'Camille Sobral', username: 'dracamillesobral', projectId: 'c52761e9-c13b-4c73-93e7-7b951d27a776', profileId: 'cb7fa340-2dcd-42a4-a886-956674c700ae' },
  { nome: 'Graziele dos Santos Ribeiro', username: 'dra.graziribeiro', projectId: '5abd36ed-b314-4840-937c-87202b331c3a', profileId: '8593d683-8920-4cd3-9e34-48785f398fb2' },
  { nome: 'Iuri Cardoso', username: 'dr.iuricardoso', projectId: '6e184ace-0004-4eff-b54d-2c3676bda6a8', profileId: '56ead061-4e63-4094-ad0b-67fbf581ba61' },
  { nome: 'Liz Sacramento', username: 'lizdesign.ai', projectId: 'e6dba31c-e5e3-4a69-b86e-1bd900c23e4a', profileId: 'd5d19de5-d7ad-4572-860f-d420e7ef5dc0' },
  { nome: 'Neuroser', username: 'neuroserpsicologia', projectId: '9ebb88a3-2fd6-46b0-8062-51fa37042812', profileId: '55fa5a48-b9cc-4300-9eeb-2a8cf837f392' },
  { nome: 'Paulyane Natacha de Lima Câmera', username: 'paulyanecamara', projectId: 'af6ef128-b981-4fce-82fd-d4e08cb04497', profileId: '359ec55f-c1ca-4588-abf3-e87345e947d3' },
  { nome: 'Thailla Alves de Oliveira de Queiroz', username: 'psicologathaillaqueiroz', projectId: '003f168b-241c-4234-9531-311245ef9878', profileId: '94fe3642-6d37-4fba-8c1c-ba38082212bb' }
];

async function recover() {
  console.log(`Iniciando recuperação de avatares para ${clients.length} clientes...`);
  
  const usernames = clients.map(c => c.username);
  console.log('Usernames para consulta Apify:', usernames);

  const apifyRes = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernames: usernames,
        postsLimit: 1
      })
    }
  );

  if (!apifyRes.ok) {
    const err = await apifyRes.text();
    console.error('Falha na API da Apify:', apifyRes.status, err);
    return;
  }

  const scrapedItems = await apifyRes.json();
  console.log(`Apify retornou ${scrapedItems.length} perfis.`);

  const uploadDir = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'avatars');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  for (const client of clients) {
    const item = scrapedItems.find(
      i => (i.username || '').toLowerCase() === client.username.toLowerCase()
    );

    let picUrl = item?.profilePicUrlHD || item?.profilePicUrl;
    console.log(`\nProcessando: ${client.nome} (@${client.username})`);

    // Fallback especial para Liz se Apify não retornar imagem
    if (!picUrl && client.username === 'lizdesign.ai') {
      const lizAv = await sql`
        SELECT file_name FROM storage_objects 
        WHERE file_name LIKE '%55a1f766-bd50-45bd-b0bc-9af8309faa58%' LIMIT 1
      `;
      if (lizAv && lizAv.length > 0) {
        const permanentUrl = `/api/storage/file/avatars/${lizAv[0].file_name}`;
        await sql`UPDATE profiles SET avatar_url = ${permanentUrl} WHERE id = ${client.profileId}`;
        await sql`UPDATE instagram_profiles SET avatar_url = ${permanentUrl} WHERE project_id = ${client.projectId}`;
        console.log(`✓ Liz vinculada ao avatar existente: ${permanentUrl}`);
        continue;
      }
    }

    if (!picUrl) {
      console.warn(`⚠ Sem URL de foto para @${client.username}`);
      continue;
    }

    console.log(`Baixando foto de: ${picUrl.substring(0, 80)}...`);
    try {
      const imgRes = await fetch(picUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });

      if (!imgRes.ok) {
        console.error(`Falha no download da imagem: HTTP ${imgRes.status}`);
        continue;
      }

      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = `${client.profileId}_avatar_${Date.now()}.jpg`;
      const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

      // 1. Salvar no Neon PostgreSQL (storage_objects)
      await sql`
        DELETE FROM storage_objects 
        WHERE bucket_name = 'avatars' AND file_name LIKE ${`${client.profileId}_avatar_%`}
      `;
      await sql`
        INSERT INTO storage_objects (bucket_name, file_name, file_data, mime_type, size)
        VALUES ('avatars', ${fileName}, ${buffer}, ${mimeType}, ${buffer.length})
      `;

      // 2. Salvar em cache no disco local
      const localFilePath = path.join(uploadDir, fileName);
      fs.writeFileSync(localFilePath, buffer);

      // 3. Atualizar profiles e instagram_profiles com a URL definitiva do Atelier
      const internalUrl = `/api/storage/file/avatars/${fileName}`;
      await sql`
        UPDATE profiles 
        SET avatar_url = ${internalUrl}
        WHERE id = ${client.profileId}
      `;
      await sql`
        UPDATE instagram_profiles 
        SET avatar_url = ${internalUrl}
        WHERE project_id = ${client.projectId}
      `;

      console.log(`✅ ${client.nome} salvo com sucesso! URL: ${internalUrl} (${buffer.length} bytes)`);
    } catch (err) {
      console.error(`Erro ao salvar foto de ${client.nome}:`, err);
    }
  }

  console.log('\n--- RECUPERAÇÃO CONCLUÍDA COM SUCESSO! ---');
}

recover().catch(console.error);
