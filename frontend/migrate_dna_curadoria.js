const fs = require('fs');

const file = 'src/components/brand/BrandDNACuradoria.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove supabase import
content = content.replace(/import \{ supabase \} from "\.\.\/\.\.\/lib\/supabase";\n/g, '');

// 2. Fix the logo upload
content = content.replace(/const \{ error \} = await supabase\.storage\.from\('briefing_assets'\)\.upload\(fileName, file\);\n\s*if \(\!error\) \{\n\s*const \{ data \} = supabase\.storage\.from\('briefing_assets'\)\.getPublicUrl\(fileName\);\n\s*const newPrefs = \{ \.\.\.preferences, logo_atual_url: data\.publicUrl \};/g, 
`const formData = new FormData();
        formData.append('bucket', 'briefing_assets');
        formData.append('path', fileName);
        formData.append('file', file);
        const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        
        if (uploadRes.ok && uploadData.data?.publicUrl) {
          const newPrefs = { ...preferences, logo_atual_url: uploadData.data.publicUrl };`);

// 3. Fix client_briefings select & upsert in savePreferences
content = content.replace(/const \{ data: brief \} = await supabase\.from\('client_briefings'\)\.select\('\*'\)\.eq\('project_id', projectId\)\.single\(\);\n\s*const currentAnswers = brief\?\.answers \|\| \{\};\n\s*await supabase\.from\('client_briefings'\)\.upsert\(\{\n\s*project_id: projectId,\n\s*client_id: clientProfile\?\.id,\n\s*answers: \{ \.\.\.currentAnswers, \.\.\.prefsToSave \}\n\s*\}, \{ onConflict: 'project_id' \}\);/g, 
`const briefRes = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT * FROM client_briefings WHERE project_id = $1 LIMIT 1', values: [projectId] }) });
      const briefData = await briefRes.json();
      const brief = briefData.data?.[0];
      const currentAnswers = brief?.answers || {};
      
      await fetch('/api/db/query', { 
        method: 'POST', 
        body: JSON.stringify({ 
          query: 'INSERT INTO client_briefings (project_id, client_id, answers) VALUES ($1, $2, $3) ON CONFLICT (project_id) DO UPDATE SET answers = EXCLUDED.answers', 
          values: [projectId, clientProfile?.id, JSON.stringify({ ...currentAnswers, ...prefsToSave })] 
        }) 
      });`);

// 4. Fix strategicData select in fetchCuradoriaData
content = content.replace(/const \{ data: strategicData \} = await supabase\n\s*\.from\('strategic_answers'\)\n\s*\.select\('moodboard_urls'\)\n\s*\.eq\('project_id', projectId\)\n\s*\.single\(\);/g, 
`const stratRes = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT moodboard_urls FROM strategic_answers WHERE project_id = $1 LIMIT 1', values: [projectId] }) });
        const stratJson = await stratRes.json();
        const strategicData = stratJson.data?.[0];`);

// 5. Fix client_briefings select in fetchCuradoriaData
content = content.replace(/const \{ data: brief \} = await supabase\.from\('client_briefings'\)\.select\('\*'\)\.eq\('project_id', projectId\)\.single\(\);/g, 
`const briefRes2 = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT * FROM client_briefings WHERE project_id = $1 LIMIT 1', values: [projectId] }) });
        const briefJson = await briefRes2.json();
        const brief = briefJson.data?.[0];`);

// 6. Fix design_directions select in fetchCuradoriaData
content = content.replace(/const \{ data: directionsData \} = await supabase\n\s*\.from\('design_directions'\)\n\s*\.select\('\*'\)\n\s*\.eq\('project_id', projectId\)\n\s*\.order\('created_at', \{ ascending: true \}\);/g, 
`const dirRes = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT * FROM design_directions WHERE project_id = $1 ORDER BY created_at ASC', values: [projectId] }) });
        const dirJson = await dirRes.json();
        const directionsData = dirJson.data || [];`);

// 7. Fix moodboard upload
content = content.replace(/const \{ error: uploadError \} = await supabase\.storage\.from\('moodboard'\)\.upload\(filePath, file\);\n\s*if \(uploadError\) throw uploadError;\n\s*const \{ data: publicUrlData \} = supabase\.storage\.from\('moodboard'\)\.getPublicUrl\(filePath\);\n\s*const newUrls = \[\.\.\.clientMoodboard, publicUrlData\.publicUrl\];/g, 
`const formData = new FormData();
        formData.append('bucket', 'moodboard');
        formData.append('path', filePath);
        formData.append('file', file);
        const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error?.message);
        
        const newUrls = [...clientMoodboard, uploadData.data.publicUrl];`);

// 8. Fix strategic_answers upsert
content = content.replace(/const \{ error: dbError \} = await supabase\n\s*\.from\('strategic_answers'\)\n\s*\.upsert\(\{ project_id: projectId, moodboard_urls: newUrls \}, \{ onConflict: 'project_id' \}\);/g, 
`await fetch('/api/db/query', { 
          method: 'POST', 
          body: JSON.stringify({ 
            query: 'INSERT INTO strategic_answers (project_id, moodboard_urls) VALUES ($1, $2) ON CONFLICT (project_id) DO UPDATE SET moodboard_urls = EXCLUDED.moodboard_urls', 
            values: [projectId, JSON.stringify(newUrls)] 
          }) 
        });`);

// 9. Fix design_directions update
content = content.replace(/const \{ error \} = await supabase\n\s*\.from\('design_directions'\)\n\s*\.update\(\{ \n\s*score: currentDir\.score \|\| 0, \n\s*feedback: currentDir\.feedback \|\| '' \n\s*\}\)\n\s*\.eq\('id', currentDir\.id\);/g, 
`const dirUpdateRes = await fetch('/api/db/query', {
          method: 'POST',
          body: JSON.stringify({
            query: 'UPDATE design_directions SET score = $1, feedback = $2 WHERE id = $3',
            values: [currentDir.score || 0, currentDir.feedback || '', currentDir.id]
          })
        });
        const { error } = await dirUpdateRes.json();`);

fs.writeFileSync(file, content);
console.log('BrandDNACuradoria updated successfully!');
