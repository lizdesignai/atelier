const fs = require('fs');

let file = 'src/components/brand/CuradoriaStage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/import \{ supabase \} from "\.\.\/\.\.\/lib\/supabase";\n/g, '');

// Logo upload replacement
content = content.replace(/const \{ error: uploadError \} = await supabase\.storage\.from\('briefing_assets'\)\.upload\(fileName, logoFile\);\n\s*if \(\!uploadError\) \{\n\s*const \{ data \} = supabase\.storage\.from\('briefing_assets'\)\.getPublicUrl\(fileName\);\n\s*finalLogoUrl = data\.publicUrl;\n\s*\}/g,
`const formData = new FormData();
        formData.append('bucket', 'briefing_assets');
        formData.append('path', fileName);
        formData.append('file', logoFile);
        const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        
        if (uploadRes.ok && uploadData.data?.publicUrl) {
          finalLogoUrl = uploadData.data.publicUrl;
        }`);

// client_briefings upsert replacement
content = content.replace(/const \{ error \} = await supabase\.from\('client_briefings'\)\.upsert\(\{[\s\S]*?\}\);/g,
`const upsertRes = await fetch('/api/db/query', {
        method: 'POST',
        body: JSON.stringify({
          query: 'INSERT INTO client_briefings (project_id, client_id, answers) VALUES ($1, $2, $3) ON CONFLICT (project_id) DO UPDATE SET answers = EXCLUDED.answers',
          values: [projectId, clientId, JSON.stringify(finalData)]
        })
      });
      const error = !(await upsertRes.json()).data;`);

fs.writeFileSync(file, content);
console.log('CuradoriaStage updated.');

// BrandDNACuradoria leftovers
let dnaFile = 'src/components/brand/BrandDNACuradoria.tsx';
let dnaContent = fs.readFileSync(dnaFile, 'utf8');
dnaContent = dnaContent.replace(/import \{ supabase \} from "\.\.\/\.\.\/lib\/supabase";\n/g, '');
dnaContent = dnaContent.replace(/const \{ data: directionsData \} = await supabase\n\s*\.from\('design_directions'\)\n\s*\.select\('\*'\)\n\s*\.eq\('project_id', projectId\)\n\s*\.order\('created_at', \{ ascending: true \}\);/g,
`const dirRes = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT * FROM design_directions WHERE project_id = $1 ORDER BY created_at ASC', values: [projectId] }) });
        const dirJson = await dirRes.json();
        const directionsData = dirJson.data || [];`);

dnaContent = dnaContent.replace(/const \{ error: uploadError \} = await supabase\.storage\.from\('moodboard'\)\.upload\(filePath, file\);\n\s*if \(uploadError\) throw uploadError;\n\s*const \{ data: publicUrlData \} = supabase\.storage\.from\('moodboard'\)\.getPublicUrl\(filePath\);\n\s*const newUrls = \[\.\.\.clientMoodboard, publicUrlData\.publicUrl\];/g,
`const formData = new FormData();
        formData.append('bucket', 'moodboard');
        formData.append('path', filePath);
        formData.append('file', file);
        const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error?.message);
        const newUrls = [...clientMoodboard, uploadData.data.publicUrl];`);

dnaContent = dnaContent.replace(/const \{ error: dbError \} = await supabase\n\s*\.from\('strategic_answers'\)\n\s*\.upsert\(\{ project_id: projectId, moodboard_urls: newUrls \}, \{ onConflict: 'project_id' \}\);/g,
`await fetch('/api/db/query', { 
          method: 'POST', 
          body: JSON.stringify({ 
            query: 'INSERT INTO strategic_answers (project_id, moodboard_urls) VALUES ($1, $2) ON CONFLICT (project_id) DO UPDATE SET moodboard_urls = EXCLUDED.moodboard_urls', 
            values: [projectId, JSON.stringify(newUrls)] 
          }) 
        });`);

dnaContent = dnaContent.replace(/const \{ error \} = await supabase\n\s*\.from\('design_directions'\)\n\s*\.update\(\{ \n\s*score: currentDir\.score \|\| 0, \n\s*feedback: currentDir\.feedback \|\| '' \n\s*\}\)\n\s*\.eq\('id', currentDir\.id\);/g,
`const dirUpdateRes = await fetch('/api/db/query', {
          method: 'POST',
          body: JSON.stringify({
            query: 'UPDATE design_directions SET score = $1, feedback = $2 WHERE id = $3',
            values: [currentDir.score || 0, currentDir.feedback || '', currentDir.id]
          })
        });
        const { error } = await dirUpdateRes.json();`);

fs.writeFileSync(dnaFile, dnaContent);
console.log('BrandDNACuradoria updated (pass 2).');
