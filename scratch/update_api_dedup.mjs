import fs from 'fs';

const filePath = 'frontend/src/app/api/sintonia/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

const target = `    // Canais corporativos / gerais
    const corporateChannels = await (sql as any).query(
      \`SELECT id, name, type, description, is_private, created_at, project_id
       FROM channels
       WHERE type IN ('fio_geral', 'general', 'corporate_global')
       ORDER BY created_at ASC\`
    );`;

const replacement = `    // Canais corporativos / gerais
    const corporateChannelsRaw = await (sql as any).query(
      \`SELECT id, name, type, description, is_private, created_at, project_id
       FROM channels
       WHERE type IN ('fio_geral', 'general', 'corporate_global')
       ORDER BY created_at ASC\`
    );

    // Deduplica canais corporativos por nome
    const seenNames = new Set<string>();
    const corporateChannels = corporateChannelsRaw.filter((c: any) => {
      const normalizedName = c.name.trim().toLowerCase();
      if (seenNames.has(normalizedName)) return false;
      seenNames.add(normalizedName);
      return true;
    });`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated deduplication!');
} else {
  console.log('Target not found, trying CRLF normalization...');
  content = content.replace(/\r\n/g, '\n');
  const targetLF = target.replace(/\r\n/g, '\n');
  content = content.replace(targetLF, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated deduplication with LF normalization!');
}
