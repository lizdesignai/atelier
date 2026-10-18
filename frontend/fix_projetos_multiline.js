const fs = require('fs');

let file = 'src/app/admin/projetos/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. project_assets select
content = content.replace(
  /const \{ data: assetsData, error: assetsError \} = await supabase[\s\S]*?\.order\('created_at', \{ ascending: false \}\);/,
  "const assetsRes = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT * FROM project_assets WHERE project_id = $1 ORDER BY created_at DESC', values: [activeProjectId] }) }); const { data: assetsData, error: assetsError } = await assetsRes.json();"
);

// 2. client_briefings select
content = content.replace(
  /const \{ data: briefingData, error: briefingError \} = await supabase[\s\S]*?\.maybeSingle\(\);/,
  "const briefingRes = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT * FROM client_briefings WHERE project_id = $1 LIMIT 1', values: [activeProjectId] }) }); const bJson = await briefingRes.json(); const briefingData = bJson.data?.[0]; const briefingError = bJson.error;"
);

// 3. agency_subclients select
content = content.replace(
  /const \{ data: subclientsData, error: subError \} = await supabase[\s\S]*?\.eq\('agency_id', activeProjectId\);/,
  "const subRes = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT * FROM agency_subclients WHERE agency_id = $1', values: [activeProjectId] }) }); const { data: subclientsData, error: subError } = await subRes.json();"
);

// 4. vault assets upload 1
content = content.replace(
  /const \{ error: uploadError \} = await supabase\.storage\.from\('vault_assets'\)\.upload\(filePath, file\);\n\s*if \(uploadError\) throw uploadError;\n\s*const \{ data: publicUrlData \} = supabase\.storage\.from\('vault_assets'\)\.getPublicUrl\(filePath\);/,
  `const formData = new FormData(); formData.append('bucket', 'vault_assets'); formData.append('path', filePath); formData.append('file', file); const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: formData }); const uploadData = await uploadRes.json(); if (!uploadRes.ok) throw new Error(uploadData.error?.message); const publicUrlData = uploadData.data;`
);

// 5. project_assets insert
content = content.replace(
  /const \{ data: insertedData, error: dbError \} = await supabase[\s\S]*?\.insert\(\{([\s\S]*?)\}\)[\s\S]*?\.single\(\);/,
  `const insertRes = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'INSERT INTO project_assets (project_id, file_name, file_url, file_type, file_size) VALUES ($1, $2, $3, $4, $5) RETURNING *', values: [activeProjectId, file.name, publicUrlData.publicUrl, fileExt.toUpperCase(), fileSizeMB + ' MB'] }) }); const insertJson = await insertRes.json(); const insertedData = insertJson.data?.[0]; const dbError = insertJson.error;`
);

// 6. vault assets contract upload
content = content.replace(
  /const \{ error: uploadError \} = await supabase\.storage\.from\('vault_assets'\)\.upload\(fileName, file\);\n\s*if \(uploadError\) throw uploadError;\n\s*const \{ data \} = supabase\.storage\.from\('vault_assets'\)\.getPublicUrl\(fileName\);/,
  `const formData = new FormData(); formData.append('bucket', 'vault_assets'); formData.append('path', fileName); formData.append('file', file); const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: formData }); const uploadData = await uploadRes.json(); if (!uploadRes.ok) throw new Error(uploadData.error?.message); const data = uploadData.data;`
);

// 7. moodboard upload
content = content.replace(
  /const \{ error: uploadError \} = await supabase\.storage\.from\('moodboard'\)\.upload\(filePath, file\);\n\s*if \(uploadError\) throw uploadError;\n\s*const \{ data \} = supabase\.storage\.from\('moodboard'\)\.getPublicUrl\(filePath\);/,
  `const formData = new FormData(); formData.append('bucket', 'moodboard'); formData.append('path', filePath); formData.append('file', file); const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: formData }); const uploadData = await uploadRes.json(); if (!uploadRes.ok) throw new Error(uploadData.error?.message); const data = uploadData.data;`
);

// 8. design directions insert
content = content.replace(
  /const \{ data: newRefData, error: dbError \} = await supabase\.from\('design_directions'\)\.insert\(\{([\s\S]*?)\}\)\.select\(\)\.single\(\);/,
  `const insertRefRes = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'INSERT INTO design_directions (project_id, title, image_url, score, feedback) VALUES ($1, $2, $3, 0, \\'\\') RETURNING *', values: [activeProjectId, newRefTitle, uploadedUrls[0]] }) }); const insertRefJson = await insertRefRes.json(); const newRefData = insertRefJson.data?.[0]; const dbError = insertRefJson.error;`
);

fs.writeFileSync(file, content);
console.log('Fixed multiline supabase matches in projetos/page.tsx!');
